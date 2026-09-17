/**
 * Claude hook wiring in CloudTerminalManager: --settings injection, session env,
 * reportAgentEvent() gating, agent-status reduction, idle decay, and graceful degradation.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { mkdtempSync, rmSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const cli = { command: 'claude', available: true };
vi.mock('../../src/server/model-config.js', () => ({
  getCliCommandForModel: () => ({ command: cli.command, args: ['--model', 'x'] }),
  getProviderCommand: () => undefined,
  checkCliAvailability: () => cli.available,
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
    cli.available = true;
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

  it('INT-2026-007 FA-01: inherited Claude Code markers are stripped from the session env, persistence forced (both spawn paths)', async () => {
    // The backend on the Mac is started from a Claude session and inherits its markers;
    // a child claude with CLAUDE_CODE_CHILD_SESSION writes no transcript.
    const saved = { ...process.env };
    process.env.CLAUDE_CODE_CHILD_SESSION = '1';
    process.env.CLAUDE_CODE_SESSION_ATTENDED = '1';
    process.env.CLAUDECODE = '1';
    process.env.CLAUDE_PID = '4711';
    process.env.CLAUDE_CODE_SOMETHING_NEW = 'x';
    try {
      const direct = await mgr.createSession(project, 'claude-code', { model: 'x' }, 80, 24);
      const env = terminal.last.env!;
      expect(Object.keys(env).filter((k) => k.startsWith('CLAUDE_CODE_'))).toEqual(['CLAUDE_CODE_FORCE_SESSION_PERSISTENCE']);
      expect(env.CLAUDE_CODE_FORCE_SESSION_PERSISTENCE).toBe('1');
      expect(env).not.toHaveProperty('CLAUDECODE');
      expect(env).not.toHaveProperty('CLAUDE_PID');
      expect(env[CLOUD_SESSION_ID_ENV]).toBe(direct.sessionId);
      expect(env.CLAUDE_MODEL).toBe('x');

      tmux.enabled = true;
      const viaTmux = await mgr.createSession(project, 'claude-code', { model: 'x' });
      const { spec } = tmux.runScripts[tmux.runScripts.length - 1];
      expect(Object.keys(spec.env).filter((k) => k.startsWith('CLAUDE_CODE_'))).toEqual(['CLAUDE_CODE_FORCE_SESSION_PERSISTENCE']);
      expect(spec.env).not.toHaveProperty('CLAUDECODE');
      expect(spec.env[CLOUD_SESSION_ID_ENV]).toBe(viaTmux.sessionId);

      // shell sessions: stripped as well, and no session id inherited from the parent session
      tmux.enabled = false;
      process.env[CLOUD_SESSION_ID_ENV] = 'cloud-9-9';
      await mgr.createSession(project, 'shell');
      expect(terminal.last.env).not.toHaveProperty('CLAUDECODE');
      expect(terminal.last.env?.[CLOUD_SESSION_ID_ENV]).toBeUndefined();
    } finally {
      for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
      Object.assign(process.env, saved);
    }
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

  it('INT-2026-012 E5: extraCliArgs go to claude-* wrappers only; a foreign CLI gets neither them nor --settings', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    cli.command = '/home/me/bin/claude-glm';
    await mgr.createSession(project, 'claude-code', { model: 'x' }, 80, 24, undefined, ['--mcp-config', 'x']);
    expect(terminal.last.args).toContain('--mcp-config');
    expect(terminal.last.args).toContain('--settings');

    cli.command = '/usr/local/bin/codex';
    await mgr.createSession(project, 'claude-code', { model: 'x' }, 80, 24, undefined, ['--mcp-config', 'x']);
    expect(terminal.last.args).not.toContain('--mcp-config');
    expect(terminal.last.args).not.toContain('--settings');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('extraCliArgs für fremde CLI'));
    warn.mockRestore();
  });

  it('INT-2026-012 AK-06: a foreign CLI session stays agentStatus unknown — no hook ever reports', async () => {
    cli.command = '/usr/local/bin/codex';
    const emitted: string[] = [];
    mgr.on('session.agent-event', (_id: string, event: string) => emitted.push(event));
    const { sessionId } = await mgr.createSession(project, 'claude-code', { model: 'x', provider: 'codex-cli' });
    expect(terminal.last.args).not.toContain('--settings');
    expect(terminal.last.args).toEqual(['--model', 'x']);
    expect(mgr.getSession(sessionId)?.agentStatus).toBe('unknown');
    mgr.sendInput(sessionId, '\r');
    expect(mgr.getSession(sessionId)?.agentStatus).toBe('unknown');
    expect(emitted).toEqual([]);
  });

  it('INT-2026-012 E17: a missing CLI names the provider, not the npm package — except for `claude` itself', async () => {
    cli.available = false;
    cli.command = 'claude-codex';
    await expect(mgr.createSession(project, 'claude-code', { model: 'gpt-5.6-terra', provider: 'codex' })).rejects.toThrow(
      /CLI 'claude-codex' nicht im PATH gefunden\. Provider 'codex' braucht dieses Programm/
    );
    await expect(mgr.createSession(project, 'claude-code', { model: 'gpt-5.6-terra', provider: 'codex' })).rejects.not.toThrow(/@anthropic-ai\/claude-code/);

    cli.command = 'claude';
    await expect(mgr.createSession(project, 'claude-code', { model: 'x' })).rejects.toThrow(/npm install -g @anthropic-ai\/claude-code/);
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

    describe('INT-2026-016 (AK-02/AK-04): the „fertig, unbeantwortet" mark', () => {
      const doneAt = (id: string) => mgr.getSession(id as never)?.agentDoneAt;

      it('stop sets it; an answer, a dialog, a session start or a failure clears it; the idle decay keeps it', async () => {
        vi.useFakeTimers();
        try {
          const { sessionId: id } = await mgr.createSession(project, 'claude-code', { model: 'x' });
          expect(doneAt(id)).toBeUndefined();
          mgr.reportAgentEvent(id, 'stop');
          const first = doneAt(id);
          expect(first).toBeInstanceOf(Date);
          // the tab dot decays, the mark stays (the bell must not forget an unanswered finish)
          vi.advanceTimersByTime(CLOUD_TERMINAL_CONFIG.AGENT_IDLE_AFTER_MS + 10);
          expect(status(id)).toBe('idle');
          expect(doneAt(id)).toBe(first);
          mgr.reportAgentEvent(id, 'idle-prompt');
          expect(doneAt(id)).toBe(first);
          // typing answers → cleared
          mgr.reportAgentEvent(id, 'prompt-submitted');
          expect(doneAt(id)).toBeUndefined();
          // a dialog is a different kind of waiting → cleared
          mgr.reportAgentEvent(id, 'stop');
          mgr.reportAgentEvent(id, 'blocked', { blockKind: 'plan' });
          expect(doneAt(id)).toBeUndefined();
          // keystroke through the dialog → cleared as well
          mgr.reportAgentEvent(id, 'stop');
          mgr.reportAgentEvent(id, 'blocked', { blockKind: 'plan' });
          mgr.sendInput(id, '\r');
          expect(doneAt(id)).toBeUndefined();
          mgr.reportAgentEvent(id, 'stop');
          mgr.reportAgentEvent(id, 'session-start');
          expect(doneAt(id)).toBeUndefined();
          mgr.reportAgentEvent(id, 'stop');
          mgr.reportAgentEvent(id, 'stop-failure', { reason: 'rate_limit' });
          expect(doneAt(id)).toBeUndefined();
        } finally {
          vi.useRealTimers();
        }
      });

      it('travels with the agent event, the metadata and the registry', async () => {
        tmux.enabled = true;
        const { sessionId: id } = await mgr.createSession(project, 'claude-code', { model: 'x' });
        const detail: Array<{ doneAt?: Date }> = [];
        mgr.on('session.agent-event', (_id: string, _e: string, d: { doneAt?: Date }) => detail.push(d));
        mgr.reportAgentEvent(id, 'stop');
        expect(detail[0].doneAt).toBeInstanceOf(Date);
        const meta = mgr.getSessionsForProject(project).find((s) => s.sessionId === id);
        expect(meta?.agentDoneAt).toBeInstanceOf(Date);
        await new Promise((r) => setTimeout(r, 30));
        const stored = (await new CloudSessionRegistry(join(dir, 'sessions.json')).load()).entries.find((e) => e.sessionId === id);
        expect(typeof stored?.agentDoneAt).toBe('string');
        mgr.reportAgentEvent(id, 'prompt-submitted');
        expect(detail[1].doneAt).toBeUndefined();
        expect(mgr.getSessionsForProject(project).find((s) => s.sessionId === id)?.agentDoneAt).toBeUndefined();
        const shell = await mgr.createSession(project, 'shell');
        expect(mgr.getSessionsForProject(project).find((s) => s.sessionId === shell.sessionId)?.agentDoneAt).toBeUndefined();
      });
    });

    describe('INT-2026-016 (AK-10/AK-11): the dialog probe — a screen read after 1.5 s of silence', () => {
      const PLAN = '  Claude has written up a plan and is ready to execute. Would you like to proceed?\n  ❯ 1. Yes, and use auto mode\n    2. Yes, manually approve edits\n    3. Tell Claude what to change\n';
      const PERMISSION = '  Do you want to proceed?\n  ❯ 1. Yes\n    2. No\n';
      const QUIET = CLOUD_TERMINAL_CONFIG.DIALOG_PROBE_QUIET_MS;
      const flush = async (): Promise<void> => {
        for (let i = 0; i < 6; i++) await Promise.resolve();
      };
      beforeEach(() => {
        vi.useFakeTimers();
        tmux.enabled = true;
      });
      afterEach(() => vi.useRealTimers());

      async function working(): Promise<{ id: string; exec: string }> {
        const { sessionId: id } = await mgr.createSession(project, 'claude-code', { model: 'x' });
        mgr.reportAgentEvent(id, 'prompt-submitted');
        return { id, exec: terminal.last.executionId };
      }

      it('working + silence + plan cue → blocked/plan with the cue line as reason, probe-blocked; no second read without new output', async () => {
        const { id, exec } = await working();
        tmux.screen = PLAN;
        terminal.emit('terminal.data', exec, 'x');
        vi.advanceTimersByTime(QUIET - 1);
        await flush();
        expect(status(id)).toBe('working');
        expect(tmux.captures).toHaveLength(0);
        vi.advanceTimersByTime(2);
        await flush();
        expect(status(id)).toBe('blocked');
        expect(mgr.getSession(id as never)).toMatchObject({ blockKind: 'plan', blockedBy: 'probe', agentStatusReason: expect.stringContaining('Would you like to proceed') });
        expect(emitted[emitted.length - 1]).toMatchObject({ event: 'blocked', status: 'blocked' });
        vi.advanceTimersByTime(QUIET * 3);
        await flush();
        expect(tmux.captures).toHaveLength(1);
      });

      it('a session that becomes working without further output is probed after the window (a hook that arrived after the dialog was drawn)', async () => {
        const { sessionId: id } = await mgr.createSession(project, 'claude-code', { model: 'x' });
        tmux.screen = PLAN;
        mgr.reportAgentEvent(id, 'prompt-submitted');
        vi.advanceTimersByTime(QUIET + 1);
        await flush();
        expect(status(id)).toBe('blocked');
        expect(mgr.getSession(id as never)?.blockedBy).toBe('probe');
      });

      it('permission cue → berechtigung; a question cue → rueckfrage; trust → unbekannt', async () => {
        const { id, exec } = await working();
        tmux.screen = PERMISSION;
        terminal.emit('terminal.data', exec, 'x');
        vi.advanceTimersByTime(QUIET + 1);
        await flush();
        expect(mgr.getSession(id as never)?.blockKind).toBe('berechtigung');
        const q = await working();
        tmux.screen = '  Ready to submit your answers?\n';
        terminal.emit('terminal.data', q.exec, 'x');
        vi.advanceTimersByTime(QUIET + 1);
        await flush();
        expect(mgr.getSession(q.id as never)?.blockKind).toBe('rueckfrage');
        const t = await working();
        tmux.screen = '  Yes, I trust this folder\n';
        terminal.emit('terminal.data', t.exec, 'x');
        vi.advanceTimersByTime(QUIET + 1);
        await flush();
        expect(mgr.getSession(t.id as never)?.blockKind).toBe('unbekannt');
      });

      it('no cue → stays working; output within the window re-arms; a Stop before the window cancels; done/idle/unknown sessions are never probed', async () => {
        const { id, exec } = await working();
        tmux.screen = '  ❯ \n';
        terminal.emit('terminal.data', exec, 'x');
        vi.advanceTimersByTime(QUIET / 2);
        terminal.emit('terminal.data', exec, 'y');
        vi.advanceTimersByTime(QUIET / 2 + 1);
        await flush();
        expect(tmux.captures).toHaveLength(0);
        vi.advanceTimersByTime(QUIET / 2 + 1);
        await flush();
        expect(tmux.captures).toHaveLength(1);
        expect(status(id)).toBe('working');
        // Stop before the window → no probe
        tmux.captures = [];
        terminal.emit('terminal.data', exec, 'z');
        mgr.reportAgentEvent(id, 'stop');
        vi.advanceTimersByTime(QUIET + 1);
        await flush();
        expect(tmux.captures).toHaveLength(0);
        // idle output never probes
        terminal.emit('terminal.data', exec, 'w');
        vi.advanceTimersByTime(QUIET + 1);
        await flush();
        expect(tmux.captures).toHaveLength(0);
        // shell sessions never
        const sh = await mgr.createSession(project, 'shell');
        terminal.emit('terminal.data', terminal.last.executionId, 'x');
        vi.advanceTimersByTime(QUIET + 1);
        await flush();
        expect(tmux.captures).toHaveLength(0);
        expect(mgr.getSession(sh.sessionId)?.agentStatus).toBeUndefined();
      });

      it('a probe block ends with Enter (user-input → working) and heals itself when the dialog left the screen; a hook block is never touched', async () => {
        const { id, exec } = await working();
        tmux.screen = PLAN;
        terminal.emit('terminal.data', exec, 'x');
        vi.advanceTimersByTime(QUIET + 1);
        await flush();
        expect(status(id)).toBe('blocked');
        mgr.sendInput(id, '\r');
        expect(status(id)).toBe('working');
        expect(mgr.getSession(id as never)?.blockedBy).toBeUndefined();
        // false positive: the cue is gone on the next quiet read → unblocked
        tmux.screen = PLAN;
        terminal.emit('terminal.data', exec, 'x');
        vi.advanceTimersByTime(QUIET + 1);
        await flush();
        expect(status(id)).toBe('blocked');
        tmux.screen = '  ❯ \n';
        terminal.emit('terminal.data', exec, 'redraw');
        vi.advanceTimersByTime(QUIET + 1);
        await flush();
        expect(status(id)).toBe('working');
        expect(emitted[emitted.length - 1]).toMatchObject({ event: 'unblocked', status: 'working' });
        // a hook block stays although the screen shows no cue
        mgr.reportAgentEvent(id, 'blocked', { blockKind: 'rueckfrage', reason: 'Frage' });
        expect(mgr.getSession(id as never)?.blockedBy).toBe('hook');
        terminal.emit('terminal.data', exec, 'x');
        vi.advanceTimersByTime(QUIET + 1);
        await flush();
        expect(status(id)).toBe('blocked');
        // a hook event on a probe block takes over the origin
        mgr.reportAgentEvent(id, 'unblocked');
        tmux.screen = PLAN;
        terminal.emit('terminal.data', exec, 'x');
        vi.advanceTimersByTime(QUIET + 1);
        await flush();
        expect(mgr.getSession(id as never)?.blockedBy).toBe('probe');
        mgr.reportAgentEvent(id, 'blocked', { blockKind: 'plan' });
        expect(mgr.getSession(id as never)?.blockedBy).toBe('hook');
      });

      it('probes run one after another; closeSession clears the timer; a failing read changes nothing; blockedBy is persisted', async () => {
        const a = await working();
        const b = await working();
        let concurrent = 0;
        let maxConcurrent = 0;
        tmux.captureScreen = async () => {
          concurrent++;
          maxConcurrent = Math.max(maxConcurrent, concurrent);
          await new Promise((r) => setTimeout(r, 10));
          concurrent--;
          return PLAN;
        };
        terminal.emit('terminal.data', a.exec, 'x');
        terminal.emit('terminal.data', b.exec, 'x');
        vi.advanceTimersByTime(QUIET + 1);
        await flush();
        for (let k = 0; k < 4; k++) {
          vi.advanceTimersByTime(11);
          await flush();
        }
        expect(maxConcurrent).toBe(1);
        expect(status(a.id)).toBe('blocked');
        expect(status(b.id)).toBe('blocked');
        vi.useRealTimers();
        await new Promise((r) => setTimeout(r, 40));
        const stored = (await new CloudSessionRegistry(join(dir, 'sessions.json')).load()).entries.find((e) => e.sessionId === a.id);
        expect(stored).toMatchObject({ agentStatus: 'blocked', blockKind: 'plan', blockedBy: 'probe' });
        vi.useFakeTimers();
        // failing read: no change
        const c = await working();
        tmux.captureScreen = async () => { throw new Error('tmux weg'); };
        terminal.emit('terminal.data', c.exec, 'x');
        vi.advanceTimersByTime(QUIET + 1);
        await flush();
        expect(status(c.id)).toBe('working');
        // close clears the timer
        const d = await working();
        tmux.captureScreen = async () => PLAN;
        terminal.emit('terminal.data', d.exec, 'x');
        mgr.closeSession(d.id as never);
        vi.advanceTimersByTime(QUIET + 1);
        await flush();
        expect(mgr.getSession(d.id as never)?.agentStatus ?? 'closed').not.toBe('blocked');
      });
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
  describe('INT-2026-007: hook context, dialogs, Beiträge, machine-write lock', () => {
    it('reportHookContext stores and emits the transcript path once, persists it for tmux sessions, ignores unknown sessions', async () => {
      tmux.enabled = true;
      const { sessionId: id } = await mgr.createSession(project, 'claude-code', { model: 'x' });
      const emitted: unknown[] = [];
      mgr.on('session.hook-context', (...a: unknown[]) => emitted.push(a));
      expect(mgr.reportHookContext(id, { transcriptPath: '/t/a.jsonl', claudeSessionId: 'abc', cwd: '/p' })).toBe(true);
      expect(mgr.reportHookContext(id, { transcriptPath: '/t/a.jsonl', claudeSessionId: 'abc' })).toBe(true);
      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toEqual([id, { transcriptPath: '/t/a.jsonl', claudeSessionId: 'abc', cwd: '/p' }]);
      expect(mgr.getSession(id)).toMatchObject({ transcriptPath: '/t/a.jsonl', claudeSessionId: 'abc' });
      // a `clear` brings a new path (E10)
      expect(mgr.reportHookContext(id, { transcriptPath: '/t/b.jsonl', claudeSessionId: 'def' })).toBe(true);
      expect(emitted).toHaveLength(2);
      expect(mgr.reportHookContext('cloud-1-999' as never, { transcriptPath: '/t/x.jsonl' })).toBe(false);
      await new Promise((r) => setTimeout(r, 30)); // registry.upsert is fire-and-forget
      const { entries } = await new CloudSessionRegistry(join(dir, 'sessions.json')).load();
      expect(entries.find((e) => e.sessionId === id)).toMatchObject({ transcriptPath: '/t/b.jsonl', claudeSessionId: 'def' });
    });

    it('blocked carries the structured block kind; it is cleared when the block ends', async () => {
      const { sessionId: id } = await mgr.createSession(project, 'claude-code', { model: 'x' });
      const events: Array<Record<string, unknown>> = [];
      mgr.on('session.agent-event', (_id: string, _ev: string, d: Record<string, unknown>) => events.push(d));
      mgr.reportAgentEvent(id, 'blocked', { reason: 'Frage', blockKind: 'rueckfrage' });
      expect(mgr.getSession(id)!.blockKind).toBe('rueckfrage');
      expect(events[0]).toMatchObject({ status: 'blocked', blockKind: 'rueckfrage' });
      mgr.reportAgentEvent(id, 'unblocked');
      expect(mgr.getSession(id)!.blockKind).toBeUndefined();
      expect(events[1]).not.toHaveProperty('blockKind');
      // blocked without a kind (older payloads, notifications) → unbekannt (FA-10)
      mgr.reportAgentEvent(id, 'blocked', { reason: 'Dialog' });
      expect(mgr.getSession(id)!.blockKind).toBe('unbekannt');
      // the orchestrator's review-injected keeps the block and its kind
      mgr.reportAgentEvent(id, 'blocked', { reason: 'Berechtigung: ExitPlanMode', blockKind: 'plan' });
      mgr.reportAgentEvent(id, 'review-injected');
      expect(mgr.getSession(id)!.blockKind).toBe('plan');
    });

    it('withMachineWrite: one machine writer at a time, the second is refused as beschaeftigt (E3)', async () => {
      const { sessionId: id } = await mgr.createSession(project, 'claude-code', { model: 'x' });
      let release: () => void = () => {};
      const first = mgr.withMachineWrite(id, () => new Promise<string>((r) => { release = () => r('done'); }));
      const second = await mgr.withMachineWrite(id, async () => 'nope');
      expect(second).toEqual({ ok: false, grund: 'beschaeftigt' });
      release();
      expect(await first).toEqual({ ok: true, value: 'done' });
      // free again after the first finished
      expect(await mgr.withMachineWrite(id, async () => 2)).toEqual({ ok: true, value: 2 });
      // a throwing writer releases the lock
      await expect(mgr.withMachineWrite(id, async () => { throw new Error('x'); })).rejects.toThrow('x');
      expect(await mgr.withMachineWrite(id, async () => 3)).toEqual({ ok: true, value: 3 });
      expect(await mgr.withMachineWrite('cloud-1-999' as never, async () => 1)).toEqual({ ok: false, grund: 'nicht_aktiv' });
    });

    it('plan-review toggle and reviewers are persisted with a tmux session (FA-08)', async () => {
      tmux.enabled = true;
      const { sessionId: id } = await mgr.createSession(project, 'claude-code', { model: 'x' });
      mgr.setPlanReviewEnabled(id, true);
      mgr.setPlanReviewReviewers(id, [{ providerId: 'anthropic', modelId: 'haiku' }]);
      mgr.setLastInjectedPlanPath(id, 'hook:toolu_9');
      await new Promise((r) => setTimeout(r, 30)); // registry.upsert is fire-and-forget
      const { entries } = await new CloudSessionRegistry(join(dir, 'sessions.json')).load();
      expect(entries.find((e) => e.sessionId === id)).toMatchObject({ planReviewEnabled: true, planReviewReviewers: [{ providerId: 'anthropic', modelId: 'haiku' }], lastInjectedPlanPath: 'hook:toolu_9' });
      expect(mgr.getPlanReviewSettings(id)).toEqual({ enabled: true, reviewers: [{ providerId: 'anthropic', modelId: 'haiku' }], lastInjectedPlanPath: 'hook:toolu_9' });
    });
  });
});
