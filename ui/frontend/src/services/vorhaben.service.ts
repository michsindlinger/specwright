/**
 * VorhabenService (frontend) — mirrors the backend `vorhaben:state` broadcast
 * and wraps the request/reply messages of the Vorhaben view (INT-2026-004).
 * One subscription per page; components read `state` and subscribe.
 */

import { gateway, type WebSocketMessage } from '../gateway.js';
import type {
  Anmerkung,
  ModelSelection,
  ProjectDocEntry,
  ProjectDocKey,
  ProtokollArt,
  ProtokollEintrag,
  SendeGrund,
  VorhabenDocKey,
  VorhabenErrorMessage,
  VorhabenState,
  VorhabenStep,
} from '../../../src/shared/types/vorhaben.protocol.js';
import type { CloudTerminalSessionTarget, CloudTerminalTargetsResponseMessage } from '../../../src/shared/types/cloud-terminal.protocol.js';
import type { ModelSelectorProvider } from '../components/model-selector.js';

/** `model.list` reply as the Vorhaben page needs it (FA-40/FA-41). */
export interface ModelListInfo {
  providers: ModelSelectorProvider[];
  defaultSelection: ModelSelection;
  stepDefaults: Record<VorhabenStep, ModelSelection>;
}

export type SendResult = { ok: true; entry: ProtokollEintrag } | { ok: false; grund: SendeGrund; message: string; currentStand?: number };

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

  // ---- stage 2: review channel ----

  setDraft(projectId: string, intentId: string, doc: VorhabenDocKey, anmerkung: Anmerkung): void {
    gateway.send({ type: 'vorhaben:draft.set', projectId, intentId, doc, anmerkung });
  }

  deleteDraft(projectId: string, intentId: string, doc: VorhabenDocKey, id: string): void {
    gateway.send({ type: 'vorhaben:draft.delete', projectId, intentId, doc, id });
  }

  /** "Änderungen schicken" / "Freigeben" (FA-27/FA-28); a refusal comes back as `ok:false` with the reason (FA-30). */
  send(projectId: string, intentId: string, doc: VorhabenDocKey, art: ProtokollArt, stand: number): Promise<SendResult> {
    return this.request<{ type: string; entry?: ProtokollEintrag; grund?: SendeGrund; message?: string; currentStand?: number }>(
      ['vorhaben:sent', 'vorhaben:send-rejected'],
      { type: 'vorhaben:send', projectId, intentId, doc, art, stand }
    ).then((r) =>
      r.type === 'vorhaben:sent' && r.entry
        ? { ok: true as const, entry: r.entry }
        : { ok: false as const, grund: r.grund ?? 'senden_fehlgeschlagen', message: r.message ?? '', ...(r.currentStand !== undefined ? { currentStand: r.currentStand } : {}) }
    );
  }

  /** Starts the next step as a session in the project (FA-35). */
  startStep(projectId: string, intentId: string | undefined, step: VorhabenStep, model: ModelSelection, sessionTarget?: CloudTerminalSessionTarget): Promise<{ sessionId: string }> {
    return this.request<{ sessionId: string }>('vorhaben:step-started', {
      type: 'vorhaben:start-step',
      projectId,
      ...(intentId ? { intentId } : {}),
      step,
      model,
      ...(sessionTarget ? { sessionTarget } : {}),
    });
  }

  /** Providers, general default and per-step defaults from the settings. */
  modelList(): Promise<ModelListInfo> {
    return new Promise((resolve, reject) => {
      const onList = (msg: WebSocketMessage): void => {
        gateway.off('model.list', onList);
        clearTimeout(timer);
        resolve({
          providers: (msg.providers as ModelSelectorProvider[]) ?? [],
          defaultSelection: (msg.defaultSelection as ModelSelection) ?? { providerId: 'anthropic', modelId: 'opus' },
          stepDefaults: (msg.stepDefaults as Record<VorhabenStep, ModelSelection>) ?? ({} as Record<VorhabenStep, ModelSelection>),
        });
      };
      const timer = setTimeout(() => {
        gateway.off('model.list', onList);
        reject(new VorhabenRequestError('TIMEOUT', 'Keine Antwort vom Backend'));
      }, REQUEST_TIMEOUT_MS);
      gateway.on('model.list', onList);
      gateway.send({ type: 'model.list' });
    });
  }

  /** Where a session could run (project root, worktrees) — the existing picker's data. */
  targets(projectPath: string): Promise<CloudTerminalTargetsResponseMessage> {
    return this.request<CloudTerminalTargetsResponseMessage>('cloud-terminal:targets:response', { type: 'cloud-terminal:targets', projectPath }, 'cloud-terminal:targets:error');
  }

  /** Sends a request with a fresh requestId; resolves on the matching reply, rejects on vorhaben:error. */
  private request<T>(replyType: string | string[], message: WebSocketMessage, errorType = 'vorhaben:error'): Promise<T & { type: string }> {
    return gatewayRequest<T>(replyType, message, errorType, `vh-${Date.now()}-${++this.requestCounter}`);
  }
}

/**
 * Request/reply over the gateway (R-17, INT-2026-007): sends `message` with
 * `requestId`, resolves on the first reply type whose `requestId` matches,
 * rejects on `errorType` with the same `requestId` or after 15 s. Shared by
 * the Vorhaben and the Gespräch client services.
 */
export function gatewayRequest<T>(replyType: string | string[], message: WebSocketMessage, errorType: string, requestId: string): Promise<T & { type: string }> {
  const types = Array.isArray(replyType) ? replyType : [replyType];
  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      for (const t of types) gateway.off(t, onReply);
      gateway.off(errorType, onError);
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
    gateway.on(errorType, onError);
    gateway.send({ ...message, requestId });
  });
}

export const vorhabenService = new VorhabenClientService();
