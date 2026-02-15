# Story Index

> Spec: Unified Kanban Board
> Created: 2026-02-13
> Last Updated: 2026-02-13

## Overview

This document provides an overview of all user stories for the Unified Kanban Board specification.

**Total Stories**: 9 (6 Feature + 3 System)
**Estimated Effort**: S+M+S+M+S+XS + 3×S = ~14 Points

---

## Story Summary

| Story ID | Title | Type | Priority | Dependencies | Status | Effort |
|----------|-------|------|----------|--------------|--------|--------|
| UKB-001 | StoryInfo Interface vereinheitlichen | Frontend | High | None | Ready | S |
| UKB-002 | Kanban Board Properties und Conditional Rendering | Frontend | High | UKB-001 | Blocked | M |
| UKB-003 | Backend Backlog-Datenmodell erweitern | Backend | High | None | Ready | S |
| UKB-004 | Dashboard Backlog-Rendering durch aos-kanban-board ersetzen | Frontend | High | UKB-002, UKB-003 | Blocked | M |
| UKB-005 | Event-Routing und Auto-Mode Integration | Frontend | High | UKB-002, UKB-004 | Blocked | S |
| UKB-006 | CSS Cleanup | Frontend | Medium | UKB-004 | Blocked | XS |
| UKB-997 | Code Review | System | High | UKB-006 | Blocked | S |
| UKB-998 | Integration Validation | System | High | UKB-997 | Blocked | S |
| UKB-999 | Finalize PR | System | High | UKB-998 | Blocked | S |

---

## Dependency Graph

```
UKB-001 (No dependencies)          UKB-003 (No dependencies)
    ↓                                   ↓
UKB-002 (Depends on UKB-001)           │
    ↓                                   │
    └──────────────┬────────────────────┘
                   ↓
UKB-004 (Depends on UKB-002, UKB-003)
    ↓                   ↓
UKB-005 (Depends on     UKB-006 (Depends on UKB-004)
  UKB-002, UKB-004)         ↓
    ↓                   UKB-997 (Depends on UKB-006)
    └───────────────────────↓
                        UKB-998 (Depends on UKB-997)
                            ↓
                        UKB-999 (Depends on UKB-998)
```

---

## Execution Plan

### Parallel Execution (No Dependencies)
- UKB-001: StoryInfo Interface vereinheitlichen
- UKB-003: Backend Backlog-Datenmodell erweitern

### Sequential Execution (Has Dependencies)
1. UKB-002: Kanban Board Properties und Conditional Rendering (depends on UKB-001)
2. UKB-004: Dashboard Backlog-Rendering durch aos-kanban-board ersetzen (depends on UKB-002, UKB-003)
3. UKB-005: Event-Routing und Auto-Mode Integration (depends on UKB-002, UKB-004)
4. UKB-006: CSS Cleanup (depends on UKB-004)
5. UKB-997: Code Review (depends on UKB-006)
6. UKB-998: Integration Validation (depends on UKB-997)
7. UKB-999: Finalize PR (depends on UKB-998)

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-storyinfo-interface-vereinheitlichen.md`
- `stories/story-002-kanban-board-properties.md`
- `stories/story-003-backend-backlog-datenmodell.md`
- `stories/story-004-dashboard-backlog-ersetzen.md`
- `stories/story-005-event-routing-auto-mode.md`
- `stories/story-006-css-cleanup.md`
- `stories/story-997-code-review.md`
- `stories/story-998-integration-validation.md`
- `stories/story-999-finalize-pr.md`

---

## Blocked Stories

The following stories are blocked due to dependencies:

- **UKB-002: Kanban Board Properties und Conditional Rendering**
  - Blocked by: UKB-001
- **UKB-004: Dashboard Backlog-Rendering durch aos-kanban-board ersetzen**
  - Blocked by: UKB-002, UKB-003
- **UKB-005: Event-Routing und Auto-Mode Integration**
  - Blocked by: UKB-002, UKB-004
- **UKB-006: CSS Cleanup**
  - Blocked by: UKB-004
- **UKB-997: Code Review**
  - Blocked by: UKB-006
- **UKB-998: Integration Validation**
  - Blocked by: UKB-997
- **UKB-999: Finalize PR**
  - Blocked by: UKB-998
