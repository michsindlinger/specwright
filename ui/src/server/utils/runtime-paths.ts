/**
 * Runtime state directory resolution.
 *
 * Everything the backend persists across restarts (cloud-terminal session
 * registry, tmux run scripts, exit-code files, pasted images) lives under a
 * single runtime directory. Defaults to `<ui>/runtime` (gitignored — the cloud
 * deploy script runs `git reset --hard`, so this state must be untracked);
 * overridable via SPECWRIGHT_RUNTIME_DIR (the droplet unit points it at the
 * install dir explicitly).
 *
 * The tmux socket deliberately lives OUTSIDE the runtime dir by default
 * (os.tmpdir()) but NEVER under a systemd PrivateTmp namespace on the droplet —
 * there SPECWRIGHT_TMUX_SOCKET_DIR points to /var/lib/<user>/tmux, which both
 * the ui unit and the tmux unit can reach.
 */

import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Conservative cap for a unix socket path (sun_path is 104 on macOS, 108 on Linux). */
const MAX_SOCKET_PATH_LEN = 100;

/** Backend listen port (PORT env, default 3001) — baked into hook URLs and registry file names. */
export function backendPort(): number {
  const parsed = process.env.PORT ? parseInt(process.env.PORT, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : 3001;
}

/** Root for all persisted runtime state: SPECWRIGHT_RUNTIME_DIR ?? `<ui>/runtime`. */
export function getRuntimeDir(): string {
  return process.env.SPECWRIGHT_RUNTIME_DIR ?? join(__dirname, '../../../runtime');
}

/** Cloud-terminal state subtree: `<runtime>/cloud-terminal`. */
export function getCloudTerminalRuntimeDir(): string {
  return join(getRuntimeDir(), 'cloud-terminal');
}

/**
 * Root for persisted paste images (per-session subdirectories).
 *
 * Replaces the old `/tmp/cloud-terminal-paste`: with PrivateTmp=true on the
 * droplet's ui unit, a /tmp path is invisible to claude processes living in
 * the tmux unit's mount namespace — paste-image references would silently
 * break there.
 */
export function getPasteImageRoot(): string {
  return join(getCloudTerminalRuntimeDir(), 'paste');
}

/** Directory holding generated per-session run scripts and exit-code files. */
export function getLaunchDir(): string {
  return join(getCloudTerminalRuntimeDir(), 'launch');
}

/**
 * Claude Code `--settings` file carrying the Stop hook that reports "agent
 * finished" back to this backend. Port-suffixed because the hook URL inside
 * targets exactly this backend's port.
 */
export function getClaudeHookSettingsPath(): string {
  return join(getCloudTerminalRuntimeDir(), `claude-hooks-${backendPort()}.json`);
}

/**
 * Shared secret the Stop hook presents to POST /api/cloud-terminal/.../agent-event.
 * Persisted (not per-boot) so sessions started by an earlier backend process
 * keep authenticating after a restart.
 */
export function getHookSecretPath(): string {
  return join(getCloudTerminalRuntimeDir(), 'hook-secret');
}

/** On-disk session registry, port-suffixed so two backends in one checkout never collide. */
export function getSessionRegistryPath(): string {
  return join(getCloudTerminalRuntimeDir(), `sessions-${backendPort()}.json`);
}

/**
 * Directory for the tmux server socket. Created 0700 on first use.
 * Default os.tmpdir() works for local dev (no PrivateTmp there); the droplet
 * overrides via SPECWRIGHT_TMUX_SOCKET_DIR to a /var/lib path shared with the
 * dedicated tmux unit.
 */
export function getTmuxSocketDir(): string {
  const configured = process.env.SPECWRIGHT_TMUX_SOCKET_DIR;
  // Unix sockets are capped by sun_path (~104 bytes on macOS, 108 on Linux) and
  // the failure mode is a bare "File name too long" from tmux. macOS TMPDIR
  // (/var/folders/<hash>/…/T/) already eats ~50 of those, so fall back to a
  // short /tmp path when the default would run close to the limit.
  const preferred = configured ?? join(os.tmpdir(), 'specwright-tmux');
  const dir =
    configured || `${preferred}/specwright-${backendPort()}.sock`.length <= MAX_SOCKET_PATH_LEN
      ? preferred
      : join('/tmp', `specwright-tmux-${os.userInfo().uid}`);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  return dir;
}

/** Socket path for this backend instance's tmux server (port-suffixed). */
export function getTmuxSocketPath(): string {
  return join(getTmuxSocketDir(), `specwright-${backendPort()}.sock`);
}

/** Path to the tracked tmux config shipped with the repo (`ui/config/tmux-cloud.conf`). */
export function getTmuxConfigPath(): string {
  return join(__dirname, '../../../config/tmux-cloud.conf');
}
