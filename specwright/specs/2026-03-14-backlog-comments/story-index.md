# Story Index

> Spec: Backlog Item Comments
> Created: 2026-03-14
> Last Updated: 2026-03-14

## Overview

This document provides an overview of all user stories for the Backlog Item Comments specification.

**Total Stories**: 9 (6 Feature + 3 System)
**Estimated Effort**: M (total)

---

## Story Summary

| Story ID | Title | Type | Priority | Dependencies | Status | Effort |
|----------|-------|------|----------|--------------|--------|--------|
| BLC-001 | Comment Protocol & Server Handler | Backend | High | None | Ready | M |
| BLC-002 | Comment Count Backend Integration | Backend | Medium | BLC-001 | Ready | S |
| BLC-003 | Comment Thread Frontend Component | Frontend | High | BLC-001 | Ready | L |
| BLC-004 | Image Upload in Comments | Frontend | Medium | BLC-003 | Ready | M |
| BLC-005 | Comment Count Badge on Story Card | Frontend | Medium | BLC-002 | Ready | S |
| BLC-006 | Detail View Integration | Frontend | High | BLC-003, BLC-005 | Ready | S |
| BLC-997 | Code Review | System/Review | High | All regular stories | Ready | S |
| BLC-998 | Integration Validation | System/Integration | High | BLC-997 | Ready | S |
| BLC-999 | Finalize PR | System/Finalization | High | BLC-998 | Ready | S |

---

## Dependency Graph

```
BLC-001 (No dependencies)
    ├──> BLC-002 (Depends on BLC-001)
    │       └──> BLC-005 (Depends on BLC-002)
    └──> BLC-003 (Depends on BLC-001)
            ├──> BLC-004 (Depends on BLC-003)
            └──> BLC-006 (Depends on BLC-003, BLC-005)

BLC-997 (Depends on all regular stories)
    └──> BLC-998 (Depends on BLC-997)
            └──> BLC-999 (Depends on BLC-998)
```

---

## Execution Plan

### Phase 1: Foundation (No Dependencies)
- BLC-001: Comment Protocol & Server Handler

### Phase 2: Parallel Execution (Depends on BLC-001)
- BLC-002: Comment Count Backend Integration
- BLC-003: Comment Thread Frontend Component

### Phase 3: Parallel Execution (Depends on Phase 2)
- BLC-004: Image Upload in Comments (depends on BLC-003)
- BLC-005: Comment Count Badge on Story Card (depends on BLC-002)

### Phase 4: Integration (Depends on BLC-003 + BLC-005)
- BLC-006: Detail View Integration

### Phase 5: System Stories (Sequential)
- BLC-997: Code Review
- BLC-998: Integration Validation
- BLC-999: Finalize PR

---

## Story Files

Individual story files are located in the stories/ subdirectory:

- stories/story-001-comment-protocol-and-server-handler.md
- stories/story-002-comment-count-backend.md
- stories/story-003-comment-thread-component.md
- stories/story-004-image-upload-in-comments.md
- stories/story-005-comment-count-badge.md
- stories/story-006-detail-view-integration.md
- stories/story-997-code-review.md
- stories/story-998-integration-validation.md
- stories/story-999-finalize-pr.md

---

## Blocked Stories

No blocked stories - all DoR items complete after technical refinement (Step 3).
