/**
 * Worktree seed helpers shared by the cloud-session worktree
 * (`cloud-session-worktree.ts`) and the terminal manager: cleanliness check,
 * `.mcp.json` seeding, Claude project-config seeding.
 *
 * The per-story sub-worktree helpers that used to live here (branch naming,
 * spec/backlog seeding, kanban commits) went with the story path in
 * INT-2026-004, stage 3.
 */

import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { existsSync, lstatSync } from 'fs';
import { mkdir, rm, rmdir, copyFile, readFile, readdir } from 'fs/promises';

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

// ── MCP config seeding ───────────────────────────────────────────────────────

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
 * kanban MCP, fell back to editing its runtime files directly in their CWD —
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

/** Outcome of {@link ensureMcpConfigInWorktree}. */
export type EnsureMcpConfigResult = 'seeded' | 'already-identical' | 'kept-different' | 'no-source';

/**
 * Non-destructive variant of {@link copyMcpConfigToWorktree} for worktrees the
 * *user* owns (session attached to an existing worktree rather than creating a
 * throwaway one).
 *
 * `.mcp.json` is gitignored, so overwriting it there is unrecoverable data
 * loss. Skipping it entirely is not an option either: without the kanban MCP
 * server the LLM falls back to editing its runtime files in place and shadows the
 * canonical copy. So: seed when absent, no-op when identical, and keep the
 * user's file when it differs — the caller surfaces that as a notice.
 */
export async function ensureMcpConfigInWorktree(
  projectPath: string,
  worktreePath: string
): Promise<EnsureMcpConfigResult> {
  const candidates = [
    join(projectPath, '.mcp.json'),
    join(dirname(projectPath), '.mcp.json'),
  ];
  const src = candidates.find(existsSync);
  if (!src) return 'no-source';

  const dst = join(worktreePath, '.mcp.json');
  if (!existsSync(dst)) {
    await copyFile(src, dst);
    return 'seeded';
  }

  try {
    const [a, b] = await Promise.all([readFile(src, 'utf-8'), readFile(dst, 'utf-8')]);
    return a === b ? 'already-identical' : 'kept-different';
  } catch {
    // Unreadable destination — leave it alone rather than guess.
    return 'kept-different';
  }
}

// ── Claude project config seeding ────────────────────────────────────────────

/**
 * Project-root entries a worktree needs so Claude Code behaves like the main
 * checkout. Seeded by {@link ensureClaudeConfigInWorktree}.
 *
 * A fresh worktree is populated by `git worktree add`, so it only ever contains
 * *committed* files. Projects routinely keep their Claude config out of version
 * control — `.gitignore`, or a repo-local `.git/info/exclude` entry like
 * `/.claude/` that is invisible in the repo itself. Those projects lose their
 * project agents, slash commands, skills and permission allowlist the moment a
 * session runs in a worktree. `.mcp.json` already had this exact problem and is
 * copied for the same reason (see {@link copyMcpConfigToWorktree}); this is the
 * rest of the same category.
 *
 * Strict allowlist, deliberately not a blocklist: `.claude/` also holds runtime
 * state and caches that must never be duplicated into a throwaway worktree
 * (`worktrees/` alone reaches tens of MB, plus `backup/`, `checkpoints/`,
 * `mailbox/`, `scheduled_tasks.*`, `agent-registry.json`). A new junk directory
 * added upstream is then a no-op here instead of a silent regression.
 */
export const CLAUDE_CONFIG_SEED_ENTRIES = [
  '.claude/agents',
  '.claude/commands',
  '.claude/skills',
  '.claude/settings.local.json',
] as const;

const SEED_SKIP_BASENAMES = new Set(['.DS_Store']);

/**
 * Collects regular files below `srcAbs`, as paths relative to the project root.
 *
 * Symlinks are never followed — a link inside `.claude/` can point anywhere,
 * including outside the project, and copying its target would escape both the
 * allowlist and any size expectation.
 */
async function collectSeedableFiles(
  srcAbs: string,
  relBase: string,
  out: string[]
): Promise<void> {
  let entries;
  try {
    entries = await readdir(srcAbs, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SEED_SKIP_BASENAMES.has(entry.name)) continue;
    if (entry.isSymbolicLink()) continue;
    const rel = `${relBase}/${entry.name}`;
    if (entry.isDirectory()) {
      await collectSeedableFiles(join(srcAbs, entry.name), rel, out);
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
}

/**
 * Seeds {@link CLAUDE_CONFIG_SEED_ENTRIES} into a worktree and returns the
 * worktree-relative paths it actually created.
 *
 * Seed-if-missing, never overwrite — same semantics as
 * {@link ensureMcpConfigInWorktree}. Applied per *file*, not per directory, so
 * a `.claude/agents/` that the checkout already provided is topped up with the
 * uncommitted agents instead of being skipped wholesale.
 *
 * The returned list is what {@link removeSeededClaudeConfig} may delete again.
 * Nothing else is ever removed, which is why it must be threaded through to
 * teardown rather than recomputed there.
 */
export async function ensureClaudeConfigInWorktree(
  projectPath: string,
  worktreePath: string
): Promise<string[]> {
  const seeded: string[] = [];

  for (const entry of CLAUDE_CONFIG_SEED_ENTRIES) {
    const srcAbs = join(projectPath, entry);
    let stat;
    try {
      stat = lstatSync(srcAbs);
    } catch {
      continue; // entry absent in this project
    }
    if (stat.isSymbolicLink()) continue;

    const rels: string[] = [];
    if (stat.isDirectory()) {
      await collectSeedableFiles(srcAbs, entry, rels);
    } else if (stat.isFile()) {
      rels.push(entry);
    }

    for (const rel of rels) {
      const dst = join(worktreePath, rel);
      if (existsSync(dst)) continue; // checkout (or an earlier seed) wins
      try {
        await mkdir(dirname(dst), { recursive: true });
        await copyFile(join(projectPath, rel), dst);
        seeded.push(rel);
      } catch (err) {
        // Best-effort: a single unreadable file must not fail session start.
        console.warn(`[worktree-story] claude-config seed failed for ${rel}:`, err);
      }
    }
  }

  return seeded;
}

/**
 * Removes seeded Claude config again, but only where the copy is still
 * byte-identical to its source in the main project.
 *
 * Called before the cleanliness gate at teardown. Without it, a project that
 * *does* version `.claude/` would see every seeded file as untracked, so
 * `isWorktreeClean` would report dirty and pin each session worktree in the
 * "keep" branch forever — orphans accumulating on disk.
 *
 * A file edited during the session is kept on purpose: it then legitimately
 * makes the worktree dirty and the existing `keptReason: 'dirty'` path takes
 * over, exactly as for any other in-session change. Same for a source that
 * became unreadable — never delete a copy that cannot be verified.
 */
export async function removeSeededClaudeConfig(
  projectPath: string,
  worktreePath: string,
  seeded: readonly string[]
): Promise<void> {
  for (const rel of seeded) {
    const dst = join(worktreePath, rel);
    if (!existsSync(dst)) continue;
    try {
      const [src, current] = await Promise.all([
        readFile(join(projectPath, rel)),
        readFile(dst),
      ]);
      if (!src.equals(current)) continue; // edited in-session → keep
      await rm(dst, { force: true });
    } catch {
      // Unreadable source or copy — leave it alone rather than guess.
    }
  }

  // Best-effort tidy-up of directories that only existed to hold seeds.
  // Cosmetic: git does not track empty directories, so a leftover would not
  // affect cleanliness. Deepest-first so children are gone before parents.
  const dirs = [...new Set(seeded.map((rel) => dirname(rel)))].sort(
    (a, b) => b.length - a.length
  );
  for (const rel of dirs) {
    if (rel === '.' || !rel.startsWith('.claude')) continue;
    try {
      await rmdir(join(worktreePath, rel));
    } catch {
      // Non-empty (files came from the checkout) or already gone — fine.
    }
  }
}
