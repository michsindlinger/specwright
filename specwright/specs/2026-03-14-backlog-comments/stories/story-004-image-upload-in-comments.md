# Image Upload in Comments

> Story ID: BLC-004
> Spec: Backlog Item Comments
> Created: 2026-03-14
> Last Updated: 2026-03-14

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: M
**Dependencies**: BLC-003

---

## Feature

```gherkin
Feature: Bilder in Kommentaren hochladen
  Als Specwright Web UI Nutzer
  möchte ich Bilder per Drag & Drop oder Upload-Button in Kommentare einfügen,
  damit ich Screenshots und visuelle Informationen an meine Kommentare anhängen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Bild per Upload-Button hinzufügen

```gherkin
Scenario: Bild wird über Upload-Button eingefügt
  Given ich bin im Kommentar-Eingabefeld
  When ich auf den Bild-Upload-Button klicke
  And ich eine PNG-Datei "screenshot.png" auswähle
  Then sehe ich eine Vorschau des Bildes im Eingabebereich
  When ich den Kommentar absende
  Then wird das Bild im Kommentar angezeigt
```

### Szenario 2: Bild per Drag & Drop hinzufügen

```gherkin
Scenario: Bild wird per Drag & Drop eingefügt
  Given ich bin im Kommentar-Eingabefeld
  When ich eine JPEG-Datei in den Eingabebereich ziehe und loslasse
  Then sehe ich eine Vorschau des Bildes im Eingabebereich
  When ich den Kommentar absende
  Then wird das Bild im Kommentar angezeigt
```

### Szenario 3: Mehrere Bilder in einem Kommentar

```gherkin
Scenario: Kommentar mit Text und mehreren Bildern
  Given ich bin im Kommentar-Eingabefeld
  When ich Text "Vergleiche diese beiden Ansichten:" eingebe
  And ich 2 Bilder hinzufüge
  And ich den Kommentar absende
  Then sehe ich den Text und beide Bilder im Kommentar
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Zu großes Bild wird abgelehnt
  Given ich bin im Kommentar-Eingabefeld
  When ich eine Datei größer als 5 MB hochlade
  Then sehe ich eine Fehlermeldung "Datei zu groß (max. 5 MB)"
  And das Bild wird nicht hinzugefügt

Scenario: Nicht unterstütztes Dateiformat wird abgelehnt
  Given ich bin im Kommentar-Eingabefeld
  When ich eine .exe Datei hochlade
  Then sehe ich eine Fehlermeldung über das nicht unterstützte Format
  And die Datei wird nicht hinzugefügt
```

---

## Technische Verifikation (Automated Checks)

- CONTAINS: `aos-comment-thread.ts` enthält Drag-and-Drop und Upload-Button Logik
- CONTAINS: `aos-comment-thread.ts` importiert `validateFile` und `readFileAsDataUrl`
- BUILD_PASS: `cd ui/frontend && npm run build`
- LINT_PASS: `cd ui && npm run lint`

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

- [x] Bild-Upload per Upload-Button im Eingabebereich implementiert
- [x] Drag & Drop auf den Eingabebereich implementiert
- [x] Bild-Vorschau im Eingabebereich vor Absenden angezeigt (staged images)
- [x] Mehrere Bilder pro Kommentar möglich
- [x] File-Validierung: Maximale Dateigröße (5MB), erlaubte MIME-Types
- [x] Bilder werden nach Absenden im Kommentar inline angezeigt
- [x] Fehlermeldungen bei ungültigen Dateien (Toast-Notification)
- [x] Frontend Build erfolgreich (`cd ui/frontend && npm run build`)
- [x] Lint fehlerfrei (`cd ui && npm run lint`)

**Integration DoD:**
- [x] **Integration: image-upload.utils.ts → aos-comment-thread.ts**
  - [x] Wiederverwendung von validateFile() und readFileAsDataUrl()
  - [x] Validierung: `grep -q "validateFile\|readFileAsDataUrl" ui/frontend/src/components/comments/aos-comment-thread.ts`
- [x] **Integration: aos-comment-thread.ts → gateway (comment:upload-image)**
  - [x] Upload via Gateway-Methode sendCommentImageUpload
  - [x] Validierung: `grep -q "sendCommentImageUpload\|comment.*upload" ui/frontend/src/components/comments/aos-comment-thread.ts`

---

### Betroffene Layer & Komponenten

- **Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Presentation | `ui/frontend/src/components/comments/aos-comment-thread.ts` | MODIFY: Drag & Drop, Upload-Button, Bild-Vorschau, staged images State |

---

### Technical Details

**WAS:**
- Bild-Upload-Funktionalität in die bestehende `aos-comment-thread` Komponente integrieren
- Drag & Drop Handler, Upload-Button, Bild-Vorschau (staged images), Upload-Delegation an Gateway

**WIE (Architecture Guidance):**
- Folge dem `aos-attachment-panel.ts` Pattern für Drag & Drop (dragover, dragleave, drop Events)
- Wiederverwendung von `validateFile()` aus `image-upload.utils.ts` für Datei-Validierung (Größe, MIME-Type)
- Wiederverwendung von `readFileAsDataUrl()` aus `image-upload.utils.ts` für Vorschau-Generierung
- Staged Images als @state Array vor dem Absenden (DataURL für Preview)
- Beim Absenden: Bilder via `gateway.sendCommentImageUpload()` hochladen, Pfade im Kommentar referenzieren
- Bild-Namenskonvention: `cmt-img-{timestamp}.{ext}` (keine Kollision mit regulären Attachments)
- Drop-Zone visuelles Feedback via CSS-Klasse (analog Attachment-Panel)

**WO:**
- `ui/frontend/src/components/comments/aos-comment-thread.ts` (MODIFY: Bild-Upload-Logik hinzufügen)

**Abhängigkeiten:** BLC-003 (Basis-Komponente muss existieren)

**Geschätzte Komplexität:** M

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Event Handling, State |

---

### Creates Reusable Artifacts

Creates Reusable: no

---

### Completion Check

```bash
# Auto-Verify Commands - all must exit with 0
grep -q "validateFile\|readFileAsDataUrl" ui/frontend/src/components/comments/aos-comment-thread.ts && echo "Image utils imported"
grep -q "dragover\|drop" ui/frontend/src/components/comments/aos-comment-thread.ts && echo "Drag & Drop handlers exist"
cd ui/frontend && npm run build
cd ui && npm run lint
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
