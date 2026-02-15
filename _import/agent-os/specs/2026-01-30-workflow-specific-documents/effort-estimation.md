# Effort Estimation: Workflow-Specific Documents (WSD)

> Created: 2026-01-30
> Methodology: Dual Estimation (Human vs AI-Assisted)

## Complexity to Hours Mapping

| Komplexität | Human Hours |
|-------------|-------------|
| XS | 2-4h |
| S | 4-8h |
| M | 8-16h |
| L | 16-32h |
| XL | 32-64h |

## AI-Acceleration Categories

| Category | Factor | Description |
|----------|--------|-------------|
| HIGH | 0.20 | Boilerplate, CRUD, Tests, Docs - 80% reduction |
| MEDIUM | 0.40 | Business Logic, State Management - 60% reduction |
| LOW | 0.70 | New Tech, Complex Debugging - 30% reduction |
| NONE | 1.00 | QA, Design Decisions - no reduction |

---

## Per-Story Estimation

### WSD-001: Document State per Execution

| Aspect | Value |
|--------|-------|
| Complexity | S |
| Human Hours | 4-8h |
| AI Category | HIGH |
| AI Factor | 0.20 |
| AI Hours | 0.8-1.6h |

**Rationale:** Interface extension, Store methods are boilerplate patterns already established in the codebase.

---

### WSD-002: Tab-Wechsel synchronisiert Dokumente

| Aspect | Value |
|--------|-------|
| Complexity | XS |
| Human Hours | 2-4h |
| AI Category | HIGH |
| AI Factor | 0.20 |
| AI Hours | 0.4-0.8h |

**Rationale:** Minimal change - only extends existing syncStoreState() method.

---

### WSD-003: Resizable Dokument-Container

| Aspect | Value |
|--------|-------|
| Complexity | S |
| Human Hours | 4-8h |
| AI Category | MEDIUM |
| AI Factor | 0.40 |
| AI Hours | 1.6-3.2h |

**Rationale:** Drag handling requires some UI logic, but patterns are well-known. CSS is straightforward.

---

### WSD-004: Persistente Container-Größe pro Workflow

| Aspect | Value |
|--------|-------|
| Complexity | S |
| Human Hours | 4-8h |
| AI Category | HIGH |
| AI Factor | 0.20 |
| AI Hours | 0.8-1.6h |

**Rationale:** LocalStorage persistence is standard boilerplate.

---

## Total Estimation

### By Story

| Story | Human (h) | AI (h) | Savings |
|-------|-----------|--------|---------|
| WSD-001 | 4-8 | 0.8-1.6 | 80% |
| WSD-002 | 2-4 | 0.4-0.8 | 80% |
| WSD-003 | 4-8 | 1.6-3.2 | 60% |
| WSD-004 | 4-8 | 0.8-1.6 | 80% |

### Summary

| Metric | Min | Max | Avg |
|--------|-----|-----|-----|
| **Human Total** | 14h | 28h | 21h |
| **AI-Assisted Total** | 3.6h | 7.2h | 5.4h |
| **Time Savings** | | | **74%** |

---

## Confidence Level

| Aspect | Confidence |
|--------|------------|
| Scope Clarity | High |
| Technical Approach | High |
| Dependency Risk | Low |
| Overall | **High** |

## Notes

- All stories are Frontend-only (no backend changes)
- Existing patterns in codebase reduce uncertainty
- No new dependencies required
- Integration risk is low due to existing ExecutionStore architecture

---

## Recommended Approach

**Parallel Execution Possible:**
- WSD-001 and WSD-003 can be implemented in parallel
- WSD-002 follows WSD-001
- WSD-004 follows WSD-001 + WSD-003

**Optimal Path:**
```
Day 1: WSD-001 + WSD-003 (parallel)
Day 1: WSD-002 (after WSD-001)
Day 1: WSD-004 (after both)
```

**With AI assistance, entire feature can be completed in ~1 working day.**
