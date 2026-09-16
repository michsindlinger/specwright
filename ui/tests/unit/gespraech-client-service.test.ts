// @vitest-environment happy-dom
/**
 * INT-2026-007 frontend GespraechClientService: subscribe → snapshot, deltas
 * upsert by id / remove / meta, re-subscribe on reconnect (FA-02, FA-08),
 * last listener unsubscribes, send-text request/reply (R-17).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GespraechSnapshot } from '../../src/shared/types/gespraech.protocol.js';

type Handler = (msg: Record<string, unknown>) => void;
const handlers = new Map<string, Set<Handler>>();
const sent: Array<Record<string, unknown>> = [];
let connected = true;
vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: {
    send: (m: Record<string, unknown>) => sent.push(m),
    on: (t: string, h: Handler) => {
      if (!handlers.has(t)) handlers.set(t, new Set());
      handlers.get(t)!.add(h);
    },
    off: (t: string, h: Handler) => handlers.get(t)?.delete(h),
    getConnectionStatus: () => connected,
    isConnecting: () => false,
    getProjectPath: vi.fn(),
  },
}));

const emit = (msg: Record<string, unknown>): void => {
  for (const h of handlers.get(msg.type as string) ?? []) h(msg);
};

const snap = (o: Partial<GespraechSnapshot> = {}): GespraechSnapshot => ({ sessionId: 'cloud-1-1', sitzung: 'aktiv', verlauf: { status: 'ok' }, beitraege: [], eingereiht: 0, ...o });

describe('GespraechClientService', () => {
  beforeEach(() => {
    handlers.clear();
    sent.length = 0;
    connected = true;
    vi.resetModules();
  });

  it('subscribes once per session, delivers the snapshot, applies deltas (upsert by id, remove, meta) and unsubscribes with the last listener', async () => {
    const { GespraechClientService } = await import('../../frontend/src/services/gespraech.service.js');
    const svc = new GespraechClientService();
    const a: Array<GespraechSnapshot | null> = [];
    const b: Array<GespraechSnapshot | null> = [];
    const offA = svc.subscribe('cloud-1-1', (s) => a.push(s));
    const offB = svc.subscribe('cloud-1-1', (s) => b.push(s));
    expect(sent.filter((m) => m.type === 'gespraech:subscribe')).toHaveLength(1);
    expect(a).toEqual([null]);
    emit({ type: 'gespraech:snapshot', sessionId: 'cloud-1-1', snapshot: snap({ beitraege: [{ id: 'hook:1', art: 'claude', text: 'Hallo', ergaenztSich: true }] }) });
    expect(a[1]?.beitraege.map((x) => x.id)).toEqual(['hook:1']);
    expect(b[1]?.beitraege.map((x) => x.id)).toEqual(['hook:1']);
    // transcript record replaces the hook Beitrag (remove + upsert), meta changes
    emit({
      type: 'gespraech:delta',
      sessionId: 'cloud-1-1',
      delta: { upsert: [{ id: 'uuid-1', at: '2026-09-16T07:44:00.000Z', art: 'claude', text: 'Hallo' }, { id: 'uuid-0', at: '2026-09-16T07:43:00.000Z', art: 'nutzer', text: 'hi', quelle: 'terminal' }], remove: ['hook:1'], offenerDialog: 'tu1', eingereiht: 2, sitzung: 'aktiv', verlauf: { status: 'ok' } },
    });
    const s = a[2]!;
    expect(s.beitraege.map((x) => x.id)).toEqual(['uuid-0', 'uuid-1']);
    expect(s.offenerDialog).toBe('tu1');
    expect(s.eingereiht).toBe(2);
    emit({ type: 'gespraech:delta', sessionId: 'cloud-1-1', delta: { upsert: [{ id: 'uuid-1', at: '2026-09-16T07:44:00.000Z', art: 'claude', text: 'Hallo (neu)' }], remove: [], offenerDialog: null } });
    expect(a[3]!.beitraege.map((x) => (x.art === 'claude' ? x.text : x.id))).toEqual(['uuid-0', 'Hallo (neu)']);
    expect(a[3]!.offenerDialog).toBeUndefined();
    // deltas for other sessions are ignored
    emit({ type: 'gespraech:delta', sessionId: 'cloud-9-9', delta: { upsert: [{ id: 'x', art: 'claude', text: 'fremd' }], remove: [] } });
    expect(a).toHaveLength(4);
    offA();
    expect(sent.filter((m) => m.type === 'gespraech:unsubscribe')).toHaveLength(0);
    offB();
    expect(sent.filter((m) => m.type === 'gespraech:unsubscribe')).toEqual([{ type: 'gespraech:unsubscribe', sessionId: 'cloud-1-1' }]);
    expect(svc.snapshot('cloud-1-1')).toBeNull();
  });

  it('re-subscribes every active session on reconnect (FA-08) and reports a refused subscription as cause', async () => {
    const { GespraechClientService } = await import('../../frontend/src/services/gespraech.service.js');
    const svc = new GespraechClientService();
    const seen: Array<[GespraechSnapshot | null, string | null]> = [];
    svc.subscribe('cloud-1-1', (s, f) => seen.push([s, f]));
    svc.subscribe('cloud-1-2', () => undefined);
    sent.length = 0;
    emit({ type: 'gateway.connected' });
    expect(sent.map((m) => [m.type, m.sessionId])).toEqual([
      ['gespraech:subscribe', 'cloud-1-1'],
      ['gespraech:subscribe', 'cloud-1-2'],
    ]);
    emit({ type: 'gespraech:error', requestId: 'gs-sub-cloud-1-1', code: 'UNKNOWN_SESSION', message: 'Sitzung unbekannt' });
    expect(seen[seen.length - 1]).toEqual([null, 'Sitzung unbekannt']);
    // a later snapshot clears the cause
    emit({ type: 'gespraech:snapshot', sessionId: 'cloud-1-1', snapshot: snap() });
    expect(seen[seen.length - 1][1]).toBeNull();
  });

  it('send by session (INT-2026-008): the request carries sessionId and no intentId', async () => {
    const { GespraechClientService } = await import('../../frontend/src/services/gespraech.service.js');
    const svc = new GespraechClientService();
    const p = svc.send('p', { sessionId: 'cloud-1-7' }, 'Sortierung');
    const req = sent[sent.length - 1];
    expect(req).toMatchObject({ type: 'gespraech:send-text', projectId: 'p', sessionId: 'cloud-1-7', text: 'Sortierung' });
    expect(req.intentId).toBeUndefined();
    emit({ type: 'gespraech:sent', requestId: req.requestId, entry: { id: 'pe7' }, status: 'gesendet' });
    expect(await p).toMatchObject({ ok: true, status: 'gesendet' });
  });

  it('send resolves with the entry and status, a refusal with the reason, an error message as ok:false', async () => {
    const { GespraechClientService } = await import('../../frontend/src/services/gespraech.service.js');
    const svc = new GespraechClientService();
    const p1 = svc.send('p', { intentId: 'INT-2026-003' }, 'hallo');
    const req = sent[sent.length - 1];
    expect(req).toMatchObject({ type: 'gespraech:send-text', projectId: 'p', intentId: 'INT-2026-003', text: 'hallo' });
    expect(req.sessionId).toBeUndefined();
    emit({ type: 'gespraech:sent', requestId: req.requestId, entry: { id: 'pe1' }, status: 'eingereiht' });
    expect(await p1).toEqual({ ok: true, entry: { id: 'pe1' }, status: 'eingereiht' });
    const p2 = svc.send('p', { intentId: 'INT-2026-003' }, 'x');
    emit({ type: 'gespraech:rejected', requestId: sent[sent.length - 1].requestId, grund: 'plan_offen', message: 'Sitzung wartet auf die Plan-Entscheidung' });
    expect(await p2).toEqual({ ok: false, grund: 'plan_offen', message: 'Sitzung wartet auf die Plan-Entscheidung' });
    const p3 = svc.send('p', { intentId: 'INT-2026-003' }, 'x');
    emit({ type: 'gespraech:error', requestId: sent[sent.length - 1].requestId, code: 'UNKNOWN_PROJECT', message: 'Projekt ist nicht geöffnet' });
    expect(await p3).toEqual({ ok: false, grund: 'fehler', message: 'Projekt ist nicht geöffnet' });
  });
});
