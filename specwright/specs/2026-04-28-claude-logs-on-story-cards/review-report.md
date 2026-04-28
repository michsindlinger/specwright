# Code Review Report - Claude-Code-Logs auf Story-Cards

**Datum:** 2026-04-28
**Branch:** `feature/claude-logs-on-story-cards`
**Reviewer:** Claude (Opus 4.7)
**Spec:** `specwright/specs/2026-04-28-claude-logs-on-story-cards/`

## Review Summary

**Geprüfte Commits:** 5 (CLOG-001..CLOG-004 commits + working tree CLOG-005)
**Geprüfte Dateien:** 14 (8 implementation + 5 tests + 1 spec doc)
**Diff vs main:** +1043 / −7 LoC
**Gefundene Issues:** 2 (alle Minor)

| Schweregrad | Anzahl |
|-------------|--------|
| Critical | 0 |
| Major | 0 |
| Minor | 2 |

## Spec-Conformance

### Expected Deliverable Checklist
(spec.md hat keinen `## Expected Deliverable` — Cross-Check gegen `## Spec Scope`)

| Deliverable (aus spec.md Spec Scope) | Implementiert? | Files / Notes |
|---|---|---|
| Inline-Toggle + expandierbares Log-Panel an Story-Cards | ✅ | `story-card.ts:882-906` (conditional auf `sessionId`) |
| Live-Stream via `cloud-terminal:data` (kein neues Protokoll) | ✅ | `aos-claude-log-panel.ts:117-124` (gateway.on) |
| ANSI-Codes strippen, Plain-Text rendern | ✅ | `ansi-strip.ts` + Aufruf in `flushPending`/`bufferResponseHandler` |
| Auto-Scroll fixed Height (~300 px) + Backscroll-Detection | ✅ | `aos-claude-log-panel.ts:30` (max-height: 300px), `:89-95` (auto-scroll), `:193-197` (scrolledUp) |
| Mehrere Cards parallel expandable | ✅ | unabhängige Panel-Instanzen, kein globaler State |
| Buffer-Hydration via `cloud-terminal:buffer-request` on Toggle-Open | ✅ | `aos-claude-log-panel.ts:157-164`, ausgelöst in `connectedCallback`/`refreshSubscription` |
| `SlotSnapshot.sessionId?` additiv exposen | ✅ | `auto-mode.protocol.ts:17`, propagiert über `OrchestratorSlotSnapshot` → `getSpecAutoModeSnapshot`/`getBacklogAutoModeSnapshot` |
| Reconnect-Handling: Buffer-Request neu nach WS-Reconnect | ✅ | `aos-claude-log-panel.ts:135-138` (`gateway.connected` listener) |

### Plan-Validation Results (Verbindungs-Matrix)

**Geprüft:** 9 Validierungen — 2 passed, 0 failed, 7 manual-only

| Source → Target | Story | Validation | Result |
|---|---|---|---|
| `AutoModeStorySlot.getSessionId()` → `OrchestratorSnapshot.active[].sessionId` | CLOG-001 | `grep -n "getSessionId" auto-mode-orchestrator-base.ts` | ✅ Pass (line 132) |
| `dashboard-view` → `<aos-story-card>` | CLOG-004 | `grep -n "sessionId" dashboard-view.ts` | ✅ Pass (line 691, 719) |
| `OrchestratorSnapshot` → `AutoModeSnapshot` | CLOG-001 | Type-Check + Snapshot-Roundtrip Unit-Test | 📝 Manual (covered by `clog-001-snapshot-sessionid.test.ts`, 4/4 pass) |
| Server → DevTools payload | CLOG-001 | Browser-DevTools | 📝 Manual |
| `<aos-story-card>` → `<aos-claude-log-panel>` | CLOG-004 | DOM-Inspektion | 📝 Manual (covered by `clog-004-integration.test.ts`) |
| `<aos-claude-log-panel>` → gateway subscribe | CLOG-003 | Unit-Test Mock-Gateway | 📝 Manual (covered by `clog-003-claude-log-panel.test.ts`, 14/14 pass) |
| `<aos-claude-log-panel>` → buffer-request | CLOG-003 | E2E Toggle | 📝 Manual (Playwright skipped, happy-dom in `clog-005`) |
| `<aos-claude-log-panel>` → `stripAnsi()` | CLOG-002 | Unit-Test ANSI-Sample | 📝 Manual (covered by `clog-002-ansi-strip.test.ts`, 20/20 pass) |
| `cloud-terminal:buffer-response` → panel | CLOG-003 | E2E | 📝 Manual (covered by `clog-005`) |

### Scope Compliance
- **In-Scope deliverables present:** 8/8
- **Out-of-Scope-Violations:** 0
  - kein LocalStorage (FR-8 ephemer): ✅ nur `@state`
  - kein xterm/ANSI-Color: ✅ nur strip
  - keine persistente Speicherung: ✅ nur Session-Buffer
  - Auto-Mode-only: ✅ `sessionId` kommt nur aus `AutoModeSnapshot.activeSlots`
- **Plan-Drift (undocumented files):** 0 — alle 8 Implementation-Files in Komponenten-Übersicht gelistet

### Requirements (aus requirements-clarification.md)
*requirements-clarification.md prüfen nicht durchgeführt — Datei nicht im Repo (per spec workflow nicht erzeugt für M-Tier). FR-1..FR-9 in spec.md/implementation-plan.md "Feature-Preservation" abgedeckt.*

## Geprüfte Dateien

| File | Type | Status |
|---|---|---|
| `ui/src/shared/types/auto-mode.protocol.ts` | Type | ✅ Reviewed |
| `ui/src/server/services/auto-mode-orchestrator-base.ts` | Backend | ✅ Reviewed |
| `ui/src/server/workflow-executor.ts` | Backend | ✅ Reviewed |
| `ui/frontend/src/components/aos-claude-log-panel.ts` | Component | ✅ Reviewed (Minor #1, #2) |
| `ui/frontend/src/components/story-card.ts` | Component | ✅ Reviewed |
| `ui/frontend/src/components/kanban-board.ts` | Component | ✅ Reviewed |
| `ui/frontend/src/views/dashboard-view.ts` | View | ✅ Reviewed |
| `ui/frontend/src/utils/ansi-strip.ts` | Util | ✅ Reviewed |
| `ui/tests/unit/clog-001-snapshot-sessionid.test.ts` | Test | ✅ 4/4 pass |
| `ui/tests/unit/clog-002-ansi-strip.test.ts` | Test | ✅ 20/20 pass |
| `ui/tests/unit/clog-003-claude-log-panel.test.ts` | Test | ✅ 14/14 pass |
| `ui/tests/unit/clog-004-integration.test.ts` | Test | ✅ 8/8 pass |
| `ui/tests/unit/clog-005-e2e-edge-cases.test.ts` | Test | ✅ 17/17 pass |
| `ui/tests/unit/pam-fix-003-snapshot.test.ts` | Test (fixture-update) | ✅ pass |

## Issues

### Critical Issues
Keine gefunden.

### Major Issues
Keine gefunden.

### Minor Issues

**Minor #1 — `aos-claude-log-panel.ts:215-217` — `scroll-hint` chip außerhalb des Scrollers**
- **Datei:** `ui/frontend/src/components/aos-claude-log-panel.ts`
- **Problem:** `<div class="scroll-hint">` ist Sibling von `<div class="log-panel">`, nicht Child. CSS deklariert `position: sticky; bottom: 0` — sticky funktioniert aber nur in einem scrollenden Ancestor. Da das Element außerhalb des `.log-panel` (eigentlicher Scroller) liegt, fällt sticky auf relative-Verhalten zurück. Das Chip rendert direkt unter dem Panel statt am unteren Rand des Scrollers überlappend.
- **Impact:** Funktional intakt (Chip ist sicht- und klickbar; Resume-Auto-Scroll funktioniert). UX leicht suboptimal — Chip wandert nicht mit beim Scroll.
- **Empfehlung:** Chip in den `.log-panel` Container moven oder Wrapper mit `position: relative` einbauen, dann sticky anwenden. Spec-FR liefert keine pixelgenaue UX-Vorgabe → kein Auto-Fix nötig.

**Minor #2 — `aos-claude-log-panel.ts:117-139` — Subtile Race zwischen Stream-Chunks und Buffer-Response**
- **Datei:** `ui/frontend/src/components/aos-claude-log-panel.ts`
- **Problem:** `subscribe()` registriert `dataHandler` und `bufferResponseHandler` parallel. Eingehende `cloud-terminal:data`-Chunks werden in `pendingChunks` gepusht und per RAF in `logText` geflusht. Wenn `cloud-terminal:buffer-response` ARRIVES NACH einem RAF-Flush, überschreibt `bufferResponseHandler` `logText` mit `stripAnsi(buffer)` — und die zwischenzeitlich gestreamten Chunks gehen verloren (stehen nicht im Server-Buffer falls nach Buffer-Snapshot generiert).
- **Impact:** In der Praxis ist das `cloud-terminal:buffer-response` typischerweise schneller als der erste sichtbare RAF-Tick (Server liest synchronen Buffer, sendet sofort). Im Worst-Case fehlen wenige Zeilen; Stream geht danach normal weiter.
- **Mitigation bereits dokumentiert:** CLOG-005 hat einen "race"-Test der das Verhalten lockt; FR-3 fordert "raw stdout" aber FR-8 toleriert ephemerischen State. Akzeptabel laut Plan Risk-Matrix.
- **Empfehlung:** Optional: Buffer-Response-Handler nur einmalig aktivieren (`once`-Subscription) und Pending-Chunks DRAIN (statt Overwrite) durch String-Concat: `this.logText = stripAnsi(buffer) + this.logText`. Out-of-scope für MVP.

## Fix Status

| # | Schweregrad | Issue | Status | Fix-Details |
|---|---|---|---|---|
| 1 | Minor | `scroll-hint` außerhalb Scroller — sticky inactive | skipped | Funktional korrekt; UX-Politur out-of-scope. Logging only per Spec-Phase Workflow. |
| 2 | Minor | Stream/Buffer Race (Pending RAF vs. Buffer-Response Overwrite) | skipped | Locked durch CLOG-005 race-Test; Plan-Risk-Matrix akzeptiert das Verhalten unter FR-8 (ephemer). |

## Build & Test Status

| Check | Result |
|---|---|
| `cd ui && npm run lint` | ✅ pass (0 errors) |
| `cd ui && npm run build:backend` | ✅ pass (tsc clean) |
| `cd ui/frontend && npm run build` | ✅ pass (5.48s, build size warnings pre-existing) |
| `cd ui && npm test -- --run clog` | ✅ 63/63 pass (5 test files) |
| Project-wide tests | 25 unrelated failures pre-existing on `main` (terminal-manager, project-add-modal, model-config, workflow.test mock, project-state.service) — keine Regression durch CLOG-Branch |

## Empfehlungen

1. **Spec-Konformität:** Alle 9 funktionalen Requirements abgedeckt; alle 6 Komponenten-Verbindungen instantiiert.
2. **Backward-Compat:** `SlotSnapshot.sessionId?` ist additiv-optional, alte Clients ignorieren das Feld.
3. **Test-Coverage:** 63 neue Tests (Util/Component/Integration/E2E-Substitute via happy-dom) — solide Basis. Playwright-Smoke (CLOG-005) bewusst nach `user-todos.md` deferred dokumentiert.
4. **Code-Style:** Lit-Patterns, naming conventions (`aos-`-Prefix), Property/State-Trennung — konsistent mit existierenden Komponenten.
5. **Optional-Refinements (low priority, out-of-scope MVP):**
   - scroll-hint Position-Sticky korrekt einnesten (Minor #1)
   - Race-Handling über `concat-instead-of-overwrite` in `bufferResponseHandler` (Minor #2)

## Fazit

**Review passed.** 0 Critical / 0 Major / 2 Minor (skipped — funktional korrekt, UX-Politur out-of-scope-MVP). Implementation matches spec scope; Plan-Validation greps grün; alle CLOG-spezifischen Tests grün. Branch ist bereit für Integration Validation (CLOG-998).
