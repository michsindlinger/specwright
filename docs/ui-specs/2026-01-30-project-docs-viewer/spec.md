# Project Docs Viewer/Editor - Specification

> Spec ID: PDOC
> Created: 2026-01-30
> Status: Ready for Technical Refinement

## Overview

Ein integrierter Dokument-Viewer und Editor für Projekt-Dokumentation (`agent-os/product/`) direkt im Dashboard, mit dem Benutzer die wichtigsten Product- oder Platform-Dokumente eines Projekts einsehen und bearbeiten können.

## User Stories

| ID | Title | Type | Priority |
|----|-------|------|----------|
| PDOC-001 | Backend Docs API | Backend | Critical |
| PDOC-002 | Docs Sidebar Component | Frontend | High |
| PDOC-003 | Docs Viewer Component | Frontend | High |
| PDOC-004 | Docs Editor Component | Frontend | High |
| PDOC-005 | Dashboard Integration | Frontend | High |
| PDOC-999 | Integration & E2E Validation | Test | Medium |

## Spec Scope

**Included:**
- Markdown-Dateien aus `agent-os/product/` lesen und anzeigen
- Markdown-Dateien bearbeiten und speichern
- Syntax-Highlighting im Markdown-Editor
- Gerenderte Markdown-Vorschau
- Datei-Navigation via Sidebar
- Ungespeicherte-Änderungen-Warnung mit Bestätigungsdialog
- Integration in Dashboard als "Docs" Tab

**Excluded:**
- Neue Dateien erstellen
- Dateien löschen oder umbenennen
- Ordner-Navigation (nur `agent-os/product/`)
- YAML/JSON Dateien bearbeiten
- Bilder-Upload oder Einbettung
- Collaborative Editing
- Version History / Git Integration
- Datei-Suche innerhalb von Dokumenten

## Expected Deliverables

1. **Backend API:** Endpunkte für Docs-Listing und CRUD
2. **Docs Sidebar:** Dateiliste mit Navigation
3. **Docs Viewer:** Gerenderte Markdown-Ansicht
4. **Docs Editor:** Markdown-Editor mit Syntax-Highlighting
5. **Dashboard Integration:** Neuer "Docs" Tab im Dashboard

## Integration Requirements

**Integration Type:** Full-stack

**Integration Test Commands:**
```bash
# Backend Docs API responds
curl -s http://localhost:3001/api/projects/test-project/docs | grep -q "files"

# Frontend builds without errors
npm run build

# Docs endpoint returns list of markdown files
curl -s http://localhost:3001/api/projects/test-project/docs | jq '.files | length'

# Single doc can be read
curl -s http://localhost:3001/api/projects/test-project/docs/roadmap.md | grep -q "content"
```

**End-to-End Scenarios:**
1. User wählt Projekt → Dashboard öffnet → Docs-Tab sichtbar
2. User klickt auf Docs-Tab → Sidebar zeigt Dateiliste
3. User wählt Dokument → Viewer zeigt gerendertes Markdown
4. User klickt Edit → Editor öffnet mit Syntax-Highlighting
5. User ändert Text → Speichern → Änderungen persistiert
6. User versucht zu wechseln ohne zu speichern → Warnung erscheint

**MCP Requirements:**
- Playwright MCP: Optional für E2E Browser-Tests
