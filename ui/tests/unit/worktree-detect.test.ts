import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolveMainWorktreePath } from '../../src/server/utils/worktree-detect.js';

interface RepoFixture {
  base: string;
  mainPath: string;
  subWorktreePath: string;
}

async function mkRepoWithSubWorktree(): Promise<RepoFixture> {
  const base = await fs.mkdtemp(join(tmpdir(), 'wt-detect-'));
  const mainPath = join(base, 'myproject');
  await fs.mkdir(mainPath, { recursive: true });

  execSync('git init -q -b main', { cwd: mainPath });
  execSync('git config user.email test@test.com', { cwd: mainPath });
  execSync('git config user.name test', { cwd: mainPath });
  await fs.writeFile(join(mainPath, 'README.md'), 'init');
  execSync('git add . && git commit -q -m init', { cwd: mainPath });

  const subWorktreePath = join(base, 'myproject-worktrees', 'feature-x');
  await fs.mkdir(join(base, 'myproject-worktrees'), { recursive: true });
  execSync(`git worktree add -b feature/x "${subWorktreePath}"`, {
    cwd: mainPath,
    stdio: 'pipe',
  });

  return { base, mainPath, subWorktreePath };
}

async function tearDown(fixture: RepoFixture): Promise<void> {
  try {
    execSync(`git worktree remove --force "${fixture.subWorktreePath}"`, {
      cwd: fixture.mainPath,
      stdio: 'pipe',
    });
  } catch {
    /* best-effort */
  }
  await fs.rm(fixture.base, { recursive: true, force: true });
}

describe('resolveMainWorktreePath', () => {
  it('returns p when path does not exist', () => {
    const ghost = join(tmpdir(), 'definitely-does-not-exist-' + Date.now());
    expect(resolveMainWorktreePath(ghost)).toBe(ghost);
  });

  it('returns p when not inside a git repo', async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), 'wt-detect-no-git-'));
    try {
      expect(resolveMainWorktreePath(dir)).toBe(dir);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('returns p when called from the main worktree', async () => {
    const fixture = await mkRepoWithSubWorktree();
    try {
      expect(resolveMainWorktreePath(fixture.mainPath)).toBe(fixture.mainPath);
    } finally {
      await tearDown(fixture);
    }
  });

  it('returns the main worktree path when called from a sub-worktree', async () => {
    const fixture = await mkRepoWithSubWorktree();
    try {
      const resolved = await fs.realpath(resolveMainWorktreePath(fixture.subWorktreePath));
      const expected = await fs.realpath(fixture.mainPath);
      expect(resolved).toBe(expected);
    } finally {
      await tearDown(fixture);
    }
  });

  it('handles nested sub-worktree paths via real subprocess git', async () => {
    const fixture = await mkRepoWithSubWorktree();
    try {
      const nested = join(fixture.subWorktreePath, 'src');
      await fs.mkdir(nested);
      const resolved = await fs.realpath(resolveMainWorktreePath(nested));
      const expected = await fs.realpath(fixture.mainPath);
      expect(resolved).toBe(expected);
    } finally {
      await tearDown(fixture);
    }
  });
});
