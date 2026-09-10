/**
 * Claude hook wiring in CloudTerminalManager: --settings injection, session env,
 * reportAgentEvent() gating, agent-status reduction, idle decay, and graceful degradation.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { mkdtempSync, rmSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const cli = { command: 'claude' };
vi.mock('../../src/server/model-config.js', () => ({
  getCliCommandForModel: () => ({ command: cli.command, args: ['--model', 'x'] }),
  getProviderCommand: () => undefined,
  checkCliAvailability: () => true,
}));
vi.mock('../../src/server/general-config.js', () => ({
  getCloudSessionWorktreeEnabled: () => false,
  getBaseBranch: () => 'main',
  getReviewPrompt: () => 'review',
  getWorktreeMaxConcurrent: () => 3,
}));

import { CloudTerminalManager, SCREEN_TAIL_CHARS } from '../../src/server/services/cloud-terminal-manager.js';
import { CLOUD_TERMINAL_CONFIG } from '../../src/shared/types/cloud-terminal.protocol.js';
import { CloudSessionRegistry } from '../../src/server/services/cloud-session-registry.js';
import type { TmuxSessionBackend } from '../../src/server/services/tmux-session-backend.js';
import { CLOUD_SESSION_ID_ENV, CLOUD_SESSION_ID_RE } from '../../src/server/services/claude-hooks.js';

interface Spawn { executionId: string; shell?: string; args?: string[]; cwd: string; env?: Record<string, string> }

class FakeTerminalManager extends EventEmitter {
  public spawns: Spawn[] = [];
  private nextPid = 1000;
  spawn(options: Spawn) {
    this.spawns.push(options);
    return { executionId: options.executionId, pid: ++this.nextPid, buffer: [], createdAt: new Date(), lastActivity: new Date() };
  }
  kill(): boolean { return true; }
  write(): boolean { return true; }
  resize(): void {}
  get last(): Spawn { return this.spawns[this.spawns.length - 1]; }
}

class FakeTmux {
  public enabled = false;
  public runScripts: Array<{ id: string; spec: { command: string; args: string[]; env: Record<string, string> } }> = [];
  availability() { return this.enabled ? 'enabled' : 'disabled-by-flag'; }
  isEnabled() { return this.enabled; }
  logAvailability(): void {}
  async ensureServerAvailable() { return 'ok' as const; }
  sessionName(id: string) { return `cs-${id}`; }
  async writeRunScript(id: string, spec: { command: string; args: string[]; env: Record<string, string> }) {
    this.runScripts.push({ id, spec });
    return `/tmp/run-${id}.sh`;
  }
  buildNewSessionArgv(name: string, runScript: string) { return { shell: 'tmux', args: ['new-session', '-s', name, runScript] }; }
  buildAttachArgv(name: string) { return { shell: 'tmux', args: ['attach-session', '-d', '-t', `=${name}`] }; }
  async listSessions() { return new Set<string>(); }
  async hasSession() { return true; }
  async killSession() {}
  async capturePaneHistory() { return null; }
  public screen: string | null = null;
  public captures: Array<{ name: string; scrollback: number }> = [];
  async captureScreen(name: string, scrollback = 0) {
    this.captures.push({ name, scrollback });
    return this.screen;
  }
  async readExitCode() { return undefined; }
  async cleanupSessionArtifacts() {}
  async killOrphans() {}
}

describe('CloudTerminalManager Claude-hook wiring', () => {
  let dir: string;
  let project: string;
  let terminal: FakeTerminalManager;
  let tmux: FakeTmux;
  let mgr: CloudTerminalManager;

  const build = (hook: { settingsPath?: string; secretPath?: string; port?: number } | null) =>
    new CloudTerminalManager(
      terminal as never,
      tmux as unknown as TmuxSessionBackend,
      new CloudSessionRegistry(join(dir, 'sessions.json')),
      hook
    );

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'agent-event-'));
    project = join(dir, 'project');
    mkdirSync(project);
    terminal = new FakeTerminalManager();
    tmux = new FakeTmux();
    cli.command = 'claude';
    mgr = build({ settingsPath: join(dir, 'hooks.json'), secretPath: join(dir, 'secret'), port: 3001 });
  });

  afterEach(async () => {
    await mgr.shutdown().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes secret + settings file synchronously in the constructor', () => {
    expect(existsSync(join(dir, 'hooks.json'))).toBe(true);
    expect(existsSync(join(dir, 'secret'))).toBe(true);
    expect(mgr.getHookSecret()).toMatch(/^[0-9a-f]{64}$/);
  });

  it('claude-code (direct spawn): --settings precedes the prompt, env carries the session id', async () => {
    const session = await mgr.createSession(project, 'claude-code', { model: 'x' }, 80, 24, 'do the thing');
    const args = terminal.last.args!;
    const flagIdx = args.indexOf('--settings');
    expect(flagIdx).toBeGreaterThan(-1);
    expect(args[flagIdx + 1]).toBe(join(dir, 'hooks.json'));
    expect(args.indexOf('do the thing')).toBeGreaterThan(flagIdx);
    expect(terminal.last.env?.[CLOUD_SESSION_ID_ENV]).toBe(session.sessionId);
    expect(CLOUD_SESSION_ID_RE.test(session.sessionId)).toBe(true);
  });

  it('claude-code (tmux): the run-script spec carries flag and env', async () => {
    tmux.enabled = true;
    const session = await mgr.createSession(project, 'claude-code', { model: 'x' });
    const { spec } = tmux.runScripts[0];
    expect(spec.args).toContain('--settings');
    expect(spec.env[CLOUD_SESSION_ID_ENV]).toBe(session.sessionId);
  });

  it('shell sessions get neither flag nor env', async () => {
    // baseEnv is a copy of process.env, so a test run from inside a cloud terminal would
    // inherit the session id and see it "set" without the manager ever adding it.
    const inherited = process.env[CLOUD_SESSION_ID_ENV];
    delete process.env[CLOUD_SESSION_ID_ENV];
    try {
      await mgr.createSession(project, 'shell');
      expect(terminal.last.args).not.toContain('--settings');
      expect(terminal.last.env?.[CLOUD_SESSION_ID_ENV]).toBeUndefined();
    } finally {
      if (inherited !== undefined) process.env[CLOUD_SESSION_ID_ENV] = inherited;
    }
  });

  it('a non-claude CLI does not receive --settings', async () => {
    cli.command = '/usr/local/bin/codex';
    await mgr.createSession(project, 'claude-code', { model: 'x' });
    expect(terminal.last.args).not.toContain('--settings');
  });

  it('claude-* wrappers do receive --settings', async () => {
    cli.command = '/home/me/bin/claude-glm';
    await mgr.createSession(project, 'claude-code', { model: 'x' });
    expect(terminal.last.args).toContain('--settings');
  });

  it('degrades: unwritable hook paths → no flag, no secret, session still starts', async () => {
    await mgr.shutdown();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mgr = build({ settingsPath: join(dir, 'secret-as-dir', 'x.json'), secretPath: join(dir, 'secret-as-dir') });
    // secretPath is created as a FILE by loadOrCreateHookSecret; the settings path then needs it as a dir → EEXIST/ENOTDIR
    expect(mgr.getHookSecret()).toBeUndefined();
    await mgr.createSession(project, 'claude-code', { model: 'x' });
    expect(terminal.last.args).not.toContain('--settings');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('null disables the hook without touching disk', async () => {
    await mgr.shutdown();
    mgr = build(null);
    expect(mgr.getHookSecret()).toBeUndefined();
    await mgr.createSession(project, 'claude-code', { model: 'x' });
    expect(terminal.last.args).not.toContain('--settings');
  });

  it('reportAgentEvent emits for an active session and gates unknown/closed ones', async () => {
    const events: unknown[][] = [];
    mgr.on('session.agent-event', (...a: unknown[]) => events.push(a));
    const session = await mgr.createSession(project, 'claude-code', { model: 'x' });

    expect(mgr.reportAgentEvent(session.sessionId, 'stop', { preview: 'done' })).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0][0]).toBe(session.sessionId);
    expect(events[0][1]).toBe('stop');
    expect(events[0][2]).toMatchObject({ preview: 'done', status: 'done' });
    expect((events[0][2] as { statusAt: Date }).statusAt).toBeInstanceOf(Date);

    expect(mgr.reportAgentEvent('cloud-1-999' as never, 'stop')).toBe(false);
    mgr.closeSession(session.sessionId);
    expect(mgr.reportAgentEvent(session.sessionId, 'stop')).toBe(false);
    expect(events).toHaveLength(1);
  });

  describe('readScreen()', () => {
    it('direct spawn: the raw buffer tail, capped at SCREEN_TAIL_CHARS, not live', async () => {
      const { sessionId: id } = await mgr.createSession(project, 'claude-code', { model: 'x' });
      const exec = terminal.last.executionId;
      terminal.emit('terminal.data', exec, '\x1b[1mhello\x1b[0m');
      const first = await mgr.readScreen(id);
      expect(first.live).toBe(false);
      expect(first.text.endsWith('\x1b[1mhello\x1b[0m')).toBe(true);

      const chunk = 'x'.repeat(64 * 1024);
      for (let i = 0; i < 6; i++) terminal.emit('terminal.data', exec, chunk);
      terminal.emit('terminal.data', exec, 'END');
      const { text } = await mgr.readScreen(id);
      expect(text.length).toBe(SCREEN_TAIL_CHARS);
      expect(text.endsWith('END')).toBe(true);
    });

    it('tmux-backed: the captured pane (scrollback on request); buffer tail when the capture fails', async () => {
      tmux.enabled = true;
      const { sessionId: id } = await mgr.createSession(project, 'claude-code', { model: 'x' });
      tmux.screen = ' Would you like to proceed?';
      expect(await mgr.readScreen(id, { scrollback: 2000 })).toEqual({ text: ' Would you like to proceed?', live: true });
      expect(tmux.captures[tmux.captures.length - 1]).toEqual({ name: `cs-${id}`, scrollback: 2000 });

      tmux.screen = null;
      terminal.emit('terminal.data', terminal.last.executionId, 'buffered');
      const fallback = await mgr.readScreen(id);
      expect(fallback.live).toBe(false);
      expect(fallback.text.endsWith('buffered')).toBe(true);
    });

    it('unknown session: empty and not live', async () => {
      expect(await mgr.readScreen('cloud-1-1' as never)).toEqual({ text: '', live: false });
    });
  });

  describe('agent status', () => {
    type Emitted = { event: string; status: string; reason?: string };
    let emitted: Emitted[];
    const status = (id: string) => mgr.getSession(id as never)?.agentStatus;

    beforeEach(() => {
      emitted = [];
      mgr.on('session.agent-event', (_id: string, event: string, d: { status: string; reason?: string }) =>
        emitted.push({ event, status: d.status, ...(d.reason ? { reason: d.reason } : {}) })
      );
    });

    it('starts unknown, follows the reducer, and only emits on change (except stop)', async () => {
      const { sessionId: id } = await mgr.createSession(project, 'claude-code', { model: 'x' });
      expect(status(id)).toBe('unknown');

      mgr.reportAgentEvent(id, 'session-start');
      mgr.reportAgentEvent(id, 'prompt-submitted');
      mgr.reportAgentEvent(id, 'blocked', { reason: 'Berechtigung: Bash' });
      mgr.reportAgentEvent(id, 'blocked', { reason: 'Berechtigung: Bash' }); // duplicate → no emit
      mgr.reportAgentEvent(id, 'blocked', { reason: 'Frage' }); // reason changed → emit
      mgr.reportAgentEvent(id, 'unblocked');
      mgr.reportAgentEvent(id, 'stop');
      mgr.reportAgentEvent(id, 'stop'); // stop always emits (bell)
      mgr.reportAgentEvent(id, 'stop-failure', { reason: 'rate_limit' });

      expect(emitted).toEqual([
        { event: 'session-start', status: 'idle' },
        { event: 'prompt-submitted', status: 'working' },
        { event: 'blocked', status: 'blocked', reason: 'Berechtigung: Bash' },
        { event: 'blocked', status: 'blocked', reason: 'Frage' },
        { event: 'unblocked', status: 'working' },
        { event: 'stop', status: 'done' },
        { event: 'stop', status: 'done' },
        { event: 'stop-failure', status: 'error', reason: 'rate_limit' },
      ]);
      expect(status(id)).toBe('error');
    });

    it('answer-shaped keystrokes unblock; navigation keys do not; shell sessions never carry a status', async () => {
      const { sessionId: id } = await mgr.createSession(project, 'claude-code', { model: 'x' });
      mgr.reportAgentEvent(id, 'blocked', { reason: 'Berechtigung: Bash' });
      emitted = [];

      expect(mgr.sendInput(id, '\x1b[B')).toBe(true); // arrow down
      expect(emitted).toEqual([]);
      expect(mgr.sendInput(id, '\r')).toBe(true);
      expect(emitted).toEqual([{ event: 'user-input', status: 'working' }]);
      expect(mgr.sendInput(id, '\r')).toBe(true); // not blocked any more → no-op
      expect(emitted).toHaveLength(1);

      const shell = await mgr.createSession(project, 'shell');
      expect(mgr.getSession(shell.sessionId)?.agentStatus).toBeUndefined();
      emitted = [];
      mgr.sendInput(shell.sessionId, '\r');
      expect(emitted).toEqual([]);
    });

    it('machine text with inferUnblock:false leaves a blocked session blocked', async () => {
      const { sessionId: id } = await mgr.createSession(project, 'claude-code', { model: 'x' });
      mgr.reportAgentEvent(id, 'blocked', { reason: 'Berechtigung: ExitPlanMode' });
      emitted = [];

      expect(mgr.sendInput(id, 'External review consensus …\n', { inferUnblock: false })).toBe(true);
      expect(emitted).toEqual([]);
      expect(mgr.getSession(id)?.agentStatus).toBe('blocked');
      // The explicit default still infers: the user's Enter unblocks.
      expect(mgr.sendInput(id, '\r', { inferUnblock: true })).toBe(true);
      expect(emitted).toEqual([{ event: 'user-input', status: 'working' }]);
    });

    it('review-injected on an already blocked session re-emits with the new reason', async () => {
      const { sessionId: id } = await mgr.createSession(project, 'claude-code', { model: 'x' });
      mgr.reportAgentEvent(id, 'blocked', { reason: 'Berechtigung: ExitPlanMode' });
      emitted = [];

      expect(mgr.reportAgentEvent(id, 'review-injected', { reason: 'Plan-Review eingefügt (2/3 Reviewer)' })).toBe(true);
      expect(emitted).toEqual([
        { event: 'review-injected', status: 'blocked', reason: 'Plan-Review eingefügt (2/3 Reviewer)' },
      ]);
      expect(mgr.getSession(id)?.agentStatusReason).toBe('Plan-Review eingefügt (2/3 Reviewer)');
      // Same event, same reason again → nothing new to broadcast.
      mgr.reportAgentEvent(id, 'review-injected', { reason: 'Plan-Review eingefügt (2/3 Reviewer)' });
      expect(emitted).toHaveLength(1);
    });

    it('idle-prompt does not bump lastActivity, other hook events do', async () => {
      const { sessionId: id } = await mgr.createSession(project, 'claude-code', { model: 'x' });
      mgr.reportAgentEvent(id, 'prompt-submitted');
      const t0 = mgr.getSession(id)!.lastActivity.getTime();
      await new Promise((r) => setTimeout(r, 5));
      mgr.reportAgentEvent(id, 'idle-prompt');
      expect(mgr.getSession(id)!.lastActivity.getTime()).toBe(t0);
      mgr.reportAgentEvent(id, 'stop');
      expect(mgr.getSession(id)!.lastActivity.getTime()).toBeGreaterThan(t0);
    });

    describe('done → idle decay', () => {
      beforeEach(() => vi.useFakeTimers());
      afterEach(() => vi.useRealTimers());

      it('fires after AGENT_IDLE_AFTER_MS without another event', async () => {
        const { sessionId: id } = await mgr.createSession(project, 'claude-code', { model: 'x' });
        mgr.reportAgentEvent(id, 'stop');
        emitted = [];
        vi.advanceTimersByTime(CLOUD_TERMINAL_CONFIG.AGENT_IDLE_AFTER_MS - 1);
        expect(emitted).toEqual([]);
        vi.advanceTimersByTime(2);
        expect(emitted).toEqual([{ event: 'idle-timeout', status: 'idle' }]);
        expect(status(id)).toBe('idle');
      });

      it('is cancelled by a newer event and by closing the session', async () => {
        const { sessionId: id } = await mgr.createSession(project, 'claude-code', { model: 'x' });
        mgr.reportAgentEvent(id, 'stop');
        mgr.reportAgentEvent(id, 'prompt-submitted');
        emitted = [];
        vi.advanceTimersByTime(CLOUD_TERMINAL_CONFIG.AGENT_IDLE_AFTER_MS + 10);
        expect(emitted).toEqual([]);
        expect(status(id)).toBe('working');

        mgr.reportAgentEvent(id, 'stop');
        mgr.closeSession(id);
        emitted = [];
        vi.advanceTimersByTime(CLOUD_TERMINAL_CONFIG.AGENT_IDLE_AFTER_MS + 10);
        expect(emitted).toEqual([]);
      });

      it('a repeated stop re-arms the full window', async () => {
        const { sessionId: id } = await mgr.createSession(project, 'claude-code', { model: 'x' });
        mgr.reportAgentEvent(id, 'stop');
        vi.advanceTimersByTime(CLOUD_TERMINAL_CONFIG.AGENT_IDLE_AFTER_MS / 2);
        mgr.reportAgentEvent(id, 'stop');
        emitted = [];
        vi.advanceTimersByTime(CLOUD_TERMINAL_CONFIG.AGENT_IDLE_AFTER_MS / 2 + 10);
        expect(emitted).toEqual([]);
        vi.advanceTimersByTime(CLOUD_TERMINAL_CONFIG.AGENT_IDLE_AFTER_MS / 2);
        expect(emitted).toEqual([{ event: 'idle-timeout', status: 'idle' }]);
      });
    });
  });
});
