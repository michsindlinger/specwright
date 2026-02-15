import { randomUUID } from 'crypto';
import { webSocketManager } from '../websocket-manager.service.js';

export type LogEntryType =
  | 'spec-start'
  | 'story-start'
  | 'story-complete'
  | 'spec-complete'
  | 'queue-complete'
  | 'error';

export interface LogEntry {
  id: string;
  timestamp: string;
  type: LogEntryType;
  projectPath: string;
  projectName: string;
  specId: string;
  specName: string;
  storyId?: string;
  storyTitle?: string;
  message: string;
}

const MAX_LOG_ENTRIES = 500;

/**
 * ExecutionLogService tracks queue execution events in-memory.
 * Maintains a FIFO buffer of log entries and broadcasts new entries via WebSocket.
 */
export class ExecutionLogService {
  private entries: LogEntry[] = [];

  /**
   * Add a log entry and broadcast it to all clients.
   */
  public addEntry(
    type: LogEntryType,
    projectPath: string,
    projectName: string,
    specId: string,
    specName: string,
    message: string,
    storyId?: string,
    storyTitle?: string
  ): LogEntry {
    const entry: LogEntry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      projectPath,
      projectName,
      specId,
      specName,
      storyId,
      storyTitle,
      message
    };

    // FIFO rotation: remove oldest if at capacity
    if (this.entries.length >= MAX_LOG_ENTRIES) {
      this.entries.shift();
    }

    this.entries.push(entry);

    // Broadcast new entry to all connected clients
    webSocketManager.broadcast({
      type: 'queue.log.entry',
      entry
    });

    return entry;
  }

  /**
   * Get all current log entries.
   */
  public getEntries(): LogEntry[] {
    return this.entries;
  }

  /**
   * Clear all log entries.
   */
  public clear(): void {
    this.entries = [];
  }

  /**
   * Get the number of log entries.
   */
  public getCount(): number {
    return this.entries.length;
  }
}

// Singleton instance
export const executionLogService = new ExecutionLogService();
