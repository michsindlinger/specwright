# Story Index

> Spec: Project Docs Viewer/Editor
> Created: 2026-01-30
> Last Updated: 2026-01-30

## Overview

This document provides an overview of all user stories for the Project Docs Viewer/Editor specification.

**Total Stories**: 6
**Estimated Effort**: ~24-32h (Human) / ~8-12h (Human + AI)

---

## Story Summary

| Story ID | Title | Type | Priority | Dependencies | Status | Complexity |
|----------|-------|------|----------|--------------|--------|------------|
| PDOC-001 | Backend Docs API | Backend | Critical | None | Ready | S |
| PDOC-002 | Docs Sidebar Component | Frontend | High | PDOC-001 | Ready | S |
| PDOC-003 | Docs Viewer Component | Frontend | High | PDOC-001 | Ready | S |
| PDOC-004 | Docs Editor Component | Frontend | High | PDOC-001, PDOC-003 | Ready | M |
| PDOC-005 | Dashboard Integration | Frontend | High | PDOC-002, PDOC-003, PDOC-004 | Ready | S |
| PDOC-999 | Integration & E2E Validation | Test | Medium | All above | Ready | S |

---

## Dependency Graph

```
PDOC-001 (Backend Docs API) [No dependencies]
    |
    +---> PDOC-002 (Docs Sidebar)
    |
    +---> PDOC-003 (Docs Viewer)
    |         |
    |         v
    |     PDOC-004 (Docs Editor) [depends on PDOC-001, PDOC-003]
    |         |
    +---------+---> PDOC-005 (Dashboard Integration) [depends on PDOC-002, PDOC-003, PDOC-004]
                        |
                        v
                    PDOC-999 (Integration & E2E) [depends on all]
```

---

## Execution Plan

### Phase 1: Backend Foundation (Parallel: No)
1. **PDOC-001**: Backend Docs API (MUST complete first - provides API for all frontend stories)
   - Assignee: dev-team__backend-developer
   - Files: docs-reader.ts (new), websocket.ts (modify)

### Phase 2: Frontend Components (Parallel: Partial)
Can run in parallel after PDOC-001 completes:
- **PDOC-002**: Docs Sidebar Component
  - Assignee: dev-team__frontend-developer
  - Files: aos-docs-sidebar.ts (new)
- **PDOC-003**: Docs Viewer Component
  - Assignee: dev-team__frontend-developer
  - Files: aos-docs-viewer.ts (new), package.json (deps)

Sequential after PDOC-003:
- **PDOC-004**: Docs Editor Component (depends on PDOC-003)
  - Assignee: dev-team__frontend-developer
  - Files: aos-docs-editor.ts (new), package.json (deps)

### Phase 3: Integration (Parallel: No)
- **PDOC-005**: Dashboard Integration (depends on PDOC-002, PDOC-003, PDOC-004)
  - Assignee: dev-team__frontend-developer
  - Files: aos-docs-panel.ts (new), dashboard-view.ts (modify)

### Phase 4: Validation (Parallel: No)
- **PDOC-999**: Integration & E2E Validation (depends on all stories)
  - Assignee: dev-team__frontend-developer
  - Files: test-checklist.md (new)

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-backend-docs-api.md`
- `stories/story-002-docs-sidebar-component.md`
- `stories/story-003-docs-viewer-component.md`
- `stories/story-004-docs-editor-component.md`
- `stories/story-005-dashboard-integration.md`
- `stories/story-999-integration-validation.md`

---

## Technical Summary

### New Files to Create
| File | Story | Layer |
|------|-------|-------|
| `src/server/docs-reader.ts` | PDOC-001 | Backend |
| `ui/src/components/docs/aos-docs-sidebar.ts` | PDOC-002 | Frontend |
| `ui/src/components/docs/aos-docs-viewer.ts` | PDOC-003 | Frontend |
| `ui/src/components/docs/aos-docs-editor.ts` | PDOC-004 | Frontend |
| `ui/src/components/docs/aos-docs-panel.ts` | PDOC-005 | Frontend |

### Files to Modify
| File | Story | Change |
|------|-------|--------|
| `src/server/websocket.ts` | PDOC-001 | Add docs.* handlers |
| `ui/package.json` | PDOC-003, PDOC-004 | Add marked, highlight.js, codemirror |
| `ui/src/views/dashboard-view.ts` | PDOC-005 | Add Docs tab |

### Dependencies to Install
```bash
# Frontend (ui/)
npm install marked @types/marked highlight.js
npm install @codemirror/view @codemirror/state @codemirror/lang-markdown @codemirror/theme-one-dark
```

---

## Notes

- **PDOC-001** ist die kritischste Story - alle Frontend-Stories haengen davon ab
- **PDOC-002** und **PDOC-003** koennen parallel entwickelt werden
- **PDOC-004** benoetigt das Viewer-Pattern von PDOC-003 als Vorlage
- **PDOC-005** integriert alle Komponenten ins Dashboard
- **PDOC-999** ist die finale Validierung des gesamten Features

---

## Refinement Completed

All stories have been technically refined by the Architect:
- DoR checkboxes: All marked as complete
- Technical Details (WAS/WIE/WO): Filled for all stories
- Integration Types: Identified for all stories
- Affected Components: Documented for all stories
- Completion Checks: Defined for all stories

**Status: All stories are READY for development.**
