/**
 * Secret Crypto Utility
 *
 * AES-256-GCM encryption with per-encryption random salt + IV.
 * Master key derived from SPECWRIGHT_SECRET_KEY environment variable via scrypt.
 *
 * Used for at-rest encryption of sensitive config values (e.g., GitHub PAT).
 * In single-tenant cloud deployments, the master key is generated once by
 * setup-ui-cloud.sh and persisted to /etc/specwright-ui/secret.env (mode 0600).
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const ENV_VAR_NAME = 'SPECWRIGHT_SECRET_KEY';

export class SecretCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecretCryptoError';
  }
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
  salt: string;
}

/**
 * Whether SPECWRIGHT_SECRET_KEY is set in the environment.
 * Callers can use this to decide between encrypted and plaintext storage paths.
 */
export function hasSecretKey(): boolean {
  return typeof process.env[ENV_VAR_NAME] === 'string' && process.env[ENV_VAR_NAME]!.length > 0;
}

function deriveKey(salt: Buffer): Buffer {
  const masterKey = process.env[ENV_VAR_NAME];
  if (!masterKey) {
    throw new SecretCryptoError(`${ENV_VAR_NAME} environment variable is not set`);
  }
  return scryptSync(masterKey, salt, KEY_LENGTH);
}

/**
 * Encrypt a plaintext string using AES-256-GCM with a random salt + IV.
 * The salt is persisted alongside the ciphertext so future deployments can
 * rotate the master key while keeping derived keys per-record.
 */
export function encryptSecret(plaintext: string): EncryptedPayload {
  if (!hasSecretKey()) {
    throw new SecretCryptoError(`Cannot encrypt: ${ENV_VAR_NAME} not set`);
  }

  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(salt);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertextBuf = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertextBuf.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    salt: salt.toString('hex'),
  };
}

/**
 * Decrypt an EncryptedPayload back to its plaintext.
 * Throws SecretCryptoError on tampering (auth tag mismatch) or missing key.
 */
export function decryptSecret(payload: EncryptedPayload): string {
  if (!hasSecretKey()) {
    throw new SecretCryptoError(`Cannot decrypt: ${ENV_VAR_NAME} not set`);
  }

  let salt: Buffer;
  let iv: Buffer;
  let authTag: Buffer;
  let ciphertext: Buffer;
  try {
    salt = Buffer.from(payload.salt, 'hex');
    iv = Buffer.from(payload.iv, 'hex');
    authTag = Buffer.from(payload.authTag, 'hex');
    ciphertext = Buffer.from(payload.ciphertext, 'hex');
  } catch {
    throw new SecretCryptoError('Encrypted payload contains invalid hex data');
  }

  if (salt.length !== SALT_LENGTH || iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new SecretCryptoError('Encrypted payload has invalid component lengths');
  }

  const key = deriveKey(salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const plaintextBuf = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintextBuf.toString('utf8');
  } catch (err) {
    throw new SecretCryptoError(
      `Decryption failed (likely tampering or wrong master key): ${(err as Error).message}`,
    );
  }
}
