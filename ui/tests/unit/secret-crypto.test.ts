import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  encryptSecret,
  decryptSecret,
  hasSecretKey,
  SecretCryptoError,
} from '../../src/server/utils/secret-crypto.js';

const TEST_KEY = 'a'.repeat(64); // 32 bytes hex

describe('secret-crypto', () => {
  const originalKey = process.env.SPECWRIGHT_SECRET_KEY;

  beforeEach(() => {
    process.env.SPECWRIGHT_SECRET_KEY = TEST_KEY;
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.SPECWRIGHT_SECRET_KEY;
    } else {
      process.env.SPECWRIGHT_SECRET_KEY = originalKey;
    }
  });

  it('hasSecretKey reflects env state', () => {
    expect(hasSecretKey()).toBe(true);
    delete process.env.SPECWRIGHT_SECRET_KEY;
    expect(hasSecretKey()).toBe(false);
  });

  it('roundtrips plaintext through encrypt -> decrypt', () => {
    const plaintext = 'ghp_' + 'A'.repeat(36);
    const payload = encryptSecret(plaintext);
    expect(payload.ciphertext).not.toContain(plaintext);
    expect(decryptSecret(payload)).toBe(plaintext);
  });

  it('produces different ciphertext for the same plaintext (random salt+iv)', () => {
    const plaintext = 'github_pat_' + 'B'.repeat(82);
    const a = encryptSecret(plaintext);
    const b = encryptSecret(plaintext);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.iv).not.toBe(b.iv);
    expect(a.salt).not.toBe(b.salt);
  });

  it('detects tampered ciphertext', () => {
    const payload = encryptSecret('secret');
    const tampered = { ...payload, ciphertext: payload.ciphertext.slice(0, -2) + '00' };
    expect(() => decryptSecret(tampered)).toThrow(SecretCryptoError);
  });

  it('detects tampered auth tag', () => {
    const payload = encryptSecret('secret');
    const tampered = { ...payload, authTag: 'f'.repeat(payload.authTag.length) };
    expect(() => decryptSecret(tampered)).toThrow(SecretCryptoError);
  });

  it('detects tampered salt', () => {
    const payload = encryptSecret('secret');
    const tampered = { ...payload, salt: 'f'.repeat(payload.salt.length) };
    expect(() => decryptSecret(tampered)).toThrow(SecretCryptoError);
  });

  it('fails to decrypt with a different master key', () => {
    const payload = encryptSecret('secret');
    process.env.SPECWRIGHT_SECRET_KEY = 'b'.repeat(64);
    expect(() => decryptSecret(payload)).toThrow(SecretCryptoError);
  });

  it('throws when master key is not set', () => {
    delete process.env.SPECWRIGHT_SECRET_KEY;
    expect(() => encryptSecret('x')).toThrow(SecretCryptoError);
  });

  it('rejects payloads with invalid component lengths', () => {
    const payload = encryptSecret('secret');
    const badSalt = { ...payload, salt: 'aa' };
    expect(() => decryptSecret(badSalt)).toThrow(SecretCryptoError);
  });
});
