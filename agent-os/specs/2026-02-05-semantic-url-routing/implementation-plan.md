# Implementation Plan: Semantic URL Routing

## Architecture Overview

### Current State
- Hash-based routing (`#/route`) in `app.ts` with 4 top-level routes
- Dashboard-View manages 6 internal sub-views via `@state() viewMode`
- No URL persistence for sub-views → state loss on reload
- `sessionStorage` used for cross-route workflow handoff

### Target State
- History API with 14 named routes
- Custom lightweight router singleton (`router.ts`)
- All views derive state from URL parameters
- Browser back/forward works correctly
- Legacy hash URLs redirect automatically

## Router Module Design

### New File: `ui/src/router.ts`

**Pattern Matching Engine:**
- Routes defined as patterns with `:paramName` segments
- Compiled to RegExp at registration time
- Named capture groups for parameter extraction

**Route Registry (14 routes):**
```
/                                    → root (redirects to /specs)
/specs                               → specs
/specs/:specId/kanban                → spec-kanban
/specs/:specId/stories/:storyId      → spec-story
/backlog                             → backlog
/backlog/:storyId                    → backlog-story
/docs                                → docs
/chat                                → chat
/workflows                           → workflows
/workflows/:executionId              → workflow-execution
/settings                            → settings
/settings/models                     → settings-models
/settings/general                    → settings-general
/settings/appearance                 → settings-appearance
```

**Public API:**
- `navigate(path, options?)` – Push state and emit route change
- `navigateByName(name, params?)` – Build path from name + params, then navigate
- `buildPath(name, params?)` – URL generation for link hrefs
- `getCurrentRoute()` – Current RouteMatch
- `onRouteChange(callback)` – Subscribe to route changes (returns unsubscribe fn)
- `start()` / `destroy()` – Lifecycle management

## File Changes

### 1. `ui/src/router.ts` (NEW)
- Router class with pattern matching, History API, popstate
- Singleton export
- Legacy hash redirect on start
- ~150-200 LOC

### 2. `ui/src/app.ts` (MAJOR)
- Remove: hash-based routing, `handleHashChange()`, `navigateTo()`, `boundHashHandler`
- Add: Router import, `RouteMatch` state, router subscription
- Modify: `renderView()` switches on `route.name`, passes `.route` to views
- Modify: Sidebar nav items with path-based active detection
- Modify: `handleWorkflowStart()` uses query params instead of sessionStorage
- Add: Delegated link click handler for `<a>` tags

### 3. `ui/src/views/dashboard-view.ts` (MAJOR)
- Add: `@property() route: RouteMatch`
- Add: `handleRouteChange()` in `updated()` – derives viewMode from route
- Replace: 8+ internal `this.viewMode = '...'` calls with `router.navigate()`
- Add: State restoration from URL params (specId, storyId) on mount/reload
- Guard: Data handlers check route params match before applying data

### 4. `ui/src/views/settings-view.ts` (MINOR)
- Add: `@property() route: RouteMatch`
- Derive: `activeSection` from route name in `updated()`
- Replace: `handleSectionChange()` with `router.navigate()`

### 5. `ui/src/views/workflow-view.ts` (MODERATE)
- Add: `@property() route: RouteMatch`
- Replace: sessionStorage pendingWorkflow with URL query params
- Handle: `/workflows/:executionId` route for execution deep-linking

### 6. `ui/src/views/not-found-view.ts` (MINOR)
- Change: `href="#/dashboard"` → `href="/specs"`

### 7. `ui/vite.config.ts` (MINOR)
- Verify SPA fallback works with nested routes (Vite default handles this)

### 8. `src/server/index.ts` (MINOR, production only)
- Add: `express.static()` and SPA catch-all route

## Implementation Phases

### Phase 1: Router Foundation
- Create `router.ts` with full pattern matching and History API
- No UI changes yet

### Phase 2: Vite Configuration
- Verify SPA fallback works with nested routes

### Phase 3: App Shell Migration
- Modify `app.ts` to use router
- Legacy hash redirect
- Top-level navigation works

### Phase 4: Dashboard Deep Linking
- Route-driven viewMode in dashboard-view
- Spec/Story/Backlog/Docs deep linking

### Phase 5: Settings & Workflow Deep Linking
- Settings sub-routes
- Workflow query params and execution routing

### Phase 6: Cleanup & Production
- Remove sessionStorage usage
- Remove all hash references
- Express SPA fallback
- TypeScript check

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Vite not serving nested paths | Test early; `appType: 'spa'` is default |
| Stale state on back/forward | Clear state in `handleRouteChange()` |
| Race condition: route vs WebSocket | Guard with `wsConnected && projectCtx` |
| Spec IDs with special chars | Use `encodeURIComponent`/`decodeURIComponent` |
| Async data for wrong route | Check route params in data handlers |
| Legacy bookmarks breaking | Hash redirect in `router.start()` |
