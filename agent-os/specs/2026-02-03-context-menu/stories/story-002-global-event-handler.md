# Global Event Handler

> Story ID: CTX-002
> Spec: 2026-02-03-context-menu
> Created: 2026-02-03
> Last Updated: 2026-02-03

**Priority**: High
**Type**: Frontend
**Estimated Effort**: XS
**Dependencies**: CTX-001

**Status**: Done

---

## Feature

```gherkin
Feature: Global Event Handler
  Als Entwickler
  möchte ich das Context Menu überall in der Anwendung per Rechtsklick öffnen,
  damit ich von jeder Stelle aus Workflows starten kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Rechtsklick verhindert Browser-Kontextmenü

```gherkin
Scenario: Rechtsklick verhindert Browser-Kontextmenü
  Given ich bin in der Agent OS Web UI
  When ich rechtsklicke
  Then erscheint NICHT das native Browser-Kontextmenü
  And stattdessen erscheint das Agent OS Context Menu
```

### Szenario 2: Context Menu Position folgt Mauszeiger

```gherkin
Scenario: Context Menu Position folgt Mauszeiger
  Given ich bin in der Agent OS Web UI
  When ich an Position x=200, y=300 rechtsklicke
  Then erscheint das Context Menu bei dieser Position
```

### Szenario 3: Menüauswahl triggert Modal

```gherkin
Scenario: Menüauswahl triggert Modal
  Given das Context Menu ist sichtbar
  When ich auf "Neue Spec erstellen" klicke
  Then schließt sich das Context Menu
  And ein Modal mit dem create-spec Workflow öffnet sich
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Kein zweites Context Menu wenn Modal offen
  Given ein Workflow-Modal ist geöffnet
  When ich rechtsklicke
  Then erscheint KEIN neues Context Menu
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Prüfungen

- [x] CONTAINS: agent-os-ui/ui/src/app.ts enthält "contextmenu"
- [x] CONTAINS: agent-os-ui/ui/src/app.ts enthält "aos-context-menu"

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
- [ ] Unit Tests geschrieben und bestanden
- [x] Code Review durchgeführt
- [x] Keine Linting Errors

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | app.ts | Global contextmenu listener, State fuer Context Menu, menu-item-select Handler |
| Frontend | app.ts | Import fuer aos-context-menu Komponente |

**Kritische Integration Points:**
- app.ts → aos-context-menu (Event Handler → Komponente rendern)
- aos-context-menu → app.ts (menu-item-select Event → Modal oeffnen)

---

### Technical Details

**WAS:**
- Global `contextmenu` Event Listener in app.ts connectedCallback hinzufuegen
- State Properties: `showContextMenu: boolean`, `contextMenuPosition: {x: number, y: number}`
- `e.preventDefault()` um Browser Context Menu zu unterdruecken
- Handler fuer `menu-item-select` Event der aos-context-menu Komponente
- Bedingtes Rendern der aos-context-menu Komponente im render() Template
- Guard: Kein Context Menu oeffnen wenn Modal bereits offen

**WIE (Architecture Guidance):**
- Pattern: Event Listener Binding wie bestehende boundHashHandler in app.ts
- Pattern: @state() Decorator fuer reactive Properties (showContextMenu, contextMenuPosition)
- Pattern: Event Handler Cleanup in disconnectedCallback
- Pattern: Conditional Rendering mit ternary operator wie bei aos-project-add-modal
- Guard: Pruefe `showAddProjectModal` oder neuen `showWorkflowModal` State vor Context Menu oeffnen
- Event Position: `e.clientX`, `e.clientY` aus MouseEvent

**WO:**
- Modifizieren: `agent-os-ui/ui/src/app.ts`
  - Import hinzufuegen: `import './components/aos-context-menu.js'`
  - State Properties hinzufuegen
  - Event Listener in connectedCallback/disconnectedCallback
  - Handler Methode fuer menu-item-select
  - aos-context-menu im render() Template

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** CTX-001 (aos-context-menu Komponente muss existieren)

**Geschätzte Komplexität:** XS

**Relevante Skills:** frontend-ui-component-architecture

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify contextmenu event listener
grep -q "contextmenu" agent-os-ui/ui/src/app.ts && echo "OK: contextmenu listener found" || echo "ERROR: contextmenu listener missing"

# Verify aos-context-menu import
grep -q "aos-context-menu" agent-os-ui/ui/src/app.ts && echo "OK: aos-context-menu import found" || echo "ERROR: aos-context-menu import missing"

# Verify state property for context menu
grep -q "showContextMenu" agent-os-ui/ui/src/app.ts && echo "OK: showContextMenu state found" || echo "ERROR: showContextMenu state missing"

# Verify menu-item-select handler
grep -q "menu-item-select" agent-os-ui/ui/src/app.ts && echo "OK: menu-item-select handler found" || echo "ERROR: menu-item-select handler missing"

# Lint check
cd agent-os-ui && npm run lint

# Build check
cd agent-os-ui && npm run build
```
