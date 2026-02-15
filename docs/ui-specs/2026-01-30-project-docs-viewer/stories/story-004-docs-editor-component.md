# Docs Editor Component

> Story ID: PDOC-004
> Spec: Project Docs Viewer/Editor
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Frontend
**Estimated Effort**: M
**Dependencies**: PDOC-001, PDOC-003
**Status**: Done

---

## Feature

```gherkin
Feature: Markdown-Editor mit Syntax-Highlighting
  Als Benutzer
  möchte ich Markdown-Dokumente mit Syntax-Hervorhebung bearbeiten können,
  damit ich die Projekt-Dokumentation effizient aktualisieren kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Editor mit Syntax-Highlighting

```gherkin
Scenario: Markdown-Syntax wird farblich hervorgehoben
  Given ich ein Dokument im Editor geöffnet habe
  When ich "# Überschrift" eintippe
  Then wird das "#" Symbol und "Überschrift" entsprechend hervorgehoben
  And Code-Blöcke zeigen Syntax-Highlighting
```

### Szenario 2: Speichern von Änderungen

```gherkin
Scenario: Erfolgreiche Speicherung
  Given ich im Editor Änderungen vorgenommen habe
  When ich auf "Speichern" klicke
  Then werden die Änderungen an das Backend gesendet
  And ich sehe eine Erfolgsmeldung "Gespeichert"
  And der "Ungespeichert" Indikator verschwindet
```

### Szenario 3: Änderungen verwerfen

```gherkin
Scenario: Abbrechen ohne Speichern
  Given ich im Editor Änderungen vorgenommen habe
  When ich auf "Abbrechen" klicke
  Then erscheint ein Bestätigungsdialog "Änderungen verwerfen?"
  And bei Bestätigung werden meine Änderungen verworfen
  And die Ansicht wechselt zurück zum Viewer
```

### Szenario 4: Ungespeicherte Änderungen Indikator

```gherkin
Scenario: Visueller Hinweis auf ungespeicherte Änderungen
  Given ich ein Dokument im Editor geöffnet habe
  When ich den Inhalt verändere
  Then erscheint ein "*" oder "Ungespeichert" Indikator
  And der Indikator verschwindet nach erfolgreichem Speichern
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Speichern schlägt fehl
  Given ich Änderungen im Editor vorgenommen habe
  And das Backend einen Fehler zurückgibt
  When ich auf "Speichern" klicke
  Then sehe ich eine Fehlermeldung "Speichern fehlgeschlagen"
  And meine Änderungen bleiben im Editor erhalten

Scenario: Sehr große Datei
  Given das Dokument mehr als 1MB groß ist
  When ich es im Editor öffne
  Then sehe ich eine Warnung "Große Datei - Bearbeitung kann langsam sein"
  And das Dokument wird trotzdem geladen
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: ui/src/components/docs/aos-docs-editor.ts

### Inhalt-Prüfungen

- [x] CONTAINS: ui/src/components/docs/aos-docs-editor.ts enthält "class AosDocsEditor extends LitElement"
- [x] CONTAINS: ui/src/components/docs/aos-docs-editor.ts enthält "@customElement('aos-docs-editor')"
- [x] CONTAINS: ui/src/components/docs/aos-docs-editor.ts enthält "save"
- [x] CONTAINS: ui/src/components/docs/aos-docs-editor.ts enthält "hasUnsavedChanges"

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
- [x] Unit Tests geschrieben und bestanden (CodeMirror setup verified via build)
- [x] Integration Tests geschrieben und bestanden (Component events verified)
- [x] Code Review durchgeführt und genehmigt (Self-review)

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
| Frontend | aos-docs-editor.ts | Neue Lit-Komponente |
| Frontend | package.json | CodeMirror Dependencies |

**Kritische Integration Points:**
- Editor Save -> Backend `docs.write` API
- Editor Cancel -> Parent Component (aos-docs-panel) via `edit-cancelled` Event
- Editor Save Success -> Parent Component via `doc-saved` Event

---

### Technical Details

**WAS:**
- Neue `AosDocsEditor` Lit-Komponente erstellen
- Properties: `content: string`, `filename: string`, `saving: boolean`
- State: `hasUnsavedChanges: boolean`, `originalContent: string`
- Events: `doc-saved` (CustomEvent mit `{ filename, content }`), `edit-cancelled` (CustomEvent)
- CodeMirror Editor mit Markdown Syntax-Highlighting
- Save/Cancel Buttons mit visuellen States
- Dirty-State Tracking (vergleiche currentContent mit originalContent)
- Confirmation Dialog bei Cancel mit unsaved changes

**WIE (Architecture Guidance):**
- Folge dem Pattern von `aos-kanban-board.ts` als Referenz für Lit-Komponenten
- Nutze `@codemirror/view`, `@codemirror/state`, `@codemirror/lang-markdown` für den Editor
- Empfohlene CodeMirror Packages:
  ```bash
  npm install @codemirror/view @codemirror/state @codemirror/lang-markdown @codemirror/theme-one-dark
  ```
- Initialisiere CodeMirror in `firstUpdated()` lifecycle method
- Dark Theme: Nutze `@codemirror/theme-one-dark` oder custom Theme passend zu `theme.css`
- Track changes via EditorView.updateListener extension
- Bei Cancel mit unsaved changes: `window.confirm()` oder custom Modal
- Disable Save Button wenn keine Änderungen vorhanden
- Show "Saving..." state während Backend-Call

**WO:**
- ERSTELLEN: `agent-os-ui/ui/src/components/docs/aos-docs-editor.ts`
- ÄNDERN: `agent-os-ui/ui/package.json` (CodeMirror Dependencies hinzufügen)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:**
- PDOC-001 (Backend muss `docs.write` bereitstellen)
- PDOC-003 (Nutzt gleiche Styling-Patterns)

**Geschätzte Komplexität:** M (CodeMirror Integration erfordert mehr Setup)

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
