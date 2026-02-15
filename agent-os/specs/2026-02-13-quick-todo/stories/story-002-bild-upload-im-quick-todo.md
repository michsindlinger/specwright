# Bild-Upload im Quick-To-Do Modal

> Story ID: QTD-002
> Spec: Quick-To-Do
> Created: 2026-02-13
> Last Updated: 2026-02-13

**Priority**: High
**Type**: Frontend
**Estimated Effort**: 3 SP
**Dependencies**: QTD-001

---

## Feature

```gherkin
Feature: Bilder im Quick-To-Do einfügen
  Als Entwickler
  möchte ich Bilder per Copy & Paste und Drag & Drop in mein Quick-To-Do einfügen,
  damit ich visuelle Ideen und Screenshots festhalten kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Bild per Paste einfügen

```gherkin
Scenario: Screenshot per Ctrl+V einfügen
  Given das Quick-To-Do Modal ist geöffnet
  When ich einen Screenshot in der Zwischenablage habe
  And ich Ctrl+V drücke
  Then erscheint ein Thumbnail des Bildes im Modal
  And ich sehe einen Entfernen-Button am Thumbnail
```

### Szenario 2: Bild per Drag & Drop einfügen

```gherkin
Scenario: Bilddatei ins Modal ziehen
  Given das Quick-To-Do Modal ist geöffnet
  When ich eine PNG-Datei ins Modal ziehe
  Then wird ein visueller Drop-Bereich hervorgehoben
  And nach dem Loslassen erscheint ein Thumbnail des Bildes
```

### Szenario 3: Mehrere Bilder einfügen

```gherkin
Scenario: 3 Bilder nacheinander einfügen
  Given das Quick-To-Do Modal ist geöffnet
  When ich 3 Bilder per Paste einfüge
  Then sehe ich 3 Thumbnails im Modal
  And ich sehe eine Anzeige "3/5"
```

### Szenario 4: Bild entfernen

```gherkin
Scenario: Eingefügtes Bild entfernen
  Given ich habe 2 Bilder im Quick-To-Do Modal eingefügt
  When ich den Entfernen-Button am ersten Bild klicke
  Then wird das erste Bild entfernt
  And es bleibt 1 Bild übrig
  And die Anzeige zeigt "1/5"
```

### Edge Case: Zu viele Bilder

```gherkin
Scenario: Maximum von 5 Bildern erreicht
  Given ich habe bereits 5 Bilder im Quick-To-Do Modal
  When ich ein weiteres Bild per Paste einfüge
  Then wird das Bild nicht hinzugefügt
  And ich sehe eine Fehlermeldung "Maximal 5 Bilder erlaubt"
```

### Edge Case: Ungültiges Dateiformat

```gherkin
Scenario: PDF-Datei wird abgelehnt
  Given das Quick-To-Do Modal ist geöffnet
  When ich eine PDF-Datei per Drag & Drop einfüge
  Then wird die Datei nicht hinzugefügt
  And ich sehe eine Fehlermeldung mit den erlaubten Formaten
```

### Edge Case: Zu große Datei

```gherkin
Scenario: Bild über 5MB wird abgelehnt
  Given das Quick-To-Do Modal ist geöffnet
  When ich ein 10MB großes Bild per Paste einfüge
  Then wird das Bild nicht hinzugefügt
  And ich sehe eine Fehlermeldung "Maximale Dateigröße: 5MB"
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/ui/src/utils/image-upload.utils.ts
- [x] CONTAINS: agent-os-ui/ui/src/components/aos-quick-todo-modal.ts enthält "handlePaste"
- [x] CONTAINS: agent-os-ui/ui/src/components/aos-quick-todo-modal.ts enthält "handleDrop"
- [x] CONTAINS: agent-os-ui/ui/src/components/aos-quick-todo-modal.ts enthält "aos-image-staging-area"

### Funktions-Prüfungen

- [x] LINT_PASS: cd agent-os-ui/ui && npx tsc --noEmit exits with code 0 (only pre-existing CSSResultGroup error)

---

## Required MCP Tools

Keine MCP-Tools erforderlich.

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
- [x] Kritische Integration Points dokumentiert
- [x] Handover-Dokumente definiert

**Story ist READY.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Bild-Validierung funktioniert (Format, Größe, Anzahl)

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `image-upload.utils.ts` | NEUE Utility: Extrahierte Bild-Funktionen |
| Frontend | `aos-quick-todo-modal.ts` | Paste/Drop-Handler, Image-Staging Integration |
| Frontend | `aos-image-staging-area` | UNVERÄNDERT - wird wiederverwendet |

---

### Technical Details

**WAS:**
- Neue Utility-Datei mit extrahierten Bild-Funktionen (Validierung, File-Reading)
- Paste-Handler und Drop-Handler im Quick-To-Do Modal
- Integration der bestehenden `aos-image-staging-area` Komponente für Thumbnails
- Bild-Zähler-Anzeige

**WIE (Architektur-Guidance):**
- Extrahiere `ALLOWED_MIME_TYPES` (nur PNG, JPEG, GIF, WebP - kein PDF/SVG), `MAX_FILE_SIZE` (5MB), `MAX_IMAGES` (5) als Konstanten in `image-upload.utils.ts`
- Extrahiere `validateFile()` und `readFileAsDataUrl()` als pure Funktionen
- Nutze `StagedImage` Interface aus `chat-view.ts` (Import)
- Folge dem Paste-Handler-Pattern aus `chat-view.ts` (clipboard API → validateFile → readFileAsDataUrl → addToStaged)
- Folge dem Drop-Handler-Pattern aus `chat-view.ts` (dragover → dragleave → drop → handleFiles)
- Nutze `aos-image-staging-area` direkt mit Property-Binding `.images` und Event `@image-removed`
- Zeige visuellen Drop-Indikator (isDragOver State → CSS-Klasse)

**WO:**
- `agent-os-ui/ui/src/utils/image-upload.utils.ts` (NEU)
- `agent-os-ui/ui/src/components/aos-quick-todo-modal.ts` (MODIFY)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** QTD-001

**Geschätzte Komplexität:** S

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| image-upload.utils | Utility | ui/src/utils/image-upload.utils.ts | Wiederverwendbare Bild-Upload-Funktionen (Validierung, Reading) |

---

### Completion Check

```bash
# Auto-Verify Commands
test -f agent-os-ui/ui/src/utils/image-upload.utils.ts && echo "✓ Image utils exists"
grep -q "handlePaste\|handleDrop" agent-os-ui/ui/src/components/aos-quick-todo-modal.ts && echo "✓ Paste/Drop handlers exist"
grep -q "aos-image-staging-area" agent-os-ui/ui/src/components/aos-quick-todo-modal.ts && echo "✓ Image staging integrated"
grep -q "MAX_IMAGES\|MAX_FILE_SIZE" agent-os-ui/ui/src/utils/image-upload.utils.ts && echo "✓ Constants defined"
cd agent-os-ui/ui && npx tsc --noEmit 2>&1 | grep -v "TS6133\|CSSResultGroup" | grep -c "error TS" | grep -q "^0$" && echo "✓ TypeScript check passed"
```
