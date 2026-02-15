# Integration Context - Global Spec Queue

## Completed Stories

| Story ID | Summary | Key Files |
|----------|---------|-----------|
| GSQ-001 | Refactored QueueService from per-project Map to single global QueueState. QueueItem now includes projectPath/projectName. Handler gets projectPath from message payload. Broadcast goes to ALL clients. | queue.service.ts, queue.handler.ts, websocket.ts, workflow-executor.ts |
| GSQ-002 | Added multi-project spec loading: `listAllSpecs()` method in SpecsReader and `specs.list-all` WebSocket handler. Returns specs grouped by project with projectPath/projectName on each SpecInfo. | specs-reader.ts, websocket.ts |
| GSQ-003 | Created ExecutionLogService singleton for queue execution logging. In-memory FIFO buffer (max 500 entries). Broadcasts `queue.log.entry` on new entries. Added `queue.log.state` handler for initial load. Integrated logging into QueueHandler at spec/story state transitions. | execution-log.service.ts, queue.handler.ts, websocket.ts |
| GSQ-004 | Created `aos-global-queue-panel` Light DOM component: fixed bottom panel with slide-up animation, resizable via pointer drag (200px–60vh), tab navigation (Queue & Specs / Log), localStorage persistence for height and active tab, full ARIA/keyboard support. | aos-global-queue-panel.ts |
| GSQ-005 | Integrated bottom panel into app shell: sidebar Queue nav item with badge, Cmd/Ctrl+Shift+Q keyboard shortcut, queue gateway handlers (queue.state, queue.start.ack, queue.complete) migrated from dashboard-view to app.ts, dynamic padding-bottom on main-content when panel open. | app.ts, theme.css |
| GSQ-006 | Created `aos-queue-section` component for bottom panel left split-view. Migrated queue logic from sidebar: drag-drop reordering, spec drop zone (accepts `text/drag-type=spec`), progress tracking via WebSocket, Start/Stop controls, git strategy dialog, keyboard navigation. Panel now passes queue/isQueueRunning props through to section. | aos-queue-section.ts, aos-global-queue-panel.ts, app.ts, theme.css |
| GSQ-009 | Removed old aos-queue-sidebar from dashboard. Deleted aos-queue-sidebar.ts file. Removed all queue state/handlers from dashboard-view.ts. Replaced `dashboard-content-with-queue` grid with full-width `dashboard-content`. Added `text/project-path` + `text/project-name` to spec-card drag dataTransfer via project context. Kept aos-queue-item.ts (shared with queue-section). Removed sidebar CSS from theme.css. | dashboard-view.ts, spec-card.ts, aos-queue-item.ts, aos-queue-sidebar.ts (deleted), theme.css |

## New Exports & APIs

**Services:**
- `agent-os-ui/src/server/services/queue.service.ts` → `QueueService` (singleton: `queueService`)
  - `add(projectPath, projectName, specId, specName, gitStrategy?, position?)` - adds item to global queue
  - `getState()` - returns global QueueState (no params)
  - `getItems()` - returns all items (no params)
  - `remove(queueItemId)` - removes by ID (no projectPath needed)
  - `reorder(queueItemId, newPosition)` - reorders (no projectPath needed)
  - `updateStatus(queueItemId, status)` - updates status (no projectPath needed)
  - `getNextPending()` - returns next pending item globally (no params)
  - `getItemBySpecId(projectPath, specId)` - still needs projectPath for uniqueness
  - `startQueue()` / `stopQueue()` - global queue control (no params)
  - `handleSpecComplete(queueItemId, success)` - handles completion (no projectPath)
  - `canAdd(projectPath, specId)` - validation (needs projectPath for duplicate check)
  - `canRemove(queueItemId)` / `canReorder(queueItemId)` - validation (no projectPath)

**Types:**
- `QueueItem` now includes: `projectPath: string`, `projectName: string`
- `QueueState` unchanged: `{ items, currentlyRunning, isQueueRunning }`

**Handler:**
- `agent-os-ui/src/server/handlers/queue.handler.ts` → `QueueHandler` (singleton: `queueHandler`)
  - `handleAdd(client, message)` - projectPath/projectName from message payload
  - `handleRemove(client, message)` / `handleReorder(client, message)` - no projectPath param
  - `handleGetState(client)` / `handleClear(client)` / `handleClearCompleted(client)` - no projectPath
  - `handleStart(client)` / `handleStop(client)` - no projectPath
  - `handleSpecComplete(projectPath, specId, success)` - still needs projectPath for lookup
  - `broadcastState()` - uses `webSocketManager.broadcast()` for ALL clients

**Frontend:**
- `QueueItem` interface in `aos-queue-item.ts` now includes `projectPath` and `projectName`
- `gateway.sendQueueAdd()` now requires `projectPath` and `projectName` parameters
- `dashboard-view.ts` sends `projectPath`/`projectName` from project context

**SpecsReader (GSQ-002):**
- `agent-os-ui/src/server/specs-reader.ts` → `SpecsReader`
  - `listAllSpecs(projects: Array<{path, name}>)` → `ProjectSpecs[]` - returns all specs grouped by project
- New interface `ProjectSpecs`: `{ projectPath, projectName, specs: SpecInfo[] }`
- `SpecInfo` extended with optional `projectPath?: string` and `projectName?: string`

**WebSocket Handler (GSQ-002):**
- `specs.list-all` → returns `{ type: 'specs.list-all', projects: ProjectSpecs[] }` - specs from ALL configured projects

**ExecutionLogService (GSQ-003):**
- `agent-os-ui/src/server/services/execution-log.service.ts` → `ExecutionLogService` (singleton: `executionLogService`)
  - `addEntry(type, projectPath, projectName, specId, specName, message, storyId?, storyTitle?)` - creates log entry and broadcasts
  - `getEntries()` - returns all current LogEntry[]
  - `clear()` - clears all entries
  - `getCount()` - returns entry count

**Types (GSQ-003):**
- `LogEntryType`: `'spec-start' | 'story-start' | 'story-complete' | 'spec-complete' | 'queue-complete' | 'error'`
- `LogEntry`: `{ id, timestamp, type, projectPath, projectName, specId, specName, storyId?, storyTitle?, message }`

**QueueHandler (GSQ-003) - new methods:**
- `logStoryEvent(type, projectPath, projectName, specId, specName, storyId, storyTitle, message)` - convenience for story-level logging
- `handleGetLogState(client)` - sends all log entries to requesting client

**WebSocket Messages (GSQ-003):**
- `queue.log.state` (Client→Server) → returns `{ type: 'queue.log.state', entries: LogEntry[] }` - all current log entries
- `queue.log.entry` (Server→Client broadcast) → `{ type: 'queue.log.entry', entry: LogEntry }` - new log entry notification

**App Shell (GSQ-005):**
- `agent-os-ui/ui/src/app.ts` → `AosApp`
  - State: `isBottomPanelOpen`, `bottomPanelActiveTab`, `globalQueue: QueueItem[]`, `isQueueRunning: boolean`
  - Methods: `_handleBottomPanelToggle()`, `_handleBottomPanelClose()`, `_handleGlobalKeydown()`
  - Gateway handlers: `queue.state`, `queue.start.ack`, `queue.complete` (migrated from dashboard-view)
  - Keyboard shortcut: `Cmd/Ctrl+Shift+Q` toggles bottom panel
  - Sidebar: Queue nav item with count badge and running indicator below Settings nav items

**Frontend Component (GSQ-004, updated GSQ-006):**
- `agent-os-ui/ui/src/components/queue/aos-global-queue-panel.ts` → `AosGlobalQueuePanel`
  - Properties: `isOpen: boolean`, `activeTab: 'queue-specs' | 'log'`, `queue: QueueItem[]`, `isQueueRunning: boolean`
  - Events: `panel-close`, `panel-resize` (detail: `{ height: number }`), `tab-change` (detail: `{ tab: string }`)
  - Light DOM pattern: `createRenderRoot() { return this; }` with static style injection
  - CSS prefix: `gqp-` (all CSS classes use this prefix)
  - Queue & Specs tab: Split-view with `aos-queue-section` (left) and placeholder for specs (right, GSQ-007)

**Queue Section Component (GSQ-006):**
- `agent-os-ui/ui/src/components/queue/aos-queue-section.ts` → `AosQueueSection`
  - Properties: `queue: QueueItem[]`, `isQueueRunning: boolean`
  - Events: `queue-add`, `queue-remove`, `queue-reorder`, `queue-start`, `queue-stop`, `queue-item-view-kanban`, `show-toast`
  - Drop zone: Accepts `text/drag-type === 'spec'` with `text/project-path`, `text/project-name`
  - Drag-drop reordering: Queue items with position-targeted drops
  - Progress tracking: WebSocket handlers for `workflow.story.start.ack`, `specs.story.updateStatus.ack`, `specs.kanban`
  - Git strategy dialog: Shows when spec has no pre-existing git strategy
  - Keyboard navigation: ArrowUp/Down between items, tabindex, ARIA roles
  - CSS prefix: `qs-` (all CSS classes use this prefix)
  - Light DOM pattern

## Integration Notes
- The queue is now a single global resource, not per-project
- `webSocketManager.broadcast()` is used instead of `sendToProject()` for queue state
- When advancing to next spec in queue, the next item's `projectPath` is used (may differ from current)
- Duplicate check uses `specId + projectPath` combination (same spec in different projects is allowed)
- App shell now listens to queue.state, queue.start.ack, queue.complete globally (in addition to dashboard)
- Bottom panel state is managed in app.ts, available from any view via sidebar toggle or Cmd/Ctrl+Shift+Q
- Queue section (aos-queue-section) imported in app.ts to avoid gateway dependency in panel unit tests
- Panel passes queue/isQueueRunning through to queue section component
- Queue & Specs tab uses split-view grid layout (left: queue, right: specs placeholder for GSQ-007)
- Dashboard no longer has queue sidebar - queue is ONLY in bottom panel (GSQ-009)
- Dashboard specs list now uses full width (`dashboard-content` class)
- Spec-cards set `text/project-path` and `text/project-name` in drag dataTransfer (consumed by queue-section drop zone)
- `aos-queue-item.ts` is KEPT (shared by aos-queue-section and aos-global-queue-panel)
- `QueueItem` type should be imported from `aos-queue-item.ts` directly (not from deleted sidebar)

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| agent-os-ui/src/server/services/queue.service.ts | Modified | GSQ-001 |
| agent-os-ui/src/server/handlers/queue.handler.ts | Modified | GSQ-001 |
| agent-os-ui/src/server/websocket.ts | Modified | GSQ-001 |
| agent-os-ui/src/server/workflow-executor.ts | Modified | GSQ-001 |
| agent-os-ui/ui/src/components/queue/aos-queue-item.ts | Modified | GSQ-001 |
| agent-os-ui/ui/src/gateway.ts | Modified | GSQ-001 |
| agent-os-ui/ui/src/views/dashboard-view.ts | Modified | GSQ-001 |
| agent-os-ui/tests/unit/queue.service.test.ts | Created | GSQ-001 |
| agent-os-ui/src/server/specs-reader.ts | Modified | GSQ-002 |
| agent-os-ui/src/server/websocket.ts | Modified | GSQ-002 |
| agent-os-ui/tests/unit/specs-reader.listAllSpecs.test.ts | Created | GSQ-002 |
| agent-os-ui/src/server/services/execution-log.service.ts | Created | GSQ-003 |
| agent-os-ui/src/server/handlers/queue.handler.ts | Modified | GSQ-003 |
| agent-os-ui/src/server/websocket.ts | Modified | GSQ-003 |
| agent-os-ui/tests/unit/execution-log.service.test.ts | Created | GSQ-003 |
| agent-os-ui/ui/src/components/queue/aos-global-queue-panel.ts | Created | GSQ-004 |
| agent-os-ui/tests/unit/aos-global-queue-panel.test.ts | Created | GSQ-004 |
| agent-os-ui/ui/src/app.ts | Modified | GSQ-005 |
| agent-os-ui/ui/src/styles/theme.css | Modified | GSQ-005 |
| agent-os-ui/ui/src/components/queue/aos-queue-section.ts | Created | GSQ-006 |
| agent-os-ui/ui/src/components/queue/aos-global-queue-panel.ts | Modified | GSQ-006 |
| agent-os-ui/ui/src/app.ts | Modified | GSQ-006 |
| agent-os-ui/ui/src/styles/theme.css | Modified | GSQ-006 |
| agent-os-ui/ui/src/views/dashboard-view.ts | Modified | GSQ-009 |
| agent-os-ui/ui/src/components/spec-card.ts | Modified | GSQ-009 |
| agent-os-ui/ui/src/components/queue/aos-queue-item.ts | Modified | GSQ-009 |
| agent-os-ui/ui/src/components/queue/aos-queue-sidebar.ts | Deleted | GSQ-009 |
| agent-os-ui/ui/src/styles/theme.css | Modified | GSQ-009 |
