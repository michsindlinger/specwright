# Wizard Entfernung & State Cleanup

> Story ID: WSM-003
> Spec: Wizard-to-Sidebar Migration
> Created: 2026-02-17
> Last Updated: 2026-02-17

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: WSM-002
**Status**: Done

---

## Feature

```gherkin
Feature: Wizard-Modal entfernen und State aufraeumen
  Als Entwickler
  moechte ich dass das Wizard-Modal nicht mehr angezeigt wird und die State-Properties aufgeraeumt sind,
  damit der Code konsistent und wartbar bleibt.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Wizard-Modal wird nicht mehr angezeigt

```gherkin
Scenario: Kein Wizard-Modal bei neuem Projekt
  Given ich fuege ein neues Projekt ohne Specwright hinzu
  When das Projekt geladen wird
  Then erscheint kein modales Wizard-Fenster
  And ich werde auf die Getting Started Seite weitergeleitet
```

### Szenario 2: Auto-Redirect auf Getting Started

```gherkin
Scenario: Automatische Weiterleitung bei Projekt ohne Specwright
  Given ich fuege ein neues Projekt ohne Specwright hinzu
  When die Projekt-Validierung abgeschlossen ist
  Then befinde ich mich automatisch auf der Getting Started Seite
  And ich sehe den Installations-Hint mit Button
```

### Szenario 3: State-Properties umbenannt

```gherkin
Scenario: Keine wizard-prefixed Properties mehr im Code
  Given die Migration wurde implementiert
  When ich den Code betrachte
  Then gibt es keine Properties mit dem Prefix "wizard" mehr
  And die Validation-Properties heissen "project*" statt "wizard*"
```

### Szenario 4: Projekt-Wiederherstellung nach Reload

```gherkin
Scenario: Korrekte Zustandserkennung nach Browser-Refresh
  Given ich habe ein Projekt ohne Specwright geoeffnet
  And ich lade die Seite neu
  When das Projekt wiederhergestellt wird
  Then wird die Projekt-Validierung durchgefuehrt
  And die Getting Started Seite zeigt den korrekten Zustand
  And es erscheint kein Wizard-Modal
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Pruefungen

- [x] NOT_CONTAINS: app.ts enthaelt NICHT "aos-installation-wizard-modal"
- [x] NOT_CONTAINS: app.ts enthaelt NICHT "showWizard"
- [x] NOT_CONTAINS: app.ts enthaelt NICHT "wizardProjectPath"
- [x] NOT_CONTAINS: app.ts enthaelt NICHT "wizardFileCount"
- [x] NOT_CONTAINS: app.ts enthaelt NICHT "_handleWizardComplete"
- [x] NOT_CONTAINS: app.ts enthaelt NICHT "_handleWizardCancel"
- [x] NOT_CONTAINS: app.ts enthaelt NICHT "_handleStartWizardFromView"
- [x] CONTAINS: app.ts enthaelt "projectHasSpecwright"
- [x] CONTAINS: app.ts enthaelt "projectHasProductBrief"
- [x] CONTAINS: app.ts enthaelt "projectNeedsMigration"
- [x] CONTAINS: app.ts enthaelt "projectValidationPending"
- [x] CONTAINS: app.ts enthaelt "routerService.navigate('getting-started')"

### Funktions-Pruefungen

- [x] BUILD_PASS: cd ui/frontend && npm run build exits with code 0
- [x] LINT_PASS: cd ui/frontend && npm run lint exits with code 0

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und pruefbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhaengigkeiten identifiziert (WSM-002)
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (keine)
- [x] Story ist angemessen geschaetzt (1 Datei, ~100 LOC Aenderung, hauptsaechlich Loeschungen/Renames)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert (Frontend only)
- [x] Integration Type bestimmt (Frontend-only)
- [x] Kritische Integration Points dokumentiert (keine neuen)
- [x] Handover-Dokumente definiert (keine noetig)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [x] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [x] Kein separater Unit-Test noetig (Refactoring/Cleanup)
- [x] Code Review durchgefuehrt und genehmigt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | app.ts | Wizard-Modal aus render() entfernen, Import entfernen. showWizard/wizardProjectPath/wizardFileCount State loeschen. _handleWizardComplete/_handleWizardCancel/_handleStartWizardFromView loeschen. wizard* Properties zu project* umbenennen. _validateAndTriggerWizard(): navigate('getting-started') statt showWizard=true. projectStateService.setWizardNeeded() Referenzen entfernen. |

---

### Technical Details

**WAS:** Wizard-Modal komplett aus app.ts entfernen. Wizard-State und -Methoden loeschen. Validation-Properties umbenennen. Validation-Flow anpassen (navigate statt wizard open).

**WIE (Architektur-Guidance ONLY):**
- Import von aos-installation-wizard-modal.js entfernen
- Wizard-Element `<aos-installation-wizard-modal>` aus render() entfernen
- State-Properties loeschen: showWizard, wizardProjectPath, wizardFileCount
- State-Properties umbenennen: wizardHasSpecwright->projectHasSpecwright, wizardHasProductBrief->projectHasProductBrief, wizardNeedsMigration->projectNeedsMigration, wizardValidationPending->projectValidationPending
- Alle Referenzen auf umbenannte Properties aktualisieren (renderView, handleProjectSelected, etc.)
- _validateAndTriggerWizard(): Statt showWizard=true -> routerService.navigate('getting-started')
- _validateProjectForWizard(): Gleiche Logik, nur umbenannte Properties
- projectStateService.setWizardNeeded()/isWizardNeeded()/clearWizardNeeded() Aufrufe entfernen (Dead-Code im Service belassen)
- TypeScript strict mode stellt sicher, dass keine vergessenen Referenzen uebrig bleiben

**WO:**
- ui/frontend/src/app.ts

**Abhaengigkeiten:** WSM-002

**Geschaetzte Komplexitaet:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit App-Shell Patterns, State Management |
| quality-gates | .claude/skills/quality-gates/SKILL.md | Refactoring Quality Standards |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify build passes
cd ui/frontend && npm run build

# Verify lint passes
cd ui/frontend && npm run lint

# Verify wizard modal removed
! grep -q "aos-installation-wizard-modal" ui/frontend/src/app.ts

# Verify wizard state removed
! grep -q "showWizard" ui/frontend/src/app.ts
! grep -q "wizardProjectPath" ui/frontend/src/app.ts

# Verify renamed properties exist
grep -q "projectHasSpecwright" ui/frontend/src/app.ts
grep -q "projectNeedsMigration" ui/frontend/src/app.ts

# Verify auto-redirect
grep -q "routerService.navigate.*getting-started" ui/frontend/src/app.ts
```

**Story ist DONE wenn:**
1. Alle NOT_CONTAINS/CONTAINS checks bestanden
2. Build + Lint passes
3. Git diff zeigt nur erwartete Aenderungen (Loeschungen, Renames)
