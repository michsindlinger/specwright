# Requirements Clarification - Multi-Command Execution

**Created:** 2026-01-30
**Status:** Pending User Approval

## Feature Overview

Ermöglicht das parallele Ausführen mehrerer Workflow-Commands im Agent OS Web UI. Jeder Command (z.B. `/create-spec`, `/execute-tasks`, `/plan-product`) startet eine eigene Claude Code Instanz in einem separaten Tab, sodass User mehrere Workflows gleichzeitig ausführen können.

## Target Users

- Entwickler, die mehrere parallele Spec-Erstellungen durchführen möchten
- Power-User, die verschiedene Workflow-Commands gleichzeitig ausführen
- Teams, die an komplexen Projekten arbeiten und mehrere Agent-OS-Prozesse benötigen
- User, die während einer laufenden Execution einen neuen Command starten möchten

## Business Value

- **Produktivitätssteigerung:** Parallele Ausführung von Workflows statt sequentieller Wartezeit
- **Kontexterhaltung:** Laufende Commands werden nicht unterbrochen, wenn ein neuer gestartet wird
- **Flexibilität:** User können zwischen mehreren aktiven Executions wechseln
- **Übersicht:** Klare visuelle Darstellung aller laufenden und abgeschlossenen Commands
- **Zeitersparnis:** Keine Wartezeit auf Abschluss eines Commands bevor der nächste gestartet werden kann

## Functional Requirements

### Command Execution Management
- [ ] Neuen Command in neuem Tab starten über Command-Selector
- [ ] Unbegrenzte Anzahl paralleler Executions erlaubt
- [ ] Jede Execution hat eigene Claude Code Instanz (eigener Prozess)
- [ ] Executions laufen unabhängig voneinander
- [ ] Tab zeigt Command-Name und aktuellen Status

### Tab-basierte Navigation
- [ ] Horizontale Tab-Leiste über dem Workflow-Bereich
- [ ] Jeder aktive Command als eigener Tab
- [ ] Tab zeigt: Command-Name, Status-Indikator (running/completed/failed/waiting)
- [ ] "+" Button rechts neben den Tabs für neuen Command
- [ ] "X" Button auf jedem Tab zum Abbrechen/Schließen
- [ ] Aktiver Tab visuell hervorgehoben

### Status & Feedback
- [ ] Running: Spinner/Animation zeigt aktive Verarbeitung
- [ ] Waiting for Input: Badge zeigt Fragen-Anzahl an
- [ ] Completed: Checkmark zeigt erfolgreichen Abschluss
- [ ] Failed: Error-Icon mit Möglichkeit zum Retry
- [ ] Tab-Wechsel zeigt jeweiligen Execution-Output

### Execution-Lifecycle
- [ ] Start: Command wird ausgewählt, neuer Tab + neue Claude Code Instanz
- [ ] Running: Output wird in Echtzeit gestreamt
- [ ] Question: Workflow pausiert, User beantwortet Fragen
- [ ] Complete: Finaler Output wird angezeigt, Tab bleibt offen
- [ ] Cancel: User kann laufende Execution abbrechen
- [ ] Close: Nach Abschluss kann Tab geschlossen werden

### Interaction zwischen Tabs
- [ ] Tab-Wechsel beeinflusst andere Executions nicht
- [ ] Hintergrund-Executions laufen weiter bei Tab-Wechsel
- [ ] Notification bei Statuswechsel in Hintergrund-Tabs (z.B. "Frage wartet")
- [ ] Alle Tabs teilen den gleichen Projekt-Kontext

## Affected Areas & Dependencies

| Bereich | Impact |
|---------|--------|
| **Frontend: Workflow-View** | Neue Tab-Komponente, Multi-Execution State Management |
| **Frontend: Workflow-Chat** | Muss mehrere Execution-IDs unterstützen |
| **Frontend: Command-Selector** | "Open in new tab" Option hinzufügen |
| **Backend: Workflow-Executor** | Bereits Multi-Execution-fähig (keine Änderung) |
| **Backend: WebSocket-Handler** | Execution-ID-basiertes Routing (bereits vorhanden) |
| **Shared Types** | Execution-Status Types erweitern |

## Edge Cases & Error Scenarios

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Gleicher Command zweimal starten | Erlaubt - beide laufen unabhängig |
| Browser-Tab schließen mit aktiven Executions | Backend-Prozesse werden terminiert |
| WebSocket-Verbindung verloren | Reconnect + Executions können fortgesetzt werden |
| Claude Code Prozess crashed | Error im Tab anzeigen, Retry-Option anbieten |
| User schließt Tab während Question pending | Execution wird abgebrochen |
| Sehr viele parallele Executions | Kein Hard-Limit, aber Performance-Warnung bei >10 |
| Tab wechseln während Streaming | Stream läuft im Hintergrund weiter |
| Execution abbrechen während Claude Code arbeitet | Process kill, Tab zeigt "Cancelled" Status |

## Security & Permissions

- Jede Claude Code Instanz erbt die Projekt-Berechtigungen
- Keine zusätzlichen Berechtigungen erforderlich
- Parallele Executions können gleichzeitig auf dieselben Dateien zugreifen (File-Locking obliegt dem OS)
- `--dangerously-skip-permissions` wird pro Instanz gesetzt (wie aktuell)

## Performance Considerations

- **Process Management:** Jede Execution startet eigenen Node-Prozess (claude-anthropic-simple)
- **Memory:** Ca. 100-200MB pro aktiver Claude Code Instanz
- **CPU:** Mehrere parallele Prozesse, aber meist I/O-bound (API-Calls)
- **WebSocket:** Alle Executions teilen eine WS-Verbindung, Routing per executionId
- **Empfehlung:** Soft-Limit Warnung bei >5 parallelen Executions

## Scope Boundaries

**IN SCOPE:**
- Tab-basierte Multi-Execution Navigation
- Parallele Claude Code Instanzen (eigener Prozess pro Tab)
- Status-Indikatoren pro Tab (running/waiting/completed/failed)
- Tab schließen/abbrechen Funktionalität
- Notifications bei Statuswechsel in Hintergrund-Tabs
- Neuen Command via "+" Button starten

**OUT OF SCOPE:**
- Execution-Persistenz über App-Restart (Sessions != Executions)
- Drag & Drop Tab-Reordering
- Tab-Gruppen oder -Favoriten
- Execution-Historie (abgeschlossene Executions verschwinden bei Tab-Schließen)
- Keyboard-Shortcuts für Tab-Wechsel
- Split-View (mehrere Executions gleichzeitig sichtbar)
- Execution-Sharing zwischen Usern

## Open Questions

- *(Keine offenen Fragen - Konzept basiert auf existierendem Backend-Support)*

## Proposed User Stories (High Level)

1. **MCE-001: Workflow Tab Bar Component** - UI-Komponente für Tab-Leiste mit Execution-Tabs
2. **MCE-002: Multi-Execution State Management** - Frontend State für mehrere parallele Executions
3. **MCE-003: Tab Status Indicators** - Visuelle Status-Anzeige pro Tab (running/waiting/complete/error)
4. **MCE-004: Command Selector Enhancement** - "Open in new tab" Option im Command-Selector
5. **MCE-005: Tab Close & Cancel Logic** - Abbrechen/Schließen mit Bestätigungs-Dialog
6. **MCE-006: Background Notifications** - Benachrichtigungen bei Status-Änderungen in Hintergrund-Tabs
7. **MCE-999: Integration & End-to-End Validation** - Vollständige Integration aller Komponenten

---

*Review this document carefully. Once approved, detailed user stories will be generated.*
