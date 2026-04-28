# Integration Context

## Completed Stories

| Story | Summary | Key Files |
|-------|---------|-----------|
| CCG-001 | Extended ProjectConcurrencyGate with static global counter, acquireGlobalOnly/releaseGlobalOnly, onQueued listener | `ui/src/server/services/project-concurrency-gate.ts` |
| CCG-003 | Wrapped chat-send spawn paths with global gate; sends chat.queued WS-event before blocking acquire | `ui/src/server/claude-handler.ts` |

## New Exports & APIs

### Components
_None yet_

### Services
- `ui/src/server/services/project-concurrency-gate.ts` → `ProjectConcurrencyGate.acquireGlobalOnly(): Promise<void>` — acquires one global slot, blocks if at cap
- `ui/src/server/services/project-concurrency-gate.ts` → `ProjectConcurrencyGate.releaseGlobalOnly(): void` — releases one global slot
- `ui/src/server/services/project-concurrency-gate.ts` → `ProjectConcurrencyGate.onQueued(fn): () => void` — register listener called before any blocking acquire
- `ui/src/server/services/project-concurrency-gate.ts` → `ProjectConcurrencyGate.globalActive: number` — currently running global slots
- `ui/src/server/services/project-concurrency-gate.ts` → `ProjectConcurrencyGate.globalWaiting: number` — waiters in global queue
- `ui/src/server/services/project-concurrency-gate.ts` → `ProjectConcurrencyGate.globalMax: number` — effective cap (env-configured, max 4)
- `ui/src/server/services/project-concurrency-gate.ts` → `ProjectConcurrencyGate.resetForTests(): void` — reset static state for test isolation

### Hooks / Utilities
_None yet_

### Types / Interfaces
- `ui/src/server/services/project-concurrency-gate.ts` → `GlobalGateState` — `{ running: number; max: number; waiting: number }`

## Integration Notes

**chat.queued WS event** (CCG-003): Sent to a specific client before a blocking `acquireGlobalOnly()` call in `streamClaudeCodeResponse` and `streamClaudeCodeResponseWithImages`. Shape:
```json
{ "type": "chat.queued", "reason": "claude_capacity", "state": { "running": N, "waiting": N, "max": N } }
```
Frontend banner (CCG-004) should show when this event is received and hide when the first `chat.stream` event arrives.

**Release idempotency**: Both chat-send paths use a `releaseOnce` closure (boolean flag) so multiple resolution paths (close/error/early-reject) never double-release.

**CCG-002 (workflow-executor.ts)**: Still in_progress — wraps Fallback --print, runClaudeCommand, Resume-nach-Question. Does NOT gate the PTY path in startBacklogStoryExecution (already gated via orchestrator).
