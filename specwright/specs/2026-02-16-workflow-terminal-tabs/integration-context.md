# Integration Context

> Spec: Workflow Terminal Tabs
> Created: 2026-02-17
> Purpose: Cross-session context for story integration

---

## Completed Stories

| Story ID | Summary | Key Files/Functions |
|----------|---------|---------------------|
| WTT-001 | Backend Workflow-Session-Support - Neue WebSocket-Message für Workflow-Sessions | cloud-terminal.protocol.ts, cloud-terminal-manager.ts, websocket.ts |

---

## New Exports & APIs

### Services

- `ui/src/server/services/cloud-terminal-manager.ts` → `createWorkflowSession(projectPath, workflowMetadata, modelConfig, cols?, rows?)` - Creates a Claude Code terminal session and automatically sends the workflow command after initialization

### Types / Interfaces

- `ui/src/shared/types/cloud-terminal.protocol.ts` → `CloudTerminalWorkflowMetadata` - Workflow metadata including workflowCommand, workflowName, workflowContext, specId, storyId, gitStrategy, model
- `ui/src/shared/types/cloud-terminal.protocol.ts` → `CloudTerminalCreateWorkflowMessage` - WebSocket message type for creating workflow sessions
- `ui/src/shared/types/cloud-terminal.protocol.ts` → `CloudTerminalCreatedMessage.workflowMetadata` - Extended to include optional workflow metadata

---

## Integration Notes

- **WebSocket Handler**: `cloud-terminal:create-workflow` handler in websocket.ts receives workflow session requests
- **Pattern**: Follows the existing DevTeam setup pattern - createSession() + setTimeout() + sendInput()
- **Delay**: 1 second delay before sending workflow command to allow session initialization
- **Response**: `cloud-terminal:created` message includes `workflowMetadata` field when workflow session

---

## File Change Summary

| File | Change | Story |
|------|--------|-------|
| ui/src/shared/types/cloud-terminal.protocol.ts | Modified - Added CloudTerminalWorkflowMetadata, CloudTerminalCreateWorkflowMessage, extended CloudTerminalCreatedMessage | WTT-001 |
| ui/src/server/services/cloud-terminal-manager.ts | Modified - Added createWorkflowSession() method | WTT-001 |
| ui/src/server/websocket.ts | Modified - Added cloud-terminal:create-workflow handler and import | WTT-001 |
