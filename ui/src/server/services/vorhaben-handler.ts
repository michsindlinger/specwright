/**
 * VorhabenHandler — WebSocket-facing logic for the Vorhaben view and the
 * project docs, kept out of websocket.ts so it is testable with a fake
 * broadcast and a fake reply (same shape as WorkspaceHandler).
 *
 * Validation lives here (security.md §6): project ids must be open workspace
 * projects, intent ids match `INT-JJJJ-NNN`, doc keys come from fixed enums.
 */

import {
  ANMERKUNG_MAX_CHARS,
  PROJECT_DOC_KEYS,
  VORHABEN_DOC_ORDER,
  VORHABEN_PHASE_DOCS,
  type Anmerkung,
  type ModelSelection,
  type ProjectDocKey,
  type ProjectDocsConflictMessage,
  type ProjectDocsDocMessage,
  type ProjectDocsListResultMessage,
  type ProjectDocsWrittenMessage,
  type VorhabenAbsichtBildSavedMessage,
  type VorhabenDesignMessage,
  type VorhabenDocKey,
  type VorhabenDocMessage,
  type VorhabenErrorCode,
  type VorhabenErrorMessage,
  type VorhabenPhaseDoc,
  type VorhabenSendRejectedMessage,
  type VorhabenSentMessage,
  type VorhabenStep,
  type VorhabenSessionAssignedMessage,
  type VorhabenSessionResumedMessage,
  type VorhabenStepStartedMessage,
  FREITEXT_MAX_CHARS,
} from '../../shared/types/vorhaben.protocol.js';
import type { CloudTerminalSessionTarget } from '../../shared/types/cloud-terminal.protocol.js';
import { INTENT_ID_RE } from './vorhaben-reader.js';
import { SendRejectedError, VorhabenError, type VorhabenService } from './vorhaben-service.js';
import { ProjectDocNotFoundError, ProjectDocTooLargeError, type ProjectDocsService } from './project-docs.service.js';
import type { VorhabenStateStore } from './vorhaben-state.js';
import { PasteImageError, persistPastedImage } from '../utils/paste-image.js';
import { getIntentPasteImageRoot } from '../utils/runtime-paths.js';

export type OutboundMessage = { type: string };
export type Reply = (message: OutboundMessage) => void;

export const VORHABEN_MESSAGE_TYPES = new Set([
  'vorhaben:get',
  'vorhaben:doc.read',
  'vorhaben:design.read',
  'vorhaben:draft.set',
  'vorhaben:draft.delete',
  'vorhaben:send',
  'vorhaben:start-step',
  'vorhaben:ansicht.set',
  'vorhaben:session.assign',
  'vorhaben:session.resume',
  'vorhaben:absicht-bild',
  'project-docs:list',
  'project-docs:read',
  'project-docs:write',
  'project-docs:draft.set',
  'project-docs:draft.clear',
]);

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const isDocKey = (v: unknown): v is VorhabenDocKey => typeof v === 'string' && (VORHABEN_DOC_ORDER as readonly string[]).includes(v);
const isPhaseDoc = (v: unknown): v is VorhabenPhaseDoc => typeof v === 'string' && (VORHABEN_PHASE_DOCS as readonly string[]).includes(v);
const isProjectDocKey = (v: unknown): v is ProjectDocKey => typeof v === 'string' && (PROJECT_DOC_KEYS as readonly string[]).includes(v);
const STEPS: readonly string[] = ['intent', 'spec', 'plan', 'build'];
const isStep = (v: unknown): v is VorhabenStep => typeof v === 'string' && STEPS.includes(v);
const ANMERKUNG_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x08\x0b-\x1f\x7f]/g;
const cleanText = (v: string, max: number): string => v.replace(/\r\n?/g, '\n').replace(CONTROL_CHARS, '').slice(0, max);

/** Validates the client's Anmerkung; returns null when malformed. */
function parseAnmerkung(v: unknown): Anmerkung | null {
  if (!v || typeof v !== 'object') return null;
  const a = v as Record<string, unknown>;
  if (typeof a.id !== 'string' || !ANMERKUNG_ID_RE.test(a.id)) return null;
  if (typeof a.ordinal !== 'number' || !Number.isInteger(a.ordinal) || a.ordinal < -1) return null;
  if (typeof a.text !== 'string' || typeof a.ref !== 'string' || typeof a.snippet !== 'string') return null;
  return {
    id: a.id,
    ordinal: a.ordinal,
    ref: cleanText(a.ref, 200).replace(/\s+/g, ' ').trim() || 'Dokument gesamt',
    snippet: cleanText(a.snippet, 200),
    text: cleanText(a.text, ANMERKUNG_MAX_CHARS),
    updatedAt: typeof a.updatedAt === 'string' ? a.updatedAt : new Date().toISOString(),
  };
}

function parseModel(v: unknown): ModelSelection | null {
  if (!v || typeof v !== 'object') return null;
  const m = v as Record<string, unknown>;
  if (typeof m.providerId !== 'string' || typeof m.modelId !== 'string' || !m.providerId || !m.modelId) return null;
  if (m.providerId.length > 64 || m.modelId.length > 128) return null;
  return { providerId: m.providerId, modelId: m.modelId };
}

export class VorhabenHandler {
  /** INT-2026-020: where `vorhaben:absicht-bild` images are written (flat, no session subdirs). */
  private readonly bildRoot: string;

  constructor(
    private readonly service: VorhabenService,
    private readonly docs: ProjectDocsService,
    private readonly store: VorhabenStateStore,
    private readonly broadcast: (message: OutboundMessage) => void,
    opts: { bildRoot?: string } = {}
  ) {
    this.bildRoot = opts.bildRoot ?? getIntentPasteImageRoot();
  }

  /** Returns false when the message type is not ours. Async work replies later. */
  public handle(message: Record<string, unknown>, reply: Reply): boolean {
    const type = message.type;
    if (typeof type !== 'string' || !VORHABEN_MESSAGE_TYPES.has(type)) return false;
    const requestId = str(message.requestId);

    switch (type) {
      case 'vorhaben:get':
        reply(this.service.stateMessage());
        this.service.rescanIfStale();
        return true;

      case 'vorhaben:doc.read': {
        const projectId = str(message.projectId);
        const intentId = str(message.intentId);
        const doc = message.doc;
        if (!projectId || !intentId || !INTENT_ID_RE.test(intentId) || !isDocKey(doc)) {
          reply(this.error('INVALID_MESSAGE', 'projectId, intentId (INT-JJJJ-NNN) und doc sind erforderlich', requestId));
          return true;
        }
        void this.service
          .readDoc(projectId, intentId, doc)
          .then(({ content, mtimeMs }) => reply({ type: 'vorhaben:doc', ...(requestId ? { requestId } : {}), projectId, intentId, doc, content, mtimeMs } as VorhabenDocMessage))
          .catch((err) => reply(this.fromError(err, requestId)));
        return true;
      }

      case 'vorhaben:design.read': {
        const projectId = str(message.projectId);
        const intentId = str(message.intentId);
        const file = str(message.file);
        if (!projectId || !intentId || !INTENT_ID_RE.test(intentId) || !file) {
          reply(this.error('INVALID_MESSAGE', 'projectId, intentId und file sind erforderlich', requestId));
          return true;
        }
        void this.service
          .readDesign(projectId, intentId, file)
          .then((dataUrl) => reply({ type: 'vorhaben:design', ...(requestId ? { requestId } : {}), projectId, intentId, file, dataUrl } as VorhabenDesignMessage))
          .catch((err) => reply(this.fromError(err, requestId)));
        return true;
      }

      case 'vorhaben:draft.set': {
        const target = this.vorhabenDoc(message, reply, requestId);
        if (!target) return true;
        const anmerkung = parseAnmerkung(message.anmerkung);
        if (!anmerkung) {
          reply(this.error('INVALID_MESSAGE', 'anmerkung {id, ordinal, ref, snippet, text} ist erforderlich', requestId));
          return true;
        }
        if (this.store.setDraft(target.projectId, target.intentId, target.doc, anmerkung)) this.broadcast(this.service.stateMessage());
        return true;
      }

      case 'vorhaben:draft.delete': {
        const target = this.vorhabenDoc(message, reply, requestId);
        if (!target) return true;
        const id = str(message.id);
        if (!id) {
          reply(this.error('INVALID_MESSAGE', 'id ist erforderlich', requestId));
          return true;
        }
        if (this.store.deleteDraft(target.projectId, target.intentId, target.doc, id)) this.broadcast(this.service.stateMessage());
        return true;
      }

      case 'vorhaben:send': {
        const target = this.vorhabenDoc(message, reply, requestId);
        if (!target) return true;
        const art = message.art;
        const stand = message.stand;
        if ((art !== 'aenderungen' && art !== 'freigabe') || typeof stand !== 'number' || !Number.isFinite(stand)) {
          reply(this.error('INVALID_MESSAGE', 'art (aenderungen|freigabe) und stand (number) sind erforderlich', requestId));
          return true;
        }
        void this.service
          .send(target.projectId, target.intentId, target.doc, art, stand)
          .then((entry) => reply({ type: 'vorhaben:sent', ...(requestId ? { requestId } : {}), entry } as VorhabenSentMessage))
          .catch((err) => {
            if (err instanceof SendRejectedError) {
              reply({
                type: 'vorhaben:send-rejected',
                ...(requestId ? { requestId } : {}),
                grund: err.grund,
                message: err.message,
                ...(err.currentStand !== undefined ? { currentStand: err.currentStand } : {}),
              } as VorhabenSendRejectedMessage);
              return;
            }
            reply(this.fromError(err, requestId));
          });
        return true;
      }

      case 'vorhaben:start-step': {
        const project = this.project(message, reply, requestId);
        if (!project) return true;
        const step = message.step;
        const intentId = str(message.intentId);
        // INT-2026-010 (FA-22): model optional — the service resolves lastModel → step default.
        const model = message.model === undefined ? undefined : parseModel(message.model);
        if (!isStep(step) || model === null || (intentId !== undefined && !INTENT_ID_RE.test(intentId)) || (step !== 'intent' && !intentId)) {
          reply(this.error('INVALID_MESSAGE', 'step, model {providerId, modelId} (optional) und (außer bei intent) intentId sind erforderlich', requestId));
          return true;
        }
        // INT-2026-010 (AK-09, FA-11, FA-22): first input — trimmed, 1…FREITEXT_MAX_CHARS characters.
        let firstInput: string | undefined;
        if (message.firstInput !== undefined) {
          const raw = str(message.firstInput);
          firstInput = raw === undefined ? undefined : cleanText(raw, FREITEXT_MAX_CHARS + 1).trim();
          if (firstInput === undefined || firstInput.length === 0 || firstInput.length > FREITEXT_MAX_CHARS) {
            reply(this.error('INVALID_MESSAGE', `firstInput muss ein Text mit 1 bis ${FREITEXT_MAX_CHARS} Zeichen sein`, requestId));
            return true;
          }
        }
        const sessionTarget = message.sessionTarget as CloudTerminalSessionTarget | undefined;
        void this.service
          .startStep(project.id, intentId, step, model, sessionTarget, firstInput)
          .then(({ sessionId, modus, geschlossen }) =>
            // INT-2026-018: `modus` says whether the click continued in the live session; `geschlossen` names a closed one (AK-04/AK-05).
            reply({ type: 'vorhaben:step-started', ...(requestId ? { requestId } : {}), sessionId, projectId: project.id, ...(intentId ? { intentId } : {}), step, modus, ...(geschlossen ? { geschlossen } : {}) } as VorhabenStepStartedMessage)
          )
          .catch((err) => reply(this.fromError(err, requestId)));
        return true;
      }

      case 'vorhaben:session.assign': {
        // INT-2026-016 (AK-06, AK-07): request/reply; the row follows in the broadcast.
        const project = this.project(message, reply, requestId);
        if (!project) return true;
        const intentId = str(message.intentId);
        const sessionId = str(message.sessionId);
        if (!intentId || !INTENT_ID_RE.test(intentId) || !sessionId) {
          reply(this.error('INVALID_MESSAGE', 'intentId (INT-JJJJ-NNN) und sessionId sind erforderlich', requestId));
          return true;
        }
        void this.service
          .assignSession(project.id, intentId, sessionId)
          .then(() => reply({ type: 'vorhaben:session-assigned', ...(requestId ? { requestId } : {}), projectId: project.id, intentId, sessionId } as VorhabenSessionAssignedMessage))
          .catch((err) => reply(this.fromError(err, requestId)));
        return true;
      }

      case 'vorhaben:session.resume': {
        // INT-2026-019 (AK-01): „Seite geöffnet" — the service decides; request/reply, the row follows in the broadcast.
        const project = this.project(message, reply, requestId);
        if (!project) return true;
        const intentId = str(message.intentId);
        if (!intentId || !INTENT_ID_RE.test(intentId)) {
          reply(this.error('INVALID_MESSAGE', 'intentId (INT-JJJJ-NNN) ist erforderlich', requestId));
          return true;
        }
        void this.service
          .resumeIfLost(project.id, intentId)
          .then((result) =>
            reply({
              type: 'vorhaben:session-resumed',
              ...(requestId ? { requestId } : {}),
              projectId: project.id,
              intentId,
              ergebnis: result.ergebnis,
              ...(result.ergebnis === 'gestartet' ? { sessionId: result.sessionId } : { grund: result.grund }),
            } as VorhabenSessionResumedMessage)
          )
          .catch((err) => reply(this.fromError(err, requestId)));
        return true;
      }

      case 'vorhaben:absicht-bild': {
        // INT-2026-020 (AK-01, AK-04, RB-01): image pasted before a session exists.
        // Project must be open; MIME/size/empty checks and the write are the
        // Terminal's (utils/paste-image.ts); the extension never comes from the client.
        const project = this.project(message, reply, requestId);
        if (!project) return true;
        const base64 = str(message.base64);
        const mimeType = str(message.mimeType);
        if (base64 === undefined || mimeType === undefined) {
          reply(this.error('INVALID_MESSAGE', 'base64 und mimeType sind erforderlich', requestId));
          return true;
        }
        void persistPastedImage(this.bildRoot, base64, mimeType)
          .then((absolutePath) =>
            reply({ type: 'vorhaben:absicht-bild-saved', ...(requestId ? { requestId } : {}), absolutePath } as VorhabenAbsichtBildSavedMessage)
          )
          .catch((err) => reply(this.fromError(err, requestId)));
        return true;
      }

      case 'vorhaben:ansicht.set': {
        // INT-2026-010 (FA-03, FA-12; AR-05): shared view state; the answer is the broadcast.
        const hasFilter = 'filterProjectId' in message;
        const filterProjectId = message.filterProjectId;
        if (hasFilter && filterProjectId !== null && typeof filterProjectId !== 'string') {
          reply(this.error('INVALID_MESSAGE', 'filterProjectId muss eine Projekt-Id oder null sein', requestId));
          return true;
        }
        let phase: { projectId: string; intentId: string; doc: VorhabenPhaseDoc } | undefined;
        if (message.phase !== undefined) {
          const p = message.phase as Record<string, unknown> | null;
          const projectId = p ? str(p.projectId) : undefined;
          const intentId = p ? str(p.intentId) : undefined;
          if (!p || !projectId || !intentId || !INTENT_ID_RE.test(intentId) || !isPhaseDoc(p.doc)) {
            reply(this.error('INVALID_MESSAGE', 'phase {projectId, intentId (INT-JJJJ-NNN), doc (intent|spec|plan|build-stand|design)} ist erforderlich', requestId));
            return true;
          }
          phase = { projectId, intentId, doc: p.doc };
        }
        if (!hasFilter && !phase) {
          reply(this.error('INVALID_MESSAGE', 'filterProjectId oder phase ist erforderlich', requestId));
          return true;
        }
        try {
          this.service.setAnsicht({ ...(hasFilter ? { filterProjectId: filterProjectId as string | null } : {}), ...(phase ? { phase } : {}) });
        } catch (err) {
          reply(this.fromError(err, requestId));
        }
        return true;
      }

      case 'project-docs:list': {
        const project = this.project(message, reply, requestId);
        if (!project) return true;
        void this.docs
          .list(project.path)
          .then((docs) => reply({ type: 'project-docs:list-result', ...(requestId ? { requestId } : {}), projectId: project.id, docs } as ProjectDocsListResultMessage))
          .catch((err) => reply(this.fromError(err, requestId)));
        return true;
      }

      case 'project-docs:read': {
        const project = this.project(message, reply, requestId);
        if (!project) return true;
        const key = message.key;
        if (!isProjectDocKey(key)) {
          reply(this.error('INVALID_MESSAGE', 'key muss einer der fünf Projekt-Docs sein', requestId));
          return true;
        }
        void this.docs
          .read(project.path, key)
          .then(({ content, mtimeMs }) => reply({ type: 'project-docs:doc', ...(requestId ? { requestId } : {}), projectId: project.id, key, content, mtimeMs } as ProjectDocsDocMessage))
          .catch((err) => reply(this.fromError(err, requestId)));
        return true;
      }

      case 'project-docs:write': {
        const project = this.project(message, reply, requestId);
        if (!project) return true;
        const key = message.key;
        const content = str(message.content);
        const expectedMtime = message.expectedMtime === null ? null : typeof message.expectedMtime === 'number' ? message.expectedMtime : undefined;
        if (!isProjectDocKey(key) || content === undefined || expectedMtime === undefined) {
          reply(this.error('INVALID_MESSAGE', 'key, content und expectedMtime (number|null) sind erforderlich', requestId));
          return true;
        }
        const force = message.force === true;
        void this.docs
          .write(project.path, key, content, expectedMtime, force)
          .then((res) => {
            if (res.ok) {
              // Saved: the draft is obsolete on every device.
              if (this.store.clearDocDraft(project.id, key)) this.broadcast(this.service.stateMessage());
              reply({ type: 'project-docs:written', ...(requestId ? { requestId } : {}), projectId: project.id, key, mtimeMs: res.mtimeMs, savedAt: new Date().toISOString() } as ProjectDocsWrittenMessage);
            } else {
              reply({ type: 'project-docs:conflict', ...(requestId ? { requestId } : {}), projectId: project.id, key, expectedMtime, currentMtime: res.currentMtime } as ProjectDocsConflictMessage);
            }
          })
          .catch((err) => reply(this.fromError(err, requestId)));
        return true;
      }

      case 'project-docs:draft.set': {
        const project = this.project(message, reply, requestId);
        if (!project) return true;
        const key = message.key;
        const text = str(message.text);
        const openedMtime = typeof message.openedMtime === 'number' ? message.openedMtime : undefined;
        if (!isProjectDocKey(key) || text === undefined || openedMtime === undefined) {
          reply(this.error('INVALID_MESSAGE', 'key, text und openedMtime sind erforderlich', requestId));
          return true;
        }
        if (this.store.setDocDraft(project.id, key, text, openedMtime)) this.broadcast(this.service.stateMessage());
        return true;
      }

      case 'project-docs:draft.clear': {
        const project = this.project(message, reply, requestId);
        if (!project) return true;
        const key = message.key;
        if (!isProjectDocKey(key)) {
          reply(this.error('INVALID_MESSAGE', 'key ist erforderlich', requestId));
          return true;
        }
        if (this.store.clearDocDraft(project.id, key)) this.broadcast(this.service.stateMessage());
        return true;
      }

      default:
        return false;
    }
  }

  /** projectId (open), intentId (INT-JJJJ-NNN) and doc (enum) of a message. */
  private vorhabenDoc(message: Record<string, unknown>, reply: Reply, requestId?: string): { projectId: string; intentId: string; doc: VorhabenDocKey } | undefined {
    const project = this.project(message, reply, requestId);
    if (!project) return undefined;
    const intentId = str(message.intentId);
    const doc = message.doc;
    if (!intentId || !INTENT_ID_RE.test(intentId) || !isDocKey(doc)) {
      reply(this.error('INVALID_MESSAGE', 'intentId (INT-JJJJ-NNN) und doc sind erforderlich', requestId));
      return undefined;
    }
    return { projectId: project.id, intentId, doc };
  }

  private project(message: Record<string, unknown>, reply: Reply, requestId?: string): { id: string; path: string; name: string } | undefined {
    const projectId = str(message.projectId);
    if (!projectId) {
      reply(this.error('INVALID_MESSAGE', 'projectId ist erforderlich', requestId));
      return undefined;
    }
    const project = this.service.findProject(projectId);
    if (!project) {
      reply(this.error('UNKNOWN_PROJECT', 'Projekt ist nicht geöffnet', requestId));
      return undefined;
    }
    return project;
  }

  private fromError(err: unknown, requestId?: string): VorhabenErrorMessage {
    if (err instanceof VorhabenError) return this.error(err.code, err.message, requestId);
    // INT-2026-020: the Terminal's paste codes are part of VorhabenErrorCode (same strings).
    if (err instanceof PasteImageError) return this.error(err.code as VorhabenErrorCode, err.message, requestId);
    if (err instanceof ProjectDocNotFoundError) return this.error('NOT_FOUND', err.message, requestId);
    if (err instanceof ProjectDocTooLargeError) return this.error('TOO_LARGE', err.message, requestId);
    return this.error('IO_ERROR', (err as Error)?.message ?? String(err), requestId);
  }

  private error(code: VorhabenErrorCode, message: string, requestId?: string): VorhabenErrorMessage {
    return { type: 'vorhaben:error', ...(requestId ? { requestId } : {}), code, message, timestamp: new Date().toISOString() };
  }
}
