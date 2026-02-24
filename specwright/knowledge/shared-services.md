# Shared Services

> Verfügbare Services, Hooks und Utilities im Projekt.
> Zuletzt aktualisiert: 2026-02-24

## Services-Übersicht

| Service/Hook | Pfad | Typ | Erstellt in Spec |
|--------------|------|-----|------------------|
| FileService | ui/src/server/services/file.service.ts | Service | File Editor (2026-02-16) |
| FileHandler | ui/src/server/handlers/file.handler.ts | Handler | File Editor (2026-02-16) |
| GitService | ui/src/server/services/git.service.ts | Service | Branch-per-Story Backlog (2026-02-16) |
| isSpecReady | ui/src/server/specs-reader.ts | Method (SpecsReader) | Spec Assignment (2026-02-24) |
| toggleBotAssignment | ui/src/server/specs-reader.ts | Method (SpecsReader) | Spec Assignment (2026-02-24) |

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

### GitService

**Pfad:** `ui/src/server/services/git.service.ts`
**Typ:** Service
**Erstellt:** Branch-per-Story Backlog (2026-02-16)

**Beschreibung:** Git-Operationen für Branch-Erstellung, PR-Erstellung und Branch-Wechsel. Wird für Branch-per-Story Backlog-Execution verwendet.

**Methoden:**
| Methode | Parameter | Return | Beschreibung |
|---------|-----------|--------|--------------|
| createBranch | (projectPath: string, branchName: string, fromBranch?: string) | Promise<string> | Branch erstellen und darauf wechseln |
| checkoutMain | (projectPath: string) | Promise<string> | Auf main Branch zurückwechseln |
| pushBranch | (projectPath: string, branchName: string) | Promise<string> | Branch zum Remote pushen mit `-u` Flag |
| createPullRequest | (projectPath: string, branchName: string, title: string, body?: string) | Promise<string> | PR via `gh pr create` erstellen |
| isWorkingDirectoryClean | (projectPath: string) | Promise<boolean> | Prüfen ob uncommitted changes vorliegen |

**Notes:**
- Nutzt `execFile` statt `exec` aus Sicherheitsgründen
- `createPullRequest` nutzt gh CLI via `execFile('gh', ...)`
- Fehlerbehandlung mit `GitError` und spezifischen Error-Codes
- Timeout: 30 Sekunden (GIT_CONFIG.OPERATION_TIMEOUT_MS)

---

### isSpecReady

**Pfad:** `ui/src/server/specs-reader.ts`
**Typ:** Method (SpecsReader)
**Erstellt:** Spec Assignment (2026-02-24)

**Beschreibung:** Prüft ob eine Spec bereit für Bot-Assignment ist. Eine Spec ist bereit wenn ALLE Stories Status "ready" haben und mindestens eine Story existiert.

**Signatur:**
| Methode | Parameter | Return | Beschreibung |
|---------|-----------|--------|--------------|
| isSpecReady | (kanban: KanbanJsonV1) | boolean | True wenn alle Stories "ready" |

**Notes:**
- Wiederverwendbar für Ready-Prüfungen an beliebigen Specs
- Vergleicht `boardStatus.ready === boardStatus.total && total > 0`

---

### toggleBotAssignment

**Pfad:** `ui/src/server/specs-reader.ts`
**Typ:** Method (SpecsReader)
**Erstellt:** Spec Assignment (2026-02-24)

**Beschreibung:** Atomares Toggle für Bot-Assignment in kanban.json. Nutzt `withKanbanLock` für sichere Read-Modify-Write-Operationen. Assignment ist nur erlaubt wenn die Spec ready ist.

**Signatur:**
| Methode | Parameter | Return | Beschreibung |
|---------|-----------|--------|--------------|
| toggleBotAssignment | (projectPath: string, specId: string) | Promise<{ assigned: boolean; error?: string }> | Togglet assignedToBot-Feld in kanban.json |

**Notes:**
- Nutzt `withKanbanLock` für atomare JSON-Updates (kein Race-Condition-Risiko)
- Validiert Ready-Status vor Assignment (Assign nur wenn `isSpecReady()` true)
- Unassign ist immer erlaubt (keine Validierung nötig)
- Pattern wiederverwendbar für andere Toggle-Felder in kanban.json

---

*Template Version: 1.0*
