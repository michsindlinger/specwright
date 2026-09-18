/**
 * INT-2026-018: „Nächster Schritt" starts in the finished session — the
 * service's three ways (AK-04 `/clear` + command in the live session, AK-05
 * new session + close the old one, AK-10 as today), the shared rule
 * (`SESSION_BUSY` text == the row's `nextStep.sperre`), the fail-closed write
 * path (AK-08), the lock, and the reference fields the rule needs. The
 * terminal manager is a fake after `vorhaben-service-resume.test.ts`; its
 * `sendInput` can answer a pasted `/clear` with the SessionStart hook.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';

import { CLEAR_WAIT_MS, PASTE_END, PASTE_START, VorhabenError, VorhabenService, type VorhabenSessionInfo } from '../../src/server/services/vorhaben-service.js';
import { VorhabenStateStore } from '../../src/server/services/vorhaben-state.js';
import { VorhabenWatcher } from '../../src/server/services/vorhaben-watcher.js';
import type { OutboundMessage } from '../../src/server/services/vorhaben-handler.js';
import type { ParsedTarget } from '../../src/server/utils/session-target.js';
import { NEXT_STEP_SPERRE_TEXT, type VorhabenNextStepSperre, type VorhabenStateMessage } from '../../src/shared/types/vorhaben.protocol.js';

const intentText = (id: string, status: string): string => `---\nintent_id: "${id}"  \ntitel: "Titel ${id}"  \nstatus: "${status}"  \nversion: "1.0.0"  \nbypass: "ja"  \n---\n`;

const UUID = 'a208d3a5-1da0-4f76-88fd-80493778110e';
const UUID2 = '11111111-2222-4333-8444-555555555555';
const UUID3 = '22222222-3333-4444-8555-666666666666';
const FIXTURES = resolve(process.cwd(), 'tests', 'fixtures', 'tui', '2.1.276');
const IDLE_SCREEN = readFileSync(join(FIXTURES, 'prompt-idle.txt'), 'utf8');
const WORKING_SCREEN = readFileSync(join(FIXTURES, 'prompt-working.txt'), 'utf8');
const PLAN_DIALOG_SCREEN = readFileSync(resolve(process.cwd(), 'tests', 'fixtures', 'tui', '2.1.273', 'plan-dialog.txt'), 'utf8');
/** INT-2026-021: a waiting session whose input box carries the text „npm run verify" (recorded on 2.1.277). */
const TEXT_SCREEN = readFileSync(resolve(process.cwd(), 'tests', 'fixtures', 'tui', '2.1.277', 'prompt-eingabe-text.txt'), 'utf8');
const CLEAR = PASTE_START + '/clear' + PASTE_END;
const CMD = PASTE_START + '/specwright:plan INT-2026-001' + PASTE_END;
const HAIKU = { providerId: 'anthropic', modelId: 'haiku' };

interface CreateCall {
  projectPath: string;
  modelConfig: { model: string; provider?: string };
  initialPrompt: string | undefined;
  options: { sessionTarget?: ParsedTarget };
}

class FakeManager extends EventEmitter {
  public sessions = new Map<string, VorhabenSessionInfo>();
  /** Every write and the lock's edges, in order (`lock`/`unlock` for test (6)). */
  public log: Array<[string, string]> = [];
  public created: CreateCall[] = [];
  public closed: Array<[string, { closedBy?: 'user' } | undefined]> = [];
  public screen: string = IDLE_SCREEN;
  public live = true;
  public failNext: Error | null = null;
  public sendFails = false;
  /** What the fake does when `/clear` is pasted: report a new id at once, the same id, a foreign id, or nothing. */
  public onClear: 'new' | 'same' | 'foreign' | 'none' = 'new';
  /** Runs inside the first `readScreen` (tests (8), (8b)). */
  public duringRead: (() => void) | null = null;
  private n = 0;
  getSession(id: string): VorhabenSessionInfo | undefined {
    return this.sessions.get(id);
  }
  sendInput(id: string, data: string): boolean {
    if (this.sendFails) return false;
    this.log.push([id, data]);
    if (data === CLEAR) {
      const s = this.sessions.get(id);
      if (this.onClear === 'new') this.hook(id, UUID2);
      else if (this.onClear === 'same') this.hook(id, s?.claudeSessionId ?? UUID);
      else if (this.onClear === 'foreign') this.hook(id, UUID3);
    }
    return true;
  }
  async readScreen(): Promise<{ text: string; live: boolean }> {
    const f = this.duringRead;
    this.duringRead = null;
    f?.();
    return { text: this.screen, live: this.live };
  }
  async waitForIdle(): Promise<void> {}
  async withMachineWrite<T>(id: string, fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; grund: 'beschaeftigt' | 'nicht_aktiv' }> {
    this.log.push([id, 'lock']);
    try {
      return { ok: true, value: await fn() };
    } finally {
      this.log.push([id, 'unlock']);
    }
  }
  closeSession(id: string, opts?: { closedBy?: 'user' }): boolean {
    this.closed.push([id, opts]);
    const s = this.sessions.get(id);
    if (!s) return false;
    s.status = 'closed';
    return true;
  }
  restoreOutcome(): 'pending' | 'complete' | 'timeout' {
    return 'complete';
  }
  async createSession(...args: unknown[]): Promise<{ sessionId: string; effectiveCwd: string }> {
    const call: CreateCall = { projectPath: args[0] as string, modelConfig: args[2] as { model: string; provider?: string }, initialPrompt: args[5] as string | undefined, options: (args[8] as { sessionTarget?: ParsedTarget }) ?? {} };
    this.created.push(call);
    if (this.failNext) {
      const err = this.failNext;
      this.failNext = null;
      throw err;
    }
    const id = `cs-${++this.n}`;
    const target = call.options.sessionTarget?.target;
    const effectiveCwd = target && target.kind === 'existing-worktree' ? target.path : call.projectPath;
    this.add(id, effectiveCwd, 'working', call.modelConfig);
    return { sessionId: id, effectiveCwd };
  }
  add(id: string, cwd: string, agentStatus: VorhabenSessionInfo['agentStatus'], modelConfig: { model: string; provider?: string } = { model: 'haiku', provider: 'anthropic' }, claudeSessionId: string | undefined = UUID): void {
    this.sessions.set(id, { sessionId: id, status: 'active', projectPath: cwd, effectiveCwd: cwd, terminalType: 'claude-code', agentStatus, modelConfig, ...(claudeSessionId ? { claudeSessionId } : {}) });
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
    return this.log.filter(([sid, d]) => sid === id && d !== 'lock' && d !== 'unlock').map(([, d]) => d);
  }
}

const tick = (ms = 5): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe('VorhabenService „Nächster Schritt" in der Sitzung (INT-2026-018)', () => {
  let root: string;
  let projA: string;
  let wt: string;
  let store: VorhabenStateStore;
  let broadcast: ReturnType<typeof vi.fn<(m: OutboundMessage) => void>>;
  let service: VorhabenService;
  let watcher: VorhabenWatcher;
  let manager: FakeManager;
  let names: Record<string, string>;
  const openProjects: Array<{ id: string; path: string; name: string }> = [];

  const lastState = (): VorhabenStateMessage['state'] => {
    const states = broadcast.mock.calls.map((c) => c[0]).filter((m) => m.type === 'vorhaben:state') as VorhabenStateMessage[];
    return states[states.length - 1].state;
  };
  const row = (id = 'INT-2026-001') => lastState().rows.find((r) => r.intentId === id)!;
  const assignment = (id = 'INT-2026-001') => store.getAssignment('pa', id);

  /** A live session assigned to `step` of the row, quiet (`done`), hook id UUID, in `cwd`. */
  async function liveSession(step: 'intent' | 'spec' | 'plan' | 'build' = 'intent', opts: { cwd?: string; agentStatus?: VorhabenSessionInfo['agentStatus']; provider?: string; assignmentProvider?: string | null; model?: string; intentId?: string } = {}): Promise<string> {
    const id = `s-${step}-${Math.random().toString(36).slice(2, 6)}`;
    const cwd = opts.cwd ?? projA;
    const model = opts.model ?? 'haiku';
    manager.add(id, cwd, opts.agentStatus ?? 'done', { model, ...(opts.provider !== undefined ? { provider: opts.provider } : { provider: 'anthropic' }) });
    const provider = opts.assignmentProvider === null ? {} : { provider: opts.assignmentProvider ?? 'anthropic' };
    store.setAssignment('pa', opts.intentId ?? 'INT-2026-001', { sessionId: id, step, model, cwd, at: '2026-09-18T06:00:00.000Z', claudeSessionId: UUID, ...provider });
    names[id] = `${step} ${opts.intentId ?? 'INT-2026-001'}`;
    await service.rescan();
    return id;
  }

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'vorhaben-018-'));
    projA = join(root, 'a');
    wt = join(root, 'a-worktrees', 'session-x');
    // INT-2026-001: intent angenommen, bypass → phase plan, next step `plan`, no document awaiting approval.
    for (const base of [projA, wt]) {
      const dir = join(base, 'intent', 'INT-2026-001-eins');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'intent.md'), intentText('INT-2026-001', 'angenommen'));
    }
    // INT-2026-002: phase plan with plan.md entwurf → freigabeDoc plan.
    const two = join(projA, 'intent', 'INT-2026-002-zwei');
    mkdirSync(two, { recursive: true });
    writeFileSync(join(two, 'intent.md'), intentText('INT-2026-002', 'angenommen'));
    writeFileSync(join(two, 'plan.md'), '# Plan\n\n> **Status:** entwurf\n');
    // INT-2026-003: phase bau, interrupted (build-stand.md).
    const three = join(projA, 'intent', 'INT-2026-003-drei');
    mkdirSync(three, { recursive: true });
    writeFileSync(join(three, 'intent.md'), intentText('INT-2026-003', 'angenommen'));
    writeFileSync(join(three, 'plan.md'), '# Plan\n\n> **Status:** in_umsetzung\n');
    writeFileSync(join(three, 'build-stand.md'), '# Stand\n');
    openProjects.splice(0, openProjects.length, { id: 'pa', path: projA, name: 'A' });
    names = {};
    store = new VorhabenStateStore(join(root, 'state.json'), { port: 3111 });
    await store.load();
    broadcast = vi.fn();
    watcher = new VorhabenWatcher({ debounceMs: 30 });
    manager = new FakeManager();
    service = new VorhabenService({
      workspace: { getState: () => ({ openProjects, sessionNames: names }) },
      store,
      broadcast,
      watcher,
      sessions: manager,
      setSessionName: (id, name) => {
        names[id] = name;
      },
      resolveModel: (sel) => (sel.providerId === 'anthropic' && ['opus', 'haiku', 'sonnet'].includes(sel.modelId)) || (sel.providerId === 'glm' && sel.modelId === 'glm-5.2'),
      timeZone: 'UTC',
      listWorktrees: async () => ({ isGitRepo: true, mainWorktreePath: projA, entries: [{ path: projA, branch: 'main', bare: false, prunable: false, head: 'x' }, { path: wt, branch: 'session/x', bare: false, prunable: false, head: 'y' }] as never }),
    });
    await service.start();
  });

  afterEach(async () => {
    vi.useRealTimers();
    service.stop();
    await store.flush();
    rmSync(root, { recursive: true, force: true });
  });

  it('AK-04: same model and target → `/clear`, Enter, command, Enter in the live session under one lock; assignment moves to the new step with the new conversation id; tab renamed; no createSession', async () => {
    const id = await liveSession('intent');
    expect(row().nextStep).toMatchObject({ step: 'plan', sitzung: { id, model: HAIKU, target: { kind: 'main' } } });
    expect(row().sessionBusy).toBe(false);
    const r = await service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' });
    expect(r).toEqual({ sessionId: id, modus: 'in_sitzung' });
    expect(manager.log.filter(([sid]) => sid === id)).toEqual([[id, 'lock'], [id, CLEAR], [id, '\r'], [id, CMD], [id, '\r'], [id, 'unlock']]);
    expect(manager.created).toEqual([]);
    expect(manager.closed).toEqual([]);
    expect(assignment()).toMatchObject({ sessionId: id, step: 'plan', model: 'haiku', provider: 'anthropic', cwd: projA, claudeSessionId: UUID2 });
    expect(assignment()?.resumed).toBeUndefined();
    expect(names[id]).toBe('plan INT-2026-001');
    // AK-09: the session's model is the last model of the step now.
    expect(store.getLastModel('pa', 'INT-2026-001', 'plan')).toEqual(HAIKU);
  });

  it('AK-04 (Ziel Worktree): session in a worktree → `existing-worktree` with that path continues in the session; `main` starts a new one and closes it (AK-05)', async () => {
    const id = await liveSession('intent', { cwd: wt });
    expect(row().nextStep?.sitzung?.target).toEqual({ kind: 'existing-worktree', path: wt });
    const r = await service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'existing-worktree', path: wt });
    expect(r.modus).toBe('in_sitzung');
    expect(manager.writes(id)).toEqual([CLEAR, '\r', CMD, '\r']);
    // second row set-up: back to step intent, now choose main
    const id2 = await liveSession('intent', { cwd: wt });
    const r2 = await service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' });
    expect(r2).toEqual({ sessionId: 'cs-1', modus: 'neu', geschlossen: id2 });
    expect(manager.closed).toEqual([[id2, { closedBy: 'user' }]]);
    expect(manager.writes(id2)).toEqual([]);
  });

  it('AK-05: another model, another provider or a new worktree → new session with the command as initial prompt, then the old one closed as the user; createSession failure leaves the old one untouched', async () => {
    const id = await liveSession('intent');
    const r = await service.startStep('pa', 'INT-2026-001', 'plan', { providerId: 'anthropic', modelId: 'sonnet' }, { kind: 'main' });
    expect(r).toEqual({ sessionId: 'cs-1', modus: 'neu', geschlossen: id });
    expect(manager.created).toHaveLength(1);
    expect(manager.created[0]).toMatchObject({ initialPrompt: '/specwright:plan INT-2026-001', modelConfig: { model: 'sonnet', provider: 'anthropic' } });
    expect(manager.closed).toEqual([[id, { closedBy: 'user' }]]);
    expect(manager.writes(id)).toEqual([]);
    expect(assignment()).toMatchObject({ sessionId: 'cs-1', step: 'plan', model: 'sonnet' });
    // AK-09 on this path: the chosen model is remembered
    expect(store.getLastModel('pa', 'INT-2026-001', 'plan')).toEqual({ providerId: 'anthropic', modelId: 'sonnet' });
    // another provider
    const idB = await liveSession('intent');
    const rB = await service.startStep('pa', 'INT-2026-001', 'plan', { providerId: 'glm', modelId: 'glm-5.2' }, { kind: 'main' });
    expect(rB).toMatchObject({ modus: 'neu', geschlossen: idB });
    // new worktree
    const idC = await liveSession('intent');
    const rC = await service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'new-worktree' });
    expect(rC).toMatchObject({ modus: 'neu', geschlossen: idC });
    // createSession throws → old session stays, START_FAILED
    const idD = await liveSession('intent');
    manager.failNext = new Error('spawn failed');
    const closedBefore = manager.closed.length;
    await expect(service.startStep('pa', 'INT-2026-001', 'plan', { providerId: 'anthropic', modelId: 'opus' }, { kind: 'main' })).rejects.toMatchObject({ code: 'START_FAILED' });
    expect(manager.closed).toHaveLength(closedBefore);
    expect(assignment()).toMatchObject({ sessionId: idD, step: 'intent' });
    expect(manager.getSession(idD)?.status).toBe('active');
  });

  it('AK-06: after the click the row shows the new step and is locked (gleiche_phase); prompt-submitted → arbeitet; the typed-command hook is idempotent', async () => {
    const id = await liveSession('intent');
    await service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' });
    await tick(30);
    expect(row().session).toMatchObject({ id, step: 'plan', name: 'plan INT-2026-001' });
    expect(row().nextStep?.sperre).toBe('gleiche_phase');
    expect(row().sessionBusy).toBe(true);
    manager.status(id, 'working', 'prompt-submitted');
    await tick(30);
    expect(row().zustand).toBe('arbeitet');
    expect(row().nextStep?.sperre).toBe('arbeitet');
    const before = assignment()!;
    manager.emit('session.prompt-text', id, '/specwright:plan INT-2026-001');
    await tick(30);
    expect(assignment()).toMatchObject({ sessionId: before.sessionId, step: 'plan', model: 'haiku', cwd: projA, claudeSessionId: UUID2 });
  });

  it('Regel = Fehlertext: for every locked row `startStep` throws SESSION_BUSY with the text of the broadcast `nextStep.sperre`; no writes, no createSession', async () => {
    const cases: Array<{ sperre: VorhabenNextStepSperre; setup: () => Promise<string> }> = [
      { sperre: 'arbeitet', setup: () => liveSession('intent', { agentStatus: 'working' }) },
      { sperre: 'dialog', setup: () => liveSession('intent', { agentStatus: 'blocked' }) },
      { sperre: 'unbekannt', setup: () => liveSession('intent', { agentStatus: 'unknown' }) },
      {
        sperre: 'erste_eingabe',
        setup: async () => {
          const id = await liveSession('intent');
          store.setFirstInput(id, { text: 'x', versuche: 0 });
          await service.rescan();
          return id;
        },
      },
      { sperre: 'gleiche_phase', setup: () => liveSession('plan') },
      { sperre: 'gleiche_phase', setup: () => liveSession('build') },
    ];
    for (const c of cases) {
      const id = await c.setup();
      expect(row().nextStep?.sperre, c.sperre).toBe(c.sperre);
      expect(row().sessionBusy).toBe(true);
      expect(row().nextStep?.sitzung).toBeUndefined();
      const err = await service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' }).catch((e) => e as VorhabenError);
      expect(err).toBeInstanceOf(VorhabenError);
      expect((err as VorhabenError).code).toBe('SESSION_BUSY');
      expect((err as VorhabenError).message).toBe(NEXT_STEP_SPERRE_TEXT[row().nextStep!.sperre!]);
      expect(manager.writes(id)).toEqual([]);
      store.clearFirstInput(id);
    }
    // freigabe_offen: INT-2026-002 (plan.md entwurf) with a spec-step session
    const id2 = await liveSession('spec', { intentId: 'INT-2026-002' });
    expect(row('INT-2026-002').nextStep?.sperre).toBe('freigabe_offen');
    await expect(service.startStep('pa', 'INT-2026-002', 'plan', HAIKU, { kind: 'main' })).rejects.toMatchObject({ code: 'SESSION_BUSY', message: NEXT_STEP_SPERRE_TEXT.freigabe_offen });
    expect(manager.writes(id2)).toEqual([]);
    expect(manager.created).toEqual([]);
    // E16: for a usable row the broadcast target is exactly what sameTarget accepts
    const id3 = await liveSession('intent', { cwd: wt });
    const t = row().nextStep!.sitzung!.target;
    expect(t).toEqual({ kind: 'existing-worktree', path: wt });
    expect((await service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, t)).modus).toBe('in_sitzung');
    expect(manager.writes(id3)).toEqual([CLEAR, '\r', CMD, '\r']);
  });

  it('Provider-Fallback (E4): assignment without provider and live session without one → anthropic; a live provider beats the assignment', async () => {
    const id = await liveSession('intent', { provider: undefined, assignmentProvider: null });
    expect(row().session?.provider).toBe('anthropic');
    expect(row().nextStep?.sitzung?.model).toEqual(HAIKU);
    expect((await service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' })).modus).toBe('in_sitzung');
    expect(manager.writes(id)).toEqual([CLEAR, '\r', CMD, '\r']);
    const idB = await liveSession('intent', { provider: 'glm', assignmentProvider: 'anthropic', model: 'glm-5.2' });
    expect(row().session?.provider).toBe('glm');
    // the same model as the session (glm) continues in it; anthropic/haiku would be another provider → new session
    expect((await service.startStep('pa', 'INT-2026-001', 'plan', { providerId: 'glm', modelId: 'glm-5.2' }, { kind: 'main' })).modus).toBe('in_sitzung');
    expect(manager.writes(idB)).toEqual([CLEAR, '\r', CMD, '\r']);
  });

  it('AK-10: no assignment, an ended or an errored session → createSession as today, modus neu without geschlossen, no closeSession', async () => {
    const r0 = await service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' });
    expect(r0).toEqual({ sessionId: 'cs-1', modus: 'neu' });
    manager.closeSession('cs-1');
    manager.closed = [];
    const r1 = await service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' });
    expect(r1).toEqual({ sessionId: 'cs-2', modus: 'neu' });
    expect(manager.closed).toEqual([]);
    const idE = await liveSession('intent', { agentStatus: 'error' });
    const r2 = await service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' });
    expect(r2).toEqual({ sessionId: 'cs-3', modus: 'neu' });
    expect(manager.closed).toEqual([]);
    expect(manager.writes(idE)).toEqual([]);
    // (5) the session closed between page and click (manager knows it as closed) → same path, no error
    const idF = await liveSession('intent');
    manager.getSession(idF)!.status = 'closed';
    const r3 = await service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' });
    expect(r3).toEqual({ sessionId: 'cs-4', modus: 'neu' });
    expect(manager.closed).toEqual([]);
  });

  it('NZ-04: „Bau fortsetzen" with a quiet plan session → new session, the old one stays open', async () => {
    const id = await liveSession('plan', { intentId: 'INT-2026-003' });
    expect(row('INT-2026-003')).toMatchObject({ zustand: 'bau_unterbrochen', sessionBusy: false });
    expect(row('INT-2026-003').nextStep?.sitzung).toBeUndefined();
    const r = await service.startStep('pa', 'INT-2026-003', 'build', HAIKU, { kind: 'main' });
    expect(r).toEqual({ sessionId: 'cs-1', modus: 'neu' });
    expect(manager.closed).toEqual([]);
    expect(manager.writes(id)).toEqual([]);
    expect(manager.getSession(id)?.status).toBe('active');
  });

  it('erste Eingabe in der Sitzung: `firstInput` is stored for the live session and pasted at its next Stop', async () => {
    const id = await liveSession('intent');
    await service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' }, 'Bitte knapp halten.');
    expect(store.hasFirstInput(id)).toBe(true);
    await tick(30);
    expect(row().session?.firstInputPending).toBe(true);
    expect(row().nextStep?.sperre).toBe('erste_eingabe');
    manager.status(id, 'done', 'stop');
    await tick(250);
    expect(manager.writes(id)).toEqual([CLEAR, '\r', CMD, '\r', PASTE_START + 'Bitte knapp halten.' + PASTE_END, '\r']);
    expect(store.hasFirstInput(id)).toBe(false);
  });

  it('Referenzfelder: sessionFor names step, provider and target (main for the project path, existing-worktree else); a pending /intent ref says step intent', async () => {
    await liveSession('spec');
    expect(row().session).toMatchObject({ step: 'spec', provider: 'anthropic', target: { kind: 'main' } });
    await liveSession('spec', { cwd: wt });
    expect(row().session).toMatchObject({ step: 'spec', target: { kind: 'existing-worktree', path: wt } });
    manager.add('pend', projA, 'working');
    store.setPendingIntent('pend', { projectId: 'pa', cwd: projA, step: 'intent', model: 'haiku', since: '2026-09-18T06:00:00.000Z', provider: 'anthropic' });
    service.broadcastState();
    expect(lastState().pendingIntents.find((p) => p.sessionId === 'pend')?.session).toMatchObject({ step: 'intent', provider: 'anthropic' });
    // an ended session carries none of the three (AK-10)
    manager.closeSession('pend');
    store.markSessionEnded('pend');
  });

  describe('AK-08: fail closed', () => {
    it('(1) no new conversation id within CLEAR_WAIT_MS → SESSION_WRITE_FAILED, one warn, only /clear + Enter written, assignment untouched, waiter gone, second click works', async () => {
      const id = await liveSession('intent');
      manager.onClear = 'none';
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.useFakeTimers();
      const p = service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' }).catch((e) => e as VorhabenError);
      await vi.advanceTimersByTimeAsync(CLEAR_WAIT_MS + 500);
      const err = await p;
      vi.useRealTimers();
      expect(err).toBeInstanceOf(VorhabenError);
      expect((err as VorhabenError).code).toBe('SESSION_WRITE_FAILED');
      expect((err as VorhabenError).message).toMatch(/Leeren der Sitzung nicht bestätigt/);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toMatch(/Leeren nicht bestätigt/);
      warn.mockRestore();
      expect(manager.writes(id)).toEqual([CLEAR, '\r']);
      expect(manager.log.filter(([sid]) => sid === id).at(-1)).toEqual([id, 'unlock']);
      expect(assignment()).toMatchObject({ sessionId: id, step: 'intent', claudeSessionId: UUID });
      expect(names[id]).toBe('intent INT-2026-001');
      // the waiter is gone: the next click arms a new one and goes through
      manager.onClear = 'new';
      expect((await service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' })).modus).toBe('in_sitzung');
      expect(manager.writes(id)).toEqual([CLEAR, '\r', CLEAR, '\r', CMD, '\r']);
    });

    it('(1b) the hook reports the SAME id as before → does not count, timeout like (1)', async () => {
      const id = await liveSession('intent');
      manager.onClear = 'same';
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.useFakeTimers();
      const p = service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' }).catch((e) => e as VorhabenError);
      await vi.advanceTimersByTimeAsync(CLEAR_WAIT_MS + 500);
      const err = await p;
      vi.useRealTimers();
      expect((err as VorhabenError).code).toBe('SESSION_WRITE_FAILED');
      expect(manager.writes(id)).toEqual([CLEAR, '\r']);
    });

    it('(1c) the hook reports the new id already at the paste, before Enter → goes through (waiter armed before the paste)', async () => {
      const id = await liveSession('intent');
      manager.onClear = 'new'; // the fake answers synchronously inside sendInput — before `\r`
      expect((await service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' })).modus).toBe('in_sitzung');
      expect(manager.writes(id)).toEqual([CLEAR, '\r', CMD, '\r']);
    });

    it('(1d) a foreign new id (a /clear typed by hand at the same moment) arrives after arming → the conversation is new, the command is pasted', async () => {
      const id = await liveSession('intent');
      manager.onClear = 'foreign';
      expect((await service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' })).modus).toBe('in_sitzung');
      expect(manager.writes(id)).toEqual([CLEAR, '\r', CMD, '\r']);
      expect(assignment()?.claudeSessionId).toBe(UUID3);
    });

    it('(2) a plan dialog on the screen → dialog_offen text, no writes; (9) a running turn on the screen → arbeitet, no writes; live:false → kein_bildschirm', async () => {
      const id = await liveSession('intent');
      manager.screen = PLAN_DIALOG_SCREEN;
      await expect(service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' })).rejects.toMatchObject({ code: 'SESSION_WRITE_FAILED', message: 'die Sitzung zeigt einen Dialog — im Terminal antworten' });
      expect(manager.writes(id)).toEqual([]);
      manager.screen = WORKING_SCREEN;
      await expect(service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' })).rejects.toMatchObject({ code: 'SESSION_WRITE_FAILED', message: 'Sitzung arbeitet — warten' });
      expect(manager.writes(id)).toEqual([]);
      manager.screen = IDLE_SCREEN;
      manager.live = false;
      await expect(service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' })).rejects.toMatchObject({ code: 'SESSION_WRITE_FAILED', message: expect.stringMatching(/Bildschirm der Sitzung nicht lesbar/) });
      expect(manager.writes(id)).toEqual([]);
      expect(assignment()).toMatchObject({ step: 'intent' });
    });

    it('(10) INT-2026-021: text in the input box → PROMPT_NOT_EMPTY naming the text, no writes (AK-01, AK-02)', async () => {
      const id = await liveSession('intent');
      manager.screen = TEXT_SCREEN;
      await expect(service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' })).rejects.toMatchObject({
        code: 'PROMPT_NOT_EMPTY',
        message: 'in der Eingabezeile der Sitzung steht noch Text: „npm run verify" — im Terminal abschicken oder löschen, dann erneut klicken',
      });
      expect(manager.writes(id)).toEqual([]);
      expect(assignment()).toMatchObject({ step: 'intent' });
    });

    it('(10b) INT-2026-021: the text appears only after `/clear` → same refusal, the command stays out', async () => {
      const id = await liveSession('intent');
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const orig = manager.sendInput.bind(manager);
      manager.sendInput = (sid: string, data: string): boolean => {
        const ok = orig(sid, data);
        if (data === CLEAR) manager.screen = TEXT_SCREEN; // the user types between the two pastes
        return ok;
      };
      await expect(service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' })).rejects.toMatchObject({ code: 'PROMPT_NOT_EMPTY' });
      expect(manager.writes(id)).toEqual([CLEAR, '\r']);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('nach /clear steht Text in der Eingabezeile'));
      warn.mockRestore();
    });

    it('(10d) INT-2026-021: with eingabeLeeren Ctrl-U clears the box, then the normal path runs (AK-06, AK-07)', async () => {
      const id = await liveSession('intent');
      manager.screen = TEXT_SCREEN;
      const orig = manager.sendInput.bind(manager);
      manager.sendInput = (sid: string, data: string): boolean => {
        const ok = orig(sid, data);
        if (data === '\x15') manager.screen = IDLE_SCREEN;
        return ok;
      };
      const r = await service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' }, undefined, true);
      expect(r.modus).toBe('in_sitzung');
      expect(manager.writes(id)).toEqual(['\x15', CLEAR, '\r', CMD, '\r']);
    });

    it('(10e) INT-2026-021: Ctrl-U then Esc Esc and the box is still filled → PROMPT_NOT_EMPTY, nothing pasted (AK-07)', async () => {
      const id = await liveSession('intent');
      manager.screen = TEXT_SCREEN; // stays filled whatever we press
      await expect(service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' }, undefined, true)).rejects.toMatchObject({ code: 'PROMPT_NOT_EMPTY' });
      expect(manager.writes(id)).toEqual(['\x15', '\x1b', '\x1b']);
      expect(assignment()).toMatchObject({ step: 'intent' });
    });

    it('(10f) INT-2026-021: without the flag no key is ever sent (AK-06: only the second button clears)', async () => {
      const id = await liveSession('intent');
      manager.screen = TEXT_SCREEN;
      await expect(service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' })).rejects.toMatchObject({ code: 'PROMPT_NOT_EMPTY' });
      expect(manager.writes(id)).toEqual([]);
    });

    it('(3) the machine-write lock is busy → beschaeftigt text, no writes', async () => {
      const id = await liveSession('intent');
      manager.withMachineWrite = async () => ({ ok: false, grund: 'beschaeftigt' });
      await expect(service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' })).rejects.toMatchObject({ code: 'SESSION_WRITE_FAILED', message: 'die UI schreibt gerade in die Sitzung — gleich noch einmal' });
      expect(manager.writes(id)).toEqual([]);
    });

    it('(3b) without a lock a second clearAndPaste of the same session meets the first waiter → beschaeftigt; the first one completes', async () => {
      const id = await liveSession('intent');
      (manager as { withMachineWrite?: unknown }).withMachineWrite = undefined;
      manager.onClear = 'none';
      const first = service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' });
      const second = service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' }).catch((e) => e as VorhabenError);
      await tick(200);
      expect(manager.writes(id)).toEqual([CLEAR, '\r']);
      manager.hook(id, UUID2);
      expect((await first).modus).toBe('in_sitzung');
      expect(((await second) as VorhabenError).message).toBe('die UI schreibt gerade in die Sitzung — gleich noch einmal');
      expect(manager.writes(id)).toEqual([CLEAR, '\r', CMD, '\r']);
    });

    it('(4) sendInput fails → senden_fehlgeschlagen, the waiter is cancelled (a retry is possible at once)', async () => {
      const id = await liveSession('intent');
      manager.sendFails = true;
      await expect(service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' })).rejects.toMatchObject({ code: 'SESSION_WRITE_FAILED', message: 'Eingabe konnte nicht in die Sitzung geschrieben werden' });
      manager.sendFails = false;
      expect((await service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' })).modus).toBe('in_sitzung');
      expect(manager.writes(id)).toEqual([CLEAR, '\r', CMD, '\r']);
    });

    it('(6) the lock is released only after the second Enter (E2/E10)', async () => {
      const id = await liveSession('intent');
      await service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' });
      const l = manager.log.filter(([sid]) => sid === id).map(([, d]) => d);
      expect(l.indexOf('unlock')).toBe(l.indexOf('lock') + 5);
      expect(l.slice(l.indexOf('lock'), l.indexOf('unlock') + 1)).toEqual(['lock', CLEAR, '\r', CMD, '\r', 'unlock']);
    });

    it('(7) `vorher` is the LIVE id, not the one stored in the assignment (E1/E3)', async () => {
      const id = await liveSession('intent');
      // assignment says UUID; the live session already reports UUID2 (a hook between page and click)
      manager.getSession(id)!.claudeSessionId = UUID2;
      // the fake answers /clear with UUID — different from the live id → counts as new
      manager.onClear = 'same';
      manager.getSession(id)!.claudeSessionId = UUID2;
      const orig = manager.sendInput.bind(manager);
      manager.sendInput = (sid: string, data: string): boolean => {
        if (data === CLEAR) {
          manager.log.push([sid, data]);
          manager.hook(sid, UUID);
          return true;
        }
        return orig(sid, data);
      };
      expect((await service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' })).modus).toBe('in_sitzung');
      expect(manager.writes(id)).toEqual([CLEAR, '\r', CMD, '\r']);
    });

    it('(8) the status turns working during the screen read → arbeitet, no writes; (8b) the assignment moves during the read → beschaeftigt, no writes (E15)', async () => {
      const id = await liveSession('intent');
      manager.duringRead = () => manager.status(id, 'working');
      await expect(service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' })).rejects.toMatchObject({ code: 'SESSION_WRITE_FAILED', message: 'Sitzung arbeitet — warten' });
      expect(manager.writes(id)).toEqual([]);
      const idB = await liveSession('intent');
      manager.duringRead = () => store.moveAssignment(idB, 'pa', 'INT-2026-001', { sessionId: idB, step: 'build', model: 'haiku', cwd: projA, at: '2026-09-18T06:01:00.000Z' });
      await expect(service.startStep('pa', 'INT-2026-001', 'plan', HAIKU, { kind: 'main' })).rejects.toMatchObject({ code: 'SESSION_WRITE_FAILED', message: 'die UI schreibt gerade in die Sitzung — gleich noch einmal' });
      expect(manager.writes(idB)).toEqual([]);
    });
  });
});
