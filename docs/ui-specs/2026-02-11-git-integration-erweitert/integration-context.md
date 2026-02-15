# Integration Context - Git Integration Erweitert

## Completed Stories

| Story ID | Summary | Key Files |
|----------|---------|-----------|
| GITE-001 | Backend: Revert, Delete-Untracked, PR-Info Endpoints | git.protocol.ts, git.service.ts, git.handler.ts, websocket.ts |
| GITE-002 | Frontend: Revert/Delete Buttons im Commit-Dialog | aos-git-commit-dialog.ts, gateway.ts, app.ts, theme.css |
| GITE-003 | Frontend: PR-Badge in Git Status Bar | aos-git-status-bar.ts, gateway.ts, app.ts, theme.css |
| GITE-004 | Frontend: Commit & Push Workflow | aos-git-status-bar.ts, app.ts, aos-git-commit-dialog.ts, theme.css |

## New Exports & APIs

### Types / Interfaces
- `agent-os-ui/src/shared/types/git.protocol.ts` → `GitRevertResult` - Result with revertedFiles[] and failedFiles[]
- `agent-os-ui/src/shared/types/git.protocol.ts` → `GitPrInfo` - PR info with number, state, url, title
- `agent-os-ui/src/shared/types/git.protocol.ts` → `GitRevertMessage` - Client message with files[] to revert
- `agent-os-ui/src/shared/types/git.protocol.ts` → `GitDeleteUntrackedMessage` - Client message with file to delete
- `agent-os-ui/src/shared/types/git.protocol.ts` → `GitPrInfoMessage` - Client message to request PR info

### Services
- `agent-os-ui/src/server/services/git.service.ts` → `revertFiles(projectPath, files)` - Reverts files (handles staged + unstaged)
- `agent-os-ui/src/server/services/git.service.ts` → `deleteUntrackedFile(projectPath, file)` - Deletes untracked file via fs.unlink
- `agent-os-ui/src/server/services/git.service.ts` → `getPrInfo(projectPath)` - Returns GitPrInfo | null, cached 60s

### Gateway Methods (GITE-002, GITE-003)
- `agent-os-ui/ui/src/gateway.ts` → `sendGitRevert(files: string[])` - Sends git:revert message
- `agent-os-ui/ui/src/gateway.ts` → `sendGitDeleteUntracked(file: string)` - Sends git:delete-untracked message
- `agent-os-ui/ui/src/gateway.ts` → `requestGitPrInfo()` - Sends git:pr-info message

### Component Properties (GITE-003)
- `aos-git-status-bar` has `prInfo` property (GitPrInfo | null) - renders PR badge with status colors
- `app.ts` has `gitPrInfo` @state() - updated via git:pr-info:response handler
- PR info loaded in parallel with gitStatus and gitBranches in `_loadGitStatus()`

### Component Events (GITE-002)
- `aos-git-commit-dialog` fires `revert-file` → detail: { file: string }
- `aos-git-commit-dialog` fires `revert-all` → no detail
- `aos-git-commit-dialog` fires `delete-untracked` → detail: { file: string }

### Commit & Push Workflow (GITE-004)
- `aos-git-status-bar` dispatches `open-commit-dialog` with detail `{ autoPush: true }`
- `app.ts` has `pendingAutoPush` @state() and `commitAndPushPhase` @state() ('idle'|'committing'|'pushing')
- `app.ts` orchestrates: commit → on success → push → on success → close dialog
- `app.ts` handles push errors after commit: closes dialog, shows warning toast
- `aos-git-commit-dialog` has `autoPush` property (Boolean) - preselects all files, changes button text
- `aos-git-commit-dialog` has `progressPhase` property ('idle'|'committing'|'pushing') - shows progress, locks dialog during push

### WebSocket Message Types
- `git:revert` → `git:revert:response` (data: GitRevertResult)
- `git:delete-untracked` → `git:delete-untracked:response` (data: { file, success })
- `git:pr-info` → `git:pr-info:response` (data: GitPrInfo | null)

## Integration Notes
- All new endpoints follow the exact same pattern as existing git endpoints (status, commit, push, etc.)
- Frontend stories (GITE-003, 004) can send these messages via WebSocket and receive typed responses
- PR info uses `gh` CLI with graceful fallback to null if not installed
- Revert/Delete handlers in app.ts call _handleRefreshGit() after response to update the file list
- autoPush property on commit-dialog is ready for GITE-004 to use

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| agent-os-ui/src/shared/types/git.protocol.ts | Modified | GITE-001 |
| agent-os-ui/src/server/services/git.service.ts | Modified | GITE-001 |
| agent-os-ui/src/server/handlers/git.handler.ts | Modified | GITE-001 |
| agent-os-ui/src/server/websocket.ts | Modified | GITE-001 |
| agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts | Modified | GITE-002 |
| agent-os-ui/ui/src/gateway.ts | Modified | GITE-002 |
| agent-os-ui/ui/src/app.ts | Modified | GITE-002 |
| agent-os-ui/ui/src/styles/theme.css | Modified | GITE-002, GITE-003 |
| agent-os-ui/ui/src/components/git/aos-git-status-bar.ts | Modified | GITE-003 |
| agent-os-ui/ui/src/gateway.ts | Modified | GITE-002, GITE-003 |
| agent-os-ui/ui/src/app.ts | Modified | GITE-002, GITE-003, GITE-004 |
| agent-os-ui/ui/src/components/git/aos-git-status-bar.ts | Modified | GITE-003, GITE-004 |
| agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts | Modified | GITE-002, GITE-004 |
| agent-os-ui/ui/src/styles/theme.css | Modified | GITE-002, GITE-003, GITE-004 |
