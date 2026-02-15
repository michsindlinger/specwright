---
description: Resume Context Schema - shared across all phases
version: 3.2
---

# Resume Context Schema

The Resume Context in kanban-board.md enables phase recovery.

## Required Fields

| Field | Description | Example Values |
|-------|-------------|----------------|
| **Current Phase** | Phase identifier | 1-complete, 2-complete, story-complete, all-stories-done, 5-ready, complete |
| **Next Phase** | What to execute next | 2 - Git Worktree, 3 - Execute Story, 4.5 - Integration Validation, 5 - Finalize, None |
| **Spec Folder** | Full path | agent-os/specs/2026-01-13-feature-name |
| **Worktree Path** | Git worktree path (external) | ../projekt-x-worktrees/feature-name or (none) |
| **Git Branch** | Branch name | feature-name or main |
| **Git Strategy** | Git workflow strategy | worktree, branch, current-branch, or (not set) |
| **Current Story** | Story being worked on | STORY-001 or None |
| **Last Action** | What just happened | Kanban board created |
| **Next Action** | What needs to happen | Create git worktree |

## Worktree Path Format (v3.2+)

Worktrees are created OUTSIDE the project directory:
- **Pattern:** `../{project-name}-worktrees/{feature-name}`
- **Example:** `../projekt-x-worktrees/user-auth`

The worktree contains the full repository including `.claude/` and `agent-os/` folders.

## Board Status Metrics

For shell script parsing:

| Field | Parse Pattern | Example |
|-------|---------------|---------|
| **Total Stories** | `Total Stories.*\*\*.*([0-9]+)` | 4 |
| **Completed** | `Completed.*\*\*.*([0-9]+)` | 2 |
| **In Progress** | `In Progress.*\*\*.*([0-9]+)` | 0 |
| **In Review** | `In Review.*\*\*.*([0-9]+)` | 0 |
| **Testing** | `Testing.*\*\*.*([0-9]+)` | 0 |
| **Backlog** | `Backlog.*\*\*.*([0-9]+)` | 2 |

## Update Rules

UPDATE kanban-board.md at:
- End of each phase (Resume Context + Change Log)
- Before any STOP point
- After any state change (story movement, status change)

**CRITICAL: Always maintain the template structure exactly.**

## Required Format

**Resume Context MUST be a TABLE (for auto-execute.sh parsing):**

```markdown
## Resume Context

> **CRITICAL**: This section is used for phase recovery after /clear or conversation compaction.
> **NEVER** change the field names or format.

| Field | Value |
|-------|-------|
| **Current Phase** | 1-complete |
| **Next Phase** | 2 - Git Worktree |
| **Spec Folder** | agent-os/specs/SPEC-NAME |
| **Worktree Path** | ../projekt-x-worktrees/feature-name |
| **Git Branch** | (pending) |
| **Git Strategy** | worktree |
| **Current Story** | None |
| **Last Action** | Kanban board created |
| **Next Action** | Setup git worktree |
```

**Board Status MUST be a TABLE:**

```markdown
## Board Status

| Metric | Value |
|--------|-------|
| **Total Stories** | 4 |
| **Completed** | 0 |
| **In Progress** | 0 |
| **In Review** | 0 |
| **Testing** | 0 |
| **Backlog** | 4 |
| **Blocked** | 0 |
```

**DO NOT use key-value format like:**
```markdown
**Current Phase:** complete  ← WRONG!
```
