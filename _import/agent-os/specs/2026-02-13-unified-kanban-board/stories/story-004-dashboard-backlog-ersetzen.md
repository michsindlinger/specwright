# Dashboard Backlog-Rendering durch aos-kanban-board ersetzen

> Story ID: UKB-004
> Spec: Unified Kanban Board
> Created: 2026-02-13
> Last Updated: 2026-02-13

**Priority**: High
**Type**: Frontend
**Estimated Effort**: M
**Dependencies**: UKB-002, UKB-003

**Integration:** dashboard-view.backlogKanbanAsStandard -> aos-kanban-board (.kanban Property Binding)

---

## Feature

```gherkin
Feature: Backlog nutzt aos-kanban-board Komponente
  Als Benutzer
  möchte ich im Backlog-Tab das gleiche hochwertige Kanban-Board sehen wie bei den Spezifikationen,
  damit ich eine konsistente und vertraute Benutzeroberfläche habe.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Backlog zeigt 5-Spalten Kanban Board

```gherkin
Scenario: Backlog-Tab zeigt vollständiges Kanban Board
  Given ich bin auf dem Dashboard
  When ich auf den "Backlog" Tab klicke
  Then sehe ich ein Kanban Board mit 5 Spalten
  And die Spalten heißen "Backlog", "Blocked", "In Progress", "In Review", "Done"
  And jede Spalte hat die gleiche farbliche Kodierung wie bei Spec-Kanbans
```

### Szenario 2: Backlog-Items werden als aos-story-card gerendert

```gherkin
Scenario: Backlog-Items nutzen die gleiche Story Card Komponente
  Given der Backlog enthält 3 Items
  When ich das Backlog Kanban Board sehe
  Then sehe ich 3 aos-story-card Komponenten
  And jede Card zeigt ID, Titel, Typ-Icon, Priority-Badge und Model-Dropdown
```

### Szenario 3: Inline Backlog-Code wurde entfernt

```gherkin
Scenario: Dashboard-View enthält kein Inline Backlog-Rendering mehr
  Given das Feature wurde implementiert
  When ich den Code von dashboard-view.ts prüfe
  Then existiert keine renderBacklogKanban() Methode mehr
  And existiert keine renderBacklogColumn() Methode mehr
  And existiert keine renderBacklogStoryCard() Methode mehr
```

### Szenario 4: Leerer Backlog wird korrekt angezeigt

```gherkin
Scenario: Leerer Backlog zeigt "No stories" in allen Spalten
  Given der Backlog enthält keine Items
  When ich den Backlog-Tab öffne
  Then sehe ich das Kanban Board mit 5 leeren Spalten
  And jede Spalte zeigt "No stories"
```

### Edge Case: Backlog ohne Kanban-Datei

```gherkin
Scenario: Backlog ohne kanban.json zeigt Warning
  Given kein backlog-index.json existiert
  When ich den Backlog-Tab öffne
  Then sehe ich eine Warning-Meldung
  And alle Items werden in der Backlog-Spalte angezeigt
```

---

## Technische Verifikation (Automated Checks)

- [ ] FILE_EXISTS: agent-os-ui/ui/src/views/dashboard-view.ts
- [ ] NOT_CONTAINS: dashboard-view.ts enthält NICHT "renderBacklogKanban"
- [ ] NOT_CONTAINS: dashboard-view.ts enthält NICHT "renderBacklogColumn"
- [ ] NOT_CONTAINS: dashboard-view.ts enthält NICHT "renderBacklogStoryCard"
- [ ] CONTAINS: dashboard-view.ts enthält "mode=\"backlog\"" oder "mode='backlog'"
- [ ] LINT_PASS: `cd agent-os-ui/ui && npx tsc --noEmit` exits with code 0

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
- [x] `backlogKanbanAsStandard` Adapter-Getter mappt `BacklogKanbanBoard` korrekt zu `KanbanBoard` (TypeScript-kompatibel)
- [x] `<aos-kanban-board mode="backlog" .kanban=${...}>` rendert im Backlog-Tab mit 5 Spalten
- [x] Alle inline Backlog-Rendering Methoden (renderBacklogKanban, renderBacklogColumn, renderBacklogStoryCard) sind entfernt
- [x] Alle inline Backlog D&D Handler (handleBacklogStoryDragStart/End, handleBacklogDragOver, handleBacklogDrop) sind entfernt
- [x] Backlog-Story-Detail-View (viewMode 'backlog-story') bleibt funktionsfaehig und wird nicht veraendert

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack (Frontend konsumiert Backend-Datenmodell-Aenderungen aus UKB-003)

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | `dashboard-view.ts` | Adapter-Getter `backlogKanbanAsStandard` erstellen, `renderBacklogView()` auf `<aos-kanban-board mode="backlog">` umstellen, ~250 Zeilen Inline-Rendering entfernen, ~80 Zeilen D&D-Handler entfernen |

**Kritische Integration Points:**
- `dashboard-view.backlogKanbanAsStandard` (Getter) -> `aos-kanban-board` `.kanban` Property Binding
- Adapter mappt `BacklogKanbanBoard` (Backend, UKB-003) zu `KanbanBoard` (Frontend, UKB-001)
- `aos-kanban-board` wird mit `showChat=false`, `showSpecViewer=false`, `showGitStrategy=false` konfiguriert (Feature-Flags aus UKB-002)

---

### Technical Details

**WAS:**
- Neuer Getter `backlogKanbanAsStandard` in dashboard-view.ts, der `BacklogKanbanBoard` zu `KanbanBoard` adaptiert.
- Die Adapter-Logik mappt: `BacklogStoryInfo[]` zu `StoryInfo[]` (Felder sind nach UKB-001/UKB-003 kompatibel), `specId: 'backlog'` wird durchgereicht, `hasKanbanFile` wird uebernommen.
- `renderBacklogView()` wird vereinfacht: Statt Inline-HTML wird ein einziges `<aos-kanban-board mode="backlog" .kanban=${this.backlogKanbanAsStandard} showChat=false showSpecViewer=false showGitStrategy=false>` gerendert.
- Folgende Methoden werden entfernt: `renderBacklogKanban()`, `renderBacklogColumn()`, `renderBacklogStoryCard()`, `handleBacklogStoryDragStart()`, `handleBacklogStoryDragEnd()`, `handleBacklogDragOver()`, `handleBacklogDrop()`.
- Die `handleBacklogModelChange()` Methode wird ebenfalls entfernt (wird jetzt via aos-kanban-board story-model-change Event gehandelt).
- `backlog-story` ViewMode und die zugehoerige Detail-Ansicht bleiben UNVERAENDERT.

**WIE:**
- Der Adapter-Getter folgt dem Computed-Property-Pattern. Er wird als TypeScript Getter implementiert und bei jedem Render-Zyklus lazy evaluiert.
- Die BacklogStoryInfo-zu-StoryInfo-Mapping ist strukturell: Felder werden 1:1 uebernommen, `dorComplete` und `dependencies` kommen bereits vom Backend (UKB-003). Fehlende optionale Felder (`workflowStatus`, `workflowError`) werden nicht gesetzt (undefined ist valid).
- Das Entfernen der Inline-Methoden ist eine reine Loeschoperation. Keine Funktionalitaet geht verloren, da aos-kanban-board alle Features (D&D, Spalten, Cards) bereits mitbringt.
- ACHTUNG: `handleBacklogStoryClick()` bleibt erhalten wenn sie fuer die Story-Detail-Navigation benoetigt wird. Pruefen ob aos-kanban-board story-select Event diese Funktion uebernimmt.
- Der Import von `KanbanBoard` und `StoryInfo` aus `kanban-board.ts` muss hinzugefuegt werden.

**WO:**
- `agent-os-ui/ui/src/views/dashboard-view.ts` -- Adapter-Getter, renderBacklogView(), Loeschung der Inline-Rendering- und D&D-Methoden

**Abhängigkeiten:** UKB-002 (mode + Feature-Flags), UKB-003 (BacklogStoryInfo mit dorComplete/dependencies/specId)

**Geschaetzte Komplexitaet:** M

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | agent-os/team/skills/ | Lit Property Binding, Getter Pattern, Template Syntax |
| domain-agent-os-web-ui | agent-os/team/skills/ | Dashboard-Architektur, Backlog-Rendering, ViewMode-Lifecycle |
| quality-gates | agent-os/team/skills/ | Sicherstellen dass keine Funktionalitaet verloren geht bei der Loeschung |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands
cd agent-os-ui/ui && npx tsc --noEmit
# Verify old inline methods are removed
grep -q "renderBacklogKanban" agent-os-ui/ui/src/views/dashboard-view.ts && echo "FAIL: renderBacklogKanban still exists" && exit 1 || echo "PASS: renderBacklogKanban removed"
grep -q "renderBacklogColumn" agent-os-ui/ui/src/views/dashboard-view.ts && echo "FAIL: renderBacklogColumn still exists" && exit 1 || echo "PASS: renderBacklogColumn removed"
grep -q "renderBacklogStoryCard" agent-os-ui/ui/src/views/dashboard-view.ts && echo "FAIL: renderBacklogStoryCard still exists" && exit 1 || echo "PASS: renderBacklogStoryCard removed"
grep -q "handleBacklogDragOver" agent-os-ui/ui/src/views/dashboard-view.ts && echo "FAIL: handleBacklogDragOver still exists" && exit 1 || echo "PASS: handleBacklogDragOver removed"
grep -q "handleBacklogDrop" agent-os-ui/ui/src/views/dashboard-view.ts && echo "FAIL: handleBacklogDrop still exists" && exit 1 || echo "PASS: handleBacklogDrop removed"
# Verify aos-kanban-board with backlog mode is used
grep -q 'mode="backlog"' agent-os-ui/ui/src/views/dashboard-view.ts && echo "PASS: backlog mode in use" || echo "FAIL: backlog mode not found"
# Verify adapter getter exists
grep -q "backlogKanbanAsStandard" agent-os-ui/ui/src/views/dashboard-view.ts && echo "PASS: adapter getter" || echo "FAIL: adapter getter missing"
```
