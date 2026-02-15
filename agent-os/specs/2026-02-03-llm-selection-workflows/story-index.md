# Story Index - LLM Model Selection for Workflows

**Spec ID:** LLM
**Created:** 2026-02-03
**Completed:** 2026-02-04
**Status:** Completed  

---

## Story Summary Table

### Implementation Stories (Phase 1-4)

| Story ID | Title | Component | Files | Complexity | Status |
|----------|-------|-----------|-------|------------|--------|
| LLM-001 | Backend Integration | types.ts, websocket.ts, workflow-executor.ts | 3 files | Low | Done |
| LLM-002 | Workflow Card Model Selection | workflow-card.ts, workflow-view.ts | 2 files | Medium | Done |
| LLM-003 | Create Spec Modal Model Selection | aos-create-spec-modal.ts | 1 file | Medium | Done |
| LLM-004 | Context Menu Model Selection | (reuses LLM-003) | 0 files | Low | Done |

### System Stories (Phase 5)

| Story ID | Title | Type | Complexity | Status |
|----------|-------|------|------------|--------|
| LLM-997 | Documentation & Handover | System | Low | Done |
| LLM-998 | Testing & Quality Assurance | System | Medium | Done |
| LLM-999 | Spec Completion & Cleanup | System | Low | Done |

**Total Stories:** 7 (4 Implementation + 3 System)
**Total Files:** ~6 files (LLM-004 reuses LLM-003)
**Estimated LOC:** ~80-100 lines  

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM-001: Backend                          │
│                  (MUST BE FIRST)                             │
│  types.ts, websocket.ts, workflow-executor.ts                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────┐
        │     Parallel Development (Phase 2-3)   │
        └───────────────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
    ┌──────────────┐         ┌──────────────┐
    │   LLM-002    │         │   LLM-003    │
    │  Workflow    │         │  Create Spec │
    │  Dashboard   │         │  Modal       │
    │  (workflow-  │         │  (aos-create- │
    │   card.ts)   │         │   spec-modal) │
    └──────────────┘         └───────┬──────┘
        │                        │
        └────────────┬───────────┘
                     ▼
            ┌──────────────┐
            │   LLM-004    │
            │  Context     │
            │  Menu        │
            │  (reuses     │
            │  LLM-003)    │
            └──────────────┘
                     │
                     ▼
          ┌────────────────────┐
          │   Feature Complete │
          └────────────────────┘
```

**Note:** LLM-004 is primarily a documentation/testing story since `aos-create-spec-modal` is already reused for all context menu actions.

---

## Execution Plan

### Sprint 1: Backend Foundation
**Story:** LLM-001 - Backend Integration  
**Duration:** 1-2 days  
**Deliverable:** Model parameter accepted by backend, CLI uses dynamic model

### Sprint 2-3: Frontend Integration (Parallel)
**Stories:** LLM-002, LLM-003 (LLM-004 is documentation/testing only)
**Duration:** 2-3 days
**Deliverable:** All three trigger points have model selection

### Sprint 4: Quality & Completion
**Stories:** LLM-997, LLM-998, LLM-999
**Duration:** 2-3 days
**Deliverable:** Documentation, testing, spec completion

**Total Estimated Duration:** 7-10 business days

---

## Component Mapping

| Trigger Point | Component Type | Component | Pattern | File |
|---------------|----------------|-----------|---------|------|
| Workflows Dashboard | Card | `aos-workflow-card` | Native `<select>` | `workflow-card.ts` |
| Specs Dashboard | Modal | `aos-create-spec-modal` | `aos-model-selector` | `aos-create-spec-modal.ts` |
| Context Menu | Modal | `aos-create-spec-modal` (reused) | `aos-model-selector` | `aos-create-spec-modal.ts` |

**Important:** `aos-create-spec-modal` is the universal modal component used for both Specs Dashboard and all Context Menu actions.

---

## Testing Strategy

**End-to-End Flows:**
1. Workflow Dashboard: Select model → Start → Verify CLI command
2. Context Menu: Right-click → Select action → Select model → Start → Verify
3. Specs Dashboard: Create Spec → Select model → Start → Verify

**Acceptance Criteria:**
- Default model (opus) used when no selection
- Model dropdown disabled during execution
- All three trigger points functional
- Backward compatibility maintained

---

*See individual story files in stories/ directory for detailed Gherkin scenarios.*
