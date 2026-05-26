# Integration Context

## Completed Stories

| Story | Summary | Key Files |
|-------|---------|-----------|
| MOB-001 | Mobile tokens & .touch-target utility in theme.css | `ui/frontend/src/styles/theme.css` |
| MOB-002 | MobileBreakpointController ReactiveController | `ui/frontend/src/controllers/mobile-breakpoint-controller.ts` |
| MOB-003 | aos-mobile-sheet bottom/top/left sheet primitive | `ui/frontend/src/components/mobile/aos-mobile-sheet.ts` |
| MOB-004 | aos-mobile-top-bar header with hamburger/logo/bell/avatar | `ui/frontend/src/components/mobile/aos-mobile-top-bar.ts` |
| MOB-005 | aos-mobile-project-scroller, chip, branch-row components | `ui/frontend/src/components/mobile/aos-mobile-project-scroller.ts`, `aos-mobile-project-chip.ts`, `aos-mobile-branch-row.ts` |
| MOB-006 | aos-mobile-segmented Tabs (Specs/Backlog/Docs switcher) | `ui/frontend/src/components/mobile/aos-mobile-segmented.ts` |
| MOB-007 | aos-mobile-bottom-nav sticky nav with FAB and Terminal badge | `ui/frontend/src/components/mobile/aos-mobile-bottom-nav.ts` |
| MOB-008 | focus-strip.derive.ts pure function + 16 Vitest tests | `ui/frontend/src/utils/focus-strip.derive.ts`, `ui/tests/unit/focus-strip.derive.test.ts` |
| MOB-015 | aos-mobile-session-tabs + aos-mobile-connection-bar | `ui/frontend/src/components/mobile/aos-mobile-session-tabs.ts`, `aos-mobile-connection-bar.ts` |

## New Exports & APIs

### Components
- `ui/frontend/src/components/mobile/aos-mobile-sheet.ts` → `<aos-mobile-sheet open position="bottom|top|left" dismissible>` — emits `sheet-close`
- `ui/frontend/src/components/mobile/aos-mobile-top-bar.ts` → `<aos-mobile-top-bar workspaceName breadcrumb avatarSrc avatarInitials notificationCount>` — emits `menu-open`, `avatar-tap`
- `ui/frontend/src/components/mobile/aos-mobile-project-chip.ts` → `<aos-mobile-project-chip projectId name ?active>` — emits `chip-tap` (detail: `{ projectId }`)
- `ui/frontend/src/components/mobile/aos-mobile-project-scroller.ts` → `<aos-mobile-project-scroller .gitStatus .prInfo>` — `@consume(projectContext)` internally, calls `switchProject` on chip tap; renders chips + branch-row
- `ui/frontend/src/components/mobile/aos-mobile-branch-row.ts` → `<aos-mobile-branch-row .gitStatus .prInfo>` — displays branch, ahead/behind pills, open PR badge, changed-files count
- `ui/frontend/src/components/mobile/aos-mobile-session-tabs.ts` → `<aos-mobile-session-tabs .sessions .activeSessionId>` — emits `session-select` (detail: `{ sessionId }`), `session-close` (detail: `{ sessionId, status, isWorkflow }`)
- `ui/frontend/src/components/mobile/aos-mobile-connection-bar.ts` → `<aos-mobile-connection-bar ?connected cloudHost branch>` — emits `kebab-tap`

### Services
_None yet_

### Hooks / Utilities
- `ui/frontend/src/controllers/mobile-breakpoint-controller.ts` → `MobileBreakpointController` — `new MobileBreakpointController(this)` in Lit host constructor; reads `controller.isMobile: boolean`; call `controller.onChange(cb)` to register resize-close callback

### Utilities
- `ui/frontend/src/utils/focus-strip.derive.ts` → `deriveFocusItems(specs: FocusSpecInfo[], backlog: FocusBacklogBoard | null, autoMode: FocusAutoModeSnapshot | null): FocusItem[]` — pure function, no Lit/DOM deps; call in `renderMobile()` to populate `<aos-mobile-focus-strip>`

### Types / Interfaces
- `FocusItem` `{ type: 'blocked-story'|'paused-auto-mode'|'incident', title, subtitle, accent: 'warning'|'error'|'info', targetRoute }` from `focus-strip.derive.ts`
- `FocusSpecInfo`, `FocusBacklogBoard`, `FocusAutoModeSnapshot`, `FocusIncident` — local input types (structurally compatible with dashboard-view's SpecInfo / BacklogKanbanBoard)

## Integration Notes
- `MobileBreakpointController` calls `host.addController(this)` in constructor — add it as a class field, not in `connectedCallback`.
- `onChange(callback)` must be registered after construction (e.g., in host constructor or `firstUpdated`) to receive breakpoint-change events.
- Clears `_changeCallback` on `hostDisconnected` — safe to call `onChange` again after reconnect.
- `aos-mobile-project-scroller` consumes `projectContext` internally via `@consume` — parent does NOT need to pass project list as properties; just pass `.gitStatus` and `.prInfo` from `app.ts` state.
- `aos-mobile-branch-row` renders `nothing` when `gitStatus?.isGitRepo` is false — safe to always include it.
- `deriveFocusItems` is a zero-import pure function — import directly from `focus-strip.derive.js` in dashboard-view. No context providers needed. Order: blocked-stories → paused-auto-mode → incidents.
- `FocusAutoModeSnapshot.paused` maps to `dashboard-view.autoModePaused` state; `incidents` maps to `KanbanBoard.activeIncidents` (filter per spec).
- `aos-mobile-session-tabs` accepts `TerminalSession[]` from `aos-cloud-terminal-sidebar.ts` — import type from `'../terminal/aos-cloud-terminal-sidebar.js'`. Uses `getTabTitle()` from `tab-title.js` for display.
- `aos-mobile-connection-bar`: `connected` = gateway.isConnected; `cloudHost` = active session's `projectPath` (or server hostname); `branch` = active git branch. All strings optional — component renders gracefully with empty values.
