import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CONFIG_PATH = join(tmpdir(), `specwright-github-config-test-${process.pid}-github-config.json`);
process.env.SPECWRIGHT_GITHUB_CONFIG_PATH = CONFIG_PATH;

const TEST_KEY = 'a'.repeat(64);
const VALID_GHP = 'ghp_' + 'A'.repeat(36);
const VALID_FINE = 'github_pat_' + 'B'.repeat(82);

async function freshImport() {
  vi.resetModules();
  return import('../../src/server/github-config.js');
}

describe('github-config', () => {
  const originalKey = process.env.SPECWRIGHT_SECRET_KEY;

  beforeEach(() => {
    process.env.SPECWRIGHT_SECRET_KEY = TEST_KEY;
    rmSync(CONFIG_PATH, { force: true });
  });

  afterEach(() => {
    rmSync(CONFIG_PATH, { force: true });
    if (originalKey === undefined) {
      delete process.env.SPECWRIGHT_SECRET_KEY;
    } else {
      process.env.SPECWRIGHT_SECRET_KEY = originalKey;
    }
  });

  it('reports patConfigured=false when no config exists', async () => {
    const mod = await freshImport();
    expect(mod.loadGithubConfigStatus()).toEqual({ patConfigured: false });
    expect(mod.loadGithubPat()).toBeNull();
  });

  it('stores PAT encrypted when SPECWRIGHT_SECRET_KEY is set', async () => {
    const mod = await freshImport();
    const status = mod.updateGithubPat(VALID_GHP);
    expect(status).toEqual({ patConfigured: true, tokenPrefix: 'ghp' });

    const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    expect(raw.patEncrypted).toBeDefined();
    expect(raw.patPlaintext).toBeUndefined();
    expect(raw.iv).toBeDefined();
    expect(raw.salt).toBeDefined();
    expect(raw.prefix).toBe('ghp');

    expect(mod.loadGithubPat()).toBe(VALID_GHP);
  });

  it('falls back to plaintext when SPECWRIGHT_SECRET_KEY is not set', async () => {
    delete process.env.SPECWRIGHT_SECRET_KEY;
    const mod = await freshImport();
    const status = mod.updateGithubPat(VALID_FINE);
    expect(status).toEqual({ patConfigured: true, tokenPrefix: 'github_pat' });

    const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    expect(raw.patPlaintext).toBe(VALID_FINE);
    expect(raw.patEncrypted).toBeUndefined();
    expect(mod.loadGithubPat()).toBe(VALID_FINE);
  });

  it('rejects invalid PAT formats', async () => {
    const mod = await freshImport();
    expect(() => mod.updateGithubPat('not_a_pat')).toThrow(/Invalid GitHub PAT/);
    expect(() => mod.updateGithubPat('ghp_short')).toThrow(/Invalid GitHub PAT/);
    expect(() => mod.updateGithubPat('')).toThrow(/Invalid GitHub PAT/);
  });

  it('clears the stored PAT', async () => {
    const mod = await freshImport();
    mod.updateGithubPat(VALID_GHP);
    mod.clearGithubPat();
    expect(mod.loadGithubConfigStatus()).toEqual({ patConfigured: false });
    expect(mod.loadGithubPat()).toBeNull();
  });

  it('invalidates in-memory cache on update', async () => {
    const mod = await freshImport();
    mod.updateGithubPat(VALID_GHP);
    expect(mod.loadGithubPat()).toBe(VALID_GHP);

    const otherPat = 'github_pat_' + 'C'.repeat(82);
    mod.updateGithubPat(otherPat);
    expect(mod.loadGithubPat()).toBe(otherPat);
  });

  it('detects token prefix correctly', async () => {
    const mod = await freshImport();
    expect(mod.updateGithubPat(VALID_GHP).tokenPrefix).toBe('ghp');
    expect(mod.updateGithubPat(VALID_FINE).tokenPrefix).toBe('github_pat');
  });
});
