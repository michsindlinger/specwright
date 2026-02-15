# Unified Kanban Board - Lite Summary

> Created: 2026-02-13
> Full Spec: agent-os/specs/2026-02-13-unified-kanban-board/spec.md

Die `aos-kanban-board` Komponente wird generisch gemacht, sodass sie sowohl Spec-Kanbans als auch den Backlog-View bedient. Inline Backlog-Rendering wird ersetzt, der Backlog erhält alle 5 Spalten und nutzt die gleiche `aos-story-card` Komponente.

## Key Points

- Generische `aos-kanban-board` mit `mode` Property (spec | backlog)
- Feature-Flag Properties (showChat, showSpecViewer, showGitStrategy, showAutoMode)
- Backend liefert erweitertes Backlog-Datenmodell (dorComplete, dependencies)
- Ca. 410 Zeilen Code-Reduktion durch Entfernung von Inline-Rendering
- Keine Regression für bestehende Spec-Kanban-Features

## Quick Reference

- **Status**: Ready for Execution
- **Stories**: 6 (+ 3 System Stories)
- **Dependencies**: Keine externen
- **Prefix**: UKB
