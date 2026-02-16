# Branch-per-Story Backlog - Lite Summary

> Created: 2026-02-16
> Full Spec: specwright/specs/2026-02-16-branch-per-story-backlog/spec.md

Beim Backlog Auto-Modus in der UI wird pro Story automatisch ein separater Feature Branch von `main` erstellt, die Story darauf ausgeführt, ein PR erstellt und zurück auf `main` gewechselt. Fehlerhafte Stories werden übersprungen, der Branch bleibt bestehen.

## Key Points

- Branch-per-Story: `feature/{story-slug}` von `main` pro Backlog-Story
- Automatischer PR pro Story (nicht auto-gemergt)
- Skip & Continue bei Fehlern (Branch + PR bleiben bestehen)
- Backlog = immer Branch-Strategie (keine Abfrage)
- Spec-Execution bleibt komplett unverändert

## Quick Reference

- **Status**: Planning
- **Stories**: 3 reguläre + 3 System Stories
- **Dependencies**: Bestehende GitService, WorkflowExecutor, WebSocket Handler
- **Betroffene Dateien**: git.service.ts, workflow-executor.ts, websocket.ts, dashboard-view.ts

## Context Links

- Full Specification: specwright/specs/2026-02-16-branch-per-story-backlog/spec.md
- Implementation Plan: specwright/specs/2026-02-16-branch-per-story-backlog/implementation-plan.md
- Story Index: specwright/specs/2026-02-16-branch-per-story-backlog/story-index.md
