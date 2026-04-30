import { describe, it, expect } from 'vitest';
import { PlanBufferExtractor } from '../../src/server/utils/plan-buffer-extractor.js';

const extractor = new PlanBufferExtractor();

describe('PlanBufferExtractor.extract', () => {
  it('extracts TUI box content from buffer', () => {
    const buffer = [
      'Some output before',
      '╭─────────────────╮',
      '│ Implementation  │',
      '│ Plan: step 1    │',
      '╰─────────────────╯',
      'Some output after',
    ].join('\n');

    const result = extractor.extract(buffer);
    expect(result).toContain('╭');
    expect(result).toContain('Implementation');
    expect(result).toContain('╰');
  });

  it('returns the LAST TUI box when multiple boxes present', () => {
    const buffer = [
      '╭──────────╮',
      '│ Old plan │',
      '╰──────────╯',
      'some intervening output',
      '╭──────────────╮',
      '│ Newest plan  │',
      '╰──────────────╯',
    ].join('\n');

    const result = extractor.extract(buffer);
    expect(result).toContain('Newest plan');
    expect(result).not.toContain('Old plan');
  });

  it('strips ANSI CSI escape sequences', () => {
    const ansiBuffer = '\x1b[1m\x1b[32m╭──╮\n│Hi│\n╰──╯\x1b[0m';
    const result = extractor.extract(ansiBuffer);
    expect(result).not.toMatch(/\x1b/);
    expect(result).toContain('╭');
  });

  it('strips OSC sequences (terminal title)', () => {
    const oscBuffer = '\x1b]0;Terminal Title\x07╭──╮\n│Ok│\n╰──╯';
    const result = extractor.extract(oscBuffer);
    expect(result).not.toMatch(/\x1b/);
    expect(result).toContain('╭');
  });

  it('strips carriage returns', () => {
    const buffer = '╭──╮\r\n│Hi│\r\n╰──╯\r\n';
    const result = extractor.extract(buffer);
    expect(result).not.toContain('\r');
  });

  it('falls back to last 8KB when no TUI box found', () => {
    const plain = 'A'.repeat(20 * 1024) + 'PLAN_CONTENT';
    const result = extractor.extract(plain);
    expect(result).toContain('PLAN_CONTENT');
    expect(result.length).toBeLessThanOrEqual(8 * 1024);
  });

  it('throws when buffer is empty', () => {
    expect(() => extractor.extract('')).toThrow('no plan content found');
  });

  it('throws when buffer contains only whitespace', () => {
    expect(() => extractor.extract('   \n\t  \n  ')).toThrow('no plan content found');
  });

  it('throws when buffer has only ANSI sequences and whitespace', () => {
    expect(() => extractor.extract('\x1b[1m\x1b[0m  \x1b[32m\x1b[0m')).toThrow('no plan content found');
  });

  it('handles incomplete box (╭ without ╰) by falling back', () => {
    const buffer = '╭──────────\n│ Incomplete plan\nno closing bracket here';
    const result = extractor.extract(buffer);
    // Should fall back since there's no ╰
    expect(result).toContain('Incomplete plan');
  });

  it('handles incomplete box (╰ without preceding ╭) by falling back', () => {
    const buffer = 'some text\n╰──────────\nrest of content here';
    const result = extractor.extract(buffer);
    // ╰ without ╭ before it — should fall back to last 8KB
    expect(result.trim().length).toBeGreaterThan(0);
  });
});
