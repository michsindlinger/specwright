/**
 * INT-2026-007 GespraechHandler: subscribe → snapshot (unicast), deltas only
 * to subscribers of that session (two windows, R-15), validation of
 * send-text/discard (security.md §6), cleanup on disconnect.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'events';

import { GespraechHandler } from '../../src/server/services/gespraech-handler.js';
import type { GespraechService } from '../../src/server/services/gespraech-service.js';
import { SendRejectedError, VorhabenError } from '../../src/server/services/vorhaben-service.js';
import type { GespraechDelta, GespraechSnapshot } from '../../src/shared/types/gespraech.protocol.js';

class FakeGespraech extends EventEmitter {
  public snapshots = new Map<string, GespraechSnapshot>();
  public deltas: GespraechDelta[] = [];
  public touched: string[] = [];
  snapshot(id: string): GespraechSnapshot | undefined {
    return this.snapshots.get(id);
  }
  takeDelta(): GespraechDelta | undefined {
    return this.deltas.shift();
  }
  touch(id: string): void {
    this.touched.push(id);
  }
}

const snapshotOf = (sessionId: string): GespraechSnapshot => ({ sessionId, sitzung: 'aktiv', verlauf: { status: 'ok' }, beitraege: [], eingereiht: 0 });

describe('GespraechHandler', () => {
  let gespraech: FakeGespraech;
  let sent: Array<[string, { type: string }]>;
  let handler: GespraechHandler;
  let sendText: ReturnType<typeof vi.fn>;
  let discardQueued: ReturnType<typeof vi.fn>;
  const gone = new Set<string>();

  beforeEach(() => {
    gespraech = new FakeGespraech();
    gespraech.snapshots.set('cloud-1-1', snapshotOf('cloud-1-1'));
    gespraech.snapshots.set('cloud-1-2', snapshotOf('cloud-1-2'));
    sent = [];
    gone.clear();
    sendText = vi.fn(async () => ({ entry: { id: 'pe1', sessionId: 'cloud-1-1', text: 'x', status: 'gesendet' }, status: 'gesendet' }));
    discardQueued = vi.fn(() => 'cloud-1-1');
    handler = new GespraechHandler({
      gespraech: gespraech as unknown as GespraechService,
      vorhaben: { sendText, discardQueued, findProject: (id: string) => (id === 'p' ? { id: 'p', path: '/p', name: 'P' } : undefined) } as never,
      sendTo: (clientId, m) => {
        if (gone.has(clientId)) return false;
        sent.push([clientId, m]);
        return true;
      },
    });
  });

  const reply = (): { fn: (m: { type: string }) => void; out: Array<Record<string, unknown>> } => {
    const out: Array<Record<string, unknown>> = [];
    return { fn: (m) => out.push(m as Record<string, unknown>), out };
  };

  it('ignores foreign message types', () => {
    const r = reply();
    expect(handler.handle('c1', { type: 'vorhaben:get' }, r.fn)).toBe(false);
    expect(r.out).toEqual([]);
  });

  it('subscribe → snapshot unicast; invalid or unknown session → error', () => {
    const r = reply();
    expect(handler.handle('c1', { type: 'gespraech:subscribe', sessionId: 'cloud-1-1', requestId: 'r1' }, r.fn)).toBe(true);
    expect(r.out[0]).toMatchObject({ type: 'gespraech:snapshot', sessionId: 'cloud-1-1', snapshot: { sessionId: 'cloud-1-1' } });
    handler.handle('c1', { type: 'gespraech:subscribe', sessionId: '../etc' }, r.fn);
    expect(r.out[1]).toMatchObject({ type: 'gespraech:error', code: 'INVALID_MESSAGE' });
    handler.handle('c1', { type: 'gespraech:subscribe', sessionId: 'cloud-9-9' }, r.fn);
    expect(r.out[2]).toMatchObject({ type: 'gespraech:error', code: 'UNKNOWN_SESSION' });
    expect(handler.subscriberCount('cloud-1-1')).toBe(1);
  });

  it('deltas reach every subscriber of that session and nobody else (R-15); a dead client is dropped', () => {
    handler.handle('a', { type: 'gespraech:subscribe', sessionId: 'cloud-1-1' }, reply().fn);
    handler.handle('b', { type: 'gespraech:subscribe', sessionId: 'cloud-1-1' }, reply().fn);
    handler.handle('c', { type: 'gespraech:subscribe', sessionId: 'cloud-1-2' }, reply().fn);
    gespraech.deltas.push({ upsert: [{ id: 'x', art: 'claude', text: 'hi' }], remove: [] });
    gespraech.emit('gespraech:changed', 'cloud-1-1');
    expect(sent.map(([c, m]) => [c, m.type])).toEqual([['a', 'gespraech:delta'], ['b', 'gespraech:delta']]);
    // empty delta: nothing sent
    gespraech.deltas.push({ upsert: [], remove: [] });
    gespraech.emit('gespraech:changed', 'cloud-1-1');
    expect(sent).toHaveLength(2);
    // meta-only delta counts
    gespraech.deltas.push({ upsert: [], remove: [], sitzung: 'beendet', verlauf: { status: 'ok' } });
    gespraech.emit('gespraech:changed', 'cloud-1-1');
    expect(sent).toHaveLength(4);
    // unsubscribe and disconnect
    handler.handle('a', { type: 'gespraech:unsubscribe', sessionId: 'cloud-1-1' }, reply().fn);
    gone.add('b');
    gespraech.deltas.push({ upsert: [{ id: 'y', art: 'claude', text: 'x' }], remove: [] });
    gespraech.emit('gespraech:changed', 'cloud-1-1');
    expect(sent).toHaveLength(4);
    expect(handler.subscriberCount('cloud-1-1')).toBe(0);
    handler.onClientClosed('c');
    expect(handler.subscriberCount('cloud-1-2')).toBe(0);
  });

  it('send-text: validation, then sent/rejected/error replies with the requestId', async () => {
    const r = reply();
    handler.handle('c1', { type: 'gespraech:send-text', requestId: 'r1', projectId: 'p', intentId: 'INT-2026-007', text: 'Hallo' }, r.fn);
    await new Promise((res) => setTimeout(res, 5));
    expect(sendText).toHaveBeenCalledWith('p', 'INT-2026-007', 'Hallo');
    expect(r.out[0]).toMatchObject({ type: 'gespraech:sent', requestId: 'r1', status: 'gesendet' });
    expect(gespraech.touched).toEqual(['cloud-1-1']);

    handler.handle('c1', { type: 'gespraech:send-text', projectId: 'p', intentId: 'nope', text: 'x' }, r.fn);
    expect(r.out[1]).toMatchObject({ type: 'gespraech:error', code: 'INVALID_MESSAGE' });
    handler.handle('c1', { type: 'gespraech:send-text', projectId: 'p', intentId: 'INT-2026-007', text: 'x'.repeat(8001) }, r.fn);
    expect(r.out[2]).toMatchObject({ type: 'gespraech:error', code: 'INVALID_MESSAGE' });
    handler.handle('c1', { type: 'gespraech:send-text', projectId: 'q', intentId: 'INT-2026-007', text: 'x' }, r.fn);
    expect(r.out[3]).toMatchObject({ type: 'gespraech:error', code: 'UNKNOWN_PROJECT' });

    sendText.mockRejectedValueOnce(new SendRejectedError('rueckfrage_offen', 'offen'));
    handler.handle('c1', { type: 'gespraech:send-text', requestId: 'r2', projectId: 'p', intentId: 'INT-2026-007', text: 'x' }, r.fn);
    await new Promise((res) => setTimeout(res, 5));
    expect(r.out[4]).toMatchObject({ type: 'gespraech:rejected', requestId: 'r2', grund: 'rueckfrage_offen' });
    expect((r.out[4] as { message: string }).message).toMatch(/Rückfrage/);

    sendText.mockRejectedValueOnce(new VorhabenError('UNKNOWN_VORHABEN', 'INT-2026-007 nicht gefunden'));
    handler.handle('c1', { type: 'gespraech:send-text', projectId: 'p', intentId: 'INT-2026-007', text: 'x' }, r.fn);
    await new Promise((res) => setTimeout(res, 5));
    expect(r.out[5]).toMatchObject({ type: 'gespraech:error', code: 'UNKNOWN_VORHABEN' });
  });

  it('discard: removes a queued entry and re-evaluates the session; unknown entry → error', () => {
    const r = reply();
    handler.handle('c1', { type: 'gespraech:discard', entryId: 'pe1' }, r.fn);
    expect(discardQueued).toHaveBeenCalledWith('pe1');
    expect(gespraech.touched).toEqual(['cloud-1-1']);
    expect(r.out).toEqual([]);
    discardQueued.mockReturnValueOnce(undefined);
    handler.handle('c1', { type: 'gespraech:discard', entryId: 'pe9' }, r.fn);
    expect(r.out[0]).toMatchObject({ type: 'gespraech:error', code: 'INVALID_MESSAGE' });
  });
});
