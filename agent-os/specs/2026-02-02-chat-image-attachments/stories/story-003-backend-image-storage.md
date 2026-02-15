# Backend Image Storage Service

> Story ID: CIMG-003
> Spec: Chat Image Attachments
> Created: 2026-02-02
> Last Updated: 2026-02-02

**Priority**: High
**Type**: Backend
**Estimated Effort**: S (3 SP)
**Dependencies**: None
**Status**: Done

---

## Feature

```gherkin
Feature: Backend Bild-Speicherung
  Als System
  möchte ich hochgeladene Bilder persistent im Projekt speichern können,
  damit Bilder auch nach einem Neustart in der Chat-Historie verfügbar sind.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Bild speichern

```gherkin
Scenario: Bild im Projekt-Ordner speichern
  Given ein Base64-kodiertes PNG-Bild mit 500KB wird empfangen
  When das Bild gespeichert wird
  Then existiert die Datei unter <projekt>/.agent-os/chat-images/
  And der Dateiname folgt dem Pattern YYYYMMDD-HHMMSS-originalname.png
```

### Szenario 2: Bild per HTTP Upload speichern

```gherkin
Scenario: Großes Bild per HTTP Upload speichern
  Given ein 3MB großes JPEG-Bild wird per HTTP POST gesendet
  When der Upload-Endpoint /api/images aufgerufen wird
  Then wird das Bild im Projekt-Ordner gespeichert
  And der Response enthält den relativen Pfad zum Bild
```

### Szenario 3: Bild laden

```gherkin
Scenario: Gespeichertes Bild abrufen
  Given ein Bild wurde unter chat-images/20260202-143000-screenshot.png gespeichert
  When das Bild per relativen Pfad angefordert wird
  Then wird das Bild als Binary-Daten zurückgegeben
  And der Content-Type ist korrekt (image/png)
```

### Szenario 4: Chat-Images Ordner erstellen

```gherkin
Scenario: Ordner automatisch erstellen
  Given der Ordner .agent-os/chat-images/ existiert noch nicht im Projekt
  When das erste Bild gespeichert wird
  Then wird der Ordner automatisch erstellt
  And das Bild wird erfolgreich gespeichert
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Ungültiges Bild-Format im Upload
  Given eine .exe-Datei wird als Bild zum Upload gesendet
  When der Upload-Endpoint aufgerufen wird
  Then wird HTTP 400 Bad Request zurückgegeben
  And die Fehlermeldung enthält "Ungültiges Dateiformat"
```

```gherkin
Scenario: Datei zu groß
  Given ein 10MB großes Bild wird zum Upload gesendet
  When der Upload-Endpoint aufgerufen wird
  Then wird HTTP 413 Payload Too Large zurückgegeben
  And die Fehlermeldung enthält "Datei zu groß"
```

```gherkin
Scenario: Bild nicht gefunden
  Given ein angefordertes Bild existiert nicht
  When das Bild per Pfad angefordert wird
  Then wird HTTP 404 Not Found zurückgegeben
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/src/server/image-storage.ts

### Inhalt-Prüfungen

- [x] CONTAINS: image-storage.ts enthält "saveImage"
- [x] CONTAINS: image-storage.ts enthält "getImage"
- [x] CONTAINS: image-storage.ts enthält ".agent-os/chat-images"

### Funktions-Prüfungen

- [x] LINT_PASS: `cd agent-os-ui && npm run lint` exits with code 0
- [x] BUILD_PASS: `cd agent-os-ui && npm run build:backend` exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | - |

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

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [ ] Unit Tests geschrieben und bestanden
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | `image-storage.ts` | Neuer Service fuer Bild-Speicherung |
| Backend | `image-upload.routes.ts` | Neue HTTP Routes fuer Upload/Serve |
| Backend | `index.ts` | Router Registration |

---

### Technical Details

**WAS:**
- ImageStorageService Klasse mit Methoden:
  - `saveImage(projectPath: string, imageData: Buffer | string, originalName: string, mimeType: string): Promise<ImageInfo>`
  - `getImage(projectPath: string, imagePath: string): Promise<Buffer | null>`
  - `getImageInfo(projectPath: string, imagePath: string): Promise<ImageInfo | null>`
  - `deleteImage(projectPath: string, imagePath: string): Promise<boolean>`
- Interface `ImageInfo { path: string, filename: string, mimeType: string, size: number, createdAt: string }`
- HTTP Routes:
  - `POST /api/images/upload` - Multipart Upload fuer grosse Bilder
  - `GET /api/images/:projectPath/*imagePath` - Bild abrufen
- Automatische Ordner-Erstellung: `<project>/.agent-os/chat-images/`
- Dateiname-Pattern: `YYYYMMDD-HHMMSS-<uuid>-<originalname>.<ext>`
- Validierung: Format (PNG, JPG, GIF, WebP, PDF, SVG), Groesse (max 5MB)

**WIE (Architecture Guidance):**
- Pattern: Service-Klasse mit statischen Methoden oder Singleton
- Referenz: Bestehende Services wie `specs-reader.ts`, `docs-reader.ts` fuer Struktur
- Referenz: Route-Pattern aus `routes/specs.ts`, `routes/project.routes.ts`
- Constraint: Synchrone fs-Operationen vermeiden, immer async/await mit fs/promises
- Constraint: Kein multer noetig fuer Base64-Upload via WebSocket, nur fuer HTTP multipart
- Security: Path Traversal Validierung, nur erlaubte Extensions, Sanitize Filename

**WO:**
- Create: `agent-os-ui/src/server/image-storage.ts`
- Create: `agent-os-ui/src/server/routes/image-upload.routes.ts`
- Modify: `agent-os-ui/src/server/index.ts` (Router Registration)

**WER:** dev-team__backend-developer

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

**Relevante Skills:** N/A

**Creates Reusable:** yes - ImageStorageService kann fuer andere File-Uploads verwendet werden

---

### Completion Check

```bash
# Verify service file exists
test -f agent-os-ui/src/server/image-storage.ts && echo "OK: image-storage.ts exists" || exit 1

# Verify saveImage method
grep -q "saveImage" agent-os-ui/src/server/image-storage.ts && echo "OK: saveImage" || exit 1

# Verify getImage method
grep -q "getImage" agent-os-ui/src/server/image-storage.ts && echo "OK: getImage" || exit 1

# Verify storage path
grep -q ".agent-os/chat-images" agent-os-ui/src/server/image-storage.ts && echo "OK: storage path" || exit 1

# Verify route registration in index.ts
grep -q "image" agent-os-ui/src/server/index.ts && echo "OK: route registered" || exit 1

# Lint check
cd agent-os-ui && npm run lint

# Build check
cd agent-os-ui && npm run build
```
