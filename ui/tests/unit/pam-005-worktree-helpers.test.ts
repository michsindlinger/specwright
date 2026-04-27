/**
 * Unit tests for PAM-005: per-story worktree path helpers and symlink setup.
 * Tests cover pure path arithmetic, symlink creation, idempotency, and realpath resolution.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs, realpathSync } from 'fs';
import { join, basename } from 'path';
import { tmpdir } from 'os';
import {
  storyWorktreePath,
  storyBranchName,
  backlogWorktreePath,
  setupSpecSymlinkInWorktree,
  setupBacklogSymlinkInWorktree,
} from '../../src/server/utils/worktree-story.js';

// ============================================================================
// Helpers
// ============================================================================

async function mkProject(base: string): Promise<string> {
  const projectPath = join(base, 'myproject');
  await fs.mkdir(join(projectPath, 'specwright', 'specs'), { recursive: true });
  await fs.mkdir(join(projectPath, 'specwright', 'backlog'), { recursive: true });
  return projectPath;
}

async function mkWorktree(base: string, name: string, projectPath: string): Promise<string> {
  const worktreeBase = join(base, `${basename(projectPath)}-worktrees`);
  const wtPath = join(worktreeBase, name);
  await fs.mkdir(join(wtPath, 'specwright', 'specs', 'my-spec'), { recursive: true });
  await fs.mkdir(join(wtPath, 'specwright', 'backlog'), { recursive: true });
  return wtPath;
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

// ============================================================================
// setupSpecSymlinkInWorktree — symlink creation + realpath verification
// ============================================================================

describe('setupSpecSymlinkInWorktree', () => {
  let tmpDir: string;
  let projectPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'pam005-spec-'));
    projectPath = await mkProject(tmpDir);
    // Create main spec dir to symlink to
    await fs.mkdir(join(projectPath, 'specwright', 'specs', 'my-spec'), { recursive: true });
    await fs.writeFile(join(projectPath, 'specwright', 'specs', 'my-spec', 'kanban.json'), '{}');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('creates symlink that resolves to main spec dir via realpath', async () => {
    const wtPath = await mkWorktree(tmpDir, 'my-spec-PAM-005', projectPath);
    await setupSpecSymlinkInWorktree(projectPath, wtPath, 'my-spec');

    const symlinkPath = join(wtPath, 'specwright', 'specs', 'my-spec');
    const resolved = realpathSync(symlinkPath);
    const expected = realpathSync(join(projectPath, 'specwright', 'specs', 'my-spec'));
    expect(resolved).toBe(expected);
  });

  it('file written through symlink is visible in main project', async () => {
    const wtPath = await mkWorktree(tmpDir, 'my-spec-PAM-006', projectPath);
    await setupSpecSymlinkInWorktree(projectPath, wtPath, 'my-spec');

    const symlinkPath = join(wtPath, 'specwright', 'specs', 'my-spec');
    await fs.writeFile(join(symlinkPath, 'test.txt'), 'hello');

    const mainContent = await fs.readFile(
      join(projectPath, 'specwright', 'specs', 'my-spec', 'test.txt'),
      'utf-8'
    );
    expect(mainContent).toBe('hello');
  });

  it('is idempotent — calling twice does not throw', async () => {
    const wtPath = await mkWorktree(tmpDir, 'my-spec-PAM-007', projectPath);
    await setupSpecSymlinkInWorktree(projectPath, wtPath, 'my-spec');
    await expect(setupSpecSymlinkInWorktree(projectPath, wtPath, 'my-spec')).resolves.toBeUndefined();
  });

  it('replaces existing directory with symlink', async () => {
    const wtPath = await mkWorktree(tmpDir, 'my-spec-PAM-008', projectPath);
    // Pre-existing directory (git checkout puts a real dir here)
    const specInWt = join(wtPath, 'specwright', 'specs', 'my-spec');
    // It was created by mkWorktree; verify it's a regular dir, not symlink
    const statsBefore = await fs.lstat(specInWt);
    expect(statsBefore.isSymbolicLink()).toBe(false);

    await setupSpecSymlinkInWorktree(projectPath, wtPath, 'my-spec');

    const statsAfter = await fs.lstat(specInWt);
    expect(statsAfter.isSymbolicLink()).toBe(true);
  });

  it('skips if main spec dir does not exist', async () => {
    const wtPath = await mkWorktree(tmpDir, 'my-spec-PAM-009', projectPath);
    // Should not throw even if spec is missing
    await expect(
      setupSpecSymlinkInWorktree(projectPath, wtPath, 'non-existent-spec')
    ).resolves.toBeUndefined();
  });
});

// ============================================================================
// setupBacklogSymlinkInWorktree — symlink creation + realpath verification
// ============================================================================

describe('setupBacklogSymlinkInWorktree', () => {
  let tmpDir: string;
  let projectPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'pam005-backlog-'));
    projectPath = await mkProject(tmpDir);
    await fs.writeFile(join(projectPath, 'specwright', 'backlog', 'backlog-index.json'), '{}');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('creates symlink that resolves to main backlog dir via realpath', async () => {
    const wtPath = await mkWorktree(tmpDir, 'backlog-bug-001', projectPath);
    await setupBacklogSymlinkInWorktree(projectPath, wtPath);

    const symlinkPath = join(wtPath, 'specwright', 'backlog');
    const resolved = realpathSync(symlinkPath);
    const expected = realpathSync(join(projectPath, 'specwright', 'backlog'));
    expect(resolved).toBe(expected);
  });

  it('file written through symlink is visible in main project', async () => {
    const wtPath = await mkWorktree(tmpDir, 'backlog-todo-001', projectPath);
    await setupBacklogSymlinkInWorktree(projectPath, wtPath);

    const symlinkPath = join(wtPath, 'specwright', 'backlog');
    await fs.writeFile(join(symlinkPath, 'new-item.json'), '{"id":"TODO-001"}');

    const mainContent = await fs.readFile(
      join(projectPath, 'specwright', 'backlog', 'new-item.json'),
      'utf-8'
    );
    expect(mainContent).toBe('{"id":"TODO-001"}');
  });

  it('is idempotent — calling twice does not throw', async () => {
    const wtPath = await mkWorktree(tmpDir, 'backlog-bug-002', projectPath);
    await setupBacklogSymlinkInWorktree(projectPath, wtPath);
    await expect(setupBacklogSymlinkInWorktree(projectPath, wtPath)).resolves.toBeUndefined();
  });

  it('replaces existing directory with symlink', async () => {
    const wtPath = await mkWorktree(tmpDir, 'backlog-bug-003', projectPath);
    const backlogInWt = join(wtPath, 'specwright', 'backlog');

    const statsBefore = await fs.lstat(backlogInWt);
    expect(statsBefore.isSymbolicLink()).toBe(false);

    await setupBacklogSymlinkInWorktree(projectPath, wtPath);

    const statsAfter = await fs.lstat(backlogInWt);
    expect(statsAfter.isSymbolicLink()).toBe(true);
  });

  it('skips if main backlog dir does not exist', async () => {
    const wtPath = await mkWorktree(tmpDir, 'backlog-bug-004', projectPath);
    // Remove main backlog dir
    await fs.rm(join(projectPath, 'specwright', 'backlog'), { recursive: true, force: true });
    await expect(setupBacklogSymlinkInWorktree(projectPath, wtPath)).resolves.toBeUndefined();
  });
});
