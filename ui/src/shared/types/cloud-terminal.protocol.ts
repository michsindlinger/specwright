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

  /** Associated project path */
  projectPath: string;

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
  // Server -> Client
  | 'cloud-terminal:created'
  | 'cloud-terminal:closed'
  | 'cloud-terminal:paused'
  | 'cloud-terminal:resumed'
  | 'cloud-terminal:error'
  | 'cloud-terminal:list-response'
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
  /** Initial terminal size */
  cols?: number;
  rows?: number;
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
  | CloudTerminalResizeMessage
  | CloudTerminalListMessage;

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
  | CloudTerminalDataMessage;

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
  /** Maximum number of concurrent sessions per user */
  MAX_SESSIONS: 5,

  /** Maximum buffer size per session (10MB) */
  MAX_BUFFER_SIZE: 10 * 1024 * 1024,

  /** Maximum number of lines to keep in buffer */
  MAX_BUFFER_LINES: 10_000,

  /** Inactivity timeout before PTY cleanup (2 hours for cloud terminals - much longer than client-side pause timeout) */
  INACTIVITY_TIMEOUT_MS: 2 * 60 * 60 * 1000,

  /** Default terminal size */
  DEFAULT_COLS: 120,
  DEFAULT_ROWS: 40,

  /** @deprecated Use WORKFLOW_COMMAND_READY_TIMEOUT_MS instead. Kept for backward compatibility. */
  WORKFLOW_COMMAND_DELAY_MS: 1500,

  /** Max timeout for CLI readiness detection before sending workflow command (ms) */
  WORKFLOW_COMMAND_READY_TIMEOUT_MS: 10_000,
} as const;

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
} as const;
