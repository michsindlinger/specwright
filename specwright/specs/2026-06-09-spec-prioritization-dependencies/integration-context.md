# Integration Context

## Completed Stories

| Story | Summary | Key Files |
|-------|---------|-----------|
| SPD-001 | Spec-level priority/blockedBy persistence (lock-safe) | `ui/src/server/specs-reader.ts` |
| SPD-002 | Pure graph logic (cycles, topo-order, derived status) + listSpecs enrichment | `ui/src/server/utils/spec-graph.ts`, `ui/src/shared/types/spec-dependencies.protocol.ts`, `ui/src/server/specs-reader.ts` |
| SPD-003 | WebSocket handlers specs.setPriority / specs.setBlockedBy + frontend error handlers | `ui/src/server/websocket.ts`, `ui/frontend/src/views/dashboard-view.ts` |
| SPD-004 | Priority badge + inline selector in spec-card; sort selector (date/priority/order) in dashboard | `ui/frontend/src/components/aos-priority-badge.ts`, `ui/frontend/src/components/spec-card.ts`, `ui/frontend/src/views/dashboard-view.ts`, `ui/frontend/src/styles/theme.css` |
| SPD-005 | Bidirectional dependency editor (blocked-by + is-prerequisite-for) + blocked-by hint on spec-card | `ui/frontend/src/components/aos-spec-dependency-editor.ts`, `ui/frontend/src/components/spec-card.ts` |
| SPD-006 | Topological order view (aos-spec-order-view) with cycle warning and numbered list | `ui/frontend/src/components/aos-spec-order-view.ts`, `ui/frontend/src/views/dashboard-view.ts` |
| SPD-007 | AI dependency analysis service + WS handler + proposal dialog | `ui/src/server/services/dependency-analysis.service.ts`, `ui/src/server/websocket.ts`, `ui/frontend/src/components/aos-dependency-proposal-dialog.ts`, `ui/frontend/src/views/dashboard-view.ts` |
| SPD-008 | Backfill "Alle analysieren" + per-spec re-analyze in order-view; deleteSpec blockedBy cleanup (lock-safe) | `ui/src/server/specs-reader.ts`, `ui/src/server/websocket.ts`, `ui/frontend/src/components/aos-spec-order-view.ts`, `ui/frontend/src/views/dashboard-view.ts` |
| SPD-998 | Integration Validation: lint + build:backend + frontend build all pass; 60/60 spec-relevant tests green; component connections verified active. 22 pre-existing `npm test` failures isolated to orthogonal subsystems (terminal/pty, project-add-modal, model-config, workflow, execution-store) — not caused by this spec. | _(validation only, no code changes)_ |

## New Exports & APIs

### Components

- `ui/frontend/src/components/aos-priority-badge.ts` → `<aos-priority-badge .priority=${p} @priority-change=${handler}>` — P0–P3 badge + dropdown selector; fires `priority-change` with `{ priority: Priority | null }`.
- `ui/frontend/src/components/aos-dependency-proposal-dialog.ts` → `<aos-dependency-proposal-dialog .open=${bool} .loading=${bool} .proposals=${ProposedEdge[]} .allSpecs=${SpecInfo[]} @proposals-apply=${handler} @proposal-dialog-close=${handler}>` — shows AI proposals with confidence badges; fires `proposals-apply` with `{ proposals: ProposedEdge[] }` (only non-dismissed).

### Services

- `ui/src/server/services/dependency-analysis.service.ts` → `dependencyAnalysisService.analyze(projectPath, activeSpecs, targetSpecId?)` — returns `ProposedEdge[]`; reads spec-lites, calls Claude `query()`, escalates medium/low confidence pairs to implementation-plan/spec.md.

### Hooks / Utilities

- `ui/src/server/utils/spec-graph.ts` (pure, no I/O — all operate on a `GraphSpec[]`):
  - `detectCycles(specs): Set<string>` → ids of specs on any dependency cycle.
  - `wouldCreateCycle(specs, from, to): boolean` → true if `from.blockedBy += to` would close a cycle (use in SPD-003 handler as pre-validation; `from === to` ⇒ true).
  - `deriveDependencyStatus(specs): Map<string, DependencyStatus>` → 'blocked' only when an **active (existing, not-done)** predecessor blocks; done/dangling refs satisfied.
  - `computeRecommendedOrder(specs): OrderEntry[]` → 1-based topo order over **active** specs; done & cyclic specs excluded; tie-break priority(P0 first)→older date→id.
  - `GraphSpec` input shape: `{ id, blockedBy?, priority?, createdDate, isDone }`.

### WebSocket Message Types (SPD-003)

- `specs.setPriority` (client→server): `{ type, specId, priority: string|null }` — set or clear priority (P0–P3).
- `specs.setPriority.error` (server→client): `{ type, specId, error }` — validation failure or mutation error.
- `specs.setBlockedBy` (client→server): `{ type, specId, blockedBy: string[] }` — replace full blockedBy list.
- `specs.setBlockedBy.error` (server→client): `{ type, specId, error }` — cycle detected or mutation error.
- On success: both handlers broadcast `{ type: 'specs.list', specs: SpecInfo[] }` to **all project clients** via `webSocketManager.sendToProject()` — no separate ack message.

### Backend Methods (SPD-001, used by SPD-003 handlers)

- `SpecsReader.setSpecPriority(projectPath, specId, priority|null)` → `{ priority, error? }` (lock-safe; validates P0–P3).
- `SpecsReader.setSpecBlockedBy(projectPath, specId, string[])` → `{ blockedBy, error? }` (lock-safe; empty array clears field). Cycle pre-check is the **caller's** responsibility (use `wouldCreateCycle`).

### Types / Interfaces

- `ui/src/shared/types/spec-dependencies.protocol.ts` (shared backend/frontend):
  - `Priority` = `'P0'|'P1'|'P2'|'P3'`; `PRIORITIES` (ordered, highest first); `DEFAULT_PRIORITY` = `'P2'` (display-only, never persisted); `isPriority(v)` guard.
  - `DependencyStatus` = `'ready'|'blocked'`.
  - `OrderEntry` = `{ id, index }` (1-based).
  - `ProposedEdge` = `{ from, to, confidence: 'high'|'medium'|'low', reason, needsReview? }` — AI-proposed dependency edge; `from.blockedBy += to` (from depends on to). Added by SPD-007.
- `SpecInfo` (`specs-reader.ts`) now also carries derived, **non-persisted**: `dependencyStatus?: DependencyStatus`, `orderIndex?: number` (absent for done/cyclic specs). Populated by `listSpecs()` via `enrichWithGraphState()`.

## Integration Notes

- WS handlers for setPriority/setBlockedBy broadcast a fresh `specs.list` (not a narrow ack) so all clients receive updated `dependencyStatus` and `orderIndex` derived fields atomically.
- Frontend registers `specs.setPriority.error` / `specs.setBlockedBy.error` in `dashboard-view.ts` to show error toasts. No separate ack handler needed — `specs.list` (already registered) handles successful updates.
- Cycle check pattern in `handleSpecsSetBlockedBy`: get current graph via `listSpecs()` → map to `GraphSpec[]` → call `wouldCreateCycle(graphSpecs, specId, predecessor)` for each predecessor before mutating.
- Derived state (`dependencyStatus`, `orderIndex`) is computed **on read** in `listSpecs()` only — `getSpecInfo()`/`getKanbanBoard()` do not enrich (single-spec context lacks the full graph). Frontend order-view (SPD-006) consumes `orderIndex`; resolve `blockedBy` ids → names client-side.
- A spec counts as "done" for the graph when `storyCount > 0 && completedCount >= storyCount`.
- `blockedBy` is the single canonical edge direction ("A prerequisite for B" ⇒ `B.blockedBy += A`).
- `SpecInfo` in `spec-card.ts` (frontend) is now extended with `priority?`, `blockedBy?`, `dependencyStatus?`, `orderIndex?` — matches backend shape; consumer components can render all four fields.
- `SortMode` (`'date'|'priority'|'order'`) in `dashboard-view.ts` drives `getSortedSpecs()`. `'order'` sorts by `orderIndex` ascending (specs without orderIndex appended); `'priority'` sorts P0→P3→unset; `'date'` is existing newest-first behavior. Selection persisted to `localStorage`.
- `spec-priority-change` custom event from `spec-card` bubbles `{ specId, priority: string|null }` → `dashboard-view.handleSpecPriorityChange()` → `gateway.send({ type: 'specs.setPriority', ... })` with optimistic local update.
- `dep-editor-analyze` event from `aos-spec-dependency-editor` (🤖 KI-Analyse button) → `dashboard-view.handleDepEditorAnalyze()` → closes dep-editor, opens proposal dialog in loading state, sends `specs.analyzeDependencies`.
- `specs.analyzeDependencies` (client→server): `{ type, specId? }` — run AI analysis for all active specs (or focused on specId). Sends started/result/error responses back to requesting client only (not broadcast).
- `specs.analyzeDependencies.started` (server→client): opens proposal dialog in loading state.
- `specs.analyzeDependencies.result` (server→client): `{ type, proposals: ProposedEdge[], specId? }` — proposals for the dialog.
- `specs.analyzeDependencies.error` (server→client): `{ type, error }` — shows error toast, closes loading dialog.
- Confirmed proposals in `aos-dependency-proposal-dialog` fire `proposals-apply` → `dashboard-view.handleProposalsApply()` → sends `specs.setBlockedBy` per confirmed edge (appending to existing blockedBy, skipping duplicates).
- SPD-008 backfill: `aos-spec-order-view` exposes `order-view-analyze-all` event (toolbar "🤖 Alle analysieren" button) and `order-view-analyze-spec` event (per-row 🤖 button, carries `{ specId }`). Both → `dashboard-view` → `gateway.send({ type: 'specs.analyzeDependencies', specId? })` → existing proposal dialog flow.
- SPD-008 cleanup: `SpecsReader.deleteSpec()` now calls `cleanupBlockedByRef(projectPath, deletedSpecId)` after folder deletion. `handleSpecsDelete` broadcasts a fresh `specs.list` to all project clients after a successful delete so the dependency graph view is immediately consistent.
- `SpecsReader.cleanupBlockedByRef(projectPath, deletedSpecId)`: iterates all other spec dirs, acquires `withKanbanLock` per spec, removes `deletedSpecId` from `blockedBy`, appends `spec_blocked_by_cleanup` changeLog entry. No-op if the spec has no kanban.json or doesn't reference the deleted ID.
