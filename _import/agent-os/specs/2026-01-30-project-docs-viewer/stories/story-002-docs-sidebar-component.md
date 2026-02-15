# Docs Sidebar Component

> Story ID: PDOC-002
> Spec: Project Docs Viewer/Editor
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: PDOC-001
**Status**: Done

---

## Feature

```gherkin
Feature: Sidebar zur Navigation zwischen Dokumenten
  Als Benutzer
  möchte ich eine Übersicht aller verfügbaren Projekt-Dokumente sehen,
  damit ich schnell zwischen verschiedenen Dokumenten wechseln kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Dokumentenliste wird angezeigt

```gherkin
Scenario: Anzeige der verfügbaren Dokumente
  Given ich im Dashboard den "Docs" Tab geöffnet habe
  And das Projekt hat 4 Markdown-Dateien im product-Ordner
  When die Sidebar geladen wird
  Then sehe ich eine Liste mit 4 Dokumenten
  And jedes Dokument zeigt seinen Dateinamen an
```

### Szenario 2: Dokument auswählen

```gherkin
Scenario: Klick auf ein Dokument in der Sidebar
  Given die Sidebar zeigt die Dokumente "product-brief.md", "roadmap.md", "tech-stack.md"
  When ich auf "roadmap.md" klicke
  Then wird "roadmap.md" als aktiv markiert
  And der Viewer zeigt den Inhalt von "roadmap.md"
```

### Szenario 3: Aktives Dokument visuell hervorheben

```gherkin
Scenario: Visuelles Feedback für aktives Dokument
  Given "tech-stack.md" ist aktuell geöffnet
  When ich die Sidebar betrachte
  Then ist "tech-stack.md" farblich hervorgehoben
  And die anderen Dokumente haben eine neutrale Darstellung
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Projekt ohne Dokumente
  Given das ausgewählte Projekt keinen agent-os/product/ Ordner hat
  When die Sidebar geladen wird
  Then sehe ich den Hinweis "Keine Projekt-Dokumente gefunden"
  And keine Dateiliste wird angezeigt

Scenario: Wechsel mit ungespeicherten Änderungen
  Given ich ein Dokument bearbeite und ungespeicherte Änderungen habe
  When ich auf ein anderes Dokument in der Sidebar klicke
  Then erscheint ein Bestätigungsdialog
  And ich kann wählen ob ich speichern, verwerfen oder abbrechen möchte
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: ui/src/components/docs/aos-docs-sidebar.ts

### Inhalt-Prüfungen

- [x] CONTAINS: ui/src/components/docs/aos-docs-sidebar.ts enthält "class AosDocsSidebar extends LitElement"
- [x] CONTAINS: ui/src/components/docs/aos-docs-sidebar.ts enthält "@customElement('aos-docs-sidebar')"
- [x] CONTAINS: ui/src/components/docs/aos-docs-sidebar.ts enthält "doc-selected"

### Funktions-Prüfungen

- [x] LINT_PASS: npm run lint exits with code 0
- [x] BUILD_PASS: npm run build exits with code 0

---

## Required MCP Tools

Keine MCP Tools erforderlich für diese Frontend-Story.

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

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [x] Unit Tests geschrieben und bestanden
- [x] Integration Tests geschrieben und bestanden
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | aos-docs-sidebar.ts | Neue Lit-Komponente |

**Kritische Integration Points:**
- Backend API Response (`docs.list`) -> Sidebar Dateiliste
- Sidebar -> Parent Component (aos-docs-panel) via `doc-selected` Event

---

### Technical Details

**WAS:**
- Neue `AosDocsSidebar` Lit-Komponente erstellen
- Properties: `docs: DocFile[]`, `selectedDoc: string | null`, `hasUnsavedChanges: boolean`
- Events: `doc-selected` (CustomEvent mit `{ filename: string }`)
- Empty State: "Keine Projekt-Dokumente gefunden"
- Active State: Visuell hervorgehobenes aktives Dokument

**WIE (Architecture Guidance):**
- Folge dem Pattern von `aos-kanban-board.ts` als Referenz für Lit-Komponenten
- Nutze `@property` Decorators für reactive Properties
- Nutze `@customElement('aos-docs-sidebar')` Decorator
- Events mit `this.dispatchEvent(new CustomEvent(...))` - bubbles: true, composed: true
- Styles via CSS Custom Properties aus `theme.css` (Dark Theme)
- `createRenderRoot() { return this; }` um Light DOM zu nutzen (wie andere Komponenten)
- Sortiere Dateien alphabetisch in der Anzeige

**WO:**
- ERSTELLEN: `agent-os-ui/ui/src/components/docs/aos-docs-sidebar.ts`

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** PDOC-001 (Backend muss `docs.list` bereitstellen)

**Geschätzte Komplexität:** S

---

### Completion Check

```bash
# Auto-Verify Commands
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui && npm run lint
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui && npm run build
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
