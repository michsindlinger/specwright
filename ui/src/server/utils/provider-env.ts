import { homedir } from 'os';
import { join } from 'path';

/** Expand a leading `~` to the user's home directory. */
export function expandTilde(p: string): string {
  return p.startsWith('~') ? join(homedir(), p.slice(1)) : p;
}

/**
 * Build the environment for a Claude-Agent-SDK `query()` call scoped to a
 * specific provider.
 *
 * Single source of truth for the provider→auth mapping shared by the external
 * reviewers (`external-reviewer.ts`), the finding aggregator
 * (`finding-aggregator.ts`) and any future SDK caller. Keeping this in one place
 * prevents the auth branch from drifting between call sites (regression class of
 * commit 28965af — the Anthropic reviewer failing with "Invalid API key" when it
 * was pointed at `~/.claude-anthropic` instead of the shared `~/.claude`).
 *
 * Behaviour:
 * - Always strips `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` /
 *   `ANTHROPIC_BASE_URL` from the inherited env so a stale key cannot shadow the
 *   OAuth login held in the config dir.
 * - `anthropic` ⇒ no `CLAUDE_CONFIG_DIR` override → uses the default `~/.claude`
 *   OAuth session (same one the cloud terminal logs in with).
 * - any other provider ⇒ `CLAUDE_CONFIG_DIR = ~/.claude-<providerId>`, the
 *   scoped dir that carries that third-party CLI's settings/keys.
 */
export function buildProviderEnv(providerId: string): Record<string, string | undefined> {
  const baseEnv: Record<string, string | undefined> = { ...process.env };
  delete baseEnv.ANTHROPIC_API_KEY;
  delete baseEnv.ANTHROPIC_AUTH_TOKEN;
  delete baseEnv.ANTHROPIC_BASE_URL;

  if (providerId === 'anthropic') {
    return baseEnv;
  }
  return { ...baseEnv, CLAUDE_CONFIG_DIR: expandTilde(`~/.claude-${providerId}`) };
}
