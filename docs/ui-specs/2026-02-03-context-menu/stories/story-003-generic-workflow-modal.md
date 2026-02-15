# Generic Workflow Modal

> Story ID: CTX-003
> Spec: 2026-02-03-context-menu
> Created: 2026-02-03
> Last Updated: 2026-02-03

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: None

**Status**: Done

---

## Feature

```gherkin
Feature: Generic Workflow Modal
  Als Entwickler
  möchte ich Workflows in einem Modal starten können,
  damit ich nicht die aktuelle Seite verlassen muss.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Modal zeigt Workflow-Karte

```gherkin
Scenario: Modal zeigt Workflow-Karte
  Given das Context Menu ist sichtbar
  When ich auf "Bug erstellen" klicke
  Then öffnet sich ein Modal
  And das Modal enthält die add-bug Workflow-Karte
```

### Szenario 2: Workflow startet aus Modal

```gherkin
Scenario: Workflow startet aus Modal
  Given das Workflow-Modal ist geöffnet mit add-bug
  When ich den Start-Button klicke
  Then schließt sich das Modal
  And der add-bug Workflow wird gestartet
```

### Szenario 3: Bestätigung bei ungespeicherten Änderungen

```gherkin
Scenario: Bestätigung bei ungespeicherten Änderungen
  Given das Workflow-Modal ist geöffnet
  And ich habe Text in das Argument-Feld eingegeben
  When ich ESC drücke oder außerhalb klicke
  Then erscheint ein Bestätigungsdialog "Änderungen verwerfen?"
```

### Szenario 4: Keine Bestätigung ohne Änderungen

```gherkin
Scenario: Keine Bestätigung ohne Änderungen
  Given das Workflow-Modal ist geöffnet
  And ich habe KEINE Eingaben gemacht
  When ich ESC drücke
  Then schließt sich das Modal sofort
  And kein Bestätigungsdialog erscheint
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Bestätigung ablehnen behält Modal offen
  Given der Bestätigungsdialog ist sichtbar
  When ich "Abbrechen" klicke
  Then schließt sich der Bestätigungsdialog
  And das Workflow-Modal bleibt geöffnet
  And meine Eingaben sind erhalten
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/aos-workflow-modal.ts
- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/aos-confirm-dialog.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: agent-os-ui/ui/src/components/aos-workflow-modal.ts enthält "@customElement('aos-workflow-modal')"
- [ ] CONTAINS: agent-os-ui/ui/src/components/aos-workflow-modal.ts enthält "aos-workflow-card"
- [ ] CONTAINS: agent-os-ui/ui/src/components/aos-confirm-dialog.ts enthält "@customElement('aos-confirm-dialog')"

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
| Frontend | aos-workflow-modal.ts | Neue Komponente erstellen |
| Frontend | aos-confirm-dialog.ts | Neue Komponente erstellen |
| Frontend | theme.css | Styles fuer .workflow-modal und .confirm-dialog |

**Kritische Integration Points:**
- aos-workflow-modal → aos-workflow-card (einbetten als Child)
- aos-workflow-modal → aos-confirm-dialog (bedingt bei Dirty State)
- aos-workflow-modal dispatcht `workflow-start-interactive` Event (wie aos-create-spec-modal)
- aos-workflow-modal dispatcht `modal-close` Event

---

### Technical Details

**WAS:**
- **aos-workflow-modal.ts:**
  - Generisches Modal das eine aos-workflow-card fuer jeden Workflow anzeigt
  - Property: `open: boolean`, `workflowCommand: WorkflowCommand`
  - State: `isDirty: boolean` (true wenn Input-Feld Inhalt hat)
  - ESC und Outside-Click Handler (wie aos-create-spec-modal)
  - Bei Dirty State: aos-confirm-dialog anzeigen statt direkt schliessen
  - Event: `workflow-start-interactive` weiterleiten von aos-workflow-card
  - Event: `modal-close` dispatchen beim Schliessen
  - Focus Trap wie in aos-create-spec-modal

- **aos-confirm-dialog.ts:**
  - Leichtgewichtiger Bestaetigungsdialog
  - Properties: `open: boolean`, `title: string`, `message: string`
  - Zwei Buttons: "Abbrechen" und "Verwerfen" (destructive)
  - Events: `confirm` und `cancel`
  - z-index: 1002 (ueber workflow-modal mit 1001)

**WIE (Architecture Guidance):**
- Pattern: Light DOM (createRenderRoot = this) fuer beide Komponenten
- Pattern: Modal Overlay wie create-spec-modal__overlay in theme.css
- Pattern: Event Delegation - workflow-start-interactive von aos-workflow-card bubbelt durch
- Pattern: Dirty State Tracking via input Event auf aos-workflow-card
- Pattern: Focus Trap mit Tab Key Handler wie aos-create-spec-modal
- CSS: Nutze bestehende Modal-Styles als Basis (.create-spec-modal als Referenz)
- CSS: .confirm-dialog__destructive-btn mit --color-accent-error fuer Warnung
- z-index Hierarchie: context-menu(1000) < workflow-modal(1001) < confirm-dialog(1002)

**WO:**
- Erstellen: `agent-os-ui/ui/src/components/aos-workflow-modal.ts`
- Erstellen: `agent-os-ui/ui/src/components/aos-confirm-dialog.ts`
- Erweitern: `agent-os-ui/ui/src/styles/theme.css` (.workflow-modal, .confirm-dialog Styles)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** None (aos-workflow-card existiert bereits)

**Geschätzte Komplexität:** S

**Relevante Skills:** frontend-ui-component-architecture

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| aos-workflow-modal | UI Component | agent-os-ui/ui/src/components/aos-workflow-modal.ts | Generisches Modal fuer Workflow-Karten |
| aos-confirm-dialog | UI Component | agent-os-ui/ui/src/components/aos-confirm-dialog.ts | Wiederverwendbarer Bestaetigungsdialog |

---

### Completion Check

```bash
# Verify aos-workflow-modal exists
test -f agent-os-ui/ui/src/components/aos-workflow-modal.ts && echo "OK: Modal file exists" || echo "ERROR: Modal file missing"

# Verify aos-confirm-dialog exists
test -f agent-os-ui/ui/src/components/aos-confirm-dialog.ts && echo "OK: Dialog file exists" || echo "ERROR: Dialog file missing"

# Verify aos-workflow-modal custom element
grep -q "@customElement('aos-workflow-modal')" agent-os-ui/ui/src/components/aos-workflow-modal.ts && echo "OK: Modal custom element found" || echo "ERROR: Modal custom element missing"

# Verify aos-confirm-dialog custom element
grep -q "@customElement('aos-confirm-dialog')" agent-os-ui/ui/src/components/aos-confirm-dialog.ts && echo "OK: Dialog custom element found" || echo "ERROR: Dialog custom element missing"

# Verify aos-workflow-card integration
grep -q "aos-workflow-card" agent-os-ui/ui/src/components/aos-workflow-modal.ts && echo "OK: workflow-card integration found" || echo "ERROR: workflow-card integration missing"

# Verify Light DOM pattern in both components
grep -q "createRenderRoot" agent-os-ui/ui/src/components/aos-workflow-modal.ts && echo "OK: Modal Light DOM found" || echo "ERROR: Modal Light DOM missing"
grep -q "createRenderRoot" agent-os-ui/ui/src/components/aos-confirm-dialog.ts && echo "OK: Dialog Light DOM found" || echo "ERROR: Dialog Light DOM missing"

# Verify CSS styles
grep -q ".workflow-modal" agent-os-ui/ui/src/styles/theme.css && echo "OK: Modal CSS found" || echo "ERROR: Modal CSS missing"
grep -q ".confirm-dialog" agent-os-ui/ui/src/styles/theme.css && echo "OK: Dialog CSS found" || echo "ERROR: Dialog CSS missing"

# Lint check
cd agent-os-ui && npm run lint

# Build check
cd agent-os-ui && npm run build
```
