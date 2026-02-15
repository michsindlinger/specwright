# Story Index

> Spec: Storycard Attachments
> Created: 2026-02-14
> Last Updated: 2026-02-14

## Overview

This document provides an overview of all user stories for the Storycard Attachments specification.

**Total Stories**: 8 (5 regular + 3 system)
**Estimated Effort**: 16 SP

---

## Story Summary

| Story ID | Title | Type | Priority | Dependencies | Status | Points |
|----------|-------|------|----------|--------------|--------|--------|
| SCA-001 | Attachment Protocol & Backend Service | Backend | High | None | Ready | 3 |
| SCA-002 | Frontend Attachment Gateway & Utils | Frontend | High | SCA-001 | Ready | 2 |
| SCA-003 | Attachment Panel Component | Frontend | High | SCA-002 | Ready | 3 |
| SCA-004 | Storycard & Kanban Integration | Frontend | High | SCA-003 | Ready | 3 |
| SCA-005 | Attachment Preview & File Type Support | Frontend | Medium | SCA-003 | Ready | 2 |
| SCA-997 | Code Review | System/Review | High | SCA-001..005 | Ready | 1 |
| SCA-998 | Integration Validation | System/Integration | High | SCA-997 | Ready | 1 |
| SCA-999 | Finalize PR | System/Finalization | High | SCA-998 | Ready | 1 |

---

## Dependency Graph

```
SCA-001 (No dependencies - Foundation)
    |
    v
SCA-002 (Depends on SCA-001)
    |
    v
SCA-003 (Depends on SCA-002)
    |         \
    v          v
SCA-004    SCA-005
(Depends   (Depends
on SCA-003) on SCA-003)
    |         /
    v        v
SCA-997 (Depends on SCA-001..005)
    |
    v
SCA-998 (Depends on SCA-997)
    |
    v
SCA-999 (Depends on SCA-998)
```

---

## Execution Plan

### Phase 1: Foundation (Sequential)
1. **SCA-001**: Attachment Protocol & Backend Service

### Phase 2: Frontend Infrastructure (Sequential)
2. **SCA-002**: Frontend Attachment Gateway & Utils

### Phase 3: UI Components (Sequential)
3. **SCA-003**: Attachment Panel Component

### Phase 4: Integration & Preview (Parallel)
4. **SCA-004**: Storycard & Kanban Integration
5. **SCA-005**: Attachment Preview & File Type Support

### Phase 5: System Stories (Sequential)
6. **SCA-997**: Code Review
7. **SCA-998**: Integration Validation
8. **SCA-999**: Finalize PR

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-attachment-protocol-backend-service.md`
- `stories/story-002-frontend-gateway-utils.md`
- `stories/story-003-attachment-panel-component.md`
- `stories/story-004-storycard-kanban-integration.md`
- `stories/story-005-attachment-preview-ux.md`
- `stories/story-997-code-review.md`
- `stories/story-998-integration-validation.md`
- `stories/story-999-finalize-pr.md`

---

## Blocked Stories

No blocked stories. All stories have sufficient requirements for execution.
