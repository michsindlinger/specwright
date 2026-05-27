/**
 * Unit tests for CLOG-002: stripAnsi() utility
 *
 * Covers:
 *  - SGR (color/style) sequences
 *  - Cursor-move sequences (CUU, CUD, CHA, ED, EL)
 *  - OSC (window title / hyperlink) with BEL or ST terminator
 *  - Single-char ESC sequences (Fe codes)
 *  - Spinner sample (real npm/pnpm-style frame)
 *  - Idempotence + non-ANSI passthrough
 */

import { describe, it, expect } from 'vitest';
import { stripAnsi, collapseTtyRewrites } from '../../frontend/src/utils/ansi-strip';

describe('stripAnsi', () => {
  it('returns empty string unchanged', () => {
    expect(stripAnsi('')).toBe('');
  });

  it('passes through plain text without ANSI codes', () => {
    expect(stripAnsi('Hello, world!')).toBe('Hello, world!');
  });

  it('strips simple SGR color sequence', () => {
    expect(stripAnsi('\x1B[31mred\x1B[0m')).toBe('red');
  });

  it('strips SGR with multiple params', () => {
    expect(stripAnsi('\x1B[1;33;44mWARN\x1B[0m')).toBe('WARN');
  });

  it('strips 256-color SGR sequence', () => {
    expect(stripAnsi('\x1B[38;5;208mORANGE\x1B[0m')).toBe('ORANGE');
  });

  it('strips truecolor SGR sequence', () => {
    expect(stripAnsi('\x1B[38;2;255;128;0mTC\x1B[0m')).toBe('TC');
  });

  it('strips cursor-up / cursor-down sequences', () => {
    expect(stripAnsi('\x1B[2A\x1B[1Bfoo')).toBe('foo');
  });

  it('strips erase-line + column-address sequences', () => {
    expect(stripAnsi('\x1B[2K\x1B[1Gprogress')).toBe('progress');
  });

  it('strips erase-display sequence', () => {
    expect(stripAnsi('before\x1B[2Jafter')).toBe('beforeafter');
  });

  it('strips DEC private mode sequences', () => {
    expect(stripAnsi('\x1B[?25lhidden\x1B[?25h')).toBe('hidden');
  });

  it('strips OSC with BEL terminator (window title)', () => {
    expect(stripAnsi('\x1B]0;My Title\x07body')).toBe('body');
  });

  it('strips OSC with ST (ESC \\) terminator', () => {
    expect(stripAnsi('\x1B]0;Title\x1B\\rest')).toBe('rest');
  });

  it('strips OSC hyperlink', () => {
    expect(stripAnsi('\x1B]8;;https://x.test\x07link\x1B]8;;\x07')).toBe('link');
  });

  it('strips single-char Fe sequences', () => {
    expect(stripAnsi('\x1BD\x1BE\x1BMtext')).toBe('text');
  });

  it('strips a typical spinner frame (erase-line + CR + glyph + reset)', () => {
    const frame = '\x1B[2K\r\x1B[36m⠋\x1B[39m Loading...';
    expect(stripAnsi(frame)).toBe('\r⠋ Loading...');
  });

  it('strips multiple spinner frames in a chunk', () => {
    const chunk =
      '\x1B[2K\r\x1B[36m⠋\x1B[39m work' +
      '\x1B[2K\r\x1B[36m⠙\x1B[39m work' +
      '\x1B[2K\r\x1B[36m⠹\x1B[39m work';
    expect(stripAnsi(chunk)).toBe('\r⠋ work\r⠙ work\r⠹ work');
  });

  it('handles mixed ANSI + plain text', () => {
    expect(stripAnsi('pre\x1B[31mred\x1B[0mpost')).toBe('preredpost');
  });

  it('preserves newlines and tabs', () => {
    expect(stripAnsi('line1\n\x1B[1mline2\x1B[0m\tx')).toBe('line1\nline2\tx');
  });

  it('is idempotent (stripping twice == once)', () => {
    const sample = '\x1B[31mhello\x1B[0m \x1B]0;t\x07!';
    const once = stripAnsi(sample);
    expect(stripAnsi(once)).toBe(once);
  });

  it('strips real-world Claude Code log line (status + colour)', () => {
    const line = '\x1B[90m[INFO]\x1B[0m \x1B[32m✓\x1B[0m executed task';
    expect(stripAnsi(line)).toBe('[INFO] ✓ executed task');
  });
});

describe('collapseTtyRewrites', () => {
  it('returns empty string unchanged', () => {
    expect(collapseTtyRewrites('')).toBe('');
  });

  it('passes through plain text', () => {
    expect(collapseTtyRewrites('hello world')).toBe('hello world');
  });

  it('applies backspace by dropping previous character', () => {
    expect(collapseTtyRewrites('abc\b\bz')).toBe('az');
  });

  it('sole CR resets the current line buffer (TUI overwrite)', () => {
    expect(collapseTtyRewrites('hello\rworld')).toBe('world');
  });

  it('preserves CRLF as a single line terminator', () => {
    expect(collapseTtyRewrites('line1\r\nline2')).toBe('line1\nline2');
  });

  it('sole CR after a partial line resets only that line, LF still terminates', () => {
    expect(collapseTtyRewrites('line1\rline2\nline3')).toBe('line2\nline3');
  });

  it('backspace on empty line buffer is a safe no-op', () => {
    expect(collapseTtyRewrites('\bonly')).toBe('only');
  });

  it('backspace works across lines (only affects current line)', () => {
    expect(collapseTtyRewrites('a\nb\bc')).toBe('a\nc');
  });

  it('collapses a spinner sequence to its final frame', () => {
    expect(collapseTtyRewrites('\rfoo\rbar\rfinal')).toBe('final');
  });

  it('is idempotent (running twice equals once)', () => {
    const sample = 'a\rb\bc\r\nd';
    const once = collapseTtyRewrites(sample);
    expect(collapseTtyRewrites(once)).toBe(once);
  });
});
