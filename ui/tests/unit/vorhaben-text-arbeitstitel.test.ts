/**
 * INT-2026-022 (FA-14): the working title of a pending intent — first
 * non-empty line of the „Neue Absicht" text, at most 80 characters, pure.
 */
import { describe, it, expect } from 'vitest';
import { arbeitstitelAus } from '../../src/shared/vorhaben-text.js';
import { ARBEITSTITEL_MAX_CHARS } from '../../src/shared/types/vorhaben.protocol.js';

describe('arbeitstitelAus (FA-14)', () => {
  it('takes the first non-empty line, trimmed, whitespace runs collapsed', () => {
    expect(arbeitstitelAus('Die Liste sortiert falsch, seit gestern.\nZweite Zeile')).toBe('Die Liste sortiert falsch, seit gestern.');
    expect(arbeitstitelAus('\n\n   \n  Erst hier   steht\tText  \nnoch mehr')).toBe('Erst hier steht Text');
    expect(arbeitstitelAus('CRLF\r\nzweite')).toBe('CRLF');
  });

  it('cuts to 80 characters: 81 → 79 + „…", 80 stays, counted in characters not bytes', () => {
    expect(ARBEITSTITEL_MAX_CHARS).toBe(80);
    const eighty = 'a'.repeat(80);
    expect(arbeitstitelAus(eighty)).toBe(eighty);
    const out = arbeitstitelAus('b'.repeat(81));
    expect(out).toBe(`${'b'.repeat(79)}…`);
    expect([...out]).toHaveLength(80);
    const umlaute = 'ä'.repeat(81);
    expect([...arbeitstitelAus(umlaute)]).toHaveLength(80);
  });

  it('keeps an image path token as typed (INT-2026-020 paste) and drops control characters', () => {
    expect(arbeitstitelAus('Bitte ansehen: /rt/intent-paste/img-1.png  danke')).toBe('Bitte ansehen: /rt/intent-paste/img-1.png danke');
    expect(arbeitstitelAus('kein \x1b[31mEscape\x07 hier')).toBe('kein [31mEscape hier');
  });

  it('only whitespace → empty string (the caller stores nothing, the UI shows the session name — review E13)', () => {
    expect(arbeitstitelAus('')).toBe('');
    expect(arbeitstitelAus('   \n\t\n  ')).toBe('');
  });
});
