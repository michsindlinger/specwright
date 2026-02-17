# Integration Context - Wizard-to-Sidebar Migration

## Completed Stories

| Story ID | Summary | Key Files/Functions |
|----------|---------|---------------------|
| WSM-001 | Kachel-Logik: Removed disabled cards from not-installed/migration states, renamed event to start-setup-terminal | `ui/frontend/src/views/aos-getting-started-view.ts` |

## New Exports & APIs

**Events:**
- `start-setup-terminal` event from `aos-getting-started-view` with `detail: { type: 'install' | 'migrate' }` - replaces old `start-wizard` event

**Methods:**
- `handleStartSetup(type: 'install' | 'migrate')` - private method in `AosGettingStartedView`, dispatches `start-setup-terminal` event

## Integration Notes

- The `start-setup-terminal` event bubbles and is composed, so it can be caught by any ancestor element
- WSM-002 needs to listen for this event (likely in `aos-app.ts` or sidebar component) to open a setup terminal tab
- The event detail `type` field determines whether to run install or migrate curl command

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| ui/frontend/src/views/aos-getting-started-view.ts | Modified | WSM-001 |
