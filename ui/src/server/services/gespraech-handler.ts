/**
 * GespraechHandler (INT-2026-007): WebSocket messages of the Gespräch —
 * `gespraech:subscribe|unsubscribe|send-text|discard`. Pattern of
 * VorhabenHandler; the Verlauf goes only to the clients that subscribed to a
 * session (volume, visibility of other projects' content — plan §3 A.6), the
 * snapshot on (re)subscribe is the truth, deltas are best-effort (H6).
 */

import { CLOUD_SESSION_ID_RE } from './claude-hooks.js';
import { INTENT_ID_RE } from './vorhaben-reader.js';
import type { GespraechService } from './gespraech-service.js';
import { SendRejectedError, VorhabenError, type VorhabenService } from './vorhaben-service.js';
import {
  GESPRAECH_GRUND_TEXT,
  GESPRAECH_TEXT_MAX_CHARS,
  type GespraechDeltaMessage,
  type GespraechErrorMessage,
  type GespraechGrund,
  type GespraechRejectedMessage,
  type GespraechSentMessage,
  type GespraechSnapshotMessage,
} from '../../shared/types/gespraech.protocol.js';

export type OutboundMessage = { type: string };
export type Reply = (message: OutboundMessage) => void;

export const GESPRAECH_MESSAGE_TYPES = new Set(['gespraech:subscribe', 'gespraech:unsubscribe', 'gespraech:send-text', 'gespraech:discard']);

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

export interface GespraechHandlerDeps {
  gespraech: GespraechService;
  vorhaben: Pick<VorhabenService, 'sendText' | 'sendTextToSession' | 'discardQueued' | 'findProject'>;
  /** Sends a message to one client; false when the client is gone. */
  sendTo: (clientId: string, message: OutboundMessage) => boolean;
  now?: () => Date;
}

export class GespraechHandler {
  /** clientId → subscribed session ids. */
  private readonly subs = new Map<string, Set<string>>();
  private readonly now: () => Date;

  constructor(private readonly deps: GespraechHandlerDeps) {
    this.now = deps.now ?? ((): Date => new Date());
    deps.gespraech.on('gespraech:changed', (sessionId: string) => this.onChanged(sessionId));
  }

  /** Returns false when the message type is not ours. */
  public handle(clientId: string, message: Record<string, unknown>, reply: Reply): boolean {
    const type = message.type;
    if (typeof type !== 'string' || !GESPRAECH_MESSAGE_TYPES.has(type)) return false;
    const requestId = str(message.requestId);

    switch (type) {
      case 'gespraech:subscribe': {
        const sessionId = str(message.sessionId);
        if (!sessionId || !CLOUD_SESSION_ID_RE.test(sessionId)) {
          reply(this.error('INVALID_MESSAGE', 'sessionId (cloud-…) ist erforderlich', requestId));
          return true;
        }
        const snapshot = this.deps.gespraech.snapshot(sessionId);
        if (!snapshot) {
          reply(this.error('UNKNOWN_SESSION', 'Sitzung unbekannt', requestId));
          return true;
        }
        let set = this.subs.get(clientId);
        if (!set) {
          set = new Set();
          this.subs.set(clientId, set);
        }
        set.add(sessionId);
        const msg: GespraechSnapshotMessage = { type: 'gespraech:snapshot', sessionId, snapshot, timestamp: this.now().toISOString() };
        reply(msg);
        return true;
      }

      case 'gespraech:unsubscribe': {
        const sessionId = str(message.sessionId);
        if (sessionId) this.subs.get(clientId)?.delete(sessionId);
        return true;
      }

      case 'gespraech:send-text': {
        const projectId = str(message.projectId);
        const intentId = str(message.intentId);
        const sessionId = str(message.sessionId);
        const text = str(message.text);
        // Exactly one address: the Vorhaben (intentId) or — INT-2026-008 — a pending `/intent` session (sessionId).
        const byIntent = intentId !== undefined && sessionId === undefined;
        const bySession = sessionId !== undefined && intentId === undefined;
        if (!projectId || text === undefined || !(byIntent || bySession) || (byIntent && !INTENT_ID_RE.test(intentId)) || (bySession && !CLOUD_SESSION_ID_RE.test(sessionId))) {
          reply(this.error('INVALID_MESSAGE', 'projectId, text und genau eine Adresse sind erforderlich: intentId (INT-JJJJ-NNN) oder sessionId (cloud-…)', requestId));
          return true;
        }
        if (text.length > GESPRAECH_TEXT_MAX_CHARS) {
          reply(this.error('INVALID_MESSAGE', `text länger als ${GESPRAECH_TEXT_MAX_CHARS} Zeichen`, requestId));
          return true;
        }
        if (!this.deps.vorhaben.findProject(projectId)) {
          reply(this.error('UNKNOWN_PROJECT', 'Projekt ist nicht geöffnet', requestId));
          return true;
        }
        const send =
          sessionId !== undefined ? this.deps.vorhaben.sendTextToSession(projectId, sessionId, text) : this.deps.vorhaben.sendText(projectId, intentId ?? '', text);
        void send
          .then(({ entry, status }) => {
            reply({ type: 'gespraech:sent', ...(requestId ? { requestId } : {}), entry, status } as GespraechSentMessage);
            this.deps.gespraech.touch(entry.sessionId);
          })
          .catch((err) => reply(this.fromError(err, requestId)));
        return true;
      }

      case 'gespraech:discard': {
        const entryId = str(message.entryId);
        if (!entryId) {
          reply(this.error('INVALID_MESSAGE', 'entryId ist erforderlich', requestId));
          return true;
        }
        const sessionId = this.deps.vorhaben.discardQueued(entryId);
        if (!sessionId) reply(this.error('INVALID_MESSAGE', 'Eintrag nicht eingereiht oder unbekannt', requestId));
        else this.deps.gespraech.touch(sessionId);
        return true;
      }

      default:
        return false;
    }
  }

  /** Client disconnected: drop its subscriptions. */
  public onClientClosed(clientId: string): void {
    this.subs.delete(clientId);
  }

  public subscriberCount(sessionId: string): number {
    let n = 0;
    for (const set of this.subs.values()) if (set.has(sessionId)) n++;
    return n;
  }

  private onChanged(sessionId: string): void {
    const clients = [...this.subs.entries()].filter(([, set]) => set.has(sessionId)).map(([id]) => id);
    if (clients.length === 0) return;
    const delta = this.deps.gespraech.takeDelta(sessionId);
    if (!delta || (delta.upsert.length === 0 && delta.remove.length === 0 && delta.verlauf === undefined)) return;
    const msg: GespraechDeltaMessage = { type: 'gespraech:delta', sessionId, delta, timestamp: this.now().toISOString() };
    for (const clientId of clients) {
      if (!this.deps.sendTo(clientId, msg)) this.subs.delete(clientId);
    }
  }

  private fromError(err: unknown, requestId?: string): OutboundMessage {
    if (err instanceof SendRejectedError) {
      const grund = err.grund as GespraechGrund;
      return { type: 'gespraech:rejected', ...(requestId ? { requestId } : {}), grund, message: GESPRAECH_GRUND_TEXT[grund] ?? err.message } as GespraechRejectedMessage;
    }
    if (err instanceof VorhabenError) {
      const code = err.code === 'UNKNOWN_PROJECT' || err.code === 'UNKNOWN_VORHABEN' || err.code === 'UNKNOWN_SESSION' ? err.code : 'IO_ERROR';
      return this.error(code, err.message, requestId);
    }
    return this.error('IO_ERROR', (err as Error)?.message ?? String(err), requestId);
  }

  private error(code: GespraechErrorMessage['code'], message: string, requestId?: string): GespraechErrorMessage {
    return { type: 'gespraech:error', ...(requestId ? { requestId } : {}), code, message, timestamp: this.now().toISOString() };
  }
}
