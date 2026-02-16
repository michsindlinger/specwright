# Story Index

> Spec: Branch-per-Story Backlog
> Created: 2026-02-16
> Last Updated: 2026-02-16

## Overview

This document provides an overview of all user stories for the Branch-per-Story Backlog specification.

**Total Stories**: 6 (3 reguläre + 3 System)
**Estimated Effort**: 6 SP (S x 6)

---

## Story Summary

| Story ID | Title | Type | Priority | Dependencies | Status | Points |
|----------|-------|------|----------|--------------|--------|--------|
| BPS-001 | Git-Service-Erweiterungen | Backend | High | None | Ready | 2 |
| BPS-002 | Backlog-Story-Lifecycle im Workflow-Executor | Backend | High | BPS-001 | Ready | 2 |
| BPS-003 | WebSocket + Frontend Integration und Error-Handling | Full-stack | High | BPS-002 | Ready | 2 |
| BPS-997 | Code Review | System/Review | High | BPS-001, BPS-002, BPS-003 | Ready | 2 |
| BPS-998 | Integration Validation | System/Integration | High | BPS-997 | Ready | 2 |
| BPS-999 | Finalize PR | System/Finalization | High | BPS-998 | Ready | 2 |

---

## Dependency Graph

```
BPS-001 (No dependencies)
    ↓
BPS-002 (Depends on BPS-001)
    ↓
BPS-003 (Depends on BPS-002)
    ↓
BPS-997 (Depends on BPS-001, BPS-002, BPS-003)
    ↓
BPS-998 (Depends on BPS-997)
    ↓
BPS-999 (Depends on BPS-998)
```

---

## Execution Plan

### Sequential Execution (Dependency Chain)
1. BPS-001: Git-Service-Erweiterungen (Startphase - keine Dependencies)
2. BPS-002: Backlog-Story-Lifecycle im Workflow-Executor (depends on BPS-001)
3. BPS-003: WebSocket + Frontend Integration und Error-Handling (depends on BPS-002)

### System Stories (nach allen regulären Stories)
4. BPS-997: Code Review (depends on BPS-001, BPS-002, BPS-003)
5. BPS-998: Integration Validation (depends on BPS-997)
6. BPS-999: Finalize PR (depends on BPS-998)

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-git-service-erweiterungen.md`
- `stories/story-002-backlog-story-lifecycle.md`
- `stories/story-003-websocket-frontend-integration.md`
- `stories/story-997-code-review.md`
- `stories/story-998-integration-validation.md`
- `stories/story-999-finalize-pr.md`

---

## Blocked Stories

Keine blockierten Stories - alle DoR-Checkboxen sind ausgefüllt.
