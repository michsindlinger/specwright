# Dashboard View Toggle Specification

> Spec ID: DVT
> Created: 2026-01-30
> Last Updated: 2026-01-30
> Status: Ready for Execution

---

## Overview

Toggle zwischen Card View und List View auf der Project Specs Uebersicht. Benutzer koennen via Icon-Buttons zwischen der bestehenden Grid-Ansicht und einer kompakten Listen-Ansicht wechseln. Die Praeferenz wird im LocalStorage gespeichert.

## User Stories

| Story ID | Title | Type | Priority |
|----------|-------|------|----------|
| DVT-001 | View Toggle Component | Frontend | Critical |
| DVT-002 | List View Implementation | Frontend | Critical |
| DVT-003 | View Preference Persistence | Frontend | High |
| DVT-999 | Integration & E2E Validation | Test | High |

## Spec Scope

**Included:**
- Icon-Buttons Toggle (Grid-Icon, List-Icon)
- Card View (bestehende Grid-Ansicht)
- List View (kompakte Tabelle: Name, Datum, Progress-%)
- LocalStorage Persistenz der Ansichtswahl
- Aktiv-Zustand Visualisierung fuer Toggle-Buttons

**Out of Scope:**
- Sortierung/Filterung der Specs
- Backend-Speicherung der Praeferenz
- Keyboard-Shortcuts fuer View-Wechsel
- Status Badge in List View (nur kompakte Infos)

## Expected Deliverable

Nach Abschluss aller Stories:
1. Toggle-Buttons erscheinen rechts neben den Dashboard-Tabs
2. Click auf Grid-Icon zeigt Card View (bestehend)
3. Click auf List-Icon zeigt kompakte Listen-Ansicht
4. Aktive Ansicht ist visuell hervorgehoben
5. Ansichtswahl wird im Browser gespeichert
6. Nach Reload wird die letzte Ansicht wiederhergestellt

## Integration Requirements

**Integration Type:** Frontend-only

**Integration Test Commands:**
```bash
# 1. Build-Pruefung
cd agent-os-ui/ui && npm run build

# 2. Lint-Pruefung
cd agent-os-ui/ui && npm run lint

# 3. TypeScript Type Check
cd agent-os-ui/ui && npx tsc --noEmit

# 4. Check for new component
test -f agent-os-ui/ui/src/views/dashboard-view.ts && echo "dashboard-view exists"
```

**End-to-End Scenarios:**

1. **View Toggle Flow:**
   - User oeffnet Dashboard
   - Sieht Card View (Default)
   - Klickt auf List-Icon
   - Sieht List View
   - Requires MCP: Optional (Playwright)

2. **Persistence Flow:**
   - User wechselt zu List View
   - Reload der Seite
   - List View ist weiterhin aktiv
   - Requires MCP: No

3. **Card View Interaction:**
   - User ist in List View
   - Klickt auf Grid-Icon
   - Sieht Card View
   - Kann Spec anklicken fuer Kanban-Details
   - Requires MCP: Optional (Playwright)

---

## Technical Architecture

### Betroffene Komponenten

| Layer | Komponente | Aenderung |
|-------|------------|----------|
| Frontend | `ui/src/views/dashboard-view.ts` | Toggle-State, List View Rendering |
| Frontend | `ui/src/styles/theme.css` | Toggle-Button Styles, List View Styles |

### Existierende Infrastruktur

- Dashboard-Tabs Pattern in `dashboard-view.ts`
- Spec-Card Komponente (`aos-spec-card`)
- CSS Custom Properties fuer Dark Theme
- Gateway fuer Spec-Daten

### Neue Dependencies

Keine - reine UI-Erweiterung mit existierenden Mitteln

---

*Detailed stories in `stories/` directory*
