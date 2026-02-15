# Integration & E2E Validation

> Story ID: DVT-999
> Spec: Dashboard View Toggle
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Test/Integration
**Estimated Effort**: TBD
**Dependencies**: DVT-001, DVT-002, DVT-003
**Status**: Done

---

## Feature

```gherkin
Feature: Integration & End-to-End Validation
  Als Systemadministrator
  moechte ich dass alle Komponenten dieser Spec zusammenwirken,
  damit das Feature vollstaendig funktioniert.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Kompletter Toggle-Flow

```gherkin
Scenario: Vollstaendiger Wechsel zwischen Views
  Given ich bin auf der Specs-Uebersicht
  And Card View ist aktiv (Default)
  When ich auf das Listen-Icon klicke
  Then wechselt die Ansicht zu List View
  And alle Specs werden als Tabellen-Zeilen angezeigt
  When ich auf das Grid-Icon klicke
  Then wechselt die Ansicht zurueck zu Card View
  And alle Specs werden als Cards angezeigt
```

### Szenario 2: Persistence ueber Reload

```gherkin
Scenario: Ansicht bleibt nach Reload erhalten
  Given ich bin auf der Specs-Uebersicht
  And ich habe zu List View gewechselt
  When ich die Seite neu lade
  Then wird List View angezeigt
  And das Listen-Icon ist hervorgehoben
```

### Szenario 3: Navigation aus List View

```gherkin
Scenario: Spec oeffnen aus List View
  Given ich bin auf der Specs-Uebersicht in List View
  And es gibt mindestens eine Spec
  When ich auf eine Spec-Zeile klicke
  Then wechselt die Ansicht zur Kanban-View dieser Spec
  When ich zurueck zur Specs-Uebersicht navigiere
  Then wird List View angezeigt (Praeferenz erhalten)
```

### Szenario 4: Tab-Wechsel und Rueckkehr

```gherkin
Scenario: View-Praeferenz bleibt bei Tab-Wechsel
  Given ich bin auf der Specs-Uebersicht in List View
  When ich zum Docs-Tab wechsle
  And dann zurueck zum Specs-Tab wechsle
  Then wird weiterhin List View angezeigt
```

---

## Technische Verifikation (Automated Checks)

### Integrations-Pruefungen

- [ ] INTEGRATION_PASS: cd ui && npm run build (gesamtes Frontend baut)
- [ ] LINT_PASS: cd ui && npm run lint (keine Lint-Fehler)
- [ ] TYPE_CHECK: cd ui && npx tsc --noEmit (keine Type-Fehler)

### End-to-End Checks

- [ ] E2E_OPTIONAL: Toggle zwischen Views funktioniert im Browser
- [ ] E2E_OPTIONAL: LocalStorage Persistence funktioniert nach Reload

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| Playwright (Optional) | E2E Tests | No |

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

**Integration Type:** Frontend-only (Integration Testing)

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | dashboard-view.ts | Verify all DVT features work together |
| Frontend | theme.css | Verify all styles are applied correctly |

**Kritische Integration Points:**
- Toggle buttons trigger view mode change
- View mode change triggers correct render method
- LocalStorage persistence survives page reload
- Tab navigation preserves view mode preference

---

### Technical Details

**WAS:**
- Verify complete toggle flow (grid -> list -> grid)
- Verify localStorage persistence after page reload
- Verify navigation from list view to kanban and back preserves preference
- Verify tab switching (Specs -> Docs -> Specs) preserves view mode
- Run full lint, build, and type checks
- Manual/E2E verification of all acceptance criteria from DVT-001, DVT-002, DVT-003

**WIE (Architektur-Guidance ONLY):**
- This is a validation story - no new code implementation
- Run all completion checks from DVT-001, DVT-002, DVT-003
- Run integration build to ensure all components compile together
- Manual testing in browser recommended for E2E scenarios
- Playwright E2E tests are optional but recommended for regression

**WO:**
- `agent-os-ui/ui/src/views/dashboard-view.ts` (verify)
- `agent-os-ui/ui/src/styles/theme.css` (verify)

**Abhaengigkeiten:** DVT-001, DVT-002, DVT-003 (all must be complete)

**Geschaetzte Komplexitaet:** XS (Extra Small - validation only, no new code)

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| - | - | No skill-index available |

---

### Completion Check

```bash
# Auto-Verify Commands - alle muessen mit 0 exiten

# === DVT-001 Checks ===
grep -q "specsViewMode" agent-os-ui/ui/src/views/dashboard-view.ts && echo "OK: specsViewMode found" || exit 1
grep -q "'grid'" agent-os-ui/ui/src/views/dashboard-view.ts && echo "OK: grid type found" || exit 1
grep -q "'list'" agent-os-ui/ui/src/views/dashboard-view.ts && echo "OK: list type found" || exit 1
grep -q ".view-toggle" agent-os-ui/ui/src/styles/theme.css && echo "OK: view-toggle styles found" || exit 1

# === DVT-002 Checks ===
grep -q "renderSpecsListView\|renderListView" agent-os-ui/ui/src/views/dashboard-view.ts && echo "OK: list view render method found" || exit 1
grep -q ".spec-list" agent-os-ui/ui/src/styles/theme.css && echo "OK: spec-list styles found" || exit 1

# === DVT-003 Checks ===
grep -q "localStorage" agent-os-ui/ui/src/views/dashboard-view.ts && echo "OK: localStorage found" || exit 1
grep -q "aos-dashboard-view-mode" agent-os-ui/ui/src/views/dashboard-view.ts && echo "OK: storage key found" || exit 1

# === Integration Checks ===
cd agent-os-ui/ui && npm run lint && echo "OK: Lint passed"
cd agent-os-ui/ui && npm run build && echo "OK: Build passed"
cd agent-os-ui/ui && npx tsc --noEmit && echo "OK: TypeScript check passed"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
