/**
 * Terminal Spawn Integration Test
 *
 * Tests: WorkflowExecutor → TerminalManager → PTY spawn
 * Validates: Connection 1 & 2 (WorkflowExecutor → TerminalManager → websocket.ts)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkflowExecutor } from '../../src/server/workflow-executor.js';
import { TerminalManager } from '../../src/server/services/terminal-manager.js';
import type { SpawnPtyOptions } from '../../src/shared/types/terminal.protocol.js';

describe('Terminal Spawn Integration', () => {
  let workflowExecutor: WorkflowExecutor;
  let terminalManager: TerminalManager;

  beforeEach(() => {
    // Initialize WorkflowExecutor (includes TerminalManager)
    workflowExecutor = new WorkflowExecutor();
    terminalManager = workflowExecutor.getTerminalManager();
  });

  afterEach(() => {
    // Cleanup all PTY sessions
    const activeSessionIds = terminalManager.getActiveSessionIds();
    activeSessionIds.forEach(executionId => {
      terminalManager.kill(executionId);
    });
  });

  it('should spawn PTY when workflow starts', () => {
    const executionId = 'test-exec-001';
    const options: SpawnPtyOptions = {
      executionId,
      // Use default shell from process.env.SHELL
      args: ['-c', 'echo Hello Terminal'],
      cwd: '/tmp'
    };

    // Spawn PTY
    const session = terminalManager.spawn(options);

    expect(session).toBeDefined();
    expect(session.executionId).toBe(executionId);
    expect(session.pid).toBeGreaterThan(0);
  });

  it('should emit terminal.data events with PTY output', (done) => {
    const executionId = 'test-exec-002';
    const expectedOutput = 'Test Output';

    // Listen for terminal.data event
    let receivedData = '';
    terminalManager.on('terminal.data', (execId: string, data: string) => {
      if (execId === executionId) {
        receivedData += data;

        if (receivedData.includes(expectedOutput)) {
          expect(receivedData).toContain(expectedOutput);
          done();
        }
      }
    });

    // Spawn PTY with echo command
    terminalManager.spawn({
      executionId,
      // Use default shell from process.env.SHELL
      args: ['-c', `echo "${expectedOutput}"`],
      cwd: '/tmp'
    });
  }, 5000);

  it('should emit terminal.exit event when process completes', async () => {
    const executionId = 'test-exec-003';

    // Create promise that resolves when terminal.exit event is emitted
    const exitPromise = new Promise<{ execId: string; exitCode: number }>((resolve) => {
      terminalManager.on('terminal.exit', (execId: string, exitCode: number) => {
        if (execId === executionId) {
          resolve({ execId, exitCode });
        }
      });
    });

    // Spawn short-lived process
    terminalManager.spawn({
      executionId,
      // Use default shell from process.env.SHELL
      args: ['-c', 'echo done'],
      cwd: '/tmp'
    });

    // Wait for exit event
    const { execId, exitCode } = await exitPromise;
    expect(execId).toBe(executionId);
    expect(exitCode).toBe(0);
  }, 5000);

  it('should isolate multiple PTY sessions by executionId', () => {
    const exec1 = 'test-exec-004';
    const exec2 = 'test-exec-005';

    // Spawn two PTY sessions
    const session1 = terminalManager.spawn({
      executionId: exec1,
      // Use default shell from process.env.SHELL
      args: ['-c', 'sleep 10'],
      cwd: '/tmp'
    });

    const session2 = terminalManager.spawn({
      executionId: exec2,
      // Use default shell from process.env.SHELL
      args: ['-c', 'sleep 10'],
      cwd: '/tmp'
    });

    // Verify sessions are isolated
    expect(session1.pid).not.toBe(session2.pid);
    expect(terminalManager.getSession(exec1)?.pid).toBe(session1.pid);
    expect(terminalManager.getSession(exec2)?.pid).toBe(session2.pid);
  });

  it('should kill PTY process on demand', () => {
    const executionId = 'test-exec-006';

    // Spawn long-running process
    const session = terminalManager.spawn({
      executionId,
      // Use default shell from process.env.SHELL
      args: ['-c', 'sleep 100'],
      cwd: '/tmp'
    });

    expect(session.pid).toBeGreaterThan(0);

    // Kill the process
    const killed = terminalManager.kill(executionId);
    expect(killed).toBe(true);

    // Verify session is removed
    const sessionAfterKill = terminalManager.getSession(executionId);
    expect(sessionAfterKill).toBeUndefined();
  });

  it('should handle invalid executionId gracefully', () => {
    const result = terminalManager.kill('non-existent-exec');
    expect(result).toBe(false);

    const session = terminalManager.getSession('non-existent-exec');
    expect(session).toBeUndefined();
  });

  it('should buffer PTY output for reconnect', async () => {
    const executionId = 'test-exec-007';

    // Spawn PTY
    terminalManager.spawn({
      executionId,
      // Use default shell from process.env.SHELL
      args: ['-c', 'echo -e "Line 1\\nLine 2\\nLine 3"'],
      cwd: '/tmp'
    });

    // Wait for output to be buffered
    await new Promise(resolve => setTimeout(resolve, 200));

    // Get buffer
    const buffer = terminalManager.getBuffer(executionId);
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should respect buffer line limit (10k lines)', async () => {
    const executionId = 'test-exec-008';

    // Spawn process that produces lots of output
    terminalManager.spawn({
      executionId,
      // Use default shell from process.env.SHELL
      args: ['-c', 'seq 1 20000'], // Generate 20k lines
      cwd: '/tmp'
    });

    // Wait for output
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get buffer
    const buffer = terminalManager.getBuffer(executionId);
    expect(buffer.length).toBeLessThanOrEqual(10000); // Max 10k lines
  }, 10000);

  it('should throw error for empty executionId', () => {
    expect(() => {
      terminalManager.spawn({
        executionId: '',
        // Use default shell from process.env.SHELL
        cwd: '/tmp'
      });
    }).toThrow('executionId is required');
  });

  it('should throw error for duplicate executionId', () => {
    const executionId = 'test-exec-009';

    // Spawn first session
    terminalManager.spawn({
      executionId,
      // Use default shell from process.env.SHELL
      args: ['-c', 'sleep 5'],
      cwd: '/tmp'
    });

    // Try to spawn duplicate
    expect(() => {
      terminalManager.spawn({
        executionId,
        // Use default shell from process.env.SHELL
        cwd: '/tmp'
      });
    }).toThrow('Terminal session already exists');
  });
});
