# Integration Context - Git Integration UI

## Completed Stories

| Story ID | Summary | Key Files |
|----------|---------|-----------|
| GIT-001 | Git Backend API: Protocol types, service, handler, websocket routing | git.protocol.ts, git.service.ts, git.handler.ts, websocket.ts |
| GIT-002 | Git Status Bar: Lit component, gateway git methods, app.ts integration | aos-git-status-bar.ts, gateway.ts, app.ts, theme.css |
| GIT-003 | Branch-Wechsel: Clickable branch dropdown, checkout via gateway, uncommitted changes warning | aos-git-status-bar.ts, gateway.ts, app.ts, theme.css |
| GIT-004 | Commit-Dialog: Modal mit scrollbarer Dateiliste, Checkboxen, Status-Badges, Commit-Message, Error Handling | aos-git-commit-dialog.ts, gateway.ts, app.ts, theme.css |
| GIT-005 | Pull/Push/Fehlerbehandlung: Split-Button Pull mit Rebase-Option, Operation-Lock, Toast Notifications, Error Mapping | aos-git-status-bar.ts, gateway.ts, app.ts, git.service.ts, git.handler.ts, websocket.ts, git.protocol.ts, theme.css |

## New Exports & APIs

**Types/Interfaces:**
- `agent-os-ui/src/shared/types/git.protocol.ts` → `GitStatusData`, `GitChangedFile`, `GitBranchEntry`, `GitCommitResult`, `GitPullResult`, `GitPushResult`, `GitCheckoutResult` - All response data types
- `agent-os-ui/src/shared/types/git.protocol.ts` → `GitMessageType`, `GitClientMessage`, `GitServerMessage` - Message type unions
- `agent-os-ui/src/shared/types/git.protocol.ts` → `GIT_ERROR_CODES`, `GIT_CONFIG` - Constants

**Services:**
- `agent-os-ui/src/server/services/git.service.ts` → `gitService` (singleton) - `getStatus()`, `getBranches()`, `checkout()`, `commit()`, `pull(path, rebase?)`, `push()`
- `agent-os-ui/src/server/services/git.service.ts` → `GitError` - Custom error class with `code` and `operation`

**Handlers:**
- `agent-os-ui/src/server/handlers/git.handler.ts` → `gitHandler` (singleton) - WebSocket message handler for all git operations

**Components:**
- `agent-os-ui/ui/src/components/git/aos-git-status-bar.ts` → `<aos-git-status-bar>` - Light DOM Lit component showing branch, ahead/behind, changed files, action buttons
  - Properties: `.gitStatus` (GitStatusData), `.loading` (boolean), `.hasProject` (boolean), `.branches` (GitBranchEntry[]), `.isOperationRunning` (boolean)
  - Events: `refresh-git`, `pull-git` (detail: { rebase?: boolean }), `push-git`, `open-commit-dialog`, `checkout-branch` (detail: { branch: string })
  - Pull split button: Click = normal pull, chevron dropdown = "Pull --rebase" option
  - Operation-Lock: All buttons disabled when `isOperationRunning` OR `loading` is true
  - Branch dropdown: click branch name to toggle, shows all local branches, current branch highlighted
  - Uncommitted changes: shows aos-confirm-dialog warning before switching
- `agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts` → `<aos-git-commit-dialog>` - Light DOM Lit component with commit modal
  - Properties: `.open` (boolean), `.files` (GitChangedFile[]), `.error` (string), `.committing` (boolean)
  - Events: `git-commit` (detail: { files: string[], message: string }), `dialog-close`
  - Features: scrollable file list with checkboxes, status badges (modified/added/deleted/untracked/renamed), commit message textarea, select all/none, Ctrl+Enter shortcut, error display

**Gateway Extensions:**
- `agent-os-ui/ui/src/gateway.ts` → `requestGitStatus()` - Sends `git:status` message
- `agent-os-ui/ui/src/gateway.ts` → `requestGitBranches()` - Sends `git:branches` message
- `agent-os-ui/ui/src/gateway.ts` → `requestGitPull(rebase?)` - Sends `git:pull` message with optional rebase flag
- `agent-os-ui/ui/src/gateway.ts` → `requestGitPush()` - Sends `git:push` message
- `agent-os-ui/ui/src/gateway.ts` → `sendGitCheckout(branch)` - Sends `git:checkout` message
- `agent-os-ui/ui/src/gateway.ts` → `sendGitCommit(files, message)` - Sends `git:commit` message

## Integration Notes

- Message type format: `git:<action>` (colons, same as cloud-terminal pattern)
- Client sends `git:status`, `git:branches`, `git:commit`, `git:pull`, `git:push`, `git:checkout`
- Server responds with `git:<action>:response` or `git:error`
- All operations require a project path (via `getClientProjectPath`)
- GitService uses `execFile` for security (no shell injection)
- 10 second timeout on all git operations
- app.ts holds gitStatus/gitLoading state, passes via properties to aos-git-status-bar
- Status bar dispatches events (refresh-git, pull-git, push-git, open-commit-dialog) caught by app.ts
- Git status auto-loads on project switch and project restore
- Commit dialog: `open-commit-dialog` event opens modal, files passed from gitStatus, commit sends via gateway.sendGitCommit()
- app.ts holds `showCommitDialog`, `commitError`, `committing` state for dialog control
- `git:commit:response` handler closes dialog and refreshes status; `git:error` with operation=commit sets dialog error
- Branch dropdown: clickable branch name toggles dropdown, uses `checkout-branch` event with `{ branch }` detail
- app.ts now holds `gitBranches` state and loads branches alongside status on project switch
- `git:checkout:response` handler refreshes both status and branches after successful checkout
- `git:branches:response` handler populates branch list
- Uncommitted changes check: if `files.length > 0`, shows `aos-confirm-dialog` before proceeding
- Pull/Push operation lock: `isGitOperationRunning` state in app.ts, passed as `isOperationRunning` prop to status bar
- All git buttons (Pull, Push, Commit, Refresh) disabled during running operations
- Pull split button: main button = normal pull, chevron = dropdown with "Pull --rebase" option
- `git:pull` message supports optional `rebase: true` field; backend passes `--rebase` flag to git
- `git:pull:response` and `git:push:response` have dedicated bound handlers in app.ts (replaced `gateway.once()` pattern)
- Error mapping: `MERGE_CONFLICT` → user-friendly message, `NETWORK_ERROR` → connectivity hint, etc.
- Toast notifications: success with commit count, info for "already up to date" / "nothing to push", error with mapped messages

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| `agent-os-ui/src/shared/types/git.protocol.ts` | Created | GIT-001 |
| `agent-os-ui/src/server/services/git.service.ts` | Created | GIT-001 |
| `agent-os-ui/src/server/handlers/git.handler.ts` | Created | GIT-001 |
| `agent-os-ui/src/server/websocket.ts` | Modified | GIT-001 |
| `agent-os-ui/ui/src/components/git/aos-git-status-bar.ts` | Created | GIT-002 |
| `agent-os-ui/ui/src/gateway.ts` | Modified | GIT-002 |
| `agent-os-ui/ui/src/app.ts` | Modified | GIT-002 |
| `agent-os-ui/ui/src/styles/theme.css` | Modified | GIT-002 |
| `agent-os-ui/ui/src/components/git/aos-git-status-bar.ts` | Modified | GIT-003 |
| `agent-os-ui/ui/src/gateway.ts` | Modified | GIT-003 |
| `agent-os-ui/ui/src/app.ts` | Modified | GIT-003 |
| `agent-os-ui/ui/src/styles/theme.css` | Modified | GIT-003 |
| `agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts` | Created | GIT-004 |
| `agent-os-ui/ui/src/gateway.ts` | Modified | GIT-004 |
| `agent-os-ui/ui/src/app.ts` | Modified | GIT-004 |
| `agent-os-ui/ui/src/styles/theme.css` | Modified | GIT-004 |
| `agent-os-ui/src/shared/types/git.protocol.ts` | Modified | GIT-005 |
| `agent-os-ui/src/server/services/git.service.ts` | Modified | GIT-005 |
| `agent-os-ui/src/server/handlers/git.handler.ts` | Modified | GIT-005 |
| `agent-os-ui/src/server/websocket.ts` | Modified | GIT-005 |
| `agent-os-ui/ui/src/gateway.ts` | Modified | GIT-005 |
| `agent-os-ui/ui/src/components/git/aos-git-status-bar.ts` | Modified | GIT-005 |
| `agent-os-ui/ui/src/app.ts` | Modified | GIT-005 |
| `agent-os-ui/ui/src/styles/theme.css` | Modified | GIT-005 |
