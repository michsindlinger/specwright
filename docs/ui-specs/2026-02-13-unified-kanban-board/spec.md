# Spec Requirements Document

> Spec: Unified Kanban Board
> Created: 2026-02-13
> Status: Ready for Execution

## Overview

Die bestehende `aos-kanban-board` Komponente wird generisch gemacht (via `mode` Property und Feature-Flag Properties), sodass sie sowohl für Spec-Kanbans als auch für den Backlog-View verwendet werden kann. Inline Backlog-Rendering in `dashboard-view.ts` wird durch die wiederverwendete Kanban-Komponente ersetzt. Der Backlog erhält alle 5 Spalten und nutzt die gleiche `aos-story-card` Komponente.

## User Stories

1. UKB-001: StoryInfo Interface vereinheitlichen
2. UKB-002: Kanban Board Properties und Conditional Rendering
3. UKB-003: Backend Backlog-Datenmodell erweitern
4. UKB-004: Dashboard Backlog-Rendering durch aos-kanban-board ersetzen
5. UKB-005: Event-Routing und Auto-Mode Integration
6. UKB-006: CSS Cleanup

## Spec Scope

- aos-kanban-board generisch machen (mode: spec | backlog)
- Backlog-Datenmodell an StoryInfo angleichen (dorComplete, dependencies)
- Inline-Backlog-Code aus dashboard-view.ts entfernen
- Spec-Features optional per Property steuern (showChat, showSpecViewer, etc.)
- Backlog-Items mit aos-story-card rendern
- Alle 5 Spalten (Backlog, Blocked, In Progress, In Review, Done) für Backlog

## Out of Scope

- Neue Features für das Kanban-Board (Swimlanes, Filter, etc.)
- Änderung der Spec-Kanban-Funktionalität
- Änderungen am WebSocket-Protokoll
- Backlog-Story-Detail-View
- Drag&Drop zwischen Spec-Board und Backlog-Board

## Expected Deliverable

- Generisches `aos-kanban-board` mit `mode` Property
- Backlog-View nutzt `aos-kanban-board` statt Inline-Rendering
- Einheitliches visuelles Erscheinungsbild
- Ca. 410 Zeilen Code-Reduktion in dashboard-view.ts
- Alle bestehenden Spec-Kanban-Features unverändert

## Integration Requirements

**Integration Type:** Full-stack

- [ ] **Integration Test 1:** Backlog-Kanban rendert mit 5 Spalten
   - Command: `cd agent-os-ui/ui && npx tsc --noEmit`
   - Validates: TypeScript Compilation ohne Fehler
   - Requires MCP: no

- [ ] **Integration Test 2:** Spec-Kanban funktioniert unverändert
   - Command: `cd agent-os-ui/ui && npx tsc --noEmit`
   - Validates: Keine Regression in bestehender Funktionalität
   - Requires MCP: no

- [ ] **Integration Test 3:** Backlog Story-Cards werden korrekt gerendert
   - Command: `cd agent-os-ui && npm run build`
   - Validates: Build erfolgreich
   - Requires MCP: no

**Integration Scenarios:**
- [ ] Scenario 1: User öffnet Backlog-Tab und sieht ein 5-Spalten Kanban-Board mit aos-story-card Komponenten
- [ ] Scenario 2: User draggt Backlog-Item zu In Progress - Story-Execution wird gestartet (backlog.story.start)
- [ ] Scenario 3: User öffnet Spec-Kanban - alle bestehenden Features (Chat, Spec-Viewer, Auto-Mode) funktionieren wie vorher

## Spec Documentation

- Requirements: agent-os/specs/2026-02-13-unified-kanban-board/requirements-clarification.md
- Implementation Plan: agent-os/specs/2026-02-13-unified-kanban-board/implementation-plan.md
- Story Index: agent-os/specs/2026-02-13-unified-kanban-board/story-index.md
