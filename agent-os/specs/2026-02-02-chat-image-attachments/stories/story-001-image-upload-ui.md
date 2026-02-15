# Image Upload UI

> Story ID: CIMG-001
> Spec: Chat Image Attachments
> Created: 2026-02-02
> Last Updated: 2026-02-02

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S (3 SP)
**Dependencies**: None

---

## Feature

```gherkin
Feature: Bild-Upload im Chat
  Als Entwickler
  möchte ich Bilder an meine Chat-Nachrichten anhängen können,
  damit ich Claude visuellen Kontext (Screenshots, Diagramme) zeigen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Bild per Drag & Drop hinzufügen

```gherkin
Scenario: Bild per Drag & Drop in den Chat ziehen
  Given ich bin im Chat-View mit einem ausgewählten Projekt
  When ich eine PNG-Datei in den Chat-Bereich ziehe
  Then sehe ich einen visuellen "Drop here" Indikator
  And nach dem Loslassen erscheint das Bild in der Staging Area
```

### Szenario 2: Bild per Dateiauswahl hinzufügen

```gherkin
Scenario: Bild über Datei-Button auswählen
  Given ich bin im Chat-View mit einem ausgewählten Projekt
  When ich auf den Bild-Upload-Button klicke
  Then öffnet sich der System-Dateiauswahl-Dialog
  And nach Auswahl einer JPG-Datei erscheint das Bild in der Staging Area
```

### Szenario 3: Screenshot per Clipboard einfügen

```gherkin
Scenario: Screenshot aus Zwischenablage einfügen
  Given ich bin im Chat-View mit einem ausgewählten Projekt
  And ich habe einen Screenshot in der Zwischenablage
  When ich Strg+V (oder Cmd+V auf Mac) drücke
  Then erscheint der Screenshot in der Staging Area
```

### Szenario 4: Mehrere Bilder hinzufügen

```gherkin
Scenario: Mehrere Bilder nacheinander hinzufügen
  Given ich bin im Chat-View mit einem ausgewählten Projekt
  And ich habe bereits 2 Bilder in der Staging Area
  When ich ein weiteres Bild per Drag & Drop hinzufüge
  Then sehe ich alle 3 Bilder in der Staging Area
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Upload ohne ausgewähltes Projekt
  Given ich bin im Chat-View ohne ausgewähltes Projekt
  When ich versuche ein Bild hinzuzufügen
  Then ist der Upload-Button deaktiviert
  And Drag & Drop zeigt keine Drop-Zone
```

```gherkin
Scenario: Unsupportetes Dateiformat
  Given ich bin im Chat-View mit einem ausgewählten Projekt
  When ich eine .exe-Datei per Drag & Drop hinzufügen möchte
  Then sehe ich die Fehlermeldung "Format nicht unterstützt. Erlaubt: PNG, JPG, GIF, WebP, PDF, SVG"
  And die Datei wird nicht zur Staging Area hinzugefügt
```

```gherkin
Scenario: Datei überschreitet Größenlimit
  Given ich bin im Chat-View mit einem ausgewählten Projekt
  When ich eine 10 MB große PNG-Datei hinzufügen möchte
  Then sehe ich die Fehlermeldung "Datei ist zu groß (max. 5 MB)"
  And die Datei wird nicht zur Staging Area hinzugefügt
```

```gherkin
Scenario: Maximale Bildanzahl erreicht
  Given ich habe bereits 5 Bilder in der Staging Area
  When ich ein weiteres Bild hinzufügen möchte
  Then sehe ich die Fehlermeldung "Maximal 5 Bilder pro Nachricht"
  And das Bild wird nicht hinzugefügt
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/views/chat-view.ts (bereits vorhanden, wird erweitert)

### Inhalt-Prüfungen

- [ ] CONTAINS: chat-view.ts enthält "dragover"
- [ ] CONTAINS: chat-view.ts enthält "drop"
- [ ] CONTAINS: chat-view.ts enthält "paste"
- [ ] CONTAINS: chat-view.ts enthält "input type=\"file\""

### Funktions-Prüfungen

- [ ] LINT_PASS: `cd agent-os-ui && npm run lint` exits with code 0
- [ ] BUILD_PASS: `cd agent-os-ui && npm run build` exits with code 0

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
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `chat-view.ts` | Drag & Drop Zone, File Input Button, Clipboard Paste Event Handler |
| Frontend | `theme.css` | Styles fuer Drop-Zone Feedback und Upload-Button |

---

### Technical Details

**WAS:**
- Drag & Drop Event Handler (`dragover`, `drop`, `dragleave`) in chat-view.ts
- Hidden File Input Element mit `accept="image/*,.pdf,.svg"`
- Clipboard Paste Event Listener fuer Bilder
- Upload-Button neben dem Send-Button
- Visuelles Drop-Zone Feedback (Highlight wenn Datei darueber)
- Client-seitige Validierung: Format (PNG, JPG, GIF, WebP, PDF, SVG), Groesse (max 5MB), Anzahl (max 5)
- State-Array `stagedImages` fuer ausgewaehlte Bilder
- Interface `StagedImage { file: File, dataUrl: string, id: string }`

**WIE (Architecture Guidance):**
- Pattern: Event-basierte Datei-Verarbeitung mit FileReader API
- Referenz: Bestehende Event Handler Pattern in chat-view.ts (z.B. `handleKeyDown`, `handleInput`)
- Referenz: State-Management mit `@state()` Decorator wie bei `messages`, `inputValue`
- Constraint: Keine externe Library fuer File Handling, nur native Browser APIs
- Constraint: Validierung synchron vor Hinzufuegen zur Staging Area
- Error Handling: Toast-Notification fuer Validierungsfehler (bestehendes Pattern aus toast-notification.ts)

**WO:**
- Modify: `agent-os-ui/ui/src/views/chat-view.ts`
- Modify: `agent-os-ui/ui/src/styles/theme.css` (Drop-Zone Styles)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

**Relevante Skills:** N/A

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify file exists
test -f agent-os-ui/ui/src/views/chat-view.ts && echo "OK: chat-view.ts exists" || exit 1

# Verify drag & drop events implemented
grep -q "dragover" agent-os-ui/ui/src/views/chat-view.ts && echo "OK: dragover" || exit 1
grep -q "drop" agent-os-ui/ui/src/views/chat-view.ts && echo "OK: drop" || exit 1

# Verify paste handler
grep -q "paste" agent-os-ui/ui/src/views/chat-view.ts && echo "OK: paste" || exit 1

# Verify file input
grep -q 'input.*type.*file' agent-os-ui/ui/src/views/chat-view.ts && echo "OK: file input" || exit 1

# Lint check
cd agent-os-ui && npm run lint

# Build check
cd agent-os-ui && npm run build
```
