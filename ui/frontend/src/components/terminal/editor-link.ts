/**
 * editor-link — the „In VS Code öffnen" link of a session (INT-2026-028).
 *
 * Pure functions, no DOM: aos-vscode-knopf renders what `vscodeZiel` returns.
 * The folder is the session's `effectiveCwd` (ground truth from the backend,
 * shell sessions included); the remote host comes from the settings field
 * (empty = local link). POSIX paths only — the backend runs on macOS and Linux
 * exclusively (tmux), Windows is not supported.
 */

import type { TerminalSession } from './aos-cloud-terminal-sidebar.js';

/** `vscode://file/<abs>` locally, `vscode://vscode-remote/ssh-remote+<host><abs>` remotely; path encoded per segment. */
export function buildVscodeUri(cwd: string, remoteHost: string): string {
  const path = cwd.split('/').map(encodeURIComponent).join('/');
  return remoteHost ? `vscode://vscode-remote/ssh-remote+${remoteHost}${path}` : `vscode://file${path}`;
}

/**
 * Link for a session, or `null` when the button must not show: folder not yet
 * known / empty / not absolute (AK-05), or the session is not running
 * (`active` and `paused` count as running, like cloud-terminal.service).
 */
export function vscodeZiel(
  session: Pick<TerminalSession, 'status' | 'effectiveCwd'>,
  remoteHost: string,
): string | null {
  if (session.status !== 'active' && session.status !== 'paused') return null;
  const cwd = session.effectiveCwd;
  if (!cwd || !cwd.startsWith('/')) return null;
  return buildVscodeUri(cwd, remoteHost);
}
