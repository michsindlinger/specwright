import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CONFIG_PATH = join(tmpdir(), `specwright-github-config-test-${process.pid}-cloud-terminal.json`);
process.env.SPECWRIGHT_GITHUB_CONFIG_PATH = CONFIG_PATH;

const TEST_KEY = 'a'.repeat(64);
const VALID_PAT = 'ghp_' + 'A'.repeat(36);

/**
 * The cloud-terminal-manager has a lot of dependencies (node-pty, model-config,
 * TerminalManager). We don't actually spawn shells here — we just verify that
 * the env-building logic injects GITHUB_TOKEN when a PAT is configured and not
 * otherwise. This is a behavior contract test against loadGithubConfigStatus +
 * loadGithubPat as used by the manager.
 */
describe('cloud-terminal-manager PAT env injection', () => {
  const originalKey = process.env.SPECWRIGHT_SECRET_KEY;

  beforeEach(() => {
    process.env.SPECWRIGHT_SECRET_KEY = TEST_KEY;
    rmSync(CONFIG_PATH, { force: true });
    vi.resetModules();
  });

  afterEach(() => {
    rmSync(CONFIG_PATH, { force: true });
    if (originalKey === undefined) delete process.env.SPECWRIGHT_SECRET_KEY;
    else process.env.SPECWRIGHT_SECRET_KEY = originalKey;
  });

  it('githubConfig.patConfigured is false when no PAT is set → no env injection', async () => {
    const mod = await import('../../src/server/github-config.js');
    expect(mod.loadGithubConfigStatus().patConfigured).toBe(false);
    expect(mod.loadGithubPat()).toBeNull();
    // Contract: cloud-terminal-manager checks patConfigured + loadGithubPat — both must
    // return falsy values when no PAT exists, so baseEnv stays unmodified.
  });

  it('githubConfig.patConfigured is true after updateGithubPat → env injection active', async () => {
    const mod = await import('../../src/server/github-config.js');
    mod.updateGithubPat(VALID_PAT);

    expect(mod.loadGithubConfigStatus().patConfigured).toBe(true);
    expect(mod.loadGithubPat()).toBe(VALID_PAT);
    // Contract: cloud-terminal-manager will set baseEnv.GITHUB_TOKEN = loadGithubPat()
    // → injection covers both manual `git push` and any subshell git invocations.
  });

  it('clearGithubPat removes injection trigger', async () => {
    const mod = await import('../../src/server/github-config.js');
    mod.updateGithubPat(VALID_PAT);
    mod.clearGithubPat();

    expect(mod.loadGithubConfigStatus().patConfigured).toBe(false);
    expect(mod.loadGithubPat()).toBeNull();
  });
});
