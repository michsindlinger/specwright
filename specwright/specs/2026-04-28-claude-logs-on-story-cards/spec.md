# Spec: Claude-Code-Logs auf Story-Cards im Kanban-Board

**Spec ID:** 2026-04-28-claude-logs-on-story-cards
**Mode:** V2 Lean
**Tier:** M (5 business tasks)
**Branch:** `feature/parallel-auto-mode`
**Created:** 2026-04-28

## Overview

Macht den Live-Output paralleler Claude-Code-Sessions aus dem Auto-Mode direkt am Story-Card im Kanban-Board sichtbar — als optional aufklappbares Inline-Panel mit RAF-batchedem Live-Stream, ANSI-Strip und Buffer-Hydration on Open.

## Tasks

| ID | Title | One-Liner |
|---|---|---|
| CLOG-001 | Backend: `SlotSnapshot.sessionId` expose | Protocol-Type + Orchestrator-Snapshot + Workflow-Executor-Adapter um `sessionId?` additiv erweitern |
| CLOG-002 | Util: `ansi-strip.ts` + Tests | Pure-Function entfernt CSI/SGR/Cursor-Sequenzen aus PTY-Output |
| CLOG-003 | Component: `aos-claude-log-panel` | Lit-Komponente mit Subscribe, RAF-Batching, Auto-Scroll, Buffer-Hydration, Reconnect-Handling |
| CLOG-004 | Integration: Story-Card + Dashboard-View | Toggle conditional auf `sessionId`, Panel render, Dashboard propagiert sessionId an Card |
| CLOG-005 | E2E + Edge-Case Tests | Playwright Smoke (parallel slots → 2 Panels), Race + Reconnect + Session-End Cases |
| CLOG-997 | Code Review | Full-feature diff review (System) |
| CLOG-998 | Integration Validation | End-to-end Full-stack validation (System) |
| CLOG-999 | Finalize PR | User-Todos, PR-Erstellung, Cleanup (System) |

## Spec Scope

- Inline-Toggle + expandierbares Log-Panel an Story-Cards mit aktiver Cloud-Terminal-Session.
- Live-Stream via existierendem WebSocket-Broadcast `cloud-terminal:data` (kein neues Protokoll).
- ANSI-Codes strippen, Plain-Text rendern.
- Auto-Scroll mit fixed Height (~300 px) und Backscroll-Detection.
- Mehrere Cards parallel expandable (unabhängige Panel-Instanzen).
- Buffer-Hydration beim Toggle-Open via existierendem `cloud-terminal:buffer-request`.
- `SlotSnapshot.sessionId?` additiv im Snapshot exposen.
- Reconnect-Handling: Bei WebSocket-Reconnect Buffer-Request neu senden.

## Out of Scope

- Manuelle `/execute-tasks`-Sessions (nur Auto-Mode).
- Persistente Logs (File/DB) — nur Session-Buffer im Manager.
- ANSI-Farb-Render / xterm.js im Card.
- Strukturierte Tool-Call-Anzeige, Filter, Search im Log-Panel.
- Toggle-State LocalStorage-Persistierung (FR-8: ephemer).
- Logs für abgeschlossene Stories (Done) — Buffer ist nach `closeSession` weg.
- Mini-Tail (Vorschau-Zeilen ohne Expand).

## Integration Requirements

**Integration Type:** Full-stack (Backend Protocol + Frontend Rendering)

### Integration Test Commands
- `cd ui && npm test -- ansi-strip` — Util-Tests grün
- `cd ui && npm test -- aos-claude-log-panel` — Component-Tests grün
- `cd ui && npm test -- auto-mode-orchestrator-base` — Snapshot enthält sessionId
- `cd ui && npm run lint` — keine Errors
- `cd ui && npm run build:backend` — Backend kompiliert
- `cd ui/frontend && npm run build` — Frontend kompiliert

### End-to-End Scenarios
1. **Auto-Mode parallel run**: Auto-Mode mit `maxConcurrent=2` starten → 2 Cards im "In Progress" zeigen Toggle → beide expandieren → Live-Logs in beiden Panels gleichzeitig sichtbar (Requires MCP: yes — Playwright).
2. **Buffer-Hydration**: Auto-Mode laufen lassen 30s → Card-Toggle öffnen → Buffer (nicht nur ab-jetzt-Stream) sichtbar (Requires MCP: yes — Playwright).
3. **Reload-Reset**: Panel offen → Page-Reload → Panel collapsed (FR-8 ephemer) (Requires MCP: yes — Playwright).
4. **Session-End-Behavior**: Story läuft fertig → Status wechselt auf Done → Toggle verschwindet (`sessionId === undefined`) (Requires MCP: yes — Playwright).
