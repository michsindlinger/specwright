# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| ASGN-001 | Backend Data Layer: assignedToBot in kanban.json + SpecsReader | specs-reader.ts, kanban-mcp-server.ts |
| ASGN-002 | WebSocket handler for spec assignment toggle + broadcast | websocket.ts |
| ASGN-003 | Assignment badge + toggle in spec-card overview, spec-assign event + WS handlers | spec-card.ts, dashboard-view.ts |
| ASGN-004 | Assignment toggle in Kanban header, WS ack/error handling | kanban-board.ts, dashboard-view.ts |
| ASGN-005 | CLI slash command /assign-spec for toggling spec assignment without Web UI | assign-spec.md |

---

## New Exports & APIs

### Components
<!-- New UI components created -->
_None yet_

### Services
- `ui/src/server/specs-reader.ts` → `isSpecReady(kanban)` - Checks if all stories have status "ready" (boardStatus.ready === total && total > 0)
- `ui/src/server/specs-reader.ts` → `toggleBotAssignment(projectPath, specId)` - Atomic toggle with withKanbanLock, validates ready status before assigning

### Hooks / Utilities
_None yet_

### Types / Interfaces
- `ui/src/server/specs-reader.ts` → `SpecInfo.assignedToBot?: boolean` - Whether spec is assigned to bot
- `ui/src/server/specs-reader.ts` → `SpecInfo.isReady?: boolean` - Whether all stories are ready
- `ui/src/server/specs-reader.ts` → `KanbanBoard.assignedToBot?: boolean` - Whether spec is assigned to bot (server-side)
- `ui/src/server/specs-reader.ts` → `KanbanBoard.isReady?: boolean` - Whether all stories are ready (server-side)
- `ui/src/server/specs-reader.ts` → `KanbanJsonAssignedToBot` - Interface: { assigned, assignedAt, assignedBy }
- `specwright/scripts/mcp/kanban-mcp-server.ts` → `KanbanJsonAssignedToBot` - Same interface in MCP server
- `ui/frontend/src/components/spec-card.ts` → `SpecInfo.assignedToBot?: boolean` - Frontend spec card assignment state
- `ui/frontend/src/components/spec-card.ts` → `SpecInfo.isReady?: boolean` - Frontend spec card ready state
- `ui/frontend/src/components/kanban-board.ts` → `KanbanBoard.assignedToBot?: boolean` - Frontend interface for kanban board
- `ui/frontend/src/components/kanban-board.ts` → `KanbanBoard.isReady?: boolean` - Frontend interface for ready status

---

## Integration Notes

- `assignedToBot` is an optional root-level field in kanban.json: `{ assigned: boolean, assignedAt: string, assignedBy: string }`
- Missing field = not assigned (backward compatible via `?? false`)
- `toggleBotAssignment()` uses `withKanbanLock()` → `readKanbanJsonUnlocked()` → validate → write for atomicity
- ASGN-002 (WebSocket Handler) calls `toggleBotAssignment()` from SpecsReader via `specs.assign` message type
- WebSocket message flow: Client sends `specs.assign` with `{ specId }` → Server toggles via `specsReader.toggleBotAssignment()` → Broadcasts `specs.assign.ack` with `{ specId, assigned, timestamp }` to all project clients
- Error responses (`specs.assign.error`) are sent only to the requesting client
- ASGN-003/004 (Frontend) should use `SpecInfo.assignedToBot` and `SpecInfo.isReady` from list endpoint, and `KanbanBoard.assignedToBot`/`isReady` from kanban endpoint
- ASGN-003/004 (Frontend) should listen for `specs.assign.ack` WebSocket messages to update assignment UI in real-time
- ASGN-004: Kanban board has assignment toggle in header (bot icon + toggle slider), dispatches `spec-assign-toggle` event
- ASGN-004: dashboard-view handles `spec-assign-toggle` by sending `specs.assign` WS message, updates `this.kanban.assignedToBot` on ack
- ASGN-004: Toggle is disabled with tooltip when `isReady` is false
- ASGN-003: Spec-card has bot icon toggle button (Lucide bot SVG), dispatches `spec-assign` custom event (bubbles + composed)
- ASGN-003: dashboard-view handles `spec-assign` event from grid view spec cards → sends `specs.assign` WS message
- ASGN-003: `onSpecsAssignAck` updates both `this.kanban.assignedToBot` and `this.specs[]` for real-time reactivity
- ASGN-003: Toggle hidden when both `!assignedToBot && !isReady`, disabled when `!isReady`, highlighted with accent color when assigned
- ASGN-005: CLI command `/assign-spec` provides same toggle functionality without Web UI, uses `kanban_read` MCP tool + direct file write, validates ready status before assigning, supports both spec path and spec ID as argument

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| ui/src/server/specs-reader.ts | Modified | ASGN-001 |
| specwright/scripts/mcp/kanban-mcp-server.ts | Modified | ASGN-001 |
| ui/src/server/websocket.ts | Modified | ASGN-002 |
| ui/frontend/src/components/spec-card.ts | Modified | ASGN-003 |
| ui/frontend/src/views/dashboard-view.ts | Modified | ASGN-003 |
| ui/frontend/src/components/kanban-board.ts | Modified | ASGN-004 |
| ui/frontend/src/views/dashboard-view.ts | Modified | ASGN-004 |
| .claude/commands/specwright/assign-spec.md | Created | ASGN-005 |
