/**
 * Spec Dependencies Protocol Types
 *
 * Shared (backend + frontend) types for the Spec-Prioritization &
 * Dependency-Sequencing feature. Persisted state is only the raw `blockedBy`
 * edge plus the optional `priority`; everything else here is derived on read.
 *
 * SPD-002 introduces the graph-level types (Priority, DependencyStatus,
 * OrderEntry). WebSocket message shapes and the AI ProposedEdge type are added
 * by later phases (SPD-003 / SPD-007) alongside their handlers.
 */

// ─── Priority ─────────────────────────────────────────────────────────────

/** Valid spec priorities. P0 = highest. Absence is treated as P2 for display/sort. */
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

/** All valid priorities, highest first. Single source of truth for validation/sort. */
export const PRIORITIES: readonly Priority[] = ['P0', 'P1', 'P2', 'P3'] as const;

/** Display default applied when a spec has no explicit priority (never persisted). */
export const DEFAULT_PRIORITY: Priority = 'P2';

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value);
}

// ─── Derived dependency state ───────────────────────────────────────────────

/**
 * Derived (never persisted) per-spec readiness:
 * - 'ready'   → no active (existing, not-done) predecessor blocks this spec
 * - 'blocked' → at least one active predecessor is not yet done
 */
export type DependencyStatus = 'ready' | 'blocked';

/**
 * One entry in the recommended topological execution order.
 * `index` is 1-based. Specs participating in a cycle are NOT included
 * (the caller surfaces them as "not yet orderable").
 */
export interface OrderEntry {
  id: string;
  index: number;
}
