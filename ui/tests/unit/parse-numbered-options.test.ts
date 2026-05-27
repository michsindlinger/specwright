import { describe, it, expect } from 'vitest';
import { parseNumberedOptions } from '../../frontend/src/utils/parse-numbered-options.js';

describe('parseNumberedOptions', () => {
  it('returns empty array for empty input', () => {
    expect(parseNumberedOptions('')).toEqual([]);
  });

  it('returns empty array for non-option text', () => {
    expect(parseNumberedOptions('Just some text\nNo options here')).toEqual([]);
  });

  it('returns empty array for single option (min 2 required)', () => {
    expect(parseNumberedOptions('1. Only one option')).toEqual([]);
  });

  it('parses "N. label" format', () => {
    const text = '1. Option A\n2. Option B\n3. Option C';
    expect(parseNumberedOptions(text)).toEqual([
      { index: 1, label: 'Option A' },
      { index: 2, label: 'Option B' },
      { index: 3, label: 'Option C' },
    ]);
  });

  it('parses "N) label" format', () => {
    const text = '1) First\n2) Second';
    expect(parseNumberedOptions(text)).toEqual([
      { index: 1, label: 'First' },
      { index: 2, label: 'Second' },
    ]);
  });

  it('parses "[N] label" format', () => {
    const text = '[1] Alpha\n[2] Beta\n[3] Gamma';
    expect(parseNumberedOptions(text)).toEqual([
      { index: 1, label: 'Alpha' },
      { index: 2, label: 'Beta' },
      { index: 3, label: 'Gamma' },
    ]);
  });

  it('strips ANSI escape codes before parsing', () => {
    const text = '\x1B[32m1. Green option\x1B[0m\n\x1B[33m2. Yellow option\x1B[0m';
    const result = parseNumberedOptions(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ index: 1, label: 'Green option' });
    expect(result[1]).toMatchObject({ index: 2, label: 'Yellow option' });
  });

  it('ignores blank lines between options', () => {
    const text = '1. First option\n\n2. Second option';
    expect(parseNumberedOptions(text)).toEqual([
      { index: 1, label: 'First option' },
      { index: 2, label: 'Second option' },
    ]);
  });

  it('returns last block when multiple option blocks exist', () => {
    const text = [
      'Please choose a file:',
      '1. file-a.ts',
      '2. file-b.ts',
      '',
      'Processing...',
      '',
      'Now select an action:',
      '1. Open',
      '2. Delete',
      '3. Rename',
    ].join('\n');

    const result = parseNumberedOptions(text);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ index: 1, label: 'Open' });
    expect(result[1]).toMatchObject({ index: 2, label: 'Delete' });
    expect(result[2]).toMatchObject({ index: 3, label: 'Rename' });
  });

  it('resets on non-sequential numbers', () => {
    const text = '1. First\n3. Skipped\n1. Restart\n2. Continue';
    expect(parseNumberedOptions(text)).toEqual([
      { index: 1, label: 'Restart' },
      { index: 2, label: 'Continue' },
    ]);
  });

  it('handles options preceded by introductory text', () => {
    const text = 'What would you like to do?\n\n1. Continue\n2. Abort\n3. Retry';
    const result = parseNumberedOptions(text);
    expect(result).toHaveLength(3);
    expect(result[0].label).toBe('Continue');
  });

  it('handles options followed by prompt text', () => {
    const text = '1. Option one\n2. Option two\nEnter choice:';
    const result = parseNumberedOptions(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ index: 1, label: 'Option one' });
  });

  it('handles leading whitespace in option lines', () => {
    const text = '  1. Indented option\n  2. Also indented';
    expect(parseNumberedOptions(text)).toEqual([
      { index: 1, label: 'Indented option' },
      { index: 2, label: 'Also indented' },
    ]);
  });

  it('trims trailing whitespace from labels', () => {
    const text = '1. Trailing space   \n2. Also trailing  ';
    const result = parseNumberedOptions(text);
    expect(result[0].label).toBe('Trailing space');
    expect(result[1].label).toBe('Also trailing');
  });

  it('handles large option set', () => {
    const lines = Array.from({ length: 8 }, (_, i) => `${i + 1}. Item ${i + 1}`).join('\n');
    const result = parseNumberedOptions(lines);
    expect(result).toHaveLength(8);
    expect(result[7]).toMatchObject({ index: 8, label: 'Item 8' });
  });
});
