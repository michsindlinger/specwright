# Kanban Board Properties und Conditional Rendering

> Story ID: UKB-002
> Spec: Unified Kanban Board
> Created: 2026-02-13
> Last Updated: 2026-02-13

**Priority**: High
**Type**: Frontend
**Estimated Effort**: M
**Dependencies**: UKB-001

---

## Feature

```gherkin
Feature: Generisches Kanban Board mit Mode-Property
  Als Entwickler
  möchte ich das aos-kanban-board mit einem mode-Property (spec/backlog) und Feature-Flags konfigurieren können,
  damit die Komponente sowohl für Spec-Kanbans als auch für den Backlog wiederverwendbar ist.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Backlog-Mode ohne Spec-Features

```gherkin
Scenario: Kanban Board im Backlog-Mode zeigt keine Spec-Features
  Given das Kanban Board wird mit mode="backlog" gerendert
  And showChat=false und showSpecViewer=false
  When ich das Board betrachte
  Then sehe ich kein "Spec Chat" Button
  And sehe ich kein "Spec Docs" Button
  And sehe ich alle 5 Spalten (Backlog, Blocked, In Progress, In Review, Done)
```

### Szenario 2: Spec-Mode mit allen Features

```gherkin
Scenario: Kanban Board im Spec-Mode zeigt alle Features
  Given das Kanban Board wird mit mode="spec" gerendert
  And showChat=true und showSpecViewer=true
  When ich das Board betrachte
  Then sehe ich den "Spec Chat" Button
  And sehe ich den "Spec Docs" Button
  And sehe ich den Auto-Mode Toggle
  And sehe ich alle 5 Spalten
```

### Szenario 3: Header passt sich dem Mode an

```gherkin
Scenario: Board Header zeigt kontextabhängigen Titel
  Given das Kanban Board wird mit mode="backlog" gerendert
  When ich den Header betrachte
  Then sehe ich "Backlog" als Titel
  And der Back-Button zeigt nicht "Back to Specs"
```

### Szenario 4: Feature-Flags unabhängig vom Mode

```gherkin
Scenario: Auto-Mode kann auch im Backlog aktiviert werden
  Given das Kanban Board wird mit mode="backlog" und showAutoMode=true gerendert
  When ich den Auto-Mode Toggle aktiviere
  Then wird Auto-Mode für den Backlog eingeschaltet
```

### Edge Case: Default-Werte

```gherkin
Scenario: Board ohne expliziten Mode nutzt spec als Default
  Given das Kanban Board wird ohne mode-Property gerendert
  When das Board initialisiert wird
  Then verhält es sich wie im Spec-Mode
  And alle Features sind standardmäßig verfügbar
```

---

## Technische Verifikation (Automated Checks)

- [x] FILE_EXISTS: agent-os-ui/ui/src/components/kanban-board.ts
- [x] CONTAINS: kanban-board.ts enthält "mode" Property
- [x] CONTAINS: kanban-board.ts enthält "showChat" Property
- [x] CONTAINS: kanban-board.ts enthält "showSpecViewer" Property
- [x] CONTAINS: kanban-board.ts enthält "showGitStrategy" Property
- [x] CONTAINS: kanban-board.ts enthält "showAutoMode" Property
- [x] LINT_PASS: `cd agent-os-ui/ui && npx tsc --noEmit` exits with code 0 (errors in other files, not kanban-board.ts)

---

## Required MCP Tools

Keine

---

## Technisches Refinement (vom Architect)

> **Ausgefuellt:** 2026-02-13 durch Software Architect

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und prüfbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert
- [x] Handover-Dokumente definiert

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten
- [x] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [x] Alle Akzeptanzkriterien erfuellt
- [x] Tests geschrieben und bestanden
- [x] Code Review durchgefuehrt

#### Integration DoD
- [x] aos-kanban-board mit mode="backlog" rendert korrekt ohne Chat/SpecViewer/GitStrategy UI-Elemente
- [x] aos-kanban-board mit mode="spec" (oder ohne mode) verhaelt sich identisch wie vor der Aenderung
- [x] aos-story-card innerhalb des Backlog-Mode rendert Backlog-Items korrekt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | `kanban-board.ts` | `mode` Property (`'spec' \| 'backlog'`), 4 Boolean Feature-Flag Properties, Conditional Rendering in render()/connectedCallback() |

**Kritische Integration Points:**
- `aos-kanban-board` (backlog mode) rendert `aos-story-card` mit `.story` Binding (StoryInfo aus UKB-001)
- Default-Verhalten (mode="spec") muss 100% rueckwaertskompatibel bleiben

---

### Technical Details

**WAS:**
- Neues Lit reactive Property `mode: 'spec' | 'backlog'` mit Default `'spec'` auf der `AosKanbanBoard` Klasse.
- 4 neue Boolean Feature-Flag Properties: `showChat` (Default: true), `showSpecViewer` (Default: true), `showGitStrategy` (Default: true), `showAutoMode` (Default: true).
- Conditional Rendering: UI-Elemente (Chat-Button, Spec-Docs-Button, Chat-Sidebar, Spec-Viewer-Modal, Git-Strategy-Dialog) werden nur bei zugehoerigem Feature-Flag gerendert.
- Header-Anpassung: Bei `mode="backlog"` wird "Backlog" als Titel angezeigt statt specName. Der Back-Button zeigt nicht "Back to Specs".
- `connectedCallback()`: WebSocket-Handler fuer Chat/Spec-Viewer nur registrieren wenn das entsprechende Feature-Flag aktiv ist.

**WIE:**
- Folgt dem bestehenden Property-driven Conditional Rendering Pattern der Komponente (z.B. `autoModeEnabled` steuert Auto-Mode Toggle Anzeige).
- Jedes Feature-Flag kontrolliert ein klar abgegrenztes UI-Segment. Keine verschachtelte Logik.
- Die 5-Spalten-Struktur (Backlog, Blocked, In Progress, In Review, Done) bleibt in beiden Modi identisch.
- Default-Werte stellen sicher, dass bestehende Nutzung ohne Property-Aenderung identisch bleibt (Rueckwaertskompatibilitaet).
- Keine neuen Events, keine neuen Imports. Nur bestehende Render-Bloecke werden in Conditionals gewickelt.

**WO:**
- `agent-os-ui/ui/src/components/kanban-board.ts` -- Property-Deklarationen, render() Methode, connectedCallback(), Header-Rendering

**Abhängigkeiten:** UKB-001 (StoryInfo mit in_review muss zuerst konsolidiert sein)

**Geschaetzte Komplexitaet:** M

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | agent-os/team/skills/ | Lit reactive Properties, Conditional Rendering Patterns, connectedCallback Lifecycle |
| domain-agent-os-web-ui | agent-os/team/skills/ | Kanban Board Architektur, Feature-Struktur, Chat/SpecViewer Integration |
| quality-gates | agent-os/team/skills/ | Rueckwaertskompatibilitaet sicherstellen, TypeScript strict mode |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| Generisches Kanban Board | UI | agent-os-ui/ui/src/components/kanban-board.ts | Wiederverwendbare Kanban-Komponente mit mode Property und Feature-Flags fuer beliebige Kanban-Kontexte |

---

### Completion Check

```bash
# Auto-Verify Commands
cd agent-os-ui/ui && npx tsc --noEmit
# Verify mode property exists
grep -q "mode.*spec.*backlog" agent-os-ui/ui/src/components/kanban-board.ts && echo "PASS: mode property" || echo "FAIL: mode property missing"
# Verify feature flags exist
grep -q "showChat" agent-os-ui/ui/src/components/kanban-board.ts && echo "PASS: showChat" || echo "FAIL: showChat missing"
grep -q "showSpecViewer" agent-os-ui/ui/src/components/kanban-board.ts && echo "PASS: showSpecViewer" || echo "FAIL: showSpecViewer missing"
grep -q "showGitStrategy" agent-os-ui/ui/src/components/kanban-board.ts && echo "PASS: showGitStrategy" || echo "FAIL: showGitStrategy missing"
grep -q "showAutoMode" agent-os-ui/ui/src/components/kanban-board.ts && echo "PASS: showAutoMode" || echo "FAIL: showAutoMode missing"
```
