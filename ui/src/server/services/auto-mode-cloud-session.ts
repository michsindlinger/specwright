/**
 * AutoModeCloudSession Service
 *
 * Orchestrates Cloud Terminal sessions for Auto-Mode execution.
 * Creates a new Claude session for each story to ensure reliable execution.
 *
 * Events:
 * - 'story.completed' (storyId: string) - Story completed successfully
 * - 'story.failed' (storyId: string, error: string) - Story failed or timed out
 * - 'story.stalled' (storyId: string, silentMs: number) - No terminal activity for STALL_THRESHOLD_MS
 * - 'story.prompt-stuck' (storyId: string, matchedText: string) - Interactive prompt detected in output
 * - 'spec.completed' (specId: string) - All stories in spec completed
 * - 'error' (error: Error) - Session error (crash, etc.)
 * - 'closed' () - Session closed (cleanup complete)
 */

import { EventEmitter } from 'events';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { CloudTerminalManager } from './cloud-terminal-manager.js';
import { KanbanFileWatcher } from './kanban-file-watcher.js';
import { projectDir } from '../utils/project-dirs.js';
import { buildMcpFlags, cleanupMcpTempFile } from '../utils/mcp-profile.js';
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

/** Emit a stall warning after this many ms without terminal output. */
const STALL_THRESHOLD_MS = 5 * 60 * 1000;

/** How often the stall watchdog checks lastActivity. */
const STALL_CHECK_INTERVAL_MS = 60 * 1000;

export class AutoModeCloudSession extends EventEmitter {
  private config: AutoModeCloudSessionConfig;
  private sessionId: CloudTerminalSessionId | null = null;
  private currentStoryId: string | null = null;
  private currentModel: string;
  private kanbanWatcher: KanbanFileWatcher;
  /** v3.22.0: map of sessionId → MCP CLI flags so we can clean up temp configs on session close */
  private pendingMcpCleanup: Map<string, string[]> = new Map();
  private sessionClosedHandler: ((closedSessionId: string, exitCode?: number) => void) | null = null;
  private promptDetectedHandler: ((detectedSessionId: string, matchedText: string) => void) | null = null;
  private stallWatchdogTimer: ReturnType<typeof setInterval> | null = null;
  private stalledNotified = false;
  private isCancelled = false;

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
    this.config.cloudTerminalManager.setAutoModeActive(sessionId, true);

    // Start watching kanban.json for completion
    this.startKanbanWatch(storyId);

    // Register session.closed listener for crash detection
    this.registerSessionClosedListener();
    this.registerPromptDetectedListener();
    this.startStallWatchdog();

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
      this.unregisterPromptDetectedListener();
      this.stopStallWatchdog();
      this.config.cloudTerminalManager.closeSession(this.sessionId);
      this.cleanupMcpForSession(this.sessionId);
    }

    // Create new session with the execute command as initial prompt
    const sessionId = await this.createCloudSession(storyId);
    this.sessionId = sessionId;
    this.config.cloudTerminalManager.setAutoModeActive(sessionId, true);
    this.registerSessionClosedListener();
    this.registerPromptDetectedListener();
    this.stalledNotified = false;
    this.startStallWatchdog();

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
    this.stopStallWatchdog();

    // Close Cloud Terminal session
    if (this.sessionId) {
      this.unregisterSessionClosedListener();
      this.unregisterPromptDetectedListener();
      this.config.cloudTerminalManager.closeSession(this.sessionId);
      this.cleanupMcpForSession(this.sessionId);
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

    // Read spec context files (used for both prompt and debug)
    const specContext = await this.readSpecContext();
    const command = this.buildExecuteCommand(storyId, specContext);

    // v3.22.0: Build MCP-profile flags so the Claude session only loads the
    // MCP servers this workflow needs (~25k tokens saved for execute-tasks).
    // Empty array on any failure path → status-quo (full MCP set).
    const executionId = `auto-${this.config.specId}-${storyId}`;
    const mcpFlags = await buildMcpFlags(
      `/${this.config.commandPrefix}:execute-tasks ${this.config.specId} ${storyId}`,
      this.config.projectPath,
      executionId
    ).catch(err => {
      console.warn('[AutoModeCloudSession] buildMcpFlags failed, falling back to status-quo:', err);
      return [] as string[];
    });

    // Create session with initial prompt + MCP flags (passed as CLI arguments)
    const session = this.config.cloudTerminalManager.createSession(
      this.config.projectPath,
      'claude-code',
      modelConfig,
      undefined, // cols
      undefined, // rows
      command,
      mcpFlags
    );

    // Track temp MCP file so we can clean it up when the session closes
    if (mcpFlags.length > 0) {
      this.pendingMcpCleanup.set(session.sessionId, mcpFlags);
    }

    return session.sessionId;
  }

  /**
   * Read spec context files for embedding in the prompt.
   */
  private async readSpecContext(): Promise<{
    specLite: string | null;
    crossCuttingDecisions: string | null;
    integrationContext: string | null;
  }> {
    const specPath = projectDir(this.config.projectPath, 'specs', this.config.specId);

    let specLite: string | null = null;
    try {
      specLite = await readFile(join(specPath, 'spec-lite.md'), 'utf-8');
    } catch { /* optional */ }

    let crossCuttingDecisions: string | null = null;
    try {
      crossCuttingDecisions = await readFile(join(specPath, 'cross-cutting-decisions.md'), 'utf-8');
    } catch { /* optional */ }

    let integrationContext: string | null = null;
    try {
      integrationContext = await readFile(join(specPath, 'integration-context.md'), 'utf-8');
    } catch { /* optional */ }

    return { specLite, crossCuttingDecisions, integrationContext };
  }

  /**
   * Build the execute-tasks command string with embedded spec context.
   * Prepends spec-lite, cross-cutting-decisions and integration-context
   * to the slash command so Claude Code has the context regardless of
   * whether it calls the MCP tool.
   */
  private buildExecuteCommand(storyId: string, specContext: {
    specLite: string | null;
    crossCuttingDecisions: string | null;
    integrationContext: string | null;
  }): string {
    const baseCommand = `/${this.config.commandPrefix}:execute-tasks ${this.config.specId} ${storyId}`;
    const contextParts: string[] = [];

    if (specContext.specLite) {
      contextParts.push(`<spec-context type="spec-lite">\n${specContext.specLite}\n</spec-context>`);
    }
    if (specContext.crossCuttingDecisions) {
      contextParts.push(`<spec-context type="cross-cutting-decisions">\n${specContext.crossCuttingDecisions}\n</spec-context>`);
    }
    if (specContext.integrationContext) {
      contextParts.push(`<spec-context type="integration-context">\n${specContext.integrationContext}\n</spec-context>`);
    }

    if (contextParts.length > 0) {
      return `${contextParts.join('\n\n')}\n\n${baseCommand}`;
    }

    return baseCommand;
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
        this.cleanupMcpForSession(closedSessionId);
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

  /**
   * Register a listener for `session.prompt-detected` from CloudTerminalManager.
   * Forwards as `story.prompt-stuck` for the currently executing story.
   */
  private registerPromptDetectedListener(): void {
    this.promptDetectedHandler = (detectedSessionId: string, matchedText: string): void => {
      if (detectedSessionId !== this.sessionId || !this.currentStoryId || this.isCancelled) {
        return;
      }
      console.warn(`[AutoModeCloudSession] Story ${this.currentStoryId} prompt detected: ${JSON.stringify(matchedText)}`);
      this.emit('story.prompt-stuck', this.currentStoryId, matchedText);
    };

    this.config.cloudTerminalManager.on('session.prompt-detected', this.promptDetectedHandler);
  }

  private unregisterPromptDetectedListener(): void {
    if (this.promptDetectedHandler) {
      this.config.cloudTerminalManager.off('session.prompt-detected', this.promptDetectedHandler);
      this.promptDetectedHandler = null;
    }
  }

  /**
   * Start polling the session's lastActivity every STALL_CHECK_INTERVAL_MS.
   * Emits `story.stalled` once after STALL_THRESHOLD_MS of silence; resets when activity resumes.
   */
  private startStallWatchdog(): void {
    this.stopStallWatchdog();
    this.stalledNotified = false;

    this.stallWatchdogTimer = setInterval(() => {
      if (this.isCancelled || !this.sessionId || !this.currentStoryId) {
        return;
      }

      const session = this.config.cloudTerminalManager.getSession(this.sessionId);
      if (!session) {
        return;
      }

      const silentMs = Date.now() - session.lastActivity.getTime();

      if (silentMs >= STALL_THRESHOLD_MS) {
        if (!this.stalledNotified) {
          this.stalledNotified = true;
          console.warn(`[AutoModeCloudSession] Story ${this.currentStoryId} stalled (${Math.round(silentMs / 1000)}s without output)`);
          this.emit('story.stalled', this.currentStoryId, silentMs);
        }
      } else if (this.stalledNotified) {
        // Activity resumed — arm for next stall
        this.stalledNotified = false;
      }
    }, STALL_CHECK_INTERVAL_MS);
  }

  private stopStallWatchdog(): void {
    if (this.stallWatchdogTimer) {
      clearInterval(this.stallWatchdogTimer);
      this.stallWatchdogTimer = null;
    }
    this.stalledNotified = false;
  }

  /**
   * v3.22.0: Remove the MCP temp-config file generated for a session, if any.
   * Called from every session-close path (normal transition, cancel, crash).
   */
  private cleanupMcpForSession(sessionId: string): void {
    const flags = this.pendingMcpCleanup.get(sessionId);
    if (!flags) return;
    this.pendingMcpCleanup.delete(sessionId);
    cleanupMcpTempFile(flags).catch(() => {});
  }
}
