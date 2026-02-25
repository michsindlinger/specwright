# Story Index

> Spec: Dev-Team Visualization
> Created: 2026-02-25
> Last Updated: 2026-02-25

## Overview

This document provides an overview of all user stories for the Dev-Team Visualization specification.

**Total Stories**: 8 (5 reguläre + 3 System)
**Estimated Effort**: ~13 SP

---

## Story Summary

| Story ID | Title | Type | Priority | Dependencies | Status | Points |
|----------|-------|------|----------|--------------|--------|--------|
| TEAM-001 | Backend Skills-API-Endpunkt | Backend | High | None | Ready | 3 |
| TEAM-002 | Navigation & Routing | Frontend | High | None | Ready | 1 |
| TEAM-003 | Team View + Team Card Komponenten | Frontend | High | TEAM-001, TEAM-002 | Ready | 3 |
| TEAM-004 | Team Detail Modal | Frontend | Medium | TEAM-003 | Ready | 3 |
| TEAM-005 | Integration und Testing | Test | Medium | TEAM-001..004 | Ready | 3 |
| TEAM-997 | Code Review | System/Review | High | Alle regulären | Ready | - |
| TEAM-998 | Integration Validation | System/Integration | High | TEAM-997 | Ready | - |
| TEAM-999 | Finalize PR | System/Finalization | High | TEAM-998 | Ready | - |

---

## Dependency Graph

```
TEAM-001 (Backend API) ──────────────┐
                                     ├──> TEAM-003 (Team View + Card)
TEAM-002 (Navigation & Routing) ─────┘         │
                                                ↓
                                      TEAM-004 (Detail Modal)
                                                │
                                                ↓
                                      TEAM-005 (Integration & Tests)
                                                │
                                                ↓
                                      TEAM-997 (Code Review)
                                                │
                                                ↓
                                      TEAM-998 (Integration Validation)
                                                │
                                                ↓
                                      TEAM-999 (Finalize PR)
```

---

## Execution Plan

### Parallel Execution (No Dependencies)
- TEAM-001: Backend Skills-API-Endpunkt
- TEAM-002: Navigation & Routing

### Sequential Execution (Has Dependencies)
1. TEAM-003: Team View + Team Card (depends on TEAM-001, TEAM-002)
2. TEAM-004: Team Detail Modal (depends on TEAM-003)
3. TEAM-005: Integration und Testing (depends on TEAM-001..004)

### System Stories (After All Regular Stories)
1. TEAM-997: Code Review (depends on all regular stories)
2. TEAM-998: Integration Validation (depends on TEAM-997)
3. TEAM-999: Finalize PR (depends on TEAM-998)

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-backend-skills-api.md`
- `stories/story-002-navigation-routing.md`
- `stories/story-003-team-view-cards.md`
- `stories/story-004-team-detail-modal.md`
- `stories/story-005-integration-testing.md`
- `stories/story-997-code-review.md`
- `stories/story-998-integration-validation.md`
- `stories/story-999-finalize-pr.md`

---

## Blocked Stories

Keine blockierten Stories.
