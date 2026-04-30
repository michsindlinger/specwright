/**
 * AutoModeStorySlot Service
 *
 * Manages a single PTY session for one story/item execution.
 * Handles stall detection, prompt-stuck detection, and crash recovery.
 * Orchestrators (AutoModeOrchestratorBase subclasses) own the lifecycle.
 *
 * Events:
 * - 'stalled' (storyId: string, silentMs: number) — fires once at 5 min warn
 *   edge AND once at 10 min recovery edge. Both edges reset on activity.
 *   Handlers should branch on `silentMs` (>= STALL_RECOVERY_MS triggers recovery).
 * - 'prompt-stuck' (storyId: string, matchedText: string)
 * - 'error' (error: Error) — session crashed unexpectedly
 * - 'closed' () — cleanup complete
 */

import { EventEmitter } from 'events';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { CloudTerminalManager } from './cloud-terminal-manager.js';
import { projectDir } from '../utils/project-dirs.js';
import { buildMcpFlags, cleanupMcpTempFile } from '../utils/mcp-profile.js';
import { AUTO_MODE_CLI_FLAGS } from './auto-mode-cli-flags.js';
import type { CloudTerminalSessionId, CloudTerminalModelConfig } from '../../shared/types/cloud-terminal.protocol.js';

export interface AutoModeStorySlotConfig {
  projectPath: string;
  storyId: string;
  title: string;
  executeArgs: string;
  model: string;
  cloudTerminalManager: CloudTerminalManager;
  commandPrefix: string;
  specId?: string;
}

export const STALL_THRESHOLD_MS = 5 * 60 * 1000;
/**
 * Second stall edge — orchestrator escalates from "warn" to "force-recover" once
 * a session has been silent past this threshold. Auto-mode workflow-executor
 * reads `silentMs` from the event payload and triggers `stallRecoverSlot`.
 */
export const STALL_RECOVERY_MS = 10 * 60 * 1000;
const STALL_CHECK_INTERVAL_MS = 60 * 1000;

export class AutoModeStorySlot extends EventEmitter {
  private sessionId: CloudTerminalSessionId | null = null;
  private isCancelled = false;
  private readonly pendingMcpCleanup: Map<string, string[]> = new Map();
  private sessionClosedHandler: ((sid: string, exitCode?: number) => void) | null = null;
  private promptDetectedHandler: ((sid: string, matchedText: string) => void) | null = null;
  private blockerReportedHandler: ((sid: string, reason: string) => void) | null = null;
  private stallWatchdogTimer: ReturnType<typeof setInterval> | null = null;
  private stalledNotified = false;
  private recoveryNotified = false;

  constructor(private readonly config: AutoModeStorySlotConfig) {
    super();
  }

  getTitle(): string {
    return this.config.title;
  }

  async start(): Promise<CloudTerminalSessionId> {
    const specContext = this.config.specId
      ? await this.readSpecContext()
      : { specLite: null, crossCuttingDecisions: null, integrationContext: null };

    const command = this.buildCommand(specContext);

    const executionId = `auto-${this.config.specId ?? 'backlog'}-${this.config.storyId}`;
    const mcpFlags = await buildMcpFlags(
      `/${this.config.commandPrefix}:execute-tasks ${this.config.executeArgs}`,
      this.config.projectPath,
      executionId
    ).catch(err => {
      console.warn('[AutoModeStorySlot] buildMcpFlags failed, falling back to status-quo:', err);
      return [] as string[];
    });

    const modelConfig: CloudTerminalModelConfig = { model: this.config.model };
    const extraCliArgs = [...mcpFlags, ...AUTO_MODE_CLI_FLAGS];
    const session = this.config.cloudTerminalManager.createSession(
      this.config.projectPath,
      'claude-code',
      modelConfig,
      undefined,
      undefined,
      command,
      extraCliArgs
    );

    if (mcpFlags.length > 0) {
      this.pendingMcpCleanup.set(session.sessionId, mcpFlags);
    }

    this.sessionId = session.sessionId;
    this.config.cloudTerminalManager.setAutoModeActive(session.sessionId, true);

    this.registerSessionClosedListener();
    this.registerPromptDetectedListener();
    this.registerBlockerReportedListener();
    this.startStallWatchdog();

    console.log(`[AutoModeStorySlot] Started story ${this.config.storyId} in session ${session.sessionId}`);
    return session.sessionId;
  }

  async cancel(): Promise<void> {
    if (this.isCancelled) return;
    this.isCancelled = true;

    this.stopStallWatchdog();
    this.unregisterSessionClosedListener();
    this.unregisterPromptDetectedListener();
    this.unregisterBlockerReportedListener();

    if (this.sessionId) {
      this.config.cloudTerminalManager.closeSession(this.sessionId);
      this.cleanupMcpForSession(this.sessionId);
      this.sessionId = null;
    }

    this.emit('closed');
  }

  getSessionId(): CloudTerminalSessionId | null { return this.sessionId; }
  getStoryId(): string { return this.config.storyId; }

  private async readSpecContext(): Promise<{
    specLite: string | null;
    crossCuttingDecisions: string | null;
    integrationContext: string | null;
  }> {
    const specPath = projectDir(this.config.projectPath, 'specs', this.config.specId!);

    let specLite: string | null = null;
    try { specLite = await readFile(join(specPath, 'spec-lite.md'), 'utf-8'); } catch { /* optional */ }

    let crossCuttingDecisions: string | null = null;
    try { crossCuttingDecisions = await readFile(join(specPath, 'cross-cutting-decisions.md'), 'utf-8'); } catch { /* optional */ }

    let integrationContext: string | null = null;
    try { integrationContext = await readFile(join(specPath, 'integration-context.md'), 'utf-8'); } catch { /* optional */ }

    return { specLite, crossCuttingDecisions, integrationContext };
  }

  private buildCommand(specContext: {
    specLite: string | null;
    crossCuttingDecisions: string | null;
    integrationContext: string | null;
  }): string {
    const baseCommand = `/${this.config.commandPrefix}:execute-tasks ${this.config.executeArgs}`;
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

    return contextParts.length > 0
      ? `${contextParts.join('\n\n')}\n\n${baseCommand}`
      : baseCommand;
  }

  private registerSessionClosedListener(): void {
    this.sessionClosedHandler = (closedSessionId: string, exitCode?: number): void => {
      if (closedSessionId !== this.sessionId) return;

      console.warn(`[AutoModeStorySlot] Session ${closedSessionId} closed unexpectedly (exit: ${exitCode})`);
      this.cleanupMcpForSession(closedSessionId);
      this.sessionId = null;

      if (!this.isCancelled) {
        this.emit('error', new Error(`Cloud Terminal session closed unexpectedly (exit code: ${exitCode})`));
      }
    };
    this.config.cloudTerminalManager.on('session.closed', this.sessionClosedHandler);
  }

  private unregisterSessionClosedListener(): void {
    if (this.sessionClosedHandler) {
      this.config.cloudTerminalManager.off('session.closed', this.sessionClosedHandler);
      this.sessionClosedHandler = null;
    }
  }

  private registerPromptDetectedListener(): void {
    this.promptDetectedHandler = (detectedSessionId: string, matchedText: string): void => {
      if (detectedSessionId !== this.sessionId || this.isCancelled) return;
      console.warn(`[AutoModeStorySlot] Story ${this.config.storyId} prompt detected: ${JSON.stringify(matchedText)}`);
      this.emit('prompt-stuck', this.config.storyId, matchedText);
    };
    this.config.cloudTerminalManager.on('session.prompt-detected', this.promptDetectedHandler);
  }

  private unregisterPromptDetectedListener(): void {
    if (this.promptDetectedHandler) {
      this.config.cloudTerminalManager.off('session.prompt-detected', this.promptDetectedHandler);
      this.promptDetectedHandler = null;
    }
  }

  private registerBlockerReportedListener(): void {
    this.blockerReportedHandler = (sid: string, reason: string): void => {
      if (sid !== this.sessionId || this.isCancelled) return;
      console.warn(`[AutoModeStorySlot] Story ${this.config.storyId} blocker reported: ${reason}`);
      this.emit('error', new Error(`Blocker: ${reason}`));
    };
    this.config.cloudTerminalManager.on('session.blocker-reported', this.blockerReportedHandler);
  }

  private unregisterBlockerReportedListener(): void {
    if (this.blockerReportedHandler) {
      this.config.cloudTerminalManager.off('session.blocker-reported', this.blockerReportedHandler);
      this.blockerReportedHandler = null;
    }
  }

  private startStallWatchdog(): void {
    this.stopStallWatchdog();
    this.stalledNotified = false;
    this.recoveryNotified = false;

    this.stallWatchdogTimer = setInterval(() => {
      if (this.isCancelled || !this.sessionId) return;

      const session = this.config.cloudTerminalManager.getSession(this.sessionId);
      if (!session) return;

      const silentMs = Date.now() - session.lastActivity.getTime();

      // Edge 2: recovery threshold — fire once when crossing 10 min idle.
      // Workflow-executor handler reads silentMs and decides to force-recover.
      if (silentMs >= STALL_RECOVERY_MS) {
        if (!this.recoveryNotified) {
          this.recoveryNotified = true;
          this.stalledNotified = true; // suppress duplicate first-edge fire
          console.warn(`[AutoModeStorySlot] Story ${this.config.storyId} recovery-threshold reached (${Math.round(silentMs / 1000)}s)`);
          this.emit('stalled', this.config.storyId, silentMs);
        }
        return;
      }

      // Edge 1: warn threshold — fire once when crossing 5 min idle.
      if (silentMs >= STALL_THRESHOLD_MS) {
        if (!this.stalledNotified) {
          this.stalledNotified = true;
          console.warn(`[AutoModeStorySlot] Story ${this.config.storyId} stalled (${Math.round(silentMs / 1000)}s)`);
          this.emit('stalled', this.config.storyId, silentMs);
        }
        return;
      }

      // Activity resumed below warn threshold — reset both edges so future
      // stalls re-fire.
      if (this.stalledNotified || this.recoveryNotified) {
        this.stalledNotified = false;
        this.recoveryNotified = false;
      }
    }, STALL_CHECK_INTERVAL_MS);
  }

  private stopStallWatchdog(): void {
    if (this.stallWatchdogTimer) {
      clearInterval(this.stallWatchdogTimer);
      this.stallWatchdogTimer = null;
    }
    this.stalledNotified = false;
    this.recoveryNotified = false;
  }

  private cleanupMcpForSession(sessionId: string): void {
    const flags = this.pendingMcpCleanup.get(sessionId);
    if (!flags) return;
    this.pendingMcpCleanup.delete(sessionId);
    cleanupMcpTempFile(flags).catch(() => {});
  }
}
