/**
 * AutoModeOrchestratorBase
 *
 * Abstract base for parallel auto-mode orchestration. Manages a pool of
 * AutoModeStorySlots bounded by a ProjectConcurrencyGate. Subclasses supply
 * the ready-item set, execute-args, and post-completion hooks.
 *
 * Events:
 * - 'story.completed' (itemId: string)
 * - 'story.failed'   (itemId: string, error: string)
 * - 'story.stalled'  (itemId: string, silentMs: number)
 * - 'story.prompt-stuck' (itemId: string, matchedText: string)
 * - 'slot.started'   (itemId: string, sessionId: string)
 * - 'slot.queued'    (itemId: string, title: string)
 * - 'all-items-done' ()
 * - 'cancelled'      ()
 */

import { EventEmitter } from 'events';
import { execSync } from 'child_process';
import { AutoModeStorySlot } from './auto-mode-story-slot.js';
import { ProjectConcurrencyGate } from './project-concurrency-gate.js';
import { KanbanFileWatcher, type WatchFilename } from './kanban-file-watcher.js';
import { CloudTerminalManager } from './cloud-terminal-manager.js';

const WATCHER_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 h — orchestrator manages its own lifecycle

export interface ReadyItem {
  id: string;
  title: string;
  model?: string;
}

export interface OrchestratorSlotSnapshot {
  id: string;
  title: string;
}

export interface OrchestratorSnapshot {
  active: OrchestratorSlotSnapshot[];
  queued: OrchestratorSlotSnapshot[];
}

export interface OrchestratorBaseConfig {
  /** CWD for PTY sessions (may be worktree path for gitStrategy=worktree). */
  projectPath: string;
  /** Directory that contains the kanban file to watch. */
  kanbanPath: string;
  watchFilename: WatchFilename;
  maxConcurrent: number;
  commandPrefix: string;
  cloudTerminalManager: CloudTerminalManager;
}

export abstract class AutoModeOrchestratorBase extends EventEmitter {
  protected readonly activeSlots: Map<string, AutoModeStorySlot> = new Map();
  protected readonly gate: ProjectConcurrencyGate;
  protected readonly kanbanWatcher: KanbanFileWatcher;
  protected isCancelling = false;
  private tickRunning = false;

  constructor(protected readonly config: OrchestratorBaseConfig) {
    super();
    this.gate = new ProjectConcurrencyGate(config.maxConcurrent);
    this.kanbanWatcher = new KanbanFileWatcher();
    this.setupKanbanWatcher();
    this.pruneWorktrees();
  }

  // ── Abstract interface ──────────────────────────────────────────────────────

  protected abstract getReadySet(excludeIds: Set<string>): Promise<ReadyItem[]>;
  protected abstract buildExecuteArgs(item: ReadyItem): string;
  protected abstract onItemCompleted(itemId: string): Promise<void>;
  protected abstract onItemFailed(itemId: string, error: string): Promise<void>;

  /** Override to inject specId into slot config for spec-context reading. */
  protected getSpecIdForSlot(_item: ReadyItem): string | undefined { return undefined; }

  /** Override to resolve the working directory for a slot (e.g., per-story worktree). */
  protected async resolveSlotProjectPath(_item: ReadyItem): Promise<string> {
    return this.config.projectPath;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Serialized tick: find ready items and fill available slots. */
  public async scheduleTick(): Promise<void> {
    if (this.tickRunning || this.isCancelling) return;
    this.tickRunning = true;
    try {
      await this.tick();
    } finally {
      this.tickRunning = false;
    }
  }

  /**
   * Start a specific item directly (bypasses getReadySet).
   * Used by startBacklogStoryExecution after pre-execution git ops.
   */
  public async startItemDirectly(item: ReadyItem): Promise<void> {
    if (this.isCancelling) return;
    await this.launchSlot(item);
  }

  /**
   * Read-only snapshot of orchestrator state.
   * Active slots come from in-memory map; queued items come from a fresh
   * getReadySet() pull (current truth, may differ from last tick).
   */
  public async getSnapshot(): Promise<OrchestratorSnapshot> {
    const active: OrchestratorSlotSnapshot[] = [...this.activeSlots.entries()].map(
      ([id, slot]) => ({ id, title: slot.getTitle() })
    );
    const excludeIds = new Set(this.activeSlots.keys());
    const ready = await this.getReadySet(excludeIds);
    const queued: OrchestratorSlotSnapshot[] = ready.map(item => ({
      id: item.id,
      title: item.title,
    }));
    return { active, queued };
  }

  /** Cancel all active slots (Promise.allSettled — siblings don't block). */
  public async cancel(): Promise<void> {
    this.isCancelling = true;
    this.kanbanWatcher.unwatch();
    this.gate.drain();

    await Promise.allSettled(
      [...this.activeSlots.values()].map(slot => slot.cancel())
    );
    this.activeSlots.clear();
    this.emit('cancelled');
  }

  // ── Private scheduling ──────────────────────────────────────────────────────

  private async tick(): Promise<void> {
    const excludeIds = new Set(this.activeSlots.keys());
    const readyItems = await this.getReadySet(excludeIds);

    let launched = 0;
    for (const item of readyItems) {
      if (this.activeSlots.size >= this.config.maxConcurrent) break;
      if (this.isCancelling) break;
      await this.launchSlot(item);
      launched++;
    }

    for (let i = launched; i < readyItems.length && !this.isCancelling; i++) {
      this.emit('slot.queued', readyItems[i].id, readyItems[i].title);
    }

    if (!this.isCancelling && this.activeSlots.size === 0 && readyItems.length === 0) {
      this.emit('all-items-done');
    }
  }

  private async launchSlot(item: ReadyItem): Promise<void> {
    await this.gate.acquire();
    if (this.isCancelling) {
      this.gate.release();
      return;
    }

    const slotProjectPath = await this.resolveSlotProjectPath(item);
    const slot = new AutoModeStorySlot({
      projectPath: slotProjectPath,
      specId: this.getSpecIdForSlot(item),
      storyId: item.id,
      title: item.title,
      executeArgs: this.buildExecuteArgs(item),
      model: item.model ?? 'opus',
      cloudTerminalManager: this.config.cloudTerminalManager,
      commandPrefix: this.config.commandPrefix,
    });

    this.activeSlots.set(item.id, slot);

    slot.on('stalled', (storyId: string, silentMs: number) => {
      this.emit('story.stalled', storyId, silentMs);
    });

    slot.on('prompt-stuck', (storyId: string, matchedText: string) => {
      // PAM-FIX-009: prompt-stuck has a defined semantic — Claude is waiting
      // for input that auto-mode cannot give. Symmetric to BLOCKER handling:
      // mark story failed, free the slot, let the orchestrator move on.
      if (!this.activeSlots.has(item.id)) return;
      this.activeSlots.delete(item.id);
      this.kanbanWatcher.removeId(item.id);
      this.gate.release();
      const reason = `Auto-Mode kann interaktive Prompts nicht beantworten: ${matchedText}`;
      this.emit('story.prompt-stuck', storyId, matchedText);
      this.emit('story.failed', item.id, reason);
      this.onItemFailed(item.id, reason).catch(err =>
        console.error('[OrchestratorBase] onItemFailed (prompt-stuck) error:', err)
      );
      slot.cancel().catch(err =>
        console.error('[OrchestratorBase] slot.cancel on prompt-stuck error:', err)
      );
    });

    slot.on('error', (error: Error) => {
      // PTY session died — treat as failure
      if (!this.activeSlots.has(item.id)) return;
      this.activeSlots.delete(item.id);
      this.kanbanWatcher.removeId(item.id);
      this.gate.release();
      this.emit('story.failed', item.id, error.message);
      this.onItemFailed(item.id, error.message).catch(err =>
        console.error('[OrchestratorBase] onItemFailed error:', err)
      );
    });

    try {
      this.kanbanWatcher.addId(item.id);
      const sessionId = await slot.start();
      this.emit('slot.started', item.id, sessionId);
    } catch (err) {
      this.activeSlots.delete(item.id);
      this.kanbanWatcher.removeId(item.id);
      this.gate.release();
      const errMsg = err instanceof Error ? err.message : 'Failed to start slot';
      this.emit('story.failed', item.id, errMsg);
      this.onItemFailed(item.id, errMsg).catch(e =>
        console.error('[OrchestratorBase] onItemFailed error:', e)
      );
    }
  }

  // ── Watcher ─────────────────────────────────────────────────────────────────

  private setupKanbanWatcher(): void {
    this.kanbanWatcher.watch(
      this.config.kanbanPath,
      this.config.watchFilename,
      new Set<string>(),
      WATCHER_TIMEOUT_MS
    );

    this.kanbanWatcher.on('story.completed', (itemId: string) => {
      this.handleWatcherCompleted(itemId);
    });

    this.kanbanWatcher.on('story.failed', (itemId: string, error: string) => {
      this.handleWatcherFailed(itemId, error);
    });

    this.kanbanWatcher.on('timeout', () => {
      console.warn('[OrchestratorBase] KanbanFileWatcher 24 h timeout — orchestrator still alive');
    });
  }

  private handleWatcherCompleted(itemId: string): void {
    const slot = this.activeSlots.get(itemId);
    if (!slot) return;

    this.activeSlots.delete(itemId);
    this.kanbanWatcher.removeId(itemId);
    slot.cancel().catch(err => console.error('[OrchestratorBase] cancel on complete error:', err));
    this.gate.release();

    this.emit('story.completed', itemId);
    this.onItemCompleted(itemId).catch(err =>
      console.error('[OrchestratorBase] onItemCompleted error:', err)
    );
  }

  private handleWatcherFailed(itemId: string, error: string): void {
    const slot = this.activeSlots.get(itemId);
    if (!slot) return;

    this.activeSlots.delete(itemId);
    this.kanbanWatcher.removeId(itemId);
    slot.cancel().catch(err => console.error('[OrchestratorBase] cancel on fail error:', err));
    this.gate.release();

    this.emit('story.failed', itemId, error);
    this.onItemFailed(itemId, error).catch(err =>
      console.error('[OrchestratorBase] onItemFailed error:', err)
    );
  }

  // ── Housekeeping ─────────────────────────────────────────────────────────────

  private pruneWorktrees(): void {
    try {
      execSync('git worktree prune', { cwd: this.config.projectPath, stdio: 'ignore' });
    } catch {
      // best-effort — repo might not have worktrees or git unavailable
    }
  }
}
