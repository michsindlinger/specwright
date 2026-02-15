# Markdown Parser Integration

> Story ID: CMDR-001
> Spec: Chat Markdown Rendering
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: Critical
**Type**: Frontend
**Estimated Effort**: TBD
**Dependencies**: None
**Status**: Done

---

## Feature

```gherkin
Feature: Markdown Parser Integration
  Als Entwickler der mit Claude Code chattet
  möchte ich dass Claude-Antworten als formatiertes Markdown angezeigt werden,
  damit ich strukturierte Informationen wie Tabellen und Listen besser lesen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Tabellen werden korrekt dargestellt

```gherkin
Scenario: Markdown-Tabelle wird als HTML-Tabelle gerendert
  Given ich befinde mich im Chat-Interface
  And Claude antwortet mit einer Markdown-Tabelle
  When die Nachricht vollständig empfangen wurde
  Then sehe ich eine formatierte HTML-Tabelle
  And die Spalten sind korrekt ausgerichtet
  And die Tabellenzeilen sind visuell unterscheidbar
```

### Szenario 2: Listen werden korrekt dargestellt

```gherkin
Scenario: Ungeordnete Liste wird mit Bullet Points gerendert
  Given ich befinde mich im Chat-Interface
  And Claude antwortet mit einer ungeordneten Liste (- item)
  When die Nachricht vollständig empfangen wurde
  Then sehe ich eine formatierte Liste mit Bullet Points
  And verschachtelte Listen sind korrekt eingerückt
```

### Szenario 3: Headings werden korrekt dargestellt

```gherkin
Scenario: Markdown Headings werden als HTML Headings gerendert
  Given ich befinde mich im Chat-Interface
  And Claude antwortet mit Headings (## Heading)
  When die Nachricht vollständig empfangen wurde
  Then sehe ich formatierte Überschriften in verschiedenen Größen
  And H1 ist größer als H2
  And H2 ist größer als H3
```

### Szenario 4: Code-Blöcke mit Syntax-Highlighting

```gherkin
Scenario: Code-Block wird mit Syntax-Highlighting gerendert
  Given ich befinde mich im Chat-Interface
  And Claude antwortet mit einem TypeScript Code-Block
  When die Nachricht vollständig empfangen wurde
  Then sehe ich einen formatierten Code-Block
  And Keywords sind farblich hervorgehoben
  And die Sprache wird im Header angezeigt
```

### Szenario 5: Inline-Formatierungen

```gherkin
Scenario: Bold und Italic Text wird korrekt dargestellt
  Given ich befinde mich im Chat-Interface
  And Claude antwortet mit **bold** und *italic* Text
  When die Nachricht vollständig empfangen wurde
  Then sehe ich den Bold-Text in Fettschrift
  And den Italic-Text in Kursivschrift
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Fehlerhafte Markdown-Syntax wird graceful behandelt
  Given ich befinde mich im Chat-Interface
  And Claude antwortet mit fehlerhafter Markdown-Syntax
  When die Nachricht vollständig empfangen wurde
  Then wird der Text trotzdem angezeigt
  And die Anwendung stürzt nicht ab
```

```gherkin
Scenario: XSS-Angriff über Markdown wird verhindert
  Given ich befinde mich im Chat-Interface
  And eine Nachricht enthält <script>alert('xss')</script>
  When die Nachricht gerendert wird
  Then wird das Script-Tag escaped
  And kein JavaScript wird ausgeführt
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: ui/src/utils/markdown-renderer.ts
- [ ] FILE_EXISTS: ui/src/components/chat-message.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: ui/src/components/chat-message.ts enthält "import" und "marked"
- [ ] CONTAINS: ui/src/components/chat-message.ts enthält "unsafeHTML"
- [ ] CONTAINS: ui/src/utils/markdown-renderer.ts enthält "highlight"

### Funktions-Prüfungen

- [ ] LINT_PASS: cd ui && npm run lint
- [ ] BUILD_PASS: cd ui && npm run build
- [ ] TYPE_CHECK: cd ui && npx tsc --noEmit

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | - |

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
- [x] Unit Tests geschrieben und bestanden
- [x] Integration Tests geschrieben und bestanden
- [x] Code Review durchgeführt und genehmigt

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
| Frontend | `ui/src/utils/markdown-renderer.ts` | NEU: Zentrale Markdown-Rendering-Utility |
| Frontend | `ui/src/components/chat-message.ts` | Refactor: renderContent() auf marked umstellen |

**Kritische Integration Points:** Keine (Frontend-only)

---

### Technical Details

**WAS:**
- Neue Utility `markdown-renderer.ts` für zentralisierte Markdown-Konfiguration
- Refactoring von `chat-message.ts` zur Nutzung von `marked` + `highlight.js`
- Entfernung der manuellen Markdown-Parsing-Logik in `renderContent()`
- Integration von `unsafeHTML` Lit-Directive für sicheres HTML-Rendering

**WIE (Architektur-Guidance ONLY):**
- Folge dem Pattern aus `aos-docs-viewer.ts` für marked-Konfiguration
- Nutze `unsafeHTML` Directive aus lit/directives/unsafe-html.js
- Konfiguriere marked mit GFM (gfm: true) und breaks: true für Chat-Kontext
- Custom Renderer für Code-Blöcke mit highlight.js Integration
- XSS-Prävention: marked sanitization aktivieren
- Keep renderContent() Methode, aber delegiere an neue Utility
- Behalte `createRenderRoot() { return this; }` Pattern (Light DOM)

**WO:**
- `ui/src/utils/markdown-renderer.ts` (NEU)
- `ui/src/components/chat-message.ts` (MODIFY)

**Abhängigkeiten:** None

**Geschätzte Komplexität:** M (Medium - 2 Dateien, ~150 LOC neu, ~50 LOC refactor)

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | agent-os/team/skills/frontend-lit.md | Lit Web Components Pattern |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
test -f ui/src/utils/markdown-renderer.ts && echo "✓ markdown-renderer.ts exists"
grep -q "import.*marked" ui/src/components/chat-message.ts && echo "✓ marked imported in chat-message"
grep -q "unsafeHTML" ui/src/components/chat-message.ts && echo "✓ unsafeHTML used"
grep -q "highlight" ui/src/utils/markdown-renderer.ts && echo "✓ highlight.js integrated"
cd ui && npm run lint
cd ui && npm run build
cd ui && npx tsc --noEmit
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
