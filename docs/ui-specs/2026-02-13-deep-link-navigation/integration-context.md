# Integration Context - Deep Link Navigation

## Completed Stories

| Story ID | Summary | Key Files |
|----------|---------|-----------|
| DLN-001 | Router Service Foundation - central hash-based routing singleton | `router.service.ts`, `route.types.ts`, `app.ts` |
| DLN-002 | Dashboard Deep Links - spec selection and back navigation update URL, page reload restores spec state | `dashboard-view.ts` |
| DLN-003 | Chat Deep Links - minimal router integration, route-changed subscription for future session deep links | `chat-view.ts` |
| DLN-004 | Workflow Deep Links - URL updates on execution selection, restores active execution from URL on reload, stale ID fallback | `workflow-view.ts` |
| DLN-005 | Settings Deep Links - active tab reflected in URL, restores tab on reload, invalid tab fallback to default | `settings-view.ts` |
| DLN-006 | Edge Case Handling - toast feedback for invalid deep links, URL correction on spec/workflow not found | `dashboard-view.ts`, `workflow-view.ts` |
| DLN-997 | Code Review - full diff review, no critical/major issues, review-report.md created | `review-report.md` |
| DLN-998 | Integration Validation - TS compilation (0 new errors), Vite build OK, E2E via Chrome DevTools MCP passed, all component connections verified | `story-998-integration-validation.md` |

## New Exports & APIs

### Services
- `agent-os-ui/ui/src/services/router.service.ts` -> `routerService` singleton
  - `navigate(view: ViewType, segments?: string[])` - programmatic navigation
  - `on('route-changed', handler)` / `off('route-changed', handler)` - subscribe to route changes
  - `getCurrentRoute(): ParsedRoute | null` - get current parsed route
  - `parseHash(hash: string): ParsedRoute` - parse a hash string
  - `init()` - initialize and process current URL

### Types
- `agent-os-ui/ui/src/types/route.types.ts`
  - `ViewType` = `'dashboard' | 'chat' | 'workflows' | 'settings' | 'not-found'`
  - `ParsedRoute` = `{ view: ViewType, params: Record<string, string>, segments: string[] }`
  - `RouteChangeHandler` = `(route: ParsedRoute) => void`
  - `VALID_VIEWS` - readonly array of valid view names
  - `DEFAULT_VIEW` = `'dashboard'`

## Integration Notes

- `app.ts` now uses `routerService` instead of direct `window.location.hash` manipulation
- All views get their route via the `currentRoute` state in app.ts, which is updated by the router service
- The `navigateTo()` method in app.ts now delegates to `routerService.navigate()`
- `dashboard-view.ts` also uses `routerService.navigate()` for workflow navigation
- `ParsedRoute.segments` contains URL segments after the view for deep linking (e.g. `['spec', '2026-02-10-my-feature', 'kanban']`)
- `ParsedRoute.params` is currently empty but reserved for future named parameter extraction
- `dashboard-view.ts` subscribes to `route-changed` events for browser back/forward support
- Deep link pattern for dashboard: `#/dashboard/spec/{specId}` restores spec kanban view on page reload
- `dashboard-view.ts` uses `pendingSpecId` to defer spec loading until specs list is available
- `chat-view.ts` subscribes to `route-changed` events (no-op handler for now, ready for future session deep links)
- Chat URL pattern: `#/chat` (no sub-segments yet; future: `#/chat/{sessionId}`)
- `workflow-view.ts` subscribes to `route-changed` events and updates URL via `routerService.navigate('workflows', [executionId])`
- Workflow URL pattern: `#/workflows/{executionId}` for active execution, `#/workflows` for list view
- Stale workflow IDs (ephemeral executions no longer in executionStore) gracefully fall back to `#/workflows`
- `settings-view.ts` subscribes to `route-changed` events and updates URL via `routerService.navigate('settings', [section])`
- Settings URL pattern: `#/settings/{tab}` where tab is `models`, `general`, or `appearance`; `#/settings` defaults to `models`
- Invalid settings tab names are silently corrected by navigating to `#/settings` (default tab)
- DLN-006: Non-existent spec IDs in URL show "Spec nicht gefunden" toast and correct URL to `#/dashboard`
- DLN-006: `onSpecsError` handler detects deep-link failures, shows toast, and falls back to spec list
- DLN-006: Stale workflow execution IDs in URL now show "Workflow nicht gefunden" toast (previously silent)
- DLN-006: Empty hash segments (e.g., `#/dashboard///`) already handled by `parseHash()` via `filter(Boolean)`
- DLN-006: Completely invalid paths (e.g., `#/komplett/ungueltig`) route to `not-found` view via router service

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| `agent-os-ui/ui/src/services/router.service.ts` | Created | DLN-001 |
| `agent-os-ui/ui/src/types/route.types.ts` | Created | DLN-001 |
| `agent-os-ui/ui/src/app.ts` | Modified | DLN-001 |
| `agent-os-ui/ui/src/views/dashboard-view.ts` | Modified | DLN-001, DLN-002 |
| `agent-os-ui/ui/src/views/chat-view.ts` | Modified | DLN-003 |
| `agent-os-ui/ui/src/views/workflow-view.ts` | Modified | DLN-004 |
| `agent-os-ui/ui/src/views/settings-view.ts` | Modified | DLN-005 |
| `agent-os-ui/ui/src/views/dashboard-view.ts` | Modified | DLN-006 |
| `agent-os-ui/ui/src/views/workflow-view.ts` | Modified | DLN-006 |
