/**
 * Wiring tests for the Cloud Terminal session-target picker.
 *
 * The safety-critical assertions live here:
 *  - attaching to a user-owned worktree must NEVER delete it, on any teardown path
 *  - two panes racing for the same worktree must not both win
 *  - a failed create must not leave a phantom occupancy claim
 *  - Ctrl-D (terminal.exit) must release the target immediately
 *
 * Runs against real git repos with a fake TerminalManager, because the whole
 * argument rests on what git actually reports.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs, existsSync } from 'fs';
import { execSync } from 'child_process';
import { EventEmitter } from 'events';
import { join, basename } from 'path';
import { tmpdir } from 'os';
import { pathKey } from '../../src/server/utils/git-worktree-list.js';
import { removeCloudSessionWorktree } from '../../src/server/utils/cloud-session-worktree.js';

// Real binary that exits 0, so CLI resolution never needs an installed `claude`.
vi.mock('../../src/server/model-config.js', () => ({
  getCliCommandForModel: () => ({ command: 'true', args: [] }),
  getProviderCommand: () => undefined,
  checkCliAvailability: () => true,
}));

// Controllable feature flag; everything else keeps production defaults.
const configState = { worktreeEnabled: true, baseBranch: 'main' };
vi.mock('../../src/server/general-config.js', () => ({
  getCloudSessionWorktreeEnabled: () => configState.worktreeEnabled,
  getBaseBranch: () => configState.baseBranch,
  getReviewPrompt: () => 'review',
  getWorktreeMaxConcurrent: () => 3,
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

interface RepoFixture {
  base: string;
  projectPath: string;
}

async function mkRepo(): Promise<RepoFixture> {
  const base = await fs.mkdtemp(join(tmpdir(), 'cloud-target-'));
  const projectPath = join(base, 'myproject');
  await fs.mkdir(projectPath, { recursive: true });
  execSync('git init -q -b main', { cwd: projectPath });
  execSync('git config user.email test@test.com', { cwd: projectPath });
  execSync('git config user.name test', { cwd: projectPath });
  await fs.writeFile(join(projectPath, 'README.md'), 'init');
  execSync('git add . && git commit -q -m init', { cwd: projectPath });
  return { base, projectPath };
}

/** Creates a worktree the "user" owns — outside the disposable session namespace. */
function addUserWorktree(repo: RepoFixture, name: string, branch: string): string {
  const wt = join(repo.base, 'myproject-worktrees', name);
  execSync(`git worktree add -q "${wt}" -b ${branch} main`, { cwd: repo.projectPath });
  return wt;
}

function branchExists(repo: RepoFixture, branch: string): boolean {
  const out = execSync(`git branch --list ${branch}`, {
    cwd: repo.projectPath,
    encoding: 'utf-8',
  });
  return out.trim().length > 0;
}

class FakeTerminalManager extends EventEmitter {
  public lastSpawn: { executionId: string; cwd: string; env: Record<string, string> } | null = null;
  public spawns: { executionId: string; cwd: string }[] = [];
  spawn(opts: { executionId: string; cwd: string; env: Record<string, string> }) {
    this.lastSpawn = { executionId: opts.executionId, cwd: opts.cwd, env: opts.env };
    this.spawns.push({ executionId: opts.executionId, cwd: opts.cwd });
    return {
      executionId: opts.executionId,
      pid: 4321,
      cwd: opts.cwd,
      createdAt: new Date(),
      lastActivity: new Date(),
    };
  }
  kill() { return true; }
  write() { return true; }
  resize() { return true; }
}

type Manager = InstanceType<
  typeof import('../../src/server/services/cloud-terminal-manager.js').CloudTerminalManager
>;

describe('Cloud Terminal session targets', () => {
  let repo: RepoFixture;
  let fake: FakeTerminalManager;
  let mgr: Manager;
  let CloudTerminalManager: typeof import('../../src/server/services/cloud-terminal-manager.js').CloudTerminalManager;

  beforeEach(async () => {
    configState.worktreeEnabled = true;
    repo = await mkRepo();
    ({ CloudTerminalManager } = await import('../../src/server/services/cloud-terminal-manager.js'));
    fake = new FakeTerminalManager();
    mgr = new CloudTerminalManager(fake as never);
  });

  afterEach(async () => {
    await mgr.shutdown().catch(() => {});
    await fs.rm(repo.base, { recursive: true, force: true }).catch(() => {});
  });

  // ── Backwards compatibility ────────────────────────────────────────────────

  it('no sessionTarget + isolateInWorktree → still creates a session worktree', async () => {
    const session = await mgr.createSession(
      repo.projectPath, 'claude-code', { model: 'x' },
      undefined, undefined, undefined, undefined, undefined, { isolateInWorktree: true }
    );
    expect(basename(fake.lastSpawn?.cwd ?? '')).toBe(`session-${session.sessionId}`);
  });

  it('no options at all → runs in the project dir (auto-mode / workflow callers)', async () => {
    await mgr.createSession(repo.projectPath, 'claude-code', { model: 'x' });
    expect(fake.lastSpawn?.cwd).toBe(repo.projectPath);
  });

  // ── kind: 'main' ───────────────────────────────────────────────────────────

  it('main → spawns in the project dir and creates no worktree', async () => {
    const session = await mgr.createSession(
      repo.projectPath, 'claude-code', { model: 'x' },
      undefined, undefined, undefined, undefined, undefined,
      { sessionTarget: { target: { kind: 'main' }, explicit: true } }
    );
    expect(fake.lastSpawn?.cwd).toBe(repo.projectPath);
    // The manager must not INTRODUCE the kanban routing override for 'main'.
    // (Whatever the server process already carries is inherited via process.env
    // — that is pre-existing behaviour shared with shell terminals.)
    expect(fake.lastSpawn?.env.SPECWRIGHT_MAIN_PROJECT_PATH).toBe(
      process.env.SPECWRIGHT_MAIN_PROJECT_PATH
    );
    expect(fake.lastSpawn?.env.SPECWRIGHT_MAIN_PROJECT_PATH).not.toBe(repo.projectPath);
    expect(session.effectiveCwd).toBe(pathKey(repo.projectPath));

    const list = execSync('git worktree list', { cwd: repo.projectPath, encoding: 'utf-8' });
    expect(list).not.toContain('-worktrees');
  });

  it('main is NOT occupancy-blocked — several sessions may share it', async () => {
    const target = { target: { kind: 'main' as const }, explicit: true };
    await mgr.createSession(repo.projectPath, 'claude-code', { model: 'x' },
      undefined, undefined, undefined, undefined, undefined, { sessionTarget: target });
    await expect(
      mgr.createSession(repo.projectPath, 'claude-code', { model: 'x' },
        undefined, undefined, undefined, undefined, undefined, { sessionTarget: target })
    ).resolves.toBeDefined();

    const occupied = mgr.getOccupiedPaths();
    expect(occupied.get(pathKey(repo.projectPath))?.count).toBe(2);
  });

  // ── kind: 'existing-worktree' ──────────────────────────────────────────────

  it('existing-worktree → spawns there, routes kanban to main, keeps projectPath', async () => {
    const wt = addUserWorktree(repo, 'alpha', 'feature/alpha');
    const session = await mgr.createSession(
      repo.projectPath, 'claude-code', { model: 'x' },
      undefined, undefined, undefined, undefined, undefined,
      { sessionTarget: { target: { kind: 'existing-worktree', path: wt }, explicit: true } }
    );

    expect(fake.lastSpawn?.cwd).toBe(pathKey(wt));
    expect(fake.lastSpawn?.env.SPECWRIGHT_MAIN_PROJECT_PATH).toBe(repo.projectPath);
    // Public metadata still points at the registered project…
    expect(session.projectPath).toBe(repo.projectPath);
    // …while effectiveCwd carries the ground truth.
    expect(session.effectiveCwd).toBe(pathKey(wt));
  });

  it('SAFETY: closeSession leaves an attached worktree and its branch intact', async () => {
    const wt = addUserWorktree(repo, 'alpha', 'feature/alpha');
    const session = await mgr.createSession(
      repo.projectPath, 'claude-code', { model: 'x' },
      undefined, undefined, undefined, undefined, undefined,
      { sessionTarget: { target: { kind: 'existing-worktree', path: wt }, explicit: true } }
    );

    await mgr.closeSession(session.sessionId);

    expect(existsSync(wt)).toBe(true);
    expect(branchExists(repo, 'feature/alpha')).toBe(true);
  });

  it('SAFETY: terminal.exit (Ctrl-D) leaves an attached worktree and branch intact', async () => {
    const wt = addUserWorktree(repo, 'beta', 'feature/beta');
    const session = await mgr.createSession(
      repo.projectPath, 'claude-code', { model: 'x' },
      undefined, undefined, undefined, undefined, undefined,
      { sessionTarget: { target: { kind: 'existing-worktree', path: wt }, explicit: true } }
    );

    fake.emit('terminal.exit', `cloud-${session.sessionId}`, 0);
    await new Promise((r) => setImmediate(r));

    expect(existsSync(wt)).toBe(true);
    expect(branchExists(repo, 'feature/beta')).toBe(true);
  });

  it('SAFETY: shutdown leaves an attached worktree and branch intact', async () => {
    const wt = addUserWorktree(repo, 'gamma', 'feature/gamma');
    await mgr.createSession(
      repo.projectPath, 'claude-code', { model: 'x' },
      undefined, undefined, undefined, undefined, undefined,
      { sessionTarget: { target: { kind: 'existing-worktree', path: wt }, explicit: true } }
    );

    await mgr.shutdown();

    expect(existsSync(wt)).toBe(true);
    expect(branchExists(repo, 'feature/gamma')).toBe(true);
  });

  it('shell terminals ignore an existing-worktree target', async () => {
    const wt = addUserWorktree(repo, 'delta', 'feature/delta');
    await mgr.createSession(
      repo.projectPath, 'shell', undefined,
      undefined, undefined, undefined, undefined, undefined,
      { sessionTarget: { target: { kind: 'existing-worktree', path: wt }, explicit: true } }
    );
    expect(fake.lastSpawn?.cwd).toBe(repo.projectPath);
  });

  it('rejects a path that is not a worktree of this repo', async () => {
    await expect(
      mgr.createSession(
        repo.projectPath, 'claude-code', { model: 'x' },
        undefined, undefined, undefined, undefined, undefined,
        { sessionTarget: { target: { kind: 'existing-worktree', path: '/etc' }, explicit: true } }
      )
    ).rejects.toMatchObject({ code: 'TARGET_NOT_A_WORKTREE' });
  });

  // ── Occupancy ──────────────────────────────────────────────────────────────

  it('a second session on the same worktree is rejected as occupied', async () => {
    const wt = addUserWorktree(repo, 'alpha', 'feature/alpha');
    const target = { target: { kind: 'existing-worktree' as const, path: wt }, explicit: true };

    await mgr.createSession(repo.projectPath, 'claude-code', { model: 'x' },
      undefined, undefined, undefined, undefined, undefined, { sessionTarget: target });

    await expect(
      mgr.createSession(repo.projectPath, 'claude-code', { model: 'x' },
        undefined, undefined, undefined, undefined, undefined, { sessionTarget: target })
    ).rejects.toMatchObject({ code: 'TARGET_OCCUPIED' });
  });

  it('RACE: two concurrent creates on one worktree → exactly one wins', async () => {
    const wt = addUserWorktree(repo, 'alpha', 'feature/alpha');
    const target = { target: { kind: 'existing-worktree' as const, path: wt }, explicit: true };

    const results = await Promise.allSettled([
      mgr.createSession(repo.projectPath, 'claude-code', { model: 'x' },
        undefined, undefined, undefined, undefined, undefined, { sessionTarget: target }),
      mgr.createSession(repo.projectPath, 'claude-code', { model: 'x' },
        undefined, undefined, undefined, undefined, undefined, { sessionTarget: target }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
      code: 'TARGET_OCCUPIED',
    });
  });

  it('a different worktree stays available while another is occupied', async () => {
    const alpha = addUserWorktree(repo, 'alpha', 'feature/alpha');
    const beta = addUserWorktree(repo, 'beta', 'feature/beta');

    await mgr.createSession(repo.projectPath, 'claude-code', { model: 'x' },
      undefined, undefined, undefined, undefined, undefined,
      { sessionTarget: { target: { kind: 'existing-worktree', path: alpha }, explicit: true } });

    await expect(
      mgr.createSession(repo.projectPath, 'claude-code', { model: 'x' },
        undefined, undefined, undefined, undefined, undefined,
        { sessionTarget: { target: { kind: 'existing-worktree', path: beta }, explicit: true } })
    ).resolves.toBeDefined();
  });

  it('NO GHOST: a failed create leaves no occupancy claim behind', async () => {
    await expect(
      mgr.createSession(
        repo.projectPath, 'claude-code', { model: 'x' },
        undefined, undefined, undefined, undefined, undefined,
        { sessionTarget: { target: { kind: 'existing-worktree', path: '/etc' }, explicit: true } }
      )
    ).rejects.toThrow();

    expect(mgr.getOccupiedPaths().size).toBe(0);
  });

  it('terminal.exit releases the target immediately, before the delayed delete', async () => {
    const wt = addUserWorktree(repo, 'alpha', 'feature/alpha');
    const session = await mgr.createSession(
      repo.projectPath, 'claude-code', { model: 'x' },
      undefined, undefined, undefined, undefined, undefined,
      { sessionTarget: { target: { kind: 'existing-worktree', path: wt }, explicit: true } }
    );
    expect(mgr.getOccupiedPaths().has(pathKey(wt))).toBe(true);

    fake.emit('terminal.exit', `cloud-${session.sessionId}`, 0);

    expect(mgr.getOccupiedPaths().has(pathKey(wt))).toBe(false);
  });

  it('closeSession releases the target', async () => {
    const wt = addUserWorktree(repo, 'alpha', 'feature/alpha');
    const session = await mgr.createSession(
      repo.projectPath, 'claude-code', { model: 'x' },
      undefined, undefined, undefined, undefined, undefined,
      { sessionTarget: { target: { kind: 'existing-worktree', path: wt }, explicit: true } }
    );
    await mgr.closeSession(session.sessionId);
    expect(mgr.getOccupiedPaths().has(pathKey(wt))).toBe(false);
  });

  // ── .mcp.json seeding ──────────────────────────────────────────────────────

  it('seeds .mcp.json into an attached worktree when it is missing', async () => {
    await fs.writeFile(join(repo.projectPath, '.mcp.json'), '{"mcpServers":{}}');
    const wt = addUserWorktree(repo, 'alpha', 'feature/alpha');

    await mgr.createSession(
      repo.projectPath, 'claude-code', { model: 'x' },
      undefined, undefined, undefined, undefined, undefined,
      { sessionTarget: { target: { kind: 'existing-worktree', path: wt }, explicit: true } }
    );

    expect(await fs.readFile(join(wt, '.mcp.json'), 'utf-8')).toBe('{"mcpServers":{}}');
  });

  it("never overwrites a user's own .mcp.json in an attached worktree", async () => {
    await fs.writeFile(join(repo.projectPath, '.mcp.json'), '{"mcpServers":{"a":1}}');
    const wt = addUserWorktree(repo, 'alpha', 'feature/alpha');
    await fs.writeFile(join(wt, '.mcp.json'), '{"mine":true}');

    const session = await mgr.createSession(
      repo.projectPath, 'claude-code', { model: 'x' },
      undefined, undefined, undefined, undefined, undefined,
      { sessionTarget: { target: { kind: 'existing-worktree', path: wt }, explicit: true } }
    );

    expect(await fs.readFile(join(wt, '.mcp.json'), 'utf-8')).toBe('{"mine":true}');
    const notices = mgr.takePendingNotices(session.sessionId);
    expect(notices.some((n) => n.text.includes('.mcp.json'))).toBe(true);
  });

  // ── Kill switch ────────────────────────────────────────────────────────────

  it('flag off + EXPLICIT new-worktree → hard error, never a silent main fallback', async () => {
    configState.worktreeEnabled = false;

    await expect(
      mgr.createSession(
        repo.projectPath, 'claude-code', { model: 'x' },
        undefined, undefined, undefined, undefined, undefined,
        { sessionTarget: { target: { kind: 'new-worktree' }, explicit: true } }
      )
    ).rejects.toMatchObject({ code: 'WORKTREE_CREATION_DISABLED' });

    expect(fake.spawns).toHaveLength(0);
  });

  it('flag off + IMPLICIT new-worktree → legacy silent fallback plus a notice', async () => {
    configState.worktreeEnabled = false;

    const session = await mgr.createSession(
      repo.projectPath, 'claude-code', { model: 'x' },
      undefined, undefined, undefined, undefined, undefined, { isolateInWorktree: true }
    );

    expect(fake.lastSpawn?.cwd).toBe(repo.projectPath);
    const notices = mgr.takePendingNotices(session.sessionId);
    expect(notices.some((n) => n.text.includes('deaktiviert'))).toBe(true);
  });
});

// ── Namespace guard on the removal helper ────────────────────────────────────

describe('removeCloudSessionWorktree namespace guard', () => {
  let repo: RepoFixture;

  beforeEach(async () => { repo = await mkRepo(); });
  afterEach(async () => {
    await fs.rm(repo.base, { recursive: true, force: true }).catch(() => {});
  });

  it('refuses a worktree outside the session-* / session/* namespace', async () => {
    const wt = addUserWorktree(repo, 'alpha', 'feature/alpha');

    const result = await removeCloudSessionWorktree(repo.projectPath, wt, 'feature/alpha');

    expect(result).toEqual({ removed: false, keptReason: 'not-owned' });
    expect(existsSync(wt)).toBe(true);
    expect(branchExists(repo, 'feature/alpha')).toBe(true);
  });

  it('refuses a session-shaped directory carrying a foreign branch name', async () => {
    const wt = addUserWorktree(repo, 'session-fake', 'feature/not-a-session');

    const result = await removeCloudSessionWorktree(repo.projectPath, wt, 'feature/not-a-session');

    expect(result.removed).toBe(false);
    expect(existsSync(wt)).toBe(true);
  });
});
