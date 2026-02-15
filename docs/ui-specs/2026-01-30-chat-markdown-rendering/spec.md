# Chat Markdown Rendering Specification

> Spec ID: CMDR
> Created: 2026-01-30
> Last Updated: 2026-01-30
> Status: Ready for Execution

---

## Overview

Vollständige Markdown-Rendering-Unterstützung für Claude-Antworten im Chat-Interface. Die existierenden Bibliotheken `marked` und `highlight.js` werden in die `chat-message.ts` Komponente integriert, ergänzt durch Mermaid-Diagramm-Support und optimiertes Streaming.

## User Stories

| Story ID | Title | Type | Priority |
|----------|-------|------|----------|
| CMDR-001 | Markdown Parser Integration | Frontend | Critical |
| CMDR-002 | Markdown Styling | Frontend | High |
| CMDR-003 | Enhanced Copy Code Feature | Frontend | Medium |
| CMDR-004 | Mermaid Integration | Frontend | High |
| CMDR-005 | Streaming Optimization | Frontend | High |
| CMDR-999 | Integration & E2E Validation | Test | High |

## Spec Scope

**Included:**
- Markdown-Rendering für Claude-Antworten (Assistant-Messages)
- GitHub Flavored Markdown (GFM) Support
- Syntax-Highlighting mit Dark Theme
- Mermaid-Diagramme (Flowcharts, Sequenzdiagramme)
- Copy-Button für Code-Blöcke
- Emoji-Support (native Darstellung)
- Progressive Rendering während Streaming

**Out of Scope:**
- User-Eingaben (bleiben Plain-Text)
- Tool-Outputs Rendering
- Docs-Viewer Änderungen
- Light Theme Support
- Markdown-Editor (WYSIWYG)

## Expected Deliverable

Nach Abschluss aller Stories:
1. Claude-Antworten werden als formatiertes Markdown angezeigt
2. Tabellen, Listen, Headings sind korrekt gerendert
3. Code-Blöcke haben Syntax-Highlighting mit Dark Theme
4. Mermaid-Diagramme werden visuell dargestellt
5. Copy-Button funktioniert mit visuellem Feedback
6. Streaming-Antworten werden progressiv gerendert ohne Flackern

## Integration Requirements

**Integration Type:** Frontend-only

**Integration Test Commands:**
```bash
# 1. Build-Prüfung
cd ui && npm run build

# 2. Lint-Prüfung
cd ui && npm run lint

# 3. TypeScript Type Check
cd ui && npx tsc --noEmit

# 4. Mermaid Dependency Check
cd ui && npm ls mermaid
```

**End-to-End Scenarios:**

1. **Markdown Rendering Flow:**
   - User sendet Nachricht
   - Claude antwortet mit Markdown (Tabelle, Liste, Code)
   - Antwort wird korrekt formatiert angezeigt
   - Requires MCP: Optional (Playwright für visual verification)

2. **Code Block Interaction:**
   - Claude antwortet mit Code-Block
   - Syntax-Highlighting ist aktiv
   - Copy-Button kopiert Code in Zwischenablage
   - Requires MCP: No

3. **Mermaid Diagram Flow:**
   - Claude antwortet mit Mermaid-Syntax
   - Diagramm wird visuell gerendert
   - Bei ungültiger Syntax: Fehlermeldung statt Crash
   - Requires MCP: Optional (Playwright)

4. **Streaming Message:**
   - Claude beginnt zu antworten
   - Markdown wird progressiv gerendert
   - Keine Flacker-Effekte während Streaming
   - Requires MCP: Optional (Playwright)

---

## Technical Architecture

### Betroffene Komponenten

| Layer | Komponente | Änderung |
|-------|------------|----------|
| Frontend | `ui/src/components/chat-message.ts` | Markdown-Rendering integrieren |
| Frontend | `ui/src/styles/theme.css` | Markdown-Styles hinzufügen |
| Frontend | `ui/src/utils/markdown-renderer.ts` (NEU) | Zentrale Rendering-Logik |
| Frontend | `ui/package.json` | Mermaid Dependency |

### Existierende Infrastruktur

- `marked` v17.0.1 - bereits installiert
- `highlight.js` v11.11.1 - bereits installiert
- `aos-docs-viewer.ts` - Referenz für Konfiguration

### Neue Dependencies

- `mermaid` - Für Diagramm-Rendering

---

*Detailed stories in `stories/` directory*
