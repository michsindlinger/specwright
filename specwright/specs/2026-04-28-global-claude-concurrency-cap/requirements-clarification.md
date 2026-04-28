# Requirements Clarification — Global Claude Concurrency Cap

**Created:** 2026-04-28
**Status:** Approved (basis: iterativer Dialog + reviewter Plan)

## Feature Overview

Globaler App-weiter Cap für parallele Claude-Code-Sessions in Specwright UI. Adressiert Transport-Errors (`ConnectionRefused`, `Stream idle timeout`) im Auto-Mode, ausgelöst durch Anthropic-API-Drosselung bei zu vielen parallelen SSE-Streams.

## Target Users

- **Specwright-Nutzer im Auto-Mode** — laufen mehrere Specs/Backlogs parallel und erleben Stream-Timeouts
- **Specwright-Nutzer im Chat** — sollen während Auto-Mode-Run Feedback bekommen statt stumm zu hängen

## Business Value

- **Stabilität:** Reduziert Transport-Errors in unattended Auto-Mode-Sessions
- **Konsistenz:** Ein App-weiter Cap statt Per-Orchestrator-Inseln (heute: 2 Specs Auto-Mode = 4 parallele Sessions)
- **Vorhersagbarkeit:** API-Key-Budget bleibt unter Kontrolle, Tokens-per-Second-Drosselung wird vermieden

## Functional Requirements

1. **Globaler Cap = 2** parallele Claude-Sessions app-weit, konfigurierbar via `SPECWRIGHT_GLOBAL_CLAUDE_CONCURRENCY` env (Hard-Ceiling 4)
2. **Gegated:** alle Auto-Mode-Story-Slots, alle direkt-spawn-Pfade (`runClaudeCommand`, Resume nach Question, Fallback `--print`), alle Chat-Sends
3. **Ungegated (User-Decision):** Cloud-Terminal-Sessions (manual + Workflow-Auto-Continue + Dev-Team-Setup)
4. **Chat-UX:** WS-Event `chat.queued` an blockierten Client → Frontend zeigt "Warte auf Kapazität"
5. **Backwards-Compatible:** Public Instance-API von `ProjectConcurrencyGate` bleibt unverändert (`acquire()`, `release()`, `drain()`)

## Affected Areas & Dependencies

- **`ui/src/server/services/project-concurrency-gate.ts`** — Klasse erweitern um statische Counter + Helper
- **`ui/src/server/workflow-executor.ts`** — 3 Direct-Spawn-Pfade durch Gate (`runClaudeCommand` 1774-2030, Resume 2598, Fallback `--print` 489+)
- **`ui/src/server/claude-handler.ts`** — 2 Chat-Spawn-Sites (lines 360, 543) + `chat.queued`-Event
- **`ui/frontend/src/components/...`** — Chat-Component zeigt Banner bei `chat.queued`
- **`ui/tests/unit/project-concurrency-gate.test.ts`** — bestehende Tests erweitern
- **`auto-mode-orchestrator-base.ts`** — keine Änderung nötig (Instance-Gate trägt jetzt automatisch global)
- **`cloud-terminal-manager.ts`** — keine Änderung (User-Decision: ungated)

## Edge Cases & Error Scenarios

- **Orphaned/detached Process** → explizite Release-Calls in try/catch/finally + exit + cancel-Pfaden, nicht nur `once('exit')`
- **`drain()` während gehaltene Slots** → globale Counter dieser Instanz freigeben (sonst Leak)
- **Test-Pollution durch geteilten static state** → `resetForTests()` in `beforeEach`
- **Doppel-Gating-Falle in `startBacklogStoryExecution`** → PTY-Pfad (461-484) bereits gegated via Orchestrator, **nur** Fallback `--print` (489+) wrappen
- **Chat-Stille-Hang bei vollem Gate** → `chat.queued` WS-Event vor jedem `acquireGlobalOnly` mit Wait

## Security & Permissions

Keine Auth-Änderung. Gate ist ein interner Concurrency-Mechanismus.

## Performance Considerations

- Cap auf 2 Sessions kann **wahrgenommene Latenz** für Chat erhöhen wenn Auto-Mode beide Slots hält
- Mitigation: User sieht Banner, kann Auto-Mode pausieren wenn er Chat dringender braucht
- Tradeoff bewusst akzeptiert: weniger Stream-Timeouts > schnellere Chat-Antwort

## Scope Boundaries

**IN SCOPE:**
- Global-Counter in `ProjectConcurrencyGate`
- Wrap direkt-spawn-Pfade (workflow-executor + claude-handler)
- `chat.queued` WS-Event + Frontend-Banner
- Test-Erweiterungen + `resetForTests`-Helper
- Doku im README zur env-Variable

**OUT OF SCOPE:**
- Globales WS-Broadcast für Header-Indikator (Badge "⚡ 2/2")
- Retry-Logik für Transport-Errors (separater Spec)
- Resume-Mechanik bei Session-Crash
- Cloud-Terminal-Gating

## Open Questions

Keine — Design-Entscheidungen geklärt:
- Default 2, env-konfigurierbar
- Cloud-Terminal ungated
- Chat gegated mit minimal `chat.queued`-Feedback

## Proposed Tasks (High Level)

1. **CCG-001** — `ProjectConcurrencyGate` um statische Counter + Helpers erweitern
2. **CCG-002** — Direct-spawn-Pfade in `workflow-executor.ts` wrappen
3. **CCG-003** — Chat-Send in `claude-handler.ts` wrappen + `chat.queued`-Event
4. **CCG-004** — Frontend-Banner für `chat.queued` in Chat-Component
5. **CCG-005** — Tests erweitern (Unit + Integration)

---
*Requirements aus iterativem Dialog + reviewter Plan abgeleitet. Plan unter `implementation-plan.md`.*
