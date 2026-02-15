# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| MPRO-001 | Tab-Navigation Component for multi-project support | aos-project-tabs.ts, theme.css, app.ts |
| MPRO-002 | Project Add Modal with recently opened list and folder picker | aos-project-add-modal.ts, theme.css, app.ts |
| MPRO-003 | Recently Opened Service with localStorage persistence | recently-opened.service.ts |
| MPRO-004 | Backend Multi-Project Context with session-based project management | project-context.service.ts, project.routes.ts |
| MPRO-005 | WebSocket Multi-Connection for per-project message routing | websocket-manager.service.ts, websocket.ts |
| MPRO-006 | Project Context Switching with Lit Context and session persistence | project-context.ts, project-state.service.ts, app.ts |
| MPRO-007 | Integration & E2E Validation with comprehensive integration tests | multi-project.integration.test.ts, test fixtures |

---

## New Exports & APIs

### Components
<!-- New UI components created -->
- `agent-os-ui/ui/src/components/aos-project-tabs.ts` → `<aos-project-tabs .projects=${[]} .activeProjectId=${null}>`
  - Fires: `tab-select`, `tab-close`, `add-project` events
- `agent-os-ui/ui/src/components/aos-project-add-modal.ts` → `<aos-project-add-modal .open=${false} .openProjectPaths=${[]}>`
  - Fires: `project-selected` (detail: { path, name }), `modal-close` events
  - Uses: File System Access API (`showDirectoryPicker`), validates `agent-os/` subdirectory

### Services
<!-- New service classes/modules -->
- `agent-os-ui/ui/src/services/recently-opened.service.ts` → `recentlyOpenedService` (singleton)
  - `getRecentlyOpened(): RecentlyOpenedEntry[]` - returns list sorted by lastOpened (newest first)
  - `addRecentlyOpened(path: string, name: string): void` - adds/updates entry (max 20)
  - `removeRecentlyOpened(path: string): void` - removes entry by path
  - `clearRecentlyOpened(): void` - clears all entries
  - `hasProject(path: string): boolean` - checks if path exists in list
- `agent-os-ui/src/server/project-context.service.ts` → `projectContextService` (singleton), `ProjectContextService` (class)
  - `switchProject(sessionId: string, projectPath: string): SwitchResult` - switch project context for session
  - `validateProject(projectPath: string): ValidateResult` - validate project path has agent-os/ directory
  - `getCurrentProject(sessionId: string): CurrentProjectResult | null` - get current project for session
  - `getContext(sessionId: string): ProjectContext | null` - get full context with activatedAt
  - `clearContext(sessionId: string): void` - clear session context
  - `getAllContexts(): Map<string, ProjectContext>` - get all active contexts
- `agent-os-ui/src/server/websocket-manager.service.ts` → `webSocketManager` (singleton), `WebSocketManagerService` (class)
  - `registerConnection(projectId: string, ws: WebSocket): void` - register WebSocket for project
  - `unregisterConnection(ws: WebSocket): void` - remove WebSocket from project (auto cleanup on close)
  - `sendToProject(projectId: string, message: WebSocketMessage): number` - send message to all connections for a project
  - `switchProjectForConnection(ws: WebSocket, newProjectId: string): void` - move connection between projects
  - `getProjectForConnection(ws: WebSocket): string | undefined` - get projectId for a WebSocket
  - `markWorkflowActive(projectId: string): void` - track active workflow for lazy connection
  - `markWorkflowInactive(projectId: string): void` - clear active workflow tracking
  - `broadcast(message: WebSocketMessage): number` - send to all connected projects
- `agent-os-ui/ui/src/services/project-state.service.ts` → `projectStateService` (singleton)
  - `loadPersistedState(): StoredProjectState | null` - load project state from sessionStorage
  - `persistState(openProjects, activeProjectId): void` - save project state to sessionStorage
  - `switchProject(project: Project): Promise<SwitchProjectResult>` - switch project (API + WebSocket)
  - `validateProject(path: string): Promise<boolean>` - validate project path exists
  - `restoreProjects(projects: Project[]): Promise<{ validProjects, removedPaths }>` - restore after refresh

### Hooks / Utilities
<!-- New hooks, helpers, utilities -->
_None yet_

### Types / Interfaces
<!-- New type definitions -->
- `agent-os-ui/ui/src/components/aos-project-tabs.ts` → `ProjectTab { id: string; name: string; path: string; }`
- `agent-os-ui/ui/src/components/aos-project-add-modal.ts` → `ProjectSelectedDetail { path: string; name: string; }`
- `agent-os-ui/ui/src/services/recently-opened.service.ts` → `RecentlyOpenedEntry { path: string; name: string; lastOpened: number; }`
- `agent-os-ui/src/server/project-context.service.ts` → `ProjectContext { path: string; name: string; activatedAt: number; }`
- `agent-os-ui/src/server/project-context.service.ts` → `SwitchResult { success: boolean; project?: ProjectContext; error?: string; }`
- `agent-os-ui/src/server/project-context.service.ts` → `ValidateResult { valid: boolean; name?: string; error?: string; }`
- `agent-os-ui/src/server/project-context.service.ts` → `CurrentProjectResult { path: string; name: string; }`
- `agent-os-ui/src/server/websocket-manager.service.ts` → `WebSocketMessage { type: string; projectId?: string; clientId?: string; timestamp?: string; }`
- `agent-os-ui/src/server/websocket-manager.service.ts` → `ProjectConnectionInfo { projectId: string; connectionCount: number; hasActiveWorkflow: boolean; }`
- `agent-os-ui/ui/src/context/project-context.ts` → `Project { id: string; name: string; path: string; }`
- `agent-os-ui/ui/src/context/project-context.ts` → `ProjectContextValue { activeProject, openProjects, switchProject, addProject, closeProject }`
- `agent-os-ui/ui/src/context/project-context.ts` → `projectContext` (Lit Context key)

### REST Endpoints
<!-- New REST API endpoints -->
- `POST /api/project/switch` - Switch project context for session (body: { path: string })
- `GET /api/project/current` - Get current project for session
- `POST /api/project/validate` - Validate project path without switching (body: { path: string })

---

## Integration Notes

<!-- Important integration information for subsequent stories -->
- **aos-project-tabs** is integrated into `app.ts` below the header
- App maintains `openProjects: ProjectTab[]` and `activeProjectId: string | null` state
- Event handlers `handleProjectTabSelect`, `handleProjectTabClose`, `handleAddProject` are set up
- CSS styles are in `theme.css` under "Project Tabs Component (MPRO-001)" section
- **RecentlyOpenedService** uses localStorage key `agent-os-recently-opened` for persistence
- **aos-project-add-modal** is integrated into `app.ts` at bottom of render (after toast)
- App has `showAddProjectModal: boolean` state to control modal visibility
- `handleAddProject` opens the modal, `handleProjectSelected` adds the project to `openProjects` and updates recently opened
- Modal CSS styles are in `theme.css` under "Project Add Modal (MPRO-002)" section
- **MPRO-006 Context Switching** is now implemented:
  - `projectContext` Lit Context is provided by `app.ts` via `ContextProvider`
  - Views can use `@consume({ context: projectContext, subscribe: true })` to access project state
  - `projectStateService` handles session persistence (sessionStorage key: `agent-os-open-projects`)
  - Project state is automatically restored on page refresh with validation
  - Debouncing (150ms) prevents race conditions on rapid tab switching
- **ProjectContextService** provides session-based project context management (MPRO-004)
- Use `x-session-id` header in REST requests to identify session (defaults to 'default-session')
- Service validates projects have `agent-os/` subdirectory before allowing switch
- **WebSocketManagerService** manages per-project WebSocket connections (MPRO-005)
  - websocket.ts now imports and uses `webSocketManager` for connection routing
  - Client sends `project.switch` message with `path` to register connection to a project
  - Use `sendToProject(projectId, message)` instead of `broadcast()` for project-specific messages
  - `broadcastRunningCountToProject(projectId)` for project-scoped workflow count updates
  - WebSocket connections track `projectId` property for routing

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| agent-os-ui/ui/src/components/aos-project-tabs.ts | Created | MPRO-001 |
| agent-os-ui/ui/src/styles/theme.css | Modified | MPRO-001, MPRO-002 |
| agent-os-ui/ui/src/app.ts | Modified | MPRO-001, MPRO-002 |
| agent-os-ui/ui/src/components/aos-project-add-modal.ts | Created | MPRO-002 |
| agent-os-ui/tests/unit/aos-project-add-modal.test.ts | Created | MPRO-002 |
| agent-os-ui/ui/src/services/recently-opened.service.ts | Created | MPRO-003 |
| agent-os-ui/src/server/project-context.service.ts | Created | MPRO-004 |
| agent-os-ui/src/server/routes/project.routes.ts | Created | MPRO-004 |
| agent-os-ui/src/server/index.ts | Modified | MPRO-004 |
| agent-os-ui/tests/unit/project-context.service.test.ts | Created | MPRO-004 |
| agent-os-ui/src/server/websocket-manager.service.ts | Created | MPRO-005 |
| agent-os-ui/src/server/websocket.ts | Modified | MPRO-005 |
| agent-os-ui/src/server/workflow-executor.ts | Modified | MPRO-005 |
| agent-os-ui/tests/unit/websocket-manager.service.test.ts | Created | MPRO-005 |
| agent-os-ui/ui/src/context/project-context.ts | Created | MPRO-006 |
| agent-os-ui/ui/src/services/project-state.service.ts | Created | MPRO-006 |
| agent-os-ui/ui/src/app.ts | Modified | MPRO-006 |
| agent-os-ui/tests/unit/project-state.service.test.ts | Created | MPRO-006 |
| agent-os-ui/tests/integration/multi-project.integration.test.ts | Created | MPRO-007 |
| agent-os-ui/tests/fixtures/mock-project-a/agent-os/ | Created | MPRO-007 |
| agent-os-ui/tests/fixtures/mock-project-b/agent-os/ | Created | MPRO-007 |
| agent-os-ui/src/server/workflow-executor.ts | Modified | MPRO-007 (WebSocketMessage type fix) |
