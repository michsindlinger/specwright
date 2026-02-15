# Requirements Clarification - Kanban Story Execution

**Created:** 2026-01-31
**Status:** Approved

## Feature Overview
Drag & Drop einer Story von Backlog nach In Progress im Kanban Board löst automatisch `/execute-tasks` für diese spezifische Story aus.

## Target Users
- Entwickler die mit Agent OS Web UI arbeiten
- Product Owner die Story-Fortschritt visuell verfolgen

## Business Value
- **Schnellerer Workflow-Start:** Kein manueller Aufruf von `/execute-tasks` nötig
- **Intuitive Bedienung:** Natürliche Drag & Drop Interaktion wie in bekannten Kanban-Tools
- **Visuelles Feedback:** Story zeigt "Working" Indikator während der Ausführung
- **Fehlervermeidung:** DoR und Dependency Checks verhindern Start von nicht-bereiten Stories

## Functional Requirements

### FR-1: Drag & Drop Implementierung
- Story Cards im Kanban Board sind per Drag & Drop zwischen Spalten verschiebbar
- Visuelles Feedback während des Drags (Drag Preview, Drop Zone Highlighting)
- Native HTML5 Drag & Drop API

### FR-2: Workflow Trigger
- **Trigger-Bedingung:** Nur Drag von "Backlog" → "In Progress" startet `/execute-tasks`
- **Argument-Format:** `/execute-tasks [spec-name] [story-id]`
- Andere Drag-Operationen (z.B. In Progress → Done) aktualisieren nur den Status

### FR-3: DoR Validation (Pre-Drag Check)
- Stories mit unvollständiger DoR (dorComplete: false) können nicht nach In Progress gezogen werden
- Zeigt Fehlermeldung/Toast: "Story kann nicht gestartet werden: DoR nicht vollständig"
- Visuell: Drop Zone wird rot/blockiert angezeigt

### FR-4: Dependency Validation (Pre-Drag Check)
- Stories deren Abhängigkeiten (dependencies) noch nicht "done" sind, werden blockiert
- Zeigt Fehlermeldung mit Liste der blockierenden Dependencies
- Visuell: Drop Zone wird blockiert angezeigt

### FR-5: Working Indicator
- Nach erfolgreichem Drag zeigt die Story einen "Working" Indikator
- Indikator bleibt sichtbar solange der Workflow läuft
- Bei Workflow-Ende (success/error) wird Indikator entfernt und Status aktualisiert

### FR-6: Kanban Status Update
- Nach Drag wird kanban-board.md im Spec-Ordner aktualisiert
- Story-Status wechselt von "backlog" zu "in_progress"
- UI bleibt im Kanban-View (keine Navigation)

## Affected Areas & Dependencies

### Frontend (Lit Components)
- `kanban-board.ts` - Drag & Drop Container, Validierung
- `story-card.ts` - Draggable, Working Indicator
- `story-status-badge.ts` - Neuer "Working" Status

### Backend (Express/WebSocket)
- `websocket.ts` - Neuer Message Type für Story-Execution
- `specs-reader.ts` - Kanban Status Update
- `workflow-executor.ts` - Story-spezifische Execution

### Existing Components
- `gateway.ts` (Frontend) - Neue Events
- `theme.css` - Drag & Drop Styling

## Edge Cases & Error Scenarios

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Story ohne DoR | Drag blockiert, Toast-Warnung |
| Story mit offenen Dependencies | Drag blockiert, zeigt welche Stories fehlen |
| Workflow bereits laufend für Story | Drag blockiert, "Story wird bereits ausgeführt" |
| WebSocket Disconnect während Drag | Drag abbrechen, Reconnect-Hinweis |
| Workflow schlägt fehl | Story bleibt in "In Progress" mit Error-Indikator |

## Security & Permissions
- Keine zusätzlichen Permissions nötig (nutzt bestehende Workflow-Execution)
- Story-ID und Spec-ID werden validiert bevor Workflow startet

## Performance Considerations
- Drag & Drop sollte ohne merkbare Latenz funktionieren
- Workflow-Start ist asynchron (kein Blocking der UI)
- Working-Indikator Updates via WebSocket (bestehende Infrastruktur)

## Scope Boundaries

**IN SCOPE:**
- Drag & Drop von Backlog → In Progress mit execute-tasks Trigger
- DoR und Dependency Validation
- Working Indicator auf Story Card
- Kanban Status Update (kanban-board.md)
- Toast Notifications für Errors

**OUT OF SCOPE:**
- Drag zwischen anderen Spalten (In Progress → Done) - nur Status-Update, kein Workflow
- Reordering innerhalb einer Spalte
- Multi-Select Drag (mehrere Stories gleichzeitig)
- Undo/Redo für Drag-Operationen
- Workflow-Fortschritt im Kanban anzeigen (nur Working/Done/Error)

## Open Questions
*Keine - alle Fragen wurden geklärt*

## Proposed User Stories (High Level)

1. **KSE-001: Drag & Drop Infrastruktur** - Implementierung der HTML5 Drag & Drop Basis im Kanban Board
2. **KSE-002: Pre-Drag Validation** - DoR und Dependency Checks vor dem Drop
3. **KSE-003: Execute-Tasks Trigger** - WebSocket-Integration für Story-spezifischen Workflow-Start
4. **KSE-004: Working Indicator** - Visuelles Feedback während Workflow-Ausführung
5. **KSE-999: Integration & Validation** - End-to-End Test der gesamten Funktionalität

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
