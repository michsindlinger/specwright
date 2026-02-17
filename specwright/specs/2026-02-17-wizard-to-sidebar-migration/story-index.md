# Story Index

> Spec: Wizard-to-Sidebar Migration
> Created: 2026-02-17
> Last Updated: 2026-02-17

## Overview

This document provides an overview of all user stories for the Wizard-to-Sidebar Migration specification.

**Total Stories**: 6 (3 regular + 3 system)
**Estimated Effort**: 8 SP

---

## Story Summary

| Story ID | Title | Type | Priority | Dependencies | Status | Points |
|----------|-------|------|----------|--------------|--------|--------|
| WSM-001 | Getting Started Kachel-Logik | Frontend | High | None | Ready | 1 |
| WSM-002 | Setup-Terminal in Sidebar | Frontend | High | WSM-001 | Ready | 2 |
| WSM-003 | Wizard Entfernung & State Cleanup | Frontend | High | WSM-002 | Ready | 2 |
| WSM-997 | Code Review | System/Review | High | WSM-001, WSM-002, WSM-003 | Ready | 1 |
| WSM-998 | Integration Validation | System/Integration | High | WSM-997 | Ready | 1 |
| WSM-999 | Finalize PR | System/Finalization | High | WSM-998 | Ready | 1 |

---

## Dependency Graph

```
WSM-001 (No dependencies)
    |
    v
WSM-002 (Depends on WSM-001)
    |
    v
WSM-003 (Depends on WSM-002)
    |
    v
WSM-997 (Depends on all regular stories)
    |
    v
WSM-998 (Depends on WSM-997)
    |
    v
WSM-999 (Depends on WSM-998)
```

---

## Execution Plan

### Sequential Execution (Dependency Chain)
1. WSM-001: Getting Started Kachel-Logik (Phase 2)
2. WSM-002: Setup-Terminal in Sidebar (Phase 1 + 3)
3. WSM-003: Wizard Entfernung & State Cleanup (Phase 4 + 5)

### System Stories (After all regular stories)
4. WSM-997: Code Review
5. WSM-998: Integration Validation
6. WSM-999: Finalize PR

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-getting-started-kachel-logik.md`
- `stories/story-002-setup-terminal-integration.md`
- `stories/story-003-wizard-entfernung-state-cleanup.md`
- `stories/story-997-code-review.md`
- `stories/story-998-integration-validation.md`
- `stories/story-999-finalize-pr.md`

---

## Blocked Stories

Keine blockierten Stories. Alle DoR-Checkboxen sind komplett.
