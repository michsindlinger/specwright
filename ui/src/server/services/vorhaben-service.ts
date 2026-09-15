/**
 * VorhabenService — builds the `vorhaben:state` snapshot for every open
 * project (and its worktrees), keeps it fresh through the watcher and
 * broadcasts it after each change (INT-2026-004).
 *
 * Stage 1: overview, reader, project docs. Stage 2 (this file now): session
 * assignment (FA-21/22), the review channel — answers pasted into the waiting
 * PTY as bracketed paste + Enter (FA-27–FA-34) — and starting the next step
 * as a server-side session (FA-35/40/42).
 *
 * Project identity is the workspace store (server side); client-supplied
 * paths are never read directly (security.md §6). Prompt text from the hook
 * is compared in memory only and never persisted or broadcast.
 */

import * as fs from 'fs';
import { basename, join } from 'path';
import { listRepoWorktrees, pathKey, type RepoWorktreeInfo } from '../utils/git-worktree-list.js';
import { parseSessionTarget, SessionTargetError, type ParsedTarget } from '../utils/session-target.js';
import { sanitizeInjectText } from '../utils/plan-dialog-state.js';
import { getModel } from '../model-config.js';
import {
  designDirOf,
  docPathOf,
  mergeCandidates,
  nodeReaderFs,
  scanCopy,
  toRow,
  VorhabenParseCache,
  type ReaderFs,
  type ScanCopy,
  type VorhabenCandidate,
} from './vorhaben-reader.js';
import { VorhabenWatcher } from './vorhaben-watcher.js';
import type { VorhabenStateStore } from './vorhaben-state.js';
import {
  ANMERKUNG_MAX_CHARS,
  VORHABEN_DOC_FILES,
  VORHABEN_MAX_DOC_BYTES,
  assignmentKey,
  type Anmerkung,
  type ModelSelection,
  type ProtokollArt,
  type ProtokollEintrag,
  type SendeGrund,
  type VorhabenDocKey,
  type VorhabenProjectInfo,
  type VorhabenRow,
  type VorhabenSessionRef,
  type VorhabenState,
  type VorhabenStateMessage,
  type VorhabenStep,
} from '../../shared/types/vorhaben.protocol.js';
import type { CloudTerminalAgentStatus, CloudTerminalSessionTarget } from '../../shared/types/cloud-terminal.protocol.js';

export interface VorhabenWorkspaceSource {
  getState(): { openProjects: Array<{ id: string; path: string; name: string }>; sessionNames?: Record<string, string> };
}

/** The slice of CloudTerminalSession the service reads. */
export interface VorhabenSessionInfo {
  sessionId: string;
  status: string;
  projectPath: string;
  effectiveCwd: string;
  agentStatus?: CloudTerminalAgentStatus;
  modelConfig?: { model: string; provider?: string };
}

/** The slice of CloudTerminalManager the service uses (structural, so tests pass a fake). */
export interface VorhabenSessionSource {
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  getSession(sessionId: string): VorhabenSessionInfo | undefined;
  sendInput(sessionId: string, data: string, opts?: { inferUnblock?: boolean }): boolean;
  createSession(
    projectPath: string,
    terminalType: 'claude-code',
    modelConfig: { model: string; provider?: string },
    cols: undefined,
    rows: undefined,
    initialPrompt: string,
    extraCliArgs: undefined,
    extraEnv: undefined,
    options: { sessionTarget?: ParsedTarget }
  ): Promise<{ sessionId: string; effectiveCwd: string }>;
}

export interface VorhabenServiceDeps {
  workspace: VorhabenWorkspaceSource;
  store: VorhabenStateStore;
  broadcast: (message: { type: string }) => void;
  listWorktrees?: (mainProjectPath: string) => Promise<RepoWorktreeInfo>;
  readerFs?: ReaderFs;
  watcher?: VorhabenWatcher;
  /** Stage 2: the terminal manager. Without it the view is read-only (tests of stage 1). */
  sessions?: VorhabenSessionSource;
  /** Stage 2: tab name for a started step (WorkspaceHandler.setSessionName, broadcasts). */
  setSessionName?: (sessionId: string, name: string) => void;
  /** Stage 2: validates a model selection against the settings; default = model-config. */
  resolveModel?: (sel: ModelSelection) => boolean;
  now?: () => Date;
  /** Worktree list cache TTL. */
  worktreeTtlMs?: number;
  /** Time zone for the "Stand" in sent texts. */
  timeZone?: string;
}

const DESIGN_FILE_RE = /^[A-Za-z0-9._-]{1,120}\.(png|jpe?g|svg|webp|gif)$/i;
const ANY_DESIGN_FILE_RE = /^[A-Za-z0-9._ -]{1,120}$/;
const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  gif: 'image/gif',
};
const MAX_DESIGN_BYTES = 5 * 1024 * 1024;

/** Bracketed paste (xterm.js does the same when the user pastes). */
export const PASTE_START = '\x1b[200~';
export const PASTE_END = '\x1b[201~';
/** Pause between the paste block and Enter, so the REPL has consumed the block. */
export const PASTE_ENTER_DELAY_MS = 150;
/** After this the entry is "nicht bestätigt" and the deploy gate opens again (FA-31/FA-34). */
export const SEND_CONFIRM_TIMEOUT_MS = 10_000;
/** How long after `prompt-submitted` we still wait for the prompt text before using the fallback. */
const PROMPT_TEXT_GRACE_MS = 100;

/** `/spec INT-2026-004`, `/specwright:plan INT-…`, `/intent` (FA-21). */
export const V4_COMMAND_RE = /^\s*\/(?:specwright:)?(intent|spec|plan|build)(?:\s+(INT-\d{4}-\d{3}))?\b/;

export function detectV4Command(prompt: string): { step: VorhabenStep; intentId?: string } | undefined {
  const m = V4_COMMAND_RE.exec(prompt);
  if (!m) return undefined;
  const step = m[1] as VorhabenStep;
  return m[2] ? { step, intentId: m[2] } : { step };
}

/** `JJJJ-MM-TT HH:MM` in the configured zone (spec FA-27/FA-28). */
export function formatStandLabel(ms: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(ms));
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

/**
 * FA-33: an Anmerkung is one line inside the one input — control characters
 * out (sanitizeInjectText), line breaks and runs of whitespace → one space,
 * capped at 4 000 characters.
 */
export function normalizeAnmerkungText(text: string): string {
  return sanitizeInjectText(text).replace(/\s+/g, ' ').trim().slice(0, ANMERKUNG_MAX_CHARS);
}

/** `Änderungen zu spec.md (Stand 2026-09-15 16:42):` + `n. [Bezug] Text` per Anmerkung (FA-27). */
export function buildAenderungenText(doc: VorhabenDocKey, standLabel: string, anmerkungen: Anmerkung[]): string {
  const head = `Änderungen zu ${VORHABEN_DOC_FILES[doc]} (${standLabel}):`;
  const lines = anmerkungen.map((a, i) => `${i + 1}. [${normalizeAnmerkungText(a.ref) || 'Dokument gesamt'}] ${normalizeAnmerkungText(a.text)}`);
  return [head, ...lines].join('\n');
}

/** `Freigabe: intent.md 1.2.0` · `Freigabe: spec.md (Stand …)` (FA-28). */
export function buildFreigabeText(doc: VorhabenDocKey, standLabel: string): string {
  return doc === 'intent' && !standLabel.startsWith('Stand ')
    ? `Freigabe: ${VORHABEN_DOC_FILES[doc]} ${standLabel}`
    : `Freigabe: ${VORHABEN_DOC_FILES[doc]} (${standLabel})`;
}

export class VorhabenError extends Error {
  constructor(
    public readonly code: 'UNKNOWN_PROJECT' | 'UNKNOWN_VORHABEN' | 'NOT_FOUND' | 'TOO_LARGE' | 'IO_ERROR' | 'INVALID_MESSAGE' | 'START_FAILED',
    message: string
  ) {
    super(message);
  }
}

export class SendRejectedError extends Error {
  constructor(
    public readonly grund: SendeGrund,
    message: string,
    public readonly currentStand?: number
  ) {
    super(message);
  }
}

const SEND_REASON_TEXT: Record<SendeGrund, string> = {
  keine_sitzung: 'keine Sitzung zu diesem Vorhaben — nächsten Schritt starten',
  arbeitet: 'Sitzung arbeitet — warten',
  dialog: 'Sitzung wartet im Terminal (Dialog) — im Terminal antworten',
  beendet: 'Sitzung beendet — nächsten Schritt starten',
  stand_veraltet: 'Dokument geändert — neu laden',
  kein_review_dokument: 'kein Review-Dokument — Freigabe nicht möglich',
  keine_anmerkungen: 'keine Anmerkungen zu diesem Dokument',
  senden_fehlgeschlagen: 'Eingabe konnte nicht in die Sitzung geschrieben werden',
};

export class VorhabenService {
  private rows: VorhabenRow[] = [];
  private projects: VorhabenProjectInfo[] = [];
  private loading = true;
  private updatedAt: string;
  private readonly cache = new VorhabenParseCache();
  private readonly readerFs: ReaderFs;
  private readonly watcher: VorhabenWatcher;
  private readonly listWorktrees: (p: string) => Promise<RepoWorktreeInfo>;
  private readonly worktreeCache = new Map<string, { at: number; info: RepoWorktreeInfo }>();
  private readonly worktreeTtlMs: number;
  private readonly now: () => Date;
  private readonly timeZone: string;
  private readonly resolveModel: (sel: ModelSelection) => boolean;
  private scanTimer: NodeJS.Timeout | null = null;
  private scanning: Promise<void> | null = null;
  private scanDirty = false;
  private lastScanAt = 0;
  private stopped = false;
  /** Protocol entry id → confirmation timer. */
  private readonly confirmTimers = new Map<string, NodeJS.Timeout>();
  /** Session id → sequence number of its last prompt text (fallback confirmation, see onAgentEvent). */
  private readonly promptTextSeq = new Map<string, number>();
  private seq = 0;
  private counter = 0;

  constructor(private readonly deps: VorhabenServiceDeps) {
    this.readerFs = deps.readerFs ?? nodeReaderFs;
    this.listWorktrees = deps.listWorktrees ?? listRepoWorktrees;
    this.watcher = deps.watcher ?? new VorhabenWatcher();
    this.worktreeTtlMs = deps.worktreeTtlMs ?? 5000;
    this.now = deps.now ?? ((): Date => new Date());
    this.timeZone = deps.timeZone ?? process.env.SPECWRIGHT_TZ ?? 'Europe/Berlin';
    this.resolveModel = deps.resolveModel ?? ((sel): boolean => !!getModel(sel.providerId, sel.modelId));
    this.updatedAt = this.now().toISOString();
    this.watcher.on('changed', () => this.scheduleRescan());
    this.watcher.on('dir-added', (cwd: string, intentId: string) => this.onDirAdded(cwd, intentId));
    if (deps.sessions) this.attachSessions(deps.sessions);
  }

  /** First full scan; resolves when the snapshot is complete (FA-07 measures this). */
  public async start(): Promise<void> {
    // A send that was pending when the backend went down can no longer be
    // confirmed by a hook we missed: settle it so the deploy gate opens (FA-34).
    for (const e of this.deps.store.pendingSends()) {
      const age = this.now().getTime() - new Date(e.sentAt).getTime();
      if (age >= SEND_CONFIRM_TIMEOUT_MS) this.deps.store.updateProtocolEntry(e.id, { status: 'nicht_bestaetigt' });
      else this.armConfirmTimer(e.id, SEND_CONFIRM_TIMEOUT_MS - age);
    }
    await this.rescan();
  }

  public stop(): void {
    this.stopped = true;
    if (this.scanTimer) clearTimeout(this.scanTimer);
    for (const t of this.confirmTimers.values()) clearTimeout(t);
    this.confirmTimers.clear();
    this.watcher.close();
  }

  public getState(): VorhabenState {
    return {
      rows: [...this.rows],
      projects: [...this.projects],
      docDrafts: this.deps.store.getDocDrafts(),
      drafts: this.deps.store.getAllDrafts(),
      protocol: this.deps.store.getProtocol(),
      lastModel: this.deps.store.getAllLastModels(),
      loading: this.loading,
      updatedAt: this.updatedAt,
    };
  }

  public stateMessage(): VorhabenStateMessage {
    return { type: 'vorhaben:state', state: this.getState(), timestamp: this.now().toISOString() };
  }

  public broadcastState(): void {
    this.deps.broadcast(this.stateMessage());
  }

  /** Coalesces rescans (watcher bursts, workspace changes) into one run. */
  public scheduleRescan(delayMs = 100): void {
    if (this.stopped) return;
    if (this.scanTimer) clearTimeout(this.scanTimer);
    this.scanTimer = setTimeout(() => {
      this.scanTimer = null;
      void this.rescan();
    }, delayMs);
  }

  /** Rescan when the snapshot is older than `maxAgeMs` (used by vorhaben:get). */
  public rescanIfStale(maxAgeMs = 5000): void {
    if (Date.now() - this.lastScanAt > maxAgeMs) this.scheduleRescan(0);
  }

  public async rescan(): Promise<void> {
    if (this.scanning) {
      this.scanDirty = true;
      return this.scanning;
    }
    this.scanning = this.runScan().finally(() => {
      this.scanning = null;
      if (this.scanDirty) {
        this.scanDirty = false;
        this.scheduleRescan(0);
      }
    });
    return this.scanning;
  }

  public findRow(projectId: string, intentId: string): VorhabenRow | undefined {
    return this.rows.find((r) => r.projectId === projectId && r.intentId === intentId);
  }

  public findProject(projectId: string): { id: string; path: string; name: string } | undefined {
    return this.deps.workspace.getState().openProjects.find((p) => p.id === projectId);
  }

  public async readDoc(projectId: string, intentId: string, doc: VorhabenDocKey): Promise<{ content: string; mtimeMs: number }> {
    const row = this.requireRow(projectId, intentId);
    const p = docPathOf(row, doc);
    let st: fs.Stats;
    try {
      st = await fs.promises.stat(p);
    } catch {
      throw new VorhabenError('NOT_FOUND', `${basename(p)} fehlt`);
    }
    if (st.size > VORHABEN_MAX_DOC_BYTES) throw new VorhabenError('TOO_LARGE', `${basename(p)} ist größer als 1 MB`);
    try {
      return { content: await fs.promises.readFile(p, 'utf-8'), mtimeMs: st.mtimeMs };
    } catch (err) {
      throw new VorhabenError('IO_ERROR', (err as Error).message);
    }
  }

  /** Image under design/ as data URL; non-images → null (name only, FA-17). */
  public async readDesign(projectId: string, intentId: string, file: string): Promise<string | null> {
    if (!ANY_DESIGN_FILE_RE.test(file) || file.startsWith('.')) throw new VorhabenError('INVALID_MESSAGE', 'ungültiger Dateiname');
    const row = this.requireRow(projectId, intentId);
    if (!row.designFiles.includes(file)) throw new VorhabenError('NOT_FOUND', `${file} fehlt`);
    if (!DESIGN_FILE_RE.test(file)) return null;
    const dir = designDirOf(row);
    const p = join(dir, file);
    let real: string;
    let realDir: string;
    try {
      real = await fs.promises.realpath(p);
      realDir = await fs.promises.realpath(dir);
    } catch {
      throw new VorhabenError('NOT_FOUND', `${file} fehlt`);
    }
    if (!real.startsWith(realDir + '/')) throw new VorhabenError('INVALID_MESSAGE', 'Pfad außerhalb von design/');
    const st = await fs.promises.stat(real);
    if (st.size > MAX_DESIGN_BYTES) throw new VorhabenError('TOO_LARGE', `${file} ist größer als 5 MB`);
    const ext = file.split('.').pop()!.toLowerCase();
    const buf = await fs.promises.readFile(real);
    return `data:${MIME[ext]};base64,${buf.toString('base64')}`;
  }

  // ---- stage 2: review channel ----

  /** Deploy gate (FA-34): a sent answer whose confirmation is still outstanding. */
  public hasPendingSend(): boolean {
    const now = this.now().getTime();
    return this.deps.store.pendingSends().some((e) => now - new Date(e.sentAt).getTime() < SEND_CONFIRM_TIMEOUT_MS);
  }

  /**
   * Hands one input to the waiting session (FA-27/FA-28): checks (FA-29/30),
   * builds the text (server is the source of the drafts), writes the protocol
   * entry to disk, then bracketed paste + Enter into the PTY.
   */
  public async send(projectId: string, intentId: string, doc: VorhabenDocKey, art: ProtokollArt, stand: number): Promise<ProtokollEintrag> {
    const row = this.requireRow(projectId, intentId);
    const sessions = this.deps.sessions;
    const ref = row.session;
    if (!sessions || !ref) throw this.rejected('keine_sitzung');
    if (ref.ended) throw this.rejected('beendet');
    const session = sessions.getSession(ref.id);
    if (!session || session.status !== 'active') throw this.rejected('beendet');
    switch (session.agentStatus) {
      case 'working':
        throw this.rejected('arbeitet');
      case 'blocked':
        throw this.rejected('dialog');
      case 'error':
        throw this.rejected('beendet');
      default:
        break;
    }
    const info = row.docs.find((d) => d.key === doc);
    if (!info) throw new VorhabenError('NOT_FOUND', `${VORHABEN_DOC_FILES[doc]} fehlt`);
    let currentStand = info.mtimeMs;
    try {
      currentStand = (await fs.promises.stat(docPathOf(row, doc))).mtimeMs;
    } catch {
      throw new VorhabenError('NOT_FOUND', `${VORHABEN_DOC_FILES[doc]} fehlt`);
    }

    let anmerkungen: Anmerkung[] = [];
    let text: string;
    const standLabel = doc === 'intent' && info.version ? info.version : `Stand ${formatStandLabel(stand, this.timeZone)}`;
    if (art === 'freigabe') {
      if (row.reviewDoc !== doc || row.phase === 'pr') throw this.rejected('kein_review_dokument');
      if (Math.floor(stand) !== Math.floor(currentStand)) throw this.rejected('stand_veraltet', currentStand);
      text = buildFreigabeText(doc, standLabel);
    } else {
      anmerkungen = this.deps.store.getDrafts(projectId, intentId, doc);
      if (anmerkungen.length === 0) throw this.rejected('keine_anmerkungen');
      text = buildAenderungenText(doc, standLabel, anmerkungen);
    }

    const sentAt = this.now();
    const entry: ProtokollEintrag = {
      id: `pe-${sentAt.getTime()}-${++this.counter}`,
      projectId,
      intentId,
      doc,
      art,
      anzahl: art === 'aenderungen' ? anmerkungen.length : 0,
      stand: standLabel.replace(/^Stand /, ''),
      sessionId: ref.id,
      sessionName: ref.name,
      text,
      anmerkungen,
      status: 'gesendet',
      sentAt: sentAt.toISOString(),
    };
    // On disk before the PTY write: a restart in between finds the entry and
    // settles it as "nicht bestätigt" instead of losing it (FA-34).
    await this.deps.store.addProtocolEntry(entry);

    const written = sessions.sendInput(ref.id, PASTE_START + text + PASTE_END, { inferUnblock: false });
    if (!written) {
      this.deps.store.removeProtocolEntry(entry.id);
      throw this.rejected('senden_fehlgeschlagen');
    }
    const enter = setTimeout(() => sessions.sendInput(ref.id, '\r', { inferUnblock: false }), PASTE_ENTER_DELAY_MS);
    enter.unref?.();
    if (art === 'aenderungen') this.deps.store.takeDrafts(projectId, intentId, doc);
    this.armConfirmTimer(entry.id, SEND_CONFIRM_TIMEOUT_MS);
    this.broadcastState();
    return entry;
  }

  /**
   * Starts the next step as a server-side session (FA-35): the command is the
   * initial prompt, the tab is named `<step> INT-…`, the session is assigned.
   * `/intent` has no id yet — the first new folder under cwd/intent/ claims it.
   */
  public async startStep(
    projectId: string,
    intentId: string | undefined,
    step: VorhabenStep,
    model: ModelSelection,
    sessionTargetRaw: CloudTerminalSessionTarget | undefined
  ): Promise<{ sessionId: string }> {
    const sessions = this.deps.sessions;
    if (!sessions) throw new VorhabenError('START_FAILED', 'Terminal-Manager nicht verfügbar');
    const project = this.findProject(projectId);
    if (!project) throw new VorhabenError('UNKNOWN_PROJECT', 'Projekt ist nicht geöffnet');
    if (step !== 'intent') {
      if (!intentId) throw new VorhabenError('INVALID_MESSAGE', 'intentId ist erforderlich');
      this.requireRow(projectId, intentId);
    }
    if (!this.resolveModel(model)) throw new VorhabenError('INVALID_MESSAGE', `Modell nicht konfiguriert: ${model.providerId}/${model.modelId}`);
    let target: ParsedTarget;
    try {
      target = parseSessionTarget(sessionTargetRaw ?? { kind: 'main' });
    } catch (err) {
      throw new VorhabenError('INVALID_MESSAGE', err instanceof SessionTargetError ? err.message : 'ungültiges Sitzungsziel');
    }
    const command = step === 'intent' ? '/intent' : `/${step} ${intentId}`;
    let created: { sessionId: string; effectiveCwd: string };
    try {
      created = await sessions.createSession(
        project.path,
        'claude-code',
        { model: model.modelId, provider: model.providerId },
        undefined,
        undefined,
        command,
        undefined,
        undefined,
        { sessionTarget: target }
      );
    } catch (err) {
      throw new VorhabenError('START_FAILED', (err as Error).message);
    }
    const at = this.now().toISOString();
    this.deps.setSessionName?.(created.sessionId, step === 'intent' ? 'intent' : `${step} ${intentId}`);
    if (intentId) {
      this.deps.store.setAssignment(projectId, intentId, { sessionId: created.sessionId, step, model: model.modelId, cwd: created.effectiveCwd, at });
      this.deps.store.setLastModel(projectId, intentId, step, model);
    } else {
      this.deps.store.setPendingIntent(created.sessionId, { projectId, cwd: created.effectiveCwd, step: 'intent', model: model.modelId, since: at });
    }
    this.scheduleRescan(0);
    return { sessionId: created.sessionId };
  }

  // ---- internals ----

  private rejected(grund: SendeGrund, currentStand?: number): SendRejectedError {
    return new SendRejectedError(grund, SEND_REASON_TEXT[grund], currentStand);
  }

  private attachSessions(sessions: VorhabenSessionSource): void {
    sessions.on('session.agent-event', (sessionId, event) => this.onAgentEvent(String(sessionId), String(event)));
    sessions.on('session.closed', (sessionId) => this.onSessionClosed(String(sessionId)));
    sessions.on('session.prompt-text', (sessionId, prompt) => this.onPromptText(String(sessionId), typeof prompt === 'string' ? prompt : ''));
  }

  private isAssigned(sessionId: string): boolean {
    return this.deps.store.allAssignments().some(([, a]) => a.sessionId === sessionId);
  }

  private onAgentEvent(sessionId: string, event: string): void {
    if (event === 'prompt-submitted') {
      // The prompt text follows the event within the same hook request. Give it
      // a moment; only an old CLI without `prompt` falls back to "any input".
      // Sequence numbers, not clocks: both arrive in the same millisecond.
      const at = ++this.seq;
      const t = setTimeout(() => {
        const seen = this.promptTextSeq.get(sessionId) ?? 0;
        if (seen > at) return;
        const pending = this.deps.store.pendingSends().filter((e) => e.sessionId === sessionId);
        const oldest = pending[pending.length - 1];
        if (oldest) this.confirm(oldest.id);
      }, PROMPT_TEXT_GRACE_MS);
      t.unref?.();
    }
    if (this.isAssigned(sessionId)) this.scheduleRescan(0);
  }

  private onSessionClosed(sessionId: string): void {
    const changed = this.deps.store.markSessionEnded(sessionId);
    this.deps.store.clearPendingIntent(sessionId);
    this.promptTextSeq.delete(sessionId);
    if (changed > 0) this.scheduleRescan(0);
  }

  private onPromptText(sessionId: string, prompt: string): void {
    this.promptTextSeq.set(sessionId, ++this.seq);
    // Confirmation (FA-31): first line of the sent text === first line of the prompt.
    const firstLine = prompt.split('\n', 1)[0].trim();
    for (const e of this.deps.store.pendingSends()) {
      if (e.sessionId === sessionId && e.text.split('\n', 1)[0].trim() === firstLine) {
        this.confirm(e.id);
        break;
      }
    }
    // Assignment (FA-21): a v4 command typed by hand.
    const cmd = detectV4Command(prompt);
    if (!cmd) return;
    const session = this.deps.sessions?.getSession(sessionId);
    if (!session) return;
    const project = this.projectOfPath(session.projectPath);
    if (!project) return;
    const model = session.modelConfig?.model ?? '';
    if (cmd.intentId) {
      this.deps.store.clearPendingIntent(sessionId);
      this.deps.store.setAssignment(project.id, cmd.intentId, { sessionId, step: cmd.step, model, cwd: session.effectiveCwd, at: this.now().toISOString() });
      this.scheduleRescan(0);
    } else if (cmd.step === 'intent') {
      this.deps.store.setPendingIntent(sessionId, { projectId: project.id, cwd: session.effectiveCwd, step: 'intent', model, since: this.now().toISOString() });
    }
  }

  /** `/intent` session claims the first new folder that appears under its cwd (FA-21). */
  private onDirAdded(cwd: string, intentId: string): void {
    const key = safeKey(cwd);
    for (const [sessionId, p] of this.deps.store.getPendingIntents()) {
      if (safeKey(p.cwd) !== key) continue;
      this.deps.store.clearPendingIntent(sessionId);
      this.deps.store.setAssignment(p.projectId, intentId, { sessionId, step: 'intent', model: p.model, cwd, at: this.now().toISOString() });
      break;
    }
  }

  private confirm(entryId: string): void {
    const t = this.confirmTimers.get(entryId);
    if (t) clearTimeout(t);
    this.confirmTimers.delete(entryId);
    if (this.deps.store.updateProtocolEntry(entryId, { status: 'angenommen', acceptedAt: this.now().toISOString() })) this.broadcastState();
  }

  private armConfirmTimer(entryId: string, delayMs: number): void {
    const t = setTimeout(() => {
      this.confirmTimers.delete(entryId);
      if (this.deps.store.updateProtocolEntry(entryId, { status: 'nicht_bestaetigt' })) this.broadcastState();
    }, delayMs);
    t.unref?.();
    this.confirmTimers.set(entryId, t);
  }

  private projectOfPath(p: string): { id: string; path: string; name: string } | undefined {
    const key = safeKey(p);
    return this.deps.workspace.getState().openProjects.find((x) => safeKey(x.path) === key);
  }

  /** Session reference of a row (FA-13/FA-22/FA-42): assignment + live status. */
  private sessionFor(projectId: string, intentId: string): VorhabenSessionRef | undefined {
    const a = this.deps.store.getAssignment(projectId, intentId);
    if (!a) return undefined;
    const names = this.deps.workspace.getState().sessionNames ?? {};
    const name = names[a.sessionId] ?? `${a.step} ${intentId}`;
    const live = this.deps.sessions?.getSession(a.sessionId);
    if (a.ended || !live || live.status === 'closed') {
      return { id: a.sessionId, name, model: a.model, agentStatus: 'unknown', ended: true };
    }
    return { id: a.sessionId, name, model: live.modelConfig?.model ?? a.model, agentStatus: live.agentStatus ?? 'unknown' };
  }

  /** Copy per intentId that wins the merge (FA-06): the assigned session's cwd. */
  private preferredCwdFor(projectId: string): Map<string, string> {
    const out = new Map<string, string>();
    for (const [key, a] of this.deps.store.allAssignments()) {
      const [pid, intentId] = key.split('::');
      if (pid === projectId && intentId) out.set(intentId, a.cwd);
    }
    return out;
  }

  private requireRow(projectId: string, intentId: string): VorhabenRow {
    if (!this.findProject(projectId)) throw new VorhabenError('UNKNOWN_PROJECT', 'Projekt ist nicht geöffnet');
    const row = this.findRow(projectId, intentId);
    if (!row) throw new VorhabenError('UNKNOWN_VORHABEN', `${intentId} nicht gefunden`);
    return row;
  }

  private async worktreesOf(projectPath: string): Promise<RepoWorktreeInfo> {
    const hit = this.worktreeCache.get(projectPath);
    if (hit && Date.now() - hit.at < this.worktreeTtlMs) return hit.info;
    const info = await this.listWorktrees(projectPath);
    this.worktreeCache.set(projectPath, { at: Date.now(), info });
    return info;
  }

  private async runScan(): Promise<void> {
    const projects = this.deps.workspace.getState().openProjects;
    const rows: VorhabenRow[] = [];
    const infos: VorhabenProjectInfo[] = [];
    const allCwds = new Set<string>();
    const livePaths = new Set<string>();

    await Promise.all(
      projects.map(async (project) => {
        const info: VorhabenProjectInfo = {
          id: project.id,
          path: project.path,
          name: project.name,
          arbeitskopie: '',
          worktrees: [],
          hasIntentDir: false,
        };
        const copies: ScanCopy[] = [];
        try {
          const wt = await this.worktreesOf(project.path);
          const ownKey = safeKey(project.path);
          const own = wt.entries.find((e) => safeKey(e.path) === ownKey);
          info.arbeitskopie = own?.branch ?? '';
          copies.push({ cwd: project.path, arbeitskopie: info.arbeitskopie });
          for (const e of wt.entries) {
            if (e.bare || e.prunable || safeKey(e.path) === ownKey) continue;
            const label = e.branch ?? basename(e.path);
            info.worktrees.push(label);
            copies.push({ cwd: e.path, arbeitskopie: label });
          }
        } catch (err) {
          info.error = (err as Error).message;
          copies.push({ cwd: project.path, arbeitskopie: '' });
        }
        const candidates: VorhabenCandidate[] = [];
        for (const copy of copies) {
          allCwds.add(copy.cwd);
          try {
            const found = scanCopy(copy, this.readerFs, this.cache);
            if (copy.cwd === project.path) info.hasIntentDir = this.readerFs.stat(join(copy.cwd, 'intent'))?.isDirectory() ?? false;
            candidates.push(...found);
          } catch (err) {
            if (copy.cwd === project.path) info.error = `intent/ nicht lesbar: ${(err as Error).message}`;
          }
        }
        for (const c of candidates) for (const d of c.docs) livePaths.add(docPathOf(c, d.key));
        for (const c of mergeCandidates(candidates, this.preferredCwdFor(project.id))) {
          const row = toRow(project, c, this.sessionFor(project.id, c.intentId));
          if (row) rows.push(row);
        }
        infos.push(info);
      })
    );

    // Stable order: projects as opened, rows by intentId within a project (client sorts by state).
    const order = new Map(projects.map((p, i) => [p.id, i]));
    infos.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    rows.sort((a, b) => (order.get(a.projectId) ?? 0) - (order.get(b.projectId) ?? 0) || a.intentId.localeCompare(b.intentId));

    this.cache.prune(livePaths);
    this.deps.store.prune(new Set(rows.map((r) => assignmentKey(r.projectId, r.intentId))));
    this.rows = rows;
    this.projects = infos;
    this.loading = false;
    this.lastScanAt = Date.now();
    this.updatedAt = this.now().toISOString();
    if (!this.stopped) this.watcher.setCopies([...allCwds]);
    this.broadcastState();
  }
}

function safeKey(p: string): string {
  try {
    return pathKey(p);
  } catch {
    return p;
  }
}
