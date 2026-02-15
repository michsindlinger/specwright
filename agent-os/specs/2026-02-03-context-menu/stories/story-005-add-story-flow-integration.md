# Add Story Flow Integration

> Story ID: CTX-005
> Spec: 2026-02-03-context-menu
> Created: 2026-02-03
> Last Updated: 2026-02-03

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: CTX-003, CTX-004

---

## Feature

```gherkin
Feature: Add Story Flow Integration
  Als Entwickler
  möchte ich eine Story zu einer bestehenden Spec hinzufügen,
  damit ich Features inkrementell erweitern kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Zwei-Schritt-Flow für Add Story

```gherkin
Scenario: Zwei-Schritt-Flow für Add Story
  Given das Context Menu ist sichtbar
  When ich auf "Story zu Spec hinzufügen" klicke
  Then sehe ich zuerst den Spec-Selektor
  And nach Auswahl einer Spec sehe ich die add-story Workflow-Karte
```

### Szenario 2: Spec wird an Workflow übergeben

```gherkin
Scenario: Spec wird an Workflow übergeben
  Given ich habe die Spec "Context Menu" ausgewählt
  When der add-story Workflow startet
  Then enthält das Argument die ausgewählte Spec
```

### Szenario 3: Zurück-Navigation zur Spec-Auswahl

```gherkin
Scenario: Zurück-Navigation zur Spec-Auswahl
  Given ich bin bei der add-story Workflow-Karte
  And ich habe noch keine Eingaben gemacht
  When ich auf "Zurück" klicke
  Then sehe ich wieder den Spec-Selektor
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Bestätigung bei Zurück mit Eingaben
  Given ich bin bei der add-story Workflow-Karte
  And ich habe Eingaben gemacht
  When ich auf "Zurück" klicke
  Then erscheint ein Bestätigungsdialog
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Prüfungen

- [ ] CONTAINS: agent-os-ui/ui/src/components/aos-workflow-modal.ts enthält "aos-spec-selector"
- [ ] CONTAINS: agent-os-ui/ui/src/components/aos-workflow-modal.ts enthält "add-story"

### Funktions-Prüfungen

- [ ] LINT_PASS: cd agent-os-ui && npm run lint
- [ ] BUILD_PASS: cd agent-os-ui && npm run build

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und prüfbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten
- [ ] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Unit Tests geschrieben und bestanden
- [ ] Code Review durchgeführt
- [ ] Keine Linting Errors

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | aos-workflow-modal.ts | Zwei-Schritt-Flow fuer add-story: Spec-Selector -> Workflow-Card |
| Frontend | app.ts | Handler fuer add-story Action aus Context Menu |

**Kritische Integration Points:**
- aos-workflow-modal → aos-spec-selector (Schritt 1: Spec auswaehlen)
- aos-spec-selector `spec-selected` Event → aos-workflow-modal (Schritt 2: Workflow-Card anzeigen)
- aos-workflow-modal → aos-workflow-card (add-story Workflow mit Spec-Parameter)
- app.ts menu-item-select Handler → aos-workflow-modal mit add-story Mode

---

### Technical Details

**WAS:**
- **aos-workflow-modal.ts erweitern:**
  - Neuer State: `currentStep: 'spec-select' | 'workflow'` fuer Zwei-Schritt-Flow
  - Neuer State: `selectedSpec: Spec | null` fuer ausgewaehlte Spec
  - Property: `mode: 'direct' | 'add-story'` um zwischen direktem Workflow und Zwei-Schritt-Flow zu unterscheiden
  - Bei mode='add-story': Zuerst aos-spec-selector anzeigen
  - Handler fuer `spec-selected` Event: Spec speichern, zu Schritt 2 wechseln
  - Bei Schritt 2: aos-workflow-card mit add-story Workflow und Spec als Argument anzeigen
  - "Zurueck" Button um zu Schritt 1 zurueckzukehren
  - Bei Zurueck mit Dirty State: aos-confirm-dialog anzeigen

- **app.ts erweitern:**
  - Handler fuer menu-item-select Event unterscheidet zwischen Actions
  - Bei 'add-story' Action: aos-workflow-modal mit mode='add-story' oeffnen
  - Bei anderen Actions: aos-workflow-modal mit mode='direct' und entsprechendem Workflow oeffnen

**WIE (Architecture Guidance):**
- Pattern: State Machine fuer Zwei-Schritt-Flow (currentStep)
- Pattern: Conditional Rendering basierend auf currentStep
- Pattern: Event Handler fuer spec-selected von aos-spec-selector
- Pattern: Workflow Command ID: 'agent-os:add-story'
- Pattern: Argument fuer add-story: Spec-Pfad oder Spec-ID (z.B. "2026-02-03-context-menu")
- CSS: "Zurueck" Button Styling konsistent mit cancel-btn Pattern
- Transition: Sanfter Uebergang zwischen Schritten (optional)

**WO:**
- Modifizieren: `agent-os-ui/ui/src/components/aos-workflow-modal.ts`
  - Import: `aos-spec-selector.js`
  - State Properties: currentStep, selectedSpec
  - Property: mode
  - Handler: handleSpecSelected
  - Handler: handleBack
  - Render Logic fuer beide Schritte
- Modifizieren: `agent-os-ui/ui/src/app.ts`
  - State: workflowModalMode, workflowModalCommand
  - Handler: handleMenuItemSelect mit Action-Type Unterscheidung

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** CTX-003 (aos-workflow-modal), CTX-004 (aos-spec-selector)

**Geschätzte Komplexität:** S

**Relevante Skills:** frontend-ui-component-architecture

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify aos-spec-selector import in aos-workflow-modal
grep -q "aos-spec-selector" agent-os-ui/ui/src/components/aos-workflow-modal.ts && echo "OK: aos-spec-selector integration found" || echo "ERROR: aos-spec-selector integration missing"

# Verify add-story mode handling
grep -q "add-story" agent-os-ui/ui/src/components/aos-workflow-modal.ts && echo "OK: add-story mode found" || echo "ERROR: add-story mode missing"

# Verify spec-selected handler
grep -q "spec-selected" agent-os-ui/ui/src/components/aos-workflow-modal.ts && echo "OK: spec-selected handler found" || echo "ERROR: spec-selected handler missing"

# Verify currentStep or step state
grep -q "currentStep\|step" agent-os-ui/ui/src/components/aos-workflow-modal.ts && echo "OK: step state found" || echo "ERROR: step state missing"

# Verify app.ts menu-item-select handler
grep -q "menu-item-select" agent-os-ui/ui/src/app.ts && echo "OK: menu-item-select handler found" || echo "ERROR: menu-item-select handler missing"

# Lint check
cd agent-os-ui && npm run lint

# Build check
cd agent-os-ui && npm run build
```
