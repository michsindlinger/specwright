/**
 * Unit tests for PAM-005: per-story worktree path helpers and seed setup.
 * Covers pure path arithmetic, seed copy, idempotency, migration from legacy
 * symlinks, and rollback on commit failure. The post-seed `isWorktreeClean`
 * test reproduces the bug class that motivated dropping symlinks.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import { join, basename } from 'path';
import { tmpdir } from 'os';
import {
  storyWorktreePath,
  storyBranchName,
  backlogWorktreePath,
  backlogBranchName,
  seedSpecDirInWorktree,
  seedBacklogDirInWorktree,
  copyMcpConfigToWorktree,
  isWorktreeClean,
  commitMainKanbanIfDirty,
  purgeShadowSpecMutables,
  MUTABLE_SPEC_FILES,
  MUTABLE_BACKLOG_FILES,
} from '../../src/server/utils/worktree-story.js';

// ============================================================================
// Helpers
// ============================================================================

interface RepoFixture {
  base: string;
  projectPath: string;
  worktreePath: string;
}

/**
 * Builds a real git repo + git worktree on a feature branch, mirroring the
 * production layout: `<base>/myproject/` and `<base>/myproject-worktrees/<name>`.
 */
async function mkRepoWithWorktree(name: string, options: { specId?: string; withBacklog?: boolean } = {}): Promise<RepoFixture> {
  const base = await fs.mkdtemp(join(tmpdir(), 'wt-helper-'));
  const projectPath = join(base, 'myproject');
  await fs.mkdir(join(projectPath, 'specwright', 'specs'), { recursive: true });

  execSync('git init -q -b main', { cwd: projectPath });
  execSync('git config user.email test@test.com', { cwd: projectPath });
  execSync('git config user.name test', { cwd: projectPath });
  await fs.writeFile(join(projectPath, 'README.md'), 'init');
  execSync('git add . && git commit -q -m init', { cwd: projectPath });

  const worktreeBase = join(base, `${basename(projectPath)}-worktrees`);
  await fs.mkdir(worktreeBase, { recursive: true });
  const worktreePath = join(worktreeBase, name);
  execSync(`git worktree add -b feature/${name} "${worktreePath}"`, { cwd: projectPath, stdio: 'pipe' });

  // Spec/backlog content is created AFTER the worktree is cut. Mirrors production:
  // a fresh spec exists on main but not on the base branch the worktree was forked
  // from, so the worktree starts without that content and the seed must copy it in.
  if (options.specId) {
    const specDir = join(projectPath, 'specwright', 'specs', options.specId);
    await fs.mkdir(specDir, { recursive: true });
    await fs.writeFile(join(specDir, 'planning.md'), '# Plan');
    await fs.writeFile(join(specDir, 'stories.md'), '# Stories');
    await fs.writeFile(join(specDir, 'kanban.json'), '{"version":"2.0"}');
    await fs.writeFile(join(specDir, 'kanban-board.md'), '# Kanban');
  }
  if (options.withBacklog) {
    await fs.mkdir(join(projectPath, 'specwright', 'backlog'), { recursive: true });
    await fs.writeFile(join(projectPath, 'specwright', 'backlog', 'backlog-index.json'), '{"items":[]}');
  }

  return { base, projectPath, worktreePath };
}

async function tearDown(fixture: RepoFixture): Promise<void> {
  try {
    execSync(`git worktree remove --force "${fixture.worktreePath}"`, { cwd: fixture.projectPath, stdio: 'pipe' });
  } catch { /* best-effort */ }
  await fs.rm(fixture.base, { recursive: true, force: true });
}

// ============================================================================
// Pure path arithmetic
// ============================================================================

describe('storyWorktreePath', () => {
  it('builds correct path for dated specId', () => {
    const result = storyWorktreePath('/home/user/myproj', '2026-01-15-my-feature', 'PAM-005');
    expect(result).toBe('/home/user/myproj-worktrees/my-feature-PAM-005');
  });

  it('handles specId without date prefix', () => {
    const result = storyWorktreePath('/home/user/myproj', 'my-feature', 'T-001');
    expect(result).toBe('/home/user/myproj-worktrees/my-feature-T-001');
  });

  it('uses projectPath basename for worktree base', () => {
    const result = storyWorktreePath('/a/b/c/proj', '2026-01-01-feat', 'S-001');
    expect(result).toBe('/a/b/c/proj-worktrees/feat-S-001');
  });
});

describe('storyBranchName', () => {
  it('builds story/${feature}/${storyId} format (v3.27.5: separate namespace from spec branch)', () => {
    expect(storyBranchName('2026-01-15-my-feature', 'PAM-005')).toBe('story/my-feature/PAM-005');
  });

  it('strips only leading date prefix (YYYY-MM-DD-)', () => {
    expect(storyBranchName('2026-04-27-parallel-auto-mode', 'PAM-007')).toBe('story/parallel-auto-mode/PAM-007');
  });

  it('handles specId without date prefix', () => {
    expect(storyBranchName('my-feature', 'T-001')).toBe('story/my-feature/T-001');
  });

  it('does NOT collide with spec branch feature/${feature} (git ref hierarchy)', () => {
    // Regression test: pre-v3.27.5 used `feature/{feature}/{storyId}` which
    // collides with the spec branch `feature/{feature}` because git refs
    // are hierarchical. story/... lives in a separate namespace.
    const branch = storyBranchName('2026-05-05-ifdb-wcag-2-2-aa-remediation', 'WCAG-014');
    expect(branch.startsWith('feature/ifdb-wcag-2-2-aa-remediation/')).toBe(false);
    expect(branch).toBe('story/ifdb-wcag-2-2-aa-remediation/WCAG-014');
  });
});

describe('backlogWorktreePath', () => {
  it('builds backlog-${slug} path', () => {
    const result = backlogWorktreePath('/home/user/myproj', 'BUG-001');
    expect(result).toBe('/home/user/myproj-worktrees/backlog-bug-001');
  });

  it('slugifies uppercase IDs', () => {
    const result = backlogWorktreePath('/home/user/proj', 'TODO-042');
    expect(result).toBe('/home/user/proj-worktrees/backlog-todo-042');
  });

  it('replaces special chars with hyphens', () => {
    const result = backlogWorktreePath('/home/user/proj', 'FEAT_123.x');
    expect(result).toBe('/home/user/proj-worktrees/backlog-feat-123-x');
  });
});

describe('backlogBranchName', () => {
  it('builds feature/${slug} format for uppercase IDs', () => {
    expect(backlogBranchName('BUG-001')).toBe('feature/bug-001');
  });

  it('replaces special chars with hyphens', () => {
    expect(backlogBranchName('FEAT_123.x')).toBe('feature/feat-123-x');
  });

  it('matches startBacklogStoryExecution slug convention', () => {
    const id = 'TODO-042';
    const expected = `feature/${id.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
    expect(backlogBranchName(id)).toBe(expected);
  });
});

// ============================================================================
// isWorktreeClean — git status --porcelain wrapper
// ============================================================================

describe('isWorktreeClean', () => {
  let tmpDir: string;
  let repoPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'iwc-'));
    repoPath = join(tmpDir, 'repo');
    await fs.mkdir(repoPath, { recursive: true });
    execSync('git init -q', { cwd: repoPath });
    execSync('git config user.email test@test.com', { cwd: repoPath });
    execSync('git config user.name test', { cwd: repoPath });
    await fs.writeFile(join(repoPath, 'README.md'), 'init');
    execSync('git add . && git commit -q -m init', { cwd: repoPath });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns true on clean tree', () => {
    expect(isWorktreeClean(repoPath)).toBe(true);
  });

  it('returns false when untracked file exists', async () => {
    await fs.writeFile(join(repoPath, 'leftover.txt'), 'hi');
    expect(isWorktreeClean(repoPath)).toBe(false);
  });

  it('returns false when tracked file modified', async () => {
    await fs.writeFile(join(repoPath, 'README.md'), 'changed');
    expect(isWorktreeClean(repoPath)).toBe(false);
  });

  it('returns false when staged but not committed', async () => {
    await fs.writeFile(join(repoPath, 'staged.txt'), 'x');
    execSync('git add staged.txt', { cwd: repoPath });
    expect(isWorktreeClean(repoPath)).toBe(false);
  });

  it('returns false when path does not exist', () => {
    expect(isWorktreeClean(join(tmpDir, 'does-not-exist'))).toBe(false);
  });

  it('returns false when path exists but is not a git repo', async () => {
    const nonRepo = join(tmpDir, 'not-a-repo');
    await fs.mkdir(nonRepo, { recursive: true });
    expect(isWorktreeClean(nonRepo)).toBe(false);
  });
});

// ============================================================================
// seedSpecDirInWorktree — copy + commit, exclude mutable kanban files
// ============================================================================

describe('seedSpecDirInWorktree', () => {
  let fixture: RepoFixture;

  beforeEach(async () => {
    fixture = await mkRepoWithWorktree('my-feature', { specId: 'my-spec' });
  });

  afterEach(async () => {
    await tearDown(fixture);
  });

  it('copies spec dir without kanban.json or kanban-board.md', async () => {
    await seedSpecDirInWorktree(fixture.projectPath, fixture.worktreePath, 'my-spec');

    const wtSpec = join(fixture.worktreePath, 'specwright', 'specs', 'my-spec');
    expect(await fs.readFile(join(wtSpec, 'planning.md'), 'utf-8')).toBe('# Plan');
    expect(await fs.readFile(join(wtSpec, 'stories.md'), 'utf-8')).toBe('# Stories');

    await expect(fs.access(join(wtSpec, 'kanban.json'))).rejects.toThrow();
    await expect(fs.access(join(wtSpec, 'kanban-board.md'))).rejects.toThrow();
  });

  it('commits seed on the worktree branch (chore: seed spec ...)', async () => {
    await seedSpecDirInWorktree(fixture.projectPath, fixture.worktreePath, 'my-spec');

    const log = execSync('git log --pretty=%s', { cwd: fixture.worktreePath, encoding: 'utf-8' }).trim();
    expect(log).toContain('chore: seed spec my-spec into worktree');
  });

  it('leaves worktree clean after seed (root cause of original bug)', async () => {
    await seedSpecDirInWorktree(fixture.projectPath, fixture.worktreePath, 'my-spec');
    expect(isWorktreeClean(fixture.worktreePath)).toBe(true);
  });

  it('is idempotent — second call is a no-op when real dir exists', async () => {
    await seedSpecDirInWorktree(fixture.projectPath, fixture.worktreePath, 'my-spec');
    const firstHead = execSync('git rev-parse HEAD', { cwd: fixture.worktreePath, encoding: 'utf-8' }).trim();

    await seedSpecDirInWorktree(fixture.projectPath, fixture.worktreePath, 'my-spec');
    const secondHead = execSync('git rev-parse HEAD', { cwd: fixture.worktreePath, encoding: 'utf-8' }).trim();
    expect(secondHead).toBe(firstHead);
  });

  it('migrates legacy symlink → real seed', async () => {
    const wtSpecPath = join(fixture.worktreePath, 'specwright', 'specs', 'my-spec');
    await fs.mkdir(join(fixture.worktreePath, 'specwright', 'specs'), { recursive: true });
    const legacyTarget = join(fixture.projectPath, 'specwright', 'specs', 'my-spec');
    await fs.symlink(legacyTarget, wtSpecPath, 'dir');

    await seedSpecDirInWorktree(fixture.projectPath, fixture.worktreePath, 'my-spec');

    const stat = await fs.lstat(wtSpecPath);
    expect(stat.isSymbolicLink()).toBe(false);
    expect(stat.isDirectory()).toBe(true);
    expect(isWorktreeClean(fixture.worktreePath)).toBe(true);
  });

  it('skips when main spec dir does not exist', async () => {
    await expect(
      seedSpecDirInWorktree(fixture.projectPath, fixture.worktreePath, 'non-existent')
    ).resolves.toBeUndefined();
    expect(isWorktreeClean(fixture.worktreePath)).toBe(true);
  });

  it('skips commit when staged diff is empty (re-seed after dir restored from index)', async () => {
    await seedSpecDirInWorktree(fixture.projectPath, fixture.worktreePath, 'my-spec');
    const head1 = execSync('git rev-parse HEAD', { cwd: fixture.worktreePath, encoding: 'utf-8' }).trim();

    // Wipe worktree dir without committing the deletion. Restore from index so
    // the dir exists again with HEAD's content; running seed again must early-return.
    await fs.rm(join(fixture.worktreePath, 'specwright', 'specs', 'my-spec'), { recursive: true, force: true });
    execSync('git checkout -- specwright/specs/my-spec', { cwd: fixture.worktreePath, stdio: 'pipe' });

    await seedSpecDirInWorktree(fixture.projectPath, fixture.worktreePath, 'my-spec');
    const head2 = execSync('git rev-parse HEAD', { cwd: fixture.worktreePath, encoding: 'utf-8' }).trim();
    expect(head2).toBe(head1);
  });

  it('strips mutable files even when worktree spec dir already exists with shadow kanban (v3.27.1 fix)', async () => {
    // Reproduce the v3.27.0 bug class: feature branch has a tracked kanban.json
    // (e.g. from auto-commit-before-worktree). Worktree-add brings it in. Pre-fix
    // seed early-returned and never stripped → MCP-routed updates went to the
    // worktree shadow file instead of main → UI saw stale state.
    const wtSpecDir = join(fixture.worktreePath, 'specwright', 'specs', 'my-spec');
    await fs.mkdir(wtSpecDir, { recursive: true });
    await fs.writeFile(join(wtSpecDir, 'kanban.json'), '{"shadow":true}');
    await fs.writeFile(join(wtSpecDir, 'kanban-board.md'), '# shadow');
    await fs.writeFile(join(wtSpecDir, 'planning.md'), '# Plan from branch');
    execSync('git add specwright && git commit -q -m "spec on branch"', { cwd: fixture.worktreePath });

    await seedSpecDirInWorktree(fixture.projectPath, fixture.worktreePath, 'my-spec');

    // Mutable files removed; non-mutable preserved.
    await expect(fs.access(join(wtSpecDir, 'kanban.json'))).rejects.toThrow();
    await expect(fs.access(join(wtSpecDir, 'kanban-board.md'))).rejects.toThrow();
    expect(await fs.readFile(join(wtSpecDir, 'planning.md'), 'utf-8')).toBe('# Plan from branch');

    // Strip is committed (so subsequent isWorktreeClean gates pass).
    expect(isWorktreeClean(fixture.worktreePath)).toBe(true);
    const log = execSync('git log --pretty=%s', { cwd: fixture.worktreePath, encoding: 'utf-8' }).trim();
    expect(log).toContain('chore: seed spec my-spec into worktree');
  });
});

// ============================================================================
// seedBacklogDirInWorktree — copy + commit, exclude backlog-index.json
// ============================================================================

describe('seedBacklogDirInWorktree', () => {
  let fixture: RepoFixture;

  beforeEach(async () => {
    fixture = await mkRepoWithWorktree('bug-001', { withBacklog: true });
    // Backlog lives in main only (created after worktree); add a non-index file
    // so the seed has substantive content to copy + commit.
    await fs.writeFile(join(fixture.projectPath, 'specwright', 'backlog', 'archive.md'), '# archive');
  });

  afterEach(async () => {
    await tearDown(fixture);
  });

  it('copies backlog without backlog-index.json', async () => {
    await seedBacklogDirInWorktree(fixture.projectPath, fixture.worktreePath);

    const wtBacklog = join(fixture.worktreePath, 'specwright', 'backlog');
    expect(await fs.readFile(join(wtBacklog, 'archive.md'), 'utf-8')).toBe('# archive');
    await expect(fs.access(join(wtBacklog, 'backlog-index.json'))).rejects.toThrow();
  });

  it('leaves worktree clean after seed', async () => {
    await seedBacklogDirInWorktree(fixture.projectPath, fixture.worktreePath);
    expect(isWorktreeClean(fixture.worktreePath)).toBe(true);
  });

  it('skips when main backlog dir does not exist', async () => {
    await fs.rm(join(fixture.projectPath, 'specwright', 'backlog'), { recursive: true, force: true });

    await expect(
      seedBacklogDirInWorktree(fixture.projectPath, fixture.worktreePath)
    ).resolves.toBeUndefined();
  });

  it('strips backlog-index.json even when worktree backlog dir already exists (v3.27.1 fix)', async () => {
    const wtBacklogDir = join(fixture.worktreePath, 'specwright', 'backlog');
    await fs.mkdir(wtBacklogDir, { recursive: true });
    await fs.writeFile(join(wtBacklogDir, 'backlog-index.json'), '{"shadow":true}');
    await fs.writeFile(join(wtBacklogDir, 'archive.md'), '# from branch');
    execSync('git add specwright && git commit -q -m "backlog on branch"', { cwd: fixture.worktreePath });

    await seedBacklogDirInWorktree(fixture.projectPath, fixture.worktreePath);

    await expect(fs.access(join(wtBacklogDir, 'backlog-index.json'))).rejects.toThrow();
    expect(await fs.readFile(join(wtBacklogDir, 'archive.md'), 'utf-8')).toBe('# from branch');
    expect(isWorktreeClean(fixture.worktreePath)).toBe(true);
  });
});

// ============================================================================
// commitMainKanbanIfDirty — main-side commit pathway for mutable kanban.json
// ============================================================================

describe('commitMainKanbanIfDirty', () => {
  let tmpDir: string;
  let projectPath: string;

  async function initRepo(): Promise<void> {
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'commit-kanban-'));
    projectPath = join(tmpDir, 'myproject');
    await fs.mkdir(join(projectPath, 'specwright', 'specs', 'my-spec'), { recursive: true });

    execSync('git init -q -b main', { cwd: projectPath });
    execSync('git config user.email test@test.com', { cwd: projectPath });
    execSync('git config user.name test', { cwd: projectPath });
    await fs.writeFile(join(projectPath, 'README.md'), 'init');
    await fs.writeFile(
      join(projectPath, 'specwright', 'specs', 'my-spec', 'kanban.json'),
      '{"version":"2.0","tasks":[]}'
    );
    execSync('git add . && git commit -q -m init', { cwd: projectPath });
  }

  beforeEach(async () => {
    await initRepo();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns true and creates a commit when kanban.json is modified', async () => {
    await fs.writeFile(
      join(projectPath, 'specwright', 'specs', 'my-spec', 'kanban.json'),
      '{"version":"2.0","tasks":[{"id":"T1"}]}'
    );

    const headBefore = execSync('git rev-parse HEAD', { cwd: projectPath, encoding: 'utf-8' }).trim();
    const result = await commitMainKanbanIfDirty(projectPath, 'my-spec', 'chore: [T1] kanban sync');
    const headAfter = execSync('git rev-parse HEAD', { cwd: projectPath, encoding: 'utf-8' }).trim();

    expect(result).toBe(true);
    expect(headAfter).not.toBe(headBefore);
    const lastMsg = execSync('git log -1 --pretty=%s', { cwd: projectPath, encoding: 'utf-8' }).trim();
    expect(lastMsg).toBe('chore: [T1] kanban sync');
  });

  it('returns false and creates no commit when kanban.json is clean', async () => {
    const headBefore = execSync('git rev-parse HEAD', { cwd: projectPath, encoding: 'utf-8' }).trim();
    const result = await commitMainKanbanIfDirty(projectPath, 'my-spec', 'chore: kanban sync');
    const headAfter = execSync('git rev-parse HEAD', { cwd: projectPath, encoding: 'utf-8' }).trim();

    expect(result).toBe(false);
    expect(headAfter).toBe(headBefore);
  });

  it('returns false without throwing when kanban.json does not exist', async () => {
    await fs.rm(join(projectPath, 'specwright', 'specs', 'my-spec', 'kanban.json'));
    execSync('git add . && git commit -q -m "remove kanban"', { cwd: projectPath });

    const headBefore = execSync('git rev-parse HEAD', { cwd: projectPath, encoding: 'utf-8' }).trim();
    const result = await commitMainKanbanIfDirty(projectPath, 'my-spec', 'chore: kanban sync');
    const headAfter = execSync('git rev-parse HEAD', { cwd: projectPath, encoding: 'utf-8' }).trim();

    expect(result).toBe(false);
    expect(headAfter).toBe(headBefore);
  });

  it('returns false without throwing when path is not a git repo', async () => {
    const nonRepo = join(tmpDir, 'not-a-repo');
    await fs.mkdir(join(nonRepo, 'specwright', 'specs', 'my-spec'), { recursive: true });
    await fs.writeFile(join(nonRepo, 'specwright', 'specs', 'my-spec', 'kanban.json'), '{}');

    expect(await commitMainKanbanIfDirty(nonRepo, 'my-spec', 'chore: kanban sync')).toBe(false);
  });

  it('only commits kanban.json — leaves other dirty files unstaged', async () => {
    await fs.writeFile(
      join(projectPath, 'specwright', 'specs', 'my-spec', 'kanban.json'),
      '{"version":"2.0","tasks":[{"id":"T1"}]}'
    );
    await fs.writeFile(join(projectPath, 'README.md'), 'modified');

    const result = await commitMainKanbanIfDirty(projectPath, 'my-spec', 'chore: kanban only');
    expect(result).toBe(true);

    const status = execSync('git status --porcelain', { cwd: projectPath, encoding: 'utf-8' });
    expect(status).toContain('README.md');
    expect(status).not.toContain('kanban.json');
  });
});

// ============================================================================
// purgeShadowSpecMutables — drift defense for tracked-or-on-disk mutables
// ============================================================================

describe('purgeShadowSpecMutables', () => {
  let fixture: RepoFixture;

  beforeEach(async () => {
    fixture = await mkRepoWithWorktree('shadow-purge', { specId: 'shadow-spec' });
    await seedSpecDirInWorktree(fixture.projectPath, fixture.worktreePath, 'shadow-spec');
  });

  afterEach(async () => {
    await tearDown(fixture);
  });

  it('returns false when no mutables are present (idempotent)', () => {
    const result = purgeShadowSpecMutables(fixture.worktreePath, 'shadow-spec');
    expect(result).toBe(false);
    expect(isWorktreeClean(fixture.worktreePath)).toBe(true);
  });

  it('removes shadow kanban.json that was committed to worktree (restore-commit drift)', async () => {
    // Reproduce the bug: someone re-introduces kanban.json into the worktree
    // branch via a manual commit (e.g. `git restore` from base branch + commit).
    const wtSpecDir = join(fixture.worktreePath, 'specwright', 'specs', 'shadow-spec');
    await fs.writeFile(join(wtSpecDir, 'kanban.json'), '{"shadow":true}');
    execSync('git add . && git commit -q -m "restore: kanban.json"', { cwd: fixture.worktreePath });

    const result = purgeShadowSpecMutables(fixture.worktreePath, 'shadow-spec');
    expect(result).toBe(true);
    await expect(fs.access(join(wtSpecDir, 'kanban.json'))).rejects.toThrow();
    expect(isWorktreeClean(fixture.worktreePath)).toBe(true);

    const log = execSync('git log --pretty=%s', { cwd: fixture.worktreePath, encoding: 'utf-8' });
    expect(log).toContain('chore: drop shadow kanban.json');
  });

  it('removes both kanban.json and kanban-board.md when both are tracked', async () => {
    const wtSpecDir = join(fixture.worktreePath, 'specwright', 'specs', 'shadow-spec');
    await fs.writeFile(join(wtSpecDir, 'kanban.json'), '{}');
    await fs.writeFile(join(wtSpecDir, 'kanban-board.md'), '# shadow board');
    execSync('git add . && git commit -q -m "restore: both shadows"', { cwd: fixture.worktreePath });

    const result = purgeShadowSpecMutables(fixture.worktreePath, 'shadow-spec');
    expect(result).toBe(true);

    const log = execSync('git log -1 --pretty=%s', { cwd: fixture.worktreePath, encoding: 'utf-8' }).trim();
    expect(log).toContain('kanban.json');
    expect(log).toContain('kanban-board.md');
    expect(isWorktreeClean(fixture.worktreePath)).toBe(true);
  });

  it('removes untracked kanban.json from disk but does not commit (no staged diff)', async () => {
    // Edge case: file present on filesystem (e.g. orphaned write from LLM)
    // but not yet committed. fs.rm removes it; git rm --cached is a no-op
    // (file isn't in the index) → no staged diff → no commit.
    const wtSpecDir = join(fixture.worktreePath, 'specwright', 'specs', 'shadow-spec');
    await fs.writeFile(join(wtSpecDir, 'kanban.json'), '{"orphan":true}');

    const result = purgeShadowSpecMutables(fixture.worktreePath, 'shadow-spec');
    expect(result).toBe(false);
    await expect(fs.access(join(wtSpecDir, 'kanban.json'))).rejects.toThrow();
  });

  it('returns false when worktree path does not exist', () => {
    expect(purgeShadowSpecMutables('/tmp/does-not-exist-worktree', 'shadow-spec')).toBe(false);
  });

  it('does not throw when path is not a git repo', async () => {
    const nonRepo = join(fixture.base, 'not-a-repo');
    await fs.mkdir(join(nonRepo, 'specwright', 'specs', 'shadow-spec'), { recursive: true });
    await fs.writeFile(join(nonRepo, 'specwright', 'specs', 'shadow-spec', 'kanban.json'), '{}');

    expect(() => purgeShadowSpecMutables(nonRepo, 'shadow-spec')).not.toThrow();
  });
});

// ============================================================================
// seedSpecDirInWorktree — drift catch via git rm -f --ignore-unmatch (v3.27.3)
// ============================================================================

describe('seedSpecDirInWorktree (v3.27.3 strip via git rm)', () => {
  let fixture: RepoFixture;

  beforeEach(async () => {
    fixture = await mkRepoWithWorktree('strip-via-git-rm', { specId: 'restore-spec' });
  });

  afterEach(async () => {
    await tearDown(fixture);
  });

  it('catches restore-commit drift on second seed run', async () => {
    // Simulate the production bug: first seed runs cleanly, then a "restore"
    // commit re-introduces kanban.json, then user re-triggers auto-mode and
    // expects seed to clean it up again.
    await seedSpecDirInWorktree(fixture.projectPath, fixture.worktreePath, 'restore-spec');

    const wtSpecDir = join(fixture.worktreePath, 'specwright', 'specs', 'restore-spec');
    await fs.writeFile(join(wtSpecDir, 'kanban.json'), '{"v1":"shadow"}');
    execSync('git add . && git commit -q -m "chore: restore kanban.json"', { cwd: fixture.worktreePath });

    // Second seed run should strip the restored kanban.json + commit.
    await seedSpecDirInWorktree(fixture.projectPath, fixture.worktreePath, 'restore-spec');

    await expect(fs.access(join(wtSpecDir, 'kanban.json'))).rejects.toThrow();
    expect(isWorktreeClean(fixture.worktreePath)).toBe(true);

    const log = execSync('git log --pretty=%s', { cwd: fixture.worktreePath, encoding: 'utf-8' });
    expect(log).toContain('chore: seed spec restore-spec into worktree');
  });

  it('handles tracked-but-missing kanban.json (file deleted but not committed)', async () => {
    await seedSpecDirInWorktree(fixture.projectPath, fixture.worktreePath, 'restore-spec');

    // Manually re-introduce + commit kanban.json
    const wtSpecDir = join(fixture.worktreePath, 'specwright', 'specs', 'restore-spec');
    await fs.writeFile(join(wtSpecDir, 'kanban.json'), '{}');
    execSync('git add . && git commit -q -m "restore"', { cwd: fixture.worktreePath });

    // Then delete from disk (mimics partial cleanup) without committing
    await fs.rm(join(wtSpecDir, 'kanban.json'));

    // Seed should still strip the index entry + commit cleanly
    await seedSpecDirInWorktree(fixture.projectPath, fixture.worktreePath, 'restore-spec');

    expect(isWorktreeClean(fixture.worktreePath)).toBe(true);
    // ls-files should not list kanban.json anymore
    const tracked = execSync('git ls-files specwright/', { cwd: fixture.worktreePath, encoding: 'utf-8' });
    expect(tracked).not.toContain('kanban.json');
  });
});

// ============================================================================
// commitMainKanbanIfDirty — concurrent callers, BPAM-003 dual-lock regression
// ============================================================================

describe('commitMainKanbanIfDirty (concurrent / BPAM-003 dual-lock)', () => {
  let tmpDir: string;
  let projectPath: string;

  async function initConcurrentRepo(): Promise<void> {
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'commit-concurrent-'));
    projectPath = join(tmpDir, 'myproject');
    await fs.mkdir(join(projectPath, 'specwright', 'specs', 'my-spec'), { recursive: true });

    execSync('git init -q -b main', { cwd: projectPath });
    execSync('git config user.email test@test.com', { cwd: projectPath });
    execSync('git config user.name test', { cwd: projectPath });
    await fs.writeFile(join(projectPath, 'README.md'), 'init');
    await fs.writeFile(
      join(projectPath, 'specwright', 'specs', 'my-spec', 'kanban.json'),
      '{"version":"2.0","tasks":[]}'
    );
    execSync('git add . && git commit -q -m init', { cwd: projectPath });
  }

  beforeEach(async () => { await initConcurrentRepo(); });
  afterEach(async () => { await fs.rm(tmpDir, { recursive: true, force: true }); });

  it('two concurrent callers: first commits, second returns false (no duplicate commit)', async () => {
    // Regression: pre-BPAM-003 the function was synchronous and callers could
    // race on `git add` → `git commit`, causing index.lock contention.
    // Post-BPAM-003 withMainProjectLock + withKanbanLock serializes them.
    const kanbanPath = join(projectPath, 'specwright', 'specs', 'my-spec', 'kanban.json');
    await fs.writeFile(kanbanPath, '{"version":"2.0","tasks":[{"id":"X1"}]}');

    const headBefore = execSync('git rev-parse HEAD', { cwd: projectPath, encoding: 'utf-8' }).trim();

    const [r1, r2] = await Promise.all([
      commitMainKanbanIfDirty(projectPath, 'my-spec', 'chore: [X1] A'),
      commitMainKanbanIfDirty(projectPath, 'my-spec', 'chore: [X1] B'),
    ]);

    // Mutex ensures exactly one commits; the other sees a clean index
    expect(r1 || r2).toBe(true);
    expect(r1 && r2).toBe(false);

    const headAfter = execSync('git rev-parse HEAD', { cwd: projectPath, encoding: 'utf-8' }).trim();
    expect(headAfter).not.toBe(headBefore);

    const commitCount = execSync('git rev-list --count HEAD', { cwd: projectPath, encoding: 'utf-8' }).trim();
    expect(Number(commitCount)).toBe(2); // init + one sync commit

    // Main working tree is clean after both calls complete
    const status = execSync('git status --porcelain', { cwd: projectPath, encoding: 'utf-8' });
    expect(status.trim()).toBe('');
  });

  it('three concurrent callers all resolve without throwing', async () => {
    const kanbanPath = join(projectPath, 'specwright', 'specs', 'my-spec', 'kanban.json');
    await fs.writeFile(kanbanPath, '{"version":"2.0","tasks":[{"id":"Y1"}]}');

    const results = await Promise.all([
      commitMainKanbanIfDirty(projectPath, 'my-spec', 'chore: [Y1] A'),
      commitMainKanbanIfDirty(projectPath, 'my-spec', 'chore: [Y1] B'),
      commitMainKanbanIfDirty(projectPath, 'my-spec', 'chore: [Y1] C'),
    ]);

    expect(results).toHaveLength(3);
    expect(results.filter(Boolean)).toHaveLength(1); // exactly one commit produced
  });
});

// ============================================================================
// MUTABLE constants — exported as single source of truth (v3.27.1)
// ============================================================================

describe('MUTABLE_SPEC_FILES + MUTABLE_BACKLOG_FILES exports', () => {
  it('MUTABLE_SPEC_FILES contains kanban.json and kanban-board.md', () => {
    expect([...MUTABLE_SPEC_FILES]).toEqual(['kanban.json', 'kanban-board.md']);
  });

  it('MUTABLE_BACKLOG_FILES contains backlog-index.json', () => {
    expect([...MUTABLE_BACKLOG_FILES]).toEqual(['backlog-index.json']);
  });
});

// ============================================================================
// copyMcpConfigToWorktree — file copy (not symlink), idempotent migration
// ============================================================================

describe('copyMcpConfigToWorktree', () => {
  let fixture: RepoFixture;

  beforeEach(async () => {
    fixture = await mkRepoWithWorktree('mcp-test');
  });

  afterEach(async () => {
    await tearDown(fixture);
  });

  it('prefers .mcp.json at project root (Claude Code convention, v3.27.6)', async () => {
    // Project root .mcp.json (with kanban) and parent dir .mcp.json (without).
    // The project-root one must win — pre-v3.27.6 used parent and silently
    // missed the kanban MCP server, breaking MCP routing in worktrees.
    await fs.writeFile(join(fixture.projectPath, '.mcp.json'), '{"mcpServers":{"kanban":{}}}');
    await fs.writeFile(join(fixture.base, '.mcp.json'), '{"mcpServers":{"trello":{}}}');

    await copyMcpConfigToWorktree(fixture.projectPath, fixture.worktreePath);

    const dst = join(fixture.worktreePath, '.mcp.json');
    expect(await fs.readFile(dst, 'utf-8')).toBe('{"mcpServers":{"kanban":{}}}');
  });

  it('falls back to parent dir .mcp.json when project root has none (legacy setup)', async () => {
    await fs.writeFile(join(fixture.base, '.mcp.json'), '{"mcpServers":{"legacy":{}}}');

    await copyMcpConfigToWorktree(fixture.projectPath, fixture.worktreePath);

    const dst = join(fixture.worktreePath, '.mcp.json');
    expect(await fs.readFile(dst, 'utf-8')).toBe('{"mcpServers":{"legacy":{}}}');
  });

  it('copies .mcp.json into worktree root as a regular file (not symlink)', async () => {
    await fs.writeFile(join(fixture.projectPath, '.mcp.json'), '{"mcpServers":{}}');

    await copyMcpConfigToWorktree(fixture.projectPath, fixture.worktreePath);

    const dst = join(fixture.worktreePath, '.mcp.json');
    const stat = await fs.lstat(dst);
    expect(stat.isSymbolicLink()).toBe(false);
    expect(stat.isFile()).toBe(true);
  });

  it('replaces a stale legacy symlink with a file copy', async () => {
    await fs.writeFile(join(fixture.projectPath, '.mcp.json'), '{"mcpServers":{}}');
    const dst = join(fixture.worktreePath, '.mcp.json');
    await fs.symlink(join(fixture.projectPath, '.mcp.json'), dst);
    expect((await fs.lstat(dst)).isSymbolicLink()).toBe(true);

    await copyMcpConfigToWorktree(fixture.projectPath, fixture.worktreePath);

    const stat = await fs.lstat(dst);
    expect(stat.isSymbolicLink()).toBe(false);
    expect(stat.isFile()).toBe(true);
  });

  it('overwrites stale .mcp.json copy (drift fix, v3.27.6)', async () => {
    // Pre-v3.27.6 was idempotent and skipped overwriting — so an old copy
    // missing newly-added MCP servers (e.g. kanban) would silently persist.
    const dst = join(fixture.worktreePath, '.mcp.json');
    await fs.writeFile(dst, '{"mcpServers":{"old":{}}}');

    await fs.writeFile(join(fixture.projectPath, '.mcp.json'), '{"mcpServers":{"new":{}}}');
    await copyMcpConfigToWorktree(fixture.projectPath, fixture.worktreePath);

    expect(await fs.readFile(dst, 'utf-8')).toBe('{"mcpServers":{"new":{}}}');
  });

  it('skips when no .mcp.json exists in project root or parent dir', async () => {
    await expect(
      copyMcpConfigToWorktree(fixture.projectPath, fixture.worktreePath)
    ).resolves.toBeUndefined();
    await expect(fs.access(join(fixture.worktreePath, '.mcp.json'))).rejects.toThrow();
  });
});
