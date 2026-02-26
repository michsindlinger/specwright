# Story Index

> Spec: Custom Team Members
> Created: 2026-02-26
> Last Updated: 2026-02-26

## Overview

This document provides an overview of all user stories for the Custom Team Members specification.

**Total Stories**: 9 (6 reguläre + 3 System)
**Estimated Effort**: ~18 SP

---

## Story Summary

| Story ID | Title | Type | Priority | Dependencies | Status | Points |
|----------|-------|------|----------|--------------|--------|--------|
| CTM-001 | Backend Foundation - Shared Types, Service & API | Backend | High | None | Ready | 3 |
| CTM-002 | Workflow & Command - /add-team-member | Backend | High | CTM-001 | Ready | 3 |
| CTM-003 | Frontend Gruppierte Darstellung | Frontend | High | CTM-001 | Ready | 3 |
| CTM-004 | Edit-Funktionalität - Markdown-Editor Modal | Frontend | High | CTM-001, CTM-003 | Ready | 3 |
| CTM-005 | Delete-Funktionalität - REST DELETE + Confirm | Frontend | High | CTM-001, CTM-003 | Ready | 1 |
| CTM-006 | Integration & Workflow-Trigger | Frontend | Medium | CTM-002, CTM-003, CTM-004, CTM-005 | Ready | 1 |
| CTM-997 | Code Review | System/Review | High | Alle regulären Stories | Ready | 2 |
| CTM-998 | Integration Validation | System/Integration | High | CTM-997 | Ready | 2 |
| CTM-999 | Finalize PR | System/Finalization | High | CTM-998 | Ready | 2 |

---

## Dependency Graph

```
CTM-001 (No dependencies - Backend Foundation)
    ├──> CTM-002 (Workflow & Command)
    ├──> CTM-003 (Grouped Display)
    │       ├──> CTM-004 (Edit)
    │       └──> CTM-005 (Delete)
    └──────────> CTM-004 (Edit - also depends on CTM-001)
                 CTM-005 (Delete - also depends on CTM-001)

CTM-002 + CTM-003 + CTM-004 + CTM-005
    └──> CTM-006 (Integration & Workflow-Trigger)

CTM-006 (last regular story)
    └──> CTM-997 (Code Review)
         └──> CTM-998 (Integration Validation)
              └──> CTM-999 (Finalize PR)
```

---

## Execution Plan

### Phase 1: Backend Foundation (Parallel: keine Abhängigkeiten)
- CTM-001: Backend Foundation - Shared Types, Service & API Endpoints

### Phase 2: Workflow + Frontend (Parallel: beide abhängig von CTM-001)
- CTM-002: Workflow & Command - /add-team-member
- CTM-003: Frontend Gruppierte Darstellung

### Phase 3: Edit + Delete (Parallel: beide abhängig von CTM-001 + CTM-003)
- CTM-004: Edit-Funktionalität
- CTM-005: Delete-Funktionalität

### Phase 4: Integration (Sequentiell: abhängig von Phase 2 + 3)
- CTM-006: Integration & Workflow-Trigger

### Phase 5: System Stories (Sequentiell)
- CTM-997: Code Review (nach allen regulären Stories)
- CTM-998: Integration Validation (nach CTM-997)
- CTM-999: Finalize PR (nach CTM-998)

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-backend-foundation.md`
- `stories/story-002-workflow-and-command.md`
- `stories/story-003-frontend-grouped-display.md`
- `stories/story-004-edit-functionality.md`
- `stories/story-005-delete-functionality.md`
- `stories/story-006-integration-workflow-trigger.md`
- `stories/story-997-code-review.md`
- `stories/story-998-integration-validation.md`
- `stories/story-999-finalize-pr.md`

---

## Blocked Stories

No blocked stories - all DoR will be completed in Technical Refinement phase.
