/**
 * INT-2026-037: intent auto review after a stop (FA-07–FA-09, OF-03) and the
 * review target of a session (FA-02, FA-03). Real temp folders, a fake
 * terminal manager, the orchestrator replaced by a recording callback.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { VorhabenService, type VorhabenSessionInfo } from '../../src/server/services/vorhaben-service.js';
import { VorhabenStateStore } from '../../src/server/services/vorhaben-state.js';
import { VorhabenWatcher } from '../../src/server/services/vorhaben-watcher.js';
import type { ReviewZiel } from '../../src/shared/review-ziel.js';

const intentText = (id: string, status: string, extra = ''): string =>
  `---\nintent_id: "${id}"  \ntitel: "Titel ${id}"  \nstatus: "${status}"  \nversion: "0.1.0"  \nbypass: "nein"  \n${extra}---\n`;

const START = Date.UTC(2026, 9, 27, 8, 0, 0);

class FakeManager extends EventEmitter {
  public sessions = new Map<string, VorhabenSessionInfo>();
  public puffer: { planText: string; planPath: string } | null = null;
  private n = 0;
  getSession(id: string): VorhabenSessionInfo | undefined {
    return this.sessions.get(id);
  }
  sendInput(): boolean {
    return true;
  }
  extractPlanFromBuffer(): { planText: string; planPath: string } | null {
    return this.puffer;
  }
  async createSession(...args: unknown[]): Promise<{ sessionId: string; effectiveCwd: string }> {
    const id = `cs-${++this.n}`;
    const projectPath = args[0] as string;
    this.add(id, projectPath);
    return { sessionId: id, effectiveCwd: projectPath };
  }
  add(id: string, projectPath: string): void {
    this.sessions.set(id, { sessionId: id, status: 'active', projectPath, effectiveCwd: projectPath, agentStatus: 'done', terminalType: 'claude-code', modelConfig: { model: 'opus', provider: 'anthropic' }, createdAt: new Date(START) });
  }
}

describe('INT-2026-037: VorhabenService intent auto review and review target', () => {
  let root: string;
  let projA: string;
  let dir5: string;
  let statePath: string;
  let store: VorhabenStateStore;
  let watcher: VorhabenWatcher;
  let manager: FakeManager;
  let service: VorhabenService;
  let schalter: boolean;
  let antwort: 'gestartet' | 'beschaeftigt';
  let start: ReturnType<typeof vi.fn<(sessionId: string, ziel: ReviewZiel) => 'gestartet' | 'beschaeftigt'>>;
  const openProjects: Array<{ id: string; path: string; name: string }> = [];

  const schreibe = (status: string, mtime = START + 60_000, extra = ''): void => {
    writeFileSync(join(dir5, 'intent.md'), intentText('INT-2026-005', status, extra));
    utimesSync(join(dir5, 'intent.md'), new Date(mtime), new Date(mtime));
  };
  const zuordnen = async (id = 's1'): Promise<void> => {
    manager.add(id, projA);
    manager.emit('session.prompt-text', id, '/spec INT-2026-005');
    await service.rescan();
  };
  const stop = async (id = 's1'): Promise<void> => {
    manager.emit('session.agent-event', id, 'stop');
    await service.rescan();
  };

  async function neuerDienst(): Promise<void> {
    store = new VorhabenStateStore(statePath, { port: 3111 });
    await store.load();
    watcher = new VorhabenWatcher({ debounceMs: 30 });
    service = new VorhabenService({
      workspace: { getState: () => ({ openProjects, sessionNames: {} }) },
      store,
      broadcast: vi.fn(),
      watcher,
      sessions: manager,
      timeZone: 'UTC',
      listWorktrees: async () => ({ isGitRepo: true, mainWorktreePath: projA, entries: [{ path: projA, branch: 'main', head: 'x', bare: false, detached: false, locked: false, prunable: false }] }),
      intentAutoReview: () => schalter,
      startIntentReview: start,
    });
    await service.start();
  }

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'vorhaben-037-'));
    projA = join(root, 'a');
    dir5 = join(projA, 'intent', 'INT-2026-005-absicht');
    mkdirSync(dir5, { recursive: true });
    schreibe('entwurf');
    openProjects.splice(0, openProjects.length, { id: 'pa', path: projA, name: 'A' });
    statePath = join(root, 'state.json');
    manager = new FakeManager();
    schalter = true;
    antwort = 'gestartet';
    start = vi.fn(() => antwort);
    await neuerDienst();
  });

  afterEach(async () => {
    service.stop();
    await store.flush();
    rmSync(root, { recursive: true, force: true });
  });

  it('FA-07/FA-08: stop + draft + file newer than the session → exactly one start with the folder file; a second stop starts none', async () => {
    await zuordnen();
    await stop();
    expect(start).toHaveBeenCalledOnce();
    expect(start).toHaveBeenCalledWith('s1', { art: 'intent', quelle: 'intent-ordner', pfad: join(dir5, 'intent.md') });
    expect(store.getAutoReview('pa', 'INT-2026-005')).toBeDefined();
    await stop();
    expect(start).toHaveBeenCalledOnce();
  });

  it('two stops before the scan ends → one start', async () => {
    await zuordnen();
    manager.emit('session.agent-event', 's1', 'stop');
    manager.emit('session.agent-event', 's1', 'stop');
    await service.rescan();
    await service.rescan();
    expect(start).toHaveBeenCalledOnce();
  });

  it('FA-08: the mark survives a restart — a new store from the same file starts none', async () => {
    await zuordnen();
    await stop();
    service.stop();
    await store.flush();
    start.mockClear();
    await neuerDienst();
    await zuordnen('s2');
    await stop('s2');
    expect(start).not.toHaveBeenCalled();
  });

  it('busy (a review runs): no mark, the next scan starts it', async () => {
    await zuordnen();
    antwort = 'beschaeftigt';
    await stop();
    expect(start).toHaveBeenCalledOnce();
    expect(store.getAutoReview('pa', 'INT-2026-005')).toBeUndefined();
    antwort = 'gestartet';
    await service.rescan();
    expect(start).toHaveBeenCalledTimes(2);
    expect(store.getAutoReview('pa', 'INT-2026-005')).toBeDefined();
  });

  it('a pending /intent session that stops BEFORE dir-added is checked by the scan after the assignment', async () => {
    rmSync(dir5, { recursive: true, force: true });
    await service.rescan();
    const { sessionId } = await service.startStep('pa', undefined, 'intent', { providerId: 'anthropic', modelId: 'opus' }, undefined);
    manager.emit('session.agent-event', sessionId, 'stop');
    await service.rescan();
    expect(start).not.toHaveBeenCalled();
    const dir6 = join(projA, 'intent', 'INT-2026-006-neu');
    mkdirSync(dir6);
    writeFileSync(join(dir6, 'intent.md'), intentText('INT-2026-006', 'entwurf'));
    utimesSync(join(dir6, 'intent.md'), new Date(START + 60_000), new Date(START + 60_000));
    watcher.emit('dir-added', projA, 'INT-2026-006');
    await service.rescan();
    expect(start).toHaveBeenCalledOnce();
    expect(start.mock.calls[0][1].pfad).toBe(join(dir6, 'intent.md'));
  });

  it('a closed session leaves nothing behind', async () => {
    await zuordnen();
    schalter = false;
    manager.emit('session.agent-event', 's1', 'stop');
    manager.sessions.delete('s1');
    manager.emit('session.closed', 's1', 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((service as any).stopSeit.size).toBe(0);
  });

  it.each([
    ['status angenommen', () => schreibe('angenommen', START + 120_000)],
    ['switch off', () => { schalter = false; }],
    ['file older than the session', () => schreibe('entwurf', START - 60_000)],
  ])('no start: %s', async (_name, vorher) => {
    vorher();
    await zuordnen();
    await stop();
    expect(start).not.toHaveBeenCalled();
  });

  it('OF-03: the risk class is not read — "niedrig" starts as well', async () => {
    schreibe('entwurf', START + 60_000, 'risikoklasse: "niedrig"  \n');
    await zuordnen();
    await stop();
    expect(start).toHaveBeenCalledOnce();
  });

  it('FA-02/FA-03: the review target — plan.md beats the buffer, the buffer without plan.md, an error without both', async () => {
    await zuordnen();
    expect(service.reviewZiel('s1')).toEqual({ art: 'intent', quelle: 'intent-ordner', pfad: join(dir5, 'intent.md') });

    writeFileSync(join(dir5, 'plan.md'), '# Plan\n\n> **Status:** entwurf\n');
    manager.puffer = { planText: 'Puffer-Plan', planPath: '/home/x/.claude/plans/p.md' };
    await service.rescan();
    expect(service.reviewZiel('s1')).toEqual({ art: 'plan', quelle: 'plan-ordner', pfad: join(dir5, 'plan.md') });

    rmSync(join(dir5, 'plan.md'));
    manager.emit('session.prompt-text', 's1', '/plan INT-2026-005');
    await service.rescan();
    expect(service.reviewZiel('s1')).toEqual({ art: 'plan', quelle: 'plan-mode', pfad: '/home/x/.claude/plans/p.md', text: 'Puffer-Plan' });

    manager.puffer = null;
    expect(service.reviewZiel('s1')).toEqual({ fehler: 'Kein Plan im Vorhaben-Ordner und kein Plan-Mode-Plan in der Sitzung.' });
    expect(service.reviewZiel('unbekannt')).toEqual({ fehler: 'Kein Plan im Vorhaben-Ordner und kein Plan-Mode-Plan in der Sitzung.' });
  });
});
