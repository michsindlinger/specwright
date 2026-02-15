# Chat Message Image Display

> Story ID: CIMG-005
> Spec: Chat Image Attachments
> Created: 2026-02-02
> Last Updated: 2026-02-02

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S (3 SP)
**Dependencies**: CIMG-004
**Status**: Done

---

## Feature

```gherkin
Feature: Bild-Anzeige in Chat-Nachrichten
  Als Entwickler
  möchte ich gesendete Bilder in meinen Chat-Nachrichten sehen können,
  damit ich den Kontext meiner Fragen nachvollziehen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: User-Nachricht mit Bildern anzeigen

```gherkin
Scenario: Meine Nachricht zeigt angehängte Bilder
  Given ich habe eine Nachricht mit 2 Bildern gesendet
  When die Nachricht in der Chat-Historie erscheint
  Then sehe ich meinen Text
  And darunter sehe ich 2 Bild-Thumbnails (max 150px breit)
```

### Szenario 2: Assistant-Nachricht ohne Bilder

```gherkin
Scenario: Claude-Antwort hat keine Bilder
  Given Claude antwortet auf meine Bildanfrage
  When die Antwort in der Chat-Historie erscheint
  Then sehe ich nur den Text der Antwort
  And keine Bilder werden angezeigt
```

### Szenario 3: Mehrere Bilder in einer Reihe

```gherkin
Scenario: Bilder werden horizontal angeordnet
  Given ich habe eine Nachricht mit 3 Bildern
  When die Nachricht angezeigt wird
  Then sind die 3 Thumbnails nebeneinander in einer Zeile
  And bei mehr als 3 Bildern wird umgebrochen
```

### Szenario 4: Bild-Thumbnail klickbar

```gherkin
Scenario: Klick auf Thumbnail öffnet Großansicht
  Given eine Nachricht mit Bild wird angezeigt
  When ich auf das Bild-Thumbnail klicke
  Then öffnet sich die Lightbox mit dem Bild in Großansicht
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Bild konnte nicht geladen werden
  Given ein Bild wurde gelöscht oder ist nicht erreichbar
  When die Nachricht mit dem Bild angezeigt wird
  Then sehe ich einen Platzhalter mit "Bild nicht verfügbar"
  And der Platzhalter hat die gleiche Größe wie ein Thumbnail
```

```gherkin
Scenario: PDF-Datei als Thumbnail
  Given ich habe eine PDF-Datei angehängt
  When die Nachricht angezeigt wird
  Then sehe ich ein PDF-Icon als Thumbnail
  And der Dateiname wird unter dem Icon angezeigt
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/ui/src/components/chat-message.ts (wird erweitert)

### Inhalt-Prüfungen

- [x] CONTAINS: chat-message.ts enthält "images"
- [x] CONTAINS: chat-message.ts enthält "thumbnail"
- [x] CONTAINS: chat-message.ts enthält "message-images"

### Funktions-Prüfungen

- [x] LINT_PASS: `cd agent-os-ui && npm run lint` exits with code 0
- [x] BUILD_PASS: `cd agent-os-ui && npm run build` exits with code 0

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
- [x] Unit Tests geschrieben und bestanden
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `chat-message.ts` | ChatMessageData Interface erweitern, Bild-Rendering |
| Frontend | `theme.css` | Styles fuer message-images Container, Thumbnails |

---

### Technical Details

**WAS:**
- **ChatMessageData Interface erweitern:**
  - `images?: MessageImage[]`
  - Interface `MessageImage { path: string, mimeType: string, filename: string }`
- **Rendering in chat-message.ts:**
  - Neue Methode `renderMessageImages()`
  - Container `.message-images` unter dem Text-Content
  - Horizontal Flex Layout, max 3 pro Zeile dann Umbruch
  - Thumbnails mit max 150px Breite
  - Klick-Handler fuer Lightbox-Oeffnung (CustomEvent `open-lightbox`)
  - PDF-Sonderbehandlung: Icon statt Thumbnail, Filename anzeigen
  - Error State: Platzhalter wenn Bild nicht ladbar
- **Lazy Loading:**
  - `loading="lazy"` Attribut auf img-Tags
  - Intersection Observer fuer On-Demand Loading (optional)

**WIE (Architecture Guidance):**
- Pattern: Conditional Rendering in render() Methode
- Referenz: Bestehendes `renderContent()` Pattern in chat-message.ts
- Referenz: Tool Call Rendering Pattern fuer zusaetzliche UI-Elemente
- Constraint: Keine externe Image-Gallery Library, einfache img-Tags
- Constraint: Shadow DOM deaktiviert (createRenderRoot Pattern beibehalten)
- Event Pattern: CustomEvent `open-lightbox` mit { detail: { imagePath, images } }

**WO:**
- Modify: `agent-os-ui/ui/src/components/chat-message.ts`
- Modify: `agent-os-ui/ui/src/styles/theme.css`

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** CIMG-004

**Geschätzte Komplexität:** S

**Relevante Skills:** N/A

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify images property in chat-message
grep -q "images" agent-os-ui/ui/src/components/chat-message.ts && echo "OK: images property" || exit 1

# Verify thumbnail rendering
grep -q "thumbnail" agent-os-ui/ui/src/components/chat-message.ts && echo "OK: thumbnail" || exit 1

# Verify message-images class
grep -q "message-images" agent-os-ui/ui/src/components/chat-message.ts && echo "OK: message-images class" || exit 1

# Verify CSS styles
grep -q "message-images" agent-os-ui/ui/src/styles/theme.css && echo "OK: CSS styles" || exit 1

# Lint check
cd agent-os-ui && npm run lint

# Build check
cd agent-os-ui && npm run build
```
