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
| ASGN-004 | Assignment toggle in Kanban header, WS ack/error handling | kanban-board.ts, dashboard-view.ts |

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

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| ui/src/server/specs-reader.ts | Modified | ASGN-001 |
| specwright/scripts/mcp/kanban-mcp-server.ts | Modified | ASGN-001 |
| ui/src/server/websocket.ts | Modified | ASGN-002 |
| ui/frontend/src/components/kanban-board.ts | Modified | ASGN-004 |
| ui/frontend/src/views/dashboard-view.ts | Modified | ASGN-004 |
