# Image Lightbox Component

> Story ID: CIMG-006
> Spec: Chat Image Attachments
> Created: 2026-02-02
> Last Updated: 2026-02-02

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: S (2 SP)
**Dependencies**: CIMG-005
**Status**: Done

---

## Feature

```gherkin
Feature: Bild-Lightbox
  Als Entwickler
  möchte ich Bilder in Großansicht betrachten können,
  damit ich Details erkennen kann die im Thumbnail nicht sichtbar sind.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Lightbox öffnen

```gherkin
Scenario: Lightbox per Klick öffnen
  Given eine Chat-Nachricht mit einem Bild wird angezeigt
  When ich auf das Bild-Thumbnail klicke
  Then öffnet sich ein dunkles Overlay über dem gesamten Bildschirm
  And das Bild wird zentriert in maximaler Größe angezeigt
```

### Szenario 2: Lightbox schließen per X-Button

```gherkin
Scenario: Lightbox per X-Button schließen
  Given die Lightbox ist geöffnet
  When ich auf den X-Button in der rechten oberen Ecke klicke
  Then schließt sich die Lightbox
  And ich sehe wieder den Chat
```

### Szenario 3: Lightbox schließen per Escape

```gherkin
Scenario: Lightbox per Escape-Taste schließen
  Given die Lightbox ist geöffnet
  When ich die Escape-Taste drücke
  Then schließt sich die Lightbox
```

### Szenario 4: Lightbox schließen per Klick außerhalb

```gherkin
Scenario: Lightbox per Klick auf Overlay schließen
  Given die Lightbox ist geöffnet
  When ich auf den dunklen Bereich außerhalb des Bildes klicke
  Then schließt sich die Lightbox
```

### Szenario 5: Bild angepasst an Viewport

```gherkin
Scenario: Großes Bild wird skaliert
  Given ich öffne ein 4000x3000 Pixel großes Bild
  Then wird das Bild auf die Viewport-Größe skaliert
  And das Seitenverhältnis bleibt erhalten
  And maximal 90% des Viewports werden genutzt
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: PDF in Lightbox
  Given ich klicke auf ein PDF-Thumbnail
  Then öffnet sich der PDF-Download
  And keine Lightbox wird angezeigt
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/ui/src/components/aos-image-lightbox.ts

### Inhalt-Prüfungen

- [x] CONTAINS: aos-image-lightbox.ts enthält "@customElement"
- [x] CONTAINS: aos-image-lightbox.ts enthält "Escape"
- [x] CONTAINS: aos-image-lightbox.ts enthält "overlay"

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
| Frontend | `aos-image-lightbox.ts` | Neue Modal-Komponente |
| Frontend | `theme.css` | Lightbox/Overlay Styles |
| Frontend | `chat-view.ts` oder `app.ts` | Lightbox Event Listener, Rendering |

---

### Technical Details

**WAS:**
- **Neue Komponente aos-image-lightbox.ts:**
  - Properties: `imageSrc: string`, `isOpen: boolean`
  - Methoden: `open(src: string)`, `close()`
  - Dunkles Overlay (rgba(0,0,0,0.9)) ueber gesamten Viewport
  - X-Button oben rechts zum Schliessen
  - Bild zentriert, max 90vw/90vh, Seitenverhaeltnis erhalten
  - Keyboard Handler: Escape zum Schliessen
  - Click Handler: Klick auf Overlay (ausserhalb Bild) schliesst
- **Integration in App/Chat:**
  - Event Listener fuer `open-lightbox` CustomEvent
  - Lightbox-Komponente einmal in app.ts oder chat-view.ts rendern
  - PDF-Klick: Kein Lightbox, stattdessen Download/neuer Tab

**WIE (Architecture Guidance):**
- Pattern: Modal/Overlay Pattern mit position:fixed
- Referenz: Keine bestehende Modal-Komponente, aber CSS Variables aus theme.css nutzen
- Referenz: Keyboard Event Handling wie in chat-view.ts `handleKeyDown`
- Constraint: Kein Focus-Trap noetig fuer einfache Lightbox
- Constraint: Shadow DOM deaktiviert (createRenderRoot Pattern)
- Animation: CSS Transition fuer fade-in/out (opacity 0->1)
- Z-Index: Hoch genug um ueber allem zu liegen (z-index: 9999)

**WO:**
- Create: `agent-os-ui/ui/src/components/aos-image-lightbox.ts`
- Modify: `agent-os-ui/ui/src/styles/theme.css`
- Modify: `agent-os-ui/ui/src/views/chat-view.ts` oder `app.ts` (Event Listener + Render)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** CIMG-005

**Geschätzte Komplexität:** S (2 SP)

**Relevante Skills:** N/A

**Creates Reusable:** yes - aos-image-lightbox kann fuer andere Bildanzeigen wiederverwendet werden

---

### Completion Check

```bash
# Verify component file exists
test -f agent-os-ui/ui/src/components/aos-image-lightbox.ts && echo "OK: Lightbox component exists" || exit 1

# Verify customElement decorator
grep -q "@customElement" agent-os-ui/ui/src/components/aos-image-lightbox.ts && echo "OK: customElement" || exit 1

# Verify Escape key handling
grep -q "Escape" agent-os-ui/ui/src/components/aos-image-lightbox.ts && echo "OK: Escape handler" || exit 1

# Verify overlay class
grep -q "overlay" agent-os-ui/ui/src/components/aos-image-lightbox.ts && echo "OK: overlay" || exit 1

# Verify CSS styles for lightbox
grep -q "lightbox" agent-os-ui/ui/src/styles/theme.css && echo "OK: lightbox CSS" || exit 1

# Lint check
cd agent-os-ui && npm run lint

# Build check
cd agent-os-ui && npm run build
```
