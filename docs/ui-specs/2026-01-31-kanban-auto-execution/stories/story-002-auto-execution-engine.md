# Auto-Execution Engine

> Story ID: KAE-002
> Spec: kanban-auto-execution
> Created: 2026-01-31
> Last Updated: 2026-01-31

**Priority**: High
**Type**: Full-Stack
**Estimated Effort**: M
**Dependencies**: KAE-001
**Status**: Done

---

## Feature

```gherkin
Feature: Automatische Story-Ausführung Engine
  Als Entwickler
  möchte ich dass nach Aktivierung des Auto-Mode Stories automatisch gestartet werden,
  damit ich ohne manuelle Interaktion alle Stories einer Spec ausführen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Auto-Mode Start - Erste Story

```gherkin
Scenario: Automatischer Start der ersten ready Story
  Given das Kanban Board ist geladen mit Stories im Backlog
  And mindestens eine Story ist "ready" (DoR erfüllt, keine Blocker)
  When ich den Auto-Mode aktiviere
  Then wird die erste ready Story automatisch nach In Progress verschoben
  And der Workflow für diese Story wird gestartet
```

### Szenario 2: Nächste Story nach Completion

```gherkin
Scenario: Automatischer Start der nächsten Story nach Completion
  Given der Auto-Mode ist aktiviert
  And eine Story wurde gerade abgeschlossen (Status: done)
  When 2 Sekunden vergangen sind (Delay)
  Then wird die nächste ready Story automatisch gestartet
  And die Story wird nach In Progress verschoben
```

### Szenario 3: Dependencies werden respektiert

```gherkin
Scenario: Blockierte Stories werden übersprungen
  Given der Auto-Mode ist aktiviert
  And Story "KAE-003" hat Dependency auf "KAE-002"
  And "KAE-002" ist noch nicht done
  When das System die nächste Story sucht
  Then wird "KAE-003" übersprungen
  And die nächste Story ohne Blocker wird gestartet
```

### Szenario 4: Keine ready Stories verfügbar

```gherkin
Scenario: Warten auf ready Stories
  Given der Auto-Mode ist aktiviert
  And alle Stories sind entweder "done" oder "blocked"
  When das System die nächste Story sucht
  Then bleibt der Auto-Mode aktiv (wartet)
  And sobald eine Story ready wird, startet sie automatisch
```

### Szenario 5: Alle Stories abgeschlossen

```gherkin
Scenario: Auto-Mode deaktiviert sich nach letzter Story
  Given der Auto-Mode ist aktiviert
  And die letzte Story wird gerade ausgeführt
  When die letzte Story abgeschlossen wird
  Then wird der Auto-Mode automatisch deaktiviert
  And eine Benachrichtigung "Alle Stories abgeschlossen" erscheint
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Manueller Drag während Auto-Mode
  Given der Auto-Mode ist aktiviert
  And Story "A" wird gerade ausgeführt
  When ich Story "B" manuell per Drag nach In Progress verschiebe
  Then wird Story "B" NICHT automatisch gestartet (bereits manuell verschoben)
  And Auto-Mode überspringt "B" bei der nächsten Iteration
```

```gherkin
Scenario: Auto-Mode Pause durch Deaktivierung
  Given der Auto-Mode ist aktiviert
  And Story "A" wird gerade ausgeführt
  When ich den Auto-Mode Toggle deaktiviere
  Then läuft Story "A" Execution weiter bis zum Ende
  And nach "A" Completion wird KEINE neue Story gestartet
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/kanban-board.ts enthält Auto-Execution Logik
- [ ] FILE_EXISTS: agent-os-ui/src/server/websocket.ts enthält autoMode Handler
- [ ] FILE_EXISTS: agent-os-ui/src/server/workflow-executor.ts enthält Queue-Logik

### Inhalt-Prüfungen

- [ ] CONTAINS: kanban-board.ts enthält "processAutoExecutionQueue" oder ähnlich
- [ ] CONTAINS: websocket.ts enthält "auto-mode" Message Handler
- [ ] CONTAINS: workflow-executor.ts enthält "autoMode" State Management

### Funktions-Prüfungen

- [ ] LINT_PASS: npm run lint exits with code 0
- [ ] BUILD_PASS: npm run build exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | - |

---

## Technisches Refinement (vom Architect)

> **Ausgefüllt:** 2026-01-31

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

#### Full-Stack Konsistenz
- [x] **Alle betroffenen Layer identifiziert**
- [x] **Integration Type bestimmt**
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Unit Tests geschrieben und bestanden
- [x] Integration Tests geschrieben und bestanden
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-Stack (Frontend + Backend)

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | kanban-board.ts | Auto-Execution Queue-Logik |
| Frontend | dashboard-view.ts | Auto-Mode State Management |
| Frontend | gateway.ts | Neue WebSocket Events |
| Backend | websocket.ts | Neue Message Handler |
| Backend | workflow-executor.ts | Auto-Mode State |

**Kritische Integration Points:**
- WebSocket Event `workflow.interactive.complete` triggert nächste Story
- Frontend muss auf Backend-Events reagieren und Queue verwalten
- 2 Sekunden Delay zwischen Story-Completions

---

### Technical Details

**WAS:**

**Frontend (kanban-board.ts / dashboard-view.ts):**
- State: `autoModeEnabled: boolean`, `autoModeQueue: string[]` (Story-IDs)
- Methode `getNextReadyStory()`: Findet nächste ausführbare Story
- Methode `processAutoExecution()`: Startet nächste Story wenn Auto-Mode aktiv
- Event-Listener für `workflow.interactive.complete`

**Backend (websocket.ts / workflow-executor.ts):**
- Neuer Message Type: `auto-mode.status` (für Sync Frontend-Backend)
- Event `workflow.interactive.complete` enthält `specId` und `storyId`
- WorkflowExecutor sendet `auto-mode.next` wenn Story fertig

**WIE (Architektur-Guidance ONLY):**

**Frontend:**
- Auto-Mode State in dashboard-view.ts (Orchestrator)
- kanban-board erhält `autoModeEnabled` als Property
- Bei `workflow.interactive.complete` Event: `setTimeout(() => processAutoExecution(), 2000)`
- `getNextReadyStory()` nutzt bestehende `canMoveToInProgress()` Validierung
- Queue wird bei Toggle-Deaktivierung geleert

**Backend:**
- Kein persistenter Auto-Mode State im Backend (Frontend steuert)
- `workflow.interactive.complete` Event erweitern um `specId`
- Kein neuer WebSocket Handler nötig - Frontend reagiert auf bestehende Events

**WO:**
- `agent-os-ui/ui/src/components/kanban-board.ts` (Anpassen)
- `agent-os-ui/ui/src/views/dashboard-view.ts` (Anpassen)
- `agent-os-ui/ui/src/gateway.ts` (Anpassen - Event Listener)
- `agent-os-ui/src/server/websocket.ts` (Minimal - specId zu Events)
- `agent-os-ui/src/server/workflow-executor.ts` (Minimal - specId zu Events)

**WER:** dev-team__frontend-developer (Lead), dev-team__backend-developer (Support)

**Abhängigkeiten:** KAE-001 (Toggle Component)

**Geschätzte Komplexität:** M (ca. 150-200 LOC)

**Relevante Skills:**
- `frontend-lit` - State Management, Event-Handling
- `backend-express` - WebSocket Event-Erweiterung
- `quality-gates` - Integration Testing

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "autoModeEnabled" agent-os-ui/ui/src/views/dashboard-view.ts
grep -q "getNextReadyStory\|processAutoExecution" agent-os-ui/ui/src/components/kanban-board.ts
grep -q "workflow.interactive.complete" agent-os-ui/ui/src/gateway.ts
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run build
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Auto-Mode startet Stories automatisch (manueller Test)
3. 2-Sekunden Delay zwischen Stories funktioniert
4. Toggle-Deaktivierung stoppt Queue
