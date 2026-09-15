/**
 * VorhabenStateStore — user state of the Vorhaben view, one file per backend
 * (`<runtime>/vorhaben-<port>.json`, ADR-0002). Same durability as the
 * workspace store: versioned JSON, serialized atomic writes (tmp+rename,
 * 0600), unreadable file renamed aside.
 *
 * Stage 1 (INT-2026-004) used `docDrafts` (FA-47). Stage 2 fills the rest:
 * session assignments (FA-21/22), review drafts (FA-26), the protocol of
 * sent answers (FA-31/32), the last model per step (FA-40) and pending
 * `/intent` sessions waiting for their folder. The file format stayed the
 * same (`version: 1`); every map is optional on load.
 */

import * as fs from 'fs';
import { dirname } from 'path';
import {
  assignmentKey,
  draftKey,
  lastModelKey,
  type Anmerkung,
  type ModelSelection,
  type ProjectDocDraft,
  type ProjectDocKey,
  type ProtokollEintrag,
  type VorhabenDocKey,
  type VorhabenStep,
} from '../../shared/types/vorhaben.protocol.js';

export interface VorhabenAssignment {
  sessionId: string;
  step: VorhabenStep;
  /** Model id of the session (display, FA-42). */
  model: string;
  /** Directory the session runs in — the copy whose documents win (FA-06). */
  cwd: string;
  at: string;
  ended?: boolean;
}

/** `/intent` without id: the first new folder under `cwd/intent/` after `since` claims it (FA-21). */
export interface PendingIntent {
  projectId: string;
  cwd: string;
  step: VorhabenStep;
  model: string;
  since: string;
}

export interface VorhabenStateData {
  /** `assignmentKey(projectId, intentId)` → session assignment. */
  assignments: Record<string, VorhabenAssignment>;
  /** `draftKey(projectId, intentId, doc)` → review drafts in document order. */
  drafts: Record<string, Anmerkung[]>;
  /** Sent answers, newest first. */
  protocol: ProtokollEintrag[];
  /** `lastModelKey(projectId, intentId, step)` → last model selection. */
  lastModel: Record<string, ModelSelection>;
  /** `${projectId}::${docKey}` → unsaved project-doc text (FA-47). */
  docDrafts: Record<string, ProjectDocDraft>;
  /** sessionId → pending `/intent` claim. */
  pendingIntents: Record<string, PendingIntent>;
}

interface VorhabenStateFileV1 {
  version: 1;
  port: number;
  updatedAt: string;
  state: VorhabenStateData;
}

export interface VorhabenStoreDeps {
  port?: number;
  now?: () => Date;
}

export interface VorhabenLoadResult {
  existed: boolean;
  healthy: boolean;
}

export function docDraftKey(projectId: string, key: ProjectDocKey): string {
  return `${projectId}::${key}`;
}

/** Protocol entries are kept at least this long even after the Vorhaben vanished (FA-32). */
export const PROTOCOL_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function emptyState(): VorhabenStateData {
  return { assignments: {}, drafts: {}, protocol: [], lastModel: {}, docDrafts: {}, pendingIntents: {} };
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

const byOrdinal = (a: Anmerkung, b: Anmerkung): number => a.ordinal - b.ordinal || a.updatedAt.localeCompare(b.updatedAt);

export class VorhabenStateStore {
  private state: VorhabenStateData = emptyState();
  private writeChain: Promise<void> = Promise.resolve();
  private readonly now: () => Date;
  private readonly port: number;
  private updatedAt: string;

  constructor(private readonly filePath: string, deps: VorhabenStoreDeps = {}) {
    this.now = deps.now ?? ((): Date => new Date());
    this.port = deps.port ?? (process.env.PORT ? parseInt(process.env.PORT, 10) : 3001);
    this.updatedAt = this.now().toISOString();
  }

  public async load(): Promise<VorhabenLoadResult> {
    let raw: string;
    try {
      raw = await fs.promises.readFile(this.filePath, 'utf-8');
    } catch {
      return { existed: false, healthy: true };
    }
    try {
      const parsed = JSON.parse(raw) as VorhabenStateFileV1;
      if (parsed.version !== 1 || !isRecord(parsed.state)) {
        throw new Error(`unrecognized vorhaben state format (version: ${String(parsed.version)})`);
      }
      const s = parsed.state as Partial<VorhabenStateData>;
      this.state = {
        assignments: isRecord(s.assignments) ? (s.assignments as VorhabenStateData['assignments']) : {},
        drafts: isRecord(s.drafts) ? (s.drafts as VorhabenStateData['drafts']) : {},
        protocol: Array.isArray(s.protocol) ? (s.protocol as ProtokollEintrag[]) : [],
        lastModel: isRecord(s.lastModel) ? (s.lastModel as VorhabenStateData['lastModel']) : {},
        docDrafts: isRecord(s.docDrafts) ? (s.docDrafts as VorhabenStateData['docDrafts']) : {},
        pendingIntents: isRecord(s.pendingIntents) ? (s.pendingIntents as VorhabenStateData['pendingIntents']) : {},
      };
      this.updatedAt = parsed.updatedAt ?? this.updatedAt;
      return { existed: true, healthy: true };
    } catch (err) {
      const backup = `${this.filePath}.unrecognized-${Date.now()}`;
      console.error(
        `[VorhabenStateStore] unreadable state at ${this.filePath} (${(err as Error).message}) — backing up to ${backup}`
      );
      await fs.promises.rename(this.filePath, backup).catch(() => {});
      this.state = emptyState();
      return { existed: true, healthy: false };
    }
  }

  // ---- project-doc drafts (stage 1) ----

  /** Snapshot for the broadcast (callers must not mutate). */
  public getDocDrafts(): Record<string, ProjectDocDraft> {
    return { ...this.state.docDrafts };
  }

  public getDocDraft(projectId: string, key: ProjectDocKey): ProjectDocDraft | undefined {
    return this.state.docDrafts[docDraftKey(projectId, key)];
  }

  /** Returns true when the stored draft changed. */
  public setDocDraft(projectId: string, key: ProjectDocKey, text: string, openedMtime: number): boolean {
    const k = docDraftKey(projectId, key);
    const prev = this.state.docDrafts[k];
    if (prev && prev.text === text && prev.openedMtime === openedMtime) return false;
    this.state.docDrafts[k] = { text, openedMtime, updatedAt: this.now().toISOString() };
    this.commit();
    return true;
  }

  public clearDocDraft(projectId: string, key: ProjectDocKey): boolean {
    const k = docDraftKey(projectId, key);
    if (!(k in this.state.docDrafts)) return false;
    delete this.state.docDrafts[k];
    this.commit();
    return true;
  }

  // ---- assignments (FA-21/FA-22) ----

  public getAssignment(projectId: string, intentId: string): VorhabenAssignment | undefined {
    return this.state.assignments[assignmentKey(projectId, intentId)];
  }

  /** All assignments as `[key, assignment]` (key = `projectId::intentId`). */
  public allAssignments(): Array<[string, VorhabenAssignment]> {
    return Object.entries(this.state.assignments);
  }

  /** The newest assignment wins (FA-21) — always overwrites. */
  public setAssignment(projectId: string, intentId: string, a: VorhabenAssignment): void {
    this.state.assignments[assignmentKey(projectId, intentId)] = { ...a };
    this.commit();
  }

  /** Marks every assignment of the session as ended (FA-22); returns the number of rows touched. */
  public markSessionEnded(sessionId: string): number {
    let n = 0;
    for (const a of Object.values(this.state.assignments)) {
      if (a.sessionId === sessionId && !a.ended) {
        a.ended = true;
        n++;
      }
    }
    if (n > 0) this.commit();
    return n;
  }

  // ---- pending /intent (FA-21) ----

  public setPendingIntent(sessionId: string, p: PendingIntent): void {
    this.state.pendingIntents[sessionId] = { ...p };
    this.commit();
  }

  public getPendingIntents(): Array<[string, PendingIntent]> {
    return Object.entries(this.state.pendingIntents);
  }

  public clearPendingIntent(sessionId: string): boolean {
    if (!(sessionId in this.state.pendingIntents)) return false;
    delete this.state.pendingIntents[sessionId];
    this.commit();
    return true;
  }

  // ---- review drafts (FA-23–FA-26) ----

  public getDrafts(projectId: string, intentId: string, doc: VorhabenDocKey): Anmerkung[] {
    return [...(this.state.drafts[draftKey(projectId, intentId, doc)] ?? [])];
  }

  /** Snapshot for the broadcast: only non-empty lists, each in document order. */
  public getAllDrafts(): Record<string, Anmerkung[]> {
    const out: Record<string, Anmerkung[]> = {};
    for (const [k, list] of Object.entries(this.state.drafts)) {
      if (list.length > 0) out[k] = [...list];
    }
    return out;
  }

  /** Upsert by id; returns true when something changed. */
  public setDraft(projectId: string, intentId: string, doc: VorhabenDocKey, anmerkung: Anmerkung): boolean {
    const k = draftKey(projectId, intentId, doc);
    const list = this.state.drafts[k] ?? [];
    const idx = list.findIndex((a) => a.id === anmerkung.id);
    const next: Anmerkung = { ...anmerkung, updatedAt: this.now().toISOString() };
    if (idx >= 0) {
      const prev = list[idx];
      if (prev.text === anmerkung.text && prev.ordinal === anmerkung.ordinal && prev.ref === anmerkung.ref && prev.snippet === anmerkung.snippet) return false;
      list[idx] = next;
    } else {
      list.push(next);
    }
    list.sort(byOrdinal);
    this.state.drafts[k] = list;
    this.commit();
    return true;
  }

  public deleteDraft(projectId: string, intentId: string, doc: VorhabenDocKey, id: string): boolean {
    const k = draftKey(projectId, intentId, doc);
    const list = this.state.drafts[k];
    if (!list) return false;
    const next = list.filter((a) => a.id !== id);
    if (next.length === list.length) return false;
    if (next.length === 0) delete this.state.drafts[k];
    else this.state.drafts[k] = next;
    this.commit();
    return true;
  }

  /** Removes and returns the drafts of one document (moved into a protocol entry). */
  public takeDrafts(projectId: string, intentId: string, doc: VorhabenDocKey): Anmerkung[] {
    const k = draftKey(projectId, intentId, doc);
    const list = this.state.drafts[k] ?? [];
    delete this.state.drafts[k];
    if (list.length > 0) this.commit();
    return [...list];
  }

  // ---- protocol (FA-31/FA-32) ----

  public getProtocol(): ProtokollEintrag[] {
    return this.state.protocol.map((e) => ({ ...e, anmerkungen: [...e.anmerkungen] }));
  }

  public getProtocolEntry(id: string): ProtokollEintrag | undefined {
    const e = this.state.protocol.find((x) => x.id === id);
    return e ? { ...e, anmerkungen: [...e.anmerkungen] } : undefined;
  }

  /** Newest first. The write lands before the caller continues (FA-34: on disk before the PTY write). */
  public addProtocolEntry(entry: ProtokollEintrag): Promise<void> {
    this.state.protocol.unshift({ ...entry, anmerkungen: [...entry.anmerkungen] });
    this.commit();
    return this.writeChain;
  }

  public updateProtocolEntry(id: string, patch: Partial<Pick<ProtokollEintrag, 'status' | 'acceptedAt'>>): boolean {
    const e = this.state.protocol.find((x) => x.id === id);
    if (!e) return false;
    let changed = false;
    if (patch.status !== undefined && patch.status !== e.status) {
      e.status = patch.status;
      changed = true;
    }
    if (patch.acceptedAt !== undefined && patch.acceptedAt !== e.acceptedAt) {
      e.acceptedAt = patch.acceptedAt;
      changed = true;
    }
    if (changed) this.commit();
    return changed;
  }

  /** Undo of a just-added entry when the PTY write failed. */
  public removeProtocolEntry(id: string): boolean {
    const before = this.state.protocol.length;
    this.state.protocol = this.state.protocol.filter((e) => e.id !== id);
    if (this.state.protocol.length === before) return false;
    this.commit();
    return true;
  }

  public pendingSends(): ProtokollEintrag[] {
    return this.state.protocol.filter((e) => e.status === 'gesendet').map((e) => ({ ...e }));
  }

  // ---- last model (FA-40) ----

  public getLastModel(projectId: string, intentId: string, step: VorhabenStep): ModelSelection | undefined {
    const m = this.state.lastModel[lastModelKey(projectId, intentId, step)];
    return m ? { ...m } : undefined;
  }

  public getAllLastModels(): Record<string, ModelSelection> {
    return { ...this.state.lastModel };
  }

  public setLastModel(projectId: string, intentId: string, step: VorhabenStep, sel: ModelSelection): boolean {
    const k = lastModelKey(projectId, intentId, step);
    const prev = this.state.lastModel[k];
    if (prev && prev.providerId === sel.providerId && prev.modelId === sel.modelId) return false;
    this.state.lastModel[k] = { providerId: sel.providerId, modelId: sel.modelId };
    this.commit();
    return true;
  }

  // ---- prune ----

  /**
   * FA-32: protocol entries are dropped only when they are older than 30 days
   * AND their Vorhaben is no longer in the list (`liveKeys` = `projectId::intentId`).
   * Returns the number of removed entries.
   */
  public prune(liveKeys: Set<string>): number {
    const cutoff = this.now().getTime() - PROTOCOL_RETENTION_MS;
    const before = this.state.protocol.length;
    this.state.protocol = this.state.protocol.filter((e) => {
      if (liveKeys.has(assignmentKey(e.projectId, e.intentId))) return true;
      return new Date(e.sentAt).getTime() >= cutoff;
    });
    const removed = before - this.state.protocol.length;
    if (removed > 0) this.commit();
    return removed;
  }

  public getUpdatedAt(): string {
    return this.updatedAt;
  }

  /** Resolves once every scheduled write has landed (tests, shutdown). */
  public flush(): Promise<void> {
    return this.writeChain;
  }

  // ---- internals ----

  private commit(): void {
    this.updatedAt = this.now().toISOString();
    const snapshot: VorhabenStateFileV1 = {
      version: 1,
      port: this.port,
      updatedAt: this.updatedAt,
      state: JSON.parse(JSON.stringify(this.state)) as VorhabenStateData,
    };
    this.writeChain = this.writeChain
      .then(() => this.writeFile(snapshot))
      .catch((err) => {
        console.error('[VorhabenStateStore] write failed:', err);
      });
  }

  private async writeFile(file: VorhabenStateFileV1): Promise<void> {
    await fs.promises.mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 });
    const tmpPath = `${this.filePath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
    await fs.promises.writeFile(tmpPath, JSON.stringify(file, null, 2), { encoding: 'utf-8', mode: 0o600 });
    await fs.promises.rename(tmpPath, this.filePath);
  }
}
