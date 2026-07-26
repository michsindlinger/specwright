/**
 * Unit tests for the git worktree enumeration used by the Cloud Terminal
 * session-target picker.
 *
 * The porcelain parser and the path helpers are pure and get the bulk of the
 * coverage; `listRepoWorktrees` is exercised against a real git repo to prove
 * the non-repo path resolves instead of throwing.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  parseWorktreePorcelain,
  parseWorktreeGitdirPointer,
  pickCreatedAtMs,
  pathKey,
  isPathInside,
  listRepoWorktrees,
  listWorktreeCreationTimes,
} from '../../src/server/utils/git-worktree-list.js';

const tempDirs: string[] = [];

async function mkTemp(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

// ── parseWorktreePorcelain ───────────────────────────────────────────────────

describe('parseWorktreePorcelain', () => {
  it('parses a main-worktree-only repo', () => {
    const out = parseWorktreePorcelain(
      'worktree /repo\nHEAD abc123\nbranch refs/heads/main\n\n'
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      path: '/repo',
      head: 'abc123',
      branch: 'main',
      detached: false,
      bare: false,
      locked: false,
      prunable: false,
    });
  });

  it('parses three records', () => {
    const out = parseWorktreePorcelain(
      [
        'worktree /repo',
        'HEAD aaa',
        'branch refs/heads/main',
        '',
        'worktree /repo-worktrees/one',
        'HEAD bbb',
        'branch refs/heads/feature/one',
        '',
        'worktree /repo-worktrees/two',
        'HEAD ccc',
        'branch refs/heads/session/cloud-1',
        '',
      ].join('\n')
    );
    expect(out.map((e) => e.path)).toEqual([
      '/repo',
      '/repo-worktrees/one',
      '/repo-worktrees/two',
    ]);
    expect(out.map((e) => e.branch)).toEqual(['main', 'feature/one', 'session/cloud-1']);
  });

  it('strips refs/heads/ from branch names', () => {
    const out = parseWorktreePorcelain('worktree /a\nbranch refs/heads/x\n');
    expect(out[0].branch).toBe('x');
  });

  it('marks detached HEAD with a null branch', () => {
    const out = parseWorktreePorcelain('worktree /a\nHEAD deadbeef\ndetached\n');
    expect(out[0].detached).toBe(true);
    expect(out[0].branch).toBeNull();
    expect(out[0].head).toBe('deadbeef');
  });

  it('marks bare repositories', () => {
    const out = parseWorktreePorcelain('worktree /a\nbare\n');
    expect(out[0].bare).toBe(true);
  });

  it('marks locked worktrees, with and without a reason', () => {
    expect(parseWorktreePorcelain('worktree /a\nlocked\n')[0].locked).toBe(true);
    expect(
      parseWorktreePorcelain('worktree /a\nlocked on removable media\n')[0].locked
    ).toBe(true);
  });

  it('marks prunable worktrees', () => {
    const out = parseWorktreePorcelain('worktree /a\nprunable gitdir file points to non-existent location\n');
    expect(out[0].prunable).toBe(true);
  });

  it('tolerates CRLF line endings', () => {
    const out = parseWorktreePorcelain(
      'worktree /repo\r\nHEAD abc\r\nbranch refs/heads/main\r\n\r\n'
    );
    expect(out).toHaveLength(1);
    expect(out[0].branch).toBe('main');
  });

  it('ignores trailing blank lines and unknown attributes', () => {
    const out = parseWorktreePorcelain(
      'worktree /repo\nsomething-new value\nbranch refs/heads/main\n\n\n\n'
    );
    expect(out).toHaveLength(1);
    expect(out[0].branch).toBe('main');
  });

  it('returns an empty array for empty input', () => {
    expect(parseWorktreePorcelain('')).toEqual([]);
    expect(parseWorktreePorcelain('\n\n')).toEqual([]);
  });
});

// ── pathKey ──────────────────────────────────────────────────────────────────

describe('pathKey', () => {
  it('strips trailing separators but keeps the root', () => {
    expect(pathKey('/nonexistent-xyz/foo/')).toBe('/nonexistent-xyz/foo');
    expect(pathKey('/')).toBe('/');
  });

  it('collapses . and .. for non-existent paths', () => {
    expect(pathKey('/nonexistent-xyz/foo/../bar')).toBe('/nonexistent-xyz/bar');
  });

  it('does not throw for a path that does not exist', () => {
    expect(() => pathKey('/definitely/not/here/at/all')).not.toThrow();
  });

  it('yields the same key from both sides of a symlink', async () => {
    const dir = await mkTemp('pathkey-');
    const real = join(dir, 'real');
    const link = join(dir, 'link');
    await fs.mkdir(real);
    await fs.symlink(real, link);
    expect(pathKey(link)).toBe(pathKey(real));
  });
});

// ── isPathInside ─────────────────────────────────────────────────────────────

describe('isPathInside', () => {
  it('treats identical paths as inside', () => {
    expect(isPathInside('/a/b', '/a/b')).toBe(true);
  });

  it('detects strict descendants', () => {
    expect(isPathInside('/a/b', '/a/b/c')).toBe(true);
  });

  it('is segment-aware — /a/bc is not inside /a/b', () => {
    expect(isPathInside('/a/b', '/a/bc')).toBe(false);
  });

  it('rejects ancestors', () => {
    expect(isPathInside('/a/b', '/a')).toBe(false);
  });
});

// ── listRepoWorktrees ────────────────────────────────────────────────────────

describe('listRepoWorktrees', () => {
  it('reports a non-git directory instead of throwing', async () => {
    const dir = await mkTemp('nogit-');
    const info = await listRepoWorktrees(dir);
    expect(info.isGitRepo).toBe(false);
    expect(info.entries).toEqual([]);
    expect(info.mainWorktreePath).toBeNull();
  });

  it('lists the main worktree plus linked worktrees with normalized paths', async () => {
    const base = await mkTemp('wtlist-');
    const projectPath = join(base, 'proj');
    await fs.mkdir(projectPath, { recursive: true });
    execSync('git init -q -b main', { cwd: projectPath });
    execSync('git config user.email t@t.de', { cwd: projectPath });
    execSync('git config user.name t', { cwd: projectPath });
    await fs.writeFile(join(projectPath, 'README.md'), 'x');
    execSync('git add . && git commit -q -m init', { cwd: projectPath });

    const extra = join(base, 'proj-worktrees', 'alpha');
    execSync(`git worktree add -q "${extra}" -b feature/alpha main`, { cwd: projectPath });

    const info = await listRepoWorktrees(projectPath);
    expect(info.isGitRepo).toBe(true);
    expect(info.entries).toHaveLength(2);
    expect(info.mainWorktreePath).toBe(pathKey(projectPath));

    const alpha = info.entries.find((e) => e.branch === 'feature/alpha');
    expect(alpha).toBeDefined();
    expect(alpha?.path).toBe(pathKey(extra));
  });
});

// ── Creation times ───────────────────────────────────────────────────────────

describe('parseWorktreeGitdirPointer', () => {
  it('reads the admin-side pointer and strips the trailing /.git', () => {
    expect(parseWorktreeGitdirPointer('/repo-worktrees/alpha/.git\n')).toBe(
      '/repo-worktrees/alpha'
    );
  });

  it('tolerates the worktree-side "gitdir:" prefix form', () => {
    expect(parseWorktreeGitdirPointer('gitdir: /repo/.git/worktrees/alpha')).toBe(
      '/repo/.git/worktrees/alpha'
    );
  });

  it('returns null for empty content', () => {
    expect(parseWorktreeGitdirPointer('   \n')).toBeNull();
  });
});

describe('pickCreatedAtMs', () => {
  it('takes the smallest positive candidate', () => {
    expect(pickCreatedAtMs([5000, 1000, 9000])).toBe(1000);
  });

  it('ignores 0, null and NaN — birthtime is unsupported on some filesystems', () => {
    expect(pickCreatedAtMs([0, null, undefined, NaN, 4200])).toBe(4200);
  });

  it('returns null when no candidate is usable', () => {
    expect(pickCreatedAtMs([0, null])).toBeNull();
  });
});

describe('listWorktreeCreationTimes', () => {
  it('dates linked worktrees and omits the main worktree', async () => {
    const base = await mkTemp('wtcreated-');
    const projectPath = join(base, 'proj');
    await fs.mkdir(projectPath, { recursive: true });
    execSync('git init -q -b main', { cwd: projectPath });
    execSync('git config user.email t@t.de', { cwd: projectPath });
    execSync('git config user.name t', { cwd: projectPath });
    await fs.writeFile(join(projectPath, 'README.md'), 'x');
    execSync('git add . && git commit -q -m init', { cwd: projectPath });

    const before = Date.now();
    const extra = join(base, 'proj-worktrees', 'alpha');
    execSync(`git worktree add -q "${extra}" -b feature/alpha main`, { cwd: projectPath });

    const times = await listWorktreeCreationTimes(projectPath);
    const created = times.get(pathKey(extra));
    expect(created).toBeDefined();
    // 5s slack: filesystem timestamp granularity, not a timing assertion.
    expect(created as number).toBeGreaterThanOrEqual(before - 5000);
    expect(created as number).toBeLessThanOrEqual(Date.now() + 5000);
    expect(times.has(pathKey(projectPath))).toBe(false);
  });

  it('keeps the date of a worktree whose directory was deleted', async () => {
    const base = await mkTemp('wtgone-');
    const projectPath = join(base, 'proj');
    await fs.mkdir(projectPath, { recursive: true });
    execSync('git init -q -b main', { cwd: projectPath });
    execSync('git config user.email t@t.de', { cwd: projectPath });
    execSync('git config user.name t', { cwd: projectPath });
    await fs.writeFile(join(projectPath, 'README.md'), 'x');
    execSync('git add . && git commit -q -m init', { cwd: projectPath });

    const extra = join(base, 'proj-worktrees', 'gone');
    execSync(`git worktree add -q "${extra}" -b feature/gone main`, { cwd: projectPath });
    await fs.rm(extra, { recursive: true, force: true });

    // Keys are looked up with the path `listRepoWorktrees` reports — for a
    // deleted directory `pathKey` can no longer realpath, so both sides must be
    // derived from git's own record rather than from the raw temp path.
    const info = await listRepoWorktrees(projectPath);
    const gone = info.entries.find((e) => e.branch === 'feature/gone');
    expect(gone).toBeDefined();

    const times = await listWorktreeCreationTimes(projectPath);
    expect(times.get(gone!.path)).toBeGreaterThan(0);
  });

  it('returns an empty map for a non-git directory instead of throwing', async () => {
    const dir = await mkTemp('nogit-created-');
    await expect(listWorktreeCreationTimes(dir)).resolves.toEqual(new Map());
  });
});
