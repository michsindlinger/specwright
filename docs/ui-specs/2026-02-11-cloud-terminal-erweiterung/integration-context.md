# Integration Context - Cloud Terminal Erweiterung

## Completed Stories

| Story ID | Summary | Key Files/Functions |
|----------|---------|---------------------|
| CTE-001 | Added CloudTerminalType, made modelConfig optional in protocol types | `src/shared/types/cloud-terminal.protocol.ts` |
| CTE-002 | Backend plain terminal support: shell spawn in manager + websocket handler | `src/server/services/cloud-terminal-manager.ts`, `src/server/websocket.ts` |
| CTE-003 | Frontend session UI: Terminal option in dropdown, discriminated union event, shell/claude-code create | `ui/src/components/terminal/aos-model-dropdown.ts`, `ui/src/components/terminal/aos-terminal-session.ts` |
| CTE-004 | Integration & Tab-Management: terminalType in TerminalSession, type-specific naming, persistence | `ui/src/app.ts`, `ui/src/services/cloud-terminal.service.ts`, `ui/src/components/terminal/aos-cloud-terminal-sidebar.ts` |

## New Exports & APIs

### Types (from CTE-001)
- `src/shared/types/cloud-terminal.protocol.ts` → `CloudTerminalType` ('shell' | 'claude-code')
- `src/shared/types/cloud-terminal.protocol.ts` → `CloudTerminalSession.terminalType` field
- `src/shared/types/cloud-terminal.protocol.ts` → `CloudTerminalCreateMessage.terminalType` field
- `src/shared/types/cloud-terminal.protocol.ts` → `CloudTerminalSession.modelConfig` is now optional

### Services (from CTE-002)
- `src/server/services/cloud-terminal-manager.ts` → `createSession(projectPath, terminalType, modelConfig?, cols?, rows?)` - now accepts terminalType parameter and optional modelConfig
- `src/server/websocket.ts` → `handleCloudTerminalCreate()` reads `terminalType` from message (defaults to 'claude-code'), validates modelConfig only for claude-code

### Components (from CTE-003)
- `ui/src/components/terminal/aos-model-dropdown.ts` → `ModelSelectedDetail` type export (discriminated union: `{ terminalType: 'shell' } | { providerId: string; modelId: string }`)
- `ui/src/components/terminal/aos-model-dropdown.ts` → Emits `model-selected` event with `ModelSelectedDetail` payload
- `ui/src/components/terminal/aos-terminal-session.ts` → `handleModelSelected()` handles both shell and claude-code via type guard `'terminalType' in detail`

## Integration Notes

- Backward compatibility: Messages without `terminalType` field default to `'claude-code'`
- Shell terminals: No `CLAUDE_MODEL`/`CLAUDE_PROVIDER` env vars, no CLI args, uses `process.env.SHELL || 'bash'`
- Frontend sends `terminalType` in every `cloud-terminal:create` message (shell or claude-code)
- Dropdown always shows "Terminal" as first option, even when no providers are loaded
- `TerminalSession.terminalType` is optional for backward compat (defaults to 'claude-code')
- `PersistedTerminalSession.modelId` and `.providerId` are now optional (shell terminals don't have them)
- Session naming: "Terminal N" for shell, "Claude Session N" for claude-code (separate counters per type)
- `session-connected` event now includes `terminalType` so `app.ts` can update session metadata

## File Change Summary

| File Path | Status | Story |
|-----------|--------|-------|
| `src/shared/types/cloud-terminal.protocol.ts` | Modified | CTE-001 |
| `src/server/services/cloud-terminal-manager.ts` | Modified | CTE-002 |
| `src/server/websocket.ts` | Modified | CTE-002 |
| `ui/src/components/terminal/aos-model-dropdown.ts` | Modified | CTE-003 |
| `ui/src/components/terminal/aos-terminal-session.ts` | Modified | CTE-003, CTE-004 |
| `ui/src/components/terminal/aos-cloud-terminal-sidebar.ts` | Modified | CTE-004 |
| `ui/src/app.ts` | Modified | CTE-004 |
| `ui/src/services/cloud-terminal.service.ts` | Modified | CTE-004 |
