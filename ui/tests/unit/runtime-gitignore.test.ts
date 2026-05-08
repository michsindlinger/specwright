/**
 * Unit tests for `ensureSpecwrightRuntimeGitignored` and the post-migration
 * behavior of `commitMainKanbanIfDirty`. Validates the fix for the spec→main
 * PR-merge modify/delete conflict on `kanban.json` (auto-mode worktree
 * strategy).
 */

import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  ensureSpecwrightRuntimeGitignored,
  commitMainKanbanIfDirty,
} from '../../src/server/utils/worktree-story.js';

interface RepoFixture {
  base: string;
  projectPath: string;
}

async function mkRepo(opts: {
  layout: 'specwright' | 'agent-os';
  withTrackedKanban?: boolean;
  specId?: string;
  withBacklog?: boolean;
  withGitignore?: string;
}): Promise<RepoFixture> {
  const base = await fs.mkdtemp(join(tmpdir(), 'rt-ignore-'));
  const projectPath = join(base, 'myproject');
  await fs.mkdir(projectPath, { recursive: true });
  execSync('git init -q -b main', { cwd: projectPath });
  execSync('git config user.email test@test.com', { cwd: projectPath });
  execSync('git config user.name test', { cwd: projectPath });
  await fs.writeFile(join(projectPath, 'README.md'), 'init');

  const dirName = opts.layout;
  if (opts.withTrackedKanban) {
    const specId = opts.specId ?? '2026-05-08-test';
    const specDir = join(projectPath, dirName, 'specs', specId);
    await fs.mkdir(specDir, { recursive: true });
    await fs.writeFile(join(specDir, 'kanban.json'), '{"version":"2.0"}');
    await fs.writeFile(join(specDir, 'kanban-board.md'), '# Kanban');
    await fs.writeFile(join(specDir, 'spec.md'), '# Spec'); // non-runtime tracked file
  }
  if (opts.withBacklog) {
    const backlogDir = join(projectPath, dirName, 'backlog');
    await fs.mkdir(backlogDir, { recursive: true });
    await fs.writeFile(join(backlogDir, 'backlog-index.json'), '{"items":[]}');
  }
  if (opts.withGitignore !== undefined) {
    await fs.writeFile(join(projectPath, '.gitignore'), opts.withGitignore);
  }

  execSync('git add . && git commit -q -m init', { cwd: projectPath });
  return { base, projectPath };
}

async function tearDown(fixture: RepoFixture): Promise<void> {
  await fs.rm(fixture.base, { recursive: true, force: true });
}

function commitCount(projectPath: string): number {
  return Number(
    execSync('git rev-list --count HEAD', { cwd: projectPath, encoding: 'utf-8' }).trim()
  );
}

function tracked(projectPath: string, relPath: string): boolean {
  try {
    execSync(`git ls-files --error-unmatch -- "${relPath}"`, {
      cwd: projectPath, stdio: 'pipe'
    });
    return true;
  } catch {
    return false;
  }
}

describe('ensureSpecwrightRuntimeGitignored — legacy specwright/ layout', () => {
  it('untracks tracked runtime files, appends managed block, creates one migration commit', async () => {
    const fix = await mkRepo({ layout: 'specwright', withTrackedKanban: true, withBacklog: true });
    try {
      const before = commitCount(fix.projectPath);
      await ensureSpecwrightRuntimeGitignored(fix.projectPath);
      const after = commitCount(fix.projectPath);

      expect(after).toBe(before + 1);
      expect(tracked(fix.projectPath, 'specwright/specs/2026-05-08-test/kanban.json')).toBe(false);
      expect(tracked(fix.projectPath, 'specwright/specs/2026-05-08-test/kanban-board.md')).toBe(false);
      expect(tracked(fix.projectPath, 'specwright/backlog/backlog-index.json')).toBe(false);
      // Non-runtime files remain tracked
      expect(tracked(fix.projectPath, 'specwright/specs/2026-05-08-test/spec.md')).toBe(true);

      const gi = await fs.readFile(join(fix.projectPath, '.gitignore'), 'utf-8');
      expect(gi).toContain('# Specwright: runtime state (MCP-routed, do not commit)');
      expect(gi).toContain('specwright/specs/*/kanban.json');
      expect(gi).toContain('specwright/specs/*/kanban-board.md');
      expect(gi).toContain('specwright/backlog/backlog-index.json');

      // Files still on disk (untracked, not deleted)
      expect(
        await fs.access(join(fix.projectPath, 'specwright/specs/2026-05-08-test/kanban.json'))
          .then(() => true).catch(() => false)
      ).toBe(true);
    } finally { await tearDown(fix); }
  });

  it('is idempotent — second call is a no-op (sentinel detected inside lock)', async () => {
    const fix = await mkRepo({ layout: 'specwright', withTrackedKanban: true });
    try {
      await ensureSpecwrightRuntimeGitignored(fix.projectPath);
      const after1 = commitCount(fix.projectPath);
      await ensureSpecwrightRuntimeGitignored(fix.projectPath);
      const after2 = commitCount(fix.projectPath);
      expect(after2).toBe(after1);
    } finally { await tearDown(fix); }
  });
});

describe('ensureSpecwrightRuntimeGitignored — legacy agent-os/ layout', () => {
  it('resolves projDirName via resolveProjectDir and untracks agent-os runtime files', async () => {
    const fix = await mkRepo({ layout: 'agent-os', withTrackedKanban: true, withBacklog: true });
    try {
      await ensureSpecwrightRuntimeGitignored(fix.projectPath);
      expect(tracked(fix.projectPath, 'agent-os/specs/2026-05-08-test/kanban.json')).toBe(false);
      expect(tracked(fix.projectPath, 'agent-os/backlog/backlog-index.json')).toBe(false);

      const gi = await fs.readFile(join(fix.projectPath, '.gitignore'), 'utf-8');
      expect(gi).toContain('agent-os/specs/*/kanban.json');
      expect(gi).toContain('agent-os/backlog/backlog-index.json');
    } finally { await tearDown(fix); }
  });
});

describe('ensureSpecwrightRuntimeGitignored — fresh project (nothing tracked)', () => {
  it('writes managed block to .gitignore and DOES create a commit (gitignore is a real change)', async () => {
    // Project has the dir but no kanban.json yet — fresh project layout.
    const fix = await mkRepo({ layout: 'specwright' });
    try {
      const before = commitCount(fix.projectPath);
      await ensureSpecwrightRuntimeGitignored(fix.projectPath);
      const after = commitCount(fix.projectPath);

      // Gitignore was written → that IS staged and commitable. Migration commit
      // exists but no runtime files were untracked (they didn't exist).
      expect(after).toBe(before + 1);
      const gi = await fs.readFile(join(fix.projectPath, '.gitignore'), 'utf-8');
      expect(gi).toContain('# Specwright: runtime state');
    } finally { await tearDown(fix); }
  });

  it('skips commit when .gitignore is unchanged AND nothing was untracked (sentinel pre-present)', async () => {
    const sentinelLine = '# Specwright: runtime state (MCP-routed, do not commit)\n';
    const fix = await mkRepo({ layout: 'specwright', withGitignore: sentinelLine });
    try {
      const before = commitCount(fix.projectPath);
      await ensureSpecwrightRuntimeGitignored(fix.projectPath);
      const after = commitCount(fix.projectPath);
      expect(after).toBe(before); // Sentinel detected → early return, no work
    } finally { await tearDown(fix); }
  });
});

describe('ensureSpecwrightRuntimeGitignored — concurrent calls', () => {
  it('produces exactly ONE migration commit when called in parallel', async () => {
    const fix = await mkRepo({ layout: 'specwright', withTrackedKanban: true });
    try {
      const before = commitCount(fix.projectPath);
      await Promise.all([
        ensureSpecwrightRuntimeGitignored(fix.projectPath),
        ensureSpecwrightRuntimeGitignored(fix.projectPath),
        ensureSpecwrightRuntimeGitignored(fix.projectPath),
      ]);
      const after = commitCount(fix.projectPath);
      expect(after).toBe(before + 1);
    } finally { await tearDown(fix); }
  });
});

describe('commitMainKanbanIfDirty — post-migration behavior', () => {
  it('returns false silently and does NOT throw / log when kanban.json is gitignored', async () => {
    const fix = await mkRepo({ layout: 'specwright', withTrackedKanban: true });
    try {
      await ensureSpecwrightRuntimeGitignored(fix.projectPath);

      // Mutate the on-disk kanban.json (simulating MCP write post-migration).
      await fs.writeFile(
        join(fix.projectPath, 'specwright/specs/2026-05-08-test/kanban.json'),
        '{"version":"2.0","mutated":true}'
      );

      const errors: unknown[] = [];
      const origErr = console.error;
      console.error = (...args: unknown[]) => { errors.push(args); };
      try {
        const result = await commitMainKanbanIfDirty(
          fix.projectPath,
          '2026-05-08-test',
          'chore: post-migration test'
        );
        expect(result).toBe(false); // Gitignored → check-ignore gate triggers, returns false
        expect(errors).toEqual([]); // No log spam from failing git add
      } finally {
        console.error = origErr;
      }
    } finally { await tearDown(fix); }
  });

  it('still works on legacy projects where kanban.json is tracked (pre-migration)', async () => {
    const fix = await mkRepo({ layout: 'specwright', withTrackedKanban: true });
    try {
      await fs.writeFile(
        join(fix.projectPath, 'specwright/specs/2026-05-08-test/kanban.json'),
        '{"version":"2.0","mutated":true}'
      );
      const result = await commitMainKanbanIfDirty(
        fix.projectPath,
        '2026-05-08-test',
        'chore: legacy test'
      );
      expect(result).toBe(true);
    } finally { await tearDown(fix); }
  });
});
