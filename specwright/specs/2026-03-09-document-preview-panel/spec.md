# Spec Requirements Document

> Spec: Document Preview Panel
> Created: 2026-03-09
> Status: Planning

## Overview

Waehrend Specwright-Workflows generierte Dokumente (z.B. Requirements Clarification, Implementation Plan) automatisch in einem Overlay Side-Panel in der UI anzeigen, statt den User zur manuellen Navigation zu zwingen. Claude Code steuert das Panel ueber zwei neue MCP-Tools im kanban-mcp-server.

## User Stories

- DPP-001: MCP-Tools fuer Document Preview (Open + Close)
- DPP-002: Backend Preview-Watcher und WebSocket-Integration
- DPP-003: Frontend Document Preview Panel Komponente
- DPP-004: App-Integration des Document Preview Panels

## Spec Scope

- MCP-Tool `document_preview_open` zum Oeffnen eines Dokuments im Preview-Panel
- MCP-Tool `document_preview_close` zum Schliessen des Panels
- Backend Filewatcher fuer Preview-Requests mit WebSocket-Broadcast
- Overlay Side-Panel von links mit Markdown Editor (editierbar, speicherbar)
- Automatisches Oeffnen bei MCP-Call, manuelles Schliessen per X-Button
- Ungespeicherte-Aenderungen-Warnung bei Inhaltswechsel
- Integration in app.ts mit State-Management

## Out of Scope

- Multi-File Tabs / History im Panel
- Scroll-to-Section Funktionalitaet
- Andere Dateitypen als Markdown (.json, .yaml, .ts)
- Neuer separater MCP-Server
- Panel fuer nicht-aktive Projekte
- Drag-Resize des Panels (kann spaeter ergaenzt werden)

## Expected Deliverable

- 2 neue MCP-Tools im kanban-mcp-server (document_preview_open, document_preview_close)
- Backend PreviewWatcher Service mit Filewatcher und WebSocket-Broadcast
- Frontend aos-document-preview-panel Komponente als Overlay Sidebar
- Vollstaendige Integration in app.ts
- End-to-End: MCP-Tool-Call oeffnet Panel, User editiert, MCP-Tool schliesst Panel

## Integration Requirements

> IMPORTANT: These integration tests will be executed automatically after all stories complete.

**Integration Type:** Full-stack

- [ ] **Integration Test 1:** Backend compiles successfully
   - Command: `cd ui && npm run build:backend`
   - Validates: Backend TypeScript compiles without errors
   - Requires MCP: no

- [ ] **Integration Test 2:** Frontend compiles successfully
   - Command: `cd ui/frontend && npm run build`
   - Validates: Frontend builds without errors
   - Requires MCP: no

- [ ] **Integration Test 3:** Lint passes
   - Command: `cd ui && npm run lint`
   - Validates: No lint errors
   - Requires MCP: no

- [ ] **Integration Test 4:** Unit tests pass
   - Command: `cd ui && npm test`
   - Validates: All existing tests still pass
   - Requires MCP: no

**Integration Scenarios:**
- [ ] Scenario 1: Claude Code ruft document_preview_open auf → Panel oeffnet sich mit Dateiinhalt → User sieht Markdown gerendert und kann editieren → User speichert → Datei wird aktualisiert
- [ ] Scenario 2: Claude Code ruft document_preview_open auf → Panel oeffnet sich → Claude Code ruft document_preview_close auf → Panel schliesst sich

## Spec Documentation

- Implementation Plan: specwright/specs/2026-03-09-document-preview-panel/implementation-plan.md
- Requirements Clarification: specwright/specs/2026-03-09-document-preview-panel/requirements-clarification.md
