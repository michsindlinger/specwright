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

/**
 * INT-2026-004 (FA-34, V-12): the second half of the gate — a review answer
 * that was sent but not confirmed keeps the gate closed for at most 10 s.
 * The route in index.ts ORs this with isAnyAutoModeActive().
 */
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { VorhabenService, SEND_CONFIRM_TIMEOUT_MS } from '../../src/server/services/vorhaben-service.js';
import { VorhabenStateStore } from '../../src/server/services/vorhaben-state.js';
import { VorhabenWatcher } from '../../src/server/services/vorhaben-watcher.js';

describe('VorhabenService.hasPendingSend (deploy gate, FA-34)', () => {
  let dir: string;
  let now: Date;
  let store: VorhabenStateStore;
  let service: VorhabenService;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'gate-vorhaben-'));
    now = new Date('2026-09-15T16:50:00Z');
    store = new VorhabenStateStore(join(dir, 'v.json'), { port: 3111, now: () => now });
    await store.load();
    service = new VorhabenService({
      workspace: { getState: () => ({ openProjects: [] }) },
      store,
      broadcast: () => {},
      watcher: new VorhabenWatcher({ debounceMs: 30 }),
      now: () => now,
    });
  });

  const entry = (id: string, status: 'gesendet' | 'angenommen' | 'nicht_bestaetigt', sentAt: Date) => ({
    id, projectId: 'p', intentId: 'INT-2026-004', doc: 'spec' as const, art: 'aenderungen' as const, anzahl: 1, stand: 'x', sessionId: 's', sessionName: 'n', text: 't', anmerkungen: [], status, sentAt: sentAt.toISOString(),
  });

  it('is true only for a "gesendet" entry younger than 10 s', async () => {
    expect(service.hasPendingSend()).toBe(false);
    await store.addProtocolEntry(entry('a', 'gesendet', now));
    expect(service.hasPendingSend()).toBe(true);
    store.updateProtocolEntry('a', { status: 'angenommen' });
    expect(service.hasPendingSend()).toBe(false);
    await store.addProtocolEntry(entry('b', 'gesendet', new Date(now.getTime() - SEND_CONFIRM_TIMEOUT_MS)));
    expect(service.hasPendingSend()).toBe(false);
    await store.addProtocolEntry(entry('c', 'nicht_bestaetigt', now));
    expect(service.hasPendingSend()).toBe(false);
    service.stop();
    await store.flush();
    rmSync(dir, { recursive: true, force: true });
  });
});
