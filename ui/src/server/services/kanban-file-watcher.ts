/**
 * KanbanFileWatcher Service
 *
 * Watches kanban.json or backlog-index.json for story/item status changes
 * during Auto-Mode execution. Supports watching a Set of IDs simultaneously
 * (multi-slot parallel execution).
 *
 * Events:
 * - 'story.completed' (storyId: string) - Item status changed to done/completed
 * - 'story.failed' (storyId: string, error: string) - Item status changed to failed/blocked
 * - 'timeout' (storyId: string) - Watch session exceeded timeout
 */

import { EventEmitter } from 'events';
import { watch, existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { withKanbanLock } from '../utils/kanban-lock.js';

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const DEBOUNCE_MS = 300;

export type WatchFilename = 'kanban.json' | 'backlog-index.json';

interface WatchableItem {
  id: string;
  status: string;
}

function extractItems(data: unknown): WatchableItem[] {
  if (!data || typeof data !== 'object') return [];
  const d = data as Record<string, unknown>;
  // V2 Lean kanban
  if (d.mode === 'lean' || d.version === '2.0') {
    return (d.tasks as WatchableItem[] | undefined) ?? [];
  }
  // V1 kanban
  if (Array.isArray(d.stories)) {
    return d.stories as WatchableItem[];
  }
  // Backlog index
  if (Array.isArray(d.items)) {
    return d.items as WatchableItem[];
  }
  return [];
}

function isCompletedStatus(status: string, filename: WatchFilename): boolean {
  if (status === 'done') return true;
  // kanban_complete_story sets in_review (per spec 2026-02-12-kanban-in-review-column).
  // Orchestrator must release the slot at this transition, even though manual approval
  // (in_review → done) is still pending.
  if (status === 'in_review') return true;
  if (filename === 'backlog-index.json' && status === 'completed') return true;
  return false;
}

function isFailedStatus(status: string, filename: WatchFilename): boolean {
  if (status === 'failed') return true;
  // For backlog items, 'blocked' indicates Claude failed and item has an incident
  if (filename === 'backlog-index.json' && status === 'blocked') return true;
  return false;
}

export class KanbanFileWatcher extends EventEmitter {
  private watcher: ReturnType<typeof watch> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private specPath: string | null = null;
  private watchFilename: WatchFilename = 'kanban.json';
  private watchedIds: Set<string> = new Set();
  /** Tracks last emitted terminal status per ID to prevent duplicate events. */
  private processedTransitions: Map<string, string> = new Map();
  private isProcessing = false;

  /**
   * Start watching a file for status changes across a set of IDs.
   *
   * @param specPath - Directory containing the file to watch
   * @param filename - 'kanban.json' or 'backlog-index.json'
   * @param ids - Set of story/item IDs to watch
   * @param timeoutMs - Max wait time for all IDs (default: 30 minutes)
   */
  public watch(
    specPath: string,
    filename: WatchFilename,
    ids: Set<string>,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ): void {
    this.unwatch();

    this.specPath = specPath;
    this.watchFilename = filename;
    this.watchedIds = new Set(ids);
    this.processedTransitions.clear();

    const filePath = join(specPath, filename);
    if (!existsSync(filePath)) {
      console.warn(`[KanbanFileWatcher] ${filename} not found at ${filePath}`);
      return;
    }

    console.log(`[KanbanFileWatcher] Watching ${filePath} for ids: ${[...ids].join(', ')}`);

    this.watcher = watch(specPath, (_eventType, changedFilename) => {
      if (changedFilename !== this.watchFilename) return;

      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.checkStoryStatus().catch(err => {
          console.error('[KanbanFileWatcher] Error checking story status:', err);
        });
      }, DEBOUNCE_MS);
    });

    this.timeoutTimer = setTimeout(() => {
      const representativeId = [...this.watchedIds][0] ?? '';
      console.warn(`[KanbanFileWatcher] Timeout after ${timeoutMs}ms (ids: ${[...this.watchedIds].join(', ')})`);
      this.emit('timeout', representativeId);
      this.unwatch();
    }, timeoutMs);
  }

  /**
   * Add an ID to the watched set at runtime (e.g. when a new slot starts).
   */
  public addId(id: string): void {
    this.watchedIds.add(id);
    console.log(`[KanbanFileWatcher] Added watch id: ${id}`);
  }

  /**
   * Remove an ID from the watched set (e.g. when a slot completes).
   * Also clears its transition record so it can be re-added cleanly.
   */
  public removeId(id: string): void {
    this.watchedIds.delete(id);
    this.processedTransitions.delete(id);
    console.log(`[KanbanFileWatcher] Removed watch id: ${id}`);
  }

  /**
   * Replace the entire watched set with a single ID.
   * Resets the timeout.
   *
   * @deprecated Use addId/removeId for multi-slot management. Kept for
   * backward compatibility with AutoModeCloudSession.
   */
  public updateStoryId(storyId: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): void {
    this.watchedIds.clear();
    this.processedTransitions.clear();
    this.watchedIds.add(storyId);

    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
    this.timeoutTimer = setTimeout(() => {
      console.warn(`[KanbanFileWatcher] Timeout for story ${storyId} after ${timeoutMs}ms`);
      this.emit('timeout', storyId);
      this.unwatch();
    }, timeoutMs);

    console.log(`[KanbanFileWatcher] Updated watch target to story ${storyId}`);
  }

  /**
   * Stop watching and clean up all timers.
   */
  public unwatch(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    this.specPath = null;
    this.watchedIds.clear();
    this.processedTransitions.clear();
    this.isProcessing = false;
  }

  private async checkStoryStatus(): Promise<void> {
    if (!this.specPath || this.watchedIds.size === 0 || this.isProcessing) return;

    this.isProcessing = true;
    try {
      const filePath = join(this.specPath, this.watchFilename);
      if (!existsSync(filePath)) return;

      const content = await withKanbanLock<string>(this.specPath, () => readFile(filePath, 'utf-8'));
      const data = JSON.parse(content) as unknown;
      const items = extractItems(data);
      if (items.length === 0) return;

      for (const id of this.watchedIds) {
        const item = items.find(i => i.id === id);
        if (!item) {
          console.warn(`[KanbanFileWatcher] ID ${id} not found in ${this.watchFilename}`);
          continue;
        }

        const lastSeen = this.processedTransitions.get(id);

        if (isCompletedStatus(item.status, this.watchFilename)) {
          if (lastSeen !== item.status) {
            this.processedTransitions.set(id, item.status);
            console.log(`[KanbanFileWatcher] ${id} completed (status: ${item.status})`);
            this.emit('story.completed', id);
          }
        } else if (isFailedStatus(item.status, this.watchFilename)) {
          if (lastSeen !== item.status) {
            this.processedTransitions.set(id, item.status);
            console.log(`[KanbanFileWatcher] ${id} failed (status: ${item.status})`);
            this.emit('story.failed', id, `Item marked as ${item.status}`);
          }
        }
      }
    } catch (error) {
      console.warn('[KanbanFileWatcher] Error reading file:', error instanceof Error ? error.message : error);
    } finally {
      this.isProcessing = false;
    }
  }
}
