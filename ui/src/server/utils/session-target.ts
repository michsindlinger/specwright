/**
 * Parsing and authorization for the Cloud Terminal session target
 * ("where should this session run?").
 *
 * Two responsibilities, deliberately separated:
 *
 *  1. `parseSessionTarget` — wire → domain. Also records whether the client
 *     *chose* a target or whether we defaulted one in. That distinction drives
 *     backwards compatibility: a legacy client that sends no target must keep
 *     the old silent-degrade behaviour, while an explicit user click deserves
 *     an error rather than a surprise.
 *
 *  2. `resolveExistingWorktreeTarget` — authorization. The requested path must
 *     appear in `git worktree list` for the resolved main repo. This is an
 *     exact-match allowlist, NOT a prefix check: `../../../etc` simply is not
 *     in the list, so traversal and foreign-repo paths are rejected without
 *     any string-based defence.
 */

import { isAbsolute } from 'path';
import type { CloudTerminalSessionTarget } from '../../shared/types/cloud-terminal.protocol.js';
import { CLOUD_TERMINAL_ERROR_CODES } from '../../shared/types/cloud-terminal.protocol.js';
import { listRepoWorktrees, pathKey } from './git-worktree-list.js';
import {
  slugifyWorktreeName,
  MAX_WORKTREE_NAME_INPUT,
  RESERVED_WORKTREE_NAME_RE,
} from '../../shared/worktree-name.js';

/** Error carrying a CLOUD_TERMINAL_ERROR_CODES value for the WS error response. */
export class SessionTargetError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'SessionTargetError';
  }
}

/**
 * A parsed target plus whether it came from the client or from the default.
 * `explicit: false` means "no sessionTarget on the wire" — legacy behaviour
 * must be preserved for those callers.
 */
export interface ParsedTarget {
  target: CloudTerminalSessionTarget;
  explicit: boolean;
}

/**
 * Wire → domain. Absent/null ⇒ `{kind:'new-worktree'}` with `explicit:false`.
 *
 * @throws SessionTargetError(INVALID_SESSION_TARGET) on unknown kind, missing
 *   path, or a non-absolute path (checked before the allowlist so relative
 *   input can never be resolved against an arbitrary cwd).
 */
export function parseSessionTarget(raw: unknown): ParsedTarget {
  if (raw === undefined || raw === null) {
    return { target: { kind: 'new-worktree' }, explicit: false };
  }

  if (typeof raw !== 'object') {
    throw new SessionTargetError(
      CLOUD_TERMINAL_ERROR_CODES.INVALID_SESSION_TARGET,
      'sessionTarget must be an object'
    );
  }

  const kind = (raw as { kind?: unknown }).kind;

  if (kind === 'new-worktree') return parseNewWorktreeTarget(raw);
  if (kind === 'main') return { target: { kind: 'main' }, explicit: true };

  if (kind === 'existing-worktree') {
    const path = (raw as { path?: unknown }).path;
    if (typeof path !== 'string' || path.length === 0) {
      throw new SessionTargetError(
        CLOUD_TERMINAL_ERROR_CODES.INVALID_SESSION_TARGET,
        'sessionTarget.path is required for kind "existing-worktree"'
      );
    }
    if (!isAbsolute(path)) {
      throw new SessionTargetError(
        CLOUD_TERMINAL_ERROR_CODES.INVALID_SESSION_TARGET,
        `sessionTarget.path must be absolute, got "${path}"`
      );
    }
    return { target: { kind: 'existing-worktree', path }, explicit: true };
  }

  throw new SessionTargetError(
    CLOUD_TERMINAL_ERROR_CODES.INVALID_SESSION_TARGET,
    `Unknown sessionTarget.kind: ${JSON.stringify(kind)}`
  );
}

/**
 * `kind: 'new-worktree'` with its optional user-chosen name.
 *
 * Absent or empty name ⇒ pre-name-field behaviour verbatim (worktree named
 * after the session id). Anything else is slugged here so the rest of the
 * server only ever sees a validated `[a-z0-9-]` slug.
 *
 * Message language follows the convention in this codebase: protocol
 * violations (wrong type, oversized payload) are client bugs and stay English
 * like the rest of this file; errors the *user* caused by typing something
 * surface as a UI banner and are German, like the target errors in
 * `cloud-terminal-manager.ts`.
 */
function parseNewWorktreeTarget(raw: unknown): ParsedTarget {
  const rawName = (raw as { name?: unknown }).name;

  if (rawName === undefined || rawName === null || rawName === '') {
    return { target: { kind: 'new-worktree' }, explicit: true };
  }

  if (typeof rawName !== 'string') {
    throw new SessionTargetError(
      CLOUD_TERMINAL_ERROR_CODES.INVALID_WORKTREE_NAME,
      'sessionTarget.name must be a string'
    );
  }

  // Bound the input BEFORE normalizing — the 40-char cap applies to the output.
  if (rawName.length > MAX_WORKTREE_NAME_INPUT) {
    throw new SessionTargetError(
      CLOUD_TERMINAL_ERROR_CODES.INVALID_WORKTREE_NAME,
      `sessionTarget.name exceeds ${MAX_WORKTREE_NAME_INPUT} characters`
    );
  }

  const name = slugifyWorktreeName(rawName);

  if (!name) {
    throw new SessionTargetError(
      CLOUD_TERMINAL_ERROR_CODES.INVALID_WORKTREE_NAME,
      'Name enthält keine verwertbaren Zeichen — erlaubt sind a–z, 0–9 und Bindestrich.'
    );
  }

  if (RESERVED_WORKTREE_NAME_RE.test(name)) {
    throw new SessionTargetError(
      CLOUD_TERMINAL_ERROR_CODES.INVALID_WORKTREE_NAME,
      'Dieses Namensschema ist für automatisch benannte Sessions reserviert.'
    );
  }

  return { target: { kind: 'new-worktree', name }, explicit: true };
}

/**
 * Validates an `existing-worktree` target against the repo's actual worktree
 * list and returns the normalized on-disk path to use as cwd.
 *
 * Rejections:
 * - not registered as a worktree of this repo → TARGET_NOT_A_WORKTREE
 *   (this is what stops traversal and foreign paths — no prefix matching)
 * - registered but prunable/missing on disk  → TARGET_NOT_FOUND
 * - `git worktree lock`ed                    → TARGET_NOT_A_WORKTREE
 * - the main worktree itself                 → INVALID_SESSION_TARGET
 *   (callers must use `kind:'main'` for that, which has different semantics:
 *    no SPECWRIGHT_MAIN_PROJECT_PATH, no .mcp.json seeding)
 */
export async function resolveExistingWorktreeTarget(
  mainProjectPath: string,
  requestedPath: string
): Promise<string> {
  const key = pathKey(requestedPath);
  const info = await listRepoWorktrees(mainProjectPath);

  if (!info.isGitRepo) {
    throw new SessionTargetError(
      CLOUD_TERMINAL_ERROR_CODES.TARGET_NOT_A_WORKTREE,
      `Not a git repository: ${mainProjectPath}`
    );
  }

  const entry = info.entries.find((e) => e.path === key);
  if (!entry) {
    throw new SessionTargetError(
      CLOUD_TERMINAL_ERROR_CODES.TARGET_NOT_A_WORKTREE,
      `Not a worktree of this repository: ${requestedPath}`
    );
  }

  if (entry.prunable) {
    throw new SessionTargetError(
      CLOUD_TERMINAL_ERROR_CODES.TARGET_NOT_FOUND,
      `Worktree is registered but missing on disk: ${requestedPath}`
    );
  }

  if (entry.locked) {
    throw new SessionTargetError(
      CLOUD_TERMINAL_ERROR_CODES.TARGET_NOT_A_WORKTREE,
      `Worktree is locked: ${requestedPath}`
    );
  }

  if (info.mainWorktreePath && key === info.mainWorktreePath) {
    throw new SessionTargetError(
      CLOUD_TERMINAL_ERROR_CODES.INVALID_SESSION_TARGET,
      'Use sessionTarget kind "main" for the main worktree'
    );
  }

  return key;
}
