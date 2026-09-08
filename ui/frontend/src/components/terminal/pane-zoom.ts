/**
 * Pure helpers for the transient "zoom one pane to the whole terminal area" state of the
 * cloud-terminal split layout. Kept DOM-free so they are unit-testable in node.
 *
 * Zoom is deliberately separate from the per-axis vertical maximize (`_maxAxis` /
 * pane-visibility.ts): zoom hides every OTHER pane and gives the zoomed one the full container,
 * regardless of column/row ratios. Neither state is persisted.
 */

/** Inline geometry for the zoomed pane — full container. */
export const ZOOM_GEOM: Readonly<Record<'left' | 'top' | 'width' | 'height', string>> = Object.freeze({
  left: '0',
  top: '0',
  width: '100%',
  height: '100%',
});

/**
 * Resolve the requested zoom index to the one that may actually take effect.
 * Returns null unless the layout has ≥2 panes, the index is in range and the slot holds a
 * session — so a pane whose session was closed silently un-zooms without extra bookkeeping.
 */
export function effectiveZoomedPane(
  requested: number | null,
  paneCount: number,
  paneSessionIds: readonly (string | null)[]
): number | null {
  if (requested === null || paneCount < 2) return null;
  if (!Number.isInteger(requested) || requested < 0 || requested >= paneCount) return null;
  return paneSessionIds[requested] ? requested : null;
}

/**
 * Toggle semantics for the keyboard shortcut: when a zoom is active → clear it; otherwise zoom
 * the focused pane if it qualifies (see {@link effectiveZoomedPane}), else stay un-zoomed.
 */
export function nextZoomedPane(
  current: number | null,
  focusedPane: number,
  paneCount: number,
  paneSessionIds: readonly (string | null)[]
): number | null {
  if (effectiveZoomedPane(current, paneCount, paneSessionIds) !== null) return null;
  return effectiveZoomedPane(focusedPane, paneCount, paneSessionIds);
}

/**
 * Index of the pane (other than `exclude`) that currently shows `projectPath`, or -1.
 * Used while zoomed: picking a project that lives in a hidden pane jumps the zoom there
 * instead of violating the one-project-per-pane invariant.
 */
export function paneShowingProject(
  paneProjects: readonly (string | null)[],
  projectPath: string,
  exclude: number
): number {
  for (let i = 0; i < paneProjects.length; i++) {
    if (i !== exclude && paneProjects[i] === projectPath) return i;
  }
  return -1;
}
