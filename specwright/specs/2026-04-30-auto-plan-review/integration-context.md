# Integration Context

## Completed Stories

| Story | Summary | Key Files |
|-------|---------|-----------|
| APR-001 | Plan-detection infra in CloudTerminalManager: PLAN_BOX_PATTERN, planReviewEnabled, lastDataAt, waitForIdle, triggerManualReview | `ui/src/server/services/cloud-terminal-manager.ts` |
| APR-002 | PlanBufferExtractor: ANSI-strip + TUI-box parsing from PTY buffer | `ui/src/server/utils/plan-buffer-extractor.ts` |
| APR-004 | reviewPrompt field in GeneralConfig + WS handlers plan-review:prompt.get|update | `ui/src/server/general-config.ts`, `ui/src/server/websocket.ts` |
| APR-005 | ExternalReviewer: SDK wrapper with CLAUDE_CONFIG_DIR per provider + withTimeout(60s) | `ui/src/server/services/external-reviewer.ts` |
| APR-006 | PlanReviewOrchestrator: plan-detected subscriber, parallel reviewers, aggregate + inject | `ui/src/server/services/plan-review-orchestrator.ts` |
| APR-007 | WS protocol: PlanReviewOrchestrator wired in WebSocketHandler, config.update + trigger.manual handlers, snapshot push on create/resume | `ui/src/server/websocket.ts`, `ui/src/shared/types/plan-review.protocol.ts` |
| APR-011 | Frontend wiring: sidebar fetches providers once, tabs hosts toggle in header bar, session renders plan-review-block + exposes public WS send methods | `aos-cloud-terminal-sidebar.ts`, `aos-terminal-tabs.ts`, `aos-terminal-session.ts` |

## New Exports & APIs

### Components

- `ui/frontend/src/components/terminal/aos-plan-review-block.ts` → `<aos-plan-review-block>`
  - Shadow DOM Lit component; `sessionId: string` property filters gateway messages to the owning session
  - Listens: `plan-review:started` (resets + expands), `plan-review:reviewer.result` (per-reviewer status), `plan-review:injected` (marks done), `plan-review:error` (error state)
  - Renders nothing when `reviewState === 'idle'`; shows collapsible header with Running/Done/Error badge once active
  - Per-reviewer sub-blocks (collapsed by default) show output or error text on expand
  - `source` prop drives "(manual)" label suffix when triggered manually
  - Embedded in `aos-terminal-session` below the xterm panel (APR-011)

- `ui/frontend/src/components/settings/aos-review-prompt-editor.ts` → `<aos-review-prompt-editor>`
  - Self-contained Lit component (light DOM), no props required
  - On mount: sends `plan-review:prompt.get` via gateway, displays loaded prompt in textarea
  - Save button: sends `plan-review:prompt.update` with `{ prompt }`, disabled when not dirty or empty
  - Handles `plan-review:prompt` (success) and `plan-review:error` responses
  - Embedded in `settings-view.ts` general section via `<aos-review-prompt-editor></aos-review-prompt-editor>`

### Services

- `ui/src/server/services/plan-review-orchestrator.ts` → `PlanReviewOrchestrator` (extends EventEmitter)
  - `new PlanReviewOrchestrator(cloudTerminalManager)` — subscribes to `session.plan-detected` in constructor
  - `setTabConfig(sessionId, { enabled, reviewers }): void` — update per-session config + syncs `setPlanReviewEnabled` on CTM
  - `triggerManualReview(sessionId): void` — delegates to `cloudTerminalManager.triggerManualReview()`
  - `sendSnapshot(sessionId, ws: WebSocket): void` — sends `plan-review:config.snapshot` directly to WS client
  - Emits: `plan-review:started(sessionId, source, reviewerCount)`, `plan-review:reviewer.result(sessionId, providerId, status, output?, error?)`, `plan-review:aggregated(sessionId, aggregatedText)`, `plan-review:injected(sessionId)`, `plan-review:error(sessionId, message)`
  - Per-session lock prevents concurrent reviews; `Promise.allSettled` for resilient parallel reviewer calls
  - No inject if all reviewers fail; inject waits for `waitForIdle(sessionId, 500)` before `sendInput`

- `ui/src/server/services/cloud-terminal-manager.ts` → `CloudTerminalManager`
  - `setPlanReviewEnabled(sessionId, enabled: boolean): void` — enables/disables plan-box scanning per session
  - `triggerManualReview(sessionId): void` — emits `session.plan-detected` with extracted buffer text and `source='manual'`
  - `waitForIdle(sessionId, idleMs: number): Promise<void>` — resolves when no terminal.data for `idleMs`ms, or after 5s timeout
  - Event: `session.plan-detected(sessionId, planText, source: 'auto'|'manual')` — plan box detected
  - Export: `PLAN_BOX_PATTERN` — regex matching `╰─{10,}╯` TUI box closing bars

### Config / Persistence

- `ui/src/server/general-config.ts` → `getReviewPrompt(projectPath?: string): string` — returns current review prompt (default or stored)
- `ui/src/server/general-config.ts` → `updateGeneralConfig({ reviewPrompt }, projectPath?)` — persists non-empty prompt to `config/general-config.json`
- `ui/src/server/general-config.ts` → `DEFAULT_REVIEW_PROMPT` — exported default prompt constant

### Hooks / Utilities

- `ui/src/server/utils/plan-buffer-extractor.ts` → `new PlanBufferExtractor().extract(rawBuffer: string): string` — strips ANSI/OSC/CR from PTY buffer, finds last TUI box ╭…╰, falls back to last 8KB; throws if result is empty
- `ui/src/server/services/external-reviewer.ts` → `withTimeout<T>(fn, ms): Promise<T>` — abort-controller-based timeout helper
- `ui/src/server/services/external-reviewer.ts` → `new ExternalReviewer().reviewPlan(prompt, providerId, modelId, projectPath): Promise<string>` — spawns SDK query with `CLAUDE_CONFIG_DIR=~/.claude-{providerId}`, 60s timeout

### Types / Interfaces

- `ui/src/server/services/plan-review-orchestrator.ts` → `ReviewerConfig { providerId: string; modelId: string | undefined }`
- `ui/src/server/services/plan-review-orchestrator.ts` → `TabReviewConfig { enabled: boolean; reviewers: ReviewerConfig[] }`
- `ui/src/shared/types/plan-review.protocol.ts` → all WS message interfaces: `PlanReviewConfigSnapshot`, `PlanReviewStarted`, `PlanReviewReviewerResult`, `PlanReviewAggregated`, `PlanReviewInjected`, `PlanReviewError`, `PlanReviewConfigUpdate`, `PlanReviewTriggerManual`

## File Change Summary

| File | Change | Task |
|------|--------|------|
| `ui/src/server/services/cloud-terminal-manager.ts` | Modified | APR-001 |
| `ui/src/server/utils/plan-buffer-extractor.ts` | Created | APR-002 |
| `ui/tests/unit/plan-buffer-extractor.test.ts` | Created | APR-002 |
| `ui/src/server/general-config.ts` | Modified | APR-004 |
| `ui/src/server/websocket.ts` | Modified | APR-004 |
| `ui/src/server/services/external-reviewer.ts` | Created | APR-005 |
| `ui/src/server/services/plan-review-orchestrator.ts` | Created | APR-006 |
| `ui/src/shared/types/plan-review.protocol.ts` | Created | APR-007 |
| `ui/src/server/websocket.ts` | Modified (APR-007: orchestrator wiring, listeners, handlers, snapshot push) | APR-007 |
| `ui/frontend/src/components/terminal/aos-plan-review-block.ts` | Created | APR-009 |
| `ui/frontend/src/components/settings/aos-review-prompt-editor.ts` | Created | APR-010 |
| `ui/frontend/src/views/settings-view.ts` | Modified (import + embed) | APR-010 |
| `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts` | Modified (providers fetch, snapshot handler, toggle event relay) | APR-011 |
| `ui/frontend/src/components/terminal/aos-terminal-tabs.ts` | Modified (toggle in header bar, provider/config props) | APR-011 |
| `ui/frontend/src/components/terminal/aos-terminal-session.ts` | Modified (plan-review-block embed, public WS send methods) | APR-011 |

## Integration Notes
- `PlanBufferExtractor` is consumed by `CloudTerminalManager.detectPlanBox()` and `CloudTerminalManager.triggerManualReview()` (added in APR-001) via `new PlanBufferExtractor().extract(session.buffer.join(''))`
- WS `plan-review:prompt.get` → responds with `{ type: 'plan-review:prompt', prompt }`. WS `plan-review:prompt.update` → `{ prompt: string }` payload, validates non-empty, responds same type. Errors respond as `plan-review:error`.
- `PlanReviewOrchestrator` (APR-006) must call `getReviewPrompt()` from `general-config.ts` — no per-tab prompt, single global default.
- APR-007 (WebSocket protocol) done: `PlanReviewOrchestrator` instantiated in `WebSocketHandler`, `setTabConfig`/`triggerManualReview` called from `plan-review:config.update` / `plan-review:trigger.manual` handlers; all 5 orchestrator events forwarded via `broadcast()`; `sendSnapshot()` called after `cloud-terminal:created` and on `cloud-terminal:resume` success.
- Frontend can import `plan-review.protocol.ts` types for type-safe gateway message handling.
- APR-011 wiring: `aos-cloud-terminal-sidebar` fetches providers on connect/reconnect via `model.providers.list`; listens for `plan-review:config.snapshot` to update per-session toggle state; catches `auto-review-config-changed`/`auto-review-trigger-manual` DOM events from tabs and relays to the correct `aos-terminal-session` via public methods `sendPlanReviewConfigUpdate` / `sendPlanReviewTriggerManual`. Session elements are identified by `data-session-id="${session.id}"` attribute. Toggle rendered at right end of tabs-container bar for active session only (when `activeTerminalSessionId` is set).
