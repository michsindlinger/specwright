# Integration Context

## Completed Stories

| Story | Summary | Key Files |
|-------|---------|-----------|
| SPD-001 | Spec-level priority/blockedBy persistence (lock-safe) | `ui/src/server/specs-reader.ts` |
| SPD-002 | Pure graph logic (cycles, topo-order, derived status) + listSpecs enrichment | `ui/src/server/utils/spec-graph.ts`, `ui/src/shared/types/spec-dependencies.protocol.ts`, `ui/src/server/specs-reader.ts` |

## New Exports & APIs

### Components
_None yet_

### Services
_None yet_

### Hooks / Utilities

- `ui/src/server/utils/spec-graph.ts` (pure, no I/O — all operate on a `GraphSpec[]`):
  - `detectCycles(specs): Set<string>` → ids of specs on any dependency cycle.
  - `wouldCreateCycle(specs, from, to): boolean` → true if `from.blockedBy += to` would close a cycle (use in SPD-003 handler as pre-validation; `from === to` ⇒ true).
  - `deriveDependencyStatus(specs): Map<string, DependencyStatus>` → 'blocked' only when an **active (existing, not-done)** predecessor blocks; done/dangling refs satisfied.
  - `computeRecommendedOrder(specs): OrderEntry[]` → 1-based topo order over **active** specs; done & cyclic specs excluded; tie-break priority(P0 first)→older date→id.
  - `GraphSpec` input shape: `{ id, blockedBy?, priority?, createdDate, isDone }`.

### Backend Methods (SPD-001, used by SPD-003 handlers)

- `SpecsReader.setSpecPriority(projectPath, specId, priority|null)` → `{ priority, error? }` (lock-safe; validates P0–P3).
- `SpecsReader.setSpecBlockedBy(projectPath, specId, string[])` → `{ blockedBy, error? }` (lock-safe; empty array clears field). Cycle pre-check is the **caller's** responsibility (use `wouldCreateCycle`).

### Types / Interfaces

- `ui/src/shared/types/spec-dependencies.protocol.ts` (shared backend/frontend):
  - `Priority` = `'P0'|'P1'|'P2'|'P3'`; `PRIORITIES` (ordered, highest first); `DEFAULT_PRIORITY` = `'P2'` (display-only, never persisted); `isPriority(v)` guard.
  - `DependencyStatus` = `'ready'|'blocked'`.
  - `OrderEntry` = `{ id, index }` (1-based).
- `SpecInfo` (`specs-reader.ts`) now also carries derived, **non-persisted**: `dependencyStatus?: DependencyStatus`, `orderIndex?: number` (absent for done/cyclic specs). Populated by `listSpecs()` via `enrichWithGraphState()`.

## Integration Notes

- Derived state (`dependencyStatus`, `orderIndex`) is computed **on read** in `listSpecs()` only — `getSpecInfo()`/`getKanbanBoard()` do not enrich (single-spec context lacks the full graph). Frontend order-view (SPD-006) consumes `orderIndex`; resolve `blockedBy` ids → names client-side.
- A spec counts as "done" for the graph when `storyCount > 0 && completedCount >= storyCount`.
- `blockedBy` is the single canonical edge direction ("A prerequisite for B" ⇒ `B.blockedBy += A`).
