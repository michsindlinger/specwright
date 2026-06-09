/**
 * SPD-002: Unit tests for the pure spec-graph functions.
 *
 * Covers cycle detection, wouldCreateCycle pre-validation, derived dependency
 * status (done predecessors satisfied, only active specs block), and the
 * recommended topological order (Kahn + priority/date/id tie-break, cyclic and
 * done specs excluded). No I/O.
 */

import { describe, it, expect } from 'vitest';
import {
  detectCycles,
  wouldCreateCycle,
  deriveDependencyStatus,
  computeRecommendedOrder,
  type GraphSpec,
} from '../../src/server/utils/spec-graph.js';

function spec(id: string, opts: Partial<GraphSpec> = {}): GraphSpec {
  return {
    id,
    blockedBy: opts.blockedBy,
    priority: opts.priority,
    createdDate: opts.createdDate ?? '2026-01-01',
    isDone: opts.isDone ?? false,
  };
}

// ─── detectCycles ────────────────────────────────────────────────────────────

describe('detectCycles', () => {
  it('returns empty for an acyclic graph', () => {
    const specs = [
      spec('a'),
      spec('b', { blockedBy: ['a'] }),
      spec('c', { blockedBy: ['b'] }),
    ];
    expect(detectCycles(specs).size).toBe(0);
  });

  it('detects a simple two-node cycle', () => {
    const specs = [
      spec('a', { blockedBy: ['b'] }),
      spec('b', { blockedBy: ['a'] }),
    ];
    expect(detectCycles(specs)).toEqual(new Set(['a', 'b']));
  });

  it('detects a three-node cycle', () => {
    const specs = [
      spec('a', { blockedBy: ['c'] }),
      spec('b', { blockedBy: ['a'] }),
      spec('c', { blockedBy: ['b'] }),
    ];
    expect(detectCycles(specs)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('marks only the nodes on the cycle, not acyclic tails', () => {
    const specs = [
      spec('a', { blockedBy: ['b'] }),
      spec('b', { blockedBy: ['a'] }),
      spec('tail', { blockedBy: ['a'] }), // depends on cycle but is not on it
    ];
    const cyclic = detectCycles(specs);
    expect(cyclic.has('a')).toBe(true);
    expect(cyclic.has('b')).toBe(true);
    expect(cyclic.has('tail')).toBe(false);
  });

  it('ignores self-references (filtered out, not a cycle)', () => {
    const specs = [spec('a', { blockedBy: ['a'] })];
    expect(detectCycles(specs).size).toBe(0);
  });

  it('ignores dangling references to unknown specs', () => {
    const specs = [spec('a', { blockedBy: ['ghost'] })];
    expect(detectCycles(specs).size).toBe(0);
  });
});

// ─── wouldCreateCycle ────────────────────────────────────────────────────────

describe('wouldCreateCycle', () => {
  it('treats identity edge as a cycle', () => {
    expect(wouldCreateCycle([spec('a')], 'a', 'a')).toBe(true);
  });

  it('returns true when the new edge closes a loop', () => {
    // b already depends on a; making a depend on b closes a→b→a.
    const specs = [spec('a'), spec('b', { blockedBy: ['a'] })];
    expect(wouldCreateCycle(specs, 'a', 'b')).toBe(true);
  });

  it('returns true for a transitive loop', () => {
    // c→b→a exists; making a depend on c closes the loop.
    const specs = [
      spec('a'),
      spec('b', { blockedBy: ['a'] }),
      spec('c', { blockedBy: ['b'] }),
    ];
    expect(wouldCreateCycle(specs, 'a', 'c')).toBe(true);
  });

  it('returns false for an independent new edge', () => {
    const specs = [spec('a'), spec('b'), spec('c')];
    expect(wouldCreateCycle(specs, 'a', 'b')).toBe(false);
  });

  it('returns false when an endpoint is unknown', () => {
    const specs = [spec('a')];
    expect(wouldCreateCycle(specs, 'a', 'ghost')).toBe(false);
    expect(wouldCreateCycle(specs, 'ghost', 'a')).toBe(false);
  });
});

// ─── deriveDependencyStatus ──────────────────────────────────────────────────

describe('deriveDependencyStatus', () => {
  it('marks a spec ready when it has no dependencies', () => {
    const status = deriveDependencyStatus([spec('a')]);
    expect(status.get('a')).toBe('ready');
  });

  it('marks a spec blocked by an active predecessor', () => {
    const specs = [spec('a'), spec('b', { blockedBy: ['a'] })];
    const status = deriveDependencyStatus(specs);
    expect(status.get('b')).toBe('blocked');
  });

  it('treats a done predecessor as satisfied (ready)', () => {
    const specs = [spec('a', { isDone: true }), spec('b', { blockedBy: ['a'] })];
    const status = deriveDependencyStatus(specs);
    expect(status.get('b')).toBe('ready');
  });

  it('treats a dangling predecessor as satisfied (ready)', () => {
    const specs = [spec('b', { blockedBy: ['ghost'] })];
    const status = deriveDependencyStatus(specs);
    expect(status.get('b')).toBe('ready');
  });

  it('stays blocked if at least one of several predecessors is active', () => {
    const specs = [
      spec('a', { isDone: true }),
      spec('a2'),
      spec('b', { blockedBy: ['a', 'a2'] }),
    ];
    const status = deriveDependencyStatus(specs);
    expect(status.get('b')).toBe('blocked');
  });

  it('ignores a self-reference', () => {
    const specs = [spec('a', { blockedBy: ['a'] })];
    expect(deriveDependencyStatus(specs).get('a')).toBe('ready');
  });
});

// ─── computeRecommendedOrder ─────────────────────────────────────────────────

describe('computeRecommendedOrder', () => {
  it('orders a linear chain predecessor-first', () => {
    const specs = [
      spec('c', { blockedBy: ['b'] }),
      spec('b', { blockedBy: ['a'] }),
      spec('a'),
    ];
    const order = computeRecommendedOrder(specs);
    expect(order.map(e => e.id)).toEqual(['a', 'b', 'c']);
    expect(order.map(e => e.index)).toEqual([1, 2, 3]);
  });

  it('excludes done specs from the order', () => {
    const specs = [
      spec('a', { isDone: true }),
      spec('b', { blockedBy: ['a'] }),
    ];
    const order = computeRecommendedOrder(specs);
    expect(order.map(e => e.id)).toEqual(['b']);
  });

  it('excludes specs that participate in a cycle', () => {
    const specs = [
      spec('a', { blockedBy: ['b'] }),
      spec('b', { blockedBy: ['a'] }),
      spec('c'),
    ];
    const order = computeRecommendedOrder(specs);
    expect(order.map(e => e.id)).toEqual(['c']);
  });

  it('tie-breaks ready specs by priority (P0 first)', () => {
    const specs = [
      spec('low', { priority: 'P3' }),
      spec('high', { priority: 'P0' }),
      spec('mid', { priority: 'P1' }),
    ];
    const order = computeRecommendedOrder(specs);
    expect(order.map(e => e.id)).toEqual(['high', 'mid', 'low']);
  });

  it('tie-breaks equal priority by older created date', () => {
    const specs = [
      spec('newer', { priority: 'P1', createdDate: '2026-03-01' }),
      spec('older', { priority: 'P1', createdDate: '2026-01-01' }),
    ];
    const order = computeRecommendedOrder(specs);
    expect(order.map(e => e.id)).toEqual(['older', 'newer']);
  });

  it('treats missing priority as P2 for tie-break', () => {
    const specs = [
      spec('noPrio', { createdDate: '2026-01-01' }),       // → P2
      spec('p1', { priority: 'P1', createdDate: '2026-05-01' }),
      spec('p3', { priority: 'P3', createdDate: '2026-01-01' }),
    ];
    const order = computeRecommendedOrder(specs);
    expect(order.map(e => e.id)).toEqual(['p1', 'noPrio', 'p3']);
  });

  it('respects dependencies over priority for ordering', () => {
    // Even though 'dep' is low priority, it must precede the high-prio spec.
    const specs = [
      spec('high', { priority: 'P0', blockedBy: ['dep'] }),
      spec('dep', { priority: 'P3' }),
    ];
    const order = computeRecommendedOrder(specs);
    expect(order.map(e => e.id)).toEqual(['dep', 'high']);
  });

  it('falls back to id for fully-equal ties (deterministic)', () => {
    const specs = [
      spec('b', { priority: 'P2', createdDate: '2026-01-01' }),
      spec('a', { priority: 'P2', createdDate: '2026-01-01' }),
    ];
    const order = computeRecommendedOrder(specs);
    expect(order.map(e => e.id)).toEqual(['a', 'b']);
  });

  it('returns empty for an empty set', () => {
    expect(computeRecommendedOrder([])).toEqual([]);
  });
});
