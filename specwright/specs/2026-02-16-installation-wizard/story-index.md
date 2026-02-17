# Story Index

> Spec: Installation Wizard
> Created: 2026-02-16
> Last Updated: 2026-02-17 (install.sh Synergy Update)

## Overview

This document provides an overview of all user stories for the Installation Wizard specification.

**Total Stories**: 9 (6 regular + 3 system)
**Estimated Effort**: ~29 SP (Updated: IW-002 von S auf M wegen zweistufiger Wizard-Logik)

---

## Story Summary

| Story ID | Title | Type | Priority | Dependencies | Status | Points |
|----------|-------|------|----------|--------------|--------|--------|
| IW-001 | Specwright- und Product-Brief-Erkennung beim Projekt-Hinzufuegen | Backend | High | None | Ready | 3 |
| IW-002 | Installation Wizard Modal (Zweistufig: install.sh + Planning) | Frontend | High | IW-001 | Ready | 5 |
| IW-003 | Terminal-Integration im Wizard (install.sh + Planning-Commands) | Frontend | High | IW-002 | Ready | 3 |
| IW-004 | Wizard Abbruch-Handling | Frontend | Medium | IW-002 | Ready | 2 |
| IW-005 | Getting Started View (Kontextabhaengig) | Frontend | High | IW-001 | Ready | 3 |
| IW-006 | Router & Navigation Integration | Frontend | High | IW-001, IW-002, IW-003, IW-004, IW-005 | Ready | 3 |
| IW-997 | Code Review | System/Review | High | Alle regulaeren Stories | Ready | 3 |
| IW-998 | Integration Validation | System/Integration | High | IW-997 | Ready | 3 |
| IW-999 | Finalize PR | System/Finalization | High | IW-998 | Ready | 3 |

---

## Dependency Graph

```
IW-001 (No dependencies)
    |
    ├──────────────────────────────────────────┐
    v                                          v
IW-002 (Depends on IW-001)              IW-005 (Depends on IW-001)
    |                                          |
    ├──> IW-003 (Depends on IW-002)           |
    |       |                                  |
    ├──> IW-004 (Depends on IW-002)           |
    |       |                                  |
    v       v                                  v
                                    IW-006 (Depends on IW-001..IW-005)
                                               |
                                               v
                                    IW-997 (Alle regulaeren Stories)
                                               |
                                               v
                                    IW-998 (Depends on IW-997)
                                               |
                                               v
                                    IW-999 (Depends on IW-998)
```

---

## Execution Plan

### Phase 1: Backend (No Dependencies)
- IW-001: Specwright- und Product-Brief-Erkennung beim Projekt-Hinzufuegen

### Phase 2: Parallel Execution (Depends on Phase 1)
- IW-002: Installation Wizard Modal (depends on IW-001)
- IW-005: Getting Started View (depends on IW-001 fuer hasProductBrief)

### Phase 3: Parallel Execution (Depends on Phase 2)
- IW-003: Terminal-Integration im Wizard (depends on IW-002)
- IW-004: Wizard Abbruch-Handling (depends on IW-002)

### Phase 4: Integration (Depends on All Previous)
- IW-006: Router & Navigation Integration (depends on IW-001..IW-005)

### Phase 5: System Stories (After All Regular Stories)
1. IW-997: Code Review (depends on all regular stories)
2. IW-998: Integration Validation (depends on IW-997)
3. IW-999: Finalize PR (depends on IW-998)

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-specwright-erkennung.md`
- `stories/story-002-installation-wizard-modal.md`
- `stories/story-003-terminal-integration.md`
- `stories/story-004-wizard-abbruch-handling.md`
- `stories/story-005-getting-started-view.md`
- `stories/story-006-router-navigation-integration.md`
- `stories/story-997-code-review.md`
- `stories/story-998-integration-validation.md`
- `stories/story-999-finalize-pr.md`

---

## Blocked Stories

Keine blockierten Stories. Alle Stories haben vollstaendiges technisches Refinement und DoR ist validiert.
