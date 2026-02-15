# Requirements Clarification - Unified Kanban Board

**Created:** 2026-02-13
**Status:** Pending User Approval

## Feature Overview
Die bestehende `aos-kanban-board` Komponente (aktuell nur für Spezifikationen genutzt) soll generisch gemacht werden, sodass sie auch für den Backlog-View verwendet werden kann. Aktuell hat der Backlog ein komplett eigenes, inline im `dashboard-view.ts` gerenderte Kanban-Board mit anderem Design und weniger Features. Ziel ist ein einheitliches Kanban-Erlebnis.

## Target Users
- Entwickler die Agent OS Web UI nutzen, um sowohl Spec-Stories als auch Backlog-Items (Todos, Bugs) visuell zu verwalten.

## Business Value
- **Konsistente UX**: Nutzer sehen überall das gleiche hochwertige Kanban-Board
- **Weniger Code-Duplikation**: Backlog-Kanban-Rendering wird aus dashboard-view.ts entfernt
- **Feature-Parität**: Backlog bekommt automatisch alle 5 Spalten (Backlog, Blocked, In Progress, In Review, Done)
- **Wartbarkeit**: Eine Komponente statt zwei getrennte Implementierungen

## Functional Requirements

### FR-1: Generisches aos-kanban-board
- Die bestehende `aos-kanban-board` Komponente wird um einen `mode`-Property erweitert (`spec` | `backlog`)
- Im `spec`-Mode: Alle bestehenden Features (Chat, Spec-Viewer, Git-Strategy, Auto-Mode) sind verfügbar
- Im `backlog`-Mode: Spec-spezifische Features werden per Property ausgeblendet (showChat, showSpecViewer, showGitStrategy)

### FR-2: Gleiche 5 Spalten für Backlog
- Backlog-Board bekommt die gleichen 5 Spalten: Backlog, Blocked, In Progress, In Review, Done
- Gleiche farbliche Kodierung (Backlog=grau, Blocked=rot, In Progress=blau, In Review=gelb, Done=grün)

### FR-3: Gleiche aos-story-card für Backlog-Items
- Backlog-Items werden mit der bestehenden `aos-story-card` Komponente gerendert
- Backlog-Items liefern alle Felder die `StoryInfo` benötigt (dorComplete, dependencies, etc.)

### FR-4: Backend liefert erweitertes Backlog-Datenmodell
- Das Backend erweitert `BacklogStoryInfo` um fehlende Felder:
  - `dorComplete`: immer `true` (Backlog-Items haben keine DoR)
  - `dependencies`: immer `[]` (Backlog-Items haben keine Dependencies)
  - `status`: Erweitert um `blocked` und `in_review`
- Das Interface wird an `StoryInfo` angeglichen

### FR-5: Inline-Backlog-Rendering aus dashboard-view.ts entfernen
- `renderBacklogKanban()`, `renderBacklogColumn()`, `renderBacklogStoryCard()` werden durch die Verwendung von `aos-kanban-board` ersetzt
- Backlog-spezifische Event-Handler werden angepasst

### FR-6: Spec-Features optional per Property
- `showChat` (default: false) - Chat-Sidebar anzeigen
- `showSpecViewer` (default: false) - Spec-Viewer Button/Modal
- `showGitStrategy` (default: true) - Git-Strategy Dialog
- `showAutoMode` (default: true) - Auto-Mode Toggle
- Im Spec-Kontext werden alle Properties auf true gesetzt

## Affected Areas & Dependencies
- `agent-os-ui/ui/src/components/kanban-board.ts` - Generisch machen, Properties hinzufügen
- `agent-os-ui/ui/src/components/story-card.ts` - Ggf. optionale Felder graceful handhaben
- `agent-os-ui/ui/src/views/dashboard-view.ts` - Backlog-Rendering durch aos-kanban-board ersetzen, Inline-Code entfernen
- `agent-os-ui/src/server/backlog-reader.ts` - Erweitertes Datenmodell liefern
- `agent-os-ui/ui/src/styles/theme.css` - Ggf. Backlog-spezifische Styles entfernen

## Edge Cases & Error Scenarios
- **Leerer Backlog**: Board zeigt "No stories" in allen Spalten (wie bei Specs)
- **Backlog ohne kanban.json**: Alle Items als Backlog-Status anzeigen (bestehende Warning bleibt)
- **Drag&Drop im Backlog**: DoR-Validierung entfällt (dorComplete immer true), Dependency-Check entfällt (deps immer leer)
- **Backlog-Workflow-Start**: Muss weiterhin `backlog.story.start` statt `workflow.story.start` senden

## Security & Permissions
- Keine Änderung - lokale Anwendung ohne Auth

## Performance Considerations
- Keine signifikanten Performance-Änderungen erwartet
- Code-Reduktion in dashboard-view.ts sollte Bundle leicht verkleinern

## Scope Boundaries
**IN SCOPE:**
- aos-kanban-board generisch machen (mode: spec | backlog)
- Backlog-Datenmodell an StoryInfo angleichen
- Inline-Backlog-Code aus dashboard-view.ts entfernen
- Spec-Features optional per Property steuern
- Backlog-Items mit aos-story-card rendern

**OUT OF SCOPE:**
- Neue Features für das Kanban-Board (Swimlanes, Filter, etc.)
- Änderung der Spec-Kanban-Funktionalität
- Änderungen am Backend-Server (WebSocket-Protokoll bleibt)
- Backlog-Story-Detail-View (bleibt wie gehabt)
- Drag&Drop zwischen Spec-Board und Backlog-Board

## Open Questions (if any)
- Keine

## Proposed User Stories (High Level)
1. **Generisches Kanban-Board Interface** - StoryInfo und KanbanBoard Interfaces vereinheitlichen, mode-Property hinzufügen
2. **aos-kanban-board Properties erweitern** - Optionale Feature-Flags (showChat, showSpecViewer etc.) und mode-basierte Logik
3. **Backend: Backlog-Datenmodell erweitern** - BacklogStoryInfo an StoryInfo angleichen mit Default-Werten
4. **Dashboard-View: Backlog auf aos-kanban-board umstellen** - Inline-Rendering entfernen, aos-kanban-board im Backlog-Mode nutzen
5. **Event-Routing anpassen** - Backlog-spezifische Events (backlog.story.start, backlog.story-status) korrekt durch das generische Board routen

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
