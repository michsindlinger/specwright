# Shared Services

> Verfügbare Services, Hooks und Utilities im Projekt.
> Zuletzt aktualisiert: 2026-02-16

## Services-Übersicht

| Service/Hook | Pfad | Typ | Erstellt in Spec |
|--------------|------|-----|------------------|
| FileService | ui/src/server/services/file.service.ts | Service | File Editor (2026-02-16) |
| FileHandler | ui/src/server/handlers/file.handler.ts | Handler | File Editor (2026-02-16) |

---

## Services

### FileService

**Pfad:** `ui/src/server/services/file.service.ts`
**Typ:** Service
**Erstellt:** File Editor (2026-02-16)

**Beschreibung:** Dateisystem-Operationen mit Path-Traversal-Schutz. Bietet CRUD-Operationen für Dateien und Verzeichnisse innerhalb des Projektverzeichnisses.

**Methoden:**
| Methode | Parameter | Return | Beschreibung |
|---------|-----------|--------|--------------|
| listFiles | (path: string) | Promise<FileEntry[]> | Verzeichnisinhalt auflisten |
| readFile | (path: string) | Promise<FileContent> | Dateiinhalt lesen |
| writeFile | (path: string, content: string) | Promise<void> | Dateiinhalt schreiben |
| createFile | (path: string) | Promise<void> | Neue Datei erstellen |
| createDirectory | (path: string) | Promise<void> | Neues Verzeichnis erstellen |
| renameFile | (oldPath: string, newPath: string) | Promise<void> | Datei/Ordner umbenennen |
| deleteFile | (path: string) | Promise<void> | Datei/Ordner löschen |

**Notes:**
- Path-Traversal-Schutz verhindert Zugriff außerhalb des Projektverzeichnisses
- Binärdatei-Erkennung integriert
- Dateigrößen-Limit: 5 MB

---

### FileHandler

**Pfad:** `ui/src/server/handlers/file.handler.ts`
**Typ:** WebSocket Message Handler
**Erstellt:** File Editor (2026-02-16)

**Beschreibung:** WebSocket-Handler für File-Operationen. Routet `files.*` Messages an den FileService.

**Handled Messages:**
| Message Type | Description |
|-------------|-------------|
| files:list | Verzeichnisinhalt anfordern |
| files:read | Dateiinhalt lesen |
| files:write | Dateiinhalt speichern |
| files:create | Neue Datei erstellen |
| files:mkdir | Neues Verzeichnis erstellen |
| files:rename | Datei/Ordner umbenennen |
| files:delete | Datei/Ordner löschen |

**Notes:**
- Folgt dem gleichen Pattern wie `AttachmentHandler` und `DocsReader`
- Responses folgen dem Pattern `{type}:response` / `{type}:error`

---

*Template Version: 1.0*
