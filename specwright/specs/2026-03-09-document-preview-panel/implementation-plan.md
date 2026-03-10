# Implementierungsplan: Document Preview Panel

> **Status:** DRAFT
> **Spec:** specwright/specs/2026-03-09-document-preview-panel/
> **Erstellt:** 2026-03-09
> **Basiert auf:** requirements-clarification.md

---

## Executive Summary

Ein Overlay Side-Panel das von links ueber den Chat-Bereich einfaehrt, um waehrend Workflows generierte Dokumente (z.B. Requirements Clarification, Implementation Plan) automatisch anzuzeigen und editierbar zu machen. Gesteuert ueber zwei neue MCP-Tools im bestehenden kanban-mcp-server, kommuniziert via WebSocket ans Frontend.

---

## Architektur-Entscheidungen

### Gewaehlter Ansatz

MCP-Tool → WebSocket-Broadcast → Frontend Overlay Panel

Der MCP-Server ruft keine HTTP-API auf, sondern nutzt den bestehenden WebSocket-Kanal: Das MCP-Tool schreibt eine Datei in ein bekanntes Verzeichnis (`/tmp/specwright-preview-<projectHash>.json`), die der Backend-Server via Filewatcher erkennt und als WebSocket-Message an alle Clients des Projekts broadcastet.

**Alternative (verworfen):** Direkter HTTP-Call vom MCP-Server ans Backend - wuerde eine HTTP-Route erfordern und Authentifizierung/Port-Discovery noetig machen.

**Gewaehlt stattdessen:** Filewatcher-Pattern (wie es bei kanban.json bereits existiert) - der MCP-Server ist ein stdio-basierter Prozess ohne Netzwerkzugang, daher muss die Kommunikation ueber das Filesystem laufen.

### Begruendung

- MCP-Server ist stdio-basiert (kein HTTP-Client moeglich ohne Dependency)
- Filesystem als IPC ist bereits im Projekt etabliert (kanban.json Lock-Pattern)
- WebSocket-Broadcast an alle Clients des Projekts ist bereits implementiert
- Overlay-Pattern (nicht Side-by-Side) vermeidet Layout-Aenderungen am bestehenden Chat

### Patterns & Technologien
- **Pattern:** Filewatcher IPC (MCP → File → Backend → WebSocket → Frontend)
- **UI Pattern:** Overlay Sidebar (wie aos-file-tree-sidebar, aber fuer Dokument-Preview)
- **Editor:** Bestehender aos-file-editor (CodeMirror) fuer Markdown-Editing
- **Rendering:** Bestehender aos-docs-viewer fuer Markdown-Rendering

---

## Komponenten-Uebersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `document_preview_open` | MCP-Tool | Schreibt Preview-Request als JSON-Datei |
| `document_preview_close` | MCP-Tool | Schreibt Close-Request als JSON-Datei |
| `PreviewWatcher` | Backend-Service | Filewatcher fuer Preview-Requests, WebSocket-Broadcast |
| `aos-document-preview-panel` | Frontend-Komponente | Overlay Side-Panel mit Editor/Viewer |

### Zu aendernde Komponenten

| Komponente | Aenderungsart | Grund |
|------------|--------------|-------|
| `kanban-mcp-server.ts` | Erweitern | 2 neue Tool-Definitionen + Handler |
| `websocket.ts` | Erweitern | Neue Message-Handler (document-preview.*) |
| `app.ts` | Erweitern | Integration des neuen Panels (State + Render) |

### Nicht betroffen (explizit)

- `aos-chat-view` - Chat bleibt unveraendert, Panel liegt als Overlay darueber
- `aos-file-editor-panel` - Bestehender File-Editor bleibt unabhaengig
- `aos-file-tree-sidebar` - Bestehende File-Tree Sidebar bleibt unabhaengig
- Bestehende MCP-Tools (kanban_*, memory_*, backlog_*) - keine Aenderungen
- `specs-reader.ts` / `docs-reader.ts` - Werden nicht verwendet, stattdessen FileService

---

## Umsetzungsphasen

### Phase 1: MCP-Tools & Backend-Service
**Ziel:** MCP-Tools koennen Preview-Requests setzen, Backend erkennt sie und broadcastet via WebSocket
**Komponenten:** kanban-mcp-server.ts, PreviewWatcher, websocket.ts
**Abhaengig von:** Nichts (Startphase)

### Phase 2: Frontend Panel
**Ziel:** Overlay Side-Panel zeigt Markdown-Dokumente an und erlaubt Editing
**Komponenten:** aos-document-preview-panel, app.ts Integration
**Abhaengig von:** Phase 1 (braucht WebSocket Messages)

### Phase 3: Integration & Validation
**Ziel:** End-to-End Test: MCP-Tool oeffnet Panel, User editiert, MCP-Tool schliesst
**Komponenten:** Alle Integrationspunkte
**Abhaengig von:** Phase 1 + Phase 2

---

## Komponenten-Verbindungen (KRITISCH)

### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zustaendige Story | Validierung |
|--------|--------|----------------|-------------------|-------------|
| MCP-Tool | Preview-JSON-Datei | File Write | STORY-001 | Datei wird erstellt in /tmp/ |
| PreviewWatcher | WebSocket Clients | WS Broadcast | STORY-002 | Message kommt bei Frontend an |
| Gateway (Frontend) | aos-document-preview-panel | Event Handler | STORY-003 | Panel oeffnet sich |
| aos-document-preview-panel | Backend (files:write) | WebSocket Message | STORY-003 | File wird gespeichert |
| app.ts | aos-document-preview-panel | Property Binding | STORY-004 | Panel rendert in App |

### Verbindungs-Details

**VERBINDUNG-1: MCP-Tool → Preview-JSON-Datei → PreviewWatcher**
- **Art:** Filesystem IPC (JSON-Datei)
- **Schnittstelle:** `/tmp/specwright-preview-<hash>.json` mit Inhalt `{ "action": "open", "filePath": "...", "projectPath": "..." }`
- **Datenfluss:** MCP-Tool schreibt JSON → Backend Filewatcher liest → Loescht Datei → Broadcastet via WS
- **Story:** STORY-001 (MCP-Tools) + STORY-002 (Backend-Watcher)
- **Validierung:** `ls /tmp/specwright-preview-*` nach MCP-Tool-Call

**VERBINDUNG-2: PreviewWatcher → WebSocket → Frontend**
- **Art:** WebSocket Broadcast
- **Schnittstelle:** `{ type: 'document-preview.open', filePath: '...', content: '...' }`
- **Datenfluss:** Backend liest File-Inhalt, sendet Content + Pfad an alle Clients des Projekts
- **Story:** STORY-002
- **Validierung:** Browser DevTools → WS Messages

**VERBINDUNG-3: Frontend Gateway → Panel Komponente**
- **Art:** Gateway Event Handler → State Update in app.ts → Property Binding
- **Schnittstelle:** `gateway.on('document-preview.open', handler)` in app.ts
- **Datenfluss:** Gateway empfaengt Message → app.ts setzt State → Panel rendert
- **Story:** STORY-003 + STORY-004
- **Validierung:** Panel oeffnet sich bei WS Message

**VERBINDUNG-4: Panel → Backend (Save)**
- **Art:** WebSocket Message (bestehender files:write Kanal)
- **Schnittstelle:** `gateway.send({ type: 'files:write', path: '...', content: '...' })`
- **Datenfluss:** User editiert → Save → Gateway sendet → FileHandler schreibt
- **Story:** STORY-003
- **Validierung:** File auf Disk enthaelt editierten Inhalt

### Verbindungs-Checkliste
- [x] Jede neue Komponente hat mindestens eine Verbindung definiert
- [x] Jede Verbindung ist einer Story zugeordnet
- [x] Validierungsbefehle sind ausfuehrbar

---

## Abhaengigkeiten

### Interne Abhaengigkeiten
```
MCP-Tools (STORY-001) ──writes──> /tmp/specwright-preview-*.json
PreviewWatcher (STORY-002) ──reads──> /tmp/specwright-preview-*.json
PreviewWatcher (STORY-002) ──broadcasts──> WebSocket Clients
aos-document-preview-panel (STORY-003) ──listens──> Gateway Events
app.ts (STORY-004) ──renders──> aos-document-preview-panel
aos-document-preview-panel (STORY-003) ──saves via──> FileHandler (bestehend)
```

### Externe Abhaengigkeiten
- `chokidar` oder `fs.watch`: Fuer Filewatcher im Backend (chokidar bereits als Dependency vorhanden fuer nodemon)
- Keine neuen npm-Pakete noetig - `fs.watch` aus Node.js stdlib reicht

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Filewatcher Race Condition (mehrere MCP-Calls gleichzeitig) | Low | Low | Atomisches Write + Rename Pattern, Delete nach Lesen |
| Panel ueberlagert wichtigen Chat-Inhalt | Med | Low | Panel ist manuell schliessbar, angemessene Default-Breite (400px) |
| Ungespeicherte Aenderungen gehen verloren bei neuem File | Med | Med | Confirm-Dialog vor Inhaltswechsel wenn dirty |
| /tmp/ Cleanup bei Crash | Low | Low | Cleanup beim Backend-Start, Prefix-basiert |

---

## Self-Review Ergebnisse

### Validiert
- MCP-Server ist stdio-basiert → Filesystem IPC ist der richtige Ansatz
- aos-file-tree-sidebar Pattern ist ideal als Vorlage fuer das neue Panel (gleiche Overlay-Mechanik)
- FileHandler existiert bereits und kann fuer Save genutzt werden
- Gateway Pattern (on/off/send) ist klar definiert und bewaehrt
- app.ts hat bereits Muster fuer Sidebar-State-Management (isFileTreeOpen, isTerminalSidebarOpen)

### Identifizierte Probleme & Loesungen
| Problem | Urspruenglicher Plan | Verbesserung |
|---------|--------------------|--------------|
| MCP-Server hat keinen HTTP-Client | HTTP-Call ans Backend | Filesystem IPC via /tmp/ |
| Content muss vom Backend gelesen werden | Frontend liest File | Backend liest + sendet Content (sicherer, Path-Validation) |
| Panel muss in app.ts integriert werden | Eigenes Routing | Property-Binding wie file-tree-sidebar (einfacher) |

### Offene Fragen
- Keine

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar fuer |
|---------|-------------|-------------|
| Sidebar Overlay Pattern | `aos-file-tree-sidebar.ts` | Panel-Layout, Slide-Animation, Resize, Close-Button |
| Markdown Viewer | `aos-docs-viewer.ts` | Markdown-Rendering im Panel |
| File Editor (CodeMirror) | `aos-file-editor.ts` | Edit-Modus im Panel |
| FileHandler.handleWrite | `file.handler.ts` | Speichern der editierten Datei |
| Gateway Pattern | `gateway.ts` | WebSocket-Kommunikation |
| App Sidebar State | `app.ts` (isFileTreeOpen Pattern) | State-Management fuer Panel |

### Optimierungen

| Urspruenglich | Optimiert zu | Ersparnis |
|--------------|-------------|-----------|
| Eigener Editor bauen | aos-file-editor + aos-docs-viewer wiederverwenden | ~300 Zeilen Code |
| Eigenen Save-Kanal bauen | Bestehenden files:write Message-Type nutzen | ~100 Zeilen Code |
| Panel von Scratch | aos-file-tree-sidebar als Vorlage kopieren + anpassen | ~200 Zeilen CSS |

### Feature-Preservation bestaetigt
- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erfuellbar

---

## Naechste Schritte

Nach Genehmigung dieses Plans:
1. Step 2.6: User Stories aus diesem Plan ableiten
2. Step 3: Architect fuegt technische Details hinzu
3. Step 4: Spec ready for execution
