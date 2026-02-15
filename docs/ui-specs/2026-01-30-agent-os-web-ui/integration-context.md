# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| AOSUI-001 | Backend server with Express + WebSocket | server/index.ts, server/websocket.ts |
| AOSUI-002 | Lit + Vite frontend with hash-based routing | ui/src/app.ts, views/, styles/theme.css |
| AOSUI-003 | Project selector with WebSocket integration | config.json, projects.ts, gateway.ts, project-selector.ts |
| AOSUI-004 | Full chat interface with streaming + tool calls | claude-handler.ts, chat-view.ts, chat-message.ts, tool-call-badge.ts |
| AOSUI-005 | Workflow execution with progress + cancel | workflow-executor.ts, workflow-view.ts, workflow-card.ts, workflow-progress.ts |
| AOSUI-006 | Dashboard with spec list and Kanban board | specs-reader.ts, dashboard-view.ts, spec-card.ts, kanban-board.ts, story-card.ts |
| AOSUI-007 | Integration & Polish with toast, spinner, reconnect | toast-notification.ts, loading-spinner.ts, app.ts, gateway.ts, theme.css, README.md |

---

## New Exports & APIs

### Components
<!-- New UI components created -->
- `agent-os-ui/ui/src/app.ts` → `<aos-app>` - Root app shell with sidebar navigation and hash-based routing
- `agent-os-ui/ui/src/views/dashboard-view.ts` → `<aos-dashboard-view>` - Full dashboard with spec list, Kanban board, story details
- `agent-os-ui/ui/src/views/chat-view.ts` → `<aos-chat-view>` - Full chat interface with streaming, tool calls, message history
- `agent-os-ui/ui/src/views/workflow-view.ts` → `<aos-workflow-view>` - Workflow view placeholder
- `agent-os-ui/ui/src/views/not-found-view.ts` → `<aos-not-found-view>` - 404 page with back link
- `agent-os-ui/ui/src/components/project-selector.ts` → `<aos-project-selector>` - Project dropdown in header
- `agent-os-ui/ui/src/components/chat-message.ts` → `<aos-chat-message>` - Message bubble with markdown/code support
- `agent-os-ui/ui/src/components/tool-call-badge.ts` → `<aos-tool-call-badge>` - Collapsible tool call visualization
- `agent-os-ui/ui/src/components/workflow-card.ts` → `<aos-workflow-card>` - Workflow command card with name/description
- `agent-os-ui/ui/src/components/workflow-progress.ts` → `<aos-workflow-progress>` - Progress display with elapsed timer
- `agent-os-ui/ui/src/components/spec-card.ts` → `<aos-spec-card>` - Spec overview card with progress bar and story counts
- `agent-os-ui/ui/src/components/kanban-board.ts` → `<aos-kanban-board>` - 3-column Kanban board (Backlog, In Progress, Done)
- `agent-os-ui/ui/src/components/story-card.ts` → `<aos-story-card>` - Story card with ID, title, type, priority, effort badges
- `agent-os-ui/ui/src/components/toast-notification.ts` → `<aos-toast-notification>` - Toast notification overlay (success/error/info/warning)
- `agent-os-ui/ui/src/components/loading-spinner.ts` → `<aos-loading-spinner>` - SVG animated spinner (small/medium/large)

### Services
<!-- New service classes/modules -->
- `agent-os-ui/src/server/websocket.ts` → `WebSocketHandler` class
  - `new WebSocketHandler(server)` - Initialize with HTTP server
  - `broadcast(message)` - Send message to all connected clients
  - `getClientCount()` - Get number of connected clients
  - `shutdown()` - Graceful shutdown
  - Handles: `project.list`, `project.current`, `project.select`, `chat.send`, `chat.history`, `chat.clear` messages
- `agent-os-ui/src/server/projects.ts` → `ProjectManager` class
  - `listProjects()` - Returns ProjectWithStatus[] with exists flag
  - `selectProject(name)` - Sets current project, broadcasts to clients
  - `getCurrentProject()` - Returns current Project | null
  - `addProject(name, path)` - Adds new project to config
  - `removeProject(name)` - Removes project from config
- `agent-os-ui/src/server/claude-handler.ts` → `ClaudeHandler` class
  - `handleChatSend(client, message, projectPath)` - Process user message with streaming response
  - `getHistory(clientId, projectPath)` - Get chat history for session
  - `clearHistory(clientId, projectPath)` - Clear chat history for session
  - Streams response tokens via WebSocket events: `chat.stream.start`, `chat.stream`, `chat.tool`, `chat.tool.complete`, `chat.complete`
- `agent-os-ui/ui/src/gateway.ts` → `gateway` singleton
  - `gateway.connect()` - Establishes WebSocket connection
  - `gateway.send(message)` - Sends WebSocketMessage to server
  - `gateway.on(type, handler)` - Subscribes to message type
  - `gateway.off(type, handler)` - Unsubscribes from message type
  - Auto-reconnect with exponential backoff (800ms → 15s, Moltbot-pattern)
  - `gateway.getReconnectingStatus()` - Check if currently reconnecting
- `agent-os-ui/src/server/workflow-executor.ts` → `WorkflowExecutor` class
  - `listCommands(projectPath)` - Returns WorkflowCommand[] from .claude/commands/agent-os/
  - `startExecution(client, commandId, projectPath, params?)` - Starts workflow, returns executionId
  - `cancelExecution(executionId)` - Cancels running workflow via AbortController
  - `getExecution(executionId)` - Returns WorkflowExecution | undefined
  - `getRunningExecutions()` - Returns all running WorkflowExecution[]
  - Streams progress via WebSocket events: `workflow.started`, `workflow.progress`, `workflow.complete`
- `agent-os-ui/src/server/specs-reader.ts` → `SpecsReader` class
  - `listSpecs(projectPath)` - Returns SpecInfo[] (id, name, createdDate, storyCount, completedCount, inProgressCount, hasKanban)
  - `getKanbanBoard(projectPath, specId)` - Returns KanbanBoard with stories sorted by status
  - `getStoryDetail(projectPath, specId, storyId)` - Returns full StoryDetail with feature, acceptance criteria, DoR/DoD

### Hooks / Utilities
<!-- New hooks, helpers, utilities -->
_None yet_

### Types / Interfaces
<!-- New type definitions -->
- `agent-os-ui/src/server/projects.ts`:
  - `Project` - { name: string, path: string }
  - `ProjectConfig` - { projects: Project[] }
  - `ProjectWithStatus` - Project & { exists: boolean, error?: string }
- `agent-os-ui/src/server/claude-handler.ts`:
  - `ChatMessage` - { id, role, content, timestamp, toolCalls? }
  - `ToolCall` - { id, name, input, output?, status }
  - `ClaudeSession` - { id, projectPath, messages, isStreaming }
- `agent-os-ui/ui/src/gateway.ts`:
  - `WebSocketMessage` - { type: string, [key: string]: unknown }
  - `MessageHandler` - (message: WebSocketMessage) => void
- `agent-os-ui/ui/src/components/chat-message.ts`:
  - `ChatMessageData` - { id, role, content, timestamp, toolCalls? }
  - `ToolCall` - { id, name, input, output?, status }
- `agent-os-ui/src/server/workflow-executor.ts`:
  - `WorkflowCommand` - { id, name, description, filePath }
  - `WorkflowExecution` - { id, commandId, commandName, projectPath, status, startTime, endTime?, output, error?, abortController }
- `agent-os-ui/ui/src/components/workflow-card.ts`:
  - `WorkflowCommand` - { id, name, description }
- `agent-os-ui/ui/src/components/workflow-progress.ts`:
  - `WorkflowExecution` - { id, commandId, commandName, startTime, status, output?, error?, progress? }
- `agent-os-ui/src/server/specs-reader.ts`:
  - `SpecInfo` - { id, name, createdDate, storyCount, completedCount, inProgressCount, hasKanban }
  - `StoryInfo` - { id, title, type, priority, effort, status, dependencies }
  - `KanbanBoard` - { specId, stories, hasKanbanFile }
  - `StoryDetail` - { id, title, type, priority, effort, status, dependencies, feature, acceptanceCriteria, dorChecklist, dodChecklist }
- `agent-os-ui/ui/src/components/spec-card.ts`:
  - `SpecInfo` - { id, name, createdDate, storyCount, completedCount, inProgressCount, hasKanban }
- `agent-os-ui/ui/src/components/story-card.ts`:
  - `StoryInfo` - { id, title, type, priority, effort, status, dependencies }
- `agent-os-ui/ui/src/components/kanban-board.ts`:
  - `KanbanBoard` - { specId, stories, hasKanbanFile }

---

## Integration Notes

<!-- Important integration information for subsequent stories -->
- Backend runs on port 3001 (configurable via PORT env)
- WebSocket on same port (ws://localhost:3001)
- Health check: GET /health returns `{ status: "ok", timestamp, uptime, websocketClients }`
- WebSocket sends `{ type: "connected", clientId, timestamp }` on connection
- Use `npm run dev:backend` (backend watch mode) or `npm run dev:ui` (frontend dev server)
- Frontend runs on port 5173 via Vite, proxies /api and /ws to backend
- Hash-based routing: #/dashboard, #/chat, #/workflows
- All components use `createRenderRoot() { return this; }` for global CSS access
- Lit decorators: @customElement, @state for reactive properties
- Theme CSS variables defined in `ui/src/styles/theme.css` (--color-*, --spacing-*, --font-*)
- **Project Management (AOSUI-003)**:
  - Projects configured in `agent-os-ui/config.json`
  - Use `gateway` singleton for WebSocket communication
  - Project-related messages: `project.list`, `project.current`, `project.select`, `project.selected`, `project.error`
  - `<aos-project-selector>` is already integrated in the header
  - Current project available via `project.current` message response
- **Chat Interface (AOSUI-004)**:
  - Chat requires a selected project before sending messages
  - WebSocket events for chat: `chat.send`, `chat.message`, `chat.stream.start`, `chat.stream`, `chat.tool`, `chat.tool.complete`, `chat.complete`, `chat.error`, `chat.history`, `chat.cleared`
  - Streaming messages update incrementally via `chat.stream` events
  - Tool calls appear as collapsible badges with input/output
  - CSS styles for chat components in `theme.css` (chat-container, chat-message, tool-badge, etc.)
- **Workflow Execution (AOSUI-005)**:
  - Workflows read from `.claude/commands/agent-os/` directory in project path
  - WebSocket events for workflows: `workflow.list`, `workflow.start`, `workflow.start.ack`, `workflow.started`, `workflow.progress`, `workflow.complete`, `workflow.cancel`, `workflow.cancel.ack`, `workflow.running`, `workflow.running.count`, `workflow.error`
  - Progress updates include output text and progress percentage
  - AbortController enables workflow cancellation
  - Background execution with badge showing running count
  - Elapsed timer shows workflow duration in `Xs`, `Xm Ys`, or `Xh Ym` format
  - CSS styles for workflow components in `theme.css` (workflow-card, progress-card, progress-bar, etc.)
- **Dashboard & Specs (AOSUI-006)**:
  - Specs read from `agent-os/specs/` directory in project path
  - WebSocket events for specs: `specs.list`, `specs.kanban`, `specs.story`, `specs.error`
  - Spec cards show name, date, progress bar, story counts (total, done, in progress, backlog)
  - Kanban board has 3 columns: Backlog, In Progress, Done
  - Story details show feature (Gherkin), acceptance criteria, dependencies, DoR/DoD checklists
  - Empty state handling for projects without specs or specs without kanban
  - CSS styles for dashboard components in `theme.css` (spec-card, kanban-board, story-card, etc.)
- **Integration & Polish (AOSUI-007)**:
  - Toast notification for error/success/info/warning messages via `aos-app.showToast(message, type)`
  - Loading spinner component with size variants (small, medium, large)
  - Global error handler catches unhandled errors and shows toast
  - Gateway emits `gateway.reconnecting` event with delay info
  - Reconnecting indicator in header during WebSocket reconnection
  - Responsive layout for < 800px: collapsed sidebar, stacked Kanban columns
  - CSS styles for toast and spinner in `theme.css`

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| agent-os-ui/package.json | Created | AOSUI-001 |
| agent-os-ui/tsconfig.json | Created | AOSUI-001 |
| agent-os-ui/eslint.config.js | Created | AOSUI-001 |
| agent-os-ui/src/server/index.ts | Created | AOSUI-001 |
| agent-os-ui/src/server/websocket.ts | Created | AOSUI-001 |
| agent-os-ui/package.json | Modified | AOSUI-002 |
| agent-os-ui/ui/package.json | Created | AOSUI-002 |
| agent-os-ui/ui/tsconfig.json | Created | AOSUI-002 |
| agent-os-ui/ui/vite.config.ts | Created | AOSUI-002 |
| agent-os-ui/ui/eslint.config.js | Created | AOSUI-002 |
| agent-os-ui/ui/index.html | Created | AOSUI-002 |
| agent-os-ui/ui/src/main.ts | Created | AOSUI-002 |
| agent-os-ui/ui/src/app.ts | Created | AOSUI-002 |
| agent-os-ui/ui/src/styles/theme.css | Created | AOSUI-002 |
| agent-os-ui/ui/src/views/dashboard-view.ts | Created | AOSUI-002 |
| agent-os-ui/ui/src/views/chat-view.ts | Created | AOSUI-002 |
| agent-os-ui/ui/src/views/workflow-view.ts | Created | AOSUI-002 |
| agent-os-ui/ui/src/views/not-found-view.ts | Created | AOSUI-002 |
| agent-os-ui/config.json | Created | AOSUI-003 |
| agent-os-ui/src/server/projects.ts | Created | AOSUI-003 |
| agent-os-ui/src/server/websocket.ts | Modified | AOSUI-003 |
| agent-os-ui/ui/src/gateway.ts | Created | AOSUI-003 |
| agent-os-ui/ui/src/components/project-selector.ts | Created | AOSUI-003 |
| agent-os-ui/ui/src/app.ts | Modified | AOSUI-003 |
| agent-os-ui/src/server/claude-handler.ts | Created | AOSUI-004 |
| agent-os-ui/src/server/websocket.ts | Modified | AOSUI-004 |
| agent-os-ui/ui/src/views/chat-view.ts | Modified | AOSUI-004 |
| agent-os-ui/ui/src/components/chat-message.ts | Created | AOSUI-004 |
| agent-os-ui/ui/src/components/tool-call-badge.ts | Created | AOSUI-004 |
| agent-os-ui/ui/src/styles/theme.css | Modified | AOSUI-004 |
| agent-os-ui/src/server/workflow-executor.ts | Created | AOSUI-005 |
| agent-os-ui/src/server/websocket.ts | Modified | AOSUI-005 |
| agent-os-ui/ui/src/views/workflow-view.ts | Modified | AOSUI-005 |
| agent-os-ui/ui/src/components/workflow-card.ts | Created | AOSUI-005 |
| agent-os-ui/ui/src/components/workflow-progress.ts | Created | AOSUI-005 |
| agent-os-ui/ui/src/styles/theme.css | Modified | AOSUI-005 |
| agent-os-ui/src/server/specs-reader.ts | Created | AOSUI-006 |
| agent-os-ui/src/server/websocket.ts | Modified | AOSUI-006 |
| agent-os-ui/ui/src/views/dashboard-view.ts | Modified | AOSUI-006 |
| agent-os-ui/ui/src/components/spec-card.ts | Created | AOSUI-006 |
| agent-os-ui/ui/src/components/kanban-board.ts | Created | AOSUI-006 |
| agent-os-ui/ui/src/components/story-card.ts | Created | AOSUI-006 |
| agent-os-ui/ui/src/styles/theme.css | Modified | AOSUI-006 |
| agent-os-ui/README.md | Created | AOSUI-007 |
| agent-os-ui/ui/src/components/toast-notification.ts | Created | AOSUI-007 |
| agent-os-ui/ui/src/components/loading-spinner.ts | Created | AOSUI-007 |
| agent-os-ui/ui/src/app.ts | Modified | AOSUI-007 |
| agent-os-ui/ui/src/gateway.ts | Modified | AOSUI-007 |
| agent-os-ui/ui/src/styles/theme.css | Modified | AOSUI-007 |
