# List View Implementation

> Story ID: DVT-002
> Spec: Dashboard View Toggle
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: Critical
**Type**: Frontend
**Estimated Effort**: TBD
**Dependencies**: DVT-001
**Status**: Done

---

## Feature

```gherkin
Feature: List View Implementation
  Als Entwickler mit vielen Specs
  moechte ich eine kompakte Listenansicht haben,
  damit ich schnell alle Specs ueberblicken kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: List View zeigt Tabelle

```gherkin
Scenario: Specs werden als Tabelle dargestellt
  Given ich bin auf der Specs-Uebersicht
  And List View ist aktiv
  When die Specs geladen wurden
  Then sehe ich eine Tabelle mit Header-Zeile
  And jede Spec ist eine eigene Zeile
```

### Szenario 2: Kompakte Informationen

```gherkin
Scenario: Jede Zeile zeigt Name, Datum und Progress
  Given ich bin auf der Specs-Uebersicht in List View
  And es gibt Specs wie "Multi-Session-Chat" vom "2026-01-30" mit 50% Progress
  When die Liste angezeigt wird
  Then sehe ich den Spec-Namen "Multi-Session-Chat"
  And das Erstelldatum "2026-01-30"
  And den Fortschritt "50%"
```

### Szenario 3: Zeile ist klickbar

```gherkin
Scenario: Click auf Zeile oeffnet Kanban-View
  Given ich bin auf der Specs-Uebersicht in List View
  And es gibt eine Spec "Dashboard View Toggle"
  When ich auf die Zeile klicke
  Then wechselt die Ansicht zur Kanban-View dieser Spec
```

### Szenario 4: Hover-Effekt

```gherkin
Scenario: Zeile zeigt Hover-Effekt
  Given ich bin auf der Specs-Uebersicht in List View
  When ich mit der Maus ueber eine Spec-Zeile fahre
  Then wird die Zeile visuell hervorgehoben
  And der Cursor zeigt einen Pointer
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Leere Liste zeigt Hinweis
  Given ich bin auf der Specs-Uebersicht in List View
  And keine Specs vorhanden sind
  When die Liste angezeigt wird
  Then sehe ich einen Hinweis "Keine Specs gefunden"
  And keine leere Tabelle
```

```gherkin
Scenario: Lange Spec-Namen werden abgekuerzt
  Given es gibt eine Spec mit sehr langem Namen
  When ich die List View betrachte
  Then wird der Name abgekuerzt mit "..."
  And der volle Name erscheint im Tooltip
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [ ] FILE_EXISTS: ui/src/views/dashboard-view.ts

### Inhalt-Pruefungen

- [ ] CONTAINS: ui/src/views/dashboard-view.ts enthaelt "renderSpecsList" oder "renderListView"
- [ ] CONTAINS: ui/src/styles/theme.css enthaelt ".spec-list"

### Funktions-Pruefungen

- [ ] LINT_PASS: cd ui && npm run lint
- [ ] BUILD_PASS: cd ui && npm run build
- [ ] TYPE_CHECK: cd ui && npx tsc --noEmit

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | - |

---

## Technisches Refinement (vom Architect)

> **Refinement durchgefuehrt:** 2026-01-30

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

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [ ] Unit Tests geschrieben und bestanden
- [ ] Integration Tests geschrieben und bestanden
- [ ] Code Review durchgefuehrt und genehmigt

#### Dokumentation
- [ ] Dokumentation aktualisiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | dashboard-view.ts | Add renderSpecsListView() method with table layout |
| Frontend | theme.css | Add .spec-list, .spec-list-header, .spec-list-row styles |

**Kritische Integration Points:** None (Frontend-only)

---

### Technical Details

**WAS:**
- Create new renderSpecsListView() method for table/list layout
- Render table header row with columns: Name, Date, Progress
- Render each spec as a clickable table row (.spec-list-row)
- Display spec name with text-overflow ellipsis and title tooltip for long names
- Display formatted date (use existing formatDate pattern from spec-card.ts)
- Display progress percentage with visual indicator
- Apply hover effect on rows (cursor: pointer, background highlight)
- Handle click on row to trigger spec selection (same as card click)
- Handle empty state when no specs (show "Keine Specs gefunden" message)

**WIE (Architektur-Guidance ONLY):**
- Follow existing Lit template patterns in dashboard-view.ts
- Modify renderSpecsList() to conditionally call renderSpecsListView() or renderSpecsGridView()
- Reuse existing handleSpecSelect() event handler for row clicks
- Use CSS Grid or flexbox for table layout (consistent column widths)
- Apply existing hover patterns from .spec-card:hover
- Use title attribute for tooltip on truncated spec names
- Follow existing empty-state pattern from renderSpecsList()
- Use CSS custom properties for consistent styling (--color-*, --spacing-*, etc.)

**WO:**
- `agent-os-ui/ui/src/views/dashboard-view.ts`
- `agent-os-ui/ui/src/styles/theme.css`

**Abhaengigkeiten:** DVT-001 (requires specsViewMode state and toggle buttons)

**Geschaetzte Komplexitaet:** S (Small - 2 files, ~100 LOC)

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| - | - | No skill-index available |

---

### Completion Check

```bash
# Auto-Verify Commands - alle muessen mit 0 exiten
# File exists
test -f agent-os-ui/ui/src/views/dashboard-view.ts && echo "OK: dashboard-view.ts exists" || exit 1

# Contains list view render method
grep -q "renderSpecsListView\|renderListView" agent-os-ui/ui/src/views/dashboard-view.ts && echo "OK: list view render method found" || exit 1

# Contains spec-list styles
grep -q ".spec-list" agent-os-ui/ui/src/styles/theme.css && echo "OK: spec-list styles found" || exit 1

# Contains spec-list-row styles
grep -q ".spec-list-row" agent-os-ui/ui/src/styles/theme.css && echo "OK: spec-list-row styles found" || exit 1

# Lint check
cd agent-os-ui/ui && npm run lint

# Build check
cd agent-os-ui/ui && npm run build

# Type check
cd agent-os-ui/ui && npx tsc --noEmit
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
