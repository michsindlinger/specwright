import { AutoModeOrchestratorBase, type OrchestratorBaseConfig, type ReadyItem } from './auto-mode-orchestrator-base.js';
import { SpecsReader } from '../specs-reader.js';
import { projectDir } from '../utils/project-dirs.js';
import { CloudTerminalManager } from './cloud-terminal-manager.js';
import { storyBranchName } from '../utils/worktree-story.js';

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
    return new AutoModeSpecOrchestrator({
      projectPath,
      kanbanPath: projectDir(projectPath, 'specs', specId),
      watchFilename: 'kanban.json',
      maxConcurrent,
      commandPrefix,
      cloudTerminalManager,
      specId,
      mainProjectPath: mainProjectPath ?? projectPath,
      gitStrategy,
      specBranch,
      worktreeOps,
    });
  }

  // ── Slot project path: create per-story worktree when gitStrategy=worktree ──

  protected override async resolveSlotProjectPath(item: ReadyItem): Promise<string> {
    if (this.gitStrategy !== 'worktree') return this.config.projectPath;
    if (!this.worktreeOps) {
      console.warn('[SpecOrchestrator] gitStrategy=worktree but no worktreeOps configured — falling back to project path');
      return this.config.projectPath;
    }

    try {
      const wtPath = await this.worktreeOps.createStoryWorktree(this.mainProjectPath, this.specId, item.id);
      this.storyWorktrees.set(item.id, wtPath);
      return wtPath;
    } catch (err) {
      console.error(`[SpecOrchestrator] Failed to create story worktree for ${item.id}, falling back:`, err instanceof Error ? err.message : err);
      return this.config.projectPath;
    }
  }

  // ── Abstract implementations ────────────────────────────────────────────────

  protected async getReadySet(excludeIds: Set<string>): Promise<ReadyItem[]> {
    return this.specsReader.getReadyStories(this.config.projectPath, this.specId, excludeIds);
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
      try {
        await this.worktreeOps.mergeStoryBranchIntoSpec(this.config.projectPath, this.specBranch, branch);
        console.log(`[SpecOrchestrator] Merged ${branch} into ${this.specBranch}`);
        await this.worktreeOps.removeStoryWorktree(this.config.projectPath, wtPath);
      } catch (err) {
        const baseMsg = err instanceof Error ? err.message : `Merge conflict: ${branch} → ${this.specBranch}`;
        const errMsg = `${baseMsg} (worktree kept at ${wtPath})`;
        console.warn(`[SpecOrchestrator] ${errMsg}`);
        this.emit('story.merge-conflict', itemId, wtPath, errMsg);
        this.storyWorktrees.delete(itemId);
        // Don't run normal completion cleanup — story stays "done" in kanban but incident recorded
        await this.scheduleTick();
        return;
      }
      this.storyWorktrees.delete(itemId);
    }

    try {
      await this.specsReader.clearAutoModeIncident(this.config.projectPath, this.specId, itemId);
    } catch (err) {
      console.error('[SpecOrchestrator] clearAutoModeIncident error:', err);
    }

    try {
      const unblocked = await this.specsReader.resolveDependencies(this.config.projectPath, this.specId);
      if (unblocked.length > 0) {
        console.log(`[SpecOrchestrator] Resolved deps: ${unblocked.join(', ')} now ready`);
      }
    } catch (err) {
      console.error('[SpecOrchestrator] resolveDependencies error:', err);
    }

    await this.scheduleTick();
  }

  protected async onItemFailed(itemId: string, _error: string): Promise<void> {
    const wtPath = this.storyWorktrees.get(itemId);
    if (wtPath && this.worktreeOps) {
      await this.worktreeOps.removeStoryWorktree(this.config.projectPath, wtPath);
      this.storyWorktrees.delete(itemId);
    }
    await this.scheduleTick();
  }

  public override async cancel(): Promise<void> {
    if (this.worktreeOps) {
      for (const [, wtPath] of this.storyWorktrees) {
        await this.worktreeOps.removeStoryWorktree(this.config.projectPath, wtPath);
      }
    }
    this.storyWorktrees.clear();
    await super.cancel();
  }
}
