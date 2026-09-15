/**
 * VorhabenService (frontend) — mirrors the backend `vorhaben:state` broadcast
 * and wraps the request/reply messages of the Vorhaben view (INT-2026-004).
 * One subscription per page; components read `state` and subscribe.
 */

import { gateway, type WebSocketMessage } from '../gateway.js';
import type {
  ProjectDocEntry,
  ProjectDocKey,
  VorhabenDocKey,
  VorhabenErrorMessage,
  VorhabenState,
} from '../../../src/shared/types/vorhaben.protocol.js';

export type VorhabenStateListener = (state: VorhabenState | null) => void;

export class VorhabenRequestError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

const REQUEST_TIMEOUT_MS = 15000;

export class VorhabenClientService {
  private _state: VorhabenState | null = null;
  private readonly listeners = new Set<VorhabenStateListener>();
  private requestCounter = 0;
  private started = false;

  private readonly onState = (msg: WebSocketMessage): void => {
    const state = msg.state as VorhabenState | undefined;
    if (!state || !Array.isArray(state.rows)) return;
    this._state = state;
    for (const l of this.listeners) l(state);
  };

  private readonly onConnected = (): void => {
    gateway.send({ type: 'vorhaben:get' });
  };

  get state(): VorhabenState | null {
    return this._state;
  }

  /** Subscribes; starts the gateway subscription on first use. */
  subscribe(listener: VorhabenStateListener): () => void {
    this.listeners.add(listener);
    this.ensureStarted();
    listener(this._state);
    return () => this.listeners.delete(listener);
  }

  /** Asks the backend for the current snapshot (also on every reconnect). */
  refresh(): void {
    this.ensureStarted();
    if (gateway.getConnectionStatus()) gateway.send({ type: 'vorhaben:get' });
  }

  private ensureStarted(): void {
    if (this.started) return;
    this.started = true;
    gateway.on('vorhaben:state', this.onState);
    gateway.on('gateway.connected', this.onConnected);
    if (gateway.getConnectionStatus()) gateway.send({ type: 'vorhaben:get' });
  }

  readDoc(projectId: string, intentId: string, doc: VorhabenDocKey): Promise<{ content: string; mtimeMs: number }> {
    return this.request<{ content: string; mtimeMs: number }>('vorhaben:doc', { type: 'vorhaben:doc.read', projectId, intentId, doc });
  }

  readDesign(projectId: string, intentId: string, file: string): Promise<string | null> {
    return this.request<{ dataUrl: string | null }>('vorhaben:design', { type: 'vorhaben:design.read', projectId, intentId, file }).then((r) => r.dataUrl);
  }

  listProjectDocs(projectId: string): Promise<ProjectDocEntry[]> {
    return this.request<{ docs: ProjectDocEntry[] }>('project-docs:list-result', { type: 'project-docs:list', projectId }).then((r) => r.docs);
  }

  readProjectDoc(projectId: string, key: ProjectDocKey): Promise<{ content: string; mtimeMs: number }> {
    return this.request<{ content: string; mtimeMs: number }>('project-docs:doc', { type: 'project-docs:read', projectId, key });
  }

  writeProjectDoc(
    projectId: string,
    key: ProjectDocKey,
    content: string,
    expectedMtime: number | null,
    force = false
  ): Promise<{ ok: true; mtimeMs: number; savedAt: string } | { ok: false; currentMtime: number }> {
    return this.request<{ type: string; mtimeMs?: number; savedAt?: string; currentMtime?: number }>(
      ['project-docs:written', 'project-docs:conflict'],
      { type: 'project-docs:write', projectId, key, content, expectedMtime, force }
    ).then((r) =>
      r.type === 'project-docs:written'
        ? { ok: true as const, mtimeMs: r.mtimeMs ?? 0, savedAt: r.savedAt ?? new Date().toISOString() }
        : { ok: false as const, currentMtime: r.currentMtime ?? 0 }
    );
  }

  setProjectDocDraft(projectId: string, key: ProjectDocKey, text: string, openedMtime: number): void {
    gateway.send({ type: 'project-docs:draft.set', projectId, key, text, openedMtime });
  }

  clearProjectDocDraft(projectId: string, key: ProjectDocKey): void {
    gateway.send({ type: 'project-docs:draft.clear', projectId, key });
  }

  /** Sends a request with a fresh requestId; resolves on the matching reply, rejects on vorhaben:error. */
  private request<T>(replyType: string | string[], message: WebSocketMessage): Promise<T & { type: string }> {
    const requestId = `vh-${Date.now()}-${++this.requestCounter}`;
    const types = Array.isArray(replyType) ? replyType : [replyType];
    return new Promise((resolve, reject) => {
      const cleanup = (): void => {
        for (const t of types) gateway.off(t, onReply);
        gateway.off('vorhaben:error', onError);
        clearTimeout(timer);
      };
      const onReply = (msg: WebSocketMessage): void => {
        if (msg.requestId !== requestId) return;
        cleanup();
        resolve(msg as T & { type: string });
      };
      const onError = (msg: WebSocketMessage): void => {
        if (msg.requestId !== requestId) return;
        cleanup();
        const err = msg as unknown as VorhabenErrorMessage;
        reject(new VorhabenRequestError(err.code, err.message));
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new VorhabenRequestError('TIMEOUT', 'Keine Antwort vom Backend'));
      }, REQUEST_TIMEOUT_MS);
      for (const t of types) gateway.on(t, onReply);
      gateway.on('vorhaben:error', onError);
      gateway.send({ ...message, requestId });
    });
  }
}

export const vorhabenService = new VorhabenClientService();
