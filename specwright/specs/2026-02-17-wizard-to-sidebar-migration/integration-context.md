# Integration Context - Wizard-to-Sidebar Migration

## Completed Stories

| Story ID | Summary | Key Files/Functions |
|----------|---------|---------------------|
| WSM-001 | Kachel-Logik: Removed disabled cards from not-installed/migration states, renamed event to start-setup-terminal | `ui/frontend/src/views/aos-getting-started-view.ts` |
| WSM-002 | Setup-Terminal in Sidebar: Event handler, shell terminal creation, auto-detect after install | `ui/frontend/src/app.ts`, `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts` |
| WSM-003 | Wizard removed, state renamed wizard*->project*, validation navigates to getting-started | `ui/frontend/src/app.ts` |

## New Exports & APIs

**Events:**
- `start-setup-terminal` event from `aos-getting-started-view` with `detail: { type: 'install' | 'migrate' }` - replaces old `start-wizard` event

**Methods:**
- `handleStartSetup(type: 'install' | 'migrate')` - private method in `AosGettingStartedView`, dispatches `start-setup-terminal` event
- `_handleStartSetupTerminal(e)` - private method in `AosApp`, handles `start-setup-terminal` event
- `_openSetupTerminalTab(setupType, projectPath)` - private method in `AosApp`, creates shell terminal and sends install/migrate command
- `_handleCloudTerminalClosed(msg)` - private method in `AosApp`, handles `cloud-terminal:closed` for setup session re-validation

**Interfaces:**
- `TerminalSession.isSetupSession?: boolean` - marks a session as setup (install/migrate)
- `TerminalSession.setupType?: 'install' | 'migrate'` - distinguishes install vs migrate

## Integration Notes

- The `start-setup-terminal` event bubbles and is composed, caught by `@start-setup-terminal` in `renderView()` of `app.ts`
- The old `@start-wizard` event handler was replaced by `@start-setup-terminal`
- Doppelklick-Schutz: `_openSetupTerminalTab` checks for existing setup sessions before creating new ones
- Auto-Detection: `cloud-terminal:closed` listener triggers `_validateProjectState()` on exit code 0
- Gateway listener registered in `connectedCallback()`, deregistered in `disconnectedCallback()`
- WSM-003: Wizard modal completely removed. State properties renamed: `wizardHasSpecwright`->`projectHasSpecwright`, `wizardHasProductBrief`->`projectHasProductBrief`, `wizardNeedsMigration`->`projectNeedsMigration`, `wizardValidationPending`->`projectValidationPending`
- WSM-003: `_validateAndTriggerWizard` replaced by `_validateAndNavigate` (navigates to getting-started instead of showing wizard)
- WSM-003: `_validateProjectForWizard` replaced by `_validateProjectState` (no wizard-specific logic)
- WSM-003: Removed methods: `_handleWizardComplete`, `_handleWizardCancel`
- WSM-003: Removed state: `showWizard`, `wizardProjectPath`, `wizardFileCount`
- WSM-003: Removed `projectStateService.setWizardNeeded/isWizardNeeded/clearWizardNeeded` calls

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| ui/frontend/src/views/aos-getting-started-view.ts | Modified | WSM-001 |
| ui/frontend/src/app.ts | Modified | WSM-002 |
| ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts | Modified | WSM-002 |
| ui/frontend/src/app.ts | Modified | WSM-003 |
