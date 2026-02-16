# File Editor - Lite Summary

> Created: 2026-02-16
> Full Spec: @specwright/specs/2026-02-16-file-editor/spec.md

Ein integrierter File Editor für die Specwright Web UI, der Entwicklern ermöglicht, Projektdateien direkt in der UI zu browsen, anzuzeigen und zu bearbeiten - ohne den Kontextwechsel zu einem externen Editor.

## Key Points

- Dateibaum-Sidebar als Overlay von links, Toggle-bar via Header-Button
- Code-Editor basierend auf CodeMirror 6 (bereits im Projekt) mit automatischem Syntax-Highlighting
- Multi-Tab-Support mit Unsaved-Changes-Warnung
- CRUD-Operationen (Erstellen, Umbenennen, Löschen) via Kontextmenü
- Backend File Service über WebSocket-Protokoll mit Path-Traversal-Schutz

## Quick Reference

- **Status**: Planning
- **Stories**: 7 Feature Stories + 3 System Stories
- **Dependencies**: Keine externen Dependencies (CodeMirror bereits installiert)
- **Integration Type**: Full-stack (Backend + Frontend)

## Context Links

- Full Specification: @specwright/specs/2026-02-16-file-editor/spec.md
- Requirements: @specwright/specs/2026-02-16-file-editor/requirements-clarification.md
- Implementation Plan: @specwright/specs/2026-02-16-file-editor/implementation-plan.md
- Story Index: @specwright/specs/2026-02-16-file-editor/story-index.md
