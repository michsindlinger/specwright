/**
 * Unit Tests for Workflow View Terminal Integration (PTY-004)
 *
 * Tests view switching logic between chat and terminal modes
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { executionStore } from '../../ui/src/stores/execution-store.js';

describe('Workflow View - Terminal Integration (PTY-004)', () => {
  beforeEach(() => {
    // Clear execution store before each test
    executionStore.clear();
  });

  describe('Execution Store Integration', () => {
    it('should have terminalSessionId in ExecutionState interface', () => {
      executionStore.addExecution('exec-1', 'cmd-1', 'Test');
      executionStore.enableTerminal('exec-1', 'session-123');

      const execution = executionStore.getExecution('exec-1');
      expect(execution?.terminalSessionId).toBe('session-123');
      expect(execution?.terminalActive).toBe(true);
      expect(execution?.exitCode).toBe(null);
    });

    it('should update exitCode in ExecutionState', () => {
      executionStore.addExecution('exec-1', 'cmd-1', 'Test');
      executionStore.enableTerminal('exec-1', 'session-123');
      executionStore.setTerminalExitCode('exec-1', 0);

      const execution = executionStore.getExecution('exec-1');
      expect(execution?.exitCode).toBe(0);
    });

    it('should disable terminal mode when calling disableTerminal', () => {
      executionStore.addExecution('exec-1', 'cmd-1', 'Test');
      executionStore.enableTerminal('exec-1', 'session-123');

      let execution = executionStore.getExecution('exec-1');
      expect(execution?.terminalActive).toBe(true);

      executionStore.disableTerminal('exec-1');
      execution = executionStore.getExecution('exec-1');

      expect(execution?.terminalActive).toBe(false);
      expect(execution?.terminalSessionId).toBeUndefined();
      expect(execution?.exitCode).toBeUndefined();
    });

    it('should support multiple terminal sessions (multi-workflow)', () => {
      // Add two executions with different terminal sessions
      executionStore.addExecution('exec-1', 'cmd-1', 'Workflow A');
      executionStore.enableTerminal('exec-1', 'terminal-a');

      executionStore.addExecution('exec-2', 'cmd-2', 'Workflow B');
      executionStore.enableTerminal('exec-2', 'terminal-b');

      const exec1 = executionStore.getExecution('exec-1');
      const exec2 = executionStore.getExecution('exec-2');

      expect(exec1?.terminalSessionId).toBe('terminal-a');
      expect(exec2?.terminalSessionId).toBe('terminal-b');
      expect(exec1?.terminalActive).toBe(true);
      expect(exec2?.terminalActive).toBe(true);
    });

    it('should set exitCode independently for each workflow', () => {
      executionStore.addExecution('exec-1', 'cmd-1', 'Workflow A');
      executionStore.enableTerminal('exec-1', 'terminal-a');
      executionStore.setTerminalExitCode('exec-1', 0);

      executionStore.addExecution('exec-2', 'cmd-2', 'Workflow B');
      executionStore.enableTerminal('exec-2', 'terminal-b');
      executionStore.setTerminalExitCode('exec-2', 1);

      const exec1 = executionStore.getExecution('exec-1');
      const exec2 = executionStore.getExecution('exec-2');

      expect(exec1?.exitCode).toBe(0);
      expect(exec2?.exitCode).toBe(1);
    });
  });

  describe('State Management Methods', () => {
    it('should initialize terminal state with null exitCode', () => {
      executionStore.addExecution('exec-1', 'cmd-1', 'Test');
      executionStore.enableTerminal('exec-1', 'session-123');

      const execution = executionStore.getExecution('exec-1');
      expect(execution?.exitCode).toBe(null);
    });

    it('should preserve other execution state when enabling terminal', () => {
      executionStore.addExecution('exec-1', 'cmd-1', 'Test');
      executionStore.updateStatus('exec-1', 'running');
      executionStore.addMessage('exec-1', {
        id: 'msg-1',
        role: 'assistant',
        content: 'Hello',
        timestamp: new Date().toISOString()
      });

      executionStore.enableTerminal('exec-1', 'session-123');

      const execution = executionStore.getExecution('exec-1');
      expect(execution?.status).toBe('running');
      expect(execution?.messages.length).toBe(1);
      expect(execution?.terminalActive).toBe(true);
    });

    it('should emit execution-updated event when enabling terminal', () => {
      let updateCount = 0;
      const handler = () => { updateCount++; };

      executionStore.subscribe(handler);
      executionStore.addExecution('exec-1', 'cmd-1', 'Test');
      updateCount = 0; // Reset after addExecution

      executionStore.enableTerminal('exec-1', 'session-123');

      expect(updateCount).toBe(1);
      executionStore.unsubscribe(handler);
    });
  });
});
