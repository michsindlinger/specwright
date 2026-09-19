/**
 * INT-2026-007 Stufe 1: free text into the session (FA-06, FA-11, AN-S09,
 * E4/E15/H5/H10) and the machine-write lock around every paste (E3/G2).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { readFileSync } from 'fs';

import {
  PASTE_END,
  PASTE_START,
  QUEUE_CONFIRM_GRACE_MS,
  SEND_CONFIRM_TIMEOUT_MS,
  SendRejectedError,
  VorhabenService,
  type VorhabenSessionInfo,
} from '../../src/server/services/vorhaben-service.js';
import { VorhabenStateStore } from '../../src/server/services/vorhaben-state.js';
import { VorhabenWatcher } from '../../src/server/services/vorhaben-watcher.js';
import type { OutboundMessage } from '../../src/server/services/vorhaben-handler.js';
import type { VorhabenStateMessage } from '../../src/shared/types/vorhaben.protocol.js';

const intentText = (id: string, status: string, version = '1.0.0'): string =>
  `---\nintent_id: "${id}"  \ntitel: "Titel ${id}"  \nstatus: "${status}"  \nversion: "${version}"  \nbypass: "nein"  \n---\n`;

const FIXTURE_DIR = join(__dirname, '..', 'fixtures', 'tui', '2.1.273');
const PLAN_SCREEN = readFileSync(join(FIXTURE_DIR, 'plan-dialog.txt'), 'utf8');
const FRAGE_SCREEN = readFileSync(join(FIXTURE_DIR, 'askuserquestion-single.txt'), 'utf8');
const PROMPT_SCREEN = '─────\n❯ \n─────\n  ⏵⏵ bypass permissions on (shift+tab to cycle)\n';

/** Manager fake with lock, screen and ordered write log (G2/G20). */
class FakeManager extends EventEmitter {
  public sessions = new Map<string, VorhabenSessionInfo>();
  public writes: Array<[string, string]> = [];
  public screen: { text: string; live: boolean } | 'unstable' = { text: PROMPT_SCREEN, live: true };
  public busy = new Set<string>();
  public lockLog: string[] = [];
  private n = 0;
  getSession(id: string): VorhabenSessionInfo | undefined {
    return this.sessions.get(id);
  }
  sendInput(id: string, data: string): boolean {
    this.writes.push([id, data]);
    return true;
  }
  async readScreen(): Promise<{ text: string; live: boolean }> {
    if (this.screen === 'unstable') return { text: String(++this.n), live: true };
    return this.screen;
  }
  async waitForIdle(): Promise<void> {}
  async withMachineWrite<T>(id: string, fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; grund: 'beschaeftigt' | 'nicht_aktiv' }> {
    if (this.busy.has(id)) return { ok: false, grund: 'beschaeftigt' };
    this.busy.add(id);
    this.lockLog.push('lock');
    try {
      return { ok: true, value: await fn() };
    } finally {
      this.busy.delete(id);
      this.lockLog.push('unlock');
    }
  }
  async createSession(): Promise<{ sessionId: string; effectiveCwd: string }> {
    throw new Error('not used');
  }
  add(id: string, projectPath: string, agentStatus: VorhabenSessionInfo['agentStatus'] = 'done', blockKind?: VorhabenSessionInfo['blockKind']): void {
    this.sessions.set(id, { sessionId: id, status: 'active', projectPath, effectiveCwd: projectPath, agentStatus, ...(blockKind ? { blockKind } : {}), modelConfig: { model: 'opus', provider: 'anthropic' } });
  }
}

describe('VorhabenService.sendText (INT-2026-007)', () => {
  let root: string;
  let projA: string;
  let store: VorhabenStateStore;
  let broadcast: ReturnType<typeof vi.fn<(m: OutboundMessage) => void>>;
  let service: VorhabenService;
  let manager: FakeManager;
  let watcher: VorhabenWatcher;
  const openProjects: Array<{ id: string; path: string; name: string }> = [];

  const lastState = (): VorhabenStateMessage['state'] => {
    const states = broadcast.mock.calls.map((c) => c[0]).filter((m) => m.type === 'vorhaben:state') as VorhabenStateMessage[];
    return states[states.length - 1].state;
  };
  const rejected = async (p: Promise<unknown>): Promise<string> => {
    try {
      await p;
      return 'ok';
    } catch (err) {
      return err instanceof SendRejectedError ? err.grund : `other:${(err as Error).message}`;
    }
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    root = mkdtempSync(join(tmpdir(), 'vorhaben-s3-'));
    projA = join(root, 'a');
    const dir = join(projA, 'intent', 'INT-2026-007-gespraech');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'intent.md'), intentText('INT-2026-007', 'angenommen'));
    writeFileSync(join(dir, 'spec.md'), '# Spec\n\n> **Status:** entwurf\n');
    openProjects.splice(0, openProjects.length, { id: 'pa', path: projA, name: 'A' });
    store = new VorhabenStateStore(join(root, 'state.json'), { port: 3111 });
    await store.load();
    broadcast = vi.fn();
    manager = new FakeManager();
    watcher = new VorhabenWatcher({ debounceMs: 30 });
    service = new VorhabenService({
      workspace: { getState: () => ({ openProjects, sessionNames: { s1: 'spec INT-2026-007', s9: 'intent' } }) },
      store,
      broadcast,
      watcher,
      sessions: manager,
      timeZone: 'UTC',
      listWorktrees: async () => ({ isGitRepo: false, mainWorktreePath: null, entries: [] }),
    });
    await service.start();
  });

  afterEach(async () => {
    service.stop();
    await store.flush();
    vi.useRealTimers();
    rmSync(root, { recursive: true, force: true });
  });

  const assign = (agentStatus: VorhabenSessionInfo['agentStatus'] = 'done', blockKind?: VorhabenSessionInfo['blockKind']): void => {
    manager.add('s1', projA, agentStatus, blockKind);
    store.setAssignment('pa', 'INT-2026-007', { sessionId: 's1', step: 'spec', model: 'opus', cwd: projA, at: '2026-09-16T07:00:00.000Z' });
  };

  it('waiting session: one bracketed paste unchanged (leading /, !, newlines), Enter after 150 ms, protocol entry freitext/gesendet under the lock (FA-06, FA-11)', async () => {
    assign('done');
    await service.rescan();
    const text = '/specwright:plan INT-2026-007\n!echo hi\n  zweite Zeile  ';
    const { entry, status } = await service.sendText('pa', 'INT-2026-007', text);
    expect(status).toBe('gesendet');
    expect(entry).toMatchObject({ art: 'freitext', status: 'gesendet', sessionId: 's1', sessionName: 'spec INT-2026-007', anzahl: 0 });
    expect(entry.doc).toBeUndefined();
    expect(entry.text).toBe('/specwright:plan INT-2026-007\n!echo hi\n  zweite Zeile');
    expect(manager.writes).toEqual([['s1', PASTE_START + entry.text + PASTE_END]]);
    expect(manager.lockLog).toEqual(['lock']); // Enter still pending → lock held
    await vi.advanceTimersByTimeAsync(150);
    expect(manager.writes[1]).toEqual(['s1', '\r']);
    expect(manager.lockLog).toEqual(['lock', 'unlock']);
    expect(lastState().protocol[0]).toMatchObject({ id: entry.id, status: 'gesendet' });
    // confirmed by the prompt text (first line)
    manager.emit('session.prompt-text', 's1', '/specwright:plan INT-2026-007\n!echo hi\n  zweite Zeile');
    expect(lastState().protocol[0].status).toBe('angenommen');
  });

  it('control characters are removed, CRLF normalised, empty text refused', async () => {
    assign('done');
    await service.rescan();
    const { entry } = await service.sendText('pa', 'INT-2026-007', 'a\r\nb\x1b[31m\x07c');
    expect(entry.text).toBe('a\nb[31mc');
    expect(await rejected(service.sendText('pa', 'INT-2026-007', '   \n  '))).toBe('text_leer');
  });

  it('without confirmation a gesendet entry is nicht_bestaetigt after 10 s', async () => {
    assign('done');
    await service.rescan();
    const { entry } = await service.sendText('pa', 'INT-2026-007', 'hallo');
    await vi.advanceTimersByTimeAsync(SEND_CONFIRM_TIMEOUT_MS + 10);
    expect(lastState().protocol.find((e) => e.id === entry.id)!.status).toBe('nicht_bestaetigt');
  });

  it('working session: eingereiht without 10-s timer; confirmed by the prompt text; at most 3 queued (AN-S09, H10)', async () => {
    assign('working');
    await service.rescan();
    const r1 = await service.sendText('pa', 'INT-2026-007', 'eins');
    expect(r1.status).toBe('eingereiht');
    await vi.advanceTimersByTimeAsync(150);
    await service.sendText('pa', 'INT-2026-007', 'zwei');
    await vi.advanceTimersByTimeAsync(150);
    await service.sendText('pa', 'INT-2026-007', 'drei');
    await vi.advanceTimersByTimeAsync(150);
    expect(await rejected(service.sendText('pa', 'INT-2026-007', 'vier'))).toBe('warteschlange_voll');
    await vi.advanceTimersByTimeAsync(SEND_CONFIRM_TIMEOUT_MS + 10);
    expect(lastState().protocol.filter((e) => e.status === 'eingereiht')).toHaveLength(3); // no 10-s timer for queued texts
    expect(service.hasPendingSend()).toBe(false);
    manager.emit('session.prompt-text', 's1', 'eins');
    expect(lastState().protocol.find((e) => e.id === r1.entry.id)!.status).toBe('angenommen');
  });

  it('a queued text not picked up within the grace after Stop is nicht_bestaetigt; "Verwerfen" removes it (E15/H5)', async () => {
    assign('working');
    await service.rescan();
    const a = await service.sendText('pa', 'INT-2026-007', 'eins');
    await vi.advanceTimersByTimeAsync(150);
    const b = await service.sendText('pa', 'INT-2026-007', 'zwei');
    await vi.advanceTimersByTimeAsync(150);
    expect(service.discardQueued(b.entry.id)).toBe('s1');
    expect(service.discardQueued(b.entry.id)).toBeUndefined();
    expect(lastState().protocol.some((e) => e.id === b.entry.id)).toBe(false);
    manager.emit('session.agent-event', 's1', 'stop', { status: 'done' });
    await vi.advanceTimersByTimeAsync(QUEUE_CONFIRM_GRACE_MS + 10);
    expect(lastState().protocol.find((e) => e.id === a.entry.id)!.status).toBe('nicht_bestaetigt');
  });

  it('refused per block kind while a dialog is open, after the session ended, without a session (FA-15)', async () => {
    assign('blocked', 'rueckfrage');
    await service.rescan();
    expect(await rejected(service.sendText('pa', 'INT-2026-007', 'x'))).toBe('rueckfrage_offen');
    manager.add('s1', projA, 'blocked', 'plan');
    expect(await rejected(service.sendText('pa', 'INT-2026-007', 'x'))).toBe('plan_offen');
    manager.add('s1', projA, 'blocked', 'berechtigung');
    expect(await rejected(service.sendText('pa', 'INT-2026-007', 'x'))).toBe('berechtigung');
    manager.add('s1', projA, 'blocked');
    expect(await rejected(service.sendText('pa', 'INT-2026-007', 'x'))).toBe('berechtigung');
    manager.add('s1', projA, 'error');
    expect(await rejected(service.sendText('pa', 'INT-2026-007', 'x'))).toBe('beendet');
    manager.sessions.delete('s1');
    await service.rescan();
    expect(await rejected(service.sendText('pa', 'INT-2026-007', 'x'))).toBe('beendet');
    store.setAssignment('pa', 'INT-2026-007', { sessionId: 's2', step: 'spec', model: 'opus', cwd: projA, at: '2026-09-16T07:00:00.000Z', ended: true });
    await service.rescan();
    expect(await rejected(service.sendText('pa', 'INT-2026-007', 'x'))).toBe('beendet');
    expect(manager.writes).toEqual([]);
  });

  it('screen check before every paste: a dialog cue means nothing is written (E4); no live screen → queueing refused, waiting session still served', async () => {
    assign('done');
    await service.rescan();
    manager.screen = { text: PLAN_SCREEN, live: true };
    expect(await rejected(service.sendText('pa', 'INT-2026-007', 'x'))).toBe('dialog_offen');
    manager.screen = { text: FRAGE_SCREEN, live: true };
    expect(await rejected(service.sendText('pa', 'INT-2026-007', 'x'))).toBe('dialog_offen');
    expect(manager.writes).toEqual([]);
    expect(lastState().protocol).toEqual([]); // the entry was rolled back
    manager.screen = 'unstable';
    expect(await rejected(service.sendText('pa', 'INT-2026-007', 'x'))).toBe('ok'); // waiting session: unstable screen tolerated
    await vi.advanceTimersByTimeAsync(150); // Enter written, lock released
    manager.screen = { text: 'raw buffer', live: false };
    expect(await rejected(service.sendText('pa', 'INT-2026-007', 'y'))).toBe('ok');
    await vi.advanceTimersByTimeAsync(150);
    manager.add('s1', projA, 'working');
    expect(await rejected(service.sendText('pa', 'INT-2026-007', 'z'))).toBe('kein_bildschirm');
    manager.screen = 'unstable';
    expect(await rejected(service.sendText('pa', 'INT-2026-007', 'z'))).toBe('kein_bildschirm');
    manager.screen = { text: PROMPT_SCREEN, live: true };
    expect(await rejected(service.sendText('pa', 'INT-2026-007', 'z'))).toBe('ok');
  });

  it('INT-2026-021 (AK-05): a filled input box does NOT stop free text — only the two machine pastes look that closely', async () => {
    assign('done');
    await service.rescan();
    // The same screen that makes „Nächster Schritt" refuse (strict) stays permissive here (waiting).
    manager.screen = { text: '─────\n❯\u00a0ja, leg den Entwurf an\n─────\n  ⏵⏵ bypass permissions on (shift+tab to cycle)\n', live: true };
    expect(await rejected(service.sendText('pa', 'INT-2026-007', 'x'))).toBe('ok');
    await vi.advanceTimersByTimeAsync(150);
    expect(manager.writes.length).toBeGreaterThan(0);
  });

  it('lock: a second machine write while one runs is refused as beschaeftigt; the reader send() uses the same lock (E3)', async () => {
    assign('done');
    await service.rescan();
    const first = service.sendText('pa', 'INT-2026-007', 'eins');
    await Promise.resolve();
    const second = await rejected(service.sendText('pa', 'INT-2026-007', 'zwei'));
    await first;
    expect(second).toBe('beschaeftigt');
    await vi.advanceTimersByTimeAsync(150);
    expect(manager.lockLog).toEqual(['lock', 'unlock']);
    // reader send: Freigabe goes through the lock too
    manager.lockLog = [];
    const stand = lastState().rows[0].docs.find((d) => d.key === 'spec')!.mtimeMs;
    await service.send('pa', 'INT-2026-007', 'spec', 'freigabe', stand);
    await vi.advanceTimersByTimeAsync(150);
    expect(manager.lockLog).toEqual(['lock', 'unlock']);
    expect(manager.writes.filter(([, d]) => d === '\r')).toHaveLength(2);
  });

  it('a session ref carries the block kind (FA-09)', async () => {
    assign('blocked', 'plan');
    await service.rescan();
    expect(lastState().rows[0].session).toMatchObject({ agentStatus: 'blocked', blockKind: 'plan' });
  });
});

/**
 * INT-2026-008 (AK-02/AK-03/AK-05/AK-07): free text into a pending `/intent`
 * session that has no folder yet, the pending list in the state, the claim
 * that moves the interview into the Vorhaben's protocol, and the cleanup.
 */
describe('VorhabenService.sendTextToSession + pendingIntents (INT-2026-008)', () => {
  let root: string;
  let projA: string;
  let store: VorhabenStateStore;
  let broadcast: ReturnType<typeof vi.fn<(m: OutboundMessage) => void>>;
  let service: VorhabenService;
  let manager: FakeManager;
  let watcher: VorhabenWatcher;
  const openProjects: Array<{ id: string; path: string; name: string }> = [];
  const names: Record<string, string> = { s9: 'intent' };

  const states = (): VorhabenStateMessage['state'][] => broadcast.mock.calls.map((c) => c[0]).filter((m) => m.type === 'vorhaben:state').map((m) => (m as VorhabenStateMessage).state);
  const lastState = (): VorhabenStateMessage['state'] => states()[states().length - 1];
  const failed = async (p: Promise<unknown>): Promise<string> => {
    try {
      await p;
      return 'ok';
    } catch (err) {
      if (err instanceof SendRejectedError) return err.grund;
      return `code:${(err as { code?: string }).code ?? (err as Error).message}`;
    }
  };
  const pend = (id = 's9', agentStatus: VorhabenSessionInfo['agentStatus'] = 'done', blockKind?: VorhabenSessionInfo['blockKind'], since = '2026-09-16T09:00:00.000Z'): void => {
    manager.add(id, projA, agentStatus, blockKind);
    store.setPendingIntent(id, { projectId: 'pa', cwd: projA, step: 'intent', model: 'opus', since });
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    root = mkdtempSync(join(tmpdir(), 'vorhaben-s8-'));
    projA = join(root, 'a');
    mkdirSync(join(projA, 'intent'), { recursive: true });
    openProjects.splice(0, openProjects.length, { id: 'pa', path: projA, name: 'A' }, { id: 'pb', path: join(root, 'b'), name: 'B' });
    mkdirSync(join(root, 'b'), { recursive: true });
    store = new VorhabenStateStore(join(root, 'state.json'), { port: 3111 });
    await store.load();
    broadcast = vi.fn();
    manager = new FakeManager();
    watcher = new VorhabenWatcher({ debounceMs: 30 });
    service = new VorhabenService({
      workspace: { getState: () => ({ openProjects, sessionNames: names }) },
      store,
      broadcast,
      watcher,
      sessions: manager,
      timeZone: 'UTC',
      listWorktrees: async () => ({ isGitRepo: true, mainWorktreePath: projA, entries: [{ path: projA, branch: 'main', head: 'x', bare: false, detached: false, locked: false, prunable: false }] }),
    });
    await service.start();
  });

  afterEach(async () => {
    service.stop();
    await store.flush();
    vi.useRealTimers();
    rmSync(root, { recursive: true, force: true });
  });

  it('state carries the pending session with live status, tab name and copy label, oldest first; without a live session it is ended (AK-05)', async () => {
    pend('s9', 'working', undefined, '2026-09-16T09:01:00.000Z');
    store.setPendingIntent('s8', { projectId: 'pa', cwd: join(projA, '.wt', 'feat-x'), step: 'intent', model: 'sonnet', since: '2026-09-16T09:00:00.000Z' });
    service.broadcastState();
    const pending = lastState().pendingIntents;
    expect(pending.map((p) => p.sessionId)).toEqual(['s8', 's9']);
    expect(pending[1]).toEqual({
      sessionId: 's9', projectId: 'pa', projectName: 'A', cwd: projA, arbeitskopie: 'main', since: '2026-09-16T09:01:00.000Z',
      session: { id: 's9', name: 'intent', model: 'opus', agentStatus: 'working', step: 'intent' }, // INT-2026-018: a pending `/intent` session names its step
      zustand: 'arbeitet', zustandDetail: 'opus', // INT-2026-022 (FA-13): the row rule for the entry
    });
    // no live session (restart, closed) → ended; unknown name → 'intent'; worktree cwd → its directory name
    expect(pending[0]).toMatchObject({ arbeitskopie: 'feat-x', session: { id: 's8', name: 'intent', model: 'sonnet', agentStatus: 'unknown', ended: true } });
    manager.add('s9', projA, 'blocked', 'rueckfrage');
    service.broadcastState();
    expect(lastState().pendingIntents[1].session).toMatchObject({ agentStatus: 'blocked', blockKind: 'rueckfrage' });
  });

  it('status changes of a pending session broadcast the state without a rescan; a typed /intent registers and rescans (AK-05, AK-07; INT-2026-022 FA-19)', async () => {
    const rescan = vi.spyOn(service, 'scheduleRescan');
    pend('s9', 'working');
    const before = states().length;
    manager.emit('session.agent-event', 's9', 'stop', { status: 'done' });
    expect(states().length).toBe(before + 1);
    expect(rescan).not.toHaveBeenCalled();
    // unknown session: nothing
    manager.emit('session.agent-event', 'zz', 'stop', { status: 'done' });
    expect(states().length).toBe(before + 1);
    // typed by hand in a terminal of project A → INT-2026-022 (FA-19): rescan, not a bare broadcast (label, watcher)
    manager.add('s7', projA, 'working');
    manager.emit('session.prompt-text', 's7', '/specwright:intent');
    expect(rescan).toHaveBeenCalledWith(0);
    await service.rescan();
    expect(lastState().pendingIntents.map((p) => p.sessionId)).toEqual(['s9', 's7']);
  });

  it('waiting pending session: paste + Enter under the lock, entry without intentId, confirmed by the prompt; working → eingereiht (AK-02)', async () => {
    pend('s9', 'done');
    const { entry, status } = await service.sendTextToSession('pa', 's9', 'Es geht um die Sortierung.\n');
    expect(status).toBe('gesendet');
    expect(entry).toMatchObject({ projectId: 'pa', art: 'freitext', status: 'gesendet', sessionId: 's9', sessionName: 'intent', text: 'Es geht um die Sortierung.' });
    expect(entry.intentId).toBeUndefined();
    expect(manager.writes).toEqual([['s9', PASTE_START + 'Es geht um die Sortierung.' + PASTE_END]]);
    expect(manager.lockLog).toEqual(['lock']);
    await vi.advanceTimersByTimeAsync(150);
    expect(manager.writes[1]).toEqual(['s9', '\r']);
    expect(manager.lockLog).toEqual(['lock', 'unlock']);
    expect(lastState().protocol[0]).toMatchObject({ id: entry.id, status: 'gesendet' });
    manager.emit('session.prompt-text', 's9', 'Es geht um die Sortierung.');
    expect(lastState().protocol[0].status).toBe('angenommen');
    manager.add('s9', projA, 'working');
    const r2 = await service.sendTextToSession('pa', 's9', 'noch was');
    expect(r2.status).toBe('eingereiht');
    await vi.advanceTimersByTimeAsync(150);
  });

  it('refusals: dialog cue on the screen rolls the entry back, lock busy → beschaeftigt, open dialog → per kind, empty text (AK-02)', async () => {
    pend('s9', 'done');
    manager.screen = { text: FRAGE_SCREEN, live: true };
    expect(await failed(service.sendTextToSession('pa', 's9', 'x'))).toBe('dialog_offen');
    expect(manager.writes).toEqual([]);
    expect(lastState().protocol).toEqual([]);
    manager.screen = { text: PROMPT_SCREEN, live: true };
    const first = service.sendTextToSession('pa', 's9', 'eins');
    await Promise.resolve();
    expect(await failed(service.sendTextToSession('pa', 's9', 'zwei'))).toBe('beschaeftigt');
    await first;
    await vi.advanceTimersByTimeAsync(150);
    manager.add('s9', projA, 'blocked', 'rueckfrage');
    expect(await failed(service.sendTextToSession('pa', 's9', 'x'))).toBe('rueckfrage_offen');
    expect(await failed(service.sendTextToSession('pa', 's9', '  '))).toBe('text_leer');
  });

  it('the session id is only a key: not pending for this project, other project, closed project → UNKNOWN_SESSION / UNKNOWN_PROJECT (AK-02, RB-02)', async () => {
    pend('s9', 'done');
    expect(await failed(service.sendTextToSession('pa', 's1', 'x'))).toBe('code:UNKNOWN_SESSION');
    expect(await failed(service.sendTextToSession('pb', 's9', 'x'))).toBe('code:UNKNOWN_SESSION');
    expect(await failed(service.sendTextToSession('zz', 's9', 'x'))).toBe('code:UNKNOWN_PROJECT');
    manager.sessions.delete('s9');
    expect(await failed(service.sendTextToSession('pa', 's9', 'x'))).toBe('beendet');
    expect(manager.writes).toEqual([]);
  });

  it('claim: the new folder moves the interview into the Vorhaben protocol; a second pending session of the same cwd keeps its entries; sends after the claim carry the id (AK-03, R-4)', async () => {
    pend('s9', 'done', undefined, '2026-09-16T09:00:00.000Z');
    pend('s8', 'done', undefined, '2026-09-16T09:05:00.000Z');
    const a = await service.sendTextToSession('pa', 's9', 'eins');
    await vi.advanceTimersByTimeAsync(150);
    const b = await service.sendTextToSession('pa', 's8', 'andere');
    await vi.advanceTimersByTimeAsync(150);
    const dir = join(projA, 'intent', 'INT-2026-008-neu');
    mkdirSync(dir);
    writeFileSync(join(dir, 'intent.md'), intentText('INT-2026-008', 'entwurf'));
    watcher.emit('dir-added', projA, 'INT-2026-008');
    watcher.emit('changed', projA);
    await service.rescan();
    const st = lastState();
    expect(st.pendingIntents.map((p) => p.sessionId)).toEqual(['s8']);
    expect(st.rows.find((r) => r.intentId === 'INT-2026-008')?.session?.id).toBe('s9');
    expect(st.protocol.find((e) => e.id === a.entry.id)).toMatchObject({ intentId: 'INT-2026-008', sessionId: 's9' });
    expect(st.protocol.find((e) => e.id === b.entry.id)?.intentId).toBeUndefined();
    // after the claim the session address resolves to the row's intentId
    const c = await service.sendTextToSession('pa', 's9', 'zwei');
    expect(c.entry.intentId).toBe('INT-2026-008');
    await vi.advanceTimersByTimeAsync(150);
  });

  it('a pending session that ends without a folder: pending and its unclaimed entries are gone, state broadcast (AK-03, R-2)', async () => {
    pend('s9', 'done');
    const a = await service.sendTextToSession('pa', 's9', 'eins');
    await vi.advanceTimersByTimeAsync(150);
    manager.sessions.delete('s9');
    const before = states().length;
    manager.emit('session.closed', 's9');
    expect(states().length).toBe(before + 1);
    expect(lastState().pendingIntents).toEqual([]);
    expect(lastState().protocol.some((e) => e.id === a.entry.id)).toBe(false);
  });
});
