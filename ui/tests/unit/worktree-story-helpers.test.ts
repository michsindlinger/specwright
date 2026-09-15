/**
 * Unit tests for the worktree helpers that survived the story-path removal
 * (INT-2026-004, stage 3): `isWorktreeClean` and `copyMcpConfigToWorktree`,
 * both used by the cloud-session worktree. Trimmed from the former
 * pam-005-worktree-helpers.test.ts.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import { join, basename } from 'path';
import { tmpdir } from 'os';
import {
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
async function mkRepoWithWorktree(name: string): Promise<RepoFixture> {
  const base = await fs.mkdtemp(join(tmpdir(), 'wt-helper-'));
  const projectPath = join(base, 'myproject');
  await fs.mkdir(projectPath, { recursive: true });

  execSync('git init -q -b main', { cwd: projectPath });
  execSync('git config user.email test@test.com', { cwd: projectPath });
  execSync('git config user.name test', { cwd: projectPath });
  await fs.writeFile(join(projectPath, 'README.md'), 'init');
  execSync('git add . && git commit -q -m init', { cwd: projectPath });

  const worktreeBase = join(base, `${basename(projectPath)}-worktrees`);
  await fs.mkdir(worktreeBase, { recursive: true });
  const worktreePath = join(worktreeBase, name);
  execSync(`git worktree add -b feature/${name} "${worktreePath}"`, { cwd: projectPath, stdio: 'pipe' });

  return { base, projectPath, worktreePath };
}

async function tearDown(fixture: RepoFixture): Promise<void> {
  try {
    execSync(`git worktree remove --force "${fixture.worktreePath}"`, { cwd: fixture.projectPath, stdio: 'pipe' });
  } catch { /* best-effort */ }
  await fs.rm(fixture.base, { recursive: true, force: true });
}

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

// ============================================================================
// D11 / BPAM-011: createStoryWorktree branches off spec branch tip, not main
// ============================================================================
