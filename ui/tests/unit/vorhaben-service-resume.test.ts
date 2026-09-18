/**
 * INT-2026-019: a Vorhaben session lost to a crash is resumed when the page
 * is opened — `resumeIfLost` (AK-01–AK-06, AK-08, AK-09), the Claude session
 * id in the assignment (four writers, hook listener, backfill at start), the
 * single flight per row and the RESUME_RUNNING lock of `startStep` /
 * `assignSession` (AK-04). The terminal manager is a fake whose
 * `createSession` maps the positional arguments onto a named object once
 * (review E10) — tests read names, never indices.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { PASTE_START, VorhabenError, VorhabenService, type VorhabenSessionInfo } from '../../src/server/services/vorhaben-service.js';
import { VorhabenStateStore } from '../../src/server/services/vorhaben-state.js';
import { VorhabenWatcher } from '../../src/server/services/vorhaben-watcher.js';
import { VorhabenHandler, type OutboundMessage } from '../../src/server/services/vorhaben-handler.js';
import { ProjectDocsService } from '../../src/server/services/project-docs.service.js';
import type { ParsedTarget } from '../../src/server/utils/session-target.js';
import type { VorhabenStateMessage } from '../../src/shared/types/vorhaben.protocol.js';

const intentText = (id: string, status: string, version = '1.0.0'): string =>
  `---\nintent_id: "${id}"  \ntitel: "Titel ${id}"  \nstatus: "${status}"  \nversion: "${version}"  \nbypass: "ja"  \n---\n`;

const UUID = 'a208d3a5-1da0-4f76-88fd-80493778110e';
const UUID2 = '11111111-2222-4333-8444-555555555555';
const PROMPT_SCREEN = '─────\n❯ \n─────\n  ⏵⏵ bypass permissions on (shift+tab to cycle)\n';

interface CreateCall {
  projectPath: string;
  terminalType: string;
  modelConfig: { model: string; provider?: string };
  initialPrompt: string | undefined;
  extraCliArgs: string[] | undefined;
  options: { sessionTarget?: ParsedTarget };
}

class FakeManager extends EventEmitter {
  public sessions = new Map<string, VorhabenSessionInfo>();
  public writes: Array<[string, string]> = [];
  public created: CreateCall[] = [];
  public closed: string[] = [];
  public outcome: 'pending' | 'complete' | 'timeout' = 'complete';
  /** Claude session id a new session carries right away (the hook fired before the assignment was written). */
  public idOnCreate: string | undefined = undefined;
  /** Thrown by the next createSession. */
  public failNext: (Error & { code?: string }) | null = null;
  /** Holds createSession until resolved. */
  public gate: Promise<void> | null = null;
  private n = 0;
  getSession(id: string): VorhabenSessionInfo | undefined {
    return this.sessions.get(id);
  }
  sendInput(id: string, data: string): boolean {
    this.writes.push([id, data]);
    return true;
  }
  async readScreen(): Promise<{ text: string; live: boolean }> {
    return { text: PROMPT_SCREEN, live: true };
  }
  async waitForIdle(): Promise<void> {}
  async withMachineWrite<T>(_id: string, fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; grund: 'beschaeftigt' | 'nicht_aktiv' }> {
    return { ok: true, value: await fn() };
  }
  closeSession(id: string): boolean {
    this.closed.push(id);
    const s = this.sessions.get(id);
    if (!s) return false;
    s.status = 'closed';
    return true;
  }
  restoreOutcome(): 'pending' | 'complete' | 'timeout' {
    return this.outcome;
  }
  async createSession(...args: unknown[]): Promise<{ sessionId: string; effectiveCwd: string }> {
    const call: CreateCall = {
      projectPath: args[0] as string,
      terminalType: args[1] as string,
      modelConfig: args[2] as { model: string; provider?: string },
      initialPrompt: args[5] as string | undefined,
      extraCliArgs: args[6] as string[] | undefined,
      options: (args[8] as { sessionTarget?: ParsedTarget }) ?? {},
    };
    this.created.push(call);
    if (this.gate) await this.gate;
    if (this.failNext) {
      const err = this.failNext;
      this.failNext = null;
      throw err;
    }
    const id = `cs-${++this.n}`;
    const target = call.options.sessionTarget?.target;
    const effectiveCwd = target && target.kind === 'existing-worktree' ? target.path : call.projectPath;
    this.sessions.set(id, {
      sessionId: id,
      status: 'active',
      projectPath: call.projectPath,
      effectiveCwd,
      terminalType: 'claude-code',
      agentStatus: 'working',
      modelConfig: call.modelConfig,
      ...(this.idOnCreate ? { claudeSessionId: this.idOnCreate } : {}),
    });
    return { sessionId: id, effectiveCwd };
  }
  /** The SessionStart hook reported the Claude session id (CloudTerminalManager.reportHookContext). */
  hook(id: string, claudeSessionId: string): void {
    const s = this.sessions.get(id);
    if (s) s.claudeSessionId = claudeSessionId;
    this.emit('session.hook-context', id, { claudeSessionId });
  }
  /** The session died with the backend: unknown to the manager, no `session.closed` (a crash).  */
  crash(id: string): void {
    this.sessions.delete(id);
  }
  /** Regular end: `session.closed` marks the assignment ended. */
  end(id: string, exitCode = 0): void {
    this.sessions.delete(id);
    this.emit('session.closed', id, exitCode);
  }
  stop(id: string): void {
    const s = this.sessions.get(id)!;
    s.agentStatus = 'done';
    this.emit('session.agent-event', id, 'stop');
  }
}

const tick = (ms = 5): Promise<void> => new Promise((r) => setTimeout(r, ms));
const pastes = (m: FakeManager, id: string): string[] => m.writes.filter(([sid, d]) => sid === id && d.startsWith(PASTE_START)).map(([, d]) => d);

describe('VorhabenService resume (INT-2026-019)', () => {
  let root: string;
  let projA: string;
  let wt: string;
  let store: VorhabenStateStore;
  let broadcast: ReturnType<typeof vi.fn<(m: OutboundMessage) => void>>;
  let service: VorhabenService;
  let watcher: VorhabenWatcher;
  let manager: FakeManager;
  let names: Record<string, string>;
  let transcripts: Map<string, number>;
  let findTranscript: ReturnType<typeof vi.fn<(providerId: string, id: string) => { path: string; mtimeMs: number } | undefined>>;
  const openProjects: Array<{ id: string; path: string; name: string }> = [];

  const lastState = (): VorhabenStateMessage['state'] => {
    const states = broadcast.mock.calls.map((c) => c[0]).filter((m) => m.type === 'vorhaben:state') as VorhabenStateMessage[];
    return states[states.length - 1].state;
  };
  const row = (id = 'INT-2026-019') => lastState().rows.find((r) => r.intentId === id)!;

  function makeService(opts: { readyWaitMs?: number; start?: boolean } = {}): VorhabenService {
    const svc = new VorhabenService({
      workspace: { getState: () => ({ openProjects, sessionNames: names }) },
      store,
      broadcast,
      watcher,
      sessions: manager,
      setSessionName: (id, name) => {
        names[id] = name;
      },
      resolveModel: (sel) => sel.providerId === 'anthropic' && ['opus', 'haiku', 'sonnet'].includes(sel.modelId),
      isClaudeProvider: (providerId) => providerId === 'anthropic' || providerId === 'glm',
      findTranscript,
      readyWaitMs: opts.readyWaitMs,
      timeZone: 'UTC',
      listWorktrees: async () => ({ isGitRepo: true, mainWorktreePath: projA, entries: [{ path: projA, branch: 'main', bare: false, prunable: false, head: 'x' }, { path: wt, branch: 'session/x', bare: false, prunable: false, head: 'y' }] as never }),
    });
    return svc;
  }

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'vorhaben-resume-'));
    projA = join(root, 'a');
    wt = join(root, 'a-worktrees', 'session-x');
    for (const base of [projA, wt]) {
      const dir = join(base, 'intent', 'INT-2026-019-resume');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'intent.md'), intentText('INT-2026-019', 'angenommen'));
      writeFileSync(join(dir, 'plan.md'), '# Plan\n\n> **Status:** freigegeben\n');
    }
    const done = join(projA, 'intent', 'INT-2026-001-fertig');
    mkdirSync(done, { recursive: true });
    writeFileSync(join(done, 'intent.md'), intentText('INT-2026-001', 'umgesetzt'));
    openProjects.splice(0, openProjects.length, { id: 'pa', path: projA, name: 'A' });
    names = {};
    transcripts = new Map([[UUID, Date.parse('2026-09-18T05:42:00Z')]]);
    findTranscript = vi.fn((_providerId: string, id: string) => {
      const mtimeMs = transcripts.get(id);
      return mtimeMs === undefined ? undefined : { path: `/home/.claude/projects/x/${id}.jsonl`, mtimeMs };
    });
    store = new VorhabenStateStore(join(root, 'state.json'), { port: 3111 });
    await store.load();
    broadcast = vi.fn();
    watcher = new VorhabenWatcher({ debounceMs: 30 });
    manager = new FakeManager();
    service = makeService();
    await service.start();
  });

  afterEach(async () => {
    service.stop();
    await store.flush();
    rmSync(root, { recursive: true, force: true });
  });

  /** Starts the build step in the worktree, lets the hook report the id, and crashes the session. Returns the lost session id. */
  async function lostSession(opts: { hookBefore?: boolean; provider?: string } = {}): Promise<string> {
    if (opts.hookBefore) manager.idOnCreate = UUID;
    const { sessionId } = await service.startStep('pa', 'INT-2026-019', 'build', { providerId: opts.provider ?? 'anthropic', modelId: 'opus' }, { kind: 'existing-worktree', path: wt });
    manager.idOnCreate = undefined;
    if (!opts.hookBefore) manager.hook(sessionId, UUID);
    await service.rescan();
    expect(store.getAssignment('pa', 'INT-2026-019')).toMatchObject({ sessionId, claudeSessionId: UUID, provider: opts.provider ?? 'anthropic', cwd: wt });
    manager.crash(sessionId);
    return sessionId;
  }

  describe('Claude session id in the assignment (AK-01, Kennung)', () => {
    it('hook after the assignment: the listener writes the id; hook before: startStep reads it from the live session', async () => {
      const a = await service.startStep('pa', 'INT-2026-019', 'plan', { providerId: 'anthropic', modelId: 'opus' }, undefined);
      expect(store.getAssignment('pa', 'INT-2026-019')).toMatchObject({ provider: 'anthropic' });
      expect(store.getAssignment('pa', 'INT-2026-019')?.claudeSessionId).toBeUndefined();
      broadcast.mockClear();
      manager.hook(a.sessionId, UUID);
      expect(store.getAssignment('pa', 'INT-2026-019')?.claudeSessionId).toBe(UUID);
      expect(broadcast).toHaveBeenCalled();
      // A `/clear` brings a new id (review E29).
      manager.hook(a.sessionId, UUID2);
      expect(store.getAssignment('pa', 'INT-2026-019')?.claudeSessionId).toBe(UUID2);
      // Not a UUID → refused (security.md §6).
      manager.hook(a.sessionId, '../x');
      expect(store.getAssignment('pa', 'INT-2026-019')?.claudeSessionId).toBe(UUID2);

      manager.idOnCreate = UUID;
      const b = await service.startStep('pa', 'INT-2026-001', 'build', { providerId: 'anthropic', modelId: 'haiku' }, undefined);
      expect(store.getAssignment('pa', 'INT-2026-001')).toMatchObject({ sessionId: b.sessionId, claudeSessionId: UUID, provider: 'anthropic' });
    });

    it('typed command, /intent folder claim and a click write provider and id too', async () => {
      // Typed `/plan INT-…` in a free session (onPromptText → moveAssignment).
      manager.sessions.set('free', { sessionId: 'free', status: 'active', projectPath: projA, effectiveCwd: projA, terminalType: 'claude-code', agentStatus: 'working', modelConfig: { model: 'opus', provider: 'anthropic' }, claudeSessionId: UUID });
      manager.emit('session.prompt-text', 'free', '/specwright:plan INT-2026-019');
      expect(store.getAssignment('pa', 'INT-2026-019')).toMatchObject({ sessionId: 'free', step: 'plan', provider: 'anthropic', claudeSessionId: UUID });
      // Typed `/intent` → pending with provider; the folder claim carries provider and id into the assignment.
      manager.emit('session.prompt-text', 'free', '/intent');
      expect(store.getPendingIntents()).toEqual([['free', expect.objectContaining({ provider: 'anthropic' })]]);
      const dir = join(projA, 'intent', 'INT-2026-020-neu');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'intent.md'), intentText('INT-2026-020', 'entwurf'));
      // The watcher's `dir-added` (fs.watch has no fixed latency under load — the writer is what is tested here).
      watcher.emit('dir-added', projA, 'INT-2026-020');
      expect(store.getAssignment('pa', 'INT-2026-020')).toMatchObject({ sessionId: 'free', step: 'intent', provider: 'anthropic', claudeSessionId: UUID });
      // A click (assignSession) on a row without a live session.
      manager.sessions.set('tab', { sessionId: 'tab', status: 'active', projectPath: projA, effectiveCwd: projA, terminalType: 'claude-code', agentStatus: 'done', modelConfig: { model: 'sonnet', provider: 'anthropic' }, claudeSessionId: UUID2 });
      await service.rescan();
      await service.assignSession('pa', 'INT-2026-019', 'tab');
      expect(store.getAssignment('pa', 'INT-2026-019')).toMatchObject({ sessionId: 'tab', provider: 'anthropic', claudeSessionId: UUID2 });
    });

    it('backfill at start(): open assignments without an id take it from the live session (restored session, no hook event)', async () => {
      store.setAssignment('pa', 'INT-2026-019', { sessionId: 'old', step: 'build', model: 'opus', cwd: wt, at: '2026-09-17T10:00:00Z' });
      store.setAssignment('pa', 'INT-2026-001', { sessionId: 'gone', step: 'build', model: 'opus', cwd: projA, at: '2026-09-17T10:00:00Z' });
      manager.sessions.set('old', { sessionId: 'old', status: 'active', projectPath: projA, effectiveCwd: wt, terminalType: 'claude-code', agentStatus: 'done', modelConfig: { model: 'opus', provider: 'anthropic' }, claudeSessionId: UUID });
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      const fresh = makeService();
      await fresh.start();
      fresh.stop();
      expect(store.getAssignment('pa', 'INT-2026-019')?.claudeSessionId).toBe(UUID);
      expect(store.getAssignment('pa', 'INT-2026-001')?.claudeSessionId).toBeUndefined();
      expect(log).toHaveBeenCalledWith('[vorhaben] 1 Kennung(en) nachgetragen');
      log.mockRestore();
    });
  });

  describe('resumeIfLost (AK-01)', () => {
    it('lost session in a worktree → createSession with the old model/provider, --resume <id>, no prompt, existing-worktree; the row shows the new session with `resumed`', async () => {
      const lost = await lostSession();
      names[lost] = 'build INT-2026-019';
      await service.rescan();
      expect(row().session).toMatchObject({ id: lost, ended: true });
      broadcast.mockClear();

      const result = await service.resumeIfLost('pa', 'INT-2026-019');
      expect(result).toEqual({ ergebnis: 'gestartet', sessionId: 'cs-2' });
      expect(manager.created).toHaveLength(2);
      const call = manager.created[1]!;
      expect(call.modelConfig).toEqual({ model: 'opus', provider: 'anthropic' });
      expect(call.initialPrompt).toBeUndefined();
      expect(call.extraCliArgs).toEqual(['--resume', UUID]);
      expect(call.options.sessionTarget).toEqual({ target: { kind: 'existing-worktree', path: wt }, explicit: true });
      expect(findTranscript).toHaveBeenCalledWith('anthropic', UUID);
      expect(names['cs-2']).toBe('build INT-2026-019');
      const a = store.getAssignment('pa', 'INT-2026-019')!;
      expect(a).toMatchObject({ sessionId: 'cs-2', step: 'build', cwd: wt, provider: 'anthropic', claudeSessionId: UUID, resumed: { von: lost, stand: '2026-09-18T05:42:00.000Z' } });
      expect(a.ended).toBeUndefined();
      await tick(20);
      // AK-02: the next state carries the row with the live session, the step unchanged and the mark.
      expect(row().session).toMatchObject({ id: 'cs-2', resumed: { von: lost, stand: '2026-09-18T05:42:00.000Z' } });
      expect(row().session?.ended).toBeUndefined();
      expect(row().step).toBe('build');
      // AK-03: nothing was written, no first input, a Stop pastes nothing.
      expect(manager.writes).toEqual([]);
      expect(store.hasFirstInput('cs-2')).toBe(false);
      manager.stop('cs-2');
      await tick(20);
      expect(pastes(manager, 'cs-2')).toEqual([]);
      expect(row().session?.firstInputPending).toBeUndefined();
    });

    it('cwd = project path → target main', async () => {
      manager.idOnCreate = UUID;
      const { sessionId } = await service.startStep('pa', 'INT-2026-019', 'plan', { providerId: 'anthropic', modelId: 'opus' }, undefined);
      manager.idOnCreate = undefined;
      manager.crash(sessionId);
      const result = await service.resumeIfLost('pa', 'INT-2026-019');
      expect(result.ergebnis).toBe('gestartet');
      expect(manager.created[1]!.options.sessionTarget).toEqual({ target: { kind: 'main' }, explicit: true });
    });

    it('AK-03: a stored first input of the dead session is dropped with a warning, never pasted into the resumed one', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      manager.idOnCreate = UUID;
      const { sessionId } = await service.startStep('pa', 'INT-2026-019', 'build', { providerId: 'anthropic', modelId: 'opus' }, { kind: 'existing-worktree', path: wt }, 'Freigabe: plan.md');
      manager.idOnCreate = undefined;
      expect(store.hasFirstInput(sessionId)).toBe(true);
      manager.crash(sessionId);
      await service.resumeIfLost('pa', 'INT-2026-019');
      expect(store.hasFirstInput(sessionId)).toBe(false);
      expect(store.hasFirstInput('cs-2')).toBe(false);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(sessionId));
      manager.stop('cs-2');
      await tick(20);
      expect(pastes(manager, 'cs-2')).toEqual([]);
      await service.rescan();
      expect(row().session?.firstInputPending).toBeUndefined();
      warn.mockRestore();
    });

    it('nothing to resume: no assignment, ended (also with exit code ≠ 0), live session, Vorhaben umgesetzt, foreign CLI (AK-05, AK-06)', async () => {
      expect(await service.resumeIfLost('pa', 'INT-2026-019')).toEqual({ ergebnis: 'nicht_noetig', grund: 'keine_zuordnung' });
      const { sessionId } = await service.startStep('pa', 'INT-2026-019', 'build', { providerId: 'anthropic', modelId: 'opus' }, undefined);
      manager.hook(sessionId, UUID);
      expect(await service.resumeIfLost('pa', 'INT-2026-019')).toEqual({ ergebnis: 'nicht_noetig', grund: 'lebt' });
      manager.end(sessionId, 1);
      expect(store.getAssignment('pa', 'INT-2026-019')?.ended).toBe(true);
      expect(await service.resumeIfLost('pa', 'INT-2026-019')).toEqual({ ergebnis: 'nicht_noetig', grund: 'beendet' });
      // umgesetzt: assignment lost, but the Vorhaben is done.
      store.setAssignment('pa', 'INT-2026-001', { sessionId: 'x', step: 'build', model: 'opus', cwd: projA, at: '2026-09-17T10:00:00Z', claudeSessionId: UUID, provider: 'anthropic' });
      expect(await service.resumeIfLost('pa', 'INT-2026-001')).toEqual({ ergebnis: 'nicht_noetig', grund: 'umgesetzt' });
      // Foreign CLI (Codex): no Claude conversation.
      store.setAssignment('pa', 'INT-2026-019', { sessionId: 'y', step: 'build', model: 'gpt-5', cwd: projA, at: '2026-09-17T10:00:00Z', claudeSessionId: UUID, provider: 'codex-cli' });
      expect(await service.resumeIfLost('pa', 'INT-2026-019')).toEqual({ ergebnis: 'nicht_noetig', grund: 'fremde_cli' });
      // A Claude provider whose model is gone from the settings: a reason, not silence.
      store.setAssignment('pa', 'INT-2026-019', { sessionId: 'y', step: 'build', model: 'weg', cwd: projA, at: '2026-09-17T10:00:00Z', claudeSessionId: UUID, provider: 'glm' });
      await expect(service.resumeIfLost('pa', 'INT-2026-019')).rejects.toMatchObject({ code: 'RESUME_FAILED', message: 'Modell nicht mehr konfiguriert: glm/weg' });
      expect(manager.created).toHaveLength(1);
    });

    it('unknown project / row → UNKNOWN_PROJECT / UNKNOWN_VORHABEN', async () => {
      await expect(service.resumeIfLost('nope', 'INT-2026-019')).rejects.toMatchObject({ code: 'UNKNOWN_PROJECT' });
      await expect(service.resumeIfLost('pa', 'INT-2026-099')).rejects.toMatchObject({ code: 'UNKNOWN_VORHABEN' });
    });
  });

  describe('failures name the reason and start nothing (AK-08, AK-09)', () => {
    it('worktree gone → WORKTREE_MISSING with the path; row keeps nextStep and is not busy', async () => {
      await lostSession();
      rmSync(wt, { recursive: true, force: true });
      await service.rescan();
      await expect(service.resumeIfLost('pa', 'INT-2026-019')).rejects.toMatchObject({ code: 'WORKTREE_MISSING', message: expect.stringContaining(wt) });
      expect(manager.created).toHaveLength(1);
      const r = row();
      expect(r.sessionBusy).toBe(false);
      expect(r.nextStep).toBeDefined();
    });

    it('worktree vanishes between the check and the spawn: manager code TARGET_NOT_FOUND → WORKTREE_MISSING (review E1/E5)', async () => {
      await lostSession();
      manager.failNext = Object.assign(new Error('Arbeitsverzeichnis existiert nicht'), { code: 'TARGET_NOT_FOUND' });
      await expect(service.resumeIfLost('pa', 'INT-2026-019')).rejects.toMatchObject({ code: 'WORKTREE_MISSING', message: expect.stringContaining(wt) });
    });

    it('cap reached / spawn failed → RESUME_FAILED with the manager\'s text; no second attempt without a new call', async () => {
      await lostSession();
      manager.failNext = Object.assign(new Error('Maximale Anzahl Sessions (5) erreicht'), { code: 'MAX_SESSIONS_REACHED' });
      await expect(service.resumeIfLost('pa', 'INT-2026-019')).rejects.toMatchObject({ code: 'RESUME_FAILED', message: 'Maximale Anzahl Sessions (5) erreicht' });
      expect(manager.created).toHaveLength(2);
      await tick(20);
      expect(manager.created).toHaveLength(2);
      // The next opening tries again.
      const again = await service.resumeIfLost('pa', 'INT-2026-019');
      expect(again.ergebnis).toBe('gestartet');
    });

    it('no transcript on disk / no id stored → RESUME_FAILED „Verlauf nicht auffindbar"', async () => {
      await lostSession();
      transcripts.clear();
      await expect(service.resumeIfLost('pa', 'INT-2026-019')).rejects.toMatchObject({ code: 'RESUME_FAILED', message: `Verlauf nicht auffindbar: ${UUID}.jsonl unter ~/.claude*/projects/` });
      const a = store.getAssignment('pa', 'INT-2026-019')!;
      store.setAssignment('pa', 'INT-2026-019', { ...a, claudeSessionId: undefined });
      await expect(service.resumeIfLost('pa', 'INT-2026-019')).rejects.toMatchObject({ code: 'RESUME_FAILED', message: expect.stringContaining('keine Gesprächskennung gespeichert') });
      expect(manager.created).toHaveLength(1);
    });

    it('before start(): waits for the first scan; without it → RESUME_FAILED „Backend startet noch"; restoreOutcome ≠ complete → RESUME_FAILED', async () => {
      await lostSession();
      service.stop();
      const late = makeService({ readyWaitMs: 20 });
      await expect(late.resumeIfLost('pa', 'INT-2026-019')).rejects.toMatchObject({ code: 'RESUME_FAILED', message: expect.stringContaining('Backend startet noch') });
      expect(manager.created).toHaveLength(1);
      late.stop();

      const waiting = makeService({ readyWaitMs: 500 });
      const p = waiting.resumeIfLost('pa', 'INT-2026-019');
      await tick(10);
      expect(manager.created).toHaveLength(1);
      await waiting.start();
      expect((await p).ergebnis).toBe('gestartet');
      waiting.stop();

      manager.crash('cs-2');
      for (const outcome of ['pending', 'timeout'] as const) {
        manager.outcome = outcome;
        await expect(service.resumeIfLost('pa', 'INT-2026-019')).rejects.toMatchObject({ code: 'RESUME_FAILED', message: expect.stringContaining('noch wiederhergestellt') });
      }
      expect(manager.created).toHaveLength(2);
    });
  });

  describe('single flight and locks (AK-04)', () => {
    it('two calls in the same tick share one promise and one createSession; a third after the finally sees the live session', async () => {
      await lostSession();
      const p1 = service.resumeIfLost('pa', 'INT-2026-019');
      const p2 = service.resumeIfLost('pa', 'INT-2026-019');
      expect(p1).toBe(p2);
      expect(await p1).toEqual({ ergebnis: 'gestartet', sessionId: 'cs-2' });
      expect(manager.created).toHaveLength(2);
      expect(await service.resumeIfLost('pa', 'INT-2026-019')).toEqual({ ergebnis: 'nicht_noetig', grund: 'lebt' });
      expect(manager.created).toHaveLength(2);
    });

    it('startStep and assignSession refuse with RESUME_RUNNING while the resume is in flight', async () => {
      await lostSession();
      let release!: () => void;
      manager.gate = new Promise<void>((r) => (release = r));
      const p = service.resumeIfLost('pa', 'INT-2026-019');
      await tick(5);
      await expect(service.startStep('pa', 'INT-2026-019', 'build', { providerId: 'anthropic', modelId: 'opus' }, undefined)).rejects.toMatchObject({ code: 'RESUME_RUNNING' });
      manager.sessions.set('tab', { sessionId: 'tab', status: 'active', projectPath: projA, effectiveCwd: projA, terminalType: 'claude-code', agentStatus: 'done', modelConfig: { model: 'opus', provider: 'anthropic' } });
      await expect(service.assignSession('pa', 'INT-2026-019', 'tab')).rejects.toMatchObject({ code: 'RESUME_RUNNING' });
      release();
      expect((await p).ergebnis).toBe('gestartet');
      // Afterwards the lock is gone; startStep works again (the newest assignment wins, review E15).
      const next = await service.startStep('pa', 'INT-2026-019', 'build', { providerId: 'anthropic', modelId: 'opus' }, undefined);
      expect(store.getAssignment('pa', 'INT-2026-019')?.sessionId).toBe(next.sessionId);
    });

    it('the row got another session during createSession (typed command) → the resumed one is closed again, nicht_noetig/lebt (review E1)', async () => {
      const lost = await lostSession();
      let release!: () => void;
      manager.gate = new Promise<void>((r) => (release = r));
      const p = service.resumeIfLost('pa', 'INT-2026-019');
      await tick(5);
      manager.sessions.set('typed', { sessionId: 'typed', status: 'active', projectPath: projA, effectiveCwd: projA, terminalType: 'claude-code', agentStatus: 'working', modelConfig: { model: 'opus', provider: 'anthropic' }, claudeSessionId: UUID2 });
      manager.emit('session.prompt-text', 'typed', '/build INT-2026-019');
      expect(store.getAssignment('pa', 'INT-2026-019')?.sessionId).toBe('typed');
      release();
      expect(await p).toEqual({ ergebnis: 'nicht_noetig', grund: 'lebt' });
      expect(manager.closed).toEqual(['cs-2']);
      expect(store.getAssignment('pa', 'INT-2026-019')).toMatchObject({ sessionId: 'typed', claudeSessionId: UUID2 });
      expect(store.getAssignment('pa', 'INT-2026-019')?.resumed).toBeUndefined();
      expect(store.getAssignment('pa', 'INT-2026-019')?.sessionId).not.toBe(lost);
    });

    it('a typed command after the resume moves the row (newest wins); the resumed session stays alive, not closed (review E23)', async () => {
      await lostSession();
      expect((await service.resumeIfLost('pa', 'INT-2026-019')).ergebnis).toBe('gestartet');
      manager.sessions.set('typed', { sessionId: 'typed', status: 'active', projectPath: projA, effectiveCwd: projA, terminalType: 'claude-code', agentStatus: 'working', modelConfig: { model: 'opus', provider: 'anthropic' } });
      manager.emit('session.prompt-text', 'typed', '/plan INT-2026-019');
      expect(store.getAssignment('pa', 'INT-2026-019')).toMatchObject({ sessionId: 'typed', step: 'plan' });
      expect(manager.closed).toEqual([]);
      expect(manager.getSession('cs-2')?.status).toBe('active');
    });
  });

  describe('handler (vorhaben:session.resume)', () => {
    it('request/reply: gestartet with sessionId, nicht_noetig with grund, errors as vorhaben:error with the code', async () => {
      const reply = vi.fn<(m: OutboundMessage) => void>();
      const handler = new VorhabenHandler(service, new ProjectDocsService({ gitDirty: async () => null }), store, broadcast);
      expect(handler.handle({ type: 'vorhaben:session.resume', requestId: 'r1', projectId: 'pa', intentId: 'INT-2026-019' }, reply)).toBe(true);
      await tick(10);
      expect(reply).toHaveBeenLastCalledWith({ type: 'vorhaben:session-resumed', requestId: 'r1', projectId: 'pa', intentId: 'INT-2026-019', ergebnis: 'nicht_noetig', grund: 'keine_zuordnung' });
      await lostSession();
      handler.handle({ type: 'vorhaben:session.resume', requestId: 'r2', projectId: 'pa', intentId: 'INT-2026-019' }, reply);
      await tick(10);
      expect(reply).toHaveBeenLastCalledWith({ type: 'vorhaben:session-resumed', requestId: 'r2', projectId: 'pa', intentId: 'INT-2026-019', ergebnis: 'gestartet', sessionId: 'cs-2' });
      manager.crash('cs-2');
      rmSync(wt, { recursive: true, force: true });
      handler.handle({ type: 'vorhaben:session.resume', requestId: 'r3', projectId: 'pa', intentId: 'INT-2026-019' }, reply);
      await tick(10);
      expect(reply).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'vorhaben:error', requestId: 'r3', code: 'WORKTREE_MISSING', message: expect.stringContaining(wt) }));
      handler.handle({ type: 'vorhaben:session.resume', requestId: 'r4', projectId: 'pa', intentId: 'nope' }, reply);
      expect(reply).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'vorhaben:error', requestId: 'r4', code: 'INVALID_MESSAGE' }));
      handler.handle({ type: 'vorhaben:session.resume', requestId: 'r5', projectId: 'zz', intentId: 'INT-2026-019' }, reply);
      expect(reply).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'vorhaben:error', requestId: 'r5', code: 'UNKNOWN_PROJECT' }));
    });
  });

  it('VorhabenError codes of the resume are the protocol\'s', () => {
    for (const code of ['RESUME_FAILED', 'WORKTREE_MISSING', 'RESUME_RUNNING'] as const) expect(new VorhabenError(code, 'x').code).toBe(code);
  });
});
