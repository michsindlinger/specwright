/**
 * TerminalManager Service
 *
 * Manages PTY process lifecycle for workflow executions.
 * Acts as an adapter between WorkflowExecutor and node-pty.
 *
 * Key Features:
 * - Session isolation using execution-ID-based Map
 * - In-memory buffer with size limits (10MB, 10k lines)
 * - Automatic cleanup after 5min inactivity
 * - EventEmitter pattern for terminal.data and terminal.exit events
 *
 * Architecture:
 * - Adapter Pattern: Wraps node-pty for simplified PTY management
 * - Service Layer: Placed in server/services/ (same layer as WorkflowExecutor)
 * - Follows WorkflowExecutor.executionMap pattern for session isolation
 */

import { EventEmitter } from 'events';
import * as pty from 'node-pty';
import {
  ExecutionId,
  TerminalSession,
  TerminalResizeEvent,
  SpawnPtyOptions,
  TERMINAL_BUFFER_LIMITS,
} from '../../shared/types/terminal.protocol.js';
import { clampTerminalSize } from '../../shared/types/cloud-terminal.protocol.js';

/**
 * Extended terminal session with PTY instance and cleanup timer
 */
interface ManagedTerminalSession extends TerminalSession {
  /** node-pty IPty instance */
  ptyProcess: pty.IPty;

  /** Cleanup timeout for inactive sessions */
  cleanupTimeout?: NodeJS.Timeout;

  /** Per-session inactivity timeout in ms (overrides default) */
  inactivityTimeoutMs?: number;

  /** Flag to track if buffer overflow warning was already logged (log once per session) */
  bufferOverflowWarned?: boolean;
}

/**
 * TerminalManager - PTY process lifecycle manager
 *
 * Emits:
 * - 'terminal.data' (ExecutionId, string) - PTY output data
 * - 'terminal.exit' (ExecutionId, number) - PTY process exit
 */
export class TerminalManager extends EventEmitter {
  /**
   * Active terminal sessions keyed by execution ID
   * Follows WorkflowExecutor.executionMap pattern for consistency
   */
  private sessions: Map<ExecutionId, ManagedTerminalSession> = new Map();

  /**
   * Spawn a PTY process for a workflow execution
   *
   * @param options - PTY spawn configuration
   * @returns Terminal session metadata
   * @throws Error if executionId is empty or session already exists
   */
  public spawn(options: SpawnPtyOptions): TerminalSession {
    const { executionId, shell, args, cwd, env, cols, rows } = options;

    // Validation: executionId is required
    if (!executionId || executionId.trim() === '') {
      throw new Error('executionId is required');
    }

    // Prevent duplicate sessions
    if (this.sessions.has(executionId)) {
      throw new Error(`Terminal session already exists for execution: ${executionId}`);
    }

    // Spawn PTY process using node-pty
    // Ensure UTF-8 locale for correct rendering of umlauts and special characters
    const mergedEnv = { ...process.env, ...env };
    if (!mergedEnv.LANG) {
      mergedEnv.LANG = 'en_US.UTF-8';
    }
    if (!mergedEnv.LC_CTYPE) {
      mergedEnv.LC_CTYPE = 'UTF-8';
    }

    const ptyProcess = pty.spawn(
      shell || process.env.SHELL || 'bash',
      args || [],
      {
        name: 'xterm-256color',
        cols: cols || 80,
        rows: rows || 24,
        cwd,
        env: Object.fromEntries(
          Object.entries(mergedEnv).filter(
            ([, value]) => value !== undefined
          )
        ) as { [key: string]: string },
      }
    );

    // Create session metadata
    const session: ManagedTerminalSession = {
      executionId,
      pid: ptyProcess.pid,
      buffer: [],
      createdAt: new Date(),
      lastActivity: new Date(),
      ptyProcess,
      inactivityTimeoutMs: options.inactivityTimeoutMs,
    };

    // Store session
    this.sessions.set(executionId, session);

    // Set up event handlers
    this.setupPtyHandlers(session);

    // Set up inactivity cleanup timer
    this.resetCleanupTimeout(session);

    console.log(
      `[TerminalManager] Spawned PTY process for ${executionId}, PID: ${ptyProcess.pid}`
    );

    // Return session metadata (without ptyProcess internal)
    return this.getSessionMetadata(session);
  }

  /**
   * Write data to a PTY process
   *
   * @param executionId - Execution ID
   * @param data - Data to write (e.g., user input)
   * @returns true if written successfully, false if session not found
   */
  public write(executionId: ExecutionId, data: string): boolean {
    const session = this.sessions.get(executionId);
    if (!session) {
      console.warn(`[TerminalManager] Terminal session not found: ${executionId}`);
      return false;
    }

    try {
      session.ptyProcess.write(data);
      session.lastActivity = new Date();
      this.resetCleanupTimeout(session);
      return true;
    } catch (error) {
      console.error(`[TerminalManager] Failed to write to terminal ${executionId}:`, error);
      return false;
    }
  }

  /**
   * Resize a PTY terminal
   *
   * @param event - Resize event with cols and rows
   * @throws Error if session not found
   */
  public resize(event: TerminalResizeEvent): void {
    const session = this.sessions.get(event.executionId);
    if (!session) {
      throw new Error(`Terminal session not found: ${event.executionId}`);
    }

    // Clamp to a safe, usable grid so node-pty can never throw on NaN/<=0/Infinity,
    // and Claude Code is never driven below a renderable size. A non-finite axis keeps
    // the PTY's current size (last good grid) rather than jumping to a default. In the
    // normal path the frontend already sends valid, >= MIN grids, so this is a no-op
    // safety net for malformed messages.
    const { cols, rows } = clampTerminalSize(event.cols, event.rows, {
      cols: session.ptyProcess.cols,
      rows: session.ptyProcess.rows,
    });
    session.ptyProcess.resize(cols, rows);
    session.lastActivity = new Date();
    console.log(
      `[TerminalManager] Resized terminal ${event.executionId} to ${cols}x${rows}`
    );
  }

  /**
   * Get terminal session metadata
   *
   * @param executionId - Execution ID
   * @returns Session metadata or undefined if not found
   */
  public getSession(executionId: ExecutionId): TerminalSession | undefined {
    const session = this.sessions.get(executionId);
    return session ? this.getSessionMetadata(session) : undefined;
  }

  /**
   * Get terminal output buffer
   *
   * @param executionId - Execution ID
   * @returns Buffer lines or empty array if session not found
   */
  public getBuffer(executionId: ExecutionId): string[] {
    const session = this.sessions.get(executionId);
    return session ? [...session.buffer] : [];
  }

  /**
   * Kill a PTY process
   *
   * @param executionId - Execution ID
   * @returns true if killed, false if session not found
   */
  public kill(executionId: ExecutionId): boolean {
    const session = this.sessions.get(executionId);
    if (!session) {
      return false;
    }

    try {
      session.ptyProcess.kill();
      this.sessions.delete(executionId);
      console.log(`[TerminalManager] Killed PTY process for ${executionId}`);
      return true;
    } catch (error) {
      console.error(`[TerminalManager] Error killing PTY process:`, error);
      return false;
    }
  }

  /**
   * Clean up a terminal session
   * Called on exit or timeout
   *
   * @param executionId - Execution ID
   */
  private cleanup(executionId: ExecutionId): void {
    const session = this.sessions.get(executionId);
    if (!session) {
      return;
    }

    // Clear cleanup timeout
    if (session.cleanupTimeout) {
      clearTimeout(session.cleanupTimeout);
    }

    // KILL the process to ensure it's not lingering
    try {
      if (session.ptyProcess) {
        session.ptyProcess.kill();
      }
    } catch (error) {
      console.error(`[TerminalManager] Error killing process during cleanup for ${executionId}:`, error);
    }

    // Remove from sessions map
    this.sessions.delete(executionId);

    console.log(
      `[TerminalManager] Cleaned up session ${executionId} (buffer: ${session.buffer.length} chunks)`
    );
  }

  /**
   * Set up event handlers for PTY process
   */
  private setupPtyHandlers(session: ManagedTerminalSession): void {
    const { executionId, ptyProcess } = session;

    // Handle PTY data output
    ptyProcess.onData((data: string) => {
      // Add to buffer
      this.addToBuffer(session, data);

      // Emit terminal.data event
      // Event shape is defined for protocol documentation, actual emission uses simpler format
      this.emit('terminal.data', executionId, data);

      // Log output to console if debug mode is enabled or for visibility
      // Filter logs to reduce noise - only important updates related to assistant or system events
      const dataStr = data.toString();
      // Heuristic: Claude CLI stream-json format includes type fields.
      // Look for text blocks or tool calls which represent the main activity.
      if (
        dataStr.includes('"type":"assistant"') ||
        dataStr.includes('"type":"tool_use"') ||
        dataStr.includes('"type":"system"') ||
        dataStr.includes('error') ||
        dataStr.includes('Error') ||
        dataStr.includes('completed') ||
        dataStr.includes('success')
      ) {
        process.stdout.write(`[Terminal:${executionId}] ${data}`);
      }

      // Update activity timestamp
      session.lastActivity = new Date();
      this.resetCleanupTimeout(session);
    });

    // Handle PTY process exit
    ptyProcess.onExit((event: { exitCode: number; signal?: number }) => {
      const exitCode = event.exitCode;
      session.exitCode = exitCode;

      console.log(`[TerminalManager] PTY process exited for ${executionId}, code: ${exitCode}`);

      // Emit terminal.exit event
      // Event shape is defined for protocol documentation, actual emission uses simpler format
      this.emit('terminal.exit', executionId, exitCode);

      // Clean up session (buffer remains accessible until cleanup)
      // Note: We keep the session in the map briefly so exit code can be read
      setTimeout(() => {
        this.cleanup(executionId);
      }, 5000); // 5 second grace period for final reads
    });
  }

  /**
   * Add data to session buffer with size limits.
   *
   * Stores raw PTY output chunks WITHOUT splitting, so the buffer concatenates back
   * (`join('')`) to the exact original stream. Splitting on '\n' was lossy: node-pty delivers
   * arbitrary, non-line-aligned chunks, so a split()+join('\n') round-trip inserted a spurious
   * newline at every chunk boundary that did not end in '\n', corrupting the replayed terminal.
   * Reconstruction via `join('')` is what the reconnect/buffer-response consumers and the tests
   * already assume. MAX_BUFFER_LINES is now a coarse chunk-count guard; MAX_BUFFER_SIZE (chars)
   * is the real cap. Mirrors CloudTerminalManager.addToBuffer.
   */
  private addToBuffer(session: ManagedTerminalSession, data: string): void {
    session.buffer.push(data);

    // Enforce chunk-count limit (coarse guard against unbounded growth)
    if (session.buffer.length > TERMINAL_BUFFER_LIMITS.MAX_BUFFER_LINES) {
      const overflow = session.buffer.length - TERMINAL_BUFFER_LIMITS.MAX_BUFFER_LINES;
      session.buffer.splice(0, overflow);
      // Only warn once per session to avoid log spam
      if (!session.bufferOverflowWarned) {
        console.warn(
          `[TerminalManager] Buffer chunk limit reached for ${session.executionId}, old output will be trimmed (this warning will not repeat)`
        );
        session.bufferOverflowWarned = true;
      }
    }

    // Enforce size limit (total characters) — drop oldest chunks until under the cap
    let totalSize = 0;
    for (const chunk of session.buffer) totalSize += chunk.length;
    if (totalSize > TERMINAL_BUFFER_LIMITS.MAX_BUFFER_SIZE) {
      while (session.buffer.length > 0 && totalSize > TERMINAL_BUFFER_LIMITS.MAX_BUFFER_SIZE) {
        totalSize -= session.buffer[0].length;
        session.buffer.shift();
      }
      // Only warn once per session to avoid log spam
      if (!session.bufferOverflowWarned) {
        console.warn(
          `[TerminalManager] Buffer size limit reached for ${session.executionId}, trimmed to ${session.buffer.length} chunks (this warning will not repeat)`
        );
        session.bufferOverflowWarned = true;
      }
    }
  }

  /**
   * Reset the cleanup timeout for a session
   */
  private resetCleanupTimeout(session: ManagedTerminalSession): void {
    // Clear existing timeout
    if (session.cleanupTimeout) {
      clearTimeout(session.cleanupTimeout);
    }

    // Use per-session timeout if set, otherwise fall back to default.
    // A value of 0 (or negative) disables automatic cleanup — session lives until
    // explicitly killed (e.g. cloud terminals, which close only on user request).
    const timeoutMs = session.inactivityTimeoutMs ?? TERMINAL_BUFFER_LIMITS.INACTIVITY_TIMEOUT_MS;
    if (timeoutMs <= 0) {
      return;
    }

    // Set new timeout
    session.cleanupTimeout = setTimeout(() => {
      console.log(
        `[TerminalManager] Session ${session.executionId} inactive for ${timeoutMs}ms, cleaning up`
      );
      this.cleanup(session.executionId);
    }, timeoutMs);
  }

  /**
   * Extract public session metadata (without ptyProcess internal)
   */
  private getSessionMetadata(session: ManagedTerminalSession): TerminalSession {
    return {
      executionId: session.executionId,
      pid: session.pid,
      buffer: [...session.buffer], // Return copy of buffer
      exitCode: session.exitCode,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
    };
  }

  /**
   * Get all active session IDs
   * Useful for debugging and monitoring
   */
  public getActiveSessionIds(): ExecutionId[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Clean up all sessions (for shutdown)
   */
  public shutdown(): void {
    console.log(`[TerminalManager] Shutting down, cleaning up ${this.sessions.size} sessions`);
    for (const executionId of this.sessions.keys()) {
      this.kill(executionId);
    }
    this.sessions.clear();
  }
}
