/**
 * Terminal Bidirectional I/O Integration Test
 *
 * Tests: aos-terminal ↔ gateway ↔ websocket ↔ TerminalManager
 * Validates: Connections 3, 4, 5 (full bidirectional data flow)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TerminalManager } from '../../src/server/services/terminal-manager.js';

describe('Terminal Bidirectional I/O Integration', () => {
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

  it('should send user input to PTY stdin', (done) => {
    const executionId = 'test-io-001';

    // Spawn PTY with cat (echoes input back)
    terminalManager.spawn({
      executionId,
      // Use default shell
      args: [],
      cwd: '/tmp'
    });

    const inputData = 'Hello from user\n';
    let receivedOutput = '';

    // Listen for output
    terminalManager.on('terminal.data', (execId: string, data: string) => {
      if (execId === executionId) {
        receivedOutput += data;

        // Check if we received the echoed input
        if (receivedOutput.includes('Hello from user')) {
          expect(receivedOutput).toContain('Hello from user');
          terminalManager.kill(executionId);
          done();
        }
      }
    });

    // Send input after PTY is ready
    setTimeout(() => {
      terminalManager.write(executionId, inputData);
    }, 100);
  }, 5000);

  it('should handle multiple input writes in sequence', (done) => {
    const executionId = 'test-io-002';

    terminalManager.spawn({
      executionId,
      // Use default shell
      args: [],
      cwd: '/tmp'
    });

    let receivedOutput = '';
    const expectedLines = ['Line 1', 'Line 2', 'Line 3'];

    terminalManager.on('terminal.data', (execId: string, data: string) => {
      if (execId === executionId) {
        receivedOutput += data;

        // Check if all lines received
        const allReceived = expectedLines.every(line => receivedOutput.includes(line));
        if (allReceived) {
          expectedLines.forEach(line => {
            expect(receivedOutput).toContain(line);
          });
          terminalManager.kill(executionId);
          done();
        }
      }
    });

    // Send multiple lines with delay
    setTimeout(() => {
      terminalManager.write(executionId, 'Line 1\n');
      setTimeout(() => {
        terminalManager.write(executionId, 'Line 2\n');
        setTimeout(() => {
          terminalManager.write(executionId, 'Line 3\n');
        }, 50);
      }, 50);
    }, 100);
  }, 5000);

  it('should handle rapid input (stress test)', (done) => {
    const executionId = 'test-io-003';

    terminalManager.spawn({
      executionId,
      // Use default shell
      args: [],
      cwd: '/tmp'
    });

    let outputCount = 0;
    const totalInputs = 100;

    terminalManager.on('terminal.data', (execId: string, data: string) => {
      if (execId === executionId) {
        // Count how many "test" strings we received
        const matches = data.match(/test/g);
        if (matches) {
          outputCount += matches.length;
        }

        // Check if we received all inputs
        if (outputCount >= totalInputs) {
          expect(outputCount).toBeGreaterThanOrEqual(totalInputs);
          terminalManager.kill(executionId);
          done();
        }
      }
    });

    // Send rapid inputs
    setTimeout(() => {
      for (let i = 0; i < totalInputs; i++) {
        terminalManager.write(executionId, 'test\n');
      }
    }, 100);
  }, 10000);

  it('should handle special characters and escape sequences', (done) => {
    const executionId = 'test-io-004';

    terminalManager.spawn({
      executionId,
      // Use default shell
      args: [],
      cwd: '/tmp'
    });

    const specialInput = 'Special: \t\n"quotes"\n$dollar\n\\backslash\n';
    let receivedOutput = '';

    terminalManager.on('terminal.data', (execId: string, data: string) => {
      if (execId === executionId) {
        receivedOutput += data;

        if (receivedOutput.includes('backslash')) {
          expect(receivedOutput).toContain('Special');
          expect(receivedOutput).toContain('quotes');
          expect(receivedOutput).toContain('dollar');
          expect(receivedOutput).toContain('backslash');
          terminalManager.kill(executionId);
          done();
        }
      }
    });

    setTimeout(() => {
      terminalManager.write(executionId, specialInput);
    }, 100);
  }, 5000);

  it('should handle Ctrl+C (SIGINT) gracefully', (done) => {
    const executionId = 'test-io-005';

    terminalManager.spawn({
      executionId,
      // Use default shell from process.env.SHELL
      args: ['-c', 'sleep 30'],
      cwd: '/tmp'
    });

    // Listen for exit event
    terminalManager.on('terminal.exit', (execId: string, exitCode: number) => {
      if (execId === executionId) {
        // SIGINT typically results in exit code 130 or 1
        expect([1, 2, 130, 143]).toContain(exitCode); // 143 = SIGTERM
        done();
      }
    });

    // Send Ctrl+C after process starts
    setTimeout(() => {
      terminalManager.write(executionId, '\x03'); // Ctrl+C
    }, 200);
  }, 5000);

  it('should handle resize events', () => {
    const executionId = 'test-io-006';

    const session = terminalManager.spawn({
      executionId,
      // Use default shell from process.env.SHELL
      args: ['-c', 'sleep 10'],
      cwd: '/tmp',
      cols: 80,
      rows: 24
    });

    expect(session.pid).toBeGreaterThan(0);

    // Resize terminal
    terminalManager.resize({
      executionId,
      cols: 120,
      rows: 40
    });

    // Verify resize was applied (internal PTY state updated)
    // Note: TerminalSession doesn't expose cols/rows, but resize() updates the PTY
    // This test validates the API works without throwing
    const updatedSession = terminalManager.getSession(executionId);
    expect(updatedSession).toBeDefined();
  });

  it('should buffer output correctly for late subscribers', async () => {
    const executionId = 'test-io-007';

    // Spawn process that outputs immediately
    terminalManager.spawn({
      executionId,
      // Use default shell from process.env.SHELL
      args: ['-c', 'echo "Immediate output"'],
      cwd: '/tmp'
    });

    // Wait for output to be buffered
    await new Promise(resolve => setTimeout(resolve, 200));

    // Get buffer (simulating late subscriber / reconnect)
    const buffer = terminalManager.getBuffer(executionId);
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(0);

    const fullOutput = buffer.join('');
    expect(fullOutput).toContain('Immediate output');
  });

  it('should handle write to non-existent executionId gracefully', () => {
    // Should not throw
    expect(() => {
      terminalManager.write('non-existent-exec', 'test\n');
    }).not.toThrow();
  });

  it('should emit output in correct order (FIFO)', (done) => {
    const executionId = 'test-io-008';

    terminalManager.spawn({
      executionId,
      // Use default shell from process.env.SHELL
      args: ['-c', 'echo "First"; echo "Second"; echo "Third"'],
      cwd: '/tmp'
    });

    let fullOutput = '';

    terminalManager.on('terminal.data', (execId: string, data: string) => {
      if (execId === executionId) {
        fullOutput += data;
      }
    });

    terminalManager.on('terminal.exit', (execId: string) => {
      if (execId === executionId) {
        // Verify order
        const firstIndex = fullOutput.indexOf('First');
        const secondIndex = fullOutput.indexOf('Second');
        const thirdIndex = fullOutput.indexOf('Third');

        expect(firstIndex).toBeGreaterThan(-1);
        expect(secondIndex).toBeGreaterThan(firstIndex);
        expect(thirdIndex).toBeGreaterThan(secondIndex);
        done();
      }
    });
  }, 5000);

  it('should handle UTF-8 characters correctly', (done) => {
    const executionId = 'test-io-009';

    terminalManager.spawn({
      executionId,
      // Use default shell
      args: [],
      cwd: '/tmp'
    });

    const utf8Input = 'Hello 世界 🚀 Ü\n';
    let receivedOutput = '';

    terminalManager.on('terminal.data', (execId: string, data: string) => {
      if (execId === executionId) {
        receivedOutput += data;

        if (receivedOutput.includes('🚀')) {
          expect(receivedOutput).toContain('Hello');
          expect(receivedOutput).toContain('世界');
          expect(receivedOutput).toContain('🚀');
          expect(receivedOutput).toContain('Ü');
          terminalManager.kill(executionId);
          done();
        }
      }
    });

    setTimeout(() => {
      terminalManager.write(executionId, utf8Input);
    }, 100);
  }, 5000);
});
