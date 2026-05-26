/**
 * GitHub Configuration Storage
 *
 * Persists a single GitHub Personal Access Token (PAT) for the droplet/instance.
 * Used by git.service.ts (backend pushes) and cloud-terminal-manager.ts
 * (manual `git push` in cloud terminals) to authenticate against github.com.
 *
 * Storage:
 * - When SPECWRIGHT_SECRET_KEY is set: AES-256-GCM encrypted (random salt+IV per write)
 * - When not set (local dev): plaintext with a warning log
 *
 * Layout mirrors voice-config.ts (single-tenant, file-backed, in-memory cached).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  GithubConfigStatus,
  GithubConfigStored,
  GithubTokenPrefix,
} from '../shared/types/github.protocol.js';
import { GITHUB_PAT_VALIDATION_REGEX } from '../shared/types/github.protocol.js';
import {
  decryptSecret,
  encryptSecret,
  hasSecretKey,
  SecretCryptoError,
} from './utils/secret-crypto.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default config path. Overridable via SPECWRIGHT_GITHUB_CONFIG_PATH for tests
// so concurrent test files don't race on the same file.
const CONFIG_PATH =
  process.env.SPECWRIGHT_GITHUB_CONFIG_PATH || join(__dirname, '../../config/github-config.json');

let cachedConfig: GithubConfigStored | null = null;

function loadConfig(): GithubConfigStored {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (existsSync(CONFIG_PATH)) {
    try {
      const data = readFileSync(CONFIG_PATH, 'utf-8');
      cachedConfig = JSON.parse(data) as GithubConfigStored;
      console.log('[GithubConfig] Loaded config from:', CONFIG_PATH);
      return cachedConfig;
    } catch (err) {
      console.warn('[GithubConfig] Failed to load config file, using empty config:', err);
    }
  } else {
    console.log('[GithubConfig] Config file not found, using empty config');
  }

  cachedConfig = {};
  return cachedConfig;
}

function saveConfig(config: GithubConfigStored): void {
  const configDir = dirname(CONFIG_PATH);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  cachedConfig = config;
  console.log('[GithubConfig] Saved config to:', CONFIG_PATH);
}

function detectPrefix(pat: string): GithubTokenPrefix {
  if (pat.startsWith('github_pat_')) return 'github_pat';
  return 'ghp';
}

function isEncrypted(c: GithubConfigStored): c is import('../shared/types/github.protocol.js').GithubConfigEncrypted {
  return 'patEncrypted' in c && typeof (c as { patEncrypted?: unknown }).patEncrypted === 'string';
}

function isPlaintext(c: GithubConfigStored): c is import('../shared/types/github.protocol.js').GithubConfigPlaintext {
  return 'patPlaintext' in c && typeof (c as { patPlaintext?: unknown }).patPlaintext === 'string';
}

/**
 * Load GitHub config and return safe status (no PAT value).
 */
export function loadGithubConfigStatus(): GithubConfigStatus {
  const c = loadConfig();
  if (isEncrypted(c) || isPlaintext(c)) {
    return { patConfigured: true, tokenPrefix: c.prefix };
  }
  return { patConfigured: false };
}

/**
 * Load the decrypted PAT. Backend-only. Returns null when not configured
 * or when decryption fails (logs warning, never throws).
 */
export function loadGithubPat(): string | null {
  const c = loadConfig();
  if (isEncrypted(c)) {
    try {
      return decryptSecret({
        ciphertext: c.patEncrypted,
        iv: c.iv,
        authTag: c.authTag,
        salt: c.salt,
      });
    } catch (err) {
      if (err instanceof SecretCryptoError) {
        console.warn('[GithubConfig] Failed to decrypt PAT:', err.message);
      } else {
        console.warn('[GithubConfig] Unexpected error decrypting PAT:', err);
      }
      return null;
    }
  }
  if (isPlaintext(c)) {
    return c.patPlaintext;
  }
  return null;
}

/**
 * Persist a new PAT. Validates format and stores encrypted (if master key set)
 * or plaintext with a warning. Returns the new status (no PAT value).
 */
export function updateGithubPat(pat: string): GithubConfigStatus {
  const trimmed = pat.trim();
  if (!GITHUB_PAT_VALIDATION_REGEX.test(trimmed)) {
    throw new Error(
      'Invalid GitHub PAT format. Must start with `ghp_` (36+ chars) or `github_pat_` (82+ chars).',
    );
  }

  const prefix = detectPrefix(trimmed);

  let next: GithubConfigStored;
  if (hasSecretKey()) {
    const payload = encryptSecret(trimmed);
    next = {
      patEncrypted: payload.ciphertext,
      iv: payload.iv,
      authTag: payload.authTag,
      salt: payload.salt,
      prefix,
    };
  } else {
    console.warn(
      '[GithubConfig] SPECWRIGHT_SECRET_KEY not set — storing PAT unencrypted. Local-dev only.',
    );
    next = { patPlaintext: trimmed, prefix };
  }

  saveConfig(next);
  return { patConfigured: true, tokenPrefix: prefix };
}

/**
 * Clear the stored PAT.
 */
export function clearGithubPat(): void {
  saveConfig({});
}

/**
 * Test-only: reset the in-memory cache so vitest tests can re-read the file.
 */
export function _resetGithubConfigCacheForTests(): void {
  cachedConfig = null;
}
