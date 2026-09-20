/**
 * INT-2026-022 — several intents in parallel (plan §8, AK-06, AK-08…AK-12, FA-19):
 *
 *  - an intent start always goes to a NEW worktree (handler = form, service = substance, manager = last barrier)
 *  - pre-checks refuse before a session exists: no git repo, isolation off (checked on the MAIN path), manager error
 *  - the working title travels (store + broadcast), hand-typed sessions have none
 *  - pending entries carry project name, state (row rule) and the copy's branch label
 *  - R1: the scan reads the worktree list past the 5-s cache when a pending cwd is unknown (three orderings)
 *  - sweep of dead entries bound to the boot restore (closed / undefined + complete / pending / timeout → complete)
 *  - a folder in copy B claims only the session in B
 *
 * The terminal manager is a fake that creates a real directory per `new-worktree` (so the watcher and the
 * folder claim run against the file system) and lets a test hold a `listWorktrees` call open (interleaving).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { VorhabenService, type VorhabenSessionInfo } from '../../src/server/services/vorhaben-service.js';
import { VorhabenStateStore } from '../../src/server/services/vorhaben-state.js';
import { VorhabenWatcher } from '../../src/server/services/vorhaben-watcher.js';
import { VorhabenHandler, type OutboundMessage } from '../../src/server/services/vorhaben-handler.js';
import { ProjectDocsService } from '../../src/server/services/project-docs.service.js';
import type { ParsedTarget } from '../../src/server/utils/session-target.js';
import type { RepoWorktreeInfo } from '../../src/server/utils/git-worktree-list.js';
import type { VorhabenErrorMessage, VorhabenStateMessage, VorhabenStepStartedMessage } from '../../src/shared/types/vorhaben.protocol.js';

const intentText = (id: string, status: string, version = '1.0.0'): string =>
  `---\nintent_id: "${id}"  \ntitel: "Titel ${id}"  \nstatus: "${status}"  \nversion: "${version}"  \nbypass: "nein"  \n---\n`;

const HAIKU = { providerId: 'anthropic', modelId: 'haiku' };
const tick = (ms = 5): Promise<void> => new Promise((r) => setTimeout(r, ms));

interface CreateCall {
  projectPath: string;
  options: { sessionTarget?: ParsedTarget };
}

class FakeManager extends EventEmitter {
  public sessions = new Map<string, VorhabenSessionInfo>();
  public created: CreateCall[] = [];
  /** Session worktrees this manager „created" — the listWorktrees fake lists them (`session/<id>`). */
  public worktrees = new Map<string, string>();
  public failNext: Error | null = null;
  public outcome: 'pending' | 'complete' | 'timeout' = 'complete';
  private n = 0;
  constructor(private readonly worktreeRoot: string) {
    super();
  }
  getSession(id: string): VorhabenSessionInfo | undefined {
    return this.sessions.get(id);
  }
  sendInput(): boolean {
    return true;
  }
  restoreOutcome(): 'pending' | 'complete' | 'timeout' {
    return this.outcome;
  }
  closeSession(id: string): boolean {
    const s = this.sessions.get(id);
    if (!s) return false;
    s.status = 'closed';
    return true;
  }
  async createSession(...args: unknown[]): Promise<{ sessionId: string; effectiveCwd: string }> {
    const call: CreateCall = { projectPath: args[0] as string, options: (args[8] as { sessionTarget?: ParsedTarget }) ?? {} };
    this.created.push(call);
    if (this.failNext) {
      const err = this.failNext;
      this.failNext = null;
      throw err;
    }
    const id = `cs-${++this.n}`;
    const target = call.options.sessionTarget?.target;
    let effectiveCwd = call.projectPath;
    if (target?.kind === 'new-worktree') {
      effectiveCwd = join(this.worktreeRoot, `session-${id}`);
      mkdirSync(join(effectiveCwd, 'intent'), { recursive: true });
      this.worktrees.set(effectiveCwd, `session/${id}`);
    } else if (target?.kind === 'existing-worktree') {
      effectiveCwd = target.path;
    }
    this.sessions.set(id, { sessionId: id, status: 'active', projectPath: call.projectPath, effectiveCwd, terminalType: 'claude-code', agentStatus: 'working', modelConfig: args[2] as { model: string; provider?: string } });
    return { sessionId: id, effectiveCwd };
  }
  /** A live session like the manager reports it: `projectPath` = the registered project, `effectiveCwd` = where it runs (a worktree, or the project). */
  add(id: string, projectPath: string, agentStatus: VorhabenSessionInfo['agentStatus'] = 'done', cwd = projectPath): void {
    this.sessions.set(id, { sessionId: id, status: 'active', projectPath, effectiveCwd: cwd, terminalType: 'claude-code', agentStatus, modelConfig: { model: 'opus', provider: 'anthropic' } });
  }
}

describe('VorhabenService — Absichten parallel (INT-2026-022)', () => {
  let root: string;
  let projA: string;
  let wtRoot: string;
  let store: VorhabenStateStore;
  let broadcast: ReturnType<typeof vi.fn<(m: OutboundMessage) => void>>;
  let reply: ReturnType<typeof vi.fn<(m: OutboundMessage) => void>>;
  let service: VorhabenService;
  let handler: VorhabenHandler;
  let watcher: VorhabenWatcher;
  let manager: FakeManager;
  let names: Record<string, string>;
  let listCalls = 0;
  /** When set, the next listWorktrees call waits here after taking its snapshot (interleaving test). */
  let gate: Promise<void> | null = null;
  let isGitRepo = true;
  let worktreeEnabled = true;
  const resolveMainPath = vi.fn((p: string) => p);
  const openProjects: Array<{ id: string; path: string; name: string }> = [];

  const entry = (path: string, branch: string) => ({ path, branch, head: 'x', bare: false, detached: false, locked: false, prunable: false });
  const snapshot = (): RepoWorktreeInfo => ({
    isGitRepo,
    mainWorktreePath: isGitRepo ? projA : null,
    entries: isGitRepo ? [entry(projA, 'main'), ...[...manager.worktrees].map(([p, b]) => entry(p, b))] : [],
  });
  const listWorktrees = async (): Promise<RepoWorktreeInfo> => {
    listCalls++;
    const snap = snapshot();
    if (gate) {
      const g = gate;
      gate = null;
      await g;
    }
    return snap;
  };

  const states = (): VorhabenStateMessage['state'][] => broadcast.mock.calls.map((c) => c[0]).filter((m) => m.type === 'vorhaben:state').map((m) => (m as VorhabenStateMessage).state);
  const lastState = (): VorhabenStateMessage['state'] => states()[states().length - 1];
  const pendingOf = (id: string) => lastState().pendingIntents.find((p) => p.sessionId === id);
  const setCopies = (): ReturnType<typeof vi.spyOn> => vi.spyOn(watcher, 'setCopies');
  const lastCopies = (spy: ReturnType<typeof vi.spyOn>): string[] => (spy.mock.calls[spy.mock.calls.length - 1]?.[0] as string[]) ?? [];

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'vorhaben-022-'));
    projA = join(root, 'a');
    wtRoot = join(root, 'a-worktrees');
    const dir = join(projA, 'intent', 'INT-2026-001-eins');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'intent.md'), intentText('INT-2026-001', 'angenommen'));
    mkdirSync(wtRoot, { recursive: true });
    openProjects.splice(0, openProjects.length, { id: 'pa', path: projA, name: 'A' });
    names = {};
    listCalls = 0;
    gate = null;
    isGitRepo = true;
    worktreeEnabled = true;
    resolveMainPath.mockClear();
    resolveMainPath.mockImplementation((p: string) => p);
    store = new VorhabenStateStore(join(root, 'state.json'), { port: 3111 });
    await store.load();
    broadcast = vi.fn();
    reply = vi.fn();
    watcher = new VorhabenWatcher({ debounceMs: 30 });
    manager = new FakeManager(wtRoot);
    service = new VorhabenService({
      workspace: { getState: () => ({ openProjects, sessionNames: names }) },
      store,
      broadcast,
      watcher,
      sessions: manager,
      setSessionName: (id, name) => {
        names[id] = name;
      },
      resolveModel: (sel) => sel.providerId === 'anthropic',
      timeZone: 'UTC',
      listWorktrees,
      worktreeTtlMs: 60_000,
      worktreeEnabled: () => worktreeEnabled,
      resolveMainPath,
    });
    handler = new VorhabenHandler(service, new ProjectDocsService({ gitDirty: async () => null }), store, broadcast);
    await service.start();
  });

  afterEach(async () => {
    service.stop();
    await store.flush();
    rmSync(root, { recursive: true, force: true });
  });

  // ---- AK-10, FA-07, FA-27: target ----

  it('AK-10: an intent without a target starts with `new-worktree`, explicit; two starts → two worktrees, two entries with distinct cwd (FA-27)', async () => {
    const a = await service.startStep('pa', undefined, 'intent', HAIKU, undefined, 'Absicht A');
    const b = await service.startStep('pa', undefined, 'intent', HAIKU, { kind: 'new-worktree' }, 'Absicht B');
    expect(manager.created).toHaveLength(2);
    for (const c of manager.created) expect(c.options.sessionTarget).toEqual({ target: { kind: 'new-worktree' }, explicit: true });
    const pend = store.getPendingIntents();
    expect(pend.map(([id]) => id)).toEqual([a.sessionId, b.sessionId]);
    expect(pend[0][1].cwd).not.toBe(pend[1][1].cwd);
    expect(pend[0][1].cwd).toBe(join(wtRoot, `session-${a.sessionId}`));
    // no start in the main checkout — the pending cwd is never the project path
    expect(pend.every(([, p]) => p.cwd !== projA)).toBe(true);
  });

  it('AK-10: `main` or a named worktree at the service → INVALID_MESSAGE, nothing created; the handler refuses the same (form) and lets new-worktree through', async () => {
    await expect(service.startStep('pa', undefined, 'intent', HAIKU, { kind: 'main' }, 'x')).rejects.toMatchObject({ code: 'INVALID_MESSAGE' });
    await expect(service.startStep('pa', undefined, 'intent', HAIKU, { kind: 'new-worktree', name: 'meins' }, 'x')).rejects.toMatchObject({ code: 'INVALID_MESSAGE' });
    expect(manager.created).toHaveLength(0);
    handler.handle({ type: 'vorhaben:start-step', requestId: 'r1', projectId: 'pa', step: 'intent', model: HAIKU, sessionTarget: { kind: 'main' }, firstInput: 'x' }, reply);
    handler.handle({ type: 'vorhaben:start-step', requestId: 'r2', projectId: 'pa', step: 'intent', model: HAIKU, sessionTarget: { kind: 'existing-worktree', path: projA }, firstInput: 'x' }, reply);
    const errors = reply.mock.calls.map((c) => c[0]).filter((m): m is VorhabenErrorMessage => m.type === 'vorhaben:error');
    expect(errors.map((e) => [e.requestId, e.code])).toEqual([['r1', 'INVALID_MESSAGE'], ['r2', 'INVALID_MESSAGE']]);
    expect(errors[0].message).toContain('neuen Arbeitskopie');
    expect(manager.created).toHaveLength(0);
    // form ok: absent, or new-worktree without a name
    handler.handle({ type: 'vorhaben:start-step', requestId: 'r3', projectId: 'pa', step: 'intent', model: HAIKU, sessionTarget: { kind: 'new-worktree' }, firstInput: 'Absicht C' }, reply);
    handler.handle({ type: 'vorhaben:start-step', requestId: 'r4', projectId: 'pa', step: 'intent', model: HAIKU, firstInput: 'Absicht D' }, reply);
    await tick(20);
    const started = reply.mock.calls.map((c) => c[0]).filter((m): m is VorhabenStepStartedMessage => m.type === 'vorhaben:step-started');
    expect(started.map((s) => s.requestId)).toEqual(['r3', 'r4']);
    expect(manager.created).toHaveLength(2);
    // a step WITH an intent id keeps its target (`main` default) — unchanged behaviour
    await service.startStep('pa', 'INT-2026-001', 'spec', HAIKU, undefined);
    expect(manager.created[2].options.sessionTarget).toEqual({ target: { kind: 'main' }, explicit: true });
  });

  // ---- AK-11, FA-09, FA-25: pre-checks ----

  it('AK-11: no git repo → WORKTREE_UNAVAILABLE with the terminal hint, no session, no entry', async () => {
    isGitRepo = false;
    service['worktreeCache'].clear();
    await expect(service.startStep('pa', undefined, 'intent', HAIKU, undefined, 'x')).rejects.toMatchObject({
      code: 'WORKTREE_UNAVAILABLE',
      message: 'Keine Arbeitskopie möglich: kein Git-Repository — Absicht im Terminal starten.',
    });
    expect(manager.created).toHaveLength(0);
    expect(store.getPendingIntents()).toHaveLength(0);
    expect(store.hasFirstInput('cs-1')).toBe(false);
  });

  it('AK-11 (FA-25, review E5): isolation off → WORKTREE_UNAVAILABLE with the settings hint; the check runs on the MAIN path of a registered sub-worktree', async () => {
    worktreeEnabled = false;
    const sub = join(root, 'a-worktrees', 'registered-sub');
    mkdirSync(join(sub, 'intent'), { recursive: true });
    openProjects.push({ id: 'ps', path: sub, name: 'Sub' });
    resolveMainPath.mockImplementation((p: string) => (p === sub ? projA : p));
    const enabled = vi.fn((mainPath: string) => (mainPath === projA ? false : true));
    const svc = new VorhabenService({
      workspace: { getState: () => ({ openProjects, sessionNames: names }) },
      store,
      broadcast,
      watcher: new VorhabenWatcher({ debounceMs: 30 }),
      sessions: manager,
      resolveModel: () => true,
      listWorktrees,
      worktreeEnabled: enabled,
      resolveMainPath,
    });
    await svc.start();
    try {
      await expect(svc.startStep('ps', undefined, 'intent', HAIKU, undefined, 'x')).rejects.toMatchObject({
        code: 'WORKTREE_UNAVAILABLE',
        message: 'Keine Arbeitskopie möglich: Worktree-Isolation ist für dieses Projekt abgeschaltet — in Projekt › Einstellungen einschalten oder die Absicht im Terminal starten.',
      });
      expect(resolveMainPath).toHaveBeenCalledWith(sub);
      expect(enabled).toHaveBeenCalledWith(projA);
      expect(manager.created).toHaveLength(0);
    } finally {
      svc.stop();
    }
  });

  it('AK-11 (R5): the manager throws (WORKTREE_NOT_A_GIT_REPO, disk, branch taken) → START_FAILED „Keine Arbeitskopie möglich: …", no entry, no first input', async () => {
    const err = new Error('Kein Git-Repository — eine neue Arbeitskopie ist hier nicht möglich');
    (err as Error & { code: string }).code = 'WORKTREE_NOT_A_GIT_REPO';
    manager.failNext = err;
    await expect(service.startStep('pa', undefined, 'intent', HAIKU, undefined, 'x')).rejects.toMatchObject({
      code: 'START_FAILED',
      message: 'Keine Arbeitskopie möglich: Kein Git-Repository — eine neue Arbeitskopie ist hier nicht möglich',
    });
    expect(store.getPendingIntents()).toHaveLength(0);
    expect(lastState().pendingIntents).toEqual([]);
  });

  // ---- AK-06, FA-12…FA-14, FA-08: entries ----

  it('AK-06: the entry carries project name, working title (first line, ≤ 80), state by the row rule and the branch label of its worktree (FA-08); a hand-typed /intent has no title', async () => {
    const { sessionId } = await service.startStep('pa', undefined, 'intent', HAIKU, undefined, `\n\n  ${'x'.repeat(81)}\nzweite Zeile`);
    expect(store.getPendingIntents()[0][1].arbeitstitel).toBe(`${'x'.repeat(79)}…`);
    await service.rescan();
    const p = pendingOf(sessionId)!;
    expect(p).toMatchObject({ projectId: 'pa', projectName: 'A', arbeitstitel: `${'x'.repeat(79)}…`, arbeitskopie: `session/${sessionId}`, zustand: 'arbeitet', zustandDetail: 'haiku' });
    expect(p.session).toMatchObject({ id: sessionId, name: 'intent', firstInputPending: true, step: 'intent' });
    // state follows the session: blocked → wartet_rueckfrage, done → wartet, closed → sitzung_beendet
    manager.sessions.get(sessionId)!.agentStatus = 'blocked';
    manager.sessions.get(sessionId)!.blockKind = 'rueckfrage';
    service.broadcastState();
    expect(pendingOf(sessionId)).toMatchObject({ zustand: 'wartet_rueckfrage', zustandDetail: 'Rückfrage' });
    manager.sessions.get(sessionId)!.agentStatus = 'done';
    delete manager.sessions.get(sessionId)!.blockKind;
    service.broadcastState();
    expect(pendingOf(sessionId)).toMatchObject({ zustand: 'wartet', zustandDetail: '' });
    // hand-typed in the main copy: no title, label of the main copy
    manager.add('hand', projA, 'working');
    manager.emit('session.prompt-text', 'hand', '/intent');
    await service.rescan();
    const h = pendingOf('hand')!;
    expect(h).toMatchObject({ projectName: 'A', arbeitskopie: 'main', zustand: 'arbeitet' });
    expect(h).not.toHaveProperty('arbeitstitel');
    // whitespace-only first input is refused by the handler; at the service it stores no title (review E13)
    const w = await service.startStep('pa', undefined, 'intent', HAIKU, undefined, '   \n  ');
    expect(store.getPendingIntents().find(([id]) => id === w.sessionId)![1]).not.toHaveProperty('arbeitstitel');
  });

  // ---- R1: the scan sees the new worktree ----

  it('R1 (1): the worktree list is cached — after a start the next scan reads it fresh and the new copy is watched', async () => {
    const spy = setCopies();
    expect(listCalls).toBe(1); // first scan
    const { sessionId } = await service.startStep('pa', undefined, 'intent', HAIKU, undefined, 'x');
    const copy = join(wtRoot, `session-${sessionId}`);
    // the start invalidated the cache (shortcut) → the scan reads fresh
    await service.rescan();
    expect(lastCopies(spy)).toContain(copy);
    expect(pendingOf(sessionId)?.arbeitskopie).toBe(`session/${sessionId}`);
  });

  it('R1 (2): the cache was refilled with the OLD list after the invalidation — the scan still reads fresh because the pending cwd is unknown', async () => {
    const spy = setCopies();
    const { sessionId } = await service.startStep('pa', undefined, 'intent', HAIKU, undefined, 'x');
    const copy = join(wtRoot, `session-${sessionId}`);
    // simulate a concurrent scan that filled the cache with the stale list AFTER the start's delete
    service['worktreeCache'].set(projA, { at: Date.now(), info: { isGitRepo: true, mainWorktreePath: projA, entries: [entry(projA, 'main')] } });
    const before = listCalls;
    await service.rescan();
    expect(listCalls).toBe(before + 1); // the safety net read, not the TTL
    expect(lastCopies(spy)).toContain(copy);
    expect(pendingOf(sessionId)?.arbeitskopie).toBe(`session/${sessionId}`);
    // and the cache now holds the fresh list: a further scan reads nothing
    await service.rescan();
    expect(listCalls).toBe(before + 1);
  });

  it('R1 (3): scan S1 hangs in listWorktrees while the start happens → scanDirty → S2 reads fresh and watches the copy', async () => {
    const spy = setCopies();
    service['worktreeCache'].clear();
    let release!: () => void;
    gate = new Promise<void>((r) => {
      release = r;
    });
    const s1 = service.rescan(); // takes its snapshot (old), then waits at the gate
    await tick(1);
    expect(listCalls).toBe(2);
    const { sessionId } = await service.startStep('pa', undefined, 'intent', HAIKU, undefined, 'x');
    const copy = join(wtRoot, `session-${sessionId}`);
    await tick(1); // scheduleRescan(0) fires → rescan() sees `scanning` → scanDirty
    release();
    await s1;
    // S1 finished with the OLD list; scanDirty schedules S2
    await tick(30);
    expect(listCalls).toBeGreaterThanOrEqual(3);
    expect(lastCopies(spy)).toContain(copy);
    expect(pendingOf(sessionId)?.arbeitskopie).toBe(`session/${sessionId}`);
  });

  it('FA-19: a hand-typed /intent in a worktree the last scan did not know → rescan, entry with the branch label', async () => {
    const spy = setCopies();
    const fresh = join(wtRoot, 'session-hand');
    mkdirSync(join(fresh, 'intent'), { recursive: true });
    manager.worktrees.set(fresh, 'session/hand');
    manager.add('hand', projA, 'working', fresh);
    const before = states().length;
    manager.emit('session.prompt-text', 'hand', '/intent');
    await tick(30);
    expect(states().length).toBeGreaterThan(before);
    expect(pendingOf('hand')).toMatchObject({ arbeitskopie: 'session/hand', cwd: fresh });
    expect(lastCopies(spy)).toContain(fresh);
  });

  // ---- AK-08: claim per copy ----

  it('AK-08: a folder in copy B claims only the session in B; the entry of A stays; the row carries B\'s label', async () => {
    const a = await service.startStep('pa', undefined, 'intent', HAIKU, undefined, 'A');
    const b = await service.startStep('pa', undefined, 'intent', HAIKU, undefined, 'B');
    await service.rescan();
    const cwdB = join(wtRoot, `session-${b.sessionId}`);
    const dir = join(cwdB, 'intent', 'INT-2026-002-b');
    mkdirSync(dir);
    writeFileSync(join(dir, 'intent.md'), intentText('INT-2026-002', 'entwurf', '0.1.0'));
    watcher.emit('dir-added', cwdB, 'INT-2026-002');
    await service.rescan();
    const st = lastState();
    expect(st.pendingIntents.map((p) => p.sessionId)).toEqual([a.sessionId]);
    const row = st.rows.find((r) => r.intentId === 'INT-2026-002')!;
    expect(row.session?.id).toBe(b.sessionId);
    expect(row.arbeitskopie).toBe(`session/${b.sessionId}`);
    expect(row.cwd).toBe(cwdB);
    expect(store.getAssignment('pa', 'INT-2026-002')).toMatchObject({ sessionId: b.sessionId, step: 'intent', cwd: cwdB, provider: 'anthropic' });
  });

  // ---- AK-09, FA-17, FA-18: sweep ----

  it('AK-09: closed session → entry gone on the next scan; unknown session → gone only when the restore is complete, kept (with its first input) during pending and timeout, swept once it flips', async () => {
    const closed = await service.startStep('pa', undefined, 'intent', HAIKU, undefined, 'closed');
    store.setPendingIntent('gone', { projectId: 'pa', cwd: projA, step: 'intent', model: 'opus', since: '2026-09-19T08:00:00Z' });
    store.setFirstInput('gone', { text: 'Text der toten Sitzung', versuche: 0 });
    store.setPendingIntent('late', { projectId: 'pa', cwd: projA, step: 'intent', model: 'opus', since: '2026-09-19T08:01:00Z' });
    store.setFirstInput('late', { text: 'Text der späten Sitzung', versuche: 0 });
    // during the boot restore nothing is swept
    manager.outcome = 'pending';
    await service.rescan();
    expect(store.getPendingIntents().map(([id]) => id).sort()).toEqual([closed.sessionId, 'gone', 'late'].sort());
    manager.outcome = 'timeout';
    await service.rescan();
    expect(store.getPendingIntents().map(([id]) => id).sort()).toEqual([closed.sessionId, 'gone', 'late'].sort());
    expect(store.hasFirstInput('late')).toBe(true);
    // a closed session goes regardless of the outcome
    manager.closeSession(closed.sessionId);
    await service.rescan();
    expect(store.getPendingIntents().map(([id]) => id).sort()).toEqual(['gone', 'late']);
    // `late` comes back before the restore completes → stays; `gone` never does → swept once complete
    manager.add('late', projA, 'working');
    manager.outcome = 'complete';
    await service.rescan();
    expect(store.getPendingIntents().map(([id]) => id)).toEqual(['late']);
    expect(store.hasFirstInput('gone')).toBe(false);
    expect(store.hasFirstInput('late')).toBe(true);
    expect(lastState().pendingIntents.map((p) => p.sessionId)).toEqual(['late']);
  });

  it('FA-18: entries survive a new service on the same store (backend restart) while the sessions live', async () => {
    const { sessionId } = await service.startStep('pa', undefined, 'intent', HAIKU, undefined, 'Überlebt den Neustart');
    await store.flush();
    service.stop();
    const store2 = new VorhabenStateStore(join(root, 'state.json'), { port: 3111 });
    await store2.load();
    const broadcast2 = vi.fn();
    const svc = new VorhabenService({
      workspace: { getState: () => ({ openProjects, sessionNames: names }) },
      store: store2,
      broadcast: broadcast2,
      watcher: new VorhabenWatcher({ debounceMs: 30 }),
      sessions: manager,
      resolveModel: () => true,
      listWorktrees,
      worktreeEnabled: () => true,
      resolveMainPath,
    });
    await svc.start();
    try {
      const st = (broadcast2.mock.calls.map((c) => c[0]).filter((m) => m.type === 'vorhaben:state').pop() as VorhabenStateMessage).state;
      expect(st.pendingIntents.map((p) => p.sessionId)).toEqual([sessionId]);
      expect(st.pendingIntents[0]).toMatchObject({ arbeitstitel: 'Überlebt den Neustart', arbeitskopie: `session/${sessionId}`, projectName: 'A' });
      expect(existsSync(join(wtRoot, `session-${sessionId}`))).toBe(true);
    } finally {
      svc.stop();
      await store2.flush();
    }
  });
});
