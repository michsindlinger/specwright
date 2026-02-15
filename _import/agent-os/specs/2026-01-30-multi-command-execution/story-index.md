# Story Index

> Spec: Multi-Command Execution
> Created: 2026-01-30
> Last Updated: 2026-01-30
> Technical Refinement: Completed 2026-01-30

## Overview

This document provides an overview of all user stories for the Multi-Command Execution specification.

**Total Stories**: 7
**Estimated Effort**: ~830 LOC across 10 files
**Complexity Distribution**: 3x S, 4x XS

---

## Story Summary

| Story ID | Title | Type | Priority | Dependencies | Status | Complexity | LOC Est. |
|----------|-------|------|----------|--------------|--------|------------|----------|
| MCE-001 | Workflow Tab Bar Component | Frontend | High | None | READY | S | ~200 |
| MCE-002 | Multi-Execution State Management | Frontend | High | MCE-001 | READY | S | ~250 |
| MCE-003 | Tab Status Indicators | Frontend | High | MCE-001 | READY | XS | ~80 |
| MCE-004 | Command Selector Enhancement | Frontend | Medium | MCE-001, MCE-002 | READY | XS | ~120 |
| MCE-005 | Tab Close & Cancel Logic | Full-stack | Medium | MCE-001, MCE-002 | READY | XS | ~100 |
| MCE-006 | Background Notifications | Frontend | Medium | MCE-002, MCE-003 | READY | XS | ~80 |
| MCE-999 | Integration & End-to-End Validation | Test | High | All | READY | S | ~0 (validation) |

**Legend:**
- READY = DoR complete, ready for implementation
- XS = Extra Small (~80-120 LOC)
- S = Small (~200-250 LOC)

---

## Dependency Graph

```
MCE-001 (Tab Bar Component) [S]
    ↓
    ├── MCE-002 (State Management) [S]
    │       ↓
    │       ├── MCE-004 (Command Selector) [XS]
    │       ├── MCE-005 (Close & Cancel) [XS]
    │       └── MCE-006 (Notifications) [XS]
    │
    └── MCE-003 (Status Indicators) [XS]
            ↓
            └── MCE-006 (Notifications) [XS]
                    ↓
                    MCE-999 (Integration) [S]
```

---

## Execution Plan

### Phase 1: Foundation
- **MCE-001**: Workflow Tab Bar Component (foundation UI)
  - Files: execution-tabs.ts, execution-tab.ts, workflow-view.ts
  - Agent: dev-team__frontend-developer

### Phase 2: Core Logic (Sequential after Phase 1)
- **MCE-002**: Multi-Execution State Management
  - Files: execution-store.ts, execution.ts (types), workflow-view.ts
  - Agent: dev-team__frontend-developer
- **MCE-003**: Tab Status Indicators (can run parallel to MCE-002)
  - Files: execution-tab.ts
  - Agent: dev-team__frontend-developer

### Phase 3: Enhancements (Parallel after Phase 2)
- **MCE-004**: Command Selector Enhancement
  - Files: command-selector.ts, execution-tabs.ts
  - Agent: dev-team__frontend-developer
- **MCE-005**: Tab Close & Cancel Logic
  - Files: execution-tab.ts, execution-tabs.ts, execution-store.ts
  - Agent: dev-team__frontend-developer
- **MCE-006**: Background Notifications
  - Files: execution-tab.ts, execution-store.ts, execution.ts
  - Agent: dev-team__frontend-developer

### Phase 4: Validation (After All)
- **MCE-999**: Integration & End-to-End Validation
  - Manual E2E testing + automated checks
  - Agent: dev-team__qa-specialist

---

## Files to Create/Modify

| File | Stories | Action |
|------|---------|--------|
| agent-os-ui/ui/src/components/execution-tabs.ts | MCE-001, MCE-004, MCE-005 | CREATE |
| agent-os-ui/ui/src/components/execution-tab.ts | MCE-001, MCE-003, MCE-005, MCE-006 | CREATE |
| agent-os-ui/ui/src/components/command-selector.ts | MCE-004 | CREATE |
| agent-os-ui/ui/src/stores/execution-store.ts | MCE-002, MCE-005, MCE-006 | CREATE |
| agent-os-ui/ui/src/types/execution.ts | MCE-002, MCE-006 | CREATE/EXTEND |
| agent-os-ui/ui/src/views/workflow-view.ts | MCE-001, MCE-002 | MODIFY |

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-workflow-tab-bar-component.md` - READY
- `stories/story-002-multi-execution-state-management.md` - READY
- `stories/story-003-tab-status-indicators.md` - READY
- `stories/story-004-command-selector-enhancement.md` - READY
- `stories/story-005-tab-close-cancel-logic.md` - READY
- `stories/story-006-background-notifications.md` - READY
- `stories/story-999-integration-validation.md` - READY

---

## Blocked Stories

No stories are currently blocked. All stories have complete DoR (Definition of Ready).

---

## Technical Notes

- Backend already supports multiple parallel executions via `executionId`
- WebSocket routing per `executionId` already implemented in websocket.ts
- Main implementation effort is Frontend (Tab UI, State Management)
- No database changes required
- No new API endpoints required
- Existing cancel endpoint: `workflow.interactive.cancel`
- Follow Lit Web Component patterns from workflow-chat.ts
- Use CSS Custom Properties for theming (Moltbot-style dark theme)
- All components use `createRenderRoot() { return this; }` for global styling
