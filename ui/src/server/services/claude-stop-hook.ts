/**
 * Claude Code Stop-hook wiring for "agent finished" notifications.
 *
 * Every claude-code cloud session is launched with `--settings <file>` where
 * the file registers a `Stop` hook. When Claude finishes a turn, the hook
 * POSTs Claude's stdin payload to this backend, which broadcasts a
 * `cloud-terminal:agent-event` so the UI can ring its bell.
 *
 * Design notes:
 * - ONE settings file per backend port (not per session): the session id
 *   travels via the `SPECWRIGHT_CLOUD_SESSION_ID` env var that the launch
 *   script exports, so there is nothing to clean up per session.
 * - The file is rewritten at every boot with the CURRENT port. A claude
 *   process started under a different port keeps reporting to that old port
 *   and is simply not heard — accepted; the port is fixed in the unit file.
 * - The shared secret is persisted (0600) rather than generated per boot so
 *   sessions that survive a backend restart (tmux) keep authenticating.
 * - The hook is synchronous on purpose: stdin delivery to `async` hooks is
 *   undocumented, and a loopback curl costs single-digit milliseconds.
 * - `command -v curl` guard + trailing `exit 0`: the hook can never block or
 *   fail Claude; without curl the feature degrades silently.
 */

import { randomBytes } from 'crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { getClaudeHookSettingsPath, getHookSecretPath } from '../utils/runtime-paths.js';

/** Env var the launch script exports; the hook reads it to name its session. */
export const CLOUD_SESSION_ID_ENV = 'SPECWRIGHT_CLOUD_SESSION_ID';

/** Header carrying the shared secret (lower-case: Express normalises names). */
export const HOOK_TOKEN_HEADER = 'x-specwright-hook-token';

/** Max characters of `last_assistant_message` kept as bell-list preview. */
export const PREVIEW_MAX_CHARS = 160;

/** Hook secret: 32 random bytes as hex. */
const SECRET_HEX_RE = /^[0-9a-f]{64}$/;

// eslint-disable-next-line no-control-regex
const ANSI_CSI = /\x1b\[[0-9;?]*[a-zA-Z]/g;
// eslint-disable-next-line no-control-regex
const ANSI_OSC = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

/**
 * Builds the `--settings` JSON. Pure — no IO — so tests can assert the exact
 * command. The command is a POSIX-sh one-liner:
 *   1. bail (exit 0) unless the session env var is set,
 *   2. bail (exit 0) unless curl exists,
 *   3. POST stdin to this backend with the shared secret, ignore the outcome.
 */
export function renderStopHookSettings(port: number, secret: string): string {
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`renderStopHookSettings: invalid port ${port}`);
  }
  if (!SECRET_HEX_RE.test(secret)) {
    throw new Error('renderStopHookSettings: secret must be 64 hex chars');
  }
  const url = `http://127.0.0.1:${port}/api/cloud-terminal/$${CLOUD_SESSION_ID_ENV}/agent-event`;
  const command = [
    `[ -n "$${CLOUD_SESSION_ID_ENV}" ]`,
    'command -v curl >/dev/null 2>&1',
    `curl -s -m 3 -X POST -H 'Content-Type: application/json' -H '${HOOK_TOKEN_HEADER}: ${secret}' --data-binary @- "${url}" >/dev/null 2>&1`,
  ].join(' && ') + '; exit 0';

  const settings = {
    hooks: {
      Stop: [
        {
          hooks: [{ type: 'command', command, timeout: 5 }],
        },
      ],
    },
  };
  return JSON.stringify(settings, null, 2) + '\n';
}

/**
 * Reads the persisted secret, or creates it on first run. Synchronous: it runs
 * in the manager constructor before any session can be created or restored.
 */
export function loadOrCreateHookSecret(secretPath: string = getHookSecretPath()): string {
  try {
    const existing = readFileSync(secretPath, 'utf-8').trim();
    if (SECRET_HEX_RE.test(existing)) return existing;
  } catch {
    // missing or unreadable — fall through and (re)create
  }
  const secret = randomBytes(32).toString('hex');
  mkdirSync(dirname(secretPath), { recursive: true, mode: 0o700 });
  writeFileSync(secretPath, secret + '\n', { mode: 0o600 });
  return secret;
}

/**
 * Writes the settings file for this port and returns its path. Idempotent;
 * synchronous for the same reason as {@link loadOrCreateHookSecret}.
 */
export function ensureStopHookSettingsFile(
  port: number,
  secret: string,
  settingsPath: string = getClaudeHookSettingsPath()
): string {
  mkdirSync(dirname(settingsPath), { recursive: true, mode: 0o700 });
  writeFileSync(settingsPath, renderStopHookSettings(port, secret), { mode: 0o600 });
  return settingsPath;
}

/**
 * Turns Claude's `last_assistant_message` into a one-line preview for the
 * bell list. Strips ANSI/OSC sequences and control characters, collapses
 * whitespace, truncates with an ellipsis. Non-strings and empty results map
 * to `undefined` (the notification is still delivered, just without text).
 */
export function summarizePreview(text: unknown, max: number = PREVIEW_MAX_CHARS): string | undefined {
  if (typeof text !== 'string') return undefined;
  const cleaned = text
    .replace(ANSI_OSC, '')
    .replace(ANSI_CSI, '')
    .replace(CONTROL_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return undefined;
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
}

/** Session-id shape accepted by the agent-event route (see generateSessionId). */
export const CLOUD_SESSION_ID_RE = /^cloud-\d+-\d+$/;
