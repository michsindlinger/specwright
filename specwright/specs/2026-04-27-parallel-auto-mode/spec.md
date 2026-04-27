# Spec Requirements Document

> Spec: Parallel Auto-Mode für Spec- und Backlog-Kanban
> Created: 2026-04-27
> Status: Planning

## Overview

Auto-Mode parallelisiert max 2 unabhängige Stories/Items gleichzeitig — global pro Projekt über Spec-Kanban + Backlog-Kanban hinweg. Worktree-per-Story für Branch-Isolation. Backlog-Execution wird auf PTY-Sessions migriert um Code-Pfad-Duplikation mit Spec-Auto-Mode zu vermeiden.

Wallclock-Halbierung bei unabhängigen Stories ohne Race-Conditions, ohne Datenverlust. Fundament: Branch-per-Story-Spec (BPS-001..006) bereits abgeschlossen, `CloudTerminalManager.MAX_SESSIONS = Infinity`, `withKanbanLock` für atomare JSON-Writes vorhanden.

## Tasks (V2 Lean)

Tasks werden in `kanban.json` (mode=lean) generiert. Siehe `implementation-plan.md` für vollständige Details der Phasen.

| Task ID | Title | Plan-Section |
|---------|-------|---------------|
| PAM-001 | Schema- und Reader-Vorarbeit | Phase 1 |
| PAM-002 | Reader-Helper (getReadyStories, getReadyBacklogItems, activeIncidents) | Phase 1 |
| PAM-003 | KanbanFileWatcher Set-of-IDs API | Phase 1 |
| PAM-004 | Slot + Base-Orchestrator + Backlog-PTY-Migration | Phase 2 |
| PAM-005 | Worktree-per-Story Helper | Phase 3 |
| PAM-006 | Backlog-Backend-Scheduling + Frontend-Timer-Entfernung | Phase 4 |
| PAM-007 | Echte Parallelität freischalten (maxConcurrent=2) | Phase 5 |
| PAM-008 | Frontend Multi-Slot + Queued-State | Phase 6 |
| PAM-997 | Code Review (System Task) | Phase 7 |
| PAM-998 | Integration Validation (System Task, Full-Stack) | Phase 7 |
| PAM-999 | Finalize PR (System Task) | Phase 7 |

## Spec Scope

- Spec-Kanban-Auto-Mode parallelisieren (max 2 Stories gleichzeitig)
- Backlog-Kanban-Auto-Mode parallelisieren (max 2 Items gleichzeitig)
- Globaler Concurrency-Cap pro Projekt (über Spec + Backlog hinweg)
- Backlog-Execution auf PTY-Sessions migrieren (`runClaudeCommand` → `CloudTerminalManager.createSession`)
- Worktree-per-Story für Branch-Isolation (Spec + Backlog)
- `withKanbanLock` für `backlog-index.json`-Writes (heute fehlt)
- Multi-Incident-Modell (`activeIncidents[]`) + UI mit Liste
- Waiting-State-UI bei Cap-Erreichen
- Schema-Update für `backlog-schema.json` (`blocked`-Status + `resumeContext`)
- Backend-getriebenes Backlog-Scheduling (Frontend-Timer entfernt)
- Per-ID-Dedup im KanbanFileWatcher (`processedTransitions: Map<id, status>`)
- Hard-Requirement: Spec-Parallelität nur mit `gitStrategy=worktree`

## Out of Scope

- User-konfigurierbarer Concurrency-Limit (hardcoded 2, später erweiterbar)
- Per-Spec-Override des Limits
- Auto-Recovery für stranded Worktree-Dirs auf Disk
- WebSocket-Versions-Handshake bei Rolling-Restart
- Migration alter Pre-`activeIncidents` Specs (Read-Layer mergt einmal)
- Multi-Spec-Parallelität über mehrere Specs gleichzeitig (technisch erlaubt durch Cap, UI exposed nichts dafür)
- Telemetry-Tracking der Slot-Auslastung
- `withFileLock`-Generalisierung (Cross-Process-Lock-Risiko)
- File-level statt Directory-level `fs.watch` (macOS-Reliabilität)

## Expected Deliverable

- `ui/src/server/services/auto-mode-story-slot.ts` (umbenannt + slim)
- `ui/src/server/services/auto-mode-orchestrator-base.ts` (neu)
- `ui/src/server/services/auto-mode-spec-orchestrator.ts` (neu)
- `ui/src/server/services/auto-mode-backlog-orchestrator.ts` (neu)
- `ui/src/server/services/project-concurrency-gate.ts` (neu)
- Erweiterte `kanban-file-watcher.ts` (Set-of-IDs API)
- `getReadyStories` + `getReadyBacklogItems` Reader-Helper
- `activeIncidents[]` Multi-Incident-Layer (V1+V2)
- Worktree-per-Story Helpers in `workflow-executor.ts`
- Backend-getriebenes Backlog-Scheduling
- Multi-Slot Frontend-State + UI (`AutoModeProgressBoard`)
- Multi-Incident-Modal
- Schema-Update `backlog-schema.json`
- Wallclock-Halbierung bei 2 unabhängigen Stories messbar in E2E-Test

## Integration Requirements

> ⚠️ **IMPORTANT:** These integration tests will be executed automatically after all stories complete via System Story PAM-998.

**Integration Type:** Full-stack (Backend + Frontend + Schema)

- [ ] **Integration Test 1:** Build & Lint
   - Command: `cd ui && npm run lint && npm run build:backend && cd frontend && npm run build`
   - Validates: TypeScript strict mode, alle neuen Files ohne Errors, kein `any`
   - Requires MCP: no

- [ ] **Integration Test 2:** Unit-Tests
   - Command: `cd ui && npm test`
   - Validates: `getReadyStories`, `getReadyBacklogItems`, `ProjectConcurrencyGate`, Symlink-Pfad-Auflösung, `activeIncidents`-Migration
   - Requires MCP: no

- [ ] **Integration Test 3:** Spec-Parallel E2E
   - Command: Manueller Smoke-Test (siehe Scenario 1)
   - Validates: 2 PTY-Sessions parallel, Sub-Worktrees, Spec-Branch-Merges, kanban.json-Konsistenz
   - Requires MCP: no

- [ ] **Integration Test 4:** Backlog-Parallel E2E
   - Command: Manueller Smoke-Test (siehe Scenario 2)
   - Validates: 2 PTY-Sessions parallel für Backlog, 2 separate PRs erstellt
   - Requires MCP: no

- [ ] **Integration Test 5:** Failure-Tolerance
   - Command: Manueller Smoke-Test (siehe Scenario 3)
   - Validates: Eine Story fehlschlagen lassen, Geschwister läuft weiter, Incident sichtbar
   - Requires MCP: no

- [ ] **Integration Test 6:** Cancel mid-flight
   - Command: Manueller Smoke-Test (siehe Scenario 4)
   - Validates: Beide Slots beendet, Stories `ready`, Worktrees gepruned
   - Requires MCP: no

**Integration Scenarios:**

- [ ] **Scenario 1 — Spec-Parallel:** Test-Spec mit 4 unabhängigen Stories anlegen, `gitStrategy=worktree`, Auto-Mode aktivieren. Beobachten: 2 PTY-Sessions parallel, je eigenes Sub-Worktree (`${proj}-worktrees/${spec}-PAM-XXX`), je eigener Branch (`feature/${spec}/PAM-XXX`), Merge-Back in Spec-Branch nach Erfolg, kanban.json zeigt korrekten Endzustand mit allen Stories `done`.

- [ ] **Scenario 2 — Backlog-Parallel:** 4 unabhängige Backlog-Items im Backlog, Auto-Mode aktivieren. Beobachten: 2 PTY-Sessions parallel, je eigenes Sub-Worktree (`${proj}-worktrees/backlog-${slug}`), je eigener `feature/${slug}`-Branch, **2 separate PRs erstellt** (kein Auto-Merge), `backlog-index.json` zeigt korrekten Endzustand.

- [ ] **Scenario 3 — Failure-Tolerance:** Spec mit 2 Stories, eine davon mit fehlerhaftem Code (provoziert Build-Fail). Beobachten: gescheiterte Story → `blocked` mit Incident im UI sichtbar, Geschwister läuft weiter und schließt erfolgreich ab. Bei beiden Kanbans testen.

- [ ] **Scenario 4 — Cancel mid-flight:** Während 2 Slots aktiv laufen, Cancel-Button klicken. Beobachten: beide PTY-Sessions sauber beendet (`Promise.allSettled`), Stories zurück auf `ready`, Sub-Worktrees aufgeräumt (`git worktree list` zeigt nur noch Spec-Worktree).

- [ ] **Scenario 5 — gitStrategy=branch Fallback:** Spec mit `gitStrategy=branch` Auto-Mode. Beobachten: `maxConcurrent=1` (sequenziell), UI-Banner "Parallel-Modus benötigt Worktree-Strategie".

- [ ] **Scenario 6 — Multi-Spec / Spec+Backlog:** Zwei Specs gleichzeitig + Backlog im Auto-Mode. Beobachten: globaler Cap=2 fair zugeteilt, max 2 PTYs gesamt, Waiting-Pills für blockierte Slots.

**Notes:**
- App ist lokales Dev-Tool — alle E2E-Tests laufen auf lokaler Maschine
- Wallclock-Erwartung: 2 unabhängige Stories ≈ 50% Zeit-Reduktion vs. heute
- Bei Crash/`kill -9`: `git worktree prune` läuft beim Neustart automatisch; Disk-Dirs ggf. manuell aufräumen

## Spec Documentation

- Implementation Plan: @specwright/specs/2026-04-27-parallel-auto-mode/implementation-plan.md
- Requirements Clarification: @specwright/specs/2026-04-27-parallel-auto-mode/requirements-clarification.md
- Kanban (Tasks): @specwright/specs/2026-04-27-parallel-auto-mode/kanban.json
