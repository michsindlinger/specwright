/**
 * Pure path helpers and seed setup for per-story sub-worktrees.
 * Used by WorkflowExecutor helpers: createStoryWorktree, setupBacklogSymlink.
 */

import { join, basename, dirname } from 'path';
import { execSync } from 'child_process';
import { existsSync, lstatSync, cpSync } from 'fs';
import { mkdir, rm, copyFile } from 'fs/promises';
import { resolveProjectDir, projectDir } from './project-dirs.js';

// ── Cleanliness check ────────────────────────────────────────────────────────

/**
 * Returns true when `git status --porcelain` is empty in the given worktree —
 * no staged, unstaged, or untracked changes. Used as a gate before
 * worktree-remove and before merging into a parent branch so Claude-generated
 * leftovers are surfaced as incidents instead of silently force-removed.
 *
 * On git failure (not a repo, missing path) returns `false` defensively so the
 * caller treats the worktree as "needs attention" rather than risking removal.
 */
export function isWorktreeClean(worktreePath: string): boolean {
  if (!existsSync(worktreePath)) return false;
  try {
    const out = execSync('git status --porcelain', {
      cwd: worktreePath,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return out.trim().length === 0;
  } catch {
    return false;
  }
}

// ── Path calculation (pure, no I/O) ──────────────────────────────────────────

/** Sub-worktree path for a spec story: `${proj}-worktrees/${feature}-${storyId}` */
export function storyWorktreePath(projectPath: string, specId: string, storyId: string): string {
  const projDirName = basename(projectPath);
  const featureName = specId.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  const worktreeBase = join(dirname(projectPath), `${projDirName}-worktrees`);
  return join(worktreeBase, `${featureName}-${storyId}`);
}

/** Branch name for a spec story: `feature/${feature}/${storyId}` */
export function storyBranchName(specId: string, storyId: string): string {
  const featureName = specId.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  return `feature/${featureName}/${storyId}`;
}

/** Sub-worktree path for a backlog item: `${proj}-worktrees/backlog-${slug}` */
export function backlogWorktreePath(projectPath: string, itemId: string): string {
  const projDirName = basename(projectPath);
  const slug = itemId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const worktreeBase = join(dirname(projectPath), `${projDirName}-worktrees`);
  return join(worktreeBase, `backlog-${slug}`);
}

/** Branch name for a backlog item: `feature/${slug}` (matches startBacklogStoryExecution). */
export function backlogBranchName(itemId: string): string {
  const slug = itemId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return `feature/${slug}`;
}

// ── Seed setup ───────────────────────────────────────────────────────────────

/**
 * Mutable kanban files routed to main via SPECWRIGHT_MAIN_PROJECT_PATH env var
 * (kanban-mcp-server.ts) — never copy them into the worktree, they would
 * shadow the canonical state and produce merge conflicts on multi-story specs.
 */
const MUTABLE_SPEC_FILES = ['kanban.json', 'kanban-board.md'] as const;
const MUTABLE_BACKLOG_FILES = ['backlog-index.json'] as const;

/**
 * Copy spec dir from main into worktree (excluding mutable kanban files which
 * stay in main and are written via MCP env-var routing). Commits the seed on
 * the worktree's current branch as `chore:` so downstream `isWorktreeClean()`
 * gates pass. Idempotent: skips if a non-symlink dir already exists in worktree
 * (committed seed from a previous run); migrates away from any pre-existing
 * symlink (legacy from versions ≤ 3.26.0).
 *
 * On commit failure: removes the copied dir so the worktree doesn't get left
 * in a dirty state.
 */
export async function seedSpecDirInWorktree(
  projectPath: string,
  worktreePath: string,
  specId: string
): Promise<void> {
  const projDirName = resolveProjectDir(projectPath);
  const mainSpecPath = projectDir(projectPath, 'specs', specId);
  const worktreeSpecPath = projectDir(worktreePath, 'specs', specId);

  if (!existsSync(mainSpecPath)) return;

  if (existsSync(worktreeSpecPath)) {
    if (lstatSync(worktreeSpecPath).isSymbolicLink()) {
      // Legacy symlink → remove and re-seed
      await rm(worktreeSpecPath, { force: true });
    } else {
      // Real dir already present (committed seed from earlier run) → done
      return;
    }
  }

  await mkdir(dirname(worktreeSpecPath), { recursive: true });
  cpSync(mainSpecPath, worktreeSpecPath, { recursive: true });
  for (const f of MUTABLE_SPEC_FILES) {
    const p = join(worktreeSpecPath, f);
    if (existsSync(p)) await rm(p, { force: true });
  }

  await commitSeedOrRollback(
    worktreePath,
    worktreeSpecPath,
    join(projDirName, 'specs', specId),
    `chore: seed spec ${specId} into worktree`
  );
}

/**
 * Copy backlog dir from main into worktree (excluding `backlog-index.json` which
 * stays in main via MCP env-var routing). Same idempotent + migration behaviour
 * as `seedSpecDirInWorktree`.
 */
export async function seedBacklogDirInWorktree(
  projectPath: string,
  worktreePath: string
): Promise<void> {
  const projDirName = resolveProjectDir(projectPath);
  const mainBacklogPath = projectDir(projectPath, 'backlog');
  const worktreeBacklogPath = projectDir(worktreePath, 'backlog');

  if (!existsSync(mainBacklogPath)) return;

  if (existsSync(worktreeBacklogPath)) {
    if (lstatSync(worktreeBacklogPath).isSymbolicLink()) {
      await rm(worktreeBacklogPath, { force: true });
    } else {
      return;
    }
  }

  await mkdir(dirname(worktreeBacklogPath), { recursive: true });
  cpSync(mainBacklogPath, worktreeBacklogPath, { recursive: true });
  for (const f of MUTABLE_BACKLOG_FILES) {
    const p = join(worktreeBacklogPath, f);
    if (existsSync(p)) await rm(p, { force: true });
  }

  await commitSeedOrRollback(
    worktreePath,
    worktreeBacklogPath,
    join(projDirName, 'backlog'),
    'chore: seed backlog into worktree'
  );
}

/**
 * Copy `.mcp.json` (lives one level above the project root) into the worktree
 * root so Claude in the worktree can discover the MCP server. Not committed —
 * `.mcp.json` is repo-local config, not part of the feature branch. Replaces a
 * stale legacy symlink if present.
 */
export async function copyMcpConfigToWorktree(
  projectPath: string,
  worktreePath: string
): Promise<void> {
  const src = join(dirname(projectPath), '.mcp.json');
  const dst = join(worktreePath, '.mcp.json');
  if (!existsSync(src)) return;
  if (existsSync(dst)) {
    if (lstatSync(dst).isSymbolicLink()) {
      await rm(dst, { force: true });
    } else {
      return; // already a real file copy
    }
  }
  await copyFile(src, dst);
}

// ── Internal ─────────────────────────────────────────────────────────────────

async function commitSeedOrRollback(
  worktreePath: string,
  copiedPath: string,
  pathspec: string,
  commitMessage: string
): Promise<void> {
  try {
    execSync(`git add "${pathspec}"`, { cwd: worktreePath, stdio: 'pipe' });
    // Empty-diff guard: branch already contains identical content → no commit needed.
    try {
      execSync('git diff --cached --quiet', { cwd: worktreePath, stdio: 'pipe' });
      return; // exit 0 = no diff staged → tree is clean
    } catch {
      // exit 1 = diff present → fall through to commit
    }
    execSync(`git commit -m "${commitMessage}"`, { cwd: worktreePath, stdio: 'pipe' });
  } catch (err) {
    await rm(copiedPath, { recursive: true, force: true });
    throw err;
  }
}
