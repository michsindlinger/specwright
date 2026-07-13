/**
 * Unit tests for the pure split-pane visibility decision.
 *
 * Guards the core regression: a pane that would render below MIN_ROWS is hidden (not shown at
 * ~3 rows, which floods the Claude Code PTY with SIGWINCH redraws). Maximize solos the axis.
 */
import { describe, it, expect } from 'vitest';
import {
  hiddenRowPane,
  clampRowRatio,
  PANE_MIN_PX,
  PANE_HEADER_PX,
  PANE_CELL_PX,
} from '../../frontend/src/components/terminal/pane-visibility.js';
import { CLOUD_TERMINAL_CONFIG } from '../../src/shared/types/cloud-terminal.protocol.js';

describe('PANE_MIN_PX', () => {
  it('equals header + MIN_ROWS worth of rows', () => {
    expect(PANE_MIN_PX).toBe(PANE_HEADER_PX + CLOUD_TERMINAL_CONFIG.MIN_ROWS * PANE_CELL_PX);
  });
});

describe('hiddenRowPane — maximize (height-independent solo)', () => {
  it('maximizing the top pane hides the bottom, even unmeasured', () => {
    expect(hiddenRowPane(0.5, 0, 'top')).toBe('bottom');
    expect(hiddenRowPane(0.5, 2000, 'top')).toBe('bottom');
  });

  it('maximizing the bottom pane hides the top', () => {
    expect(hiddenRowPane(0.5, 2000, 'bottom')).toBe('top');
  });
});

describe('hiddenRowPane — height-based hide', () => {
  it('hides nothing while the container is unmeasured', () => {
    expect(hiddenRowPane(0.15, 0, null)).toBeNull();
    expect(hiddenRowPane(0.15, -1, null)).toBeNull();
  });

  it('hides nothing when both panes fit', () => {
    expect(hiddenRowPane(0.5, 1000, null)).toBeNull();
  });

  it('hides the top pane when it is shorter than MIN', () => {
    // 0.15 * 1000 = 150px < 272px
    expect(hiddenRowPane(0.15, 1000, null)).toBe('top');
  });

  it('hides the bottom pane when it is shorter than MIN', () => {
    // (1 - 0.85) * 1000 = 150px < 272px
    expect(hiddenRowPane(0.85, 1000, null)).toBe('bottom');
  });

  it('hides neither when both would be too small (never blanks the axis)', () => {
    // 0.5 * 400 = 200px < 272px for both
    expect(hiddenRowPane(0.5, 400, null)).toBeNull();
  });

  it('treats exactly-MIN as usable (strict <)', () => {
    // top pane exactly PANE_MIN_PX tall
    const ratio = PANE_MIN_PX / 1000;
    expect(hiddenRowPane(ratio, 1000, null)).toBeNull();
  });
});

describe('clampRowRatio', () => {
  it('pulls a legacy maximize-extreme back so BOTH panes stay usable', () => {
    // 0.85 on a 1000px container would leave the bottom pane at 150px < 272px (the bug).
    const safe = clampRowRatio(0.85, 1000);
    expect(safe).toBeLessThan(0.85);
    expect(safe * 1000).toBeGreaterThanOrEqual(PANE_MIN_PX); // top ≥ MIN
    expect((1 - safe) * 1000).toBeGreaterThanOrEqual(PANE_MIN_PX); // bottom ≥ MIN
  });

  it('leaves a centered ratio untouched (identity)', () => {
    expect(clampRowRatio(0.5, 1000)).toBe(0.5);
  });

  it('leaves an extreme untouched on a tall screen where it is still safe', () => {
    // 0.15 * 4000 = 600px > 272px → 0.85 is genuinely usable, not a stranded pane.
    expect(clampRowRatio(0.85, 4000)).toBe(0.85);
  });

  it('refines a restored ratio that the static 0.15/0.85 clamp let through', () => {
    // 0.2 passes the static restore clamp but leaves the bottom at 179px < 272px on 894px.
    const safe = clampRowRatio(0.2, 894);
    expect(safe * 894).toBeGreaterThanOrEqual(PANE_MIN_PX);
    expect(safe).toBeCloseTo(PANE_MIN_PX / 894, 5); // == the dynamic floor ≈ 0.304
  });

  it('falls back to 0.5 when the container is too short for two usable panes', () => {
    // 272*2 = 544 > 400 → no ratio can keep both ≥ MIN → neutral 0.5.
    expect(clampRowRatio(0.2, 400)).toBe(0.5);
    expect(clampRowRatio(0.8, 400)).toBe(0.5);
  });

  it('uses the static 0.15/0.85 band when unmeasured (containerPx <= 0)', () => {
    expect(clampRowRatio(0.05, 0)).toBe(0.15);
    expect(clampRowRatio(0.95, 0)).toBe(0.85);
    expect(clampRowRatio(0.05, -1)).toBe(0.15);
  });

  it('clamps out-of-range and negative inputs to the band edge', () => {
    expect(clampRowRatio(-1, 1000)).toBe(clampRowRatio(0, 1000)); // negative → lower edge
    expect(clampRowRatio(2, 1000)).toBe(clampRowRatio(1, 1000)); // >1 → upper edge
  });

  it('invariant: for any finite input either both panes fit MIN, or output is the 0.5 fallback', () => {
    for (const h of [200, 400, 543, 544, 800, 1000, 2000, 4000]) {
      for (const raw of [-0.5, 0, 0.1, 0.5, 0.9, 1, 1.5]) {
        const r = clampRowRatio(raw, h);
        const bothFit = r * h >= PANE_MIN_PX && (1 - r) * h >= PANE_MIN_PX;
        expect(bothFit || r === 0.5).toBe(true);
      }
    }
  });
});
