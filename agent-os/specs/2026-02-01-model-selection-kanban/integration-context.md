# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| MSK-001 | Model Dropdown Component on Story Card | `story-card.ts`, `kanban-board.ts`, `theme.css` |
| MSK-002 | Backend Model persistence via Markdown | `specs-reader.ts`, `backlog-reader.ts`, `websocket.ts` |
| MSK-003 | Workflow Executor passes --model flag to CLI | `workflow-executor.ts`, `websocket.ts` |

---

## New Exports & APIs

### Components
<!-- New UI components created -->
- `aos-story-card` - Extended with model dropdown (select element)
- Event: `story-model-change` with `{ storyId: string, model: ModelSelection }`

### Services
<!-- New service classes/modules -->
- `SpecsReader.updateStoryModel(projectPath, specId, storyId, model)` - Persists model to kanban-board.md
- `SpecsReader.parseKanbanStatuses()` - Returns `Map<storyId, { status, model }>` from kanban markdown

### Hooks / Utilities
<!-- New hooks, helpers, utilities -->
_None yet_

### Types / Interfaces
<!-- New type definitions -->
- `ModelSelection` = `'opus' | 'sonnet' | 'haiku'` (from `specs-reader.ts` - backend, `story-card.ts` - frontend)
- `StoryInfo.model: ModelSelection` - Required model property (default 'opus')
- `BacklogStoryInfo.model: ModelSelection` - Required model property for backlog stories

---

## Integration Notes

<!-- Important integration information for subsequent stories -->
- **MSK-002** ✅ DONE: Model column read/write from kanban-board.md markdown
- **MSK-003** ✅ DONE: `--model` flag passed to Claude CLI in `workflow-executor.ts:529`
- The `story-model-change` event bubbles up from `aos-story-card` → `aos-kanban-board` → parent
- Model selection is disabled when story is `in_progress`
- WebSocket handler `specs.story.updateModel` persists model changes to Markdown
- Model column is 8th column in Backlog table (index 7 when parsing pipes)
- `workflow.story.start.ack` response includes `model` field (websocket.ts:990)

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| `agent-os-ui/ui/src/components/story-card.ts` | Modified | MSK-001 |
| `agent-os-ui/ui/src/components/kanban-board.ts` | Modified | MSK-001 |
| `agent-os-ui/ui/src/styles/theme.css` | Modified | MSK-001 |
| `agent-os-ui/ui/src/views/dashboard-view.ts` | Modified | MSK-001 (bug fix) |
| `agent-os-ui/src/server/specs-reader.ts` | Modified | MSK-002 |
| `agent-os-ui/src/server/backlog-reader.ts` | Modified | MSK-002 |
| `agent-os-ui/src/server/websocket.ts` | Modified | MSK-002, MSK-003 |
| `agent-os-ui/src/server/workflow-executor.ts` | Modified | MSK-003 |
