/**
 * INT-2026-038: Sitzungswechsel per Handoff — `/handoff-weiter` (typed or
 * via the button) marks the session, the Stop of the handoff turn looks for
 * a handoff file written since, and only then the shared `clearAndPaste`
 * clears and reads exactly that file. Every refusal leaves the old session
 * untouched and puts a line above the terminal. Fake terminal manager after
 * `vorhaben-service-naechster-schritt.test.ts`; file system real (tmp).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';

import { CLEAR_WAIT_MS, HANDOFF_FRIST_MS, PASTE_END, PASTE_START, VorhabenError, VorhabenService, type VorhabenSessionInfo } from '../../src/server/services/vorhaben-service.js';
import { findeNeuesHandoff } from '../../src/server/services/handoff-datei.js';
import { VorhabenStateStore } from '../../src/server/services/vorhaben-state.js';
import { VorhabenWatcher } from '../../src/server/services/vorhaben-watcher.js';
import type { OutboundMessage } from '../../src/server/services/vorhaben-handler.js';
import type { VorhabenStateMessage } from '../../src/shared/types/vorhaben.protocol.js';

const UUID = 'a208d3a5-1da0-4f76-88fd-80493778110e';
const UUID2 = '11111111-2222-4333-8444-555555555555';
const FIXTURES = resolve(process.cwd(), 'tests', 'fixtures', 'tui');
const IDLE_SCREEN = readFileSync(join(FIXTURES, '2.1.276', 'prompt-idle.txt'), 'utf8');
const WORKING_SCREEN = readFileSync(join(FIXTURES, '2.1.276', 'prompt-working.txt'), 'utf8');
const PLAN_DIALOG_SCREEN = readFileSync(join(FIXTURES, '2.1.273', 'plan-dialog.txt'), 'utf8');
const TEXT_SCREEN = readFileSync(join(FIXTURES, '2.1.277', 'prompt-eingabe-text.txt'), 'utf8');
const paste = (t: string): string => PASTE_START + t + PASTE_END;
const CLEAR = paste('/clear');
const KNOPF = paste('/handoff-weiter');
const NAME = 'handoff-2026-10-29_14-03.md';
const EINLESEN = paste(`/start-from-handoff .claude/handoffs/${NAME} nur lesen`);
const intentText = `---\nintent_id: "INT-2026-001"  \ntitel: "Eins"  \nstatus: "angenommen"  \nversion: "1.0.0"  \nbypass: "ja"  \n---\n`;

class FakeManager extends EventEmitter {
  public sessions = new Map<string, VorhabenSessionInfo>();
  public log: Array<[string, string]> = [];
  public notices: Array<[string, string, string]> = [];
  public screen = IDLE_SCREEN;
  public onClear: 'new' | 'none' = 'new';
  getSession(id: string): VorhabenSessionInfo | undefined {
    return this.sessions.get(id);
  }
  sendInput(id: string, data: string): boolean {
    this.log.push([id, data]);
    if (data === CLEAR && this.onClear === 'new') this.hook(id, UUID2);
    return true;
  }
  async readScreen(): Promise<{ text: string; live: boolean }> {
    return { text: this.screen, live: true };
  }
  async readCursorProbe(): Promise<null> {
    return null;
  }
  async waitForIdle(): Promise<void> {}
  async withMachineWrite<T>(_id: string, fn: () => Promise<T>): Promise<{ ok: true; value: T }> {
    return { ok: true, value: await fn() };
  }
  notice(id: string, level: string, text: string): void {
    this.notices.push([id, level, text]);
  }
  async createSession(): Promise<never> {
    throw new Error('not used');
  }
  add(id: string, cwd: string, opts: { terminalType?: 'shell' | 'claude-code'; claudeSessionId?: string } = {}): void {
    const claudeSessionId = 'claudeSessionId' in opts ? opts.claudeSessionId : UUID;
    this.sessions.set(id, { sessionId: id, status: 'active', projectPath: cwd, effectiveCwd: cwd, terminalType: opts.terminalType ?? 'claude-code', agentStatus: 'done', modelConfig: { model: 'haiku', provider: 'anthropic' }, ...(claudeSessionId ? { claudeSessionId } : {}) });
  }
  hook(id: string, claudeSessionId: string): void {
    const s = this.sessions.get(id);
    if (s) s.claudeSessionId = claudeSessionId;
    this.emit('session.hook-context', id, { claudeSessionId });
  }
  status(id: string, agentStatus: VorhabenSessionInfo['agentStatus'], event?: string): void {
    this.sessions.get(id)!.agentStatus = agentStatus;
    if (event) this.emit('session.agent-event', id, event);
  }
  writes(id: string): string[] {
    return this.log.filter(([sid]) => sid === id).map(([, d]) => d);
  }
}

/** Waits until `cond` holds (real timers; pastes wait PASTE_ENTER_DELAY_MS each). */
async function until(cond: () => boolean, ms = 3000): Promise<void> {
  const end = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > end) throw new Error('timeout');
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('VorhabenService Handoff-Wechsel (INT-2026-038)', () => {
  let root: string;
  let proj: string;
  let store: VorhabenStateStore;
  let broadcast: ReturnType<typeof vi.fn<(m: OutboundMessage) => void>>;
  let service: VorhabenService;
  let manager: FakeManager;
  let warn: ReturnType<typeof vi.spyOn>;

  const lastState = (): VorhabenStateMessage['state'] => {
    const states = broadcast.mock.calls.map((c) => c[0]).filter((m) => m.type === 'vorhaben:state') as VorhabenStateMessage[];
    return states[states.length - 1].state;
  };
  const schreibeHandoff = (name = NAME, cwd = proj): string => {
    const dir = join(cwd, '.claude', 'handoffs');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, name), '# Handoff\n');
    return join(dir, name);
  };
  const tippe = (id: string, prompt: string): void => {
    manager.status(id, 'working', 'prompt-submitted');
    manager.emit('session.prompt-text', id, prompt);
  };
  const stop = (id: string): void => manager.status(id, 'done', 'stop');
  const notices = (id: string): string[] => manager.notices.filter(([sid]) => sid === id).map(([, , t]) => t);

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'vorhaben-038-'));
    proj = join(root, 'a');
    const dir = join(proj, 'intent', 'INT-2026-001-eins');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'intent.md'), intentText);
    store = new VorhabenStateStore(join(root, 'state.json'), { port: 3111 });
    await store.load();
    broadcast = vi.fn();
    manager = new FakeManager();
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    service = new VorhabenService({
      workspace: { getState: () => ({ openProjects: [{ id: 'pa', path: proj, name: 'A' }], sessionNames: {} }) },
      store,
      broadcast,
      watcher: new VorhabenWatcher({ debounceMs: 30 }),
      sessions: manager,
      timeZone: 'UTC',
      listWorktrees: async () => ({ isGitRepo: true, mainWorktreePath: proj, entries: [] as never }),
    });
    await service.start();
  });

  afterEach(async () => {
    vi.useRealTimers();
    warn.mockRestore();
    service.stop();
    await store.flush();
    rmSync(root, { recursive: true, force: true });
  });

  it('AK-02, FA-04, FA-06, FA-10, FA-15: typed `/handoff-weiter` → Stop with a new file → exactly `/clear` and the read-in command for that file; the assignment stays, with the new conversation id', async () => {
    manager.add('s1', proj);
    store.setAssignment('pa', 'INT-2026-001', { sessionId: 's1', step: 'build', model: 'haiku', cwd: proj, at: '2026-10-29T13:00:00.000Z', claudeSessionId: UUID, provider: 'anthropic' });
    tippe('s1', '/handoff-weiter');
    expect(lastState().handoffWechsel).toEqual(['s1']);
    schreibeHandoff();
    stop('s1');
    await until(() => manager.writes('s1').length === 4);
    expect(manager.writes('s1')).toEqual([CLEAR, '\r', EINLESEN, '\r']);
    await until(() => (lastState().handoffWechsel ?? []).length === 0);
    expect(store.getAssignment('pa', 'INT-2026-001')).toMatchObject({ sessionId: 's1', step: 'build', claudeSessionId: UUID2 });
    expect(notices('s1')).toEqual([]);
  });

  it('AK-01, FA-02: the button in a ready session pastes `/handoff-weiter`, marks the session and the typed-command hook does not mark twice; then the same switch runs', async () => {
    manager.add('s1', proj);
    await service.starteHandoff('s1');
    expect(manager.writes('s1')).toEqual([KNOPF, '\r']);
    expect(lastState().handoffWechsel).toEqual(['s1']);
    tippe('s1', '/handoff-weiter');
    await expect(service.starteHandoff('s1')).rejects.toMatchObject({ code: 'HANDOFF_LAEUFT', message: 'Wechsel läuft bereits' });
    schreibeHandoff();
    stop('s1');
    await until(() => manager.writes('s1').length === 6);
    expect(manager.writes('s1')).toEqual([KNOPF, '\r', CLEAR, '\r', EINLESEN, '\r']);
  });

  it('AK-05, FA-03: session working / dialog / text in the box → nothing written, „Nicht gestartet: …" above the terminal, no mark', async () => {
    const cases: Array<[string, string, string]> = [
      [WORKING_SCREEN, 'SESSION_WRITE_FAILED', 'Nicht gestartet: Sitzung arbeitet'],
      [PLAN_DIALOG_SCREEN, 'SESSION_WRITE_FAILED', 'Nicht gestartet: '],
      [TEXT_SCREEN, 'PROMPT_NOT_EMPTY', 'Nicht gestartet: in der Eingabezeile der Sitzung steht noch Text'],
    ];
    for (const [i, [screen, code, text]] of cases.entries()) {
      const id = `s${i}`;
      manager.add(id, proj);
      manager.screen = screen;
      await expect(service.starteHandoff(id)).rejects.toMatchObject({ code });
      expect(manager.writes(id)).toEqual([]);
      expect(notices(id)).toHaveLength(1);
      expect(notices(id)[0].startsWith(text)).toBe(true);
      expect(lastState().handoffWechsel).toEqual([]);
    }
  });

  it('FA-01 (backend): shell or no Claude session id → SESSION_NOT_CLAUDE, unknown → SESSION_NOT_ACTIVE; a typed command there marks nothing', async () => {
    manager.add('sh', proj, { terminalType: 'shell', claudeSessionId: undefined });
    manager.add('cx', proj, { claudeSessionId: undefined });
    await expect(service.starteHandoff('sh')).rejects.toMatchObject({ code: 'SESSION_NOT_CLAUDE' });
    await expect(service.starteHandoff('cx')).rejects.toMatchObject({ code: 'SESSION_NOT_CLAUDE' });
    await expect(service.starteHandoff('weg')).rejects.toBeInstanceOf(VorhabenError);
    manager.emit('session.prompt-text', 'cx', '/handoff-weiter');
    expect(service.getState().handoffWechsel).toEqual([]);
  });

  it('AK-04, FA-07: Stop without a file, or only an older one → no `/clear`, „kein neues Handoff gefunden"', async () => {
    manager.add('s1', proj);
    const alt = schreibeHandoff('handoff-2026-10-01_09-00.md');
    utimesSync(alt, new Date('2026-10-01T09:00:00Z'), new Date('2026-10-01T09:00:00Z'));
    tippe('s1', '/handoff-weiter');
    stop('s1');
    await until(() => notices('s1').length === 1);
    expect(notices('s1')[0]).toBe('Nicht gewechselt: kein neues Handoff gefunden — /session-handoff von Hand ausführen');
    expect(manager.writes('s1')).toEqual([]);
    expect(lastState().handoffWechsel).toEqual([]);
  });

  it('FA-08: text in the input box after the Stop → no `/clear`, reason above the terminal', async () => {
    manager.add('s1', proj);
    tippe('s1', '/handoff-weiter');
    schreibeHandoff();
    manager.screen = TEXT_SCREEN;
    stop('s1');
    await until(() => notices('s1').length === 1);
    expect(notices('s1')[0]).toMatch(/^Nicht gewechselt: in der Eingabezeile der Sitzung steht noch Text/);
    expect(manager.writes('s1')).toEqual([]);
  });

  it('AK-06, FA-09: no new conversation id after `/clear` → no read-in command, „Leeren nicht bestätigt"', async () => {
    manager.add('s1', proj);
    manager.onClear = 'none';
    tippe('s1', '/handoff-weiter');
    schreibeHandoff();
    stop('s1');
    await until(() => notices('s1').length === 1, CLEAR_WAIT_MS + 2000);
    expect(notices('s1')[0]).toBe(`Nicht gewechselt: Leeren nicht bestätigt — Handoff mit /start-from-handoff .claude/handoffs/${NAME} von Hand einlesen`);
    expect(manager.writes('s1')).toEqual([CLEAR, '\r']);
  }, CLEAR_WAIT_MS + 5000);

  it('FA-13: 10 minutes without a Stop → abort without clearing; a closed session drops the mark silently', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    manager.add('s1', proj);
    tippe('s1', '/handoff-weiter');
    vi.advanceTimersByTime(HANDOFF_FRIST_MS + 1);
    expect(notices('s1')).toEqual(['Nicht gewechselt: Handoff-Runde nach 10 Minuten nicht beendet — Handoff prüfen, dann /clear und /start-from-handoff von Hand']);
    expect(service.getState().handoffWechsel).toEqual([]);
    manager.add('s2', proj);
    tippe('s2', '/handoff-weiter');
    manager.emit('session.closed', 's2');
    expect(service.getState().handoffWechsel).toEqual([]);
    expect(notices('s2')).toEqual([]);
    stop('s2');
    expect(manager.writes('s1')).toEqual([]);
    expect(manager.writes('s2')).toEqual([]);
  });

  it('FA-14, R3: a Stop without a mark writes nothing; another prompt during the round ends the switch (Esc without Stop)', async () => {
    manager.add('s1', proj);
    schreibeHandoff();
    tippe('s1', 'mach weiter');
    stop('s1');
    tippe('s1', '/handoff-weiter');
    tippe('s1', 'doch nicht');
    expect(notices('s1')).toEqual(['Nicht gewechselt: neue Eingabe vor dem Ende der Handoff-Runde — /handoff-weiter erneut auslösen']);
    stop('s1');
    await new Promise((r) => setTimeout(r, 50));
    expect(manager.writes('s1')).toEqual([]);
  });
});

describe('findeNeuesHandoff (INT-2026-038, AN-S05)', () => {
  let cwd: string;
  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'handoff-'));
  });
  afterEach(() => rmSync(cwd, { recursive: true, force: true }));

  it('youngest file since `seit`; foreign names, older files and symlinks out of the folder are ignored; no folder → undefined', async () => {
    expect(await findeNeuesHandoff(cwd, 0)).toBeUndefined();
    const dir = join(cwd, '.claude', 'handoffs');
    mkdirSync(dir, { recursive: true });
    const at = (name: string, iso: string): void => {
      writeFileSync(join(dir, name), 'x');
      utimesSync(join(dir, name), new Date(iso), new Date(iso));
    };
    at('handoff-alt.md', '2026-10-29T10:00:00Z');
    at('handoff-a.md', '2026-10-29T14:04:00Z');
    at('handoff-b.md', '2026-10-29T14:05:00Z');
    at('notiz.md', '2026-10-29T14:09:00Z');
    at('handoff-$(rm).md', '2026-10-29T14:09:00Z');
    writeFileSync(join(cwd, 'aussen.md'), 'x');
    symlinkSync(join(cwd, 'aussen.md'), join(dir, 'handoff-link.md'));
    const seit = new Date('2026-10-29T14:03:00Z').getTime();
    expect(await findeNeuesHandoff(cwd, seit)).toBe('handoff-b.md');
    expect(await findeNeuesHandoff(cwd, new Date('2026-10-29T15:00:00Z').getTime())).toBeUndefined();
  });
});
