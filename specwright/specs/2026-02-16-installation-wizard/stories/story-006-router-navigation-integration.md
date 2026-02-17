# Router & Navigation Integration

> Story ID: IW-006
> Spec: Installation Wizard
> Created: 2026-02-16
> Last Updated: 2026-02-17 (install.sh Synergy Update)

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: IW-001, IW-002, IW-003, IW-004, IW-005
**Integration**: app.ts -> aos-installation-wizard-modal, app.ts -> routerService, app.ts -> aos-getting-started-view

---

## Feature

```gherkin
Feature: Router & Navigation Integration
  Als Benutzer der Specwright Web UI
  moechte ich dass der Wizard automatisch erscheint und mich nach Abschluss zur Getting-Started-Seite weiterleitet,
  damit der gesamte Installationsflow nahtlos funktioniert.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Wizard-Trigger bei Projekt ohne Framework

```gherkin
Scenario: Wizard wird automatisch ausgeloest beim Hinzufuegen eines Projekts ohne Specwright
  Given ich befinde mich in der Specwright Web UI
  When ich ueber den Plus-Button ein neues Projekt hinzufuege
  And das Projekt keinen specwright/-Ordner hat
  Then erscheint automatisch der Wizard Modal im Installations-Schritt
```

### Szenario 1b: Wizard-Trigger bei Projekt mit Framework aber ohne Product Brief

```gherkin
Scenario: Wizard wird ausgeloest bei Projekt mit specwright/ aber ohne Product Brief
  Given ich befinde mich in der Specwright Web UI
  When ich ueber den Plus-Button ein Projekt hinzufuege
  And das Projekt einen specwright/-Ordner hat (z.B. via install.sh)
  And das Projekt keinen Product Brief hat
  Then erscheint automatisch der Wizard Modal direkt im Planning-Schritt
```

### Szenario 2: Automatische Weiterleitung nach Wizard-Abschluss

```gherkin
Scenario: Nach Wizard-Abschluss Weiterleitung zu Getting Started
  Given ich habe den Wizard erfolgreich abgeschlossen
  When der Wizard sich schliesst
  Then werde ich automatisch zur /getting-started Seite weitergeleitet
```

### Szenario 3: Getting Started im Navigationsmenue

```gherkin
Scenario: Getting Started als Menuepunkt in der Navigation
  Given ein Projekt ist geoeffnet in dem Specwright installiert ist
  When ich das Navigationsmenue betrachte
  Then sehe ich einen "Getting Started" Menuepunkt
  And ich kann darauf klicken um zur /getting-started Seite zu gelangen
```

### Szenario 4: Kein Wizard bei vollstaendig eingerichtetem Projekt

```gherkin
Scenario: Kein Wizard bei Projekt mit specwright/ und Product Brief
  Given ich fuege ein Projekt hinzu das einen specwright/-Ordner und einen Product Brief hat
  When das Projekt geoeffnet wird
  Then erscheint kein Wizard Modal
  And ich sehe die normale Projektansicht
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Direkte Navigation zu /getting-started via URL
  Given ich gebe #/getting-started direkt in die URL ein
  When die Seite geladen wird
  Then sehe ich die Getting Started Seite
  And sie funktioniert korrekt auch ohne vorherigen Wizard
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Pruefungen

- [ ] CONTAINS: route.types.ts enthaelt "getting-started"
- [ ] CONTAINS: app.ts enthaelt "aos-installation-wizard-modal"
- [ ] CONTAINS: app.ts enthaelt "aos-getting-started-view"
- [ ] CONTAINS: app.ts enthaelt "getting-started" in navItems oder renderView

### Funktions-Pruefungen

- [ ] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0

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
- [x] Abhaengigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschaetzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert**
- [x] **Integration Type bestimmt**
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] **Integration hergestellt: app.ts -> aos-installation-wizard-modal**
  - [ ] Import und Rendering in app.ts Template
  - [ ] Property-Binding (.open, .projectPath, .fileCount, .hasSpecwright, .hasProductBrief)
  - [ ] Event-Handler (@wizard-complete, @wizard-cancel, @modal-close)
  - [ ] Wizard triggert bei `hasSpecwright === false` ODER `hasProductBrief === false`
  - [ ] Validierung: `grep -q "aos-installation-wizard-modal" ui/frontend/src/app.ts`
- [ ] **Integration hergestellt: app.ts -> routerService (getting-started navigation)**
  - [ ] `routerService.navigate('getting-started')` bei wizard-complete
  - [ ] Validierung: `grep -q "getting-started" ui/frontend/src/app.ts`
- [ ] **Integration hergestellt: app.ts -> aos-getting-started-view**
  - [ ] Import und renderView-Case
  - [ ] navItems-Eintrag
  - [ ] Validierung: `grep -q "aos-getting-started-view" ui/frontend/src/app.ts`

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt
- [ ] Code Review durchgefuehrt und genehmigt

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | `route.types.ts` | `'getting-started'` zu ViewType Union und VALID_VIEWS hinzufuegen |
| Frontend | `app.ts` | Wizard-Modal importieren, navItem fuer Getting Started, renderView-Case, Wizard-Trigger in handleProjectSelected, wizard-complete/cancel Event-Handler |

**Kritische Integration Points:**
- `app.ts` (handleProjectSelected) -> `aos-installation-wizard-modal` (Property Binding + Events)
- `app.ts` (wizard-complete handler) -> `routerService.navigate('getting-started')`
- `app.ts` (navItems + renderView) -> `aos-getting-started-view`

---

### Technical Details

**WAS:**
- `'getting-started'` zu `ViewType` und `VALID_VIEWS` in `route.types.ts` hinzufuegen
- `aos-installation-wizard-modal` und `aos-getting-started-view` in `app.ts` importieren
- Wizard-Modal im Template rendern mit Property-Bindings (inkl. `.hasProductBrief`)
- Nav-Item "Getting Started" in navItems-Array
- renderView-Case fuer `'getting-started'` (mit `.hasProductBrief` Property-Binding)
- Wizard-Trigger-Logik in `handleProjectSelected()`: Nach Projekt-Validierung pruefen ob `hasSpecwright === false` ODER `hasProductBrief === false`, dann Wizard oeffnen
- Event-Handler: `wizard-complete` -> navigate zu getting-started + Wizard-State loeschen; `wizard-cancel` -> Modal schliessen

**WIE (Architektur-Guidance ONLY):**
- Bestehenden `handleProjectSelected()` Flow erweitern (nicht ersetzen)
- `projectStateService.validateProject()` nutzt bereits den erweiterten Response aus IW-001
- Wizard-State-Pruefung von IW-004 nutzen (`projectStateService.isWizardNeeded()`)
- navItems-Pattern folgen: `{ route: 'getting-started', label: 'Getting Started', icon: ... }`
- renderView Switch-Pattern folgen
- Import-Pfade konsistent mit bestehenden Imports

**WO:**
- `ui/frontend/src/types/route.types.ts` (ViewType + VALID_VIEWS erweitern)
- `ui/frontend/src/app.ts` (Imports, Template, navItems, renderView, Event-Handler, Wizard-Trigger)

**Abhaengigkeiten:** IW-001, IW-002, IW-003, IW-004, IW-005 (alle vorherigen Stories)

**Geschaetzte Komplexitaet:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | App-Shell-Integration, Routing, Event-Handling |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | Bestehende App-Architektur, navItems-Pattern |
| architect-refinement | .claude/skills/architect-refinement/SKILL.md | Integration-Patterns, Layer-Konsistenz |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Frontend compiles
cd ui/frontend && npm run build

# Route type added
grep -q "getting-started" ui/frontend/src/types/route.types.ts && echo "Route type found"

# Wizard modal in app
grep -q "aos-installation-wizard-modal" ui/frontend/src/app.ts && echo "Wizard modal in app"

# Getting started view in app
grep -q "aos-getting-started-view" ui/frontend/src/app.ts && echo "Getting started view in app"

# Getting started in navItems or renderView
grep -q "getting-started" ui/frontend/src/app.ts && echo "getting-started route in app"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
