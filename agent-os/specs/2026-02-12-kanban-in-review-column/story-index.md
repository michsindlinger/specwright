# Story Index

> Spec: Kanban In Review Column
> Created: 2026-02-12
> Last Updated: 2026-02-12

## Overview

This document provides an overview of all user stories for the Kanban In Review Column specification.

**Total Stories**: 7 (4 regular + 3 system)
**Estimated Effort**: 4 x S

---

## Story Summary

| Story ID | Title | Type | Priority | Dependencies | Status | Points |
|----------|-------|------|----------|--------------|--------|--------|
| KIRC-001 | Backend Schema: In Review Status Mapping | Backend | Critical | None | Ready | 2 |
| KIRC-002 | MCP Kanban Tool Anpassung | Backend | Critical | KIRC-001 | Ready | 2 |
| KIRC-003 | Frontend Kanban-Board: In Review Spalte | Frontend | High | KIRC-001 | Ready | 2 |
| KIRC-004 | Story-Status-Transitionen für In Review | Frontend | High | KIRC-003 | Ready | 2 |
| KIRC-997 | Code Review | System/Review | High | KIRC-001..004 | Ready | - |
| KIRC-998 | Integration Validation | System/Integration | High | KIRC-997 | Ready | - |
| KIRC-999 | Finalize PR | System/Finalization | High | KIRC-998 | Ready | - |

---

## Dependency Graph

```
KIRC-001 (Backend Schema - No dependencies)
    ├──> KIRC-002 (MCP Tool - depends on KIRC-001)
    └──> KIRC-003 (Frontend UI - depends on KIRC-001)
              └──> KIRC-004 (Status-Transitionen - depends on KIRC-003)

--- System Stories (after all regular stories) ---
KIRC-001..004 ──> KIRC-997 (Code Review)
                      └──> KIRC-998 (Integration Validation)
                                └──> KIRC-999 (Finalize PR)
```

---

## Execution Plan

### Phase 1: Backend Foundation (Sequential)
1. KIRC-001: Backend Schema: In Review Status Mapping

### Phase 2: MCP + Frontend (Parallel - both depend on KIRC-001)
- KIRC-002: MCP Kanban Tool Anpassung
- KIRC-003: Frontend Kanban-Board: In Review Spalte

### Phase 3: Frontend Transitionen (Sequential - depends on KIRC-003)
1. KIRC-004: Story-Status-Transitionen für In Review

### Phase 4: System Stories (Sequential)
1. KIRC-997: Code Review
2. KIRC-998: Integration Validation
3. KIRC-999: Finalize PR

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-backend-schema-in-review-status.md`
- `stories/story-002-mcp-kanban-tool-anpassung.md`
- `stories/story-003-frontend-in-review-spalte.md`
- `stories/story-004-story-status-transitionen.md`
- `stories/story-997-code-review.md`
- `stories/story-998-integration-validation.md`
- `stories/story-999-finalize-pr.md`

---

## Blocked Stories

No stories are currently blocked.
