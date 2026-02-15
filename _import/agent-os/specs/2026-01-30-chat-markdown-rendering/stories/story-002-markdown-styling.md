# Markdown Styling

> Story ID: CMDR-002
> Spec: Chat Markdown Rendering
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: CMDR-001
**Status**: Done

---

## Feature

```gherkin
Feature: Markdown Styling
  Als Entwickler der mit Claude Code chattet
  möchte ich dass Markdown-Elemente im Dark Theme stilvoll dargestellt werden,
  damit das Chat-Interface professionell und konsistent aussieht.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Tabellen haben Dark Theme Styling

```gherkin
Scenario: Tabellen sind im Moltbot-Style gestaltet
  Given ich befinde mich im Chat-Interface
  And Claude antwortet mit einer Markdown-Tabelle
  When die Nachricht gerendert wird
  Then hat die Tabelle einen dunklen Hintergrund
  And die Header-Zeile ist visuell hervorgehoben
  And die Zeilen haben alternierende Hintergrundfarben (Zebra-Stripes)
  And die Rahmen sind subtil und passend zum Theme
```

### Szenario 2: Code-Blöcke haben Dark Theme

```gherkin
Scenario: Code-Blöcke nutzen konsistentes Dark Theme
  Given ich befinde mich im Chat-Interface
  And Claude antwortet mit einem Code-Block
  When die Nachricht gerendert wird
  Then hat der Code-Block einen dunklen Hintergrund (#1e1e1e oder ähnlich)
  And die Syntax-Farben passen zum Dark Theme
  And der Code-Header zeigt die Sprache
  And der Copy-Button ist sichtbar im Header
```

### Szenario 3: Überschriften haben klare Hierarchie

```gherkin
Scenario: Headings sind visuell unterscheidbar
  Given ich befinde mich im Chat-Interface
  And Claude antwortet mit verschiedenen Heading-Levels
  When die Nachricht gerendert wird
  Then ist H1 deutlich größer als Fließtext
  And H2 ist kleiner als H1 aber größer als H3
  And alle Headings haben die Theme-Textfarbe
  And unter den Headings ist ausreichend Abstand
```

### Szenario 4: Links sind erkennbar

```gherkin
Scenario: Links sind als solche erkennbar und sicher
  Given ich befinde mich im Chat-Interface
  And Claude antwortet mit einem Markdown-Link
  When die Nachricht gerendert wird
  Then ist der Link farblich hervorgehoben (z.B. blau oder cyan)
  And der Link hat einen Hover-Effekt
  And externe Links öffnen in neuem Tab
```

### Szenario 5: Blockquotes sind gestylt

```gherkin
Scenario: Blockquotes haben visuelles Styling
  Given ich befinde mich im Chat-Interface
  And Claude antwortet mit einem Blockquote (> text)
  When die Nachricht gerendert wird
  Then hat das Blockquote einen linken farbigen Rand
  And der Hintergrund ist leicht abgesetzt
  And der Text ist kursiv oder anderweitig unterscheidbar
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Sehr lange Tabellen sind scrollbar
  Given ich befinde mich im Chat-Interface
  And Claude antwortet mit einer sehr breiten Tabelle (10+ Spalten)
  When die Nachricht gerendert wird
  Then ist die Tabelle horizontal scrollbar
  And die Nachricht selbst überläuft nicht
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: ui/src/styles/theme.css

### Inhalt-Prüfungen

- [ ] CONTAINS: ui/src/styles/theme.css enthält ".markdown-body"
- [ ] CONTAINS: ui/src/styles/theme.css enthält "table" Styles
- [ ] CONTAINS: ui/src/styles/theme.css enthält "pre" oder "code" Styles
- [ ] CONTAINS: ui/src/styles/theme.css enthält "blockquote" Styles

### Funktions-Prüfungen

- [ ] LINT_PASS: cd ui && npm run lint
- [ ] BUILD_PASS: cd ui && npm run build

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| Playwright (optional) | Visual Verification | No |

---

## Technisches Refinement (vom Architect)

> **Refinement durchgeführt:** 2026-01-30

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
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Unit Tests geschrieben und bestanden (N/A - CSS only)
- [x] Integration Tests geschrieben und bestanden (N/A - CSS only)
- [x] Code Review durchgeführt und genehmigt (Self-review)

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `ui/src/styles/theme.css` | ADD: Chat-spezifische Markdown-Styles |

**Kritische Integration Points:** Keine (CSS-only)

**Hinweis:** theme.css hat bereits `.markdown-body` Styles (Zeile 2147-2363). Diese müssen für den Chat-Kontext erweitert werden mit `.chat-message .markdown-body` Selektoren.

---

### Technical Details

**WAS:**
- CSS-Styles für Markdown-Elemente im Chat-Kontext
- Tabellen mit Zebra-Stripes und Dark Theme
- Code-Blöcke mit Header und Syntax-Highlighting-Farben
- Blockquotes mit linkem Rand
- Links mit Hover-Effekt
- Scrollbare Tabellen für breite Inhalte

**WIE (Architektur-Guidance ONLY):**
- Nutze existierende CSS Custom Properties (`--color-*`, `--spacing-*`, `--radius-*`)
- Erweitere bestehende `.markdown-body` Styles für Chat-Kontext
- Scope Chat-Styles mit `.chat-message .markdown-body` Selektor
- Folge highlight.js Theme-Pattern aus theme.css (Zeile 2293-2363)
- Verwende `overflow-x: auto` für breite Tabellen
- Zebra-Stripes via `nth-child(even)` Selektor

**WO:**
- `ui/src/styles/theme.css` (ADD neue Sektion für Chat-Markdown)

**Abhängigkeiten:** CMDR-001

**Geschätzte Komplexität:** S (Small - 1 Datei, ~100 LOC CSS)

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | agent-os/team/skills/frontend-lit.md | CSS Custom Properties Pattern |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q ".chat-message.*markdown-body" ui/src/styles/theme.css && echo "✓ Chat markdown styles exist"
grep -q "table" ui/src/styles/theme.css && echo "✓ Table styles exist"
grep -q "blockquote" ui/src/styles/theme.css && echo "✓ Blockquote styles exist"
grep -q "overflow-x" ui/src/styles/theme.css && echo "✓ Scrollable styles exist"
cd ui && npm run lint
cd ui && npm run build
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
