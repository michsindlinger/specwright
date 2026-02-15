# Story Index

> Spec: Chat Markdown Rendering
> Created: 2026-01-30
> Last Updated: 2026-01-30

## Overview

This document provides an overview of all user stories for the Chat Markdown Rendering specification.

**Total Stories**: 6
**Estimated Effort**: ~460 LOC

---

## Story Summary

| Story ID | Title | Type | Priority | Files | Complexity | Dependencies | Status |
|----------|-------|------|----------|-------|------------|--------------|--------|
| CMDR-001 | Markdown Parser Integration | Frontend | Critical | 2 | M | None | Ready |
| CMDR-002 | Markdown Styling | Frontend | High | 1 | S | CMDR-001 | Ready |
| CMDR-003 | Enhanced Copy Code Feature | Frontend | Medium | 3 | XS | CMDR-001 | Ready |
| CMDR-004 | Mermaid Integration | Frontend | High | 4 | S | CMDR-001 | Ready |
| CMDR-005 | Streaming Optimization | Frontend | High | 2 | S | CMDR-001 | Ready |
| CMDR-999 | Integration & E2E Validation | Test | High | 0 | S | All | Ready |

---

## Story Size Validation

| Story ID | Files | Complexity | Integration Type | Status |
|----------|-------|------------|------------------|--------|
| CMDR-001 | 2 | M | Frontend-only | PASS |
| CMDR-002 | 1 | S | Frontend-only | PASS |
| CMDR-003 | 3 | XS | Frontend-only | PASS |
| CMDR-004 | 4 | S | Frontend-only | PASS |
| CMDR-005 | 2 | S | Frontend-only | PASS |
| CMDR-999 | 0 | S | Test | PASS |

**Story Size Validation:** PASSED
- Alle Stories halten die Größenvorgaben ein:
  - Max 5 Dateien: Alle Stories im Limit
  - Komplexität max M: Alle Stories im Limit
  - Keine L oder XL Stories

---

## Dependency Graph

```
CMDR-001 (Markdown Parser Integration) - Foundation
    │
    ├──► CMDR-002 (Markdown Styling)
    │
    ├──► CMDR-003 (Enhanced Copy Code)
    │
    ├──► CMDR-004 (Mermaid Integration)
    │
    └──► CMDR-005 (Streaming Optimization)
              │
              ▼
         CMDR-999 (Integration & E2E Validation)
```

---

## Execution Plan

### Phase 1: Foundation (Sequential - MUST complete first)
1. **CMDR-001**: Markdown Parser Integration
   - Creates: `ui/src/utils/markdown-renderer.ts`
   - Modifies: `ui/src/components/chat-message.ts`
   - Complexity: M (~150 LOC)

### Phase 2: Features (Parallel - after CMDR-001)

Diese Stories können parallel ausgeführt werden:

- **CMDR-002**: Markdown Styling
  - Modifies: `ui/src/styles/theme.css`
  - Complexity: S (~100 LOC)

- **CMDR-003**: Enhanced Copy Code Feature
  - Modifies: markdown-renderer.ts, chat-message.ts, theme.css
  - Complexity: XS (~50 LOC)

- **CMDR-004**: Mermaid Integration
  - Adds: mermaid dependency
  - Modifies: markdown-renderer.ts, chat-message.ts, theme.css
  - Complexity: S (~80 LOC)

- **CMDR-005**: Streaming Optimization
  - Modifies: chat-message.ts, markdown-renderer.ts
  - Complexity: S (~80 LOC)

### Phase 3: Validation (Sequential - after all above)
1. **CMDR-999**: Integration & E2E Validation
   - Verifies: All integrations work together
   - Complexity: S (validation only)

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-markdown-parser-integration.md`
- `stories/story-002-markdown-styling.md`
- `stories/story-003-enhanced-copy-code.md`
- `stories/story-004-mermaid-integration.md`
- `stories/story-005-streaming-optimization.md`
- `stories/story-999-integration-e2e-validation.md`

---

## Blocked Stories

*No stories are currently blocked. All DoR checkboxes are complete.*

---

## Technical Notes

### Existierende Infrastruktur
- `marked` v17.0.1 - bereits installiert
- `highlight.js` v11.11.1 - bereits installiert
- `aos-docs-viewer.ts` - Referenz für Konfiguration

### Neue Dependencies
- `mermaid` - für Diagramm-Rendering (CMDR-004)

### Hauptdateien
- `ui/src/utils/markdown-renderer.ts` - NEU (zentrale Rendering-Logik)
- `ui/src/components/chat-message.ts` - Refactoring
- `ui/src/styles/theme.css` - Erweiterung

### CSS Custom Properties
Alle Styles nutzen existierende CSS Custom Properties:
- `--color-*` für Farben
- `--spacing-*` für Abstände
- `--radius-*` für Rundungen
- `--font-*` für Typografie
