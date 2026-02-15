# Spec Requirements Document

> Spec: Deep Link Navigation
> Created: 2026-02-13
> Status: Planning

## Overview

Deep Link Navigation erweitert das bestehende Hash-basierte Routing der Agent OS Web UI um Segment-basierte URLs, die den vollständigen Navigations-Zustand abbilden. Statt nur `#/dashboard` wird die URL zu `#/dashboard/spec/{spec-id}/{tab}`, sodass bei Page Reload, Browser-Neustart oder URL-Sharing der exakte Zustand erhalten bleibt.

Ein neuer Router-Service als Singleton zentralisiert URL-Parsing, Route-Matching und Navigation. Alle Views (Dashboard, Chat, Workflows, Settings) werden um Deep-Link-Support erweitert, inklusive vollständiger Browser-History-Unterstützung und Edge-Case-Handling.

## User Stories

See: stories/ directory for individual story files

1. DLN-001: Router Service Foundation
2. DLN-002: Dashboard Deep Links
3. DLN-003: Chat Deep Links
4. DLN-004: Workflow Deep Links
5. DLN-005: Settings Deep Links
6. DLN-006: Edge Case Handling & Error Feedback

## Spec Scope

- Hash-basiertes Segment-Routing für alle 4 Views (Dashboard, Chat, Workflows, Settings)
- Sub-Zustände: ausgewählte Spec + Tab, Chat-Session, Workflow, Settings-Tab
- Zentraler Router-Service als Singleton (analog projectStateService)
- Vollständige Browser-History-Unterstützung (Back/Forward)
- URL-Update bei jeder Navigation innerhalb der Views
- Shareable/kopierbare URLs
- Edge-Case-Handling (ungültige Links, Projekt-Kontext)
- Toast-Feedback bei ungültigen Deep Links

## Out of Scope

- History API / Clean URLs (ohne Hash)
- Tiefe Zustände (Scroll-Position, ausgewählte Story im Kanban, geöffnete Datei)
- Query-Parameter für Filter/Suche
- URL-Shortener oder Alias-System
- Session Persistence (eigenes Feature)
- Änderungen am Backend/WebSocket-Protokoll
- Automatischer Projekt-Wechsel bei projekt-fremden Deep Links

## Expected Deliverable

Ein vollständig funktionierendes Deep-Link-System mit:
- Router-Service der Hash-Segmente parst und verwaltet
- Alle 4 Views unterstützen Deep Links für ihre Haupt-Zustände
- Browser Back/Forward funktioniert korrekt durch die gesamte Navigations-Historie
- Ungültige Deep Links werden graceful behandelt mit User-Feedback
- URLs sind selbsterklärend und kopierbar

## Integration Requirements

> **IMPORTANT:** These integration tests will be executed automatically after all stories complete.

**Integration Type:** Frontend-only

- [ ] **Integration Test 1:** Router Service parst alle URL-Patterns korrekt
  - Command: `cd agent-os-ui/ui && npx tsc --noEmit`
  - Validates: TypeScript-Kompilierung ohne Fehler
  - Requires MCP: no

- [ ] **Integration Test 2:** Build läuft fehlerfrei durch
  - Command: `cd agent-os-ui/ui && npm run build`
  - Validates: Vite-Build kompiliert ohne Fehler
  - Requires MCP: no

- [ ] **Integration Test 3:** Deep Link Navigation funktioniert end-to-end
  - Command: `MCP_PLAYWRIGHT: Navigate to #/dashboard/spec/test-spec/kanban and verify correct view loads`
  - Validates: Deep Link routing funktioniert im Browser
  - Requires MCP: yes (Playwright)

**Integration Scenarios:**
- [ ] Scenario 1: User navigiert zu Dashboard → wählt Spec → wechselt Tab → Reload → gleicher Zustand
- [ ] Scenario 2: User kopiert URL aus Adressleiste → öffnet in neuem Tab → gleiche Ansicht
- [ ] Scenario 3: User navigiert durch mehrere Views → Back-Button → korrekte Rückkehr

## Spec Documentation

- Requirements: agent-os/specs/2026-02-13-deep-link-navigation/requirements-clarification.md
- Implementation Plan: agent-os/specs/2026-02-13-deep-link-navigation/implementation-plan.md
- Stories: agent-os/specs/2026-02-13-deep-link-navigation/stories/
