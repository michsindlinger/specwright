# Integration Context

## Completed Stories

| Story | Summary | Key Files |
|-------|---------|-----------|
| CLOG-001 | Backend exposes `sessionId` on Auto-Mode `SlotSnapshot` (active slots only) | `auto-mode.protocol.ts`, `auto-mode-orchestrator-base.ts`, `workflow-executor.ts` |
| CLOG-002 | Hand-rolled `stripAnsi()` util for CSI/OSC/single-char ESC sequences | `ui/frontend/src/utils/ansi-strip.ts` |

## New Exports & APIs

### Components
_None yet_

### Services
- `ui/src/server/workflow-executor.ts` → `getSpecAutoModeSnapshot(specId)` and `getBacklogAutoModeSnapshot(projectPath)` now return `activeSlots[].sessionId?: string` (Cloud-Terminal session id of the running slot). `queuedSlots[].sessionId` stays undefined.

### Hooks / Utilities
- `ui/frontend/src/utils/ansi-strip.ts` → `stripAnsi(input: string): string` — removes CSI (SGR/cursor/erase), OSC (window title / hyperlink, BEL or ST terminator) and single-char Fe escape sequences. Hand-rolled regex, no dependency. Idempotent. Used by `<aos-claude-log-panel>` (CLOG-003) for both streamed chunks and buffer hydration.

### Types / Interfaces
- `ui/src/shared/types/auto-mode.protocol.ts` → `SlotSnapshot.sessionId?: string` — additive, optional. Frontend can subscribe to `cloud-terminal:data` per story by reading `activeSlots[*].sessionId`.
- `ui/src/server/services/auto-mode-orchestrator-base.ts` → `OrchestratorSlotSnapshot.sessionId?: string` — populated from `AutoModeStorySlot.getSessionId() ?? undefined` inside `getSnapshot()`.

## Integration Notes
- WebSocket payloads `specs.kanban` and `backlog.kanban` already pass `autoMode` through unchanged — `sessionId` propagates without further server changes.
- Frontend (CLOG-004) consumes `snap.activeSlots[i].sessionId` to build `storyId → sessionId` map for `<aos-story-card>`.

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
