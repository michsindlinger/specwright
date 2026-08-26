import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock ONLY the worktree removal (real git side effects); everything else in
// the module — notably rehydrateOwnedSessionWorktree — stays real.
vi.mock('../../src/server/utils/cloud-session-worktree.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/server/utils/cloud-session-worktree.js')>();
  return {
    ...original,
    removeCloudSessionWorktree: vi.fn(async () => ({ removed: true })),
  };
});

import { CloudTerminalManager } from '../../src/server/services/cloud-terminal-manager.js';
import {
  CloudSessionRegistry,
  type PersistedCloudSessionV1,
} from '../../src/server/services/cloud-session-registry.js';
import type { TmuxSessionBackend } from '../../src/server/services/tmux-session-backend.js';
import {
  removeCloudSessionWorktree,
  rehydrateOwnedSessionWorktree,
} from '../../src/server/utils/cloud-session-worktree.js';

/** Fake node-pty adapter: records spawns, emits terminal.* like the real one. */
class FakeTerminalManager extends EventEmitter {
  public spawns: Array<{ executionId: string; shell?: string; args?: string[]; cwd: string }> = [];
  public killed: string[] = [];
  private nextPid = 1000;

  spawn(options: { executionId: string; shell?: string; args?: string[]; cwd: string }) {
    this.spawns.push(options);
    return {
      executionId: options.executionId,
      pid: ++this.nextPid,
      buffer: [],
      createdAt: new Date(),
      lastActivity: new Date(),
    };
  }

  kill(executionId: string): boolean {
    this.killed.push(executionId);
    return true;
  }

  write(): boolean { return true; }
  resize(): void {}
}

/** Fully scripted tmux backend. */
class FakeTmux {
  public enabled = true;
  public liveSessions = new Set<string>();
  public killedSessions: string[] = [];
  public killedOrphansWith: Set<string> | null = null;
  public cleanedArtifacts: string[] = [];
  public captureResult: string | null = null;
  public hasSessionResult = true;
  public exitCodeResult: number | undefined = undefined;

  availability() { return this.enabled ? 'enabled' : 'disabled-by-flag'; }
  isEnabled() { return this.enabled; }
  logAvailability(): void {}
  async ensureServerAvailable() { return 'ok' as const; }
  sessionName(id: string) { return `cs-${id}`; }
  async writeRunScript(id: string) { return `/tmp/run-${id}.sh`; }
  buildNewSessionArgv(name: string, runScript: string) {
    return { shell: 'tmux', args: ['new-session', '-s', name, runScript] };
  }
  buildAttachArgv(name: string) {
    return { shell: 'tmux', args: ['attach-session', '-d', '-t', `=${name}`] };
  }
  async listSessions() { return new Set(this.liveSessions); }
  async hasSession(name: string) { return this.hasSessionResult && this.liveSessions.has(name); }
  async killSession(name: string) { this.killedSessions.push(name); this.liveSessions.delete(name); }
  async capturePaneHistory() { return this.captureResult; }
  async readExitCode() { return this.exitCodeResult; }
  async cleanupSessionArtifacts(id: string) { this.cleanedArtifacts.push(id); }
  async killOrphans(known: Set<string>) {
    this.killedOrphansWith = known;
    for (const name of this.liveSessions) {
      if (name.startsWith('cs-') && !known.has(name)) this.liveSessions.delete(name);
    }
  }
}

function persisted(id: string, overrides: Partial<PersistedCloudSessionV1> = {}): PersistedCloudSessionV1 {
  return {
    sessionId: id,
    projectPath: '/tmp/project',
    effectiveCwd: '/tmp/project',
    terminalType: 'claude-code',
    createdAt: new Date('2026-08-26T10:00:00Z').toISOString(),
    tmuxSessionName: `cs-${id}`,
    runScriptPath: `/tmp/run-${id}.sh`,
    autoMode: false,
    ...overrides,
  };
}

describe('CloudTerminalManager boot-restore', () => {
  let dir: string;
  let registry: CloudSessionRegistry;
  let tmux: FakeTmux;
  let terminal: FakeTerminalManager;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'restore-test-'));
    registry = new CloudSessionRegistry(join(dir, 'sessions-3001.json'));
    tmux = new FakeTmux();
    terminal = new FakeTerminalManager();
    vi.mocked(removeCloudSessionWorktree).mockClear();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function makeManager(): CloudTerminalManager {
    return new CloudTerminalManager(
      terminal as never,
      tmux as unknown as TmuxSessionBackend,
      registry
    );
  }

  it('restores a live entry: session in map, buffer seeded, attach spawned, occupancy re-established', async () => {
    await registry.upsert(persisted('s1', { effectiveCwd: '/tmp/project-worktrees/session-s1' }));
    tmux.liveSessions.add('cs-s1');
    tmux.captureResult = 'previous scrollback\r\n';

    const manager = makeManager();
    await manager.whenReady();

    const session = manager.getSession('s1');
    expect(session).toBeDefined();
    expect(session?.status).toBe('active');
    expect(session?.buffer.join('')).toContain('previous scrollback');

    const attachSpawn = terminal.spawns.find((s) => s.executionId === 'cloud-s1');
    expect(attachSpawn?.shell).toBe('tmux');
    expect(attachSpawn?.args).toEqual(['attach-session', '-d', '-t', '=cs-s1']);

    expect(manager.getOccupiedPaths().has('/tmp/project-worktrees/session-s1')).toBe(true);
  });

  it('reaps a dead entry: worktree disposed, artifacts cleaned, registry entry removed', async () => {
    await registry.upsert(
      persisted('dead', {
        worktree: {
          worktreePath: '/tmp/project-worktrees/session-dead',
          branchName: 'session/dead',
          mainProjectPath: '/tmp/project',
          seededClaudeConfig: [],
        },
      })
    );
    // tmux session NOT in liveSessions → dead

    const manager = makeManager();
    await manager.whenReady();

    expect(manager.getSession('dead')).toBeUndefined();
    expect(vi.mocked(removeCloudSessionWorktree)).toHaveBeenCalledWith(
      '/tmp/project',
      '/tmp/project-worktrees/session-dead',
      'session/dead',
      []
    );
    expect(tmux.cleanedArtifacts).toContain('dead');
    expect((await registry.load()).entries).toEqual([]);
  });

  it('kills orphaned cs-* sessions only when the registry is healthy', async () => {
    await registry.upsert(persisted('known'));
    tmux.liveSessions.add('cs-known');
    tmux.liveSessions.add('cs-orphan');

    const manager = makeManager();
    await manager.whenReady();

    expect(tmux.killedOrphansWith).toEqual(new Set(['cs-known']));
    expect(tmux.liveSessions.has('cs-orphan')).toBe(false);
    expect(manager.getSession('known')).toBeDefined();
  });

  it('unhealthy registry: never kills live tmux sessions, restores nothing', async () => {
    const filePath = join(dir, 'sessions-3001.json');
    writeFileSync(filePath, 'corrupt{', 'utf-8');
    tmux.liveSessions.add('cs-survivor');

    const manager = makeManager();
    await manager.whenReady();

    expect(tmux.killedOrphansWith).toBeNull();
    expect(tmux.liveSessions.has('cs-survivor')).toBe(true);
    expect(manager.getAllSessions()).toEqual([]);
  });

  it('generateSessionId skips IDs occupied by restored sessions', async () => {
    vi.useFakeTimers();
    try {
      const manager = makeManager();
      await manager.whenReady();
      const now = Date.now();
      // Simulate restored sessions occupying the first two counter slots.
      const sessions = (manager as unknown as { sessions: Map<string, unknown> }).sessions;
      sessions.set(`cloud-${now}-1`, { sessionId: `cloud-${now}-1` });
      sessions.set(`cloud-${now}-2`, { sessionId: `cloud-${now}-2` });

      const gen = (manager as unknown as { generateSessionId: () => string }).generateSessionId.bind(manager);
      expect(gen()).toBe(`cloud-${now}-3`);
    } finally {
      vi.useRealTimers();
    }
  });

  it('whenReady gates until the registry load settles (never rejects)', async () => {
    let releaseLoad!: () => void;
    const loadBarrier = new Promise<void>((resolve) => { releaseLoad = resolve; });
    const slowRegistry = {
      load: async () => { await loadBarrier; return { entries: [], healthy: true }; },
      upsert: async () => {},
      remove: async () => {},
      replaceAll: async () => {},
    };

    const manager = new CloudTerminalManager(
      terminal as never,
      tmux as unknown as TmuxSessionBackend,
      slowRegistry as unknown as CloudSessionRegistry
    );

    let ready = false;
    void manager.whenReady().then(() => { ready = true; });
    await new Promise((r) => setTimeout(r, 20));
    expect(ready).toBe(false);

    releaseLoad();
    await manager.whenReady();
    expect(ready).toBe(true);
  });

  it('isolated attach-client death with live tmux session → re-attach instead of close', async () => {
    vi.useFakeTimers();
    try {
      await registry.upsert(persisted('ra'));
      tmux.liveSessions.add('cs-ra');
      const manager = makeManager();
      await manager.whenReady();
      expect(manager.getSession('ra')?.status).toBe('active');

      const closedEvents: string[] = [];
      manager.on('session.closed', (id: string) => closedEvents.push(id));

      // Attach client dies while the tmux session lives on.
      terminal.emit('terminal.exit', 'cloud-ra', 1);
      await vi.advanceTimersByTimeAsync(600); // backoff for attempt 1 = 500ms

      expect(closedEvents).toEqual([]);
      const session = manager.getSession('ra');
      expect(session?.status).toBe('active');
      // A fresh attach client was spawned under a new executionId.
      const reattaches = terminal.spawns.filter((s) => s.executionId.startsWith('cloud-ra-r'));
      expect(reattaches).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('attach-client exit after closeSession → full teardown, no resurrection', async () => {
    await registry.upsert(persisted('cl'));
    tmux.liveSessions.add('cs-cl');
    const manager = makeManager();
    await manager.whenReady();

    manager.closeSession('cl');
    // Exit of the killed attach client arrives afterwards.
    terminal.emit('terminal.exit', 'cloud-cl', 0);
    await new Promise((r) => setTimeout(r, 20));

    expect(manager.getSession('cl')).toBeUndefined();
    expect(tmux.killedSessions).toContain('cs-cl');
    expect(terminal.spawns.filter((s) => s.executionId.startsWith('cloud-cl-r'))).toHaveLength(0);
    expect((await registry.load()).entries).toEqual([]);
  });

  it('real inner exit (tmux session gone) → exit code from exit file, session closed', async () => {
    await registry.upsert(persisted('ex'));
    tmux.liveSessions.add('cs-ex');
    const manager = makeManager();
    await manager.whenReady();

    const closed: Array<{ id: string; code?: number }> = [];
    manager.on('session.closed', (id: string, code?: number) => closed.push({ id, code }));

    tmux.liveSessions.delete('cs-ex'); // inner command exited → session destroyed
    tmux.exitCodeResult = 42;
    terminal.emit('terminal.exit', 'cloud-ex', 0);
    await new Promise((r) => setTimeout(r, 20));

    expect(closed).toEqual([{ id: 'ex', code: 42 }]);
    expect(manager.getSession('ex')?.status).toBe('closed');
    expect((await registry.load()).entries).toEqual([]);
  });
});

describe('rehydrateOwnedSessionWorktree', () => {
  it('mints the brand only for the session-* / session/* namespace', () => {
    const good = rehydrateOwnedSessionWorktree({
      worktreePath: '/tmp/proj-worktrees/session-abc',
      branchName: 'session/abc',
      mainProjectPath: '/tmp/proj',
      seededClaudeConfig: ['.claude/settings.json'],
    });
    expect(good).toBeDefined();
    expect(good?.worktreePath).toBe('/tmp/proj-worktrees/session-abc');

    expect(
      rehydrateOwnedSessionWorktree({
        worktreePath: '/tmp/proj-worktrees/feature-abc',
        branchName: 'session/abc',
        mainProjectPath: '/tmp/proj',
        seededClaudeConfig: [],
      })
    ).toBeUndefined();

    expect(
      rehydrateOwnedSessionWorktree({
        worktreePath: '/tmp/proj-worktrees/session-abc',
        branchName: 'feature/abc',
        mainProjectPath: '/tmp/proj',
        seededClaudeConfig: [],
      })
    ).toBeUndefined();
  });
});

describe('fallback regression: direct spawn without tmux', () => {
  it('spawns exactly like today when the tmux backend is disabled', async () => {
    const dir2 = mkdtempSync(join(tmpdir(), 'fallback-test-'));
    mkdirSync(join(dir2, 'project'), { recursive: true });
    try {
      const terminal2 = new FakeTerminalManager();
      const tmux2 = new FakeTmux();
      tmux2.enabled = false;
      const registry2 = new CloudSessionRegistry(join(dir2, 'sessions.json'));
      const manager = new CloudTerminalManager(
        terminal2 as never,
        tmux2 as unknown as TmuxSessionBackend,
        registry2
      );

      const session = await manager.createSession(join(dir2, 'project'), 'shell');

      expect(terminal2.spawns).toHaveLength(1);
      const spawn = terminal2.spawns[0];
      expect(spawn.shell).toBe(process.env.SHELL || 'bash');
      expect(spawn.args).toEqual([]);
      expect(spawn.cwd).toBe(join(dir2, 'project'));
      // No registry writes in fallback mode — persisting a direct-spawn
      // session would promise a restore we cannot deliver.
      expect((await registry2.load()).entries).toEqual([]);

      manager.closeSession(session.sessionId);
    } finally {
      rmSync(dir2, { recursive: true, force: true });
    }
  });
});
