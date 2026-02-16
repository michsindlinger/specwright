# Spec Requirements Document

> Spec: Branch-per-Story Backlog
> Created: 2026-02-16
> Status: Planning

## Overview

Beim Ausführen von Backlog Stories im Auto-Modus (UI Kanban Board) soll pro Story automatisch ein separater Feature Branch `feature/{story-slug}` von `main` erstellt, die Story darauf ausgeführt, ein PR erstellt und anschließend auf `main` zurückgewechselt werden. Bei Fehlern wird die Story übersprungen, der Branch bleibt bestehen, und die nächste Story startet auf einem neuen Branch von `main`.

Dieses Feature betrifft ausschließlich den Backlog-Execution-Pfad in der UI -- der Spec-Execution-Flow bleibt unverändert.

## User Stories

See: specwright/specs/2026-02-16-branch-per-story-backlog/story-index.md

- BPS-001: Git-Service-Erweiterungen
- BPS-002: Backlog-Story-Lifecycle im Workflow-Executor
- BPS-003: WebSocket + Frontend Integration und Error-Handling

## Spec Scope

- Branch-per-Story Logik im execute-tasks Backlog-Pfad (UI Auto-Mode)
- Automatische PR-Erstellung pro Story via `gh pr create`
- Branch-Wechsel zurück auf `main` nach jeder Story
- Fehlerbehandlung: Skip & Continue (Branch behalten bei Fehlern)
- Branch-Naming: `feature/{story-slug}`
- Git-Strategie für Backlog: immer Branch (keine User-Abfrage)

## Out of Scope

- Änderungen am Spec-Execution-Flow (ein Branch pro Spec bleibt)
- UI-Änderungen (Auto-Toggle existiert bereits)
- CLI-Unterstützung (nur UI-Feature)
- Automatisches PR-Merging
- Worktree-Strategie für Backlog
- System Stories (997-999) für Backlog-Items
- Git-Strategie-Abfrage beim Backlog

## Expected Deliverable

Ein funktionaler Branch-per-Story Lifecycle im Backlog Auto-Modus mit:
- Pro Story: Branch von main erstellen -> Story ausführen -> PR erstellen -> zurück auf main
- Fehlerfall: Story überspringen, Branch + PR behalten, nächste Story starten
- Keine UI-Änderung nötig (Auto-Toggle existiert)
- Spec-Execution komplett unberührt
- Lint-frei, Build-erfolgreich, Tests bestanden

## Integration Requirements

> Diese Integration Tests werden automatisch nach Abschluss aller Stories ausgeführt.

**Integration Type:** Full-stack (Backend + Frontend)

- [ ] **Integration Test 1:** Backend Git-Service Methoden verfügbar
  - Command: `cd ui && npx tsc --noEmit`
  - Validates: `TypeScript kompiliert ohne Fehler, neue GitService-Methoden korrekt typisiert`
  - Requires MCP: no

- [ ] **Integration Test 2:** Lint-Check
  - Command: `cd ui && npm run lint`
  - Validates: `Keine Linting-Fehler in geänderten Dateien`
  - Requires MCP: no

- [ ] **Integration Test 3:** Frontend Build
  - Command: `cd ui/frontend && npm run build`
  - Validates: `Frontend kompiliert ohne Fehler`
  - Requires MCP: no

**Integration Scenarios:**
- [ ] Scenario 1: Backlog mit 2+ Stories, Auto-Mode einschalten, prüfen dass pro Story ein Branch erstellt und PR angelegt wird
- [ ] Scenario 2: Story-Fehler simulieren, prüfen dass Story übersprungen wird und nächste Story auf neuem Branch startet

**Notes:**
- Scenario 1 und 2 erfordern laufende UI und sind manuell zu verifizieren
- Integration validation läuft via System Story 998 während execute-tasks

## Spec Documentation

- Implementation Plan: specwright/specs/2026-02-16-branch-per-story-backlog/implementation-plan.md
- Requirements: specwright/specs/2026-02-16-branch-per-story-backlog/requirements-clarification.md
- Story Index: specwright/specs/2026-02-16-branch-per-story-backlog/story-index.md
- Kanban: specwright/specs/2026-02-16-branch-per-story-backlog/kanban.json
