# Spec — Global Claude Concurrency Cap

**ID:** `2026-04-28-global-claude-concurrency-cap`
**Prefix:** `CCG`
**Tier:** M
**Mode:** V2 Lean
**Created:** 2026-04-28

## Overview

Ein App-weiter Cap = 2 parallele Claude-Code-Sessions in Specwright UI. Verhindert Anthropic-API-Drosselung (Stream idle timeouts, ConnectionRefused) bei mehreren parallelen Auto-Mode-Sessions oder Auto-Mode + Chat-Mix. Cloud-Terminal-Sessions bleiben ungegated (User-Decision).

## Tasks

| ID | Title | Plan-Section |
|----|-------|--------------|
| CCG-001 | Erweitere ProjectConcurrencyGate um globale Counter | Phase 1: Erweitere ProjectConcurrencyGate |
| CCG-002 | Wrap direct-spawn Pfade in workflow-executor | Phase 2: Wrap Direct-Spawn-Pfade in workflow-executor |
| CCG-003 | Wrap chat-send + chat.queued WS-Event | Phase 3: Wrap Chat-Send + chat.queued WS-Event |
| CCG-004 | Frontend-Banner für chat.queued | Phase 4: Frontend Banner für chat.queued |
| CCG-005 | Tests erweitern (Unit + Integration) | Phase 5: Tests |
| CCG-997 | Code Review | System: Code Review |
| CCG-998 | Integration Validation | System: Integration Validation |
| CCG-999 | Finalize PR | System: Finalize PR |

## Spec Scope

- Statische Counter + Helper in `ProjectConcurrencyGate` (Backend, `ui/src/server/services/`)
- Wrap an `workflow-executor.ts` (3 Sites) und `claude-handler.ts` (2 Sites)
- WS-Event `chat.queued` mit minimal-Payload
- Frontend-Banner in Chat-Component
- Test-Erweiterung (Unit + Integration)
- README-Notiz zur env-Variable `SPECWRIGHT_GLOBAL_CLAUDE_CONCURRENCY`

## Out of Scope

- Globaler Header-Indikator "⚡ 2/2" (Follow-up Spec)
- Retry-Logik für Transport-Errors
- Mid-Session-Resume bei Crash
- Cloud-Terminal-Session-Gating

## Integration Requirements

**Integration Type:** Full-stack (Backend Service + Frontend Lit Component)

**Integration Test Commands:**
```bash
# Backend tests
cd ui && npm test
# Backend lint
cd ui && npm run lint
# Backend build
cd ui && npm run build:backend
# Frontend build
cd ui/frontend && npm run build
```

**End-to-End Scenarios:**
1. **Cross-Orchestrator Cap:** Zwei Specs Auto-Mode parallel → max 2 PTYs aktiv (vorher: 4)
2. **Chat-While-AutoMode:** Auto-Mode hält 2 Slots, User sendet Chat → Frontend zeigt Banner "Warte auf Claude-Kapazität", Chat startet sobald Auto-Mode-Slot frei
3. **Cloud-Terminal nicht geblockt:** Auto-Mode hält 2 Slots, User öffnet Cloud-Terminal-Session → Session startet sofort (ungated)
4. **Release-Robustheit:** Spawn-Fail (ENOENT) im wrap-Pfad → globalRunning kehrt auf 0 zurück, kein Leak

**Requires MCP:** none (Integration-Tests via Vitest + manuell)

## Verification Notes

Plan-Section-References funktionieren via exact-heading-match. Bei `kanban_get_next_task` parsed der V2-Plan-Parser:
1. Exakter `## Phase N: …`-Header oder `### Phase N: …`
2. `Phase N:`-Extraktion mit flexiblem Format

Alle Tasks dieser Spec referenzieren existierende Headings 1:1 in `implementation-plan.md`.

## Direkt-Sofortmaßnahme (parallel zur Implementierung)

User entblockt die zwei aktuellen blockierten Stories selbst (manueller kanban.json-Edit). Vor nächstem Auto-Mode-Run:
- `caffeinate -dis` im Terminal lassen (kein Mac-Schlaf)
- VPN/Proxy stabil oder aus
- Konkurrierende manuelle Claude-Sessions schließen
