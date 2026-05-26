/**
 * Secret Redaction Utility
 *
 * Removes GitHub PAT-shaped substrings from arbitrary text before logging
 * or surfacing in error messages. Uses the same regex constants as input
 * validation in shared/types/github.protocol.ts.
 */

import { GITHUB_PAT_REDACTION_REGEX } from '../../shared/types/github.protocol.js';

const REDACTED_PLACEHOLDER = '<REDACTED>';

/**
 * Replace any GitHub PAT-shaped substring (`ghp_*` or `github_pat_*`) with
 * `<REDACTED>`. Safe to call on stdout/stderr from child processes and on
 * Error.message before constructing wrapped errors.
 *
 * @param text - Arbitrary text potentially containing PATs
 * @returns Text with all PAT-shaped substrings replaced
 */
export function redactGithubTokens(text: string): string {
  if (!text) return text;
  return text.replace(GITHUB_PAT_REDACTION_REGEX, REDACTED_PLACEHOLDER);
}
