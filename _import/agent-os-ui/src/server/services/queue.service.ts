import { randomUUID } from 'crypto';

export type QueueItemStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';
export type GitStrategy = 'branch' | 'worktree' | 'current-branch';
export type QueueItemType = 'spec' | 'backlog';

export interface QueueItem {
  id: string;
  specId: string;
  specName: string;
  projectPath: string;
  projectName: string;
  status: QueueItemStatus;
  position: number;
  gitStrategy?: GitStrategy;
  itemType: QueueItemType;
  addedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface QueueState {
  items: QueueItem[];
  currentlyRunning: string | null; // Queue item ID currently running
  isQueueRunning: boolean; // Whether the queue is actively processing specs
}

/**
 * QueueService manages a single global queue state in-memory.
 * The queue is global across all projects - items from different projects
 * coexist in one queue and are distinguished by their projectPath field.
 */
export class QueueService {
  private queue: QueueState = {
    items: [],
    currentlyRunning: null,
    isQueueRunning: false
  };

  /**
   * Get the global queue state.
   */
  public getState(): QueueState {
    return this.queue;
  }

  /**
   * Get all queue items.
   */
  public getItems(): QueueItem[] {
    return this.queue.items;
  }

  /**
   * Add a spec to the global queue.
   * @param projectPath - Project path the spec belongs to
   * @param projectName - Display name of the project
   * @param specId - Spec ID to add
   * @param specName - Display name of the spec
   * @param gitStrategy - Git strategy (branch or worktree)
   * @param position - Optional position (defaults to end of queue)
   * @returns The created queue item
   */
  public add(
    projectPath: string,
    projectName: string,
    specId: string,
    specName: string,
    gitStrategy?: GitStrategy,
    position?: number,
    itemType: QueueItemType = 'spec'
  ): QueueItem {
    // Check if spec is already in queue (same specId + projectPath)
    const existing = this.queue.items.find(
      item => item.specId === specId && item.projectPath === projectPath
    );
    if (existing) {
      throw new Error(`Spec ${specId} is already in the queue`);
    }

    const newItem: QueueItem = {
      id: randomUUID(),
      specId,
      specName,
      projectPath,
      projectName,
      status: 'pending',
      position: position ?? this.queue.items.length,
      gitStrategy,
      itemType,
      addedAt: new Date().toISOString()
    };

    // Insert at position or append
    if (position !== undefined && position < this.queue.items.length) {
      this.queue.items.splice(position, 0, newItem);
      this.reindexPositions();
    } else {
      this.queue.items.push(newItem);
    }

    return newItem;
  }

  /**
   * Remove a spec from the queue by its queue item ID.
   */
  public remove(queueItemId: string): boolean {
    const index = this.queue.items.findIndex(item => item.id === queueItemId);

    if (index === -1) {
      return false;
    }

    const item = this.queue.items[index];

    // Cannot remove running item
    if (item.status === 'running') {
      throw new Error('Cannot remove a running queue item');
    }

    this.queue.items.splice(index, 1);
    this.reindexPositions();

    return true;
  }

  /**
   * Reorder queue items.
   * @param queueItemId - ID of item to move
   * @param newPosition - New position index
   */
  public reorder(queueItemId: string, newPosition: number): boolean {
    const currentIndex = this.queue.items.findIndex(item => item.id === queueItemId);

    if (currentIndex === -1) {
      return false;
    }

    const item = this.queue.items[currentIndex];

    // Cannot reorder non-pending items
    if (item.status !== 'pending') {
      throw new Error('Can only reorder pending queue items');
    }

    // Remove from current position
    this.queue.items.splice(currentIndex, 1);

    // Insert at new position
    const targetIndex = Math.min(Math.max(0, newPosition), this.queue.items.length);
    this.queue.items.splice(targetIndex, 0, item);

    this.reindexPositions();

    return true;
  }

  /**
   * Update the status of a queue item.
   */
  public updateStatus(queueItemId: string, status: QueueItemStatus): QueueItem | null {
    const item = this.queue.items.find(i => i.id === queueItemId);

    if (!item) {
      return null;
    }

    item.status = status;

    if (status === 'running') {
      item.startedAt = new Date().toISOString();
      this.queue.currentlyRunning = queueItemId;
    } else if (status === 'done' || status === 'failed' || status === 'skipped') {
      item.completedAt = new Date().toISOString();
      if (this.queue.currentlyRunning === queueItemId) {
        this.queue.currentlyRunning = null;
      }
    }

    return item;
  }

  /**
   * Get the next pending item in the global queue.
   */
  public getNextPending(): QueueItem | null {
    return this.queue.items.find(item => item.status === 'pending') || null;
  }

  /**
   * Get a specific queue item.
   */
  public getItem(queueItemId: string): QueueItem | null {
    return this.queue.items.find(item => item.id === queueItemId) || null;
  }

  /**
   * Get a queue item by spec ID and project path.
   */
  public getItemBySpecId(projectPath: string, specId: string): QueueItem | null {
    return this.queue.items.find(
      item => item.specId === specId && item.projectPath === projectPath
    ) || null;
  }

  /**
   * Clear the entire global queue.
   */
  public clear(): void {
    this.queue = {
      items: [],
      currentlyRunning: null,
      isQueueRunning: false
    };
  }

  /**
   * Clear completed items from the queue.
   */
  public clearCompleted(): number {
    const originalLength = this.queue.items.length;

    this.queue.items = this.queue.items.filter(
      item => item.status !== 'done' && item.status !== 'failed' && item.status !== 'skipped'
    );

    this.reindexPositions();

    return originalLength - this.queue.items.length;
  }

  /**
   * Check if queue is currently processing.
   */
  public isRunning(): boolean {
    return this.queue.currentlyRunning !== null;
  }

  /**
   * Check if queue execution is active.
   */
  public isQueueActive(): boolean {
    return this.queue.isQueueRunning;
  }

  // ============================================
  // Dynamic Queue Editing Validation (SKQ-006)
  // ============================================

  /**
   * Check if a spec can be added to the queue.
   * Adding is always allowed (even while queue is running).
   * @returns { allowed: true } or { allowed: false, reason: string }
   */
  public canAdd(projectPath: string, specId: string): { allowed: boolean; reason?: string } {
    // Check if spec is already in queue (same specId + projectPath)
    const existing = this.queue.items.find(
      item => item.specId === specId && item.projectPath === projectPath
    );
    if (existing) {
      return { allowed: false, reason: 'Spec ist bereits in der Queue' };
    }

    // Adding is always allowed, even while queue is running
    return { allowed: true };
  }

  /**
   * Check if a queue item can be removed.
   * Only pending items can be removed (running/done/failed/skipped cannot).
   * @returns { allowed: true } or { allowed: false, reason: string }
   */
  public canRemove(queueItemId: string): { allowed: boolean; reason?: string } {
    const item = this.queue.items.find(i => i.id === queueItemId);

    if (!item) {
      return { allowed: false, reason: 'Queue item nicht gefunden' };
    }

    if (item.status === 'running') {
      return { allowed: false, reason: 'Laufende Specs können nicht entfernt werden' };
    }

    if (item.status === 'done' || item.status === 'failed' || item.status === 'skipped') {
      return { allowed: false, reason: 'Abgeschlossene Specs können nicht entfernt werden' };
    }

    // Only pending items can be removed
    return { allowed: true };
  }

  /**
   * Check if a queue item can be reordered.
   * Only pending items can be reordered.
   * @returns { allowed: true } or { allowed: false, reason: string }
   */
  public canReorder(queueItemId: string): { allowed: boolean; reason?: string } {
    const item = this.queue.items.find(i => i.id === queueItemId);

    if (!item) {
      return { allowed: false, reason: 'Queue item nicht gefunden' };
    }

    if (item.status !== 'pending') {
      return { allowed: false, reason: 'Nur ausstehende Specs können umsortiert werden' };
    }

    return { allowed: true };
  }

  // ============================================
  // Dynamic Queue Editing Methods (SKQ-006)
  // These methods explicitly support queue editing while running
  // ============================================

  /**
   * Add a spec to the queue while it's running.
   * New specs are added with 'pending' status and don't interrupt current execution.
   * @returns The created queue item
   */
  public addToRunningQueue(
    projectPath: string,
    projectName: string,
    specId: string,
    specName: string,
    gitStrategy?: GitStrategy,
    position?: number,
    itemType: QueueItemType = 'spec'
  ): QueueItem {
    // Validate first
    const validation = this.canAdd(projectPath, specId);
    if (!validation.allowed) {
      throw new Error(validation.reason);
    }

    // Delegate to normal add - works the same whether queue is running or not
    return this.add(projectPath, projectName, specId, specName, gitStrategy, position, itemType);
  }

  /**
   * Remove a pending spec from the queue while it's running.
   * Only pending items can be removed; running/done items are protected.
   * @returns { success: boolean, error?: string }
   */
  public removeFromRunningQueue(queueItemId: string): { success: boolean; error?: string } {
    const validation = this.canRemove(queueItemId);
    if (!validation.allowed) {
      return { success: false, error: validation.reason };
    }

    try {
      const removed = this.remove(queueItemId);
      return { success: removed };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
    }
  }

  /**
   * Reorder pending specs in the queue while it's running.
   * Only pending items can be reordered; running/done items are protected.
   * @returns { success: boolean, error?: string }
   */
  public reorderRunningQueue(
    queueItemId: string,
    newPosition: number
  ): { success: boolean; error?: string } {
    const validation = this.canReorder(queueItemId);
    if (!validation.allowed) {
      return { success: false, error: validation.reason };
    }

    try {
      const reordered = this.reorder(queueItemId, newPosition);
      return { success: reordered };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
    }
  }

  /**
   * Start queue execution.
   * Marks the queue as running and returns the first pending spec.
   * @returns The first pending queue item, or null if queue is empty/already running
   */
  public startQueue(): QueueItem | null {
    // Cannot start if already running
    if (this.queue.isQueueRunning) {
      return null;
    }

    // Get first pending item
    const nextItem = this.getNextPending();
    if (!nextItem) {
      return null;
    }

    // Mark queue as running
    this.queue.isQueueRunning = true;

    // Mark the item as running
    this.updateStatus(nextItem.id, 'running');

    console.log(`[QueueService] Queue started, running spec: ${nextItem.specId} (project: ${nextItem.projectPath})`);

    return nextItem;
  }

  /**
   * Stop queue execution.
   * Does not affect currently running spec, but prevents auto-advance.
   */
  public stopQueue(): void {
    this.queue.isQueueRunning = false;

    console.log('[QueueService] Queue stopped');
  }

  /**
   * Get the next pending spec and mark it as running.
   * Called after a spec completes to continue queue execution.
   * @returns The next pending queue item, or null if no more pending specs
   */
  public startNextSpec(): QueueItem | null {
    // Only advance if queue is actively running
    if (!this.queue.isQueueRunning) {
      return null;
    }

    // Get next pending item
    const nextItem = this.getNextPending();
    if (!nextItem) {
      // No more pending specs, mark queue as no longer running
      this.queue.isQueueRunning = false;
      console.log('[QueueService] Queue complete - no more pending specs');
      return null;
    }

    // Mark the item as running
    this.updateStatus(nextItem.id, 'running');

    console.log(`[QueueService] Starting next spec: ${nextItem.specId} (project: ${nextItem.projectPath})`);

    return nextItem;
  }

  /**
   * Handle spec completion (success or failure).
   * Updates the item status and optionally advances to the next spec.
   * @param queueItemId - The completed queue item ID
   * @param success - Whether the spec completed successfully
   * @returns The next pending queue item if queue is active, null otherwise
   */
  public handleSpecComplete(
    queueItemId: string,
    success: boolean
  ): { completedItem: QueueItem | null; nextItem: QueueItem | null; queueComplete: boolean } {
    // Update the completed item's status
    const completedItem = this.updateStatus(
      queueItemId,
      success ? 'done' : 'failed'
    );

    console.log(`[QueueService] Spec ${queueItemId} completed with status: ${success ? 'done' : 'failed'}`);

    // If queue is not running, don't auto-advance
    if (!this.queue.isQueueRunning) {
      return { completedItem, nextItem: null, queueComplete: false };
    }

    // Try to get next spec
    const nextItem = this.startNextSpec();

    return {
      completedItem,
      nextItem,
      queueComplete: nextItem === null
    };
  }

  /**
   * Re-index position values after modifications.
   */
  private reindexPositions(): void {
    this.queue.items.forEach((item, index) => {
      item.position = index;
    });
  }
}

// Singleton instance for the application
export const queueService = new QueueService();
