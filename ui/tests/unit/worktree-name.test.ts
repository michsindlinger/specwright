/**
 * Unit tests for the user-supplied worktree name slug.
 *
 * The contract is derive-then-validate: the output matches
 * /^[a-z0-9][a-z0-9-]*$/ by construction, so these tests mostly assert that
 * hostile or exotic input cannot produce anything outside that alphabet — and
 * that the deliberate ASCII-only limitation behaves as documented rather than
 * silently yielding a directory called nothing.
 */

import { describe, it, expect } from 'vitest';
import {
  slugifyWorktreeName,
  MAX_WORKTREE_NAME_LENGTH,
  MAX_WORKTREE_NAME_INPUT,
  RESERVED_WORKTREE_NAME_RE,
} from '../../src/shared/worktree-name.js';

const SLUG_SHAPE = /^[a-z0-9][a-z0-9-]*$/;

describe('slugifyWorktreeName — ordinary input', () => {
  it('lowercases and joins words with dashes', () => {
    expect(slugifyWorktreeName('Refactor Auth Flow')).toBe('refactor-auth-flow');
  });

  it('strips punctuation and collapses separator runs', () => {
    expect(slugifyWorktreeName('Refactor: Auth-Flow!!!')).toBe('refactor-auth-flow');
    expect(slugifyWorktreeName('a___b   c')).toBe('a-b-c');
  });

  it('trims leading and trailing separators', () => {
    expect(slugifyWorktreeName('---abc---')).toBe('abc');
    expect(slugifyWorktreeName('  spaced  ')).toBe('spaced');
  });

  it('keeps digits and an already-valid slug unchanged', () => {
    expect(slugifyWorktreeName('fix-123')).toBe('fix-123');
  });
});

describe('slugifyWorktreeName — Latin diacritics resolve to ASCII', () => {
  it.each([
    ['Änderung', 'anderung'],
    ['Übergröße', 'ubergro-e'], // ß has no NFKD decomposition → separator
    ['café-résumé', 'cafe-resume'],
    ['Ñandú', 'nandu'],
    ['sœur', 's-ur'], // œ ligature has no decomposition either
  ])('%s → %s', (input, expected) => {
    expect(slugifyWorktreeName(input)).toBe(expected);
  });
});

describe('slugifyWorktreeName — non-Latin input yields the empty string', () => {
  // Documented limitation: these are not transliterated, they collapse to
  // separators and are then trimmed away. The caller turns '' into a clear
  // INVALID_WORKTREE_NAME rather than creating a nameless directory.
  it.each([
    ['Cyrillic', 'Привет'],
    ['Greek', 'Καλημέρα'],
    ['CJK', '重构认证'],
    ['emoji', '🚀🔥'],
    ['zero-width joiner', '‍‍'],
    ['RTL marker', '‏‎'],
    ['only punctuation', '!!!???'],
    ['only separators', '---___   '],
    ['empty', ''],
  ])('%s → ""', (_label, input) => {
    expect(slugifyWorktreeName(input)).toBe('');
  });
});

describe('slugifyWorktreeName — traversal and git-ref hostility', () => {
  it.each([
    '../../../etc/passwd',
    '..',
    '../..',
    'session/../x',
    'a/b/c',
    'a\\b\\c',
    '~weird^ref:name?',
    'ref*with[globs]',
    'at@{brace}',
    `ctrl${String.fromCharCode(0)}nul`,
    `ctrl${String.fromCharCode(7)}bel`,
    'newline\nhere',
    'tab\there',
    '.',
    '.hidden',
    'trailing.',
    `esc${String.fromCharCode(27)}seq`,
  ])('%s produces a plain slug or nothing', (input) => {
    const slug = slugifyWorktreeName(input);
    if (slug !== '') expect(slug).toMatch(SLUG_SHAPE);
    expect(slug).not.toContain('/');
    expect(slug).not.toContain('\\');
    expect(slug).not.toContain('..');
    expect(slug.startsWith('-')).toBe(false);
  });

  it('cannot produce a ref ending in .lock (dots do not survive)', () => {
    // NOT a rejection: the input is transformed, and `foo-lock` is legal.
    expect(slugifyWorktreeName('foo.lock')).toBe('foo-lock');
    expect(slugifyWorktreeName('foo.lock').endsWith('.lock')).toBe(false);
  });
});

describe('slugifyWorktreeName — length', () => {
  it(`caps the output at ${MAX_WORKTREE_NAME_LENGTH} characters`, () => {
    expect(slugifyWorktreeName('a'.repeat(200))).toHaveLength(MAX_WORKTREE_NAME_LENGTH);
  });

  it('never leaves a trailing dash exposed by the cut', () => {
    // 'aaa…a-bbb' cut exactly at the dash would otherwise end in '-'.
    const input = `${'a'.repeat(MAX_WORKTREE_NAME_LENGTH)} tail`;
    const slug = slugifyWorktreeName(input);
    expect(slug.endsWith('-')).toBe(false);
    expect(slug).toMatch(SLUG_SHAPE);
  });

  it('MAX_WORKTREE_NAME_INPUT bounds the pre-normalization payload', () => {
    expect(MAX_WORKTREE_NAME_INPUT).toBeGreaterThan(MAX_WORKTREE_NAME_LENGTH);
  });
});

describe('RESERVED_WORKTREE_NAME_RE', () => {
  it('matches the generateSessionId shape', () => {
    expect(RESERVED_WORKTREE_NAME_RE.test('cloud-1785063829638-5')).toBe(true);
    expect(RESERVED_WORKTREE_NAME_RE.test('cloud-1-1')).toBe(true);
  });

  it('does not match ordinary names', () => {
    expect(RESERVED_WORKTREE_NAME_RE.test('cloud-native')).toBe(false);
    expect(RESERVED_WORKTREE_NAME_RE.test('refactor-auth')).toBe(false);
    expect(RESERVED_WORKTREE_NAME_RE.test('cloud-123')).toBe(false);
    expect(RESERVED_WORKTREE_NAME_RE.test('my-cloud-1-2')).toBe(false);
  });
});
