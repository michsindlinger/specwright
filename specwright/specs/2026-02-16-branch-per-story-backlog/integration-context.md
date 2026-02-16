# Integration Context - Branch-per-Story Backlog

> Auto-generated from story completions
> Last Updated: 2026-02-16

## Completed Stories

| Story ID | Summary | Key Files/Exports |
|----------|---------|-------------------|
| BPS-001 | Git-Service-Erweiterungen | ui/src/server/services/git.service.ts, ui/src/shared/types/git.protocol.ts |
| BPS-002 | Backlog-Story-Lifecycle im Workflow-Executor | ui/src/server/workflow-executor.ts |
| BPS-003 | WebSocket + Frontend Integration und Error-Handling | ui/src/server/workflow-executor.ts, ui/frontend/src/views/dashboard-view.ts |

## New Exports & APIs

### Services

- `ui/src/server/services/git.service.ts`
  - `isWorkingDirectoryClean(projectPath)` - Prüft ob Working Directory clean ist
  - `checkoutMain(projectPath)` - Wechselt auf main Branch
  - `createBranch(projectPath, branchName, baseBranch)` - Erstellt Feature-Branch
  - `pushBranch(projectPath, branchName)` - Pushed Branch zu Remote
  - `createPullRequest(projectPath, branchName, title)` - Erstellt PR via GitHub CLI

### WebSocket Messages (Backend -> Frontend)

- `backlog.story.start.ack` - Bestätigung dass Story gestartet wurde
- `backlog.story.start.error` - Fehler beim Starten (Branch-Erstellung fehlgeschlagen)
- `backlog.story.complete` - Story abgeschlossen mit `prUrl` und `prWarning` Feldern
- `backlog.story.git.warning` - Nicht-kritische Git-Warnungen (PR-Push fehlgeschlagen, etc.)
- `workflow.interactive.complete` - Workflow completion event

### Frontend Handler

- `ui/frontend/src/views/dashboard-view.ts`
  - `onBacklogStoryStartAck(msg)` - Zeigt Toast bei Story-Start
  - `onBacklogStoryStartError(msg)` - Zeigt Error-Toast, versucht nächste Story
  - `onBacklogStoryComplete(msg)` - Aktualisiert Kanban, zeigt PR-Info, triggert Auto-Continue
  - `onBacklogStoryGitWarning(msg)` - Zeigt Warning-Toast für nicht-kritische Git-Fehler

## Integration Notes

### BPS-001: Git-Service-Erweiterungen
- Alle Git-Operationen sind im `gitService` gekapselt
- Support für `isWorkingDirectoryClean`, `checkoutMain`, `createBranch`, `pushBranch`, `createPullRequest`
- PR-Erstellung nutzt GitHub CLI (`gh pr create`)

### BPS-002: Backlog-Story-Lifecycle
- `startBacklogStoryExecution()` macht Pre-Execution Git-Ops (stash, checkout main, create branch)
- `handleBacklogPostExecution()` macht Post-Execution Git-Ops (push, create PR, checkout main)
- Post-Execution läuft VOR `handleStoryCompletionAndContinue()` - garantiert Reihenfolge

### BPS-003: WebSocket + Frontend Integration
- `handleBacklogPostExecution()` gibt `{ prUrl?, prWarning? }` zurück
- `backlog.story.complete` Event wird mit PR-Info an Frontend gesendet
- Frontend `onBacklogStoryGitWarning` zeigt Warnungen ohne Auto-Mode zu unterbrechen
- Frontend `onBacklogStoryStartError` überspringt fehlgeschlagene Story und versucht nächste

## File Change Summary

| File | Change | Story |
|------|--------|-------|
| ui/src/server/services/git.service.ts | Modified | BPS-001 |
| ui/src/shared/types/git.protocol.ts | Modified | BPS-001 |
| ui/src/server/workflow-executor.ts | Modified | BPS-002, BPS-003 |
| ui/frontend/src/views/dashboard-view.ts | Modified | BPS-003 |
