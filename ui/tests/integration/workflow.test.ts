/**
 * Integration Tests for Workflow WebSocket Communication
 * WKFL-999: Integration & E2E Validation
 *
 * Tests the communication flow between frontend and backend for interactive workflows:
 * - Workflow start and completion
 * - Question/Answer flow
 * - Error handling and retry
 * - Cancel functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { WorkflowExecutor } from '../../src/server/workflow-executor.js';
import { WebSocket } from 'ws';

// Mock WebSocket client
class MockWebSocketClient extends EventEmitter {
  clientId = 'test-client-123';
  readyState = WebSocket.OPEN;
  sentMessages: unknown[] = [];

  send(data: string): void {
    this.sentMessages.push(JSON.parse(data));
  }

  getLastMessage(): Record<string, unknown> | undefined {
    return this.sentMessages[this.sentMessages.length - 1] as Record<string, unknown> | undefined;
  }

  getMessagesByType(type: string): Record<string, unknown>[] {
    return this.sentMessages.filter((m) => (m as Record<string, unknown>).type === type) as Record<string, unknown>[];
  }

  clearMessages(): void {
    this.sentMessages = [];
  }
}

// Mock child process for Claude CLI
class MockChildProcess extends EventEmitter {
  stdin = {
    write: vi.fn(),
    end: vi.fn(),  // Added for MQP-002 which closes stdin after passing command
    destroyed: false,
  };
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;

  kill(_signal?: string): boolean {
    this.emit('close', 0);
    return true;
  }
}

// Mock spawn function
const mockSpawn = vi.fn();

vi.mock('child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
  ChildProcess: class MockCP {},
}));

// Mock fs/promises for listCommands
vi.mock('fs/promises', () => ({
  readdir: vi.fn().mockResolvedValue(['test-workflow.md']),
  readFile: vi.fn().mockResolvedValue('# Test Workflow\nA test workflow description'),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
}));

describe('workflow integration', () => {
  let executor: WorkflowExecutor;
  let mockClient: MockWebSocketClient;
  let mockProcess: MockChildProcess;

  beforeEach(async () => {
    vi.clearAllMocks();
    executor = new WorkflowExecutor();
    mockClient = new MockWebSocketClient();
    mockProcess = new MockChildProcess();
    mockSpawn.mockReturnValue(mockProcess);

    // Pre-populate the commands cache so listCommands doesn't need to read files
    // Access private cache via prototype hack for testing
    const testCommand = {
      id: 'test-workflow',
      name: '/test-workflow',
      description: 'A test workflow description',
      filePath: '/test/project/.claude/commands/agent-os/test-workflow.md',
    };
    // Use any to access private property for test setup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (executor as any).commandsCache.set('/test/project', [testCommand]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('workflow start and completion', () => {
    it('should start workflow execution and send started event', async () => {
      const executionId = await executor.startExecution(
        mockClient as unknown as WebSocket & { clientId: string },
        'test-workflow',
        '/test/project'
      );

      expect(executionId).toBeDefined();
      expect(typeof executionId).toBe('string');

      // Should have called spawn with correct arguments
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude-anthropic-simple',
        expect.arrayContaining([
          '--print',
          '--verbose',
          '--output-format', 'stream-json',
          '--session-id', expect.any(String),
          '--dangerously-skip-permissions',
          '/test-workflow',
        ]),
        expect.objectContaining({
          cwd: '/test/project',
        })
      );

      // Should have sent workflow.started event
      const startedMessages = mockClient.getMessagesByType('workflow.started');
      expect(startedMessages.length).toBe(1);
      expect(startedMessages[0]).toMatchObject({
        type: 'workflow.started',
        executionId,
        commandName: '/test-workflow',
      });
    });

    it('should send workflow.interactive.complete on successful completion', async () => {
      const executionId = await executor.startExecution(
        mockClient as unknown as WebSocket & { clientId: string },
        'test-workflow',
        '/test/project'
      );

      // Simulate Claude CLI outputting result and closing successfully
      mockProcess.stdout.emit('data', Buffer.from('{"type":"result","message":"Done"}\n'));
      mockProcess.emit('close', 0);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      const completeMessages = mockClient.getMessagesByType('workflow.interactive.complete');
      expect(completeMessages.length).toBe(1);
      expect(completeMessages[0]).toMatchObject({
        type: 'workflow.interactive.complete',
        executionId,
        status: 'completed',
      });
    });

    it('should send workflow.interactive.message for text output', async () => {
      await executor.startExecution(
        mockClient as unknown as WebSocket & { clientId: string },
        'test-workflow',
        '/test/project'
      );

      // Simulate Claude CLI outputting assistant message with text
      const assistantMessage = {
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: 'Processing workflow...' }],
        },
      };
      mockProcess.stdout.emit('data', Buffer.from(JSON.stringify(assistantMessage) + '\n'));

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const messageEvents = mockClient.getMessagesByType('workflow.interactive.message');
      // Filter for assistant messages only (skip system message)
      const assistantMessages = messageEvents.filter((m) => m.role === 'assistant');
      expect(assistantMessages.length).toBeGreaterThan(0);
      expect(assistantMessages[0]).toMatchObject({
        type: 'workflow.interactive.message',
        role: 'assistant',
        content: 'Processing workflow...',
      });
    });
  });


  describe('error handling and retry', () => {
    it('should send workflow.interactive.error on retryable failure', async () => {
      const executionId = await executor.startExecution(
        mockClient as unknown as WebSocket & { clientId: string },
        'test-workflow',
        '/test/project'
      );

      // Simulate non-zero exit (retryable error)
      mockProcess.emit('close', 1);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const errorMessages = mockClient.getMessagesByType('workflow.interactive.error');
      expect(errorMessages.length).toBe(1);
      expect(errorMessages[0]).toMatchObject({
        type: 'workflow.interactive.error',
        executionId,
        canRetry: true,
      });

      const execution = executor.getExecution(executionId);
      expect(execution?.status).toBe('error_retry_available');
    });

    it('should retry execution successfully', async () => {
      const executionId = await executor.startExecution(
        mockClient as unknown as WebSocket & { clientId: string },
        'test-workflow',
        '/test/project'
      );

      // First execution fails
      mockProcess.emit('close', 1);
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify it's in error state
      expect(executor.getExecution(executionId)?.status).toBe('error_retry_available');

      // Create new mock process for retry
      const mockProcess2 = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess2);

      // Retry - this is async but we just check that it was called
      const retrySuccess = await executor.retryExecution(executionId);
      expect(retrySuccess).toBe(true);

      // Should have spawned a new process
      expect(mockSpawn).toHaveBeenCalledTimes(2);

      // Wait for runExecution to be called
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Execution should be running again
      const execution = executor.getExecution(executionId);
      expect(execution?.status).toBe('running');
    });

    it('should not retry non-retryable errors', async () => {
      await executor.startExecution(
        mockClient as unknown as WebSocket & { clientId: string },
        'test-workflow',
        '/test/project'
      );

      // Simulate ENOENT error (CLI not found - not retryable)
      const error = new Error('spawn claude-anthropic-simple ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockProcess.emit('error', error);

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Non-retryable errors send workflow.interactive.complete (not workflow.complete)
      const completeMessages = mockClient.getMessagesByType('workflow.interactive.complete');
      expect(completeMessages.length).toBe(1);
      expect(completeMessages[0]).toMatchObject({
        type: 'workflow.interactive.complete',
        status: 'failed',
      });
    });
  });

  describe('cancel functionality', () => {
    it('should cancel running workflow', async () => {
      const executionId = await executor.startExecution(
        mockClient as unknown as WebSocket & { clientId: string },
        'test-workflow',
        '/test/project'
      );

      const cancelled = executor.cancelExecution(executionId);
      expect(cancelled).toBe(true);

      // Wait for close event processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Cancelled workflows send workflow.interactive.complete with cancelled status
      const completeMessages = mockClient.getMessagesByType('workflow.interactive.complete');
      expect(completeMessages.length).toBe(1);
      expect(completeMessages[0]).toMatchObject({
        type: 'workflow.interactive.complete',
        status: 'cancelled',
      });
    });


    it('should not cancel already completed workflow', async () => {
      const executionId = await executor.startExecution(
        mockClient as unknown as WebSocket & { clientId: string },
        'test-workflow',
        '/test/project'
      );

      // Complete the workflow (no pending questions, so it completes)
      mockProcess.emit('close', 0);
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify it completed
      const execution = executor.getExecution(executionId);
      expect(execution?.status).toBe('completed');

      const cancelled = executor.cancelExecution(executionId);
      expect(cancelled).toBe(false);
    });
  });

  describe('tool events', () => {
    it('should send workflow.tool for non-AskUserQuestion tool calls', async () => {
      const executionId = await executor.startExecution(
        mockClient as unknown as WebSocket & { clientId: string },
        'test-workflow',
        '/test/project'
      );

      // Simulate Write tool call (not an assistant message, but simulating proper event)
      const toolMessage = {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              id: 'tool-write-1',
              name: 'Write',
              input: {
                file_path: 'agent-os/specs/test/spec.md',
                content: '# Test Spec\n\nContent here',
              },
            },
          ],
        },
      };
      mockProcess.stdout.emit('data', Buffer.from(JSON.stringify(toolMessage) + '\n'));

      // Need to wait for the async stdout processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const toolMessages = mockClient.getMessagesByType('workflow.tool');
      expect(toolMessages.length).toBe(1);
      expect(toolMessages[0]).toMatchObject({
        type: 'workflow.tool',
        executionId,
        toolName: 'Write',
        toolInput: {
          file_path: 'agent-os/specs/test/spec.md',
          content: '# Test Spec\n\nContent here',
        },
      });
    });

    it('should send workflow.tool.complete for tool results', async () => {
      const executionId = await executor.startExecution(
        mockClient as unknown as WebSocket & { clientId: string },
        'test-workflow',
        '/test/project'
      );

      // Simulate tool result
      const toolResultMessage = {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool-write-1',
              content: 'File written successfully',
            },
          ],
        },
      };
      mockProcess.stdout.emit('data', Buffer.from(JSON.stringify(toolResultMessage) + '\n'));

      // Need to wait for the async stdout processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const completeMessages = mockClient.getMessagesByType('workflow.tool.complete');
      expect(completeMessages.length).toBe(1);
      expect(completeMessages[0]).toMatchObject({
        type: 'workflow.tool.complete',
        executionId,
        toolId: 'tool-write-1',
      });
    });
  });
});
