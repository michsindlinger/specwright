# Integration Context

> Spec: Workflow Terminal Tabs
> Created: 2026-02-17
> Purpose: Cross-session context for story integration

---

## Completed Stories

| Story ID | Summary | Key Files/Functions |
|----------|---------|---------------------|
| WTT-001 | Backend Workflow-Session-Support - Neue WebSocket-Message für Workflow-Sessions | cloud-terminal.protocol.ts, cloud-terminal-manager.ts, websocket.ts |
| WTT-002 | Frontend Workflow-Tab-Integration - TerminalSession erweitert, Workflow-Tab-Styling, Auto-Connect | aos-cloud-terminal-sidebar.ts, aos-terminal-tabs.ts, aos-terminal-session.ts, cloud-terminal.service.ts |
| WTT-003 | UI-Trigger auf Terminal-Tabs umleiten - Custom Event workflow-terminal-request für Kanban/Dashboard/Queue | app.ts, kanban-board.ts |

---

## New Exports & APIs

### Services

- `ui/src/server/services/cloud-terminal-manager.ts` → `createWorkflowSession(projectPath, workflowMetadata, modelConfig, cols?, rows?)` - Creates a Claude Code terminal session and automatically sends the workflow command after initialization

### Types / Interfaces

- `ui/src/shared/types/cloud-terminal.protocol.ts` → `CloudTerminalWorkflowMetadata` - Workflow metadata including workflowCommand, workflowName, workflowContext, specId, storyId, gitStrategy, model
- `ui/src/shared/types/cloud-terminal.protocol.ts` → `CloudTerminalCreateWorkflowMessage` - WebSocket message type for creating workflow sessions
- `ui/src/shared/types/cloud-terminal.protocol.ts` → `CloudTerminalCreatedMessage.workflowMetadata` - Extended to include optional workflow metadata
- `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts` → `TerminalSession.isWorkflow`, `workflowName`, `workflowContext`, `needsInput` - Extended interface for workflow session handling
- `ui/frontend/src/services/cloud-terminal.service.ts` → `PersistedTerminalSession.isWorkflow`, `workflowName`, `workflowContext`, `needsInput` - Extended interface for workflow persistence

---

## Integration Notes

- **WebSocket Handler**: `cloud-terminal:create-workflow` handler in websocket.ts receives workflow session requests
- **Pattern**: Follows the existing DevTeam setup pattern - createSession() + setTimeout() + sendInput()
- **Delay**: 1 second delay before sending workflow command to allow session initialization
- **Response**: `cloud-terminal:created` message includes `workflowMetadata` field when workflow session
- **Frontend Workflow-Tabs**: `openWorkflowTab()` in aos-cloud-terminal-sidebar.ts creates workflow sessions programmatically and auto-opens sidebar
- **Auto-Connect**: `aos-terminal-session.ts` detects `isWorkflow` flag and skips model selector, sending `cloud-terminal:create-workflow` directly
- **Tab Styling**: Workflow tabs show layered icon instead of status dot, with special gradient styling
- **WTT-003 UI-Trigger**: `workflow-terminal-request` Custom Event dispatched by kanban-board.ts when story execution starts, handled by app.ts to open terminal tab
- **Queue Integration**: `queue.start.ack` handler in app.ts also opens terminal tab when queue starts execution

---

## File Change Summary

| File | Change | Story |
|------|--------|-------|
| ui/src/shared/types/cloud-terminal.protocol.ts | Modified - Added CloudTerminalWorkflowMetadata, CloudTerminalCreateWorkflowMessage, extended CloudTerminalCreatedMessage | WTT-001 |
| ui/src/server/services/cloud-terminal-manager.ts | Modified - Added createWorkflowSession() method | WTT-001 |
| ui/src/server/websocket.ts | Modified - Added cloud-terminal:create-workflow handler and import | WTT-001 |
| ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts | Modified - Extended TerminalSession interface, added openWorkflowTab() method | WTT-002 |
| ui/frontend/src/components/terminal/aos-terminal-tabs.ts | Modified - Added workflow tab styling, icon, needsInput badge | WTT-002 |
| ui/frontend/src/components/terminal/aos-terminal-session.ts | Modified - Added startWorkflowSession(), auto-connect for workflows | WTT-002 |
| ui/frontend/src/services/cloud-terminal.service.ts | Modified - Extended PersistedTerminalSession interface | WTT-002 |
| ui/frontend/src/app.ts | Modified - Added _openWorkflowTerminalTab(), _parseModelConfig(), workflow-terminal-request event listener | WTT-003 |
| ui/frontend/src/components/kanban-board.ts | Modified - triggerWorkflowStart() now dispatches workflow-terminal-request event | WTT-003 |
