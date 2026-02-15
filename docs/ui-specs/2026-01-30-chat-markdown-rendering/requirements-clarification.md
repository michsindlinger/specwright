# Requirements Clarification - Chat Markdown Rendering

**Created:** 2026-01-30
**Status:** Approved

## Feature Overview

Die Chat-Antworten von Claude sollen vollständig als Markdown gerendert werden, anstatt als Rohtext angezeigt zu werden. Aktuell werden Tabellen, Listen, Headings und andere Formatierungen nicht korrekt dargestellt.

## Target Users

- Entwickler die Agent OS Web UI nutzen
- Benutzer die mit Claude Code über das Chat-Interface interagieren

## Business Value

- **Lesbarkeit:** Strukturierte Antworten (Tabellen, Listen, Code) werden visuell klar dargestellt
- **Produktivität:** Informationen können schneller erfasst werden
- **Konsistenz:** Markdown-Rendering wie im Docs-Viewer bereits implementiert
- **UX-Verbesserung:** Professionelles Erscheinungsbild der Chat-Oberfläche

## Functional Requirements

### Markdown-Elemente (Komplett-Support)

**Basis:**
- Headings (H1-H6)
- Bold (`**text**`)
- Italic (`*text*`)
- Links (`[text](url)`)
- Line breaks

**Erweitert:**
- Ungeordnete Listen (`- item`)
- Geordnete Listen (`1. item`)
- Nested Lists
- Tabellen (GFM-Style mit `|`)
- Blockquotes (`> quote`)
- Horizontal Rules (`---`)
- Code-Blöcke mit Syntax-Highlighting
- Inline-Code

**Speziell:**
- Emojis (✅, ❌, 📊 etc.) - native Darstellung
- Mermaid-Diagramme (Flowcharts, Sequenzdiagramme)
- Gherkin-Syntax-Highlighting für BDD-Szenarien

### Syntax-Highlighting

- Dark Theme passend zum Moltbot-Style
- Sprachen: TypeScript, JavaScript, Bash, Python, JSON, YAML, Markdown, Gherkin
- Automatische Spracherkennung als Fallback

### Copy-Funktion

- Copy-Button pro Code-Block
- Visuelles Feedback bei erfolgreichem Kopieren

## Affected Areas & Dependencies

- `ui/src/components/chat-message.ts` - **Hauptänderung**: Markdown-Rendering integrieren
- `ui/src/styles/theme.css` - Styling für Markdown-Elemente im Chat
- `marked` (bereits installiert v17.0.1) - Markdown-Parsing
- `highlight.js` (bereits installiert v11.11.1) - Syntax-Highlighting
- `mermaid` (**NEU zu installieren**) - Diagramm-Rendering
- `aos-docs-viewer.ts` - **Referenz**: Konfiguration kann wiederverwendet werden

## Edge Cases & Error Scenarios

- **Malformed Markdown:** Graceful degradation - Text wird angezeigt auch wenn Parsing fehlschlägt
- **Sehr lange Code-Blöcke:** Scrollbar innerhalb des Code-Blocks
- **Ungültige Mermaid-Syntax:** Fehlermeldung im Diagramm-Bereich statt Crash
- **XSS-Prevention:** HTML in Markdown wird escaped (außer explizit erlaubte Tags)
- **Streaming:** Markdown wird während des Streamings progressiv gerendert

## Security & Permissions

- **XSS-Schutz:** `marked` mit sanitization konfigurieren
- **Keine externen Links automatisch öffnen:** Links in neuem Tab mit `rel="noopener"`
- **Code-Blöcke:** Nur Syntax-Highlighting, keine Code-Ausführung

## Performance Considerations

- **Lazy Rendering:** Mermaid-Diagramme nur rendern wenn im Viewport
- **Debouncing:** Bei Streaming nicht bei jedem Character neu rendern
- **Caching:** Gerenderten HTML-Output cachen wenn Content sich nicht ändert

## Scope Boundaries

**IN SCOPE:**
- Markdown-Rendering für Claude-Antworten im Chat
- Syntax-Highlighting für Code-Blöcke
- Mermaid-Diagramm-Rendering
- Copy-Button für Code-Blöcke
- Dark Theme Styling
- Emoji-Support

**OUT OF SCOPE:**
- User-Eingaben (bleiben Plain-Text)
- Tool-Outputs (separate Betrachtung)
- Docs-Viewer Änderungen (funktioniert bereits)
- Light Theme Support
- Markdown-Editor (WYSIWYG)

## Open Questions (if any)

- Keine offenen Fragen - alle Requirements sind geklärt

## Proposed User Stories (High Level)

1. **Markdown Parser Integration** - `marked` + `highlight.js` in chat-message.ts integrieren
2. **Markdown Styling** - CSS-Styles für alle Markdown-Elemente im Chat-Kontext
3. **Copy Code Feature** - Copy-Button mit visuellem Feedback verbessern
4. **Mermaid Integration** - Mermaid-Bibliothek hinzufügen und Diagramme rendern
5. **Streaming Optimization** - Debouncing und progressive Rendering bei Live-Antworten
6. **Integration & E2E Validation** - Gesamtintegration testen

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
