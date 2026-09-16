/**
 * INT-2026-007 GespraechService: two sources (hooks + transcript), dialog
 * state machine (plan §3 table), allow-list of the transcript path, restore
 * from the transcript, session end (Ablauf L), degradation (nur_echtzeit).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { GespraechService, defaultConfigDirs, transcriptPathAllowed, type GespraechSessionInfo } from '../../src/server/services/gespraech-service.js';
import { TranscriptTailer } from '../../src/server/services/transcript-reader.js';
import type { Beitrag, DialogKarte, GespraechSnapshot } from '../../src/shared/types/gespraech.protocol.js';
import type { ProtokollEintrag } from '../../src/shared/types/vorhaben.protocol.js';

class FakeManager extends EventEmitter {
  public sessions = new Map<string, GespraechSessionInfo>();
  public userInputs: string[] = [];
  private seq = new Map<string, number>();
  getSession(id: string): GespraechSessionInfo | undefined {
    return this.sessions.get(id);
  }
  reportAgentEvent(id: string, ev: 'user-input'): boolean {
    this.userInputs.push(`${id}:${ev}`);
    const s = this.sessions.get(id);
    if (s && s.agentStatus === 'blocked') s.agentStatus = 'working';
    return true;
  }
  nextDialogSeq(id: string): string {
    const n = (this.seq.get(id) ?? 0) + 1;
    this.seq.set(id, n);
    return `seq:${n}`;
  }
  add(id: string, cwd: string, extra: Partial<GespraechSessionInfo> = {}): void {
    this.sessions.set(id, { sessionId: id, status: 'active', terminalType: 'claude-code', effectiveCwd: cwd, agentStatus: 'idle', ...extra });
  }
}

const ts = (sec: number): string => new Date(Date.UTC(2026, 8, 16, 7, 0, sec)).toISOString();
const line = (o: Record<string, unknown>): string => JSON.stringify({ isSidechain: false, version: '2.1.273', ...o }) + '\n';
const userLine = (uuid: string, text: string, sec: number, cwd: string): string => line({ type: 'user', uuid, timestamp: ts(sec), cwd, message: { role: 'user', content: text } });
const claudeLine = (uuid: string, text: string, sec: number, cwd: string, id = `msg_${uuid}`): string =>
  line({ type: 'assistant', uuid, timestamp: ts(sec), cwd, message: { role: 'assistant', id, content: [{ type: 'text', text }] } });
const toolUseLine = (uuid: string, toolUseId: string, name: string, input: unknown, sec: number, cwd: string): string =>
  line({ type: 'assistant', uuid, timestamp: ts(sec), cwd, message: { role: 'assistant', id: `msg_${uuid}`, content: [{ type: 'tool_use', id: toolUseId, name, input }] } });
const toolResultLine = (uuid: string, toolUseId: string, content: string, toolUseResult: unknown, sec: number, cwd: string, isError = false): string =>
  line({ type: 'user', uuid, timestamp: ts(sec), cwd, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUseId, content, ...(isError ? { is_error: true } : {}) }] }, toolUseResult });

const QUESTIONS = [{ question: 'Welche Farbe?', header: 'Farbe', multiSelect: false, options: [{ label: 'Rot' }, { label: 'Blau' }] }];
const tick = (ms = 30): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe('transcriptPathAllowed() / defaultConfigDirs()', () => {
  const home = '/home/me';
  const dirs = defaultConfigDirs(['anthropic', 'glm', 'bad/../id'], home);
  it('builds ~/.claude and ~/.claude-<provider> (no path tricks)', () => {
    expect(dirs).toEqual(['/home/me/.claude', '/home/me/.claude-glm']);
  });
  it('accepts only <configDir>/projects/<slug>/<session_id>.jsonl', () => {
    expect(transcriptPathAllowed('/home/me/.claude/projects/-tmp-p/abc.jsonl', 'abc', dirs)).toEqual({ ok: true });
    expect(transcriptPathAllowed('/home/me/.claude-glm/projects/-tmp-p/abc.jsonl', 'abc', dirs)).toEqual({ ok: true });
    expect(transcriptPathAllowed('/home/me/.claude/projects/-tmp-p/other.jsonl', 'abc', dirs).ok).toBe(false);
    expect(transcriptPathAllowed('/home/me/.claude/projects/-tmp-p/abc.jsonl', undefined, dirs).ok).toBe(false);
    expect(transcriptPathAllowed('/home/me/.claude-evil/projects/-tmp-p/abc.jsonl', 'abc', dirs).ok).toBe(false);
    expect(transcriptPathAllowed('/home/me/.claude/projects/abc.jsonl', 'abc', dirs).ok).toBe(false);
    expect(transcriptPathAllowed('/home/me/.claude/projects/-tmp-p/deeper/abc.jsonl', 'abc', dirs).ok).toBe(false);
    expect(transcriptPathAllowed('/home/me/.claude/projects/../../etc/abc.jsonl', 'abc', dirs).ok).toBe(false);
    expect(transcriptPathAllowed('relative/abc.jsonl', 'abc', dirs).ok).toBe(false);
  });
});

describe('GespraechService', () => {
  let root: string;
  let cwd: string;
  let configDir: string;
  let transcript: string;
  let manager: FakeManager;
  let service: GespraechService;
  let protocol: ProtokollEintrag[];
  let changed: string[];
  const SID = 'cloud-1-1';
  const CLAUDE_ID = 'abc-123';

  const snap = (): GespraechSnapshot => service.snapshot(SID)!;
  const arts = (): string[] => snap().beitraege.map((b) => b.art);
  const dialogs = (): DialogKarte[] => snap().beitraege.filter((b) => b.art === 'dialog').map((b) => (b as Extract<Beitrag, { art: 'dialog' }>).dialog);
  const hookContext = (): void => manager.emit('session.hook-context', SID, { transcriptPath: transcript, claudeSessionId: CLAUDE_ID, cwd });
  const agent = (event: string, status: string): void => manager.emit('session.agent-event', SID, event, { status });

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'gespraech-'));
    cwd = join(root, 'project');
    mkdirSync(cwd);
    configDir = join(root, '.claude');
    mkdirSync(join(configDir, 'projects', '-p'), { recursive: true });
    transcript = join(configDir, 'projects', '-p', `${CLAUDE_ID}.jsonl`);
    manager = new FakeManager();
    manager.add(SID, cwd);
    protocol = [];
    service = new GespraechService({
      manager,
      protocol: { getProtocol: () => protocol, pendingSends: () => protocol.filter((e) => e.status === 'gesendet' || e.status === 'eingereiht') },
      configDirs: () => [configDir],
      tailerFactory: (p) => new TranscriptTailer(p, { pollMs: 20 }),
      persistenceGraceMs: 80,
      dialogGraceMs: 80,
    });
    changed = [];
    service.on('gespraech:changed', (id: string) => changed.push(id));
  });

  afterEach(() => {
    service.stop();
    rmSync(root, { recursive: true, force: true });
  });

  it('unknown session → no snapshot; known session without hooks → nicht_verfuegbar with cause', () => {
    expect(service.snapshot('cloud-9-9')).toBeUndefined();
    expect(snap()).toMatchObject({ sitzung: 'aktiv', verlauf: { status: 'nicht_verfuegbar' }, beitraege: [], eingereiht: 0 });
    expect(snap().verlauf.ursache).toMatch(/Hook/);
  });

  it('hook Beiträge appear at once and are replaced by their transcript record (uuid wins, never twice) — FA-02, G1', async () => {
    hookContext();
    manager.emit('session.beitrag', SID, { kind: 'nutzer', text: 'Hallo Claude', at: new Date(ts(1)) });
    manager.emit('session.beitrag', SID, { kind: 'claude', text: 'Hallo Michael', at: new Date(ts(3)) });
    let s = snap();
    expect(s.verlauf.status).toBe('ok');
    expect(s.beitraege.map((b) => [b.art, b.ergaenztSich])).toEqual([['nutzer', true], ['claude', true]]);
    // transcript catches up
    writeFileSync(transcript, userLine('u1', 'Hallo Claude', 1, cwd) + claudeLine('a1', 'Hallo Michael', 3, cwd));
    await tick(150);
    s = snap();
    expect(s.beitraege.map((b) => [b.id, b.art, b.ergaenztSich ?? false])).toEqual([['u1', 'nutzer', false], ['a1', 'claude', false]]);
    expect((s.beitraege[0] as { at?: string }).at).toBe(ts(1));
  });

  it('a Nutzer-Beitrag with a matching protocol entry is labelled ui/leser, once (G8)', async () => {
    hookContext();
    protocol.push({ id: 'pe1', projectId: 'p', intentId: 'INT-2026-007', art: 'freitext', anzahl: 0, stand: '', sessionId: SID, sessionName: 'n', text: 'Bitte kürzer', anmerkungen: [], status: 'gesendet', sentAt: ts(10) });
    protocol.push({ id: 'pe2', projectId: 'p', intentId: 'INT-2026-007', doc: 'spec', art: 'aenderungen', anzahl: 1, stand: 'x', sessionId: SID, sessionName: 'n', text: 'Änderungen zu spec.md (Stand x):\n1. [A] b', anmerkungen: [], status: 'angenommen', sentAt: ts(20) });
    manager.emit('session.beitrag', SID, { kind: 'nutzer', text: 'Bitte kürzer', at: new Date(ts(11)) });
    manager.emit('session.beitrag', SID, { kind: 'nutzer', text: 'Änderungen zu spec.md (Stand x):\n1. [A] b', at: new Date(ts(21)) });
    manager.emit('session.beitrag', SID, { kind: 'nutzer', text: 'Bitte kürzer', at: new Date(ts(12)) }); // same text again: entry already used
    manager.emit('session.beitrag', SID, { kind: 'nutzer', text: 'im Terminal getippt', at: new Date(ts(30)) });
    // sorted by time: 11 (ui), 12 (same text again → terminal), 21 (leser), 30 (terminal)
    const q = snap().beitraege.map((b) => (b as { quelle?: string }).quelle);
    expect(q).toEqual(['ui', 'terminal', 'leser', 'terminal']);
    // the label survives the transcript merge
    writeFileSync(transcript, userLine('u1', 'Bitte kürzer', 11, cwd));
    await tick(150);
    expect(snap().beitraege[0]).toMatchObject({ id: 'u1', quelle: 'ui' });
  });

  describe('dialog state machine (plan §3)', () => {
    beforeEach(() => hookContext());

    it('PreToolUse opens a card by tool_use_id; PermissionRequest 2 ms later attaches (either order) — one card', () => {
      manager.emit('session.dialog', SID, { open: { kind: 'rueckfrage', toolUseId: 'toolu_1', questions: QUESTIONS } });
      manager.emit('session.dialog', SID, { open: { kind: 'rueckfrage', questions: QUESTIONS } });
      expect(dialogs()).toHaveLength(1);
      expect(dialogs()[0]).toMatchObject({ id: 'toolu_1', kind: 'rueckfrage', zustand: 'offen', quelle: 'hook' });
      expect(snap().offenerDialog).toBe('toolu_1');
      // reverse order for a plan: PermissionRequest (plan text) first, PreToolUse (id) after
      manager.emit('session.dialog', SID, { closed: { toolUseId: 'toolu_1', tool: 'AskUserQuestion', answers: { 'Welche Farbe?': 'Blau' } } });
      manager.emit('session.dialog', SID, { open: { kind: 'plan', plan: '# Plan A' } });
      manager.emit('session.dialog', SID, { open: { kind: 'plan', toolUseId: 'toolu_2', plan: '# Plan A' } });
      const plans = dialogs().filter((d) => d.kind === 'plan');
      expect(plans).toHaveLength(1);
      expect(plans[0]).toMatchObject({ id: 'toolu_2', plan: '# Plan A', zustand: 'offen' });
    });

    it('PostToolUse closes with the answer; a late blocked/open for a closed id never reopens (monotony, E1)', () => {
      manager.emit('session.dialog', SID, { open: { kind: 'rueckfrage', toolUseId: 'toolu_1', questions: QUESTIONS } });
      manager.emit('session.dialog', SID, { closed: { toolUseId: 'toolu_1', tool: 'AskUserQuestion', answers: { 'Welche Farbe?': 'Blau' } } });
      expect(dialogs()[0]).toMatchObject({ zustand: 'beantwortet', ergebnis: { durch: 'terminal', answers: { 'Welche Farbe?': 'Blau' } } });
      expect(snap().offenerDialog).toBeUndefined();
      manager.emit('session.dialog', SID, { open: { kind: 'rueckfrage', toolUseId: 'toolu_1', questions: QUESTIONS } });
      expect(dialogs()).toHaveLength(1);
      expect(dialogs()[0].zustand).toBe('beantwortet');
    });

    it('a permission of another tool gets a seq id; two Bash permissions never alias (G3)', () => {
      manager.emit('session.dialog', SID, { open: { kind: 'berechtigung', tool: 'Bash', detail: 'rm -rf x' } });
      manager.emit('session.dialog', SID, { open: { kind: 'berechtigung', tool: 'Bash', detail: 'rm -rf y' } });
      const ids = dialogs().map((d) => d.id);
      expect(ids).toEqual(['seq:1', 'seq:2']);
      expect(dialogs()[1]).toMatchObject({ kind: 'berechtigung', tool: 'Bash', detail: 'rm -rf y', zustand: 'offen' });
    });

    it('the transcript result closes a hook-open card and unsticks a blocked status (FA-14); the transcript wins over the hook result', async () => {
      manager.sessions.get(SID)!.agentStatus = 'blocked';
      manager.emit('session.dialog', SID, { open: { kind: 'plan', toolUseId: 'toolu_5', plan: '# P' } });
      writeFileSync(
        transcript,
        toolUseLine('a1', 'toolu_5', 'ExitPlanMode', { plan: '# P' }, 1, cwd) +
          toolResultLine('u2', 'toolu_5', "The user doesn't want to proceed … the user said:\nMehr Tests.", 'Error: … the user said:\nMehr Tests.', 3, cwd, true)
      );
      await tick(150);
      expect(dialogs()[0]).toMatchObject({ id: 'toolu_5', zustand: 'beantwortet', ergebnis: { durch: 'terminal', plan: { entscheidung: 'aenderungen', text: 'Mehr Tests.' } } });
      expect(manager.userInputs).toEqual([`${SID}:user-input`]);
      // and the transcript record replaces the hook card (one Beitrag with the transcript timestamp)
      const cards = snap().beitraege.filter((b) => b.art === 'dialog');
      expect(cards).toHaveLength(1);
      expect(cards[0].at).toBe(ts(1));
    });

    it('a hook-open card without transcript record is closed as unbekannt after the grace — only once the session is no longer blocked (E24, G11)', async () => {
      manager.sessions.get(SID)!.agentStatus = 'blocked';
      manager.emit('session.dialog', SID, { open: { kind: 'rueckfrage', toolUseId: 'toolu_7', questions: QUESTIONS } });
      agent('stop', 'blocked');
      await tick(150);
      expect(dialogs()[0].zustand).toBe('offen'); // still blocked: stays
      manager.sessions.get(SID)!.agentStatus = 'done';
      agent('stop', 'done');
      await tick(150);
      expect(dialogs()[0]).toMatchObject({ zustand: 'geschlossen', ergebnis: { durch: 'unbekannt' }, hinweis: 'im Terminal beantwortet' });
    });

    it('session end: open cards verfallen with a note, Gespräch says beendet (Ablauf L, R-7)', () => {
      manager.emit('session.dialog', SID, { open: { kind: 'rueckfrage', toolUseId: 'toolu_9', questions: QUESTIONS } });
      manager.emit('session.closed', SID, 0);
      const s = snap();
      expect(s.sitzung).toBe('beendet');
      expect(dialogs()[0]).toMatchObject({ zustand: 'verfallen', hinweis: 'nicht beantwortet — Sitzung beendet' });
      expect(s.offenerDialog).toBeUndefined();
    });
  });

  describe('transcript allow-list and degradation', () => {
    it('a path outside the allow-list or with a foreign session id is not read; hooks keep working (nur_echtzeit)', () => {
      manager.emit('session.hook-context', SID, { transcriptPath: join(root, 'elsewhere', `${CLAUDE_ID}.jsonl`), claudeSessionId: CLAUDE_ID });
      expect(snap().verlauf).toMatchObject({ status: 'nur_echtzeit', ursache: expect.stringContaining('außerhalb') });
      manager.emit('session.hook-context', SID, { transcriptPath: join(configDir, 'projects', '-p', 'other.jsonl'), claudeSessionId: CLAUDE_ID });
      expect(snap().verlauf).toMatchObject({ status: 'nur_echtzeit', ursache: expect.stringContaining('passt nicht') });
      manager.emit('session.beitrag', SID, { kind: 'claude', text: 'trotzdem da', at: new Date() });
      expect(arts()).toEqual(['claude']);
    });

    it('a transcript whose records carry another cwd is dropped (E8)', async () => {
      hookContext();
      writeFileSync(transcript, userLine('u1', 'fremd', 1, join(root, 'other-project')));
      await tick(150);
      expect(snap().verlauf).toMatchObject({ status: 'nur_echtzeit', ursache: expect.stringContaining('anderen Verzeichnis') });
      expect(arts()).toEqual([]);
    });

    it('persistence watchdog: no file 80 ms after the first prompt → nur_echtzeit with cause; a file in time keeps ok', async () => {
      hookContext();
      agent('prompt-submitted', 'working');
      await tick(150);
      expect(snap().verlauf).toMatchObject({ status: 'nur_echtzeit', ursache: expect.stringContaining('Persistenz') });
      // second session where the file arrives in time
      manager.add('cloud-1-2', cwd);
      const t2 = join(configDir, 'projects', '-p', 'def.jsonl');
      manager.emit('session.hook-context', 'cloud-1-2', { transcriptPath: t2, claudeSessionId: 'def' });
      manager.emit('session.agent-event', 'cloud-1-2', 'prompt-submitted', { status: 'working' });
      writeFileSync(t2, userLine('u1', 'hi', 1, cwd));
      await tick(150);
      expect(service.snapshot('cloud-1-2')!.verlauf.status).toBe('ok');
    });

    it('a transcript of an unknown format (50 records, none understood) → nur_echtzeit with the version', async () => {
      hookContext();
      writeFileSync(transcript, Array.from({ length: 55 }, (_, i) => line({ type: 'future-record', n: i, version: '9.9.9' })).join(''));
      await tick(150);
      expect(snap().verlauf).toMatchObject({ status: 'nur_echtzeit', ursache: 'Transkriptformat unbekannt (Version 9.9.9)', transkriptVersion: '9.9.9' });
    });

    it('a new transcript path (clear/fork) restarts the Verlauf (E10)', async () => {
      hookContext();
      writeFileSync(transcript, userLine('u1', 'alt', 1, cwd));
      await tick(120);
      expect(arts()).toEqual(['nutzer']);
      const t2 = join(configDir, 'projects', '-p', 'neu.jsonl');
      writeFileSync(t2, claudeLine('a9', 'neu', 5, cwd));
      manager.emit('session.hook-context', SID, { transcriptPath: t2, claudeSessionId: 'neu' });
      await tick(120);
      expect(snap().beitraege.map((b) => b.id)).toEqual(['a9']);
    });
  });

  it('restore (FA-08): a session known with a transcript path rebuilds the Verlauf and its open card from the file', async () => {
    writeFileSync(
      transcript,
      userLine('u1', 'Frag mich', 1, cwd) + toolUseLine('a1', 'toolu_3', 'AskUserQuestion', { questions: QUESTIONS }, 2, cwd)
    );
    manager.add('cloud-2-2', cwd, { transcriptPath: transcript, claudeSessionId: CLAUDE_ID, restored: true, agentStatus: 'blocked', blockKind: 'rueckfrage' });
    const s0 = service.snapshot('cloud-2-2')!;
    expect(s0.verlauf.status).toBe('ok');
    await tick(150);
    const s = service.snapshot('cloud-2-2')!;
    expect(s.beitraege.map((b) => b.art)).toEqual(['nutzer', 'dialog']);
    const card = (s.beitraege[1] as Extract<Beitrag, { art: 'dialog' }>).dialog;
    expect(card).toMatchObject({ id: 'toolu_3', kind: 'rueckfrage', zustand: 'offen', quelle: 'transkript' });
    expect(card.questions![0].options.map((o) => o.label)).toEqual(['Rot', 'Blau']);
    expect(s.offenerDialog).toBe('toolu_3');
    // the answer typed in the terminal closes it
    appendFileSync(transcript, toolResultLine('u2', 'toolu_3', 'answered', { questions: QUESTIONS, answers: { 'Welche Farbe?': 'Rot' } }, 4, cwd));
    await tick(150);
    expect(service.snapshot('cloud-2-2')!.offenerDialog).toBeUndefined();
  });

  it('takeDelta(): only changed Beiträge as upserts, removed ids, meta when it changed (H6)', async () => {
    hookContext();
    snap(); // baseline
    manager.emit('session.beitrag', SID, { kind: 'claude', text: 'A', at: new Date(ts(1)) });
    let d = service.takeDelta(SID)!;
    expect(d.upsert.map((b) => b.art)).toEqual(['claude']);
    expect(d.remove).toEqual([]);
    d = service.takeDelta(SID)!;
    expect(d.upsert).toEqual([]);
    // transcript replaces the hook Beitrag: one upsert (new id), one remove (hook id)
    writeFileSync(transcript, claudeLine('a1', 'A', 1, cwd));
    await tick(150);
    d = service.takeDelta(SID)!;
    expect(d.upsert.map((b) => b.id)).toEqual(['a1']);
    expect(d.remove).toEqual(['hook:1']);
    // meta changes travel along
    manager.emit('session.closed', SID, 0);
    d = service.takeDelta(SID)!;
    expect(d.sitzung).toBe('beendet');
  });

  it('work blocks and Claude text from the transcript, queued count from the protocol (H10)', async () => {
    hookContext();
    protocol.push({ id: 'q1', projectId: 'p', intentId: 'INT-2026-007', art: 'freitext', anzahl: 0, stand: '', sessionId: SID, sessionName: 'n', text: 'später', anmerkungen: [], status: 'eingereiht', sentAt: ts(9) });
    writeFileSync(
      transcript,
      userLine('u1', 'lies', 1, cwd) +
        toolUseLine('a1', 't1', 'Read', { file_path: '/x' }, 2, cwd) +
        toolResultLine('u2', 't1', 'ok', { type: 'text' }, 4, cwd) +
        claudeLine('a2', 'gelesen', 5, cwd)
    );
    await tick(150);
    const s = snap();
    expect(s.beitraege.map((b) => b.art)).toEqual(['nutzer', 'arbeit', 'claude']);
    expect(s.beitraege[1]).toMatchObject({ werkzeuge: 1, dauerMs: 2000, laeuft: false });
    expect(s.eingereiht).toBe(1);
    expect(changed.length).toBeGreaterThan(0);
  });
});
