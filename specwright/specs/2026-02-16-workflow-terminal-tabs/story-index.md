# Story Index

> Spec: Workflow Terminal Tabs
> Created: 2026-02-16
> Last Updated: 2026-02-16

## Overview

This document provides an overview of all user stories for the Workflow Terminal Tabs specification.

**Total Stories**: 9 (6 Feature + 3 System)
**Estimated Effort**: 7 SP

---

## Story Summary

| Story ID | Title | Type | Priority | Dependencies | Status | Points |
|----------|-------|------|----------|--------------|--------|--------|
| WTT-001 | Backend Workflow-Session-Support | Backend | Critical | None | Ready | 2 |
| WTT-002 | Frontend Workflow-Tab-Integration | Frontend | Critical | WTT-001 | Ready | 2 |
| WTT-003 | UI-Trigger auf Terminal-Tabs umleiten | Full-stack | High | WTT-002 | Ready | 2 |
| WTT-004 | Tab-Notifications bei Input-Bedarf | Frontend | Medium | WTT-002 | Ready | 2 |
| WTT-005 | Tab-Close Confirmation | Frontend | Medium | WTT-002 | Ready | 1 |
| WTT-006 | Legacy Cleanup | Full-stack | High | WTT-003, WTT-004, WTT-005 | Ready | 2 |
| WTT-997 | Code Review | System | - | WTT-006 | Ready | - |
| WTT-998 | Integration Validation | System | - | WTT-997 | Ready | - |
| WTT-999 | Finalize PR | System | - | WTT-998 | Ready | - |

---

## Dependency Graph

```
WTT-001 (Backend Workflow-Session-Support)
    |
    v
WTT-002 (Frontend Workflow-Tab-Integration)
    |
    +-------+-------+
    |       |       |
    v       v       v
WTT-003 WTT-004 WTT-005
(Trigger) (Notify) (Close)
    |       |       |
    +-------+-------+
    |
    v
WTT-006 (Legacy Cleanup)
    |
    v
WTT-997 (Code Review)
    |
    v
WTT-998 (Integration Validation)
    |
    v
WTT-999 (Finalize PR)
```

---

## Execution Plan

### Phase 1: Foundation (Sequential)
1. WTT-001: Backend Workflow-Session-Support

### Phase 2: Frontend (Sequential after Phase 1)
2. WTT-002: Frontend Workflow-Tab-Integration

### Phase 3: Features (Parallel after Phase 2)
- WTT-003: UI-Trigger auf Terminal-Tabs umleiten
- WTT-004: Tab-Notifications bei Input-Bedarf
- WTT-005: Tab-Close Confirmation

### Phase 4: Cleanup (Sequential after Phase 3)
4. WTT-006: Legacy Cleanup

### Phase 5: System Stories (Sequential)
5. WTT-997: Code Review
6. WTT-998: Integration Validation
7. WTT-999: Finalize PR

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-backend-workflow-session-support.md`
- `stories/story-002-frontend-workflow-tab-integration.md`
- `stories/story-003-ui-trigger-terminal-tabs.md`
- `stories/story-004-tab-notifications.md`
- `stories/story-005-tab-close-confirmation.md`
- `stories/story-006-legacy-cleanup.md`
- `stories/story-997-code-review.md`
- `stories/story-998-integration-validation.md`
- `stories/story-999-finalize-pr.md`

---

## Blocked Stories

Keine blockierten Stories. Alle DoR-Items werden in Step 3 (Architect Refinement) ausgefuellt.
