/**
 * Git authentication helpers
 *
 * Builds host-scoped credential-helper args and env for `git push`/`pull`
 * against github.com, using a PAT from github-config. Also maps common
 * authentication-error patterns from git stderr to user-actionable messages.
 *
 * Extracted from git.service.ts so the logic is unit-testable in isolation.
 */

import { loadGithubConfigStatus, loadGithubPat } from '../github-config.js';

/**
 * Host-scoped git credential helper. Resolves credentials only for
 * https://github.com/* and reads the PAT from the GITHUB_TOKEN env var.
 * The doubled `-c credential.https://github.com.helper=` first clears any
 * inherited helper so SSH-only setups are not polluted.
 */
export const GITHUB_CREDENTIAL_HELPER_SNIPPET =
  '!f() { test "$1" = "get" && printf "username=x-access-token\\npassword=%s\\n" "$GITHUB_TOKEN"; }; f';

export interface GithubAuthOverrides {
  extraGitArgs: string[];
  env: Record<string, string>;
}

/**
 * Returns the args + env needed to authenticate against github.com when a PAT
 * is configured. Returns null when no PAT is configured (so existing SSH-based
 * setups continue to work unchanged).
 */
export function buildGithubAuthOverrides(): GithubAuthOverrides | null {
  if (!loadGithubConfigStatus().patConfigured) {
    return null;
  }
  const pat = loadGithubPat();
  if (!pat) {
    return null;
  }
  return {
    extraGitArgs: [
      '-c',
      'credential.https://github.com.helper=',
      '-c',
      `credential.https://github.com.helper=${GITHUB_CREDENTIAL_HELPER_SNIPPET}`,
    ],
    env: {
      GITHUB_TOKEN: pat,
      GIT_ASKPASS: '/dev/null',
      GIT_TERMINAL_PROMPT: '0',
    },
  };
}

/**
 * Map common authentication error patterns from git stderr to a user-actionable
 * message. Returns null when no auth pattern matches.
 */
export function detectAuthError(stderr: string): string | null {
  if (!stderr) return null;
  if (stderr.includes('Permission denied (publickey)')) {
    return 'No SSH key available and no PAT configured. Add a GitHub PAT in Settings > Git Integration.';
  }
  if (stderr.includes('could not read Username') || stderr.includes('terminal prompts disabled')) {
    return 'No GitHub PAT configured and no SSH key available. Add a PAT in Settings > Git Integration.';
  }
  if (
    stderr.includes('Authentication failed') ||
    stderr.includes('Invalid username or password') ||
    stderr.includes('Bad credentials')
  ) {
    return 'GitHub PAT is invalid or expired. Update it in Settings > Git Integration.';
  }
  if (stderr.includes('The requested URL returned error: 403')) {
    return 'GitHub returned 403. The PAT is missing the `repo` scope.';
  }
  if (stderr.includes('The requested URL returned error: 404')) {
    return 'GitHub returned 404. The repository may not exist or the PAT has no access.';
  }
  return null;
}
