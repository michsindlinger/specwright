# Comment Protocol & Server Handler

> Story ID: BLC-001
> Spec: Backlog Item Comments
> Created: 2026-03-14
> Last Updated: 2026-03-14

**Priority**: High
**Type**: Backend
**Estimated Effort**: M
**Dependencies**: None
**Status**: Done

---

## Feature

```gherkin
Feature: Kommentar-Daten verwalten
  Als Specwright Web UI Nutzer
  möchte ich Kommentare zu Backlog Items speichern und abrufen können,
  damit meine Gedanken und Notizen persistent am Item festgehalten werden.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Kommentar erstellen

```gherkin
Scenario: Neuer Kommentar wird erstellt und gespeichert
  Given ein Backlog Item "bug-005-login-fix" existiert
  When ich einen Kommentar mit Text "Erste Analyse zeigt: Problem liegt im Token-Refresh" erstelle
  Then wird der Kommentar in comments.json gespeichert
  And der Kommentar hat eine eindeutige ID im Format "cmt-{timestamp}"
  And der Kommentar enthält den Author "user"
  And der Kommentar enthält einen ISO-Timestamp als createdAt
```

### Szenario 2: Kommentare eines Items abrufen

```gherkin
Scenario: Alle Kommentare eines Backlog Items laden
  Given das Backlog Item "bug-005-login-fix" hat 3 Kommentare
  When ich die Kommentare des Items abrufe
  Then erhalte ich alle 3 Kommentare
  And die Kommentare sind chronologisch sortiert (älteste zuerst)
```

### Szenario 3: Kommentar bearbeiten

```gherkin
Scenario: Bestehender Kommentar wird aktualisiert
  Given ein Kommentar "cmt-1710412800000" existiert mit Text "Erste Analyse"
  When ich den Text zu "Zweite Analyse: Token-Refresh ist korrekt, Problem liegt im Cookie" ändere
  Then wird der neue Text gespeichert
  And ein editedAt-Timestamp wird hinzugefügt
  And der ursprüngliche createdAt-Timestamp bleibt unverändert
```

### Szenario 4: Kommentar löschen

```gherkin
Scenario: Kommentar wird entfernt
  Given ein Kommentar "cmt-1710412800000" existiert
  When ich den Kommentar lösche
  Then ist der Kommentar nicht mehr in der Liste
  And zugehörige Kommentar-Bilder werden ebenfalls gelöscht
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Kommentar erstellen für nicht existierendes Item
  Given kein Backlog Item mit ID "nonexistent-item" existiert
  When ich versuche einen Kommentar zu erstellen
  Then erhalte ich eine Fehlermeldung "Item not found"

Scenario: Kommentare laden wenn noch keine existieren
  Given ein Backlog Item ohne Kommentare existiert
  When ich die Kommentare abrufe
  Then erhalte ich eine leere Liste mit count 0
```

---

## Technische Verifikation (Automated Checks)

- FILE_EXISTS: `ui/src/shared/types/comment.protocol.ts`
- FILE_EXISTS: `ui/src/server/handlers/comment.handler.ts`
- CONTAINS: `ui/src/server/websocket.ts` → `comment.handler`
- CONTAINS: `ui/src/server/websocket.ts` → `comment:create`
- TEST_PASS: `cd ui && npx vitest run tests/unit/comment.handler.test.ts`
- LINT_PASS: `cd ui && npm run lint`
- BUILD_PASS: `cd ui && npm run build:backend`

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und prüfbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

---

### DoD (Definition of Done) - Vom Architect

- [x] `comment.protocol.ts` mit Comment Interface, Message Types, Config, Error Codes implementiert
- [x] `comment.handler.ts` als Singleton mit CRUD-Methoden (create, list, update, delete, upload-image)
- [x] Handler in `websocket.ts` registriert (5 case-Statements + 5 Wrapper-Methoden)
- [x] JSON-Locking via `withKanbanLock()` für alle Schreiboperationen
- [x] Path-Traversal-Schutz implementiert
- [x] Unit Tests für Comment Handler geschrieben und bestanden
- [x] Backend Build erfolgreich (`cd ui && npm run build:backend`)
- [x] Lint fehlerfrei (`cd ui && npm run lint`)
- [x] Alle Akzeptanzkriterien erfüllt

**Integration DoD:**
- [x] **Integration: comment.protocol.ts → comment.handler.ts**
  - [x] Import existiert
  - [x] Validierung: `grep -q "from.*comment.protocol" ui/src/server/handlers/comment.handler.ts`
- [x] **Integration: comment.handler.ts → websocket.ts**
  - [x] Import + 5 case-Statements registriert
  - [x] Validierung: `grep -q "commentHandler\|comment.handler" ui/src/server/websocket.ts`
- [x] **Integration: comment.handler.ts → attachment-storage.service.ts**
  - [x] Bild-Upload via bestehendem Service
  - [x] Validierung: `grep -q "attachmentStorageService\|attachment-storage" ui/src/server/handlers/comment.handler.ts`
- [x] **Integration: comment.handler.ts → kanban-lock.ts**
  - [x] Validierung: `grep -q "withKanbanLock" ui/src/server/handlers/comment.handler.ts`

---

### Betroffene Layer & Komponenten

- **Integration Type:** Backend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Shared Types | `ui/src/shared/types/comment.protocol.ts` | NEU: Comment Interface, Message Types, Config, Error Codes |
| Service | `ui/src/server/handlers/comment.handler.ts` | NEU: CommentHandler Singleton mit CRUD + Image Upload |
| Service | `ui/src/server/websocket.ts` | MODIFY: Handler Import, 5 case-Statements, 5 Wrapper-Methoden |

---

### Technical Details

**WAS:**
- Neues `comment.protocol.ts` mit Comment Interface, WebSocket Message Types (comment:create/list/update/delete/upload-image + Responses), Error Codes, Config
- Neuer `comment.handler.ts` als Singleton Handler-Klasse mit CRUD-Methoden und Bild-Upload-Delegation an AttachmentStorageService
- Registration des Handlers in `websocket.ts` via case-Statements und private Wrapper-Methoden

**WIE (Architecture Guidance):**
- Folge dem `attachment.protocol.ts` Pattern für Message-Type-Definitionen (Discriminated Union mit `type` Feld)
- Folge dem `attachment.handler.ts` Pattern für Handler-Klassen-Struktur (Singleton, Constructor DI, public async Handler-Methoden)
- Nutze `withKanbanLock()` aus `kanban-lock.ts` für atomare JSON-Schreiboperationen
- Nutze `resolveProjectDir()` aus `project-dirs.ts` für Path Resolution
- Wiederverwendung von `attachmentStorageService.upload()` für Bild-Speicherung (Import, nicht kopieren)
- JSON-Pfad: `{projectDir}/backlog/items/attachments/{itemId}/comments.json`
- Comment ID Format: `cmt-{timestamp}`
- Path-Traversal-Schutz analog zu Attachment Handler (`normalizePath`, `sanitizeFilename`)
- WebSocket Wrapper-Methoden Pattern: `getClientProjectPath()` Check → Handler-Delegation

**WO:**
- `ui/src/shared/types/comment.protocol.ts` (NEU)
- `ui/src/server/handlers/comment.handler.ts` (NEU)
- `ui/src/server/websocket.ts` (MODIFY: Import + 5 cases + 5 private Wrapper-Methoden)
- `ui/tests/unit/comment.handler.test.ts` (NEU: Unit Tests)

**Abhängigkeiten:** None (Startphase)

**Geschätzte Komplexität:** M

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | Express/WebSocket Handler Patterns |
| quality-gates | .claude/skills/quality-gates/SKILL.md | Test- und Qualitätsstandards |

---

### Creates Reusable Artifacts

Creates Reusable: yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| Comment Protocol Types | Shared Types | `ui/src/shared/types/comment.protocol.ts` | WebSocket Message Types für Comment CRUD, verwendet von Frontend und Backend |
| Comment Handler | Service | `ui/src/server/handlers/comment.handler.ts` | Server-seitige Comment CRUD-Operationen als Singleton |

---

### Completion Check

```bash
# Auto-Verify Commands - all must exit with 0
test -f ui/src/shared/types/comment.protocol.ts && echo "Protocol exists"
test -f ui/src/server/handlers/comment.handler.ts && echo "Handler exists"
grep -q "comment.handler" ui/src/server/websocket.ts && echo "WebSocket registration OK"
grep -q "comment:create" ui/src/server/websocket.ts && echo "Case statement exists"
grep -q "withKanbanLock" ui/src/server/handlers/comment.handler.ts && echo "Locking OK"
cd ui && npx vitest run tests/unit/comment.handler.test.ts
cd ui && npm run build:backend
cd ui && npm run lint
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
