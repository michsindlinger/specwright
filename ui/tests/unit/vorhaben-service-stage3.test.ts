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
    service = new VorhabenService({
      workspace: { getState: () => ({ openProjects, sessionNames: { s1: 'spec INT-2026-007' } }) },
      store,
      broadcast,
      watcher: new VorhabenWatcher({ debounceMs: 30 }),
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
