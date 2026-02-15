# Attachment Protocol & Backend Service

> Story ID: SCA-001
> Spec: Storycard Attachments
> Created: 2026-02-14
> Last Updated: 2026-02-14

**Priority**: High
**Type**: Backend
**Estimated Effort**: 3 SP
**Dependencies**: None

---

## Feature

```gherkin
Feature: Backend-Service fuer Attachment-Verwaltung
  Als Entwickler
  moechte ich Dateien an Storycards anhaengen koennen,
  damit der Agent zusaetzliche Informationen bei der Ausfuehrung einlesen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Datei erfolgreich hochladen

```gherkin
Scenario: Datei erfolgreich an eine Spec-Story anhaengen
  Given ich habe eine Storycard "SCA-001" im Spec "2026-02-14-storycard-attachments"
  And ich habe eine PNG-Datei "screenshot.png" mit 2 MB Groesse
  When ich die Datei an die Storycard anhaenge
  Then wird die Datei im Ordner "agent-os/specs/2026-02-14-storycard-attachments/attachments/SCA-001/" gespeichert
  And der Pfad wird in der Story-Markdown unter "## Attachments" referenziert
```

### Szenario 2: Datei an Backlog-Item anhaengen

```gherkin
Scenario: Datei erfolgreich an ein Backlog-Item anhaengen
  Given ich habe ein Backlog-Item "ITEM-005"
  And ich habe eine PDF-Datei "anforderungen.pdf" mit 3 MB Groesse
  When ich die Datei an das Backlog-Item anhaenge
  Then wird die Datei im Backlog-Item-Ordner gespeichert
  And der Pfad wird in der Item-Markdown unter "## Attachments" referenziert
```

### Szenario 3: Duplikat-Handling bei gleichem Dateinamen

```gherkin
Scenario: Automatische Umbenennung bei Duplikat
  Given eine Datei "screenshot.png" ist bereits an Storycard "SCA-001" angehaengt
  When ich eine weitere Datei mit dem Namen "screenshot.png" anhaenge
  Then wird die neue Datei als "screenshot-1.png" gespeichert
  And beide Dateien sind in der Attachments-Liste sichtbar
```

### Szenario 4: Attachment-Liste abrufen

```gherkin
Scenario: Alle Attachments einer Story auflisten
  Given an Storycard "SCA-001" sind 3 Dateien angehaengt
  When ich die Attachment-Liste anfordere
  Then erhalte ich eine Liste mit 3 Eintraegen
  And jeder Eintrag enthaelt Dateiname, Groesse, Typ und relativen Pfad
```

### Szenario 5: Attachment loeschen

```gherkin
Scenario: Einzelnes Attachment loeschen
  Given an Storycard "SCA-001" ist eine Datei "screenshot.png" angehaengt
  When ich die Datei loesche
  Then wird die Datei vom Dateisystem entfernt
  And der Verweis in der Story-Markdown wird entfernt
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Datei ueberschreitet maximale Groesse
  Given ich habe eine Datei "grosses-bild.png" mit 6 MB Groesse
  When ich versuche die Datei an eine Storycard anzuhaengen
  Then erhalte ich eine Fehlermeldung "Datei ueberschreitet die maximale Groesse von 5 MB"
  And die Datei wird nicht gespeichert

Scenario: Ungueltiger Dateityp
  Given ich habe eine Datei "programm.exe" mit 1 MB Groesse
  When ich versuche die Datei an eine Storycard anzuhaengen
  Then erhalte ich eine Fehlermeldung "Dateityp nicht unterstuetzt"
  And die Datei wird nicht gespeichert
```

---

## Technische Verifikation (Automated Checks)

- [ ] FILE_EXISTS: agent-os-ui/src/shared/types/attachment.protocol.ts
- [ ] FILE_EXISTS: agent-os-ui/src/server/services/attachment-storage.service.ts
- [ ] FILE_EXISTS: agent-os-ui/src/server/handlers/attachment.handler.ts
- [ ] CONTAINS: agent-os-ui/src/server/websocket.ts enthaelt "attachment"
- [ ] LINT_PASS: cd agent-os-ui && npx tsc --noEmit exits with code 0

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

> **Refinement durch:** dev-team__architect
> **Datum:** 2026-02-14

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und pruefbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhaengigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschaetzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert** (Frontend/Backend/Database/DevOps)
- [x] **Integration Type bestimmt** (Backend-only/Frontend-only/Full-stack)
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer: API Contracts, Data Structures)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Security/Performance Anforderungen erfuellt (path traversal protection, file size validation)

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [ ] Attachment Protocol Types kompilieren ohne Fehler
- [ ] AttachmentStorageService speichert/listet/loescht korrekt
- [ ] AttachmentHandler routet WebSocket-Nachrichten korrekt
- [ ] websocket.ts hat attachment: case-Eintraege

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only (mit Shared Types als Handover fuer SCA-002)

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Shared | `attachment.protocol.ts` | Neu: Message-Types, Attachment-Metadaten-Interface, Request/Response-Shapes |
| Backend | `attachment-storage.service.ts` | Neu: Dateispeicherung, Listing, Loeschung, Duplikat-Handling, Markdown-Update |
| Backend | `attachment.handler.ts` | Neu: WebSocket-Message-Routing fuer Attachment-CRUD |
| Backend | `websocket.ts` | Modifiziert: 3 neue case-Eintraege im Message-Switch + Import |

**Kritische Integration Points:**
- Shared Protocol Types (`attachment.protocol.ts`) dienen als API-Contract fuer SCA-002 (Frontend Gateway)
- AttachmentHandler wird als Singleton instanziiert und im websocket.ts Message-Switch verdrahtet
- Markdown-Update-Logik muss `## Attachments` Section append-only behandeln

---

### Technical Details

**WAS:**
- Neue Datei `agent-os-ui/src/shared/types/attachment.protocol.ts` mit Message-Types und Interfaces
- Neue Datei `agent-os-ui/src/server/services/attachment-storage.service.ts` mit CRUD-Operationen
- Neue Datei `agent-os-ui/src/server/handlers/attachment.handler.ts` mit WebSocket-Routing
- Modifikation von `agent-os-ui/src/server/websocket.ts` fuer Message-Switch-Eintraege

**WIE (Architektur-Guidance ONLY):**
- Protocol Types: Folge dem Muster von `git.protocol.ts` -- definiere Client-to-Server und Server-to-Client Message-Interfaces als Union-Types. Verwende `attachment:` Prefix mit Colons (wie `git:status`, `git:commit`). Definiere `AttachmentMetadata`-Interface (filename, size, mimeType, path, createdAt)
- Storage Service: Folge dem Pattern von `ImageStorageService` und `BacklogItemStorageService`. Verwende `sanitizeFilename()`, `normalizePath()` fuer Path-Traversal-Schutz, `Buffer.from(base64, 'base64')` fuer Base64-Decode. Storage-Pfade: Specs in `agent-os/specs/<specId>/attachments/<storyId>/`, Backlog in `agent-os/backlog/items/attachments/<itemId>/`. Duplikat-Handling: Suffix `-1`, `-2` etc. bei gleichem Dateinamen. Markdown-Update: `## Attachments` Section am Ende der Story-MD-Datei appenden, nie bestehenden Content aendern
- Handler: Folge dem `GitHandler`-Pattern -- Klasse mit Service-Injection im Konstruktor, pro Message-Type eine async-Methode (handleUpload, handleList, handleDelete). Instanziiere als Singleton analog zu `gitHandler`
- WebSocket Integration: Fuege 3 neue `case`-Eintraege im `handleMessage`-Switch hinzu (`attachment:upload`, `attachment:list`, `attachment:delete`), delegiere an Handler-Methoden. Folge dem bestehenden Pattern der git:-Messages
- Validierung: MIME-Types auf Backend pruefen (Bilder + PDF + text/plain + application/json + text/markdown). Max 5 MB pro Datei. Verwende `ALLOWED_MIME_TYPES` Set wie in `image-storage.ts`
- Context-Handling: Unterscheide `contextType: 'spec' | 'backlog'` in den Messages, um den korrekten Storage-Pfad zu bestimmen

**WO:**
- `agent-os-ui/src/shared/types/attachment.protocol.ts` (NEU)
- `agent-os-ui/src/server/services/attachment-storage.service.ts` (NEU)
- `agent-os-ui/src/server/handlers/attachment.handler.ts` (NEU)
- `agent-os-ui/src/server/websocket.ts` (MODIFIZIERT: ~15 Zeilen)

**WER:** dev-team__backend-developer

**Abhaengigkeiten:** None

**Geschaetzte Komplexitaet:** M

**Relevante Skills:** persistence-adapter, logic-implementing

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

**Reusable Artifacts:**

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| `attachment.protocol.ts` | Shared Types | `agent-os-ui/src/shared/types/attachment.protocol.ts` | Attachment Message-Types und Metadaten-Interface, wiederverwendbar in Frontend und Backend |
| `AttachmentStorageService` | Backend Service | `agent-os-ui/src/server/services/attachment-storage.service.ts` | Generischer Attachment-Storage mit Context-basierter Pfad-Aufloesung |
| `AttachmentHandler` | WebSocket Handler | `agent-os-ui/src/server/handlers/attachment.handler.ts` | WebSocket-Handler fuer Attachment-CRUD |

---

### Completion Check

```bash
# Auto-Verify Commands - alle muessen mit 0 exiten
test -f agent-os-ui/src/shared/types/attachment.protocol.ts && echo "Protocol types exist" || exit 1
test -f agent-os-ui/src/server/services/attachment-storage.service.ts && echo "Storage service exists" || exit 1
test -f agent-os-ui/src/server/handlers/attachment.handler.ts && echo "Handler exists" || exit 1
grep -q "attachment:" agent-os-ui/src/server/websocket.ts && echo "WebSocket routing exists" || exit 1
grep -q "AttachmentMetadata" agent-os-ui/src/shared/types/attachment.protocol.ts && echo "Metadata interface exists" || exit 1
cd agent-os-ui && npx tsc --noEmit && echo "TypeScript compiles" || exit 1
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
