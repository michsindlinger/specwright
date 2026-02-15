# Kanban In Review Column - Lite Summary

> Created: 2026-02-12
> Full Spec: agent-os/specs/2026-02-12-kanban-in-review-column/spec.md

Erweiterung des Kanban-Boards um eine "In Review"-Spalte zwischen "In Progress" und "Done". Stories werden nach Workflow-Abschluss automatisch auf "in_review" gesetzt. Benutzer kann Stories per Drag&Drop genehmigen (Done) oder zur Nacharbeit zurückweisen (In Progress). Full-Stack: kanban.json, MCP Tool, Frontend UI.

## Key Points

- Neue "In Review" Spalte zwischen In Progress und Done
- kanban_complete_story setzt auf "in_review" statt "done"
- Neues MCP Tool kanban_approve_story (in_review → done)
- Drag&Drop: in_review → done (Approve), in_review → in_progress (Reject)
- Backward Compatible - bestehende Specs funktionieren weiterhin

## Quick Reference

- **Status**: Planning
- **Stories**: 4 regulär + 3 System
- **Dependencies**: Keine externen Dependencies
- **Integration Type**: Full-stack (Backend + MCP + Frontend)

## Context Links

- Full Specification: agent-os/specs/2026-02-12-kanban-in-review-column/spec.md
- Implementation Plan: agent-os/specs/2026-02-12-kanban-in-review-column/implementation-plan.md
- Story Index: agent-os/specs/2026-02-12-kanban-in-review-column/story-index.md
