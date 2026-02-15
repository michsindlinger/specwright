# Frontend - Dynamische Tab-Bar Komponente

> Story ID: SDVE-002
> Spec: Spec Docs Viewer Extension
> Created: 2026-02-12
> Last Updated: 2026-02-12

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S (2 SP)
**Dependencies**: SDVE-001 (benötigt Response-Format-Definition)

---

## Feature

```gherkin
Feature: Dynamische Tab-Bar für Spec-Dateien
  Als Entwickler
  möchte ich eine übersichtliche Tab-Leiste sehen die alle Markdown-Dateien eines Specs nach Ordner gruppiert darstellt,
  damit ich schnell zwischen verschiedenen Dokumenten navigieren kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Gruppierte Tabs anzeigen

```gherkin
Scenario: Tabs nach Ordner gruppiert darstellen
  Given ein Spec hat 3 Dateien im Hauptordner und 5 Story-Dateien
  When die Tab-Bar gerendert wird
  Then sehe ich zwei Gruppen: "root" mit 3 Tabs und "stories" mit 5 Tabs
  And jeder Tab zeigt den Dateinamen an
```

### Szenario 2: Tab auswählen

```gherkin
Scenario: Datei durch Tab-Klick auswählen
  Given die Tab-Bar zeigt alle Dateien eines Specs
  When ich auf den Tab "implementation-plan.md" klicke
  Then wird dieser Tab als aktiv hervorgehoben
  And die Datei wird zum Anzeigen angefordert
```

### Szenario 3: Horizontales Scrolling bei vielen Tabs

```gherkin
Scenario: Viele Tabs horizontal scrollen
  Given ein Spec hat 15 Story-Dateien im stories/ Ordner
  When die Tab-Bar gerendert wird
  Then kann ich horizontal scrollen um alle Tabs zu sehen
  And die Tab-Bar bricht nicht um
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Spec ohne Unterordner
  Given ein Spec hat nur 2 Dateien im Hauptordner (spec.md, spec-lite.md)
  When die Tab-Bar gerendert wird
  Then sehe ich nur eine Gruppe "root" mit 2 Tabs
  And keine leeren Gruppen-Header
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: `agent-os-ui/ui/src/components/specs/aos-spec-file-tabs.ts` (neue Komponente)

### Inhalt-Prüfungen

- [x] CONTAINS: `agent-os-ui/ui/src/components/specs/aos-spec-file-tabs.ts` enthält `@customElement('aos-spec-file-tabs')`
- [x] CONTAINS: `agent-os-ui/ui/src/components/specs/aos-spec-file-tabs.ts` enthält `file-selected`

### Funktions-Prüfungen

- [x] LINT_PASS: `cd agent-os-ui/ui && npx tsc --noEmit`
- [x] BUILD_PASS: `cd agent-os-ui/ui && npx tsc --noEmit`

---

## Required MCP Tools

_No MCP tools required for this story._

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
- [x] **Alle betroffenen Layer identifiziert** - Frontend-only (Lit Web Component)
- [x] **Integration Type bestimmt** - Frontend-only
- [x] **Kritische Integration Points dokumentiert** - Konsumiert Response-Format von SDVE-001 (`specs.files` groups Array), emittiert `file-selected` Event fuer SDVE-003
- [x] **Handover-Dokumente definiert** - Input-Property-Interface: `files` (groups Array), `activeFile` (relativePath string); Output-Event: `file-selected` mit `{ relativePath, filename }` detail

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Horizontales Scrolling funktioniert bei vielen Tabs

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] TypeScript kompiliert fehlerfrei (`npx tsc --noEmit`)
- [x] Komponente registriert sich korrekt als Custom Element
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `aos-spec-file-tabs.ts` (NEU) | Neue Lit-Komponente: dynamische Tab-Bar mit Ordner-Gruppierung, Active-State, horizontalem Scrolling |

---

### Technical Details

**WAS:**
- Neue Lit Web Component `aos-spec-file-tabs` die eine Dateiliste als gruppierte Tabs darstellt
- Properties: `files` (Gruppen-Array aus SDVE-001 Response), `activeFile` (aktuell ausgewaehlter relativePath)
- Emittiert `file-selected` Custom Event mit `{ relativePath, filename }` detail bei Tab-Klick
- Gruppen-Header als kleine Labels (z.B. "root", "stories/", "sub-specs/")
- Horizontales Scrolling mit `overflow-x: auto`, kein Wrapping

**WIE (Architektur-Guidance ONLY):**
- Folgt dem Lit Component Pattern des Projekts: `@customElement` Decorator, `@property` fuer oeffentliche Properties, `css` tagged template fuer Styles
- Nutzt Light DOM (`createRenderRoot() { return this; }`) wie `aos-docs-viewer.ts` (Zeile 186), damit CSS aus dem Kanban Board Modal die Tabs stylen kann
- CSS nutzt die bestehenden Custom Properties des Projekts (`--border-color`, `--bg-color-tertiary`, `--primary-color`, `--text-color`) - siehe kanban-board.ts `.spec-viewer-btn` Styling als Referenz
- Active-Tab-Markierung ueber CSS-Klasse `.active` mit bestehender Button-Styling-Convention
- Gruppen-Header als `<span>` mit kleiner Schrift und muted Farbe, Dateien als `<button>` Elemente
- Gesamte Tab-Bar in einem `<div>` mit `display: flex`, `overflow-x: auto`, `white-space: nowrap`
- Jede Gruppe ist ein `<div>` mit Inline-Flex-Layout: Header-Label gefolgt von Tab-Buttons
- Leere Gruppen werden nicht gerendert (kein Header fuer Ordner ohne Dateien)
- Komponenten-Prefix `aos-` wie alle anderen Komponenten im Projekt

**WO:**
- `agent-os-ui/ui/src/components/specs/aos-spec-file-tabs.ts` (NEUE Datei, neues `specs/` Verzeichnis)

**WER:** codebase-analyzer

**Abhängigkeiten:** SDVE-001 (benoetigt Response-Format-Definition als Property-Interface)

**Geschätzte Komplexität:** S

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artifact | Typ | Genutzt von |
|----------|-----|-------------|
| `aos-spec-file-tabs` | Lit Web Component | SDVE-003 (gerendert in kanban-board.ts Spec Viewer Modal) |

---

### Relevante Skills

- ui-component-architecture (Neue Lit Component mit Properties und Events)

---

### Completion Check

```bash
# 1. TypeScript Frontend compilation
cd agent-os-ui/ui && npx tsc --noEmit

# 2. Verify component file exists
ls agent-os-ui/ui/src/components/specs/aos-spec-file-tabs.ts

# 3. Verify custom element registration
grep -n "customElement" agent-os-ui/ui/src/components/specs/aos-spec-file-tabs.ts

# 4. Verify file-selected event emission
grep -n "file-selected" agent-os-ui/ui/src/components/specs/aos-spec-file-tabs.ts

# 5. Verify light DOM pattern
grep -n "createRenderRoot" agent-os-ui/ui/src/components/specs/aos-spec-file-tabs.ts
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt neue Datei `aos-spec-file-tabs.ts`
