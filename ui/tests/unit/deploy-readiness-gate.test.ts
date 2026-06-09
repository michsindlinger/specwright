/**
 * Unit tests for the deploy-readiness gate (defer auto-deploy while auto-mode runs).
 *
 * Covers WorkflowExecutor.isAnyAutoModeActive() / getAutoModeCounts() — the single
 * source of truth the /api/status/deploy-readiness route uses. The orchestrator maps
 * are the authoritative signal; the cloud-session `autoModeActive` flag is
 * deliberately NOT used because it is never reset to false.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowExecutor } from '../../src/server/workflow-executor.js';

interface OrchestratorMap {
  autoModeSpecOrchestrators: Map<string, unknown>;
  autoModeBacklogOrchestrators: Map<string, unknown>;
}

let executor: WorkflowExecutor;

beforeEach(() => {
  executor = new WorkflowExecutor();
});

describe('WorkflowExecutor.isAnyAutoModeActive', () => {
  it('is false when no orchestrators are registered', () => {
    expect(executor.isAnyAutoModeActive()).toBe(false);
  });

  it('is true when a spec orchestrator is registered', () => {
    (executor as unknown as OrchestratorMap).autoModeSpecOrchestrators.set('spec-x', {});
    expect(executor.isAnyAutoModeActive()).toBe(true);
  });

  it('is true when a backlog orchestrator is registered', () => {
    (executor as unknown as OrchestratorMap).autoModeBacklogOrchestrators.set('/proj', {});
    expect(executor.isAnyAutoModeActive()).toBe(true);
  });

  it('returns to false after the orchestrator is removed (run completed)', () => {
    const maps = executor as unknown as OrchestratorMap;
    maps.autoModeSpecOrchestrators.set('spec-x', {});
    expect(executor.isAnyAutoModeActive()).toBe(true);
    maps.autoModeSpecOrchestrators.delete('spec-x');
    expect(executor.isAnyAutoModeActive()).toBe(false);
  });
});

describe('WorkflowExecutor.getAutoModeCounts', () => {
  it('reports zero counts when idle', () => {
    expect(executor.getAutoModeCounts()).toEqual({
      specOrchestrators: 0,
      backlogOrchestrators: 0,
    });
  });

  it('reports the number of registered spec and backlog orchestrators', () => {
    const maps = executor as unknown as OrchestratorMap;
    maps.autoModeSpecOrchestrators.set('spec-a', {});
    maps.autoModeSpecOrchestrators.set('spec-b', {});
    maps.autoModeBacklogOrchestrators.set('/proj', {});
    expect(executor.getAutoModeCounts()).toEqual({
      specOrchestrators: 2,
      backlogOrchestrators: 1,
    });
  });
});
