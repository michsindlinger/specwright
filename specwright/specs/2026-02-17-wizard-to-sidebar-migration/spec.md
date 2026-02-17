# Spec Requirements Document

> Spec: Wizard-to-Sidebar Migration
> Created: 2026-02-17
> Status: Planning

## Overview

Ersetzt den mehrstufigen Installations-/Migrations-Wizard-Modal durch einen schlanken Flow, bei dem Setup-Befehle direkt im Cloud Terminal der Sidebar ausgefuehrt werden. Die Getting Started View wird zum einzigen Entry Point fuer Setup-Aktionen mit zustandsbasierter Kachel-Logik.

## User Stories

- WSM-001: Getting Started Kachel-Logik (keine Kacheln bei fehlender Installation/Migration)
- WSM-002: Setup-Terminal Integration (Shell-Session in Sidebar mit Auto-Execute)
- WSM-003: Wizard Entfernung & State Cleanup (Modal entfernen, Properties umbenennen, Validation-Flow anpassen)

## Spec Scope

- Getting Started View: Zustandsbasierte Kachel-Anzeige (keine Kacheln bei !hasSpecwright/needsMigration)
- Neues Event `start-setup-terminal` von Getting Started an app.ts
- Neue Methode `_openSetupTerminalTab()` in app.ts fuer Shell-Session mit Auto-Execute
- Auto-Detection nach Terminal-Close (exit code 0 -> Re-Validierung)
- Wizard-Modal aus app.ts Render-Tree entfernen
- State-Properties umbenennen (wizard* -> project*)
- Auto-Redirect auf Getting Started bei neuem Projekt ohne Specwright

## Out of Scope

- Loeschen der Wizard-Modal-Datei (bleibt als unused)
- Aenderungen am Backend (project-context.service.ts)
- Aenderungen an der Terminal-Sidebar-Komponente (Rendering)
- CSS-Cleanup der Wizard-Styles

## Expected Deliverable

- Getting Started View zeigt keine Kacheln bei Installation/Migration-Bedarf
- Klick auf "Installation/Migration starten" oeffnet Shell-Terminal in der Sidebar
- Terminal fuehrt curl-Befehl automatisch aus
- Nach erfolgreichem Setup: View aktualisiert sich automatisch
- Wizard-Modal wird nicht mehr angezeigt
- Neues Projekt ohne Specwright: Auto-Redirect auf Getting Started

## Integration Requirements

> Diese Integration Tests werden automatisch nach allen Stories ausgefuehrt.

**Integration Type:** Frontend-only

- [ ] **Integration Test 1:** Frontend Build kompiliert
   - Command: `cd ui/frontend && npm run build`
   - Validates: TypeScript kompiliert ohne Fehler nach Refactoring
   - Requires MCP: no

- [ ] **Integration Test 2:** Backend Build kompiliert
   - Command: `cd ui && npm run build:backend`
   - Validates: Backend (importiert keine geloeschten Wizard-Types)
   - Requires MCP: no

- [ ] **Integration Test 3:** Frontend Lint
   - Command: `cd ui/frontend && npm run lint`
   - Validates: Kein Lint-Fehler nach Refactoring
   - Requires MCP: no

**Integration Scenarios:**
- [ ] Scenario 1: User oeffnet Projekt ohne Specwright -> Getting Started zeigt Installations-Hint ohne Kacheln -> Klick auf Button -> Terminal oeffnet sich in Sidebar mit curl-Befehl
- [ ] Scenario 2: Nach erfolgreicher Installation -> Getting Started zeigt Planning-Kacheln
- [ ] Scenario 3: Projekt mit Product Brief -> Getting Started zeigt Standard-Kacheln (Create Spec, Add Bug, Add Todo)

## Spec Documentation

- Requirements: specwright/specs/2026-02-17-wizard-to-sidebar-migration/requirements-clarification.md
- Plan: specwright/specs/2026-02-17-wizard-to-sidebar-migration/implementation-plan.md
