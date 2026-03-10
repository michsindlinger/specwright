# Code Review Report - Document Preview Panel

**Datum:** 2026-03-10
**Branch:** feature/document-preview-panel
**Reviewer:** Claude (Opus)

## Review Summary

**Gepruefte Commits:** 4
**Gepruefte Dateien:** 6 (Implementation-Dateien)
**Gefundene Issues:** 4

| Schweregrad | Anzahl |
|-------------|--------|
| Critical | 0 |
| Major | 1 |
| Minor | 3 |

## Gepruefte Dateien

| Datei | Status | Ergebnis |
|-------|--------|----------|
| specwright/scripts/mcp/kanban-mcp-server.ts | Modified | 1 Minor Issue |
| ui/frontend/src/components/document-preview/aos-document-preview-panel.ts | Added | Keine Issues |
| ui/src/server/handlers/document-preview.handler.ts | Added | 1 Major Issue |
| ui/src/server/services/preview-watcher.service.ts | Added | Keine Issues |
| ui/src/server/websocket.ts | Modified | 1 Minor Issue |
| ui/frontend/src/app.ts | Modified (uncommitted) | 1 Minor Issue |

## Issues

### Critical Issues

Keine gefunden.

### Major Issues

#### M1: Message-Typ-Mismatch zwischen Handler und Frontend

**Datei:** `ui/src/server/handlers/document-preview.handler.ts:77-83`
**Beschreibung:** Die `sendError`-Methode sendet Fehler mit dem Typ `document-preview.save.error`. Das Frontend (`aos-document-preview-panel.ts:241-244`) hoert jedoch nur auf `document-preview.save.response` und `document-preview.error`. Save-Fehler werden vom Frontend nie empfangen.
**Auswirkung:** Bei einem Speicherfehler bleibt `isSaving` auf `true` stehen, der User sieht ewig "Speichert..." ohne Feedback. Die Fehlermeldung kommt nie an.
**Empfehlung:** `sendError` sollte `document-preview.save.response` mit `success: false` senden, damit der bestehende `onSaveResponse`-Handler im Frontend den Fehler korrekt verarbeiten kann.

### Minor Issues

#### N1: writeFileSync in async Context

**Datei:** `specwright/scripts/mcp/kanban-mcp-server.ts:773, 795`
**Beschreibung:** Die neuen MCP-Tool-Handler `document_preview_open` und `document_preview_close` verwenden `writeFileSync` innerhalb eines async Handlers. Der Rest des Files nutzt konsistent `writeFile` aus `fs/promises`.
**Auswirkung:** Blockiert den Event Loop momentan fuer kleine JSON-Dateien (vernachlaessigbar), aber inkonsistent mit dem Coding-Stil.
**Empfehlung:** `writeFileSync` durch `await writeFile` ersetzen fuer Konsistenz.

#### N2: Duplizierter Document-Preview State-Reset

**Datei:** `ui/frontend/src/app.ts` (3 Stellen)
**Beschreibung:** Der State-Reset fuer das Document Preview Panel (`isDocumentPreviewOpen = false`, `documentPreviewContent = ''`, `documentPreviewFilePath = ''`) ist an 3 Stellen dupliziert: Route-Change-Handler, Project-Switch-Handler, und Close-Handler.
**Auswirkung:** Code-Duplizierung, erhoehte Wartungsaufwand bei Aenderungen.
**Empfehlung:** Bereits existierende `_handleDocumentPreviewClose()`-Methode in allen 3 Stellen wiederverwenden.

#### N3: Kein PreviewWatcher Cleanup bei Shutdown

**Datei:** `ui/src/server/websocket.ts:92`
**Beschreibung:** `previewWatcher.init()` wird im Konstruktor aufgerufen, aber `previewWatcher.stop()` wird nie beim Shutdown aufgerufen. Der Watcher auf `/tmp/` bleibt aktiv.
**Auswirkung:** Ressourcen-Leak bei Server-Neustart (minor, da Node Prozess den Watcher automatisch beendet).
**Empfehlung:** `stop()` in einer Cleanup-Methode aufrufen, analog zu anderen Services.

## Fix Status

| # | Schweregrad | Issue | Status | Fix-Details |
|---|-------------|-------|--------|-------------|
| M1 | Major | Message-Typ-Mismatch Handler/Frontend | fixed | sendError sendet jetzt `document-preview.save.response` mit `success: false` |
| N1 | Minor | writeFileSync in async Context | fixed | `writeFileSync` durch `await writeFile` ersetzt, `writeFileSync` Import entfernt |
| N2 | Minor | Duplizierter State-Reset | fixed | Route-Change und Project-Switch nutzen jetzt `_handleDocumentPreviewClose()` |
| N3 | Minor | Kein PreviewWatcher Cleanup | fixed | `previewWatcher.stop()` in `shutdown()` Methode aufgerufen |

## Re-Review

**Datum:** 2026-03-10
**Gepruefte Dateien:** 4 (nur geaenderte)
**Neue Issues:** 0
**Auto-Fix Ergebnis:** 4/4 gefixt, 0 als Bug-Tickets erstellt
**Ergebnis:** Review bestanden

## Fazit

Review passed (after fixes) - Alle 4 Issues erfolgreich gefixt.
