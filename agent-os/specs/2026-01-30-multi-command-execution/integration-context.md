# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| MCE-001 | Workflow Tab Bar Component | Created aos-execution-tabs and aos-execution-tab components |
| MCE-002 | Multi-Execution State Management | Created ExecutionStore with Map-based state, workflow-view uses store |
| MCE-003 | Tab Status Indicators | Visual indicators for status: spinner, badge, checkmark, error icons |
| MCE-004 | Command Selector Enhancement | Created aos-command-selector dropdown for starting new workflows |
| MCE-005 | Tab Close & Cancel Logic | Confirmation dialog for running executions, cancel integration with backend |
| MCE-006 | Background Notifications | Notification badges and pulse animations for background tabs with unseen changes |
| MCE-999 | Integration Validation | Fixed test for flattened question format, all 38 tests pass |

---

## New Exports & APIs

### Components
<!-- New UI components created -->
- `agent-os-ui/ui/src/components/execution-tabs.ts` → `<aos-execution-tabs .tabs=${tabs} .activeTabId=${id}></aos-execution-tabs>`
  - Props: `tabs: ExecutionTabData[]`, `activeTabId: string | null`
  - Events: `tab-select`, `tab-close`, `tab-add`
- `agent-os-ui/ui/src/components/execution-tab.ts` → `<aos-execution-tab .tab=${tab} .active=${boolean}></aos-execution-tab>`
  - Props: `tab: ExecutionTabData`, `active: boolean`
  - Events: `tab-select`, `tab-close`
- `agent-os-ui/ui/src/components/command-selector.ts` → `<aos-command-selector .commands=${commands} .open=${boolean}></aos-command-selector>`
  - Props: `commands: WorkflowCommand[]`, `open: boolean`
  - Events: `command-select` (detail: { commandId, commandName }), `selector-close`
  - Features: Keyboard navigation (Escape, Arrow keys, Enter), click-outside-to-close

### Services / Stores
<!-- New service classes/modules -->
- `agent-os-ui/ui/src/stores/execution-store.ts` → `executionStore` (singleton)
  - `addExecution(executionId, commandId, commandName)` - Creates new execution, first becomes active
  - `removeExecution(executionId)` - Removes execution, switches active if needed
  - `setActiveExecution(executionId)` - Switch active tab
  - `getExecution(executionId)` - Get execution by ID
  - `getActiveExecution()` - Get currently active execution
  - `getActiveExecutionId()` - Get active execution ID
  - `getAllExecutions()` - Get all executions as array
  - `updateStatus(executionId, status)` - Update execution status
  - `addMessage(executionId, message)` - Add message to execution
  - `setError(executionId, error)` - Set error and failed status
  - `clear()` - Remove all executions
  - `setPendingQuestionCount(executionId, count)` - Set pending question count for badge (also sets hasUnseenChanges for background tabs)
  - `clearUnseenChanges(executionId)` - Clear the unseen changes flag
  - `subscribe(handler)` / `unsubscribe(handler)` - Event subscription
  - Note: `setActiveExecution()` automatically clears hasUnseenChanges for the activated tab

### Hooks / Utilities
<!-- New hooks, helpers, utilities -->
_None yet_

### Types / Interfaces
<!-- New type definitions -->
- `agent-os-ui/ui/src/components/execution-tab.ts` → `ExecutionTabData` interface
  - `id: string` - Unique execution ID
  - `commandName: string` - Display name of the command
  - `status: 'starting' | 'running' | 'waiting_input' | 'completed' | 'failed' | 'cancelled'`
  - `pendingQuestionCount?: number` - Number of pending questions (for waiting_input badge)
- `agent-os-ui/ui/src/types/execution.ts` → `ExecutionState` interface
  - `executionId: string` - Unique execution ID
  - `commandId: string` - Command ID
  - `commandName: string` - Display name
  - `status: ExecutionStatus` - Current status
  - `messages: WorkflowMessage[]` - Chat messages
  - `error?: string` - Error message if failed
  - `startedAt: string` - ISO timestamp
  - `completedAt?: string` - ISO timestamp when completed
  - `pendingQuestionCount?: number` - Number of pending questions for status badge
- `agent-os-ui/ui/src/types/execution.ts` → `ExecutionStatus` type
  - Union: `'starting' | 'running' | 'waiting_input' | 'completed' | 'failed' | 'cancelled'`
- `agent-os-ui/ui/src/types/execution.ts` → `ExecutionState.hasUnseenChanges?: boolean`
  - Tracks if a background execution has unseen changes (for notifications)

---

## Integration Notes

<!-- Important integration information for subsequent stories -->
- **Tab bar integration**: The `aos-execution-tabs` component is already integrated into `workflow-view.ts`
- **Event handling**: Tab events (`tab-select`, `tab-close`, `tab-add`) are wired up in `workflow-view.ts`
- **State management**: `workflow-view.ts` now uses `executionStore` as source of truth for executions
  - Store subscription syncs state to local `interactiveWorkflow` for Lit reactivity
  - `getExecutionTabs()` reads from store and maps `pendingQuestionCount`
  - Tab handlers (`handleTabSelect`, `handleTabClose`) update store directly
  - WebSocket handlers (`handleInteractiveStartAck`, etc.) write to store
- **CSS styles**: Execution tabs styles added to `theme.css` under the "Execution Tabs Component (MCE-001)" section
- **Status indicators (MCE-003)**: Added CSS for status indicators in theme.css under "Status Indicators (MCE-003)" section
  - Spinner animation for running/starting status
  - Badge with count for waiting_input status (shows pendingQuestionCount)
  - Checkmark SVG icon for completed status
  - X SVG icon for failed status
  - Circle-X SVG icon for cancelled status
- **Multiple executions**: Store supports multiple parallel executions with independent message arrays
- **Command selector (MCE-004)**: Plus button in tab bar now opens command selector dropdown
  - Click opens/closes selector
  - Escape key closes selector
  - Arrow keys navigate items, Enter selects
  - Click outside closes selector
  - `tab-add` event now includes `{ commandId, commandName }` in detail
  - `execution-tabs` component now accepts `.commands` prop to pass available commands
- **Tab close & cancel (MCE-005)**: Closing tabs with running executions shows confirmation dialog
  - Completed/failed/cancelled tabs close immediately without confirmation
  - Running/starting/waiting_input tabs show confirmation dialog
  - Confirmation sends `workflow.interactive.cancel` to backend and closes tab
  - `tab-cancel` event triggers gateway.send for cancellation
  - `handleTabCancel` in workflow-view.ts handles the cancel request
- **Background notifications (MCE-006)**: Tabs with unseen changes show visual notifications
  - `hasUnseenChanges` property tracks unseen activity in background tabs
  - Automatically set when status changes to terminal (completed/failed/cancelled) or when questions arrive in background
  - Automatically cleared when tab becomes active via `setActiveExecution()`
  - `notification-badge` CSS class for badge positioning with absolute placement
  - `notification-badge--attention` for pending questions (with pulse animation)
  - `notification-badge--pulse` for general unseen changes (small dot indicator)
  - `execution-tab--has-notification` adds subtle pulse animation to the entire tab

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| agent-os-ui/ui/src/components/execution-tabs.ts | Created | MCE-001 |
| agent-os-ui/ui/src/components/execution-tab.ts | Created | MCE-001 |
| agent-os-ui/ui/src/views/workflow-view.ts | Modified | MCE-001 |
| agent-os-ui/ui/src/styles/theme.css | Modified | MCE-001 |
| agent-os-ui/ui/src/stores/execution-store.ts | Created | MCE-002 |
| agent-os-ui/ui/src/types/execution.ts | Created | MCE-002 |
| agent-os-ui/ui/src/views/workflow-view.ts | Modified | MCE-002 |
| agent-os-ui/tests/unit/execution-store.test.ts | Created | MCE-002 |
| agent-os-ui/ui/src/components/execution-tab.ts | Modified | MCE-003 |
| agent-os-ui/ui/src/types/execution.ts | Modified | MCE-003 |
| agent-os-ui/ui/src/stores/execution-store.ts | Modified | MCE-003 |
| agent-os-ui/ui/src/views/workflow-view.ts | Modified | MCE-003 |
| agent-os-ui/ui/src/styles/theme.css | Modified | MCE-003 |
| agent-os-ui/ui/src/components/command-selector.ts | Created | MCE-004 |
| agent-os-ui/ui/src/components/execution-tabs.ts | Modified | MCE-004 |
| agent-os-ui/ui/src/views/workflow-view.ts | Modified | MCE-004 |
| agent-os-ui/ui/src/styles/theme.css | Modified | MCE-004 |
| agent-os-ui/ui/src/components/execution-tabs.ts | Modified | MCE-005 |
| agent-os-ui/ui/src/views/workflow-view.ts | Modified | MCE-005 |
| agent-os-ui/ui/src/types/execution.ts | Modified | MCE-006 |
| agent-os-ui/ui/src/stores/execution-store.ts | Modified | MCE-006 |
| agent-os-ui/ui/src/components/execution-tab.ts | Modified | MCE-006 |
| agent-os-ui/ui/src/views/workflow-view.ts | Modified | MCE-006 |
| agent-os-ui/ui/src/styles/theme.css | Modified | MCE-006 |
| tests/integration/workflow.test.ts | Modified | MCE-999 |
