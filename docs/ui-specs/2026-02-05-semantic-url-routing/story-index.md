# Story Index: Semantic URL Routing

## Implementation Stories

| ID | Title | Type | Priority | Effort | Dependencies | Status |
|----|-------|------|----------|--------|-------------|--------|
| SUR-001 | Router Module erstellen | infrastructure | critical | S | - | pending |
| SUR-002 | App Shell auf Router migrieren | frontend | critical | M | SUR-001 | pending |
| SUR-003 | Dashboard Deep-Linking (Specs, Kanban, Story) | frontend | critical | L | SUR-001, SUR-002 | pending |
| SUR-004 | Backlog & Docs als eigenständige Routes | frontend | high | S | SUR-003 | pending |
| SUR-005 | Settings Sub-Routes | frontend | medium | S | SUR-002 | pending |
| SUR-006 | Workflow Deep-Linking & Query-Parameter Migration | frontend | medium | M | SUR-002 | pending |
| SUR-007 | Vite SPA Fallback & Production Server Config | infrastructure | critical | S | - | pending |

## System Stories

| ID | Title | Type | Dependencies | Status |
|----|-------|------|-------------|--------|
| SUR-997 | Code Review | system | SUR-001 to SUR-007 | pending |
| SUR-998 | Integration Validation | system | SUR-997 | pending |
| SUR-999 | Finalize PR | system | SUR-998 | pending |

## Execution Order (empfohlen)

1. **Phase 1** (parallel): SUR-001 (Router) + SUR-007 (Vite Config)
2. **Phase 2**: SUR-002 (App Shell Migration)
3. **Phase 3** (parallel): SUR-003 (Dashboard Deep-Linking) + SUR-005 (Settings) + SUR-006 (Workflow)
4. **Phase 4**: SUR-004 (Backlog/Docs - baut auf SUR-003 auf)
5. **Phase 5**: SUR-997 → SUR-998 → SUR-999

## Effort Summary

| Effort | Count | Stories |
|--------|-------|---------|
| S (Small) | 4 | SUR-001, SUR-004, SUR-005, SUR-007 |
| M (Medium) | 2 | SUR-002, SUR-006 |
| L (Large) | 1 | SUR-003 |

**Total Implementation Effort**: ~4-6 Stunden (Human), ~2-3 Stunden (Human + AI)
