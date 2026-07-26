/**
 * Cloud Terminal Protocol Types
 *
 * Defines the contract for Cloud Terminal WebSocket communication.
 * These types enable multi-session terminal management independent of workflow executions.
 */

/**
 * Cloud Terminal session identifier - independent of execution IDs
 */
export type CloudTerminalSessionId = string;

/**
 * Cloud Terminal type discriminator
 * - 'shell': Plain shell terminal (bash/zsh) without AI capabilities
 * - 'claude-code': Claude Code CLI session with model configuration
 */
export type CloudTerminalType = 'shell' | 'claude-code';

/**
 * Claude Code CLI model selection
 */
export interface CloudTerminalModelConfig {
  /** Model identifier (e.g., 'claude-opus-4', 'claude-sonnet-4') */
  model: string;
  /** Provider (e.g., 'anthropic', 'openrouter') */
  provider?: string;
  /** API key reference (optional, uses default if not set) */
  apiKeyRef?: string;
}

/**
 * Where a Cloud Terminal session's PTY runs.
 *
 * - `new-worktree`  — a throwaway per-session worktree (`session/<id>` branch)
 * - `main`          — the registered project directory, verbatim, no worktree
 * - `existing-worktree` — a worktree the user already owns; never cleaned up
 *
 * Absent on the wire ⇒ `{ kind: 'new-worktree' }` (backwards compatible with
 * clients that predate the target picker). The distinction between "absent"
 * and "explicitly chosen" is carried server-side, not on the wire — see
 * `parseSessionTarget` in `server/utils/session-target.ts`.
 */
export type CloudTerminalSessionTarget =
  | { kind: 'new-worktree' }
  | { kind: 'main' }
  | { kind: 'existing-worktree'; path: string };

/**
 * One selectable row in the "where should this session run?" picker: either the
 * registered project root or one of the repo's git worktrees.
 */
export interface CloudTerminalWorktreeEntry {
  /** Absolute path, normalized via `pathKey` (realpath when resolvable) */
  path: string;
  /** Directory basename, used as the display label */
  name: string;
  /** Short branch name, or null when the worktree is on a detached HEAD */
  branch: string | null;
  /** Short commit SHA (used to label detached worktrees) */
  head: string | null;
  /** True for the repo's main worktree */
  isMain: boolean;
  /** True when this entry IS the registered project path */
  isProjectRoot: boolean;
  /** Working tree cleanliness; null when unknown (git error or time budget) */
  clean: boolean | null;
  /** Registered in git metadata but missing on disk (prunable) */
  missing: boolean;
  /** `git worktree lock`ed */
  locked: boolean;
  /** At least one live cloud session runs here */
  occupied: boolean;
  /** Session id of one occupant (arbitrary pick when several) */
  occupiedBy?: CloudTerminalSessionId;
  /** Number of live sessions — >1 is possible for the project-root row */
  occupiedCount: number;
  /** Heuristically owned by auto-mode (branch `story/*` or dir `backlog-*`) */
  autoModeManaged: boolean;
  /**
   * Best-effort creation time in epoch ms (git worktree admin-dir birthtime).
   * null for the main worktree and whenever the filesystem gives no usable
   * timestamp.
   */
  createdAt: number | null;
}

/**
 * Cloud Terminal session states
 */
export type CloudTerminalSessionStatus =
  | 'creating'
  | 'active'
  | 'paused'
  | 'closed';

/**
 * Cloud Terminal session metadata
 */
export interface CloudTerminalSession {
  /** Unique session ID */
  sessionId: CloudTerminalSessionId;

  /** Associated project path — always the REGISTERED project, never the worktree */
  projectPath: string;

  /**
   * Directory the PTY actually runs in: the project dir, a per-session
   * worktree, or a user-owned existing worktree. Ground truth for the UI and
   * the authoritative occupancy key — unlike `worktreeCleanup`, which only
   * exists for worktrees this session created.
   */
  effectiveCwd: string;

  /** Terminal type discriminator */
  terminalType: CloudTerminalType;

  /** Current session status */
  status: CloudTerminalSessionStatus;

  /** Model configuration for this session (required for 'claude-code', unused for 'shell') */
  modelConfig?: CloudTerminalModelConfig;

  /** Process ID of the PTY process */
  pid?: number;

  /** Terminal output buffer (ANSI codes preserved) */
  buffer: string[];

  /** Exit code when process terminates (undefined while running) */
  exitCode?: number;

  /** Timestamp when session was created */
  createdAt: Date;

  /** Timestamp of last activity */
  lastActivity: Date;

  /** Timestamp when session was paused (if applicable) */
  pausedAt?: Date;

  /** Resolved file path of the most recently detected plan (~/.claude[-<provider>]/plans/<slug>.md). */
  lastDetectedPlanPath?: string;
}

/**
 * Cloud Terminal Workflow metadata for workflow-triggered sessions
 */
export interface CloudTerminalWorkflowMetadata {
  /** Workflow command to execute (e.g., '/execute-tasks') */
  workflowCommand: string;
  /** Short workflow name for display (e.g., 'execute-tasks') */
  workflowName: string;
  /** Context argument (e.g., spec ID, story ID) */
  workflowContext?: string;
  /** Associated spec ID if applicable */
  specId?: string;
  /** Associated story ID if applicable */
  storyId?: string;
  /** Git strategy (branch/worktree) */
  gitStrategy?: string;
  /** Model to use for this workflow */
  model?: string;
}

/**
 * Cloud Terminal message types for WebSocket communication
 */
export type CloudTerminalMessageType =
  // Client -> Server
  | 'cloud-terminal:create'
  | 'cloud-terminal:create-workflow'
  | 'cloud-terminal:close'
  | 'cloud-terminal:pause'
  | 'cloud-terminal:resume'
  | 'cloud-terminal:input'
  | 'cloud-terminal:resize'
  | 'cloud-terminal:list'
  | 'cloud-terminal:targets'
  // Server -> Client
  | 'cloud-terminal:created'
  | 'cloud-terminal:closed'
  | 'cloud-terminal:paused'
  | 'cloud-terminal:resumed'
  | 'cloud-terminal:error'
  | 'cloud-terminal:list-response'
  | 'cloud-terminal:targets:response'
  | 'cloud-terminal:targets:error'
  | 'cloud-terminal:notice'
  // Bidirectional
  | 'cloud-terminal:data';

// ============================================================================
// Client -> Server Messages
// ============================================================================

/**
 * Create a new Cloud Terminal session
 */
export interface CloudTerminalCreateMessage {
  type: 'cloud-terminal:create';
  /** Terminal type to create */
  terminalType: CloudTerminalType;
  /** Project path for the terminal session */
  projectPath: string;
  /** Model configuration (required for 'claude-code', unused for 'shell') */
  modelConfig?: CloudTerminalModelConfig;
  /**
   * Where the session should run. Absent ⇒ new per-session worktree (legacy
   * default). Only honoured for 'claude-code'; shell terminals always run in
   * the project directory.
   */
  sessionTarget?: CloudTerminalSessionTarget;
  /** Initial terminal size */
  cols?: number;
  rows?: number;
  timestamp: string;
}

/**
 * Request the list of places a new session could run: the project root plus
 * every git worktree of the repo, annotated with occupancy and cleanliness.
 */
export interface CloudTerminalTargetsMessage {
  type: 'cloud-terminal:targets';
  /** Correlation id echoed back on the response */
  requestId?: string;
  /** Project path whose repo should be enumerated */
  projectPath: string;
  timestamp: string;
}

/**
 * Create a new Cloud Terminal session for workflow execution
 * Automatically sends the workflow command after session initialization
 */
export interface CloudTerminalCreateWorkflowMessage {
  type: 'cloud-terminal:create-workflow';
  /** Project path for the terminal session */
  projectPath: string;
  /** Workflow metadata including command to execute */
  workflowMetadata: CloudTerminalWorkflowMetadata;
  /** Model configuration (required for 'claude-code') */
  modelConfig: CloudTerminalModelConfig;
  /** Initial terminal size */
  cols?: number;
  rows?: number;
  timestamp: string;
}

/**
 * Close a Cloud Terminal session
 */
export interface CloudTerminalCloseMessage {
  type: 'cloud-terminal:close';
  /** Session ID to close */
  sessionId: CloudTerminalSessionId;
  timestamp: string;
}

/**
 * Pause a Cloud Terminal session (output buffering)
 */
export interface CloudTerminalPauseMessage {
  type: 'cloud-terminal:pause';
  /** Session ID to pause */
  sessionId: CloudTerminalSessionId;
  timestamp: string;
}

/**
 * Resume a paused Cloud Terminal session
 */
export interface CloudTerminalResumeMessage {
  type: 'cloud-terminal:resume';
  /** Session ID to resume */
  sessionId: CloudTerminalSessionId;
  timestamp: string;
}

/**
 * Send input to a Cloud Terminal session
 */
export interface CloudTerminalInputMessage {
  type: 'cloud-terminal:input';
  /** Target session ID */
  sessionId: CloudTerminalSessionId;
  /** Input data (keystrokes, paste) */
  data: string;
  timestamp: string;
}

/**
 * Paste an image (e.g. screenshot) into a Cloud Terminal session.
 * The browser reads the image via the Async Clipboard API, then the server
 * persists it under PASTE_IMAGE_ROOT and injects its absolute path into the PTY.
 */
export interface CloudTerminalPasteImageMessage {
  type: 'cloud-terminal:paste-image';
  /** Target session ID */
  sessionId: CloudTerminalSessionId;
  /** Base64-encoded image bytes (no data URL prefix) */
  base64: string;
  /** MIME type — must be in CLOUD_TERMINAL_CONFIG.ALLOWED_PASTE_IMAGE_MIME */
  mimeType: string;
  timestamp: string;
}

/**
 * Acknowledgement that a pasted image was saved + injected into the PTY.
 * The path is already written to the terminal; this message exists so the
 * frontend can clear its "uploading" indicator and release the in-flight lock.
 */
export interface CloudTerminalPasteImageSavedMessage {
  type: 'cloud-terminal:paste-image-saved';
  sessionId: CloudTerminalSessionId;
  /** Absolute path of the persisted image on the server */
  absolutePath: string;
  timestamp: string;
}

/**
 * Resize a Cloud Terminal session
 */
export interface CloudTerminalResizeMessage {
  type: 'cloud-terminal:resize';
  /** Target session ID */
  sessionId: CloudTerminalSessionId;
  /** Number of columns */
  cols: number;
  /** Number of rows */
  rows: number;
  timestamp: string;
}

/**
 * List all Cloud Terminal sessions for a project
 */
export interface CloudTerminalListMessage {
  type: 'cloud-terminal:list';
  /** Project path to filter sessions */
  projectPath: string;
  timestamp: string;
}

// ============================================================================
// Server -> Client Messages
// ============================================================================

/**
 * Session created confirmation
 */
export interface CloudTerminalCreatedMessage {
  type: 'cloud-terminal:created';
  /** New session ID */
  sessionId: CloudTerminalSessionId;
  /** Session metadata */
  session: CloudTerminalSession;
  /** Workflow metadata if this is a workflow session */
  workflowMetadata?: CloudTerminalWorkflowMetadata;
  /**
   * Notices raised while the session was being created (e.g. "started without
   * worktree — no git repository"). They cannot travel via
   * `cloud-terminal:notice` because the client does not know the sessionId
   * yet, so they ride along with the response that carries the requestId.
   */
  notices?: CloudTerminalNotice[];
  timestamp: string;
}

/** A non-fatal message about a session, surfaced as a banner in the UI. */
export interface CloudTerminalNotice {
  level: 'info' | 'warn';
  text: string;
}

/**
 * Notice raised for an already-created session (post-create lifecycle).
 * Create-time notices travel inside `cloud-terminal:created` instead.
 */
export interface CloudTerminalNoticeMessage {
  type: 'cloud-terminal:notice';
  sessionId: CloudTerminalSessionId;
  level: 'info' | 'warn';
  message: string;
  timestamp: string;
}

/**
 * Response to `cloud-terminal:targets`.
 */
export interface CloudTerminalTargetsResponseMessage {
  type: 'cloud-terminal:targets:response';
  /** Echoed correlation id from the request */
  requestId?: string;
  /** True when the project is inside a git work tree */
  isGitRepo: boolean;
  /** The registered project directory as a selectable entry */
  projectRoot: CloudTerminalWorktreeEntry;
  /** Absolute path of the repo's main worktree (may differ from projectRoot) */
  mainWorktreePath: string;
  /** True when the registered project is itself a linked worktree */
  projectRootIsLinkedWorktree: boolean;
  /** All git worktrees of the repo, project root included */
  worktrees: CloudTerminalWorktreeEntry[];
  /** False when `cloudSessionWorktree` is disabled in the general config */
  worktreeCreationEnabled: boolean;
  /** Branch a new session worktree would fork from (label only) */
  newWorktreeBase: string | null;
  timestamp: string;
}

/**
 * Failure while building the target list. Deliberately NOT a
 * `cloud-terminal:error` — that type is interpreted as a session-create
 * failure by the frontend and would tear down the picker.
 */
export interface CloudTerminalTargetsErrorMessage {
  type: 'cloud-terminal:targets:error';
  requestId?: string;
  code: string;
  message: string;
  timestamp: string;
}

/**
 * Session closed confirmation
 */
export interface CloudTerminalClosedMessage {
  type: 'cloud-terminal:closed';
  /** Closed session ID */
  sessionId: CloudTerminalSessionId;
  /** Exit code if process terminated */
  exitCode?: number;
  timestamp: string;
}

/**
 * Session paused confirmation
 */
export interface CloudTerminalPausedMessage {
  type: 'cloud-terminal:paused';
  /** Paused session ID */
  sessionId: CloudTerminalSessionId;
  timestamp: string;
}

/**
 * Session resumed confirmation
 */
export interface CloudTerminalResumedMessage {
  type: 'cloud-terminal:resumed';
  /** Resumed session ID */
  sessionId: CloudTerminalSessionId;
  /** Buffered output while paused (if any) */
  bufferedOutput?: string;
  timestamp: string;
}

/**
 * Error response
 */
export interface CloudTerminalErrorMessage {
  type: 'cloud-terminal:error';
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Related session ID (if applicable) */
  sessionId?: CloudTerminalSessionId;
  timestamp: string;
}

/**
 * List sessions response
 */
export interface CloudTerminalListResponseMessage {
  type: 'cloud-terminal:list-response';
  /** Project path */
  projectPath: string;
  /** Active sessions for this project */
  sessions: CloudTerminalSession[];
  timestamp: string;
}

// ============================================================================
// Bidirectional Messages
// ============================================================================

/**
 * Terminal data (output from PTY or input to PTY)
 * Server -> Client: PTY output
 * Client -> Server: Not used (use cloud-terminal:input instead)
 */
export interface CloudTerminalDataMessage {
  type: 'cloud-terminal:data';
  /** Source session ID */
  sessionId: CloudTerminalSessionId;
  /** Raw terminal data (ANSI codes preserved) */
  data: string;
  timestamp: string;
}

// ============================================================================
// Union Types
// ============================================================================

/**
 * Union type of all Cloud Terminal messages (client -> server)
 */
export type CloudTerminalClientMessage =
  | CloudTerminalCreateMessage
  | CloudTerminalCreateWorkflowMessage
  | CloudTerminalCloseMessage
  | CloudTerminalPauseMessage
  | CloudTerminalResumeMessage
  | CloudTerminalInputMessage
  | CloudTerminalPasteImageMessage
  | CloudTerminalResizeMessage
  | CloudTerminalListMessage
  | CloudTerminalTargetsMessage;

/**
 * Union type of all Cloud Terminal messages (server -> client)
 */
export type CloudTerminalServerMessage =
  | CloudTerminalCreatedMessage
  | CloudTerminalClosedMessage
  | CloudTerminalPausedMessage
  | CloudTerminalResumedMessage
  | CloudTerminalErrorMessage
  | CloudTerminalListResponseMessage
  | CloudTerminalDataMessage
  | CloudTerminalPasteImageSavedMessage
  | CloudTerminalTargetsResponseMessage
  | CloudTerminalTargetsErrorMessage
  | CloudTerminalNoticeMessage;

/**
 * Union type of all Cloud Terminal messages
 */
export type CloudTerminalMessage =
  | CloudTerminalClientMessage
  | CloudTerminalServerMessage;

// ============================================================================
// Configuration Constants
// ============================================================================

/**
 * Cloud Terminal configuration limits
 */
export const CLOUD_TERMINAL_CONFIG = {
  /** Maximum number of concurrent sessions per user (unlimited) */
  MAX_SESSIONS: Infinity,

  /** Maximum buffer size per session (10MB) */
  MAX_BUFFER_SIZE: 10 * 1024 * 1024,

  /** Maximum number of lines to keep in buffer */
  MAX_BUFFER_LINES: 10_000,

  /**
   * Inactivity timeout before PTY cleanup.
   * 0 = disabled: cloud terminals persist until the user explicitly closes them.
   */
  INACTIVITY_TIMEOUT_MS: 0,

  /** Default terminal size */
  DEFAULT_COLS: 120,
  DEFAULT_ROWS: 40,

  /**
   * Smallest usable TUI grid. Below ~10 rows Claude Code's input box + status line
   * don't fit and its SIGWINCH redraw mis-clears, flooding the scrollback with ghost
   * frames. The frontend hides any pane that would render smaller than this; the
   * backend clamps to it as a safety net (see clampTerminalSize).
   */
  MIN_COLS: 20,
  MIN_ROWS: 10,

  /** @deprecated Use WORKFLOW_COMMAND_READY_TIMEOUT_MS instead. Kept for backward compatibility. */
  WORKFLOW_COMMAND_DELAY_MS: 1500,

  /** Max timeout for CLI readiness detection before sending workflow command (ms) */
  WORKFLOW_COMMAND_READY_TIMEOUT_MS: 10_000,

  /** Maximum decoded size of a pasted screenshot (10 MB) */
  MAX_PASTE_IMAGE_BYTES: 10 * 1024 * 1024,

  /** Allowed MIME types for pasted images. heic/heif cover iPhone camera photos. */
  ALLOWED_PASTE_IMAGE_MIME: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/heic', 'image/heif'] as const,

  /** Filesystem root for persisted paste images (per-session subdirectories) */
  PASTE_IMAGE_ROOT: '/tmp/cloud-terminal-paste',
} as const;

/**
 * Clamp a requested terminal grid to a safe, usable range before it reaches
 * `pty.resize()`.
 *
 * This is a BACKEND SAFETY NET for malformed resize messages only. The normal
 * frontend path never emits a sub-MIN grid — it hides any pane that would render
 * smaller than MIN_ROWS instead of resizing the PTY down — so this clamp does not
 * diverge xterm from the PTY in practice. Its job is to guarantee the value handed
 * to node-pty is a positive integer >= the MIN grid, since node-pty throws on
 * `<=0` / `NaN` / `Infinity`.
 *
 * A non-finite axis falls back to `fallback` (pass the session's *current* size to
 * "keep the last good grid" rather than jumping to the default).
 */
export function clampTerminalSize(
  cols: number,
  rows: number,
  fallback: { cols: number; rows: number } = {
    cols: CLOUD_TERMINAL_CONFIG.DEFAULT_COLS,
    rows: CLOUD_TERMINAL_CONFIG.DEFAULT_ROWS,
  },
): { cols: number; rows: number } {
  const clampAxis = (value: number, fallbackValue: number, min: number): number => {
    const base = Number.isFinite(value) ? Math.floor(value) : fallbackValue;
    return Math.max(min, Number.isFinite(base) ? base : min);
  };
  return {
    cols: clampAxis(cols, fallback.cols, CLOUD_TERMINAL_CONFIG.MIN_COLS),
    rows: clampAxis(rows, fallback.rows, CLOUD_TERMINAL_CONFIG.MIN_ROWS),
  };
}

/**
 * Error codes for Cloud Terminal operations
 */
export const CLOUD_TERMINAL_ERROR_CODES = {
  /** Maximum sessions limit reached */
  MAX_SESSIONS_REACHED: 'MAX_SESSIONS_REACHED',
  /** Session not found */
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  /** Invalid project path */
  INVALID_PROJECT_PATH: 'INVALID_PROJECT_PATH',
  /** Session already exists */
  SESSION_EXISTS: 'SESSION_EXISTS',
  /** PTY spawn failed */
  SPAWN_FAILED: 'SPAWN_FAILED',
  /** Invalid message format */
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  /** PTY resize could not be applied although the session is still alive */
  RESIZE_FAILED: 'RESIZE_FAILED',
  /** CLI command not found in PATH */
  CLI_NOT_FOUND: 'CLI_NOT_FOUND',
  /** Session is paused or otherwise not accepting input */
  SESSION_NOT_ACTIVE: 'SESSION_NOT_ACTIVE',
  /** Generic failure while persisting a pasted image */
  PASTE_IMAGE_FAILED: 'PASTE_IMAGE_FAILED',
  /** Pasted image exceeds MAX_PASTE_IMAGE_BYTES */
  PASTE_IMAGE_TOO_LARGE: 'PASTE_IMAGE_TOO_LARGE',
  /** Pasted image MIME type not in ALLOWED_PASTE_IMAGE_MIME */
  PASTE_IMAGE_UNSUPPORTED_TYPE: 'PASTE_IMAGE_UNSUPPORTED_TYPE',
  /** sessionTarget malformed: unknown kind, missing path, or relative path */
  INVALID_SESSION_TARGET: 'INVALID_SESSION_TARGET',
  /** Requested path is not a worktree of this repo (covers traversal attempts) */
  TARGET_NOT_A_WORKTREE: 'TARGET_NOT_A_WORKTREE',
  /** Worktree is registered in git metadata but missing on disk */
  TARGET_NOT_FOUND: 'TARGET_NOT_FOUND',
  /** Another live cloud session already runs in this directory */
  TARGET_OCCUPIED: 'TARGET_OCCUPIED',
  /** Explicit 'new-worktree' request while `cloudSessionWorktree` is disabled */
  WORKTREE_CREATION_DISABLED: 'WORKTREE_CREATION_DISABLED',
  /** `git worktree list` failed while building the target list */
  WORKTREE_LIST_FAILED: 'WORKTREE_LIST_FAILED',
} as const;
