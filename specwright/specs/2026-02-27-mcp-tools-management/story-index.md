# Story Index

> Spec: MCP Tools Management
> Created: 2026-02-27
> Last Updated: 2026-02-27

## Overview

This document provides an overview of all user stories for the MCP Tools Management specification.

**Total Stories**: 8 (5 regulaer + 3 System)
**Estimated Effort**: ~18 SP

---

## Story Summary

| Story ID | Title | Type | Priority | Complexity | Dependencies | Status | Points |
|----------|-------|------|----------|------------|--------------|--------|--------|
| MCP-001 | Shared Types & Backend MCP Service | Backend | High | S | None | Ready (DoR complete) | 3 |
| MCP-002 | MCP Tools Uebersicht im Frontend | Frontend | High | S | MCP-001 | Ready (DoR complete) | 3 |
| MCP-003 | MCP-Zuweisung zu Skills | Frontend | High | S | MCP-001, MCP-002 | Ready (DoR complete) | 3 |
| MCP-004 | Verwaiste Referenzen & Edge Cases | Frontend | Medium | XS | MCP-002, MCP-003 | Ready (DoR complete) | 1 |
| MCP-005 | Backend Tests | Test | High | S | MCP-001 | Ready (DoR complete) | 3 |
| MCP-997 | Code Review | System/Review | High | - | MCP-001..005 | Ready | 2 |
| MCP-998 | Integration Validation | System/Integration | High | - | MCP-997 | Ready | 2 |
| MCP-999 | Finalize PR | System/Finalization | High | - | MCP-998 | Ready | 1 |

---

## Dependency Graph

```
MCP-001 (No dependencies - Backend Foundation)
    ├──> MCP-002 (Depends on MCP-001)
    │       └──> MCP-003 (Depends on MCP-001, MCP-002)
    │               └──> MCP-004 (Depends on MCP-002, MCP-003)
    └──> MCP-005 (Depends on MCP-001 - Tests)

[All regular stories complete]
    └──> MCP-997 (Code Review)
            └──> MCP-998 (Integration Validation)
                    └──> MCP-999 (Finalize PR)
```

---

## Execution Plan

### Phase 1: Backend Foundation (Parallel Start)
- MCP-001: Shared Types & Backend MCP Service

### Phase 2: Frontend + Tests (After Phase 1)
- MCP-002: MCP Tools Uebersicht im Frontend (depends on MCP-001)
- MCP-005: Backend Tests (depends on MCP-001, can run parallel to MCP-002)

### Phase 3: Assignment Features (After Phase 2)
- MCP-003: MCP-Zuweisung zu Skills (depends on MCP-001, MCP-002)

### Phase 4: Polish (After Phase 3)
- MCP-004: Verwaiste Referenzen & Edge Cases (depends on MCP-002, MCP-003)

### Phase 5: System Stories (After all regular stories)
1. MCP-997: Code Review
2. MCP-998: Integration Validation
3. MCP-999: Finalize PR

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-shared-types-and-backend-mcp-service.md`
- `stories/story-002-mcp-tools-uebersicht-frontend.md`
- `stories/story-003-mcp-zuweisung-zu-skills.md`
- `stories/story-004-verwaiste-referenzen-und-edge-cases.md`
- `stories/story-005-backend-tests.md`
- `stories/story-997-code-review.md`
- `stories/story-998-integration-validation.md`
- `stories/story-999-finalize-pr.md`

---

## Blocked Stories

Keine blockierten Stories. Alle Stories haben vollstaendiges technisches Refinement (DoR complete).
