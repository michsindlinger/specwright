/**
 * Pure path helpers and symlink setup for per-story sub-worktrees.
 * Used by WorkflowExecutor helpers: createStoryWorktree, setupBacklogSymlink.
 */

import { join, basename, dirname } from 'path';
import { existsSync, lstatSync } from 'fs';
import { mkdir, rm, symlink } from 'fs/promises';
import { resolveProjectDir, projectDir } from './project-dirs.js';

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

// ── Symlink setup ─────────────────────────────────────────────────────────────

/**
 * Create (or repair) the spec-folder symlink inside a story sub-worktree so
 * kanban writes go to the main project and are visible to the UI immediately.
 *
 * Symlink lives at:  `${worktreePath}/${projDir}/specs/${specId}`
 * Points relative to its parent dir (4 levels up + main project path):
 *   `../../../../${projDir}/specs/${specId}`
 */
export async function setupSpecSymlinkInWorktree(
  projectPath: string,
  worktreePath: string,
  specId: string
): Promise<void> {
  const projDirName = resolveProjectDir(projectPath);
  const mainSpecPath = projectDir(projectPath, 'specs', specId);
  const worktreeSpecPath = projectDir(worktreePath, 'specs', specId);

  if (!existsSync(mainSpecPath)) return;

  if (existsSync(worktreeSpecPath)) {
    if (lstatSync(worktreeSpecPath).isSymbolicLink()) return;
    await rm(worktreeSpecPath, { recursive: true, force: true });
  }

  // Parent of worktreeSpecPath = `${worktreePath}/${projDir}/specs/`
  // 4 × `..` reaches the parent of worktreeBase, then descend into main project.
  const relativePath = join('..', '..', '..', '..', basename(projectPath), projDirName, 'specs', specId);
  await symlink(relativePath, worktreeSpecPath, 'dir');
}

/**
 * Create (or repair) the backlog-folder symlink inside a backlog sub-worktree.
 *
 * Symlink lives at:  `${worktreePath}/${projDir}/backlog`
 * Points relative to its parent dir (3 levels up + main project path):
 *   `../../../${projDir}/backlog`
 */
export async function setupBacklogSymlinkInWorktree(
  projectPath: string,
  worktreePath: string
): Promise<void> {
  const projDirName = resolveProjectDir(projectPath);
  const mainBacklogPath = projectDir(projectPath, 'backlog');
  const worktreeBacklogPath = projectDir(worktreePath, 'backlog');

  if (!existsSync(mainBacklogPath)) return;

  if (existsSync(worktreeBacklogPath)) {
    if (lstatSync(worktreeBacklogPath).isSymbolicLink()) return;
    await rm(worktreeBacklogPath, { recursive: true, force: true });
  }

  // Ensure parent dir (${worktreePath}/${projDir}/) exists in case worktree is empty
  await mkdir(dirname(worktreeBacklogPath), { recursive: true });

  // Parent of worktreeBacklogPath = `${worktreePath}/${projDir}/`
  // 3 × `..` reaches the parent of worktreeBase, then descend into main project.
  const relativePath = join('..', '..', '..', basename(projectPath), projDirName, 'backlog');
  await symlink(relativePath, worktreeBacklogPath, 'dir');
}
