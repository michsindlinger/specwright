# View Toggle Component

> Story ID: DVT-001
> Spec: Dashboard View Toggle
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: Critical
**Type**: Frontend
**Estimated Effort**: TBD
**Dependencies**: None
**Status**: Done

---

## Feature

```gherkin
Feature: View Toggle Component
  Als Entwickler auf der Specs-Uebersicht
  moechte ich zwischen Card View und List View wechseln koennen,
  damit ich die Ansicht waehlen kann die meinen Beduerfnissen entspricht.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Toggle-Buttons sind sichtbar

```gherkin
Scenario: Toggle-Buttons werden auf der Specs-Uebersicht angezeigt
  Given ich bin auf der Dashboard-Seite
  And der "Specs" Tab ist aktiv
  When die Seite vollstaendig geladen ist
  Then sehe ich zwei Icon-Buttons rechts neben den Tabs
  And der erste Button zeigt ein Grid-Icon
  And der zweite Button zeigt ein Listen-Icon
```

### Szenario 2: Card View ist standardmaessig aktiv

```gherkin
Scenario: Card View ist beim ersten Besuch aktiv
  Given ich oeffne das Dashboard zum ersten Mal
  And keine Praeferenz ist gespeichert
  When die Specs geladen wurden
  Then ist das Grid-Icon visuell hervorgehoben
  And die Specs werden als Cards angezeigt
```

### Szenario 3: Wechsel zu List View

```gherkin
Scenario: Click auf List-Icon wechselt zu List View
  Given ich bin auf der Specs-Uebersicht
  And Card View ist aktiv
  When ich auf das Listen-Icon klicke
  Then wird das Listen-Icon visuell hervorgehoben
  And das Grid-Icon ist nicht mehr hervorgehoben
  And die Ansicht wechselt zu List View
```

### Szenario 4: Wechsel zurueck zu Card View

```gherkin
Scenario: Click auf Grid-Icon wechselt zu Card View
  Given ich bin auf der Specs-Uebersicht
  And List View ist aktiv
  When ich auf das Grid-Icon klicke
  Then wird das Grid-Icon visuell hervorgehoben
  And das Listen-Icon ist nicht mehr hervorgehoben
  And die Ansicht wechselt zu Card View
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Toggle funktioniert auch mit leerer Spec-Liste
  Given ich bin auf der Specs-Uebersicht
  And keine Specs vorhanden sind
  When ich auf das Listen-Icon klicke
  Then bleibt die "No specs" Meldung sichtbar
  And das Listen-Icon ist hervorgehoben
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [ ] FILE_EXISTS: ui/src/views/dashboard-view.ts

### Inhalt-Pruefungen

- [ ] CONTAINS: ui/src/views/dashboard-view.ts enthaelt "specsViewMode"
- [ ] CONTAINS: ui/src/views/dashboard-view.ts enthaelt "grid" und "list"
- [ ] CONTAINS: ui/src/styles/theme.css enthaelt ".view-toggle"

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
| Frontend | dashboard-view.ts | Add specsViewMode state, toggle buttons, view switching logic |
| Frontend | theme.css | Add .view-toggle-container, .view-toggle-btn styles |

**Kritische Integration Points:** None (Frontend-only)

---

### Technical Details

**WAS:**
- Add `specsViewMode` reactive property with type `type SpecsViewMode = 'grid' | 'list'`
- Create view toggle button container in renderDashboardTabs() method
- Add two icon buttons (grid icon, list icon) with visual active state
- Implement toggle click handlers to switch specsViewMode state
- Conditionally render grid vs list based on specsViewMode value

**WIE (Architektur-Guidance ONLY):**
- Follow existing Lit component patterns in dashboard-view.ts
- Use @state() decorator for specsViewMode (reactive, triggers re-render)
- Default value: 'grid' (Card View is default)
- Place toggle buttons inside .dashboard-tabs container, aligned right using flexbox
- Use inline SVG icons for grid (4x4 squares) and list (horizontal lines) icons
- Apply .active class to currently selected toggle button
- Follow existing tab button styling patterns (.dashboard-tab.active)
- Use CSS custom properties from theme.css for consistent styling

**WO:**
- `agent-os-ui/ui/src/views/dashboard-view.ts`
- `agent-os-ui/ui/src/styles/theme.css`

**Abhaengigkeiten:** None

**Geschaetzte Komplexitaet:** S (Small - 2 files, ~80 LOC)

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

# Contains specsViewMode state
grep -q "specsViewMode" agent-os-ui/ui/src/views/dashboard-view.ts && echo "OK: specsViewMode found" || exit 1

# Contains grid and list type
grep -q "'grid'" agent-os-ui/ui/src/views/dashboard-view.ts && echo "OK: grid type found" || exit 1
grep -q "'list'" agent-os-ui/ui/src/views/dashboard-view.ts && echo "OK: list type found" || exit 1

# Contains view-toggle styles
grep -q ".view-toggle" agent-os-ui/ui/src/styles/theme.css && echo "OK: view-toggle styles found" || exit 1

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
