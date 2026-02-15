# Story Index

> Spec: multi-project-support
> Created: 2026-01-30
> Last Updated: 2026-02-02
> Workflow Version: v3.1

## Overview

This document provides an overview of all user stories for the Multi-Project Support specification.

**Total Stories**: 10 (7 Feature + 3 System)
**Estimated Effort**: ~5.5 Story Points (XS=0.5, S=1, M=2)
**Completed**: 2 (MPRO-001, MPRO-003)

---

## Story Summary

### Feature Stories

| Story ID | Title | Type | Priority | Dependencies | Status | Complexity |
|----------|-------|------|----------|--------------|--------|------------|
| MPRO-001 | Tab-Navigation Component | Frontend | High | None | ✅ Done | S |
| MPRO-002 | Project Add Modal | Frontend | High | MPRO-001, MPRO-003 | Ready | M |
| MPRO-003 | Recently Opened Service | Frontend | Medium | None | ✅ Done | XS |
| MPRO-004 | Backend Multi-Project Context | Backend | High | None | Ready | S |
| MPRO-005 | WebSocket Multi-Connection | Backend | High | MPRO-004 | Ready | M |
| MPRO-006 | Project Context Switching | Frontend | High | MPRO-001, MPRO-004, MPRO-005 | Ready | M |
| MPRO-007 | Integration & E2E Validation | Test | High | MPRO-001 - MPRO-006 | Ready | M |

### System Stories (v3.0)

| Story ID | Title | Type | Priority | Dependencies | Status | Complexity |
|----------|-------|------|----------|--------------|--------|------------|
| MPRO-997 | Code Review | System/Review | High | All Feature Stories | Ready | S |
| MPRO-998 | Integration Validation | System/Integration | High | MPRO-997 | Ready | S |
| MPRO-999 | Finalize PR | System/Finalization | High | MPRO-998 | Ready | S |

---

## Dependency Graph

```
Phase 1 (Parallel - Foundation):
MPRO-001 (Tab-Navigation) ────────────────────┐
                                               │
MPRO-003 (Recently Opened) ───────────────────┼──→ MPRO-002 (Add Modal)
                                               │
MPRO-004 (Backend Context) ───────────────────┼──→ MPRO-005 (WebSocket) ──┐
                                               │                           │
                                               └───────────────────────────┼──→ MPRO-006 (Context Switching)
                                                                           │
Phase 2 (Integration):                                                     │
                                                                           ↓
                                                           MPRO-007 (Integration E2E)
                                                                           │
Phase 3 (System Stories):                                                  ↓
                                                           MPRO-997 (Code Review)
                                                                           │
                                                                           ↓
                                                           MPRO-998 (Integration Validation)
                                                                           │
                                                                           ↓
                                                           MPRO-999 (Finalize PR)
```

---

## Execution Plan

### Phase 1: Foundation (Parallel Execution - No Dependencies)

Stories die parallel ausgeführt werden können:

- **MPRO-001**: Tab-Navigation Component (Frontend) ✅ Done
- **MPRO-003**: Recently Opened Service (Frontend) ✅ Done
- **MPRO-004**: Backend Multi-Project Context (Backend) 🟡 Ready

### Phase 2: Core Features (Sequential - Has Dependencies)

Nach Phase 1:

1. **MPRO-005**: WebSocket Multi-Connection (depends on MPRO-004)
2. **MPRO-002**: Project Add Modal (depends on MPRO-001, MPRO-003)

### Phase 3: Integration Layer (Sequential)

Nach Phase 2:

3. **MPRO-006**: Project Context Switching (depends on MPRO-001, MPRO-004, MPRO-005)

### Phase 4: Feature Validation

Nach allen Feature Stories:

4. **MPRO-007**: Integration & E2E Validation (depends on all feature stories)

### Phase 5: System Stories (Sequential)

Nach allen regulären Stories:

5. **MPRO-997**: Code Review (Opus reviewt gesamten Feature-Diff)
6. **MPRO-998**: Integration Validation (ersetzt Phase 4.5)
7. **MPRO-999**: Finalize PR (ersetzt Phase 5 - Test-Szenarien, User-Todos, PR, Cleanup)

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

### Feature Stories
- `stories/story-001-tab-navigation-component.md` ✅
- `stories/story-002-project-add-modal.md`
- `stories/story-003-recently-opened-service.md` ✅
- `stories/story-004-backend-multi-project-context.md`
- `stories/story-005-websocket-multi-connection.md`
- `stories/story-006-project-context-switching.md`
- `stories/story-007-integration-e2e-validation.md`

### System Stories (v3.0)
- `stories/story-997-code-review.md`
- `stories/story-998-integration-validation.md`
- `stories/story-999-finalize-pr.md`

---

## Blocked Stories

None - all stories have completed technical refinement and are Ready for implementation.

**Note:** Stories with dependencies must wait for their dependencies to be completed before implementation can begin.

---

## Story Types Distribution

| Type | Count | Stories |
|------|-------|---------|
| Frontend | 4 | MPRO-001, MPRO-002, MPRO-003, MPRO-006 |
| Backend | 2 | MPRO-004, MPRO-005 |
| Test | 1 | MPRO-007 |
| System | 3 | MPRO-997, MPRO-998, MPRO-999 |

---

## Creates Reusable Summary (v3.1)

Stories die wiederverwendbare Artefakte erstellen:

| Story | Artifact | Type | Description |
|-------|----------|------|-------------|
| MPRO-001 | `aos-project-tabs` | UI Component | Tab-Navigation für Multi-Projekt |
| MPRO-002 | `aos-project-add-modal` | UI Component | Modal für Projekt-Auswahl |
| MPRO-003 | `RecentlyOpenedService` | Service | localStorage-basierte Projekt-Historie |
| MPRO-004 | `ProjectContextService` | Service | Backend Multi-Projekt-Context |
| MPRO-005 | `WebSocketManagerService` | Service | Multi-Connection WebSocket-Routing |
| MPRO-006 | `ProjectContext` | Context | Lit Context für aktives Projekt |

Nach Spec-Completion werden diese in `agent-os/knowledge/` dokumentiert.

---

## Notes

- **Integration Type**: Full-stack (Frontend + Backend Stories)
- **Cross-Layer Dependencies**: Ja - Frontend Context Switching hängt von Backend APIs ab
- **System Stories**: v3.0 - Code Review, Integration Validation, Finalize PR
- **Worktree**: `/Users/michaelsindlinger/Entwicklung/agent-os-web-ui-worktrees/multi-project-support`
- **Feature Branch**: `feature/multi-project-support`
