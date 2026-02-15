# Story Index

> Spec: Git Integration Erweitert
> Created: 2026-02-11
> Last Updated: 2026-02-11

## Overview

This document provides an overview of all user stories for the Git Integration Erweitert specification.

**Total Stories**: 7 (4 regulaere + 3 System)
**Estimated Effort**: 16 SP

---

## Story Summary

| Story ID | Title | Type | Priority | Dependencies | Status | Points |
|----------|-------|------|----------|--------------|--------|--------|
| GITE-001 | Git Backend Erweiterung (Revert, Delete, PR-Info) | Backend | Critical | None | Ready | 3 |
| GITE-002 | Datei-Aktionen im Commit-Dialog | Frontend | High | GITE-001 | Ready | 3 |
| GITE-003 | PR-Anzeige in Status-Leiste | Frontend | High | GITE-001 | Ready | 2 |
| GITE-004 | Commit & Push Workflow | Frontend | High | GITE-002 | Ready | 2 |
| GITE-997 | Code Review | System/Review | Critical | GITE-004 | Ready | 2 |
| GITE-998 | Integration Validation | System/Integration | Critical | GITE-997 | Ready | 2 |
| GITE-999 | Finalize PR | System/Finalization | Critical | GITE-998 | Ready | 2 |

---

## Dependency Graph

```
GITE-001 (Backend - keine Abhaengigkeiten)
    |
    +---> GITE-002 (Commit-Dialog Erweiterungen)
    |         |
    |         +---> GITE-004 (Commit & Push Workflow)
    |                   |
    +---> GITE-003 (PR-Badge)  |
                        |
                   GITE-997 (Code Review) [nach GITE-004]
                        |
                   GITE-998 (Integration Validation)
                        |
                   GITE-999 (Finalize PR)
```

---

## Execution Plan

### Phase 1: Backend (Sequential)
1. **GITE-001**: Git Backend Erweiterung (Revert, Delete, PR-Info)

### Phase 2: Frontend (Parallel nach Phase 1)
2. **GITE-002**: Datei-Aktionen im Commit-Dialog (depends on GITE-001)
3. **GITE-003**: PR-Anzeige in Status-Leiste (depends on GITE-001)

### Phase 3: Frontend (Sequential nach Phase 2)
4. **GITE-004**: Commit & Push Workflow (depends on GITE-002)

### Phase 4: System Stories (Sequential)
5. **GITE-997**: Code Review (depends on GITE-004)
6. **GITE-998**: Integration Validation (depends on GITE-997)
7. **GITE-999**: Finalize PR (depends on GITE-998)

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-git-backend-erweiterung.md`
- `stories/story-002-datei-aktionen-commit-dialog.md`
- `stories/story-003-pr-anzeige-status-leiste.md`
- `stories/story-004-commit-and-push-workflow.md`
- `stories/story-997-code-review.md`
- `stories/story-998-integration-validation.md`
- `stories/story-999-finalize-pr.md`

---

## Blocked Stories

Keine blockierten Stories - alle DoR sind vollstaendig.
