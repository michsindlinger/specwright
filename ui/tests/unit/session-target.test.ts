/**
 * Unit tests for Cloud Terminal session-target parsing and authorization.
 *
 * `parseSessionTarget` is pure. `resolveExistingWorktreeTarget` runs against
 * real git repos, because its whole security argument rests on what
 * `git worktree list` actually reports — mocking that away would test nothing.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  parseSessionTarget,
  resolveExistingWorktreeTarget,
  SessionTargetError,
} from '../../src/server/utils/session-target.js';
import { pathKey } from '../../src/server/utils/git-worktree-list.js';

const tempDirs: string[] = [];

interface RepoFixture {
  base: string;
  projectPath: string;
}

async function mkRepo(prefix = 'target-'): Promise<RepoFixture> {
  const base = await fs.mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(base);
  const projectPath = join(base, 'proj');
  await fs.mkdir(projectPath, { recursive: true });
  execSync('git init -q -b main', { cwd: projectPath });
  execSync('git config user.email t@t.de', { cwd: projectPath });
  execSync('git config user.name t', { cwd: projectPath });
  await fs.writeFile(join(projectPath, 'README.md'), 'init');
  execSync('git add . && git commit -q -m init', { cwd: projectPath });
  return { base, projectPath };
}

function addWorktree(fixture: RepoFixture, name: string, branch: string): string {
  const wt = join(fixture.base, 'proj-worktrees', name);
  execSync(`git worktree add -q "${wt}" -b ${branch} main`, { cwd: fixture.projectPath });
  return wt;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

// ── parseSessionTarget (pure) ────────────────────────────────────────────────

describe('parseSessionTarget', () => {
  it('defaults to new-worktree, marked as NOT explicit', () => {
    expect(parseSessionTarget(undefined)).toEqual({
      target: { kind: 'new-worktree' },
      explicit: false,
    });
    expect(parseSessionTarget(null)).toEqual({
      target: { kind: 'new-worktree' },
      explicit: false,
    });
  });

  it('marks a client-sent new-worktree as explicit', () => {
    expect(parseSessionTarget({ kind: 'new-worktree' })).toEqual({
      target: { kind: 'new-worktree' },
      explicit: true,
    });
  });

  it('passes main through as explicit', () => {
    expect(parseSessionTarget({ kind: 'main' })).toEqual({
      target: { kind: 'main' },
      explicit: true,
    });
  });

  it('accepts an absolute existing-worktree path', () => {
    expect(parseSessionTarget({ kind: 'existing-worktree', path: '/abs/wt' })).toEqual({
      target: { kind: 'existing-worktree', path: '/abs/wt' },
      explicit: true,
    });
  });

  it('rejects existing-worktree without a path', () => {
    expect(() => parseSessionTarget({ kind: 'existing-worktree' })).toThrow(SessionTargetError);
    try {
      parseSessionTarget({ kind: 'existing-worktree' });
    } catch (err) {
      expect((err as SessionTargetError).code).toBe('INVALID_SESSION_TARGET');
    }
  });

  it('rejects a RELATIVE existing-worktree path before any allowlist lookup', () => {
    for (const path of ['../../etc/passwd', 'relative/dir', './x']) {
      try {
        parseSessionTarget({ kind: 'existing-worktree', path });
        throw new Error(`expected rejection for ${path}`);
      } catch (err) {
        expect(err).toBeInstanceOf(SessionTargetError);
        expect((err as SessionTargetError).code).toBe('INVALID_SESSION_TARGET');
      }
    }
  });

  it('rejects an unknown kind', () => {
    expect(() => parseSessionTarget({ kind: 'bogus' })).toThrow(SessionTargetError);
    expect(() => parseSessionTarget({})).toThrow(SessionTargetError);
    expect(() => parseSessionTarget('main')).toThrow(SessionTargetError);
  });
});

// ── resolveExistingWorktreeTarget (real git) ─────────────────────────────────

describe('resolveExistingWorktreeTarget', () => {
  it('accepts a registered worktree and returns the normalized path', async () => {
    const repo = await mkRepo();
    const wt = addWorktree(repo, 'alpha', 'feature/alpha');

    const resolved = await resolveExistingWorktreeTarget(repo.projectPath, wt);
    expect(resolved).toBe(pathKey(wt));
  });

  it('rejects an unrelated absolute path', async () => {
    const repo = await mkRepo();
    await expect(resolveExistingWorktreeTarget(repo.projectPath, '/etc')).rejects.toMatchObject({
      code: 'TARGET_NOT_A_WORKTREE',
    });
  });

  it('rejects a traversal path that escapes the worktree base', async () => {
    const repo = await mkRepo();
    const wt = addWorktree(repo, 'alpha', 'feature/alpha');
    await expect(
      resolveExistingWorktreeTarget(repo.projectPath, join(wt, '..', '..', '..', 'etc'))
    ).rejects.toMatchObject({ code: 'TARGET_NOT_A_WORKTREE' });
  });

  it('rejects a worktree belonging to a DIFFERENT repository', async () => {
    const repoA = await mkRepo('target-a-');
    const repoB = await mkRepo('target-b-');
    const foreign = addWorktree(repoB, 'beta', 'feature/beta');

    await expect(
      resolveExistingWorktreeTarget(repoA.projectPath, foreign)
    ).rejects.toMatchObject({ code: 'TARGET_NOT_A_WORKTREE' });
  });

  it('rejects a registered-but-deleted worktree with TARGET_NOT_FOUND', async () => {
    const repo = await mkRepo();
    const wt = addWorktree(repo, 'alpha', 'feature/alpha');
    const key = pathKey(wt);
    await fs.rm(wt, { recursive: true, force: true });

    await expect(resolveExistingWorktreeTarget(repo.projectPath, key)).rejects.toMatchObject({
      code: 'TARGET_NOT_FOUND',
    });
  });

  it('rejects the main worktree — that is what kind:"main" is for', async () => {
    const repo = await mkRepo();
    await expect(
      resolveExistingWorktreeTarget(repo.projectPath, repo.projectPath)
    ).rejects.toMatchObject({ code: 'INVALID_SESSION_TARGET' });
  });

  it('rejects everything when the project is not a git repository', async () => {
    const base = await fs.mkdtemp(join(tmpdir(), 'target-nogit-'));
    tempDirs.push(base);
    await expect(resolveExistingWorktreeTarget(base, base)).rejects.toMatchObject({
      code: 'TARGET_NOT_A_WORKTREE',
    });
  });
});
