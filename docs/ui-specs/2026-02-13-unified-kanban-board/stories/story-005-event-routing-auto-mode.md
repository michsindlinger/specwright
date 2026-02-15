# Event-Routing und Auto-Mode Integration

> Story ID: UKB-005
> Spec: Unified Kanban Board
> Created: 2026-02-13
> Last Updated: 2026-02-13

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: UKB-002, UKB-004

**Integration:** aos-kanban-board -> dashboard-view (Custom Events), dashboard-view -> WebSocket backlog.story.start / backlog.story-status

---

## Feature

```gherkin
Feature: Korrektes Event-Routing für Backlog im generischen Board
  Als Benutzer
  möchte ich dass Backlog-Items beim Drag&Drop die richtigen Backend-Events auslösen,
  damit Story-Execution und Status-Updates korrekt funktionieren.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Backlog-Story-Start bei Drag zu In Progress

```gherkin
Scenario: Backlog-Item zu In Progress ziehen startet Backlog-Workflow
  Given ich bin im Backlog Kanban Board
  And ein Item steht in der "Backlog" Spalte
  When ich das Item in die "In Progress" Spalte ziehe
  Then wird ein "backlog.story.start" Event an das Backend gesendet
  And NICHT ein "workflow.story.start" Event
```

### Szenario 2: Spec-Story-Start funktioniert weiterhin

```gherkin
Scenario: Spec-Story zu In Progress ziehen startet Spec-Workflow
  Given ich bin im Spec Kanban Board
  And eine Story steht in der "Backlog" Spalte
  When ich die Story in die "In Progress" Spalte ziehe
  Then wird ein "workflow.story.start" Event an das Backend gesendet
  And der Git-Strategy-Dialog wird angezeigt (beim ersten Mal)
```

### Szenario 3: Backlog Auto-Mode funktioniert über das generische Board

```gherkin
Scenario: Auto-Mode im Backlog startet automatisch nächstes Item
  Given ich bin im Backlog Kanban Board
  And Auto-Mode ist aktiviert
  And ein Backlog-Item wurde erfolgreich abgeschlossen
  When das Completion-Event empfangen wird
  Then wird automatisch das nächste verfügbare Backlog-Item gestartet
```

### Szenario 4: Status-Update im Backlog nutzt backlog.story-status

```gherkin
Scenario: Backlog-Item Status-Änderung sendet korrekten Event-Typ
  Given ich bin im Backlog Kanban Board
  And ein Item steht in "In Progress"
  When ich das Item in die "Done" Spalte ziehe
  Then wird ein "backlog.story-status" Event an das Backend gesendet
  And NICHT ein "specs.story.updateStatus" Event
```

### Edge Case: Backlog ohne Git-Strategy-Dialog

```gherkin
Scenario: Backlog zeigt keinen Git-Strategy-Dialog
  Given ich bin im Backlog Kanban Board
  And kein Item war bisher in Progress
  When ich das erste Item in die "In Progress" Spalte ziehe
  Then wird KEIN Git-Strategy-Dialog angezeigt
  And die Story-Execution startet direkt
```

---

## Technische Verifikation (Automated Checks)

- [ ] CONTAINS: dashboard-view.ts enthält viewMode-basierte Event-Routing-Logik
- [ ] CONTAINS: dashboard-view.ts enthält "backlog.story.start" in Backlog-Kontext
- [ ] CONTAINS: dashboard-view.ts enthält "backlog.story-status" in Backlog-Kontext
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
- [x] Backlog-Item Drag zu "In Progress" sendet `backlog.story.start` (NICHT `workflow.story.start`)
- [x] Spec-Story Drag zu "In Progress" sendet `workflow.story.start` (unveraendert)
- [x] Backlog-Item Status-Aenderung sendet `backlog.story-status` (NICHT `specs.story.updateStatus`)
- [x] Backlog Auto-Mode startet automatisch naechstes Item ueber `backlog.story.start`
- [x] Backlog-Mode zeigt KEINEN Git-Strategy-Dialog
- [x] Bestehende Spec-Kanban Event-Flows sind unveraendert und funktionsfaehig

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | `dashboard-view.ts` | Event-Handler fuer aos-kanban-board Custom Events: `viewMode`-basiertes Routing zu korrekten WebSocket-Messages. Bestehende `handleBacklogAutoMode*` Handler an Kanban-Board Events anschliessen. |
| Frontend | `kanban-board.ts` | Minimal: Sicherstellen dass die gleichen Custom Events (story-move, story-select, story-model-change, auto-mode-toggle) unabhaengig vom mode emittiert werden. |

**Kritische Integration Points:**
- `aos-kanban-board` emittiert `story-move`, `story-select`, `story-model-change`, `auto-mode-toggle` Events
- `dashboard-view` checkt `this.viewMode` in Event-Handlern und routet zu:
  - Backlog: `backlog.story.start`, `backlog.story-status`, `backlog.story.model`
  - Spec: `workflow.story.start`, `specs.story.updateStatus`, `specs.story.model`
- Guard: Im Backlog-Kontext niemals `specs.*` oder `workflow.*` WebSocket-Endpoints aufrufen

---

### Technical Details

**WAS:**
- Die Event-Handler in `dashboard-view.ts` werden so angepasst, dass sie basierend auf `this.viewMode === 'backlog'` die korrekten WebSocket-Messages senden.
- Das Kanban-Board selbst emittiert mode-agnostische Events. Es kennt nur seine eigenen Custom Events (story-move, story-select etc.), nicht die WebSocket-Protokoll-Details.
- Bestehende `handleBacklogAutoModeToggle()`, `handleBacklogAutoModeError()`, `handleBacklogAutoModeResume()` und zugehoerige Methoden werden an die neuen aos-kanban-board Events angeschlossen statt an Inline-UI-Elemente.
- Der Git-Strategy-Dialog wird im Backlog-Mode nicht angezeigt (durch `showGitStrategy=false` aus UKB-002). Bei story-move Events im Backlog-Kontext wird die story.start Message direkt gesendet, ohne den Git-Strategy-Dialog-Flow.
- Backlog story-select Event navigiert zur bestehenden `backlog-story` Detail-Ansicht (ViewMode 'backlog-story').

**WIE:**
- Das Routing-Pattern ist ein einfacher `if (this.viewMode === 'backlog')` Check in jedem relevanten Event-Handler. Kein komplexes Strategy-Pattern noetig.
- Die bestehenden backlog-spezifischen Handler (handleBacklogAutoMode*) bleiben erhalten, werden aber ueber die Custom Events des Kanban-Boards getriggert statt ueber Inline-Event-Listener.
- Wichtig: `canMoveToInProgress()` Validierung im Kanban-Board greift auch fuer Backlog-Items -- aber weil diese immer `dorComplete=true` und `dependencies=[]` haben (UKB-003), passiert die Validierung natuerlich. Kein Bypass noetig.
- Der Auto-Mode nutzt die gleiche UI im Kanban-Board (Toggle + Progress). Dashboard-view reagiert auf auto-mode-toggle Event und startet naechstes Backlog-Item via `backlog.story.start`.

**WO:**
- `agent-os-ui/ui/src/views/dashboard-view.ts` -- Event-Handler Anpassung, viewMode-basiertes Routing, Auto-Mode Handler Migration
- `agent-os-ui/ui/src/components/kanban-board.ts` -- Verifizieren dass Events mode-agnostisch sind (sollte bereits so sein, ggf. minimale Anpassung)

**Abhängigkeiten:** UKB-002 (Feature-Flags), UKB-004 (aos-kanban-board ist im Backlog-Tab integriert)

**Geschaetzte Komplexitaet:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | agent-os/team/skills/ | Custom Event Handling, Lit Event Binding, Event Bubbling |
| domain-agent-os-web-ui | agent-os/team/skills/ | WebSocket-Protokoll (backlog.* vs workflow.*), Auto-Mode Lifecycle, ViewMode Routing |
| quality-gates | agent-os/team/skills/ | Event-Isolation sicherstellen, keine Cross-Contamination zwischen Spec/Backlog Kontexten |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands
cd agent-os-ui/ui && npx tsc --noEmit
# Verify backlog event routing exists
grep -q "backlog.story.start" agent-os-ui/ui/src/views/dashboard-view.ts && echo "PASS: backlog.story.start routing" || echo "FAIL: missing backlog.story.start"
grep -q "backlog.story-status" agent-os-ui/ui/src/views/dashboard-view.ts && echo "PASS: backlog.story-status routing" || echo "FAIL: missing backlog.story-status"
# Verify viewMode check in event handlers
grep -q "viewMode.*backlog" agent-os-ui/ui/src/views/dashboard-view.ts && echo "PASS: viewMode-based routing" || echo "FAIL: viewMode routing missing"
```
