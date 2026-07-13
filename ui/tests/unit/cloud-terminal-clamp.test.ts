/**
 * Unit tests for clampTerminalSize — the backend safety net that keeps pty.resize() from ever
 * receiving a sub-usable or non-finite grid (node-pty throws on <=0 / NaN / Infinity).
 */
import { describe, it, expect } from 'vitest';
import {
  clampTerminalSize,
  CLOUD_TERMINAL_CONFIG,
} from '../../src/shared/types/cloud-terminal.protocol.js';

const { MIN_COLS, MIN_ROWS, DEFAULT_COLS, DEFAULT_ROWS } = CLOUD_TERMINAL_CONFIG;

describe('clampTerminalSize', () => {
  it('leaves an in-range grid untouched (identity)', () => {
    expect(clampTerminalSize(120, 40)).toEqual({ cols: 120, rows: 40 });
  });

  it('raises a below-MIN grid to the MIN', () => {
    expect(clampTerminalSize(2, 2)).toEqual({ cols: MIN_COLS, rows: MIN_ROWS });
  });

  it('clamps zero and negatives to MIN', () => {
    expect(clampTerminalSize(0, 0)).toEqual({ cols: MIN_COLS, rows: MIN_ROWS });
    expect(clampTerminalSize(-5, -100)).toEqual({ cols: MIN_COLS, rows: MIN_ROWS });
  });

  it('floors fractional dimensions', () => {
    expect(clampTerminalSize(100.7, 40.9)).toEqual({ cols: 100, rows: 40 });
  });

  it('falls back to the provided current size for a non-finite axis', () => {
    expect(clampTerminalSize(NaN, NaN, { cols: 80, rows: 24 })).toEqual({ cols: 80, rows: 24 });
    // finite axis passes through, non-finite axis uses fallback
    expect(clampTerminalSize(NaN, 30, { cols: 80, rows: 24 })).toEqual({ cols: 80, rows: 30 });
  });

  it('falls back to the default grid when no current size is given', () => {
    expect(clampTerminalSize(Infinity, Infinity)).toEqual({ cols: DEFAULT_COLS, rows: DEFAULT_ROWS });
  });

  it('still enforces MIN even when the fallback itself is below MIN', () => {
    expect(clampTerminalSize(NaN, NaN, { cols: 5, rows: 1 })).toEqual({ cols: MIN_COLS, rows: MIN_ROWS });
  });

  it('output is always >= MIN for any finite input (invariant)', () => {
    for (const cols of [-1000, 0, 1, 19, 20, 21, 500]) {
      for (const rows of [-50, 0, 1, 9, 10, 11, 200]) {
        const out = clampTerminalSize(cols, rows);
        expect(out.cols).toBeGreaterThanOrEqual(MIN_COLS);
        expect(out.rows).toBeGreaterThanOrEqual(MIN_ROWS);
      }
    }
  });
});
