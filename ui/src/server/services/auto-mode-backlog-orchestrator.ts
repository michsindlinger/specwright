import { AutoModeOrchestratorBase, type OrchestratorBaseConfig, type ReadyItem } from './auto-mode-orchestrator-base.js';
import { BacklogReader } from '../backlog-reader.js';
import { projectDir } from '../utils/project-dirs.js';
import { CloudTerminalManager } from './cloud-terminal-manager.js';

export interface AutoModeBacklogOrchestratorConfig extends OrchestratorBaseConfig {
  _tag?: 'backlog';
}

export class AutoModeBacklogOrchestrator extends AutoModeOrchestratorBase {
  private readonly backlogReader: BacklogReader;

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

  protected async getReadySet(excludeIds: Set<string>): Promise<ReadyItem[]> {
    return this.backlogReader.getReadyBacklogItems(this.config.projectPath, excludeIds);
  }

  protected buildExecuteArgs(item: ReadyItem): string {
    return `backlog ${item.id}`;
  }

  protected async onItemCompleted(_itemId: string): Promise<void> {
    await this.scheduleTick();
  }

  protected async onItemFailed(_itemId: string, _error: string): Promise<void> {
    await this.scheduleTick();
  }
}
