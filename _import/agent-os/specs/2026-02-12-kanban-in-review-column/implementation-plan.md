# Implementierungsplan: Kanban In Review Column

> **Status:** APPROVED
> **Spec:** agent-os/specs/2026-02-12-kanban-in-review-column
> **Erstellt:** 2026-02-12
> **Basiert auf:** requirements-clarification.md

---

## Executive Summary

Erweiterung des Kanban-Boards um eine "In Review"-Spalte, die zwischen "In Progress" und "Done" platziert wird. Wenn eine Story via `/execute-tasks` oder MCP Tool abgeschlossen wird, wechselt sie in den Status "in_review" statt "done". Der Benutzer kann Stories dann manuell per Drag&Drop auf "Done" (Genehmigung) oder zurück auf "In Progress" (Rückweisung/Nacharbeit) schieben. Dies gibt dem Benutzer die Kontrolle über die endgültige Abnahme jeder Story.

---

## Architektur-Entscheidungen

### AD-1: Bestehenden `in_review` Status im Schema nutzen
Das `KanbanJsonStatus` Type-Enum enthält bereits `'in_review'` (in `specs-reader.ts` und `kanban-mcp-server.ts`). Ebenso existiert `inReview` bereits im `KanbanJsonBoardStatus` Interface als optionales Feld. Die `updateBoardStatus()` Funktion zählt bereits `in_review` Stories. Die Hauptänderung liegt darin, dass `in_review` derzeit auf `in_progress` gemappt wird (`mapJsonStatusToFrontend`) und stattdessen als eigenständiger Frontend-Status behandelt werden muss.

### AD-2: Frontend Status Enum erweitern, nicht ersetzen
Der Frontend-Status-Typ `KanbanStatus` (derzeit `'backlog' | 'in_progress' | 'done' | 'blocked'`) muss um `'in_review'` erweitert werden. Dies betrifft das `StoryInfo` Interface und alle Stellen die diesen Typ verwenden.

### AD-3: MCP Tool `kanban_complete_story` ändern, neues `kanban_approve_story` hinzufügen
`kanban_complete_story` setzt derzeit `story.status = 'done'`. Dies muss auf `story.status = 'in_review'` geändert werden. Ein neues Tool `kanban_approve_story` setzt `story.status = 'done'` mit denselben Statistik-Updates. Dies betrifft den externen MCP Server unter `~/.agent-os/scripts/mcp/kanban-mcp-server.ts`.

### AD-4: Workflow-Completion im Frontend ändern
`handleWorkflowComplete` in `kanban-board.ts` dispatcht derzeit `toStatus: 'done'`. Dies muss auf `toStatus: 'in_review'` geändert werden, damit nach Workflow-Abschluss Stories automatisch in "In Review" landen.

### AD-5: Drag&Drop-Regeln erweitern
Die bestehende Drag&Drop-Validation muss den Rückweg `in_review -> in_progress` sowie `in_review -> done` behandeln.

### AD-6: Backward Compatibility durch fallende Logik
Bestehende Specs die keine `in_review` Stories haben funktionieren weiterhin. `KanbanJsonBoardStatus.inReview` bleibt optional, damit ältere kanban.json Dateien kompatibel bleiben.

### Begründung
Minimaler Eingriff: Der `in_review` Status existiert bereits im Backend-Schema. Wir müssen primär das Frontend-Mapping und die MCP Tools anpassen. Kein neues WebSocket-Event, kein neuer Backend-Endpoint, keine neue Komponente nötig.

### Patterns & Technologien
- **Pattern:** Bestehendes Column-Rendering-Pattern in `kanban-board.ts` wiederverwenden
- **Technologie:** Lit Web Components (Frontend), TypeScript (Backend), MCP Server (extern)
- **Begründung:** Konsistenz mit bestehender Architektur

---

## Komponenten-Übersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `kanban_approve_story` Tool | MCP Tool | Neues Tool im `kanban-mcp-server.ts` das eine Story von `in_review` auf `done` setzt |

### Zu ändernde Komponenten

| Komponente | Änderungsart | Grund |
|------------|--------------|-------|
| `kanban-board.ts` | Erweitern | Neue "In Review" Spalte, Status-Type, handleWorkflowComplete, Drag&Drop |
| `specs-reader.ts` | Erweitern | mapJsonStatusToFrontend, mapFrontendStatusToJson, updateStoryStatus |
| `kanban-mcp-server.ts` | Erweitern + Neu | kanban_complete_story ändern, kanban_approve_story hinzufügen |
| `dashboard-view.ts` | Erweitern | handleStoryMove Typ-Erweiterung für in_review |
| `websocket.ts` | Erweitern | handleSpecsStoryUpdateStatus Typ-Erweiterung |

### Nicht betroffen (explizit)
- `workflow-executor.ts` - Sendet weiterhin `workflow.interactive.complete`, Frontend reagiert
- `cloud-terminal-*` - Keine Berührungspunkte
- `git-*` Services - Keine Berührungspunkte
- kanban.json Schema-Datei - `in_review` Status bereits definiert

---

## Umsetzungsphasen

### Phase 1: Schema & Backend Foundation
**Ziel:** Backend-seitige Unterstützung für `in_review` als eigenständigen Frontend-Status
**Komponenten:** `specs-reader.ts`, `websocket.ts`
**Abhängig von:** Nichts (Startphase)

- `mapJsonStatusToFrontend`: `in_review` als eigenständigen Status `'in_review'` zurückgeben (nicht mehr `'in_progress'`)
- `mapFrontendStatusToJson`: `in_review -> in_review` Mapping hinzufügen
- `updateStoryStatus`: `'in_review'` als gültigen Status akzeptieren
- Frontend Interfaces: `KanbanStatus` Type um `'in_review'` erweitern
- WebSocket Handler: `in_review` in erlaubten Status aufnehmen

### Phase 2: MCP Kanban Tool Anpassung
**Ziel:** MCP Tools setzen Stories korrekt auf `in_review` bzw. `done`
**Komponenten:** `kanban-mcp-server.ts` (extern: `~/.agent-os/scripts/mcp/`)
**Abhängig von:** Phase 1

- `handleKanbanCompleteStory`: Status von `done` auf `in_review` ändern, Phase anpassen
- Neues Tool `kanban_approve_story`: Setzt Story von `in_review` auf `done`
- Tool-Definition zu TOOLS Array hinzufügen
- `handleKanbanGetNextTask`: Stories in `in_review` zählen NICHT als fertig

### Phase 3: Frontend Kanban-Board UI
**Ziel:** Neue "In Review" Spalte sichtbar und funktional
**Komponenten:** `kanban-board.ts`
**Abhängig von:** Phase 1

- `KanbanStatus` Type um `'in_review'` erweitern
- Neue Spalte zwischen "In Progress" und "Done" rendern
- CSS für `.kanban-column.in-review` (orange/amber Farbschema)
- `handleWorkflowComplete`: `toStatus` von `'done'` auf `'in_review'` ändern

### Phase 4: Story-Status-Transitionen
**Ziel:** Drag&Drop für Review-Approve und Review-Reject funktional
**Komponenten:** `kanban-board.ts`, `dashboard-view.ts`
**Abhängig von:** Phase 3

- Drag&Drop-Regeln: `in_review -> done` (Approve), `in_review -> in_progress` (Reject)
- Stories aus `in_review` dürfen zurück nach `in_progress` ohne DoR/Dependency-Check
- `handleStoryMove` in `dashboard-view.ts` Typ-Erweiterung
- `isFirstStoryExecution` anpassen: `in_review` Stories zählen als "aktiv"

---

## Komponenten-Verbindungen (KRITISCH)

> **Zweck:** Explizit definieren WIE Komponenten miteinander verbunden werden.
> Jede Verbindung MUSS einer Story zugeordnet sein.

### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zuständige Story | Validierung |
|--------|--------|----------------|------------------|-------------|
| `specs-reader.ts` (mapJsonStatusToFrontend) | Frontend `StoryInfo.status` | Status Mapping | Phase 1 Story | `grep -q "in_review" specs-reader.ts` |
| `specs-reader.ts` (mapFrontendStatusToJson) | `kanban.json` write | Status Persistence | Phase 1 Story | `grep -q "in_review" specs-reader.ts` |
| `kanban-mcp-server.ts` (kanban_complete_story) | `kanban.json` story.status = `in_review` | File Write | Phase 2 Story | `grep -q "in_review" kanban-mcp-server.ts` |
| `kanban-mcp-server.ts` (kanban_approve_story) | `kanban.json` story.status = `done` | File Write (neu) | Phase 2 Story | `grep -q "kanban_approve_story" kanban-mcp-server.ts` |
| `kanban-board.ts` (renderColumn) | Neue "In Review" Spalte | UI Rendering | Phase 3 Story | `grep -q "in.review" kanban-board.ts` |
| `kanban-board.ts` (handleWorkflowComplete) | `story-move` Event mit `toStatus: 'in_review'` | Event Dispatch | Phase 3 Story | `grep -q "in_review" kanban-board.ts` |
| `kanban-board.ts` (handleDrop) | Validation: `in_review -> done`, `in_review -> in_progress` | Drag&Drop Logic | Phase 4 Story | `grep -q "in_review" kanban-board.ts` |
| `dashboard-view.ts` (handleStoryMove) | `specs.story.updateStatus` WebSocket | WebSocket Send | Phase 4 Story | `grep -q "in_review" dashboard-view.ts` |

### Verbindungs-Details

**V-1: specs-reader.ts → Frontend StoryInfo.status**
- **Art:** Direct return value mapping
- **Schnittstelle:** `mapJsonStatusToFrontend('in_review')` → `'in_review'`
- **Datenfluss:** JSON Status aus kanban.json → Frontend KanbanStatus
- **Story:** Phase 1 Story
- **Validierung:** `grep -q "'in_review'" specs-reader.ts`

**V-2: kanban-mcp-server.ts (complete_story) → kanban.json**
- **Art:** File Write
- **Schnittstelle:** `story.status = 'in_review'` statt `'done'`
- **Datenfluss:** MCP Tool Call → kanban.json Status-Update
- **Story:** Phase 2 Story
- **Validierung:** `grep -q "in_review" kanban-mcp-server.ts`

**V-3: kanban-mcp-server.ts (approve_story) → kanban.json**
- **Art:** File Write (neues Tool)
- **Schnittstelle:** `story.status = 'done'` (nur von `in_review` aus)
- **Datenfluss:** MCP Tool Call → kanban.json Status-Update auf done
- **Story:** Phase 2 Story
- **Validierung:** `grep -q "kanban_approve_story" kanban-mcp-server.ts`

**V-4: kanban-board.ts (handleWorkflowComplete) → story-move Event**
- **Art:** Custom Event Dispatch
- **Schnittstelle:** `detail: { storyId, fromStatus, toStatus: 'in_review' }`
- **Datenfluss:** Workflow Complete → Story nach In Review
- **Story:** Phase 3 Story
- **Validierung:** `grep -q "in_review" kanban-board.ts`

**V-5: kanban-board.ts (handleDrop) → story-move Event**
- **Art:** Drag&Drop Event
- **Schnittstelle:** `in_review -> done` oder `in_review -> in_progress`
- **Datenfluss:** User Drag&Drop → Status-Transition
- **Story:** Phase 4 Story
- **Validierung:** `grep -q "in_review" kanban-board.ts`

### Verbindungs-Checkliste
- [x] Jede neue Komponente hat mindestens eine Verbindung definiert
- [x] Jede Verbindung ist einer Story zugeordnet
- [x] Validierungsbefehle sind ausführbar

---

## Abhängigkeiten

### Interne Abhängigkeiten
```
Phase 1 (Schema & Backend) ──required by──> Phase 2 (MCP Tool)
Phase 1 (Schema & Backend) ──required by──> Phase 3 (Frontend UI)
Phase 3 (Frontend UI) ──required by──> Phase 4 (Status-Transitionen)
```

Phase 1 muss zuerst abgeschlossen werden. Phase 2 und 3 können parallel entwickelt werden. Phase 4 baut auf Phase 3 auf.

### Externe Abhängigkeiten
- **MCP Kanban Server** (`~/.agent-os/scripts/mcp/kanban-mcp-server.ts`): Liegt außerhalb des Projekt-Repos, muss separat geändert werden

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| MCP Server liegt außerhalb des Projekt-Repos | Hoch | Mittel | Pfad ist bekannt (`~/.agent-os/scripts/mcp/kanban-mcp-server.ts`), klare Änderungsanweisungen |
| `mapJsonStatusToFrontend` Änderung ändert Board-Darstellung | Mittel | Hoch | Sorgfältiges Testen: Stories die vorher als `in_progress` angezeigt wurden erscheinen nun in neuer Spalte |
| Drag&Drop Edge Cases für neue Spalte | Mittel | Mittel | Klare Transition-Regeln: nur `in_review -> done` und `in_review -> in_progress` erlaubt |
| Bestehende Specs mit `done` Stories | Niedrig | Niedrig | Backward Compatibility: `done` bleibt `done`, nur neue Completions gehen nach `in_review` |
| `getNextReadyStory` überspringt `in_review` Stories | Niedrig | Niedrig | Sucht nur nach `backlog` Stories - kein Risiko |

---

## Self-Review Ergebnisse

### Validiert
- Alle 7 funktionalen Requirements aus dem Clarification Document sind abgedeckt
- Backward Compatibility für bestehende Specs gewährleistet
- Keine Widersprüche in den Architekturentscheidungen
- Alle Edge Cases aus Requirements-Clarification adressiert
- `in_review` Status existiert bereits im Backend-Schema → minimaler Eingriff
- Component Connection Validation: Keine verwaisten Komponenten

### Identifizierte Probleme & Lösungen
| Problem | Ursprünglicher Plan | Verbesserung |
|---------|--------------------|--------------|
| `in_review` wird aktuell auf `in_progress` gemappt | Neuen Status im Schema anlegen | Bestehendes Mapping ändern - Schema hat Status bereits |
| MCP Server extern | Im Projekt-Repo ändern | Externen Pfad direkt ändern |

### Offene Fragen
- Keine offenen Fragen

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar für |
|---------|-------------|-------------|
| `in_review` Status im `KanbanJsonStatus` Type | `specs-reader.ts`, `kanban-mcp-server.ts` | Kein neuer Status nötig |
| `inReview` Counter in `KanbanJsonBoardStatus` | `specs-reader.ts` | Kein neues Feld nötig |
| `updateBoardStatus()` zählt bereits `in_review` | `kanban-mcp-server.ts` | Keine Änderung nötig |
| `renderColumn()` Methode | `kanban-board.ts` | Direkt wiederverwendbar für neue Spalte |
| `handleDrop()` / `handleDragOver()` Pattern | `kanban-board.ts` | Erweiterbares Pattern für neue Spalte |

### Optimierungen

| Ursprünglich | Optimiert zu | Ersparnis |
|--------------|--------------|-----------|
| Neuen Status im JSON Schema anlegen | Bestehendes `in_review` im Schema nutzen | Schema-Migration vermieden |
| Neues WebSocket Event für Review | Bestehendes `specs.story.updateStatus` nutzen | Kein neues Event nötig |
| Neuer Backend-Endpoint | Kein neuer Endpoint nötig | Backend-Aufwand reduziert |
| Neue UI-Komponente für Review | Bestehende `renderColumn()` wiederverwenden | Keine neue Komponente |

### Feature-Preservation bestätigt
- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erfüllbar

---

## Nächste Schritte

Nach Genehmigung dieses Plans:
1. Step 2.6: User Stories aus diesem Plan ableiten
2. Step 3: Architect fügt technische Details hinzu
3. Step 4: Spec ready for execution
