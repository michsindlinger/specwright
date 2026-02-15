# Story Index

> Spec: Multi-Session Chat
> Created: 2026-01-30
> Last Updated: 2026-01-30
> Refined: 2026-01-30 (Architect)

## Overview

This document provides an overview of all user stories for the Multi-Session Chat specification.

**Total Stories**: 7
**Estimated Effort**: ~28h (Human), ~11h (with AI)
**Status**: All stories technically refined and READY for implementation

---

## Story Summary

| Story ID | Title | Type | Priority | Dependencies | Status | Complexity | WER |
|----------|-------|------|----------|--------------|--------|------------|-----|
| MSC-002 | Session Types & Contracts | Shared | High | None | **Ready** | XS | backend-developer |
| MSC-001 | Session Tab Bar Component | Frontend | High | MSC-002 | **Ready** | S | frontend-developer |
| MSC-003 | Session Persistence Service | Backend | High | MSC-002 | **Ready** | S | backend-developer |
| MSC-004 | Session State Management | Frontend | High | MSC-002, MSC-003 | **Ready** | S | frontend-developer |
| MSC-005 | WebSocket Multi-Session Routing | Full-Stack | High | MSC-002, MSC-003, MSC-004 | **Ready** | S | backend-developer |
| MSC-006 | Session Archive Feature | Full-Stack | Medium | MSC-001, MSC-003, MSC-004 | **Ready** | S | frontend-developer |
| MSC-999 | Integration & End-to-End Validation | Test | High | All | **Ready** | S | qa-specialist |

---

## Dependency Graph

```
MSC-002 (Session Types - No dependencies)
    ↓
┌───┴───┬───────────┐
↓       ↓           ↓
MSC-001 MSC-003     │
(Tab UI) (Persist)  │
    │       │       │
    │       └───┬───┘
    │           ↓
    │       MSC-004
    │    (State Mgmt)
    │           │
    ├───────────┼───────────┐
    │           ↓           │
    │       MSC-005         │
    │    (WS Routing)       │
    │           │           │
    └───────────┼───────────┘
                ↓
            MSC-006
          (Archive)
                ↓
            MSC-999
         (Integration)
```

---

## Execution Plan

### Phase 1: Foundation (Parallel)
- **MSC-002**: Session Types & Contracts (No dependencies - START HERE)

### Phase 2: Core Services (Parallel after MSC-002)
- **MSC-001**: Session Tab Bar Component (depends on MSC-002)
- **MSC-003**: Session Persistence Service (depends on MSC-002)

### Phase 3: State & Integration (After Phase 2)
- **MSC-004**: Session State Management (depends on MSC-002, MSC-003)

### Phase 4: Communication (After Phase 3)
- **MSC-005**: WebSocket Multi-Session Routing (depends on MSC-002, MSC-003, MSC-004)

### Phase 5: Features (After Phase 4)
- **MSC-006**: Session Archive Feature (depends on MSC-001, MSC-003, MSC-004)

### Phase 6: Validation (LAST)
- **MSC-999**: Integration & End-to-End Validation (depends on ALL)

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-session-tab-bar-component.md`
- `stories/story-002-session-types-contracts.md`
- `stories/story-003-session-persistence-service.md`
- `stories/story-004-session-state-management.md`
- `stories/story-005-websocket-multi-session-routing.md`
- `stories/story-006-session-archive-feature.md`
- `stories/story-999-integration-validation.md`

---

## Blocked Stories

> **All stories are now READY for implementation.**
> Technical refinement completed on 2026-01-30.

---

## Key Files to Create/Modify

| Story | New Files | Modified Files |
|-------|-----------|----------------|
| MSC-002 | `ui/src/types/session.types.ts`, `ui/src/types/index.ts` | - |
| MSC-001 | `ui/src/components/session-tabs.ts`, `ui/src/components/session-tab.ts` | `ui/src/views/chat-view.ts` |
| MSC-003 | `src/server/session.service.ts` | - |
| MSC-004 | `ui/src/stores/session.store.ts` | `ui/src/gateway.ts`, `ui/src/views/chat-view.ts` |
| MSC-005 | - | `src/server/websocket.ts`, `src/server/claude-handler.ts`, `ui/src/gateway.ts` |
| MSC-006 | `ui/src/components/session-archive.ts` | `ui/src/components/session-tabs.ts`, `src/server/websocket.ts` |
| MSC-999 | `tests/integration/multi-session.test.ts` | - |

---

## Notes

- **MSC-002 (Types)** should be completed first as it defines the data contracts
- **MSC-001 (Tab UI)** and **MSC-003 (Persistence)** can run in parallel after Types
- **MSC-005 (WebSocket)** is Full-Stack and requires coordination between frontend and backend developers
- **MSC-999 (Integration)** must be executed LAST to validate the complete feature
- All stories are sized as S or XS to fit within single Claude Code sessions
- All file paths are relative to `agent-os-ui/`
