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
import { isClaudeSessionModel } from '../model-config.js';
import { buildAenderungenText, buildFreigabeText, formatStandLabel, normalizeAnmerkungText } from '../../shared/vorhaben-text.js';
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
import { FIRST_INPUT_MAX_VERSUCHE, type VorhabenStateStore } from './vorhaben-state.js';
import {
  VORHABEN_DOC_FILES,
  VORHABEN_MAX_DOC_BYTES,
  assignmentKey,
  type Anmerkung,
  type ModelSelection,
  type ProtokollArt,
  type ProtokollEintrag,
  type SendeGrund,
  type VorhabenDocKey,
  type VorhabenPendingIntent,
  type VorhabenPhaseDoc,
  type VorhabenProjectInfo,
  type VorhabenRow,
  type VorhabenSessionRef,
  type VorhabenState,
  type VorhabenStateMessage,
  type VorhabenStep,
  FREITEXT_GRUND_TEXT,
  FREITEXT_MAX_CHARS,
  FREITEXT_QUEUE_MAX,
  type FreitextGrund,
  stepCommand,
} from '../../shared/types/vorhaben.protocol.js';
import type { CloudTerminalAgentStatus, CloudTerminalSessionTarget } from '../../shared/types/cloud-terminal.protocol.js';
import type { BlockKind } from '../../shared/types/hook-events.protocol.js';
import { findDialogCue, readStableScreen } from './dialog-driver.js';

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
  /** INT-2026-007 (FA-09): kind of the dialog while blocked. */
  blockKind?: BlockKind;
  modelConfig?: { model: string; provider?: string };
}

/** The slice of CloudTerminalManager the service uses (structural, so tests pass a fake). */
export interface VorhabenSessionSource {
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  getSession(sessionId: string): VorhabenSessionInfo | undefined;
  sendInput(sessionId: string, data: string, opts?: { inferUnblock?: boolean }): boolean;
  /**
   * INT-2026-007: machine writes run under the manager's single-flight lock
   * (E3/AR-08) and free text checks the screen for a dialog first. Optional in
   * the type so stage-1 test fakes keep working: without a lock the write runs
   * directly, without a screen only a waiting session may receive text.
   */
  withMachineWrite?<T>(sessionId: string, fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; grund: 'beschaeftigt' | 'nicht_aktiv' }>;
  readScreen?(sessionId: string, opts?: { scrollback?: number }): Promise<{ text: string; live: boolean }>;
  waitForIdle?(sessionId: string, idleMs: number): Promise<void>;
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
  /**
   * INT-2026-010 (FA-22): model of a step when `start-step` names none and the
   * Vorhaben has no last model for that step — the step default of the
   * settings (`getStepDefault`). Without the dep such a start is refused.
   */
  defaultModel?: (step: VorhabenStep) => ModelSelection;
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
/**
 * A queued (`eingereiht`) free text is handed to Claude right after its current
 * turn ends (`Stop`); if no `UserPromptSubmit` confirms it within this grace
 * after the Stop, it is "nicht bestätigt" (INT-2026-007, E15/H5).
 */
export const QUEUE_CONFIRM_GRACE_MS = 5_000;
// eslint-disable-next-line no-control-regex
const TEXT_CONTROL_CHARS = /[\x00-\x08\x0b-\x1f\x7f]/g;
/** Normalises a free text for the PTY (line ends, control chars, trailing blanks, length). */
function cleanText(rawText: string): string {
  return rawText.replace(/\r\n?/g, '\n').replace(TEXT_CONTROL_CHARS, '').replace(/[ \t]+$/gm, '').trimEnd().slice(0, FREITEXT_MAX_CHARS);
}
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

export { buildAenderungenText, buildFreigabeText, formatStandLabel, normalizeAnmerkungText };

export class VorhabenError extends Error {
  constructor(
    public readonly code: 'UNKNOWN_PROJECT' | 'UNKNOWN_VORHABEN' | 'UNKNOWN_SESSION' | 'NOT_FOUND' | 'TOO_LARGE' | 'IO_ERROR' | 'INVALID_MESSAGE' | 'START_FAILED',
    message: string
  ) {
    super(message);
  }
}

export class SendRejectedError extends Error {
  constructor(
    public readonly grund: FreitextGrund,
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
  /** Sessions whose first input is being delivered right now (two Stops in a row must not paste twice). */
  private readonly deliveringFirstInput = new Set<string>();
  private seq = 0;
  private counter = 0;

  constructor(private readonly deps: VorhabenServiceDeps) {
    this.readerFs = deps.readerFs ?? nodeReaderFs;
    this.listWorktrees = deps.listWorktrees ?? listRepoWorktrees;
    this.watcher = deps.watcher ?? new VorhabenWatcher();
    this.worktreeTtlMs = deps.worktreeTtlMs ?? 5000;
    this.now = deps.now ?? ((): Date => new Date());
    this.timeZone = deps.timeZone ?? process.env.SPECWRIGHT_TZ ?? 'Europe/Berlin';
    // INT-2026-012 (D1): a step starts `/specwright:<step> …` — only a Claude session can run it.
    this.resolveModel = deps.resolveModel ?? ((sel): boolean => isClaudeSessionModel(sel.providerId, sel.modelId));
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
      pendingIntents: this.pendingIntentInfos(),
      ansicht: this.deps.store.getAnsicht(),
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
    // `eingereiht` waits for the session's current turn, not for a deploy (R-16).
    return this.deps.store.pendingSends().some((e) => e.status === 'gesendet' && now - new Date(e.sentAt).getTime() < SEND_CONFIRM_TIMEOUT_MS);
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

    const written = await this.pasteLocked(sessions, ref.id, text);
    if (written !== true) {
      this.deps.store.removeProtocolEntry(entry.id);
      throw this.rejected(written);
    }
    if (art === 'aenderungen') this.deps.store.takeDrafts(projectId, intentId, doc);
    this.armConfirmTimer(entry.id, SEND_CONFIRM_TIMEOUT_MS);
    this.broadcastState();
    return entry;
  }

  /**
   * Free text from the Gespräch (INT-2026-007, FA-06/FA-11, AN-S09): pasted as
   * one bracketed-paste block plus Enter, unchanged (a leading `/` or `!` is
   * what the user typed). Allowed while the session waits (`gesendet`) or
   * works (`eingereiht`, at most FREITEXT_QUEUE_MAX); refused while a dialog
   * is open (reason per block kind), after the session ended, and — fail
   * closed — whenever the screen shows a dialog cue or cannot be read while
   * the session works.
   */
  public async sendText(projectId: string, intentId: string, rawText: string): Promise<{ entry: ProtokollEintrag; status: 'gesendet' | 'eingereiht' }> {
    const text = cleanText(rawText);
    if (!text.trim()) throw this.rejected('text_leer');
    const row = this.requireRow(projectId, intentId);
    return this.sendToSession(projectId, intentId, row.session, text);
  }

  /**
   * INT-2026-008 (AK-02): free text into a session addressed by id — a pending
   * `/intent` session without a folder. The id is only a key into the store:
   * the session must be assigned to a Vorhaben of this project (folder just
   * appeared — then the row's id is used) or be a pending intent of this
   * project; anything else is UNKNOWN_SESSION. No `await` between the lookup
   * and the protocol entry, so a claim in between is impossible (plan §3.3).
   */
  public async sendTextToSession(projectId: string, sessionId: string, rawText: string): Promise<{ entry: ProtokollEintrag; status: 'gesendet' | 'eingereiht' }> {
    const text = cleanText(rawText);
    if (!text.trim()) throw this.rejected('text_leer');
    if (!this.findProject(projectId)) throw new VorhabenError('UNKNOWN_PROJECT', 'Projekt ist nicht geöffnet');
    const assigned = this.deps.store.allAssignments().find(([key, a]) => a.sessionId === sessionId && key.startsWith(`${projectId}::`));
    if (assigned) {
      const intentId = assigned[0].slice(projectId.length + 2);
      const row = this.findRow(projectId, intentId);
      return this.sendToSession(projectId, intentId, row?.session ?? this.sessionFor(projectId, intentId), text);
    }
    const pending = this.deps.store.getPendingIntents().find(([id, p]) => id === sessionId && p.projectId === projectId);
    if (!pending) throw new VorhabenError('UNKNOWN_SESSION', 'Sitzung ist keine anhängige Absicht dieses Projekts');
    return this.sendToSession(projectId, undefined, this.sessionRefOf(sessionId, this.pendingName(sessionId), pending[1].model), text);
  }

  /** Shared core of sendText/sendTextToSession: status rules, queue limit, protocol entry, locked paste. */
  private async sendToSession(projectId: string, intentId: string | undefined, ref: VorhabenSessionRef | undefined, text: string): Promise<{ entry: ProtokollEintrag; status: 'gesendet' | 'eingereiht' }> {
    const sessions = this.deps.sessions;
    if (!sessions || !ref) throw this.rejected('keine_sitzung');
    if (ref.ended) throw this.rejected('beendet');
    const session = sessions.getSession(ref.id);
    if (!session || session.status !== 'active') throw this.rejected('beendet');
    let status: 'gesendet' | 'eingereiht';
    switch (session.agentStatus) {
      case 'working':
        status = 'eingereiht';
        break;
      case 'blocked':
        throw this.rejected(session.blockKind === 'rueckfrage' ? 'rueckfrage_offen' : session.blockKind === 'plan' ? 'plan_offen' : 'berechtigung');
      case 'error':
        throw this.rejected('beendet');
      default:
        status = 'gesendet';
    }
    if (status === 'eingereiht') {
      const queued = this.deps.store.pendingSends().filter((e) => e.sessionId === ref.id && e.status === 'eingereiht').length;
      if (queued >= FREITEXT_QUEUE_MAX) throw this.rejected('warteschlange_voll');
    }
    const sentAt = this.now();
    const entry: ProtokollEintrag = {
      id: `pe-${sentAt.getTime()}-${++this.counter}`,
      projectId,
      ...(intentId ? { intentId } : {}),
      art: 'freitext',
      anzahl: 0,
      stand: '',
      sessionId: ref.id,
      sessionName: ref.name,
      text,
      anmerkungen: [],
      status,
      sentAt: sentAt.toISOString(),
    };
    await this.deps.store.addProtocolEntry(entry);
    const written = await this.pasteLocked(sessions, ref.id, text, status === 'eingereiht' ? 'working' : 'waiting');
    if (written !== true) {
      this.deps.store.removeProtocolEntry(entry.id);
      throw this.rejected(written);
    }
    if (status === 'gesendet') this.armConfirmTimer(entry.id, SEND_CONFIRM_TIMEOUT_MS);
    this.broadcastState();
    return { entry, status };
  }

  /** Removes a queued free text from the protocol (E15); Claude's own queue cannot be changed. Returns the session id. */
  public discardQueued(entryId: string): string | undefined {
    const e = this.deps.store.getProtocolEntry(entryId);
    if (!e || e.status !== 'eingereiht') return undefined;
    const t = this.confirmTimers.get(entryId);
    if (t) clearTimeout(t);
    this.confirmTimers.delete(entryId);
    if (this.deps.store.removeProtocolEntry(entryId)) this.broadcastState();
    return e.sessionId;
  }

  /**
   * One logical write = bracketed paste, settle, Enter — under the manager's
   * machine-write lock when it has one (E3/G2). Before the paste the screen is
   * read: a dialog cue means nothing is pasted (E4). `mode`: `waiting` (the
   * status says idle/done/unknown — without a readable screen the paste still
   * happens, no dialog is possible after a finished turn), `working` (queueing
   * needs a live screen without cue; otherwise `kein_bildschirm`).
   */
  private pasteLocked(sessions: VorhabenSessionSource, sessionId: string, text: string, mode: 'waiting' | 'working' = 'waiting'): Promise<true | FreitextGrund> {
    let resolvePasted: (r: true | FreitextGrund) => void = () => {};
    const pasted = new Promise<true | FreitextGrund>((resolve) => {
      resolvePasted = resolve;
    });
    // Screen check + paste; resolves the caller as soon as the paste is written.
    // Enter follows after the settle pause and only then the lock is released,
    // so no other machine write can slip between paste and Enter.
    const run = async (): Promise<void> => {
      if (sessions.readScreen) {
        const screen = await readStableScreen(
          { readScreen: (id, o) => sessions.readScreen!(id, o), waitForIdle: (id, ms) => sessions.waitForIdle?.(id, ms) ?? Promise.resolve() },
          sessionId
        );
        if (screen === 'unstable') {
          if (mode === 'working') return resolvePasted('kein_bildschirm');
        } else if (screen.live) {
          if (findDialogCue(screen.text)) return resolvePasted('dialog_offen');
        } else if (mode === 'working') {
          return resolvePasted('kein_bildschirm');
        }
      } else if (mode === 'working') {
        return resolvePasted('kein_bildschirm');
      }
      if (!sessions.sendInput(sessionId, PASTE_START + text + PASTE_END, { inferUnblock: false })) return resolvePasted('senden_fehlgeschlagen');
      resolvePasted(true);
      await new Promise<void>((done) => {
        const t = setTimeout(() => {
          sessions.sendInput(sessionId, '\r', { inferUnblock: false });
          done();
        }, PASTE_ENTER_DELAY_MS);
        t.unref?.();
      });
    };
    if (!sessions.withMachineWrite) {
      void run();
    } else {
      void sessions.withMachineWrite(sessionId, run).then((result) => {
        if (!result.ok) resolvePasted(result.grund === 'beschaeftigt' ? 'beschaeftigt' : 'beendet');
      });
    }
    return pasted;
  }

  /**
   * Starts the next step as a server-side session (FA-35): the command is the
   * initial prompt, the tab is named `<step> INT-…`, the session is assigned.
   * `/intent` has no id yet — the first new folder under cwd/intent/ claims it.
   *
   * INT-2026-010: `model` may be absent (FA-22 „Freigeben" without a session)
   * — then the last model of (Vorhaben, step), else the step default of the
   * settings (`deps.defaultModel`). `firstInput` is stored and handed to the
   * session at its first Stop (AK-09/FA-11, FA-22; `onAgentEvent`).
   */
  public async startStep(
    projectId: string,
    intentId: string | undefined,
    step: VorhabenStep,
    modelRaw: ModelSelection | undefined,
    sessionTargetRaw: CloudTerminalSessionTarget | undefined,
    firstInput?: string
  ): Promise<{ sessionId: string }> {
    const sessions = this.deps.sessions;
    if (!sessions) throw new VorhabenError('START_FAILED', 'Terminal-Manager nicht verfügbar');
    const project = this.findProject(projectId);
    if (!project) throw new VorhabenError('UNKNOWN_PROJECT', 'Projekt ist nicht geöffnet');
    if (step !== 'intent') {
      if (!intentId) throw new VorhabenError('INVALID_MESSAGE', 'intentId ist erforderlich');
      this.requireRow(projectId, intentId);
    }
    let model = modelRaw;
    if (!model) {
      model = (intentId ? this.deps.store.getLastModel(projectId, intentId, step) : undefined) ?? this.deps.defaultModel?.(step);
      if (!model || !this.resolveModel(model)) {
        throw new VorhabenError('INVALID_MESSAGE', `Kein Modell für ${step} konfiguriert — Projekt › Einstellungen › Modelle`);
      }
    } else if (!this.resolveModel(model)) {
      throw new VorhabenError('INVALID_MESSAGE', `Modell nicht konfiguriert oder keine Claude-Sitzung: ${model.providerId}/${model.modelId}`);
    }
    let target: ParsedTarget;
    try {
      target = parseSessionTarget(sessionTargetRaw ?? { kind: 'main' });
    } catch (err) {
      throw new VorhabenError('INVALID_MESSAGE', err instanceof SessionTargetError ? err.message : 'ungültiges Sitzungsziel');
    }
    const command = stepCommand(step, intentId);
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
    // The text waits for the first Stop (a paste right after the start would hit the startup screen, plan §3 Alternativen).
    if (firstInput !== undefined) this.deps.store.setFirstInput(created.sessionId, { text: firstInput, versuche: 0 });
    this.scheduleRescan(0);
    return { sessionId: created.sessionId };
  }

  /**
   * INT-2026-010 (FA-03, FA-12; AR-05): shared view state. `filterProjectId`
   * must be an open project or null; the phase entry names an open project,
   * an `INT-…` id (checked by the handler) and one of the phase documents.
   * One atomic write per click, answer = the broadcast (like drafts).
   */
  public setAnsicht(patch: { filterProjectId?: string | null; phase?: { projectId: string; intentId: string; doc: VorhabenPhaseDoc } }): void {
    if (patch.filterProjectId !== undefined && patch.filterProjectId !== null && !this.findProject(patch.filterProjectId)) {
      throw new VorhabenError('UNKNOWN_PROJECT', 'Projekt ist nicht geöffnet');
    }
    if (patch.phase && !this.findProject(patch.phase.projectId)) throw new VorhabenError('UNKNOWN_PROJECT', 'Projekt ist nicht geöffnet');
    const changed = this.deps.store.setAnsicht({
      ...(patch.filterProjectId !== undefined ? { filterProjectId: patch.filterProjectId } : {}),
      ...(patch.phase ? { phase: { key: assignmentKey(patch.phase.projectId, patch.phase.intentId), doc: patch.phase.doc } } : {}),
    });
    if (changed) this.broadcastState();
  }

  // ---- internals ----

  private rejected(grund: FreitextGrund, currentStand?: number): SendRejectedError {
    const text = (SEND_REASON_TEXT as Record<string, string>)[grund] ?? FREITEXT_GRUND_TEXT[grund];
    return new SendRejectedError(grund, text, currentStand);
  }

  private attachSessions(sessions: VorhabenSessionSource): void {
    sessions.on('session.agent-event', (sessionId, event) => this.onAgentEvent(String(sessionId), String(event)));
    sessions.on('session.closed', (sessionId) => this.onSessionClosed(String(sessionId)));
    sessions.on('session.prompt-text', (sessionId, prompt) => this.onPromptText(String(sessionId), typeof prompt === 'string' ? prompt : ''));
  }

  private isAssigned(sessionId: string): boolean {
    return this.deps.store.allAssignments().some(([, a]) => a.sessionId === sessionId);
  }

  /** INT-2026-008: a `/intent` session still waiting for its folder. */
  private isPending(sessionId: string): boolean {
    return this.deps.store.getPendingIntents().some(([id]) => id === sessionId);
  }

  /** Tab name of a session as the workspace knows it; `intent` for a pending `/intent` session. */
  private pendingName(sessionId: string): string {
    return (this.deps.workspace.getState().sessionNames ?? {})[sessionId] ?? 'intent';
  }

  /**
   * INT-2026-008 (AK-05): pending `/intent` sessions for the state, oldest
   * first (the order `onDirAdded` claims in). Copy label from the last scan's
   * project info or the directory name — no scan needed.
   */
  private pendingIntentInfos(): VorhabenPendingIntent[] {
    const out: VorhabenPendingIntent[] = [];
    for (const [sessionId, p] of this.deps.store.getPendingIntents()) {
      const info = this.projects.find((x) => x.id === p.projectId);
      const arbeitskopie = info && safeKey(info.path) === safeKey(p.cwd) ? info.arbeitskopie : basename(p.cwd);
      out.push({ sessionId, projectId: p.projectId, cwd: p.cwd, arbeitskopie, since: p.since, session: this.sessionRefOf(sessionId, this.pendingName(sessionId), p.model) });
    }
    return out.sort((a, b) => (a.since < b.since ? -1 : a.since > b.since ? 1 : 0));
  }

  private onAgentEvent(sessionId: string, event: string): void {
    if (event === 'stop' || event === 'stop-failure') {
      // Queued texts are handed over right after this turn; without a confirming
      // UserPromptSubmit within the grace they are "nicht bestätigt" (E15/H5).
      for (const e of this.deps.store.pendingSends()) {
        if (e.sessionId === sessionId && e.status === 'eingereiht' && !this.confirmTimers.has(e.id)) this.armConfirmTimer(e.id, QUEUE_CONFIRM_GRACE_MS);
      }
      // INT-2026-010: the first Stop is the first safe moment for the stored first input (AK-09, FA-22).
      if (this.deps.store.hasFirstInput(sessionId)) void this.deliverFirstInput(sessionId);
    }
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
    // Assigned sessions may have written documents → rescan; a pending
    // `/intent` session has no folder yet → only the state (INT-2026-008).
    if (this.isAssigned(sessionId)) this.scheduleRescan(0);
    else if (this.isPending(sessionId)) this.broadcastState();
  }

  private onSessionClosed(sessionId: string): void {
    const changed = this.deps.store.markSessionEnded(sessionId);
    const pendingCleared = this.deps.store.clearPendingIntent(sessionId);
    // A session that ended before its first Stop never gets the first input (INT-2026-010, review E18).
    this.deps.store.clearFirstInput(sessionId);
    // Ended without a folder: its unclaimed free texts would stay invisible forever (INT-2026-008, R-2).
    if (pendingCleared) this.deps.store.dropUnclaimedProtocol(sessionId);
    this.promptTextSeq.delete(sessionId);
    if (changed > 0) this.scheduleRescan(0);
    else if (pendingCleared) this.broadcastState();
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
      this.broadcastState();
    }
  }

  /** `/intent` session claims the first new folder that appears under its cwd (FA-21). */
  private onDirAdded(cwd: string, intentId: string): void {
    const key = safeKey(cwd);
    for (const [sessionId, p] of this.deps.store.getPendingIntents()) {
      if (safeKey(p.cwd) !== key) continue;
      this.deps.store.clearPendingIntent(sessionId);
      this.deps.store.setAssignment(p.projectId, intentId, { sessionId, step: 'intent', model: p.model, cwd, at: this.now().toISOString() });
      // The interview sent from the project page moves into the Vorhaben's protocol (INT-2026-008, AK-03).
      this.deps.store.claimPendingProtocol(sessionId, intentId);
      break;
    }
  }

  /**
   * INT-2026-010 (plan §3 „Erste Eingabe", reviews E1/E7/E18): hands the
   * stored first input to the session through the normal send path (protocol
   * entry, locked paste, confirmation). `gesendet` and `eingereiht` both count
   * as delivered → cleared, never sent twice. A refusal because the session is
   * gone clears too; any other refusal keeps the text for the next Stop, up to
   * FIRST_INPUT_MAX_VERSUCHE — then the text lands in the protocol as
   * `nicht_bestaetigt`, visible in the Gespräch, resendable from there.
   */
  private async deliverFirstInput(sessionId: string): Promise<void> {
    if (this.deliveringFirstInput.has(sessionId)) return;
    const input = this.deps.store.getFirstInput(sessionId);
    if (!input) return;
    this.deliveringFirstInput.add(sessionId);
    try {
      const ref = this.firstInputTarget(sessionId);
      if (!ref) {
        // Neither assigned nor pending: the session is not ours any more.
        if (this.deps.store.clearFirstInput(sessionId)) this.broadcastState();
        return;
      }
      const versuche = this.deps.store.bumpFirstInputVersuche(sessionId);
      try {
        await this.sendToSession(ref.projectId, ref.intentId, ref.session, input.text);
        this.deps.store.clearFirstInput(sessionId);
        this.broadcastState();
      } catch (err) {
        const grund = err instanceof SendRejectedError ? err.grund : 'senden_fehlgeschlagen';
        if (grund === 'beendet' || grund === 'keine_sitzung') {
          this.deps.store.clearFirstInput(sessionId);
          this.broadcastState();
          return;
        }
        if (versuche < FIRST_INPUT_MAX_VERSUCHE) {
          // The refused entry was removed again; clients that saw the interim snapshot get the clean one.
          this.broadcastState();
          return;
        }
        this.deps.store.clearFirstInput(sessionId);
        const sentAt = this.now();
        await this.deps.store.addProtocolEntry({
          id: `pe-${sentAt.getTime()}-${++this.counter}`,
          projectId: ref.projectId,
          ...(ref.intentId ? { intentId: ref.intentId } : {}),
          art: 'freitext',
          anzahl: 0,
          stand: '',
          sessionId,
          sessionName: ref.session.name,
          text: input.text,
          anmerkungen: [],
          status: 'nicht_bestaetigt',
          sentAt: sentAt.toISOString(),
        });
        this.broadcastState();
      }
    } finally {
      this.deliveringFirstInput.delete(sessionId);
    }
  }

  /** Vorhaben (assignment) or pending `/intent` the session belongs to, with its live reference. */
  private firstInputTarget(sessionId: string): { projectId: string; intentId?: string; session: VorhabenSessionRef } | undefined {
    const assigned = this.deps.store.allAssignments().find(([, a]) => a.sessionId === sessionId && !a.ended);
    if (assigned) {
      const [projectId, intentId] = assigned[0].split('::');
      const row = this.findRow(projectId, intentId);
      const session = row?.session ?? this.sessionFor(projectId, intentId);
      return session ? { projectId, intentId, session } : undefined;
    }
    const pending = this.deps.store.getPendingIntents().find(([id]) => id === sessionId);
    if (!pending) return undefined;
    return { projectId: pending[1].projectId, session: this.sessionRefOf(sessionId, this.pendingName(sessionId), pending[1].model) };
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
    return this.sessionRefOf(a.sessionId, names[a.sessionId] ?? `${a.step} ${intentId}`, a.model, a.ended);
  }

  /** Session reference from the live manager state; without a live session: ended (input locked). */
  private sessionRefOf(sessionId: string, name: string, model: string, ended?: boolean): VorhabenSessionRef {
    const live = this.deps.sessions?.getSession(sessionId);
    if (ended || !live || live.status === 'closed') {
      return { id: sessionId, name, model, agentStatus: 'unknown', ended: true };
    }
    return {
      id: sessionId,
      name,
      model: live.modelConfig?.model ?? model,
      agentStatus: live.agentStatus ?? 'unknown',
      ...(live.blockKind ? { blockKind: live.blockKind } : {}),
      // INT-2026-010: only the flag travels, never the text.
      ...(this.deps.store.hasFirstInput(sessionId) ? { firstInputPending: true } : {}),
    };
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
