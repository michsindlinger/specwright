/**
 * Pure path helpers and seed setup for per-story sub-worktrees.
 * Used by WorkflowExecutor helpers: createStoryWorktree, setupBacklogSymlink.
 */

import { join, basename, dirname } from 'path';
import { execSync } from 'child_process';
import { existsSync, lstatSync, cpSync, rmSync } from 'fs';
import { mkdir, rm, copyFile } from 'fs/promises';
import { resolveProjectDir, projectDir } from './project-dirs.js';
import { withMainProjectLock } from './main-project-mutex.js';
import { withKanbanLock } from './kanban-lock.js';

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

// ── Main-side commit pathway for mutable kanban files ───────────────────────

/**
 * Commits `specwright/specs/<specId>/kanban.json` in the main repo if it has
 * uncommitted changes. Returns `true` when a new commit was created, `false`
 * when the file was already clean, missing, or git failed.
 *
 * Why this exists: kanban.json is in `MUTABLE_SPEC_FILES` and lives only in
 * the main repo (not in worktrees — see `seedSpecDirInWorktree`). The kanban
 * MCP server writes it on every story start/complete/phase update, but never
 * commits. Workflow markdown can't `git add` it from a worktree CWD because
 * the file isn't there. The orchestrator (`auto-mode-spec-orchestrator.ts`)
 * calls this helper after each successful story-complete event to keep the
 * main working tree clean.
 *
 * Never throws — auto-mode must keep going even if the commit fails (next
 * story-complete will re-sync any pending kanban changes).
 *
 * TODO(parity-with-backlog): `auto-mode-backlog-orchestrator.ts` has the same
 * gap for `backlog-index.json` (also in `MUTABLE_BACKLOG_FILES`). Mirror this
 * helper for backlog when the same blocker shows up there.
 */
export async function commitMainKanbanIfDirty(
  mainProjectPath: string,
  specId: string,
  commitMessage: string
): Promise<boolean> {
  const projDirName = resolveProjectDir(mainProjectPath);
  const pathspec = join(projDirName, 'specs', specId, 'kanban.json');
  const specPath = projectDir(mainProjectPath, 'specs', specId);
  try {
    return await withMainProjectLock(mainProjectPath, `commit-kanban-${specId}`, () =>
      withKanbanLock(specPath, async () => {
        execSync(`git add "${pathspec}"`, { cwd: mainProjectPath, stdio: 'pipe' });
        try {
          execSync('git diff --cached --quiet', { cwd: mainProjectPath, stdio: 'pipe' });
          return false; // exit 0 = nothing staged for this file
        } catch {
          // exit 1 = diff present → commit
        }
        execSync(`git commit -m "${commitMessage}" -- "${pathspec}"`, {
          cwd: mainProjectPath,
          stdio: 'pipe',
        });
        return true;
      })
    );
  } catch (err) {
    console.error('[worktree-story] commitMainKanbanIfDirty failed:', err);
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

/**
 * Branch name for a spec story: `story/${feature}/${storyId}`.
 *
 * Separate namespace from the spec branch (`feature/${feature}`) to avoid the
 * git ref hierarchy collision: when `refs/heads/feature/${feature}` exists as
 * a file, git refuses to create `refs/heads/feature/${feature}/${storyId}`
 * because the parent path is already a ref ("cannot lock ref ... exists;
 * cannot create ..."). Putting story branches under `story/...` sidesteps it.
 *
 * Pre-v3.27.5 worktrees on `feature/${feature}/${storyId}` were impossible to
 * create when the spec branch already existed — `createStoryWorktree` would
 * throw and (≥ v3.27.4) halt parallel mode.
 */
export function storyBranchName(specId: string, storyId: string): string {
  const featureName = specId.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  return `story/${featureName}/${storyId}`;
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
 *
 * Commits to these files happen orchestrator-side via `commitMainKanbanIfDirty`
 * after each story-complete event — workflow markdown must NOT `git add` them
 * from worktree CWDs (the files are not present there).
 *
 * Drift defense: any commit that re-introduces these into the worktree (manual
 * `git restore`, branch merges that revive the file, LLM-side mistake) is
 * caught by `purgeShadowSpecMutables` — called from
 * `seedSpecDirInWorktree` at orchestrator start AND from
 * `AutoModeSpecOrchestrator.onItemCompleted` between stories.
 */
export const MUTABLE_SPEC_FILES = ['kanban.json', 'kanban-board.md'] as const;
export const MUTABLE_BACKLOG_FILES = ['backlog-index.json'] as const;

/**
 * Defensive purge: removes mutable spec files (`MUTABLE_SPEC_FILES`) from a
 * worktree if they are present on disk OR tracked in HEAD, then commits the
 * deletion. Returns `true` when a purge commit was created.
 *
 * Why: `seedSpecDirInWorktree` only runs at orchestrator start. If something
 * re-introduces the file between orchestrator runs (manual `git restore`,
 * stale base-branch merge, LLM-side commit mistake), the shadow file diverges
 * from the canonical main copy and breaks MCP-routed updates. This helper is
 * idempotent and safe to call at any time — call it whenever you suspect drift.
 *
 * Never throws — auto-mode must keep going if purge fails (the next run will
 * try again).
 */
export function purgeShadowSpecMutables(
  worktreePath: string,
  specId: string
): boolean {
  if (!existsSync(worktreePath)) return false;
  let projDirName: string;
  try {
    projDirName = resolveProjectDir(worktreePath);
  } catch {
    return false;
  }

  const handled: string[] = [];

  for (const f of MUTABLE_SPEC_FILES) {
    const rel = join(projDirName, 'specs', specId, f);
    const abs = join(worktreePath, rel);
    let touched = false;

    // (1) Drop from working tree if present.
    if (existsSync(abs)) {
      try {
        rmSync(abs, { force: true });
        touched = true;
      } catch (err) {
        console.error(`[worktree-story] purgeShadowSpecMutables: fs.rm failed for ${rel}:`, err);
      }
    }

    // (2) Drop from index if tracked. `--cached --ignore-unmatch` is a no-op
    // for files not in the index (no error). Index removal is what catches
    // restore-commit drift even when the working tree was already clean.
    try {
      execSync(`git rm --cached --ignore-unmatch -- "${rel}"`, { cwd: worktreePath, stdio: 'pipe' });
    } catch (err) {
      console.error(`[worktree-story] purgeShadowSpecMutables: git rm --cached failed for ${rel}:`, err);
      continue;
    }

    if (touched) handled.push(f);
  }

  // Only commit if there's actually something staged. `git rm --cached` on
  // already-untracked files leaves the index unchanged, so the diff may be
  // empty even when we touched the working tree.
  try {
    execSync('git diff --cached --quiet', { cwd: worktreePath, stdio: 'pipe' });
    return false; // exit 0 = nothing staged → silent no-op
  } catch {
    // exit 1 = staged diff present → commit
  }

  try {
    const label = handled.length > 0 ? handled.join('+') : MUTABLE_SPEC_FILES.join('+');
    const msg = `chore: drop shadow ${label} — mutable files live in main only`;
    execSync(`git commit -m "${msg}"`, { cwd: worktreePath, stdio: 'pipe' });
    console.log(`[worktree-story] Purged shadow mutables in ${worktreePath}: ${label}`);
    return true;
  } catch (err) {
    console.error('[worktree-story] purgeShadowSpecMutables: commit failed:', err);
    return false;
  }
}

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

  let needsCopy = true;
  if (existsSync(worktreeSpecPath)) {
    if (lstatSync(worktreeSpecPath).isSymbolicLink()) {
      // Legacy symlink (≤ 3.26.0) → remove and re-seed
      await rm(worktreeSpecPath, { force: true });
    } else {
      // Real dir from base-branch checkout or prior seed → keep, only strip mutables.
      needsCopy = false;
    }
  }

  if (needsCopy) {
    await mkdir(dirname(worktreeSpecPath), { recursive: true });
    cpSync(mainSpecPath, worktreeSpecPath, { recursive: true });
  }

  // Strip mutable files unconditionally — they only live in main (MCP env-var routing).
  // Two-phase: (1) fs.rm to drop from working tree (handles untracked files copied
  // in via cpSync); (2) `git rm --cached --ignore-unmatch` to drop from index when
  // a previous "restore"-style commit re-introduced the file into HEAD. The
  // subsequent `git add specwright/specs/{specId}` in commitSeedOrRollback then
  // captures any deletion as a staged change for the seed commit.
  for (const f of MUTABLE_SPEC_FILES) {
    const p = join(worktreeSpecPath, f);
    if (existsSync(p)) await rm(p, { force: true });
    try {
      execSync(`git rm --cached --ignore-unmatch -- "${join(projDirName, 'specs', specId, f)}"`, {
        cwd: worktreePath, stdio: 'pipe'
      });
    } catch (err) {
      console.error(`[worktree-story] seed strip: git rm --cached failed for ${f}:`, err);
    }
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

  let needsCopy = true;
  if (existsSync(worktreeBacklogPath)) {
    if (lstatSync(worktreeBacklogPath).isSymbolicLink()) {
      await rm(worktreeBacklogPath, { force: true });
    } else {
      needsCopy = false;
    }
  }

  if (needsCopy) {
    await mkdir(dirname(worktreeBacklogPath), { recursive: true });
    cpSync(mainBacklogPath, worktreeBacklogPath, { recursive: true });
  }

  // Strip mutable files unconditionally — they only live in main (MCP env-var routing).
  // Two-phase: fs.rm + `git rm --cached --ignore-unmatch` (see seedSpecDirInWorktree).
  for (const f of MUTABLE_BACKLOG_FILES) {
    const p = join(worktreeBacklogPath, f);
    if (existsSync(p)) await rm(p, { force: true });
    try {
      execSync(`git rm --cached --ignore-unmatch -- "${join(projDirName, 'backlog', f)}"`, {
        cwd: worktreePath, stdio: 'pipe'
      });
    } catch (err) {
      console.error(`[worktree-story] backlog seed strip: git rm --cached failed for ${f}:`, err);
    }
  }

  await commitSeedOrRollback(
    worktreePath,
    worktreeBacklogPath,
    join(projDirName, 'backlog'),
    'chore: seed backlog into worktree'
  );
}

/**
 * Copy `.mcp.json` into the worktree root so Claude can discover the MCP
 * server. Not committed — `.mcp.json` is repo-local config (typically
 * gitignored), not part of the feature branch. Replaces a stale legacy
 * symlink if present.
 *
 * Source resolution (in order):
 *   1. `${projectPath}/.mcp.json` — Claude Code convention (file lives at the
 *      project root the user opened). This is the canonical location and the
 *      one most projects, including those configured by `setup-mcp.sh`, use.
 *   2. `${dirname(projectPath)}/.mcp.json` — legacy fallback for setups where
 *      `.mcp.json` lives one level above the project root (workspace-level
 *      config used by some early Specwright projects).
 *
 * Pre-v3.27.6 only checked (2), missing the kanban MCP server entirely when
 * the project followed convention (1). LLMs in worktrees couldn't reach the
 * kanban MCP, fell back to direct kanban.json file edits in their CWD —
 * shadowed the canonical main copy and stalled out.
 */
export async function copyMcpConfigToWorktree(
  projectPath: string,
  worktreePath: string
): Promise<void> {
  const candidates = [
    join(projectPath, '.mcp.json'),          // project root (Claude Code convention)
    join(dirname(projectPath), '.mcp.json'), // legacy: one level above project root
  ];
  const src = candidates.find(existsSync);
  if (!src) return;

  const dst = join(worktreePath, '.mcp.json');
  // Always overwrite: `.mcp.json` is config that must match the project root.
  // Stale copies from earlier setups (e.g. lacking the `kanban` MCP server)
  // silently break MCP routing — the LLM falls back to direct file edits.
  if (existsSync(dst)) {
    await rm(dst, { force: true });
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
