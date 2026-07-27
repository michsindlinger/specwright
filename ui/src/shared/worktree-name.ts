/**
 * Naming rules for user-supplied Cloud Terminal worktree names.
 *
 * Shared between server and frontend on purpose: the picker shows a live
 * preview of the resulting directory, the server derives the real one. The
 * server ALWAYS re-derives — the client value is never trusted.
 */

/**
 * Upper bound on the raw string accepted over the wire, checked *before* any
 * normalization. Guards against a client shipping a megabyte of text through
 * `normalize()` + regex passes only to be truncated to 40 chars afterwards.
 */
export const MAX_WORKTREE_NAME_INPUT = 200;

/** Upper bound on the derived slug — keeps paths and `git branch` output readable. */
export const MAX_WORKTREE_NAME_LENGTH = 40;

/**
 * The shape `CloudTerminalManager.generateSessionId()` produces
 * (`cloud-${Date.now()}-${counter}`).
 *
 * Reserved for auto-named sessions: a user squatting this pattern could park a
 * worktree on the exact name a future unnamed session will pick, and that
 * session would then fail to start for no reason the user could see.
 */
export const RESERVED_WORKTREE_NAME_RE = /^cloud-\d+-\d+$/;

/**
 * Derives a filesystem- and git-ref-safe slug from arbitrary user input.
 *
 * Derive-then-validate: the output matches `/^[a-z0-9][a-z0-9-]*$/` by
 * construction, so there is no blocklist to keep in sync. `/`, `\`, `..`, a
 * leading `-`, `~ ^ : ? * [ @{` and control characters — every traversal
 * building block and every `git check-ref-format` violation — simply cannot
 * survive the transform.
 *
 * A ref may not END in `.lock`; since dots do not survive, such a ref is
 * unconstructible. Note that `foo.lock` is not *rejected* — it becomes
 * `foo-lock`, which is perfectly valid.
 *
 * ASCII-only, deliberately. NFKD plus stripping combining marks resolves Latin
 * diacritics (é→e, ü→u). NOT covered, and therefore collapsed to `-`: ß, Greek,
 * Cyrillic, CJK, emoji, ZWJ/RTL markers. Such input generally yields the empty
 * string; callers surface that as INVALID_WORKTREE_NAME naming the permitted
 * alphabet, rather than silently creating a directory called nothing.
 *
 * @returns the slug, or `''` when nothing usable remains
 */
export function slugifyWorktreeName(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_WORKTREE_NAME_LENGTH)
    // The slice can expose a trailing dash that was interior before.
    .replace(/-+$/, '');
}
