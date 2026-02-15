# Story Index: Workflow Multi-Question Protocol

> **Spec:** MQP
> **Created:** 2026-01-30
> **Total Stories:** 6

## Story Summary

| ID | Title | Type | Complexity | Status | Dependencies |
|----|-------|------|------------|--------|--------------|
| MQP-001 | Backend Question Collection | Backend | S | Ready | None |
| MQP-002 | Backend Batch Detection & Sending | Backend | S | Ready | MQP-001 |
| MQP-003 | Backend Text Suppression | Backend | XS | Ready | MQP-001 |
| MQP-004 | Frontend Multi-Tab Question Component | Frontend | M | Ready | None |
| MQP-005 | Frontend Integration | Frontend | S | Ready | MQP-004 |
| MQP-999 | Integration & End-to-End Validation | Test | S | Ready | MQP-001, MQP-002, MQP-003, MQP-004, MQP-005 |

## Dependency Graph

```
MQP-001 (Backend Collection)
    ├── MQP-002 (Batch Detection)
    └── MQP-003 (Text Suppression)

MQP-004 (Frontend Component)
    └── MQP-005 (Frontend Integration)

        ↓ ALL
MQP-999 (Integration Validation)
```

## Execution Plan

### Phase 1: Backend (Parallel)
- MQP-001: Backend Question Collection
- MQP-004: Frontend Multi-Tab Question Component

### Phase 2: Backend Extensions (Sequential after MQP-001)
- MQP-002: Backend Batch Detection & Sending (after MQP-001)
- MQP-003: Backend Text Suppression (after MQP-001)

### Phase 3: Frontend Integration (Sequential after MQP-004)
- MQP-005: Frontend Integration (after MQP-004)

### Phase 4: Validation (Sequential after all)
- MQP-999: Integration & End-to-End Validation (after all)

## Story Files

- [stories/story-001-backend-question-collection.md](stories/story-001-backend-question-collection.md)
- [stories/story-002-backend-batch-detection.md](stories/story-002-backend-batch-detection.md)
- [stories/story-003-backend-text-suppression.md](stories/story-003-backend-text-suppression.md)
- [stories/story-004-frontend-multi-tab-component.md](stories/story-004-frontend-multi-tab-component.md)
- [stories/story-005-frontend-integration.md](stories/story-005-frontend-integration.md)
- [stories/story-999-integration-validation.md](stories/story-999-integration-validation.md)

## Blocked Stories

Keine blockierten Stories.

## Total Estimated Effort

| Metric | Value |
|--------|-------|
| Total Complexity Points | S+S+XS+M+S+S = ~M-L |
| Estimated Human Hours | ~16-24h |
| Estimated AI-Adjusted Hours | ~6-10h |

---

*Created with Agent OS /create-spec v2.7*
