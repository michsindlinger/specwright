# Spec Requirements Document

> Spec: File Editor
> Created: 2026-02-16
> Status: Planning

## Overview

Ein integrierter File Editor für die Specwright Web UI, der Entwicklern ermöglicht, Projektdateien direkt in der UI zu browsen und zu bearbeiten. Das Feature kombiniert eine Dateibaum-Sidebar (Overlay von links) mit einem Multi-Tab Code-Editor auf Basis von CodeMirror 6. Alle Datei-Operationen (Lesen, Schreiben, Erstellen, Umbenennen, Löschen) laufen über das bestehende WebSocket-Protokoll.

## User Stories

1. **FE-001: Backend File API** - REST/WebSocket-Endpoints für Datei-Operationen
2. **FE-002: File Tree Component** - Dateibaum-Komponente mit Tree-View und Lazy-Loading
3. **FE-003: File Tree Sidebar** - Overlay-Sidebar mit Toggle-Button im Header
4. **FE-004: Code Editor Component** - CodeMirror-Integration als Lit Web Component
5. **FE-005: Tab Management** - Multi-Tab-System mit Unsaved-Changes-Handling
6. **FE-006: Context Menu & File Operations** - Kontextmenü für CRUD-Operationen im Dateibaum
7. **FE-007: Integration, Edge Cases & Polish** - Gesamtintegration, Edge-Case-Handling, optionale Features

See: stories/ directory for individual story files.

## Spec Scope

- Dateibaum mit Tree-View des gesamten Projektverzeichnisses
- Overlay-Sidebar mit Toggle im Header (von links)
- Code-Editor mit Syntax-Highlighting (CodeMirror 6)
- Multi-Tab-Support mit Unsaved-Changes-Indikator
- CRUD-Operationen für Dateien und Ordner (Erstellen, Umbenennen, Löschen)
- Manuelles Speichern (Ctrl+S / Save-Button)
- Kontextmenü im Dateibaum (Rechtsklick)
- Unsaved-Changes-Warnung beim Schließen
- Path-Traversal-Schutz im Backend
- Binärdatei-Erkennung mit Hinweis
- Dateigrößen-Limit (5 MB)

## Out of Scope

- Bild-Anzeige/Preview
- Git-Integration (Diff-View, Commit aus Editor)
- Terminal/Konsole in der UI
- Collaborative Editing (Multi-User)
- Datei-Upload von extern
- Dateien außerhalb des Projektverzeichnisses
- Erweiterte Editor-Features (Find & Replace, Minimap, etc.)

## Expected Deliverable

Ein vollständig funktionaler File Editor in der Specwright Web UI mit:
- Dateibaum-Navigation als Overlay-Sidebar von links
- Code-Editor mit Syntax-Highlighting für alle gängigen Sprachen
- Multi-Tab-System mit Unsaved-Changes-Handling
- CRUD-Operationen via Kontextmenü
- Backend File Service mit Sicherheitsschutz
- Integration in die bestehende UI-Architektur

## Integration Requirements

**Integration Type:** Full-stack

- [ ] **Integration Test 1:** Backend File Service antwortet auf WebSocket-Messages
   - Command: `cd ui && npm test -- --grep "file"`
   - Validates: FileService und FileHandler funktionieren korrekt
   - Requires MCP: no

- [ ] **Integration Test 2:** Frontend-Build kompiliert fehlerfrei mit neuen Komponenten
   - Command: `cd ui/frontend && npm run build`
   - Validates: Alle neuen Lit-Komponenten kompilieren
   - Requires MCP: no

- [ ] **Integration Test 3:** Dateibaum lädt Projektverzeichnis und zeigt Dateien an
   - Command: `MCP_PLAYWRIGHT: Navigate to http://localhost:5173, click file tree toggle, verify tree renders`
   - Validates: End-to-End Dateibaum-Anzeige
   - Requires MCP: yes (Playwright)

- [ ] **Integration Test 4:** Datei öffnen, bearbeiten und speichern
   - Command: `MCP_PLAYWRIGHT: Open file from tree, edit content, save, verify content persisted`
   - Validates: End-to-End Edit-Save-Flow
   - Requires MCP: yes (Playwright)

**Integration Scenarios:**
- [ ] Scenario 1: Nutzer öffnet Sidebar, navigiert zum Dateibaum, öffnet eine Datei, bearbeitet sie und speichert
- [ ] Scenario 2: Nutzer erstellt eine neue Datei via Kontextmenü, bearbeitet sie, und sieht sie im Dateibaum
- [ ] Scenario 3: Nutzer hat ungespeicherte Änderungen, versucht Tab zu schließen, wird gewarnt

## Spec Documentation

- Requirements: @specwright/specs/2026-02-16-file-editor/requirements-clarification.md
- Implementation Plan: @specwright/specs/2026-02-16-file-editor/implementation-plan.md
- Story Index: @specwright/specs/2026-02-16-file-editor/story-index.md
- Kanban: @specwright/specs/2026-02-16-file-editor/kanban.json
