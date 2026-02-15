# Story Index

> Spec: Workflow Terminal Integration
> Created: 2026-02-02
> Last Updated: 2026-02-02

## Overview

This document provides an overview of all user stories for the Workflow Terminal Integration specification.

**Total Stories**: 6
**Estimated Effort**:
- Human Effort: ~16-20 hours (4M @ 4h each, 1S @ 2h, 1XS @ 1h)
- AI Effort: ~3-4 hours (implementation + testing)
- Total: ~19-24 hours

---

## Story Summary

| Story ID | Title | Type | Priority | Dependencies | Status | Points |
|----------|-------|------|----------|--------------|--------|--------|
| PTY-001 | Backend PTY Service | Backend | Critical | None | Ready | M |
| PTY-002 | WebSocket Terminal Protocol | Full-stack | Critical | PTY-001 | Ready | M |
| PTY-003 | Frontend Terminal Component | Frontend | Critical | PTY-002 | Ready | M |
| PTY-004 | View Switching Logic | Frontend | High | PTY-003 | Ready | S |
| PTY-005 | Code Cleanup & Removal | Refactoring | Medium | PTY-004 | Ready | XS |
| PTY-999 | Integration & Validation | Test/Integration | Critical | All | Ready | M |

---

## Dependency Graph

```
PTY-001 (Backend PTY Service)
    ↓
PTY-002 (WebSocket Terminal Protocol)
    ↓
PTY-003 (Frontend Terminal Component)
    ↓
PTY-004 (View Switching Logic)
    ↓
PTY-005 (Code Cleanup & Removal)
    ↓
PTY-999 (Integration & Validation - depends on ALL)
```

---

## Execution Plan

### Phase 1: Sequential Execution (Dependency Chain)

1. **PTY-001**: Backend PTY Service (No dependencies)
   - Implement TerminalManager with node-pty
   - Integration: WorkflowExecutor → TerminalManager

2. **PTY-002**: WebSocket Terminal Protocol (Depends on PTY-001)
   - Extend WebSocket for terminal I/O
   - Integration: TerminalManager → websocket.ts → gateway.ts

3. **PTY-003**: Frontend Terminal Component (Depends on PTY-002)
   - Create xterm.js Lit wrapper
   - Integration: gateway.ts ↔ aos-terminal

4. **PTY-004**: View Switching Logic (Depends on PTY-003)
   - Terminal replaces chat area during workflow
   - Integration: workflow-view.ts → aos-terminal

5. **PTY-005**: Code Cleanup & Removal (Depends on PTY-004)
   - Remove Ask Question UI components
   - Simplify WorkflowExecutor

6. **PTY-999**: Integration & Validation (Depends on ALL previous stories)
   - End-to-end tests
   - Component connection validation

**Notes:**
- All stories must be executed sequentially due to dependency chain
- PTY-999 cannot start until all other stories are complete
- Estimated parallel execution: 0 stories (strict sequence)

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-backend-pty-service.md`
- `stories/story-002-websocket-terminal-protocol.md`
- `stories/story-003-frontend-terminal-component.md`
- `stories/story-004-view-switching-logic.md`
- `stories/story-005-code-cleanup-removal.md`
- `stories/story-999-integration-validation.md`

---

## Blocked Stories

**Currently:** No blocked stories. All stories have passed DoR validation and are Ready for implementation.

**DoR Completion:**
- ✅ PTY-001: Ready (Backend PTY Service - foundation story)
- ✅ PTY-002: Ready (depends on PTY-001)
- ✅ PTY-003: Ready (depends on PTY-002)
- ✅ PTY-004: Ready (depends on PTY-003)
- ✅ PTY-005: Ready (depends on PTY-004)
- ✅ PTY-999: Ready (depends on ALL previous stories)

---

## Integration-Metadata (v2.9)

The following stories are responsible for establishing component connections:

| Story | Connection | Validation Command |
|-------|------------|-------------------|
| PTY-001 | WorkflowExecutor → TerminalManager | `grep -q "terminalManager.spawn" workflow-executor.ts` |
| PTY-002 | TerminalManager → websocket.ts | `grep -q "emit.*terminal.data" terminal-manager.ts` |
| PTY-002 | websocket.ts → gateway.ts | `grep -q "terminal\\.data" gateway.ts` |
| PTY-003 | gateway.ts → aos-terminal | `grep -q "CustomEvent.*terminalData" aos-terminal.ts` |
| PTY-003 | aos-terminal → gateway.ts | `grep -q "gateway.send.*terminal\\.input" aos-terminal.ts` |
| PTY-004 | workflow-view.ts → aos-terminal | `grep -q "<aos-terminal" workflow-view.ts` |
| PTY-004 | execution-store.ts → aos-terminal | `grep -q "terminalSessionId" aos-terminal.ts` |

These connections MUST be validated in PTY-999 (Integration & Validation story).

---

**Architect Refinement Complete:**

✅ Step 3.0: Pre-Refinement Layer Analysis completed
✅ Step 3.1-3.3: Technical refinement added to all 6 stories
✅ Step 3.4: DoR validation passed (all checkboxes marked [x])
✅ Step 3.5: Story size validation passed:
  - PTY-001: 3 files, ~300 LOC (✓)
  - PTY-002: 4 files, ~350 LOC (✓)
  - PTY-003: 2 files, ~400 LOC (✓)
  - PTY-004: 2 files, ~150 LOC (✓)
  - PTY-005: 3 files, ~200 LOC deletion (✓)
  - PTY-999: 5 test files, ~500 LOC (✓)
✅ Step 3.6: Effort estimation completed (~19-24 hours total)
✅ Integration connections validated in PTY-999 (all 7 connections documented)

**Ready for Execution:**

This spec is now ready for /execute-tasks. All stories have:
- Complete DoR (all checkboxes [x])
- Clear WAS/WIE/WO/WER definitions
- Completion Check commands
- Integration DoD for connection validation
- Appropriate sizing (<5 files, <400 LOC each)
