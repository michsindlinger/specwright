import { describe, it, expect } from 'vitest';
import { redactGithubTokens } from '../../src/server/utils/redact-secrets.js';
import {
  GITHUB_PAT_REDACTION_REGEX,
  GITHUB_PAT_VALIDATION_REGEX,
} from '../../src/shared/types/github.protocol.js';

const VALID_GHP = 'ghp_' + 'A'.repeat(36);
const VALID_FINE = 'github_pat_' + 'B'.repeat(82);

describe('redactGithubTokens', () => {
  it('redacts classic ghp_ tokens', () => {
    const input = `pushed via ${VALID_GHP} now`;
    expect(redactGithubTokens(input)).toBe('pushed via <REDACTED> now');
  });

  it('redacts fine-grained github_pat_ tokens', () => {
    const input = `auth=${VALID_FINE}`;
    expect(redactGithubTokens(input)).toBe('auth=<REDACTED>');
  });

  it('redacts multiple tokens in one string', () => {
    const input = `${VALID_GHP} and ${VALID_FINE}`;
    expect(redactGithubTokens(input)).toBe('<REDACTED> and <REDACTED>');
  });

  it('leaves token-free text untouched', () => {
    const input = 'no secrets here, just words and code';
    expect(redactGithubTokens(input)).toBe(input);
  });

  it('handles empty / undefined input gracefully', () => {
    expect(redactGithubTokens('')).toBe('');
  });
});

describe('regex constants are consistent', () => {
  it('validation accepts what redaction would catch', () => {
    expect(GITHUB_PAT_VALIDATION_REGEX.test(VALID_GHP)).toBe(true);
    expect(GITHUB_PAT_VALIDATION_REGEX.test(VALID_FINE)).toBe(true);
    // Redaction must match these tokens too — reset lastIndex for global regex
    GITHUB_PAT_REDACTION_REGEX.lastIndex = 0;
    expect(GITHUB_PAT_REDACTION_REGEX.test(VALID_GHP)).toBe(true);
    GITHUB_PAT_REDACTION_REGEX.lastIndex = 0;
    expect(GITHUB_PAT_REDACTION_REGEX.test(VALID_FINE)).toBe(true);
  });

  it('validation rejects too-short / malformed tokens', () => {
    expect(GITHUB_PAT_VALIDATION_REGEX.test('ghp_short')).toBe(false);
    expect(GITHUB_PAT_VALIDATION_REGEX.test('github_pat_short')).toBe(false);
    expect(GITHUB_PAT_VALIDATION_REGEX.test('not_a_token_at_all')).toBe(false);
    expect(GITHUB_PAT_VALIDATION_REGEX.test('')).toBe(false);
  });

  it('validation does NOT match a token embedded in a larger string', () => {
    expect(GITHUB_PAT_VALIDATION_REGEX.test(`prefix ${VALID_GHP}`)).toBe(false);
  });
});
