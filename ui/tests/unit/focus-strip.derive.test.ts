import { describe, it, expect } from 'vitest';
import {
  deriveFocusItems,
  type FocusSpecInfo,
  type FocusBacklogBoard,
  type FocusAutoModeSnapshot,
} from '../../frontend/src/utils/focus-strip.derive.js';

const makeSpec = (overrides: Partial<FocusSpecInfo> = {}): FocusSpecInfo => ({
  id: 'spec-1',
  name: 'My Spec',
  assignedToBot: false,
  ...overrides,
});

const makeBacklog = (overrides: Partial<FocusBacklogBoard> = {}): FocusBacklogBoard => ({
  stories: [],
  ...overrides,
});

const makeAutoMode = (overrides: Partial<FocusAutoModeSnapshot> = {}): FocusAutoModeSnapshot => ({
  enabled: true,
  paused: false,
  ...overrides,
});

describe('deriveFocusItems', () => {
  it('returns empty array for empty inputs', () => {
    expect(deriveFocusItems([], null, null)).toEqual([]);
    expect(deriveFocusItems([], makeBacklog(), makeAutoMode())).toEqual([]);
  });

  describe('blocked stories', () => {
    it('includes blocked backlog stories', () => {
      const backlog = makeBacklog({
        stories: [
          { id: 'BUG-001', title: 'Auth crash', type: 'bug', status: 'blocked' },
        ],
      });
      const items = deriveFocusItems([], backlog, null);
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        type: 'blocked-story',
        title: 'Auth crash',
        subtitle: 'Bug · BUG-001',
        accent: 'warning',
        targetRoute: 'backlog/BUG-001',
      });
    });

    it('labels user-story correctly in subtitle', () => {
      const backlog = makeBacklog({
        stories: [
          { id: 'US-002', title: 'Dark mode', type: 'user-story', status: 'blocked' },
        ],
      });
      const items = deriveFocusItems([], backlog, null);
      expect(items[0].subtitle).toBe('Story · US-002');
    });

    it('skips non-blocked stories', () => {
      const backlog = makeBacklog({
        stories: [
          { id: 'US-001', title: 'Done story', type: 'user-story', status: 'done' },
          { id: 'US-002', title: 'In progress', type: 'user-story', status: 'in_progress' },
          { id: 'US-003', title: 'Backlog', type: 'user-story', status: 'backlog' },
          { id: 'US-004', title: 'In review', type: 'user-story', status: 'in_review' },
        ],
      });
      expect(deriveFocusItems([], backlog, null)).toHaveLength(0);
    });

    it('returns nothing when backlog is null', () => {
      expect(deriveFocusItems([], null, null)).toHaveLength(0);
    });

    it('handles multiple blocked stories', () => {
      const backlog = makeBacklog({
        stories: [
          { id: 'BUG-001', title: 'Bug A', type: 'bug', status: 'blocked' },
          { id: 'BUG-002', title: 'Bug B', type: 'bug', status: 'blocked' },
        ],
      });
      const items = deriveFocusItems([], backlog, null);
      expect(items).toHaveLength(2);
      expect(items.map(i => i.title)).toEqual(['Bug A', 'Bug B']);
    });
  });

  describe('paused auto-mode', () => {
    it('includes bot-assigned specs when auto-mode is paused', () => {
      const specs = [makeSpec({ id: 'spec-1', name: 'Feature Alpha', assignedToBot: true })];
      const autoMode = makeAutoMode({ paused: true });
      const items = deriveFocusItems(specs, null, autoMode);
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        type: 'paused-auto-mode',
        title: 'Feature Alpha',
        subtitle: 'Auto-Mode pausiert',
        accent: 'warning',
        targetRoute: 'specs/spec-1',
      });
    });

    it('skips specs not assigned to bot', () => {
      const specs = [makeSpec({ assignedToBot: false })];
      const autoMode = makeAutoMode({ paused: true });
      expect(deriveFocusItems(specs, null, autoMode)).toHaveLength(0);
    });

    it('skips bot specs when auto-mode is not paused', () => {
      const specs = [makeSpec({ assignedToBot: true })];
      const autoMode = makeAutoMode({ paused: false });
      expect(deriveFocusItems(specs, null, autoMode)).toHaveLength(0);
    });

    it('skips when autoMode is null', () => {
      const specs = [makeSpec({ assignedToBot: true })];
      expect(deriveFocusItems(specs, null, null)).toHaveLength(0);
    });

    it('includes multiple paused specs', () => {
      const specs = [
        makeSpec({ id: 'spec-1', name: 'Alpha', assignedToBot: true }),
        makeSpec({ id: 'spec-2', name: 'Beta', assignedToBot: true }),
        makeSpec({ id: 'spec-3', name: 'Gamma', assignedToBot: false }),
      ];
      const autoMode = makeAutoMode({ paused: true });
      const items = deriveFocusItems(specs, null, autoMode);
      expect(items).toHaveLength(2);
      expect(items.map(i => i.targetRoute)).toEqual(['specs/spec-1', 'specs/spec-2']);
    });
  });

  describe('incidents', () => {
    it('includes incidents with storyId', () => {
      const autoMode = makeAutoMode({
        incidents: [
          { type: 'crash', message: 'Process crashed', storyId: 'MOB-005', timestamp: '2026-05-26T10:00:00Z' },
        ],
      });
      const items = deriveFocusItems([], null, autoMode);
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        type: 'incident',
        title: 'MOB-005',
        subtitle: 'Process crashed',
        accent: 'error',
        targetRoute: 'specs/MOB-005',
      });
    });

    it('falls back to generic title/route when storyId is absent', () => {
      const autoMode = makeAutoMode({
        incidents: [
          { type: 'timeout', message: 'Timed out', timestamp: '2026-05-26T10:00:00Z' },
        ],
      });
      const items = deriveFocusItems([], null, autoMode);
      expect(items[0]).toMatchObject({
        title: 'Auto-Mode',
        targetRoute: 'specs',
      });
    });

    it('skips incidents when incidents array is absent', () => {
      const autoMode = makeAutoMode();
      expect(deriveFocusItems([], null, autoMode)).toHaveLength(0);
    });

    it('skips incidents when autoMode is null', () => {
      expect(deriveFocusItems([], null, null)).toHaveLength(0);
    });
  });

  describe('aggregation order', () => {
    it('blocked stories before paused-auto-mode before incidents', () => {
      const specs = [makeSpec({ assignedToBot: true })];
      const backlog = makeBacklog({
        stories: [{ id: 'BUG-001', title: 'Blocked', type: 'bug', status: 'blocked' }],
      });
      const autoMode = makeAutoMode({
        paused: true,
        incidents: [{ type: 'crash', message: 'Crash', storyId: 'S-1', timestamp: 't' }],
      });
      const items = deriveFocusItems(specs, backlog, autoMode);
      expect(items.map(i => i.type)).toEqual([
        'blocked-story',
        'paused-auto-mode',
        'incident',
      ]);
    });
  });
});
