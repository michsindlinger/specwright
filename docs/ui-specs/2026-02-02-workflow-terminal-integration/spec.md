# Spec Requirements Document

> Spec: Workflow Terminal Integration
> Created: 2026-02-02
> Status: Planning

## Overview

This spec replaces the faulty text-based output mapping with a complete terminal integration (xterm.js + node-pty) that provides 1:1 shell mirroring, full interactivity, and native terminal features. The terminal automatically starts when workflows are executed, replaces the chat area, and remains open after workflow completion for review.

The current Ask Question UI suffers from unreliable output mapping (missing/duplicate questions, inconsistent rendering). The new terminal integration eliminates these issues by using industry-standard terminal emulation, providing developers with a native CLI experience directly in the web UI.

**Value Proposition:** Eliminates UI bugs, provides native developer experience, reduces custom UI code through proven terminal standards (xterm.js + node-pty).

## User Stories

1. **PTY-001:** Backend PTY Service - Implement TerminalManager with node-pty for PTY process lifecycle management
2. **PTY-002:** WebSocket Terminal Protocol - Extend WebSocket for terminal I/O with binary frames
3. **PTY-003:** Frontend Terminal Component - Create xterm.js Lit wrapper component with theme integration
4. **PTY-004:** View Switching Logic - Terminal replaces chat area during workflow execution
5. **PTY-005:** Code Cleanup & Removal - Remove Ask Question UI and old output mapping
6. **PTY-999:** Integration & Validation - End-to-end tests validating complete terminal flow

See: agent-os/specs/2026-02-02-workflow-terminal-integration/story-index.md

## Spec Scope

**IN SCOPE:**
- Terminal-UI in frontend (xterm.js)
- PTY-backend-service (node-pty)
- WebSocket protocol for terminal I/O (binary frames)
- Automatic terminal start on workflow execution
- "Back to Dashboard" button
- Copy-paste from terminal
- Theme integration (Moltbot Dark)
- Session persistence (in-memory buffer)
- Automatic reconnect with backoff
- Multiple workflows in parallel (isolated terminals)
- Exit-code display on crashes
- Unlimited scrolling (xterm.js buffer management)
- Full interactivity (read/write during workflow)

**TECHNICAL DECISIONS:**
- xterm.js 5.x for frontend terminal emulation
- node-pty 1.x for backend PTY management
- Binary WebSocket frames (not JSON) for performance
- Adapter Pattern (WorkflowExecutor → TerminalManager → PTY)
- In-memory buffer for session persistence (MVP)

## Out of Scope

**OUT OF SCOPE:**
- Terminal tabs (each workflow has own terminal, switch via dashboard)
- Split-view (terminal + chat simultaneously)
- Custom terminal settings UI (uses app theme)
- Free shell execution (only predefined workflows)
- Terminal shortcuts for non-workflow commands
- Remote shell support (currently only Zsh local, remote in v2.0)
- Terminal recording/replay
- Collaborative terminals (multi-user)
- Filesystem-based session persistence (optional in v2.0)
- tmux/screen integration (optional in v2.0)

## Expected Deliverable

A fully functional terminal integration that:
- **Replaces faulty Ask Question UI** with native terminal emulation
- **Eliminates output mapping bugs** (no more missing/duplicate questions)
- **Provides 1:1 CLI mirroring** (all ANSI codes, colors, formatting)
- **Supports full interactivity** (users can input during workflow execution)
- **Auto-starts on workflow execution** (seamless UX)
- **Remains open after workflow** (for review, with exit-codes)
- **Handles multiple workflows** (isolated terminals per execution)
- **Survives reconnects** (buffer restored automatically)
- **Passes all tests:** Unit, integration, end-to-end

**Measurable Outcomes:**
- ✅ Zero output mapping bugs (validated by integration tests)
- ✅ <100ms WebSocket latency for terminal I/O
- ✅ 1000+ lines output without performance degradation
- ✅ Automatic reconnect successful in <5 seconds
- ✅ 3+ concurrent workflows without interference
- ✅ All ANSI escape codes rendered correctly

## Integration Requirements

> ⚠️ **IMPORTANT:** These integration tests will be executed automatically after all stories complete.
> They ensure that the complete system works end-to-end, not just individual stories.

**Integration Type:** Full-stack

- [ ] **Integration Test 1: Workflow Start → Terminal Spawn**
   - Command: `npm run test:integration -- terminal-spawn.spec.ts`
   - Validates: Workflow execution triggers PTY spawn, terminal connects via WebSocket
   - Requires MCP: no

- [ ] **Integration Test 2: Terminal I/O Bidirectional**
   - Command: `npm run test:integration -- terminal-io.spec.ts`
   - Validates: User input reaches PTY stdin, PTY stdout/stderr reaches frontend
   - Requires MCP: no

- [ ] **Integration Test 3: Reconnect with Buffer Restore**
   - Command: `npm run test:integration -- terminal-reconnect.spec.ts`
   - Validates: WebSocket disconnect → reconnect restores terminal buffer
   - Requires MCP: no

- [ ] **Integration Test 4: Multiple Workflows Isolation**
   - Command: `npm run test:integration -- terminal-multi.spec.ts`
   - Validates: 3 workflows run in parallel with isolated terminals
   - Requires MCP: no

- [ ] **Integration Test 5: UI Flow - Dashboard → Terminal → Back**
   - Command: `npm run test:e2e -- workflow-terminal-ui.spec.ts`
   - Validates: Click workflow → terminal appears → workflow ends → back button works
   - Requires MCP: yes (Playwright)

**Integration Scenarios:**
- [ ] Scenario 1: User starts workflow from dashboard, sees terminal immediately, can interact with prompts, workflow completes, exit-code shown, user clicks back to dashboard
- [ ] Scenario 2: User starts workflow, loses internet connection, reconnects, terminal buffer restored, workflow continues seamlessly
- [ ] Scenario 3: User starts 3 workflows simultaneously, switches between them via dashboard, each terminal shows correct output

**Notes:**
- Tests marked with "Requires MCP: yes" are optional (skip if Playwright not available)
- Integration validation runs in Phase 4.5 of execute-tasks
- If integration tests fail, an integration-fix story will be created automatically

## Spec Documentation

- Requirements Clarification: agent-os/specs/2026-02-02-workflow-terminal-integration/requirements-clarification.md
- Implementation Plan: agent-os/specs/2026-02-02-workflow-terminal-integration/implementation-plan.md
- Story Index: agent-os/specs/2026-02-02-workflow-terminal-integration/story-index.md
- Stories: agent-os/specs/2026-02-02-workflow-terminal-integration/stories/
- Effort Estimation: agent-os/specs/2026-02-02-workflow-terminal-integration/effort-estimation.md
