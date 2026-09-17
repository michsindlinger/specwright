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
import { CLOUD_TERMINAL_CONFIG } from '../../src/shared/types/cloud-terminal.protocol.js';
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
  /** INT-2026-016: what captureScreen returns (the dialog probe reads it). */
  public screen: string | null = null;
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
  async captureScreen() { return this.screen; }
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

  it('restores the persisted agent status (FA-22) and re-persists it on every agent event', async () => {
    await registry.upsert(
      persisted('s1', {
        agentStatus: 'done',
        agentStatusAt: '2026-09-15T14:00:00.000Z',
        agentStatusReason: undefined,
      })
    );
    tmux.liveSessions.add('cs-s1');

    const manager = makeManager();
    await manager.whenReady();

    const session = manager.getSession('s1');
    expect(session?.agentStatus).toBe('done');
    expect(session?.agentStatusAt?.toISOString()).toBe('2026-09-15T14:00:00.000Z');

    // A hook fires → status changes → the registry entry carries the new status.
    expect(manager.reportAgentEvent('s1', 'prompt-submitted')).toBe(true);
    await new Promise((r) => setTimeout(r, 50));
    const stored = (await registry.load()).entries.find((e) => e.sessionId === 's1');
    expect(stored?.agentStatus).toBe('working');
    expect(typeof stored?.agentStatusAt).toBe('string');
  });

  it('INT-2026-016 (AK-04): restores the „fertig" mark only while it is younger than 24 h', async () => {
    const now = Date.now();
    await registry.upsert(persisted('s-fresh', { agentStatus: 'idle', agentDoneAt: new Date(now - 60 * 60 * 1000).toISOString() }));
    await registry.upsert(persisted('s-old', { agentStatus: 'idle', agentDoneAt: new Date(now - 25 * 60 * 60 * 1000).toISOString() }));
    tmux.liveSessions.add('cs-s-fresh');
    tmux.liveSessions.add('cs-s-old');
    const manager = makeManager();
    await manager.whenReady();
    expect(manager.getSession('s-fresh')?.agentDoneAt).toBeInstanceOf(Date);
    expect(manager.getSession('s-old')?.agentDoneAt).toBeUndefined();
  });

  it('INT-2026-016 (AK-10): a probe block survives the restart with its origin; a restored working session is probed once', async () => {
    vi.useFakeTimers();
    try {
      await registry.upsert(persisted('s-probe', { agentStatus: 'blocked', blockKind: 'plan', blockedBy: 'probe' }));
      await registry.upsert(persisted('s-work', { agentStatus: 'working' }));
      tmux.liveSessions.add('cs-s-probe');
      tmux.liveSessions.add('cs-s-work');
      tmux.screen = '  Claude has written up a plan and is ready to execute. Would you like to proceed?\n  ❯ 1. Yes\n';
      const manager = makeManager();
      await manager.whenReady();
      expect(manager.getSession('s-probe')).toMatchObject({ agentStatus: 'blocked', blockKind: 'plan', blockedBy: 'probe' });
      expect(manager.getSession('s-work')?.agentStatus).toBe('working');
      vi.advanceTimersByTime(CLOUD_TERMINAL_CONFIG.DIALOG_PROBE_QUIET_MS + 1);
      for (let i = 0; i < 8; i++) await Promise.resolve();
      expect(manager.getSession('s-work')).toMatchObject({ agentStatus: 'blocked', blockKind: 'plan', blockedBy: 'probe' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('entries without agent status fields (older files) restore as unknown', async () => {
    await registry.upsert(persisted('s2'));
    tmux.liveSessions.add('cs-s2');
    const manager = makeManager();
    await manager.whenReady();
    expect(manager.getSession('s2')?.agentStatus).toBe('unknown');
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

  it('keeps a dead entry\'s worktree when a restored session still works in it', async () => {
    const wt = '/tmp/project-worktrees/session-dead';
    await registry.upsert(
      persisted('dead', {
        effectiveCwd: wt,
        worktree: {
          worktreePath: wt,
          branchName: 'session/dead',
          mainProjectPath: '/tmp/project',
          seededClaudeConfig: [],
        },
      })
    );
    // Survivor attached to the very same worktree.
    await registry.upsert(persisted('alive', { effectiveCwd: wt }));
    tmux.liveSessions.add('cs-alive');

    const manager = makeManager();
    await manager.whenReady();

    // Not deleted under the survivor …
    expect(vi.mocked(removeCloudSessionWorktree)).not.toHaveBeenCalled();
    // … and the cleanup token moved to it instead of being dropped with the
    // dead registry entry (otherwise the directory would leak forever).
    const persistedAlive = (await registry.load()).entries.find((e) => e.sessionId === 'alive');
    expect(persistedAlive?.worktree).toMatchObject({ worktreePath: wt, branchName: 'session/dead' });
    expect(rehydrateOwnedSessionWorktree(persistedAlive!.worktree!)).toBeDefined();
    expect((await registry.load()).entries.some((e) => e.sessionId === 'dead')).toBe(false);
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

  it('INT-2026-007 (FA-08): transcript path, block kind and plan-review settings come back with the session', async () => {
    tmux.enabled = true;
    await registry.upsert(
      persisted('s7', {
        agentStatus: 'blocked',
        agentStatusReason: 'Berechtigung: ExitPlanMode',
        transcriptPath: '/home/me/.claude/projects/-tmp-project/abc.jsonl',
        claudeSessionId: 'abc',
        blockKind: 'plan',
        planReviewEnabled: true,
        planReviewReviewers: [{ providerId: 'anthropic', modelId: 'haiku' }],
        lastInjectedPlanPath: 'hook:toolu_1',
      })
    );
    await registry.upsert(persisted('s8', { agentStatus: 'done', blockKind: 'plan' }));
    tmux.liveSessions.add('cs-s7');
    tmux.liveSessions.add('cs-s8');

    const manager = makeManager();
    await manager.whenReady();

    const s7 = manager.getSession('s7')!;
    expect(s7).toMatchObject({ agentStatus: 'blocked', blockKind: 'plan', transcriptPath: '/home/me/.claude/projects/-tmp-project/abc.jsonl', claudeSessionId: 'abc' });
    expect(manager.getPlanReviewSettings('s7')).toEqual({ enabled: true, reviewers: [{ providerId: 'anthropic', modelId: 'haiku' }], lastInjectedPlanPath: 'hook:toolu_1' });
    // a stale block kind on a session that is not blocked is dropped
    expect(manager.getSession('s8')!.blockKind).toBeUndefined();
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
