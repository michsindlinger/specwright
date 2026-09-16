/**
 * Claude Code hook wiring for per-session agent status and the
 * "agent finished" bell.
 *
 * Every claude-code cloud session is launched with `--settings <file>` where
 * the file registers command hooks for eight Claude Code events. Each hook
 * POSTs Claude's stdin payload to this backend; the manager reduces it to an
 * agent status (idle / working / blocked / error / done) and broadcasts a
 * `cloud-terminal:agent-event` so the UI can colour the tab and ring its bell.
 * Hooks are not the only source: the plan-review orchestrator reports
 * `review-injected` / `review-failed` through the same manager path.
 *
 * Design notes:
 * - ONE settings file per backend port (not per session): the session id
 *   travels via the `SPECWRIGHT_CLOUD_SESSION_ID` env var that the launch
 *   script exports, so there is nothing to clean up per session.
 * - The file is rewritten at every boot with the CURRENT port. A claude
 *   process started under a different port keeps reporting to that old port
 *   and is simply not heard — accepted; the port is fixed in the unit file.
 *   Likewise a claude process that outlived a backend deploy (tmux) keeps
 *   the hook set it was launched with until it is restarted.
 * - The shared secret is persisted (0600) rather than generated per boot so
 *   sessions that survive a backend restart (tmux) keep authenticating.
 * - Hooks run `async: true`: verified on Claude Code 2.1.266 that async
 *   command hooks still receive the event JSON on stdin, and UserPromptSubmit
 *   / PermissionRequest sit on the user's typing path — they must not wait
 *   for a loopback round-trip. Curl timeouts stay tight so a hung backend
 *   cannot pile up background curls.
 * - `command -v curl` guard + trailing `exit 0`: the hook can never block or
 *   fail Claude; without curl the feature degrades silently. stdout is
 *   discarded on purpose — UserPromptSubmit stdout would become prompt context.
 * - `Notification permission_prompt` is deliberately NOT registered: it fires
 *   ~6 s after the dialog appears and would re-flag a session the user has
 *   already answered. `PermissionRequest` fires the instant the dialog opens.
 * - `SessionStart` excludes `compact`, which fires mid-turn.
 */

import { randomBytes } from 'crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { getClaudeHookSettingsPath, getHookSecretPath } from '../utils/runtime-paths.js';
import type { CloudTerminalAgentEvent, CloudTerminalAgentEventDetail } from '../../shared/types/cloud-terminal.protocol.js';
import type { HookBeitrag, HookContext, HookDialog, HookDialogClosed, RueckfrageFrage } from '../../shared/types/gespraech.protocol.js';

/** Env var the launch script exports; the hook reads it to name its session. */
export const CLOUD_SESSION_ID_ENV = 'SPECWRIGHT_CLOUD_SESSION_ID';

/** Header carrying the shared secret (lower-case: Express normalises names). */
export const HOOK_TOKEN_HEADER = 'x-specwright-hook-token';

/** Max characters of `last_assistant_message` kept as bell-list preview. */
export const PREVIEW_MAX_CHARS = 160;

/** Hook secret: 32 random bytes as hex. */
const SECRET_HEX_RE = /^[0-9a-f]{64}$/;

// eslint-disable-next-line no-control-regex
const ANSI_CSI = /\x1b\[[0-9;?]*[a-zA-Z]/g;
// eslint-disable-next-line no-control-regex
const ANSI_OSC = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

/** Hook events registered in the settings file, with their matchers. */
export const HOOK_EVENTS: ReadonlyArray<{ event: string; matcher?: string }> = [
  { event: 'SessionStart', matcher: 'startup|resume|clear|fork' },
  { event: 'UserPromptSubmit' },
  { event: 'PermissionRequest' },
  // INT-2026-007: ExitPlanMode too — the plan dialog and its terminal decision
  // arrive as PreToolUse (plan text, tool_use_id) and PostToolUse (result).
  { event: 'PreToolUse', matcher: 'AskUserQuestion|ExitPlanMode' },
  { event: 'PostToolUse', matcher: 'AskUserQuestion|ExitPlanMode' },
  { event: 'Notification', matcher: 'elicitation_dialog|elicitation_url_dialog|agent_needs_input|idle_prompt' },
  { event: 'Stop' },
  { event: 'StopFailure' },
];

/** Notification types that mean "the agent is waiting on the user". */
const BLOCKING_NOTIFICATION_TYPES = new Set(['elicitation_dialog', 'elicitation_url_dialog', 'agent_needs_input']);

/**
 * Builds the `--settings` JSON. Pure — no IO — so tests can assert the exact
 * command. The command is a POSIX-sh one-liner:
 *   1. bail (exit 0) unless the session env var is set,
 *   2. bail (exit 0) unless curl exists,
 *   3. POST stdin to this backend with the shared secret, ignore the outcome.
 */
export function renderHookSettings(port: number, secret: string): string {
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`renderHookSettings: invalid port ${port}`);
  }
  if (!SECRET_HEX_RE.test(secret)) {
    throw new Error('renderHookSettings: secret must be 64 hex chars');
  }
  const url = `http://127.0.0.1:${port}/api/cloud-terminal/$${CLOUD_SESSION_ID_ENV}/agent-event`;
  const command = [
    `[ -n "$${CLOUD_SESSION_ID_ENV}" ]`,
    'command -v curl >/dev/null 2>&1',
    `curl -s --connect-timeout 0.2 -m 1 -X POST -H 'Content-Type: application/json' -H '${HOOK_TOKEN_HEADER}: ${secret}' --data-binary @- "${url}" >/dev/null 2>&1`,
  ].join(' && ') + '; exit 0';

  const hook = { type: 'command', command, timeout: 2, async: true };
  const hooks: Record<string, Array<{ matcher?: string; hooks: Array<typeof hook> }>> = {};
  for (const { event, matcher } of HOOK_EVENTS) {
    hooks[event] = [matcher ? { matcher, hooks: [hook] } : { hooks: [hook] }];
  }
  return JSON.stringify({ hooks }, null, 2) + '\n';
}

/**
 * Reads the persisted secret, or creates it on first run. Synchronous: it runs
 * in the manager constructor before any session can be created or restored.
 */
export function loadOrCreateHookSecret(secretPath: string = getHookSecretPath()): string {
  try {
    const existing = readFileSync(secretPath, 'utf-8').trim();
    if (SECRET_HEX_RE.test(existing)) return existing;
  } catch {
    // missing or unreadable — fall through and (re)create
  }
  const secret = randomBytes(32).toString('hex');
  mkdirSync(dirname(secretPath), { recursive: true, mode: 0o700 });
  writeFileSync(secretPath, secret + '\n', { mode: 0o600 });
  return secret;
}

/**
 * Writes the settings file for this port and returns its path. Idempotent;
 * synchronous for the same reason as {@link loadOrCreateHookSecret}.
 */
export function ensureHookSettingsFile(
  port: number,
  secret: string,
  settingsPath: string = getClaudeHookSettingsPath()
): string {
  mkdirSync(dirname(settingsPath), { recursive: true, mode: 0o700 });
  writeFileSync(settingsPath, renderHookSettings(port, secret), { mode: 0o600 });
  return settingsPath;
}

/**
 * Turns Claude's `last_assistant_message` into a one-line preview for the
 * bell list. Strips ANSI/OSC sequences and control characters, collapses
 * whitespace, truncates with an ellipsis. Non-strings and empty results map
 * to `undefined` (the notification is still delivered, just without text).
 */
export function summarizePreview(text: unknown, max: number = PREVIEW_MAX_CHARS): string | undefined {
  if (typeof text !== 'string') return undefined;
  const cleaned = text
    .replace(ANSI_OSC, '')
    .replace(ANSI_CSI, '')
    .replace(CONTROL_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return undefined;
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
}

/** Session-id shape accepted by the agent-event route (see generateSessionId). */
export const CLOUD_SESSION_ID_RE = /^cloud-\d+-\d+$/;

/**
 * Outcome of mapping a raw hook payload:
 * - `event`: forward to the manager,
 * - `ignore`: known-but-irrelevant (204, no log — e.g. SessionStart compact,
 *   a notification type we do not track),
 * - `reject`: not a payload we registered for (400, logged).
 *
 * INT-2026-007: an `event` additionally carries what the Gespräch needs —
 * `context` (transcript path, Claude session id, cwd — every payload has
 * them), `beitrag` (the full text of a turn: `Stop.last_assistant_message`,
 * `UserPromptSubmit.prompt`), `dialog` (questions with options / plan text /
 * permission detail) and `dialogClosed` (PostToolUse result). None of these
 * reach the `cloud-terminal:agent-event` broadcast; `preview` stays 160 chars.
 */
export type HookMapping =
  | {
      kind: 'event';
      event: CloudTerminalAgentEvent;
      detail: CloudTerminalAgentEventDetail;
      context: HookContext;
      beitrag?: HookBeitrag;
      dialog?: HookDialog;
      dialogClosed?: HookDialogClosed;
    }
  | { kind: 'ignore'; reason: string }
  | { kind: 'reject'; reason: string };

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

/** Upper bound for a single text field taken from a hook (plan, turn text). */
export const HOOK_TEXT_MAX_CHARS = 200_000;
/** Bounds of an AskUserQuestion dialog as the card renders it (FA-12). */
export const RUECKFRAGE_MAX_QUESTIONS = 4;
export const RUECKFRAGE_MAX_OPTIONS = 4;
export const RUECKFRAGE_MAX_CHARS = 2_000;
/** Detail of a permission (command, file path …) as shown on the card (FA-21). */
const BERECHTIGUNG_DETAIL_MAX_CHARS = 200;

const bounded = (v: unknown, max: number): string | undefined => {
  const t = str(v);
  return t === undefined ? undefined : t.length > max ? t.slice(0, max) : t;
};

function hookContext(body: Record<string, unknown>): HookContext {
  const ctx: HookContext = {};
  const transcriptPath = str(body.transcript_path);
  const claudeSessionId = str(body.session_id);
  const cwd = str(body.cwd);
  if (transcriptPath) ctx.transcriptPath = transcriptPath;
  if (claudeSessionId) ctx.claudeSessionId = claudeSessionId;
  if (cwd) ctx.cwd = cwd;
  return ctx;
}

/** `tool_input.questions` of AskUserQuestion, validated and bounded; malformed entries are skipped. */
export function parseRueckfrageQuestions(input: unknown): RueckfrageFrage[] {
  const raw = (input as { questions?: unknown } | undefined)?.questions;
  if (!Array.isArray(raw)) return [];
  const out: RueckfrageFrage[] = [];
  for (const q of raw) {
    if (out.length >= RUECKFRAGE_MAX_QUESTIONS) break;
    if (!q || typeof q !== 'object') continue;
    const question = bounded((q as { question?: unknown }).question, RUECKFRAGE_MAX_CHARS);
    if (!question) continue;
    const header = bounded((q as { header?: unknown }).header, RUECKFRAGE_MAX_CHARS);
    const options: RueckfrageFrage['options'] = [];
    const rawOptions = (q as { options?: unknown }).options;
    if (Array.isArray(rawOptions)) {
      for (const o of rawOptions) {
        if (options.length >= RUECKFRAGE_MAX_OPTIONS) break;
        if (!o || typeof o !== 'object') continue;
        const label = bounded((o as { label?: unknown }).label, RUECKFRAGE_MAX_CHARS);
        if (!label) continue;
        const description = bounded((o as { description?: unknown }).description, RUECKFRAGE_MAX_CHARS);
        options.push(description ? { label, description } : { label });
      }
    }
    out.push({ question, ...(header ? { header } : {}), multiSelect: (q as { multiSelect?: unknown }).multiSelect === true, options });
  }
  return out;
}

function permissionDetail(toolInput: unknown): string | undefined {
  if (!toolInput || typeof toolInput !== 'object') return undefined;
  const i = toolInput as Record<string, unknown>;
  for (const key of ['command', 'file_path', 'path', 'pattern', 'url', 'query', 'description']) {
    const v = summarizePreview(i[key], BERECHTIGUNG_DETAIL_MAX_CHARS);
    if (v) return v;
  }
  return undefined;
}

function planDialog(body: Record<string, unknown>): HookDialog {
  const plan = bounded((body.tool_input as { plan?: unknown } | undefined)?.plan, HOOK_TEXT_MAX_CHARS) ?? '';
  const toolUseId = str(body.tool_use_id);
  return { kind: 'plan', ...(toolUseId ? { toolUseId } : {}), plan };
}

function rueckfrageDialog(body: Record<string, unknown>): HookDialog {
  const toolUseId = str(body.tool_use_id);
  return { kind: 'rueckfrage', ...(toolUseId ? { toolUseId } : {}), questions: parseRueckfrageQuestions(body.tool_input) };
}

/** Answers of an AskUserQuestion as `tool_response.answers` (question → answer). */
function rueckfrageAnswers(response: unknown): Record<string, string> | undefined {
  const raw = (response as { answers?: unknown } | undefined)?.answers;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const [q, a] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof a === 'string') out[q.slice(0, RUECKFRAGE_MAX_CHARS)] = a.slice(0, RUECKFRAGE_MAX_CHARS);
  }
  return out;
}

/**
 * ExitPlanMode result by structure, not by English prose (G9): an object with
 * `plan` = accepted; a string = rejected, its text after the first blank line
 * is what the user typed; anything else = unknown (no `planResult`).
 */
function planResult(response: unknown): HookDialogClosed['planResult'] {
  if (response && typeof response === 'object' && typeof (response as { plan?: unknown }).plan === 'string') return { accepted: true };
  if (typeof response === 'string') {
    const m = /said:\n([\s\S]*)$/.exec(response);
    const text = (m?.[1] ?? '').replace(/\n\s*Note: [\s\S]*$/, '').trim();
    return text ? { accepted: false, text: text.slice(0, HOOK_TEXT_MAX_CHARS) } : { accepted: false };
  }
  return undefined;
}

/**
 * Maps Claude's hook stdin JSON to a session agent event. Pure. A body without
 * `hook_event_name` counts as Stop (older hook files, manual curl tests).
 */
export function mapHookPayload(body: Record<string, unknown>): HookMapping {
  const name = body.hook_event_name;
  const context = hookContext(body);
  const ev = (
    event: CloudTerminalAgentEvent,
    detail: CloudTerminalAgentEventDetail = {},
    extra: { beitrag?: HookBeitrag; dialog?: HookDialog; dialogClosed?: HookDialogClosed } = {}
  ): HookMapping => ({ kind: 'event', event, detail, context, ...extra });

  switch (name) {
    case undefined:
    case 'Stop': {
      const text = bounded(body.last_assistant_message, HOOK_TEXT_MAX_CHARS);
      return ev('stop', { preview: summarizePreview(body.last_assistant_message) }, text ? { beitrag: { kind: 'claude', text } } : {});
    }
    case 'StopFailure':
      return ev('stop-failure', {
        reason: summarizePreview(body.last_assistant_message) ?? str(body.error) ?? 'API-Fehler',
      });
    case 'UserPromptSubmit': {
      const text = bounded(body.prompt, HOOK_TEXT_MAX_CHARS);
      return ev('prompt-submitted', {}, text ? { beitrag: { kind: 'nutzer', text } } : {});
    }
    case 'PermissionRequest': {
      const tool = str(body.tool_name);
      const reason = tool ? `Berechtigung: ${tool}` : 'Berechtigung';
      if (tool === 'ExitPlanMode') return ev('blocked', { reason, blockKind: 'plan' }, { dialog: planDialog(body) });
      if (tool === 'AskUserQuestion') return ev('blocked', { reason, blockKind: 'rueckfrage' }, { dialog: rueckfrageDialog(body) });
      const detail = permissionDetail(body.tool_input);
      return ev('blocked', { reason, blockKind: 'berechtigung' }, { dialog: { kind: 'berechtigung', tool: tool ?? 'unbekannt', ...(detail ? { detail } : {}) } });
    }
    case 'PreToolUse':
    case 'PostToolUse': {
      const tool = body.tool_name;
      if (tool !== 'AskUserQuestion' && tool !== 'ExitPlanMode') {
        return { kind: 'reject', reason: `unexpected tool ${String(tool)} on ${name}` };
      }
      const toolUseId = str(body.tool_use_id);
      if (name === 'PostToolUse') {
        const closed: HookDialogClosed = { ...(toolUseId ? { toolUseId } : {}), tool };
        if (tool === 'AskUserQuestion') {
          const answers = rueckfrageAnswers(body.tool_response);
          if (answers) closed.answers = answers;
        } else {
          const result = planResult(body.tool_response);
          if (result) closed.planResult = result;
        }
        return ev('unblocked', {}, { dialogClosed: closed });
      }
      if (tool === 'ExitPlanMode') {
        return ev('blocked', { reason: 'Berechtigung: ExitPlanMode', blockKind: 'plan' }, { dialog: planDialog(body) });
      }
      const dialog = rueckfrageDialog(body);
      const question = dialog.kind === 'rueckfrage' ? summarizePreview(dialog.questions[0]?.question) : undefined;
      return ev('blocked', { reason: question ?? 'Frage', blockKind: 'rueckfrage' }, { dialog });
    }
    case 'Notification': {
      const type = str(body.notification_type) ?? '';
      if (BLOCKING_NOTIFICATION_TYPES.has(type)) {
        return ev('blocked', { reason: summarizePreview(body.message), blockKind: 'unbekannt' });
      }
      if (type === 'idle_prompt') return ev('idle-prompt');
      return { kind: 'ignore', reason: `notification ${type || '(untyped)'}` };
    }
    case 'SessionStart':
      if (body.source === 'compact') return { kind: 'ignore', reason: 'session-start compact' };
      return ev('session-start');
    default:
      return { kind: 'reject', reason: `unexpected hook event ${String(name)}` };
  }
}
