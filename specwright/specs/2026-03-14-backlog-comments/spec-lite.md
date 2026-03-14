# Backlog Item Comments - Lite Summary

> Created: 2026-03-14
> Full Spec: @specwright/specs/2026-03-14-backlog-comments/spec.md

Trello-Style Kommentarfunktion für Backlog Items. Nutzer können Markdown-Kommentare mit Bildern erstellen, bearbeiten und löschen. Architektur folgt dem bewährten Attachment-System-Pattern (WebSocket Protocol → Server Handler → Lit Component).

## Key Points

- Comment CRUD via WebSocket (Pattern von attachment.protocol.ts)
- Markdown-Rendering + Bild-Upload (Drag & Drop + Button)
- Chronologische Darstellung mit Timestamps
- Comment-Count Badge auf Story Card
- Speicherung als comments.json im Attachment-Ordner
- Keine neuen Dependencies

## Quick Reference

- **Status**: Planning
- **Stories**: 6 Feature + 3 System
- **Dependencies**: Keine externen
- **Integration Type**: Full-stack (Backend + Frontend)

## Context Links

- Full Specification: @specwright/specs/2026-03-14-backlog-comments/spec.md
- Implementation Plan: @specwright/specs/2026-03-14-backlog-comments/implementation-plan.md
- Story Index: @specwright/specs/2026-03-14-backlog-comments/story-index.md
- Brainstorming: @specwright/brainstorming/2026-03-14-backlog-comments/session.md
