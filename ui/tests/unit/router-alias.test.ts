// @vitest-environment happy-dom
/**
 * FA-36 (INT-2026-004, stage 3): old story-path addresses keep working — a
 * bookmarked `#/dashboard/...` lands on the Vorhaben overview, its sub-path is
 * dropped because Kanban/Story/Backlog no longer exist.
 *
 * FA-18, EK-03 (INT-2026-010): the frame shrinks to three routes. `#/chat`,
 * `#/call` and `#/team` land on the Vorhaben overview; `#/settings`,
 * `#/prompt-templates` and `#/getting-started` land on the project page, where
 * their content lives now. `#/neu` is a route of its own.
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
    expect(routerService.parseHash('#/neu/%2Fp')).toEqual({ view: 'neu', params: {}, segments: ['%2Fp'] });
  });

  it('has no dashboard view any more; the alias table is the only trace', () => {
    expect(VALID_VIEWS).not.toContain('dashboard');
    expect(DEFAULT_VIEW).toBe('vorhaben');
    expect(routerService.parseHash('#/nirgendwo').view).toBe('not-found');
  });
});

describe('router aliases of the removed frame pages (FA-18, INT-2026-010)', () => {
  it('has exactly three routes plus the not-found fallback (EK-03)', () => {
    expect(VALID_VIEWS).toEqual(['vorhaben', 'neu', 'projekt']);
    expect(VALID_VIEWS.length).toBe(3);
    expect(routerService.parseHash('#/not-found').view).toBe('not-found');
  });

  it('sends #/chat, #/call and #/team to the Vorhaben overview', () => {
    expect(routerService.parseHash('#/chat').view).toBe('vorhaben');
    expect(routerService.parseHash('#/call/product-owner').view).toBe('vorhaben');
    expect(routerService.parseHash('#/team').view).toBe('vorhaben');
    expect(routerService.parseHash('#/call/product-owner').segments).toEqual([]);
  });

  it('sends #/settings, #/prompt-templates and #/getting-started to the project page', () => {
    expect(routerService.parseHash('#/settings').view).toBe('projekt');
    expect(routerService.parseHash('#/settings/models')).toEqual({ view: 'projekt', params: {}, segments: [] });
    expect(routerService.parseHash('#/prompt-templates').view).toBe('projekt');
    expect(routerService.parseHash('#/getting-started').view).toBe('projekt');
  });

  it('pins the alias table', () => {
    expect(VIEW_ALIASES).toEqual({
      dashboard: 'vorhaben',
      chat: 'vorhaben',
      call: 'vorhaben',
      team: 'vorhaben',
      settings: 'projekt',
      'prompt-templates': 'projekt',
      'getting-started': 'projekt',
    });
    for (const old of ['chat', 'call', 'team', 'settings', 'prompt-templates', 'getting-started']) {
      expect(VALID_VIEWS).not.toContain(old);
    }
  });
});
