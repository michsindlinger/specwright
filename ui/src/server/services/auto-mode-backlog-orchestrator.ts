import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { AutoModeOrchestratorBase, type OrchestratorBaseConfig, type ReadyItem } from './auto-mode-orchestrator-base.js';
import { BacklogReader } from '../backlog-reader.js';
import { projectDir } from '../utils/project-dirs.js';
import { CloudTerminalManager } from './cloud-terminal-manager.js';
import {
  backlogWorktreePath,
  backlogBranchName,
  setupBacklogSymlinkInWorktree,
} from '../utils/worktree-story.js';

export interface AutoModeBacklogOrchestratorConfig extends OrchestratorBaseConfig {
  _tag?: 'backlog';
}

export class AutoModeBacklogOrchestrator extends AutoModeOrchestratorBase {
  private readonly backlogReader: BacklogReader;
  /** Tracks active backlog item sub-worktree paths by itemId. */
  private readonly itemWorktrees = new Map<string, string>();

  constructor(config: AutoModeBacklogOrchestratorConfig) {
    super({
      projectPath: config.projectPath,
      kanbanPath: config.kanbanPath,
      watchFilename: 'backlog-index.json',
      maxConcurrent: config.maxConcurrent,
      commandPrefix: config.commandPrefix,
      cloudTerminalManager: config.cloudTerminalManager,
    });
    this.backlogReader = new BacklogReader();
  }

  static create(
    projectPath: string,
    commandPrefix: string,
    cloudTerminalManager: CloudTerminalManager,
    maxConcurrent = 2
  ): AutoModeBacklogOrchestrator {
    return new AutoModeBacklogOrchestrator({
      projectPath,
      kanbanPath: projectDir(projectPath, 'backlog'),
      watchFilename: 'backlog-index.json',
      maxConcurrent,
      commandPrefix,
      cloudTerminalManager,
    });
  }

  // ── Per-item sub-worktree (FS-isolation for parallel slots) ─────────────────

  protected override async resolveSlotProjectPath(item: ReadyItem): Promise<string> {
    const wtPath = backlogWorktreePath(this.config.projectPath, item.id);
    const branch = backlogBranchName(item.id);
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
        console.log(`[BacklogOrchestrator] Created backlog worktree: ${wtPath} (${branch})`);
      } else {
        console.log(`[BacklogOrchestrator] Backlog worktree already exists: ${wtPath}`);
      }

      await setupBacklogSymlinkInWorktree(this.config.projectPath, wtPath);
      this.itemWorktrees.set(item.id, wtPath);
      return wtPath;
    } catch (err) {
      console.error(`[BacklogOrchestrator] Failed to create backlog worktree for ${item.id}, falling back:`, err instanceof Error ? err.message : err);
      return this.config.projectPath;
    }
  }

  protected async getReadySet(excludeIds: Set<string>): Promise<ReadyItem[]> {
    return this.backlogReader.getReadyBacklogItems(this.config.projectPath, excludeIds);
  }

  protected async recoverStaleInProgress(activeIds: Set<string>): Promise<void> {
    const recovered = await this.backlogReader.resetStaleInProgressItems(
      this.config.projectPath,
      activeIds
    );
    if (recovered.length > 0) {
      console.log(`[BacklogOrchestrator] Recovered stale in_progress: ${recovered.join(', ')}`);
    }
  }

  protected async markItemInProgress(itemId: string): Promise<void> {
    await this.backlogReader.markItemInProgress(this.config.projectPath, itemId);
  }

  protected buildExecuteArgs(item: ReadyItem): string {
    return `backlog ${item.id}`;
  }

  protected async onItemCompleted(itemId: string): Promise<void> {
    const wtPath = this.itemWorktrees.get(itemId);
    if (wtPath) {
      this.removeItemWorktree(wtPath);
      this.itemWorktrees.delete(itemId);
    }
    await this.scheduleTick();
  }

  protected async onItemFailed(itemId: string, _error: string): Promise<void> {
    const wtPath = this.itemWorktrees.get(itemId);
    if (wtPath) {
      this.removeItemWorktree(wtPath);
      this.itemWorktrees.delete(itemId);
    }
    await this.scheduleTick();
  }

  public override async cancel(): Promise<void> {
    for (const [, wtPath] of this.itemWorktrees) {
      this.removeItemWorktree(wtPath);
    }
    this.itemWorktrees.clear();
    await super.cancel();
  }

  private removeItemWorktree(wtPath: string): void {
    try {
      execSync(`git worktree remove --force "${wtPath}"`, { cwd: this.config.projectPath, stdio: 'pipe' });
      execSync('git worktree prune', { cwd: this.config.projectPath, stdio: 'pipe' });
      console.log(`[BacklogOrchestrator] Removed backlog worktree: ${wtPath}`);
    } catch (err) {
      console.warn('[BacklogOrchestrator] removeItemWorktree best-effort failed:', err instanceof Error ? err.message : err);
    }
  }
}
