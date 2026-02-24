# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| ASGN-001 | Backend Data Layer: assignedToBot in kanban.json + SpecsReader | specs-reader.ts, kanban-mcp-server.ts |

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
- `ui/src/server/specs-reader.ts` → `KanbanBoard.assignedToBot?: boolean` - Whether spec is assigned to bot
- `ui/src/server/specs-reader.ts` → `KanbanBoard.isReady?: boolean` - Whether all stories are ready
- `ui/src/server/specs-reader.ts` → `KanbanJsonAssignedToBot` - Interface: { assigned, assignedAt, assignedBy }
- `specwright/scripts/mcp/kanban-mcp-server.ts` → `KanbanJsonAssignedToBot` - Same interface in MCP server

---

## Integration Notes

- `assignedToBot` is an optional root-level field in kanban.json: `{ assigned: boolean, assignedAt: string, assignedBy: string }`
- Missing field = not assigned (backward compatible via `?? false`)
- `toggleBotAssignment()` uses `withKanbanLock()` → `readKanbanJsonUnlocked()` → validate → write for atomicity
- ASGN-002 (WebSocket Handler) should call `toggleBotAssignment()` from SpecsReader
- ASGN-003/004 (Frontend) should use `SpecInfo.assignedToBot` and `SpecInfo.isReady` from list endpoint, and `KanbanBoard.assignedToBot`/`isReady` from kanban endpoint

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| ui/src/server/specs-reader.ts | Modified | ASGN-001 |
| specwright/scripts/mcp/kanban-mcp-server.ts | Modified | ASGN-001 |
