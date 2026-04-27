import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { AutoModeOrchestratorBase, type OrchestratorBaseConfig, type ReadyItem } from './auto-mode-orchestrator-base.js';
import { SpecsReader } from '../specs-reader.js';
import { projectDir } from '../utils/project-dirs.js';
import { CloudTerminalManager } from './cloud-terminal-manager.js';
import {
  storyWorktreePath,
  storyBranchName,
  setupSpecSymlinkInWorktree,
} from '../utils/worktree-story.js';

type GitStrategy = 'branch' | 'worktree' | 'current-branch';

export interface AutoModeSpecOrchestratorConfig extends OrchestratorBaseConfig {
  specId: string;
  /** Main project path for git ops — may differ from projectPath when projectPath is a spec worktree. */
  mainProjectPath: string;
  gitStrategy?: GitStrategy;
  /** Spec-level branch to merge story branches into (required for worktree strategy). */
  specBranch?: string;
}

export class AutoModeSpecOrchestrator extends AutoModeOrchestratorBase {
  private readonly specsReader: SpecsReader;
  private readonly specId: string;
  private readonly mainProjectPath: string;
  private readonly gitStrategy: GitStrategy;
  private readonly specBranch: string | undefined;
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
    specBranch?: string
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
    });
  }

  // ── Slot project path: create per-story worktree when gitStrategy=worktree ──

  protected override async resolveSlotProjectPath(item: ReadyItem): Promise<string> {
    if (this.gitStrategy !== 'worktree') return this.config.projectPath;

    const wtPath = storyWorktreePath(this.mainProjectPath, this.specId, item.id);
    const branch = storyBranchName(this.specId, item.id);
    const wtBase = dirname(wtPath);

    try {
      if (!existsSync(wtBase)) {
        await mkdir(wtBase, { recursive: true });
      }

      if (!existsSync(wtPath)) {
        let branchExists = false;
        try {
          execSync(`git rev-parse --verify ${branch}`, { cwd: this.config.projectPath, stdio: 'pipe' });
          branchExists = true;
        } catch { branchExists = false; }

        const args = branchExists
          ? `worktree add "${wtPath}" ${branch}`
          : `worktree add "${wtPath}" -b ${branch}`;
        execSync(`git ${args}`, { cwd: this.config.projectPath, stdio: 'pipe' });
        console.log(`[SpecOrchestrator] Created story worktree: ${wtPath} (${branch})`);
      } else {
        console.log(`[SpecOrchestrator] Story worktree already exists: ${wtPath}`);
      }

      await setupSpecSymlinkInWorktree(this.mainProjectPath, wtPath, this.specId);
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

    if (wtPath && this.gitStrategy === 'worktree' && this.specBranch) {
      const branch = storyBranchName(this.specId, itemId);
      try {
        // spec worktree already has specBranch checked out — just merge
        execSync(
          `git merge --no-ff ${branch} -m "merge: ${branch} into ${this.specBranch}"`,
          { cwd: this.config.projectPath, stdio: 'pipe' }
        );
        console.log(`[SpecOrchestrator] Merged ${branch} into ${this.specBranch}`);
        this.removeStoryWorktree(wtPath);
      } catch {
        try { execSync('git merge --abort', { cwd: this.config.projectPath, stdio: 'pipe' }); } catch { /* ignore */ }
        const errMsg = `Merge conflict: ${branch} → ${this.specBranch} (worktree kept at ${wtPath})`;
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
    if (wtPath) {
      this.removeStoryWorktree(wtPath);
      this.storyWorktrees.delete(itemId);
    }
    await this.scheduleTick();
  }

  public override async cancel(): Promise<void> {
    // Clean up any tracked story worktrees before cancelling
    for (const [, wtPath] of this.storyWorktrees) {
      this.removeStoryWorktree(wtPath);
    }
    this.storyWorktrees.clear();
    await super.cancel();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private removeStoryWorktree(wtPath: string): void {
    try {
      execSync(`git worktree remove --force "${wtPath}"`, { cwd: this.config.projectPath, stdio: 'pipe' });
      execSync('git worktree prune', { cwd: this.config.projectPath, stdio: 'pipe' });
      console.log(`[SpecOrchestrator] Removed story worktree: ${wtPath}`);
    } catch (err) {
      console.warn('[SpecOrchestrator] removeStoryWorktree best-effort failed:', err instanceof Error ? err.message : err);
    }
  }
}
