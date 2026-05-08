/**
 * Unit tests for areDependenciesSatisfied + computeInitialStatus.
 *
 * Both helpers live in the framework's pure-helper module
 * (specwright/scripts/mcp/kanban-validation.ts) and are imported here
 * via the same relative path used by kanban-mcp-warnings.test.ts.
 */

import { describe, it, expect } from 'vitest';
import {
  areDependenciesSatisfied,
  computeInitialStatus,
  SATISFIED_DEP_STATUSES,
} from '../../../specwright/scripts/mcp/kanban-validation.js';

const A_DONE = { id: 'A', status: 'done' };
const A_IN_REVIEW = { id: 'A', status: 'in_review' };
const A_IN_PROGRESS = { id: 'A', status: 'in_progress' };
const A_TESTING = { id: 'A', status: 'testing' };
const A_READY = { id: 'A', status: 'ready' };
const A_BLOCKED = { id: 'A', status: 'blocked' };
const B_DONE = { id: 'B', status: 'done' };
const B_PENDING = { id: 'B', status: 'ready' };

describe('SATISFIED_DEP_STATUSES', () => {
  it('contains exactly done + in_review (matches resolveDependencies)', () => {
    expect([...SATISFIED_DEP_STATUSES].sort()).toEqual(['done', 'in_review']);
  });
});

describe('areDependenciesSatisfied', () => {
  it('returns true on empty deps', () => {
    expect(areDependenciesSatisfied([], [])).toBe(true);
  });

  it('returns true when single dep is done', () => {
    expect(areDependenciesSatisfied(['A'], [A_DONE])).toBe(true);
  });

  it('returns true when single dep is in_review', () => {
    expect(areDependenciesSatisfied(['A'], [A_IN_REVIEW])).toBe(true);
  });

  it('returns false when single dep is in_progress', () => {
    expect(areDependenciesSatisfied(['A'], [A_IN_PROGRESS])).toBe(false);
  });

  it('returns false when single dep is testing', () => {
    expect(areDependenciesSatisfied(['A'], [A_TESTING])).toBe(false);
  });

  it('returns false when single dep is ready', () => {
    expect(areDependenciesSatisfied(['A'], [A_READY])).toBe(false);
  });

  it('returns false when single dep is blocked', () => {
    expect(areDependenciesSatisfied(['A'], [A_BLOCKED])).toBe(false);
  });

  it('returns false on missing dep id (typo case)', () => {
    expect(areDependenciesSatisfied(['MISSING'], [A_DONE])).toBe(false);
  });

  it('returns true when all multi-deps are done', () => {
    expect(areDependenciesSatisfied(['A', 'B'], [A_DONE, B_DONE])).toBe(true);
  });

  it('returns false when any multi-dep is unmet', () => {
    expect(areDependenciesSatisfied(['A', 'B'], [A_DONE, B_PENDING])).toBe(false);
  });
});

describe('computeInitialStatus', () => {
  it('returns ready when no deps + status undefined', () => {
    expect(computeInitialStatus([], undefined, [])).toBe('ready');
  });

  it('honors caller blocked when no deps', () => {
    // Caller-can-pause semantics — manual block on a dep-free story.
    expect(computeInitialStatus([], 'blocked', [])).toBe('blocked');
  });

  it('returns ready when deps satisfied + status undefined', () => {
    expect(computeInitialStatus(['A'], undefined, [A_DONE])).toBe('ready');
  });

  it('honors caller blocked when deps satisfied (manual pause)', () => {
    expect(computeInitialStatus(['A'], 'blocked', [A_DONE])).toBe('blocked');
  });

  it('forces blocked when deps unmet + status undefined', () => {
    expect(computeInitialStatus(['A'], undefined, [A_READY])).toBe('blocked');
  });

  it("overrides caller 'ready' to blocked when deps unmet", () => {
    expect(computeInitialStatus(['A'], 'ready', [A_READY])).toBe('blocked');
  });

  it("coerces malformed status 'done' (no deps) to ready", () => {
    expect(computeInitialStatus([], 'done', [])).toBe('ready');
  });

  it('returns blocked on missing dep id (typo case)', () => {
    expect(computeInitialStatus(['MISSING'], 'ready', [A_DONE])).toBe('blocked');
  });

  it('peer-only kanban_create scenario: peers are pending → blocks dep stories', () => {
    // Simulates kanban_create input array — peers have caller-provided status
    // but none are 'done'/'in_review' yet, so any item with deps gets blocked.
    const input = [
      { id: 'A', status: 'ready' },
      { id: 'B', status: 'ready' },
    ];
    expect(computeInitialStatus(['A'], 'ready', input)).toBe('blocked');
  });
});
