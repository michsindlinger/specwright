# Spec Requirements Document

> Spec: MCP Tools Management
> Created: 2026-02-27
> Status: Planning

## Overview

MCP Tools Management erweitert den Team-Bereich der Specwright UI um eine read-only Uebersicht aller installierten MCP-Server aus der Projekt-`.mcp.json` und ermoeglicht die Zuweisung von MCP-Tools zu Teammitgliedern (Skills) ueber ein neues Frontmatter-Feld. Dies schafft Transparenz ueber verfuegbare externe Tools und ermoeglicht gezielte Agent-Konfiguration.

## User Stories

See: specwright/specs/2026-02-27-mcp-tools-management/story-index.md

1. MCP-001: Shared Types & Backend MCP Service
2. MCP-002: MCP Tools Uebersicht im Frontend
3. MCP-003: MCP-Zuweisung zu Skills
4. MCP-004: Verwaiste Referenzen & Edge Cases
5. MCP-005: Backend Tests

## Spec Scope

- Read-only Anzeige der MCP-Server aus Projekt-`.mcp.json`
- Neue Sektion in der Team-View fuer MCP-Tools
- MCP-Tool-Karten mit Name, Typ, Command-Info
- `mcpTools`-Frontmatter-Feld in SKILL.md
- Checkbox-basierte Zuweisung im Team-Edit-Modal
- Anzeige zugewiesener MCP-Tools in Card/Detail-Modal
- Warnung bei verwaisten MCP-Tool-Referenzen
- Backend-API zum Lesen der `.mcp.json`
- Sicherheit: `env`-Feld wird nie ans Frontend gesendet

## Out of Scope

- Hinzufuegen/Entfernen von MCP-Servern ueber die UI
- Editieren der MCP-Server-Konfiguration (command, args, env)
- Globale `~/.claude/.mcp.json` Unterstuetzung
- MCP-Server Health-Checking oder Live-Status
- MCP-Server-Logs oder Debugging-Informationen

## Expected Deliverable

- Backend: McpConfigReaderService liest `.mcp.json` und liefert MCP-Server-Daten (ohne env)
- Backend: SkillsReaderService parst `mcpTools` Frontmatter-Feld
- Backend: REST-Endpunkt GET /:projectPath/mcp-config
- Backend: PUT-API erweitert um optionales mcpTools-Feld
- Frontend: MCP-Server-Karten in der Team-View
- Frontend: Checkbox-Zuweisung im Edit-Modal
- Frontend: MCP-Badges in Team-Cards und Detail-Modal
- Frontend: Warnungen bei verwaisten Referenzen
- Tests: Backend-Tests fuer alle neuen Services und Endpoints

## Integration Requirements

> **IMPORTANT:** These integration tests will be executed automatically after all stories complete.

**Integration Type:** Full-stack

- [x] **Integration Test 1:** Backend MCP-Config API
  - Command: `cd ui && npx vitest run tests/team/mcp-config-reader.service.test.ts`
  - Validates: McpConfigReaderService liest `.mcp.json` korrekt
  - Result: 11/11 Tests PASSED
  - Requires MCP: no

- [x] **Integration Test 2:** Backend Skills mcpTools Parsing
  - Command: `cd ui && npx vitest run tests/team/skills-reader.service.test.ts`
  - Validates: Frontmatter-Parser erkennt mcpTools-Feld
  - Result: 27/27 Tests PASSED
  - Requires MCP: no

- [x] **Integration Test 3:** Backend Team Routes
  - Command: `cd ui && npx vitest run tests/team/team.routes.test.ts`
  - Validates: GET mcp-config Endpoint und PUT mit mcpTools
  - Result: 22/22 Tests PASSED
  - Requires MCP: no

- [x] **Integration Test 4:** Full Build
  - Command: `cd ui && npm run build:backend && cd frontend && npm run build`
  - Validates: Backend und Frontend kompilieren ohne Fehler
  - Result: PASSED (Backend tsc + Frontend vite build)
  - Requires MCP: no

- [x] **Integration Test 5:** Lint Check
  - Command: `cd ui && npm run lint`
  - Validates: Keine Linting-Fehler
  - Result: PASSED (0 errors)
  - Requires MCP: no

**Integration Scenarios:**
- [x] Scenario 1: Team-View laedt MCP-Config und zeigt Server-Karten an
- [x] Scenario 2: Skill-Edit mit MCP-Tool-Zuweisung speichert mcpTools ins Frontmatter

## Spec Documentation

- Stories: specwright/specs/2026-02-27-mcp-tools-management/stories/
- Implementation Plan: specwright/specs/2026-02-27-mcp-tools-management/implementation-plan.md
- Requirements: specwright/specs/2026-02-27-mcp-tools-management/requirements-clarification.md
