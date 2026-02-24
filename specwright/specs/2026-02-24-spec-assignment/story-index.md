# Story Index

> Spec: Spec Assignment for External Bot
> Created: 2026-02-24
> Last Updated: 2026-02-24

## Overview

This document provides an overview of all user stories for the Spec Assignment for External Bot specification.

**Total Stories**: 8 (5 regular + 3 system)
**Estimated Effort**: 12 SP + 3S
**All DoR**: Complete

---

## Story Summary

| Story ID | Title | Type | Priority | Complexity | Dependencies | Status | Points |
|----------|-------|------|----------|------------|--------------|--------|--------|
| ASGN-001 | Backend Data Layer (kanban.json + SpecsReader) | Backend | High | S | None | Ready | 3 |
| ASGN-002 | Backend WebSocket Handler | Backend | High | XS | ASGN-001 | Ready | 2 |
| ASGN-003 | Frontend Assignment in Spec-Übersicht | Frontend | High | S | ASGN-002 | Ready | 3 |
| ASGN-004 | Frontend Assignment in Kanban View | Frontend | Medium | S | ASGN-002 | Ready | 2 |
| ASGN-005 | Slash-Command /assign-spec | DevOps | Medium | XS | None | Ready | 2 |
| ASGN-997 | Code Review | System/Review | High | S | ASGN-001..005 | Ready | S |
| ASGN-998 | Integration Validation | System/Integration | High | S | ASGN-997 | Ready | S |
| ASGN-999 | Finalize PR | System/Finalization | High | S | ASGN-998 | Ready | S |

---

## Files Touched Per Story

| Story ID | Files Modified |
|----------|----------------|
| ASGN-001 | `ui/src/server/specs-reader.ts`, `specwright/scripts/mcp/kanban-mcp-server.ts` |
| ASGN-002 | `ui/src/server/websocket.ts` |
| ASGN-003 | `ui/frontend/src/components/spec-card.ts`, `ui/frontend/src/views/dashboard-view.ts` |
| ASGN-004 | `ui/frontend/src/components/kanban-board.ts`, `ui/frontend/src/views/dashboard-view.ts` |
| ASGN-005 | `.claude/commands/specwright/assign-spec.md` (new) |

---

## Dependency Graph

```
ASGN-001 (No dependencies)       ASGN-005 (No dependencies)
    |                                 |
    v                                 |
ASGN-002 (Depends on ASGN-001)       |
    |         |                       |
    v         v                       |
ASGN-003     ASGN-004                |
    |         |                       |
    v         v                       v
ASGN-997 (Depends on ALL regular stories)
    |
    v
ASGN-998 (Depends on ASGN-997)
    |
    v
ASGN-999 (Depends on ASGN-998)
```

---

## Execution Plan

### Phase 1: Foundation (Parallel Start)
- ASGN-001: Backend Data Layer (kanban.json + SpecsReader) — **S, 3 SP**
- ASGN-005: Slash-Command /assign-spec (independent) — **XS, 2 SP**

### Phase 2: WebSocket Integration (Sequential)
1. ASGN-002: Backend WebSocket Handler (depends on ASGN-001) — **XS, 2 SP**

### Phase 3: Frontend (Parallel)
- ASGN-003: Frontend Assignment in Spec-Übersicht (depends on ASGN-002) — **S, 3 SP**
- ASGN-004: Frontend Assignment in Kanban View (depends on ASGN-002) — **S, 2 SP**

### Phase 4: System Stories (Sequential)
1. ASGN-997: Code Review (depends on ALL regular stories)
2. ASGN-998: Integration Validation (depends on ASGN-997)
3. ASGN-999: Finalize PR (depends on ASGN-998)

---

## Shared File: dashboard-view.ts

**Note:** Both ASGN-003 and ASGN-004 modify `dashboard-view.ts`. ASGN-003 adds the core WS listeners (`specs.assign.ack`, `specs.assign.error`) and spec-card event handling. ASGN-004 adds kanban-board property bindings and event handling. Since they run in parallel, the second story to execute must account for changes from the first.

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-backend-data-layer.md`
- `stories/story-002-backend-websocket-handler.md`
- `stories/story-003-frontend-spec-overview.md`
- `stories/story-004-frontend-kanban-view.md`
- `stories/story-005-slash-command.md`
- `stories/story-997-code-review.md`
- `stories/story-998-integration-validation.md`
- `stories/story-999-finalize-pr.md`

---

## Blocked Stories

No blocked stories - all stories have complete DoR.
