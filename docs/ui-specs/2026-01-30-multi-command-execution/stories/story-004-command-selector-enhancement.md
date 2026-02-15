# Command Selector Enhancement

> Story ID: MCE-004
> Spec: Multi-Command Execution
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: XS
**Dependencies**: MCE-001, MCE-002

---

## Feature

```gherkin
Feature: Command Selector Enhancement
  Als Entwickler
  möchte ich beim Starten eines Commands wählen können ob er in einem neuen Tab öffnet,
  damit ich parallel arbeiten kann ohne die aktuelle Execution zu unterbrechen.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Command in neuem Tab starten via Plus-Button

```gherkin
Scenario: Plus-Button öffnet Command-Selector
  Given ich habe mindestens eine aktive Execution
  When ich auf den "+" Button in der Tab-Leiste klicke
  Then öffnet sich der Command-Selector
  And ich kann einen Command auswählen
  And der neue Command startet in einem neuen Tab
```

### Szenario 2: Command-Selector zeigt verfügbare Commands

```gherkin
Scenario: Command-Selector listet verfügbare Commands
  Given der Command-Selector ist geöffnet
  When ich die Liste der Commands sehe
  Then sehe ich alle verfügbaren Commands wie "/create-spec", "/execute-tasks"
  And jeder Command hat eine kurze Beschreibung
```

### Szenario 3: Quick-Start für häufige Commands

```gherkin
Scenario: Schneller Start eines Commands
  Given der Command-Selector ist geöffnet
  When ich auf einen Command wie "/create-spec" klicke
  Then startet der Command sofort in einem neuen Tab
  And der Command-Selector schließt sich
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Command-Selector abbrechen
  Given der Command-Selector ist geöffnet
  When ich außerhalb des Selectors klicke
  Then schließt sich der Selector
  And kein neuer Tab wird erstellt
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/command-selector.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: agent-os-ui/ui/src/components/command-selector.ts enthält "customElement('aos-command-selector')"
- [ ] CONTAINS: agent-os-ui/ui/src/components/execution-tabs.ts enthält "aos-command-selector"

### Funktions-Prüfungen

- [ ] LINT_PASS: cd agent-os-ui && npm run lint exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | - |

---

## Technisches Refinement (vom Architect)

> **HINWEIS:** Technisches Refinement abgeschlossen am 2026-01-30

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

**Story ist READY wenn alle Checkboxen angehakt sind.** ✓ READY

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Keyboard navigation (Escape schließt Selector)
- [x] Click-outside schließt Selector

#### Dokumentation
- [x] Code ist selbstdokumentierend (klare Benennung)
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.** ✓ DONE

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | components/command-selector.ts | Neue Dropdown-Komponente |
| Frontend | components/execution-tabs.ts | Integration mit Plus-Button |

**Kritische Integration Points:**
- N/A (Frontend-only)

---

### Technical Details

**WAS:**
- Neue `aos-command-selector` Komponente als Dropdown/Popover
- Integration in execution-tabs.ts beim Plus-Button Click
- Command-Liste von workflow-view.ts als Property erhalten

**WIE (Architektur-Guidance ONLY):**
- Nutze bestehende `commands` Liste aus workflow-view.ts (workflow.list WebSocket)
- Dropdown mit absoluter Positionierung relativ zum Plus-Button
- Click-outside-to-close via document.addEventListener('click')
- Escape-Key schließt Selector (keyboard accessibility)
- Custom Event `command-select` mit commandId dispatchen
- ARIA role="listbox" für Accessibility

**WO:**
- agent-os-ui/ui/src/components/command-selector.ts (NEU)
- agent-os-ui/ui/src/components/execution-tabs.ts (Anpassung: Selector einbinden)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** MCE-001 (Tab Bar), MCE-002 (Store für neue Execution)

**Geschätzte Komplexität:** XS (2 Dateien, ~120 LOC)

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
test -f agent-os-ui/ui/src/components/command-selector.ts && echo "PASS: command-selector.ts exists" || exit 1
grep -q "customElement('aos-command-selector')" agent-os-ui/ui/src/components/command-selector.ts && echo "PASS: aos-command-selector registered" || exit 1
grep -q "command-select" agent-os-ui/ui/src/components/command-selector.ts && echo "PASS: command-select event" || exit 1
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run build
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
