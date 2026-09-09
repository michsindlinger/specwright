/**
 * Stop-hook wiring in CloudTerminalManager: --settings injection, session env,
 * reportAgentEvent() gating, and graceful degradation.
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

import { CloudTerminalManager } from '../../src/server/services/cloud-terminal-manager.js';
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
  async readExitCode() { return undefined; }
  async cleanupSessionArtifacts() {}
  async killOrphans() {}
}

describe('CloudTerminalManager Stop-hook wiring', () => {
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
    await mgr.createSession(project, 'shell');
    expect(terminal.last.args).not.toContain('--settings');
    expect(terminal.last.env?.[CLOUD_SESSION_ID_ENV]).toBeUndefined();
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
    expect(events).toEqual([[session.sessionId, 'stop', { preview: 'done' }]]);

    expect(mgr.reportAgentEvent('cloud-1-999' as never, 'stop')).toBe(false);
    mgr.closeSession(session.sessionId);
    expect(mgr.reportAgentEvent(session.sessionId, 'stop')).toBe(false);
    expect(events).toHaveLength(1);
  });
});
