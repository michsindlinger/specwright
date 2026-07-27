/**
 * Per-session git worktrees for interactive Cloud Terminal claude-code sessions.
 *
 * Each interactive claude-code session runs in its own throwaway worktree on a
 * dedicated `session/<sessionId>` branch, so parallel Claude sessions never
 * collide on the same working tree / branch. The plain "shell" terminal, the
 * auto-mode path (which already creates its own worktrees), and workflow tabs
 * are all excluded — this helper only backs the interactive path.
 *
 * Namespaces are deliberately disjoint from the auto-mode helpers in
 * `worktree-story.ts`:
 *   - branch:    `session/<id>`   (vs `feature/<f>`, `story/<f>/<s>`)
 *   - worktree:  `session-<id>`   (vs `<feature>-<storyId>`, `backlog-<slug>`)
 *
 * Reuses the erprobten building blocks from `worktree-story.ts`
 * (`isWorktreeClean`, `copyMcpConfigToWorktree`, `ensureSpecwrightRuntimeGitignored`)
 * and serializes main-repo index mutations via `withMainProjectLock`.
 */

import { join, dirname, basename } from 'path';
import { spawn, spawnSync, execSync } from 'child_process';
import { existsSync } from 'fs';
import { mkdir, rm } from 'fs/promises';
import { withMainProjectLock } from './main-project-mutex.js';
import { getBaseBranch } from '../general-config.js';
import { CLOUD_TERMINAL_ERROR_CODES } from '../../shared/types/cloud-terminal.protocol.js';
import {
  isWorktreeClean,
  copyMcpConfigToWorktree,
  ensureClaudeConfigInWorktree,
  removeSeededClaudeConfig,
  ensureSpecwrightRuntimeGitignored,
} from './worktree-story.js';

/**
 * Env var read by the kanban MCP server to route runtime writes (kanban.json,
 * backlog-index.json) back to the main repo instead of the session worktree.
 * MUST match the literal used by the auto-mode path (`auto-mode-story-slot.ts`).
 */
export const SPECWRIGHT_MAIN_PROJECT_PATH_ENV = 'SPECWRIGHT_MAIN_PROJECT_PATH';

/** Raised by {@link resolveSessionBase} when the project is not a git repo. */
export class NotAGitRepoError extends Error {
  constructor(projectPath: string) {
    super(`Not a git repository: ${projectPath}`);
    this.name = 'NotAGitRepoError';
  }
}

/**
 * A user-chosen worktree name is already in use by a directory or a
 * `session/<name>` branch.
 *
 * Only reachable for *named* worktrees — a session-id-derived name is unique by
 * construction. Carries `code` so the WS error response surfaces it like any
 * other target error and the picker returns to step 2.
 */
export class WorktreeNameTakenError extends Error {
  public readonly code = CLOUD_TERMINAL_ERROR_CODES.WORKTREE_NAME_TAKEN;
  constructor(name: string) {
    super(`Worktree-Name bereits vergeben: ${name}`);
    this.name = 'WorktreeNameTakenError';
  }
}

/**
 * git's own rejection of a colliding path or branch.
 *
 * Matched on stderr because the pre-flight check cannot be authoritative:
 * `withMainProjectLock` is a process-local mutex, so a second server process
 * (restart overlap, orphaned nodemon) can slip between check and create. git
 * itself is the real guard — `worktree add` fails atomically — and this maps
 * that failure onto the typed error.
 */
function isCollisionFailure(stderr: string): boolean {
  return /already exists|already checked out|already used by worktree/i.test(stderr);
}

/** Result of {@link removeCloudSessionWorktree}. */
export interface RemoveWorktreeResult {
  removed: boolean;
  /** Present when the worktree was intentionally kept. */
  keptReason?: 'dirty' | 'not-owned';
}

declare const OWNED_BRAND: unique symbol;

/**
 * Proof that THIS session created the worktree and may therefore delete it.
 *
 * Only {@link createCloudSessionWorktree} can mint one, so a session that
 * merely *attached* to a user-owned worktree cannot populate
 * `ManagedCloudSession.worktreeCleanup` — the compiler rejects it. That is the
 * first of three layers guarding against deleting a user's worktree; the
 * others are the name-schema guard in {@link removeCloudSessionWorktree} and
 * the lifecycle tests in `cloud-session-worktree.test.ts`.
 */
export interface OwnedSessionWorktree {
  readonly [OWNED_BRAND]: true;
  worktreePath: string;
  branchName: string;
  mainProjectPath: string;
  /**
   * Worktree-relative paths seeded by `ensureClaudeConfigInWorktree`, i.e. the
   * only files teardown is allowed to delete on top of the worktree itself.
   * Carried on the session rather than recomputed at teardown so a file the
   * *checkout* provided can never be mistaken for one of ours.
   */
  seededClaudeConfig: string[];
}

/** Name schema of a disposable per-session worktree directory. */
const OWNED_WORKTREE_DIR_RE = /^session-/;
/** Name schema of a disposable per-session branch. */
const OWNED_WORKTREE_BRANCH_RE = /^session\//;

/**
 * Runs a git subcommand with argv passed as an array.
 *
 * Deliberately NOT a shell string: since the target picker landed, worktree
 * paths can originate from a client message, and `execSync` with an
 * interpolated path would be a command-injection surface.
 */
function git(cwd: string, args: string[]): { ok: boolean; stderr: string } {
  const res = spawnSync('git', args, { cwd, encoding: 'utf-8', stdio: 'pipe' });
  return { ok: res.status === 0, stderr: res.stderr ?? '' };
}

// ── Path calculation (pure, no I/O) ──────────────────────────────────────────

/** Sub-worktree path for a cloud session: `${proj}-worktrees/session-${sessionId}`. */
export function cloudSessionWorktreePath(mainProjectPath: string, sessionId: string): string {
  const projDirName = basename(mainProjectPath);
  const worktreeBase = join(dirname(mainProjectPath), `${projDirName}-worktrees`);
  return join(worktreeBase, `session-${sessionId}`);
}

/** Branch name for a cloud session: `session/${sessionId}` (own ref namespace). */
export function cloudSessionBranchName(sessionId: string): string {
  return `session/${sessionId}`;
}

// ── Base-branch resolution ───────────────────────────────────────────────────

/**
 * Resolves the branch a new session worktree should fork from.
 * Throws {@link NotAGitRepoError} when `mainProjectPath` is not inside a git
 * work tree. Otherwise returns the configured base branch (`getBaseBranch`),
 * falling back to `HEAD` when that ref does not exist (e.g. repo uses `master`).
 */
export async function resolveSessionBase(mainProjectPath: string): Promise<string> {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: mainProjectPath,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new NotAGitRepoError(mainProjectPath);
  }

  const base = getBaseBranch(mainProjectPath);
  try {
    execSync(`git rev-parse --verify --quiet "${base}^{commit}"`, {
      cwd: mainProjectPath,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return base;
  } catch {
    console.warn(
      `[cloud-session-worktree] base branch "${base}" not found in ${mainProjectPath} — falling back to HEAD`
    );
    return 'HEAD';
  }
}

// ── Create / remove ──────────────────────────────────────────────────────────

/** Failure of `git worktree add`, carrying stderr so the caller can classify it. */
class WorktreeAddError extends Error {
  constructor(public readonly stderr: string, code: number | null) {
    super(`git worktree add failed (${code}): ${stderr}`);
    this.name = 'WorktreeAddError';
  }
}

function gitWorktreeAdd(
  mainProjectPath: string,
  worktreePath: string,
  branchName: string,
  base: string
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn('git', ['worktree', 'add', worktreePath, '-b', branchName, base], {
      cwd: mainProjectPath,
      stdio: 'pipe',
    });
    let stderr = '';
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) =>
      code === 0 ? resolve() : reject(new WorktreeAddError(stderr, code))
    );
    proc.on('error', reject);
  });
}

/**
 * True when `refs/heads/<branchName>` exists.
 *
 * `show-ref --verify refs/heads/…` rather than `rev-parse --verify <branch>`:
 * the latter also resolves tags, so a tag named `session/foo` would be reported
 * as a branch collision and block a perfectly free name.
 */
function branchExists(mainProjectPath: string, branchName: string): boolean {
  return git(mainProjectPath, [
    'show-ref', '--verify', '--quiet', `refs/heads/${branchName}`,
  ]).ok;
}

/**
 * Creates a fresh worktree at `${proj}-worktrees/session-${sessionId}` on a new
 * `session/${sessionId}` branch forked from `base`, then seeds `.mcp.json` so
 * Claude in the worktree can reach the kanban MCP server.
 *
 * `ensureSpecwrightRuntimeGitignored` is called **before** acquiring the main
 * lock because it acquires the same (non-reentrant) lock internally — nesting
 * would deadlock. Only the `git worktree add` (which mutates the main repo's
 * worktree metadata + packed-refs) runs under `withMainProjectLock`.
 */
export async function createCloudSessionWorktree(
  mainProjectPath: string,
  sessionId: string,
  base: string,
  name?: string
): Promise<OwnedSessionWorktree> {
  // An empty/whitespace name from a non-UI client must never degenerate into a
  // worktree literally called `session-`; fall back to the session id instead.
  const key = name && name.length > 0 ? name : sessionId;
  const worktreePath = cloudSessionWorktreePath(mainProjectPath, key);
  const branchName = cloudSessionBranchName(key);

  // Self-locking — MUST stay outside withMainProjectLock (non-reentrant mutex).
  await ensureSpecwrightRuntimeGitignored(mainProjectPath);

  await withMainProjectLock(mainProjectPath, 'cloud-session-worktree-add', async () => {
    // Pre-flight only for named worktrees — a session id cannot collide. This
    // exists for the error *message*; git is the actual guard (see below).
    if (name && (existsSync(worktreePath) || branchExists(mainProjectPath, branchName))) {
      throw new WorktreeNameTakenError(name);
    }

    await mkdir(dirname(worktreePath), { recursive: true });
    try {
      await gitWorktreeAdd(mainProjectPath, worktreePath, branchName, base);
    } catch (err) {
      // ── Rollback guard ──────────────────────────────────────────────────
      // The rollback below deletes `branchName`. That is safe only while the
      // branch can belong to nobody but us. With user-chosen names a collision
      // is precisely the case where it belongs to SOMEONE ELSE — a live
      // session, or yesterday's unmerged work. Deleting it would turn a
      // harmless error message into silent data loss, so a collision returns
      // the typed error and touches nothing.
      if (err instanceof WorktreeAddError && isCollisionFailure(err.stderr)) {
        throw new WorktreeNameTakenError(key);
      }

      // Any other failure: the path is ours (or does not exist), so roll back a
      // partially-created worktree — a retry with the same id then works and no
      // orphan directory/ref is left behind.
      await rm(worktreePath, { recursive: true, force: true }).catch(() => {});
      git(mainProjectPath, ['worktree', 'prune']);
      git(mainProjectPath, ['branch', '-D', branchName]); // may not exist — no-op
      throw err;
    }
  });

  // File copies into the worktree — no main-repo index mutation, no lock needed.
  await copyMcpConfigToWorktree(mainProjectPath, worktreePath);
  // Project agents / commands / skills / permission allowlist. A fresh worktree
  // only ever holds committed files, and projects routinely keep `.claude/` out
  // of version control (`.gitignore`, or an invisible `/.claude/` in
  // `.git/info/exclude`) — without this the session silently loses them.
  const seededClaudeConfig = await ensureClaudeConfigInWorktree(mainProjectPath, worktreePath);

  // The brand is the ONLY place ownership is minted. Cast is intentional: the
  // symbol has no runtime representation, it exists purely so that a worktree
  // the user already owned can never be assigned to `worktreeCleanup`.
  return {
    worktreePath,
    branchName,
    mainProjectPath,
    seededClaudeConfig,
  } as unknown as OwnedSessionWorktree;
}

/**
 * Removes a session worktree when clean, keeps it when dirty.
 * - dirty (uncommitted changes) → keep, return `{ removed: false, keptReason: 'dirty' }`.
 * - clean → `git worktree remove` + `prune`, then `git branch -d` (safe delete:
 *   only removes the branch when it has no unmerged commits, so branches with
 *   real work survive for a later PR).
 *
 * Best-effort: never throws. Wrapped in `withMainProjectLock` because it mutates
 * the main repo's worktree metadata and refs.
 *
 * Refuses outright to touch anything outside the disposable `session-*` /
 * `session/*` namespace. That guard is the second safety layer behind
 * {@link OwnedSessionWorktree}: it covers both `git branch -d` call sites below
 * (missing-directory branch and clean-removal branch) with one check, so a
 * user-owned worktree survives even if a future refactor manages to smuggle a
 * foreign path in here.
 */
export async function removeCloudSessionWorktree(
  mainProjectPath: string,
  worktreePath: string,
  branchName: string,
  seededClaudeConfig: readonly string[] = []
): Promise<RemoveWorktreeResult> {
  if (
    !OWNED_WORKTREE_DIR_RE.test(basename(worktreePath)) ||
    !OWNED_WORKTREE_BRANCH_RE.test(branchName)
  ) {
    console.error(
      '[cloud-session-worktree] refusing to remove a worktree outside the session namespace:',
      { worktreePath, branchName }
    );
    return { removed: false, keptReason: 'not-owned' };
  }

  return withMainProjectLock(mainProjectPath, 'cloud-session-worktree-remove', async () => {
    // Worktree dir already gone (e.g. manual delete): just reconcile metadata.
    if (!existsSync(worktreePath)) {
      git(mainProjectPath, ['worktree', 'prune']);
      // Safe delete: no-op when the branch has unmerged commits or is missing.
      git(mainProjectPath, ['branch', '-d', branchName]);
      return { removed: true };
    }

    // Drop our own seeds BEFORE judging cleanliness. In a project that versions
    // `.claude/`, the seeded copies show up as untracked, so every session
    // worktree would land in the "dirty → keep" branch and never be reclaimed.
    // Only byte-identical copies go; anything edited in-session survives and
    // legitimately marks the worktree dirty.
    if (seededClaudeConfig.length > 0) {
      await removeSeededClaudeConfig(mainProjectPath, worktreePath, seededClaudeConfig);
    }

    if (!isWorktreeClean(worktreePath)) {
      console.warn(
        `[cloud-session-worktree] worktree kept (uncommitted changes): ${worktreePath}`
      );
      return { removed: false, keptReason: 'dirty' };
    }

    const removal = git(mainProjectPath, ['worktree', 'remove', worktreePath]);
    if (!removal.ok) {
      console.warn(
        '[cloud-session-worktree] removeCloudSessionWorktree failed (worktree kept):',
        removal.stderr.trim()
      );
      return { removed: false };
    }

    git(mainProjectPath, ['worktree', 'prune']);
    // Safe delete: fails harmlessly (kept) when the branch has unmerged commits.
    git(mainProjectPath, ['branch', '-d', branchName]);
    console.log(`[cloud-session-worktree] removed worktree ${worktreePath}`);
    return { removed: true };
  });
}
