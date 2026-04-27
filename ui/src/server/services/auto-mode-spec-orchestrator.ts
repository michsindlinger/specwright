import { AutoModeOrchestratorBase, type OrchestratorBaseConfig, type ReadyItem } from './auto-mode-orchestrator-base.js';
import { SpecsReader } from '../specs-reader.js';
import { projectDir } from '../utils/project-dirs.js';
import { CloudTerminalManager } from './cloud-terminal-manager.js';

export interface AutoModeSpecOrchestratorConfig extends OrchestratorBaseConfig {
  specId: string;
}

export class AutoModeSpecOrchestrator extends AutoModeOrchestratorBase {
  private readonly specsReader: SpecsReader;
  private readonly specId: string;

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
    this.specsReader = new SpecsReader();
  }

  static create(
    projectPath: string,
    specId: string,
    commandPrefix: string,
    cloudTerminalManager: CloudTerminalManager,
    maxConcurrent = 1
  ): AutoModeSpecOrchestrator {
    return new AutoModeSpecOrchestrator({
      projectPath,
      kanbanPath: projectDir(projectPath, 'specs', specId),
      watchFilename: 'kanban.json',
      maxConcurrent,
      commandPrefix,
      cloudTerminalManager,
      specId,
    });
  }

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

  protected async onItemFailed(_itemId: string, _error: string): Promise<void> {
    // Siblings continue — just kick the scheduler in case there are others waiting
    await this.scheduleTick();
  }
}
