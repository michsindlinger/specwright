# Shared Services

> Verfügbare Services, Hooks und Utilities im Projekt.
> Zuletzt aktualisiert: 2026-03-14 (Backlog Item Comments)

## Services-Übersicht

| Service/Hook | Pfad | Typ | Erstellt in Spec |
|--------------|------|-----|------------------|
| FileService | ui/src/server/services/file.service.ts | Service | File Editor (2026-02-16) |
| FileHandler | ui/src/server/handlers/file.handler.ts | Handler | File Editor (2026-02-16) |
| GitService | ui/src/server/services/git.service.ts | Service | Branch-per-Story Backlog (2026-02-16) |
| McpConfigReaderService | ui/src/server/services/mcp-config-reader.service.ts | Service | MCP Tools Management (2026-02-27) |
| isSpecReady | ui/src/server/specs-reader.ts | Method (SpecsReader) | Spec Assignment (2026-02-24) |
| toggleBotAssignment | ui/src/server/specs-reader.ts | Method (SpecsReader) | Spec Assignment (2026-02-24) |
| VoiceConfigService | ui/src/server/voice-config.ts | Service | Voice Call Conversational Flow (2026-03-01) |
| DeepgramAdapter | ui/src/server/services/deepgram.adapter.ts | Service | Voice Call Conversational Flow (2026-03-01) |
| ElevenLabsAdapter | ui/src/server/services/elevenlabs.adapter.ts | Service | Voice Call Conversational Flow (2026-03-01) |
| AudioCaptureService | ui/frontend/src/services/audio-capture.service.ts | Service | Voice Call Conversational Flow (2026-03-01) |
| VoiceCallService | ui/src/server/services/voice-call.service.ts | Service | Voice Call Conversational Flow (2026-03-01) |
| AudioPlaybackService | ui/frontend/src/services/audio-playback.service.ts | Service | Voice Call Conversational Flow (2026-03-01) |
| TranscriptService | ui/src/server/services/transcript.service.ts | Service | Voice Call Conversational Flow (2026-03-01) |
| PreviewWatcher | ui/src/server/services/preview-watcher.service.ts | Service | Document Preview Panel (2026-03-10) |
| DocumentPreviewHandler | ui/src/server/handlers/document-preview.handler.ts | Handler | Document Preview Panel (2026-03-10) |
| CommentHandler | ui/src/server/handlers/comment.handler.ts | Handler (Singleton) | Backlog Item Comments (2026-03-14) |

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

### McpConfigReaderService

**Pfad:** `ui/src/server/services/mcp-config-reader.service.ts`
**Typ:** Service
**Erstellt:** MCP Tools Management (2026-02-27)

**Beschreibung:** Service zum Lesen und Parsen der `.mcp.json` Projekt-Konfiguration. Liefert MCP-Server-Informationen ohne sensitive env-Felder.

**Methoden:**
| Methode | Parameter | Return | Beschreibung |
|---------|-----------|--------|--------------|
| readConfig | (projectPath: string) | Promise<{ servers: McpServerSummary[]; message?: string }> | Liest .mcp.json und gibt Server-Liste zurück |

**Notes:**
- Singleton-Export: `mcpConfigReaderService`
- env-Felder werden NIEMALS zurückgegeben (Security-critical)
- Fallback: Sucht .mcp.json auch im Parent-Verzeichnis (Monorepo-Support)
- Leere/fehlende .mcp.json gibt leeres Array + message zurück (kein Error)

---

### VoiceConfigService

**Pfad:** `ui/src/server/voice-config.ts`
**Typ:** Service
**Erstellt:** Voice Call Conversational Flow (2026-03-01)

**Beschreibung:** Config-Service fuer Voice-Konfiguration. Verwaltet API-Keys (Deepgram, ElevenLabs), Input-Modus-Einstellungen und Voice Personas.

**Notes:**
- Laedt Konfiguration aus Settings
- Unterstuetzt Voice Personas (verschiedene Stimmen/Persoenlichkeiten)
- Input-Modus: voice oder text

---

### DeepgramAdapter

**Pfad:** `ui/src/server/services/deepgram.adapter.ts`
**Typ:** Service
**Erstellt:** Voice Call Conversational Flow (2026-03-01)

**Beschreibung:** STT (Speech-to-Text) Adapter fuer Deepgram Nova-3 Streaming API. Konvertiert Audio-Chunks in Text mit Echtzeit-Streaming.

**Notes:**
- Nutzt @deepgram/sdk npm Paket
- Streaming-basiert fuer niedrige Latenz
- Unterstuetzt interim/final Transkriptions-Ergebnisse

---

### ElevenLabsAdapter

**Pfad:** `ui/src/server/services/elevenlabs.adapter.ts`
**Typ:** Service
**Erstellt:** Voice Call Conversational Flow (2026-03-01)

**Beschreibung:** TTS (Text-to-Speech) Adapter fuer ElevenLabs Streaming API. Konvertiert Text in Audio-Chunks fuer Echtzeit-Wiedergabe.

**Notes:**
- Nutzt elevenlabs npm Paket
- Streaming-basiert fuer niedrige Latenz
- Unterstuetzt verschiedene Stimmen via Voice Personas

---

### AudioCaptureService

**Pfad:** `ui/frontend/src/services/audio-capture.service.ts`
**Typ:** Service (Frontend)
**Erstellt:** Voice Call Conversational Flow (2026-03-01)

**Beschreibung:** Browser Mikrofon-Capture als PCM 16kHz Stream. Nutzt Web Audio API und MediaStream fuer Echtzeit-Audio-Aufnahme.

**Notes:**
- Singleton-Pattern
- PCM 16kHz Mono Output
- Web Audio API: AudioContext + MediaStreamSource + ScriptProcessorNode/AudioWorklet
- Permission-Handling fuer Mikrofon-Zugriff

---

### VoiceCallService

**Pfad:** `ui/src/server/services/voice-call.service.ts`
**Typ:** Service
**Erstellt:** Voice Call Conversational Flow (2026-03-01)

**Beschreibung:** Core Voice Call Orchestrator. Koordiniert den gesamten STT -> LLM -> TTS Loop. Empfaengt Audio-Chunks, verarbeitet sie via DeepgramAdapter (STT), sendet Text an Claude (LLM), und gibt Antworten via ElevenLabsAdapter (TTS) zurueck.

**Notes:**
- Zentraler Service fuer Voice Call Lifecycle
- Integriert DeepgramAdapter, ElevenLabsAdapter, Claude SDK
- Barge-in Support (User unterbricht Agent)
- Transcript-Tracking via TranscriptService

---

### AudioPlaybackService

**Pfad:** `ui/frontend/src/services/audio-playback.service.ts`
**Typ:** Service (Frontend)
**Erstellt:** Voice Call Conversational Flow (2026-03-01)

**Beschreibung:** Browser AudioContext Chunk-Playback mit Barge-in Support. Spielt Audio-Chunks in Echtzeit ab und unterstuetzt Unterbrechung durch den User.

**Notes:**
- Singleton-Pattern
- Web Audio API: AudioContext + AudioBuffer
- Chunk-basiertes Playback fuer Streaming
- Barge-in: Stoppt sofort bei User-Unterbrechung

---

### TranscriptService

**Pfad:** `ui/src/server/services/transcript.service.ts`
**Typ:** Service
**Erstellt:** Voice Call Conversational Flow (2026-03-01)

**Beschreibung:** Persistiert Voice Call Transkripte als JSON. Speichert User- und Agent-Beitraege mit Zeitstempeln fuer spaetere Analyse.

**Notes:**
- JSON-basierte Speicherung
- Wird von VoiceCallService aufgerufen
- Transkripte werden pro Call gespeichert

---

### PreviewWatcher

**Pfad:** `ui/src/server/services/preview-watcher.service.ts`
**Typ:** Service
**Erstellt:** Document Preview Panel (2026-03-10)

**Beschreibung:** Filewatcher fuer `/tmp/` der `specwright-preview-*.json` Dateien erkennt und via WebSocket an die passenden Frontend-Clients broadcastet. Wird von MCP-Tools (document_preview_open/close) getriggert.

**Methoden:**
| Methode | Parameter | Return | Beschreibung |
|---------|-----------|--------|--------------|
| init | () | void | Startet den Filewatcher und räumt stale Files auf |
| stop | () | void | Stoppt den Filewatcher |

**Notes:**
- Überwacht `/tmp/` mit `fs.watch` auf `specwright-preview-*.json` Pattern
- Startup-Cleanup: Entfernt stale Preview-Dateien
- Debouncing: Verhindert doppelte Verarbeitung
- Broadcast: Nutzt `webSocketManager.sendToProject()` für projektspezifische Zustellung

---

### DocumentPreviewHandler

**Pfad:** `ui/src/server/handlers/document-preview.handler.ts`
**Typ:** WebSocket Message Handler
**Erstellt:** Document Preview Panel (2026-03-10)

**Beschreibung:** WebSocket-Handler fuer Document-Preview Save-Operationen. Folgt dem bestehenden Handler-Pattern (FileHandler, AttachmentHandler).

**Handled Messages:**
| Message Type | Description |
|-------------|-------------|
| document-preview.save | Dateiinhalt speichern (filePath + content) |

**Response Messages:**
| Message Type | Description |
|-------------|-------------|
| document-preview.save.response | Bestätigung/Fehler an anfragenden Client |
| document-preview.saved | Broadcast an alle Projekt-Clients |

**Notes:**
- Validierung: filePath und content sind Pflichtfelder
- Prüft Datei-Existenz vor dem Schreiben
- Broadcast: Alle Projekt-Clients werden über Save informiert

---

### CommentHandler

**Pfad:** `ui/src/server/handlers/comment.handler.ts`
**Typ:** WebSocket Message Handler (Singleton)
**Erstellt:** Backlog Item Comments (2026-03-14)

**Beschreibung:** WebSocket-Handler für Comment CRUD-Operationen auf Backlog-Items. Speichert Kommentare in `{projectDir}/backlog/items/attachments/{itemId}/comments.json`. Nutzt `withKanbanLock` für atomare Read-Modify-Write-Operationen und delegiert Bild-Uploads an `attachmentStorageService`.

**Methoden:**
| Methode | Parameter | Return | Beschreibung |
|---------|-----------|--------|--------------|
| handleCreate | (client, message, projectPath) | Promise<void> | Neuen Kommentar erstellen |
| handleList | (client, message, projectPath) | Promise<void> | Alle Kommentare für ein Item laden |
| handleUpdate | (client, message, projectPath) | Promise<void> | Kommentar-Text aktualisieren, setzt editedAt |
| handleDelete | (client, message, projectPath) | Promise<void> | Kommentar löschen, bereinigt zugehörige Bilder |
| handleUploadImage | (client, message, projectPath) | Promise<void> | Bild-Upload via attachmentStorageService |

**Handled Messages:**
| Message Type | Description |
|-------------|-------------|
| comment:create | Neuen Kommentar erstellen |
| comment:list | Alle Kommentare eines Items laden |
| comment:update | Kommentar bearbeiten |
| comment:delete | Kommentar löschen |
| comment:upload-image | Bild hochladen (Base64) |

**Notes:**
- Singleton-Export: `commentHandler`
- Path-Traversal-Schutz via `sanitizeItemId()` – alle itemId-Inputs werden validiert
- Nutzt `withKanbanLock` für atomare JSON-Operationen (kein Race-Condition-Risiko)
- Kommentar-IDs: `cmt-{timestamp}` Format
- Folgt dem gleichen Pattern wie `FileHandler`, `AttachmentHandler`, `DocumentPreviewHandler`
- Registrierung in `websocket.ts` via `case 'comment:...'` Switch

---

*Template Version: 1.0*
