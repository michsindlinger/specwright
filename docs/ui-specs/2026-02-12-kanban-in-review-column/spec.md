# Spec Requirements Document

> Spec: Kanban In Review Column
> Created: 2026-02-12
> Status: Planning

## Overview

Erweiterung des Kanban-Boards einer Spezifikation um eine neue "In Review"-Spalte zwischen "In Progress" und "Done". Nach Abschluss einer Story durch `/execute-tasks` wird diese auf "in_review" gesetzt, sodass der Benutzer sie prüfen und manuell auf "Done" schieben (Genehmigung) oder zurück auf "In Progress" schieben kann (Rückweisung zur Nacharbeit).

Das Feature umfasst die Full-Stack Integration: kanban.json Schema-Erweiterung, MCP Kanban Tool Anpassung (`kanban_complete_story` → in_review, neues `kanban_approve_story`), Frontend Kanban-Board UI mit neuer Spalte und Drag&Drop-Transitionen.

## User Stories

See: stories/ directory
- KIRC-001: Backend Schema: In Review Status Mapping
- KIRC-002: MCP Kanban Tool Anpassung
- KIRC-003: Frontend Kanban-Board: In Review Spalte
- KIRC-004: Story-Status-Transitionen für In Review
- KIRC-997: Code Review (System)
- KIRC-998: Integration Validation (System)
- KIRC-999: Finalize PR (System)

## Spec Scope

- Neue "In Review" Spalte im Kanban-Board UI (zwischen In Progress und Done)
- kanban.json: `in_review` als eigenständiger Frontend-Status (Backend-Schema hat ihn bereits)
- MCP Kanban Tool: `kanban_complete_story` setzt auf `in_review`, neues `kanban_approve_story` Tool
- boardStatus-Statistiken mit inReview Counter
- Story-Status-Flow: in_progress → in_review → done / in_review → in_progress
- Drag&Drop-Transitionen: in_review → done (Approve), in_review → in_progress (Reject)
- Backward Compatibility für bestehende Specs

## Out of Scope

- Diff-Preview in der Review-Ansicht
- Kommentar-/Notiz-Funktion für Review-Feedback
- Eigene Review-Übersichtsseite (bestehendes Kanban-Board reicht)
- Automatische Benachrichtigungen bei Review-Bedarf
- Review-History oder Audit-Trail

## Expected Deliverable

- Kanban-Board zeigt 5 Spalten: Backlog, In Progress, In Review, Done, Blocked
- Stories werden nach Workflow-Abschluss automatisch in "In Review" platziert
- Benutzer kann Stories per Drag&Drop genehmigen (→ Done) oder zurückweisen (→ In Progress)
- MCP Tool `kanban_approve_story` funktioniert für manuelle Genehmigung
- Bestehende Specs funktionieren weiterhin (Backward Compatibility)

## Integration Requirements

> Diese Integration Tests werden automatisch nach Abschluss aller Stories ausgeführt.

**Integration Type:** Full-stack

- [x] **Integration Test 1:** TypeScript Frontend Compilation
  - Command: `cd agent-os-ui/ui && npx tsc --noEmit`
  - Validates: Frontend-Code kompiliert fehlerfrei mit neuen Types
  - Requires MCP: no
  - Result: PASSED (nur pre-existente Fehler, keine neuen durch KIRC)

- [x] **Integration Test 2:** TypeScript Backend Compilation
  - Command: `cd agent-os-ui && npx tsc --noEmit`
  - Validates: Backend-Code kompiliert fehlerfrei
  - Requires MCP: no
  - Result: PASSED (0 errors)

**Integration Scenarios:**
- [x] Scenario 1: Story wird via MCP abgeschlossen → Status "in_review" → User genehmigt per Drag&Drop → Status "done" — VALIDIERT
- [x] Scenario 2: Story wird abgeschlossen → Status "in_review" → User weist zurück → Status "in_progress" → Re-Execute möglich — VALIDIERT

## Spec Documentation

- Requirements: agent-os/specs/2026-02-12-kanban-in-review-column/requirements-clarification.md
- Implementation Plan: agent-os/specs/2026-02-12-kanban-in-review-column/implementation-plan.md
- Story Index: agent-os/specs/2026-02-12-kanban-in-review-column/story-index.md
