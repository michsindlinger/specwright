/**
 * CloudTerminalManager Service
 *
 * Manages multiple PTY terminal sessions for Cloud Code CLI.
 * Independent of workflow executions - sessions persist across project switches.
 *
 * Key Features:
 * - Multi-session management (max 5 concurrent sessions)
 * - Session state machine: creating → active → paused → closed
 * - Output buffering during pause state
 * - EventEmitter pattern for session lifecycle events
 * - Delegates PTY operations to TerminalManager
 *
 * Architecture:
 * - Service Layer: Manages session metadata and state
 * - Adapter Pattern: Uses TerminalManager for PTY operations
 * - State Machine: Tracks session status transitions
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  CloudTerminalSession,
  CloudTerminalSessionId,
  CloudTerminalType,
  CloudTerminalModelConfig,
  CloudTerminalWorkflowMetadata,
  CloudTerminalNotice,
  CloudTerminalAgentEvent,
  CloudTerminalAgentEventDetail,
  CloudTerminalAgentStatus,
  CLOUD_TERMINAL_CONFIG,
  CLOUD_TERMINAL_ERROR_CODES,
} from '../../shared/types/cloud-terminal.protocol.js';
import { TerminalManager } from './terminal-manager.js';
import { getCliCommandForModel, getProviderCommand, checkCliAvailability } from '../model-config.js';
import { PlanBufferExtractor } from '../utils/plan-buffer-extractor.js';
import { backendPort } from '../utils/runtime-paths.js';
import { buildReplayBuffer } from './cloud-terminal-replay.js';
import {
  CLOUD_SESSION_ID_ENV,
  ensureHookSettingsFile,
  loadOrCreateHookSecret,
} from './claude-hooks.js';
import { bumpsActivity, isUnblockingInput, reduceAgentStatus } from './agent-status.js';
import { loadGithubConfigStatus, loadGithubPat } from '../github-config.js';
import { resolveMainWorktreePath } from '../utils/worktree-detect.js';
import { getCloudSessionWorktreeEnabled } from '../general-config.js';
import {
  createCloudSessionWorktree,
  removeCloudSessionWorktree,
  rehydrateOwnedSessionWorktree,
  resolveSessionBase,
  NotAGitRepoError,
  SPECWRIGHT_MAIN_PROJECT_PATH_ENV,
  type OwnedSessionWorktree,
} from '../utils/cloud-session-worktree.js';
import { pathKey } from '../utils/git-worktree-list.js';
import { resolveExistingWorktreeTarget, type ParsedTarget } from '../utils/session-target.js';
import { ensureMcpConfigInWorktree } from '../utils/worktree-story.js';
import { TmuxSessionBackend } from './tmux-session-backend.js';
import {
  CloudSessionRegistry,
  type PersistedCloudSessionV1,
  type PersistedWorktreeV1,
} from './cloud-session-registry.js';
import { getPasteImageRoot, getSessionRegistryPath } from '../utils/runtime-paths.js';
import { sanitizeSessionEnv } from '../utils/session-env.js';
import type { BlockKind, HookContext } from '../../shared/types/hook-events.protocol.js';
import { isClaudeCli } from '../../shared/provider-cli.js';

/** MIME type → filename extension for pasted-image persistence */
const PASTE_MIME_TO_EXT: ReadonlyMap<string, string> = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/gif', 'gif'],
  ['image/webp', 'webp'],
  ['image/heic', 'heic'],
  ['image/heif', 'heif'],
]);

/** Error thrown by savePastedImage; carries a CLOUD_TERMINAL_ERROR_CODES value */
class PasteImageError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'PasteImageError';
  }
}

/**
 * Extended cloud terminal session with internal state
 */
interface ManagedCloudSession extends CloudTerminalSession {
  /** TerminalManager execution ID (internal mapping) */
  executionId: string;

  /** Buffer for output during paused state */
  pausedBuffer: string[];

  /** Flag to track if buffer overflow warning was logged */
  bufferOverflowWarned?: boolean;

  /** True when plan-review mode is active for this session. */
  planReviewEnabled?: boolean;

  /** Timestamp of most recent terminal.data event — used by waitForIdle. */
  lastDataAt?: Date;

  /** Dedup timestamp: last time a plan box was detected. */
  lastPlanDetectedAt?: Date;

  /** Resolved file path of the most recently detected plan (~/.claude[-<provider>]/plans/<slug>.md). */
  lastDetectedPlanPath?: string;

  /**
   * Per-session git worktree bookkeeping. Set **if and only if this session
   * created the worktree** — that is the entire ownership contract, because
   * `disposeSessionWorktree` deletes whatever it finds here on close, exit,
   * create-rollback and shutdown.
   *
   * The type is deliberately `OwnedSessionWorktree`, a branded value only
   * `createCloudSessionWorktree` can produce, so a session that attached to a
   * user-owned worktree cannot populate this field even by accident.
   */
  worktreeCleanup?: OwnedSessionWorktree;

  /** Idempotency guard so worktree teardown runs at most once. */
  worktreeDisposed?: boolean;

  /**
   * Directory the PTY runs in. Assigned synchronously at construction and only
   * ever overwritten synchronously, because it doubles as the occupancy claim
   * for `existing-worktree` targets (see the claim barrier in createSession).
   */
  effectiveCwd: string;

  /**
   * Notices raised before `session.created` was emitted. The client cannot map
   * a `cloud-terminal:notice` to a pending request yet at that point, so these
   * ride along inside the `cloud-terminal:created` response instead.
   */
  pendingNotices?: CloudTerminalNotice[];

  /**
   * tmux session name when this session is tmux-backed (i.e. survives backend
   * restarts). Absent → legacy direct spawn.
   */
  tmuxSessionName?: string;

  /** True when this session was rebuilt from the on-disk registry after a restart. */
  restored?: boolean;

  /**
   * Set by closeSession BEFORE it kills the attach client. The terminal.exit
   * handler checks it first: a closing session always takes the full-teardown
   * path and is never re-attached — without this flag the exit of the killed
   * attach client races the re-attach logic and could resurrect a session the
   * user just closed.
   */
  closing?: boolean;

  /** Consecutive failed re-attach attempts after an isolated attach-client death. */
  reattachAttempts?: number;

  /** Absolute path of the generated tmux run script (tmux-backed only). */
  runScriptPath?: string;

  /** Reduced agent status (see agent-status.ts). Always set internally; exposed only for claude-code sessions. */
  agentStatus: CloudTerminalAgentStatus;

  /** Pending done → idle decay timer (see applyAgentEvent). */
  agentIdleTimer?: NodeJS.Timeout;
  /** INT-2026-016 (AK-02): „fertig, unbeantwortet" — set by `stop`, cleared by an answer or a dialog, kept by the decay. */
  agentDoneAt?: Date;

  // ---- INT-2026-007: hook context, block kind, machine-write lock ----

  /** Transcript file of the claude session, from the last hook payload (FA-01); stored, not read (ADR-0004). */
  transcriptPath?: string;
  claudeSessionId?: string;
  /** Kind of the dialog while `blocked` (FA-09); cleared when the block ends. */
  blockKind?: BlockKind;
  /** Reviewer selection of the plan-review toggle, persisted with the session (FA-08). */
  planReviewReviewers?: Array<{ providerId: string; modelId: string }>;
  /** Path of the plan whose review was last injected (dedup across restarts, E6/E23). */
  lastInjectedPlanPath?: string;
  /** Single-flight lock: a machine write (paste, keys) is in progress (E3/G2). */
  machineWriteBusy?: boolean;
}

/** Result of {@link CloudTerminalManager.withMachineWrite}. */
export type MachineWriteResult<T> = { ok: true; value: T } | { ok: false; grund: 'beschaeftigt' | 'nicht_aktiv' };

/**
 * Detects the closing bar of a Claude Code TUI plan box (╰──...──╯).
 * Checked per terminal.data chunk; extraction uses the full buffer.
 * Detection is best-effort — manual trigger is the reliable fallback.
 * Note (2026-09): current Claude Code draws the plan dialog without a box, so
 * this no longer fires; "Review last plan" is the working path.
 */
export const PLAN_BOX_PATTERN = /╰─{10,}╯/;

/**
 * Cool-down between plan-detected emissions for the same session (ms).
 */
const PLAN_DEDUP_MS = 30 * 1000;

/**
 * Max time waitForIdle will wait before resolving regardless of activity (ms).
 */
const PLAN_IDLE_TIMEOUT_MS = 5000;

/**
 * Raw buffer tail read as "screen" when no tmux pane is available — enough
 * for a full redraw of the plan dialog with a long review typed into it.
 */
export const SCREEN_TAIL_CHARS = 256 * 1024;

/** Last `max` chars of a chunk list, without joining the whole (up to 10 MB) buffer. */
function bufferTail(chunks: readonly string[], max: number): string {
  const parts: string[] = [];
  let len = 0;
  for (let i = chunks.length - 1; i >= 0 && len < max; i--) {
    parts.push(chunks[i]);
    len += chunks[i].length;
  }
  const tail = parts.reverse().join('');
  return tail.length > max ? tail.slice(tail.length - max) : tail;
}

/**
 * CloudTerminalManager - Multi-session terminal manager
 *
 * Emits:
 * - 'session.created' (CloudTerminalSession) - New session created
 * - 'session.closed' (CloudTerminalSessionId, exitCode?) - Session closed
 * - 'session.paused' (CloudTerminalSessionId) - Session paused
 * - 'session.resumed' (CloudTerminalSessionId) - Session resumed
 * - 'session.data' (CloudTerminalSessionId, string) - Terminal output
 * - 'session.error' (CloudTerminalSessionId, Error) - Session error
 * - 'session.plan-detected' (CloudTerminalSessionId, planText, source: 'auto'|'manual') - Plan box detected; planText is extracted buffer content (plan-review only)
 * - 'session.notice' (CloudTerminalSessionId, level: 'warn'|'info', message) - User-facing notice (e.g. worktree kept due to uncommitted changes, or started without worktree)
 * - 'session.agent-event' (CloudTerminalSessionId, event, { preview?, reason?, blockKind?, status, statusAt }) - Agent status changed (Claude Code hooks, keystrokes on a blocked session, idle decay). `stop` still drives the bell.
 * - 'session.hook-context' (CloudTerminalSessionId, { transcriptPath?, claudeSessionId?, cwd? }) - INT-2026-007: a hook reported (a new) transcript path / Claude session id
 */
/**
 * Where the hook settings file and its shared secret live. Tests inject
 * temp paths; `null` disables the hook entirely (sessions start without
 * `--settings`).
 */
export interface HookOptions {
  settingsPath?: string;
  secretPath?: string;
  port?: number;
}

/**
 * Outcome of a {@link CloudTerminalManager.resizeSession} call.
 * - 'ok'            – resize applied
 * - 'not_found'     – no session with that ID
 * - 'resize_failed' – session is alive but the PTY resize threw
 */
export type CloudTerminalResizeResult = 'ok' | 'not_found' | 'resize_failed';

/**
 * INT-2026-016 (AK-04): a persisted mark „fertig, unbeantwortet" comes back
 * after a restart only while it is younger than AGENT_DONE_MAX_AGE_MS.
 */
function restoredDoneAt(iso: string | undefined, now = Date.now()): Date | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  if (!Number.isFinite(t) || now - t > CLOUD_TERMINAL_CONFIG.AGENT_DONE_MAX_AGE_MS) return undefined;
  return new Date(t);
}

export class CloudTerminalManager extends EventEmitter {
  /**
   * Active cloud terminal sessions keyed by session ID
   */
  private sessions: Map<CloudTerminalSessionId, ManagedCloudSession> = new Map();

  /**
   * TerminalManager instance for PTY operations
   */
  private terminalManager: TerminalManager;

  /**
   * Counter for generating internal execution IDs
   */
  private executionIdCounter = 0;

  /**
   * tmux backend for restart-surviving sessions. When unavailable (no tmux,
   * kill switch, dead external server) every path degrades to today's direct
   * spawn.
   */
  private tmux: TmuxSessionBackend;

  /** On-disk session registry (only written for tmux-backed sessions). */
  private registry: CloudSessionRegistry;

  /**
   * Resolves once boot-restore has settled (success, partial, or timeout).
   * Never rejects — a failed restore must never block the server. All
   * session-mutating entry points and the WS cloud-terminal handlers await
   * this so no client can race a half-populated session map.
   */
  private restoreReady: Promise<void>;

  /** Hard cap for the whole boot-restore (restore runs per-session in parallel). */
  private static readonly RESTORE_TIMEOUT_MS = 60_000;

  /**
   * `--settings` file handed to every claude-code session (Stop hook → agent
   * finished). Undefined when the hook could not be set up — sessions then
   * start without it and the bell stays silent (see claude-hooks.ts).
   */
  private hookSettingsPath?: string;
  /** Shared secret the Stop hook must present. Undefined ⇔ hookSettingsPath undefined. */
  private hookSecret?: string;

  constructor(
    terminalManager: TerminalManager,
    tmux?: TmuxSessionBackend,
    registry?: CloudSessionRegistry,
    hooks: HookOptions | null = {}
  ) {
    super();
    this.terminalManager = terminalManager;
    this.tmux = tmux ?? new TmuxSessionBackend();
    this.registry = registry ?? new CloudSessionRegistry(getSessionRegistryPath());

    // Forward TerminalManager events to handle PTY output
    this.setupTerminalManagerListeners();

    // Synchronous on purpose: must exist before the first createSession() or
    // boot-restore below (restored sessions already carry --settings in their
    // run script; a new session must not race the file write).
    if (hooks !== null) {
      try {
        const secret = loadOrCreateHookSecret(hooks.secretPath);
        this.hookSettingsPath = ensureHookSettingsFile(
          hooks.port ?? backendPort(),
          secret,
          hooks.settingsPath
        );
        this.hookSecret = secret;
      } catch (err) {
        console.warn(
          '[CloudTerminalManager] Claude hook setup failed — agent status + bell disabled:',
          err instanceof Error ? err.message : err
        );
      }
    }

    this.tmux.logAvailability();
    this.restoreReady = this.startRestore();
  }

  /** Resolves when boot-restore has settled. See {@link restoreReady}. */
  public whenReady(): Promise<void> {
    return this.restoreReady;
  }

  /** Shared secret expected from the Stop hook; undefined while the hook is disabled. */
  public getHookSecret(): string | undefined {
    return this.hookSecret;
  }

  /**
   * Called by the agent-event HTTP route when one of a session's Claude Code
   * hooks fires. Returns false (no emit) for unknown, closing or closed
   * sessions — a late hook after close must not resurrect a bell entry.
   */
  public reportAgentEvent(
    sessionId: CloudTerminalSessionId,
    event: CloudTerminalAgentEvent,
    detail: CloudTerminalAgentEventDetail = {}
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.closing || session.status === 'closed') {
      return false;
    }
    if (bumpsActivity(event)) {
      session.lastActivity = new Date();
    }
    this.applyAgentEvent(session, event, detail);
    return true;
  }

  /**
   * Prompt text of a `UserPromptSubmit` hook, forwarded server-internally
   * only (INT-2026-004: session↔Vorhaben assignment and send confirmation).
   * Emitted as `session.prompt-text`; never part of `session.agent-event` or
   * any broadcast, and never persisted.
   */
  public reportPromptText(sessionId: CloudTerminalSessionId, prompt: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.closing || session.status === 'closed') {
      return false;
    }
    this.emit('session.prompt-text', sessionId, prompt);
    return true;
  }

  /**
   * Reduces an agent event into the session's status and broadcasts it.
   * Emits on every status or reason change, and on every `stop` (the bell
   * wants each finished turn). Arms the done → idle decay timer; any later
   * event disarms it. Safe to call late: closed sessions are ignored.
   */
  private applyAgentEvent(
    session: ManagedCloudSession,
    event: CloudTerminalAgentEvent,
    detail: CloudTerminalAgentEventDetail = {}
  ): void {
    if (session.closing || session.status === 'closed') return;

    const next = reduceAgentStatus(session.agentStatus, event);
    const reasonChanged = detail.reason !== session.agentStatusReason;
    if (next === session.agentStatus && !reasonChanged && event !== 'stop') return;

    session.agentStatus = next;
    session.agentStatusAt = new Date();
    session.agentStatusReason = detail.reason;
    // INT-2026-016 (AK-02): the mark the bell reads. A Stop sets it; anything
    // that means "somebody acted" (input, dialog, start, failure) clears it;
    // the idle decay and the idle prompt are not an answer and keep it.
    if (event === 'stop') session.agentDoneAt = session.agentStatusAt;
    else if (event !== 'idle-timeout' && event !== 'idle-prompt') session.agentDoneAt = undefined;
    // INT-2026-007 (FA-09): the structured block kind lives and dies with the block.
    session.blockKind = next === 'blocked' ? (detail.blockKind ?? (event === 'blocked' ? 'unbekannt' : session.blockKind ?? 'unbekannt')) : undefined;
    this.clearAgentIdleTimer(session);

    if (next === 'done') {
      const timer = setTimeout(() => {
        // Identity guard: a newer event may have re-armed or cleared the timer.
        if (session.agentIdleTimer === timer) {
          this.applyAgentEvent(session, 'idle-timeout');
        }
      }, CLOUD_TERMINAL_CONFIG.AGENT_IDLE_AFTER_MS);
      // Optional chaining: vitest fake-timer handles have no unref().
      timer.unref?.();
      session.agentIdleTimer = timer;
    }

    // tmux-backed sessions outlive a restart; persist the status with them so
    // the restore does not reset a waiting session to `unknown` (FA-22).
    if (session.tmuxSessionName) {
      void this.registry.upsert(this.toPersistedEntry(session));
    }

    this.emit('session.agent-event', session.sessionId, event, {
      ...detail,
      ...(session.blockKind ? { blockKind: session.blockKind } : {}),
      ...(session.agentDoneAt ? { doneAt: session.agentDoneAt } : {}),
      status: next,
      statusAt: session.agentStatusAt,
    });
  }

  // ---- INT-2026-007: hook context, machine-write lock ----

  /**
   * Transcript path / Claude session id from a hook payload (FA-01). Emits
   * `session.hook-context` only when something changed (a `clear`/`fork`
   * brings a new path, E10) and persists it with the session (FA-08).
   */
  public reportHookContext(sessionId: CloudTerminalSessionId, ctx: HookContext): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.closing || session.status === 'closed') return false;
    const changed =
      (ctx.transcriptPath !== undefined && ctx.transcriptPath !== session.transcriptPath) ||
      (ctx.claudeSessionId !== undefined && ctx.claudeSessionId !== session.claudeSessionId);
    if (!changed) return true;
    if (ctx.transcriptPath !== undefined) session.transcriptPath = ctx.transcriptPath;
    if (ctx.claudeSessionId !== undefined) session.claudeSessionId = ctx.claudeSessionId;
    if (session.tmuxSessionName) void this.registry.upsert(this.toPersistedEntry(session));
    this.emit('session.hook-context', sessionId, {
      transcriptPath: session.transcriptPath,
      claudeSessionId: session.claudeSessionId,
      ...(ctx.cwd ? { cwd: ctx.cwd } : {}),
    } satisfies HookContext);
    return true;
  }

  /**
   * Single-flight lock for machine writes into a session's PTY (E3/G2, AR-08):
   * pastes from the Vorhaben page, card answers, the plan-review inject. A
   * second machine write while one runs is refused with `beschaeftigt` — no
   * waiting, so two UI actions can never interleave their key sequences. Human
   * typing (`cloud-terminal:input`) stays outside the lock; the drivers read
   * the screen before every key to detect it.
   */
  public async withMachineWrite<T>(sessionId: CloudTerminalSessionId, fn: () => Promise<T>): Promise<MachineWriteResult<T>> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') return { ok: false, grund: 'nicht_aktiv' };
    if (session.machineWriteBusy) return { ok: false, grund: 'beschaeftigt' };
    session.machineWriteBusy = true;
    try {
      return { ok: true, value: await fn() };
    } finally {
      session.machineWriteBusy = false;
    }
  }

  /** Reviewer selection of the plan-review toggle, persisted with the session (FA-08). */
  public setPlanReviewReviewers(sessionId: CloudTerminalSessionId, reviewers: Array<{ providerId: string; modelId: string }>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.planReviewReviewers = reviewers.map((r) => ({ providerId: r.providerId, modelId: r.modelId }));
    if (session.tmuxSessionName) void this.registry.upsert(this.toPersistedEntry(session));
  }

  /** Persisted plan-review settings of a session (restore seed for the orchestrator, FA-08). */
  public getPlanReviewSettings(sessionId: CloudTerminalSessionId): { enabled: boolean; reviewers?: Array<{ providerId: string; modelId: string }>; lastInjectedPlanPath?: string } | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    return { enabled: !!session.planReviewEnabled, reviewers: session.planReviewReviewers, lastInjectedPlanPath: session.lastInjectedPlanPath };
  }

  public setLastInjectedPlanPath(sessionId: CloudTerminalSessionId, planPath: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.lastInjectedPlanPath = planPath;
    if (session.tmuxSessionName) void this.registry.upsert(this.toPersistedEntry(session));
  }

  private clearAgentIdleTimer(session: ManagedCloudSession): void {
    if (session.agentIdleTimer) {
      clearTimeout(session.agentIdleTimer);
      session.agentIdleTimer = undefined;
    }
  }

  private startRestore(): Promise<void> {
    if (!this.tmux.isEnabled()) {
      return Promise.resolve();
    }
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        console.warn(
          `[CloudTerminalManager] boot-restore exceeded ${CloudTerminalManager.RESTORE_TIMEOUT_MS}ms — continuing with the sessions restored so far`
        );
        resolve();
      }, CloudTerminalManager.RESTORE_TIMEOUT_MS);
      // Do not keep the process alive just for this watchdog.
      timer.unref?.();
    });
    const restore = this.restorePersistedSessions().catch((err) => {
      console.error('[CloudTerminalManager] boot-restore failed (continuing without restored sessions):', err);
    });
    return Promise.race([restore, timeout]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  /**
   * Create a new Cloud Terminal session
   *
   * @param projectPath - Project path for the terminal
   * @param terminalType - Terminal type ('shell' or 'claude-code')
   * @param modelConfig - Model configuration for Claude Code CLI (required for 'claude-code', unused for 'shell')
   * @param cols - Terminal columns (default: 120)
   * @param rows - Terminal rows (default: 40)
   * @param options.sessionTarget - Where the session runs; supersedes
   *   `isolateInWorktree`. Only honoured for 'claude-code' terminals.
   * @param options.isolateInWorktree - Legacy switch kept so callers that
   *   predate the target picker keep compiling; `true` maps to
   *   `{kind:'new-worktree', explicit:false}`.
   * @returns Created session metadata
   * @throws Error if max sessions reached, the target is invalid/occupied, or spawn fails
   */
  public async createSession(
    projectPath: string,
    terminalType: CloudTerminalType,
    modelConfig?: CloudTerminalModelConfig,
    cols?: number,
    rows?: number,
    initialPrompt?: string,
    extraCliArgs?: string[],
    extraEnv?: Record<string, string>,
    options?: { isolateInWorktree?: boolean; sessionTarget?: ParsedTarget }
  ): Promise<CloudTerminalSession> {
    // Never race the boot-restore: restored sessions must be in the map before
    // new IDs are generated and occupancy is checked.
    await this.restoreReady;

    // Check max sessions limit
    if (this.sessions.size >= CLOUD_TERMINAL_CONFIG.MAX_SESSIONS) {
      const error = new Error(
        `Maximale Anzahl Sessions (${CLOUD_TERMINAL_CONFIG.MAX_SESSIONS}) erreicht`
      );
      (error as Error & { code: string }).code = CLOUD_TERMINAL_ERROR_CODES.MAX_SESSIONS_REACHED;
      throw error;
    }

    // Generate unique session ID
    const sessionId = this.generateSessionId();

    // Generate internal execution ID for TerminalManager
    const executionId = `cloud-${sessionId}`;

    // Normalize the target. Callers that pass neither (workflow tabs, setup
    // shells) run in `projectPath` exactly as they always did.
    const target: ParsedTarget =
      options?.sessionTarget ??
      (options?.isolateInWorktree
        ? { target: { kind: 'new-worktree' }, explicit: false }
        : { target: { kind: 'main' }, explicit: false });

    // Create session metadata
    const session: ManagedCloudSession = {
      sessionId,
      projectPath,
      // Claimed synchronously so a concurrent createSession sees this session
      // as an occupant from the moment it enters the map.
      effectiveCwd: pathKey(projectPath),
      terminalType,
      status: 'creating',
      modelConfig,
      buffer: [],
      pausedBuffer: [],
      createdAt: new Date(),
      lastActivity: new Date(),
      executionId,
      agentStatus: 'unknown',
    };

    // Store session
    this.sessions.set(sessionId, session);

    try {
      let shellCommand: string;
      let shellArgs: string[];
      let shellEnv: Record<string, string>;

      // Ensure UTF-8 locale for correct rendering of umlauts and special characters.
      // INT-2026-007 (FA-01): drop the Claude Code markers this backend inherited
      // from the session it was started in and force transcript persistence —
      // both spawn paths (run script, direct) build on this env.
      const baseEnv = sanitizeSessionEnv(process.env);
      if (!baseEnv.LANG) {
        baseEnv.LANG = 'en_US.UTF-8';
      }
      if (!baseEnv.LC_CTYPE) {
        baseEnv.LC_CTYPE = 'UTF-8';
      }

      // GitHub PAT injection for `git push` against github.com from the terminal.
      // A host-scoped credential helper provisioned by setup-ui-cloud.sh reads
      // $GITHUB_TOKEN and only fires for https://github.com/* — SSH and other
      // hosts are unaffected. If no PAT is configured, nothing is injected.
      if (loadGithubConfigStatus().patConfigured) {
        const pat = loadGithubPat();
        if (pat) {
          baseEnv.GITHUB_TOKEN = pat;
          baseEnv.GIT_ASKPASS = '/dev/null';
          baseEnv.GIT_TERMINAL_PROMPT = '0';
        }
      }

      // Where the PTY runs. Only claude-code honours the target; shell
      // terminals (setup wizard, devteam install, plain shells) always run in
      // the project directory, as they always have.
      let effectiveCwd = projectPath;
      if (terminalType === 'claude-code') {
        switch (target.target.kind) {
          case 'new-worktree': {
            // Resolve BEFORE the config lookup: a registered sub-worktree would
            // otherwise miss its per-project override and silently use defaults.
            const mainProjectPath = resolveMainWorktreePath(projectPath);

            if (!getCloudSessionWorktreeEnabled(mainProjectPath)) {
              if (target.explicit) {
                // The user actively picked "new worktree" — a silent downgrade to
                // the main dir would leave them believing they are isolated.
                const error = new Error(
                  'Worktree-Isolation ist per Konfiguration deaktiviert (cloudSessionWorktree: false)'
                );
                (error as Error & { code: string }).code =
                  CLOUD_TERMINAL_ERROR_CODES.WORKTREE_CREATION_DISABLED;
                throw error;
              }
              // Legacy caller that sent no target: preserve the pre-picker
              // behaviour (run in the project dir) but say so.
              this.addPendingNotice(
                session,
                'warn',
                'Worktree-Isolation ist deaktiviert — Session läuft im Projektverzeichnis.'
              );
              break;
            }

            try {
              const base = await resolveSessionBase(mainProjectPath);
              const owned = await createCloudSessionWorktree(
                mainProjectPath,
                sessionId,
                base,
                target.target.name
              );
              effectiveCwd = owned.worktreePath;
              session.effectiveCwd = pathKey(owned.worktreePath);
              // Route the kanban MCP's runtime writes back to the main repo so
              // per-session copies never diverge.
              baseEnv[SPECWRIGHT_MAIN_PROJECT_PATH_ENV] = mainProjectPath;
              // Ownership: this session created it, so teardown may remove it.
              session.worktreeCleanup = owned;
            } catch (err) {
              if (err instanceof NotAGitRepoError) {
                // Graceful degrade: isolation impossible, run in the main project dir
                // and make the reason visible in the UI rather than hard-failing.
                console.warn(
                  `[CloudTerminalManager] session ${sessionId}: ${err.message} — starting without worktree`
                );
                this.addPendingNotice(
                  session,
                  'warn',
                  'Ohne Worktree gestartet (kein Git-Repository).'
                );
              } else {
                // Git present but worktree creation failed — do NOT silently fall back
                // to the main dir (would defeat isolation). Surface as a hard error.
                throw err;
              }
            }
            break;
          }

          case 'main':
            // Pre-picker behaviour verbatim: the registered project path, no
            // SPECWRIGHT_MAIN_PROJECT_PATH override, no worktree bookkeeping.
            // Deliberately NOT occupancy-checked — shell terminals, the setup
            // wizard and non-git projects all live here, so blocking it would
            // lock the user out after the first session.
            break;

          case 'existing-worktree': {
            const mainProjectPath = resolveMainWorktreePath(projectPath);
            const wtPath = await resolveExistingWorktreeTarget(
              mainProjectPath,
              target.target.path
            );

            // Deliberately NOT occupancy-checked, same as the 'main' branch
            // above: several sessions may share a worktree. The picker shows a
            // "N Sessions aktiv" badge so sharing stays a conscious choice, and
            // disposeSessionWorktree hands the cleanup token to a surviving
            // session instead of deleting the directory underneath it.
            session.effectiveCwd = wtPath;
            effectiveCwd = wtPath;
            baseEnv[SPECWRIGHT_MAIN_PROJECT_PATH_ENV] = mainProjectPath;

            // Seed-only: never clobber a `.mcp.json` the user maintains.
            const mcp = await ensureMcpConfigInWorktree(mainProjectPath, wtPath);
            if (mcp === 'kept-different') {
              this.addPendingNotice(
                session,
                'info',
                'Worktree nutzt eine eigene .mcp.json — kanban-MCP ist evtl. nicht verfügbar.'
              );
            }

            // NO session.worktreeCleanup: this worktree belongs to the user and
            // must survive session teardown. The branded type makes assigning
            // one here a compile error, this comment says why.
            break;
          }

          default: {
            const exhaustive: never = target.target;
            void exhaustive;
            break;
          }
        }
      }

      // Re-check right before spawn: the directory can disappear between
      // validation and launch (external `git worktree remove`, manual rm).
      if (!fs.existsSync(effectiveCwd)) {
        const error = new Error(`Arbeitsverzeichnis existiert nicht: ${effectiveCwd}`);
        (error as Error & { code: string }).code = CLOUD_TERMINAL_ERROR_CODES.TARGET_NOT_FOUND;
        throw error;
      }

      if (terminalType === 'shell') {
        // Plain shell terminal: use system default shell, no Claude Code
        shellCommand = process.env.SHELL || 'bash';
        shellArgs = [];
        shellEnv = baseEnv;
      } else {
        // Claude Code terminal: use CLI command from model config
        if (!modelConfig || !modelConfig.model) {
          throw new Error('Model configuration is required for claude-code terminals');
        }
        const cliConfig = (modelConfig.provider
          ? getProviderCommand(modelConfig.provider, modelConfig.model)
          : undefined) ?? getCliCommandForModel(modelConfig.model);
        shellCommand = cliConfig.command;
        shellArgs = [...cliConfig.args];
        // INT-2026-012: one rule for the session kind (`shared/provider-cli.ts`).
        // A foreign agent CLI (e.g. `codex`) gets neither Claude flags nor the
        // hook settings — it runs without status and bell (AK-06).
        const claudeCli = isClaudeCli(shellCommand);
        // v3.22.0: extra flags (e.g. --mcp-config + --strict-mcp-config) must
        // precede the positional initialPrompt
        if (extraCliArgs && extraCliArgs.length > 0) {
          if (claudeCli) {
            shellArgs.push(...extraCliArgs);
          } else {
            console.warn(`[CloudTerminal] extraCliArgs für fremde CLI '${shellCommand}' verworfen: ${extraCliArgs.join(' ')}`);
          }
        }
        // Claude Code hooks (agent status + bell). Only for claude CLIs / claude-* wrappers
        // — a user-configured foreign CLI must not receive an unknown flag.
        if (this.hookSettingsPath && claudeCli) {
          shellArgs.push('--settings', this.hookSettingsPath);
        }
        if (initialPrompt) {
          shellArgs.push(initialPrompt);
        }
        shellEnv = {
          ...baseEnv,
          CLAUDE_MODEL: modelConfig.model,
          CLAUDE_PROVIDER: modelConfig.provider || 'anthropic',
          // Read by the hook command to name this session in its callback.
          [CLOUD_SESSION_ID_ENV]: sessionId,
          ...(extraEnv ?? {}),
        };
      }

      // Pre-flight check: verify CLI command exists in PATH
      if (!checkCliAvailability(shellCommand)) {
        // INT-2026-012 (E17): name the provider — on a host without the wrapper
        // (cloud droplet) this is the first thing the user sees for OpenAI.
        const hint = shellCommand === 'claude'
          ? 'Bitte installieren: npm install -g @anthropic-ai/claude-code'
          : `Provider '${modelConfig?.provider ?? 'unbekannt'}' braucht dieses Programm auf diesem Host (Wrapper unter ~/bin oder CLI).`;
        const error = new Error(`CLI '${shellCommand}' nicht im PATH gefunden. ${hint}`);
        (error as Error & { code: string }).code = CLOUD_TERMINAL_ERROR_CODES.CLI_NOT_FOUND;
        throw error;
      }

      // Spawn PTY process
      // Cloud terminals disable the inactivity timeout — session runs until the
      // user explicitly closes it (see CLOUD_TERMINAL_CONFIG.INACTIVITY_TIMEOUT_MS).
      //
      // tmux-backed path: the PTY runs a tmux CLIENT; the tmux server (outside
      // our process tree) hosts the real command, so the session survives a
      // backend restart. Falls back to today's direct spawn when tmux is
      // unavailable — that path must stay byte-identical.
      let terminalSession;
      if (this.tmux.isEnabled() && (await this.tmux.ensureServerAvailable()) === 'ok') {
        const tmuxName = this.tmux.sessionName(sessionId);
        const runScript = await this.tmux.writeRunScript(sessionId, {
          cwd: effectiveCwd,
          command: shellCommand,
          args: shellArgs,
          env: shellEnv,
        });
        const spec = this.tmux.buildNewSessionArgv(tmuxName, runScript);
        terminalSession = this.terminalManager.spawn({
          executionId,
          cwd: effectiveCwd,
          shell: spec.shell,
          args: spec.args,
          cols: cols || CLOUD_TERMINAL_CONFIG.DEFAULT_COLS,
          rows: rows || CLOUD_TERMINAL_CONFIG.DEFAULT_ROWS,
          inactivityTimeoutMs: CLOUD_TERMINAL_CONFIG.INACTIVITY_TIMEOUT_MS,
          env: {},
        });
        session.tmuxSessionName = tmuxName;
        session.runScriptPath = runScript;
        await this.registry.upsert(this.toPersistedEntry(session));
      } else {
        if (this.tmux.isEnabled()) {
          // enabled but server unreachable (external mode, unit missing/down)
          this.addPendingNotice(
            session,
            'warn',
            'tmux-Server nicht erreichbar — Session überlebt Backend-Neustarts nicht.'
          );
        }
        terminalSession = this.terminalManager.spawn({
          executionId,
          cwd: effectiveCwd,
          shell: shellCommand,
          args: shellArgs,
          cols: cols || CLOUD_TERMINAL_CONFIG.DEFAULT_COLS,
          rows: rows || CLOUD_TERMINAL_CONFIG.DEFAULT_ROWS,
          inactivityTimeoutMs: CLOUD_TERMINAL_CONFIG.INACTIVITY_TIMEOUT_MS,
          env: shellEnv,
        });
      }

      // Update session with PTY info. For tmux-backed sessions the pid is the
      // tmux CLIENT pid (display metadata only — no server-side logic reads it).
      session.pid = terminalSession.pid;
      session.status = 'active';

      console.log(
        `[CloudTerminalManager] Created ${terminalType} session ${sessionId} for ${projectPath}, PID: ${terminalSession.pid}`
      );

      // Emit session created event
      this.emit('session.created', this.getSessionMetadata(session));

      return this.getSessionMetadata(session);
    } catch (error) {
      // Clean up on failure — including tmux artifacts written before the
      // spawn threw (registry entry, run script, a possibly-created session).
      if (session.tmuxSessionName) {
        void this.tmux.killSession(session.tmuxSessionName);
        void this.tmux.cleanupSessionArtifacts(sessionId);
        void this.registry.remove(sessionId);
      }
      // Clean up on failure — including a worktree created earlier in this call.
      // Narrow window, same rule as the teardown path: if somebody already
      // attached to the fresh worktree, hand the cleanup over instead of
      // deleting the directory under them.
      if (session.worktreeCleanup) {
        const owned = session.worktreeCleanup;
        const { worktreePath, branchName, mainProjectPath, seededClaudeConfig } = owned;
        const successor = this.findCleanupSuccessor(worktreePath, sessionId);
        if (successor) {
          successor.worktreeCleanup = owned;
          session.worktreeCleanup = undefined;
          if (successor.tmuxSessionName) {
            void this.registry.upsert(this.toPersistedEntry(successor));
          }
          console.log(
            `[CloudTerminalManager] rollback kept worktree ${worktreePath}: cleanup handed to ${successor.sessionId}`
          );
        } else {
          void removeCloudSessionWorktree(mainProjectPath, worktreePath, branchName, seededClaudeConfig)
            .catch((err) => console.warn(
              `[CloudTerminalManager] failed to roll back worktree for ${sessionId}:`, err,
            ));
        }
      }
      this.sessions.delete(sessionId);
      console.error(`[CloudTerminalManager] Failed to create session:`, error);
      throw error;
    }
  }

  /**
   * Buffers a notice raised before `session.created` was emitted.
   *
   * At that point the client only knows its own `requestId`, not the
   * `sessionId`, so a `cloud-terminal:notice` broadcast would be unroutable.
   * These ride along inside the `cloud-terminal:created` response instead.
   */
  private addPendingNotice(
    session: ManagedCloudSession,
    level: 'info' | 'warn',
    text: string
  ): void {
    (session.pendingNotices ??= []).push({ level, text });
  }

  /**
   * Directories currently occupied by a live cloud session, keyed by
   * `effectiveCwd` (pathKey-normalized).
   *
   * Closed sessions are excluded: `terminal.exit` flips `status` to 'closed'
   * before the delayed map delete, so Ctrl-D frees the target immediately
   * rather than five seconds later.
   */
  public getOccupiedPaths(): Map<string, { sessionId: CloudTerminalSessionId; count: number }> {
    const out = new Map<string, { sessionId: CloudTerminalSessionId; count: number }>();
    for (const session of this.sessions.values()) {
      if (session.status === 'closed') continue;
      const existing = out.get(session.effectiveCwd);
      if (existing) {
        existing.count += 1;
      } else {
        out.set(session.effectiveCwd, { sessionId: session.sessionId, count: 1 });
      }
    }
    return out;
  }

  /**
   * Another live session in the same directory that can take over an owned
   * worktree's cleanup duty — or undefined when this session is the last one.
   *
   * Deliberately NOT built on `getOccupiedPaths()`: that map names one
   * representative session per path and, on the teardown path, still counts the
   * closing session itself. The exclusion has to happen by session id, because
   * `shutdown()` disposes sessions whose status is still 'active' — a status
   * filter alone would miss it.
   *
   * Candidates that already ran their own dispose (`worktreeDisposed`) are
   * skipped: two sessions closing at the same instant would otherwise hand the
   * duty back and forth and neither would ever clean up.
   */
  private findCleanupSuccessor(
    worktreePath: string,
    excludeSessionId: CloudTerminalSessionId
  ): ManagedCloudSession | undefined {
    // `effectiveCwd` is pathKey-normalized, `worktreeCleanup.worktreePath` is not
    // (macOS: /var vs /private/var) — without this the guard silently never fires.
    const key = pathKey(worktreePath);
    for (const candidate of this.sessions.values()) {
      if (candidate.sessionId === excludeSessionId) continue;
      if (candidate.status === 'closed') continue;
      if (candidate.worktreeDisposed) continue;
      if (candidate.effectiveCwd === key) return candidate;
    }
    return undefined;
  }

  /**
   * Drains the create-time notices of a session (returns and clears them).
   */
  public takePendingNotices(sessionId: CloudTerminalSessionId): CloudTerminalNotice[] {
    const session = this.sessions.get(sessionId);
    if (!session?.pendingNotices?.length) return [];
    const notices = session.pendingNotices;
    session.pendingNotices = undefined;
    return notices;
  }

  /**
   * Idempotently tear down a session's per-session worktree (if any).
   *
   * The `worktreeDisposed` flag is set **synchronously** at the top so the two
   * teardown paths (explicit closeSession + the terminal.exit listener) can
   * both call this without double-removing when they race. Returns the removal
   * promise so shutdown can await it; closeSession/terminal.exit fire-and-forget.
   *
   * When another session still works in the same directory the worktree is not
   * removed — its cleanup token is handed to that session instead, so the last
   * session leaving the directory performs the removal.
   */
  private disposeSessionWorktree(session: ManagedCloudSession): Promise<void> {
    if (session.worktreeDisposed || !session.worktreeCleanup) {
      return Promise.resolve();
    }
    session.worktreeDisposed = true;
    const owned = session.worktreeCleanup;
    const { worktreePath, branchName, mainProjectPath, seededClaudeConfig } = owned;
    const sessionId = session.sessionId;

    // ── Ownership handover, synchronous on purpose ────────────────────────────
    // Since the picker allows several sessions per worktree, this directory may
    // still be somebody's cwd. Removing it would delete a live session's files;
    // merely skipping the removal would leak it forever, because only the
    // creating session carries the (branded) cleanup token. So the token moves
    // to a surviving session and the LAST one out does the cleanup.
    // No `await` between lookup and assignment: Node is single-threaded, which
    // makes this atomic against a concurrently closing sibling.
    const successor = this.findCleanupSuccessor(worktreePath, sessionId);
    if (successor) {
      // Moving an already-minted token, not forging one — the brand only stops
      // an *attaching* session from inventing cleanup rights (see
      // rehydrateOwnedSessionWorktree, which does the same on boot restore).
      successor.worktreeCleanup = owned;
      session.worktreeCleanup = undefined;
      if (successor.tmuxSessionName) {
        void this.registry.upsert(this.toPersistedEntry(successor));
      }
      console.log(
        `[CloudTerminalManager] worktree ${worktreePath} kept: cleanup handed from ${sessionId} to ${successor.sessionId}`
      );
      this.emit(
        'session.notice',
        sessionId,
        'info',
        `Worktree behalten — eine andere Session arbeitet darin weiter: ${worktreePath}`
      );
      return Promise.resolve();
    }

    return removeCloudSessionWorktree(mainProjectPath, worktreePath, branchName, seededClaudeConfig)
      .then((result) => {
        if (result.keptReason === 'dirty') {
          this.emit(
            'session.notice',
            sessionId,
            'warn',
            `Worktree behalten (ungespeicherte Änderungen): ${worktreePath}`
          );
        }
      })
      .catch((err) => console.warn(
        `[CloudTerminalManager] worktree cleanup failed for ${sessionId}:`, err,
      ));
  }

  /**
   * Create a new Cloud Terminal session for workflow execution
   *
   * This is a convenience wrapper around createSession that:
   * 1. Creates a Claude Code terminal session
   * 2. Waits for initialization
   * 3. Automatically sends the workflow command
   *
   * @param projectPath - Project path for the terminal
   * @param workflowMetadata - Workflow metadata containing command and context
   * @param modelConfig - Model configuration for Claude Code CLI
   * @param cols - Terminal columns (default: 120)
   * @param rows - Terminal rows (default: 40)
   * @returns Created session metadata with workflow metadata attached
   * @throws Error if max sessions reached or spawn fails
   */
  public async createWorkflowSession(
    projectPath: string,
    workflowMetadata: CloudTerminalWorkflowMetadata,
    modelConfig: CloudTerminalModelConfig,
    cols?: number,
    rows?: number
  ): Promise<CloudTerminalSession & { workflowMetadata: CloudTerminalWorkflowMetadata }> {
    // Build initial prompt from workflow metadata (e.g., "/specwright:add-bug test")
    let initialPrompt = workflowMetadata.workflowCommand;
    if (workflowMetadata.workflowContext) {
      initialPrompt += ` ${workflowMetadata.workflowContext}`;
    }

    // Pass initial prompt as CLI argument - Claude Code processes it on startup
    // and returns to interactive REPL mode afterwards.
    // Workflow tabs are excluded from per-session worktree isolation (they run
    // against a spec with its own git strategy) → no isolateInWorktree option.
    const session = await this.createSession(projectPath, 'claude-code', modelConfig, cols, rows, initialPrompt);

    console.log(
      `[CloudTerminalManager] Created workflow session ${session.sessionId} with initial prompt: ${initialPrompt}`
    );

    // Return session with workflow metadata attached
    return {
      ...session,
      workflowMetadata,
    };
  }


  /**
   * Close a Cloud Terminal session
   *
   * @param sessionId - Session ID to close
   * @returns true if closed successfully, false if session not found
   */
  public closeSession(sessionId: CloudTerminalSessionId): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Set BEFORE the kill: the attach client's exit event must take the
    // teardown path, never the re-attach path (see ManagedCloudSession.closing).
    session.closing = true;
    this.clearAgentIdleTimer(session);

    // Kill PTY process via TerminalManager
    const killed = this.terminalManager.kill(session.executionId);

    // Update session status
    session.status = 'closed';

    // Tear down the per-session worktree (idempotent; fire-and-forget). Runs
    // BEFORE the map delete so the race with the terminal.exit listener resolves
    // via the synchronous worktreeDisposed flag rather than a lost session ref.
    void this.disposeSessionWorktree(session);

    // tmux-backed: the surviving tmux session must die with the explicit close,
    // and its persisted metadata must go so it is not restored on next boot.
    if (session.tmuxSessionName) {
      void this.tmux.killSession(session.tmuxSessionName);
      void this.tmux.cleanupSessionArtifacts(sessionId);
      void this.registry.remove(sessionId);
    }

    // Remove from sessions
    this.sessions.delete(sessionId);

    // Remove any pasted-image files belonging to this session
    const pasteDir = path.join(getPasteImageRoot(), sessionId);
    fs.promises.rm(pasteDir, { recursive: true, force: true })
      .catch((err) => console.warn(
        `[CloudTerminalManager] Failed to clean up paste dir for ${sessionId}:`, err,
      ));

    console.log(`[CloudTerminalManager] Closed session ${sessionId}`);

    // Emit session closed event
    this.emit('session.closed', sessionId, session.exitCode);

    return killed;
  }

  /**
   * Pause a Cloud Terminal session
   * Output will be buffered while paused
   *
   * @param sessionId - Session ID to pause
   * @returns true if paused successfully, false if session not found
   */
  public pauseSession(sessionId: CloudTerminalSessionId): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    if (session.status !== 'active') {
      console.warn(`[CloudTerminalManager] Cannot pause session ${sessionId}, status: ${session.status}`);
      return false;
    }

    session.status = 'paused';
    session.pausedAt = new Date();

    console.log(`[CloudTerminalManager] Paused session ${sessionId}`);

    // Emit session paused event
    this.emit('session.paused', sessionId);

    return true;
  }

  /**
   * Resume a paused Cloud Terminal session
   * Buffered output will be sent to client
   *
   * @param sessionId - Session ID to resume
   * @returns Buffered output during pause, or null if session not found
   */
  public resumeSession(sessionId: CloudTerminalSessionId): string | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    if (session.status === 'active') {
      // Idempotent resume: a client that lost its WebSocket (e.g. mobile tab
      // backgrounded) reconnects and resumes - but the session was never
      // paused because the disconnect happened without a pause message.
      // Treat as success so the client doesn't falsely see SESSION_NOT_FOUND.
      console.log(`[CloudTerminalManager] Resume requested for already-active session ${sessionId}`);
      this.emit('session.resumed', sessionId, '');
      return '';
    }

    if (session.status !== 'paused') {
      console.warn(`[CloudTerminalManager] Cannot resume session ${sessionId}, status: ${session.status}`);
      return null;
    }

    session.status = 'active';
    session.pausedAt = undefined;

    // Get buffered output (raw chunks, no separator - preserves exact PTY output)
    const bufferedOutput = session.pausedBuffer.join('');
    session.pausedBuffer = []; // Clear paused buffer

    console.log(`[CloudTerminalManager] Resumed session ${sessionId}`);

    // Emit session resumed event
    this.emit('session.resumed', sessionId, bufferedOutput);

    return bufferedOutput;
  }

  /**
   * Send input to a Cloud Terminal session
   *
   * @param sessionId - Target session ID
   * @param data - Input data (keystrokes, paste)
   * @returns true if written successfully, false if session not found or not active
   */
  /**
   * Writes to the session's PTY. `inferUnblock` (default true) lets an
   * answer-shaped keystroke on a blocked session count as the user's answer;
   * machine-originated text (plan-review inject) passes `false` because it is
   * not an answer — the dialog it lands in keeps waiting.
   */
  public sendInput(
    sessionId: CloudTerminalSessionId,
    data: string,
    opts: { inferUnblock?: boolean } = {}
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    if (session.status !== 'active') {
      console.warn(`[CloudTerminalManager] Cannot send input to session ${sessionId}, status: ${session.status}`);
      return false;
    }

    const written = this.terminalManager.write(session.executionId, data);

    if (written) {
      session.lastActivity = new Date();
      // Claude does not report that a permission dialog was answered; an
      // answer-shaped keystroke on a blocked session is the signal.
      if (opts.inferUnblock !== false && session.agentStatus === 'blocked' && isUnblockingInput(data)) {
        this.applyAgentEvent(session, 'user-input');
      }
    }

    return written;
  }

  /**
   * Persist a pasted image (e.g. screenshot) and inject its absolute path into the PTY.
   *
   * The cloud Claude Code CLI cannot read the user's local clipboard (it runs on the
   * droplet, no display server). This method bridges that gap: the browser uploads the
   * image bytes; we write them to /tmp/cloud-terminal-paste/<sessionId>/ and feed the
   * resulting path into stdin so the user can reference it from the prompt.
   *
   * @throws PasteImageError with a CLOUD_TERMINAL_ERROR_CODES code on any validation failure
   */
  public async savePastedImage(
    sessionId: CloudTerminalSessionId,
    base64: string,
    mimeType: string,
  ): Promise<{ absolutePath: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new PasteImageError(
        CLOUD_TERMINAL_ERROR_CODES.SESSION_NOT_FOUND,
        `Session not found: ${sessionId}`,
      );
    }
    if (session.status !== 'active') {
      throw new PasteImageError(
        CLOUD_TERMINAL_ERROR_CODES.SESSION_NOT_ACTIVE,
        `Session not active: ${session.status}`,
      );
    }
    const ext = PASTE_MIME_TO_EXT.get(mimeType);
    if (!ext) {
      throw new PasteImageError(
        CLOUD_TERMINAL_ERROR_CODES.PASTE_IMAGE_UNSUPPORTED_TYPE,
        `Unsupported MIME type: ${mimeType}`,
      );
    }

    const buf = Buffer.from(base64, 'base64');
    if (buf.length === 0) {
      throw new PasteImageError(
        CLOUD_TERMINAL_ERROR_CODES.PASTE_IMAGE_FAILED,
        'Decoded image is empty',
      );
    }
    if (buf.length > CLOUD_TERMINAL_CONFIG.MAX_PASTE_IMAGE_BYTES) {
      throw new PasteImageError(
        CLOUD_TERMINAL_ERROR_CODES.PASTE_IMAGE_TOO_LARGE,
        `Image too large: ${buf.length} bytes`,
      );
    }

    const dir = path.join(getPasteImageRoot(), sessionId);
    await fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });
    const absolutePath = path.join(dir, `img-${randomUUID()}.${ext}`);
    await fs.promises.writeFile(absolutePath, buf, { mode: 0o600 });

    // Inject path directly into the PTY with surrounding spaces so it sits as a
    // distinct token regardless of where the user's cursor currently is.
    this.terminalManager.write(session.executionId, ` ${absolutePath} `);
    session.lastActivity = new Date();

    return { absolutePath };
  }

  /**
   * Resize a Cloud Terminal session.
   *
   * Returns a discriminated outcome so callers can distinguish a genuinely missing
   * session ('not_found') from a live session whose PTY resize could not be applied
   * ('resize_failed'). Conflating the two previously made the UI tear down a live
   * session on a transient resize failure.
   *
   * @param sessionId - Target session ID
   * @param cols - Number of columns
   * @param rows - Number of rows
   */
  public resizeSession(
    sessionId: CloudTerminalSessionId,
    cols: number,
    rows: number
  ): CloudTerminalResizeResult {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return 'not_found';
    }

    try {
      this.terminalManager.resize({
        executionId: session.executionId,
        cols,
        rows,
      });
      return 'ok';
    } catch (error) {
      console.error(`[CloudTerminalManager] Failed to resize session ${sessionId}:`, error);
      return 'resize_failed';
    }
  }

  /**
   * Replay buffer for a `cloud-terminal:buffer-request`: the raw PTY chunks,
   * prefixed with the tmux client's attach modes when the session is tmux-backed
   * (see cloud-terminal-replay.ts for why). Undefined when the session is unknown.
   */
  public getReplayBuffer(sessionId: CloudTerminalSessionId): string | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    return buildReplayBuffer(session.buffer, Boolean(session.tmuxSessionName));
  }

  /**
   * Get a Cloud Terminal session
   *
   * @param sessionId - Session ID
   * @returns Session metadata or undefined if not found
   */
  public getSession(sessionId: CloudTerminalSessionId): CloudTerminalSession | undefined {
    const session = this.sessions.get(sessionId);
    return session ? this.getSessionMetadata(session) : undefined;
  }

  /**
   * Get all Cloud Terminal sessions for a project
   *
   * @param projectPath - Project path to filter
   * @returns Array of session metadata
   */
  public getSessionsForProject(projectPath: string): CloudTerminalSession[] {
    return Array.from(this.sessions.values())
      .filter((session) => session.projectPath === projectPath)
      .map((session) => this.getSessionMetadata(session));
  }

  /**
   * Get all active Cloud Terminal sessions
   *
   * @returns Array of all session metadata
   */
  public getAllSessions(): CloudTerminalSession[] {
    return Array.from(this.sessions.values()).map((session) =>
      this.getSessionMetadata(session)
    );
  }

  /**
   * Get the count of active sessions
   *
   * @returns Number of active sessions
   */
  public getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Check if a session exists
   *
   * @param sessionId - Session ID to check
   * @returns true if session exists
   */
  public hasSession(sessionId: CloudTerminalSessionId): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Set up listeners for TerminalManager events
   */
  private setupTerminalManagerListeners(): void {
    // Handle terminal data
    this.terminalManager.on('terminal.data', (executionId: string, data: string) => {
      // Find session by execution ID
      const session = this.findSessionByExecutionId(executionId);
      if (!session) {
        return;
      }

      // Add to appropriate buffer based on session status
      if (session.status === 'paused') {
        this.addToPausedBuffer(session, data);
      } else {
        this.addToBuffer(session, data);
      }

      // Track latest activity on output too — the stall watchdog reads this.
      session.lastActivity = new Date();

      if (session.planReviewEnabled) {
        session.lastDataAt = new Date();
        this.detectPlanBox(session, data);
      }

      // Emit data event
      this.emit('session.data', session.sessionId, data);
    });

    // Handle terminal exit
    this.terminalManager.on('terminal.exit', (executionId: string, exitCode: number) => {
      // Find session by execution ID
      const session = this.findSessionByExecutionId(executionId);
      if (!session) {
        return;
      }

      if (session.tmuxSessionName && !session.closing) {
        // tmux-backed: the exiting process is only the ATTACH CLIENT. Two cases:
        //   (a) the inner command exited → tmux session destroyed → real exit.
        //   (b) the client died in isolation → tmux session still alive →
        //       re-attach instead of closing (closing here would destroy the
        //       worktree/registry entry of a live session).
        void this.handleTmuxClientExit(session, exitCode);
        return;
      }

      this.finalizeSessionExit(session, exitCode);
    });
  }

  /**
   * Distinguishes a real inner-command exit from an isolated attach-client
   * death for a tmux-backed session (see the terminal.exit listener).
   */
  private async handleTmuxClientExit(
    session: ManagedCloudSession,
    clientExitCode: number
  ): Promise<void> {
    const tmuxName = session.tmuxSessionName as string;
    const alive = await this.tmux.hasSession(tmuxName);

    // Re-check: closeSession may have run while hasSession was in flight.
    if (session.closing || !this.sessions.has(session.sessionId)) {
      return;
    }

    if (alive) {
      const attempts = (session.reattachAttempts ?? 0) + 1;
      session.reattachAttempts = attempts;
      if (attempts <= 3) {
        console.warn(
          `[CloudTerminalManager] attach client for ${session.sessionId} died (code ${clientExitCode}) while tmux session lives — re-attaching (attempt ${attempts}/3)`
        );
        setTimeout(() => {
          void this.reattachSession(session);
        }, attempts * 500);
        return;
      }
      console.error(
        `[CloudTerminalManager] giving up re-attaching ${session.sessionId} after ${attempts - 1} attempts — closing`
      );
    }

    // Real exit (or unrecoverable client): prefer the inner command's exit code
    // from the run-script's exit file; fall back to the client's code when the
    // file is missing (SIGKILL of the inner process, kill-session).
    const innerCode = await this.tmux.readExitCode(session.sessionId);
    void this.tmux.cleanupSessionArtifacts(session.sessionId);
    void this.registry.remove(session.sessionId);
    this.finalizeSessionExit(session, innerCode ?? clientExitCode);
  }

  /** Shared tail of the exit path (direct-spawn behavior, unchanged). */
  private finalizeSessionExit(session: ManagedCloudSession, exitCode: number): void {
    session.exitCode = exitCode;
    session.status = 'closed';
    this.clearAgentIdleTimer(session);

    console.log(`[CloudTerminalManager] Session ${session.sessionId} exited with code ${exitCode}`);

    // Tear down the per-session worktree (idempotent). Runs now — before the
    // delayed delete — so a crashed/exited CLI doesn't orphan its worktree.
    void this.disposeSessionWorktree(session);

    // Emit session closed event
    this.emit('session.closed', session.sessionId, exitCode);

    // Remove from sessions after a brief delay
    setTimeout(() => {
      this.sessions.delete(session.sessionId);
    }, 5000);
  }

  /**
   * Spawns a fresh attach client for a live tmux session after the previous
   * client died (isolated client crash, or boot-restore). Uses a fresh
   * executionId — the old one may still occupy TerminalManager's map during
   * its 5s cleanup grace period.
   */
  private reattachSession(session: ManagedCloudSession): void {
    if (session.closing || !this.sessions.has(session.sessionId)) {
      return;
    }
    const tmuxName = session.tmuxSessionName as string;
    const spec = this.tmux.buildAttachArgv(tmuxName);
    const executionId = `cloud-${session.sessionId}-r${Date.now()}`;
    try {
      const ts = this.terminalManager.spawn({
        executionId,
        cwd: fs.existsSync(session.effectiveCwd) ? session.effectiveCwd : session.projectPath,
        shell: spec.shell,
        args: spec.args,
        cols: CLOUD_TERMINAL_CONFIG.DEFAULT_COLS,
        rows: CLOUD_TERMINAL_CONFIG.DEFAULT_ROWS,
        inactivityTimeoutMs: CLOUD_TERMINAL_CONFIG.INACTIVITY_TIMEOUT_MS,
        env: {},
      });
      session.executionId = executionId;
      session.pid = ts.pid;
      session.status = 'active';
      console.log(`[CloudTerminalManager] re-attached session ${session.sessionId} (pid ${ts.pid})`);
    } catch (err) {
      console.error(`[CloudTerminalManager] re-attach spawn failed for ${session.sessionId}:`, err);
      // The next terminal.exit for the old executionId will not fire again;
      // treat as unrecoverable.
      void this.tmux.cleanupSessionArtifacts(session.sessionId);
      void this.registry.remove(session.sessionId);
      this.finalizeSessionExit(session, session.exitCode ?? 1);
    }
  }

  /**
   * Enable or disable plan-review scanning for a session.
   * When disabled, resets plan-detection state.
   */
  public setPlanReviewEnabled(sessionId: CloudTerminalSessionId, enabled: boolean): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    session.planReviewEnabled = enabled;
    if (!enabled) {
      session.lastPlanDetectedAt = undefined;
      session.lastDataAt = undefined;
    }
    // INT-2026-007 (FA-08): the toggle survives a backend restart.
    if (session.tmuxSessionName) void this.registry.upsert(this.toPersistedEntry(session));
  }

  /**
   * Manually trigger plan detection on the current buffer.
   * Extracts plan text and emits `session.plan-detected` with source='manual'.
   * Does not apply the dedup window — manual triggers always fire.
   */
  public triggerManualReview(sessionId: CloudTerminalSessionId): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    const result = new PlanBufferExtractor().extract(session.buffer.join(''));
    if (!result) {
      console.warn(`[CloudTerminalManager] plan-detected-skipped-no-plan-path session=${sessionId} source=manual`);
      return;
    }
    session.lastDetectedPlanPath = result.planPath;
    console.log(`[CloudTerminalManager] Manual plan review triggered for session ${sessionId} (path=${result.planPath})`);
    this.emit('session.plan-detected', sessionId, result.planText, 'manual');
  }

  /**
   * Resolves when the session has been idle (no terminal.data) for at least
   * `idleMs` milliseconds, or after PLAN_IDLE_TIMEOUT_MS total wait — whichever
   * comes first. Used by PlanReviewOrchestrator before injecting review text.
   */
  public waitForIdle(sessionId: CloudTerminalSessionId, idleMs: number): Promise<void> {
    return new Promise((resolve) => {
      const deadline = Date.now() + PLAN_IDLE_TIMEOUT_MS;
      const interval = setInterval(() => {
        const session = this.sessions.get(sessionId);
        if (!session || Date.now() >= deadline) {
          clearInterval(interval);
          resolve();
          return;
        }
        const lastData = session.lastDataAt?.getTime() ?? 0;
        if (Date.now() - lastData >= idleMs) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  }

  /**
   * What the user sees in the session right now. tmux-backed: the pane as
   * plain text (`live: true`), with `scrollback` history lines above it when
   * asked. Otherwise, or when the capture fails: the raw PTY buffer tail
   * (`live: false`) — escapes intact and possibly holding stale Ink frames,
   * see utils/plan-dialog-state.ts.
   */
  public async readScreen(
    sessionId: CloudTerminalSessionId,
    opts: { scrollback?: number } = {}
  ): Promise<{ text: string; live: boolean }> {
    const session = this.sessions.get(sessionId);
    if (!session) return { text: '', live: false };
    if (session.tmuxSessionName) {
      const screen = await this.tmux.captureScreen(session.tmuxSessionName, opts.scrollback ?? 0);
      if (screen !== null) return { text: screen, live: true };
    }
    return { text: bufferTail(session.buffer, SCREEN_TAIL_CHARS), live: false };
  }

  /**
   * Scan an output chunk for the TUI plan-box closing marker.
   * On match, extracts plan text from buffer and emits `session.plan-detected`.
   * Emits at most once per PLAN_DEDUP_MS per session.
   */
  private detectPlanBox(session: ManagedCloudSession, data: string): void {
    if (!PLAN_BOX_PATTERN.exec(data)) {
      return;
    }
    const now = Date.now();
    if (session.lastPlanDetectedAt && now - session.lastPlanDetectedAt.getTime() < PLAN_DEDUP_MS) {
      return;
    }
    session.lastPlanDetectedAt = new Date(now);
    const result = new PlanBufferExtractor().extract(session.buffer.join(''));
    if (!result) {
      console.warn(`[CloudTerminalManager] plan-detected-skipped-no-plan-path session=${session.sessionId} source=auto`);
      return;
    }
    session.lastDetectedPlanPath = result.planPath;
    console.log(`[CloudTerminalManager] Plan box detected in session ${session.sessionId} (auto, path=${result.planPath})`);
    this.emit('session.plan-detected', session.sessionId, result.planText, 'auto');
  }

  /**
   * Serializes a session into its registry record.
   */
  private toPersistedEntry(session: ManagedCloudSession): PersistedCloudSessionV1 {
    const wt = session.worktreeCleanup;
    return {
      sessionId: session.sessionId,
      projectPath: session.projectPath,
      effectiveCwd: session.effectiveCwd,
      terminalType: session.terminalType,
      modelConfig: session.modelConfig,
      createdAt: session.createdAt.toISOString(),
      tmuxSessionName: session.tmuxSessionName ?? this.tmux.sessionName(session.sessionId),
      runScriptPath: session.runScriptPath ?? '',
      worktree: wt
        ? {
            worktreePath: wt.worktreePath,
            branchName: wt.branchName,
            mainProjectPath: wt.mainProjectPath,
            seededClaudeConfig: [...wt.seededClaudeConfig],
          }
        : undefined,
      autoMode: false,
      agentStatus: session.agentStatus,
      agentStatusAt: session.agentStatusAt?.toISOString(),
      agentStatusReason: session.agentStatusReason,
      agentDoneAt: session.agentDoneAt?.toISOString(),
      transcriptPath: session.transcriptPath,
      claudeSessionId: session.claudeSessionId,
      blockKind: session.blockKind,
      planReviewEnabled: session.planReviewEnabled,
      planReviewReviewers: session.planReviewReviewers,
      lastDetectedPlanPath: session.lastDetectedPlanPath,
      lastInjectedPlanPath: session.lastInjectedPlanPath,
    };
  }

  /**
   * Boot-restore: rebuild the in-memory session map from the on-disk registry
   * and reattach to the tmux sessions that survived the restart. Sessions are
   * restored in parallel; the caller (startRestore) enforces the overall cap.
   *
   * Ordering guarantee: entries land in `this.sessions` (occupancy + stable
   * IDs) before any WS handler runs, because every cloud-terminal entry point
   * awaits `restoreReady`.
   */
  private async restorePersistedSessions(): Promise<void> {
    // Probe the server AND push the current tmux-cloud.conf into it before any
    // attach: the server outlives backend restarts, so it may still be running
    // the config it was started with. Client terminal capabilities are resolved
    // at attach time, so the fresh attach clients below pick up the new config.
    if ((await this.tmux.ensureServerAvailable()) !== 'ok') {
      console.warn('[CloudTerminalManager] tmux server unavailable — no sessions restored');
      return;
    }

    const { entries, healthy } = await this.registry.load();

    if (healthy) {
      // Only with trustworthy metadata: cs-* sessions nobody claims are
      // unrecoverable (no project/cwd/model info) and get killed. With an
      // unhealthy registry we leave everything alive for manual recovery.
      await this.tmux.killOrphans(new Set(entries.map((e) => e.tmuxSessionName)));
    } else if (entries.length === 0) {
      console.warn(
        '[CloudTerminalManager] session registry unreadable — skipping orphan cleanup, no sessions restored'
      );
    }

    if (entries.length === 0) {
      return;
    }

    const live = await this.tmux.listSessions();

    // Which directories are still in use by a session that survives this boot?
    // Decided from `entries` + the `live` snapshot rather than `this.sessions`:
    // restores and reaps run concurrently below, so the map is incomplete while
    // a reap decides whether it may delete a worktree. The snapshot is taken
    // before any restore, and boot-restore creates no new tmux sessions, so it
    // cannot go stale within this function.
    const survivingByCwd = new Map<string, PersistedCloudSessionV1>();
    for (const entry of entries) {
      if (live.has(entry.tmuxSessionName)) {
        survivingByCwd.set(pathKey(entry.effectiveCwd), entry);
      }
    }

    // Cleanup tokens of reaped sessions whose worktree a survivor still uses:
    // re-homed after the restores, when the surviving session is in the map.
    const handovers: Array<{ to: CloudTerminalSessionId; worktree: PersistedWorktreeV1 }> = [];

    await Promise.allSettled(
      entries.map((entry) =>
        live.has(entry.tmuxSessionName)
          ? this.restoreEntry(entry, survivingByCwd, handovers)
          : this.reapDeadEntry(entry, survivingByCwd, handovers)
      )
    );

    for (const { to, worktree } of handovers) {
      const target = this.sessions.get(to);
      const owned = target ? rehydrateOwnedSessionWorktree(worktree) : undefined;
      if (!target || !owned) {
        // Restore of the survivor failed after all — leave the worktree on disk
        // rather than deleting a directory we can no longer reason about.
        console.warn(
          `[CloudTerminalManager] worktree ${worktree.worktreePath} left in place: successor ${to} not restored`
        );
        continue;
      }
      target.worktreeCleanup = owned;
      console.log(
        `[CloudTerminalManager] worktree ${worktree.worktreePath}: cleanup handed to restored session ${to}`
      );
    }

    // Persist the surviving set in one go (drops reaped/failed entries) — this
    // also persists the handovers above.
    const survivors = Array.from(this.sessions.values())
      .filter((s) => s.tmuxSessionName && s.status !== 'closed')
      .map((s) => this.toPersistedEntry(s));
    await this.registry.replaceAll(survivors);

    console.log(
      `[CloudTerminalManager] boot-restore complete: ${survivors.length}/${entries.length} sessions reattached`
    );
  }

  /** Rebuilds one session from its registry record and reattaches. */
  private async restoreEntry(
    entry: PersistedCloudSessionV1,
    survivingByCwd: Map<string, PersistedCloudSessionV1>,
    handovers: Array<{ to: CloudTerminalSessionId; worktree: PersistedWorktreeV1 }>
  ): Promise<void> {
    const session: ManagedCloudSession = {
      sessionId: entry.sessionId,
      projectPath: entry.projectPath,
      effectiveCwd: entry.effectiveCwd,
      terminalType: entry.terminalType,
      status: 'creating',
      modelConfig: entry.modelConfig,
      buffer: [],
      pausedBuffer: [],
      createdAt: new Date(entry.createdAt),
      lastActivity: new Date(),
      executionId: `cloud-${entry.sessionId}`,
      tmuxSessionName: entry.tmuxSessionName,
      runScriptPath: entry.runScriptPath || undefined,
      restored: true,
      agentStatus: entry.agentStatus ?? 'unknown',
      agentStatusAt: entry.agentStatusAt ? new Date(entry.agentStatusAt) : undefined,
      agentStatusReason: entry.agentStatusReason,
      agentDoneAt: restoredDoneAt(entry.agentDoneAt),
      transcriptPath: entry.transcriptPath,
      claudeSessionId: entry.claudeSessionId,
      blockKind: entry.agentStatus === 'blocked' ? entry.blockKind ?? 'unbekannt' : undefined,
      planReviewEnabled: entry.planReviewEnabled,
      planReviewReviewers: entry.planReviewReviewers,
      lastDetectedPlanPath: entry.lastDetectedPlanPath,
      lastInjectedPlanPath: entry.lastInjectedPlanPath,
      worktreeCleanup: entry.worktree
        ? rehydrateOwnedSessionWorktree(entry.worktree)
        : undefined,
    };

    // Seed the scrollback from tmux history BEFORE attaching — the attach
    // redraw then appends the live screen, so buffer-request replays both.
    const history = await this.tmux.capturePaneHistory(
      entry.tmuxSessionName,
      CLOUD_TERMINAL_CONFIG.MAX_BUFFER_LINES
    );
    if (history) {
      session.buffer.push(history);
    }

    // Into the map first: occupancy (getOccupiedPaths) and the session-ID
    // collision guard both read from here.
    this.sessions.set(entry.sessionId, session);

    try {
      this.reattachRestoredSession(session);
    } catch (err) {
      console.error(`[CloudTerminalManager] failed to reattach ${entry.sessionId}:`, err);
      this.sessions.delete(entry.sessionId);
      await this.reapDeadEntry(entry, survivingByCwd, handovers);
    }
  }

  /** Attach-PTY spawn for a restored session (throws on failure). */
  private reattachRestoredSession(session: ManagedCloudSession): void {
    const spec = this.tmux.buildAttachArgv(session.tmuxSessionName as string);
    const ts = this.terminalManager.spawn({
      executionId: session.executionId,
      // attach needs no particular cwd; be safe if the dir vanished meanwhile.
      cwd: fs.existsSync(session.effectiveCwd) ? session.effectiveCwd : process.cwd(),
      shell: spec.shell,
      args: spec.args,
      cols: CLOUD_TERMINAL_CONFIG.DEFAULT_COLS,
      rows: CLOUD_TERMINAL_CONFIG.DEFAULT_ROWS,
      inactivityTimeoutMs: CLOUD_TERMINAL_CONFIG.INACTIVITY_TIMEOUT_MS,
      env: {},
    });
    session.pid = ts.pid;
    session.status = 'active';
  }

  /**
   * A registry entry whose tmux session died while the backend was down:
   * treat like an exit that happened in absence — dispose the owned worktree,
   * remove launch artifacts, paste dir and the registry entry.
   */
  private async reapDeadEntry(
    entry: PersistedCloudSessionV1,
    survivingByCwd: Map<string, PersistedCloudSessionV1>,
    handovers: Array<{ to: CloudTerminalSessionId; worktree: PersistedWorktreeV1 }>
  ): Promise<void> {
    console.log(`[CloudTerminalManager] reaping dead session ${entry.sessionId} (tmux session gone)`);
    if (entry.worktree) {
      const owned = rehydrateOwnedSessionWorktree(entry.worktree);
      if (owned) {
        // A surviving session may sit in this worktree since several sessions
        // per directory are allowed. Removing it here would delete a live
        // session's files, and dropping the registry entry (below) would lose
        // the only cleanup token — so the token is queued for handover instead.
        const survivor = survivingByCwd.get(pathKey(owned.worktreePath));
        if (survivor && survivor.sessionId !== entry.sessionId) {
          handovers.push({ to: survivor.sessionId, worktree: entry.worktree });
        } else {
          await removeCloudSessionWorktree(
            owned.mainProjectPath,
            owned.worktreePath,
            owned.branchName,
            owned.seededClaudeConfig
          ).catch((err) =>
            console.warn(`[CloudTerminalManager] worktree cleanup failed for ${entry.sessionId}:`, err)
          );
        }
      }
    }
    await this.tmux.cleanupSessionArtifacts(entry.sessionId);
    await fs.promises
      .rm(path.join(getPasteImageRoot(), entry.sessionId), { recursive: true, force: true })
      .catch(() => {});
    await this.registry.remove(entry.sessionId);
  }

  /**
   * Find a session by its internal execution ID
   */
  private findSessionByExecutionId(executionId: string): ManagedCloudSession | undefined {
    return Array.from(this.sessions.values()).find(
      (session) => session.executionId === executionId
    );
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): CloudTerminalSessionId {
    // The counter resets on restart, so a restored session could occupy the
    // freshly generated ID — loop until free (createSession additionally waits
    // for restoreReady, so the restored IDs are already in the map here).
    let id: CloudTerminalSessionId;
    do {
      id = `cloud-${Date.now()}-${++this.executionIdCounter}`;
    } while (this.sessions.has(id));
    return id;
  }

  /**
   * Add data to session buffer with size limits.
   * Stores raw PTY output chunks without splitting - this preserves
   * ANSI escape sequences and cursor positioning commands intact.
   * Splitting on '\n' and re-joining would insert spurious newlines
   * at chunk boundaries, breaking TUI applications like Claude Code.
   */
  private addToBuffer(session: ManagedCloudSession, data: string): void {
    session.buffer.push(data);

    // Enforce chunk count limit
    if (session.buffer.length > CLOUD_TERMINAL_CONFIG.MAX_BUFFER_LINES) {
      const overflow = session.buffer.length - CLOUD_TERMINAL_CONFIG.MAX_BUFFER_LINES;
      session.buffer.splice(0, overflow);
      if (!session.bufferOverflowWarned) {
        console.warn(
          `[CloudTerminalManager] Buffer limit reached for ${session.sessionId}, old chunks trimmed`
        );
        session.bufferOverflowWarned = true;
      }
    }

    // Enforce total size limit
    let totalSize = 0;
    for (const chunk of session.buffer) {
      totalSize += chunk.length;
    }
    if (totalSize > CLOUD_TERMINAL_CONFIG.MAX_BUFFER_SIZE) {
      while (session.buffer.length > 0) {
        totalSize -= session.buffer[0].length;
        session.buffer.shift();
        if (totalSize <= CLOUD_TERMINAL_CONFIG.MAX_BUFFER_SIZE) break;
      }
      if (!session.bufferOverflowWarned) {
        console.warn(
          `[CloudTerminalManager] Buffer size limit reached for ${session.sessionId}, trimmed to ${session.buffer.length} chunks`
        );
        session.bufferOverflowWarned = true;
      }
    }
  }

  /**
   * Add data to paused buffer with size limits.
   * Stores raw PTY output chunks without splitting (see addToBuffer).
   */
  private addToPausedBuffer(session: ManagedCloudSession, data: string): void {
    session.pausedBuffer.push(data);

    // Enforce chunk count limit for paused buffer (smaller limit)
    const maxPausedChunks = Math.floor(CLOUD_TERMINAL_CONFIG.MAX_BUFFER_LINES / 2);
    if (session.pausedBuffer.length > maxPausedChunks) {
      const overflow = session.pausedBuffer.length - maxPausedChunks;
      session.pausedBuffer.splice(0, overflow);
    }

    // Enforce size limit for paused buffer
    const maxPausedSize = Math.floor(CLOUD_TERMINAL_CONFIG.MAX_BUFFER_SIZE / 2);
    let totalSize = 0;
    for (const chunk of session.pausedBuffer) {
      totalSize += chunk.length;
    }
    if (totalSize > maxPausedSize) {
      while (session.pausedBuffer.length > 0) {
        totalSize -= session.pausedBuffer[0].length;
        session.pausedBuffer.shift();
        if (totalSize <= maxPausedSize) break;
      }
    }
  }

  /**
   * Extract public session metadata (without internal fields)
   */
  private getSessionMetadata(session: ManagedCloudSession): CloudTerminalSession {
    return {
      sessionId: session.sessionId,
      projectPath: session.projectPath,
      effectiveCwd: session.effectiveCwd,
      terminalType: session.terminalType,
      status: session.status,
      modelConfig: session.modelConfig,
      pid: session.pid,
      buffer: [...session.buffer],
      exitCode: session.exitCode,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      pausedAt: session.pausedAt,
      lastDetectedPlanPath: session.lastDetectedPlanPath,
      // Shell sessions never carry an agent status on the wire.
      ...(session.terminalType === 'claude-code'
        ? {
            agentStatus: session.agentStatus,
            agentStatusAt: session.agentStatusAt,
            agentStatusReason: session.agentStatusReason,
            ...(session.agentDoneAt ? { agentDoneAt: session.agentDoneAt } : {}),
            ...(session.blockKind ? { blockKind: session.blockKind } : {}),
            ...(session.transcriptPath ? { transcriptPath: session.transcriptPath } : {}),
            ...(session.claudeSessionId ? { claudeSessionId: session.claudeSessionId } : {}),
          }
        : {}),
    };
  }

  /**
   * Clean up all sessions (for shutdown)
   */
  public async shutdown(): Promise<void> {
    console.log(`[CloudTerminalManager] Shutting down, cleaning up ${this.sessions.size} sessions`);

    // tmux-backed sessions deliberately survive shutdown: their tmux session,
    // worktree, paste dir and registry entry are the restart-restore payload.
    // Only direct-spawn sessions (which die with us anyway) get torn down.
    const snapshot = [...this.sessions.values()].filter((s) => !s.tmuxSessionName);
    await Promise.allSettled(snapshot.map((session) => this.disposeSessionWorktree(session)));

    for (const session of this.sessions.values()) {
      this.clearAgentIdleTimer(session);
      this.terminalManager.kill(session.executionId);
    }

    const hadTmuxSessions = [...this.sessions.values()].some((s) => s.tmuxSessionName);
    this.sessions.clear();
    this.removeAllListeners();

    // Sweep the paste root in case any per-session dirs survived a crash —
    // but never while surviving tmux sessions still reference their paste dirs.
    if (!hadTmuxSessions) {
      fs.promises.rm(getPasteImageRoot(), { recursive: true, force: true })
        .catch((err) => console.warn('[CloudTerminalManager] Failed to clean up paste root:', err));
    }
  }
}
