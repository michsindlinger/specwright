# Frontend Kanban-Board: In Review Spalte

> Story ID: KIRC-003
> Spec: Kanban In Review Column
> Created: 2026-02-12
> Last Updated: 2026-02-12

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: KIRC-001

---

## Feature

```gherkin
Feature: In Review Spalte im Kanban-Board
  Als Benutzer
  möchte ich eine "In Review"-Spalte zwischen "In Progress" und "Done" im Kanban-Board sehen,
  damit ich klar erkennen kann welche Stories auf meine Prüfung warten.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: In Review Spalte wird angezeigt

```gherkin
Scenario: Kanban-Board zeigt 5 Spalten
  Given ich öffne das Kanban-Board einer Spezifikation
  When das Board geladen ist
  Then sehe ich die Spalten: "Backlog", "In Progress", "In Review", "Done", "Blocked"
  And "In Review" befindet sich zwischen "In Progress" und "Done"
```

### Szenario 2: Story wird nach Workflow-Abschluss in In Review angezeigt

```gherkin
Scenario: Abgeschlossene Story erscheint in In Review
  Given eine Story wird gerade über den Workflow ausgeführt
  When der Workflow die Story als abgeschlossen meldet
  Then erscheint die Story-Card in der "In Review"-Spalte
  And die Story-Card zeigt den aktuellen Titel und Status
```

### Szenario 3: In Review Spalte hat eigene Farbgebung

```gherkin
Scenario: In Review Spalte hat visuell eigene Farbe
  Given das Kanban-Board ist geladen
  When ich die Spaltenheader betrachte
  Then hat "In Review" eine orange/amber Farbgebung
  And unterscheidet sich visuell von "In Progress" und "Done"
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Leere In Review Spalte
  Given keine Story hat den Status "in_review"
  When das Kanban-Board geladen wird
  Then wird die "In Review"-Spalte angezeigt aber ohne Story-Cards
  And der Counter zeigt "0"
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Prüfungen

- [x] CONTAINS: `kanban-board.ts` enthält "in_review" in KanbanStatus Type
- [x] CONTAINS: `kanban-board.ts` enthält Column-Rendering für "In Review"
- [x] CONTAINS: `kanban-board.ts` enthält CSS für "in-review" Spalte

### Funktions-Prüfungen

- [x] BUILD_PASS: `cd agent-os-ui/ui && npx tsc --noEmit` exits with code 0

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

> **Dieser Abschnitt wird vom Architect ausgefüllt**

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

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert** (Frontend/Backend/Database/DevOps)
- [x] **Integration Type bestimmt** (Backend-only/Frontend-only/Full-stack)
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer: API Contracts, Data Structures)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Code Review durchgeführt und genehmigt
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

#### Dokumentation
- [x] Dokumentation aktualisiert

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `agent-os-ui/ui/src/components/kanban-board.ts` | `KanbanStatus` Type erweitern; `StoryInfo.status` Type erweitern; `getStoriesByStatus` neuer Aufruf; `render()` Spaltenreihenfolge; `renderColumn()` Wiederverwendung; CSS fuer `.in-review` Spalte; `handleWorkflowComplete` toStatus aendern |

**Handover-Hinweis:**
- Die Backend-seitige Type-Erweiterung (KIRC-001) stellt sicher, dass `in_review` als eigenstaendiger Status vom Server kommt
- KIRC-004 baut auf den hier erstellten Spaltenrendering und KanbanStatus Type auf

---

### Technical Details

**WAS:** Neue "In Review" Spalte im Kanban-Board UI zwischen "In Progress" und "Done" rendern. Nach Workflow-Abschluss landen Stories in "In Review" statt "Done".

**WIE (Architektur-Guidance ONLY):**
- `KanbanStatus` Type (Zeile 47) um `'in_review'` erweitern: `'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked'`
- `StoryInfo.status` Type (Zeile 33) um `'in_review'` erweitern (analog zu KanbanStatus)
- `getStoriesByStatus` (Zeile 973): Bestehende Methode fuer `'in_review'` nutzen
- `render()` Methode (ab Zeile 1464): Neue Variable `const inReview = this.getStoriesByStatus('in_review');` hinzufuegen
- Spaltenreihenfolge aendern: Backlog, Blocked, In Progress, **In Review**, Done (aktuell: Backlog, Blocked, In Progress, Done)
- `this.renderColumn('in_review', 'In Review', inReview, 'in-review')` zwischen In Progress und Done einfuegen
- Bestehendes `renderColumn()` Pattern (Zeile 1363) UNVERAENDERT wiederverwenden - es akzeptiert bereits `KanbanStatus` generisch
- CSS: Neue Regel `.kanban-column.in-review` mit `border-top: 3px solid var(--warning-color, #f59e0b)` (orange/amber Farbgebung analog zum bestehenden Theme)
- `handleWorkflowComplete` (Zeile 852): `toStatus` von `'done'` auf `'in_review'` aendern
- Sort-Order in `getKanbanBoard` Result (Backend, Zeile 696): `in_review` sollte NACH `in_progress` und VOR `done` sortiert werden - aber dies ist Backend-Logik und wird in KIRC-001 behandelt
- `canMoveToInProgress` (Zeile 58): Pruefen ob `in_review` Dependencies korrekt behandelt werden - eine Story in `in_review` ist NICHT `done`, Dependencies zaehlen als nicht erfuellt

**WO:**
- `agent-os-ui/ui/src/components/kanban-board.ts` (1 Datei, ~30 LOC)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** KIRC-001 (Backend muss `in_review` als eigenstaendigen Status liefern)

**Geschätzte Komplexität:** S (1 Datei, ~30 LOC)

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Relevante Skills

| Skill | Pfad | Relevanz |
|-------|------|----------|
| frontend-lit/components | `.claude/skills/frontend-lit/components.md` | Lit Component Architecture (renderColumn Pattern) |
| frontend-lit/state-management | `.claude/skills/frontend-lit/state-management.md` | Reactive State mit @state Decorator |
| domain-agent-os-web-ui/task-tracking | `.claude/skills/domain-agent-os-web-ui/task-tracking.md` | Kanban Board Domain Knowledge |

---

### Completion Check

```bash
# Auto-Verify Commands - alle muessen mit 0 exiten

# 1. Frontend TypeScript kompiliert fehlerfrei
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui && npx tsc --noEmit

# 2. KanbanStatus Type enthaelt in_review
grep -q "in_review" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui/src/components/kanban-board.ts

# 3. renderColumn Aufruf fuer in_review existiert
grep -q "In Review" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui/src/components/kanban-board.ts

# 4. CSS fuer in-review Spalte existiert
grep -q "in-review" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui/src/components/kanban-board.ts

# 5. handleWorkflowComplete setzt in_review
grep -q "in_review" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui/src/components/kanban-board.ts
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Frontend TSC kompiliert fehlerfrei
3. Git diff zeigt nur Aenderungen in `kanban-board.ts`
