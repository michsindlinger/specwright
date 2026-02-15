# Integration Context - AgentOS Extended Setup Wizard

## Completed Stories

| Story ID | Summary | Key Files |
|----------|---------|-----------|
| SETUP-001 | Backend SetupService with status check for 4 setup steps | `agent-os-ui/src/server/services/setup.service.ts` |
| SETUP-002 | Shell execution via spawn, EventEmitter streaming, parallel guard | `agent-os-ui/src/server/services/setup.service.ts` |
| SETUP-003 | WebSocket routing for setup messages (check-status, run-step, start-devteam) | `agent-os-ui/src/server/websocket.ts` |
| SETUP-004 | Frontend Setup Wizard Lit component with step display, live output, cloud terminal | `agent-os-ui/ui/src/components/setup/aos-setup-wizard.ts` |
| SETUP-005 | Setup tab integrated in Settings view (type, VALID_TABS, import, tab button, renderContent case) | `agent-os-ui/ui/src/views/settings-view.ts` |

## New Exports & APIs

### Services
- `agent-os-ui/src/server/services/setup.service.ts` → `setupService.checkStatus(projectPath: string): Promise<SetupStepStatus[]>` - Returns installation status of all 4 AgentOS Extended steps
- `agent-os-ui/src/server/services/setup.service.ts` → `setupService.runStep(step: 1|2|3, projectPath: string): void` - Spawns shell command for given step, streams output via events

### Types / Interfaces
- `agent-os-ui/src/server/services/setup.service.ts` → `SetupStepStatus` - `{ step: 1|2|3|4, name: string, status: 'not_installed'|'installed', details?: string }`
- `agent-os-ui/src/server/services/setup.service.ts` → `SetupService` - EventEmitter-based service class (singleton exported as `setupService`)
- `agent-os-ui/src/server/services/setup.service.ts` → `StepOutput` - `{ step: 1|2|3, data: string }` - emitted as 'step-output' event
- `agent-os-ui/src/server/services/setup.service.ts` → `StepComplete` - `{ step: 1|2|3, success: boolean, exitCode?: number|null, error?: string }` - emitted as 'step-complete' event

### Components
- `agent-os-ui/ui/src/components/setup/aos-setup-wizard.ts` → `<aos-setup-wizard>` - Light DOM Lit component for setup wizard UI, renders 4-step wizard with status, live output, and cloud terminal integration

### Events (EventEmitter)
- `'step-output'` → `StepOutput` - Emitted for each stdout/stderr chunk during step execution
- `'step-complete'` → `StepComplete` - Emitted when step finishes (success or failure)

### WebSocket Message Types (SETUP-003)
Frontend sends:
- `setup:check-status` → Server responds with `setup:status` (steps array)
- `setup:run-step` `{ step: 1|2|3 }` → Server streams `setup:step-output` and `setup:step-complete`
- `setup:start-devteam` `{ modelConfig, projectPath? }` → Server creates cloud terminal, sends `cloud-terminal:created` + `setup:devteam-started` `{ sessionId }`

Server sends:
- `setup:status` `{ steps: SetupStepStatus[] }` - Status check result
- `setup:step-output` `{ step, data }` - Live output during step execution
- `setup:step-complete` `{ step, success, exitCode?, error? }` - Step finished
- `setup:devteam-started` `{ sessionId }` - DevTeam cloud terminal started
- `setup:error` `{ code, message }` - Error (codes: NO_PROJECT, INVALID_STEP, CHECK_FAILED, RUN_FAILED, DEVTEAM_FAILED, INVALID_MESSAGE)

## Integration Notes
- SetupService extends EventEmitter with two event types: `step-output` and `step-complete`
- `runStep()` guards against parallel execution via `runningStep` property (throws Error if step already running)
- Commands are hardcoded in `SETUP_STEPS` array - client only sends step number (1/2/3), no shell injection risk
- WebSocket handler forwards `step-output` and `step-complete` events via `broadcast()` to all connected clients
- DevTeam setup creates a claude-code cloud terminal and sends `/agent-os:build-development-team` as initial input after 1s delay
- `<aos-setup-wizard>` uses Light DOM (createRenderRoot returns this) - CSS classes prefixed with `setup-` for styling via theme.css
- SETUP-005 only needs to `import './components/setup/aos-setup-wizard.js'` and render `<aos-setup-wizard>` in a tab

## File Change Summary

| File Path | Action | Story |
|-----------|--------|-------|
| `agent-os-ui/src/server/services/setup.service.ts` | Created | SETUP-001 |
| `agent-os-ui/src/server/services/setup.service.ts` | Modified | SETUP-002 |
| `agent-os-ui/src/server/websocket.ts` | Modified | SETUP-003 |
| `agent-os-ui/ui/src/components/setup/aos-setup-wizard.ts` | Created | SETUP-004 |
| `agent-os-ui/ui/src/views/settings-view.ts` | Modified | SETUP-005 |
