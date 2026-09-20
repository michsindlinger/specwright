/**
 * VorhabenStateStore — user state of the Vorhaben view, one file per backend
 * (`<runtime>/vorhaben-<port>.json`, ADR-0002). Same durability as the
 * workspace store: versioned JSON, serialized atomic writes (tmp+rename,
 * 0600), unreadable file renamed aside.
 *
 * Stage 1 (INT-2026-004) used `docDrafts` (FA-47). Stage 2 fills the rest:
 * session assignments (FA-21/22), review drafts (FA-26), the protocol of
 * sent answers (FA-31/32), the last model per step (FA-40) and pending
 * `/intent` sessions waiting for their folder. INT-2026-010 adds the shared
 * view state (`ansicht`: project chip, phase document per Vorhaben — AR-05)
 * and the first input per started session (`firstInputs`, handed over at the
 * session's first Stop). INT-2026-019 adds three optional fields to the
 * assignment — `provider`, `claudeSessionId`, `resumed` — so a session lost to
 * a crash can be resumed (`claude --resume`) and the reaper can tell whether a
 * worktree is the home of an open Vorhaben (`hasOpenAssignmentIn`). The file
 * format stayed the same (`version: 1`); every map is optional on load.
 */

import * as fs from 'fs';
import { dirname } from 'path';
import { pathKey } from '../utils/git-worktree-list.js';
import {
  assignmentKey,
  draftKey,
  lastModelKey,
  type Anmerkung,
  type ModelSelection,
  type ProjectDocDraft,
  type ProjectDocKey,
  type ProtokollEintrag,
  type VorhabenAnsicht,
  type VorhabenDocKey,
  type VorhabenPhaseDoc,
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
  /** INT-2026-019: Provider des Modells, damit die Wiederaufnahme dieselbe CLI baut (fehlt bei Zuordnungen vor 019 → 'anthropic'). */
  provider?: string;
  /** INT-2026-019: Claude-Gesprächskennung (UUID) aus dem SessionStart-Hook; nur als `--resume`-Argument und Dateiname der Existenzprüfung genutzt. */
  claudeSessionId?: string;
  /** INT-2026-019 (OF-02): gesetzt, wenn diese Sitzung eine verlorene fortsetzt. */
  resumed?: { at: string; von: string; stand?: string };
}

/** `/intent` without id: the first new folder under `cwd/intent/` after `since` claims it (FA-21). */
export interface PendingIntent {
  projectId: string;
  cwd: string;
  step: VorhabenStep;
  model: string;
  since: string;
  /** INT-2026-019: provider of the model (carried into the assignment once the folder appears). */
  provider?: string;
  /** INT-2026-022 (FA-14): working title from the first line of the „Neue Absicht" text (≤ 80 chars); absent for hand-typed `/intent`. */
  arbeitstitel?: string;
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
  /** INT-2026-010: shared view state (FA-03, FA-12). */
  ansicht: VorhabenAnsicht;
  /** INT-2026-010: sessionId → first input waiting for the session's first Stop (AK-09, FA-22). */
  firstInputs: Record<string, FirstInput>;
}

/** Text handed to a started session at its first Stop; `versuche` counts refused deliveries (max 3, plan §3). */
export interface FirstInput {
  text: string;
  versuche: number;
}

export const FIRST_INPUT_MAX_VERSUCHE = 3;

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
  return { assignments: {}, drafts: {}, protocol: [], lastModel: {}, docDrafts: {}, pendingIntents: {}, ansicht: emptyAnsicht(), firstInputs: {} };
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function emptyAnsicht(): VorhabenAnsicht {
  return { filterProjectId: null, phase: {} };
}

/** Tolerant read of a stored `ansicht` (older files have none; a broken value falls back to the default). */
function readAnsicht(v: unknown): VorhabenAnsicht {
  if (!isRecord(v)) return emptyAnsicht();
  const filterProjectId = typeof v.filterProjectId === 'string' ? v.filterProjectId : null;
  const phase: Record<string, VorhabenPhaseDoc> = {};
  if (isRecord(v.phase)) {
    for (const [k, d] of Object.entries(v.phase)) if (typeof d === 'string') phase[k] = d as VorhabenPhaseDoc;
  }
  return { filterProjectId, phase };
}

function readFirstInputs(v: unknown): Record<string, FirstInput> {
  const out: Record<string, FirstInput> = {};
  if (!isRecord(v)) return out;
  for (const [k, e] of Object.entries(v)) {
    if (isRecord(e) && typeof e.text === 'string') out[k] = { text: e.text, versuche: typeof e.versuche === 'number' ? e.versuche : 0 };
  }
  return out;
}

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
        ansicht: readAnsicht(s.ansicht),
        firstInputs: readFirstInputs(s.firstInputs),
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

  /**
   * INT-2026-016 (AK-08): the session moved on to another Vorhaben — every
   * other row it was assigned to loses it (the old row shows „ruht", not
   * „Sitzung beendet": the session lives) and the new row gets it. One commit.
   */
  public moveAssignment(sessionId: string, projectId: string, intentId: string, a: VorhabenAssignment): void {
    const key = assignmentKey(projectId, intentId);
    for (const [k, v] of Object.entries(this.state.assignments)) {
      if (k !== key && v.sessionId === sessionId) delete this.state.assignments[k];
    }
    this.state.assignments[key] = { ...a };
    this.commit();
  }

  /** INT-2026-016 (AK-08): drops every assignment of the session (it starts something new, `/intent`); returns the number removed. */
  public clearAssignmentsOfSession(sessionId: string): number {
    let n = 0;
    for (const [k, v] of Object.entries(this.state.assignments)) {
      if (v.sessionId === sessionId) {
        delete this.state.assignments[k];
        n++;
      }
    }
    if (n > 0) this.commit();
    return n;
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

  /**
   * INT-2026-019 (AK-01): the Claude session id a hook reported for the
   * session — written into every assignment of that session; one commit,
   * only when something changed. Returns the number of assignments touched.
   */
  public setSessionContext(sessionId: string, ctx: { claudeSessionId: string }): number {
    let n = 0;
    for (const a of Object.values(this.state.assignments)) {
      if (a.sessionId === sessionId && a.claudeSessionId !== ctx.claudeSessionId) {
        a.claudeSessionId = ctx.claudeSessionId;
        n++;
      }
    }
    if (n > 0) this.commit();
    return n;
  }

  /**
   * INT-2026-019 (AK-07): is `cwd` the home of an open Vorhaben — some
   * assignment that is not ended and whose `cwd` names the same directory?
   * Keys through `pathKey` (realpath with fallback, never throws), so a
   * symlinked worktree matches the stored, already normalised `cwd`.
   */
  public hasOpenAssignmentIn(cwd: string): boolean {
    const key = pathKey(cwd);
    return Object.values(this.state.assignments).some((a) => !a.ended && pathKey(a.cwd) === key);
  }

  /** INT-2026-019 (backfill in `VorhabenService.start`): open assignments that carry no Claude session id yet. */
  public assignmentsWithoutContext(): Array<[string, VorhabenAssignment]> {
    return Object.entries(this.state.assignments).filter(([, a]) => !a.ended && !a.claudeSessionId);
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

  /**
   * INT-2026-008: the first new folder claimed this pending `/intent` session —
   * its entries without a Vorhaben get the id (one-time transition; other
   * sessions' entries are untouched). Returns the number of entries changed.
   */
  public claimPendingProtocol(sessionId: string, intentId: string): number {
    let n = 0;
    for (const e of this.state.protocol) {
      if (e.sessionId === sessionId && !e.intentId) {
        e.intentId = intentId;
        n++;
      }
    }
    if (n > 0) this.commit();
    return n;
  }

  /** INT-2026-008: a pending `/intent` session ended without a folder — its unclaimed entries would stay invisible forever. */
  public dropUnclaimedProtocol(sessionId: string): number {
    const before = this.state.protocol.length;
    this.state.protocol = this.state.protocol.filter((e) => !(e.sessionId === sessionId && !e.intentId));
    const removed = before - this.state.protocol.length;
    if (removed > 0) this.commit();
    return removed;
  }

  /** Entries still waiting for Claude's confirmation: `gesendet` (10-s timer) and `eingereiht` (queued, INT-2026-007). */
  public pendingSends(): ProtokollEintrag[] {
    return this.state.protocol.filter((e) => e.status === 'gesendet' || e.status === 'eingereiht').map((e) => ({ ...e }));
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

  // ---- view state (INT-2026-010, FA-03/FA-12, AR-05) ----

  /** Snapshot for the broadcast (callers must not mutate). */
  public getAnsicht(): VorhabenAnsicht {
    return { filterProjectId: this.state.ansicht.filterProjectId, phase: { ...this.state.ansicht.phase } };
  }

  /** Returns true when something changed. `filterProjectId: undefined` = leave as is. */
  public setAnsicht(patch: { filterProjectId?: string | null; phase?: { key: string; doc: VorhabenPhaseDoc } }): boolean {
    let changed = false;
    if (patch.filterProjectId !== undefined && patch.filterProjectId !== this.state.ansicht.filterProjectId) {
      this.state.ansicht.filterProjectId = patch.filterProjectId;
      changed = true;
    }
    if (patch.phase && this.state.ansicht.phase[patch.phase.key] !== patch.phase.doc) {
      this.state.ansicht.phase[patch.phase.key] = patch.phase.doc;
      changed = true;
    }
    if (changed) this.commit();
    return changed;
  }

  // ---- first input (INT-2026-010, AK-09/FA-22) ----

  public getFirstInput(sessionId: string): FirstInput | undefined {
    const e = this.state.firstInputs[sessionId];
    return e ? { ...e } : undefined;
  }

  public hasFirstInput(sessionId: string): boolean {
    return sessionId in this.state.firstInputs;
  }

  public setFirstInput(sessionId: string, input: FirstInput): void {
    this.state.firstInputs[sessionId] = { ...input };
    this.commit();
  }

  /** Counts one refused delivery; returns the new count. */
  public bumpFirstInputVersuche(sessionId: string): number {
    const e = this.state.firstInputs[sessionId];
    if (!e) return 0;
    e.versuche += 1;
    this.commit();
    return e.versuche;
  }

  public clearFirstInput(sessionId: string): boolean {
    if (!(sessionId in this.state.firstInputs)) return false;
    delete this.state.firstInputs[sessionId];
    this.commit();
    return true;
  }

  // ---- prune ----

  /**
   * FA-32: protocol entries are dropped only when they are older than 30 days
   * AND their Vorhaben is no longer in the list (`liveKeys` = `projectId::intentId`).
   * INT-2026-010 (review E14): chosen phase documents of Vorhaben that are no
   * longer in the list go at once. Returns the number of removed entries
   * (protocol plus phase entries).
   */
  public prune(liveKeys: Set<string>): number {
    const cutoff = this.now().getTime() - PROTOCOL_RETENTION_MS;
    const before = this.state.protocol.length;
    this.state.protocol = this.state.protocol.filter((e) => {
      // Entries of a pending `/intent` session (no intentId yet) never match a live key → 30-day net.
      if (e.intentId && liveKeys.has(assignmentKey(e.projectId, e.intentId))) return true;
      return new Date(e.sentAt).getTime() >= cutoff;
    });
    let removed = before - this.state.protocol.length;
    for (const key of Object.keys(this.state.ansicht.phase)) {
      if (!liveKeys.has(key)) {
        delete this.state.ansicht.phase[key];
        removed++;
      }
    }
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
