# Story Index

> Spec: Quick-To-Do
> Created: 2026-02-13
> Last Updated: 2026-02-13

## Overview

This document provides an overview of all user stories for the Quick-To-Do specification.

**Total Stories**: 7 (4 Feature + 3 System)
**Estimated Effort**: 14 SP

---

## Story Summary

| Story ID | Title | Type | Priority | Dependencies | Status | Points |
|----------|-------|------|----------|--------------|--------|--------|
| QTD-001 | Kontextmenü-Integration + Modal-Shell | Frontend | High | None | Ready | 3 |
| QTD-002 | Bild-Upload im Quick-To-Do Modal | Frontend | High | QTD-001 | Ready | 3 |
| QTD-003 | Backend REST-API + Storage Service | Backend | High | None | Ready | 3 |
| QTD-004 | End-to-End Integration + UX-Polish | Frontend | High | QTD-001, QTD-002, QTD-003 | Ready | 2 |
| QTD-997 | Code Review | System/Review | High | QTD-001..QTD-004 | Ready | 1 |
| QTD-998 | Integration Validation | System/Integration | High | QTD-997 | Ready | 1 |
| QTD-999 | Finalize PR | System/Finalization | High | QTD-998 | Ready | 1 |

---

## Dependency Graph

```
QTD-001 (Kontextmenü + Modal) ───┐
                                 ├──→ QTD-002 (Bilder) ──┐
QTD-003 (Backend API) ──────────────────────────────────  ├──→ QTD-004 (Integration)
                                                          │         │
                                                          └─────────┘
                                                                    │
                                                              QTD-997 (Code Review)
                                                                    │
                                                              QTD-998 (Integration Validation)
                                                                    │
                                                              QTD-999 (Finalize PR)
```

---

## Execution Plan

### Phase 1 - Parallel Foundation
- QTD-001: Kontextmenü-Integration + Modal-Shell (Frontend)
- QTD-003: Backend REST-API + Storage Service (Backend) [parallel]

### Phase 2 - Image Upload (Sequential)
- QTD-002: Bild-Upload im Quick-To-Do Modal (depends on QTD-001)

### Phase 3 - Integration (Sequential)
- QTD-004: End-to-End Integration + UX-Polish (depends on QTD-001, QTD-002, QTD-003)

### Phase 4 - System Stories (Sequential)
- QTD-997: Code Review (depends on all feature stories)
- QTD-998: Integration Validation (depends on QTD-997)
- QTD-999: Finalize PR (depends on QTD-998)

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-kontextmenu-integration-modal-shell.md`
- `stories/story-002-bild-upload-im-quick-todo.md`
- `stories/story-003-backend-rest-api-storage-service.md`
- `stories/story-004-end-to-end-integration-ux-polish.md`
- `stories/story-997-code-review.md`
- `stories/story-998-integration-validation.md`
- `stories/story-999-finalize-pr.md`

---

## Blocked Stories

Keine blockierten Stories. Alle DoR-Checkboxen sind ausgefüllt.
