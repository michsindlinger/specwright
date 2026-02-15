# Image Staging Area Component

> Story ID: CIMG-002
> Spec: Chat Image Attachments
> Created: 2026-02-02
> Last Updated: 2026-02-02

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S (3 SP)
**Dependencies**: CIMG-001

---

## Feature

```gherkin
Feature: Bild-Staging Area
  Als Entwickler
  möchte ich ausgewählte Bilder vor dem Senden sehen und verwalten können,
  damit ich versehentlich hinzugefügte Bilder wieder entfernen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Staging Area zeigt Thumbnails

```gherkin
Scenario: Ausgewählte Bilder als Thumbnails anzeigen
  Given ich habe 3 Bilder zum Chat hinzugefügt
  Then sehe ich eine Staging Area zwischen Eingabefeld und Chat-Verlauf
  And die Staging Area zeigt 3 Thumbnails (max 80px Höhe)
  And jeder Thumbnail hat einen Dateinamen-Tooltip
```

### Szenario 2: Bild aus Staging Area entfernen

```gherkin
Scenario: Bild per X-Button entfernen
  Given ich habe 2 Bilder in der Staging Area
  When ich den X-Button am ersten Bild klicke
  Then wird das erste Bild aus der Staging Area entfernt
  And nur noch 1 Bild ist in der Staging Area
```

### Szenario 3: Staging Area verschwindet nach Senden

```gherkin
Scenario: Staging Area leeren nach Nachricht senden
  Given ich habe 2 Bilder in der Staging Area
  And ich habe eine Textnachricht eingegeben
  When ich die Nachricht sende
  Then ist die Staging Area leer
  And keine Thumbnails sind mehr sichtbar
```

### Szenario 4: Staging Area bei leerem Zustand

```gherkin
Scenario: Keine Staging Area ohne Bilder
  Given ich habe keine Bilder ausgewählt
  Then ist die Staging Area nicht sichtbar
  And der Chat-Bereich zeigt keine leere Staging-Box
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Alle Bilder entfernen
  Given ich habe 1 Bild in der Staging Area
  When ich das letzte Bild per X-Button entferne
  Then verschwindet die Staging Area
  And die Nachricht kann ohne Bilder gesendet werden
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/aos-image-staging-area.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: aos-image-staging-area.ts enthält "@customElement"
- [ ] CONTAINS: aos-image-staging-area.ts enthält "thumbnail"
- [ ] CONTAINS: chat-view.ts enthält "aos-image-staging-area"

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
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten
- [ ] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Unit Tests geschrieben und bestanden
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Dokumentation aktualisiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `aos-image-staging-area.ts` | Neue Lit Web Component |
| Frontend | `chat-view.ts` | Import und Render der Staging Area, Event Handling |
| Frontend | `theme.css` | Styles fuer Staging Area, Thumbnails, Remove-Button |

---

### Technical Details

**WAS:**
- Neue Lit Web Component `aos-image-staging-area`
- Property: `images: StagedImage[]` - Array der ausgewaehlten Bilder
- Thumbnail-Rendering mit max 80px Hoehe
- X-Button (Remove) pro Thumbnail
- Dateiname als Tooltip auf Thumbnail
- CustomEvent `image-removed` mit image.id beim Entfernen
- Bedingte Anzeige: nur sichtbar wenn images.length > 0
- Horizontal Flex Layout fuer Thumbnails

**WIE (Architecture Guidance):**
- Pattern: Lit Web Component mit @customElement Decorator
- Referenz: Bestehende Komponenten wie `tool-call-badge.ts`, `spec-card.ts` fuer Struktur
- Referenz: CSS Custom Properties aus theme.css fuer konsistentes Styling
- Event Pattern: CustomEvent mit bubbles:true, composed:true fuer Event-Propagation
- Constraint: Component nutzt Shadow DOM NICHT (createRenderRoot return this Pattern)
- Constraint: Keine externe Image-Library, native img-Tags mit object-fit

**WO:**
- Create: `agent-os-ui/ui/src/components/aos-image-staging-area.ts`
- Modify: `agent-os-ui/ui/src/views/chat-view.ts` (Import + Render + Event Handler)
- Modify: `agent-os-ui/ui/src/styles/theme.css` (Staging Area Styles)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** CIMG-001

**Geschätzte Komplexität:** S

**Relevante Skills:** N/A

**Creates Reusable:** yes - aos-image-staging-area kann wiederverwendet werden

---

### Completion Check

```bash
# Verify component file exists
test -f agent-os-ui/ui/src/components/aos-image-staging-area.ts && echo "OK: Component exists" || exit 1

# Verify customElement decorator
grep -q "@customElement" agent-os-ui/ui/src/components/aos-image-staging-area.ts && echo "OK: customElement" || exit 1

# Verify thumbnail rendering
grep -q "thumbnail" agent-os-ui/ui/src/components/aos-image-staging-area.ts && echo "OK: thumbnail" || exit 1

# Verify import in chat-view
grep -q "aos-image-staging-area" agent-os-ui/ui/src/views/chat-view.ts && echo "OK: imported in chat-view" || exit 1

# Lint check
cd agent-os-ui && npm run lint

# Build check
cd agent-os-ui && npm run build
```
