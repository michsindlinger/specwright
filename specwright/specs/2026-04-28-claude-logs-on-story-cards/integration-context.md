# Integration Context

## Completed Stories

| Story | Summary | Key Files |
|-------|---------|-----------|
| CLOG-001 | Backend exposes `sessionId` on Auto-Mode `SlotSnapshot` (active slots only) | `auto-mode.protocol.ts`, `auto-mode-orchestrator-base.ts`, `workflow-executor.ts` |
| CLOG-002 | Hand-rolled `stripAnsi()` util for CSI/OSC/single-char ESC sequences | `ui/frontend/src/utils/ansi-strip.ts` |
| CLOG-003 | Standalone `<aos-claude-log-panel>` Lit component with RAF-batch + ANSI-strip + buffer-hydration + reconnect | `ui/frontend/src/components/aos-claude-log-panel.ts` |
| CLOG-004 | story-card `sessionId` prop + Claude-Logs toggle + dashboard storyId→sessionId propagation via `AutoModeProgress.sessionId` | `story-card.ts`, `kanban-board.ts`, `dashboard-view.ts` |
| CLOG-005 | E2E smoke + edge-case tests (parallel slots, hydration, reload-reset, session-end, race, reconnect) — happy-dom substitute for Playwright | `ui/tests/unit/clog-005-e2e-edge-cases.test.ts`, `user-todos.md` |

## New Exports & APIs

### Components
- `ui/frontend/src/components/aos-claude-log-panel.ts` → `<aos-claude-log-panel sessionId="…">` — Shadow-DOM Lit element. Subscribes to `cloud-terminal:data` (sessionId-filtered), strips ANSI, RAF-batches into a single `logText` re-render per frame, auto-scrolls to bottom unless user has scrolled up (with "↓ Live folgen" resume chip). On `connectedCallback` and on `gateway.connected` (reconnect) it sends `cloud-terminal:buffer-request` and hydrates from `cloud-terminal:buffer-response`. Buffer cap 200_000 chars (sliding window). Switches subscription cleanly when `sessionId` property changes. Used by `<aos-story-card>` (CLOG-004) conditional on `story.sessionId !== undefined`.
- `ui/frontend/src/components/story-card.ts` → `<aos-story-card .sessionId=…>` — new optional Lit property `sessionId?: string` plus `@state logExpanded`. Renders Claude-Logs toggle button only when `sessionId` is set. Click toggles inline `<aos-claude-log-panel .sessionId=${this.sessionId}>` below the status badge. Toggle button stops click propagation so it does not trigger `story-select`.

### Services
- `ui/src/server/workflow-executor.ts` → `getSpecAutoModeSnapshot(specId)` and `getBacklogAutoModeSnapshot(projectPath)` now return `activeSlots[].sessionId?: string` (Cloud-Terminal session id of the running slot). `queuedSlots[].sessionId` stays undefined.

### Hooks / Utilities
- `ui/frontend/src/utils/ansi-strip.ts` → `stripAnsi(input: string): string` — removes CSI (SGR/cursor/erase), OSC (window title / hyperlink, BEL or ST terminator) and single-char Fe escape sequences. Hand-rolled regex, no dependency. Idempotent. Used by `<aos-claude-log-panel>` (CLOG-003) for both streamed chunks and buffer hydration.

### Types / Interfaces
- `ui/src/shared/types/auto-mode.protocol.ts` → `SlotSnapshot.sessionId?: string` — additive, optional. Frontend can subscribe to `cloud-terminal:data` per story by reading `activeSlots[*].sessionId`.
- `ui/src/server/services/auto-mode-orchestrator-base.ts` → `OrchestratorSlotSnapshot.sessionId?: string` — populated from `AutoModeStorySlot.getSessionId() ?? undefined` inside `getSnapshot()`.
- `ui/frontend/src/components/kanban-board.ts` → `AutoModeProgress.sessionId?: string` — additive optional carrier for the running slot's Cloud-Terminal session id. `kanban-board` builds a `storyId → sessionId` lookup from `autoModeProgressBoard.slots` at render time and passes the resolved value to `<aos-story-card .sessionId=…>`.

## Integration Notes
- WebSocket payloads `specs.kanban` and `backlog.kanban` already pass `autoMode` through unchanged — `sessionId` propagates without further server changes.
- `dashboard-view._hydrateSpecBoardFromSnapshot` and `_hydrateBacklogBoardFromSnapshot` copy `s.sessionId` from each active `SlotSnapshot` into the corresponding `AutoModeProgress` entry. Queued slots intentionally have no `sessionId`.
- `<aos-story-card>` only renders the Claude-Logs toggle when `sessionId !== undefined`. When the slot finishes and the snapshot drops the `sessionId`, the toggle disappears on next render and any expanded panel collapses with it.
- `@state logExpanded` on `<aos-story-card>` persists across `sessionId` transitions: if a session ends and a new `sessionId` is assigned to the same card instance, the panel re-mounts in the previously open state without a second click. CLOG-005 tests document and lock this behavior.
- Plan-Section 3.5 originally specified Playwright. `ui/` does not depend on Playwright; CLOG-005 covers the smoke scenarios (parallel slots, hydration, reload-reset, session-end) on the component-integration level via happy-dom. Optional follow-up tracked in `user-todos.md`.

## File Change Summary

| File | Change | Story |
|------|--------|-------|
| `ui/src/shared/types/auto-mode.protocol.ts` | Modified | CLOG-001 |
| `ui/src/server/services/auto-mode-orchestrator-base.ts` | Modified | CLOG-001 |
| `ui/src/server/workflow-executor.ts` | Modified | CLOG-001 |
| `ui/tests/unit/clog-001-snapshot-sessionid.test.ts` | Created | CLOG-001 |
| `ui/tests/unit/pam-fix-003-snapshot.test.ts` | Modified (fixture: `getSessionId` added) | CLOG-001 |
| `ui/frontend/src/utils/ansi-strip.ts` | Created | CLOG-002 |
| `ui/tests/unit/clog-002-ansi-strip.test.ts` | Created (20 tests) | CLOG-002 |
| `ui/frontend/src/components/aos-claude-log-panel.ts` | Created | CLOG-003 |
| `ui/tests/unit/clog-003-claude-log-panel.test.ts` | Created (14 tests, happy-dom) | CLOG-003 |
| `ui/frontend/src/components/story-card.ts` | Modified (sessionId prop + log toggle + panel render) | CLOG-004 |
| `ui/frontend/src/components/kanban-board.ts` | Modified (`AutoModeProgress.sessionId`, sessionId map → story-card) | CLOG-004 |
| `ui/frontend/src/views/dashboard-view.ts` | Modified (hydrate functions copy `sessionId` for active slots) | CLOG-004 |
| `ui/tests/unit/clog-004-integration.test.ts` | Created (8 tests, happy-dom) | CLOG-004 |
| `ui/tests/unit/clog-005-e2e-edge-cases.test.ts` | Created (17 tests, happy-dom: smoke + edge + race + reconnect) | CLOG-005 |
| `specwright/specs/2026-04-28-claude-logs-on-story-cards/user-todos.md` | Created (Playwright follow-up) | CLOG-005 |
