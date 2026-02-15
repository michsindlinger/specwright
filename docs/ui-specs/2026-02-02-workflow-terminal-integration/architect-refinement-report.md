# Architect Refinement Report

> Spec: Workflow Terminal Integration
> Date: 2026-02-02
> Architect: dev-team__architect
> Status: ✅ COMPLETE

---

## Executive Summary

All 6 user stories have been successfully refined with complete technical details. The spec is ready for execution via /execute-tasks.

**Key Achievements:**
- ✅ All DoR checkboxes marked [x] complete
- ✅ All stories appropriately sized (≤5 files, ≤400 LOC)
- ✅ All 7 component connections documented and validated
- ✅ Integration DoD defined for PTY-999
- ✅ Full-stack consistency achieved across all layers
- ✅ Effort estimation completed (~19-24 hours total)

---

## Story Refinement Summary

| Story ID | Type | Files | Complexity | Status | DoR Complete |
|----------|------|-------|------------|--------|--------------|
| PTY-001 | Backend | 3 | M | Ready | ✅ All [x] |
| PTY-002 | Full-stack | 4 | M | Ready | ✅ All [x] |
| PTY-003 | Frontend | 2 | M | Ready | ✅ All [x] |
| PTY-004 | Frontend | 2 | S | Ready | ✅ All [x] |
| PTY-005 | Refactoring | 3 | XS | Ready | ✅ All [x] |
| PTY-999 | Integration | 5 | M | Ready | ✅ All [x] |

**Total**: 19 files affected (14 new/modified, 2 deletions, 5 test files)

---

## Layer Analysis Results

### PTY-001: Backend PTY Service
- **Integration Type**: Backend-only
- **Layers**: Backend (TerminalManager, WorkflowExecutor, protocol types)
- **Critical Integration**: WorkflowExecutor → TerminalManager (method call)
- **Validation**: grep check for terminalManager.spawn()

### PTY-002: WebSocket Terminal Protocol
- **Integration Type**: Full-stack
- **Layers**: Backend (TerminalManager, websocket.ts) + Frontend (gateway.ts) + Shared (types)
- **Critical Integrations**:
  - TerminalManager → websocket.ts (event emission)
  - websocket.ts → gateway.ts (WebSocket messages)
- **Validation**: grep checks for emit.terminal.data and terminal.data handling

### PTY-003: Frontend Terminal Component
- **Integration Type**: Frontend-only
- **Layers**: Frontend (aos-terminal, theme.css, gateway.ts)
- **Critical Integrations**:
  - gateway.ts → aos-terminal (Custom Event dispatch)
  - aos-terminal → gateway.ts (method call)
- **Validation**: grep checks for CustomEvent.terminalData and gateway.send()

### PTY-004: View Switching Logic
- **Integration Type**: Frontend-only
- **Layers**: Frontend (workflow-view.ts, execution-store.ts)
- **Critical Integrations**:
  - workflow-view.ts → aos-terminal (component render)
  - execution-store.ts → aos-terminal (property binding)
- **Validation**: grep checks for <aos-terminal> and terminalSessionId

### PTY-005: Code Cleanup & Removal
- **Integration Type**: Full-stack (removal)
- **Layers**: Frontend (workflow-question components) + Backend (WorkflowExecutor logic)
- **Critical Integrations**: None (cleanup story)
- **Validation**: grep checks for file non-existence and method removal

### PTY-999: Integration & Validation
- **Integration Type**: Full-stack (all layers)
- **Layers**: All (validates all 7 connections)
- **Critical Integrations**: ALL 7 connections from implementation-plan.md
- **Validation**: Complete integration test suite + all grep checks

---

## Component Connection Validation Matrix

All 7 component connections from implementation-plan.md are documented and validated:

| # | Source | Target | Type | Responsible Story | Validation Command |
|---|--------|--------|------|-------------------|-------------------|
| 1 | WorkflowExecutor | TerminalManager | Method Call | PTY-001 | `grep -q "terminalManager.spawn"` |
| 2 | TerminalManager | websocket.ts | Event Emission | PTY-002 | `grep -q "emit.*terminal.data"` |
| 3 | websocket.ts | gateway.ts | WebSocket Message | PTY-002 | `grep -q "terminal\\.data"` |
| 4 | gateway.ts | aos-terminal | Custom Event | PTY-003 | `grep -q "CustomEvent.*terminalData"` |
| 5 | aos-terminal | gateway.ts | Method Call | PTY-003 | `grep -q "gateway.send.*terminal\\.input"` |
| 6 | workflow-view.ts | aos-terminal | Component Render | PTY-004 | `grep -q "<aos-terminal"` |
| 7 | execution-store.ts | aos-terminal | Property Binding | PTY-004 | `grep -q "terminalSessionId"` |

**Integration Story PTY-999 validates ALL 7 connections end-to-end.**

---

## Architecture Guidance Summary

All stories follow these architectural patterns:

1. **Adapter Pattern**: TerminalManager acts as adapter between WorkflowExecutor and node-pty
2. **Event Emitter Pattern**: PTY events propagate through layers (TerminalManager → WebSocket → gateway → component)
3. **Message-based Protocol**: WebSocket communication follows DEC-003 (typed message contracts)
4. **Layered Architecture**: Respects 3-tier separation (Presentation → Service → Integration)
5. **Conditional Rendering**: View switching uses Lit reactive properties
6. **CSS Custom Properties**: Theme integration uses native CSS variables (no CSS-in-JS)

---

## DoD (Definition of Done) Highlights

Each story has comprehensive DoD including:

### Standard DoD (all stories)
- [ ] Code implemented and follows Style Guide
- [ ] Architecture requirements met
- [ ] Security/Performance requirements satisfied
- [ ] All acceptance criteria met
- [ ] Tests written and passing
- [ ] Code review approved
- [ ] Documentation updated
- [ ] No linting errors
- [ ] Completion Check commands successful

### Integration DoD (PTY-001, PTY-002, PTY-003, PTY-004)
Each story that creates a connection has Integration DoD items:
- [ ] **Integration hergestellt: [Source] → [Target]**
  - [ ] Import/Aufruf existiert in Code
  - [ ] Verbindung ist funktional (nicht nur Stub)
  - [ ] Validierung: `[grep command]`

### Connection Validation DoD (PTY-999)
Integration story validates ALL 7 connections:
- [ ] Connection 1-7 validated (grep checks pass)
- [ ] Integration tests pass (4 test files)
- [ ] Optional E2E tests pass (Playwright)
- [ ] Full test suite passes

---

## Effort Estimation

### By Story
- PTY-001 (M): ~4 hours (backend service + tests)
- PTY-002 (M): ~4 hours (full-stack protocol + integration tests)
- PTY-003 (M): ~4 hours (xterm.js component + theme + tests)
- PTY-004 (S): ~2 hours (view switching + state)
- PTY-005 (XS): ~1 hour (deletion + regression tests)
- PTY-999 (M): ~4 hours (integration tests + validation)

### Total Effort
- **Human Effort**: 16-20 hours
- **AI Effort**: 3-4 hours (implementation assistance + test generation)
- **Total**: 19-24 hours

### Effort by Layer
- Backend: ~8 hours (PTY-001, PTY-002 backend)
- Frontend: ~10 hours (PTY-002 frontend, PTY-003, PTY-004)
- Integration/Testing: ~5 hours (PTY-999)
- Cleanup: ~1 hour (PTY-005)

---

## Risk Mitigation

All stories include architectural constraints to mitigate risks:

1. **Memory Leaks**: Max buffer size 10MB, automatic cleanup after 5min inactivity
2. **Data Loss on Reconnect**: In-memory buffer restore with exponential backoff
3. **Performance Degradation**: Binary WebSocket frames, xterm.js buffer management, <100ms latency target
4. **Security**: Input validation, least privilege, no direct PTY access from frontend
5. **Cross-Contamination**: Session isolation using execution-ID-based Map
6. **Theme Inconsistency**: CSS Custom Properties override with app theme

---

## Completion Check Commands

Each story has automated validation commands. Example from PTY-001:

```bash
# Auto-Verify Commands - all must exit with 0
test -f agent-os-ui/src/server/services/terminal-manager.ts && echo "✓ TerminalManager exists"
test -f agent-os-ui/src/shared/types/terminal.protocol.ts && echo "✓ terminal.protocol.ts exists"
grep -q "terminalManager.spawn" agent-os-ui/src/server/workflow-executor.ts && echo "✓ Integration exists"
npm run lint -- agent-os-ui/src/server/services/terminal-manager.ts && echo "✓ No lint errors"
npm test -- terminal-manager.spec.ts && echo "✓ Tests pass"
```

**Story is DONE when:**
1. All FILE_EXISTS/CONTAINS checks pass
2. All *_PASS commands exit 0
3. Git diff shows only expected changes

---

## Dependencies & Execution Order

Stories must be executed sequentially due to strict dependency chain:

```
PTY-001 (Foundation)
   ↓
PTY-002 (Depends on PTY-001)
   ↓
PTY-003 (Depends on PTY-002)
   ↓
PTY-004 (Depends on PTY-003)
   ↓
PTY-005 (Depends on PTY-004)
   ↓
PTY-999 (Depends on ALL previous stories)
```

**No parallel execution possible** - each story builds on the previous.

---

## Handover Documents

Key interfaces defined for cross-story communication:

1. **terminal.protocol.ts**: Shared types for PTY messages and WebSocket messages
   - Consumed by: PTY-001, PTY-002, PTY-003
   - Extended in: PTY-002 (WebSocket types)

2. **aos-terminal.terminalSessionId**: Property exposed for state binding
   - Defined in: PTY-003
   - Consumed by: PTY-004 (execution-store binding)

3. **WebSocket message contracts**: DEC-003 pattern
   - Defined in: PTY-002
   - Consumed by: PTY-003 (gateway.ts, aos-terminal)

---

## Architecture Decision Compliance

All stories respect existing architecture decisions:

- ✅ **DEC-001 (Layered Architecture)**: Backend → Service → Integration separation maintained
- ✅ **DEC-002 (Folder Structure)**: New files in correct layers (server/services/, ui/src/components/)
- ✅ **DEC-003 (WebSocket Pattern)**: Message-based protocol with typed contracts

---

## Quality Gates

All stories pass quality gates:

### Code Quality
- TypeScript strict mode (no `any` types)
- Linting passes (ESLint + Prettier)
- No console.log in production code
- JSDoc comments for public APIs

### Testing
- Unit tests for new services/components
- Integration tests for cross-layer features
- Component tests with @open-wc/testing
- E2E tests (optional, Playwright)

### Accessibility (Frontend Stories)
- Keyboard navigation works
- ARIA labels on interactive elements
- Focus indicators visible

### Performance
- <100ms WebSocket latency
- 1000+ lines output without degradation
- No memory leaks (cleanup in disconnectedCallback)

---

## Next Steps

This spec is **READY FOR EXECUTION** via /execute-tasks.

**Pre-execution checklist:**
- [x] All stories refined with technical details
- [x] All DoR checkboxes marked [x]
- [x] All stories appropriately sized
- [x] All component connections documented
- [x] Integration DoD defined in PTY-999
- [x] Effort estimation complete
- [x] story-index.md updated with Ready status

**Execute with:**
```bash
/execute-tasks
```

The Orchestrator will:
1. Load story PTY-001 (first in dependency chain)
2. Execute using Backend Developer
3. Validate with Completion Check commands
4. Proceed to PTY-002, etc.
5. Complete with PTY-999 integration validation

---

**Report Generated**: 2026-02-02
**Architect**: dev-team__architect
**Status**: ✅ REFINEMENT COMPLETE
