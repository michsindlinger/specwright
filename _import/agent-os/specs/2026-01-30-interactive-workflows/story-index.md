# Story Index

> Spec: Interactive Workflows
> Created: 2026-01-30
> Last Updated: 2026-01-30

## Overview

This document provides an overview of all user stories for the Interactive Workflows specification.

**Total Stories**: 9
**Estimated Effort**: ~40h (Human) / ~15h (Human + AI)

---

## Story Summary

| Story ID | Title | Type | Priority | Dependencies | Status | Complexity |
|----------|-------|------|----------|--------------|--------|------------|
| WKFL-001 | Workflow-Start über Karten | Frontend | Critical | None | **Ready** | S |
| WKFL-002 | AskUserQuestion UI | Frontend | Critical | WKFL-001 | **Ready** | M |
| WKFL-003 | Workflow-Progress-Indikator | Frontend | High | WKFL-001 | **Ready** | S |
| WKFL-004 | Embedded Docs-Viewer | Frontend | High | WKFL-001 | **Ready** | M |
| WKFL-005 | Collapsible Long Text | Frontend | Medium | WKFL-001 | **Ready** | S |
| WKFL-006 | Error-Handling & Cancel | Full-stack | High | WKFL-001 | **Ready** | S |
| WKFL-007 | Minimal Tool-Activity | Frontend | Medium | WKFL-001 | **Ready** | XS |
| WKFL-008 | Backend Workflow-Interaction | Backend | Critical | None | **Ready** | M |
| WKFL-999 | Integration & E2E Validation | Test | Critical | All | **Ready** | S |

---

## Dependency Graph

```
WKFL-008 (Backend - No dependencies)
    ↓
WKFL-001 (Frontend - No dependencies, but needs WKFL-008 for full function)
    ↓
    ├── WKFL-002 (AskUserQuestion UI)
    ├── WKFL-003 (Progress-Indikator)
    ├── WKFL-004 (Embedded Docs-Viewer)
    ├── WKFL-005 (Collapsible Text)
    ├── WKFL-006 (Error-Handling & Cancel)
    └── WKFL-007 (Minimal Tool-Activity)
        ↓
    WKFL-999 (Integration - depends on ALL)
```

---

## Execution Plan

### Phase 1: Foundation (Parallel)
- **WKFL-008**: Backend Workflow-Interaction (Critical path - Backend)
- **WKFL-001**: Workflow-Start über Karten (Critical path - Frontend)

### Phase 2: Core UI Components (Parallel after Phase 1)
- **WKFL-002**: AskUserQuestion UI
- **WKFL-003**: Workflow-Progress-Indikator
- **WKFL-006**: Error-Handling & Cancel

### Phase 3: Enhancement (Parallel after Phase 1)
- **WKFL-004**: Embedded Docs-Viewer
- **WKFL-005**: Collapsible Long Text
- **WKFL-007**: Minimal Tool-Activity

### Phase 4: Validation (Sequential after ALL)
- **WKFL-999**: Integration & End-to-End Validation

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-workflow-start.md`
- `stories/story-002-ask-user-question-ui.md`
- `stories/story-003-progress-indicator.md`
- `stories/story-004-embedded-docs-viewer.md`
- `stories/story-005-collapsible-text.md`
- `stories/story-006-error-handling-cancel.md`
- `stories/story-007-minimal-tool-activity.md`
- `stories/story-008-backend-workflow-interaction.md`
- `stories/story-999-integration-validation.md`

---

## Blocked Stories

**None** - All stories have complete DoR and are ready for execution.

---

## Critical Path

The minimum viable feature requires:
1. **WKFL-008** (Backend) - Without this, no communication possible
2. **WKFL-001** (Frontend) - Without this, no workflow can start
3. **WKFL-002** (Frontend) - Without this, no questions can be answered

These 3 stories form the critical path for a functional MVP.

---

## Notes

- All frontend stories depend on WKFL-001
- WKFL-008 (Backend) can be developed in parallel with WKFL-001
- WKFL-999 (Integration) must be last
- Stories WKFL-003 through WKFL-007 can be developed in parallel after WKFL-001
