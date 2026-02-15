# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| PTY-001 | Backend PTY Service implemented | TerminalManager service, terminal.protocol.ts types, WorkflowExecutor integration |
| PTY-002 | WebSocket Terminal Protocol | WebSocket handlers, gateway terminal methods, protocol message types |
| PTY-003 | Frontend Terminal Component | aos-terminal Lit component with xterm.js, theme integration, bidirectional I/O |
| PTY-004 | View Switching Logic | Conditional terminal/chat rendering, execution-store terminal state, back button |
| PTY-005 | Code Cleanup & Removal | Removed obsolete question components, legacy question handling logic, ~400 LOC removed |
| PTY-999 | Integration & Validation | Validated all 7 connections, created 4 integration test files |
| PTY-1000 | Integration Edge Case Fixes | Fixed session cleanup, graceful error handling, async/await test pattern |

---

## New Exports & APIs

### Components
<!-- New UI components created -->
- `agent-os-ui/ui/src/components/aos-terminal.ts` → `<aos-terminal terminalSessionId="exec-123"></aos-terminal>`
  - Wraps xterm.js Terminal in Lit component
  - Properties: `terminalSessionId` (string) - Execution ID for PTY session routing
  - Auto-resizes with FitAddon
  - Bidirectional I/O: Receives `terminal.data` events, sends input via `gateway.sendTerminalInput()`
  - Lifecycle: Auto-cleanup on disconnect (prevents memory leaks)

### Services
<!-- New service classes/modules -->
- `agent-os-ui/src/server/services/terminal-manager.ts` → `TerminalManager` class - PTY process lifecycle manager
  - `spawn(options: SpawnPtyOptions): TerminalSession` - Spawn PTY process
  - `write(executionId: string, data: string): void` - Write to PTY
  - `resize(event: TerminalResizeEvent): void` - Resize PTY terminal
  - `kill(executionId: string): boolean` - Kill PTY process
  - `getSession(executionId: string): TerminalSession | undefined` - Get session metadata
  - `getBuffer(executionId: string): string[]` - Get terminal buffer
  - Events: `terminal.data`, `terminal.exit`

### Hooks / Utilities
<!-- New hooks, helpers, utilities -->
_None yet_

### Types / Interfaces
<!-- New type definitions -->
- `agent-os-ui/ui/src/types/execution.ts`:
  - Extended `ExecutionState` interface with terminal fields:
    - `terminalSessionId?: string` - PTY session identifier for this execution
    - `terminalActive?: boolean` - Whether terminal view is currently active
    - `exitCode?: number | null` - Process exit code (null = running, 0 = success, >0 = error)
  - These fields enable view switching and multi-workflow terminal isolation

- `agent-os-ui/src/shared/types/terminal.protocol.ts`:
  - `ExecutionId` - Terminal session identifier
  - `TerminalSession` - PTY session metadata
  - `TerminalDataEvent` - PTY output event
  - `TerminalExitEvent` - PTY exit event
  - `TerminalResizeEvent` - Terminal resize request
  - `SpawnPtyOptions` - PTY spawn configuration
  - `TERMINAL_BUFFER_LIMITS` - Buffer size constants
  - `TerminalInputMessage` - User input from frontend (NEW in PTY-002)
  - `TerminalResizeMessage` - Terminal resize from frontend (NEW in PTY-002)
  - `TerminalBufferRequestMessage` - Buffer request on reconnect (NEW in PTY-002)
  - `TerminalBufferResponseMessage` - Buffered output response (NEW in PTY-002)
  - `WebSocketTerminalMessage` - Union type of all WebSocket terminal messages (NEW in PTY-002)

---

## Integration Notes

<!-- Important integration information for subsequent stories -->

### PTY-001 Integration Notes
- **TerminalManager** is instantiated in WorkflowExecutor constructor
- Event listeners set up for `terminal.data` and `terminal.exit` events
- WorkflowExecutor forwards terminal events to WebSocket clients
- Use `workflowExecutor.getTerminalManager()` to access TerminalManager instance
- PTY sessions are isolated by execution ID (follows executionMap pattern)
- Buffer management: 10MB max size, 10k max lines, 5min inactivity timeout
- node-pty dependency installed (v1.x)

### PTY-002 Integration Notes
- **WebSocket handlers** added in websocket.ts:
  - `handleTerminalInput()` - Forwards user input to TerminalManager
  - `handleTerminalResize()` - Updates PTY dimensions
  - `handleTerminalBufferRequest()` - Returns buffered output for reconnect
- **Gateway methods** added in gateway.ts:
  - `sendTerminalInput(executionId, data)` - Send user input to backend
  - `sendTerminalResize(executionId, cols, rows)` - Notify backend of resize
  - `requestTerminalBuffer(executionId)` - Request buffer on reconnect
- **Message flow**:
  - Outgoing: gateway → WebSocket → websocket.ts → TerminalManager
  - Incoming: TerminalManager → WorkflowExecutor → WebSocket → gateway → (xterm.js in PTY-003)
- **Use gateway.on('terminal.data', handler)** to receive PTY output
- **Use gateway.on('terminal.exit', handler)** to handle process exit
- **Reconnect pattern**: Call `requestTerminalBuffer()` after reconnect to restore state

### PTY-003 Integration Notes
- **aos-terminal component** is a Lit web component wrapping xterm.js
- **Usage**: Add `<aos-terminal terminalSessionId="exec-123"></aos-terminal>` to DOM
- **Automatic I/O wiring**: Component subscribes to gateway events and sends input automatically
- **Theme integration**: Uses CSS Custom Properties from theme.css (--color-bg-primary, --color-text-primary, etc.)
- **xterm.js addons**: FitAddon for auto-resize, built-in clipboard support
- **Component lifecycle**: Clean disconnectedCallback removes all listeners and disposes Terminal
- **Terminal rendering**: Handles ANSI colors/formatting, 1000+ lines performance, smooth scrolling

### PTY-004 Integration Notes
- **View switching logic** implemented in workflow-view.ts
- **Conditional rendering**: Uses `${isTerminalMode ? html'<aos-terminal>' : html'<aos-workflow-chat>'}` pattern
- **ExecutionStore state management**:
  - `enableTerminal(executionId, terminalSessionId)` - Activate terminal mode for execution
  - `setTerminalExitCode(executionId, exitCode)` - Mark workflow as completed with exit code
  - `disableTerminal(executionId)` - Deactivate terminal mode (return to dashboard)
- **Multi-workflow isolation**: Each execution has its own terminalSessionId, stored in execution-store
- **Back to Dashboard flow**:
  1. User clicks "Back to Dashboard" button (shown when exitCode !== null)
  2. Calls `handleBackToDashboard()` → `executionStore.disableTerminal()` → `removeExecution()`
  3. View switches back to dashboard/command list
- **Exit code badge**: Shows "Process exited with code X" with success/error styling

### PTY-005 Integration Notes
- **Cleaned up legacy Ask Question UI**:
  - Deleted `workflow-question.ts` and `workflow-question-batch.ts` components (were never rendered since PTY-004)
  - Removed `handleAskUserQuestion()`, `detectTextQuestions()`, `sendQuestionBatch()` from WorkflowExecutor
  - Removed question UI imports and rendering from workflow-chat.ts
  - Removed ~400 lines of CSS for question components from theme.css
  - Deleted obsolete question tests from workflow.test.ts
- **Simplified WorkflowExecutor**:
  - Process close handler now always completes workflow (no batch question detection)
  - Removed AskUserQuestion tool handling (PTY terminal handles all I/O now)
  - Removed text-based question detection logic
- **Result**: ~400 LOC removed, codebase simplified, no dead code paths
- **Important**: All workflow interaction now goes through PTY terminal - question UI is obsolete

### PTY-999 Integration Notes
- **Integration & Validation Completed**:
  - Created 4 integration test files:
    - `tests/integration/terminal-spawn.test.ts` - Tests WorkflowExecutor → TerminalManager → PTY spawn (10 tests)
    - `tests/integration/terminal-io.test.ts` - Tests bidirectional I/O flow (10 tests)
    - `tests/integration/terminal-reconnect.test.ts` - Tests buffer restore on reconnect (9 tests)
    - `tests/integration/terminal-multi.test.ts` - Tests multiple parallel workflows (8 tests)
  - Validated all 7 connection points with grep checks:
    - Connection 1: WorkflowExecutor → TerminalManager ✓
    - Connection 2: TerminalManager → websocket.ts (event emit) ✓
    - Connection 3: websocket.ts → gateway.ts ✓
    - Connection 4: gateway.ts → aos-terminal (receive) ✓
    - Connection 5: aos-terminal → gateway.ts (send) ✓
    - Connection 6: workflow-view.ts → aos-terminal (render) ✓
    - Connection 7: execution-store.ts → aos-terminal (property) ✓
  - Linting passed: `npm run lint` ✓
  - All integration points functional and validated

### PTY-1000 Integration Notes
- **Edge Case Fixes Completed (100% Test Pass Rate)**:
  - Fixed **session cleanup** in `kill()` method: Session now immediately deleted from `sessions` Map after kill
  - Fixed **graceful error handling** in `write()` method: Returns false + warning log instead of throwing exception
  - Converted **terminal.exit test** from deprecated `done()` callback to modern async/await pattern
  - All 37 integration tests pass (terminal-spawn: 10/10, terminal-io: 10/10, terminal-reconnect: 9/9, terminal-multi: 8/8)
  - TerminalManager now handles edge cases robustly (non-existent sessions, kill cleanup, async event patterns)

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| agent-os-ui/src/server/services/terminal-manager.ts | Created | PTY-001 |
| agent-os-ui/src/shared/types/terminal.protocol.ts | Created | PTY-001 |
| agent-os-ui/src/server/workflow-executor.ts | Modified | PTY-001 |
| agent-os-ui/package.json | Modified | PTY-001 |
| agent-os-ui/tests/unit/terminal-manager.test.ts | Created | PTY-001 |
| agent-os-ui/src/server/websocket.ts | Modified | PTY-002 |
| agent-os-ui/ui/src/gateway.ts | Modified | PTY-002 |
| agent-os-ui/src/shared/types/terminal.protocol.ts | Modified | PTY-002 |
| agent-os-ui/tests/integration/websocket-terminal.test.ts | Created | PTY-002 |
| agent-os-ui/ui/src/components/aos-terminal.ts | Created | PTY-003 |
| agent-os-ui/ui/src/styles/theme.css | Modified | PTY-003 |
| agent-os-ui/tests/unit/aos-terminal.test.ts | Created | PTY-003 |
| agent-os-ui/package.json | Modified | PTY-003 |
| agent-os-ui/ui/src/types/execution.ts | Modified | PTY-004 |
| agent-os-ui/ui/src/stores/execution-store.ts | Modified | PTY-004 |
| agent-os-ui/ui/src/views/workflow-view.ts | Modified | PTY-004 |
| agent-os-ui/tests/unit/workflow-view.test.ts | Created | PTY-004 |
| agent-os-ui/ui/src/components/workflow-question.ts | Deleted | PTY-005 |
| agent-os-ui/ui/src/components/workflow-question-batch.ts | Deleted | PTY-005 |
| agent-os-ui/ui/src/components/workflow-chat.ts | Modified | PTY-005 |
| agent-os-ui/src/server/workflow-executor.ts | Modified | PTY-005 |
| agent-os-ui/ui/src/styles/theme.css | Modified | PTY-005 |
| agent-os-ui/tests/integration/workflow.test.ts | Modified | PTY-005 |
| agent-os-ui/tests/integration/terminal-spawn.test.ts | Created | PTY-999 |
| agent-os-ui/tests/integration/terminal-io.test.ts | Created | PTY-999 |
| agent-os-ui/tests/integration/terminal-reconnect.test.ts | Created | PTY-999 |
| agent-os-ui/tests/integration/terminal-multi.test.ts | Created | PTY-999 |
| agent-os-ui/src/server/services/terminal-manager.ts | Modified | PTY-1000 |
| agent-os-ui/tests/integration/terminal-spawn.test.ts | Modified | PTY-1000 |
