/**
 * KanbanFileWatcher Service
 *
 * Watches kanban.json for story status changes during Auto-Mode execution.
 * Uses fs.watch() with debouncing and withKanbanLock() for safe reads.
 *
 * Events:
 * - 'story.completed' (storyId: string) - Story status changed to 'done'
 * - 'story.failed' (storyId: string, error: string) - Story status changed to 'failed'
 * - 'timeout' (storyId: string) - Story execution exceeded timeout
 */

import { EventEmitter } from 'events';
import { watch, existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { withKanbanLock } from '../utils/kanban-lock.js';

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const DEBOUNCE_MS = 300;

interface KanbanJson {
  stories?: Array<{
    id: string;
    status: string;
  }>;
  currentPhase?: string;
  executionStatus?: string;
}

export class KanbanFileWatcher extends EventEmitter {
  private watcher: ReturnType<typeof watch> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private specPath: string | null = null;
  private currentStoryId: string | null = null;
  private isProcessing = false;

  /**
   * Start watching kanban.json for story status changes.
   *
   * @param specPath - Path to the spec directory containing kanban.json
   * @param storyId - Story ID to watch for completion
   * @param timeoutMs - Maximum time to wait for completion (default: 30 minutes)
   */
  public watch(specPath: string, storyId: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): void {
    // Clean up any previous watch
    this.unwatch();

    this.specPath = specPath;
    this.currentStoryId = storyId;

    const kanbanJsonPath = join(specPath, 'kanban.json');

    if (!existsSync(kanbanJsonPath)) {
      console.warn(`[KanbanFileWatcher] kanban.json not found at ${kanbanJsonPath}`);
      return;
    }

    console.log(`[KanbanFileWatcher] Watching ${kanbanJsonPath} for story ${storyId}`);

    // Watch the spec directory (not the file directly - more reliable for editors that replace files)
    this.watcher = watch(specPath, (_eventType, filename) => {
      if (filename !== 'kanban.json') {
        return;
      }

      // Debounce: kanban.json may receive multiple rapid writes
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(() => {
        this.checkStoryStatus().catch(err => {
          console.error('[KanbanFileWatcher] Error checking story status:', err);
        });
      }, DEBOUNCE_MS);
    });

    // Set up timeout
    this.timeoutTimer = setTimeout(() => {
      console.warn(`[KanbanFileWatcher] Timeout for story ${storyId} after ${timeoutMs}ms`);
      this.emit('timeout', storyId);
      this.unwatch();
    }, timeoutMs);
  }

  /**
   * Update the watched story ID without creating a new watcher.
   * Used when moving to the next story in the same spec.
   *
   * @param storyId - New story ID to watch
   * @param timeoutMs - New timeout (resets the timer)
   */
  public updateStoryId(storyId: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): void {
    this.currentStoryId = storyId;

    // Reset timeout
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
    }
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
    this.currentStoryId = null;
    this.isProcessing = false;
  }

  /**
   * Check the current story's status in kanban.json.
   * Uses withKanbanLock for safe concurrent access.
   */
  private async checkStoryStatus(): Promise<void> {
    if (!this.specPath || !this.currentStoryId || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const kanbanJsonPath = join(this.specPath, 'kanban.json');

      if (!existsSync(kanbanJsonPath)) {
        return;
      }

      const kanban = await withKanbanLock<KanbanJson>(this.specPath, async () => {
        const content = await readFile(kanbanJsonPath, 'utf-8');
        return JSON.parse(content) as KanbanJson;
      });

      if (!kanban.stories) {
        return;
      }

      const story = kanban.stories.find(s => s.id === this.currentStoryId);

      if (!story) {
        console.warn(`[KanbanFileWatcher] Story ${this.currentStoryId} not found in kanban.json`);
        return;
      }

      if (story.status === 'done') {
        console.log(`[KanbanFileWatcher] Story ${this.currentStoryId} completed`);
        const storyId = this.currentStoryId;
        this.emit('story.completed', storyId);
      } else if (story.status === 'failed') {
        console.log(`[KanbanFileWatcher] Story ${this.currentStoryId} failed`);
        const storyId = this.currentStoryId;
        this.emit('story.failed', storyId, 'Story marked as failed in kanban.json');
      }
    } catch (error) {
      // Lock timeout or JSON parse error - not critical, will retry on next change
      console.warn('[KanbanFileWatcher] Error reading kanban.json:', error instanceof Error ? error.message : error);
    } finally {
      this.isProcessing = false;
    }
  }
}
