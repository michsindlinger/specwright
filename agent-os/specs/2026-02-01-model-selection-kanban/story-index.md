# Story Index: Model Selection for Kanban Board

> Spec: 2026-02-01-model-selection-kanban
> Created: 2026-02-01
> Updated: 2026-02-02
> Status: Ready for Execution

## Overview

**Total Stories:** 7 (4 Feature + 3 System)
**Estimated Effort:** 6h (AI-adjusted) | 18h (Human-only)

---

## Stories Overview

| ID | Title | Type | Priority | Effort | Dependencies | Status |
|----|-------|------|----------|--------|--------------|--------|
| MSK-001 | Model Dropdown Component | Frontend | High | S | - | ✅ Ready |
| MSK-002 | Kanban Markdown Model Column | Backend | High | S | - | ✅ Ready |
| MSK-003 | Workflow Executor Model Integration | Backend | High | S | MSK-002 | ✅ Ready |
| MSK-004 | Integration Testing | Full-stack | Medium | XS | MSK-001, MSK-002, MSK-003 | ✅ Ready |
| MSK-997 | Code Review | System/Review | High | XS | MSK-001, MSK-002, MSK-003, MSK-004 | ✅ Ready |
| MSK-998 | Integration Validation | System/Integration | High | XS | MSK-997 | ✅ Ready |
| MSK-999 | Finalize PR | System/Finalization | High | XS | MSK-998 | ✅ Ready |

---

## Dependency Graph

```
MSK-001 (Frontend) ─────────────────┐
                                    │
MSK-002 (Backend) ──▶ MSK-003 ──────┼──▶ MSK-004 (Integration Test)
                                    │           │
                                    └───────────┘
                                                │
                                                ▼
                                    MSK-997 (Code Review)
                                                │
                                                ▼
                                    MSK-998 (Integration Validation)
                                                │
                                                ▼
                                    MSK-999 (Finalize PR)
```

---

## Execution Order (Recommended)

### Phase 1: Parallel (No Dependencies)
- **MSK-001:** Model Dropdown Component (Frontend)
- **MSK-002:** Kanban Markdown Model Column (Backend)

### Phase 2: Sequential (Has Dependencies)
1. **MSK-003:** Workflow Executor Model Integration (depends on MSK-002)
2. **MSK-004:** Integration Testing (depends on MSK-001, MSK-002, MSK-003)

### Phase 3: System Stories (Sequential)
1. **MSK-997:** Code Review (depends on all feature stories)
2. **MSK-998:** Integration Validation (depends on MSK-997)
3. **MSK-999:** Finalize PR (depends on MSK-998)

---

## Story Files

### Feature Stories
- [MSK-001: Model Dropdown Component](./stories/story-001-model-dropdown-component.md)
- [MSK-002: Kanban Markdown Model Column](./stories/story-002-kanban-markdown-model-column.md)
- [MSK-003: Workflow Executor Model Integration](./stories/story-003-workflow-executor-model-integration.md)
- [MSK-004: Integration Testing](./stories/story-004-integration-testing.md)

### System Stories
- [MSK-997: Code Review](./stories/story-997-code-review.md)
- [MSK-998: Integration Validation](./stories/story-998-integration-validation.md)
- [MSK-999: Finalize PR](./stories/story-999-finalize-pr.md)

---

## Blocked Stories

*No blocked stories - all stories have complete DoR and are ready for execution.*

---

## Related Spec: Chat-Model-Selection

> Diese Spec nutzt Komponenten aus der bereits implementierten `2026-02-02-chat-model-selection`:

| Wiederverwendbar | Komponente | Nutzen |
|-----------------|------------|--------|
| ✅ | `model-config.ts` | Provider/Model-Definitionen |
| ✅ | `model-config.json` | Model-Liste und CLI-Flags |

Details: [Implementation Plan](./implementation-plan.md)

---

*Updated: 2026-02-02 - System Stories hinzugefügt (v3.0)*
