# Story Index - Kanban Story Execution

**Spec:** 2026-01-31-kanban-story-execution
**Created:** 2026-01-31
**Status:** Technically Refined - Ready for Execution

## Story Summary

| ID | Title | Type | Priority | Effort | Status | Dependencies | DoR |
|----|-------|------|----------|--------|--------|--------------|-----|
| KSE-001 | Drag & Drop Infrastruktur | Frontend | High | S | Ready | None | Complete |
| KSE-002 | Pre-Drag Validation | Frontend | High | S | Ready | KSE-001 | Complete |
| KSE-003 | Execute-Tasks Trigger | Full-Stack | High | M | Ready | KSE-001, KSE-002 | Complete |
| KSE-004 | Working Indicator | Frontend | Medium | S | Ready | KSE-003 | Complete |
| KSE-005 | Git Strategy Auswahl | Full-Stack | Medium | M | Ready | KSE-003 | Complete |
| KSE-999 | Integration & Validation | Test | Medium | S | Blocked | KSE-001, KSE-002, KSE-003, KSE-004, KSE-005 | Partial |

## Dependency Graph

```
KSE-001 (Drag & Drop Infrastruktur)
    ↓
KSE-002 (Pre-Drag Validation)
    ↓
KSE-003 (Execute-Tasks Trigger)
    ↓
    ├── KSE-004 (Working Indicator)
    │
    └── KSE-005 (Git Strategy Auswahl)
            ↓
        KSE-999 (Integration & Validation)
```

## Execution Plan

**Phase 1 (Parallel möglich):**
- KSE-001: Drag & Drop Infrastruktur

**Phase 2 (Nach Phase 1):**
- KSE-002: Pre-Drag Validation

**Phase 3 (Nach Phase 2):**
- KSE-003: Execute-Tasks Trigger

**Phase 4 (Parallel möglich):**
- KSE-004: Working Indicator
- KSE-005: Git Strategy Auswahl

**Phase 5 (Nach Phase 4):**
- KSE-999: Integration & Validation

## Total Estimated Effort

| Effort | Count | Hours (Human) |
|--------|-------|---------------|
| S | 4 | 4-8h each |
| M | 2 | 8-16h each |
| **Total** | 6 | ~40-64h |

## Story Files

- `stories/story-001-drag-drop-infrastructure.md`
- `stories/story-002-pre-drag-validation.md`
- `stories/story-003-execute-tasks-trigger.md`
- `stories/story-004-working-indicator.md`
- `stories/story-005-git-strategy-selection.md`
- `stories/story-999-integration-validation.md`

## Blocked Stories

| Story | Blocked By | Reason |
|-------|------------|--------|
| KSE-999 | KSE-001, KSE-002, KSE-003, KSE-004, KSE-005 | Integration Story - wartet auf alle anderen |

---

## Technical Refinement Summary

All stories have been technically refined with:
- **WAS**: Specific components and features to create/modify
- **WIE**: Architecture guidance and patterns to follow
- **WO**: Exact file paths for implementation
- **Technische Verifikation**: FILE_EXISTS, CONTAINS, LINT_PASS checks
- **Completion Check**: Bash commands to verify implementation

### Key Architecture Patterns
- **HTML5 Drag & Drop API** (native, no library)
- **Lit Web Components** with Light DOM (createRenderRoot returns this)
- **WebSocket Message Protocol** following existing patterns in websocket.ts
- **Gateway Event Pattern** for frontend-backend communication
- **CSS Custom Properties** for theming

### Assigned DevTeam Agents
| Story | Agent |
|-------|-------|
| KSE-001 | dev-team__frontend-developer |
| KSE-002 | dev-team__frontend-developer |
| KSE-003 | dev-team__frontend-developer, dev-team__backend-developer |
| KSE-004 | dev-team__frontend-developer |
| KSE-999 | dev-team__frontend-developer (self-validation) |

---

*Updated: 2026-01-31 (Story KSE-005 hinzugefügt)*
