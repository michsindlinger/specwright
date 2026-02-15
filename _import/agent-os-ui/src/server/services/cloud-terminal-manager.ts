/**
 * CloudTerminalManager Service
 *
 * Manages multiple PTY terminal sessions for Cloud Code CLI.
 * Independent of workflow executions - sessions persist across project switches.
 *
 * Key Features:
 * - Multi-session management (max 5 concurrent sessions)
 * - Session state machine: creating → active → paused → closed
 * - Output buffering during pause state
 * - EventEmitter pattern for session lifecycle events
 * - Delegates PTY operations to TerminalManager
 *
 * Architecture:
 * - Service Layer: Manages session metadata and state
 * - Adapter Pattern: Uses TerminalManager for PTY operations
 * - State Machine: Tracks session status transitions
 */

import { EventEmitter } from 'events';
import {
  CloudTerminalSession,
  CloudTerminalSessionId,
  CloudTerminalType,
  CloudTerminalModelConfig,
  CLOUD_TERMINAL_CONFIG,
  CLOUD_TERMINAL_ERROR_CODES,
} from '../../shared/types/cloud-terminal.protocol.js';
import { TerminalManager } from './terminal-manager.js';
import { getCliCommandForModel } from '../model-config.js';

/**
 * Extended cloud terminal session with internal state
 */
interface ManagedCloudSession extends CloudTerminalSession {
  /** TerminalManager execution ID (internal mapping) */
  executionId: string;

  /** Buffer for output during paused state */
  pausedBuffer: string[];

  /** Flag to track if buffer overflow warning was logged */
  bufferOverflowWarned?: boolean;
}

/**
 * CloudTerminalManager - Multi-session terminal manager
 *
 * Emits:
 * - 'session.created' (CloudTerminalSession) - New session created
 * - 'session.closed' (CloudTerminalSessionId, exitCode?) - Session closed
 * - 'session.paused' (CloudTerminalSessionId) - Session paused
 * - 'session.resumed' (CloudTerminalSessionId) - Session resumed
 * - 'session.data' (CloudTerminalSessionId, string) - Terminal output
 * - 'session.error' (CloudTerminalSessionId, Error) - Session error
 */
export class CloudTerminalManager extends EventEmitter {
  /**
   * Active cloud terminal sessions keyed by session ID
   */
  private sessions: Map<CloudTerminalSessionId, ManagedCloudSession> = new Map();

  /**
   * TerminalManager instance for PTY operations
   */
  private terminalManager: TerminalManager;

  /**
   * Counter for generating internal execution IDs
   */
  private executionIdCounter = 0;

  constructor(terminalManager: TerminalManager) {
    super();
    this.terminalManager = terminalManager;

    // Forward TerminalManager events to handle PTY output
    this.setupTerminalManagerListeners();
  }

  /**
   * Create a new Cloud Terminal session
   *
   * @param projectPath - Project path for the terminal
   * @param terminalType - Terminal type ('shell' or 'claude-code')
   * @param modelConfig - Model configuration for Claude Code CLI (required for 'claude-code', unused for 'shell')
   * @param cols - Terminal columns (default: 120)
   * @param rows - Terminal rows (default: 40)
   * @returns Created session metadata
   * @throws Error if max sessions reached or spawn fails
   */
  public createSession(
    projectPath: string,
    terminalType: CloudTerminalType,
    modelConfig?: CloudTerminalModelConfig,
    cols?: number,
    rows?: number
  ): CloudTerminalSession {
    // Check max sessions limit
    if (this.sessions.size >= CLOUD_TERMINAL_CONFIG.MAX_SESSIONS) {
      const error = new Error(
        `Maximale Anzahl Sessions (${CLOUD_TERMINAL_CONFIG.MAX_SESSIONS}) erreicht`
      );
      (error as Error & { code: string }).code = CLOUD_TERMINAL_ERROR_CODES.MAX_SESSIONS_REACHED;
      throw error;
    }

    // Generate unique session ID
    const sessionId = this.generateSessionId();

    // Generate internal execution ID for TerminalManager
    const executionId = `cloud-${sessionId}`;

    // Create session metadata
    const session: ManagedCloudSession = {
      sessionId,
      projectPath,
      terminalType,
      status: 'creating',
      modelConfig,
      buffer: [],
      pausedBuffer: [],
      createdAt: new Date(),
      lastActivity: new Date(),
      executionId,
    };

    // Store session
    this.sessions.set(sessionId, session);

    try {
      let shellCommand: string;
      let shellArgs: string[];
      let shellEnv: Record<string, string>;

      if (terminalType === 'shell') {
        // Plain shell terminal: use system default shell, no Claude Code
        shellCommand = process.env.SHELL || 'bash';
        shellArgs = [];
        shellEnv = process.env as Record<string, string>;
      } else {
        // Claude Code terminal: use CLI command from model config
        if (!modelConfig || !modelConfig.model) {
          throw new Error('Model configuration is required for claude-code terminals');
        }
        const cliConfig = getCliCommandForModel(modelConfig.model);
        shellCommand = cliConfig.command;
        shellArgs = cliConfig.args;
        shellEnv = {
          ...(process.env as Record<string, string>),
          CLAUDE_MODEL: modelConfig.model,
          CLAUDE_PROVIDER: modelConfig.provider || 'anthropic',
        };
      }

      // Spawn PTY process
      // Cloud terminals use a longer inactivity timeout (30min vs 5min for workflows)
      const terminalSession = this.terminalManager.spawn({
        executionId,
        cwd: projectPath,
        shell: shellCommand,
        args: shellArgs,
        cols: cols || CLOUD_TERMINAL_CONFIG.DEFAULT_COLS,
        rows: rows || CLOUD_TERMINAL_CONFIG.DEFAULT_ROWS,
        inactivityTimeoutMs: CLOUD_TERMINAL_CONFIG.INACTIVITY_TIMEOUT_MS,
        env: shellEnv,
      });

      // Update session with PTY info
      session.pid = terminalSession.pid;
      session.status = 'active';

      console.log(
        `[CloudTerminalManager] Created ${terminalType} session ${sessionId} for ${projectPath}, PID: ${terminalSession.pid}`
      );

      // Emit session created event
      this.emit('session.created', this.getSessionMetadata(session));

      return this.getSessionMetadata(session);
    } catch (error) {
      // Clean up on failure
      this.sessions.delete(sessionId);
      console.error(`[CloudTerminalManager] Failed to create session:`, error);
      throw error;
    }
  }

  /**
   * Close a Cloud Terminal session
   *
   * @param sessionId - Session ID to close
   * @returns true if closed successfully, false if session not found
   */
  public closeSession(sessionId: CloudTerminalSessionId): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Kill PTY process via TerminalManager
    const killed = this.terminalManager.kill(session.executionId);

    // Update session status
    session.status = 'closed';

    // Remove from sessions
    this.sessions.delete(sessionId);

    console.log(`[CloudTerminalManager] Closed session ${sessionId}`);

    // Emit session closed event
    this.emit('session.closed', sessionId, session.exitCode);

    return killed;
  }

  /**
   * Pause a Cloud Terminal session
   * Output will be buffered while paused
   *
   * @param sessionId - Session ID to pause
   * @returns true if paused successfully, false if session not found
   */
  public pauseSession(sessionId: CloudTerminalSessionId): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    if (session.status !== 'active') {
      console.warn(`[CloudTerminalManager] Cannot pause session ${sessionId}, status: ${session.status}`);
      return false;
    }

    session.status = 'paused';
    session.pausedAt = new Date();

    console.log(`[CloudTerminalManager] Paused session ${sessionId}`);

    // Emit session paused event
    this.emit('session.paused', sessionId);

    return true;
  }

  /**
   * Resume a paused Cloud Terminal session
   * Buffered output will be sent to client
   *
   * @param sessionId - Session ID to resume
   * @returns Buffered output during pause, or null if session not found
   */
  public resumeSession(sessionId: CloudTerminalSessionId): string | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    if (session.status !== 'paused') {
      console.warn(`[CloudTerminalManager] Cannot resume session ${sessionId}, status: ${session.status}`);
      return null;
    }

    session.status = 'active';
    session.pausedAt = undefined;

    // Get buffered output
    const bufferedOutput = session.pausedBuffer.join('\n');
    session.pausedBuffer = []; // Clear paused buffer

    console.log(`[CloudTerminalManager] Resumed session ${sessionId}`);

    // Emit session resumed event
    this.emit('session.resumed', sessionId, bufferedOutput);

    return bufferedOutput;
  }

  /**
   * Send input to a Cloud Terminal session
   *
   * @param sessionId - Target session ID
   * @param data - Input data (keystrokes, paste)
   * @returns true if written successfully, false if session not found or not active
   */
  public sendInput(sessionId: CloudTerminalSessionId, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    if (session.status !== 'active') {
      console.warn(`[CloudTerminalManager] Cannot send input to session ${sessionId}, status: ${session.status}`);
      return false;
    }

    const written = this.terminalManager.write(session.executionId, data);

    if (written) {
      session.lastActivity = new Date();
    }

    return written;
  }

  /**
   * Resize a Cloud Terminal session
   *
   * @param sessionId - Target session ID
   * @param cols - Number of columns
   * @param rows - Number of rows
   * @returns true if resized successfully, false if session not found
   */
  public resizeSession(
    sessionId: CloudTerminalSessionId,
    cols: number,
    rows: number
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      this.terminalManager.resize({
        executionId: session.executionId,
        cols,
        rows,
      });
      return true;
    } catch (error) {
      console.error(`[CloudTerminalManager] Failed to resize session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Get a Cloud Terminal session
   *
   * @param sessionId - Session ID
   * @returns Session metadata or undefined if not found
   */
  public getSession(sessionId: CloudTerminalSessionId): CloudTerminalSession | undefined {
    const session = this.sessions.get(sessionId);
    return session ? this.getSessionMetadata(session) : undefined;
  }

  /**
   * Get all Cloud Terminal sessions for a project
   *
   * @param projectPath - Project path to filter
   * @returns Array of session metadata
   */
  public getSessionsForProject(projectPath: string): CloudTerminalSession[] {
    return Array.from(this.sessions.values())
      .filter((session) => session.projectPath === projectPath)
      .map((session) => this.getSessionMetadata(session));
  }

  /**
   * Get all active Cloud Terminal sessions
   *
   * @returns Array of all session metadata
   */
  public getAllSessions(): CloudTerminalSession[] {
    return Array.from(this.sessions.values()).map((session) =>
      this.getSessionMetadata(session)
    );
  }

  /**
   * Get the count of active sessions
   *
   * @returns Number of active sessions
   */
  public getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Check if a session exists
   *
   * @param sessionId - Session ID to check
   * @returns true if session exists
   */
  public hasSession(sessionId: CloudTerminalSessionId): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Set up listeners for TerminalManager events
   */
  private setupTerminalManagerListeners(): void {
    // Handle terminal data
    this.terminalManager.on('terminal.data', (executionId: string, data: string) => {
      // Find session by execution ID
      const session = this.findSessionByExecutionId(executionId);
      if (!session) {
        return;
      }

      // Add to appropriate buffer based on session status
      if (session.status === 'paused') {
        this.addToPausedBuffer(session, data);
      } else {
        this.addToBuffer(session, data);
      }

      // Emit data event
      this.emit('session.data', session.sessionId, data);
    });

    // Handle terminal exit
    this.terminalManager.on('terminal.exit', (executionId: string, exitCode: number) => {
      // Find session by execution ID
      const session = this.findSessionByExecutionId(executionId);
      if (!session) {
        return;
      }

      session.exitCode = exitCode;
      session.status = 'closed';

      console.log(`[CloudTerminalManager] Session ${session.sessionId} exited with code ${exitCode}`);

      // Emit session closed event
      this.emit('session.closed', session.sessionId, exitCode);

      // Remove from sessions after a brief delay
      setTimeout(() => {
        this.sessions.delete(session.sessionId);
      }, 5000);
    });
  }

  /**
   * Find a session by its internal execution ID
   */
  private findSessionByExecutionId(executionId: string): ManagedCloudSession | undefined {
    return Array.from(this.sessions.values()).find(
      (session) => session.executionId === executionId
    );
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): CloudTerminalSessionId {
    return `cloud-${Date.now()}-${++this.executionIdCounter}`;
  }

  /**
   * Add data to session buffer with size limits
   */
  private addToBuffer(session: ManagedCloudSession, data: string): void {
    const lines = data.split('\n');
    session.buffer.push(...lines);

    // Enforce line limit
    if (session.buffer.length > CLOUD_TERMINAL_CONFIG.MAX_BUFFER_LINES) {
      const overflow = session.buffer.length - CLOUD_TERMINAL_CONFIG.MAX_BUFFER_LINES;
      session.buffer.splice(0, overflow);
      if (!session.bufferOverflowWarned) {
        console.warn(
          `[CloudTerminalManager] Buffer limit reached for ${session.sessionId}, old lines trimmed`
        );
        session.bufferOverflowWarned = true;
      }
    }

    // Enforce size limit
    const bufferSize = session.buffer.join('\n').length;
    if (bufferSize > CLOUD_TERMINAL_CONFIG.MAX_BUFFER_SIZE) {
      while (session.buffer.join('\n').length > CLOUD_TERMINAL_CONFIG.MAX_BUFFER_SIZE) {
        session.buffer.shift();
      }
      if (!session.bufferOverflowWarned) {
        console.warn(
          `[CloudTerminalManager] Buffer size limit reached for ${session.sessionId}, trimmed to ${session.buffer.length} lines`
        );
        session.bufferOverflowWarned = true;
      }
    }
  }

  /**
   * Add data to paused buffer with size limits
   */
  private addToPausedBuffer(session: ManagedCloudSession, data: string): void {
    const lines = data.split('\n');
    session.pausedBuffer.push(...lines);

    // Enforce line limit for paused buffer (smaller limit)
    const maxPausedLines = Math.floor(CLOUD_TERMINAL_CONFIG.MAX_BUFFER_LINES / 2);
    if (session.pausedBuffer.length > maxPausedLines) {
      const overflow = session.pausedBuffer.length - maxPausedLines;
      session.pausedBuffer.splice(0, overflow);
    }

    // Enforce size limit for paused buffer
    const maxPausedSize = Math.floor(CLOUD_TERMINAL_CONFIG.MAX_BUFFER_SIZE / 2);
    const bufferSize = session.pausedBuffer.join('\n').length;
    if (bufferSize > maxPausedSize) {
      while (session.pausedBuffer.join('\n').length > maxPausedSize) {
        session.pausedBuffer.shift();
      }
    }
  }

  /**
   * Extract public session metadata (without internal fields)
   */
  private getSessionMetadata(session: ManagedCloudSession): CloudTerminalSession {
    return {
      sessionId: session.sessionId,
      projectPath: session.projectPath,
      terminalType: session.terminalType,
      status: session.status,
      modelConfig: session.modelConfig,
      pid: session.pid,
      buffer: [...session.buffer],
      exitCode: session.exitCode,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      pausedAt: session.pausedAt,
    };
  }

  /**
   * Clean up all sessions (for shutdown)
   */
  public shutdown(): void {
    console.log(`[CloudTerminalManager] Shutting down, cleaning up ${this.sessions.size} sessions`);

    for (const session of this.sessions.values()) {
      this.terminalManager.kill(session.executionId);
    }

    this.sessions.clear();
    this.removeAllListeners();
  }
}
