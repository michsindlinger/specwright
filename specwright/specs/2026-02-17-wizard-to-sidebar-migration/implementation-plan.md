# Implementation Plan: Wizard-to-Sidebar Migration

**Status:** PENDING_USER_REVIEW
**Created:** 2026-02-17

## Executive Summary

Ersetzt den mehrstufigen Wizard-Modal durch einen schlanken Flow, bei dem Installations-/Migrations-Befehle direkt im Cloud Terminal der Sidebar ausgefuehrt werden. Die Getting Started View wird zum einzigen Entry Point fuer Setup-Aktionen: Sie zeigt nur einen Hint mit Action-Button wenn Setup noetig ist (keine Kacheln), und feuert ein neues Event, das app.ts durch Erstellen einer Shell-Session mit auto-executed curl-Befehl in der Sidebar behandelt. Nach Terminal-Close mit Exit Code 0 validiert app.ts automatisch den Projektzustand, sodass sich die Getting Started View aktualisiert. Das Wizard-Modal wird aus dem app.ts Render-Tree entfernt.

## Architecture Decisions

### AD-1: Neue Methode `_openSetupTerminalTab()` in app.ts

**Decision**: Neue Methode statt Wiederverwendung von `_openWorkflowTerminalTab()`, da letztere fuer Claude Code Workflow-Sessions konzipiert ist. Fuer Install/Migrate brauchen wir eine Shell-Session mit Auto-Input.

**Pattern**: Gleich wie im Wizard (shell terminal erstellen, nach `cloud-terminal:created` den curl-Befehl via `cloud-terminal:input` senden).

### AD-2: Setup-Session Flag auf TerminalSession Interface

**Decision**: `TerminalSession` Interface erweitern um `isSetupSession?: boolean` und `setupType?: 'install' | 'migrate'`. App.ts nutzt diese um bei `cloud-terminal:closed` die richtige Session zu erkennen und Re-Validierung auszuloesen.

### AD-3: Gateway Listener fuer `cloud-terminal:closed` in app.ts

**Decision**: Neuer Listener in app.ts fuer `cloud-terminal:closed`. Wenn die geschlossene Session eine Setup-Session ist und exit code 0 hat, wird `_validateProjectForWizard()` aufgerufen.

### AD-4: Neues Event `start-setup-terminal` statt `start-wizard`

**Decision**: Getting Started View feuert `start-setup-terminal` mit Detail `{ type: 'install' | 'migrate' }`. App.ts erstellt daraufhin die Shell-Session.

### AD-5: Auto-Redirect statt Wizard-Open

**Decision**: `_validateAndTriggerWizard()` navigiert zu Getting Started (`routerService.navigate('getting-started')`) statt `showWizard = true` zu setzen.

### AD-6: One-Shot Listener fuer Auto-Execute

**Decision**: Nach `cloud-terminal:create` registriert app.ts einen einmaligen Gateway-Listener fuer `cloud-terminal:created` (gefiltert nach requestId). Bei Antwort wird der curl-Befehl via `cloud-terminal:input` mit 500ms Delay gesendet.

### AD-7: State-Properties umbenennen

**Decision**: Validation-Properties behalten aber umbenennen: `wizardHasSpecwright` -> `projectHasSpecwright`, etc. Wizard-spezifische Properties (`showWizard`, `wizardProjectPath`, `wizardFileCount`) entfernen.

## Component Overview

### Geaenderte Komponenten

| Komponente | Aenderung |
|------------|-----------|
| `aos-getting-started-view.ts` | Kacheln entfernen bei !hasSpecwright/needsMigration, neues Event `start-setup-terminal` |
| `app.ts` | Wizard-Modal entfernen, neue Methode `_openSetupTerminalTab()`, Gateway-Listener, State-Rename |
| `aos-cloud-terminal-sidebar.ts` | TerminalSession Interface erweitern (isSetupSession, setupType) |

### Unveraenderte Komponenten
- `aos-terminal-session.ts` - Handles shell sessions already
- `project-context.service.ts` (Backend) - Kein Backend-Aenderung
- `theme.css` - Wizard-CSS bleibt (spaeteres Cleanup)

## Component Connections

| Source | Target | Verbindung | Zustaendige Story |
|--------|--------|------------|-------------------|
| aos-getting-started-view | app.ts | Event `start-setup-terminal` | Story 1 + Story 2 |
| app.ts | Gateway (WebSocket) | `cloud-terminal:create` + `cloud-terminal:input` | Story 2 |
| Gateway | app.ts | `cloud-terminal:closed` (exit code) | Story 3 |
| app.ts | aos-getting-started-view | Property-Updates (reactiv) | Story 3 |
| app.ts | routerService | `navigate('getting-started')` | Story 4 |

### Event Flow: Installation starten

1. **Getting Started** feuert `start-setup-terminal` mit `{ type: 'install' }`
2. **app.ts** `_handleStartSetupTerminal()` empfaengt Event
3. **app.ts** erstellt `TerminalSession` mit `isSetupSession: true`, sendet `cloud-terminal:create`
4. **app.ts** One-Shot Listener empfaengt `cloud-terminal:created`, sendet curl-Befehl nach 500ms
5. **Terminal** zeigt laufende Installation in der Sidebar

### Event Flow: Installation abgeschlossen

1. **Backend** Shell-Prozess beendet, sendet `cloud-terminal:closed` mit `exitCode: 0`
2. **app.ts** erkennt Setup-Session, ruft `/api/project/validate` auf
3. **app.ts** aktualisiert `projectHasSpecwright`, `projectHasProductBrief`, `projectNeedsMigration`
4. **Getting Started** aktualisiert sich reaktiv -> zeigt Planning-Kacheln

## Implementation Phases

### Phase 1: TerminalSession Interface erweitern
- `isSetupSession?: boolean` und `setupType?: 'install' | 'migrate'` zu TerminalSession hinzufuegen
- Non-breaking Aenderung

### Phase 2: Getting Started View anpassen
- `renderNotInstalledState()`: Disabled-Cards-Block entfernen (nur Hint + Button)
- `renderMigrationHint()`: Cards-Block entfernen (nur Hint + Button)
- Event `start-wizard` -> `start-setup-terminal` mit Detail `{ type: 'install' | 'migrate' }`

### Phase 3: Setup-Terminal Logik in app.ts
- `_openSetupTerminalTab(type)` Methode: Session erstellen, Gateway-Create senden, One-Shot Listener, Auto-Execute
- `_handleStartSetupTerminal(e)` Event-Handler
- Gateway-Listener fuer `cloud-terminal:closed` -> Re-Validierung bei Setup-Sessions
- Guard: Kein zweites Setup-Terminal wenn bereits eines laeuft

### Phase 4: Wizard entfernen und Properties umbenennen
- Wizard-Modal aus Render entfernen, Import entfernen
- State-Properties: `showWizard`, `wizardProjectPath`, `wizardFileCount` loeschen
- Rename: `wizardHasSpecwright` -> `projectHasSpecwright` (etc.) + alle Referenzen
- Wizard-Methoden entfernen: `_handleWizardComplete`, `_handleWizardCancel`, `_handleStartWizardFromView`

### Phase 5: Validierungs-Flow anpassen
- `_validateAndTriggerWizard()`: Navigate statt showWizard
- `handleProjectSelected()` anpassen
- `_validateProjectForWizard()` mit umbenannten Properties
- `projectStateService.setWizardNeeded()` Referenzen entfernen

## Self-Review Results

### Completeness Check
- [x] FR-1 (Wizard-Entfernung): Phase 4
- [x] FR-2 (Kachel-Logik): Phase 2
- [x] FR-3 (Sidebar-Terminal): Phase 3
- [x] FR-4 (Auto-Detection): Phase 3
- [x] FR-5 (Auto-Redirect): Phase 5

### Potential Issues & Mitigations
- **Race Condition One-Shot Listener**: Listener wird VOR dem Send registriert (gleiche Reihenfolge wie Wizard)
- **Doppelte Setup-Sessions**: Guard in `_openSetupTerminalTab()` prueft ob bereits eine Setup-Session aktiv ist
- **Terminal Ready Timing**: 500ms Delay fuer Auto-Execute (bewaehrter Wert aus Wizard)

### Orphaned Component Check
- [x] Alle neuen Verbindungen haben Source UND Target
- [x] Kein Component ohne Connection

## Minimal-Invasive Optimizations

1. **Wizard-Datei bleibt**: `aos-installation-wizard-modal.ts` wird nicht geloescht, nur der Import/Render in app.ts entfernt
2. **Wizard-CSS bleibt**: `.installation-wizard__*` Styles in theme.css bleiben
3. **projectStateService bleibt**: Wizard-Methoden im Service bleiben (Dead Code), nur Referenzen in app.ts werden entfernt
4. **Kein Backend-Aenderung**: API und WebSocket-Protokoll bleiben unveraendert
5. **Sidebar-Rendering unveraendert**: Setup-Session erscheint als normaler Shell-Tab

## Feature-Preservation Checklist
- [x] Alle Requirements aus Clarification abgedeckt
- [x] Kein Feature geopfert
- [x] Alle Akzeptanzkriterien erreichbar
