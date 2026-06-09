/**
 * spec-graph.ts — Pure graph functions over the spec dependency set.
 *
 * NO I/O. Every function takes the already-loaded spec list and returns a
 * computed result. Used by `SpecsReader.listSpecs()` to enrich `SpecInfo`
 * (derived dependency status + recommended order) and by the WebSocket handler
 * (SPD-003) to reject cycle-creating edges before they are persisted.
 *
 * Edge semantics: `spec.blockedBy` lists the IDs this spec DEPENDS ON
 * (its predecessors). In the topological order a predecessor comes before the
 * spec that is blocked by it.
 *
 * Locked decisions reflected here:
 * - Done predecessors are considered satisfied (they never block).
 * - Only active (existing, not-done) specs can block; dangling/unknown refs
 *   are ignored for status/order but still respected for cycle detection over
 *   existing specs.
 * - Tie-break for the recommended order: priority (P0 first), then created
 *   date (older first), then id (stable).
 */

import {
  DEFAULT_PRIORITY,
  PRIORITIES,
  type DependencyStatus,
  type OrderEntry,
  type Priority,
} from '../../shared/types/spec-dependencies.protocol.js';

/**
 * Minimal spec shape the graph functions operate on. Decoupled from the full
 * `SpecInfo` so the functions stay trivially unit-testable.
 */
export interface GraphSpec {
  id: string;
  /** IDs this spec depends on (predecessors). */
  blockedBy?: string[];
  /** Explicit priority; absent → treated as DEFAULT_PRIORITY for sorting. */
  priority?: string;
  /** ISO date or `YYYY-MM-DD` prefix used for tie-breaking. */
  createdDate: string;
  /** True when every story/task is complete — a done spec never blocks successors. */
  isDone: boolean;
}

function priorityRank(priority: string | undefined): number {
  const p = (priority ?? DEFAULT_PRIORITY) as Priority;
  const idx = PRIORITIES.indexOf(p);
  // Unknown values sort after all known priorities.
  return idx === -1 ? PRIORITIES.length : idx;
}

/**
 * Stable comparison used for topological tie-breaking and ordering:
 * higher priority first, then older created date, then id.
 */
function compareSpecs(a: GraphSpec, b: GraphSpec): number {
  const pr = priorityRank(a.priority) - priorityRank(b.priority);
  if (pr !== 0) return pr;
  const dt = a.createdDate.localeCompare(b.createdDate);
  if (dt !== 0) return dt;
  return a.id.localeCompare(b.id);
}

/**
 * Builds an adjacency map of dependency edges restricted to existing specs.
 * Returns, per spec id, the set of its predecessors that actually exist in the
 * given set (dangling references are dropped). Self-references are ignored.
 */
function buildExistingEdges(specs: GraphSpec[]): Map<string, Set<string>> {
  const ids = new Set(specs.map(s => s.id));
  const edges = new Map<string, Set<string>>();
  for (const spec of specs) {
    const preds = new Set<string>();
    for (const dep of spec.blockedBy ?? []) {
      if (dep !== spec.id && ids.has(dep)) preds.add(dep);
    }
    edges.set(spec.id, preds);
  }
  return edges;
}

/**
 * Detects all specs participating in a dependency cycle.
 *
 * Operates over edges between existing specs (done status is irrelevant to the
 * structural cycle). Returns the set of spec ids that lie on at least one cycle.
 *
 * Implementation: iterative Tarjan-style SCC via DFS; any SCC of size > 1, plus
 * any node with a self-loop (already filtered out here), is part of a cycle.
 */
export function detectCycles(specs: GraphSpec[]): Set<string> {
  const edges = buildExistingEdges(specs);
  const inCycle = new Set<string>();

  // Color-based DFS cycle marking: walk each node, track the active recursion
  // stack; when we hit a node already on the stack, every node from that node
  // up to the current one is on a cycle.
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const s of specs) color.set(s.id, WHITE);

  for (const start of specs) {
    if (color.get(start.id) !== WHITE) continue;

    // Iterative DFS with an explicit stack of (node, iterator over preds).
    const stack: Array<{ node: string; preds: string[]; i: number }> = [
      { node: start.id, preds: [...(edges.get(start.id) ?? [])], i: 0 },
    ];
    const onStack: string[] = [start.id];
    color.set(start.id, GRAY);

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      if (frame.i < frame.preds.length) {
        const next = frame.preds[frame.i++];
        const c = color.get(next);
        if (c === GRAY) {
          // Back-edge → cycle. Mark from `next` up to the current top of stack.
          const fromIdx = onStack.lastIndexOf(next);
          if (fromIdx !== -1) {
            for (let k = fromIdx; k < onStack.length; k++) inCycle.add(onStack[k]);
          }
        } else if (c === WHITE) {
          color.set(next, GRAY);
          onStack.push(next);
          stack.push({ node: next, preds: [...(edges.get(next) ?? [])], i: 0 });
        }
      } else {
        color.set(frame.node, BLACK);
        onStack.pop();
        stack.pop();
      }
    }
  }

  return inCycle;
}

/**
 * Returns true if adding the edge "from depends on to" (i.e. `from.blockedBy += to`)
 * would create a cycle in the existing graph.
 *
 * A new edge from→to closes a cycle iff `to` can already reach `from` (there is
 * a path to → … → from). Identity (from === to) is treated as a cycle.
 */
export function wouldCreateCycle(specs: GraphSpec[], from: string, to: string): boolean {
  if (from === to) return true;
  const edges = buildExistingEdges(specs);
  // If either endpoint is unknown, no structural cycle is possible yet.
  if (!edges.has(from) || !edges.has(to)) return false;

  // Reachability from `to` following dependency edges (node → its predecessors).
  const seen = new Set<string>();
  const stack = [to];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node === from) return true;
    if (seen.has(node)) continue;
    seen.add(node);
    for (const pred of edges.get(node) ?? []) {
      if (!seen.has(pred)) stack.push(pred);
    }
  }
  return false;
}

/**
 * Derives per-spec dependency status.
 *
 * A spec is 'blocked' when at least one of its `blockedBy` refs points to an
 * active (existing AND not-done) spec; otherwise 'ready'. Done predecessors and
 * dangling refs are treated as satisfied.
 */
export function deriveDependencyStatus(specs: GraphSpec[]): Map<string, DependencyStatus> {
  const byId = new Map(specs.map(s => [s.id, s]));
  const result = new Map<string, DependencyStatus>();
  for (const spec of specs) {
    let blocked = false;
    for (const dep of spec.blockedBy ?? []) {
      if (dep === spec.id) continue;
      const predecessor = byId.get(dep);
      if (predecessor && !predecessor.isDone) {
        blocked = true;
        break;
      }
    }
    result.set(spec.id, blocked ? 'blocked' : 'ready');
  }
  return result;
}

/**
 * Computes the recommended topological execution order over ACTIVE (not-done)
 * specs using Kahn's algorithm. Done specs are excluded entirely (their work is
 * complete) and do not count as predecessors. Specs that participate in a cycle
 * are excluded from the order (the caller surfaces them as "not yet orderable").
 *
 * Ready-queue tie-break: priority (P0 first), then older created date, then id.
 * Returns 1-based `OrderEntry` items in execution order.
 */
export function computeRecommendedOrder(specs: GraphSpec[]): OrderEntry[] {
  const active = specs.filter(s => !s.isDone);
  const activeIds = new Set(active.map(s => s.id));
  const cyclic = detectCycles(specs);

  // Orderable = active and not part of a cycle.
  const orderable = active.filter(s => !cyclic.has(s.id));
  const orderableIds = new Set(orderable.map(s => s.id));
  const specById = new Map(orderable.map(s => [s.id, s]));

  // In-degree = count of predecessors that are themselves orderable.
  // (Done predecessors are not in `active`; cyclic predecessors are excluded.)
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>(); // predecessor → specs depending on it
  for (const spec of orderable) {
    let deg = 0;
    for (const dep of spec.blockedBy ?? []) {
      if (dep === spec.id) continue;
      if (orderableIds.has(dep)) {
        deg++;
        const list = dependents.get(dep) ?? [];
        list.push(spec.id);
        dependents.set(dep, list);
      }
      // Predecessors that are active-but-cyclic block nothing here; if a spec
      // depends on a cyclic one it still gets ordered (best-effort), matching
      // "exclude only the cyclic specs themselves".
    }
    indegree.set(spec.id, deg);
  }

  // Ready queue: all orderable specs with in-degree 0, sorted by tie-break.
  const ready = orderable.filter(s => (indegree.get(s.id) ?? 0) === 0);
  ready.sort(compareSpecs);

  const order: OrderEntry[] = [];
  let index = 1;
  while (ready.length > 0) {
    const next = ready.shift()!;
    order.push({ id: next.id, index: index++ });
    for (const depId of dependents.get(next.id) ?? []) {
      const deg = (indegree.get(depId) ?? 0) - 1;
      indegree.set(depId, deg);
      if (deg === 0) {
        const spec = specById.get(depId);
        if (spec) {
          // Insert maintaining tie-break order.
          const pos = ready.findIndex(r => compareSpecs(spec, r) < 0);
          if (pos === -1) ready.push(spec);
          else ready.splice(pos, 0, spec);
        }
      }
    }
  }

  // Reference activeIds to keep intent explicit (active set drives the order).
  void activeIds;
  return order;
}
