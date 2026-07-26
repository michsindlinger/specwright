/**
 * Enumeration of a repository's git worktrees, for the Cloud Terminal
 * "where should this session run?" picker.
 *
 * Split into a pure parsing/normalization half (unit-testable without git) and
 * a thin I/O half that shells out to `git worktree list --porcelain`.
 *
 * The normalization function `pathKey` is the single identity function for
 * worktree paths. It MUST be applied to both sides of every comparison —
 * allowlist entries and requested paths alike — otherwise a macOS
 * `/Users` ↔ `/private/Users` or case difference produces a spurious mismatch.
 */

import { execFile } from 'child_process';
import { realpathSync, promises as fsp } from 'fs';
import { join, resolve, sep } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/** One record from `git worktree list --porcelain`. */
export interface ParsedWorktreeEntry {
  path: string;
  /** Commit SHA, or null when the record carried no HEAD line */
  head: string | null;
  /** Short branch name with `refs/heads/` stripped; null when detached */
  branch: string | null;
  detached: boolean;
  bare: boolean;
  locked: boolean;
  prunable: boolean;
}

/** Result of {@link listRepoWorktrees}. */
export interface RepoWorktreeInfo {
  isGitRepo: boolean;
  /** Path of the repo's main worktree (first non-bare record), pathKey-normalized */
  mainWorktreePath: string | null;
  entries: ParsedWorktreeEntry[];
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Parses `git worktree list --porcelain` output.
 *
 * Records are separated by blank lines; each starts with a `worktree <path>`
 * line. Attribute lines are either bare keywords (`bare`, `detached`) or
 * `<key> <value>` pairs (`HEAD <sha>`, `branch refs/heads/x`,
 * `locked [<reason>]`, `prunable <reason>`). Unknown lines are ignored so
 * newer git versions cannot break parsing.
 */
export function parseWorktreePorcelain(stdout: string): ParsedWorktreeEntry[] {
  const entries: ParsedWorktreeEntry[] = [];
  let current: ParsedWorktreeEntry | null = null;

  const push = (): void => {
    if (current) entries.push(current);
    current = null;
  };

  for (const rawLine of stdout.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (line.trim() === '') {
      push();
      continue;
    }

    const spaceIdx = line.indexOf(' ');
    const key = spaceIdx === -1 ? line : line.slice(0, spaceIdx);
    const value = spaceIdx === -1 ? '' : line.slice(spaceIdx + 1);

    if (key === 'worktree') {
      // A `worktree` line always starts a new record, even without a preceding
      // blank line (defensive against malformed output).
      push();
      current = {
        path: value,
        head: null,
        branch: null,
        detached: false,
        bare: false,
        locked: false,
        prunable: false,
      };
      continue;
    }

    if (!current) continue;

    switch (key) {
      case 'HEAD':
        current.head = value || null;
        break;
      case 'branch':
        current.branch = value.replace(/^refs\/heads\//, '') || null;
        break;
      case 'detached':
        current.detached = true;
        break;
      case 'bare':
        current.bare = true;
        break;
      case 'locked':
        current.locked = true;
        break;
      case 'prunable':
        current.prunable = true;
        break;
      default:
        break;
    }
  }

  push();
  return entries;
}

/**
 * Canonical identity for a filesystem path.
 *
 * Cascade: `realpathSync.native` (resolves symlinks AND yields the canonical
 * case on case-insensitive filesystems) → `realpathSync` → lexical `resolve`
 * for paths that do not exist. Trailing separators are stripped.
 *
 * Because target validation is an exact-match allowlist, any residual
 * normalization mismatch causes a *rejection*, never a wrong working
 * directory — the failure mode is fail-safe by construction.
 */
export function pathKey(p: string): string {
  let out: string;
  try {
    out = realpathSync.native(p);
  } catch {
    try {
      out = realpathSync(p);
    } catch {
      out = resolve(p);
    }
  }
  // Strip trailing separators, but keep a bare root ('/' stays '/').
  while (out.length > 1 && out.endsWith(sep)) {
    out = out.slice(0, -1);
  }
  return out;
}

/**
 * Extracts the worktree's working-directory path from a git gitdir pointer.
 *
 * Two file formats are accepted because both sides of the link look similar:
 *  - `<gitCommonDir>/worktrees/<id>/gitdir` holds a bare `/path/to/wt/.git`
 *  - `<wt>/.git`                            holds `gitdir: /main/.git/worktrees/<id>`
 *
 * Only the first form yields a working directory; the trailing `/.git` is
 * stripped. Returns null for empty/unusable content.
 */
export function parseWorktreeGitdirPointer(content: string): string | null {
  const raw = content.trim();
  if (!raw) return null;
  const stripped = raw.replace(/^gitdir:\s*/, '');
  const withoutDotGit = stripped.replace(/[\\/]\.git[\\/]?$/, '');
  return withoutDotGit || null;
}

/**
 * Picks the creation timestamp from several filesystem candidates.
 *
 * The smallest positive value wins. That is deliberate: `birthtime` is exact on
 * APFS and on ext4 with `crtime`, but on filesystems without birth-time support
 * Node substitutes `ctime` (or 0) — and `ctime` on the admin *directory* moves
 * every time git writes into it. The `gitdir` file's mtime never moves after
 * creation (only `git worktree repair`/`move` rewrites it), so it acts as a
 * safe upper bound and the minimum lands on the real creation time.
 */
export function pickCreatedAtMs(candidates: Array<number | null | undefined>): number | null {
  const valid = candidates.filter(
    (c): c is number => typeof c === 'number' && Number.isFinite(c) && c > 0
  );
  return valid.length > 0 ? Math.min(...valid) : null;
}

/**
 * True when `child` is `parent` or strictly below it. Segment-aware, so
 * `/a/bc` is NOT considered inside `/a/b`.
 */
export function isPathInside(parent: string, child: string): boolean {
  const p = resolve(parent);
  const c = resolve(child);
  if (p === c) return true;
  return c.startsWith(p.endsWith(sep) ? p : p + sep);
}

// ── I/O ──────────────────────────────────────────────────────────────────────

/**
 * Runs `git worktree list --porcelain` in `mainProjectPath`.
 *
 * Never throws: a non-repo, a missing git binary or a timeout all resolve to
 * `{ isGitRepo: false, mainWorktreePath: null, entries: [] }`. All returned
 * paths are pathKey-normalized so callers can compare them directly.
 */
export async function listRepoWorktrees(mainProjectPath: string): Promise<RepoWorktreeInfo> {
  let stdout: string;
  try {
    const result = await execFileAsync('git', ['worktree', 'list', '--porcelain'], {
      cwd: mainProjectPath,
      timeout: 5000,
      encoding: 'utf-8',
    });
    stdout = result.stdout;
  } catch {
    return { isGitRepo: false, mainWorktreePath: null, entries: [] };
  }

  const entries = parseWorktreePorcelain(stdout).map((e) => ({ ...e, path: pathKey(e.path) }));
  // `git worktree list` always emits the main worktree first.
  const main = entries.find((e) => !e.bare) ?? null;

  return {
    isGitRepo: entries.length > 0,
    mainWorktreePath: main?.path ?? null,
    entries,
  };
}

/**
 * Best-effort creation time per *linked* worktree, keyed by pathKey.
 *
 * git stores no creation date, so the admin directory
 * `<gitCommonDir>/worktrees/<id>` is used as the proxy — it is written exactly
 * once, when `git worktree add` runs. The main worktree has no admin directory
 * and is therefore absent from the map.
 *
 * Reads the admin dirs directly instead of the worktrees themselves so entries
 * whose directory was deleted (prunable) still carry a date.
 *
 * Never throws: a non-repo, a missing `worktrees/` dir or an unreadable entry
 * just yields fewer map entries.
 */
export async function listWorktreeCreationTimes(
  mainProjectPath: string
): Promise<Map<string, number>> {
  const result = new Map<string, number>();

  let commonDir: string;
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', '--git-common-dir'], {
      cwd: mainProjectPath,
      timeout: 5000,
      encoding: 'utf-8',
    });
    // `--git-common-dir` may be relative to the cwd (typically plain `.git`).
    commonDir = resolve(mainProjectPath, stdout.trim());
  } catch {
    return result;
  }

  const adminRoot = join(commonDir, 'worktrees');
  let ids: string[];
  try {
    ids = await fsp.readdir(adminRoot);
  } catch {
    // No linked worktrees have ever been created in this repo.
    return result;
  }

  await Promise.all(
    ids.map(async (id) => {
      const adminDir = join(adminRoot, id);
      const gitdirFile = join(adminDir, 'gitdir');
      try {
        const [pointer, adminStat, gitdirStat] = await Promise.all([
          fsp.readFile(gitdirFile, 'utf-8'),
          fsp.stat(adminDir),
          fsp.stat(gitdirFile),
        ]);
        const worktreePath = parseWorktreeGitdirPointer(pointer);
        if (!worktreePath) return;
        const createdAt = pickCreatedAtMs([
          adminStat.birthtimeMs,
          gitdirStat.birthtimeMs,
          gitdirStat.mtimeMs,
        ]);
        if (createdAt === null) return;
        result.set(pathKey(worktreePath), createdAt);
      } catch {
        // Stale or half-written admin entry — no date for this worktree.
      }
    })
  );

  return result;
}
