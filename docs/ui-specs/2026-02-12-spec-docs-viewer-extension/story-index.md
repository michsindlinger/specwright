# Story Index

> Spec: Spec Docs Viewer Extension
> Created: 2026-02-12
> Last Updated: 2026-02-12 (Architect Refinement complete)

## Overview

This document provides an overview of all user stories for the Spec Docs Viewer Extension specification.

**Total Stories**: 7 (4 regular + 3 system)
**Estimated Effort**: 9 SP (regular only)

---

## Story Summary

| Story ID | Title | Type | Priority | Dependencies | Status | Points |
|----------|-------|------|----------|--------------|--------|--------|
| SDVE-001 | Backend - Spec-Dateien auflisten und generisch lesen/speichern | Backend | High | None | Ready | 2 |
| SDVE-002 | Frontend - Dynamische Tab-Bar Komponente | Frontend | High | SDVE-001 | Ready | 2 |
| SDVE-003 | Frontend - Kanban Board Integration | Frontend | High | SDVE-001, SDVE-002 | Ready | 3 |
| SDVE-004 | Frontend - Interaktive Checkboxen mit Persistierung | Frontend | Medium | SDVE-003 | Ready | 2 |
| SDVE-997 | Code Review | System/Review | High | SDVE-001..004 | Ready | - |
| SDVE-998 | Integration Validation | System/Integration | High | SDVE-997 | Ready | - |
| SDVE-999 | Finalize PR | System/Finalization | High | SDVE-998 | Ready | - |

---

## Dependency Graph

```
SDVE-001 (No dependencies - Backend Foundation)
    ↓
SDVE-002 (Depends on SDVE-001 - Tab Component)
    ↓
SDVE-003 (Depends on SDVE-001, SDVE-002 - Integration)
    ↓
SDVE-004 (Depends on SDVE-003 - Checkboxes)
    ↓
SDVE-997 (Depends on all regular stories - Code Review)
    ↓
SDVE-998 (Depends on SDVE-997 - Integration Validation)
    ↓
SDVE-999 (Depends on SDVE-998 - Finalize PR)
```

---

## Execution Plan

### Phase 1: Backend Foundation
- SDVE-001: Backend - Spec-Dateien auflisten und generisch lesen/speichern

### Phase 2: Frontend Components
- SDVE-002: Frontend - Dynamische Tab-Bar Komponente (depends on SDVE-001)

### Phase 3: Integration
- SDVE-003: Frontend - Kanban Board Integration (depends on SDVE-001, SDVE-002)

### Phase 4: Checkbox Feature
- SDVE-004: Frontend - Interaktive Checkboxen mit Persistierung (depends on SDVE-003)

### Phase 5: System Stories (Sequential)
1. SDVE-997: Code Review (depends on all regular stories)
2. SDVE-998: Integration Validation (depends on SDVE-997)
3. SDVE-999: Finalize PR (depends on SDVE-998)

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-backend-file-discovery-and-generalized-read-save.md`
- `stories/story-002-dynamic-tab-bar-component.md`
- `stories/story-003-kanban-board-integration.md`
- `stories/story-004-interactive-checkboxes.md`
- `stories/story-997-code-review.md`
- `stories/story-998-integration-validation.md`
- `stories/story-999-finalize-pr.md`

---

## Architect Refinement Status

All 4 regular stories have been technically refined with:
- DoR checkboxes marked complete (all [x])
- DoD items defined (all [ ] for implementing agent)
- Integration Type, betroffene Komponenten, and kritische Integration Points documented
- WAS/WIE/WO/WER filled with actual file paths and architecture guidance
- Completion Check commands with actual bash verify commands
- Reusable Artifacts identified

**Integration Story (SDVE-003)** has additional Integration-DoD items:
- `kanban-board.ts -> aos-spec-file-tabs (Rendering)`
- `kanban-board.ts -> Gateway (specs.files, specs.read mit relativePath)`

**WER Assignment:** All stories assigned to `codebase-analyzer` agent.

---

## Blocked Stories

No stories are currently blocked.
