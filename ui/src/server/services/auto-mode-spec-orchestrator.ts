import { AutoModeOrchestratorBase, type OrchestratorBaseConfig, type ReadyItem } from './auto-mode-orchestrator-base.js';
import { SpecsReader } from '../specs-reader.js';
import { projectDir } from '../utils/project-dirs.js';
import { CloudTerminalManager } from './cloud-terminal-manager.js';
import { commitMainKanbanIfDirty, isWorktreeClean, purgeShadowSpecMutables, storyBranchName } from '../utils/worktree-story.js';

type GitStrategy = 'branch' | 'worktree' | 'current-branch';

/**
 * Minimal subset of WorkflowExecutor methods used for git/worktree ops.
 * Avoids circular import on the full WorkflowExecutor type.
 */
export interface SpecWorktreeOps {
  createStoryWorktree(projectPath: string, specId: string, storyId: string): Promise<string>;
  removeStoryWorktree(projectPath: string, worktreePath: string): Promise<void>;
  mergeStoryBranchIntoSpec(projectPath: string, specBranch: string, storyBranch: string): Promise<void>;
}

export interface AutoModeSpecOrchestratorConfig extends OrchestratorBaseConfig {
  specId: string;
  /** Main project path for git ops — may differ from projectPath when projectPath is a spec worktree. */
  mainProjectPath: string;
  gitStrategy?: GitStrategy;
  /** Spec-level branch to merge story branches into (required for worktree strategy). */
  specBranch?: string;
  /** Worktree/git ops provider — usually the WorkflowExecutor instance. */
  worktreeOps?: SpecWorktreeOps;
}

export class AutoModeSpecOrchestrator extends AutoModeOrchestratorBase {
  private readonly specsReader: SpecsReader;
  private readonly specId: string;
  private readonly mainProjectPath: string;
  private readonly gitStrategy: GitStrategy;
  private readonly specBranch: string | undefined;
  private readonly worktreeOps: SpecWorktreeOps | undefined;
  /** Tracks active story sub-worktree paths by storyId. */
  private readonly storyWorktrees = new Map<string, string>();

  constructor(config: AutoModeSpecOrchestratorConfig) {
    super({
      projectPath: config.projectPath,
      mainProjectPath: config.mainProjectPath,
      kanbanPath: config.kanbanPath,
      watchFilename: 'kanban.json',
      maxConcurrent: config.maxConcurrent,
      commandPrefix: config.commandPrefix,
      cloudTerminalManager: config.cloudTerminalManager,
    });
    this.specId = config.specId;
    this.mainProjectPath = config.mainProjectPath;
    this.gitStrategy = config.gitStrategy ?? 'branch';
    this.specBranch = config.specBranch;
    this.worktreeOps = config.worktreeOps;
    this.specsReader = new SpecsReader();
  }

  static create(
    projectPath: string,
    specId: string,
    commandPrefix: string,
    cloudTerminalManager: CloudTerminalManager,
    maxConcurrent = 2,
    gitStrategy?: GitStrategy,
    mainProjectPath?: string,
    specBranch?: string,
    worktreeOps?: SpecWorktreeOps
  ): AutoModeSpecOrchestrator {
    const resolvedMainPath = mainProjectPath ?? projectPath;
    return new AutoModeSpecOrchestrator({
      projectPath,
      kanbanPath: projectDir(resolvedMainPath, 'specs', specId),
      watchFilename: 'kanban.json',
      maxConcurrent,
      commandPrefix,
      cloudTerminalManager,
      specId,
      mainProjectPath: resolvedMainPath,
      gitStrategy,
      specBranch,
      worktreeOps,
    });
  }

  // ── Public introspection (used by workflow-executor finalize path) ─────────

  public getGitStrategy(): GitStrategy { return this.gitStrategy; }
  public getSpecBranch(): string | undefined { return this.specBranch; }
  public getSpecWorkingDirectory(): string { return this.config.projectPath; }
  public getMainProjectPath(): string { return this.mainProjectPath; }

  // ── Slot project path: create per-story worktree when gitStrategy=worktree ──

  protected override async resolveSlotProjectPath(item: ReadyItem): Promise<string> {
    if (this.gitStrategy !== 'worktree') return this.config.projectPath;

    // Two stories sharing the same CWD = guaranteed race condition. When parallel
    // mode is active and per-story worktree creation is impossible (worktreeOps
    // missing or createStoryWorktree throws), halt instead of silently degrading
    // — the previous fallback let two concurrent LLMs interfere mutually until
    // both stalled out.
    const isParallel = this.config.maxConcurrent > 1;

    if (!this.worktreeOps) {
      const msg = `gitStrategy=worktree but no worktreeOps configured`;
      if (isParallel) {
        await this.handleSubWorktreeFailure(item.id, msg);
        throw new Error(`[SpecOrchestrator] ${msg} (parallel mode — halted)`);
      }
      console.warn(`[SpecOrchestrator] ${msg} — falling back to project path (serial mode, safe)`);
      return this.config.projectPath;
    }

    try {
      const wtPath = await this.worktreeOps.createStoryWorktree(this.mainProjectPath, this.specId, item.id);
      this.storyWorktrees.set(item.id, wtPath);
      return wtPath;
    } catch (err) {
      const msg = `createStoryWorktree failed for ${item.id}: ${err instanceof Error ? err.message : err}`;
      if (isParallel) {
        await this.handleSubWorktreeFailure(item.id, msg);
        throw err instanceof Error ? err : new Error(String(err));
      }
      console.warn(`[SpecOrchestrator] ${msg} — falling back to project path (serial mode, safe)`);
      return this.config.projectPath;
    }
  }

  /** Halt scheduling + record incident when parallel mode can't get a per-story worktree. */
  private async handleSubWorktreeFailure(itemId: string, reason: string): Promise<void> {
    const errMsg =
      `Per-story worktree konnte nicht erstellt werden (parallel mode, maxConcurrent=${this.config.maxConcurrent}). ` +
      `Auto-Mode angehalten — ohne Sub-Worktrees teilen sich Stories denselben CWD und blockieren sich gegenseitig. ` +
      `Detail: ${reason}`;
    console.error(`[SpecOrchestrator] ${errMsg}`);
    try {
      await this.specsReader.setAutoModeIncident(this.mainProjectPath, this.specId, {
        type: 'error',
        message: errMsg,
        storyId: itemId,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[SpecOrchestrator] setAutoModeIncident (sub-worktree-failure) error:', err);
    }
    this.emit('story.sub-worktree-failure', itemId, errMsg);
    this.haltScheduling();
  }

  // ── Abstract implementations ────────────────────────────────────────────────

  protected async getReadySet(excludeIds: Set<string>): Promise<ReadyItem[]> {
    return this.specsReader.getReadyStories(this.mainProjectPath, this.specId, excludeIds);
  }

  protected async recoverStaleInProgress(activeIds: Set<string>): Promise<void> {
    const recovered = await this.specsReader.resetStaleInProgress(
      this.mainProjectPath,
      this.specId,
      activeIds
    );
    if (recovered.length > 0) {
      console.log(`[SpecOrchestrator] Recovered stale in_progress: ${recovered.join(', ')}`);
    }
  }

  protected async markItemInProgress(itemId: string): Promise<void> {
    await this.specsReader.updateStoryStatus(
      this.mainProjectPath,
      this.specId,
      itemId,
      'in_progress'
    );
  }

  protected buildExecuteArgs(item: ReadyItem): string {
    return `${this.specId} ${item.id}`;
  }

  protected getSpecIdForSlot(_item: ReadyItem): string {
    return this.specId;
  }

  protected async onItemCompleted(itemId: string): Promise<void> {
    const wtPath = this.storyWorktrees.get(itemId);

    if (wtPath && this.gitStrategy === 'worktree' && this.specBranch && this.worktreeOps) {
      const branch = storyBranchName(this.specId, itemId);

      // Pre-merge cleanliness gate: any uncommitted/untracked file in the story
      // worktree means Claude finished without committing. Auto-committing would
      // pollute history; --force-removing would lose data. Surface as incident,
      // revert story to in_progress, halt orchestrator so the user can inspect.
      if (!isWorktreeClean(wtPath)) {
        const errMsg = `Story-Worktree hat uncommittete Änderungen — Story auf in_progress zurückgesetzt. Worktree unter ${wtPath} prüfen.`;
        console.warn(`[SpecOrchestrator] ${errMsg}`);
        try {
          await this.specsReader.updateStoryStatus(
            this.mainProjectPath,
            this.specId,
            itemId,
            'in_progress'
          );
        } catch (err) {
          console.error('[SpecOrchestrator] revert-to-in_progress (dirty) error:', err);
        }
        try {
          await this.specsReader.setAutoModeIncident(this.mainProjectPath, this.specId, {
            type: 'error',
            message: errMsg,
            storyId: itemId,
            timestamp: new Date().toISOString()
          });
        } catch (err) {
          console.error('[SpecOrchestrator] setAutoModeIncident (dirty) error:', err);
        }
        this.emit('story.dirty-worktree', itemId, wtPath, errMsg);
        this.haltScheduling();
        return;
      }

      // Pre-merge shadow purge: drop any kanban.json/kanban-board.md the LLM
      // re-introduced into the story sub-worktree (despite SPECWRIGHT_MAIN_PROJECT_PATH
      // routing). Without this, the merge into the spec branch fails with
      // "deleted in HEAD and modified in story-branch" — the spec branch already
      // has these files stripped (seedSpecDirInWorktree). Idempotent: no-op if
      // sub-worktree never picked up a shadow.
      try {
        purgeShadowSpecMutables(wtPath, this.specId);
      } catch (purgeErr) {
        console.error('[SpecOrchestrator] pre-merge purgeShadowSpecMutables error:', purgeErr);
      }

      try {
        await this.worktreeOps.mergeStoryBranchIntoSpec(this.mainProjectPath, this.specBranch, branch);
        console.log(`[SpecOrchestrator] Merged ${branch} into ${this.specBranch}`);
        await this.worktreeOps.removeStoryWorktree(this.mainProjectPath, wtPath);
      } catch (err) {
        const baseMsg = err instanceof Error ? err.message : `Merge conflict: ${branch} → ${this.specBranch}`;
        const errMsg = `${baseMsg} (worktree kept at ${wtPath})`;
        console.warn(`[SpecOrchestrator] ${errMsg}`);
        // Revert story to in_progress so kanban reflects unresolved state.
        try {
          await this.specsReader.updateStoryStatus(
            this.mainProjectPath,
            this.specId,
            itemId,
            'in_progress'
          );
        } catch (revertErr) {
          console.error('[SpecOrchestrator] revert-to-in_progress (conflict) error:', revertErr);
        }
        this.emit('story.merge-conflict', itemId, wtPath, errMsg);
        this.storyWorktrees.delete(itemId);
        // Halt orchestrator — sibling stories on a conflicted spec branch would
        // compound the problem. User must resolve and re-trigger auto-mode.
        this.haltScheduling();
        return;
      }
      this.storyWorktrees.delete(itemId);
    }

    try {
      await this.specsReader.clearAutoModeIncident(this.mainProjectPath, this.specId, itemId);
    } catch (err) {
      console.error('[SpecOrchestrator] clearAutoModeIncident error:', err);
    }

    // kanban.json lives only in main repo — workflow markdown can't `git add`
    // it from a worktree CWD. Commit pending kanban mutations here so the main
    // working tree stays clean across story boundaries.
    try {
      const committed = commitMainKanbanIfDirty(
        this.mainProjectPath,
        this.specId,
        `chore: [${itemId}] kanban.json post-completion sync`
      );
      if (committed) {
        console.log(`[SpecOrchestrator] Committed kanban.json for ${itemId}`);
      }
    } catch (err) {
      console.error('[SpecOrchestrator] commitMainKanbanIfDirty error:', err);
    }

    // Drift defense: re-purge any shadow kanban.json/kanban-board.md that crept
    // back into the spec-level worktree between stories (e.g. via a stray
    // `git restore`, branch merge, or LLM mistake). `seedSpecDirInWorktree`
    // only runs at orchestrator start; this catches drift at item boundaries.
    if (this.gitStrategy === 'worktree' && this.config.projectPath !== this.mainProjectPath) {
      try {
        purgeShadowSpecMutables(this.config.projectPath, this.specId);
      } catch (err) {
        console.error('[SpecOrchestrator] purgeShadowSpecMutables error:', err);
      }
    }

    try {
      const unblocked = await this.specsReader.resolveDependencies(this.mainProjectPath, this.specId);
      if (unblocked.length > 0) {
        console.log(`[SpecOrchestrator] Resolved deps: ${unblocked.join(', ')} now ready`);
      }
    } catch (err) {
      console.error('[SpecOrchestrator] resolveDependencies error:', err);
    }
  }

  protected async onItemFailed(itemId: string, _error: string): Promise<void> {
    const wtPath = this.storyWorktrees.get(itemId);
    if (wtPath && this.worktreeOps) {
      await this.worktreeOps.removeStoryWorktree(this.mainProjectPath, wtPath);
      this.storyWorktrees.delete(itemId);
    }
    await this.scheduleTick();
  }

  public override async cancel(): Promise<void> {
    if (this.worktreeOps) {
      // Story sub-worktrees: remove only if clean. Dirty ones stay so the user
      // can recover work via `git worktree list` + manual commit/push.
      for (const [, wtPath] of this.storyWorktrees) {
        if (isWorktreeClean(wtPath)) {
          await this.worktreeOps.removeStoryWorktree(this.mainProjectPath, wtPath);
        } else {
          console.warn(`[SpecOrchestrator] cancel: keeping dirty story worktree ${wtPath}`);
        }
      }
    }
    this.storyWorktrees.clear();

    // Spec-level worktree: only cleaned by `finalizeSpecExecution` on the success
    // path. On user-initiated cancel we leave it alone — there may be merged
    // commits the user wants to push manually. We log its state for debugging.
    if (this.gitStrategy === 'worktree') {
      const specWtPath = this.config.projectPath;
      if (specWtPath !== this.mainProjectPath) {
        const clean = isWorktreeClean(specWtPath);
        console.log(`[SpecOrchestrator] cancel: spec worktree ${specWtPath} clean=${clean} (kept)`);
      }
    }

    await super.cancel();
  }
}
