# Requirements Clarification - Workflow Terminal Tabs

**Created:** 2026-02-16
**Status:** Pending User Approval

## Feature Overview
Workflow-Ausfuehrungen (z.B. /create-spec, /execute-tasks) sollen zukuenftig als interaktive Claude CLI Sessions in xterm.js Terminal-Tabs im Cloud Terminal laufen - statt die Hauptansicht zu blockieren. Die bestehenden, nicht funktionalen Execution Tabs und Workflow-Chat Komponenten werden komplett entfernt.

## Target Users
Entwickler und Architekten, die die Specwright Web UI nutzen, um Specs zu erstellen, Stories auszufuehren und mit Claude zu interagieren.

## Business Value
- **Nicht-blockierende Workflows:** User kann waehrend Workflow-Ausfuehrung weiter im File-Editor, Kanban-Board etc. arbeiten
- **Parallele Ausfuehrung:** Mehrere Workflows koennen gleichzeitig in verschiedenen Tabs laufen
- **Vereinfachte Architektur:** Entfernung der kaputten Execution-Tabs und redundanten Workflow-Chat Komponenten
- **Bessere UX:** Native Terminal-Erfahrung wie in der echten Claude Code CLI

## Functional Requirements

### FR-1: Workflow als Terminal-Tab
- Wenn ein Workflow gestartet wird (z.B. "Execute Story" Button), oeffnet sich automatisch ein neuer Terminal-Tab im Cloud Terminal Panel
- Der Tab startet eine interaktive `claude` CLI Session (nicht `claude -p`)
- Der Slash-Command wird automatisch ausgefuehrt (z.B. `/execute-tasks`)
- Nach Abschluss des Workflows kann der User weiter mit Claude interagieren

### FR-2: Tab-Benennung
- Tab-Titel zeigt Workflow-Name + Kontext
- Beispiele: "execute-tasks: FE-001", "create-spec: File Editor", "add-bug: Login"
- Bei fehlender Kontext-Info: Workflow-Name allein (z.B. "create-spec")

### FR-3: Parallele Workflows
- Mehrere Workflow-Tabs koennen gleichzeitig offen sein und laufen
- Jeder Tab ist eine unabhaengige Claude CLI Session
- User kann zwischen Tabs wechseln waehrend Workflows laufen

### FR-4: Tab-Notifications
- Wenn Claude im Terminal Input braucht (Frage stellt): Badge + Farbwechsel am Tab
- Badge zeigt an, dass Aktion erforderlich ist
- Farbwechsel des Tab-Titels fuer bessere Sichtbarkeit
- Notifications verschwinden wenn User den Tab oeffnet/fokussiert

### FR-5: Tab schliessen bei laufendem Workflow
- Bestaetigung-Dialog: "Workflow laeuft noch - wirklich abbrechen?"
- Bei "Ja": Claude-Prozess wird sauber beendet (SIGTERM/kill)
- Bei "Nein": Tab bleibt offen
- Bei bereits abgeschlossenem Workflow: Tab schliesst sofort ohne Nachfrage

### FR-6: Entfernung alter Komponenten
- `aos-workflow-chat.ts` - komplett entfernen
- `aos-execution-tabs.ts` - komplett entfernen
- `aos-execution-tab.ts` - komplett entfernen
- Zugehoerige WebSocket-Handler fuer workflow.interactive.* Messages anpassen/entfernen
- Workflow-spezifische Backend-Logik (WorkflowExecutor) anpassen: statt JSON-Streaming jetzt PTY-basiert

## Affected Areas & Dependencies
- **Cloud Terminal Sidebar** (`aos-cloud-terminal-sidebar.ts`) - Muss Workflow-Tabs unterstuetzen
- **Terminal Tabs** (`aos-terminal-tabs.ts`) - Erweitert um Workflow-Tab-Typ mit Notifications
- **Terminal Session** (`aos-terminal-session.ts`) - Muss Claude CLI Sessions mit Auto-Command starten koennen
- **WebSocket Backend** (`websocket.ts`) - Terminal-Session-Erstellung fuer Workflows
- **Workflow Executor** (`workflow-executor.ts`) - Umstellung von JSON-Stream auf PTY-basiert
- **App-Routing** (`app.ts`) - Workflow-Start Events muessen Terminal-Tabs oeffnen statt Execution View
- **Kanban Board / Story Views** - "Execute" Buttons muessen Terminal-Tabs oeffnen
- **Gateway/WebSocket Client** - Workflow-Start Messages anpassen

## Edge Cases & Error Scenarios
- **Terminal-Verbindung verloren:** Reconnect-Logik des Cloud Terminals greift auch fuer Workflow-Tabs
- **Claude CLI nicht verfuegbar:** Fehlermeldung im Terminal-Tab anzeigen
- **Maximale Tab-Anzahl:** Keine kuenstliche Begrenzung, aber System-Ressourcen beachten
- **Browser-Tab schliessen:** Alle laufenden Workflows werden beendet (existierendes Verhalten)
- **Gleicher Workflow doppelt:** Erlaubt - jeder Tab ist eine eigene Session

## Security & Permissions
- Keine neuen Sicherheitsanforderungen - Terminal nutzt bereits bestehende PTY-Session-Verwaltung
- Claude CLI Authentifizierung laeuft wie bei normalen Terminal-Sessions

## Performance Considerations
- Jeder Workflow-Tab ist ein eigener PTY-Prozess + Claude CLI Instanz
- Bei vielen parallelen Tabs: CPU/Memory-Verbrauch steigt linear
- xterm.js Rendering ist fuer mehrere Tabs optimiert (nur aktiver Tab rendert)

## Scope Boundaries

**IN SCOPE:**
- Workflow-Start oeffnet Terminal-Tab mit Claude CLI
- Interaktive Claude Session mit Auto-Command
- Tab-Benennung mit Workflow-Kontext
- Tab-Notifications bei Input-Bedarf
- Bestaetigung-Dialog beim Schliessen laufender Tabs
- Entfernung von aos-workflow-chat, aos-execution-tabs, aos-execution-tab
- Backend-Anpassungen fuer PTY-basierte Workflow-Ausfuehrung

**OUT OF SCOPE:**
- Workflow-spezifische UI innerhalb des Terminals (bleibt CLI)
- Structured Questions UI (Fragen werden im Terminal als Text angezeigt)
- Session Resume nach Browser-Neustart
- Persistierung von Workflow-Ergebnissen
- Auto-Scroll/Auto-Focus Logik (nutzt Standard-Terminal-Verhalten)

## Open Questions
- Keine offenen Fragen

## Proposed User Stories (High Level)
1. **Terminal-Tab fuer Workflows** - Cloud Terminal erweitern um Workflow-Tabs mit Claude CLI zu starten
2. **Auto-Tab bei Workflow-Trigger** - UI-Aktionen (Execute Button etc.) oeffnen automatisch Terminal-Tab
3. **Tab-Notifications** - Badge + Farbwechsel wenn Terminal Input braucht
4. **Tab-Close Confirmation** - Bestaetigung und Prozess-Cleanup beim Schliessen laufender Tabs
5. **Legacy Cleanup** - Entfernung der alten Workflow-Chat und Execution-Tab Komponenten

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
