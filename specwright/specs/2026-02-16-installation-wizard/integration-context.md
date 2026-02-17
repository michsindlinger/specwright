# Integration Context - Installation Wizard

## Completed Stories

| Story ID | Summary | Key Files |
|----------|---------|-----------|
| IW-001 | Specwright-Erkennung: validateProject() returns hasSpecwright, hasProductBrief, fileCount | project-context.service.ts, project.routes.ts |
| IW-002 | Installation Wizard Modal: Multi-step wizard with install + planning command selection | aos-installation-wizard-modal.ts |
| IW-003 | Terminal Integration: Embedded aos-terminal-session in wizard, cloud-terminal:create via gateway | aos-installation-wizard-modal.ts, theme.css |
| IW-004 | Wizard Abbruch-Handling: Cancel confirmation overlay, ESC handling, terminal kill on cancel, wizard-state persistence | aos-installation-wizard-modal.ts, project-state.service.ts |
| IW-005 | Getting Started View: Kontextabhaengige Aktions-Cards basierend auf hasProductBrief (Standard vs Planning) | aos-getting-started-view.ts |

## New Exports & APIs

**Services:**
- `ui/src/server/project-context.service.ts` -> `ValidateResult { valid, name?, error?, hasSpecwright?, hasProductBrief?, fileCount? }`
- `POST /api/project/validate` -> Response now includes `hasSpecwright: boolean`, `hasProductBrief: boolean`, `fileCount: number`

**Private Methods (in ProjectContextService):**
- `detectSpecwright(projectPath)` - Returns boolean, uses resolveProjectDir()
- `detectProductBrief(projectPath)` - Returns boolean, checks for product/product-brief.md
- `countTopLevelEntries(projectPath)` - Returns number, excludes hidden dirs and node_modules

**Components:**
- `ui/frontend/src/components/setup/aos-installation-wizard-modal.ts` -> `<aos-installation-wizard-modal>` with properties:
  - `open: boolean` - Controls visibility
  - `hasSpecwright: boolean` - Whether project has specwright/
  - `hasProductBrief: boolean` - Whether project has product brief
  - `fileCount: number` - Number of top-level files/dirs
  - `projectPath: string` - Project path
- Events emitted: `command-selected` (detail: `{ command: string, projectPath: string }`), `wizard-cancel`, `modal-close`, `install-requested` (detail: `{ projectPath: string }`)
- Public methods: `installSucceeded()`, `installFailed(error: string)` for external control of install step
- Exported types: `WizardStep`, `PlanningCommand`, `CommandSelectedDetail`

**Views:**
- `ui/frontend/src/views/aos-getting-started-view.ts` -> `<aos-getting-started-view>` with properties:
  - `hasProductBrief: boolean` - Controls which card set is shown (standard vs planning)
  - `hasSpecwright: boolean` - Controls whether cards are disabled with install hint
- Events emitted: `workflow-start-interactive` (detail: `{ commandId: string }`) - triggers workflow execution
- Standard cards (hasProductBrief=true): create-spec, add-todo, add-bug
- Planning cards (hasProductBrief=false): plan-product, plan-platform, analyze-product, analyze-platform

**Wizard State (in projectStateService):**
- `ui/frontend/src/services/project-state.service.ts` -> `projectStateService.isWizardNeeded(path)` - Returns boolean
- `ui/frontend/src/services/project-state.service.ts` -> `projectStateService.setWizardNeeded(path)` - Marks wizard needed
- `ui/frontend/src/services/project-state.service.ts` -> `projectStateService.clearWizardNeeded(path)` - Clears wizard needed

## Integration Notes

- `validateProject()` now returns `valid: true` even for projects without specwright/ (sets `hasSpecwright: false`)
- `switchProject()` still requires specwright to be installed (checks `hasSpecwright` from validation)
- The frontend wizard (IW-002) should use the `/api/project/validate` response to decide whether to show the wizard
- API Contract for handover: `POST /api/project/validate` -> `{ valid: boolean, hasSpecwright: boolean, hasProductBrief: boolean, fileCount: number, name?: string, error?: string }`
- IW-002 wizard uses `hasSpecwright` to decide initial step: `false` -> install step, `true` -> selection step
- IW-002 wizard uses `hasProductBrief` to determine if wizard should appear at all (controlled by parent in IW-006)
- IW-002 wizard uses `fileCount` to show "existing project" hint (threshold: 10 files)
- IW-003 Terminal Integration: Wizard now transitions to terminal step when user clicks "Framework installieren" or selects a planning command
  - `startTerminal(mode, command)` creates a cloud-terminal:create shell session, embeds aos-terminal-session, and injects the command
  - On terminal close with exit 0: install mode auto-advances to selection, planning mode fires command-selected event
  - On error: shows error message with retry button
  - New CSS classes: `installation-wizard__terminal-*` and `installation-wizard__content--terminal`
- IW-004 Abbruch-Handling: Cancel button and ESC now show a confirmation overlay with context-dependent message
  - `projectStateService.isWizardNeeded(path)` checks if wizard should reappear for a project
  - `projectStateService.setWizardNeeded(path)` called on modal open
  - `projectStateService.clearWizardNeeded(path)` called only on successful wizard completion (planning command done)
  - Cancel during terminal step sends `cloud-terminal:kill` to terminate the running session
  - `wizard-cancel` event fired after user confirms cancellation
- IW-005 Getting Started View: Standalone view component with two card sets
  - IW-006 needs to: import and render `<aos-getting-started-view>` in app.ts route handler
  - IW-006 needs to: pass `hasProductBrief` and `hasSpecwright` from project validation response
  - IW-006 needs to: listen for `workflow-start-interactive` event and route to workflow execution
  - IW-006 needs to: add `/getting-started` route in router
  - IW-006 needs to: add "Getting Started" menu item in navigation
- IW-006 (Router/Navigation) needs to wire wizard to app.ts, pass properties from validate response
- IW-006 should use `projectStateService.isWizardNeeded(path)` to decide whether to re-show wizard for a project

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| ui/src/server/project-context.service.ts | Modified | IW-001 |
| ui/src/server/routes/project.routes.ts | Modified | IW-001 |
| ui/tests/unit/project-context.service.test.ts | Modified | IW-001 |
| ui/frontend/src/components/setup/aos-installation-wizard-modal.ts | Created | IW-002 |
| ui/frontend/src/styles/theme.css | Modified | IW-002, IW-003 |
| ui/frontend/src/services/project-state.service.ts | Modified | IW-004 |
| ui/frontend/src/views/aos-getting-started-view.ts | Modified | IW-005 |
