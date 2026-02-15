/**
 * Terminal Protocol Types
 *
 * Defines the contract between TerminalManager (backend) and Terminal UI (frontend).
 * These types ensure type-safety for PTY process communication.
 */

/**
 * Terminal session identifier - corresponds to WorkflowExecution.id
 */
export type ExecutionId = string;

/**
 * PTY process session
 * Tracks the state of a single PTY process for a workflow execution
 */
export interface TerminalSession {
  /** Unique execution ID for this session */
  executionId: ExecutionId;

  /** Process ID of the PTY process */
  pid: number;

  /** Terminal output buffer (ANSI codes preserved) */
  buffer: string[];

  /** Exit code when process terminates (undefined while running) */
  exitCode?: number;

  /** Timestamp when session was created */
  createdAt: Date;

  /** Timestamp of last activity (for cleanup timeout) */
  lastActivity: Date;
}

/**
 * Terminal data event - emitted when PTY outputs data
 */
export interface TerminalDataEvent {
  type: 'terminal.data';
  executionId: ExecutionId;
  /** Raw output from PTY (ANSI codes preserved) */
  data: string;
  timestamp: string;
}

/**
 * Terminal exit event - emitted when PTY process terminates
 */
export interface TerminalExitEvent {
  type: 'terminal.exit';
  executionId: ExecutionId;
  /** Exit code (0 = success, non-zero = error) */
  exitCode: number;
  timestamp: string;
}

/**
 * Terminal resize event - sent from frontend to backend
 */
export interface TerminalResizeEvent {
  executionId: ExecutionId;
  /** Number of columns */
  cols: number;
  /** Number of rows */
  rows: number;
}

/**
 * Configuration for spawning a PTY process
 */
export interface SpawnPtyOptions {
  /** Execution ID for session tracking */
  executionId: ExecutionId;

  /** Shell command to run (e.g., 'bash', 'zsh') */
  shell?: string;

  /** Arguments to pass to shell */
  args?: string[];

  /** Working directory for the process */
  cwd: string;

  /** Environment variables */
  env?: Record<string, string>;

  /** Initial terminal size */
  cols?: number;
  rows?: number;

  /** Override inactivity timeout in ms (default: TERMINAL_BUFFER_LIMITS.INACTIVITY_TIMEOUT_MS) */
  inactivityTimeoutMs?: number;
}

/**
 * Terminal buffer constraints
 */
export const TERMINAL_BUFFER_LIMITS = {
  /** Maximum buffer size per session (10MB) */
  MAX_BUFFER_SIZE: 10 * 1024 * 1024,

  /** Maximum number of lines to keep in buffer */
  MAX_BUFFER_LINES: 10_000,

  /** Inactivity timeout before session cleanup (10 minutes) */
  INACTIVITY_TIMEOUT_MS: 10 * 60 * 1000,
} as const;

/**
 * WebSocket Protocol - Terminal Messages
 *
 * These messages are sent over WebSocket between frontend and backend.
 * Binary frames are used for terminal.data to minimize latency and payload size.
 */

/**
 * Terminal input message - sent from frontend to backend
 * User input from xterm.js terminal
 */
export interface TerminalInputMessage {
  type: 'terminal.input';
  executionId: ExecutionId;
  /** User input data (keystrokes, paste) */
  data: string;
  timestamp: string;
}

/**
 * Terminal resize message - sent from frontend to backend
 * Triggered when xterm.js terminal is resized
 */
export interface TerminalResizeMessage {
  type: 'terminal.resize';
  executionId: ExecutionId;
  cols: number;
  rows: number;
  timestamp: string;
}

/**
 * Terminal buffer request - sent from frontend on reconnect
 * Requests buffered output to restore terminal state
 */
export interface TerminalBufferRequestMessage {
  type: 'terminal.buffer.request';
  executionId: ExecutionId;
  timestamp: string;
}

/**
 * Terminal buffer response - sent from backend to frontend
 * Contains buffered terminal output for reconnect restore
 */
export interface TerminalBufferResponseMessage {
  type: 'terminal.buffer.response';
  executionId: ExecutionId;
  /** Buffered lines joined with newlines */
  buffer: string;
  timestamp: string;
}

/**
 * Union type of all WebSocket terminal messages
 */
export type WebSocketTerminalMessage =
  | TerminalDataEvent
  | TerminalExitEvent
  | TerminalInputMessage
  | TerminalResizeMessage
  | TerminalBufferRequestMessage
  | TerminalBufferResponseMessage;
