# Integration Context

## Completed Stories

| Story | Summary | Key Files |
|-------|---------|-----------|
| PAM-005 | Worktree-per-story helpers: path calc + symlink setup | `ui/src/server/utils/worktree-story.ts`, `ui/src/server/workflow-executor.ts` |
| PAM-998 | Integration validation: build/lint/PAM-tests + 14/14 connections matrix | `specwright/specs/2026-04-27-parallel-auto-mode/validation-report.md` |

## New Exports & APIs

### Services
`ui/src/server/utils/worktree-story.ts` — pure path helpers + symlink setup:
- `storyWorktreePath(projectPath, specId, storyId): string` — `${proj}-worktrees/${feature}-${storyId}`
- `storyBranchName(specId, storyId): string` — `feature/${feature}/${storyId}`
- `backlogWorktreePath(projectPath, itemId): string` — `${proj}-worktrees/backlog-${slug}`
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
_None yet_

## Integration Notes
- Conflict path: `mergeStoryBranchIntoSpec` aborts merge and throws `Error("Merge conflict: …")`. Caller (PAM-007 wiring) is responsible for keeping worktree and setting blocked+incident.
- All symlink helpers are idempotent (safe to call on restart/resume).
- `removeStoryWorktree` is best-effort (logs warning on failure, never throws).
- PAM-007 wires these helpers into `setupSpecOrchestratorListeners` and story slot lifecycle.
