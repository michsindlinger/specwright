# MCP Tools

> Verfügbare MCP-Tools im Projekt.
> Zuletzt aktualisiert: 2026-03-10 (Document Preview Panel)

## Tools-Übersicht

| Tool | Pfad | Beschreibung | Erstellt in Spec |
|------|------|--------------|------------------|
| document_preview_open | specwright/scripts/mcp/kanban-mcp-server.ts | Öffnet Dokument im Preview Panel | Document Preview Panel (2026-03-10) |
| document_preview_close | specwright/scripts/mcp/kanban-mcp-server.ts | Schließt das Preview Panel | Document Preview Panel (2026-03-10) |

---

## Tool-Details

### document_preview_open

**Pfad:** `specwright/scripts/mcp/kanban-mcp-server.ts`
**Erstellt:** Document Preview Panel (2026-03-10)

**Beschreibung:** MCP-Tool zum Öffnen eines Dokuments im UI Preview Panel. Erstellt eine JSON-Datei in `/tmp/` die vom PreviewWatcher erkannt und via WebSocket ans Frontend weitergeleitet wird.

**Input Schema:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| filePath | string | Yes | Pfad zur anzuzeigenden Datei (absolut oder relativ zum Projektverzeichnis) |

**Mechanismus:**
1. Erstellt `specwright-preview-{hash}.json` in `/tmp/`
2. PreviewWatcher erkennt die Datei via `fs.watch`
3. WebSocket-Broadcast an Frontend-Client des passenden Projekts
4. Frontend öffnet aos-document-preview-panel mit Dateiinhalt

**Usage (Claude Code):**
```
Use document_preview_open tool with filePath: "specwright/specs/my-spec/spec.md"
```

---

### document_preview_close

**Pfad:** `specwright/scripts/mcp/kanban-mcp-server.ts`
**Erstellt:** Document Preview Panel (2026-03-10)

**Beschreibung:** MCP-Tool zum Schließen des Preview Panels. Erstellt eine Close-Request JSON-Datei in `/tmp/`.

**Input Schema:**
Keine Parameter erforderlich.

**Mechanismus:**
1. Erstellt `specwright-preview-{hash}.json` mit `action: 'close'` in `/tmp/`
2. PreviewWatcher erkennt die Datei
3. WebSocket-Broadcast: `document-preview.close` an Frontend
4. Frontend schließt aos-document-preview-panel

**Usage (Claude Code):**
```
Use document_preview_close tool
```

---

*Template Version: 1.0*
