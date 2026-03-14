# Implementierungsplan: Backlog Item Comments

> **Status:** PENDING_USER_REVIEW
> **Spec:** specwright/specs/2026-03-14-backlog-comments/
> **Erstellt:** 2026-03-14
> **Basiert auf:** requirements-clarification.md

---

## Executive Summary

Eine Trello-Style Kommentarfunktion für Backlog Items, die es Nutzern ermöglicht, Kommentare mit Markdown-Text und Bildern direkt an Backlog Items anzuheften. Die Architektur folgt dem bewährten Attachment-System-Pattern (WebSocket-Protokoll, Handler, Storage Service) und integriert sich nahtlos in die bestehende Detail-Ansicht (`renderBacklogStoryDetail()`).

---

## Architektur-Entscheidungen

### Gewählter Ansatz
Parallele Implementierung zum Attachment-System mit eigenen Protocol Types, eigenem Handler und eigener Frontend-Komponente. Kommentare werden als `comments.json` im bestehenden Attachment-Verzeichnis gespeichert (`{projectDir}/backlog/items/attachments/ITEM-ID/comments.json`). Bilder in Kommentaren nutzen den bestehenden Attachment-Storage-Pfad.

### Begründung
1. **Attachment-Pattern als Vorlage:** Das Attachment-System (protocol → handler → storage → frontend) ist bewährt, getestet und bietet eine klare 4-Schichten-Architektur. Kopieren dieses Patterns minimiert Architektur-Risiken.
2. **JSON im Attachment-Ordner:** Die `comments.json` nutzt den existierenden Verzeichnisbaum (`{projectDir}/backlog/items/attachments/ITEM-ID/`). Kein neuer Ordner nötig, keine Änderung an der Verzeichnisstruktur, Cleanup beim Löschen eines Items bleibt konsistent.
3. **Eigener Comment-Handler statt Erweiterung des Attachment-Handlers:** Single Responsibility -- Comments sind CRUD-Operationen auf strukturierte JSON-Daten, während Attachments Datei-basierte Operationen sind. Vermischung würde beide Systeme komplexer machen.
4. **Kein eigener Storage Service nötig:** Die Dateioperationen sind einfach genug (JSON read/write + Bild-Upload via bestehendem AttachmentStorageService), dass ein separater Service Over-Engineering wäre. Der Comment Handler kann die JSON-Operationen direkt ausführen und für Bild-Uploads den existierenden `AttachmentStorageService` wiederverwenden.

### Patterns & Technologien
- **Pattern:** WebSocket Message Protocol (identisch mit `attachment.protocol.ts`)
- **Technologie:** Lit Web Components, `marked` für Markdown-Rendering (bereits im Projekt via `markdown-renderer.ts`)
- **Locking:** `withKanbanLock` aus `kanban-lock.ts` für atomare JSON-Schreiboperationen
- **Begründung:** Konsistenz mit existierenden Patterns, kein neues Dependency

---

## Komponenten-Übersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `comment.protocol.ts` | Shared Types | WebSocket Message-Typen, Comment Interface, Config |
| `comment.handler.ts` | Server Handler | WebSocket-Nachrichten verarbeiten, CRUD delegieren |
| `aos-comment-thread.ts` | UI Component | Kommentar-Liste, Eingabefeld, Markdown-Rendering, Bild-Upload |

### Zu ändernde Komponenten

| Komponente | Änderungsart | Grund |
|------------|--------------|-------|
| `ui/src/server/websocket.ts` | Erweitern | Comment Handler registrieren (5 neue case-Statements) |
| `ui/frontend/src/gateway.ts` | Erweitern | 5 neue Gateway-Methoden für Comment WebSocket-Nachrichten |
| `ui/frontend/src/views/dashboard-view.ts` | Erweitern | `renderBacklogStoryDetail()` um Comment-Thread ergänzen |
| `ui/src/server/backlog-reader.ts` | Erweitern | `commentCount` Berechnung in `getKanbanBoard()` |
| `ui/frontend/src/components/story-card.ts` | Erweitern | `commentCount` Property + Comment-Count Badge |

### Nicht betroffen (explizit)
- `attachment.protocol.ts` -- wird nicht geändert, nur als Vorlage genutzt
- `attachment.handler.ts` -- wird nicht geändert
- `attachment-storage.service.ts` -- wird nur für Bild-Uploads wiederverwendet (Aufruf via Import), nicht geändert
- `kanban-board.ts` -- wird nicht geändert (Kommentare erscheinen nur in der Detail-Ansicht)
- `aos-attachment-panel.ts` -- wird nicht geändert

---

## Komponenten-Verbindungen

### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zuständige Story | Validierung |
|--------|--------|----------------|------------------|-------------|
| `comment.protocol.ts` | `comment.handler.ts` | Import (Types) | Story 1 | `grep "from.*comment.protocol" comment.handler.ts` |
| `comment.protocol.ts` | `gateway.ts` | Import (Types) | Story 3 | `grep "from.*comment.protocol" gateway.ts` |
| `comment.handler.ts` | `websocket.ts` | Import + case-Statements | Story 2 | `grep "commentHandler" websocket.ts` |
| `comment.handler.ts` | `attachment-storage.service.ts` | Import (Bild-Upload) | Story 1 | `grep "attachmentStorageService" comment.handler.ts` |
| `comment.handler.ts` | `kanban-lock.ts` | Import (Locking) | Story 1 | `grep "withKanbanLock" comment.handler.ts` |
| `comment.handler.ts` | `project-dirs.ts` | Import (Path Resolution) | Story 1 | `grep "projectDir\|resolveProjectDir" comment.handler.ts` |
| `gateway.ts` | `aos-comment-thread.ts` | Events (on/send) | Story 3 | `grep "gateway\." aos-comment-thread.ts` |
| `aos-comment-thread.ts` | `markdown-renderer.ts` | Import (Markdown) | Story 3 | `grep "renderMarkdown" aos-comment-thread.ts` |
| `aos-comment-thread.ts` | `image-upload.utils.ts` | Import (Bild-Validierung) | Story 4 | `grep "validateFile\|readFileAsDataUrl" aos-comment-thread.ts` |
| `story-card.ts` | `dashboard-view.ts` | CustomEvent `comment-open` | Story 5 | `grep "comment-open" dashboard-view.ts` |
| `backlog-reader.ts` | `story-card.ts` | commentCount Property | Story 5 | `grep "commentCount" story-card.ts` |
| `aos-comment-thread.ts` | `dashboard-view.ts` | Lit Element eingebettet | Story 6 | `grep "aos-comment-thread" dashboard-view.ts` |

---

## Umsetzungsphasen

### Phase 1: Shared Types & Server-seitige Infrastruktur
**Ziel:** Comment Protocol Types definieren und Server-Handler implementieren
**Abhängig von:** Nichts (Startphase)

**Komponenten:**
1. **`ui/src/shared/types/comment.protocol.ts`** (NEU)
   - `Comment` Interface (id, author, text, images?, createdAt, editedAt?)
   - `CommentMessageType` (comment:create, comment:list, comment:update, comment:delete, comment:upload-image + Responses)
   - Client→Server Messages: `CommentCreateMessage`, `CommentListMessage`, `CommentUpdateMessage`, `CommentDeleteMessage`, `CommentUploadImageMessage`
   - Server→Client Messages: Entsprechende Response Messages
   - Error Codes und Config Konstanten
   - Union Types für alle Messages

2. **`ui/src/server/handlers/comment.handler.ts`** (NEU)
   - `CommentHandler` Klasse (Singleton wie AttachmentHandler)
   - `handleCreate()` -- Kommentar erstellen, ID generieren (`cmt-{timestamp}`), JSON lesen/schreiben mit Lock
   - `handleList()` -- Alle Kommentare eines Items laden
   - `handleUpdate()` -- Kommentar-Text aktualisieren, `editedAt` setzen
   - `handleDelete()` -- Kommentar löschen, zugehörige Bilder löschen
   - `handleImageUpload()` -- Delegiert an `attachmentStorageService.upload()` für Bild-Speicherung
   - JSON-Pfad: `{projectDir}/backlog/items/attachments/{itemId}/comments.json`
   - Locking via `withKanbanLock()` für alle Schreiboperationen
   - Path-Traversal-Schutz (wie bei Attachments)

3. **`ui/src/server/websocket.ts`** (ÄNDERN)
   - Import `commentHandler` hinzufügen
   - 5 neue `case`-Statements im Message-Router
   - 5 private Handler-Methoden (identisches Pattern wie Attachment)

### Phase 2: Comment-Count Integration
**Ziel:** Comment-Count auf Story Cards anzeigen
**Abhängig von:** Phase 1 (Server muss comments.json lesen können)

**Komponenten:**
1. **`ui/src/server/backlog-reader.ts`** (ÄNDERN)
   - `commentCount` Berechnung parallel zu `attachmentCount`
   - Liest `comments.json` und zählt Einträge

2. **`BacklogStoryInfo` Interface** (ÄNDERN in `backlog-reader.ts`)
   - Neues optionales Feld `commentCount?: number`

3. **`StoryInfo` Interface** (ÄNDERN in `story-card.ts`)
   - Neues optionales Feld `commentCount?: number`

4. **`story-card.ts` Rendering** (ÄNDERN)
   - Neuer Comment-Button analog zum Attachment-Button (Chat-Bubble Icon)
   - Comment-Count Badge anzeigen wenn > 0
   - `handleCommentClick()` dispatcht `comment-open` CustomEvent

### Phase 3: Frontend Comment Thread Component
**Ziel:** Vollständige Kommentar-UI mit Markdown und Bild-Upload
**Abhängig von:** Phase 1 (WebSocket Protocol muss stehen)

**Komponenten:**
1. **`ui/frontend/src/components/comments/aos-comment-thread.ts`** (NEU)
   - Properties: `itemId: string`
   - State: `comments: Comment[]`, `newCommentText`, `editingCommentId`, `isSubmitting`, `stagedImages`
   - Gateway-Integration: on/send für alle Comment-Messages
   - Kommentar-Liste (chronologisch, neueste unten, auto-scroll)
   - Pro Kommentar: Author-Badge, Datum/Uhrzeit, Markdown-gerenderter Text, eingebettete Bilder
   - Hover-Aktionen: Edit/Delete Icons
   - Eingabebereich: Textarea, Bild-Upload-Button, Drag-and-Drop, Submit-Button
   - Edit-Mode: Textarea mit bestehendem Text, Save/Cancel
   - Markdown-Rendering: Wiederverwendung von `renderMarkdown()` aus `markdown-renderer.ts`
   - Bild-Upload: Wiederverwendung von `validateFile()`, `readFileAsDataUrl()` aus `image-upload.utils.ts`

2. **`ui/frontend/src/gateway.ts`** (ÄNDERN)
   - 5 neue Methoden: `sendCommentCreate`, `requestCommentList`, `sendCommentUpdate`, `sendCommentDelete`, `sendCommentImageUpload`

### Phase 4: Integration & Validation
**Ziel:** Comment-Thread in Backlog Detail-Ansicht integrieren
**Abhängig von:** Phase 2 + Phase 3

**Komponenten:**
1. **`ui/frontend/src/views/dashboard-view.ts`** (ÄNDERN)
   - Import von `aos-comment-thread.js`
   - `<aos-comment-thread>` unterhalb des `<aos-docs-viewer>` in `renderBacklogStoryDetail()`

2. **Tests** (NEU)
   - `ui/tests/unit/comment.handler.test.ts` -- Unit Tests für CRUD, Locking, Edge Cases

---

## Abhängigkeiten

```
comment.protocol.ts ──used by──> comment.handler.ts
comment.protocol.ts ──used by──> gateway.ts
comment.protocol.ts ──used by──> aos-comment-thread.ts
comment.handler.ts  ──registered in──> websocket.ts
comment.handler.ts  ──uses──> attachment-storage.service.ts (Bild-Upload)
comment.handler.ts  ──uses──> kanban-lock.ts (Atomic Writes)
comment.handler.ts  ──uses──> project-dirs.ts (Path Resolution)
aos-comment-thread.ts ──uses──> gateway.ts
aos-comment-thread.ts ──uses──> markdown-renderer.ts
aos-comment-thread.ts ──uses──> image-upload.utils.ts
aos-comment-thread.ts ──embedded in──> dashboard-view.ts
backlog-reader.ts ──reads──> comments.json (Comment Count)
story-card.ts ──displays──> commentCount (from BacklogStoryInfo)
```

### Externe Abhängigkeiten
- **Keine neuen externen Abhängigkeiten.** Alle benötigten Libraries (`marked`, `highlight.js`, `lit`) sind bereits im Projekt vorhanden.

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Concurrent Writes auf comments.json | Low | Med | `withKanbanLock()` gewährleistet atomare Schreibvorgänge |
| Comment-Count Performance bei vielen Items | Low | Low | Lightweight JSON-Parse (nur Array-Länge), `Promise.all` Parallelisierung |
| Verwaiste Kommentar-Bilder bei Comment-Delete | Med | Low | Comment Handler löscht referenzierte Bilder. Namenskonvention `cmt-img-{timestamp}.{ext}` verhindert Kollisionen |
| Markdown XSS in Kommentaren | Low | High | Existierende `renderMarkdown()` nutzt bereits `escapeHtml()` und sichere Konfiguration |

---

## Self-Review Ergebnisse

### Validiert
1. **COMPLETENESS:** Alle 7 Functional Requirements abgedeckt (CRUD, Markdown, Bild-Upload, Count Badge, Chronologie, comments.json, WebSocket)
2. **CONSISTENCY:** Keine Widersprüche -- alle Entscheidungen konsistent mit Brainstorming und Requirements
3. **PATTERN ADHERENCE:** Alle neuen Dateien folgen dem Attachment-System-Pattern
4. **SCOPE BOUNDARIES:** Out-of-Scope Items explizit ausgeschlossen aber architektonisch vorbereitet

### Identifizierte Probleme & Lösungen

| Problem | Ursprünglicher Ansatz | Verbesserung |
|---------|-----------------------|--------------|
| Separater Comment Storage Service | Eigener `comment-storage.service.ts` | Nicht nötig -- JSON-Operationen einfach genug für Handler direkt |
| Comment-Count als separater Endpoint | Eigener Count-Endpoint | In `backlog-reader.ts` integriert (analog `attachmentCount`) |
| Comment-Overlay auf Kanban Board | Neuer Event-Handler + Panel | Kommentare gehören in die Detail-Ansicht, nicht in ein Overlay |

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente

| Element | Gefunden in | Nutzbar für |
|---------|-------------|-------------|
| WebSocket Protocol Pattern | `attachment.protocol.ts` | `comment.protocol.ts` |
| Handler Pattern | `attachment.handler.ts` | `comment.handler.ts` |
| WebSocket Registration | `websocket.ts` | 5 neue case-Statements |
| Markdown Rendering | `markdown-renderer.ts` | Kommentar-Text rendern |
| File Validation & Upload | `image-upload.utils.ts` | Bild-Validierung in Kommentaren |
| Path Resolution | `project-dirs.ts` | Storage-Pfad für comments.json |
| File-based Locking | `kanban-lock.ts` | Atomare JSON-Schreiboperationen |
| Attachment Storage | `attachment-storage.service.ts` | Bild-Upload (wiederverwendet, nicht kopiert) |

### Feature-Preservation bestätigt
- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erfüllbar
- [x] Bestehende Features werden nicht beeinträchtigt
