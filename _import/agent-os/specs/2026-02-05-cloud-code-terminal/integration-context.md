# Integration Context - Cloud Code Terminal

> Spec: 2026-02-05-cloud-code-terminal
> Updated: 2026-02-05

---

## Completed Stories

| Story ID | Summary | Key Files/Functions Created |
|----------|---------|----------------------------|
| CCT-001 | Backend Cloud Terminal Infrastructure | cloud-terminal-manager.ts, cloud-terminal.protocol.ts |
| CCT-002 | Frontend Sidebar Container | aos-cloud-terminal-sidebar.ts, aos-terminal-tabs.ts |
| CCT-003 | Terminal Session Component | Terminal session component with xterm.js |
| CCT-004 | Session Persistence | cloud-terminal.service.ts, gateway.ts cloud terminal methods |
| CCT-005 | Model Selection Integration | getConfiguredProviders(), getLastUsedModel(), ProviderInfo/ModelInfo interfaces |
| CCT-006 | Polish & Edge Cases | MAX_SESSIONS, INACTIVITY_TIMEOUT, CreateSessionResult, loading states, error handling |

---

## New Exports & APIs

### Components

- `agent-os-ui/ui/src/components/terminal/aos-cloud-terminal-sidebar.ts` → `<aos-cloud-terminal-sidebar>`
- `agent-os-ui/ui/src/components/terminal/aos-terminal-tabs.ts` → `<aos-terminal-tabs>`

### Services

- `agent-os-ui/ui/src/services/cloud-terminal.service.ts` → `CloudTerminalService`
  - `cloudTerminalService.getSessionsForProject(projectPath)` - Get persisted sessions
  - `cloudTerminalService.saveSession(session)` - Persist session metadata
  - `cloudTerminalService.createSession(id, name, modelId, providerId, projectPath)` - Create new session (with MAX_SESSIONS check)
  - `cloudTerminalService.updateSessionStatus(sessionId, status)` - Update session state
  - `cloudTerminalService.pauseSessionsForProject(projectPath)` - Pause on project switch
  - `cloudTerminalService.markSessionsAsReconnecting(projectPath)` - Mark for reconnection
  - `cloudTerminalService.getConfiguredProviders()` - Fetch providers from backend
  - `cloudTerminalService.getLastUsedModel(projectPath)` - Get most recently used model
  - `cloudTerminalService.isMaxSessionsReached(projectPath)` - Check if session limit reached
  - `cloudTerminalService.getActiveSessionCount(projectPath)` - Get count of active sessions
  - `cloudTerminalService.recordActivity(sessionId)` - Record activity for inactivity tracking
  - `cloudTerminalService.resumeSession(sessionId)` - Resume a paused session
  - `cloudTerminalService.setupVisibilityTracking()` - Setup Page Visibility API tracking
  - `cloudTerminalService.cleanupVisibilityTracking()` - Cleanup visibility tracking

### Gateway Methods (Cloud Terminal)

- `gateway.sendCloudTerminalCreate(sessionId, name, modelId, providerId)` - Create session
- `gateway.sendCloudTerminalConnect(sessionId)` - Connect to existing session
- `gateway.sendCloudTerminalDisconnect(sessionId)` - Disconnect from session
- `gateway.sendCloudTerminalReconnect(sessionId)` - Reconnect after page reload
- `gateway.sendCloudTerminalInput(sessionId, data)` - Send terminal input
- `gateway.sendCloudTerminalResize(sessionId, cols, rows)` - Resize terminal
- `gateway.requestCloudTerminalBuffer(sessionId)` - Request buffer restore

### Types

- `agent-os-ui/ui/src/services/cloud-terminal.service.ts` → `PersistedTerminalSession`
  - Session state: 'active' | 'paused' | 'reconnecting' | 'closed'
- `agent-os-ui/ui/src/services/cloud-terminal.service.ts` → `ProviderInfo`
  - Provider with models: `{ id, name, models: ModelInfo[] }`
- `agent-os-ui/ui/src/services/cloud-terminal.service.ts` → `ModelInfo`
  - Model info: `{ id, name, providerId }`
- `agent-os-ui/ui/src/services/cloud-terminal.service.ts` → `CreateSessionResult`
  - Session creation result: `{ success, session?, error?, errorCode? }`
- `agent-os-ui/ui/src/services/cloud-terminal.service.ts` → `MAX_SESSIONS`
  - Maximum sessions constant: 5
- `agent-os-ui/ui/src/services/cloud-terminal.service.ts` → `INACTIVITY_TIMEOUT`
  - Inactivity timeout: 30 minutes (in milliseconds)
- `agent-os-ui/ui/src/services/cloud-terminal.service.ts` → `BACKGROUND_TAB_TIMEOUT`
  - Background tab timeout: 10 minutes (in milliseconds)

---

## Integration Notes

### Session Persistence Flow

1. **Session Creation**: `cloudTerminalService.createSession()` → IndexedDB storage
2. **Page Reload**: Service loads sessions from IndexedDB → `markSessionsAsReconnecting()`
3. **Session Restore**: UI calls `gateway.sendCloudTerminalReconnect(sessionId)`
4. **Project Switch**: `pauseSessionsForProject()` pauses active sessions

### IndexedDB Schema

- Database: `agent-os-cloud-terminal`
- Store: `sessions`
- Indexes: `projectPath`, `status`
- Data: Session metadata only (NOT terminal buffer)

### Session States

- `active` - Session is currently connected
- `paused` - Session was active but project switched
- `reconnecting` - Session needs reconnection after reload
- `closed` - Session terminated

---

## File Change Summary

| File Path | Change Type | Story ID |
|-----------|-------------|----------|
| agent-os-ui/ui/src/services/cloud-terminal.service.ts | Modified | CCT-005 |
| agent-os-ui/ui/src/services/cloud-terminal.service.ts | Created | CCT-004 |
| agent-os-ui/ui/src/gateway.ts | Modified | CCT-004 |
| agent-os-ui/ui/src/components/terminal/aos-cloud-terminal-sidebar.ts | Created | CCT-002 |
| agent-os-ui/ui/src/components/terminal/aos-terminal-tabs.ts | Created | CCT-002 |
| agent-os-ui/ui/src/app.ts | Modified | CCT-002 |
| agent-os-ui/ui/src/styles/theme.css | Modified | CCT-002 |
| agent-os-ui/src/server/services/cloud-terminal-manager.ts | Created | CCT-001 |
| agent-os-ui/src/shared/types/cloud-terminal.protocol.ts | Created | CCT-001 |
| agent-os-ui/src/server/websocket.ts | Modified | CCT-001 |
| agent-os-ui/ui/src/services/cloud-terminal.service.ts | Modified | CCT-006 |
| agent-os-ui/ui/src/components/terminal/aos-cloud-terminal-sidebar.ts | Modified | CCT-006 |

---

## Next Story Dependencies

### CCT-997: Code Review

**Uses from previous stories:**
- All stories completed (CCT-001 through CCT-006)

**Integration needed:**
- Review all code changes in the feature branch
