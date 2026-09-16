/**
 * GespraechClientService (INT-2026-007, FA-02): subscribes to the Gespräch of
 * a claude-code cloud session — `gespraech:subscribe` → `gespraech:snapshot`,
 * then `gespraech:delta` upserts keyed by Beitrag id (the snapshot on every
 * (re)subscribe is the truth, deltas are best-effort). One subscription per
 * session, shared by all listeners; re-subscribed on every reconnect. Sending
 * uses the request/reply helper of the Vorhaben service (R-17).
 */

import { gateway, type WebSocketMessage } from '../gateway.js';
import { gatewayRequest, VorhabenRequestError } from './vorhaben.service.js';
import type { Beitrag, GespraechDelta, GespraechGrund, GespraechSnapshot } from '../../../src/shared/types/gespraech.protocol.js';
import type { ProtokollEintrag } from '../../../src/shared/types/vorhaben.protocol.js';

export type GespraechListener = (snapshot: GespraechSnapshot | null, fehler: string | null) => void;

export type SendTextResult = { ok: true; entry: ProtokollEintrag; status: 'gesendet' | 'eingereiht' } | { ok: false; grund: GespraechGrund | 'fehler'; message: string };

interface SessionSub {
  snapshot: GespraechSnapshot | null;
  /** Backend refused the subscription (unknown session) — shown as cause. */
  fehler: string | null;
  listeners: Set<GespraechListener>;
}

const CLOUD_SESSION_ID_RE = /^cloud-\d+-\d+$/;

export class GespraechClientService {
  private readonly subs = new Map<string, SessionSub>();
  private requestCounter = 0;
  private started = false;

  private readonly onSnapshot = (msg: WebSocketMessage): void => {
    const sessionId = msg.sessionId as string | undefined;
    const snapshot = msg.snapshot as GespraechSnapshot | undefined;
    if (!sessionId || !snapshot) return;
    const sub = this.subs.get(sessionId);
    if (!sub) return;
    sub.snapshot = { ...snapshot, beitraege: [...snapshot.beitraege] };
    sub.fehler = null;
    this.notify(sub);
  };

  private readonly onDelta = (msg: WebSocketMessage): void => {
    const sessionId = msg.sessionId as string | undefined;
    const delta = msg.delta as GespraechDelta | undefined;
    if (!sessionId || !delta) return;
    const sub = this.subs.get(sessionId);
    if (!sub?.snapshot) return;
    sub.snapshot = applyDelta(sub.snapshot, delta);
    this.notify(sub);
  };

  private readonly onError = (msg: WebSocketMessage): void => {
    // Unicast errors of a subscribe carry our `gs-sub-<sessionId>` requestId.
    const requestId = msg.requestId as string | undefined;
    if (!requestId?.startsWith('gs-sub-')) return;
    const sessionId = requestId.slice('gs-sub-'.length);
    const sub = this.subs.get(sessionId);
    if (!sub) return;
    sub.fehler = String(msg.message ?? msg.code ?? 'Gespräch nicht verfügbar');
    this.notify(sub);
  };

  private readonly onConnected = (): void => {
    for (const sessionId of this.subs.keys()) this.sendSubscribe(sessionId);
  };

  /** Current snapshot of a session (null until the first snapshot arrived). */
  snapshot(sessionId: string): GespraechSnapshot | null {
    return this.subs.get(sessionId)?.snapshot ?? null;
  }

  /**
   * Subscribes to a session's Gespräch; the listener gets the current state at
   * once and after every change. Returns the unsubscribe function — the last
   * listener of a session ends the backend subscription.
   */
  subscribe(sessionId: string, listener: GespraechListener): () => void {
    this.ensureStarted();
    let sub = this.subs.get(sessionId);
    const fresh = !sub;
    if (!sub) {
      sub = { snapshot: null, fehler: null, listeners: new Set() };
      this.subs.set(sessionId, sub);
    }
    sub.listeners.add(listener);
    if (fresh) this.sendSubscribe(sessionId);
    listener(sub.snapshot, sub.fehler);
    return () => {
      const current = this.subs.get(sessionId);
      if (!current) return;
      current.listeners.delete(listener);
      if (current.listeners.size === 0) {
        this.subs.delete(sessionId);
        if (gateway.getConnectionStatus()) gateway.send({ type: 'gespraech:unsubscribe', sessionId });
      }
    };
  }

  /** Free text into the session (FA-06/FA-11); refusal comes back as `ok:false` with the reason. */
  send(projectId: string, intentId: string, text: string): Promise<SendTextResult> {
    return gatewayRequest<{ type: string; entry?: ProtokollEintrag; status?: 'gesendet' | 'eingereiht'; grund?: GespraechGrund; message?: string }>(
      ['gespraech:sent', 'gespraech:rejected'],
      { type: 'gespraech:send-text', projectId, intentId, text },
      'gespraech:error',
      this.nextRequestId()
    )
      .then((r) =>
        r.type === 'gespraech:sent' && r.entry
          ? { ok: true as const, entry: r.entry, status: r.status ?? 'gesendet' }
          : { ok: false as const, grund: r.grund ?? ('senden_fehlgeschlagen' as GespraechGrund), message: r.message ?? '' }
      )
      .catch((err: unknown) => ({ ok: false as const, grund: 'fehler' as const, message: err instanceof VorhabenRequestError ? err.message : String(err) }));
  }

  /** Removes a queued (`eingereiht`) protocol entry — the queue inside Claude cannot be changed (E15). */
  discard(entryId: string): void {
    gateway.send({ type: 'gespraech:discard', entryId, requestId: this.nextRequestId() });
  }

  private nextRequestId(): string {
    return `gs-${Date.now()}-${++this.requestCounter}`;
  }

  private sendSubscribe(sessionId: string): void {
    if (!CLOUD_SESSION_ID_RE.test(sessionId)) {
      const sub = this.subs.get(sessionId);
      if (sub) {
        sub.fehler = 'keine Cloud-Sitzung';
        this.notify(sub);
      }
      return;
    }
    if (gateway.getConnectionStatus()) gateway.send({ type: 'gespraech:subscribe', sessionId, requestId: `gs-sub-${sessionId}` });
  }

  private notify(sub: SessionSub): void {
    for (const l of sub.listeners) l(sub.snapshot, sub.fehler);
  }

  private ensureStarted(): void {
    if (this.started) return;
    this.started = true;
    gateway.on('gespraech:snapshot', this.onSnapshot);
    gateway.on('gespraech:delta', this.onDelta);
    gateway.on('gespraech:error', this.onError);
    gateway.on('gateway.connected', this.onConnected);
  }
}

/** Applies a delta: upserts by id (order of the snapshot kept, new ids appended), removes, meta fields. Pure. */
export function applyDelta(snapshot: GespraechSnapshot, delta: GespraechDelta): GespraechSnapshot {
  const byId = new Map<string, Beitrag>(snapshot.beitraege.map((b) => [b.id, b]));
  for (const id of delta.remove) byId.delete(id);
  const order = snapshot.beitraege.map((b) => b.id).filter((id) => byId.has(id));
  for (const b of delta.upsert) {
    if (!byId.has(b.id)) order.push(b.id);
    byId.set(b.id, b);
  }
  const beitraege = order.map((id) => byId.get(id)!).sort(byTime);
  const next: GespraechSnapshot = { ...snapshot, beitraege };
  if (delta.sitzung) next.sitzung = delta.sitzung;
  if (delta.verlauf) next.verlauf = delta.verlauf;
  if (delta.offenerDialog !== undefined) {
    if (delta.offenerDialog === null) delete next.offenerDialog;
    else next.offenerDialog = delta.offenerDialog;
  }
  if (delta.eingereiht !== undefined) next.eingereiht = delta.eingereiht;
  return next;
}

/** Stable sort by timestamp; Beiträge without one (hook-only, „ergänzt sich") go last in arrival order. */
function byTime(a: Beitrag, b: Beitrag): number {
  const ka = a.at ?? '\uffff';
  const kb = b.at ?? '\uffff';
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

export const gespraechService = new GespraechClientService();
