# Docs Viewer Component

> Story ID: PDOC-003
> Spec: Project Docs Viewer/Editor
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: PDOC-001

---

## Feature

```gherkin
Feature: Markdown-Viewer für Projekt-Dokumente
  Als Benutzer
  möchte ich Markdown-Dokumente schön formatiert lesen können,
  damit ich die Projekt-Dokumentation übersichtlich einsehen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Markdown wird gerendert angezeigt

```gherkin
Scenario: Korrektes Rendering von Markdown-Inhalt
  Given ich das Dokument "roadmap.md" ausgewählt habe
  And das Dokument enthält "# Roadmap\n\n## Phase 1\n- Feature A\n- Feature B"
  When der Viewer den Inhalt lädt
  Then sehe ich "Roadmap" als große Überschrift
  And "Phase 1" als mittlere Überschrift
  And eine Aufzählungsliste mit "Feature A" und "Feature B"
```

### Szenario 2: Code-Blöcke werden hervorgehoben

```gherkin
Scenario: Syntax-Highlighting für Code-Blöcke
  Given das Dokument einen TypeScript Code-Block enthält
  When der Viewer den Inhalt rendert
  Then wird der Code-Block mit Monospace-Font angezeigt
  And Keywords sind farblich hervorgehoben
```

### Szenario 3: Edit-Button ist sichtbar

```gherkin
Scenario: Wechsel in den Edit-Modus
  Given ich ein Dokument im Viewer betrachte
  When ich den "Bearbeiten" Button sehe
  And ich darauf klicke
  Then wechselt die Ansicht zum Editor
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Leeres Dokument
  Given das ausgewählte Dokument ist leer
  When der Viewer den Inhalt lädt
  Then sehe ich einen leeren Bereich
  And der "Bearbeiten" Button ist weiterhin verfügbar

Scenario: Dokument-Ladefehler
  Given die Backend-API einen Fehler zurückgibt
  When der Viewer das Dokument laden möchte
  Then sehe ich eine Fehlermeldung "Dokument konnte nicht geladen werden"
  And einen "Erneut versuchen" Button
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: ui/src/components/docs/aos-docs-viewer.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: ui/src/components/docs/aos-docs-viewer.ts enthält "class AosDocsViewer extends LitElement"
- [ ] CONTAINS: ui/src/components/docs/aos-docs-viewer.ts enthält "@customElement('aos-docs-viewer')"
- [ ] CONTAINS: ui/src/components/docs/aos-docs-viewer.ts enthält "marked"

### Funktions-Prüfungen

- [ ] LINT_PASS: npm run lint exits with code 0
- [ ] BUILD_PASS: npm run build exits with code 0

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
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Unit Tests geschrieben und bestanden
- [ ] Integration Tests geschrieben und bestanden
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Dokumentation aktualisiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | aos-docs-viewer.ts | Neue Lit-Komponente |
| Frontend | package.json | marked + highlight.js Dependencies |

**Kritische Integration Points:**
- Backend API Content (`docs.read`) -> Viewer Markdown-Rendering
- Viewer `edit-requested` Event -> Parent Component (aos-docs-panel)

---

### Technical Details

**WAS:**
- Neue `AosDocsViewer` Lit-Komponente erstellen
- Properties: `content: string`, `filename: string`, `loading: boolean`, `error: string`
- Events: `edit-requested` (CustomEvent - signalisiert Wunsch zum Editor zu wechseln)
- Markdown-Rendering mit `marked` Library
- Syntax-Highlighting mit `highlight.js` für Code-Blöcke
- Error State mit Retry-Button
- Empty State für leere Dokumente

**WIE (Architecture Guidance):**
- Folge dem Pattern von `aos-kanban-board.ts` als Referenz für Lit-Komponenten
- Nutze `marked` Library (npm install marked @types/marked)
- Nutze `highlight.js` für Syntax-Highlighting (npm install highlight.js @types/highlight.js)
- Konfiguriere marked mit highlight.js Integration:
  ```typescript
  marked.setOptions({
    highlight: (code, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    }
  });
  ```
- Render Markdown in `updated()` lifecycle oder via computed property
- Nutze `unsafeHTML` directive von Lit für gerenderten HTML-Output
- Styles: Dark-Theme passend zu `theme.css`, Code-Blöcke mit passenden highlight.js Theme

**WO:**
- ERSTELLEN: `agent-os-ui/ui/src/components/docs/aos-docs-viewer.ts`
- ÄNDERN: `agent-os-ui/ui/package.json` (Dependencies hinzufügen)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** PDOC-001 (Backend muss `docs.read` bereitstellen)

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
