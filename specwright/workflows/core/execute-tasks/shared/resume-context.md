---
description: Resume Context Schema - shared across all phases
version: 4.0
---

# Resume Context Schema

The Resume Context in kanban.json enables phase recovery across sessions.

## JSON Schema (v4.0 - Primary)

Resume context is stored as a JSON object in `kanban.json` → `resumeContext`:

```json
{
  "resumeContext": {
    "currentPhase": "2-complete",
    "nextPhase": "3-execute-story",
    "specFolder": "specwright/specs/2026-01-13-feature-name",
    "worktreePath": "../projekt-x-worktrees/feature-name",
    "gitBranch": "feature/feature-name",
    "gitStrategy": "worktree",
    "currentStory": null,
    "currentStoryPhase": null,
    "lastAction": "Git worktree created",
    "nextAction": "Execute first story",
    "progressIndex": 0,
    "totalStories": 4
  }
}
```

### Required Fields

| Field | Type | Description | Example Values |
|-------|------|-------------|----------------|
| **currentPhase** | string | Phase identifier | `1-kanban-setup`, `1-complete`, `2-complete`, `3-execute-story`, `story-complete`, `all-stories-done`, `5-ready`, `complete` |
| **nextPhase** | string\|null | What to execute next | `2-worktree-setup`, `3-execute-story`, `5-finalize`, `null` |
| **specFolder** | string | Full path to spec | `specwright/specs/2026-01-13-feature-name` |
| **worktreePath** | string\|null | Git worktree path (external) | `../projekt-x-worktrees/feature-name` or `null` |
| **gitBranch** | string\|null | Branch name | `feature/feature-name` or `null` |
| **gitStrategy** | string\|null | Git workflow strategy | `worktree`, `branch`, `current-branch`, or `null` |
| **currentStory** | string\|null | Story being worked on | `STORY-001` or `null` |
| **currentStoryPhase** | string\|null | Phase within story | `implementing`, `reviewing`, or `null` |
| **lastAction** | string | What just happened | `"Kanban board created"` |
| **nextAction** | string | What needs to happen | `"Setup git worktree"` |
| **progressIndex** | number | Stories completed count | `0`, `1`, `2` |
| **totalStories** | number | Total story count | `4` |

## Board Status (JSON)

Stored in `kanban.json` → `boardStatus`:

```json
{
  "boardStatus": {
    "total": 4,
    "ready": 2,
    "inProgress": 0,
    "inReview": 0,
    "testing": 0,
    "done": 2,
    "blocked": 0
  }
}
```

## Worktree Path Format

Worktrees are created OUTSIDE the project directory:
- **Pattern:** `../{project-name}-worktrees/{feature-name}`
- **Example:** `../projekt-x-worktrees/user-auth`

The worktree contains the full repository including `.claude/` and `specwright/` folders.

## Update Rules

UPDATE kanban.json at:
- End of each phase (resumeContext + changeLog)
- Before any STOP point
- After any state change (story movement, status change)

**Prefer MCP tools** for kanban updates (atomic, with file locking):
- `kanban_start_story` - Mark story as in_progress
- `kanban_complete_story` - Mark story as done
- `kanban_set_git_strategy` - Set git strategy after Phase 2

**CRITICAL: Always use JSON field updates, never string replacement on JSON files.**

---

## Legacy: MD Format (Backward Compatibility)

For specs created before v4.0 that still use `kanban-board.md`:

```markdown
## Resume Context

> **CRITICAL**: This section is used for phase recovery after /clear or conversation compaction.
> **NEVER** change the field names or format.

| Field | Value |
|-------|-------|
| **Current Phase** | 1-complete |
| **Next Phase** | 2 - Git Worktree |
| **Spec Folder** | specwright/specs/SPEC-NAME |
| **Worktree Path** | ../projekt-x-worktrees/feature-name |
| **Git Branch** | (pending) |
| **Git Strategy** | worktree |
| **Current Story** | None |
| **Last Action** | Kanban board created |
| **Next Action** | Setup git worktree |
```

**Note:** Legacy MD format is read-only for backward compatibility. New specs always use JSON.
