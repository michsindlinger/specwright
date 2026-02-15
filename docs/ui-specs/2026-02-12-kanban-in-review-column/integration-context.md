# Integration Context - Kanban In Review Column

## Completed Stories

| Story ID | Summary | Key Files |
|----------|---------|-----------|
| KIRC-001 | Backend in_review status as first-class frontend status | specs-reader.ts, websocket.ts |
| KIRC-002 | MCP kanban_complete_story sets in_review; new kanban_approve_story tool | kanban-mcp-server.ts |
| KIRC-003 | Frontend In Review column between In Progress and Done; workflow moves to in_review | kanban-board.ts |

## New Exports & APIs

**Types:**
- `agent-os-ui/src/server/specs-reader.ts` -> `StoryInfo.status` now includes `'in_review'` in its union type
- `mapJsonStatusToFrontend()` returns `'in_review'` as distinct status (no longer mapped to `'in_progress'`)
- `mapFrontendStatusToJson()` accepts `'in_review'` and maps to `'in_review'`
- `updateStoryStatus()` accepts `'in_review'` as `newStatus` parameter

**WebSocket:**
- `handleSpecsStoryUpdateStatus` in `websocket.ts` accepts `'in_review'` status from frontend

**Frontend Components:**
- `agent-os-ui/ui/src/components/kanban-board.ts` -> `KanbanStatus` type now includes `'in_review'`
- `agent-os-ui/ui/src/components/kanban-board.ts` -> `StoryInfo.status` type now includes `'in_review'`
- `agent-os-ui/ui/src/components/kanban-board.ts` -> `handleWorkflowComplete` moves story to `'in_review'` (not `'done'`)
- `agent-os-ui/ui/src/components/kanban-board.ts` -> `canMoveToInProgress` correctly treats `'in_review'` as not-done for dependency checks
- `agent-os-ui/ui/src/components/kanban-board.ts` -> New column "In Review" rendered between "In Progress" and "Done" with `.in-review` CSS class (orange/amber border)

**MCP Tools:**
- `~/.agent-os/scripts/mcp/kanban-mcp-server.ts` -> `handleKanbanCompleteStory` now sets `story.status = 'in_review'` (not `'done'`)
- `~/.agent-os/scripts/mcp/kanban-mcp-server.ts` -> `handleKanbanApproveStory` new handler: moves `in_review` -> `done`, sets `completedAt` and `dodChecked`
- `kanban_approve_story` MCP tool: `{ specId, storyId }` - only works from `in_review` status

## Integration Notes

- `KanbanJsonStatus` type already had `'in_review'` - no change needed there
- `updateBoardStatus()` already counted `in_review` stories - no change needed
- `KanbanJsonPhase` does NOT have `'in_review'` - phase stays `'in_progress'` when status is `'in_review'`
- Legacy MD kanban methods updated for type consistency but map `in_review` to `'In Progress'` section
- Frontend `KanbanStatus` type in `kanban-board.ts` now includes `'in_review'` (KIRC-003 done)
- `kanban_complete_story` no longer sets `completedAt` or `dodChecked` - these are now set by `kanban_approve_story`
- `remainingStories` filter: `s.status !== 'done'` correctly counts `in_review` as NOT done

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| agent-os-ui/src/server/specs-reader.ts | Modified | KIRC-001 |
| agent-os-ui/src/server/websocket.ts | Modified | KIRC-001 |
| ~/.agent-os/scripts/mcp/kanban-mcp-server.ts | Modified | KIRC-002 |
| agent-os-ui/ui/src/components/kanban-board.ts | Modified | KIRC-003 |
