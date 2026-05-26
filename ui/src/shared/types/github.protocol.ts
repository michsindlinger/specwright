/**
 * GitHub Protocol Types
 *
 * Defines the contract for GitHub PAT (Personal Access Token) WebSocket
 * communication. Used by github-config (backend) and Settings View (frontend).
 *
 * The PAT is used by git.service.ts and cloud-terminal-manager.ts to authenticate
 * `git push` against https://github.com/* via a host-scoped credential helper.
 */

// ============================================================================
// Validation / Redaction Regex (shared constants)
// ============================================================================

/**
 * Classic GitHub PAT pattern: `ghp_` + 36 alphanumeric chars.
 * Used for both validation (full match) and redaction (substring match).
 */
export const GHP_TOKEN_PATTERN = /ghp_[A-Za-z0-9]{36,}/;

/**
 * Fine-grained GitHub PAT pattern: `github_pat_` + 82+ chars (letters, digits, _).
 * Used for both validation (full match) and redaction (substring match).
 */
export const GITHUB_PAT_TOKEN_PATTERN = /github_pat_[A-Za-z0-9_]{82,}/;

/**
 * Full-match regex for PAT input validation. Anchored.
 */
export const GITHUB_PAT_VALIDATION_REGEX = new RegExp(
  `^(?:${GHP_TOKEN_PATTERN.source}|${GITHUB_PAT_TOKEN_PATTERN.source})$`,
);

/**
 * Global regex for redacting any PAT-shaped substring from logs/errors.
 */
export const GITHUB_PAT_REDACTION_REGEX = new RegExp(
  `${GHP_TOKEN_PATTERN.source}|${GITHUB_PAT_TOKEN_PATTERN.source}`,
  'g',
);

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Token prefix identifier (without trailing underscore).
 * - `ghp` = classic PAT (`ghp_*`)
 * - `github_pat` = fine-grained PAT (`github_pat_*`)
 */
export type GithubTokenPrefix = 'ghp' | 'github_pat';

/**
 * Persisted GitHub config (encrypted form). Stored in `ui/config/github-config.json`.
 * Either `patEncrypted` (when SPECWRIGHT_SECRET_KEY is set) or `patPlaintext` (local-dev fallback).
 */
export interface GithubConfigEncrypted {
  /** AES-256-GCM ciphertext (hex) */
  patEncrypted: string;
  /** AES-256-GCM IV (hex, 12 bytes) */
  iv: string;
  /** AES-256-GCM auth tag (hex, 16 bytes) */
  authTag: string;
  /** scrypt salt (hex, 16 bytes) */
  salt: string;
  /** Token prefix for UI display (no underscore) */
  prefix: GithubTokenPrefix;
}

export interface GithubConfigPlaintext {
  /** PAT in plaintext (only used when SPECWRIGHT_SECRET_KEY is not set) */
  patPlaintext: string;
  /** Token prefix for UI display (no underscore) */
  prefix: GithubTokenPrefix;
}

export type GithubConfigStored = GithubConfigEncrypted | GithubConfigPlaintext | Record<string, never>;

/**
 * Safe GitHub config sent to frontend (no PAT value).
 */
export interface GithubConfigStatus {
  /** Whether a PAT is currently configured */
  patConfigured: boolean;
  /** Token prefix for UI display (only present when patConfigured) */
  tokenPrefix?: GithubTokenPrefix;
}

// ============================================================================
// Settings Message Types
// ============================================================================

/**
 * GitHub settings message types for WebSocket communication
 */
export type GithubSettingsMessageType =
  // Client -> Server
  | 'settings.github.get'
  | 'settings.github.update'
  | 'settings.github.clear'
  // Server -> Client
  | 'settings.github'
  | 'settings.error';

// ============================================================================
// Client -> Server Messages
// ============================================================================

/**
 * Request current GitHub configuration status
 */
export interface GithubSettingsGetMessage {
  type: 'settings.github.get';
  timestamp: string;
}

/**
 * Update GitHub configuration (set a new PAT)
 */
export interface GithubSettingsUpdateMessage {
  type: 'settings.github.update';
  /** New GitHub Personal Access Token */
  pat: string;
  timestamp: string;
}

/**
 * Clear stored GitHub PAT
 */
export interface GithubSettingsClearMessage {
  type: 'settings.github.clear';
  timestamp: string;
}

// ============================================================================
// Server -> Client Messages
// ============================================================================

/**
 * GitHub configuration status response (no PAT value exposed)
 */
export interface GithubSettingsResponseMessage {
  type: 'settings.github';
  config: GithubConfigStatus;
  timestamp: string;
}
