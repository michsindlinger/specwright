# Backend File API

> Story ID: FE-001
> Spec: File Editor
> Created: 2026-02-16
> Last Updated: 2026-02-16

**Priority**: Critical
**Type**: Backend
**Estimated Effort**: S
**Dependencies**: None

---

## Feature

```gherkin
Feature: Backend File API
  Als Entwickler
  möchte ich über die Specwright UI auf Projektdateien zugreifen können,
  damit ich Dateien lesen, schreiben, erstellen, umbenennen und löschen kann ohne das Tool zu wechseln.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Verzeichnisinhalt auflisten

```gherkin
Scenario: Verzeichnisinhalt wird korrekt aufgelistet
  Given der Server läuft und ein Projektverzeichnis ist konfiguriert
  When ich den Inhalt des Stammverzeichnisses anfordere
  Then erhalte ich eine Liste aller Dateien und Ordner im Stammverzeichnis
  And jeder Eintrag enthält Name, Typ (Datei/Ordner) und Größe
```

### Szenario 2: Datei lesen

```gherkin
Scenario: Textdatei wird korrekt gelesen
  Given eine Datei "package.json" existiert im Projektverzeichnis
  When ich den Inhalt der Datei "package.json" anfordere
  Then erhalte ich den vollständigen Textinhalt der Datei
  And die erkannte Sprache ist "json"
```

### Szenario 3: Datei speichern

```gherkin
Scenario: Geänderter Dateiinhalt wird gespeichert
  Given eine Datei "test.txt" existiert mit dem Inhalt "Hello"
  When ich den neuen Inhalt "Hello World" für "test.txt" sende
  Then wird der Dateiinhalt auf "Hello World" aktualisiert
  And ich erhalte eine Bestätigung des erfolgreichen Speicherns
```

### Szenario 4: Neue Datei erstellen

```gherkin
Scenario: Neue Datei wird erstellt
  Given im Ordner "src/" existiert keine Datei "new-file.ts"
  When ich eine neue Datei "src/new-file.ts" erstelle
  Then existiert die Datei "src/new-file.ts" im Projektverzeichnis
  And die Datei ist initial leer
```

### Szenario 5: Neuen Ordner erstellen

```gherkin
Scenario: Neuer Ordner wird erstellt
  Given im Projektverzeichnis existiert kein Ordner "src/new-folder"
  When ich einen neuen Ordner "src/new-folder" erstelle
  Then existiert der Ordner "src/new-folder" im Projektverzeichnis
```

### Szenario 6: Datei umbenennen

```gherkin
Scenario: Datei wird umbenannt
  Given eine Datei "old-name.ts" existiert im Projektverzeichnis
  When ich "old-name.ts" in "new-name.ts" umbenenne
  Then existiert die Datei "new-name.ts"
  And die Datei "old-name.ts" existiert nicht mehr
```

### Szenario 7: Datei löschen

```gherkin
Scenario: Datei wird gelöscht
  Given eine Datei "to-delete.txt" existiert im Projektverzeichnis
  When ich die Datei "to-delete.txt" lösche
  Then existiert die Datei "to-delete.txt" nicht mehr
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Zugriff außerhalb des Projektverzeichnisses wird verhindert
  Given der Server läuft mit Projektverzeichnis "/project"
  When ich versuche die Datei "../../etc/passwd" zu lesen
  Then erhalte ich eine Fehlermeldung "Zugriff verweigert"
  And die Datei wird nicht gelesen

Scenario: Zu große Datei wird abgelehnt
  Given eine Datei "large-file.bin" mit 10 MB existiert
  When ich den Inhalt der Datei anfordere
  Then erhalte ich eine Fehlermeldung "Datei zu groß (max. 5 MB)"

Scenario: Binärdatei wird erkannt
  Given eine Binärdatei "image.png" existiert im Projektverzeichnis
  When ich den Inhalt der Datei "image.png" anfordere
  Then erhalte ich einen Hinweis "Binärdatei kann nicht angezeigt werden"
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [ ] FILE_EXISTS: ui/src/server/services/file.service.ts
- [ ] FILE_EXISTS: ui/src/server/handlers/file.handler.ts
- [ ] FILE_EXISTS: ui/src/shared/types/file.protocol.ts

### Inhalt-Pruefungen

- [ ] CONTAINS: ui/src/server/websocket.ts enthält "files:"
- [ ] CONTAINS: ui/src/server/handlers/file.handler.ts enthält "class FileHandler"
- [ ] CONTAINS: ui/src/server/services/file.service.ts enthält "class FileService"
- [ ] CONTAINS: ui/src/shared/types/file.protocol.ts enthält "FileMessage"

### Funktions-Pruefungen

- [ ] BUILD_PASS: `cd ui && npm run build:backend` exits with code 0
- [ ] LINT_PASS: `cd ui && npm run lint` exits with code 0
- [ ] TEST_PASS: `cd ui && npm test` exits with code 0

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

**Story ist READY - alle Checkboxen angehakt.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Security/Performance Anforderungen erfüllt (Path-Traversal-Schutz, 5MB Limit)

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [ ] Unit Tests geschrieben und bestanden
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | `file.service.ts` (NEU) | FileService-Klasse mit list/read/write/create/delete/rename/mkdir |
| Backend | `file.handler.ts` (NEU) | FileHandler-Klasse, routet WebSocket-Messages an FileService |
| Backend | `websocket.ts` (ÄNDERUNG) | `files:*` Cases im handleMessage Switch-Statement |
| Shared | `file.protocol.ts` (NEU) | TypeScript-Interfaces für alle File-Messages |

**Kritische Integration Points:**
- websocket.ts → FileHandler (Delegation der `files:*` Messages)
- FileHandler → FileService (Service-Aufrufe)

**Handover-Dokumente:**
- Shared Types: `ui/src/shared/types/file.protocol.ts` (wird von Frontend in FE-002+ konsumiert)

---

### Technical Details

**WAS:**
- Neuer `FileService` für Dateisystem-Operationen (list, read, write, create, delete, rename, mkdir)
- Neuer `FileHandler` für WebSocket-Message-Routing an FileService
- Neues `file.protocol.ts` mit TypeScript-Interfaces für alle Messages
- Erweiterung von `websocket.ts` um `files:*` Message-Cases

**WIE (Architektur-Guidance ONLY):**
- Folge exakt dem `AttachmentHandler` / `AttachmentStorageService` Pattern
- FileHandler-Klasse: public async Methoden pro Operation (handleList, handleRead, handleWrite, etc.)
- FileService-Klasse: Nutze `fs.promises` (readdir, readFile, writeFile, mkdir, rename, unlink, stat)
- Path-Traversal-Schutz: `path.resolve()` + `path.relative()` Validierung - resolved path muss im projectPath bleiben
- Binärdatei-Erkennung: Versuche UTF-8-Decode, bei Fehler als Binär markieren
- Dateigrößen-Limit: 5 MB Check via `stat()` vor dem Lesen
- Lazy Directory Listing: Nur direkte Kinder auflisten (nicht rekursiv)
- Sprach-Erkennung: Map Dateiendung zu Sprach-String (`.ts` → `typescript`, `.json` → `json`, etc.)
- Error Codes nach `ATTACHMENT_ERROR_CODES` Pattern (FILE_NOT_FOUND, PATH_TRAVERSAL, FILE_TOO_LARGE, etc.)
- Singleton-Export: `export const fileHandler = new FileHandler();`

**WO:**
- `ui/src/server/services/file.service.ts` (NEU)
- `ui/src/server/handlers/file.handler.ts` (NEU)
- `ui/src/shared/types/file.protocol.ts` (NEU)
- `ui/src/server/websocket.ts` (ÄNDERUNG - neue Cases im Switch)

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | Express/TypeScript Backend-Patterns, Handler-Struktur |
| quality-gates | .claude/skills/quality-gates/SKILL.md | Qualitätsstandards, DoD-Checkliste |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| FileService | Service | ui/src/server/services/file.service.ts | Dateisystem-Operationen mit Path-Traversal-Schutz |
| FileHandler | Handler | ui/src/server/handlers/file.handler.ts | WebSocket-Handler für File-Operationen |
| file.protocol.ts | Shared Types | ui/src/shared/types/file.protocol.ts | TypeScript-Interfaces für File-Messages |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
test -f ui/src/server/services/file.service.ts && echo "FileService exists"
test -f ui/src/server/handlers/file.handler.ts && echo "FileHandler exists"
test -f ui/src/shared/types/file.protocol.ts && echo "Protocol exists"
grep -q "files:" ui/src/server/websocket.ts && echo "WebSocket routing exists"
cd ui && npm run build:backend
cd ui && npm run lint
cd ui && npm test
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
