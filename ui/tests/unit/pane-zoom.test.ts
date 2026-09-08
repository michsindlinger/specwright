import { describe, it, expect } from 'vitest';
import {
  effectiveZoomedPane,
  nextZoomedPane,
  paneShowingProject,
  ZOOM_GEOM,
} from '../../frontend/src/components/terminal/pane-zoom.js';

const quad = ['a', 'b', null, 'd'] as const;

describe('effectiveZoomedPane', () => {
  it('returns null when nothing is requested', () => {
    expect(effectiveZoomedPane(null, 4, quad)).toBeNull();
  });

  it('is a no-op in single layout', () => {
    expect(effectiveZoomedPane(0, 1, ['a'])).toBeNull();
  });

  it('rejects out-of-range or non-integer indices', () => {
    expect(effectiveZoomedPane(4, 4, quad)).toBeNull();
    expect(effectiveZoomedPane(-1, 4, quad)).toBeNull();
    expect(effectiveZoomedPane(1.5, 4, quad)).toBeNull();
    expect(effectiveZoomedPane(3, 2, ['a', 'b'])).toBeNull();
  });

  it('un-zooms when the slot no longer holds a session', () => {
    expect(effectiveZoomedPane(2, 4, quad)).toBeNull();
    expect(effectiveZoomedPane(0, 2, [null, 'b'])).toBeNull();
  });

  it('accepts a populated in-range pane, including the last quad index', () => {
    expect(effectiveZoomedPane(3, 4, quad)).toBe(3);
    expect(effectiveZoomedPane(1, 2, ['a', 'b'])).toBe(1);
  });
});

describe('nextZoomedPane', () => {
  it('zooms the focused pane when nothing is zoomed', () => {
    expect(nextZoomedPane(null, 1, 4, quad)).toBe(1);
  });

  it('stays un-zoomed when the focused pane is empty or the layout is single', () => {
    expect(nextZoomedPane(null, 2, 4, quad)).toBeNull();
    expect(nextZoomedPane(null, 0, 1, ['a'])).toBeNull();
  });

  it('toggles off from any focused pane while a zoom is active', () => {
    expect(nextZoomedPane(3, 0, 4, quad)).toBeNull();
    expect(nextZoomedPane(3, 3, 4, quad)).toBeNull();
  });

  it('treats a stale (emptied) zoom as inactive and zooms the focused pane', () => {
    expect(nextZoomedPane(2, 0, 4, quad)).toBe(0);
  });
});

describe('ZOOM_GEOM', () => {
  it('spans the whole container', () => {
    expect(ZOOM_GEOM).toEqual({ left: '0', top: '0', width: '100%', height: '100%' });
    expect(Object.isFrozen(ZOOM_GEOM)).toBe(true);
  });
});

describe('paneShowingProject', () => {
  const projects = ['/a', '/b', null, '/d'];

  it('finds the other pane that shows the project', () => {
    expect(paneShowingProject(projects, '/d', 0)).toBe(3);
    expect(paneShowingProject(projects, '/a', 3)).toBe(0);
  });

  it('never returns the excluded pane itself', () => {
    expect(paneShowingProject(projects, '/a', 0)).toBe(-1);
  });

  it('returns -1 when no pane shows the project, ignoring empty slots', () => {
    expect(paneShowingProject(projects, '/zzz', 0)).toBe(-1);
    expect(paneShowingProject([null, null], '/a', 0)).toBe(-1);
  });
});
