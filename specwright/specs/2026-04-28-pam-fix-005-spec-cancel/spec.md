# Spec: Spec-Auto-Mode Mid-Run Cancel Fix

**Spec ID:** 2026-04-28-pam-fix-005-spec-cancel
**Mode:** V2 Lean
**Tier:** S (1 business task)
**Branch:** `feature/parallel-auto-mode`
**Created:** 2026-04-28

## Overview

Behebt UX-Bug: Auto-Mode-Toggle auf Spec-Kanban-Board kann mid-run nicht deaktiviert werden. Der Toggle räumt heute nur Frontend-State (Timer, localStorage, Progress-Anzeige), schickt aber keine Cancel-Message ans Backend — `AutoModeSpecOrchestrator` läuft weiter, Cloud-Terminal-Sessions bleiben offen, Watchdogs aktiv. Backlog-Auto-Mode hat das Verhalten seit PAM-006 korrekt (`backlog.auto-mode.cancel`); Spec hat das Pendant nie bekommen. Fix: ein `gateway.send` im Disable-Branch ergänzen — Backend-Handler, Cancel-Logik und Orchestrator-Cleanup existieren bereits ungenutzt.

## Tasks

| ID | Title | One-Liner |
|---|---|---|
| SAMC-001 | Frontend: send `workflow.auto-mode.cancel` on toggle-off | `gateway.send({ type: 'workflow.auto-mode.cancel', specId })` im else-Branch von `handleAutoModeToggle` |
| SAMC-997 | Code Review | Full-feature diff review (System) |
| SAMC-999 | Finalize PR | User-Todos, PR-Erstellung, Cleanup (System) |

> S-Spec Single-Layer: SAMC-998 (Integration Validation) wird übersprungen — Backend-Pfad bereits durch Backlog-Cancel-Tests abgedeckt; Single-Line-Frontend-Fix benötigt keine separate Integration-Story.

## Spec Scope

- Frontend `dashboard-view.ts:1591-1601` (else-Branch von `handleAutoModeToggle`) sendet `workflow.auto-mode.cancel` mit `specId` ans Backend
- Guard `if (this.selectedSpec)` verhindert Crash bei Navigation-Race
- Bestehender Frontend-Cleanup-Code (Timer, Progress, localStorage) bleibt unverändert
- Backlog-Auto-Mode-Verhalten unverändert

## Out of Scope

- AbortController für laufende Claude-SDK-Calls (laufende Story spielt aktuelle Round zu Ende — Follow-up)
- Worktree-Cleanup bei Mid-Run-Abbruch (Follow-up)
- UX-Feedback Toast/Banner "Auto-Mode abgebrochen" (Follow-up)
- Backend-Änderungen — Handler `handleAutoModeCancel` und `cancelAutoModeSession` existieren bereits

## Integration Requirements

**Integration Type:** Frontend-only (Backend-Pfad existiert ungenutzt)

### Integration Test Commands
- `cd ui/frontend && npm run build` — Frontend kompiliert grün

### End-to-End Scenarios
1. **Spec-Auto-Mode Mid-Run-Abbruch**: Spec mit ≥2 offenen Stories und git-strategy=worktree öffnen → Toggle an → Stories starten parallel → Toggle aus → DevTools-Network zeigt `workflow.auto-mode.cancel`-Frame mit korrekter `specId` → Server-Log `[Workflow] Auto-Mode: Cancelling orchestrator for spec <id>` → Ack `cancelled: true` → Cloud-Terminal-Sessions geschlossen, Watchdogs aus (Requires MCP: nein — manuell)
2. **Backlog-Regression**: Backlog-Auto-Mode starten, mid-run aus → muss weiter funktionieren (Cloud Sessions schließen, Watchdogs aus) (Requires MCP: nein — manuell)
3. **Edge: Toggle aus ohne `selectedSpec`** (Navigation-Race) → kein Crash, kein Send (Requires MCP: nein — Code-Review)

## Critical File References

- `ui/frontend/src/views/dashboard-view.ts:1591-1601` — Edit (else-Branch von `handleAutoModeToggle`)
- `ui/frontend/src/views/dashboard-view.ts:1843` — Referenz-Pattern (`handleBacklogAutoModeToggle`)
- `ui/src/server/websocket.ts:1054-1077` — Backend-Handler (Read-Only)
- `ui/src/server/workflow-executor.ts:3134-3144` — Cancel-Logik (Read-Only)
