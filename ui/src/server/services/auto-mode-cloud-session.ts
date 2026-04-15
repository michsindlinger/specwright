/**
 * AutoModeCloudSession Service
 *
 * Orchestrates Cloud Terminal sessions for Auto-Mode execution.
 * Creates a new Claude session for each story to ensure reliable execution.
 *
 * Events:
 * - 'story.completed' (storyId: string) - Story completed successfully
 * - 'story.failed' (storyId: string, error: string) - Story failed or timed out
 * - 'spec.completed' (specId: string) - All stories in spec completed
 * - 'error' (error: Error) - Session error (crash, etc.)
 * - 'closed' () - Session closed (cleanup complete)
 */

import { EventEmitter } from 'events';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { CloudTerminalManager } from './cloud-terminal-manager.js';
import { KanbanFileWatcher } from './kanban-file-watcher.js';
import { projectDir, resolveProjectDir, resolveCommandDir, resolveGlobalDir } from '../utils/project-dirs.js';
import { getCliCommandForModel } from '../model-config.js';
import type { GitStrategy } from '../workflow-executor.js';
import type { CloudTerminalSessionId, CloudTerminalModelConfig } from '../../shared/types/cloud-terminal.protocol.js';


export interface AutoModeCloudSessionConfig {
  projectPath: string;
  specId: string;
  gitStrategy: GitStrategy;
  model: string;
  cloudTerminalManager: CloudTerminalManager;
  commandPrefix: string; // 'specwright' or 'agent-os'
}

export class AutoModeCloudSession extends EventEmitter {
  private config: AutoModeCloudSessionConfig;
  private sessionId: CloudTerminalSessionId | null = null;
  private currentStoryId: string | null = null;
  private currentModel: string;
  private kanbanWatcher: KanbanFileWatcher;
  private sessionClosedHandler: ((closedSessionId: string, exitCode?: number) => void) | null = null;
  private isCancelled = false;
  private isFirstStory = true;

  constructor(config: AutoModeCloudSessionConfig) {
    super();
    this.config = config;
    this.currentModel = config.model;
    this.kanbanWatcher = new KanbanFileWatcher();

    this.setupKanbanWatcherListeners();
  }

  /**
   * Start the first story in a new Cloud Terminal session.
   *
   * @param storyId - First story ID to execute
   * @returns Cloud Terminal session ID
   */
  public async startFirstStory(storyId: string): Promise<string> {
    this.currentStoryId = storyId;

    // Create the Cloud Terminal session
    const sessionId = await this.createCloudSession(storyId);
    this.sessionId = sessionId;

    // Start watching kanban.json for completion
    this.startKanbanWatch(storyId);

    // Register session.closed listener for crash detection
    this.registerSessionClosedListener();

    console.log(`[AutoModeCloudSession] Started first story ${storyId} in session ${sessionId}`);

    return sessionId;
  }

  /**
   * Execute the next story in the existing session.
   * If the model changed, creates a new session.
   *
   * @param storyId - Next story ID to execute
   * @param model - Model for this story (may trigger session recreation)
   */
  public async executeNextStory(storyId: string, model?: string): Promise<void> {
    if (this.isCancelled) {
      return;
    }

    this.currentStoryId = storyId;
    const newModel = model || this.currentModel;
    this.currentModel = newModel;

    // Update kanban watcher IMMEDIATELY so any kanban.json writes during
    // session setup don't re-trigger completion for the previous story
    this.kanbanWatcher.updateStoryId(storyId);

    // Always create a new session for each story.
    // Reusing sessions via /clear is unreliable — the command may not reach
    // the Claude process or may not be processed correctly.
    console.log(`[AutoModeCloudSession] Creating new session for story ${storyId}`);

    // Close old session
    if (this.sessionId) {
      this.unregisterSessionClosedListener();
      this.config.cloudTerminalManager.closeSession(this.sessionId);
    }

    // Create new session with the execute command as initial prompt
    const sessionId = await this.createCloudSession(storyId);
    this.sessionId = sessionId;
    this.registerSessionClosedListener();

    console.log(`[AutoModeCloudSession] Executing story ${storyId}`);
  }

  /**
   * Cancel the auto-mode session and clean up.
   */
  public async cancel(): Promise<void> {
    this.isCancelled = true;

    console.log(`[AutoModeCloudSession] Cancelling session for spec ${this.config.specId}`);

    // Stop kanban watcher
    this.kanbanWatcher.unwatch();

    // Close Cloud Terminal session
    if (this.sessionId) {
      this.unregisterSessionClosedListener();
      this.config.cloudTerminalManager.closeSession(this.sessionId);
      this.sessionId = null;
    }

    this.emit('closed');
  }

  /**
   * Get the current Cloud Terminal session ID.
   */
  public getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get the currently executing story ID.
   */
  public getCurrentStoryId(): string | null {
    return this.currentStoryId;
  }

  /**
   * Create a new Cloud Terminal session and send the initial command.
   */
  private async createCloudSession(storyId: string): Promise<string> {
    const modelConfig: CloudTerminalModelConfig = {
      model: this.currentModel,
    };

    const command = this.buildExecuteCommand(storyId);

    // Create session with initial prompt (passed as CLI argument)
    const session = this.config.cloudTerminalManager.createSession(
      this.config.projectPath,
      'claude-code',
      modelConfig,
      undefined, // cols
      undefined, // rows
      command
    );

    // Save debug info (fire-and-forget, non-blocking)
    this.saveDebugInfo(storyId, session.sessionId).catch(err => {
      console.warn('[AutoModeCloudSession] Failed to save debug info:', err);
    });

    return session.sessionId;
  }

  /**
   * Build the execute-tasks command string.
   */
  private buildExecuteCommand(storyId: string): string {
    return `/${this.config.commandPrefix}:execute-tasks ${this.config.specId} ${storyId}`;
  }

  /**
   * Save debug information about the cloud session to a local JSON file.
   * Includes expanded slash command content and workflow files for debugging.
   * Fire-and-forget: errors are logged but do not affect execution.
   */
  private async saveDebugInfo(storyId: string, sessionId: string): Promise<void> {
    const specPath = projectDir(this.config.projectPath, 'specs', this.config.specId);
    const debugFilePath = join(specPath, 'auto-mode-debug.json');
    const command = this.buildExecuteCommand(storyId);
    const cliConfig = getCliCommandForModel(this.currentModel);
    const fullCliArgs = [...cliConfig.args, command];

    // Resolve paths for the expanded slash command content
    const cmdDir = resolveCommandDir(this.config.projectPath);
    const projDir = resolveProjectDir(this.config.projectPath);
    const globalDir = resolveGlobalDir();

    // Read the slash command definition file
    const commandFilePath = join(this.config.projectPath, '.claude', 'commands', cmdDir, 'execute-tasks.md');
    let commandFileContent: string | null = null;
    try {
      commandFileContent = await readFile(commandFilePath, 'utf-8');
    } catch { /* file not found */ }

    // Read the entry-point workflow (local first, then global fallback)
    const entryPointLocal = join(this.config.projectPath, projDir, 'workflows', 'core', 'execute-tasks', 'entry-point.md');
    const entryPointGlobal = join(globalDir, 'workflows', 'core', 'execute-tasks', 'entry-point.md');
    let entryPointPath = entryPointLocal;
    let entryPointContent: string | null = null;
    try {
      entryPointContent = await readFile(entryPointLocal, 'utf-8');
    } catch {
      try {
        entryPointContent = await readFile(entryPointGlobal, 'utf-8');
        entryPointPath = entryPointGlobal;
      } catch { /* not found */ }
    }

    // Read kanban.json for current phase info
    let kanbanPhase: string | null = null;
    try {
      const kanbanPath = join(specPath, 'kanban.json');
      const kanbanContent = JSON.parse(await readFile(kanbanPath, 'utf-8'));
      kanbanPhase = kanbanContent?.resumeContext?.currentPhase || null;
    } catch { /* not found */ }

    const entry: Record<string, unknown> = {
      storyId,
      timestamp: new Date().toISOString(),
      model: this.currentModel,
      command,
      cliCommand: cliConfig.command,
      cliArgs: fullCliArgs,
      projectPath: this.config.projectPath,
      sessionId,
      kanbanPhase,
      expandedPrompt: {
        commandFile: {
          path: commandFilePath,
          content: commandFileContent,
        },
        entryPoint: {
          path: entryPointPath,
          content: entryPointContent,
        },
      },
    };

    interface DebugData {
      specId: string;
      lastReset: string;
      sessions: Array<Record<string, unknown>>;
    }

    let debugData: DebugData;

    if (this.isFirstStory || !existsSync(debugFilePath)) {
      debugData = {
        specId: this.config.specId,
        lastReset: new Date().toISOString(),
        sessions: [],
      };
      this.isFirstStory = false;
    } else {
      try {
        const existing = await readFile(debugFilePath, 'utf-8');
        debugData = JSON.parse(existing) as DebugData;
      } catch {
        debugData = {
          specId: this.config.specId,
          lastReset: new Date().toISOString(),
          sessions: [],
        };
      }
    }

    debugData.sessions.push(entry);
    await writeFile(debugFilePath, JSON.stringify(debugData, null, 2), 'utf-8');

    console.log(`[AutoModeCloudSession] Debug info saved to ${debugFilePath}`);
  }

  /**
   * Start watching kanban.json for story completion.
   */
  private startKanbanWatch(storyId: string): void {
    const specPath = projectDir(this.config.projectPath, 'specs', this.config.specId);
    this.kanbanWatcher.watch(specPath, storyId);
  }

  /**
   * Set up listeners for KanbanFileWatcher events.
   */
  private setupKanbanWatcherListeners(): void {
    this.kanbanWatcher.on('story.completed', (storyId: string) => {
      console.log(`[AutoModeCloudSession] Story ${storyId} completed (detected via kanban.json)`);
      this.emit('story.completed', storyId);
    });

    this.kanbanWatcher.on('story.failed', (storyId: string, error: string) => {
      console.log(`[AutoModeCloudSession] Story ${storyId} failed: ${error}`);
      this.emit('story.failed', storyId, error);
    });

    this.kanbanWatcher.on('timeout', (storyId: string) => {
      console.log(`[AutoModeCloudSession] Story ${storyId} timed out`);
      this.emit('story.failed', storyId, 'Story execution timed out (30 minutes)');
    });
  }

  /**
   * Register a listener for session.closed events from CloudTerminalManager.
   * Detects unexpected session crashes.
   */
  private registerSessionClosedListener(): void {
    this.sessionClosedHandler = (closedSessionId: string, exitCode?: number): void => {
      if (closedSessionId === this.sessionId) {
        console.warn(`[AutoModeCloudSession] Session ${closedSessionId} closed unexpectedly (exit code: ${exitCode})`);

        // Clean up
        this.kanbanWatcher.unwatch();
        this.sessionId = null;

        if (!this.isCancelled) {
          this.emit('error', new Error(`Cloud Terminal session closed unexpectedly (exit code: ${exitCode})`));
        }
      }
    };

    this.config.cloudTerminalManager.on('session.closed', this.sessionClosedHandler);
  }

  /**
   * Remove the session.closed listener.
   */
  private unregisterSessionClosedListener(): void {
    if (this.sessionClosedHandler) {
      this.config.cloudTerminalManager.off('session.closed', this.sessionClosedHandler);
      this.sessionClosedHandler = null;
    }
  }
}
