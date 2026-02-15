# Attachment Preview & File Type Support

> Story ID: SCA-005
> Spec: Storycard Attachments
> Created: 2026-02-14
> Last Updated: 2026-02-14

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: 2 SP
**Dependencies**: SCA-003

---

## Feature

```gherkin
Feature: Inline-Preview fuer verschiedene Dateitypen
  Als Entwickler
  moechte ich angehaengte Dateien direkt in der UI ansehen koennen,
  damit ich schnell den Inhalt pruefen kann ohne die Datei separat oeffnen zu muessen.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Bild-Preview anzeigen

```gherkin
Scenario: Bild-Attachment als Preview anzeigen
  Given an Storycard "SCA-001" ist eine PNG-Datei "wireframe.png" angehaengt
  When ich auf den Preview-Button der Datei klicke
  Then sehe ich das Bild in einer vergroesserten Ansicht
  And ich kann die Ansicht durch Klicken ausserhalb schliessen
```

### Szenario 2: PDF-Preview anzeigen

```gherkin
Scenario: PDF-Attachment als Preview anzeigen
  Given an Storycard "SCA-001" ist eine PDF-Datei "anforderungen.pdf" angehaengt
  When ich auf den Preview-Button der Datei klicke
  Then sehe ich die PDF in einem eingebetteten Viewer
  And ich habe die Moeglichkeit, die PDF herunterzuladen
```

### Szenario 3: Text-Datei Preview (TXT, JSON, MD)

```gherkin
Scenario Outline: Text-Datei-Preview fuer verschiedene Formate
  Given an Storycard "SCA-001" ist eine Datei "<datei>" angehaengt
  When ich auf den Preview-Button klicke
  Then sehe ich den Dateiinhalt als formatierten Text
  And der Inhalt ist <formatierung>

  Examples:
    | datei            | formatierung            |
    | notizen.txt      | als Plaintext angezeigt |
    | config.json      | mit JSON-Syntax-Highlighting |
    | readme.md        | als gerendertes Markdown |
```

### Szenario 4: Dateitype-spezifische Icons

```gherkin
Scenario: Verschiedene Icons fuer verschiedene Dateitypen
  Given an Storycard "SCA-001" sind verschiedene Dateitypen angehaengt
  When ich die Attachment-Liste betrachte
  Then sehe ich ein Bild-Icon fuer PNG/JPG-Dateien
  And ein PDF-Icon fuer PDF-Dateien
  And ein Text-Icon fuer TXT/JSON/MD-Dateien
```

### Szenario 5: Dateigroesse-Anzeige

```gherkin
Scenario: Dateigroesse in der Liste anzeigen
  Given an Storycard "SCA-001" sind Dateien verschiedener Groesse angehaengt
  When ich die Attachment-Liste betrachte
  Then sehe ich die Dateigroesse in lesbarem Format
  And "1.5 MB" statt "1572864 Bytes"
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Preview fuer nicht vorhandene Datei
  Given die Datei "geloescht.png" existiert nicht mehr auf dem Dateisystem
  When ich versuche die Preview zu oeffnen
  Then sehe ich eine Hinweismeldung "Datei nicht gefunden"
```

---

## Technische Verifikation (Automated Checks)

- [ ] CONTAINS: aos-attachment-panel enthaelt Preview-Rendering-Logik
- [ ] CONTAINS: theme.css enthaelt "attachment-preview"
- [ ] LINT_PASS: cd agent-os-ui/ui && npx tsc --noEmit exits with code 0

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
- [ ] Bild-Preview: Thumbnail in Liste, Klick oeffnet Lightbox
- [ ] PDF-Preview: Inline-iframe oder Download-Link
- [ ] Text-Preview: Inline-Code/Text-Anzeige fuer TXT, JSON, MD

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [ ] Dateityp-spezifische Icons in der Attachment-Liste
- [ ] Dateigroesse in lesbarem Format (KB/MB)
- [ ] Fehlerbehandlung bei nicht gefundenen Dateien

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only (mit Backend-Erweiterung fuer Datei-Content-Abruf)

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | `aos-attachment-panel.ts` | Modifiziert: Preview-Rendering in der Dateiliste, Lightbox-Integration, Dateitype-Icons, Groesse-Formatierung |
| Frontend | `theme.css` | Modifiziert: Preview-Styles (Bild-Thumbnails, Text-Container, PDF-Iframe) |
| Backend | `attachment.handler.ts` | Modifiziert: Neuer Message-Handler `attachment:read` fuer Datei-Content-Abruf |
| Backend | `attachment-storage.service.ts` | Modifiziert: Neue Methode `readAttachment()` fuer Datei-Content |
| Shared | `attachment.protocol.ts` | Modifiziert: Neue Message-Types fuer `attachment:read` Request/Response |

**Kritische Integration Points:**
- Preview benoetigt Datei-Content vom Backend (Text-Dateien werden als String geladen, Bilder als Base64/Data-URL)
- Bild-Preview kann bestehende `aos-image-lightbox` Komponente wiederverwenden
- Backend muss Datei-Content ueber WebSocket liefern (neuer `attachment:read` Message-Type)

---

### Technical Details

**WAS:**
- Erweiterung `aos-attachment-panel.ts`: Preview-Rendering pro Dateityp, Dateitype-Icons, Groessen-Formatierung
- Erweiterung `attachment.handler.ts`: Neuer Handler fuer `attachment:read` Message
- Erweiterung `attachment-storage.service.ts`: `readAttachment()` Methode
- Erweiterung `attachment.protocol.ts`: `attachment:read` Message-Types
- Erweiterung `theme.css`: Preview-Styles
- Gateway-Erweiterung: Neue Methode `requestAttachmentRead()` in `gateway.ts`
- WebSocket-Erweiterung: Neuer `case` Eintrag fuer `attachment:read` in `websocket.ts`

**WIE (Architektur-Guidance ONLY):**
- Bild-Preview: Zeige ein kleines Thumbnail (max 60x60px, CSS object-fit: cover) in der Attachment-Liste. Bei Klick auf das Thumbnail, oeffne die bestehende `aos-image-lightbox` Komponente (Import aus `../aos-image-lightbox.js`). Lightbox bekommt den Bild-Pfad als `imageSrc` Property. Bilder koennen direkt ueber einen relativen Pfad geladen werden (Backend stellt Datei bereit) oder als Base64 Data-URL
- PDF-Preview: Zeige ein PDF-Icon in der Liste. Bei Klick oeffne ein Modal/Overlay mit einem `<iframe>` oder `<object>` Element das die PDF rendert. Alternative: Download-Link als Fallback
- Text-Preview (TXT, JSON, MD): Lade den Datei-Inhalt via `gateway.requestAttachmentRead()` vom Backend. Zeige den Inhalt in einem `<pre>` / `<code>` Block. Fuer JSON: Verwende `JSON.stringify(parsed, null, 2)` fuer formatierte Anzeige. Fuer Markdown: Verwende den bestehenden `markdown-renderer.ts` Utility (in `agent-os-ui/ui/src/utils/markdown-renderer.ts`). Fuer TXT: Plaintext in `<pre>` Block
- Dateitype-Icons: Definiere eine Helper-Funktion `getFileTypeIcon(mimeType: string): string` die SVG-Icons oder Unicode-Symbole zurueckgibt. Bild-Typen: Bild-Icon. PDF: PDF-Icon. JSON/TXT/MD: Text/Code-Icon
- Groessen-Formatierung: Utility-Funktion `formatFileSize(bytes: number): string` die Bytes in KB/MB umrechnet. Pattern: < 1024 -> "X B", < 1024*1024 -> "X.X KB", sonst -> "X.X MB"
- Backend Read-Handler: Folge dem bestehenden Pattern der `handleList`/`handleUpload` Methoden. Lese die Datei via `fs.readFile()`, sende Content als String (Text-Dateien) oder Base64 (Binaer-Dateien) zurueck
- Fehlerbehandlung: Bei nicht gefundener Datei zeige eine inline Hinweismeldung "Datei nicht gefunden" statt einem Error-Toast

**WO:**
- `agent-os-ui/ui/src/components/attachments/aos-attachment-panel.ts` (MODIFIZIERT: ~80 Zeilen Preview-Logik + Icons)
- `agent-os-ui/ui/src/styles/theme.css` (MODIFIZIERT: ~40 Zeilen Preview-Styles)
- `agent-os-ui/src/server/handlers/attachment.handler.ts` (MODIFIZIERT: ~20 Zeilen neuer Handler)
- `agent-os-ui/src/server/services/attachment-storage.service.ts` (MODIFIZIERT: ~20 Zeilen neue Methode)
- `agent-os-ui/src/shared/types/attachment.protocol.ts` (MODIFIZIERT: ~10 Zeilen neue Types)
- `agent-os-ui/ui/src/gateway.ts` (MODIFIZIERT: ~10 Zeilen neue Methode)
- `agent-os-ui/src/server/websocket.ts` (MODIFIZIERT: ~3 Zeilen neuer case)

**WER:** dev-team__frontend-developer (mit minimaler Backend-Erweiterung)

**Abhaengigkeiten:** SCA-003 (benoetigt `aos-attachment-panel` Basis-Komponente)

**Geschaetzte Komplexitaet:** M

**Relevante Skills:** ui-component-architecture, state-management

---

### Creates Reusable Artifacts

**Creates Reusable:** no

**Reusable Artifacts:**

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| `formatFileSize()` | Utility Function | Inline in `aos-attachment-panel.ts` | Dateigroessen-Formatierung, potentiell extrahierbar |
| `getFileTypeIcon()` | Utility Function | Inline in `aos-attachment-panel.ts` | Dateityp-Icon-Mapping, potentiell extrahierbar |

---

### Completion Check

```bash
# Auto-Verify Commands - alle muessen mit 0 exiten
grep -q "formatFileSize\|format-file-size\|formatSize" agent-os-ui/ui/src/components/attachments/aos-attachment-panel.ts && echo "File size formatting exists" || exit 1
grep -q "getFileTypeIcon\|fileTypeIcon\|mimeType" agent-os-ui/ui/src/components/attachments/aos-attachment-panel.ts && echo "File type icons exist" || exit 1
grep -q "attachment:read" agent-os-ui/src/shared/types/attachment.protocol.ts && echo "Read protocol type exists" || exit 1
grep -q "attachment-preview\|preview" agent-os-ui/ui/src/styles/theme.css && echo "Preview styles exist" || exit 1
cd agent-os-ui/ui && npx tsc --noEmit && echo "Frontend TypeScript compiles" || exit 1
cd agent-os-ui && npx tsc --noEmit && echo "Backend TypeScript compiles" || exit 1
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
