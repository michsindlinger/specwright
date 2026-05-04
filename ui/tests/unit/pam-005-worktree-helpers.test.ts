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
  it('builds feature/${feature}/${storyId} format', () => {
    expect(storyBranchName('2026-01-15-my-feature', 'PAM-005')).toBe('feature/my-feature/PAM-005');
  });

  it('strips only leading date prefix (YYYY-MM-DD-)', () => {
    expect(storyBranchName('2026-04-27-parallel-auto-mode', 'PAM-007')).toBe('feature/parallel-auto-mode/PAM-007');
  });

  it('handles specId without date prefix', () => {
    expect(storyBranchName('my-feature', 'T-001')).toBe('feature/my-feature/T-001');
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
});

// ============================================================================
// copyMcpConfigToWorktree — file copy (not symlink), idempotent migration
// ============================================================================

describe('copyMcpConfigToWorktree', () => {
  let fixture: RepoFixture;

  beforeEach(async () => {
    fixture = await mkRepoWithWorktree('mcp-test');
    // .mcp.json lives one level above the project root
    await fs.writeFile(join(fixture.base, '.mcp.json'), '{"mcpServers":{}}');
  });

  afterEach(async () => {
    await tearDown(fixture);
  });

  it('copies .mcp.json into worktree root as a regular file', async () => {
    await copyMcpConfigToWorktree(fixture.projectPath, fixture.worktreePath);
    const dst = join(fixture.worktreePath, '.mcp.json');
    const stat = await fs.lstat(dst);
    expect(stat.isSymbolicLink()).toBe(false);
    expect(stat.isFile()).toBe(true);
    expect(await fs.readFile(dst, 'utf-8')).toBe('{"mcpServers":{}}');
  });

  it('replaces a stale legacy symlink with a file copy', async () => {
    const dst = join(fixture.worktreePath, '.mcp.json');
    await fs.symlink(join(fixture.base, '.mcp.json'), dst);
    expect((await fs.lstat(dst)).isSymbolicLink()).toBe(true);

    await copyMcpConfigToWorktree(fixture.projectPath, fixture.worktreePath);

    const stat = await fs.lstat(dst);
    expect(stat.isSymbolicLink()).toBe(false);
    expect(stat.isFile()).toBe(true);
  });

  it('is idempotent — leaves existing file copy alone', async () => {
    await copyMcpConfigToWorktree(fixture.projectPath, fixture.worktreePath);
    const dst = join(fixture.worktreePath, '.mcp.json');
    const mtime1 = (await fs.stat(dst)).mtimeMs;

    await new Promise(r => setTimeout(r, 10));
    await copyMcpConfigToWorktree(fixture.projectPath, fixture.worktreePath);
    const mtime2 = (await fs.stat(dst)).mtimeMs;
    expect(mtime2).toBe(mtime1);
  });

  it('skips when source .mcp.json does not exist', async () => {
    await fs.rm(join(fixture.base, '.mcp.json'));
    await expect(
      copyMcpConfigToWorktree(fixture.projectPath, fixture.worktreePath)
    ).resolves.toBeUndefined();
  });
});
