/**
 * VorhabenHandler — WebSocket-facing logic for the Vorhaben view and the
 * project docs, kept out of websocket.ts so it is testable with a fake
 * broadcast and a fake reply (same shape as WorkspaceHandler).
 *
 * Validation lives here (security.md §6): project ids must be open workspace
 * projects, intent ids match `INT-JJJJ-NNN`, doc keys come from fixed enums.
 */

import {
  PROJECT_DOC_KEYS,
  VORHABEN_DOC_ORDER,
  type ProjectDocKey,
  type ProjectDocsConflictMessage,
  type ProjectDocsDocMessage,
  type ProjectDocsListResultMessage,
  type ProjectDocsWrittenMessage,
  type VorhabenDesignMessage,
  type VorhabenDocKey,
  type VorhabenDocMessage,
  type VorhabenErrorCode,
  type VorhabenErrorMessage,
} from '../../shared/types/vorhaben.protocol.js';
import { INTENT_ID_RE } from './vorhaben-reader.js';
import { VorhabenError, type VorhabenService } from './vorhaben-service.js';
import { ProjectDocNotFoundError, ProjectDocTooLargeError, type ProjectDocsService } from './project-docs.service.js';
import type { VorhabenStateStore } from './vorhaben-state.js';

export type OutboundMessage = { type: string };
export type Reply = (message: OutboundMessage) => void;

export const VORHABEN_MESSAGE_TYPES = new Set([
  'vorhaben:get',
  'vorhaben:doc.read',
  'vorhaben:design.read',
  'project-docs:list',
  'project-docs:read',
  'project-docs:write',
  'project-docs:draft.set',
  'project-docs:draft.clear',
]);

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const isDocKey = (v: unknown): v is VorhabenDocKey => typeof v === 'string' && (VORHABEN_DOC_ORDER as readonly string[]).includes(v);
const isProjectDocKey = (v: unknown): v is ProjectDocKey => typeof v === 'string' && (PROJECT_DOC_KEYS as readonly string[]).includes(v);

export class VorhabenHandler {
  constructor(
    private readonly service: VorhabenService,
    private readonly docs: ProjectDocsService,
    private readonly store: VorhabenStateStore,
    private readonly broadcast: (message: OutboundMessage) => void
  ) {}

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
    if (err instanceof ProjectDocNotFoundError) return this.error('NOT_FOUND', err.message, requestId);
    if (err instanceof ProjectDocTooLargeError) return this.error('TOO_LARGE', err.message, requestId);
    return this.error('IO_ERROR', (err as Error)?.message ?? String(err), requestId);
  }

  private error(code: VorhabenErrorCode, message: string, requestId?: string): VorhabenErrorMessage {
    return { type: 'vorhaben:error', ...(requestId ? { requestId } : {}), code, message, timestamp: new Date().toISOString() };
  }
}
