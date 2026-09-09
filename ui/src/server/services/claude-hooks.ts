/**
 * Claude Code hook wiring for per-session agent status and the
 * "agent finished" bell.
 *
 * Every claude-code cloud session is launched with `--settings <file>` where
 * the file registers command hooks for eight Claude Code events. Each hook
 * POSTs Claude's stdin payload to this backend; the manager reduces it to an
 * agent status (idle / working / blocked / error / done) and broadcasts a
 * `cloud-terminal:agent-event` so the UI can colour the tab and ring its bell.
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
  { event: 'PreToolUse', matcher: 'AskUserQuestion' },
  { event: 'PostToolUse', matcher: 'AskUserQuestion' },
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
 */
export type HookMapping =
  | { kind: 'event'; event: CloudTerminalAgentEvent; detail: CloudTerminalAgentEventDetail }
  | { kind: 'ignore'; reason: string }
  | { kind: 'reject'; reason: string };

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

/**
 * Maps Claude's hook stdin JSON to a session agent event. Pure. A body without
 * `hook_event_name` counts as Stop (older hook files, manual curl tests).
 */
export function mapHookPayload(body: Record<string, unknown>): HookMapping {
  const name = body.hook_event_name;
  const ev = (event: CloudTerminalAgentEvent, detail: CloudTerminalAgentEventDetail = {}): HookMapping =>
    ({ kind: 'event', event, detail });

  switch (name) {
    case undefined:
    case 'Stop':
      return ev('stop', { preview: summarizePreview(body.last_assistant_message) });
    case 'StopFailure':
      return ev('stop-failure', {
        reason: summarizePreview(body.last_assistant_message) ?? str(body.error) ?? 'API-Fehler',
      });
    case 'UserPromptSubmit':
      return ev('prompt-submitted');
    case 'PermissionRequest': {
      const tool = str(body.tool_name);
      return ev('blocked', { reason: tool ? `Berechtigung: ${tool}` : 'Berechtigung' });
    }
    case 'PreToolUse':
    case 'PostToolUse': {
      if (body.tool_name !== 'AskUserQuestion') {
        return { kind: 'reject', reason: `unexpected tool ${String(body.tool_name)} on ${name}` };
      }
      if (name === 'PostToolUse') return ev('unblocked');
      const input = body.tool_input as { questions?: Array<{ question?: unknown }> } | undefined;
      const question = summarizePreview(input?.questions?.[0]?.question);
      return ev('blocked', { reason: question ?? 'Frage' });
    }
    case 'Notification': {
      const type = str(body.notification_type) ?? '';
      if (BLOCKING_NOTIFICATION_TYPES.has(type)) {
        return ev('blocked', { reason: summarizePreview(body.message) });
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
