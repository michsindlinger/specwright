# Getting Started Kachel-Logik

> Story ID: WSM-001
> Spec: Wizard-to-Sidebar Migration
> Created: 2026-02-17
> Last Updated: 2026-02-17

**Priority**: High
**Type**: Frontend
**Estimated Effort**: XS
**Dependencies**: None

---

## Feature

```gherkin
Feature: Zustandsbasierte Kachel-Anzeige auf Getting Started
  Als Entwickler
  moechte ich auf der Getting Started Seite nur relevante Aktionen sehen,
  damit ich klar erkenne was der naechste Schritt ist.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Keine Kacheln bei fehlender Installation

```gherkin
Scenario: Projekt ohne Specwright zeigt keine Kacheln
  Given ich oeffne ein Projekt ohne Specwright-Installation
  When die Getting Started Seite geladen wird
  Then sehe ich einen Hinweis "Specwright nicht installiert"
  And ich sehe einen Button "Installation starten"
  And es werden keine Aktions-Kacheln angezeigt
```

### Szenario 2: Keine Kacheln bei Migration-Bedarf

```gherkin
Scenario: Projekt mit agent-os zeigt keine Kacheln
  Given ich oeffne ein Projekt mit agent-os/ aber ohne specwright/
  When die Getting Started Seite geladen wird
  Then sehe ich einen Hinweis "Migration empfohlen"
  And ich sehe einen Button "Migration starten"
  And es werden keine Aktions-Kacheln angezeigt
```

### Szenario 3: Planning-Kacheln ohne Brief

```gherkin
Scenario: Installiertes Projekt ohne Brief zeigt Planning-Kacheln
  Given ich oeffne ein Projekt mit Specwright aber ohne Product/Platform Brief
  When die Getting Started Seite geladen wird
  Then sehe ich die Kacheln "Plan Product", "Plan Platform", "Analyze Product", "Analyze Platform"
  And ich sehe keine Standard-Kacheln wie "Create Spec"
```

### Szenario 4: Standard-Kacheln mit Brief

```gherkin
Scenario: Projekt mit Brief zeigt Standard-Kacheln
  Given ich oeffne ein Projekt mit Specwright und Product Brief
  When die Getting Started Seite geladen wird
  Then sehe ich die Kacheln "Create Spec", "Add Todo", "Add Bug"
  And ich sehe keine Planning-Kacheln
```

### Edge Case: Button feuert Setup-Event

```gherkin
Scenario: Klick auf Installation/Migration feuert Setup-Event
  Given ich bin auf der Getting Started Seite eines Projekts ohne Specwright
  When ich auf "Installation starten" klicke
  Then wird ein Event mit dem Typ "install" ausgeloest
  And die Sidebar-Terminal-Integration kann darauf reagieren
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [ ] FILE_EXISTS: ui/frontend/src/views/aos-getting-started-view.ts

### Inhalt-Pruefungen

- [ ] CONTAINS: aos-getting-started-view.ts enthaelt "start-setup-terminal"
- [ ] NOT_CONTAINS: aos-getting-started-view.ts enthaelt NICHT "start-wizard"
- [ ] NOT_CONTAINS: aos-getting-started-view.ts enthaelt NICHT "getting-started-cards--disabled"

### Funktions-Pruefungen

- [ ] BUILD_PASS: cd ui/frontend && npm run build exits with code 0

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
- [x] Erforderliche MCP Tools dokumentiert (keine)
- [x] Story ist angemessen geschaetzt (1 Datei, ~30 LOC Aenderung)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert (Frontend only)
- [x] Integration Type bestimmt (Frontend-only)
- [x] Kritische Integration Points dokumentiert (keine)
- [x] Handover-Dokumente definiert (keine noetig)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [ ] Kein separater Unit-Test noetig (reine View-Aenderung)
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
| Frontend | aos-getting-started-view.ts | renderNotInstalledState(): Disabled-Cards entfernen. renderMigrationHint(): Cards entfernen. Event von start-wizard zu start-setup-terminal aendern |

---

### Technical Details

**WAS:** Getting Started View anpassen: Bei !hasSpecwright und needsMigration keine Kacheln anzeigen (nur Hint + Button). Event umbenennen.

**WIE (Architektur-Guidance ONLY):**
- Folge dem bestehenden Lit-Component Pattern (createRenderRoot override, property decorators)
- Event-Detail muss `{ type: 'install' | 'migrate' }` enthalten, damit app.ts den richtigen curl-Befehl kennt
- Die renderNotInstalledState() und renderMigrationHint() Methoden vereinfachen: Cards-Block komplett entfernen
- handleStartWizard() umbenennen und erweitern fuer type-Parameter

**WO:**
- ui/frontend/src/views/aos-getting-started-view.ts

**Abhaengigkeiten:** None

**Geschaetzte Komplexitaet:** XS

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Web Component Patterns fuer View-Aenderung |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | Business-Domain der Getting Started View |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify build passes
cd ui/frontend && npm run build

# Verify new event name exists
grep -q "start-setup-terminal" ui/frontend/src/views/aos-getting-started-view.ts

# Verify old event name is gone
! grep -q "start-wizard" ui/frontend/src/views/aos-getting-started-view.ts

# Verify disabled cards are removed
! grep -q "getting-started-cards--disabled" ui/frontend/src/views/aos-getting-started-view.ts
```

**Story ist DONE wenn:**
1. Alle CONTAINS/NOT_CONTAINS checks bestanden
2. Build passes
3. Git diff zeigt nur erwartete Aenderungen
