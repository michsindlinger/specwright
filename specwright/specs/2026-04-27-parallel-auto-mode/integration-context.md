# Integration Context

## Completed Stories

| Story | Summary | Key Files |
|-------|---------|-----------|
| PAM-005 | Worktree-per-story helpers: path calc + symlink setup | `ui/src/server/utils/worktree-story.ts`, `ui/src/server/workflow-executor.ts` |
| PAM-998 | Integration validation: build/lint/PAM-tests + 14/14 connections matrix | `specwright/specs/2026-04-27-parallel-auto-mode/validation-report.md` |
| PAM-FIX-001 | Backlog-Orchestrator: per-item sub-worktree (FS-isolation for parallel slots) | `ui/src/server/services/auto-mode-backlog-orchestrator.ts`, `ui/src/server/utils/worktree-story.ts`, `ui/src/server/workflow-executor.ts` |
| PAM-FIX-002 | SpecOrchestrator uses WorkflowExecutor helpers (createStoryWorktree / mergeStoryBranchIntoSpec / removeStoryWorktree) instead of inline execSync | `ui/src/server/services/auto-mode-spec-orchestrator.ts`, `ui/src/server/workflow-executor.ts` |

## New Exports & APIs

### Services
`ui/src/server/utils/worktree-story.ts` — pure path helpers + symlink setup:
- `storyWorktreePath(projectPath, specId, storyId): string` — `${proj}-worktrees/${feature}-${storyId}`
- `storyBranchName(specId, storyId): string` — `feature/${feature}/${storyId}`
- `backlogWorktreePath(projectPath, itemId): string` — `${proj}-worktrees/backlog-${slug}`
- `backlogBranchName(itemId): string` — `feature/${slug}` (matches `startBacklogStoryExecution` convention)
- `setupSpecSymlinkInWorktree(projectPath, worktreePath, specId): Promise<void>` — idempotent spec symlink
- `setupBacklogSymlinkInWorktree(projectPath, worktreePath): Promise<void>` — idempotent backlog symlink

`ui/src/server/workflow-executor.ts` — 4 public helper methods on `WorkflowExecutor`:
- `createStoryWorktree(projectPath, specId, storyId): Promise<string>` — creates sub-worktree + spec symlink
- `removeStoryWorktree(projectPath, worktreePath): Promise<void>` — removes via `git worktree remove --force`
- `mergeStoryBranchIntoSpec(projectPath, specBranch, storyBranch): Promise<void>` — `--no-ff` merge; throws on conflict
- `setupBacklogSymlink(projectPath, worktreePath): Promise<void>` — backlog symlink + `.mcp.json` symlink

### Hooks / Utilities
_None yet_

### Types / Interfaces
- `SpecWorktreeOps` (exported from `ui/src/server/services/auto-mode-spec-orchestrator.ts`): minimal interface for git/worktree ops injected into the orchestrator. Implemented by `WorkflowExecutor`. Avoids circular import on full executor type.

## Integration Notes
- Conflict path: `mergeStoryBranchIntoSpec` aborts merge and throws `Error("Merge conflict: …")`. Caller (PAM-007 wiring) is responsible for keeping worktree and setting blocked+incident.
- All symlink helpers are idempotent (safe to call on restart/resume).
- `removeStoryWorktree` is best-effort (logs warning on failure, never throws).
- PAM-007 wires these helpers into `setupSpecOrchestratorListeners` and story slot lifecycle.
- **PAM-FIX-001:** `AutoModeBacklogOrchestrator` overrides `resolveSlotProjectPath` to create a per-item sub-worktree on `feature/${slug}` (idempotent), drops it on `onItemCompleted/Failed`, and cleans tracked worktrees on `cancel`. `startBacklogStoryExecution` no longer creates the branch in the main workdir on the PTY path — `git worktree add -b` handles it. Branch creation in main workdir remains for the `--print` fallback path only.
- **PAM-FIX-002:** `AutoModeSpecOrchestrator` no longer shells out via `execSync`. All git/worktree ops (create, merge, remove) delegate to the `SpecWorktreeOps` interface, which `WorkflowExecutor` implements. `WorkflowExecutor.startSpecAutoMode` passes `this` as `worktreeOps` when constructing the orchestrator. Conflict path semantics preserved: on merge conflict the worktree is kept and `story.merge-conflict` is emitted with the original error message + worktree path.
