# Story Index

> Spec: Git Integration UI
> Created: 2026-02-11
> Last Updated: 2026-02-11

## Overview

This document provides an overview of all user stories for the Git Integration UI specification.

**Total Stories**: 8 (5 regular + 3 system)
**Estimated Effort**: 20 SP

---

## Story Summary

| Story ID | Title | Type | Priority | Dependencies | Status | Points |
|----------|-------|------|----------|--------------|--------|--------|
| GIT-001 | Git Backend API | Backend | Critical | None | Ready | 3 |
| GIT-002 | Git Status-Leiste | Frontend | Critical | GIT-001 | Ready | 3 |
| GIT-003 | Branch-Wechsel | Frontend | High | GIT-002 | Ready | 2 |
| GIT-004 | Commit-Dialog | Frontend | High | GIT-002 | Ready | 3 |
| GIT-005 | Pull, Push und Fehlerbehandlung | Frontend | High | GIT-002 | Ready | 3 |
| GIT-997 | Code Review | System/Review | Critical | GIT-005 | Ready | 2 |
| GIT-998 | Integration Validation | System/Integration | Critical | GIT-997 | Ready | 2 |
| GIT-999 | Finalize PR | System/Finalization | Critical | GIT-998 | Ready | 2 |

---

## Dependency Graph

```
GIT-001 (Backend API - No dependencies)
    |
    v
GIT-002 (Status-Leiste - depends on GIT-001)
    |
    +-------+-------+
    |       |       |
    v       v       v
GIT-003 GIT-004 GIT-005  (parallel: Branch, Commit, Pull/Push)
    |       |       |
    +-------+-------+
            |
            v
        GIT-997 (Code Review - after all regular stories)
            |
            v
        GIT-998 (Integration Validation)
            |
            v
        GIT-999 (Finalize PR)
```

---

## Execution Plan

### Phase 1: Sequential (Foundation)
1. **GIT-001**: Git Backend API (no dependencies)

### Phase 2: Sequential (Core UI)
2. **GIT-002**: Git Status-Leiste (depends on GIT-001)

### Phase 3: Parallel Execution
- **GIT-003**: Branch-Wechsel (depends on GIT-002)
- **GIT-004**: Commit-Dialog (depends on GIT-002)
- **GIT-005**: Pull, Push und Fehlerbehandlung (depends on GIT-002)

### Phase 4: System Stories (Sequential)
3. **GIT-997**: Code Review (depends on all regular stories)
4. **GIT-998**: Integration Validation (depends on GIT-997)
5. **GIT-999**: Finalize PR (depends on GIT-998)

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-git-backend-api.md`
- `stories/story-002-git-status-leiste.md`
- `stories/story-003-branch-wechsel.md`
- `stories/story-004-commit-dialog.md`
- `stories/story-005-pull-push-fehlerbehandlung.md`
- `stories/story-997-code-review.md`
- `stories/story-998-integration-validation.md`
- `stories/story-999-finalize-pr.md`

---

## Blocked Stories

Keine blockierten Stories - alle 5 regulaeren Stories sind technisch verfeinert (Architect Refinement abgeschlossen).
Alle DoR-Checkboxen sind als [x] markiert. System Stories (997/998/999) waren bereits komplett.
