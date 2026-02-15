# KSE-003: Execute-Tasks Trigger

**Story ID:** KSE-003
**Title:** Execute-Tasks Trigger
**Type:** Full-Stack
**Priority:** High
**Effort:** M
**Status:** Done

## User Story

```gherkin
Feature: Automatischer Workflow-Start bei Drag
  Als Entwickler
  möchte ich dass beim Ziehen einer Story nach In Progress automatisch execute-tasks startet,
  damit ich den Workflow nicht manuell aufrufen muss.
```

## Akzeptanzkriterien (Gherkin)

```gherkin
Scenario: Workflow startet bei Backlog → In Progress
  Given ich bin im Kanban Board der Spec "2026-01-31-kanban-story-execution"
  And Story "KSE-001" ist im Backlog
  And Story erfüllt alle Voraussetzungen (DoR, Dependencies)
  When ich "KSE-001" von Backlog nach In Progress ziehe
  Then wird der Workflow "/execute-tasks 2026-01-31-kanban-story-execution KSE-001" gestartet
  And ich bleibe im Kanban View

Scenario: Kein Workflow bei anderen Drag-Operationen
  Given ich bin im Kanban Board
  And Story "KSE-001" ist in "In Progress"
  When ich "KSE-001" von In Progress nach Done ziehe
  Then wird kein Workflow gestartet
  And nur der Status wird aktualisiert

Scenario: Kanban-Board.md wird aktualisiert
  Given ich habe eine Story nach In Progress gezogen
  When der Drag abgeschlossen ist
  Then wird die kanban-board.md im Spec-Ordner aktualisiert
  And die Story hat Status "in_progress"

Scenario: WebSocket sendet korrektes Event
  Given eine Story wird nach In Progress gezogen
  When das Drop-Event ausgelöst wird
  Then wird ein WebSocket-Event "workflow.story.start" gesendet
  And das Event enthält specId und storyId
```

## Business Value
Kernfunktionalität: Verbindet die visuelle Kanban-Interaktion mit dem execute-tasks Workflow. Eliminiert manuelle Workflow-Aufrufe.

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready)
- [x] Fachliche Anforderungen klar
- [x] Technischer Ansatz definiert
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Story ist angemessen dimensioniert (max 5 Dateien, 400 LOC)
- [x] Full-Stack Konsistenz geprüft

### DoD (Definition of Done)
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Anforderungen erfüllt
- [x] Alle Akzeptanzkriterien erfüllt
- [x] Tests geschrieben und bestanden
- [x] Keine Linting-Fehler
- [x] Completion Check Commands erfolgreich

### Betroffene Layer & Komponenten

- **Integration Type:** Full-Stack

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | kanban-board.ts | Workflow-Start Logic |
| Frontend | gateway.ts | Neues Event Type |
| Backend | websocket.ts | Handler für workflow.story.start |
| Backend | specs-reader.ts | Kanban Status Update |
| Backend | workflow-executor.ts | Story-spezifische Execution |

**Kritische Integration Points:**
- Frontend Drop Handler → Gateway workflow.story.start
- WebSocket Handler → WorkflowExecutor.startExecution
- WorkflowExecutor → SpecsReader.updateKanbanStatus

### Technische Details

**WAS:**
1. **Frontend:** WebSocket Event `workflow.story.start` beim Drop auf "In Progress" senden
2. **Frontend:** Gateway-Methode für Story-Start Event
3. **Backend:** WebSocket Handler für `workflow.story.start` Message
4. **Backend:** WorkflowExecutor erweitern um Story-spezifische Execution mit specId + storyId
5. **Backend:** SpecsReader.updateKanbanStatus() Methode zum Aktualisieren der kanban-board.md
6. **Backend:** Status-Update in kanban-board.md nach Story-Start (backlog -> in_progress)

**WIE (Architecture Guidance):**
- **WebSocket Message Pattern folgen:** Typ `workflow.story.start` mit payload `{ specId, storyId }`
- **Gateway Pattern:** `gateway.send({ type: 'workflow.story.start', specId, storyId })`
- **Backend Handler:** Analog zu `handleWorkflowStart` in websocket.ts
- **WorkflowExecutor Integration:** `/execute-tasks {specId} {storyId}` als Command aufrufen
- **Kanban Update:** specs-reader.ts mit neuer Methode `updateStoryStatus(projectPath, specId, storyId, newStatus)`
- **Markdown Parsing/Writing:** RegEx-basiert die Story-Zeile in der entsprechenden Sektion finden und verschieben

**WO:**
- `agent-os-ui/ui/src/components/kanban-board.ts` - Drop Handler sendet workflow.story.start Event
- `agent-os-ui/ui/src/gateway.ts` - Typings für workflow.story.start (falls benötigt)
- `agent-os-ui/src/server/websocket.ts` - Handler `handleWorkflowStoryStart()`
- `agent-os-ui/src/server/specs-reader.ts` - Neue Methode `updateStoryStatus()`
- `agent-os-ui/src/server/workflow-executor.ts` - Story-spezifische Execution Support

**WER:** dev-team__frontend-developer, dev-team__backend-developer

**Abhängigkeiten:** KSE-001, KSE-002

**Geschätzte Komplexität:** M

**Relevante Skills:**
| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Frontend Component Events |
| backend-express/websocket | .claude/skills/backend-express/websocket.md | WebSocket Handler Pattern |
| domain-agent-os-web-ui/workflow-execution | .claude/skills/domain-agent-os-web-ui/workflow-execution.md | Workflow Execution Domain |

### Technische Verifikation

| Check | Type | Details |
|-------|------|---------|
| FILE_EXISTS | agent-os-ui/ui/src/components/kanban-board.ts | Modified with workflow event |
| FILE_EXISTS | agent-os-ui/src/server/websocket.ts | Modified with story.start handler |
| FILE_EXISTS | agent-os-ui/src/server/specs-reader.ts | Modified with updateStoryStatus |
| CONTAINS | kanban-board.ts | `workflow.story.start` |
| CONTAINS | kanban-board.ts | `gateway.send` |
| CONTAINS | websocket.ts | `workflow.story.start` |
| CONTAINS | websocket.ts | `handleWorkflowStoryStart` oder äquivalent |
| CONTAINS | specs-reader.ts | `updateStoryStatus` oder `updateKanbanStatus` |
| CONTAINS | workflow-executor.ts | `execute-tasks` oder story execution logic |
| LINT_PASS | Frontend | npm run lint (ui) |
| LINT_PASS | Backend | npm run lint (server) |

### Completion Check
```bash
# Frontend: Check workflow.story.start event dispatch
grep -q "workflow.story.start" agent-os-ui/ui/src/components/kanban-board.ts && echo "PASS: Frontend event dispatch" || echo "FAIL: Frontend event dispatch missing"

# Frontend: Check gateway.send usage
grep -q "gateway.send" agent-os-ui/ui/src/components/kanban-board.ts && echo "PASS: gateway.send" || echo "FAIL: gateway.send missing"

# Backend: Check websocket handler for workflow.story.start
grep -q "workflow.story.start" agent-os-ui/src/server/websocket.ts && echo "PASS: Backend handler registered" || echo "FAIL: Backend handler missing"

# Backend: Check specs-reader update method
grep -qE "(updateStoryStatus|updateKanbanStatus)" agent-os-ui/src/server/specs-reader.ts && echo "PASS: Status update method" || echo "FAIL: Status update method missing"

# Lint check frontend
cd agent-os-ui/ui && npm run lint && echo "PASS: Frontend Lint" || echo "FAIL: Frontend Lint errors"

# Lint check backend
cd agent-os-ui && npm run lint && echo "PASS: Backend Lint" || echo "FAIL: Backend Lint errors"
```

### Story ist DONE wenn:
1. Alle Gherkin-Szenarien bestanden
2. Alle technischen Verifikationen bestanden
3. Completion Check Commands exit 0
