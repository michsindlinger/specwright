/**
 * ExecutionStore - State management for multiple workflow executions
 *
 * Uses Map-based state for O(1) access and EventTarget for reactive updates.
 * Follows singleton pattern similar to gateway.ts.
 */

import type { ExecutionState, ExecutionStatus, GeneratedDoc } from '../types/execution.js';
import type { WorkflowMessage } from '../components/workflow-chat.js';

export type ExecutionStoreEventType =
  | 'execution-added'
  | 'execution-removed'
  | 'execution-updated'
  | 'active-changed';

export interface ExecutionStoreEvent {
  type: ExecutionStoreEventType;
  executionId: string;
  execution?: ExecutionState;
}

export type ExecutionStoreHandler = (event: ExecutionStoreEvent) => void;

export class ExecutionStore {
  /** Map of executionId -> ExecutionState for O(1) lookup */
  private executions: Map<string, ExecutionState> = new Map();

  /** Currently active execution ID */
  private activeExecutionId: string | null = null;

  /** Event handlers */
  private handlers: Set<ExecutionStoreHandler> = new Set();

  /**
   * Add a new execution to the store
   * Loads persisted width from localStorage if available
   */
  addExecution(
    executionId: string,
    commandId: string,
    commandName: string
  ): ExecutionState {
    // Load persisted width or use default (350px)
    const persistedWidth = this.getPersistedWidth(commandId);

    const execution: ExecutionState = {
      executionId,
      commandId,
      commandName,
      status: 'starting',
      messages: [],
      startedAt: new Date().toISOString(),
      generatedDocs: [],
      selectedDocIndex: 0,
      docsContainerWidth: persistedWidth ?? 350  // Default 350px
    };

    this.executions.set(executionId, execution);

    // First execution becomes active automatically
    if (this.executions.size === 1) {
      this.activeExecutionId = executionId;
    }

    this.emit({
      type: 'execution-added',
      executionId,
      execution
    });

    return execution;
  }

  /**
   * Remove an execution from the store
   */
  removeExecution(executionId: string): void {
    const existed = this.executions.delete(executionId);

    if (!existed) return;

    // If removed execution was active, switch to another
    if (this.activeExecutionId === executionId) {
      const remaining = Array.from(this.executions.keys());
      this.activeExecutionId = remaining.length > 0 ? remaining[0] : null;

      if (this.activeExecutionId) {
        this.emit({
          type: 'active-changed',
          executionId: this.activeExecutionId,
          execution: this.executions.get(this.activeExecutionId)
        });
      }
    }

    this.emit({
      type: 'execution-removed',
      executionId
    });
  }

  /**
   * Set the active execution and clear its unseen changes
   */
  setActiveExecution(executionId: string): void {
    if (!this.executions.has(executionId)) return;
    if (this.activeExecutionId === executionId) return;

    this.activeExecutionId = executionId;

    // Clear unseen changes when tab becomes active
    const execution = this.executions.get(executionId);
    if (execution?.hasUnseenChanges) {
      const updated: ExecutionState = {
        ...execution,
        hasUnseenChanges: false
      };
      this.executions.set(executionId, updated);
    }

    this.emit({
      type: 'active-changed',
      executionId,
      execution: this.executions.get(executionId)
    });
  }

  /**
   * Get an execution by ID
   */
  getExecution(executionId: string): ExecutionState | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get the active execution
   */
  getActiveExecution(): ExecutionState | undefined {
    if (!this.activeExecutionId) return undefined;
    return this.executions.get(this.activeExecutionId);
  }

  /**
   * Get the active execution ID
   */
  getActiveExecutionId(): string | null {
    return this.activeExecutionId;
  }

  /**
   * Get all executions as array
   */
  getAllExecutions(): ExecutionState[] {
    return Array.from(this.executions.values());
  }

  /**
   * Get execution count
   */
  getExecutionCount(): number {
    return this.executions.size;
  }

  /**
   * Update execution status
   * Sets hasUnseenChanges if this execution is not active and status changes to a terminal state
   */
  updateStatus(executionId: string, status: ExecutionStatus): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    // Mark as unseen if this is a background tab and status is terminal
    const isBackground = this.activeExecutionId !== executionId;
    const isTerminal = status === 'completed' || status === 'failed' || status === 'cancelled';

    const updated: ExecutionState = {
      ...execution,
      status,
      completedAt: isTerminal ? new Date().toISOString() : execution.completedAt,
      hasUnseenChanges: isBackground && isTerminal ? true : execution.hasUnseenChanges
    };

    this.executions.set(executionId, updated);

    this.emit({
      type: 'execution-updated',
      executionId,
      execution: updated
    });
  }

  /**
   * Add a message to an execution
   */
  addMessage(executionId: string, message: WorkflowMessage): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const updated: ExecutionState = {
      ...execution,
      messages: [...execution.messages, message]
    };

    this.executions.set(executionId, updated);

    this.emit({
      type: 'execution-updated',
      executionId,
      execution: updated
    });
  }

  /**
   * Update execution with error
   */
  setError(executionId: string, error: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const updated: ExecutionState = {
      ...execution,
      status: 'failed',
      error,
      completedAt: new Date().toISOString()
    };

    this.executions.set(executionId, updated);

    this.emit({
      type: 'execution-updated',
      executionId,
      execution: updated
    });
  }

  /**
   * Set pending question count for waiting_input status indicator
   * Also marks as unseen if this is a background tab and count > 0
   */
  setPendingQuestionCount(executionId: string, count: number): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    // Mark as unseen if this is a background tab and there are pending questions
    const isBackground = this.activeExecutionId !== executionId;

    const updated: ExecutionState = {
      ...execution,
      pendingQuestionCount: count,
      hasUnseenChanges: isBackground && count > 0 ? true : execution.hasUnseenChanges
    };

    this.executions.set(executionId, updated);

    this.emit({
      type: 'execution-updated',
      executionId,
      execution: updated
    });
  }

  /**
   * Clear unseen changes flag for an execution
   */
  clearUnseenChanges(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (!execution || !execution.hasUnseenChanges) return;

    const updated: ExecutionState = {
      ...execution,
      hasUnseenChanges: false
    };

    this.executions.set(executionId, updated);

    this.emit({
      type: 'execution-updated',
      executionId,
      execution: updated
    });
  }

  /**
   * Enable terminal mode for an execution
   * Sets terminalSessionId and activates terminal view
   */
  enableTerminal(executionId: string, terminalSessionId: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const updated: ExecutionState = {
      ...execution,
      terminalSessionId,
      terminalActive: true,
      exitCode: null
    };

    this.executions.set(executionId, updated);

    this.emit({
      type: 'execution-updated',
      executionId,
      execution: updated
    });
  }

  /**
   * Set terminal exit code for an execution
   * Marks terminal as ready for cleanup (workflow ended)
   */
  setTerminalExitCode(executionId: string, exitCode: number): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const updated: ExecutionState = {
      ...execution,
      exitCode
    };

    this.executions.set(executionId, updated);

    this.emit({
      type: 'execution-updated',
      executionId,
      execution: updated
    });
  }

  /**
   * Disable terminal mode for an execution
   * Clears terminal state when returning to dashboard
   */
  disableTerminal(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const updated: ExecutionState = {
      ...execution,
      terminalActive: false,
      terminalSessionId: undefined,
      exitCode: undefined
    };

    this.executions.set(executionId, updated);

    this.emit({
      type: 'execution-updated',
      executionId,
      execution: updated
    });
  }

  /**
   * Add a generated document to an execution
   * Updates existing document if path matches, otherwise appends
   */
  addDocument(executionId: string, doc: GeneratedDoc): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const existingIndex = execution.generatedDocs.findIndex(d => d.path === doc.path);
    let newDocs: GeneratedDoc[];
    let newSelectedIndex: number;

    if (existingIndex >= 0) {
      // Update existing document
      newDocs = [
        ...execution.generatedDocs.slice(0, existingIndex),
        doc,
        ...execution.generatedDocs.slice(existingIndex + 1)
      ];
      newSelectedIndex = existingIndex;
    } else {
      // Append new document
      newDocs = [...execution.generatedDocs, doc];
      newSelectedIndex = newDocs.length - 1;
    }

    const updated: ExecutionState = {
      ...execution,
      generatedDocs: newDocs,
      selectedDocIndex: newSelectedIndex
    };

    this.executions.set(executionId, updated);

    this.emit({
      type: 'execution-updated',
      executionId,
      execution: updated
    });
  }

  /**
   * Update an existing document's content
   */
  updateDocument(executionId: string, path: string, content: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const existingIndex = execution.generatedDocs.findIndex(d => d.path === path);
    if (existingIndex < 0) return;

    const updatedDoc: GeneratedDoc = {
      ...execution.generatedDocs[existingIndex],
      content,
      timestamp: new Date().toISOString()
    };

    const newDocs = [
      ...execution.generatedDocs.slice(0, existingIndex),
      updatedDoc,
      ...execution.generatedDocs.slice(existingIndex + 1)
    ];

    const updated: ExecutionState = {
      ...execution,
      generatedDocs: newDocs
    };

    this.executions.set(executionId, updated);

    this.emit({
      type: 'execution-updated',
      executionId,
      execution: updated
    });
  }

  /**
   * Set the selected document index for an execution
   */
  setSelectedDocIndex(executionId: string, index: number): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;
    if (index < 0 || index >= execution.generatedDocs.length) return;

    const updated: ExecutionState = {
      ...execution,
      selectedDocIndex: index
    };

    this.executions.set(executionId, updated);

    this.emit({
      type: 'execution-updated',
      executionId,
      execution: updated
    });
  }

  /**
   * Get all documents for an execution
   */
  getDocuments(executionId: string): GeneratedDoc[] {
    const execution = this.executions.get(executionId);
    return execution?.generatedDocs ?? [];
  }

  /**
   * Set the docs container width for an execution (for persistence)
   * Also persists to localStorage for session-crossing storage
   */
  setDocsContainerWidth(executionId: string, width: number): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const updated: ExecutionState = {
      ...execution,
      docsContainerWidth: width
    };

    this.executions.set(executionId, updated);

    // Persist to localStorage keyed by commandId for session-crossing storage
    this.persistWidth(execution.commandId, width);

    this.emit({
      type: 'execution-updated',
      executionId,
      execution: updated
    });
  }

  /**
   * Persist docs container width to localStorage
   * Keyed by commandId so the same workflow type remembers its size
   */
  private persistWidth(commandId: string, width: number): void {
    const key = `aos-docs-width-${commandId}`;
    localStorage.setItem(key, String(width));
  }

  /**
   * Get persisted docs container width from localStorage
   * Returns null if no persisted value exists
   */
  getPersistedWidth(commandId: string): number | null {
    const key = `aos-docs-width-${commandId}`;
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : null;
  }

  /**
   * Clear all executions
   */
  clear(): void {
    const executionIds = Array.from(this.executions.keys());
    this.executions.clear();
    this.activeExecutionId = null;

    for (const executionId of executionIds) {
      this.emit({
        type: 'execution-removed',
        executionId
      });
    }
  }

  /**
   * Subscribe to store events
   */
  subscribe(handler: ExecutionStoreHandler): void {
    this.handlers.add(handler);
  }

  /**
   * Unsubscribe from store events
   */
  unsubscribe(handler: ExecutionStoreHandler): void {
    this.handlers.delete(handler);
  }

  /**
   * Emit an event to all handlers
   */
  private emit(event: ExecutionStoreEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }
}

/** Singleton instance */
export const executionStore = new ExecutionStore();
