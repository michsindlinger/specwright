# Domain: Task Tracking

## Overview

How tasks from Agent OS specs are displayed and managed in the Dashboard view.

## Task Sources

Tasks come from:
- User stories in spec files (`agent-os/specs/*/`)
- Bugs added to specs
- Quick tasks from `/add-todo`

## Task Structure

Each task has:
- **id**: Unique identifier from spec
- **title**: Short description
- **type**: Feature, Bug, Task, Chore
- **status**: Todo, In Progress, Review, Done
- **priority**: Critical, High, Medium, Low
- **spec**: Reference to parent specification

## Kanban Board

Tasks are displayed in columns by status:

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Todo        │ In Progress │ Review      │ Done        │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ [Task 1]    │ [Task 3]    │ [Task 5]    │ [Task 6]    │
│ [Task 2]    │ [Task 4]    │             │ [Task 7]    │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

## Task Actions

### Drag-and-Drop
Moving a card between columns updates task status:
- Updates spec file with new status
- Shows success toast on completion
- Supports undo within 5 seconds

### Task Detail Panel
Clicking a card opens slide-over panel with:
- Full description
- Acceptance criteria
- Technical details (WAS/WIE/WO)
- Action buttons (Chat, Execute)

### Context Actions
Right-click or menu button shows:
- View Details
- Move to... (status)
- Start Chat (opens chat with task context)
- Start Workflow (runs execute-tasks for this task)
- Delete (with confirmation)

## Filtering

Users can filter the board by:
- Status (show/hide columns)
- Type (Feature, Bug, Task, Chore)
- Priority (Critical, High, Medium, Low)
- Search (task title)

Filters persist in URL for sharing/bookmarking.

---

*Last Updated: 2026-01-30*
