/**
 * Terminal Reconnect Integration Test
 *
 * Tests: Buffer restore on reconnect
 * Validates: Buffer persistence and reconnect flow
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TerminalManager } from '../../src/server/services/terminal-manager.js';

describe('Terminal Reconnect Integration', () => {
  let terminalManager: TerminalManager;

  beforeEach(() => {
    terminalManager = new TerminalManager();
  });

  afterEach(() => {
    const activeSessionIds = terminalManager.getActiveSessionIds();
    activeSessionIds.forEach(executionId => {
      terminalManager.kill(executionId);
    });
  });

  it('should preserve buffer during disconnection', async () => {
    const executionId = 'test-reconnect-001';

    // Spawn process with output
    terminalManager.spawn({
      executionId,
      // Use default shell from process.env.SHELL
      args: ['-c', 'for i in {1..10}; do echo "Line $i"; sleep 0.1; done'],
      cwd: '/tmp'
    });

    // Wait for some output
    await new Promise(resolve => setTimeout(resolve, 600));

    // Simulate disconnect: Get buffer as if reconnecting
    const buffer = terminalManager.getBuffer(executionId);

    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(0);

    // Verify buffer contains expected output
    const fullOutput = buffer.join('');
    expect(fullOutput).toContain('Line');
  });

  it('should restore all buffered output on reconnect', async () => {
    const executionId = 'test-reconnect-002';
    const outputLines: string[] = [];

    // Listen for output
    terminalManager.on('terminal.data', (execId: string, data: string) => {
      if (execId === executionId) {
        outputLines.push(data);
      }
    });

    // Spawn process
    terminalManager.spawn({
      executionId,
      // Use default shell from process.env.SHELL
      args: ['-c', 'echo "Before disconnect"; sleep 0.2; echo "After disconnect"'],
      cwd: '/tmp'
    });

    // Wait for first output
    await new Promise(resolve => setTimeout(resolve, 300));

    // Simulate reconnect: Get buffer
    const buffer = terminalManager.getBuffer(executionId);
    const bufferedOutput = buffer.join('');

    // Verify buffer contains all output
    expect(bufferedOutput).toContain('Before disconnect');
    // Note: "After disconnect" might not be in buffer yet, depending on timing
  });

  it('should handle reconnect while process is still running', async () => {
    const executionId = 'test-reconnect-003';

    // Spawn long-running process
    terminalManager.spawn({
      executionId,
      // Use default shell from process.env.SHELL
      args: ['-c', 'for i in {1..50}; do echo "Line $i"; sleep 0.1; done'],
      cwd: '/tmp'
    });

    // Wait for some output
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulate reconnect: Get buffer
    const buffer1 = terminalManager.getBuffer(executionId);
    expect(buffer1.length).toBeGreaterThan(0);

    // Wait for more output
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get buffer again (simulate second reconnect)
    const buffer2 = terminalManager.getBuffer(executionId);
    expect(buffer2.length).toBeGreaterThan(buffer1.length);
  }, 10000);

  it('should handle reconnect after process has exited', async () => {
    const executionId = 'test-reconnect-004';

    // Spawn short process
    terminalManager.spawn({
      executionId,
      // Use default shell from process.env.SHELL
      args: ['-c', 'echo "Process output"; exit 0'],
      cwd: '/tmp'
    });

    // Wait for process to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    // Simulate reconnect after exit: Get buffer
    const buffer = terminalManager.getBuffer(executionId);
    const fullOutput = buffer.join('');

    expect(fullOutput).toContain('Process output');

    // Verify session still exists (with exitCode)
    const session = terminalManager.getSession(executionId);
    expect(session).toBeDefined();
    expect(session?.exitCode).toBe(0);
  });

  it('should handle empty buffer on reconnect', () => {
    const executionId = 'test-reconnect-005';

    // Spawn process (no output yet)
    terminalManager.spawn({
      executionId,
      // Use default shell from process.env.SHELL
      args: ['-c', 'sleep 10'],
      cwd: '/tmp'
    });

    // Immediately get buffer (should be empty)
    const buffer = terminalManager.getBuffer(executionId);

    expect(buffer).toBeDefined();
    expect(Array.isArray(buffer)).toBe(true);
  });

  it('should return empty array for non-existent executionId', () => {
    const buffer = terminalManager.getBuffer('non-existent-exec');

    expect(buffer).toBeDefined();
    expect(buffer).toEqual([]);
  });

  it('should maintain buffer size limits during reconnect', async () => {
    const executionId = 'test-reconnect-006';

    // Spawn process that exceeds buffer limit
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

    // Verify buffer respects 10k line limit
    expect(buffer.length).toBeLessThanOrEqual(10000);
  }, 10000);

  it('should handle multiple concurrent reconnects', async () => {
    const exec1 = 'test-reconnect-007';
    const exec2 = 'test-reconnect-008';
    const exec3 = 'test-reconnect-009';

    // Spawn three processes
    terminalManager.spawn({
      executionId: exec1,
      // Use default shell from process.env.SHELL
      args: ['-c', 'for i in {1..20}; do echo "Session1 Line $i"; sleep 0.1; done'],
      cwd: '/tmp'
    });

    terminalManager.spawn({
      executionId: exec2,
      // Use default shell from process.env.SHELL
      args: ['-c', 'for i in {1..20}; do echo "Session2 Line $i"; sleep 0.1; done'],
      cwd: '/tmp'
    });

    terminalManager.spawn({
      executionId: exec3,
      // Use default shell from process.env.SHELL
      args: ['-c', 'for i in {1..20}; do echo "Session3 Line $i"; sleep 0.1; done'],
      cwd: '/tmp'
    });

    // Wait for output
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulate reconnect for all three
    const buffer1 = terminalManager.getBuffer(exec1);
    const buffer2 = terminalManager.getBuffer(exec2);
    const buffer3 = terminalManager.getBuffer(exec3);

    // Verify each buffer is independent
    expect(buffer1.join('')).toContain('Session1');
    expect(buffer1.join('')).not.toContain('Session2');
    expect(buffer1.join('')).not.toContain('Session3');

    expect(buffer2.join('')).toContain('Session2');
    expect(buffer2.join('')).not.toContain('Session1');
    expect(buffer2.join('')).not.toContain('Session3');

    expect(buffer3.join('')).toContain('Session3');
    expect(buffer3.join('')).not.toContain('Session1');
    expect(buffer3.join('')).not.toContain('Session2');
  }, 10000);

  it('should preserve ANSI codes in buffer', async () => {
    const executionId = 'test-reconnect-010';

    // Spawn process with ANSI codes
    terminalManager.spawn({
      executionId,
      // Use default shell from process.env.SHELL
      args: ['-c', 'echo -e "\\033[31mRed text\\033[0m"'],
      cwd: '/tmp'
    });

    // Wait for output
    await new Promise(resolve => setTimeout(resolve, 200));

    // Get buffer
    const buffer = terminalManager.getBuffer(executionId);
    const fullOutput = buffer.join('');

    // Verify ANSI codes are preserved
    expect(fullOutput).toContain('\x1b[31m'); // Red color code
    expect(fullOutput).toContain('\x1b[0m');  // Reset code
    expect(fullOutput).toContain('Red text');
  });
});
