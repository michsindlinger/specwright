/**
 * Environment of a cloud-terminal session (INT-2026-007, FA-01).
 *
 * On the Mac the UI backend is usually started from inside a Claude Code
 * session and inherits that session's markers (`CLAUDE_CODE_CHILD_SESSION`,
 * `CLAUDECODE`, `CLAUDE_PID`, …). A claude process that inherits
 * `CLAUDE_CODE_CHILD_SESSION` without `CLAUDE_CODE_FORCE_SESSION_PERSISTENCE`
 * writes NO transcript file — and the transcript is the history source of the
 * Gespräch (plan §2 „Persistenz", finding F1).
 *
 * Rule (review E11): not a fixed blacklist but a prefix rule — every
 * `CLAUDE_CODE_*` key, `CLAUDECODE` and `CLAUDE_PID` are dropped unless on the
 * keep-list; provider variables (`CLAUDE_MODEL`, `CLAUDE_PROVIDER`,
 * `CLAUDE_CONFIG_DIR`, `CLAUDE_EFFORT`, `ANTHROPIC_*`) stay. The session id the
 * hooks use (`SPECWRIGHT_CLOUD_SESSION_ID`) is dropped too: the manager sets it
 * per claude session, and a shell session must not report for its parent.
 */

/** Keys that stay although they match the strip rule. */
export const SESSION_ENV_KEEP: ReadonlySet<string> = new Set(['CLAUDE_CODE_FORCE_SESSION_PERSISTENCE']);

/** Exact keys dropped in addition to the `CLAUDE_CODE_*` prefix. */
export const SESSION_ENV_STRIP_EXACT: ReadonlySet<string> = new Set(['CLAUDECODE', 'CLAUDE_PID', 'SPECWRIGHT_CLOUD_SESSION_ID']);

export const FORCE_PERSISTENCE_ENV = 'CLAUDE_CODE_FORCE_SESSION_PERSISTENCE';

export function isStrippedSessionEnvKey(key: string): boolean {
  if (SESSION_ENV_KEEP.has(key)) return false;
  return key.startsWith('CLAUDE_CODE_') || SESSION_ENV_STRIP_EXACT.has(key);
}

/**
 * Copy of `env` without inherited Claude Code session markers, with
 * transcript persistence forced on. Pure; `undefined` values are dropped.
 */
export function sanitizeSessionEnv(env: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) continue;
    if (isStrippedSessionEnvKey(key)) continue;
    out[key] = value;
  }
  out[FORCE_PERSISTENCE_ENV] = '1';
  return out;
}
