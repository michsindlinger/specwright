# Story Index - Dashboard View Toggle

> Spec: DVT (Dashboard View Toggle)
> Created: 2026-01-30
> Last Updated: 2026-01-30
> **Technical Refinement:** 2026-01-30

---

## Story Summary

| ID | Story | Type | Priority | Status | Dependencies | Complexity |
|----|-------|------|----------|--------|--------------|------------|
| DVT-001 | View Toggle Component | Frontend | Critical | Done | None | S |
| DVT-002 | List View Implementation | Frontend | Critical | Done | DVT-001 | S |
| DVT-003 | View Preference Persistence | Frontend | High | Done | DVT-001 | XS |
| DVT-999 | Integration | DVT-999 | Integration & E2E Validation | Test | High | Ready | DVT-001, DVT-002, DVT-003 | XS | E2E Validation | Test | High | Done | DVT-001, DVT-002, DVT-003 | XS |

---

## Dependency Graph

```
DVT-001 (View Toggle Component) [S]
    ├── DVT-002 (List View Implementation) [S]
    ├── DVT-003 (View Preference Persistence) [XS]
    └── DVT-999 (Integration Validation) [XS]
            └── depends on: DVT-001, DVT-002, DVT-003
```

**Dependency Validation:** All dependencies are correctly identified. DVT-001 has no dependencies and is the foundation. DVT-002 and DVT-003 can be executed in parallel after DVT-001. DVT-999 requires all other stories to be complete.

---

## Execution Plan

### Phase 1: Foundation (Sequential)
1. **DVT-001** - View Toggle Component (must complete first)
   - Adds specsViewMode state and toggle buttons
   - ~80 LOC across 2 files
   - **Estimated: 1-2 hours**

### Phase 2: Features (Parallel after DVT-001)
2. **DVT-002** - List View Implementation
   - Adds table/list rendering for specs
   - ~100 LOC across 2 files
   - **Estimated: 1-2 hours**

3. **DVT-003** - View Preference Persistence
   - Adds localStorage read/write
   - ~30 LOC in 1 file
   - **Estimated: 30 minutes**

### Phase 3: Validation (After all others)
4. **DVT-999** - Integration & E2E Validation
   - Verification only, no new code
   - **Estimated: 30 minutes**

**Total Estimated Effort: 3-5 hours**

---

## Story Files

| Story ID | File Path | LOC Estimate |
|----------|-----------|--------------|
| DVT-001 | `stories/story-001-view-toggle-component.md` | ~80 |
| DVT-002 | `stories/story-002-list-view-implementation.md` | ~100 |
| DVT-003 | `stories/story-003-view-preference-persistence.md` | ~30 |
| DVT-999 | `stories/story-999-integration-validation.md` | 0 |

---

## Affected Files Summary

| File | Stories | Changes |
|------|---------|---------|
| `agent-os-ui/ui/src/views/dashboard-view.ts` | DVT-001, DVT-002, DVT-003 | State, methods, localStorage |
| `agent-os-ui/ui/src/styles/theme.css` | DVT-001, DVT-002 | Toggle and list styles |

---

## Blocked Stories

*Keine blockierten Stories*

---

## Total Estimated Effort

| Metric | Value |
|--------|-------|
| Total Stories | 4 |
| Frontend Stories | 3 |
| Test Stories | 1 |
| Total Complexity | S + S + XS + XS = ~M |
| Estimated LOC | ~210 |
| Estimated Time | 3-5 hours |
| Files Affected | 2 |

---

## Complexity Legend

| Rating | Description | LOC Range | Time Estimate |
|--------|-------------|-----------|---------------|
| XS | Extra Small | < 50 | < 1 hour |
| S | Small | 50-150 | 1-2 hours |
| M | Medium | 150-400 | 2-4 hours |

---

*Index updated: 2026-01-30*
