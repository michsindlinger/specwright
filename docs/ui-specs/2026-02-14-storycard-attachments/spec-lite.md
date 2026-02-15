# Storycard Attachments - Lite Summary

> Created: 2026-02-14
> Full Spec: agent-os/specs/2026-02-14-storycard-attachments/spec.md

Bilder und Dateien (Bilder, PDF, TXT, JSON, MD) an bestehende Storycards in Spec-Kanban-Boards und Backlog anhängen. Attachments werden lokal gespeichert, in der Story-Markdown referenziert und vom AI-Agent bei der Ausführung eingelesen. Nutzt bestehende Upload-Patterns aus Quick-ToDo wieder.

## Key Points

- Attachment-Upload via File Picker, Drag & Drop und Clipboard Paste
- Büroklammer-Icon mit Anzahl auf jeder Storycard
- Inline-Preview für Bilder, PDFs und Text-Dateien
- WebSocket-basierte Backend-API für CRUD-Operationen
- Pfade relativ zum Projekt-Root in Story-Markdown für Agent-Zugriff

## Quick Reference

- **Status**: Planning
- **Timeline**: 5 Stories + 3 System Stories
- **Dependencies**: Keine externen Abhängigkeiten
- **Team Members**: dev-team__frontend-developer, dev-team__backend-developer

## Context Links

- Full Specification: agent-os/specs/2026-02-14-storycard-attachments/spec.md
- Story Index: agent-os/specs/2026-02-14-storycard-attachments/story-index.md
- Implementation Plan: agent-os/specs/2026-02-14-storycard-attachments/implementation-plan.md
