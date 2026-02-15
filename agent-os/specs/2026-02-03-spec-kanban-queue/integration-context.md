# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| SKQ-001 | Queue-Sidebar und Queue-Item Components | New components for queue display in dashboard |
| SKQ-002 | Drag-Drop Integration für Queue | Drag-drop for specs and queue item reordering |
| SKQ-003 | Git-Strategie bei Queue-Add | Git strategy dialog on queue add, strategy in QueueItem |
| SKQ-004 | Backend Queue-Management | QueueService, QueueHandler, WebSocket integration |
| SKQ-005 | Queue-Execution & Auto-Skip | Start/Stop queue, auto-advance to next spec, status tracking |
| SKQ-006 | Dynamische Queue-Bearbeitung | Validation methods for dynamic editing, protected item visual feedback |

---

## New Exports & APIs

### Components

- `ui/src/components/queue/aos-queue-sidebar.ts` → `<aos-queue-sidebar .queue=${queueItems} @queue-add @queue-remove @queue-reorder>`
  - Queue sidebar component that acts as drop zone for specs
  - Displays queue items and empty state
  - Dispatches `queue-add`, `queue-remove`, and `queue-reorder` custom events
  - Supports dropping specs at specific positions in the queue
  - Handles drag-over visual feedback

- `ui/src/components/queue/aos-queue-item.ts` → `<aos-queue-item .item=${queueItem}>`
  - Single queue item display with status and remove button
  - Shows position, spec name, status icon/label
  - Draggable for reordering (only when status is 'pending')
  - Dispatches `queue-item-remove` and `queue-item-reorder` events

### Services

- `src/server/services/queue.service.ts` → `queueService` (singleton)
  - `getState(projectPath)` - Returns full queue state (includes isQueueRunning)
  - `getItems(projectPath)` - Returns queue items array
  - `add(projectPath, specId, specName, gitStrategy?, position?)` - Adds spec to queue
  - `remove(projectPath, queueItemId)` - Removes item from queue
  - `reorder(projectPath, queueItemId, newPosition)` - Reorders queue
  - `updateStatus(projectPath, queueItemId, status)` - Updates item status
  - `getNextPending(projectPath)` - Gets next pending item
  - `clear(projectPath)` - Clears entire queue
  - `clearCompleted(projectPath)` - Removes completed/failed/skipped items
  - `startQueue(projectPath)` - Starts queue execution, returns first item
  - `stopQueue(projectPath)` - Stops queue (no auto-advance after current spec)
  - `startNextSpec(projectPath)` - Gets next pending and marks running
  - `handleSpecComplete(projectPath, queueItemId, success)` - Handles completion, auto-advances
  - `isQueueActive(projectPath)` - Checks if queue is running
  - `canAdd(projectPath, specId)` - Validates if spec can be added (SKQ-006)
  - `canRemove(projectPath, queueItemId)` - Validates if item can be removed (SKQ-006)
  - `canReorder(projectPath, queueItemId)` - Validates if item can be reordered (SKQ-006)
  - `addToRunningQueue(...)` - Explicitly adds spec while queue is running (SKQ-006)
  - `removeFromRunningQueue(...)` - Removes pending item while queue is running (SKQ-006)
  - `reorderRunningQueue(...)` - Reorders pending items while queue is running (SKQ-006)

- `src/server/handlers/queue.handler.ts` → `queueHandler` (singleton)
  - Handles WebSocket messages: queue.add, queue.remove, queue.reorder, queue.state, queue.clear, queue.clearCompleted, queue.start, queue.stop
  - Broadcasts state changes to all project clients
  - `handleStart(client, projectPath)` - Starts queue execution, returns first item
  - `handleStop(client, projectPath)` - Stops queue after current spec
  - `handleSpecComplete(projectPath, specId, success)` - Handles spec completion, auto-advances

### Hooks / Utilities
<!-- New hooks, helpers, utilities -->
_None yet_

### Types / Interfaces

- `ui/src/components/queue/aos-queue-item.ts`:
  - `QueueItemStatus`: 'pending' | 'running' | 'done' | 'failed' | 'skipped'
  - `QueueItem`: { id, specId, specName, status, position, gitStrategy? }

- `ui/src/components/queue/aos-queue-sidebar.ts`:
  - Re-exports `QueueItem` and `QueueItemStatus`

- `ui/src/components/git-strategy-dialog.ts`:
  - `GitStrategy`: 'branch' | 'worktree'
  - `GitStrategyContext`: 'story-start' | 'queue-add'
  - `GitStrategySelection`: { strategy, storyId?, specId, context? }

---

## Integration Notes

**SKQ-001 Integration Points:**
- `aos-queue-sidebar` is integrated in `dashboard-view.ts` renderSpecsList()
- Dashboard layout uses new CSS class `dashboard-content-with-queue` (grid layout)
- Queue state `@state() private queue: QueueItem[] = []` exists in dashboard-view
- Queue event handlers `handleQueueAdd` and `handleQueueRemove` exist in dashboard-view
- Gateway messages `queue.add` and `queue.remove` are sent but backend not yet implemented

**SKQ-002 Integration Points:**
- Spec cards in dashboard are now draggable with `draggable="true"` and drag handlers
- Queue items can be reordered via drag-drop (only pending items)
- New `handleQueueReorder` in dashboard-view.ts handles reordering
- Gateway message `queue.reorder` will be sent to backend (backend not yet implemented)
- Drop zone visual feedback with `drop-zone-active` CSS class

**CSS Location:**
- Queue styles added to `ui/src/styles/theme.css` after kanban styles
- Uses CSS custom properties from theme
- Responsive breakpoint at 1024px stacks queue below specs

**SKQ-003 Integration Points:**
- `git-strategy-dialog.ts` now has `context` property for different dialog usage contexts
- `aos-queue-sidebar.ts` imports and uses the dialog with `context="queue-add"`
- `queue-add` event now includes `gitStrategy` in the detail
- `QueueItem` interface has optional `gitStrategy` property for display

**SKQ-004 Integration Points:**
- `QueueService` manages in-memory queue state per project
- `QueueHandler` processes WebSocket messages and broadcasts state
- WebSocket handlers registered in `websocket.ts`: queue.add, queue.remove, queue.reorder, queue.state, queue.clear, queue.clearCompleted
- Gateway methods added: sendQueueAdd, sendQueueRemove, sendQueueReorder, requestQueueState, sendQueueClear, sendQueueClearCompleted
- Queue state broadcast to all clients on a project when changes occur

**SKQ-005 Integration Points:**
- `queueService.startQueue()` starts queue, marks first item as running
- `queueService.handleSpecComplete()` handles completion, auto-advances
- `queueHandler.handleStart/Stop()` for WebSocket start/stop messages
- `aos-queue-sidebar` has Start/Stop buttons with queue-start/queue-stop events
- `dashboard-view.ts` handles queue.state and queue.complete events from backend
- `QueueState.isQueueRunning` tracks active queue execution state

**SKQ-006 Integration Points:**
- `queueService.canAdd/canRemove/canReorder()` validate operations before execution
- `queueHandler.handleAdd/Remove/Reorder()` now use validation methods before processing
- `aos-queue-item` has `isEditable()` and `getProtectedTooltip()` for visual feedback
- Protected items (running/done/failed/skipped) show descriptive tooltips
- Frontend prevents drag on non-pending items via `draggable="${item.status === 'pending'}"`
- CSS `.queue-item.protected` class for visual distinction of non-editable items

**Next Stories Should:**
- System Stories (SKQ-997, SKQ-998, SKQ-999): Code Review, Integration Validation, PR Finalization

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| ui/src/components/queue/aos-queue-sidebar.ts | Created | SKQ-001 |
| ui/src/components/queue/aos-queue-item.ts | Created | SKQ-001 |
| ui/src/styles/theme.css | Modified (added queue styles) | SKQ-001 |
| ui/src/views/dashboard-view.ts | Modified (queue integration) | SKQ-001 |
| ui/src/components/queue/aos-queue-sidebar.ts | Modified (added reorder support) | SKQ-002 |
| ui/src/components/queue/aos-queue-item.ts | Modified (simplified, disabled remove tooltip) | SKQ-002 |
| ui/src/components/spec-card.ts | Modified (added draggable) | SKQ-002 |
| ui/src/styles/theme.css | Modified (added drag-drop styles) | SKQ-002 |
| ui/src/views/dashboard-view.ts | Modified (added handleQueueReorder) | SKQ-002 |
| src/server/services/queue.service.ts | Modified (added execution methods) | SKQ-005 |
| src/server/handlers/queue.handler.ts | Modified (added start/stop handlers) | SKQ-005 |
| src/server/websocket.ts | Modified (added queue.start/stop handlers) | SKQ-005 |
| ui/src/components/queue/aos-queue-sidebar.ts | Modified (added Start/Stop UI) | SKQ-005 |
| ui/src/views/dashboard-view.ts | Modified (queue running state) | SKQ-005 |
| ui/src/gateway.ts | Modified (sendQueueStart/Stop) | SKQ-005 |
| ui/src/styles/theme.css | Modified (queue control styles) | SKQ-005 |
| ui/src/components/git-strategy-dialog.ts | Modified (added context property) | SKQ-003 |
| ui/src/components/queue/aos-queue-sidebar.ts | Modified (dialog integration) | SKQ-003 |
| ui/src/components/queue/aos-queue-item.ts | Modified (gitStrategy display) | SKQ-003 |
| src/server/services/queue.service.ts | Created | SKQ-004 |
| src/server/handlers/queue.handler.ts | Created | SKQ-004 |
| src/server/websocket.ts | Modified (queue handlers) | SKQ-004 |
| ui/src/gateway.ts | Modified (queue methods) | SKQ-004 |
| src/server/services/queue.service.ts | Modified (validation methods) | SKQ-006 |
| src/server/handlers/queue.handler.ts | Modified (use validation) | SKQ-006 |
| ui/src/components/queue/aos-queue-item.ts | Modified (protected state) | SKQ-006 |
| ui/src/styles/theme.css | Modified (protected item styles) | SKQ-006 |
