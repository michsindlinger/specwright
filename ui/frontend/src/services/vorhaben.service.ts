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
  VorhabenPhaseDoc,
  VorhabenSessionResumedMessage,
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
/** INT-2026-020: image upload from „Neue Absicht" — 10 MB over a phone link needs more than 15 s (R2). */
const ABSICHT_BILD_TIMEOUT_MS = 60000;

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

  /**
   * Starts the next step as a session in the project (FA-35). INT-2026-010:
   * `model` may be undefined (the backend resolves last model → step default,
   * FA-22) and `firstInput` is handed to the session at its first Stop
   * (AK-09/FA-11, FA-22).
   */
  startStep(
    projectId: string,
    intentId: string | undefined,
    step: VorhabenStep,
    model: ModelSelection | undefined,
    sessionTarget?: CloudTerminalSessionTarget,
    opts: { firstInput?: string } = {}
  ): Promise<{ sessionId: string; modus: 'neu' | 'in_sitzung'; geschlossen?: string }> {
    // INT-2026-018: `modus` = in_sitzung when the click continued in the live session; `geschlossen` = the session closed for a new one.
    return this.request<{ sessionId: string; modus: 'neu' | 'in_sitzung'; geschlossen?: string }>('vorhaben:step-started', {
      type: 'vorhaben:start-step',
      projectId,
      ...(intentId ? { intentId } : {}),
      step,
      ...(model ? { model } : {}),
      ...(sessionTarget ? { sessionTarget } : {}),
      ...(opts.firstInput !== undefined ? { firstInput: opts.firstInput } : {}),
    });
  }

  /**
   * INT-2026-020 (AK-01, AK-03): an image pasted into the „Neue Absicht"
   * text field before a session exists. The backend validates and writes it
   * (Terminal rules, RB-04) and answers with the absolute path the browser
   * inserts into the text. 60 s instead of the usual 15: a 10 MB screenshot
   * over a phone link may take longer, and the file is already on disk by
   * then (R2). Rejects with the server's code/message (`VorhabenRequestError`).
   */
  pasteAbsichtBild(projectId: string, base64: string, mimeType: string): Promise<{ absolutePath: string }> {
    return this.request<{ absolutePath: string }>(
      'vorhaben:absicht-bild-saved',
      { type: 'vorhaben:absicht-bild', projectId, base64, mimeType },
      'vorhaben:error',
      ABSICHT_BILD_TIMEOUT_MS,
    );
  }

  /**
   * INT-2026-016 (AK-06, AK-07): bind a live claude-code tab to a Vorhaben
   * row without a session. Resolves on `vorhaben:session-assigned`, rejects
   * with the server's code and message (`VorhabenRequestError`) — the caller
   * shows the message as a toast.
   */
  assignSession(projectId: string, intentId: string, sessionId: string): Promise<{ projectId: string; intentId: string; sessionId: string }> {
    return this.request<{ projectId: string; intentId: string; sessionId: string }>('vorhaben:session-assigned', {
      type: 'vorhaben:session.assign',
      projectId,
      intentId,
      sessionId,
    });
  }

  /**
   * INT-2026-019 (AK-01): „Vorhaben-Seite geöffnet" — the backend decides
   * whether the row's session is lost and resumes it (RB-01). Resolves on
   * `vorhaben:session-resumed` (`gestartet` with the new session id, or
   * `nicht_noetig` with a reason), rejects with the server's code and message
   * (`VorhabenRequestError`: WORKTREE_MISSING, RESUME_FAILED, …) — the page
   * shows the message as a line (AK-08, AK-09).
   */
  resumeSession(projectId: string, intentId: string): Promise<VorhabenSessionResumedMessage> {
    return this.request<VorhabenSessionResumedMessage>('vorhaben:session-resumed', { type: 'vorhaben:session.resume', projectId, intentId });
  }

  /**
   * INT-2026-010 (FA-03, FA-12; AR-05): shared view state — project chip of
   * the overview and the chosen phase document of a Vorhaben. The answer is
   * the next `vorhaben:state` broadcast (every device follows).
   */
  setAnsicht(patch: { filterProjectId?: string | null; phase?: { projectId: string; intentId: string; doc: VorhabenPhaseDoc } }): void {
    gateway.send({
      type: 'vorhaben:ansicht.set',
      ...(patch.filterProjectId !== undefined ? { filterProjectId: patch.filterProjectId } : {}),
      ...(patch.phase ? { phase: patch.phase } : {}),
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

  /** Sends a request with a fresh requestId; resolves on the matching reply, rejects on vorhaben:error (or after `timeoutMs`, default 15 s). */
  private request<T>(replyType: string | string[], message: WebSocketMessage, errorType = 'vorhaben:error', timeoutMs = REQUEST_TIMEOUT_MS): Promise<T & { type: string }> {
    return gatewayRequest<T>(replyType, message, errorType, `vh-${Date.now()}-${++this.requestCounter}`, timeoutMs);
  }
}

/**
 * Request/reply over the gateway (R-17, INT-2026-007): sends `message` with
 * `requestId`, resolves on the first reply type whose `requestId` matches,
 * rejects on `errorType` with the same `requestId` or after `timeoutMs`
 * (default 15 s; INT-2026-020 passes 60 s for the image upload).
 */
export function gatewayRequest<T>(replyType: string | string[], message: WebSocketMessage, errorType: string, requestId: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T & { type: string }> {
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
    }, timeoutMs);
    for (const t of types) gateway.on(t, onReply);
    gateway.on(errorType, onError);
    gateway.send({ ...message, requestId });
  });
}

export const vorhabenService = new VorhabenClientService();
