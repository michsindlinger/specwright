# Integration Context - Kanban Auto-Execution

> Spec: kanban-auto-execution
> Created: 2026-01-31
> Purpose: Cross-session context preservation for story execution

---

## Completed Stories

| Story ID | Summary | Key Files/Functions |
|----------|---------|---------------------|
| KAE-001 | Auto-Mode Toggle Component in kanban header | `kanban-board.ts: autoModeEnabled, handleAutoModeToggle` |
| KAE-002 | Auto-Execution Engine with 2-second delay between stories | `dashboard-view.ts: processAutoExecution, onWorkflowComplete`, `kanban-board.ts: getNextReadyStory, startStoryAutoExecution` |
| KAE-003 | Progress Summary Display showing current story and phase | `kanban-board.ts: autoModeProgress, updateAutoModeProgress`, `dashboard-view.ts: onWorkflowMessage, extractPhaseFromMessage` |
| KAE-004 | Error Handling Modal with Resume/Stop options | `auto-mode-error-modal.ts`, `kanban-board.ts: showErrorModal, handleWorkflowError`, `dashboard-view.ts: handleAutoModeError, handleAutoModeResume` |
| KAE-005 | Git Strategy Integration for Auto-Mode | `kanban-board.ts: autoModePendingGitStrategy, isAutoModePendingGitStrategy()`, `dashboard-view.ts: handleAutoModeGitStrategySelected` |

---

## New Exports & APIs

### Components

- `agent-os-ui/ui/src/components/auto-mode-error-modal.ts` (KAE-004):
  - `AutoModeError` interface: `{ message: string; storyId: string; storyTitle: string; phase: number }`
  - `@property() open: boolean` - Controls modal visibility
  - `@property() error: AutoModeError | null` - Error details to display
  - `handleResume()` - Dispatches `auto-mode-resume` event
  - `handleStop()` - Dispatches `auto-mode-stop` event
  - Keyboard support: Enter = Resume, Escape = Stop

- `agent-os-ui/ui/src/components/kanban-board.ts`:
  - `@state() autoModeEnabled: boolean` - Tracks auto-execution mode state
  - `@state() autoModeProgress: AutoModeProgress | null` - Tracks current story progress display (KAE-003)
  - `@state() showErrorModal: boolean` - Controls error modal visibility (KAE-004)
  - `@state() autoModeError: AutoModeError | null` - Current error details (KAE-004)
  - `@state() autoModePendingGitStrategy: boolean` - Tracks if auto-mode is waiting for git strategy selection (KAE-005)
  - `handleErrorModalResume()` - Handles resume from error modal (KAE-004)
  - `handleErrorModalStop()` - Handles stop from error modal (KAE-004)
  - `handleAutoModeToggle()` - Toggles auto-mode and dispatches event
  - `getNextReadyStory(): StoryInfo | null` - Finds next backlog story passing `canMoveToInProgress` validation
  - `startStoryAutoExecution(storyId: string): void` - Starts a story via auto-execution (handles git strategy dialog if needed)
  - `updateAutoModeProgress(progress: AutoModeProgress | null): void` - Updates progress display (KAE-003)
  - `clearAutoModeProgress(): void` - Clears progress display (KAE-003)
  - `truncateTitle(title: string, maxLength?: number): string` - Truncates long titles with ellipsis (KAE-003)
  - `isAutoModePendingGitStrategy(): boolean` - Returns true if auto-mode is waiting for git strategy selection (KAE-005)
  - Dispatches `CustomEvent('auto-mode-toggle', { detail: { enabled: boolean } })`
  - Dispatches `CustomEvent('auto-mode-git-strategy-selected')` when git strategy is selected during auto-mode (KAE-005)

- `agent-os-ui/ui/src/views/dashboard-view.ts`:
  - `@state() autoModeEnabled: boolean` - Orchestrator state for auto-mode
  - `@state() autoModePaused: boolean` - Tracks if auto-mode is paused due to error (KAE-004)
  - `autoExecutionTimer: number | null` - Timer reference for delayed execution
  - `currentAutoModeProgress: AutoModeProgress | null` - Tracks current progress state (KAE-003)
  - `AUTO_EXECUTION_DELAY = 2000` - 2-second delay between stories
  - `processAutoExecution(): void` - Finds and starts next ready story (checks autoModePaused)
  - `scheduleNextAutoExecution(): void` - Schedules next story with delay
  - `onWorkflowComplete(msg): void` - Handles `workflow.interactive.complete` event, clears progress
  - `onWorkflowStartAck(msg): void` - Initializes progress display when story starts (KAE-003)
  - `onWorkflowMessage(msg): void` - Parses phase updates from workflow messages (KAE-003)
  - `extractPhaseFromMessage(content: string): number | null` - Extracts phase number from message content (KAE-003)
  - `updateKanbanProgress(progress): void` - Updates kanban board progress display (KAE-003)
  - `clearAutoExecutionTimer(): void` - Clears pending auto-execution timer
  - `handleAutoModeError(): void` - Pauses auto-execution on error (KAE-004)
  - `handleAutoModeResume(): void` - Resumes auto-execution after error (KAE-004)
  - `handleAutoModeGitStrategySelected(): void` - Handles git strategy selection during auto-mode (KAE-005)

### CSS Classes

- `.auto-mode-toggle-container` - Container for toggle in kanban header
- `.auto-mode-toggle` - Label wrapper for checkbox toggle
- `.toggle-slider` - Custom styled toggle slider
- `.auto-mode-badge` - "Auto aktiv" badge with pulse animation
- `.auto-mode-active` - Applied when auto-mode is enabled (triggers pulse)
- `.auto-mode-progress` - Progress summary container (KAE-003)
- `.progress-story-id` - Story ID badge in progress summary (KAE-003)
- `.progress-story-title` - Story title with ellipsis truncation (KAE-003)
- `.progress-phase` - Phase indicator container (KAE-003)
- `.progress-phase-label` - "Phase" label text (KAE-003)
- `.progress-phase-current` - Current phase number (KAE-003)
- `.progress-phase-separator` - "/" separator (KAE-003)
- `.progress-phase-total` - Total phases number (KAE-003)
- `.auto-mode-error-overlay` - Modal backdrop overlay (KAE-004)
- `.auto-mode-error-modal` - Error modal container (KAE-004)
- `.auto-mode-error-header` - Modal header with icon and title (KAE-004)
- `.auto-mode-error-title` - "Auto-Mode Fehler" title (KAE-004)
- `.auto-mode-error-content` - Modal content area (KAE-004)
- `.error-message` - Error message display with left border (KAE-004)
- `.error-details` - Story and phase details section (KAE-004)
- `.error-detail-row` - Row for label/value pairs (KAE-004)
- `.auto-mode-error-actions` - Resume/Stop button container (KAE-004)
- `.keyboard-hint` - Keyboard shortcut hint text (KAE-004)
- `.auto-mode-pending-git` - Yellow-tinted progress container when waiting for git strategy (KAE-005)
- `.progress-waiting-text` - Italic waiting text in progress summary (KAE-005)

---

## Integration Notes

- **Event Handling:** Events bubble up with `composed: true`, so `dashboard-view.ts` can listen for them:
  - `auto-mode-toggle` - Toggle auto-mode on/off
  - `auto-mode-error` - Error occurred during auto-execution (KAE-004)
  - `auto-mode-resume` - Resume auto-execution after error (KAE-004)
- **Toggle State:** State is transient (not persisted) - resets on page refresh
- **CSS Animation:** Pulse animation defined with `@keyframes auto-mode-pulse` in theme.css
- **Accessibility:** Toggle uses native checkbox with `aria-label` for screen readers
- **Auto-Execution Flow:**
  1. User enables auto-mode via toggle → `handleAutoModeToggle` dispatches event
  2. `dashboard-view.ts` receives event → if no story in progress, calls `processAutoExecution()`
  3. `processAutoExecution()` gets `kanban-board` element → calls `getNextReadyStory()`
  4. If ready story found → calls `startStoryAutoExecution(storyId)`
  5. On `workflow.interactive.complete` event → `scheduleNextAutoExecution()` with 2-second delay
  6. When all stories done → auto-mode disables and shows "Alle Stories abgeschlossen" toast
- **Dependency Handling:** `getNextReadyStory()` uses existing `canMoveToInProgress()` to validate stories
- **Git Strategy:** `startStoryAutoExecution()` handles first-story git strategy dialog if needed

---

## File Change Summary

| File | Change | Story |
|------|--------|-------|
| `agent-os-ui/ui/src/components/kanban-board.ts` | Modified - Added auto-mode toggle state and UI | KAE-001 |
| `agent-os-ui/ui/src/styles/theme.css` | Modified - Added auto-mode toggle CSS styles | KAE-001 |
| `agent-os-ui/ui/src/components/kanban-board.ts` | Modified - Added getNextReadyStory(), startStoryAutoExecution() | KAE-002 |
| `agent-os-ui/ui/src/views/dashboard-view.ts` | Modified - Added auto-execution orchestration logic | KAE-002 |
| `agent-os-ui/ui/src/components/kanban-board.ts` | Modified - Added AutoModeProgress interface, progress state and display | KAE-003 |
| `agent-os-ui/ui/src/views/dashboard-view.ts` | Modified - Added phase update handlers and progress tracking | KAE-003 |
| `agent-os-ui/ui/src/styles/theme.css` | Modified - Added progress summary CSS styles | KAE-003 |
| `agent-os-ui/ui/src/components/auto-mode-error-modal.ts` | Created - Error modal component | KAE-004 |
| `agent-os-ui/ui/src/components/kanban-board.ts` | Modified - Added error modal integration and handlers | KAE-004 |
| `agent-os-ui/ui/src/views/dashboard-view.ts` | Modified - Added error/resume event handlers and autoModePaused state | KAE-004 |
| `agent-os-ui/ui/src/styles/theme.css` | Modified - Added error modal CSS styles | KAE-004 |
| `agent-os-ui/ui/src/components/kanban-board.ts` | Modified - Added autoModePendingGitStrategy state, updated handlers | KAE-005 |
| `agent-os-ui/ui/src/views/dashboard-view.ts` | Modified - Added auto-mode-git-strategy-selected event handler | KAE-005 |
| `agent-os-ui/ui/src/styles/theme.css` | Modified - Added git strategy pending CSS styles | KAE-005 |

---

## All Stories Complete

All 5 stories for the Kanban Auto-Execution spec have been implemented:
- KAE-001: Auto-Mode Toggle Component
- KAE-002: Auto-Execution Engine
- KAE-003: Progress Summary Display
- KAE-004: Error Handling Modal
- KAE-005: Git Strategy Integration
