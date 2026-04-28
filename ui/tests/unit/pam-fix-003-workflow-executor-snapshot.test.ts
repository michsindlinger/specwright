/**
 * Unit tests for PAM-FIX-003: WorkflowExecutor snapshot helpers.
 *
 * Verifies that getSpecAutoModeSnapshot / getBacklogAutoModeSnapshot
 *  - return null when no orchestrator exists for the spec/project
 *  - wrap the orchestrator snapshot with `enabled: true` when one exists
 *
 * This is the integration point the WS handler depends on. If this contract
 * breaks, the frontend never sees auto-mode state on (re-)mount.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowExecutor } from '../../src/server/workflow-executor.js';

interface OrchestratorMap {
  autoModeSpecOrchestrators: Map<string, { getSnapshot: () => Promise<unknown> }>;
  autoModeBacklogOrchestrators: Map<string, { getSnapshot: () => Promise<unknown> }>;
}

let executor: WorkflowExecutor;

beforeEach(() => {
  executor = new WorkflowExecutor();
});

describe('WorkflowExecutor.getSpecAutoModeSnapshot', () => {
  it('returns null when no orchestrator exists for spec', async () => {
    const result = await executor.getSpecAutoModeSnapshot('does-not-exist');
    expect(result).toBeNull();
  });

  it('returns wrapped snapshot with enabled:true when orchestrator exists', async () => {
    const mockOrchestrator = {
      getSnapshot: async () => ({
        active: [{ id: 'S-001', title: 'Running' }],
        queued: [{ id: 'S-002', title: 'Waiting' }],
      }),
    };

    (executor as unknown as OrchestratorMap).autoModeSpecOrchestrators.set(
      'spec-x',
      mockOrchestrator
    );

    const result = await executor.getSpecAutoModeSnapshot('spec-x');
    expect(result).toEqual({
      enabled: true,
      activeSlots: [{ id: 'S-001', title: 'Running' }],
      queuedSlots: [{ id: 'S-002', title: 'Waiting' }],
    });
  });
});

describe('WorkflowExecutor.getBacklogAutoModeSnapshot', () => {
  it('returns null when no backlog orchestrator for projectPath', async () => {
    const result = await executor.getBacklogAutoModeSnapshot('/nope');
    expect(result).toBeNull();
  });

  it('returns wrapped snapshot with enabled:true when backlog orchestrator exists', async () => {
    const mockOrchestrator = {
      getSnapshot: async () => ({
        active: [],
        queued: [{ id: 'B-001', title: 'Queued backlog item' }],
      }),
    };

    (executor as unknown as OrchestratorMap).autoModeBacklogOrchestrators.set(
      '/projects/foo',
      mockOrchestrator
    );

    const result = await executor.getBacklogAutoModeSnapshot('/projects/foo');
    expect(result).toEqual({
      enabled: true,
      activeSlots: [],
      queuedSlots: [{ id: 'B-001', title: 'Queued backlog item' }],
    });
  });
});
