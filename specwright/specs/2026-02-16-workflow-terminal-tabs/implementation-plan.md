# Implementierungsplan: Workflow Terminal Tabs

> **Status:** APPROVED
> **Spec:** specwright/specs/2026-02-16-workflow-terminal-tabs/
> **Erstellt:** 2026-02-16
> **Basiert auf:** requirements-clarification.md

---

## Executive Summary

Workflow-Ausfuehrungen (z.B. `/execute-tasks`, `/create-spec`) werden von der bisherigen blockierenden Execution-View mit JSON-Streaming auf interaktive xterm.js Terminal-Tabs im Cloud Terminal Sidebar migriert. Jeder Workflow startet als eigenstaendige Claude CLI PTY-Session in einem neuen Tab -- nicht-blockierend, parallel moeglich, mit nativer Terminal-Erfahrung. Die veralteten Komponenten `aos-workflow-chat`, `aos-execution-tabs` und `aos-execution-tab` werden komplett entfernt.

---

## Architektur-Entscheidungen

### Gewaehlter Ansatz

Workflows werden als Cloud Terminal Sessions (Typ `claude-code`) ueber den bestehenden `CloudTerminalManager` gespawnt. Nach Session-Erstellung wird der Slash-Command automatisch per `sendInput()` an den PTY-Prozess gesendet. Das Frontend erstellt einen neuen Terminal-Tab in der `aos-cloud-terminal-sidebar` mit Workflow-spezifischen Metadaten (Name, Notification-Badge).

### Begruendung

1. **Referenz-Implementation existiert bereits**: Die DevTeam-Setup-Funktion in `websocket.ts` (Zeilen 3620-3636) verwendet exakt dieses Pattern: `cloudTerminalManager.createSession()` gefolgt von `cloudTerminalManager.sendInput(sessionId, '/command\n')`. Dies beweist, dass der Ansatz funktioniert.

2. **Maximale Wiederverwendung**: `CloudTerminalManager`, `TerminalManager`, `aos-terminal`, `aos-terminal-session`, `aos-terminal-tabs` und `aos-cloud-terminal-sidebar` existieren bereits und sind produktionsreif. Es muss kein neues Terminal-System gebaut werden.

3. **Eliminiert Komplexitaet**: Der `WorkflowExecutor` verwendet aktuell zwei verschiedene Execution-Pfade -- PTY-basiert fuer allgemeine Commands und `spawnWithLoginShell` mit JSON-Stream-Parsing fuer `execute-tasks`. Beide koennen durch einen einzigen Pfad (Cloud Terminal PTY) ersetzt werden.

### Patterns und Technologien
- **Pattern:** Bestehendes Cloud Terminal Session Pattern (PTY via `node-pty`, WebSocket Bridge, xterm.js Frontend)
- **Technologie:** `CloudTerminalManager` (Backend) + `aos-cloud-terminal-sidebar` (Frontend)
- **Begruendung:** Bereits getestet, stabil, unterstuetzt Pause/Resume, Buffer-Management, Multi-Session

---

## Komponenten-Uebersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|---|---|---|
| (keine) | - | Alle Anforderungen werden durch Erweiterung bestehender Komponenten erfuellt |

### Zu aendernde Komponenten

| Komponente | Pfad | Aenderungsart | Grund |
|---|---|---|---|
| CloudTerminalManager | `ui/src/server/services/cloud-terminal-manager.ts` | Erweitern | Neue Methode `createWorkflowSession()` mit Auto-Command-Support |
| cloud-terminal.protocol.ts | `ui/src/shared/types/cloud-terminal.protocol.ts` | Erweitern | Neuer Typ `CloudTerminalWorkflowMetadata` und Message `cloud-terminal:create-workflow` |
| websocket.ts | `ui/src/server/websocket.ts` | Erweitern + Refactoren | Neuer Handler `handleCloudTerminalCreateWorkflow`, Anpassung von `handleWorkflowStoryStart` und `handleWorkflowStart` |
| aos-cloud-terminal-sidebar.ts | `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts` | Erweitern | Workflow-Tab-Erstellung von externen Events, Open-Sidebar-on-Workflow |
| aos-terminal-tabs.ts | `ui/frontend/src/components/terminal/aos-terminal-tabs.ts` | Erweitern | Notification-Badge, Farbwechsel fuer `needsInput`-Status |
| aos-terminal-session.ts | `ui/frontend/src/components/terminal/aos-terminal-session.ts` | Erweitern | Skip Model-Selector fuer Workflow-Sessions (Auto-Connect), Close-Confirmation-Dialog |
| TerminalSession (Interface) | `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts` | Erweitern | Neue Felder `workflowName?`, `workflowContext?`, `isWorkflow?`, `needsInput?` |
| cloud-terminal.service.ts | `ui/frontend/src/services/cloud-terminal.service.ts` | Erweitern | `PersistedTerminalSession` um Workflow-Metadaten erweitern |
| app.ts | `ui/frontend/src/app.ts` | Erweitern | `handleWorkflowStart` und Story-Execution-Trigger leiten auf Terminal-Tab statt Workflow-View |
| kanban-board.ts | `ui/frontend/src/components/kanban-board.ts` | Aendern | Story-Execute-Action oeffnet Terminal-Tab statt `workflow.story.start` |
| dashboard-view.ts | `ui/frontend/src/views/dashboard-view.ts` | Aendern | Story-Execution startet Terminal-Tab |
| queue-section.ts | `ui/frontend/src/components/queue/aos-queue-section.ts` | Aendern | Queue-basierte Execution oeffnet Terminal-Tabs |

### Zu entfernende Komponenten

| Komponente | Pfad | Grund |
|---|---|---|
| aos-workflow-chat.ts | `ui/frontend/src/components/workflow-chat.ts` | Ersetzt durch Terminal-Tab |
| aos-execution-tabs.ts | `ui/frontend/src/components/execution-tabs.ts` | Ersetzt durch Cloud Terminal Tabs |
| aos-execution-tab.ts | `ui/frontend/src/components/execution-tab.ts` | Ersetzt durch Cloud Terminal Tabs |
| workflow-view.ts | `ui/frontend/src/views/workflow-view.ts` | Nicht mehr benoetigt (Workflows laufen im Terminal) |
| execution-store.ts | `ui/frontend/src/stores/execution-store.ts` | Nicht mehr benoetigt |
| execution.ts (types) | `ui/frontend/src/types/execution.ts` | Nicht mehr benoetigt |

### Zu vereinfachende Komponenten

| Komponente | Pfad | Aenderungsart | Grund |
|---|---|---|---|
| WorkflowExecutor | `ui/src/server/workflow-executor.ts` | Stark vereinfachen | `runClaudeCommand()` mit JSON-Stream-Parsing entfaellt; `handleClaudeEvent`, `resumeWithAnswer`, `sendQuestionBatch` etc. werden nicht mehr benoetigt. Verbleibend: `listCommands()`, `startStoryExecution()` (umgebaut auf Cloud Terminal), `getTerminalManager()`, Git-Strategy-Logik |

### Nicht betroffen (explizit)
- `aos-file-editor-panel.ts` und File-Editor-Komponenten -- keine Aenderungen
- `FileService` / `FileHandler` -- keine Aenderungen
- `TerminalManager` (Backend) -- bleibt unveraendert, wird weiter via `CloudTerminalManager` genutzt
- `aos-terminal.ts` (xterm.js Wrapper) -- bleibt unveraendert
- `aos-model-dropdown.ts` -- bleibt unveraendert

---

## Umsetzungsphasen

### Phase 1: Backend -- Cloud Terminal Workflow-Session-Support
**Ziel:** `CloudTerminalManager` kann Workflow-Sessions erstellen, die automatisch einen Slash-Command ausfuehren
**Komponenten:**
- `cloud-terminal.protocol.ts` -- Workflow-Metadaten-Typen
- `CloudTerminalManager` -- Neue `createWorkflowSession()` Methode
- `websocket.ts` -- Neuer Handler `cloud-terminal:create-workflow`

**Abhaengig von:** Nichts (Startphase)

**Details:**
- `createWorkflowSession(projectPath, modelConfig, workflowCommand, workflowName, workflowContext)` erzeugt eine `claude-code` Session, wartet 1s, sendet dann `/{command} {argument}\n` per `sendInput()` -- exakt wie die DevTeam-Setup-Referenz in Zeile 3620-3626 von `websocket.ts`
- Git-Strategy-Logik (Branch/Worktree-Erstellung) bleibt im Backend vor der Session-Erstellung
- Neuer WebSocket-Message-Typ `cloud-terminal:create-workflow` mit Feldern: `workflowCommand`, `workflowName`, `workflowContext`, `specId`, `storyId`, `gitStrategy`, `model`
- Response ist `cloud-terminal:created` mit zusaetzlichem `workflowMetadata` Feld

### Phase 2: Frontend -- Workflow-Tab-Integration im Cloud Terminal
**Ziel:** Cloud Terminal Sidebar kann Workflow-Tabs anzeigen und verwalten
**Komponenten:**
- `TerminalSession` Interface in `aos-cloud-terminal-sidebar.ts` -- erweitern
- `PersistedTerminalSession` in `cloud-terminal.service.ts` -- erweitern
- `aos-terminal-tabs.ts` -- Workflow-Tab-Styling
- `aos-terminal-session.ts` -- Auto-Connect fuer Workflow-Sessions (kein Model-Selector)
- `aos-cloud-terminal-sidebar.ts` -- Methode `openWorkflowTab()` fuer programmatisches Oeffnen

**Abhaengig von:** Phase 1

**Details:**
- `TerminalSession` erhaelt: `isWorkflow?: boolean`, `workflowName?: string`, `workflowContext?: string`, `needsInput?: boolean`
- `aos-terminal-session.ts`: Wenn `session.isWorkflow === true`, wird der Model-Selector uebersprungen und direkt `cloud-terminal:create-workflow` gesendet
- `aos-terminal-tabs.ts`: Workflow-Tabs zeigen Workflow-Icon statt Terminal-Icon; Tab-Name ist `workflowName: workflowContext` (z.B. "execute-tasks: FE-001")
- `aos-cloud-terminal-sidebar.ts` bekommt eine public Methode `openWorkflowTab(workflowName, workflowContext, ...)` die programmatisch einen neuen Tab erstellt und die Sidebar oeffnet

### Phase 3: UI-Trigger -- Alle Workflow-Start-Aktionen auf Terminal-Tabs umleiten
**Ziel:** Execute-Buttons in Kanban, Dashboard, Queue oeffnen Terminal-Tabs statt Workflow-View
**Komponenten:**
- `app.ts` -- `handleWorkflowStart()` aendern, neue Methode `_openWorkflowTerminalTab()`
- `kanban-board.ts` -- `startStoryExecution()` aendern
- `dashboard-view.ts` -- Story-Execution aendern
- `queue-section.ts` -- Queue-Execution aendern

**Abhaengig von:** Phase 2

**Details:**
- `app.ts`: Neue Methode `_openWorkflowTerminalTab(command, argument, model, specId?, storyId?, gitStrategy?)` die:
  1. Terminal-Sidebar oeffnet (`this.isTerminalSidebarOpen = true`)
  2. Neue Workflow-Session in `terminalSessions` erstellt
  3. `activeTerminalSessionId` auf die neue Session setzt
- `handleWorkflowStart()`: Statt `sessionStorage + routerService.navigate('workflows')` wird `_openWorkflowTerminalTab()` aufgerufen
- `kanban-board.ts`: Statt `gateway.send({ type: 'workflow.story.start' })` wird ein Custom Event `workflow-terminal-request` dispatched, das `app.ts` abfaengt
- Backend `handleWorkflowStoryStart()` bleibt fuer Git-Strategy/Kanban-Update, aber die Execution wird ueber Cloud Terminal statt WorkflowExecutor gemacht

### Phase 4: Notifications -- Badge und Farbwechsel bei Input-Bedarf
**Ziel:** Wenn Claude im Terminal eine Frage stellt, erscheint eine visuelle Benachrichtigung am Tab
**Komponenten:**
- `aos-terminal-tabs.ts` -- Badge-Rendering und Farbwechsel-CSS
- `aos-terminal.ts` oder `aos-cloud-terminal-sidebar.ts` -- Output-Monitoring fuer Input-Detection

**Abhaengig von:** Phase 2

**Details:**
- Heuristik im Frontend: Wenn Terminal-Output einen Prompt-Marker enthaelt (z.B. `?` am Zeilenende, `>` Prompt-Zeichen von Claude CLI), wird `needsInput = true` gesetzt
- Alternativ: Backend-seitige Detection wenn PTY output bestimmte Patterns enthaelt, und Senden einer `cloud-terminal:needs-input` Message
- Tab-Badge: Kleiner Punkt/Zahl am Tab; CSS-Klasse `.tab.needs-input` mit Farbwechsel (z.B. orange/gelb)
- Badge verschwindet wenn `session.id === activeSessionId` (Tab aktiv)
- Dies ist die schwierigste Anforderung, da Claude CLI kein strukturiertes "waiting for input" Signal sendet. Empfohlener Ansatz: Frontend-Heuristik auf xterm.js Buffer-Aenderungen, die auf Input-Prompt-Patterns pruefen

### Phase 5: Tab-Close-Confirmation und Cleanup
**Ziel:** Bestaetigung beim Schliessen laufender Tabs und sauberes Process-Kill
**Komponenten:**
- `aos-cloud-terminal-sidebar.ts` oder `aos-terminal-tabs.ts` -- Confirmation Dialog
- `CloudTerminalManager` -- Process-Kill bei Tab-Close

**Abhaengig von:** Phase 2

**Details:**
- Beim Klick auf Tab-Close-Button: Pruefen ob `session.status === 'active'` und `session.isWorkflow === true`
- Wenn ja: Bestaetigung-Dialog "Workflow laeuft noch -- wirklich abbrechen?"
- Bei "Ja": `gateway.send({ type: 'cloud-terminal:close', sessionId })` -- Backend killt PTY via `CloudTerminalManager.closeSession()`, welches wiederum `TerminalManager.kill()` aufruft
- Bei "Nein": Dialog schliessen, nichts tun
- Wenn Prozess bereits beendet (`exitCode !== undefined`): Sofort schliessen ohne Dialog
- Referenz: `aos-execution-tabs.ts` Zeilen 36-76 hat bereits exakt dieses Pattern implementiert -- kann 1:1 uebernommen werden

### Phase 6: Legacy Cleanup
**Ziel:** Entfernung der alten Execution-View-Komponenten und -Infrastruktur
**Komponenten:**
- Entfernung von: `workflow-chat.ts`, `execution-tabs.ts`, `execution-tab.ts`, `workflow-view.ts`, `execution-store.ts`, `execution.ts`
- Vereinfachung von: `WorkflowExecutor` (Entfernung von JSON-Streaming-Logik)
- Cleanup von: `websocket.ts` (Entfernung alter `workflow.interactive.*` Handler wo moeglich)
- Cleanup von: `theme.css` (Entfernung von Execution-Tab-Styles)
- Cleanup von: `app.ts` (Entfernung von Workflow-View-Navigation)

**Abhaengig von:** Alle vorherigen Phasen

**Details:**
- Erst nach erfolgreichem Test aller Workflow-Typen (create-spec, execute-tasks, add-bug etc.)
- `WorkflowExecutor` behaelt: `listCommands()`, `getTerminalManager()`, Git-Strategy-Logik (Branch/Worktree), Kanban-Update-Logik
- `WorkflowExecutor` verliert: `runClaudeCommand()`, `handleClaudeEvent()`, `resumeWithAnswer()`, `sendQuestionBatch()`, `detectTextQuestions()`, `handleAskUserQuestion()`, `submitAnswer()`, `submitAnswerBatch()` und das gesamte Question-Handling
- Router-Route `/workflows` wird entfernt oder auf Dashboard umgeleitet

---

## Komponenten-Verbindungen (KRITISCH)

### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zustaendige Story | Validierung |
|---|---|---|---|---|
| `websocket.ts` | `CloudTerminalManager` | Methoden-Aufruf `createWorkflowSession()` | WTT-001 | grep "createWorkflowSession" |
| `CloudTerminalManager` | `TerminalManager` | Delegation via `spawn()` + `sendInput()` | WTT-001 | Bereits existent |
| `app.ts` | `aos-cloud-terminal-sidebar` | Property-Binding `.sessions`, `.isOpen`, Events | WTT-002 | Bereits existent |
| `app.ts` | `gateway` (WebSocket) | `cloud-terminal:create-workflow` Message | WTT-002 | grep "create-workflow" |
| `kanban-board.ts` | `app.ts` | Custom Event `workflow-terminal-request` | WTT-003 | grep "workflow-terminal-request" |
| `dashboard-view.ts` | `app.ts` | Custom Event `workflow-terminal-request` | WTT-003 | grep "workflow-terminal-request" |
| `queue-section.ts` | `app.ts` | Custom Event `workflow-terminal-request` | WTT-003 | grep "workflow-terminal-request" |
| `aos-terminal-tabs.ts` | `aos-cloud-terminal-sidebar` | Event `session-close` mit Confirmation | WTT-005 | grep "confirm" |
| `aos-terminal-session.ts` | `gateway` | `cloud-terminal:create-workflow` (Auto-Connect) | WTT-002 | grep "create-workflow" |
| `websocket.ts` | `WorkflowExecutor` (Git) | Git-Strategy-Logik vor Terminal-Erstellung | WTT-003 | grep "gitStrategy" |

---

## Abhaengigkeiten

### Interne Abhaengigkeiten
```
Phase 2 (Frontend) --depends on--> Phase 1 (Backend)
Phase 3 (UI-Trigger) --depends on--> Phase 2 (Frontend)
Phase 4 (Notifications) --depends on--> Phase 2 (Frontend)
Phase 5 (Close-Confirmation) --depends on--> Phase 2 (Frontend)
Phase 6 (Cleanup) --depends on--> Phase 3 + Phase 4 + Phase 5
```

### Externe Abhaengigkeiten
- `node-pty`: Bereits installiert und in Produktion
- `@xterm/xterm` + `@xterm/addon-fit`: Bereits installiert und in Produktion
- Claude CLI (`claude` / `claude-anthropic-simple`): Muss im PATH des Servers verfuegbar sein -- bereits Voraussetzung

---

## Risiken und Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|---|---|---|---|
| Input-Detection (FR-4) unzuverlaessig da Claude CLI kein strukturiertes Signal sendet | High | Med | Heuristik-basierter Ansatz mit Prompt-Pattern-Matching; Fallback: User bemerkt Input-Bedarf beim Tab-Wechsel |
| Auto-Continue/Queue-Logik im WorkflowExecutor ist eng mit JSON-Stream-Parsing gekoppelt | Med | High | Phase 6 sorgfaeltig: Auto-Continue-Logik in separaten Service extrahieren, der Terminal-Exit-Events vom CloudTerminalManager nutzt |
| Git-Strategy-Logik (Worktree/Branch) funktioniert aktuell nur im WorkflowExecutor-Kontext | Med | High | Git-Strategy-Logik VOR Terminal-Session-Erstellung ausfuehren -- `handleWorkflowStoryStart` macht erst Branch/Worktree, dann Terminal |
| MAX_SESSIONS-Limit (5) koennte bei vielen parallelen Workflows erreicht werden | Low | Med | Limit erhoehen oder pro-Typ zaehlen (Shell-Sessions vs Workflow-Sessions) |
| Terminal-Sidebar ueberdeckt Content bei vielen Tabs | Low | Low | Scrollbar existiert bereits in `aos-terminal-tabs` |

---

## Self-Review Ergebnisse

### Validiert
- DevTeam-Setup-Pattern in `websocket.ts` (Zeilen 3620-3636) beweist, dass `createSession()` + `sendInput()` fuer Auto-Command-Execution funktioniert
- `CloudTerminalManager` unterstuetzt bereits Multi-Session mit Pause/Resume/Buffer
- `aos-terminal-session.ts` hat bereits Shadow-DOM mit eigenem xterm.js -- jeder Tab ist isoliert
- Close-Confirmation-Pattern existiert bereits in `aos-execution-tabs.ts` (Zeilen 36-76)
- `WorkflowExecutor.getTerminalManager()` wird bereits von `CloudTerminalManager` genutzt

### Identifizierte Probleme und Loesungen

| Problem | Urspruenglicher Plan | Verbesserung |
|---|---|---|
| Auto-Continue-Logik bei Story-Completion | War eng an `runClaudeCommand()` Close-Handler gekoppelt | Nutze `CloudTerminalManager` `session.closed` Event + Terminal-Exit-Code in `websocket.ts` um Auto-Continue zu triggern |
| Git-Strategy vor Workflow-Start | War im `startStoryExecution()` integriert | Extrahiere Git-Strategy-Setup in eigene Methode `prepareGitStrategy()`, aufgerufen vor `createWorkflowSession()` |
| Model-Config fuer Workflow-Sessions | Terminal-Session zeigt normalerweise Model-Selector | `isWorkflow`-Flag ueberspringt Model-Selector, Model wird vom Aufruf-Kontext (Kanban/Queue) mitgegeben |

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar fuer |
|---|---|---|
| DevTeam-Setup Auto-Command Pattern | `websocket.ts` Z. 3620-3636 | Backend Workflow-Session-Erstellung (1:1 Referenz) |
| `CloudTerminalManager.createSession()` | `cloud-terminal-manager.ts` | Basis fuer `createWorkflowSession()` |
| Close-Confirmation Dialog | `execution-tabs.ts` Z. 111-136 | Tab-Close-Confirmation in `aos-cloud-terminal-sidebar.ts` |
| Notification Badge Pattern | `execution-tab.ts` Z. 46-50 | Tab-Badge in `aos-terminal-tabs.ts` |
| Git-Strategy-Logik | `workflow-executor.ts` Z. 379-592 | Unveraendert wiederverwendbar vor Terminal-Erstellung |
| Session-Name-Generierung | `app.ts` Z. 682-690 | Erweitern um Workflow-Name-Pattern |

### Optimierungen

| Urspruenglich | Optimiert zu | Ersparnis |
|---|---|---|
| Neue Terminal-Komponente fuer Workflows | Erweiterung bestehender Cloud Terminal Components | Ca. 500+ Zeilen weniger, kein neues Component |
| Eigener WebSocket-Handler fuer Workflow-Terminal | Erweiterung des bestehenden `cloud-terminal:create` Handlers | Minimale Backend-Aenderung |
| Eigene Notification-Infrastruktur | CSS-Klasse + Property auf bestehendem Tab-Component | Ca. 100 Zeilen statt 300+ |

### Feature-Preservation Checkliste
- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erfuellbar
