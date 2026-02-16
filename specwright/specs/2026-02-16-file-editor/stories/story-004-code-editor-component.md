# Code Editor Component

> Story ID: FE-004
> Spec: File Editor
> Created: 2026-02-16
> Last Updated: 2026-02-16

**Priority**: Critical
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: FE-001

---

## Feature

```gherkin
Feature: Code Editor Component
  Als Entwickler
  möchte ich Dateien in einem vollwertigen Code-Editor mit Syntax-Highlighting bearbeiten können,
  damit ich produktiv Code und Konfigurationsdateien direkt in der Specwright UI anpassen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Datei wird im Editor angezeigt

```gherkin
Scenario: Dateiinhalt wird im Editor mit Syntax-Highlighting dargestellt
  Given eine TypeScript-Datei "app.ts" wurde ausgewählt
  When die Datei im Editor geladen wird
  Then sehe ich den vollständigen Dateiinhalt im Editor
  And der Code ist mit TypeScript Syntax-Highlighting dargestellt
  And Zeilennummern sind links sichtbar
```

### Szenario 2: Automatische Spracherkennung

```gherkin
Scenario Outline: Sprache wird automatisch anhand der Dateiendung erkannt
  Given eine Datei "<dateiname>" wurde geöffnet
  When der Editor den Inhalt anzeigt
  Then ist Syntax-Highlighting für "<sprache>" aktiviert

  Examples:
    | dateiname      | sprache    |
    | app.ts         | TypeScript |
    | style.css      | CSS        |
    | index.html     | HTML       |
    | config.json    | JSON       |
    | readme.md      | Markdown   |
    | script.js      | JavaScript |
    | config.yaml    | YAML       |
```

### Szenario 3: Datei bearbeiten und speichern

```gherkin
Scenario: Datei wird bearbeitet und per Tastenkürzel gespeichert
  Given die Datei "test.ts" ist im Editor geöffnet
  When ich Text im Editor hinzufüge
  And ich Ctrl+S drücke
  Then wird die Datei gespeichert
  And ich sehe eine kurze Speicher-Bestätigung
```

### Szenario 4: Save-Button

```gherkin
Scenario: Datei wird über den Save-Button gespeichert
  Given die Datei "test.ts" ist im Editor geöffnet und wurde bearbeitet
  When ich auf den Save-Button klicke
  Then wird die Datei gespeichert
  And ich sehe eine kurze Speicher-Bestätigung
```

### Szenario 5: Dark/Light Theme

```gherkin
Scenario: Editor passt sich dem aktuellen Theme an
  Given die Specwright UI ist im Dark Mode
  When ich eine Datei im Editor öffne
  Then wird der Editor im Dark Theme dargestellt
  And Syntax-Highlighting-Farben passen zum Dark Theme
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Speichern schlägt fehl
  Given eine Datei ist im Editor geöffnet
  And die Datei wurde zwischenzeitlich schreibgeschützt
  When ich versuche zu speichern
  Then sehe ich eine Fehlermeldung "Speichern fehlgeschlagen"
  And meine Änderungen im Editor bleiben erhalten

Scenario: Unbekannter Dateityp
  Given eine Datei "data.xyz" mit unbekannter Endung wurde geöffnet
  When der Editor den Inhalt anzeigt
  Then wird der Inhalt als Plain Text ohne spezielles Highlighting dargestellt
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [ ] FILE_EXISTS: ui/frontend/src/components/file-editor/aos-file-editor.ts

### Inhalt-Pruefungen

- [ ] CONTAINS: ui/frontend/src/components/file-editor/aos-file-editor.ts enthält "@customElement('aos-file-editor')"
- [ ] CONTAINS: ui/frontend/src/components/file-editor/aos-file-editor.ts enthält "EditorView"
- [ ] CONTAINS: ui/frontend/src/components/file-editor/aos-file-editor.ts enthält "Compartment"

### Funktions-Pruefungen

- [ ] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0
- [ ] LINT_PASS: `cd ui && npm run lint` exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| Playwright | Editor-Rendering und Keyboard-Shortcuts testen | No |

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

**Story ist READY - alle Checkboxen angehakt.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] CodeMirror korrekt integriert mit Theme-Compartment
- [ ] Automatische Spracherkennung funktioniert
- [ ] Ctrl+S / Cmd+S Shortcut funktioniert

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `aos-file-editor.ts` (NEU) | CodeMirror-Integration mit Multi-Language-Support |
| Frontend | `frontend/package.json` (ÄNDERUNG) | Zusätzliche CodeMirror-Sprachpakete |

**Kritische Integration Points:**
- aos-file-editor → CodeMirror (EditorView-Lifecycle, Theme-Compartment)
- aos-file-editor → aos-file-editor-panel (Custom Events: `@content-changed`, `@save-requested`)

---

### Technical Details

**WAS:**
- Neue `aos-file-editor` Lit Component mit CodeMirror 6 Integration
- Zusätzliche CodeMirror-Sprachpakete installieren (`@codemirror/lang-javascript`, `@codemirror/lang-json`, `@codemirror/lang-html`, `@codemirror/lang-css`)
- Automatische Spracherkennung basierend auf Dateiendung
- Save-Keyboard-Shortcut (Ctrl+S / Cmd+S)

**WIE (Architektur-Guidance ONLY):**
- Folge exakt dem `aos-docs-editor.ts` Pattern für CodeMirror-Integration
- Nutze `Compartment` Pattern für dynamisches Theme-Switching UND Language-Switching
- Zwei Compartments: `themeCompartment` (wie docs-editor) + `languageCompartment` (NEU)
- Sprach-Map: Funktion die Dateiendung auf CodeMirror-Language-Extension mapped
- `@property() content` / `@property() language` / `@property() filename`
- `@state() hasUnsavedChanges` tracking via `EditorView.updateListener`
- Custom Event `content-changed` bei doc-Änderung
- Custom Event `save-requested` bei Ctrl+S (via keymap Extension)
- Theme-Reaktion: Nutze bestehenden `themeService` + `Compartment.reconfigure()`
- Light DOM Pattern

**WO:**
- `ui/frontend/src/components/file-editor/aos-file-editor.ts` (NEU)
- `ui/frontend/package.json` (ÄNDERUNG - neue CodeMirror Sprachpakete)

**Abhängigkeiten:** FE-001 (Backend muss `files:read` und `files:write` unterstützen)

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Patterns, CodeMirror-Integration |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | Bestehende Editor-Patterns, Theme-Service |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| aos-file-editor | UI Component | ui/frontend/src/components/file-editor/aos-file-editor.ts | CodeMirror-basierter Editor mit Multi-Language-Support und Theme-Switching |

---

### Completion Check

```bash
# Auto-Verify Commands
test -f ui/frontend/src/components/file-editor/aos-file-editor.ts && echo "Editor exists"
grep -q "aos-file-editor" ui/frontend/src/components/file-editor/aos-file-editor.ts && echo "Component registered"
grep -q "EditorView" ui/frontend/src/components/file-editor/aos-file-editor.ts && echo "CodeMirror integrated"
cd ui/frontend && npm run build
cd ui && npm run lint
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
