# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| STORY-001 | Drag & Drop Infrastructure for Kanban | story-card.ts (draggable), kanban-board.ts (drop zones), theme.css (drag styles) |
| STORY-002 | Pre-Drag Validation for DoR and Dependencies | kanban-board.ts (validation logic), theme.css (blocked/valid drop zones) |
| STORY-003 | Execute-Tasks Trigger on Drag to In Progress | kanban-board.ts (workflow trigger), websocket.ts (handler), specs-reader.ts (updateStoryStatus) |
| STORY-004 | Working Indicator for Workflow Status | story-status-badge.ts (working/error status), kanban-board.ts (workflow state tracking), story-card.ts (effective status), theme.css (pulse animation) |
| STORY-005 | Git Strategy Selection Dialog | git-strategy-dialog.ts (new component), kanban-board.ts (dialog integration), websocket.ts (gitStrategy handler), workflow-executor.ts (branch/worktree creation) |

---

## New Exports & APIs

### Components
<!-- New UI components created -->
- `aos-git-strategy-dialog` - Dialog for selecting Git strategy:
  - Properties: `open`, `storyId`, `specId`
  - Emits `git-strategy-select` with `{ strategy, storyId, specId }`
  - Emits `git-strategy-cancel`
  - Shows two options: "Git Branch" (recommended) and "Git Worktree"

- `aos-story-card` - Now draggable with drag events:
  - Emits `story-drag-start` with `{ storyId, story }`
  - Emits `story-drag-end` with `{ storyId }`
  - Has `.dragging` CSS class during drag

- `aos-kanban-board` - Now has drop zone support:
  - Listens for `story-drag-start`, `story-drag-end`
  - Emits `story-move` with `{ storyId, fromStatus, toStatus }`
  - Columns have `.drop-zone-active` class when hovering

### Services
<!-- New service classes/modules -->
- `specs-reader.ts` → `updateStoryStatus(projectPath, specId, storyId, newStatus)`
  - Updates story status in kanban-board.md (moves between sections)
  - Updates board status counts automatically

### Utilities / Validation Functions
<!-- New hooks, helpers, utilities -->
- `kanban-board.ts` → `canMoveToInProgress(story, allStories): MoveValidation`
  - Validates if a story can move to "in_progress"
  - Checks `dorComplete` flag and `dependencies` status
  - Returns `{ valid: boolean, reason?: string }`

- `kanban-board.ts` → `MoveValidation` interface
  - `{ valid: boolean, reason?: string }`

### Types / Interfaces
<!-- New type definitions -->
- `KanbanStatus` - `'backlog' | 'in_progress' | 'done'` (exported from kanban-board.ts)
- `WorkflowStatus` - `'idle' | 'working' | 'success' | 'error'` (exported from kanban-board.ts, story-card.ts)
- `WorkflowState` - `{ status: WorkflowStatus; error?: string }` (exported from kanban-board.ts)
- `StoryStatus` - Now includes `'working' | 'error'` (exported from story-status-badge.ts)
- `GitStrategy` - `'branch' | 'worktree'` (exported from git-strategy-dialog.ts, workflow-executor.ts)
- `GitStrategySelection` - `{ strategy: GitStrategy; storyId: string; specId: string }` (exported from git-strategy-dialog.ts)

---

## Integration Notes

<!-- Important integration information for subsequent stories -->
- **HTML5 Drag & Drop API**: Uses native browser drag/drop (no libraries)
- **Event Pattern**: CustomEvents with `bubbles: true, composed: true`
- **DataTransfer**: Story ID passed via `e.dataTransfer.setData('text/plain', storyId)`
- **CSS Classes**: `.dragging` on card, `.drop-zone-active`, `.drop-zone-valid`, `.drop-zone-blocked` on column
- **Validation**: Moves to "in_progress" are validated via `canMoveToInProgress()`:
  - Checks `dorComplete` flag (must be true)
  - Checks all `dependencies` are in "done" status
- **Toast Events**: On blocked drop, emits `show-toast` event with `{ message, type: 'error' }`
- **Workflow Trigger (KSE-003)**:
  - When story moves from `backlog` → `in_progress`, `workflow.story.start` WebSocket event is sent
  - Backend handler updates kanban-board.md and starts `/execute-tasks {specId} {storyId}`
  - Message type: `workflow.story.start` with payload `{ specId, storyId }`
  - Response: `workflow.story.start.ack` with `{ executionId, specId, storyId }`
  - Error: `workflow.story.error` with `{ error, specId?, storyId? }`

- **Working Indicator (KSE-004)**:
  - `aos-kanban-board` tracks workflow status per story in `workflowStates` Map
  - Listens for: `workflow.story.start.ack`, `workflow.interactive.complete`, `workflow.interactive.error`
  - Passes `workflowStatus` and `workflowError` to `aos-story-card`
  - `aos-story-card` computes effective status: workflow status takes precedence over story status
  - `aos-story-status-badge` shows animated "Working" indicator or "Error" with tooltip
  - CSS animation: `@keyframes pulse-working` for rotating pulse effect

- **Git Strategy Selection (KSE-005)**:
  - `aos-kanban-board` shows `aos-git-strategy-dialog` when first story is dragged to In Progress
  - Dialog emits `git-strategy-select` with selected strategy
  - `currentGitStrategy` state tracks selected strategy for subsequent stories
  - `workflow.story.start` message includes `gitStrategy` parameter
  - Backend `startStoryExecution` handles branch/worktree creation
  - Branch strategy: creates feature branch in main directory
  - Worktree strategy: creates git worktree with symlink to specs folder

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| agent-os-ui/ui/src/components/story-card.ts | Modified | STORY-001, STORY-004 |
| agent-os-ui/ui/src/components/kanban-board.ts | Modified | STORY-001, STORY-002, STORY-003, STORY-004, STORY-005 |
| agent-os-ui/ui/src/components/story-status-badge.ts | Modified | STORY-004 |
| agent-os-ui/ui/src/components/git-strategy-dialog.ts | Created | STORY-005 |
| agent-os-ui/ui/src/styles/theme.css | Modified | STORY-001, STORY-002, STORY-004, STORY-005 |
| agent-os-ui/src/server/websocket.ts | Modified | STORY-003, STORY-005 |
| agent-os-ui/src/server/specs-reader.ts | Modified | STORY-003 |
| agent-os-ui/src/server/workflow-executor.ts | Modified | STORY-005 |
