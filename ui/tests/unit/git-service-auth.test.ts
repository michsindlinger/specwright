import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CONFIG_PATH = join(tmpdir(), `specwright-github-config-test-${process.pid}-git-auth.json`);
process.env.SPECWRIGHT_GITHUB_CONFIG_PATH = CONFIG_PATH;

const TEST_KEY = 'a'.repeat(64);
const VALID_PAT = 'ghp_' + 'A'.repeat(36);

describe('detectAuthError (git-auth)', () => {
  let detectAuthError: typeof import('../../src/server/services/git-auth.js')['detectAuthError'];

  beforeEach(async () => {
    ({ detectAuthError } = await import('../../src/server/services/git-auth.js'));
  });

  it.each([
    ['Permission denied (publickey).', 'No SSH key'],
    ['fatal: could not read Username for', 'No GitHub PAT'],
    ['terminal prompts disabled', 'No GitHub PAT'],
    ['remote: Authentication failed for', 'invalid or expired'],
    ['Invalid username or password.', 'invalid or expired'],
    ['Bad credentials', 'invalid or expired'],
    ['The requested URL returned error: 403', '`repo` scope'],
    ['The requested URL returned error: 404', 'not exist'],
  ])('maps "%s" to actionable message containing "%s"', (stderr, expectMsg) => {
    const result = detectAuthError(stderr);
    expect(result).not.toBeNull();
    expect(result).toContain(expectMsg);
  });

  it('returns null for unrelated stderr', () => {
    expect(detectAuthError('Everything up-to-date')).toBeNull();
    expect(detectAuthError('Could not resolve host: github.com')).toBeNull();
    expect(detectAuthError('')).toBeNull();
  });
});

describe('buildGithubAuthOverrides (git-auth)', () => {
  const originalKey = process.env.SPECWRIGHT_SECRET_KEY;

  beforeEach(() => {
    process.env.SPECWRIGHT_SECRET_KEY = TEST_KEY;
    rmSync(CONFIG_PATH, { force: true });
  });

  afterEach(() => {
    rmSync(CONFIG_PATH, { force: true });
    if (originalKey === undefined) delete process.env.SPECWRIGHT_SECRET_KEY;
    else process.env.SPECWRIGHT_SECRET_KEY = originalKey;
  });

  async function freshModules() {
    const { vi } = await import('vitest');
    vi.resetModules();
    return {
      auth: await import('../../src/server/services/git-auth.js'),
      config: await import('../../src/server/github-config.js'),
    };
  }

  it('returns null when no PAT is configured', async () => {
    const { auth } = await freshModules();
    expect(auth.buildGithubAuthOverrides()).toBeNull();
  });

  it('returns env + extraGitArgs when PAT is configured', async () => {
    const { auth, config } = await freshModules();
    config.updateGithubPat(VALID_PAT);

    const overrides = auth.buildGithubAuthOverrides();

    expect(overrides).not.toBeNull();
    expect(overrides!.env.GITHUB_TOKEN).toBe(VALID_PAT);
    expect(overrides!.env.GIT_ASKPASS).toBe('/dev/null');
    expect(overrides!.env.GIT_TERMINAL_PROMPT).toBe('0');

    // Doubled -c flag: first clears inherited helper, second installs host-scoped helper
    const args = overrides!.extraGitArgs;
    expect(args[0]).toBe('-c');
    expect(args[1]).toBe('credential.https://github.com.helper=');
    expect(args[2]).toBe('-c');
    expect(args[3]).toMatch(/^credential\.https:\/\/github\.com\.helper=!f\(\) \{/);
    // Helper must read from $GITHUB_TOKEN, not hardcode the PAT
    expect(args[3]).toContain('$GITHUB_TOKEN');
    expect(args[3]).not.toContain(VALID_PAT);
  });
});
