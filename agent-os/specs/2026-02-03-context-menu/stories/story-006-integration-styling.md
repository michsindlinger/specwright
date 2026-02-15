# Integration & Styling

> Story ID: CTX-006
> Spec: 2026-02-03-context-menu
> Created: 2026-02-03
> Last Updated: 2026-02-03

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: CTX-001, CTX-002, CTX-003, CTX-004, CTX-005

---

## Feature

```gherkin
Feature: Integration & Styling
  Als Entwickler
  möchte ich dass das Context Menu einheitlich gestylt ist,
  damit es zum Moltbot Dark Theme passt.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Context Menu Styling

```gherkin
Scenario: Context Menu Styling
  Given das Context Menu ist sichtbar
  Then hat es einen dunklen Hintergrund (Dark Theme)
  And die Schrift ist hell und gut lesbar
  And es gibt Hover-Effekte auf den Menüpunkten
```

### Szenario 2: Modal Styling

```gherkin
Scenario: Modal Styling
  Given das Workflow-Modal ist geöffnet
  Then passt es zum bestehenden aos-create-spec-modal Design
  And der Overlay ist semi-transparent
```

### Szenario 3: Confirm Dialog Styling

```gherkin
Scenario: Confirm Dialog Styling
  Given der Bestätigungsdialog ist sichtbar
  Then hat er zwei Buttons "Abbrechen" und "Verwerfen"
  And der "Verwerfen" Button ist rot/warnend hervorgehoben
```

### Szenario 4: Spec Selector Styling

```gherkin
Scenario: Spec Selector Styling
  Given der Spec-Selektor ist sichtbar
  Then hat das Suchfeld einen Placeholder "Spec suchen..."
  And die Liste hat abwechselnde Hintergrundfarben
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Responsives Verhalten
  Given das Browser-Fenster ist schmal
  When ich das Context Menu öffne
  Then passt sich das Menu der verfügbaren Breite an
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Prüfungen

- [x] CONTAINS: agent-os-ui/ui/src/styles/theme.css enthält ".context-menu"
- [x] CONTAINS: agent-os-ui/ui/src/styles/theme.css enthält ".workflow-modal"
- [x] CONTAINS: agent-os-ui/ui/src/styles/theme.css enthält ".confirm-dialog"
- [x] CONTAINS: agent-os-ui/ui/src/styles/theme.css enthält ".spec-selector"

### Funktions-Prüfungen

- [x] LINT_PASS: cd agent-os-ui && npm run lint
- [x] BUILD_PASS: cd agent-os-ui && npm run build

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
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [x] Unit Tests geschrieben und bestanden
- [x] Code Review durchgeführt
- [x] Keine Linting Errors

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | theme.css | CSS Styles fuer .context-menu, .workflow-modal, .confirm-dialog, .spec-selector |

---

### Technical Details

**WAS:**
- **Context Menu Styles (.context-menu):**
  - Position: absolute, z-index: 1000
  - Background: --color-bg-secondary mit --color-border Border
  - Border-radius: --radius-lg
  - Box-shadow: --shadow-lg
  - Menu Items: Padding, hover State mit --color-bg-tertiary
  - Animation: fade-in (konsistent mit lightbox-fade-in)

- **Workflow Modal Styles (.workflow-modal):**
  - Overlay: --color-bg-primary mit 70% Opacity (wie create-spec-modal__overlay)
  - Modal Box: --color-bg-secondary, --color-accent-primary Border
  - z-index: 1001
  - Header, Content, Footer Sections (wie create-spec-modal)
  - "Zurueck" Button Styling

- **Confirm Dialog Styles (.confirm-dialog):**
  - Overlay: Dunkler als Modal (80% Opacity)
  - Dialog Box: Kleiner als Modal, zentriert
  - z-index: 1002
  - "Verwerfen" Button: --color-accent-error Background (destruktive Aktion)
  - "Abbrechen" Button: Transparent mit Border

- **Spec Selector Styles (.spec-selector):**
  - Suchfeld: --color-bg-primary Background, --color-border, focus State
  - Liste: Scrollbar-Styling fuer Dark Theme
  - Items: Padding, hover State, abwechselnde Hintergrundfarben (:nth-child)
  - Loading Spinner: Zentriert in Container
  - Empty State: Text zentriert, --color-text-muted

**WIE (Architecture Guidance):**
- Pattern: CSS Custom Properties aus :root verwenden (keine hardcoded Farben)
- Pattern: Konsistente Naming Convention: .component__element--modifier
- Pattern: Transitions mit --transition-fast fuer hover Effects
- Pattern: Responsive Breakpoints fuer Mobile (falls notwendig)
- Referenz: Bestehende .create-spec-modal Styles als Basis
- Referenz: .lightbox-overlay fuer Animation Pattern
- z-index Hierarchie: context-menu(1000) < workflow-modal(1001) < confirm-dialog(1002)
- Scrollbar: Webkit Scrollbar Styling fuer Dark Theme

**WO:**
- Modifizieren: `agent-os-ui/ui/src/styles/theme.css`
  - Neuer Section Comment: "Context Menu Styles"
  - Neuer Section Comment: "Workflow Modal Styles"
  - Neuer Section Comment: "Confirm Dialog Styles"
  - Neuer Section Comment: "Spec Selector Styles"

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** CTX-001, CTX-002, CTX-003, CTX-004, CTX-005 (alle Komponenten muessen existieren)

**Geschätzte Komplexität:** S

**Relevante Skills:** frontend-ui-component-architecture

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify Context Menu styles
grep -q ".context-menu" agent-os-ui/ui/src/styles/theme.css && echo "OK: Context Menu styles found" || echo "ERROR: Context Menu styles missing"

# Verify Workflow Modal styles
grep -q ".workflow-modal" agent-os-ui/ui/src/styles/theme.css && echo "OK: Workflow Modal styles found" || echo "ERROR: Workflow Modal styles missing"

# Verify Confirm Dialog styles
grep -q ".confirm-dialog" agent-os-ui/ui/src/styles/theme.css && echo "OK: Confirm Dialog styles found" || echo "ERROR: Confirm Dialog styles missing"

# Verify Spec Selector styles
grep -q ".spec-selector" agent-os-ui/ui/src/styles/theme.css && echo "OK: Spec Selector styles found" || echo "ERROR: Spec Selector styles missing"

# Verify z-index values are correct
grep -q "z-index: 1000" agent-os-ui/ui/src/styles/theme.css && echo "OK: z-index 1000 found" || echo "WARNING: z-index 1000 not found"
grep -q "z-index: 1001" agent-os-ui/ui/src/styles/theme.css && echo "OK: z-index 1001 found" || echo "WARNING: z-index 1001 not found"
grep -q "z-index: 1002" agent-os-ui/ui/src/styles/theme.css && echo "OK: z-index 1002 found" || echo "WARNING: z-index 1002 not found"

# Verify CSS uses custom properties (no hardcoded colors)
grep -E "background(-color)?:\s*#[0-9a-fA-F]" agent-os-ui/ui/src/styles/theme.css | grep -E "\.(context-menu|workflow-modal|confirm-dialog|spec-selector)" && echo "WARNING: Hardcoded colors found" || echo "OK: No hardcoded colors in new styles"

# Lint check
cd agent-os-ui && npm run lint

# Build check
cd agent-os-ui && npm run build
```
