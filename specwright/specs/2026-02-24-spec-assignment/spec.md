# Spec Requirements Document

> Spec: Spec Assignment for External Bot
> Created: 2026-02-24
> Status: Planning

## Overview

Ermöglicht das Zuweisen fertiger Spezifikationen (Status "ready") an einen externen Bot (OpenClaw) via `assignedToBot`-Flag in kanban.json. OpenClaw überwacht GitHub-Repositories, erkennt zugewiesene Specs und arbeitet diese autonom ab. Das Assignment ist ein einfaches Flag - es löst keine automatische Aktion aus, sondern dient OpenClaw als Signal.

Die Implementierung umfasst Backend-Service mit WebSocket-API, Frontend-Integration in Spec-Übersicht und Kanban-View, sowie einen CLI Slash-Command.

## User Stories

1. ASGN-001: Backend Data Layer (kanban.json Schema + SpecsReader)
2. ASGN-002: Backend WebSocket Handler for Assignment
3. ASGN-003: Frontend Assignment in Spec-Übersicht
4. ASGN-004: Frontend Assignment in Kanban Detail View
5. ASGN-005: Slash-Command /assign-spec

See: stories/ directory for individual story files.

## Spec Scope

- `assignedToBot`-Feld in kanban.json (setzen, lesen, entfernen)
- Backend: SpecsReader-Methoden für Assignment mit Ready-Validierung
- Backend: WebSocket Message-Handler `specs.assign` mit Broadcast
- Frontend: Assignment-Badge in Spec-Übersicht (Spec-Card)
- Frontend: Assignment-Toggle in Spec-Übersicht und Kanban-View
- CLI: Slash-Command `/assign-spec`
- Validierung: Nur "ready" Specs können assigned werden
- Backward Compatibility: Bestehende kanban.json ohne Feld funktioniert weiterhin

## Out of Scope

- OpenClaw Agent-Logik (existiert bereits separat)
- Automatische Aktionen nach Assignment (OpenClaw pollt selbst)
- Neue MCP-Server-Operationen
- Multi-Agent-Support (nur ein Bot, kein Agent-Name nötig)
- Benachrichtigungen/Webhooks bei Assignment
- REST-Endpunkte (nutzt bestehendes WebSocket-Pattern)

## Expected Deliverable

- `assignedToBot`-Feld in kanban.json lesbar und schreibbar via Backend und CLI
- Spec-Übersicht zeigt Assignment-Status als Badge
- Spec-Übersicht ermöglicht direktes Assignen/Un-Assignen per Toggle
- Kanban-Detail-View hat Assignment-Toggle im Header
- Toggle nur aktiv wenn Spec "ready" (alle Stories im ready-Status)
- Multi-Client-Sync via WebSocket Broadcast
- `/assign-spec` CLI-Command funktional
- Alle Lint- und Build-Checks bestehen

## Integration Requirements

> These integration tests will be executed automatically after all stories complete.

**Integration Type:** Full-stack

- [ ] **Integration Test 1:** Backend Assignment Toggle
  - Command: `cd ui && npx vitest run --testPathPattern="specs-reader" 2>/dev/null || echo "test file needs creation"`
  - Validates: `SpecsReader.toggleBotAssignment() setzt und liest assignedToBot korrekt`
  - Requires MCP: no

- [ ] **Integration Test 2:** Build Check
  - Command: `cd ui && npm run build:backend && cd frontend && npm run build`
  - Validates: `Beide Builds kompilieren ohne Fehler`
  - Requires MCP: no

- [ ] **Integration Test 3:** Lint Check
  - Command: `cd ui && npm run lint`
  - Validates: `Keine Linting-Fehler`
  - Requires MCP: no

- [ ] **Integration Test 4:** Frontend Assignment UI
  - Command: `MCP_PLAYWRIGHT: Navigate to spec overview, verify assignment badge and toggle`
  - Validates: `Assignment-Badge und Toggle in Spec-Übersicht sichtbar und funktional`
  - Requires MCP: yes

**Integration Scenarios:**
- [ ] Scenario 1: User assignt eine "ready" Spec in der Übersicht → Badge erscheint → Kanban-View zeigt Assignment → Un-assign → Badge verschwindet
- [ ] Scenario 2: User versucht eine nicht-ready Spec zu assignen → Fehlermeldung/Toggle deaktiviert

## Spec Documentation

- Implementation Plan: @specwright/specs/2026-02-24-spec-assignment/implementation-plan.md
- Requirements: @specwright/specs/2026-02-24-spec-assignment/requirements-clarification.md
- Stories: @specwright/specs/2026-02-24-spec-assignment/stories/
