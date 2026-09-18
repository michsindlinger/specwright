/**
 * INT-2026-019 (AK-09): existence check for a Claude conversation before the
 * backend resumes it with `claude --resume <id>`. Pure and read-only: no
 * transcript is ever opened (ADR-0004 — there is still no transcript reader),
 * only `projects/<slug>/<id>.jsonl` is stat'ed in the candidate Claude homes.
 *
 * The id comes from the SessionStart hook and is stored in the Vorhaben
 * assignment; before it becomes a file name or a CLI argument it must match
 * the UUID form (security.md §6 — a hook could hand over `../x` or `--flag`).
 * The homes are backend knowledge, never a client-supplied path: `~/.claude`
 * always, the backend's `CLAUDE_CONFIG_DIR` (an Anthropic session inherits it,
 * `sanitizeSessionEnv` lets it through) and `~/.claude-<providerId>` for a
 * non-Anthropic Claude provider (`provider-env.ts`). The search is a superset:
 * a hit in the wrong home can at most report "present" where Claude finds
 * nothing — then the session ends at once with Claude's own message.
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export const CLAUDE_SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isClaudeSessionId(v: unknown): v is string {
  return typeof v === 'string' && CLAUDE_SESSION_ID_RE.test(v);
}

/** Candidate Claude config homes, deduplicated, `~/.claude` first. */
export function claudeHomes(providerId: string | undefined, env: NodeJS.ProcessEnv = process.env, home: string = homedir()): string[] {
  const out: string[] = [join(home, '.claude')];
  const push = (p: string | undefined): void => {
    if (p && !out.includes(p)) out.push(p);
  };
  push(env.CLAUDE_CONFIG_DIR);
  if (providerId && providerId !== 'anthropic') push(join(home, `.claude-${providerId}`));
  return out;
}

export interface TranscriptHit {
  path: string;
  /** Last write to the transcript — the "Stand" shown on the page (OF-02). */
  mtimeMs: number;
}

/**
 * `projects/<dir>/<id>.jsonl` in any of the homes. Returns undefined for an id
 * that is not a UUID (without touching the disk), for unreadable homes and
 * when no file exists.
 */
export function findTranscript(homes: readonly string[], claudeSessionId: string): TranscriptHit | undefined {
  if (!isClaudeSessionId(claudeSessionId)) return undefined;
  const file = `${claudeSessionId.toLowerCase()}.jsonl`;
  for (const home of homes) {
    const projects = join(home, 'projects');
    let dirs: string[];
    try {
      dirs = readdirSync(projects);
    } catch {
      continue;
    }
    for (const dir of dirs) {
      const p = join(projects, dir, file);
      if (!existsSync(p)) continue;
      try {
        return { path: p, mtimeMs: statSync(p).mtimeMs };
      } catch {
        continue;
      }
    }
  }
  return undefined;
}
