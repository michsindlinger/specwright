# Backlog Story Index

> Quick Tasks & Minor Enhancements
> Created: [CREATED_DATE]
> Last Updated: [LAST_UPDATED_DATE]

## Overview

This index tracks lightweight tasks added via `/add-todo`. These are small, independent tasks that don't require full specification.

**Total Stories**: [TOTAL_STORIES]
**Ready for Execution**: [READY_COUNT]
**Completed**: [COMPLETED_COUNT]

---

## Story Summary

| Story ID | Title | Type | Priority | Status | Points | Added |
|----------|-------|------|----------|--------|--------|-------|
<!-- Stories will be added here -->

---

## Today's Tasks ([TODAY_DATE])

| Story ID | Title | Type | Status |
|----------|-------|------|--------|
<!-- Today's tasks will be listed here -->

---

## Execution History

### Completed Kanbans

| Date | Kanban File | Stories Completed |
|------|-------------|-------------------|
<!-- Completed daily kanbans will be listed here -->

---

## Story Files

Story files are located in this directory:

```
specwright/backlog/
├── story-index.md (this file)
├── kanban-YYYY-MM-DD.md (daily kanban boards)
├── user-story-YYYY-MM-DD-001-[slug].md
├── user-story-YYYY-MM-DD-002-[slug].md
└── ...
```

---

## Template Usage Instructions

### Story ID Format
- Pattern: `YYYY-MM-DD-[INDEX]`
- Example: `2025-01-15-001`, `2025-01-15-002`
- Index resets daily (001 for first task of each day)

### File Naming Convention
- Pattern: `user-story-YYYY-MM-DD-[INDEX]-[slug].md`
- Slug: lowercase title with hyphens
- Example: `user-story-2025-01-15-001-loading-state-modal.md`

### Status Values
- **Ready**: DoR complete, can be executed
- **In Progress**: Currently being worked on
- **Done**: Completed and committed

### Daily Kanban
- Created automatically when `/execute-tasks backlog` runs
- One kanban per day: `kanban-YYYY-MM-DD.md`
- Tracks stories executed on that day

### When to Use /add-todo vs /create-spec

**Use /add-todo for:**
- Small UI tweaks
- Minor bug fixes
- Quick enhancements
- Single-file changes
- XS/S complexity tasks

**Use /create-spec for:**
- New features
- Multiple related stories
- Complex requirements
- M/L/XL complexity tasks
- Tasks needing clarification
