/**
 * Execution Types for Multi-Command Execution
 *
 * Defines the state structure for workflow executions that can run in parallel.
 */

import type { WorkflowMessage } from '../components/workflow-chat.js';

/**
 * Status of a workflow execution
 */
export type ExecutionStatus =
  | 'starting'
  | 'running'
  | 'waiting_input'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * A document generated during workflow execution
 */
export interface GeneratedDoc {
  /** File path of the generated document */
  path: string;
  /** Content of the document */
  content: string;
  /** Timestamp when the document was generated/updated */
  timestamp: string;
}

/**
 * State for a single workflow execution
 */
export interface ExecutionState {
  /** Unique execution identifier */
  executionId: string;

  /** Command ID that was executed */
  commandId: string;

  /** Display name of the command */
  commandName: string;

  /** Current execution status */
  status: ExecutionStatus;

  /** Chat messages for this execution */
  messages: WorkflowMessage[];

  /** Error message if execution failed */
  error?: string;

  /** Timestamp when execution started */
  startedAt: string;

  /** Timestamp when execution completed */
  completedAt?: string;

  /** Number of pending questions waiting for user input */
  pendingQuestionCount?: number;

  /** Whether this execution has unseen changes (for background notifications) */
  hasUnseenChanges?: boolean;

  /** Terminal session ID (for PTY-based workflows) */
  terminalSessionId?: string;

  /** Whether terminal view is active for this execution */
  terminalActive?: boolean;

  /** Process exit code (null = still running, 0 = success, >0 = error) */
  exitCode?: number | null;

  /** Documents generated during this execution */
  generatedDocs: GeneratedDoc[];

  /** Index of the currently selected document */
  selectedDocIndex: number;

  /** Width of the docs container for this execution (for persistence) */
  docsContainerWidth?: number;
}
