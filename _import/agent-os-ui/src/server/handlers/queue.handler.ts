import { WebSocket } from 'ws';
import { queueService, type QueueItem, type GitStrategy, type QueueItemType } from '../services/queue.service.js';
import { webSocketManager } from '../websocket-manager.service.js';
import { executionLogService } from '../services/execution-log.service.js';

interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

interface WebSocketClient extends WebSocket {
  clientId: string;
  projectId?: string;
}

/**
 * QueueHandler processes WebSocket messages for queue operations.
 * The queue is global - items from different projects coexist in one queue.
 * Broadcasts go to ALL connected clients, not just project-specific ones.
 */
export class QueueHandler {
  /**
   * Handle queue.add message.
   * Adds a spec to the global queue with projectPath from the message payload.
   * Works even while queue is running (dynamic queue editing - SKQ-006).
   */
  public handleAdd(client: WebSocketClient, message: WebSocketMessage): void {
    const specId = message.specId as string;
    const specName = message.specName as string;
    const projectPath = message.projectPath as string;
    const projectName = message.projectName as string;
    const gitStrategy = message.gitStrategy as GitStrategy | undefined;
    const position = message.position as number | undefined;
    const itemType = (message.itemType as QueueItemType) || 'spec';

    if (!specId || !specName) {
      this.sendError(client, 'queue.add.error', 'specId and specName are required');
      return;
    }

    if (!projectPath || !projectName) {
      this.sendError(client, 'queue.add.error', 'projectPath and projectName are required');
      return;
    }

    // Validate using canAdd (SKQ-006)
    const canAddResult = queueService.canAdd(projectPath, specId);
    if (!canAddResult.allowed) {
      this.sendError(client, 'queue.add.error', canAddResult.reason || 'Hinzufügen nicht erlaubt');
      return;
    }

    try {
      const item = queueService.add(projectPath, projectName, specId, specName, gitStrategy, position, itemType);

      // Send ack to requesting client
      const ackResponse: WebSocketMessage = {
        type: 'queue.add.ack',
        item,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(ackResponse));

      // Broadcast updated state to ALL clients
      this.broadcastState();

      console.log(`[QueueHandler] Added spec ${specId} (project: ${projectPath}) to global queue`);
    } catch (error) {
      this.sendError(
        client,
        'queue.add.error',
        error instanceof Error ? error.message : 'Failed to add to queue'
      );
    }
  }

  /**
   * Handle queue.remove message.
   * Removes a queue item by ID.
   * Only pending items can be removed (SKQ-006).
   */
  public handleRemove(client: WebSocketClient, message: WebSocketMessage): void {
    const queueItemId = message.queueItemId as string;

    if (!queueItemId) {
      this.sendError(client, 'queue.remove.error', 'queueItemId is required');
      return;
    }

    // Validate using canRemove (SKQ-006)
    const canRemoveResult = queueService.canRemove(queueItemId);
    if (!canRemoveResult.allowed) {
      this.sendError(client, 'queue.remove.error', canRemoveResult.reason || 'Entfernen nicht erlaubt');
      return;
    }

    try {
      const removed = queueService.remove(queueItemId);

      if (!removed) {
        this.sendError(client, 'queue.remove.error', 'Queue item not found');
        return;
      }

      // Send ack to requesting client
      const ackResponse: WebSocketMessage = {
        type: 'queue.remove.ack',
        queueItemId,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(ackResponse));

      // Broadcast updated state to ALL clients
      this.broadcastState();

      console.log(`[QueueHandler] Removed queue item ${queueItemId}`);
    } catch (error) {
      this.sendError(
        client,
        'queue.remove.error',
        error instanceof Error ? error.message : 'Failed to remove from queue'
      );
    }
  }

  /**
   * Handle queue.reorder message.
   * Moves a queue item to a new position.
   * Only pending items can be reordered (SKQ-006).
   */
  public handleReorder(client: WebSocketClient, message: WebSocketMessage): void {
    const queueItemId = message.queueItemId as string;
    const newPosition = message.newPosition as number;

    if (!queueItemId || newPosition === undefined) {
      this.sendError(client, 'queue.reorder.error', 'queueItemId and newPosition are required');
      return;
    }

    // Validate using canReorder (SKQ-006)
    const canReorderResult = queueService.canReorder(queueItemId);
    if (!canReorderResult.allowed) {
      this.sendError(client, 'queue.reorder.error', canReorderResult.reason || 'Umsortieren nicht erlaubt');
      return;
    }

    try {
      const reordered = queueService.reorder(queueItemId, newPosition);

      if (!reordered) {
        this.sendError(client, 'queue.reorder.error', 'Queue item not found');
        return;
      }

      // Send ack to requesting client
      const ackResponse: WebSocketMessage = {
        type: 'queue.reorder.ack',
        queueItemId,
        newPosition,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(ackResponse));

      // Broadcast updated state to ALL clients
      this.broadcastState();

      console.log(`[QueueHandler] Reordered queue item ${queueItemId} to position ${newPosition}`);
    } catch (error) {
      this.sendError(
        client,
        'queue.reorder.error',
        error instanceof Error ? error.message : 'Failed to reorder queue'
      );
    }
  }

  /**
   * Handle queue.state message.
   * Returns the full global queue state.
   */
  public handleGetState(client: WebSocketClient): void {
    const state = queueService.getState();

    const response: WebSocketMessage = {
      type: 'queue.state',
      items: state.items,
      currentlyRunning: state.currentlyRunning,
      isQueueRunning: state.isQueueRunning,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  /**
   * Handle queue.clear message.
   * Clears all items from the global queue.
   */
  public handleClear(client: WebSocketClient): void {
    queueService.clear();

    const response: WebSocketMessage = {
      type: 'queue.clear.ack',
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));

    // Broadcast updated state to ALL clients
    this.broadcastState();

    console.log('[QueueHandler] Cleared global queue');
  }

  /**
   * Handle queue.clearCompleted message.
   * Removes all completed, failed, or skipped items from the queue.
   */
  public handleClearCompleted(client: WebSocketClient): void {
    const removedCount = queueService.clearCompleted();

    const response: WebSocketMessage = {
      type: 'queue.clearCompleted.ack',
      removedCount,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));

    // Broadcast updated state if items were removed
    if (removedCount > 0) {
      this.broadcastState();
    }

    console.log(`[QueueHandler] Cleared ${removedCount} completed items`);
  }

  /**
   * Handle queue.start message.
   * Starts global queue execution if there are pending items.
   * @returns The first spec to execute, or null if queue is empty
   */
  public handleStart(client: WebSocketClient): QueueItem | null {
    // Check if queue has pending items
    const state = queueService.getState();
    const hasPending = state.items.some(item => item.status === 'pending');

    if (!hasPending) {
      this.sendError(client, 'queue.start.error', 'Queue is empty - add specs first');
      return null;
    }

    // Check if already running
    if (state.isQueueRunning) {
      this.sendError(client, 'queue.start.error', 'Queue is already running');
      return null;
    }

    // Start the queue
    const firstItem = queueService.startQueue();

    if (!firstItem) {
      this.sendError(client, 'queue.start.error', 'Failed to start queue');
      return null;
    }

    // Log spec start
    executionLogService.addEntry(
      'spec-start',
      firstItem.projectPath,
      firstItem.projectName,
      firstItem.specId,
      firstItem.specName,
      `Spec gestartet: ${firstItem.specName}`
    );

    // Send ack to requesting client
    const ackResponse: WebSocketMessage = {
      type: 'queue.start.ack',
      specId: firstItem.specId,
      projectPath: firstItem.projectPath,
      item: firstItem,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(ackResponse));

    // Broadcast updated state to ALL clients
    this.broadcastState();

    console.log(`[QueueHandler] Queue started, first spec: ${firstItem.specId} (project: ${firstItem.projectPath})`);

    return firstItem;
  }

  /**
   * Handle queue.stop message.
   * Stops queue execution after current spec completes.
   */
  public handleStop(client: WebSocketClient): void {
    queueService.stopQueue();

    const response: WebSocketMessage = {
      type: 'queue.stop.ack',
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));

    // Broadcast updated state to ALL clients
    this.broadcastState();

    console.log('[QueueHandler] Queue stopped');
  }

  /**
   * Handle spec completion event.
   * Called when a spec workflow finishes (success or failure).
   * @param projectPath - Project the spec belongs to
   * @param specId - The completed spec ID
   * @param success - Whether the spec completed successfully
   * @returns The next spec to execute, or null if queue is complete
   */
  public handleSpecComplete(
    projectPath: string,
    specId: string,
    success: boolean
  ): QueueItem | null {
    // Find the queue item by spec ID + project path
    const queueItem = queueService.getItemBySpecId(projectPath, specId);

    if (!queueItem) {
      console.log(`[QueueHandler] Spec ${specId} completed but not found in queue`);
      return null;
    }

    // Handle completion
    const result = queueService.handleSpecComplete(queueItem.id, success);

    // Log spec completion
    executionLogService.addEntry(
      success ? 'spec-complete' : 'error',
      queueItem.projectPath,
      queueItem.projectName,
      queueItem.specId,
      queueItem.specName,
      success
        ? `Spec abgeschlossen: ${queueItem.specName}`
        : `Spec fehlgeschlagen: ${queueItem.specName}`
    );

    // Broadcast updated state to ALL clients
    this.broadcastState();

    // If queue is complete, broadcast completion event
    if (result.queueComplete) {
      executionLogService.addEntry(
        'queue-complete',
        queueItem.projectPath,
        queueItem.projectName,
        queueItem.specId,
        queueItem.specName,
        'Queue-Ausführung abgeschlossen'
      );

      const completionMessage: WebSocketMessage = {
        type: 'queue.complete',
        timestamp: new Date().toISOString()
      };
      webSocketManager.broadcast(completionMessage);
      console.log('[QueueHandler] Queue execution complete');
    }

    // Log next spec start if queue continues
    if (result.nextItem) {
      executionLogService.addEntry(
        'spec-start',
        result.nextItem.projectPath,
        result.nextItem.projectName,
        result.nextItem.specId,
        result.nextItem.specName,
        `Spec gestartet: ${result.nextItem.specName}`
      );
    }

    return result.nextItem;
  }

  /**
   * Update a queue item's status and broadcast the change.
   * Called internally when spec execution status changes.
   */
  public updateItemStatus(
    queueItemId: string,
    status: 'pending' | 'running' | 'done' | 'failed' | 'skipped'
  ): QueueItem | null {
    const item = queueService.updateStatus(queueItemId, status);

    if (item) {
      this.broadcastState();
      console.log(`[QueueHandler] Updated queue item ${queueItemId} status to ${status}`);
    }

    return item;
  }

  /**
   * Log a story-level event to the execution log.
   */
  public logStoryEvent(
    type: 'story-start' | 'story-complete' | 'error',
    projectPath: string,
    projectName: string,
    specId: string,
    specName: string,
    storyId: string,
    storyTitle: string,
    message: string
  ): void {
    executionLogService.addEntry(
      type,
      projectPath,
      projectName,
      specId,
      specName,
      message,
      storyId,
      storyTitle
    );
  }

  /**
   * Send current execution log state to a client.
   */
  public handleGetLogState(client: WebSocketClient): void {
    const entries = executionLogService.getEntries();

    const response: WebSocketMessage = {
      type: 'queue.log.state',
      entries,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  /**
   * Broadcast current queue state to ALL connected clients.
   * The queue is global, so all clients need to see updates.
   */
  private broadcastState(): void {
    const state = queueService.getState();

    const message: WebSocketMessage = {
      type: 'queue.state',
      items: state.items,
      currentlyRunning: state.currentlyRunning,
      isQueueRunning: state.isQueueRunning,
      timestamp: new Date().toISOString()
    };

    webSocketManager.broadcast(message);
  }

  /**
   * Send an error message to a client.
   */
  private sendError(client: WebSocketClient, type: string, error: string): void {
    const errorResponse: WebSocketMessage = {
      type,
      error,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(errorResponse));
  }

  /**
   * Get queue item by spec ID and project path.
   * Used by websocket handler for queue advancement.
   */
  public getItemBySpecId(projectPath: string, specId: string): QueueItem | null {
    return queueService.getItemBySpecId(projectPath, specId);
  }

  /**
   * Get global queue state.
   */
  public getState(): { items: QueueItem[]; currentlyRunning: string | null; isQueueRunning: boolean } {
    return queueService.getState();
  }
}

// Singleton instance
export const queueHandler = new QueueHandler();
