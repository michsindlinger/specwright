import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionStore, ExecutionStoreHandler } from '../../frontend/src/stores/execution-store.js';

describe('ExecutionStore', () => {
  let store: ExecutionStore;
  let mockHandler: ExecutionStoreHandler;

  beforeEach(() => {
    store = new ExecutionStore();
    mockHandler = vi.fn();
  });

  describe('addExecution', () => {
    it('should create a new execution with starting status', () => {
      const execution = store.addExecution('exec-1', 'cmd-1', 'Test Command');

      expect(execution.executionId).toBe('exec-1');
      expect(execution.commandId).toBe('cmd-1');
      expect(execution.commandName).toBe('Test Command');
      expect(execution.status).toBe('starting');
      expect(execution.messages).toEqual([]);
      expect(execution.startedAt).toBeDefined();
    });

    it('should set first execution as active automatically', () => {
      store.addExecution('exec-1', 'cmd-1', 'Command 1');

      expect(store.getActiveExecutionId()).toBe('exec-1');
    });

    it('should emit execution-added event', () => {
      store.subscribe(mockHandler);
      store.addExecution('exec-1', 'cmd-1', 'Test');

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'execution-added',
          executionId: 'exec-1'
        })
      );
    });
  });

  describe('removeExecution', () => {
    it('should remove execution from store', () => {
      store.addExecution('exec-1', 'cmd-1', 'Command 1');
      store.removeExecution('exec-1');

      expect(store.getExecution('exec-1')).toBeUndefined();
      expect(store.getExecutionCount()).toBe(0);
    });

    it('should switch active to remaining execution when active is removed', () => {
      store.addExecution('exec-1', 'cmd-1', 'Command 1');
      store.addExecution('exec-2', 'cmd-2', 'Command 2');
      store.setActiveExecution('exec-1');
      store.removeExecution('exec-1');

      expect(store.getActiveExecutionId()).toBe('exec-2');
    });

    it('should set active to null when last execution is removed', () => {
      store.addExecution('exec-1', 'cmd-1', 'Command 1');
      store.removeExecution('exec-1');

      expect(store.getActiveExecutionId()).toBeNull();
    });

    it('should emit execution-removed event', () => {
      store.addExecution('exec-1', 'cmd-1', 'Test');
      store.subscribe(mockHandler);
      store.removeExecution('exec-1');

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'execution-removed',
          executionId: 'exec-1'
        })
      );
    });
  });

  describe('setActiveExecution', () => {
    it('should change active execution', () => {
      store.addExecution('exec-1', 'cmd-1', 'Command 1');
      store.addExecution('exec-2', 'cmd-2', 'Command 2');

      store.setActiveExecution('exec-2');

      expect(store.getActiveExecutionId()).toBe('exec-2');
    });

    it('should not change if execution does not exist', () => {
      store.addExecution('exec-1', 'cmd-1', 'Command 1');
      store.setActiveExecution('non-existent');

      expect(store.getActiveExecutionId()).toBe('exec-1');
    });

    it('should emit active-changed event', () => {
      store.addExecution('exec-1', 'cmd-1', 'Command 1');
      store.addExecution('exec-2', 'cmd-2', 'Command 2');
      store.subscribe(mockHandler);

      store.setActiveExecution('exec-2');

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'active-changed',
          executionId: 'exec-2'
        })
      );
    });
  });

  describe('getExecution', () => {
    it('should return execution by id', () => {
      store.addExecution('exec-1', 'cmd-1', 'Test');
      const execution = store.getExecution('exec-1');

      expect(execution?.executionId).toBe('exec-1');
    });

    it('should return undefined for non-existent id', () => {
      expect(store.getExecution('non-existent')).toBeUndefined();
    });
  });

  describe('getActiveExecution', () => {
    it('should return the active execution', () => {
      store.addExecution('exec-1', 'cmd-1', 'Test');
      const active = store.getActiveExecution();

      expect(active?.executionId).toBe('exec-1');
    });

    it('should return undefined when no active execution', () => {
      expect(store.getActiveExecution()).toBeUndefined();
    });
  });

  describe('getAllExecutions', () => {
    it('should return all executions as array', () => {
      store.addExecution('exec-1', 'cmd-1', 'Command 1');
      store.addExecution('exec-2', 'cmd-2', 'Command 2');

      const executions = store.getAllExecutions();

      expect(executions.length).toBe(2);
      expect(executions.map(e => e.executionId)).toContain('exec-1');
      expect(executions.map(e => e.executionId)).toContain('exec-2');
    });
  });

  describe('updateStatus', () => {
    it('should update execution status', () => {
      store.addExecution('exec-1', 'cmd-1', 'Test');
      store.updateStatus('exec-1', 'running');

      expect(store.getExecution('exec-1')?.status).toBe('running');
    });

    it('should set completedAt on terminal status', () => {
      store.addExecution('exec-1', 'cmd-1', 'Test');
      store.updateStatus('exec-1', 'completed');

      expect(store.getExecution('exec-1')?.completedAt).toBeDefined();
    });

    it('should emit execution-updated event', () => {
      store.addExecution('exec-1', 'cmd-1', 'Test');
      store.subscribe(mockHandler);
      store.updateStatus('exec-1', 'running');

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'execution-updated',
          executionId: 'exec-1'
        })
      );
    });
  });

  describe('addMessage', () => {
    it('should add message to execution', () => {
      store.addExecution('exec-1', 'cmd-1', 'Test');
      const message = {
        id: 'msg-1',
        role: 'assistant' as const,
        content: 'Hello',
        timestamp: new Date().toISOString()
      };

      store.addMessage('exec-1', message);

      expect(store.getExecution('exec-1')?.messages.length).toBe(1);
      expect(store.getExecution('exec-1')?.messages[0].content).toBe('Hello');
    });
  });

  describe('setError', () => {
    it('should set error and failed status', () => {
      store.addExecution('exec-1', 'cmd-1', 'Test');
      store.setError('exec-1', 'Something went wrong');

      const execution = store.getExecution('exec-1');
      expect(execution?.status).toBe('failed');
      expect(execution?.error).toBe('Something went wrong');
      expect(execution?.completedAt).toBeDefined();
    });
  });

  describe('clear', () => {
    it('should remove all executions', () => {
      store.addExecution('exec-1', 'cmd-1', 'Command 1');
      store.addExecution('exec-2', 'cmd-2', 'Command 2');

      store.clear();

      expect(store.getExecutionCount()).toBe(0);
      expect(store.getActiveExecutionId()).toBeNull();
    });

    it('should emit execution-removed for each execution', () => {
      store.addExecution('exec-1', 'cmd-1', 'Command 1');
      store.addExecution('exec-2', 'cmd-2', 'Command 2');
      store.subscribe(mockHandler);

      store.clear();

      expect(mockHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('parallel executions (Szenario 2)', () => {
    it('should store multiple executions independently', () => {
      store.addExecution('exec-A', 'cmd-1', 'Execution A');
      store.addExecution('exec-B', 'cmd-2', 'Execution B');

      // Add message to A
      store.addMessage('exec-A', {
        id: 'msg-1',
        role: 'assistant',
        content: 'Message for A',
        timestamp: new Date().toISOString()
      });

      // Verify B is unaffected
      const execA = store.getExecution('exec-A');
      const execB = store.getExecution('exec-B');

      expect(execA?.messages.length).toBe(1);
      expect(execB?.messages.length).toBe(0);
    });
  });
});
