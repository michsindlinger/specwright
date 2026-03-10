# Requirements Clarification - Document Preview Panel

**Created:** 2026-03-09
**Status:** Pending User Approval

## Feature Overview

Generierte Dokumente (z.B. Requirements Clarification, Implementation Plan) sollen waehrend Workflows automatisch in einem Overlay-Panel in der Specwright UI angezeigt werden koennen, ohne dass der User manuell durch Files navigieren oder in einen externen Editor wechseln muss. Claude Code steuert die Anzeige ueber ein neues MCP-Tool.

## Target Users

- Specwright UI Nutzer, die Workflows ausfuehren (z.B. /create-spec, /add-bug)
- Claude Code Agents, die waehrend Workflows Dokumente generieren

## Business Value

- **Reduzierte Reibung:** Kein Wechsel zwischen Terminal und File-Navigation mehr
- **Besserer Review-Flow:** Generierte Dokumente sofort sichtbar und editierbar
- **Nahtlose Integration:** Claude Code kann proaktiv relevante Dokumente anzeigen
- **Schnellere Feedback-Loops:** User sieht und editiert Dokumente in-place

## Functional Requirements

### MCP-Server Erweiterung (2 neue Tools)

1. **`document_preview_open`** - Oeffnet ein Dokument im Preview-Panel
   - Input: Dateipfad (relativ zum Projekt), Projekt-Pfad
   - Verhalten: Sendet WebSocket-Message an Frontend, Panel oeffnet sich automatisch
   - Bei bereits offenem Panel: Inhalt wird ersetzt (kein Tab-System)

2. **`document_preview_close`** - Schliesst das Preview-Panel
   - Verhalten: Sendet WebSocket-Message an Frontend, Panel schliesst sich
   - Nutzung: z.B. am Ende eines Workflows

### Frontend - Overlay Side-Panel

3. **Panel-Verhalten:**
   - Faehrt von links als Overlay ueber den Chat-Bereich ein (ueberlagert, verschiebt nicht)
   - Oeffnet sich automatisch wenn Claude Code ein File setzt
   - Kann manuell vom User geschlossen werden (X-Button)
   - Kann programmatisch von Claude Code geschlossen werden (via MCP-Tool)

4. **Editor-Funktionalitaet:**
   - Markdown-Rendering mit Edit-Moeglichkeit (bestehende Komponenten nutzen)
   - Speichern schreibt direkt auf das Filesystem (ueber bestehenden WebSocket-Kanal)
   - Dateiname/Pfad wird im Panel-Header angezeigt

5. **Update-Verhalten:**
   - Wenn Claude Code ein neues Dokument setzt waehrend Panel offen ist: Inhalt wird ersetzt
   - Kein History/Tab-System - immer nur ein Dokument gleichzeitig

### Backend - WebSocket Integration

6. **Neue WebSocket Message Types:**
   - `document-preview.open` - MCP-Server -> Backend -> Frontend (File oeffnen)
   - `document-preview.close` - MCP-Server -> Backend -> Frontend (Panel schliessen)
   - `document-preview.save` - Frontend -> Backend (Editiertes File speichern)

## Affected Areas & Dependencies

- **kanban-mcp-server.ts** - 2 neue Tool-Definitionen (document_preview_open, document_preview_close)
- **websocket.ts** - Neue Message-Handler fuer document-preview.*
- **Frontend Components** - Neues aos-document-preview-panel (nutzt bestehende Editor-Komponenten)
- **Chat-View** - Integration des Overlay-Panels in die Chat-Ansicht
- **FileService / SpecsReader** - Wiederverwendung fuer File-Read/Write

## Edge Cases & Error Scenarios

- **File existiert nicht:** Panel zeigt Fehlermeldung, schliesst nicht automatisch
- **File ausserhalb Projekt:** Validierung im Backend, Anfrage wird abgelehnt
- **Ungespeicherte Aenderungen:** Wenn User editiert hat und Claude Code neues File setzt: Warnung anzeigen ("Ungespeicherte Aenderungen verwerfen?")
- **WebSocket Disconnect:** Panel bleibt offen mit letztem Inhalt, reconnect stellt Verbindung wieder her
- **Panel offen + User navigiert weg:** Panel schliesst sich bei Seitenwechsel (z.B. Dashboard -> Settings)

## Security & Permissions

- Path-Traversal-Schutz: Dateipfad muss innerhalb des aktiven Projekt-Verzeichnisses liegen
- Wiederverwendung der bestehenden FileService-Validierung
- Nur Markdown-Dateien (.md) werden unterstuetzt (Phase 1)

## Performance Considerations

- File-Inhalt wird on-demand geladen (nicht gecacht)
- Panel-Animation sollte smooth sein (CSS transitions)
- Keine Auswirkung auf Chat-Performance da Overlay (kein Re-Layout)

## Scope Boundaries

**IN SCOPE:**
- MCP-Tool zum Oeffnen/Schliessen des Panels
- Overlay Side-Panel mit Markdown Editor
- WebSocket-Integration fuer Kommunikation
- Ungespeicherte-Aenderungen-Warnung
- Nur Markdown-Dateien

**OUT OF SCOPE:**
- Multi-File Tabs / History
- Scroll-to-Section Funktionalitaet
- Andere Dateitypen (JSON, YAML, TypeScript)
- Neuer separater MCP-Server
- Panel fuer nicht-aktive Projekte

## Open Questions

- Keine

## Proposed User Stories (High Level)

1. **MCP-Tool: Document Preview Open** - Neues Tool im kanban-mcp-server das Dateipfad via WebSocket ans Frontend sendet
2. **MCP-Tool: Document Preview Close** - Tool zum programmatischen Schliessen des Panels
3. **WebSocket: Document Preview Messages** - Backend-Handler fuer die neuen Message-Types inkl. File-Read/Write
4. **Frontend: Document Preview Panel** - Overlay Side-Panel Komponente mit Markdown Editor
5. **Frontend: Chat-View Integration** - Panel in die Chat-Ansicht einbinden, Overlay-Verhalten implementieren

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
