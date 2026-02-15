/**
 * Multiple Workflows Integration Test
 *
 * Tests: Multiple parallel terminal sessions
 * Validates: Session isolation, no cross-contamination
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TerminalManager } from '../../src/server/services/terminal-manager.js';

describe('Multiple Workflows Integration', () => {
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

  it('should isolate output between multiple workflows', (done) => {
    const exec1 = 'workflow-A';
    const exec2 = 'workflow-B';
    const exec3 = 'workflow-C';

    const outputs = {
      [exec1]: '',
      [exec2]: '',
      [exec3]: ''
    };

    let completedCount = 0;

    // Listen for output from all workflows
    terminalManager.on('terminal.data', (execId: string, data: string) => {
      if (outputs[execId] !== undefined) {
        outputs[execId] += data;
      }
    });

    terminalManager.on('terminal.exit', (execId: string) => {
      if (outputs[execId] !== undefined) {
        completedCount++;

        if (completedCount === 3) {
          // Verify each workflow only received its own output
          expect(outputs[exec1]).toContain('Workflow A');
          expect(outputs[exec1]).not.toContain('Workflow B');
          expect(outputs[exec1]).not.toContain('Workflow C');

          expect(outputs[exec2]).toContain('Workflow B');
          expect(outputs[exec2]).not.toContain('Workflow A');
          expect(outputs[exec2]).not.toContain('Workflow C');

          expect(outputs[exec3]).toContain('Workflow C');
          expect(outputs[exec3]).not.toContain('Workflow A');
          expect(outputs[exec3]).not.toContain('Workflow B');

          done();
        }
      }
    });

    // Spawn three workflows
    terminalManager.spawn({
      executionId: exec1,
      // Use default shell from process.env.SHELL
      args: ['-c', 'echo "Workflow A output"'],
      cwd: '/tmp'
    });

    terminalManager.spawn({
      executionId: exec2,
      // Use default shell from process.env.SHELL
      args: ['-c', 'echo "Workflow B output"'],
      cwd: '/tmp'
    });

    terminalManager.spawn({
      executionId: exec3,
      // Use default shell from process.env.SHELL
      args: ['-c', 'echo "Workflow C output"'],
      cwd: '/tmp'
    });
  }, 5000);

  it('should handle input to specific workflows independently', (done) => {
    const exec1 = 'workflow-input-1';
    const exec2 = 'workflow-input-2';

    const outputs = {
      [exec1]: '',
      [exec2]: ''
    };

    let completedCount = 0;

    terminalManager.on('terminal.data', (execId: string, data: string) => {
      if (outputs[execId] !== undefined) {
        outputs[execId] += data;
      }
    });

    terminalManager.on('terminal.exit', (execId: string) => {
      if (outputs[execId] !== undefined) {
        completedCount++;

        if (completedCount === 2) {
          // Verify each workflow only echoed its own input
          expect(outputs[exec1]).toContain('Input to Workflow 1');
          expect(outputs[exec1]).not.toContain('Input to Workflow 2');

          expect(outputs[exec2]).toContain('Input to Workflow 2');
          expect(outputs[exec2]).not.toContain('Input to Workflow 1');

          done();
        }
      }
    });

    // Spawn two cat processes
    terminalManager.spawn({
      executionId: exec1,
      // Use default shell
      args: [],
      cwd: '/tmp'
    });

    terminalManager.spawn({
      executionId: exec2,
      // Use default shell
      args: [],
      cwd: '/tmp'
    });

    // Send input to each workflow
    setTimeout(() => {
      terminalManager.write(exec1, 'Input to Workflow 1\n');
      terminalManager.write(exec2, 'Input to Workflow 2\n');

      // Kill processes to trigger exit
      setTimeout(() => {
        terminalManager.kill(exec1);
        terminalManager.kill(exec2);
      }, 200);
    }, 100);
  }, 5000);

  it('should track active sessions correctly', () => {
    expect(terminalManager.getActiveSessionIds()).toEqual([]);

    const exec1 = 'session-tracking-1';
    const exec2 = 'session-tracking-2';
    const exec3 = 'session-tracking-3';

    // Spawn sessions
    terminalManager.spawn({
      executionId: exec1,
      // Use default shell from process.env.SHELL
      args: ['-c', 'sleep 10'],
      cwd: '/tmp'
    });

    terminalManager.spawn({
      executionId: exec2,
      // Use default shell from process.env.SHELL
      args: ['-c', 'sleep 10'],
      cwd: '/tmp'
    });

    terminalManager.spawn({
      executionId: exec3,
      // Use default shell from process.env.SHELL
      args: ['-c', 'sleep 10'],
      cwd: '/tmp'
    });

    // Verify all three sessions are active
    const activeSessions = terminalManager.getActiveSessionIds();
    expect(activeSessions).toHaveLength(3);
    expect(activeSessions).toContain(exec1);
    expect(activeSessions).toContain(exec2);
    expect(activeSessions).toContain(exec3);

    // Kill one session
    terminalManager.kill(exec2);

    // Verify only two sessions remain
    const remainingSessions = terminalManager.getActiveSessionIds();
    expect(remainingSessions).toHaveLength(2);
    expect(remainingSessions).toContain(exec1);
    expect(remainingSessions).toContain(exec3);
    expect(remainingSessions).not.toContain(exec2);
  });

  it('should handle staggered workflow starts', async () => {
    const exec1 = 'staggered-1';
    const exec2 = 'staggered-2';
    const exec3 = 'staggered-3';

    // Start first workflow
    terminalManager.spawn({
      executionId: exec1,
      // Use default shell from process.env.SHELL
      args: ['-c', 'echo "First workflow"; sleep 1'],
      cwd: '/tmp'
    });

    await new Promise(resolve => setTimeout(resolve, 200));

    // Start second workflow
    terminalManager.spawn({
      executionId: exec2,
      // Use default shell from process.env.SHELL
      args: ['-c', 'echo "Second workflow"; sleep 1'],
      cwd: '/tmp'
    });

    await new Promise(resolve => setTimeout(resolve, 200));

    // Start third workflow
    terminalManager.spawn({
      executionId: exec3,
      // Use default shell from process.env.SHELL
      args: ['-c', 'echo "Third workflow"; sleep 1'],
      cwd: '/tmp'
    });

    // Verify all three are active
    const activeSessions = terminalManager.getActiveSessionIds();
    expect(activeSessions).toHaveLength(3);

    // Verify each has unique PIDs
    const session1 = terminalManager.getSession(exec1);
    const session2 = terminalManager.getSession(exec2);
    const session3 = terminalManager.getSession(exec3);

    expect(session1?.pid).not.toBe(session2?.pid);
    expect(session2?.pid).not.toBe(session3?.pid);
    expect(session1?.pid).not.toBe(session3?.pid);
  });

  it('should handle workflow completion in any order', (done) => {
    const exec1 = 'completion-order-1';
    const exec2 = 'completion-order-2';
    const exec3 = 'completion-order-3';

    const exitOrder: string[] = [];

    terminalManager.on('terminal.exit', (execId: string) => {
      exitOrder.push(execId);

      if (exitOrder.length === 3) {
        // Verify exec2 finished first (shortest sleep)
        expect(exitOrder[0]).toBe(exec2);

        // Verify all three completed
        expect(exitOrder).toContain(exec1);
        expect(exitOrder).toContain(exec2);
        expect(exitOrder).toContain(exec3);

        done();
      }
    });

    // Spawn with different durations
    terminalManager.spawn({
      executionId: exec1,
      // Use default shell from process.env.SHELL
      args: ['-c', 'sleep 0.3'],
      cwd: '/tmp'
    });

    terminalManager.spawn({
      executionId: exec2,
      // Use default shell from process.env.SHELL
      args: ['-c', 'sleep 0.1'], // Shortest - will finish first
      cwd: '/tmp'
    });

    terminalManager.spawn({
      executionId: exec3,
      // Use default shell from process.env.SHELL
      args: ['-c', 'sleep 0.2'],
      cwd: '/tmp'
    });
  }, 5000);

  it('should handle rapid workflow creation and termination', async () => {
    const workflowIds: string[] = [];

    // Create 10 workflows rapidly
    for (let i = 0; i < 10; i++) {
      const execId = `rapid-workflow-${i}`;
      workflowIds.push(execId);

      terminalManager.spawn({
        executionId: execId,
        // Use default shell from process.env.SHELL
        args: ['-c', `echo "Workflow ${i}"; sleep 0.5`],
        cwd: '/tmp'
      });
    }

    // Verify all are active
    await new Promise(resolve => setTimeout(resolve, 100));
    const activeSessions = terminalManager.getActiveSessionIds();
    expect(activeSessions.length).toBe(10);

    // Kill half of them
    for (let i = 0; i < 5; i++) {
      terminalManager.kill(workflowIds[i]);
    }

    // Verify only 5 remain
    const remainingSessions = terminalManager.getActiveSessionIds();
    expect(remainingSessions.length).toBe(5);
  });

  it('should maintain separate buffers for each workflow', async () => {
    const exec1 = 'buffer-isolation-1';
    const exec2 = 'buffer-isolation-2';

    // Spawn workflows with distinct output
    terminalManager.spawn({
      executionId: exec1,
      // Use default shell from process.env.SHELL
      args: ['-c', 'for i in {1..5}; do echo "A$i"; sleep 0.1; done'],
      cwd: '/tmp'
    });

    terminalManager.spawn({
      executionId: exec2,
      // Use default shell from process.env.SHELL
      args: ['-c', 'for i in {1..5}; do echo "B$i"; sleep 0.1; done'],
      cwd: '/tmp'
    });

    // Wait for output
    await new Promise(resolve => setTimeout(resolve, 600));

    // Get buffers
    const buffer1 = terminalManager.getBuffer(exec1);
    const buffer2 = terminalManager.getBuffer(exec2);

    const output1 = buffer1.join('');
    const output2 = buffer2.join('');

    // Verify isolation
    expect(output1).toContain('A1');
    expect(output1).toContain('A5');
    expect(output1).not.toContain('B1');
    expect(output1).not.toContain('B5');

    expect(output2).toContain('B1');
    expect(output2).toContain('B5');
    expect(output2).not.toContain('A1');
    expect(output2).not.toContain('A5');
  }, 10000);

  it('should handle maximum concurrent workflows (stress test)', async () => {
    const maxWorkflows = 50;
    const workflowIds: string[] = [];

    // Spawn many workflows
    for (let i = 0; i < maxWorkflows; i++) {
      const execId = `stress-workflow-${i}`;
      workflowIds.push(execId);

      terminalManager.spawn({
        executionId: execId,
        // Use default shell from process.env.SHELL
        args: ['-c', `echo "Workflow ${i}"; sleep 1`],
        cwd: '/tmp'
      });
    }

    // Wait briefly
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify all spawned
    const activeSessions = terminalManager.getActiveSessionIds();
    expect(activeSessions.length).toBe(maxWorkflows);

    // Verify each has unique PID
    const pids = new Set<number>();
    workflowIds.forEach(execId => {
      const session = terminalManager.getSession(execId);
      if (session) {
        pids.add(session.pid);
      }
    });

    expect(pids.size).toBe(maxWorkflows);
  }, 15000);
});
