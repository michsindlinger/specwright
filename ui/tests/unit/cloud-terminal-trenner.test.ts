/**
 * INT-2026-030 (FA-02, FA-20, AK-06): `promptNachTrenner` setzt `--` vor den
 * ersten Prompt; die Startschalter bleiben gleich dem UI-Start mit Opus.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { mkdtempSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

vi.mock('../../src/server/model-config.js', () => ({
  getCliCommandForModel: () => ({ command: 'claude', args: ['--model', 'fallback'] }),
  getProviderCommand: (provider: string, model: string) =>
    provider === 'anthropic'
      ? { command: 'claude', args: ['--dangerously-skip-permissions', '--model', model] }
      : undefined,
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
  public runScripts: Array<{ id: string; spec: { command: string; args: string[] } }> = [];
  availability() { return this.enabled ? 'enabled' : 'disabled-by-flag'; }
  isEnabled() { return this.enabled; }
  logAvailability(): void {}
  async ensureServerAvailable() { return 'ok' as const; }
  sessionName(id: string) { return `cs-${id}`; }
  async writeRunScript(id: string, spec: { command: string; args: string[] }) {
    this.runScripts.push({ id, spec });
    return `/tmp/run-${id}.sh`;
  }
  buildNewSessionArgv(name: string, runScript: string) { return { shell: 'tmux', args: ['new-session', '-s', name, runScript] }; }
  buildAttachArgv(name: string) { return { shell: 'tmux', args: ['attach-session', '-d', '-t', `=${name}`] }; }
  async listSessions() { return new Set<string>(); }
  async hasSession() { return true; }
  async killSession() {}
  async capturePaneHistory() { return null; }
  async captureScreen() { return null; }
  async readExitCode() { return undefined; }
  async cleanupSessionArtifacts() {}
  async killOrphans() {}
}

const OPUS = { provider: 'anthropic', model: 'opus' };

describe('CloudTerminalManager promptNachTrenner (INT-2026-030)', () => {
  let dir: string;
  let project: string;
  let terminal: FakeTerminalManager;
  let tmux: FakeTmux;
  let mgr: CloudTerminalManager;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'trenner-'));
    project = join(dir, 'project');
    mkdirSync(project);
    terminal = new FakeTerminalManager();
    tmux = new FakeTmux();
    mgr = new CloudTerminalManager(
      terminal as never,
      tmux as unknown as TmuxSessionBackend,
      new CloudSessionRegistry(join(dir, 'sessions.json')),
      { settingsPath: join(dir, 'hooks.json'), secretPath: join(dir, 'secret'), port: 3001 }
    );
  });

  afterEach(async () => {
    await mgr.shutdown().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  });

  it('ohne Option: Prompt bleibt letztes Argument ohne Trenner (bestehende Aufrufer)', async () => {
    await mgr.createSession(project, 'claude-code', OPUS, 80, 24, 'mach was');
    const args = terminal.last.args!;
    expect(args[args.length - 1]).toBe('mach was');
    expect(args).not.toContain('--');
  });

  it('mit Option: `--` direkt vor dem Prompt, Satz mit "-" vorn bleibt ein Element (FA-20)', async () => {
    const satz = '-p foo "bar" \'baz\' --model haiku';
    await mgr.createSession(project, 'claude-code', OPUS, 80, 24, satz, undefined, undefined, { promptNachTrenner: true });
    const args = terminal.last.args!;
    expect(args.slice(-2)).toEqual(['--', satz]);
    expect(args.filter((a) => a === '--')).toHaveLength(1);
  });

  it('Schalter gleich dem UI-Start mit Opus bis auf `--` + Prompt (AK-06, FA-02)', async () => {
    await mgr.createSession(project, 'claude-code', OPUS, 80, 24);
    const ui = terminal.last.args!;
    await mgr.createSession(project, 'claude-code', OPUS, 80, 24, 'Satz', undefined, undefined, { promptNachTrenner: true });
    const eingang = terminal.last.args!;
    expect(eingang.slice(0, -2)).toEqual(ui);
    expect(ui).toContain('--dangerously-skip-permissions');
    expect(ui).toContain('--settings');
    expect(terminal.last.shell).toBe('claude');
  });

  it('tmux-Pfad: Run-Script bekommt dieselbe Reihenfolge', async () => {
    tmux.enabled = true;
    await mgr.createSession(project, 'claude-code', OPUS, 80, 24, '-x Probe', undefined, undefined, { promptNachTrenner: true });
    const spec = tmux.runScripts[tmux.runScripts.length - 1].spec;
    expect(spec.args.slice(-2)).toEqual(['--', '-x Probe']);
  });
});
