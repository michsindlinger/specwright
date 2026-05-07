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
 * - 'story.stalled'  (itemId: string, silentMs: number) — fires at 5 min warn
 *   AND 10 min recovery edges; consumers branch on `silentMs` to decide whether
 *   to escalate to `stallRecoverSlot`.
 * - 'story.prompt-stuck' (itemId: string, matchedText: string)
 * - 'slot.started'   (itemId: string, sessionId: string)
 * - 'slot.queued'    (itemId: string, title: string)
 * - 'all-items-done' ()
 * - 'cancelled'      ()
 * - 'item.awaiting-user-action' (itemId: string, title: string) — v3.14 transition-only
 *   emit per orchestrator lifetime; fires once per id when first observed in the
 *   user-action pending set. UI can dedupe on id.
 * - 'auto-mode.paused-awaiting-user' (pendingItems: Array<{id, title}>) — v3.14
 *   fires when normal-ready set is empty but user-action set is non-empty.
 *   Auto-mode stays alive; orchestrator does NOT declare 'all-items-done' until
 *   both sets are empty. UI shows banner.
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
  sessionId?: string;
}

export interface OrchestratorSnapshot {
  active: OrchestratorSlotSnapshot[];
  queued: OrchestratorSlotSnapshot[];
}

export interface OrchestratorBaseConfig {
  /** CWD for PTY sessions (may be worktree path for gitStrategy=worktree). */
  projectPath: string;
  /**
   * Main project path when `projectPath` is a worktree. Forwarded to slots so
   * the kanban MCP server can route writes to main via SPECWRIGHT_MAIN_PROJECT_PATH.
   * Optional — omitted for in-place execution.
   */
  mainProjectPath?: string;
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
  private readonly pendingCompletions = new Set<string>();
  /**
   * v3.14: ids for which `item.awaiting-user-action` has already been emitted on
   * this orchestrator instance. Prevents per-tick spam — UI gets the event once
   * per item per lifetime; reconnect snapshots happen at WebSocket level.
   * Cleared by `forgetAwaitingItem` when the item leaves the pending pool
   * (e.g. after user confirm), so future re-flag re-emits.
   */
  private readonly emittedAwaiting = new Set<string>();

  constructor(protected readonly config: OrchestratorBaseConfig) {
    super();
    this.gate = new ProjectConcurrencyGate(config.maxConcurrent);
    this.kanbanWatcher = new KanbanFileWatcher();
    this.setupKanbanWatcher();
    this.pruneWorktrees();
  }

  // ── Abstract interface ──────────────────────────────────────────────────────

  protected abstract getReadySet(excludeIds: Set<string>): Promise<ReadyItem[]>;

  /**
   * PAM-FIX-006: Reset stale `in_progress` items (no active slot) to `ready`
   * before each tick. Prevents zombie state after crash, server restart, or
   * auto-toggle on already-running stories.
   */
  protected abstract recoverStaleInProgress(activeIds: Set<string>): Promise<void>;

  /**
   * PAM-FIX-007: Flip item status to `in_progress` when its slot starts.
   * Without this the kanban shows the running item as Backlog/Ready until
   * Claude eventually calls `kanban_start_story` from inside the session.
   */
  protected abstract markItemInProgress(itemId: string): Promise<void>;
  protected abstract buildExecuteArgs(item: ReadyItem): string;
  protected abstract onItemCompleted(itemId: string): Promise<void>;
  protected abstract onItemFailed(itemId: string, error: string): Promise<void>;

  /** Override to inject specId into slot config for spec-context reading. */
  protected getSpecIdForSlot(_item: ReadyItem): string | undefined { return undefined; }

  /** Override to resolve the working directory for a slot (e.g., per-story worktree). */
  protected async resolveSlotProjectPath(_item: ReadyItem): Promise<string> {
    return this.config.projectPath;
  }

  /**
   * v3.14: Override to expose user-action pending items. Default returns `[]`
   * (backward compat for subclasses that don't support the feature).
   * Auto-mode never schedules these; instead it emits `item.awaiting-user-action`
   * once per id and surfaces a paused banner via `auto-mode.paused-awaiting-user`.
   */
  protected async getUserActionPendingSet(_excludeIds: Set<string>): Promise<ReadyItem[]> {
    return [];
  }

  /**
   * Caller (e.g. workflow-executor.confirmUserActionDone) invokes this so a
   * future re-flag of the same id re-emits `item.awaiting-user-action`.
   */
  public forgetAwaitingItem(itemId: string): void {
    this.emittedAwaiting.delete(itemId);
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
      ([id, slot]) => ({
        id,
        title: slot.getTitle(),
        sessionId: slot.getSessionId() ?? undefined,
      })
    );
    const excludeIds = new Set(this.activeSlots.keys());
    const ready = await this.getReadySet(excludeIds);
    const queued: OrchestratorSlotSnapshot[] = ready.map(item => ({
      id: item.id,
      title: item.title,
    }));
    return { active, queued };
  }

  /**
   * External-trigger version of `handleWatcherCompleted`. Used by the auto-mode
   * stall handler when a self-heal is detected (kanban transitioned to
   * `in_review`/`done` but the file watcher hadn't fired yet).
   * Idempotent: no-op if the slot is no longer tracked.
   */
  public completeSlotExternally(itemId: string): void {
    this.handleWatcherCompleted(itemId);
  }

  /**
   * Stall-recovery: free the slot without invoking the failure pipeline
   * (no `onItemFailed`, no worktree teardown). Caller is responsible for the
   * kanban status mutation (typically `SpecsReader.forceResetItem`). After
   * cleanup the orchestrator is re-ticked so the freshly-`ready` item gets
   * picked up on the next pass.
   */
  public async stallRecoverSlot(itemId: string): Promise<boolean> {
    const slot = this.activeSlots.get(itemId);
    if (!slot) return false;

    this.activeSlots.delete(itemId);
    this.kanbanWatcher.removeId(itemId);
    this.gate.release();

    try {
      await slot.cancel();
    } catch (err) {
      console.error('[OrchestratorBase] stallRecoverSlot cancel error:', err);
    }

    this.scheduleTick().catch(err =>
      console.error('[OrchestratorBase] stallRecoverSlot scheduleTick error:', err)
    );
    return true;
  }

  /** Cancel all active slots (Promise.allSettled — siblings don't block). */
  public async cancel(): Promise<void> {
    this.isCancelling = true;
    this.kanbanWatcher.unwatch();
    this.gate.drain();

    // Drain in-flight onItemCompleted bodies (best-effort, 5s cap) so external
    // callers see a quiescent orchestrator. Skipped when called from within a
    // completion body — use halt() for that path.
    const drainStart = Date.now();
    while (this.pendingCompletions.size > 0 && Date.now() - drainStart < 5000) {
      await new Promise(r => setTimeout(r, 50));
    }

    await Promise.allSettled(
      [...this.activeSlots.values()].map(slot => slot.cancel())
    );
    this.activeSlots.clear();
    this.emit('cancelled');
  }

  /**
   * Halt scheduling without drain. Safe to call from within `onItemCompleted`
   * (does not deadlock on its own pendingCompletions entry). Cancels sibling
   * slots fire-and-forget; does NOT emit 'cancelled'.
   */
  public haltScheduling(): void {
    this.isCancelling = true;
    this.kanbanWatcher.unwatch();
    this.gate.drain();
    for (const slot of this.activeSlots.values()) {
      slot.cancel().catch(err =>
        console.error('[OrchestratorBase] haltScheduling slot.cancel error:', err)
      );
    }
  }

  // ── Private scheduling ──────────────────────────────────────────────────────

  private async tick(): Promise<void> {
    const excludeIds = new Set(this.activeSlots.keys());

    // PAM-FIX-006: Recover any zombie in_progress items before reading ready set
    try {
      await this.recoverStaleInProgress(excludeIds);
    } catch (err) {
      console.error('[OrchestratorBase] recoverStaleInProgress error:', err);
    }

    const readyItems = await this.getReadySet(excludeIds);

    // v3.14: pull user-action pending items in parallel with the ready set.
    // These are NEVER scheduled; they only drive UI events.
    let userActionPending: ReadyItem[] = [];
    try {
      userActionPending = await this.getUserActionPendingSet(excludeIds);
    } catch (err) {
      console.error('[OrchestratorBase] getUserActionPendingSet error:', err);
    }

    // Transition-only emit: each id fires `item.awaiting-user-action` exactly
    // once per orchestrator lifetime (cleared via forgetAwaitingItem when the
    // user confirms). UI dedupes on id; full state is restored on reconnect by
    // workflow-executor's snapshot logic, not by replaying ticks.
    for (const item of userActionPending) {
      if (this.emittedAwaiting.has(item.id)) continue;
      this.emittedAwaiting.add(item.id);
      this.emit('item.awaiting-user-action', item.id, item.title);
    }

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

    if (this.isCancelling) return;

    const allWorkDrained =
      this.activeSlots.size === 0 &&
      readyItems.length === 0 &&
      this.pendingCompletions.size === 0;

    if (allWorkDrained && userActionPending.length === 0) {
      this.emit('all-items-done');
    } else if (allWorkDrained && userActionPending.length > 0) {
      // v3.14: nothing left for auto-mode to do, but user-action items remain.
      // Emit so UI can show "Auto-Mode pausiert — N Tickets warten auf Aktion".
      this.emit(
        'auto-mode.paused-awaiting-user',
        userActionPending.map(i => ({ id: i.id, title: i.title }))
      );
    }
  }

  private async launchSlot(item: ReadyItem): Promise<void> {
    await this.gate.acquire();
    if (this.isCancelling) {
      this.gate.release();
      return;
    }

    let slotProjectPath: string;
    try {
      slotProjectPath = await this.resolveSlotProjectPath(item);
    } catch (err) {
      // Subclass signalled "this slot can't run safely" (e.g. parallel mode lost
      // its per-story sub-worktree → race condition guaranteed). Subclass is
      // expected to have called `haltScheduling()` already. Release gate, let
      // the halt unwind the orchestrator. Don't add to activeSlots.
      this.gate.release();
      console.error(
        `[OrchestratorBase] resolveSlotProjectPath failed for ${item.id} — slot abandoned:`,
        err instanceof Error ? err.message : err
      );
      return;
    }
    if (this.isCancelling) {
      // Halt was triggered between acquire and resolve — skip launch.
      this.gate.release();
      return;
    }
    // Slot CWD ≠ main project → propagate main path so the kanban MCP routes
    // writes to main (env var SPECWRIGHT_MAIN_PROJECT_PATH).
    const mainProjectPath = this.config.mainProjectPath ?? this.config.projectPath;
    const slot = new AutoModeStorySlot({
      projectPath: slotProjectPath,
      mainProjectPath: slotProjectPath !== mainProjectPath ? mainProjectPath : undefined,
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
      // PAM-FIX-007: flip status to in_progress so UI moves item out of Backlog
      try {
        await this.markItemInProgress(item.id);
      } catch (markErr) {
        console.error('[OrchestratorBase] markItemInProgress error:', markErr);
      }
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

    this.pendingCompletions.add(itemId);
    this.emit('story.completed', itemId);
    this.onItemCompleted(itemId)
      .catch(err => console.error('[OrchestratorBase] onItemCompleted error:', err))
      .finally(() => {
        this.pendingCompletions.delete(itemId);
        this.scheduleTick().catch(err =>
          console.error('[OrchestratorBase] post-completion scheduleTick error:', err)
        );
      });
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
