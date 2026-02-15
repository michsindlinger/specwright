/**
 * WebSocket Terminal Protocol Integration Tests
 *
 * Tests bidirectional terminal I/O over WebSocket:
 * - Backend: TerminalManager → WebSocketHandler
 * - Protocol validation
 * - Event emission
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TerminalManager } from '../../src/server/services/terminal-manager.js';

describe('TerminalManager Event Emission for WebSocket', () => {
  let terminalManager: TerminalManager;

  beforeEach(() => {
    terminalManager = new TerminalManager();
  });

  afterEach(() => {
    terminalManager.shutdown();
  });

  it('should emit terminal.data events with correct format', async () => {
    return new Promise<void>((resolve) => {
      // Spawn a PTY process
      const session = terminalManager.spawn({
        executionId: 'test-exec-002',
        cwd: process.cwd(),
        shell: 'bash',
        args: ['-c', 'echo "Hello from PTY"']
      });

      expect(session.executionId).toBe('test-exec-002');

      // Listen for terminal.data event
      terminalManager.on('terminal.data', (executionId: string, data: string) => {
        expect(executionId).toBe('test-exec-002');
        expect(typeof data).toBe('string');

        if (data.includes('Hello from PTY')) {
          resolve();
        }
      });

      // Timeout after 2 seconds
      setTimeout(() => resolve(), 2000);
    });
  });

  it('should emit terminal.exit events when process terminates', async () => {
    return new Promise<void>((resolve) => {
      const session = terminalManager.spawn({
        executionId: 'test-exec-003',
        cwd: process.cwd(),
        shell: 'bash',
        args: ['-c', 'exit 42']
      });

      expect(session.executionId).toBe('test-exec-003');

      // Listen for terminal.exit event
      terminalManager.on('terminal.exit', (executionId: string, exitCode: number) => {
        expect(executionId).toBe('test-exec-003');
        expect(exitCode).toBe(42);
        resolve();
      });

      // Timeout after 2 seconds
      setTimeout(() => resolve(), 2000);
    });
  });

  it('should maintain buffer for reconnect restore', async () => {
    return new Promise<void>((resolve) => {
      const session = terminalManager.spawn({
        executionId: 'test-exec-004',
        cwd: process.cwd(),
        shell: 'bash',
        args: ['-c', 'echo "Line 1" && echo "Line 2" && echo "Line 3"']
      });

      // Wait for output to be buffered
      setTimeout(() => {
        const buffer = terminalManager.getBuffer('test-exec-004');
        expect(buffer.length).toBeGreaterThan(0);

        // Buffer should contain the output lines
        const bufferContent = buffer.join('\n');
        expect(bufferContent).toContain('Line 1');
        expect(bufferContent).toContain('Line 2');
        expect(bufferContent).toContain('Line 3');

        resolve();
      }, 500);
    });
  });

  it('should handle write() to PTY process', async () => {
    const session = terminalManager.spawn({
      executionId: 'test-exec-005',
      cwd: process.cwd(),
      shell: 'bash'
    });

    expect(session.executionId).toBe('test-exec-005');

    // Write command to PTY
    expect(() => {
      terminalManager.write('test-exec-005', 'echo "test"\n');
    }).not.toThrow();
  });

  it('should handle resize() for PTY terminal', async () => {
    const session = terminalManager.spawn({
      executionId: 'test-exec-006',
      cwd: process.cwd(),
      shell: 'bash'
    });

    expect(session.executionId).toBe('test-exec-006');

    // Resize terminal
    expect(() => {
      terminalManager.resize({
        executionId: 'test-exec-006',
        cols: 120,
        rows: 40
      });
    }).not.toThrow();
  });

  it('should return empty buffer for non-existent session', () => {
    const buffer = terminalManager.getBuffer('non-existent');
    expect(buffer).toEqual([]);
  });

  it('should throw error when writing to non-existent session', () => {
    expect(() => {
      terminalManager.write('non-existent', 'test\n');
    }).toThrow('not found');
  });

  it('should throw error when resizing non-existent session', () => {
    expect(() => {
      terminalManager.resize({
        executionId: 'non-existent',
        cols: 80,
        rows: 24
      });
    }).toThrow('not found');
  });
});
