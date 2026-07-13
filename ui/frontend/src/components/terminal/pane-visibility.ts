/**
 * Pure geometry helpers for split-screen pane visibility.
 *
 * Kept DOM-free so the "too small to render → hide" decision is unit-testable without a
 * browser environment. The Cloud Terminal sidebar wires these into its render.
 */
import { CLOUD_TERMINAL_CONFIG } from '../../../../src/shared/types/cloud-terminal.protocol.js';

/** A split pane reserves this many px for its header overlay (`.session-panel { padding-top }`). */
export const PANE_HEADER_PX = 62;
/** Approx xterm row height: fontSize 14 × lineHeight 1.5 ≈ 21px. */
export const PANE_CELL_PX = 21;
/**
 * Smallest px height a pane may render at before it is hidden instead. Below this the Claude Code
 * PTY would be driven under MIN_ROWS, whose SIGWINCH redraw mis-clears and floods the scrollback.
 * Shares `MIN_ROWS` with the backend clamp so both sides agree on "usable".
 */
export const PANE_MIN_PX = PANE_HEADER_PX + CLOUD_TERMINAL_CONFIG.MIN_ROWS * PANE_CELL_PX;

/**
 * Which of two stacked panes on a row-axis must be hidden so neither renders below a usable
 * height. Pure — no DOM.
 *
 * - `maximized` set → solo the axis: the non-maximized pane is hidden (height-independent).
 * - else a pane shorter than {@link PANE_MIN_PX} is hidden.
 *
 * Returns `null` when both fit, the container is unmeasured (`containerPx <= 0`), or both would be
 * too small (never blank the whole axis — the splitter-drag clamp prevents that in practice, and the
 * backend clamp is the final safety net).
 *
 * @param topRatio     Fraction of the axis height given to the top pane (0..1).
 * @param containerPx  Measured axis (container) pixel height; 0 when not yet measured.
 * @param maximized    'top' | 'bottom' when a pane is explicitly maximized, else null.
 */
export function hiddenRowPane(
  topRatio: number,
  containerPx: number,
  maximized: 'top' | 'bottom' | null,
): 'top' | 'bottom' | null {
  if (maximized) return maximized === 'top' ? 'bottom' : 'top';
  if (!(containerPx > 0)) return null; // unmeasured or non-finite → hide nothing
  const topPx = topRatio * containerPx;
  const bottomPx = (1 - topRatio) * containerPx;
  const topSmall = topPx < PANE_MIN_PX;
  const bottomSmall = bottomPx < PANE_MIN_PX;
  if (topSmall && !bottomSmall) return 'top';
  if (bottomSmall && !topSmall) return 'bottom';
  return null;
}

/**
 * Clamp a row ratio into the band that keeps BOTH stacked panes at least
 * {@link PANE_MIN_PX} tall. Falls back to 0.5 when the container is too short for two usable
 * panes at all (no ratio can help then — {@link hiddenRowPane} returns null for that case and
 * the backend clamp is the final safety net). Mirrors the inline clamp in the sidebar's
 * splitter drag so drag and heal share one definition of "safe". Pure — no DOM.
 *
 * @param raw          Desired ratio (0..1); values outside the band are pulled to its edge.
 * @param containerPx  Measured axis (container) pixel height; <= 0 → static 0.15/0.85 band.
 */
export function clampRowRatio(raw: number, containerPx: number): number {
  const floor = containerPx > 0 ? PANE_MIN_PX / containerPx : 0.15;
  const minR = Math.max(0.15, floor);
  const maxR = Math.min(0.85, 1 - floor);
  if (!(maxR >= minR)) return 0.5;
  return Math.min(maxR, Math.max(minR, raw));
}
