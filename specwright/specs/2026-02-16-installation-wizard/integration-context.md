# Integration Context - Installation Wizard

## Completed Stories

| Story ID | Summary | Key Files |
|----------|---------|-----------|
| IW-001 | Specwright-Erkennung: validateProject() returns hasSpecwright, hasProductBrief, fileCount | project-context.service.ts, project.routes.ts |
| IW-002 | Installation Wizard Modal: Multi-step wizard with install + planning command selection | aos-installation-wizard-modal.ts |

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

## Integration Notes

- `validateProject()` now returns `valid: true` even for projects without specwright/ (sets `hasSpecwright: false`)
- `switchProject()` still requires specwright to be installed (checks `hasSpecwright` from validation)
- The frontend wizard (IW-002) should use the `/api/project/validate` response to decide whether to show the wizard
- API Contract for handover: `POST /api/project/validate` -> `{ valid: boolean, hasSpecwright: boolean, hasProductBrief: boolean, fileCount: number, name?: string, error?: string }`
- IW-002 wizard uses `hasSpecwright` to decide initial step: `false` -> install step, `true` -> selection step
- IW-002 wizard uses `hasProductBrief` to determine if wizard should appear at all (controlled by parent in IW-006)
- IW-002 wizard uses `fileCount` to show "existing project" hint (threshold: 10 files)
- IW-003 (Terminal Integration) should listen for `install-requested` event and `command-selected` event to run terminal commands
- IW-004 (Abbruch-Handling) should listen for `wizard-cancel` and `modal-close` events
- IW-006 (Router/Navigation) needs to wire wizard to app.ts, pass properties from validate response

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| ui/src/server/project-context.service.ts | Modified | IW-001 |
| ui/src/server/routes/project.routes.ts | Modified | IW-001 |
| ui/tests/unit/project-context.service.test.ts | Modified | IW-001 |
| ui/frontend/src/components/setup/aos-installation-wizard-modal.ts | Created | IW-002 |
| ui/frontend/src/styles/theme.css | Modified | IW-002 |
