/**
 * GespraechService (INT-2026-007, FA-01–FA-07): the conversation of a
 * claude-code cloud session as the Vorhaben page shows it.
 *
 * Two sources, clear roles (plan §3): the hooks the manager already receives
 * deliver Beiträge and dialogs in real time (`session.beitrag`,
 * `session.dialog`, `session.agent-event`); the transcript file Claude Code
 * writes delivers history, timestamps, work blocks and results
 * (`TranscriptTailer`). Hook Beiträge are replaced by their transcript record
 * (same text within ±30 s, `uuid` wins) — never shown twice.
 *
 * One dialog state per session, keyed by `tool_use_id` (PreToolUse and the
 * transcript share that id space, measured 16.09.) or `seq:<n>` for
 * permissions without a tool call. Closed ids never reopen (monotony, E1);
 * the transcript's result wins over a hook's; a card whose session ended is
 * `verfallen` (Ablauf L).
 *
 * Security (security.md §6, review E8): the transcript path comes only from a
 * token-protected hook, must lie under `<configDir>/projects/<slug>/` of an
 * allow-listed config dir, be named `<session_id>.jsonl`, and its records must
 * carry the session's `cwd`. The reader never reads another project's file.
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { Beitrag, BeitragQuelle, DialogKarte, GespraechDelta, GespraechSnapshot, HookBeitrag, HookContext, HookDialog, HookDialogClosed, VerlaufInfo } from '../../shared/types/gespraech.protocol.js';
import type { ProtokollEintrag } from '../../shared/types/vorhaben.protocol.js';
import { TranscriptTailer, buildVerlauf, type TranscriptEntry } from './transcript-reader.js';

/** The slice of CloudTerminalManager the service uses (structural, so tests pass a fake). */
export interface GespraechSessionInfo {
  sessionId: string;
  status: string;
  terminalType?: string;
  effectiveCwd: string;
  agentStatus?: string;
  blockKind?: string;
  transcriptPath?: string;
  claudeSessionId?: string;
  restored?: boolean;
}

export interface GespraechManagerSource {
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  getSession(sessionId: string): GespraechSessionInfo | undefined;
  /** Used to unstick a `blocked` status when the transcript shows the dialog was answered in the terminal (FA-14). */
  reportAgentEvent(sessionId: string, event: 'user-input'): boolean;
  nextDialogSeq(sessionId: string): string;
}

/** Protocol entries of the Vorhaben store: to label a Nutzer-Beitrag `ui` / `leser` (G8). */
export interface GespraechProtocolSource {
  pendingSends(): ProtokollEintrag[];
  getProtocol(): ProtokollEintrag[];
}

export interface GespraechServiceDeps {
  manager: GespraechManagerSource;
  protocol?: GespraechProtocolSource;
  /** Allow-listed Claude config dirs (`~/.claude`, `~/.claude-<provider>` …). Default: from `configDirs()`. */
  configDirs?: () => string[];
  /** Factory for tests. */
  tailerFactory?: (p: string) => TranscriptTailer;
  now?: () => Date;
  /** Grace after the first prompt before "Persistenz aus" is reported (ms). */
  persistenceGraceMs?: number;
  /** Grace after which a hook-open dialog without transcript record and without `blocked` is closed as unknown (ms). */
  dialogGraceMs?: number;
  homedir?: string;
}

/** Hook Beitrag and transcript record match when their text is equal within this window. */
const MERGE_WINDOW_MS = 30_000;
/** A UI/reader protocol entry labels a Nutzer-Beitrag when sent within this window (G8). */
const QUELLE_WINDOW_MS = 15_000;
/** Version check: after this many records, none understood → format unknown. */
const VERSION_CHECK_AFTER = 50;
/** Defect ratio in the tailer window that switches to `nur_echtzeit` (H8). */
const DEFECT_RATIO = 0.1;
/** PermissionRequest attaches to a PreToolUse dialog of the same kind opened within this window (both orders observed). */
const ATTACH_WINDOW_MS = 5_000;

interface SessionGespraech {
  sessionId: string;
  sitzung: 'aktiv' | 'beendet';
  verlauf: VerlaufInfo;
  transcriptPath?: string;
  claudeSessionId?: string;
  tailer?: TranscriptTailer;
  entries: TranscriptEntry[];
  /** Hook-only Beiträge (not yet in the transcript). */
  hookBeitraege: Array<Beitrag & { atMs: number }>;
  hookSeq: number;
  /** Dialogs by id, in opening order. */
  dialogs: Map<string, DialogKarte & { openedAt: number; hookOnly: boolean }>;
  dialogOrder: string[];
  closedIds: Set<string>;
  /** Protocol entry ids already used as a source label. */
  quelleUsed: Set<string>;
  /** Source labels by transcript/hook Beitrag id. */
  quelleById: Map<string, BeitragQuelle>;
  firstPromptAt?: number;
  persistenceTimer?: NodeJS.Timeout;
  dialogTimers: Map<string, NodeJS.Timeout>;
  cwdChecked: boolean;
  lastSent: Map<string, string>;
  lastMeta?: string;
  mitgelesenAb: string;
}

/** `~/.claude` and `~/.claude-<providerId>` for the configured providers (as provider-env.ts builds them). */
export function defaultConfigDirs(providerIds: string[], homedir: string = os.homedir()): string[] {
  const dirs = new Set<string>([path.join(homedir, '.claude')]);
  for (const id of providerIds) if (id && id !== 'anthropic' && /^[A-Za-z0-9_-]+$/.test(id)) dirs.add(path.join(homedir, `.claude-${id}`));
  return [...dirs];
}

/**
 * Lexical allow-list check of a transcript path (the file may not exist yet —
 * it is created with the first prompt). `realpath` of the directory is checked
 * once the file exists (see `checkTranscriptDir`).
 */
export function transcriptPathAllowed(p: string, claudeSessionId: string | undefined, configDirs: string[]): { ok: true } | { ok: false; grund: string } {
  if (!path.isAbsolute(p)) return { ok: false, grund: 'Transkriptpfad nicht absolut' };
  const norm = path.normalize(p);
  if (path.basename(norm) !== `${claudeSessionId ?? ''}.jsonl` || !claudeSessionId) return { ok: false, grund: 'Transkriptdatei passt nicht zur Claude-Sitzung' };
  const inAllowed = configDirs.some((dir) => {
    const root = path.join(path.normalize(dir), 'projects') + path.sep;
    if (!norm.startsWith(root)) return false;
    const rel = norm.slice(root.length).split(path.sep);
    return rel.length === 2 && rel[0].length > 0 && !rel[0].startsWith('.');
  });
  if (!inAllowed) return { ok: false, grund: 'Transkriptpfad außerhalb der erlaubten Config-Verzeichnisse' };
  return { ok: true };
}

const sameDir = (a: string, b: string): boolean => {
  const real = (p: string): string => {
    try {
      return fs.realpathSync(p);
    } catch {
      return path.normalize(p);
    }
  };
  return real(a) === real(b);
};

export class GespraechService extends EventEmitter {
  private readonly sessions = new Map<string, SessionGespraech>();
  private readonly now: () => Date;
  private readonly configDirs: () => string[];
  private readonly tailerFactory: (p: string) => TranscriptTailer;
  private readonly persistenceGraceMs: number;
  private readonly dialogGraceMs: number;

  constructor(private readonly deps: GespraechServiceDeps) {
    super();
    this.now = deps.now ?? ((): Date => new Date());
    this.configDirs = deps.configDirs ?? ((): string[] => defaultConfigDirs([], deps.homedir));
    this.tailerFactory = deps.tailerFactory ?? ((p): TranscriptTailer => new TranscriptTailer(p));
    this.persistenceGraceMs = deps.persistenceGraceMs ?? 10_000;
    this.dialogGraceMs = deps.dialogGraceMs ?? 60_000;
    const m = deps.manager;
    m.on('session.hook-context', (sessionId, ctx) => this.onHookContext(String(sessionId), ctx as HookContext));
    m.on('session.dialog', (sessionId, change) => this.onDialog(String(sessionId), change as { open: HookDialog } | { closed: HookDialogClosed }));
    m.on('session.beitrag', (sessionId, b) => this.onBeitrag(String(sessionId), b as HookBeitrag & { at: Date }));
    m.on('session.agent-event', (sessionId, event, detail) => this.onAgentEvent(String(sessionId), String(event), (detail ?? {}) as { status?: string }));
    m.on('session.closed', (sessionId) => this.onSessionClosed(String(sessionId)));
  }

  public stop(): void {
    for (const s of this.sessions.values()) this.teardown(s);
    this.sessions.clear();
  }

  // ---- public API ----

  /** Snapshot of a session's Gespräch; undefined when the manager does not know the session. */
  public snapshot(sessionId: string): GespraechSnapshot | undefined {
    const s = this.ensure(sessionId);
    if (!s) return undefined;
    const beitraege = this.compose(s);
    s.lastSent = new Map(beitraege.map((b) => [b.id, JSON.stringify(b)]));
    s.lastMeta = this.metaKey(s);
    return {
      sessionId,
      sitzung: s.sitzung,
      verlauf: { ...s.verlauf },
      ...(s.claudeSessionId ? { claudeSessionId: s.claudeSessionId } : {}),
      beitraege,
      ...(this.openDialogId(s) ? { offenerDialog: this.openDialogId(s) } : {}),
      eingereiht: this.eingereihtOf(s),
    };
  }

  /** Changes since the last snapshot/delta of this session (upserts by id). */
  public takeDelta(sessionId: string): GespraechDelta | undefined {
    const s = this.sessions.get(sessionId);
    if (!s) return undefined;
    const beitraege = this.compose(s);
    const upsert: Beitrag[] = [];
    const seen = new Set<string>();
    for (const b of beitraege) {
      const json = JSON.stringify(b);
      seen.add(b.id);
      if (s.lastSent.get(b.id) !== json) upsert.push(b);
    }
    const remove = [...s.lastSent.keys()].filter((id) => !seen.has(id));
    s.lastSent = new Map(beitraege.map((b) => [b.id, JSON.stringify(b)]));
    const meta = this.metaKey(s);
    const metaChanged = meta !== s.lastMeta;
    s.lastMeta = meta;
    const open = this.openDialogId(s);
    return {
      upsert,
      remove,
      ...(metaChanged ? { sitzung: s.sitzung, verlauf: { ...s.verlauf }, offenerDialog: open ?? null, eingereiht: this.eingereihtOf(s) } : {}),
    };
  }

  /** Re-evaluates a session (queued count from the protocol changed, etc.) and notifies subscribers. */
  public touch(sessionId: string): void {
    const s = this.ensure(sessionId);
    if (s) this.changed(s);
  }

  /** Queued (`eingereiht`) free texts of a session, from the Vorhaben protocol (H10). */
  private eingereihtOf(s: SessionGespraech): number {
    return (this.deps.protocol?.pendingSends() ?? []).filter((e) => e.sessionId === s.sessionId && e.status === 'eingereiht').length;
  }

  /** The open dialog card of a session (for send rules and stage 2 answers). */
  public openDialog(sessionId: string): DialogKarte | undefined {
    const s = this.sessions.get(sessionId);
    if (!s) return undefined;
    const id = this.openDialogId(s);
    return id ? s.dialogs.get(id) : undefined;
  }

  // ---- manager events ----

  private onHookContext(sessionId: string, ctx: HookContext): void {
    const s = this.ensure(sessionId);
    if (!s) return;
    if (ctx.claudeSessionId) s.claudeSessionId = ctx.claudeSessionId;
    if (ctx.transcriptPath && ctx.transcriptPath !== s.transcriptPath) this.attachTranscript(s, ctx.transcriptPath);
    this.changed(s);
  }

  private onAgentEvent(sessionId: string, event: string, detail: { status?: string }): void {
    const s = this.ensure(sessionId);
    if (!s) return;
    if (event === 'prompt-submitted' && s.firstPromptAt === undefined) {
      s.firstPromptAt = this.now().getTime();
      this.armPersistenceWatch(s);
    }
    // Hooks are the trigger to read the transcript right away (FA-02, H4).
    void s.tailer?.readNow();
    if (event === 'stop' || event === 'stop-failure' || event === 'unblocked' || event === 'user-input' || detail.status === 'working') {
      for (const id of s.dialogOrder) {
        const d = s.dialogs.get(id)!;
        if (d.zustand === 'offen' && d.hookOnly) this.armDialogGrace(s, id);
      }
    }
    this.changed(s);
  }

  private onDialog(sessionId: string, change: { open: HookDialog } | { closed: HookDialogClosed }): void {
    const s = this.ensure(sessionId);
    if (!s) return;
    if ('closed' in change) {
      const id = change.closed.toolUseId ?? this.latestOpenId(s, change.closed.tool === 'AskUserQuestion' ? 'rueckfrage' : 'plan');
      if (id) {
        const d = s.dialogs.get(id);
        if (d && d.zustand !== 'beantwortet') {
          d.zustand = 'beantwortet';
          d.ergebnis = {
            durch: 'terminal',
            ...(change.closed.answers ? { answers: change.closed.answers } : {}),
            ...(change.closed.planResult ? { plan: { entscheidung: change.closed.planResult.accepted ? 'angenommen' : change.closed.planResult.text ? 'aenderungen' : 'abgebrochen', ...(change.closed.planResult.text ? { text: change.closed.planResult.text } : {}) } } : {}),
          };
        }
        s.closedIds.add(id);
        this.clearDialogGrace(s, id);
      }
      this.changed(s);
      return;
    }
    const open = change.open;
    const kind = open.kind;
    const nowMs = this.now().getTime();
    let id = open.toolUseId;
    if (id && s.closedIds.has(id)) return; // late hook for a closed dialog: nothing
    if (!id && kind !== 'berechtigung') {
      // PermissionRequest without id: attach to the PreToolUse dialog of the same kind (either order, ≤ 5 s).
      // Permissions of other tools never attach — two Bash prompts are two dialogs (G3).
      const attach = this.latestOpenId(s, kind, nowMs - ATTACH_WINDOW_MS);
      if (attach) id = attach;
    }
    if (!id) {
      // A PreToolUse for this kind may still follow within the window; a
      // permission of another tool never gets one → seq id right away.
      id = kind === 'berechtigung' ? this.deps.manager.nextDialogSeq(sessionId) : `pending:${kind}:${++s.hookSeq}`;
    }
    const existing = s.dialogs.get(id);
    if (existing) {
      if (existing.zustand === 'offen') {
        if (open.kind === 'plan' && open.plan && !existing.plan) existing.plan = open.plan;
        if (open.kind === 'rueckfrage' && open.questions.length && !existing.questions?.length) existing.questions = open.questions;
      }
      this.changed(s);
      return;
    }
    // A PreToolUse with id arriving after a PermissionRequest that got a pending id: adopt it.
    if (open.toolUseId) {
      const pending = this.latestOpenId(s, kind, nowMs - ATTACH_WINDOW_MS, (d) => d.id.startsWith('pending:'));
      if (pending) {
        const d = s.dialogs.get(pending)!;
        s.dialogs.delete(pending);
        s.dialogOrder[s.dialogOrder.indexOf(pending)] = open.toolUseId;
        d.id = open.toolUseId;
        if (open.kind === 'plan' && open.plan) d.plan = open.plan;
        if (open.kind === 'rueckfrage') d.questions = open.questions;
        s.dialogs.set(open.toolUseId, d);
        this.changed(s);
        return;
      }
    }
    const karte: DialogKarte & { openedAt: number; hookOnly: boolean } = {
      id,
      kind,
      zustand: 'offen',
      quelle: 'hook',
      openedAt: nowMs,
      hookOnly: true,
      ...(open.kind === 'rueckfrage' ? { questions: open.questions } : {}),
      ...(open.kind === 'plan' ? { plan: open.plan } : {}),
      ...(open.kind === 'berechtigung' ? { tool: open.tool, ...(open.detail ? { detail: open.detail } : {}) } : {}),
    };
    s.dialogs.set(id, karte);
    s.dialogOrder.push(id);
    this.changed(s);
  }

  private onBeitrag(sessionId: string, b: HookBeitrag & { at: Date }): void {
    const s = this.ensure(sessionId);
    if (!s) return;
    const atMs = b.at.getTime();
    const id = `hook:${++s.hookSeq}`;
    if (b.kind === 'nutzer') {
      const quelle = this.quelleFor(s, b.text, atMs);
      s.hookBeitraege.push({ id, at: b.at.toISOString(), art: 'nutzer', text: b.text, quelle, ergaenztSich: true, atMs });
    } else {
      s.hookBeitraege.push({ id, at: b.at.toISOString(), art: 'claude', text: b.text, ergaenztSich: true, atMs });
    }
    this.changed(s);
  }

  private onSessionClosed(sessionId: string): void {
    const s = this.sessions.get(sessionId);
    if (!s) return;
    s.sitzung = 'beendet';
    for (const d of s.dialogs.values()) {
      if (d.zustand === 'offen' || d.zustand === 'wird_beantwortet' || d.zustand === 'gestoert' || d.zustand === 'gesperrt') {
        d.zustand = 'verfallen';
        d.hinweis = 'nicht beantwortet — Sitzung beendet';
      }
    }
    this.teardown(s, /* keepState */ true);
    this.changed(s);
  }

  // ---- transcript ----

  private attachTranscript(s: SessionGespraech, transcriptPath: string): void {
    if (s.tailer) {
      s.tailer.stop();
      s.tailer = undefined;
    }
    s.transcriptPath = transcriptPath;
    s.entries = [];
    s.cwdChecked = false;
    const check = transcriptPathAllowed(transcriptPath, s.claudeSessionId, this.configDirs());
    if (!check.ok) {
      s.verlauf = { status: 'nur_echtzeit', ursache: check.grund, mitgelesenAb: s.mitgelesenAb };
      return;
    }
    const tailer = this.tailerFactory(transcriptPath);
    s.tailer = tailer;
    tailer.on('entries', (entries: TranscriptEntry[]) => this.onEntries(s, tailer, entries));
    tailer.on('reset', () => {
      s.entries = [];
      this.changed(s);
    });
    tailer.on('defekt', (stats: { defekt: number; zeilen: number }) => {
      if (stats.zeilen >= 20 && stats.defekt / stats.zeilen > DEFECT_RATIO) {
        s.verlauf = { ...s.verlauf, status: 'nur_echtzeit', ursache: 'Transkript defekt' };
        this.changed(s);
      }
    });
    tailer.on('error', (err: Error) => console.warn(`[Gespraech] Transkript ${transcriptPath}: ${err.message}`));
    s.verlauf = { status: 'ok', mitgelesenAb: s.mitgelesenAb };
    void tailer.start();
  }

  private onEntries(s: SessionGespraech, tailer: TranscriptTailer, entries: TranscriptEntry[]): void {
    if (s.tailer !== tailer) return; // superseded by a new path
    if (!s.cwdChecked) {
      const withCwd = entries.find((e) => e.cwd);
      if (withCwd?.cwd) {
        s.cwdChecked = true;
        const session = this.deps.manager.getSession(s.sessionId);
        if (session && !sameDir(withCwd.cwd, session.effectiveCwd)) {
          tailer.stop();
          s.tailer = undefined;
          s.entries = [];
          s.verlauf = { status: 'nur_echtzeit', ursache: 'Transkript gehört zu einem anderen Verzeichnis', mitgelesenAb: s.mitgelesenAb };
          this.changed(s);
          return;
        }
      }
    }
    s.entries.push(...entries);
    const version = entries.find((e) => e.version)?.version;
    if (version && !s.verlauf.transkriptVersion) s.verlauf = { ...s.verlauf, transkriptVersion: version };
    if (s.entries.length >= VERSION_CHECK_AFTER && s.verlauf.status === 'ok' && !s.entries.some((e) => e.kind !== 'ignoriert')) {
      s.verlauf = { ...s.verlauf, status: 'nur_echtzeit', ursache: `Transkriptformat unbekannt (Version ${s.verlauf.transkriptVersion ?? '?'})` };
    }
    if (s.persistenceTimer) {
      clearTimeout(s.persistenceTimer);
      s.persistenceTimer = undefined;
    }
    this.reconcileDialogs(s);
    this.changed(s);
  }

  /** Transcript dialogs win over hook dialogs of the same id; a transcript result closes a hook-open card and unsticks the status (FA-14). */
  private reconcileDialogs(s: SessionGespraech): void {
    const verlauf = buildVerlauf(s.entries);
    const transcriptDialogs = new Map<string, DialogKarte>();
    for (const b of verlauf.beitraege) if (b.art === 'dialog') transcriptDialogs.set(b.dialog.id, b.dialog);
    for (const [id, t] of transcriptDialogs) {
      const h = s.dialogs.get(id);
      if (!h) {
        // Restore / history: the transcript knows a dialog no hook reported.
        const karte = { ...t, openedAt: 0, hookOnly: false } as DialogKarte & { openedAt: number; hookOnly: boolean };
        s.dialogs.set(id, karte);
        s.dialogOrder.push(id);
        if (t.zustand === 'beantwortet') s.closedIds.add(id);
        continue;
      }
      h.hookOnly = false;
      if (t.questions?.length) h.questions = t.questions;
      if (t.plan) h.plan = t.plan;
      if (t.zustand === 'beantwortet') {
        const wasOpen = h.zustand !== 'beantwortet' && h.zustand !== 'verfallen';
        h.zustand = 'beantwortet';
        h.ergebnis = { ...(h.ergebnis ?? { durch: 'terminal' }), ...t.ergebnis, durch: h.ergebnis?.durch === 'ui' ? 'ui' : 'terminal' };
        s.closedIds.add(id);
        this.clearDialogGrace(s, id);
        if (wasOpen) {
          const live = this.deps.manager.getSession(s.sessionId);
          if (live?.agentStatus === 'blocked') this.deps.manager.reportAgentEvent(s.sessionId, 'user-input');
        }
      }
    }
    // Pending-id hook dialogs that the transcript knows under their real id: drop the duplicate.
    for (const id of [...s.dialogOrder]) {
      if (!id.startsWith('pending:')) continue;
      const h = s.dialogs.get(id)!;
      const twin = [...transcriptDialogs.values()].find((t) => t.kind === h.kind && !s.dialogOrder.includes(t.id));
      if (twin || [...transcriptDialogs.values()].some((t) => t.kind === h.kind && s.dialogs.get(t.id)?.hookOnly === false)) {
        s.dialogs.delete(id);
        s.dialogOrder.splice(s.dialogOrder.indexOf(id), 1);
      }
    }
  }

  // ---- composition ----

  /** Beiträge of a session: transcript Verlauf, hook Beiträge not yet in it, dialog cards with the merged state. */
  private compose(s: SessionGespraech): Beitrag[] {
    const verlauf = buildVerlauf(s.entries);
    const out: Beitrag[] = [];
    const usedHook = new Set<string>();
    for (const b of verlauf.beitraege) {
      if (b.art === 'dialog') {
        const merged = s.dialogs.get(b.dialog.id);
        out.push({ ...b, dialog: merged ? this.publicDialog(merged) : b.dialog });
        continue;
      }
      if (b.art === 'nutzer' || b.art === 'claude') {
        const atMs = b.at ? new Date(b.at).getTime() : 0;
        const twin = s.hookBeitraege.find((h) => !usedHook.has(h.id) && h.art === b.art && Math.abs(h.atMs - atMs) <= MERGE_WINDOW_MS && (h as { text: string }).text.trim() === b.text.trim());
        if (twin) {
          usedHook.add(twin.id);
          if (b.art === 'nutzer' && twin.art === 'nutzer') s.quelleById.set(b.id, twin.quelle);
        }
        if (b.art === 'nutzer') {
          const q = s.quelleById.get(b.id);
          out.push(q ? { ...b, quelle: q } : b);
          continue;
        }
      }
      out.push(b);
    }
    // Drop matched hook Beiträge for good (memory), keep the unmatched ones as „ergänzt sich".
    if (usedHook.size) s.hookBeitraege = s.hookBeitraege.filter((h) => !usedHook.has(h.id));
    for (const h of s.hookBeitraege) {
      const { atMs: _drop, ...b } = h;
      void _drop;
      out.push(b);
    }
    // Dialog cards the transcript does not carry (hook-only: permissions, or before the record landed).
    for (const id of s.dialogOrder) {
      const d = s.dialogs.get(id)!;
      if (verlauf.beitraege.some((b) => b.art === 'dialog' && b.dialog.id === id)) continue;
      out.push({ id: `dialog:${id}`, at: new Date(d.openedAt || this.now().getTime()).toISOString(), art: 'dialog', dialog: this.publicDialog(d), ergaenztSich: d.hookOnly });
    }
    out.sort((a, b) => (a.at ? new Date(a.at).getTime() : Number.MAX_SAFE_INTEGER) - (b.at ? new Date(b.at).getTime() : Number.MAX_SAFE_INTEGER));
    return out;
  }

  private publicDialog(d: DialogKarte & { openedAt?: number; hookOnly?: boolean }): DialogKarte {
    const { openedAt: _a, hookOnly: _b, ...rest } = d;
    void _a;
    void _b;
    return rest;
  }

  private openDialogId(s: SessionGespraech): string | undefined {
    for (let i = s.dialogOrder.length - 1; i >= 0; i--) {
      const d = s.dialogs.get(s.dialogOrder[i])!;
      if (d.zustand === 'offen' || d.zustand === 'gesperrt' || d.zustand === 'wird_beantwortet' || d.zustand === 'gestoert') return d.id;
    }
    return undefined;
  }

  private latestOpenId(s: SessionGespraech, kind: DialogKarte['kind'], notBeforeMs = 0, extra?: (d: DialogKarte) => boolean): string | undefined {
    for (let i = s.dialogOrder.length - 1; i >= 0; i--) {
      const d = s.dialogs.get(s.dialogOrder[i])!;
      if (d.kind === kind && d.zustand === 'offen' && d.openedAt >= notBeforeMs && (!extra || extra(d))) return d.id;
    }
    return undefined;
  }

  /** `ui` / `leser` / `gesprochen` when a protocol entry with the same text was sent within ±15 s and not used yet (G8). */
  private quelleFor(s: SessionGespraech, text: string, atMs: number): BeitragQuelle {
    const entries = this.deps.protocol?.getProtocol() ?? [];
    const firstLine = text.split('\n', 1)[0].trim();
    for (const e of entries) {
      if (e.sessionId !== s.sessionId || s.quelleUsed.has(e.id)) continue;
      if (Math.abs(new Date(e.sentAt).getTime() - atMs) > QUELLE_WINDOW_MS) continue;
      if (e.text.trim() !== text.trim() && e.text.split('\n', 1)[0].trim() !== firstLine) continue;
      s.quelleUsed.add(e.id);
      return e.art === 'freitext' ? 'ui' : 'leser';
    }
    return 'terminal';
  }

  // ---- timers ----

  private armPersistenceWatch(s: SessionGespraech): void {
    if (s.persistenceTimer) return;
    s.persistenceTimer = setTimeout(() => {
      s.persistenceTimer = undefined;
      if (s.entries.length > 0) return;
      if (s.transcriptPath && fs.existsSync(s.transcriptPath)) return;
      s.verlauf = { status: 'nur_echtzeit', ursache: s.transcriptPath ? 'Sitzungs-Persistenz aus (Umgebung) — Transkript wird nicht geschrieben' : 'kein Transkriptpfad gemeldet (Sitzung vor der Auslieferung gestartet?)', mitgelesenAb: s.mitgelesenAb };
      this.changed(s);
    }, this.persistenceGraceMs);
    s.persistenceTimer.unref?.();
  }

  /** A hook-open dialog without transcript record: once the session is no longer blocked, close it as unknown after the grace (E24, G11). */
  private armDialogGrace(s: SessionGespraech, id: string): void {
    if (s.dialogTimers.has(id)) return;
    const t = setTimeout(() => {
      s.dialogTimers.delete(id);
      const d = s.dialogs.get(id);
      if (!d || d.zustand !== 'offen') return;
      const live = this.deps.manager.getSession(s.sessionId);
      if (live?.agentStatus === 'blocked') return; // still blocked: the card stays, however the transcript lags
      void s.tailer?.readNow();
      if (!d.hookOnly) return;
      d.zustand = 'geschlossen';
      d.ergebnis = { durch: 'unbekannt' };
      d.hinweis = 'im Terminal beantwortet';
      s.closedIds.add(id);
      this.changed(s);
    }, this.dialogGraceMs);
    t.unref?.();
    s.dialogTimers.set(id, t);
  }

  private clearDialogGrace(s: SessionGespraech, id: string): void {
    const t = s.dialogTimers.get(id);
    if (t) clearTimeout(t);
    s.dialogTimers.delete(id);
  }

  // ---- housekeeping ----

  private ensure(sessionId: string): SessionGespraech | undefined {
    const existing = this.sessions.get(sessionId);
    if (existing) return existing;
    const live = this.deps.manager.getSession(sessionId);
    if (!live) return undefined;
    const s: SessionGespraech = {
      sessionId,
      sitzung: live.status === 'closed' ? 'beendet' : 'aktiv',
      verlauf: { status: 'nicht_verfuegbar', ursache: live.restored ? 'Sitzung vor der Auslieferung gestartet — kein Transkriptpfad bekannt' : 'noch kein Hook dieser Sitzung empfangen' },
      entries: [],
      hookBeitraege: [],
      hookSeq: 0,
      dialogs: new Map(),
      dialogOrder: [],
      closedIds: new Set(),
      quelleUsed: new Set(),
      quelleById: new Map(),
      dialogTimers: new Map(),
      cwdChecked: false,
      lastSent: new Map(),
      mitgelesenAb: this.now().toISOString(),
    };
    this.sessions.set(sessionId, s);
    if (live.claudeSessionId) s.claudeSessionId = live.claudeSessionId;
    if (live.transcriptPath) this.attachTranscript(s, live.transcriptPath); // restore (FA-08): history from the file
    return s;
  }

  private teardown(s: SessionGespraech, keepState = false): void {
    s.tailer?.stop();
    s.tailer = undefined;
    if (s.persistenceTimer) clearTimeout(s.persistenceTimer);
    s.persistenceTimer = undefined;
    for (const t of s.dialogTimers.values()) clearTimeout(t);
    s.dialogTimers.clear();
    if (!keepState) this.sessions.delete(s.sessionId);
  }

  private metaKey(s: SessionGespraech): string {
    return JSON.stringify([s.sitzung, s.verlauf, this.openDialogId(s) ?? null, this.eingereihtOf(s)]);
  }

  private changed(s: SessionGespraech): void {
    this.emit('gespraech:changed', s.sessionId);
  }
}
