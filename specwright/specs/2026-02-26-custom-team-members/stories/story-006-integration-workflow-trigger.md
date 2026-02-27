# Integration & Workflow-Trigger

> Story ID: CTM-006
> Spec: Custom Team Members
> Created: 2026-02-26
> Last Updated: 2026-02-26

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: XS
**Dependencies**: CTM-002, CTM-003, CTM-004, CTM-005

---

## Feature

```gherkin
Feature: Workflow-Integration und Auto-Refresh
  Als Specwright-Nutzer
  möchte ich über einen Button auf der Team-Seite den /add-team-member Workflow starten können,
  damit ich neue Teammitglieder direkt aus der UI erstellen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Add-Button triggert Workflow

```gherkin
Scenario: "Teammitglied hinzufügen" Button startet Workflow im Terminal
  Given ich bin auf der Team-Seite
  When ich auf "Teammitglied hinzufügen" klicke
  Then öffnet sich ein Terminal-Tab
  And der /add-team-member Workflow wird gestartet
```

### Szenario 2: Auto-Refresh nach Workflow

```gherkin
Scenario: Team-Seite aktualisiert sich nach Skill-Erstellung
  Given ich habe über den Workflow einen neuen Skill erstellt
  When der Workflow abgeschlossen ist
  And ich zur Team-Seite zurückkehre
  Then sehe ich den neuen Skill in der passenden Sektion
```

### Szenario 3: Auto-Refresh nach Edit

```gherkin
Scenario: Team-Seite aktualisiert sich nach Skill-Bearbeitung
  Given ich habe einen Skill im Edit-Modal bearbeitet
  When ich speichere
  Then aktualisiert sich die Team-Karte mit den neuen Informationen
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Prüfungen

- [x] CONTAINS: `ui/frontend/src/views/team-view.ts` enthält "workflow-start-interactive"

### Funktions-Prüfungen

- [x] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0
- [x] LINT_PASS: `cd ui && npm run lint` exits with code 0

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
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Lit-Patterns
- [x] workflow-start-interactive Event korrekt dispatched
- [x] Auto-Refresh nach Änderungen funktioniert

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [x] Frontend Build kompiliert
- [x] Keine Linting Errors

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `team-view.ts` | "Add" Button, workflow-start-interactive Event, Auto-Refresh |
| Frontend | `app.ts` | Event-Handling (falls noch nicht verdrahtet) |

**Kritische Integration Points:**
- `aos-team-view` --> `app.ts` via `workflow-start-interactive` Custom Event

---

### Technical Details

**WAS:**
- "Teammitglied hinzufügen" Button in der Team-View
- `workflow-start-interactive` Event mit `{ commandId: '/add-team-member' }` dispatchen
- Auto-Refresh der Skills-Liste nach Edit/Delete/Workflow-Abschluss

**WIE (Architektur-Guidance):**
- Follow bestehendes `workflow-start-interactive` Pattern aus `aos-getting-started-view`
- Button dispatcht CustomEvent das von `app.ts` gefangen wird
- Refresh: Nach jedem erfolgreichen PUT/DELETE Call die Skills-Liste neu laden
- View-Lifecycle: `connectedCallback` oder `updated` Hook für Refresh

**WO:**
- `ui/frontend/src/views/team-view.ts`
- `ui/frontend/src/app.ts` (minimal, falls Event-Handling noch nicht existiert)

**Abhängigkeiten:** CTM-002 (Workflow existiert), CTM-003 (View existiert), CTM-004 (Edit), CTM-005 (Delete)

**Geschätzte Komplexität:** XS

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Web Components Patterns |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | UI Domain-Wissen |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify workflow trigger event
grep -q "workflow-start-interactive" ui/frontend/src/views/team-view.ts

# Frontend build
cd ui/frontend && npm run build
```

**Story ist DONE wenn:**
1. Add-Button dispatcht workflow-start-interactive Event
2. Auto-Refresh funktioniert nach Edit/Delete
3. Frontend Build kompiliert
