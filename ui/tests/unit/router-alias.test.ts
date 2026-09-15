// @vitest-environment happy-dom
/**
 * FA-36 (INT-2026-004, stage 3): old story-path addresses keep working — a
 * bookmarked `#/dashboard/...` lands on the Vorhaben overview, its sub-path is
 * dropped because Kanban/Story/Backlog no longer exist. The removed views are
 * not valid routes any more.
 */
import { describe, it, expect } from 'vitest';
import { routerService } from '../../frontend/src/services/router.service.js';
import { DEFAULT_VIEW, VALID_VIEWS, VIEW_ALIASES } from '../../frontend/src/types/route.types.js';

describe('router alias dashboard → vorhaben (FA-36)', () => {
  it('maps #/dashboard to the Vorhaben overview without segments', () => {
    expect(routerService.parseHash('#/dashboard')).toEqual({ view: 'vorhaben', params: {}, segments: [] });
  });

  it('drops the old sub-path (spec/kanban/backlog) instead of forwarding it', () => {
    const r = routerService.parseHash('#/dashboard/spec/2026-02-10-my-feature/kanban');
    expect(r.view).toBe('vorhaben');
    expect(r.segments).toEqual([]);
    expect(routerService.parseHash('#/dashboard/backlog').view).toBe('vorhaben');
  });

  it('keeps the new routes and their segments intact', () => {
    expect(routerService.parseHash('#/vorhaben/%2Fp/INT-2026-004/plan')).toEqual({
      view: 'vorhaben',
      params: {},
      segments: ['%2Fp', 'INT-2026-004', 'plan'],
    });
    expect(routerService.parseHash('#/projekt/%2Fp').view).toBe('projekt');
  });

  it('has no dashboard view any more; the alias table is the only trace', () => {
    expect(VALID_VIEWS).not.toContain('dashboard');
    expect(VIEW_ALIASES).toEqual({ dashboard: 'vorhaben' });
    expect(DEFAULT_VIEW).toBe('vorhaben');
    expect(routerService.parseHash('#/nirgendwo').view).toBe('not-found');
  });
});
