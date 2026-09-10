/**
 * Replay-buffer assembly: tmux-backed sessions get the attach-mode preamble so a
 * replay after `terminal.reset()` restores alternate screen + mouse tracking even
 * when buffer trimming has dropped the original attach chunk.
 */
import { describe, it, expect } from 'vitest';
import { buildReplayBuffer, TMUX_CLIENT_MODE_PREAMBLE } from '../../src/server/services/cloud-terminal-replay.js';

const ESC = '\x1b';

describe('buildReplayBuffer', () => {
  it('joins chunks without a separator', () => {
    expect(buildReplayBuffer([`${ESC}[3`, '1mfoo', `${ESC}[m`], false)).toBe(`${ESC}[31mfoo${ESC}[m`);
  });

  it('returns plain-PTY buffers verbatim (no preamble)', () => {
    const out = buildReplayBuffer(['a', 'b'], false);
    expect(out).toBe('ab');
    expect(out.includes(`${ESC}[?1049h`)).toBe(false);
  });

  it('prepends the tmux attach modes for tmux-backed sessions', () => {
    const out = buildReplayBuffer(['live'], true);
    expect(out.startsWith(TMUX_CLIENT_MODE_PREAMBLE)).toBe(true);
    expect(out.endsWith('live')).toBe(true);
  });

  it('restores the modes a trimmed buffer has lost', () => {
    // Simulates a buffer whose oldest chunks (incl. the attach chunk) were trimmed:
    // only redraw frames remain, no 1049h / 1002h / 1006h anywhere.
    const trimmed = [`${ESC}[H${ESC}[2Jframe`, `${ESC}[Hframe2`];
    const out = buildReplayBuffer(trimmed, true);
    for (const mode of ['?1049h', '?1006h', '?1000h', '?1002h', '?2004h']) {
      expect(out).toContain(`${ESC}[${mode}`);
    }
  });

  it('preamble is empty-safe', () => {
    expect(buildReplayBuffer([], true)).toBe(TMUX_CLIENT_MODE_PREAMBLE);
    expect(buildReplayBuffer([], false)).toBe('');
  });

  it('preamble carries only mode sets — nothing xterm would auto-answer', () => {
    // stripTerminalQueries (frontend) removes DA/DSR/DECRQM/XTVERSION/OSC queries;
    // the preamble must not depend on surviving that filter.
    expect(TMUX_CLIENT_MODE_PREAMBLE).not.toMatch(/\x1b\[[>=?]?[0-9;]*c/);
    expect(TMUX_CLIENT_MODE_PREAMBLE).not.toMatch(/\x1b\[\??[0-9;]*n/);
    expect(TMUX_CLIENT_MODE_PREAMBLE).not.toMatch(/\$p/);
    expect(TMUX_CLIENT_MODE_PREAMBLE).not.toMatch(/\x1b\]/);
  });
});
