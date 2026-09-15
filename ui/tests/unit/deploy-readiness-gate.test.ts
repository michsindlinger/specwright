/**
 * Unit tests for the deploy-readiness gate (`/api/status/deploy-readiness`).
 *
 * The auto-mode half of the gate (WorkflowExecutor.isAnyAutoModeActive) went
 * with the story path in INT-2026-004, stage 3; what remains is the review
 * channel: a sent-but-unconfirmed answer keeps the gate closed for ≤ 10 s.
 */

/**
 * INT-2026-004 (FA-34, V-12): the second half of the gate — a review answer
 * that was sent but not confirmed keeps the gate closed for at most 10 s.
 * Since stage 3 (story path removed) this is the only signal the route in
 * index.ts reads.
 */
import { describe, it, expect, beforeEach } from 'vitest';
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
