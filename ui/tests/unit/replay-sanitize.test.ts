/**
 * Unit tests for the replay-buffer sanitizer.
 *
 * Guards the core regression: replaying a captured PTY buffer must NOT re-emit terminal
 * query-REQUEST sequences that xterm would auto-answer, because those answers get
 * forwarded to the live PTY as fake user input (the "auto-/clear on wake" bug). The
 * sanitizer strips only the query requests; every rendering sequence and the answers
 * themselves must survive.
 */
import { describe, it, expect } from 'vitest';
import { stripTerminalQueries } from '../../frontend/src/components/terminal/replay-sanitize.js';

const ESC = '\x1b';
const BEL = '\x07';
const ST = '\x1b\\';

describe('stripTerminalQueries — removes emulator-answered query requests', () => {
  it('strips Device Attributes requests (DA1/DA2/DA3)', () => {
    expect(stripTerminalQueries(`${ESC}[c`)).toBe('');
    expect(stripTerminalQueries(`${ESC}[0c`)).toBe('');
    expect(stripTerminalQueries(`${ESC}[>c`)).toBe('');
    expect(stripTerminalQueries(`${ESC}[>0;276;0c`)).toBe('');
    expect(stripTerminalQueries(`${ESC}[=c`)).toBe('');
    expect(stripTerminalQueries(`${ESC}[?1;2c`)).toBe('');
  });

  it('strips Device Status Report / cursor-position requests', () => {
    expect(stripTerminalQueries(`${ESC}[5n`)).toBe('');
    expect(stripTerminalQueries(`${ESC}[6n`)).toBe('');
    expect(stripTerminalQueries(`${ESC}[?6n`)).toBe('');
    expect(stripTerminalQueries(`${ESC}[?15n`)).toBe('');
  });

  it('strips DECRQM mode queries (DEC-private and ANSI)', () => {
    expect(stripTerminalQueries(`${ESC}[?2004$p`)).toBe('');
    expect(stripTerminalQueries(`${ESC}[4$p`)).toBe('');
  });

  it('strips XTVERSION requests', () => {
    expect(stripTerminalQueries(`${ESC}[>q`)).toBe('');
    expect(stripTerminalQueries(`${ESC}[>0q`)).toBe('');
  });

  it('strips CSI-t window report requests', () => {
    expect(stripTerminalQueries(`${ESC}[14t`)).toBe('');
    expect(stripTerminalQueries(`${ESC}[18t`)).toBe('');
    expect(stripTerminalQueries(`${ESC}[14;2t`)).toBe('');
  });

  it('strips OSC colour queries (BEL- and ST-terminated)', () => {
    expect(stripTerminalQueries(`${ESC}]10;?${BEL}`)).toBe('');
    expect(stripTerminalQueries(`${ESC}]11;?${BEL}`)).toBe('');
    expect(stripTerminalQueries(`${ESC}]12;?${ST}`)).toBe('');
    expect(stripTerminalQueries(`${ESC}]4;1;?${BEL}`)).toBe('');
  });
});

describe('stripTerminalQueries — preserves rendering sequences and answers', () => {
  it('keeps SGR colour attributes', () => {
    const sgr = `${ESC}[1;31mhello${ESC}[0m`;
    expect(stripTerminalQueries(sgr)).toBe(sgr);
  });

  it('keeps cursor-move sequences (final H is not a query)', () => {
    const move = `${ESC}[10;5Hx`;
    expect(stripTerminalQueries(move)).toBe(move);
  });

  it('keeps OSC colour SET (rgb value, not a query)', () => {
    const set = `${ESC}]11;rgb:1e1e/1e1e/1e1e${BEL}`;
    expect(stripTerminalQueries(set)).toBe(set);
  });

  it('keeps alt-screen and mouse-mode toggles', () => {
    expect(stripTerminalQueries(`${ESC}[?1049h`)).toBe(`${ESC}[?1049h`);
    expect(stripTerminalQueries(`${ESC}[?1049l`)).toBe(`${ESC}[?1049l`);
    expect(stripTerminalQueries(`${ESC}[?1000h`)).toBe(`${ESC}[?1000h`);
    expect(stripTerminalQueries(`${ESC}[?2004h`)).toBe(`${ESC}[?2004h`);
  });

  it('keeps a resize/move window op (CSI t with non-report code)', () => {
    expect(stripTerminalQueries(`${ESC}[8;24;80t`)).toBe(`${ESC}[8;24;80t`);
  });

  it('leaves plain text and empty input untouched', () => {
    expect(stripTerminalQueries('plain text 123 / \\ done')).toBe('plain text 123 / \\ done');
    expect(stripTerminalQueries('')).toBe('');
  });
});

describe('stripTerminalQueries — realistic replay buffer', () => {
  it('removes every query request but keeps the rendered banner intact', () => {
    // Mimics a Claude Code startup buffer: handshake queries interleaved with rendered output.
    const banner = `${ESC}[?1049h${ESC}[2J${ESC}[1;1HClaude Code v2.1.206\r\n`;
    const queries =
      `${ESC}[c${ESC}[>c${ESC}[6n${ESC}[?2004$p${ESC}]11;?${BEL}${ESC}[>q${ESC}[14t`;
    const prompt = `${ESC}[1;36m> ${ESC}[0m`;

    const cleaned = stripTerminalQueries(banner + queries + prompt);

    // Rendered content preserved verbatim...
    expect(cleaned).toBe(banner + prompt);
    // ...and none of the query requests survive.
    expect(cleaned).not.toContain(`${ESC}[c`);
    expect(cleaned).not.toContain(`${ESC}[6n`);
    expect(cleaned).not.toContain(';?');
  });
});

describe('stripTerminalQueries — OSC 52 clipboard writes', () => {
  it('strips a BEL-terminated tmux mouse-copy so replay cannot clobber the clipboard', () => {
    const copy = `${ESC}]52;c;Q09QWUxJTkUtNDI=${BEL}`;
    const stream = `before${copy}after`;
    expect(stripTerminalQueries(stream)).toBe('beforeafter');
  });

  it('strips the ST-terminated form and keeps unrelated OSC SET sequences', () => {
    const copy = `${ESC}]52;;aGVsbG8=${ESC}\\`;
    const title = `${ESC}]0;my-title${BEL}`;
    expect(stripTerminalQueries(copy + title)).toBe(title);
  });
});
