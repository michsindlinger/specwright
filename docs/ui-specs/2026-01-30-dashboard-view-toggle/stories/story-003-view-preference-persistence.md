# View Preference Persistence

> Story ID: DVT-003
> Spec: Dashboard View Toggle
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Frontend
**Estimated Effort**: TBD
**Dependencies**: DVT-001
**Status**: Done

---

## Feature

```gherkin
Feature: View Preference Persistence
  Als wiederkehrender Benutzer
  moechte ich dass meine Ansichts-Praeferenz gespeichert wird,
  damit ich nach einem Reload nicht erneut wechseln muss.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Praeferenz wird beim Wechsel gespeichert

```gherkin
Scenario: Ansichtswechsel speichert im LocalStorage
  Given ich bin auf der Specs-Uebersicht
  And Card View ist aktiv
  When ich auf das Listen-Icon klicke
  Then wird "list" im LocalStorage unter "aos-dashboard-view-mode" gespeichert
```

### Szenario 2: Praeferenz wird beim Laden wiederhergestellt

```gherkin
Scenario: Gespeicherte Praeferenz wird beim Laden verwendet
  Given im LocalStorage ist "list" unter "aos-dashboard-view-mode" gespeichert
  When ich das Dashboard oeffne
  Then wird List View angezeigt
  And das Listen-Icon ist hervorgehoben
```

### Szenario 3: Keine Praeferenz verwendet Default

```gherkin
Scenario: Ohne gespeicherte Praeferenz wird Card View verwendet
  Given kein Eintrag im LocalStorage fuer "aos-dashboard-view-mode"
  When ich das Dashboard oeffne
  Then wird Card View angezeigt
  And das Grid-Icon ist hervorgehoben
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: LocalStorage nicht verfuegbar
  Given LocalStorage ist blockiert (Privacy-Modus)
  When ich die Ansicht wechsle
  Then funktioniert der Wechsel trotzdem
  And nach Reload wird Card View angezeigt (Default)
```

```gherkin
Scenario: Ungueltiger Wert im LocalStorage
  Given im LocalStorage steht ein ungueltiger Wert "invalid"
  When ich das Dashboard oeffne
  Then wird Card View angezeigt (Default)
  And der ungueltige Wert wird ueberschrieben
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [ ] FILE_EXISTS: ui/src/views/dashboard-view.ts

### Inhalt-Pruefungen

- [ ] CONTAINS: ui/src/views/dashboard-view.ts enthaelt "localStorage"
- [ ] CONTAINS: ui/src/views/dashboard-view.ts enthaelt "aos-dashboard-view-mode"

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
| Frontend | dashboard-view.ts | Add localStorage read/write for view preference |

**Kritische Integration Points:** None (Frontend-only)

---

### Technical Details

**WAS:**
- Define constant for localStorage key: `const STORAGE_KEY = 'aos-dashboard-view-mode'`
- Load saved preference in connectedCallback() or initialize specsViewMode state
- Save preference to localStorage whenever specsViewMode changes (in toggle handler)
- Validate loaded value is either 'grid' or 'list', fallback to 'grid' if invalid
- Handle localStorage unavailable (try/catch) - gracefully degrade to default

**WIE (Architektur-Guidance ONLY):**
- Define storage key as module-level constant for consistency
- Use try/catch around localStorage operations to handle privacy mode
- In connectedCallback() or property initializer: read from localStorage
- Type guard: check if loaded value is valid SpecsViewMode before using
- In toggle handler: wrap localStorage.setItem in try/catch
- If localStorage.getItem returns null or invalid value, use 'grid' as default
- Do NOT create separate utility/service - keep logic inline in component
- Follow existing pattern of inline localStorage usage in Lit components

**WO:**
- `agent-os-ui/ui/src/views/dashboard-view.ts`

**Abhaengigkeiten:** DVT-001 (requires specsViewMode state)

**Geschaetzte Komplexitaet:** XS (Extra Small - 1 file, ~30 LOC)

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

# Contains localStorage usage
grep -q "localStorage" agent-os-ui/ui/src/views/dashboard-view.ts && echo "OK: localStorage found" || exit 1

# Contains storage key
grep -q "aos-dashboard-view-mode" agent-os-ui/ui/src/views/dashboard-view.ts && echo "OK: storage key found" || exit 1

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
