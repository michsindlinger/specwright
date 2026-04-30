# Integration Context

## Completed Stories

| Story | Summary | Key Files |
|-------|---------|-----------|
| APR-001 | Plan-detection infra in CloudTerminalManager: PLAN_BOX_PATTERN, planReviewEnabled, lastDataAt, waitForIdle, triggerManualReview | `ui/src/server/services/cloud-terminal-manager.ts` |
| APR-002 | PlanBufferExtractor: ANSI-strip + TUI-box parsing from PTY buffer | `ui/src/server/utils/plan-buffer-extractor.ts` |

## New Exports & APIs

### Components
_None yet_

### Services

- `ui/src/server/services/cloud-terminal-manager.ts` → `CloudTerminalManager`
  - `setPlanReviewEnabled(sessionId, enabled: boolean): void` — enables/disables plan-box scanning per session
  - `triggerManualReview(sessionId): void` — emits `session.plan-detected` with extracted buffer text and `source='manual'`
  - `waitForIdle(sessionId, idleMs: number): Promise<void>` — resolves when no terminal.data for `idleMs`ms, or after 5s timeout
  - Event: `session.plan-detected(sessionId, planText, source: 'auto'|'manual')` — plan box detected
  - Export: `PLAN_BOX_PATTERN` — regex matching `╰─{10,}╯` TUI box closing bars

### Hooks / Utilities

- `ui/src/server/utils/plan-buffer-extractor.ts` → `new PlanBufferExtractor().extract(rawBuffer: string): string` — strips ANSI/OSC/CR from PTY buffer, finds last TUI box ╭…╰, falls back to last 8KB; throws if result is empty

### Types / Interfaces
_None yet_

## File Change Summary

| File | Change | Task |
|------|--------|------|
| `ui/src/server/services/cloud-terminal-manager.ts` | Modified | APR-001 |
| `ui/src/server/utils/plan-buffer-extractor.ts` | Created | APR-002 |
| `ui/tests/unit/plan-buffer-extractor.test.ts` | Created | APR-002 |

## Integration Notes
- `PlanBufferExtractor` is consumed by `CloudTerminalManager.detectPlanBox()` and `CloudTerminalManager.triggerManualReview()` (added in APR-001) via `new PlanBufferExtractor().extract(session.buffer.join(''))`
