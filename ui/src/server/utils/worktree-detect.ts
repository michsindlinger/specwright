import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';

/**
 * Resolves the path of the main working tree if `p` is itself a sub-worktree.
 * Returns `p` unchanged if `p` is not inside a git repo or already a main
 * worktree (or detection fails for any reason).
 *
 * Detection: `git rev-parse --git-common-dir` returns the path to the main
 * worktree's `.git` directory (absolute when called from a sub-worktree,
 * relative `.git` when called from the main worktree). When this path
 * differs from `--git-dir` we are inside a sub-worktree, and the parent of
 * `--git-common-dir` is the main worktree's working directory.
 *
 * Used by the UI server to derive `mainProjectPath` even when the user
 * registered a sub-worktree as a project — keeps `SPECWRIGHT_MAIN_PROJECT_PATH`
 * routing and watcher path aligned with the canonical kanban location.
 */
export function resolveMainWorktreePath(p: string): string {
  if (!existsSync(p)) return p;
  try {
    const gitCommonDir = execSync('git rev-parse --git-common-dir', {
      cwd: p,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf-8',
    }).trim();
    const gitDir = execSync('git rev-parse --git-dir', {
      cwd: p,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf-8',
    }).trim();

    const absCommon = resolve(p, gitCommonDir);
    const absGitDir = resolve(p, gitDir);

    if (absCommon === absGitDir) {
      // Already main worktree (or single-worktree repo).
      return p;
    }

    // Sub-worktree: the main worktree's working dir is the parent of
    // `--git-common-dir`, provided the layout follows the standard
    // `<main>/.git` convention. Bare repos do not have a parent working tree
    // so we leave `p` unchanged in that case.
    if (absCommon.endsWith('/.git')) {
      return dirname(absCommon);
    }

    return p;
  } catch {
    return p;
  }
}
