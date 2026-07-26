/**
 * Unit tests for per-session Cloud Terminal git worktrees.
 *
 * Covers the pure path/branch naming (disjoint from the auto-mode story/backlog
 * namespaces), base-branch resolution with HEAD fallback and non-repo detection,
 * and the create/remove lifecycle (clean-no-commits, clean-with-commits, dirty)
 * against a real git repo. A final block wires CloudTerminalManager with a fake
 * TerminalManager to prove the interactive claude-code path spawns in the
 * worktree while a shell terminal stays in the main project dir.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { EventEmitter } from 'events';
import { join, basename } from 'path';
import { tmpdir } from 'os';
import {
  cloudSessionWorktreePath,
  cloudSessionBranchName,
  resolveSessionBase,
  createCloudSessionWorktree,
  removeCloudSessionWorktree,
  NotAGitRepoError,
} from '../../src/server/utils/cloud-session-worktree.js';

// Force the CLI resolution + availability check to succeed with a real binary
// (`true` exits 0) so the manager wiring test never depends on model-config.json
// or an installed `claude` CLI.
vi.mock('../../src/server/model-config.js', () => ({
  getCliCommandForModel: () => ({ command: 'true', args: [] }),
  getProviderCommand: () => undefined,
  checkCliAvailability: () => true,
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

interface RepoFixture {
  base: string;
  projectPath: string;
}

async function mkRepo(defaultBranch = 'main'): Promise<RepoFixture> {
  const base = await fs.mkdtemp(join(tmpdir(), 'cloud-wt-'));
  const projectPath = join(base, 'myproject');
  await fs.mkdir(projectPath, { recursive: true });
  execSync(`git init -q -b ${defaultBranch}`, { cwd: projectPath });
  execSync('git config user.email test@test.com', { cwd: projectPath });
  execSync('git config user.name test', { cwd: projectPath });
  await fs.writeFile(join(projectPath, 'README.md'), 'init');
  execSync('git add . && git commit -q -m init', { cwd: projectPath });
  return { base, projectPath };
}

async function cleanup(fixture: RepoFixture): Promise<void> {
  await fs.rm(fixture.base, { recursive: true, force: true }).catch(() => {});
}

// ── Naming (pure) ────────────────────────────────────────────────────────────

describe('cloud session worktree naming', () => {
  const main = '/tmp/some/myproject';
  const id = 'cloud-1700000000000-7';

  it('places worktree in the sibling -worktrees dir under a session-<id> name', () => {
    expect(cloudSessionWorktreePath(main, id)).toBe(`/tmp/some/myproject-worktrees/session-${id}`);
  });

  it('uses the session/<id> branch namespace', () => {
    expect(cloudSessionBranchName(id)).toBe(`session/${id}`);
  });

  it('is disjoint from the auto-mode story/backlog namespaces', () => {
    expect(cloudSessionBranchName(id).startsWith('session/')).toBe(true);
    expect(basename(cloudSessionWorktreePath(main, id)).startsWith('session-')).toBe(true);
  });
});

// ── Base resolution ──────────────────────────────────────────────────────────

describe('resolveSessionBase', () => {
  let repo: RepoFixture;
  afterEach(async () => { if (repo) await cleanup(repo); });

  it('returns the configured base branch when it exists', async () => {
    repo = await mkRepo('main');
    await expect(resolveSessionBase(repo.projectPath)).resolves.toBe('main');
  });

  it('falls back to HEAD when the base branch is missing', async () => {
    repo = await mkRepo('master'); // default base 'main' does not exist here
    await expect(resolveSessionBase(repo.projectPath)).resolves.toBe('HEAD');
  });

  it('throws NotAGitRepoError outside a git repo', async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), 'cloud-wt-nogit-'));
    repo = { base: dir, projectPath: dir };
    await expect(resolveSessionBase(dir)).rejects.toBeInstanceOf(NotAGitRepoError);
  });
});

// ── Create / remove lifecycle ────────────────────────────────────────────────

describe('createCloudSessionWorktree / removeCloudSessionWorktree', () => {
  let repo: RepoFixture;
  beforeEach(async () => { repo = await mkRepo('main'); });
  afterEach(async () => { await cleanup(repo); });

  function branchExists(branch: string): boolean {
    try {
      execSync(`git rev-parse --verify --quiet "${branch}"`, { cwd: repo.projectPath, stdio: 'pipe' });
      return true;
    } catch { return false; }
  }

  it('creates a worktree on a fresh session branch forked from base', async () => {
    const id = 'cloud-1-1';
    const { worktreePath, branchName } = await createCloudSessionWorktree(repo.projectPath, id, 'main');
    expect(existsSync(worktreePath)).toBe(true);
    expect(branchName).toBe('session/cloud-1-1');
    expect(branchExists('session/cloud-1-1')).toBe(true);
    const list = execSync('git worktree list', { cwd: repo.projectPath, encoding: 'utf-8' });
    expect(list).toContain(worktreePath);
  });

  it('clean + no commits → removes worktree AND deletes the empty branch', async () => {
    const id = 'cloud-2-1';
    const { worktreePath, branchName } = await createCloudSessionWorktree(repo.projectPath, id, 'main');
    const res = await removeCloudSessionWorktree(repo.projectPath, worktreePath, branchName);
    expect(res.removed).toBe(true);
    expect(existsSync(worktreePath)).toBe(false);
    expect(branchExists(branchName)).toBe(false);
  });

  it('clean + own commits → removes worktree but KEEPS the branch (for a PR)', async () => {
    const id = 'cloud-3-1';
    const { worktreePath, branchName } = await createCloudSessionWorktree(repo.projectPath, id, 'main');
    await fs.writeFile(join(worktreePath, 'work.txt'), 'done');
    execSync('git add . && git commit -q -m work', { cwd: worktreePath });
    const res = await removeCloudSessionWorktree(repo.projectPath, worktreePath, branchName);
    expect(res.removed).toBe(true);
    expect(existsSync(worktreePath)).toBe(false);
    expect(branchExists(branchName)).toBe(true); // unmerged work survives
  });

  it('dirty → keeps the worktree with keptReason "dirty"', async () => {
    const id = 'cloud-4-1';
    const { worktreePath, branchName } = await createCloudSessionWorktree(repo.projectPath, id, 'main');
    await fs.writeFile(join(worktreePath, 'wip.txt'), 'uncommitted');
    const res = await removeCloudSessionWorktree(repo.projectPath, worktreePath, branchName);
    expect(res.removed).toBe(false);
    expect(res.keptReason).toBe('dirty');
    expect(existsSync(worktreePath)).toBe(true);
  });

  it('remove is idempotent (second call is a no-op)', async () => {
    const id = 'cloud-5-1';
    const { worktreePath, branchName } = await createCloudSessionWorktree(repo.projectPath, id, 'main');
    await removeCloudSessionWorktree(repo.projectPath, worktreePath, branchName);
    const second = await removeCloudSessionWorktree(repo.projectPath, worktreePath, branchName);
    expect(second.removed).toBe(true); // path gone → prune path, no throw
    expect(existsSync(worktreePath)).toBe(false);
  });
});

// ── Claude project config seeding ────────────────────────────────────────────

/**
 * Builds the `.claude/` layout of a real project: allowlisted config next to
 * the runtime junk that must never be duplicated into a throwaway worktree.
 */
async function writeClaudeConfig(projectPath: string): Promise<void> {
  const c = join(projectPath, '.claude');
  await fs.mkdir(join(c, 'agents'), { recursive: true });
  await fs.mkdir(join(c, 'commands', 'specwright'), { recursive: true });
  await fs.mkdir(join(c, 'skills', 'my-skill'), { recursive: true });
  await fs.mkdir(join(c, 'worktrees', 'junk'), { recursive: true });
  await fs.mkdir(join(c, 'backup'), { recursive: true });
  await fs.writeFile(join(c, 'agents', 'tech-lead-planner.md'), 'agent');
  await fs.writeFile(join(c, 'agents', '.DS_Store'), 'finder junk');
  await fs.writeFile(join(c, 'commands', 'specwright', 'add-bug.md'), 'cmd');
  await fs.writeFile(join(c, 'skills', 'my-skill', 'SKILL.md'), 'skill');
  await fs.writeFile(join(c, 'settings.local.json'), '{"permissions":{"allow":[]}}');
  await fs.writeFile(join(c, 'worktrees', 'junk', 'big.bin'), 'x'.repeat(4096));
  await fs.writeFile(join(c, 'backup', 'old.md'), 'old');
  await fs.writeFile(join(c, 'scheduled_tasks.lock'), 'lock');
}

/** Repo-local exclude — invisible in the repo, exactly the reported setup. */
async function excludeClaudeDir(projectPath: string): Promise<void> {
  await fs.appendFile(join(projectPath, '.git', 'info', 'exclude'), '\n/.claude/\n');
}

describe('Claude config seeding into a session worktree', () => {
  let repo: RepoFixture;
  beforeEach(async () => {
    repo = await mkRepo('main');
    await excludeClaudeDir(repo.projectPath);
    await writeClaudeConfig(repo.projectPath);
  });
  afterEach(async () => { await cleanup(repo); });

  it('seeds agents, commands, skills and settings that git never saw', async () => {
    const { worktreePath, seededClaudeConfig } =
      await createCloudSessionWorktree(repo.projectPath, 'seed-1', 'main');

    expect(existsSync(join(worktreePath, '.claude/agents/tech-lead-planner.md'))).toBe(true);
    expect(existsSync(join(worktreePath, '.claude/commands/specwright/add-bug.md'))).toBe(true);
    expect(existsSync(join(worktreePath, '.claude/skills/my-skill/SKILL.md'))).toBe(true);
    expect(existsSync(join(worktreePath, '.claude/settings.local.json'))).toBe(true);
    expect(seededClaudeConfig).toContain('.claude/agents/tech-lead-planner.md');
    expect(seededClaudeConfig).toContain('.claude/settings.local.json');
  });

  it('never copies runtime state outside the allowlist', async () => {
    const { worktreePath, seededClaudeConfig } =
      await createCloudSessionWorktree(repo.projectPath, 'seed-2', 'main');

    expect(existsSync(join(worktreePath, '.claude/worktrees'))).toBe(false);
    expect(existsSync(join(worktreePath, '.claude/backup'))).toBe(false);
    expect(existsSync(join(worktreePath, '.claude/scheduled_tasks.lock'))).toBe(false);
    expect(seededClaudeConfig.some((p) => p.includes('worktrees'))).toBe(false);
    expect(seededClaudeConfig.some((p) => p.includes('backup'))).toBe(false);
  });

  it('skips .DS_Store', async () => {
    const { worktreePath } = await createCloudSessionWorktree(repo.projectPath, 'seed-3', 'main');
    expect(existsSync(join(worktreePath, '.claude/agents/.DS_Store'))).toBe(false);
  });

  it('does not follow symlinks out of the allowlist', async () => {
    const outside = join(repo.base, 'outside.md');
    await fs.writeFile(outside, 'secret');
    await fs.symlink(outside, join(repo.projectPath, '.claude/agents/link.md'));

    const { worktreePath, seededClaudeConfig } =
      await createCloudSessionWorktree(repo.projectPath, 'seed-4', 'main');

    expect(existsSync(join(worktreePath, '.claude/agents/link.md'))).toBe(false);
    expect(seededClaudeConfig).not.toContain('.claude/agents/link.md');
  });

  it('is a no-op when the project has no .claude dir', async () => {
    await fs.rm(join(repo.projectPath, '.claude'), { recursive: true, force: true });
    const { worktreePath, seededClaudeConfig } =
      await createCloudSessionWorktree(repo.projectPath, 'seed-5', 'main');
    expect(seededClaudeConfig).toEqual([]);
    expect(existsSync(worktreePath)).toBe(true);
  });

  it('leaves files the checkout already provided untouched', async () => {
    // Commit one agent despite the exclude (force-add), then diverge the
    // working copy in main. The worktree must keep the committed content.
    execSync('git add -f .claude/agents/tech-lead-planner.md', { cwd: repo.projectPath });
    execSync('git commit -q -m "track one agent"', { cwd: repo.projectPath });
    await fs.writeFile(
      join(repo.projectPath, '.claude/agents/tech-lead-planner.md'),
      'LOCALLY EDITED'
    );

    const { worktreePath, seededClaudeConfig } =
      await createCloudSessionWorktree(repo.projectPath, 'seed-6', 'main');

    const content = await fs.readFile(
      join(worktreePath, '.claude/agents/tech-lead-planner.md'), 'utf-8'
    );
    expect(content).toBe('agent'); // committed version, not the main-repo edit
    expect(seededClaudeConfig).not.toContain('.claude/agents/tech-lead-planner.md');
  });
});

describe('seeded Claude config at teardown (project versions .claude/)', () => {
  let repo: RepoFixture;

  // No exclude here: `.claude/` is versioned, so a seeded copy shows up as an
  // untracked file. Without the teardown removal every session worktree would
  // read as dirty and never be reclaimed.
  beforeEach(async () => {
    repo = await mkRepo('main');
    await fs.mkdir(join(repo.projectPath, '.claude/agents'), { recursive: true });
    await fs.writeFile(join(repo.projectPath, '.claude/agents/committed.md'), 'committed');
    execSync('git add . && git commit -q -m "track claude config"', { cwd: repo.projectPath });
    // Local-only agent — the file that actually needs seeding.
    await fs.writeFile(join(repo.projectPath, '.claude/agents/local-only.md'), 'local');
  });
  afterEach(async () => { await cleanup(repo); });

  it('removes unchanged seeds so the worktree is reclaimed', async () => {
    const { worktreePath, branchName, seededClaudeConfig } =
      await createCloudSessionWorktree(repo.projectPath, 'td-1', 'main');
    expect(seededClaudeConfig).toEqual(['.claude/agents/local-only.md']);
    expect(existsSync(join(worktreePath, '.claude/agents/local-only.md'))).toBe(true);

    const res = await removeCloudSessionWorktree(
      repo.projectPath, worktreePath, branchName, seededClaudeConfig
    );
    expect(res.removed).toBe(true);
    expect(existsSync(worktreePath)).toBe(false);
  });

  it('keeps a seed edited during the session → worktree stays dirty', async () => {
    const { worktreePath, branchName, seededClaudeConfig } =
      await createCloudSessionWorktree(repo.projectPath, 'td-2', 'main');
    await fs.writeFile(join(worktreePath, '.claude/agents/local-only.md'), 'EDITED IN SESSION');

    const res = await removeCloudSessionWorktree(
      repo.projectPath, worktreePath, branchName, seededClaudeConfig
    );
    expect(res.removed).toBe(false);
    expect(res.keptReason).toBe('dirty');
    expect(
      await fs.readFile(join(worktreePath, '.claude/agents/local-only.md'), 'utf-8')
    ).toBe('EDITED IN SESSION');
  });

  it('without the seed list, teardown deletes nothing (guards the default arg)', async () => {
    const { worktreePath, branchName } =
      await createCloudSessionWorktree(repo.projectPath, 'td-3', 'main');
    const res = await removeCloudSessionWorktree(repo.projectPath, worktreePath, branchName);
    expect(res.removed).toBe(false);
    expect(res.keptReason).toBe('dirty'); // untracked seed still there
    expect(existsSync(join(worktreePath, '.claude/agents/local-only.md'))).toBe(true);
  });
});

// ── Manager wiring ───────────────────────────────────────────────────────────

class FakeTerminalManager extends EventEmitter {
  public lastSpawn: { executionId: string; cwd: string; env: Record<string, string> } | null = null;
  spawn(opts: { executionId: string; cwd: string; env: Record<string, string> }) {
    this.lastSpawn = { executionId: opts.executionId, cwd: opts.cwd, env: opts.env };
    return { executionId: opts.executionId, pid: 4321, cwd: opts.cwd, createdAt: new Date(), lastActivity: new Date() };
  }
  kill() { return true; }
  write() { return true; }
  resize() { return true; }
}

describe('CloudTerminalManager per-session worktree wiring', () => {
  let repo: RepoFixture;
  let CloudTerminalManager: typeof import('../../src/server/services/cloud-terminal-manager.js').CloudTerminalManager;

  beforeEach(async () => {
    repo = await mkRepo('main');
    ({ CloudTerminalManager } = await import('../../src/server/services/cloud-terminal-manager.js'));
  });
  afterEach(async () => { await cleanup(repo); });

  it('claude-code + isolateInWorktree → spawns in the session worktree', async () => {
    const fake = new FakeTerminalManager();
    const mgr = new CloudTerminalManager(fake as never);
    const session = await mgr.createSession(
      repo.projectPath, 'claude-code', { model: 'x' },
      undefined, undefined, undefined, undefined, undefined, { isolateInWorktree: true }
    );
    const cwd = fake.lastSpawn?.cwd ?? '';
    expect(cwd).toContain(`${basename(repo.projectPath)}-worktrees`);
    expect(basename(cwd)).toBe(`session-${session.sessionId}`);
    expect(existsSync(cwd)).toBe(true);
    // Kanban routing env points back to the main project.
    expect(fake.lastSpawn?.env.SPECWRIGHT_MAIN_PROJECT_PATH).toBe(repo.projectPath);
    // Public metadata keeps the main project path, not the worktree.
    expect(session.projectPath).toBe(repo.projectPath);
    await mgr.shutdown();
  });

  it('shell terminal ignores isolateInWorktree → stays in the main project dir', async () => {
    const fake = new FakeTerminalManager();
    const mgr = new CloudTerminalManager(fake as never);
    await mgr.createSession(
      repo.projectPath, 'shell', undefined,
      undefined, undefined, undefined, undefined, undefined, { isolateInWorktree: true }
    );
    expect(fake.lastSpawn?.cwd).toBe(repo.projectPath);
    const list = execSync('git worktree list', { cwd: repo.projectPath, encoding: 'utf-8' });
    expect(list).not.toContain('-worktrees');
    await mgr.shutdown();
  });
});
