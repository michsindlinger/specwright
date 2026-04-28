# Requirements Clarification - Spec-Auto-Mode Mid-Run Cancel Fix

**Created:** 2026-04-28
**Status:** Approved (Single-Task S-Spec)
**Mode:** V2 Lean
**Tier:** S
**Related Branch:** `feature/parallel-auto-mode`

## Feature Overview
Auto-Mode-Toggle auf dem Spec-Kanban-Board sendet aktuell beim Ausschalten **keine** Cancel-Message ans Backend. Der laufende `AutoModeSpecOrchestrator` läuft weiter, schiebt Stories in aktive Cloud-Terminal-Sessions, Watchdogs bleiben an. Backlog-Auto-Mode (PAM-006) macht das korrekt — Spec nicht. Dieser Fix schließt die Lücke.

## Target Users
- Specwright-User, die Auto-Mode auf einer Spec starten und mid-run abbrechen wollen (z.B. weil falsche Spec, falscher Branch, oder Feedback kam)
- Erwartungshaltung: Toggle aus = sofort Stop, analog zum Backlog-Verhalten

## Business Value
- **Konsistente UX** — Toggle-Verhalten zwischen Spec-Kanban und Backlog-Kanban ist heute auseinander
- **Kein Wegwerf-Compute** — laufende Cloud-Terminal-Sessions werden sofort beendet statt zu Ende zu rödeln
- **Keine Hängenbleiber** — Watchdogs/Stall-Detection auf längst abgewählten Specs werden gestoppt

## Functional Requirements
1. **Toggle aus → Backend-Cancel** — Frontend schickt `gateway.send({ type: 'workflow.auto-mode.cancel', specId })` im Disable-Branch von `handleAutoModeToggle`
2. **Backend bricht Orchestrator ab** — bestehender Pfad (`websocket.ts:1054` → `workflowExecutor.cancelAutoModeSession(specId)` → `orchestrator.cancel()`) wird genutzt — keine Backend-Änderung nötig
3. **Guard gegen `selectedSpec === null`** — bei Navigation-Race kein Crash, einfach kein Send
4. **Bestehender Frontend-Cleanup bleibt** — `clearAutoExecutionTimer`, `currentAutoModeProgress = null`, `clearAutoModeState()` bleiben erhalten
5. **Backlog-Verhalten unverändert** — Backlog-Toggle (`handleBacklogAutoModeToggle:1843`) wird nicht angefasst

## Affected Areas & Dependencies

### Frontend (Edit)
- `ui/frontend/src/views/dashboard-view.ts:1591-1601` — else-Branch in `handleAutoModeToggle`

### Backend (Read-Only Verifikation)
- `ui/src/server/websocket.ts:238` — Dispatcher case `workflow.auto-mode.cancel` (existiert)
- `ui/src/server/websocket.ts:1054-1077` — `handleAutoModeCancel` (existiert, unused)
- `ui/src/server/workflow-executor.ts:3134-3144` — `cancelAutoModeSession` (existiert, unused)

### Persistence
- Keine. `clearAutoModeState()` räumt localStorage bereits.

## Edge Cases & Error Scenarios
- **`selectedSpec` null** (Navigation-Race) → Guard `if (this.selectedSpec)` verhindert Send + Crash
- **Toggle aus bei Spec ohne aktiven Orchestrator** → Backend antwortet `cancelled: false` im Ack, kein Fehler
- **Backend-Disconnect zum Toggle-Zeitpunkt** → `gateway.send` puffert/queued; bei Reconnect wird Cancel verschickt — Backend ist idempotent
- **Race: Story finalized im selben Tick** → `orchestrator.cancel()` wartet via `Promise.allSettled` auf Slot-Cleanup, kein Datenverlust

## Out of Scope
- AbortController für laufende Claude-SDK-Calls (laufende Story spielt aktuelle Round zu Ende)
- Worktree-Cleanup bei Mid-Run-Abbruch
- UX-Feedback (Toast / Banner "Auto-Mode abgebrochen")
- Backend-Tests — Cancel-Pfad ist bereits durch Backlog-Tests abgedeckt

## Acceptance
- Spec-Auto-Mode mit ≥2 offenen Stories und worktree-Strategie starten
- Toggle aus während Stories laufen
- WebSocket-Frame `workflow.auto-mode.cancel` mit korrekter `specId` geht raus (DevTools-Network)
- Server-Log zeigt: `[Workflow] Auto-Mode: Cancelling orchestrator for spec <id>`
- Backend-Ack: `workflow.auto-mode.cancel.ack` mit `cancelled: true`
- Aktive Cloud-Terminal-Sessions schließen, Watchdogs aus
- `cd ui/frontend && npm run build` grün
