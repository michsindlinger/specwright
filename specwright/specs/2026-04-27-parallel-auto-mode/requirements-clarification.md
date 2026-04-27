# Requirements Clarification - Parallel Auto-Mode für Spec- und Backlog-Kanban

**Created:** 2026-04-27
**Status:** Pending User Approval

## Feature Overview

Auto-Mode parallelisieren: Statt Stories/Items strikt sequenziell abzuarbeiten, sollen bei nicht-blockierten Stories bis zu 2 parallel laufen — sowohl im Spec-Kanban als auch im Backlog-Kanban.

## Target Users

Specwright-User, die im UI-Auto-Mode mehrere unabhängige Stories pro Spec oder mehrere Backlog-Items haben und bisher Wallclock-Zeit verlieren, weil alles serialisiert wird.

## Business Value

- **Wallclock-Halbierung** bei unabhängigen Stories (zwei parallele PTYs statt einer sequenziellen Pipeline)
- **Bessere Resource-Auslastung** wenn Claude-Sessions auf I/O warten (Test-Runs, MCP-Calls)
- **Konsistente Auto-Mode-Erfahrung** zwischen Spec- und Backlog-Kanban (heute: separate Code-Pfade, separate Bottlenecks)
- **Voraussetzung für höhere Concurrency** (Hard-Cap=4 lässt Spielraum für spätere Tunings)

## Functional Requirements

1. Bei aktivem Auto-Mode laufen **max 2 unabhängige Stories/Items parallel** (global pro Projekt — über Spec + Backlog hinweg)
2. **Dependency-Respect (Spec):** Eine Story startet nur, wenn alle ihre `dependencies` Status `done`/`in_review` haben
3. **Branch-Isolation:** Jede parallele Story bekommt ein eigenes Git-Worktree + eigenen Branch (kein File-Konflikt-Risiko innerhalb eines Workdirs)
4. **Spec-Merge-Back:** Nach Erfolg wird der Story-Branch via `git merge --no-ff` ins Spec-Branch gemerged (Merge-Konflikt → Story `blocked` mit Incident)
5. **Backlog-PR-Flow bleibt:** Jedes Backlog-Item pusht weiterhin eigenen Branch + erstellt eigenen PR (kein Auto-Merge zu `main`)
6. **Failure-Tolerance:** Eine fehlschlagende Story stoppt nicht die Geschwister — Geschwister laufen weiter, gescheiterte Story wird `blocked` mit Incident
7. **Multi-Incident-UI:** Mehrere Incidents gleichzeitig sichtbar, einzeln dismissibar
8. **Waiting-State-UI:** Wenn der Concurrency-Cap erreicht ist und weitere Stories warten, zeigt UI explizit "Wartet auf freien Slot"
9. **Backlog auf PTY-Sessions umstellen:** Heute `--print`-Spawn ohne Stall-Watchdog/Prompt-Detection; neu CloudTerminalManager-PTY wie Spec-Auto-Mode → einheitliche Recovery-UX
10. **Cancel-Semantik:** `workflow.auto-mode.cancel` (Spec) und neuer `backlog.auto-mode.cancel` stoppen alle aktiven Slots des jeweiligen Scopes, räumen Sub-Worktrees auf, setzen Stories zurück auf `ready`

## Affected Areas & Dependencies

- **Backend Services (`ui/src/server/services/`):**
  - `auto-mode-cloud-session.ts` → Refactor zu schlankem `auto-mode-story-slot.ts` (1 Story, 1 PTY)
  - **Neu:** `auto-mode-orchestrator-base.ts` (Map<id, slot>, Gate, Tick-Scheduler)
  - **Neu:** `auto-mode-spec-orchestrator.ts`, `auto-mode-backlog-orchestrator.ts`
  - **Neu:** `project-concurrency-gate.ts` (globaler Semaphor pro Projekt)
  - `kanban-file-watcher.ts` — API-Erweiterung: Set-of-IDs + zweiter Filename (`backlog-index.json`)
- **Backend Reader/Writer:**
  - `specs-reader.ts` — neuer `getReadyStories(excludeIds)`-Helper, `activeIncidents[]`-Layer (V1+V2)
  - `backlog-reader.ts` — neuer `getReadyBacklogItems(excludeIds)`, Status-Enum erweitern um `blocked`, `resumeContext`-Feld
  - `backlog-item-storage.ts` — `withKanbanLock` für alle `backlog-index.json`-Writes
- **Workflow-Executor (`workflow-executor.ts`):**
  - Map-Type-Migration `AutoModeCloudSession` → `AutoModeSpecOrchestrator`
  - **Neu:** `Map<projectPath, AutoModeBacklogOrchestrator>`
  - `startBacklogStoryExecution()` von `runClaudeCommand` (--print) auf PTY umstellen
  - Worktree-per-Story Helper: `createStoryWorktree`, `mergeStoryBranchIntoSpec`, `removeStoryWorktree`, `setupBacklogSymlink`
  - `cancelSpecAutoMode`/`cancelBacklogAutoMode` mit `Promise.allSettled`
- **WebSocket-Layer (`websocket.ts`):**
  - Backlog-Scheduling von Frontend-Timer ins Backend verlagern (`backlog.auto-mode.start`/`cancel`)
  - Neue Outbound-Events: `workflow.auto-mode.slot.update`, `workflow.auto-mode.slot.queued`, `workflow.auto-mode.spec.halted`/`backlog.halted`
- **Schema (`specwright/templates/schemas/backlog-schema.json`):**
  - Status-Enum um `blocked` erweitern
  - `resumeContext: { autoModeActive, activeIncidents[] }` Feld neu
- **Frontend:**
  - `dashboard-view.ts`: Backlog-Frontend-Timer entfernen, `AutoModeProgressBoard`-State pro View
  - `kanban-board.ts` (Spec) + Backlog-View: Multi-Slot-Pills mit `slotState='waiting'`-Variante
  - `auto-mode-error-modal.ts`: Liste mehrerer Incidents

## Edge Cases & Error Scenarios

- **Merge-Konflikt im Spec-Branch:** Story → `blocked`, Sub-Worktree bleibt für manuelle Auflösung erhalten, Incident mit Pfad
- **Cancel mid-flight:** Beide aktiven Slots werden via `Promise.allSettled` beendet, Stories auf `ready` zurückgesetzt, Worktrees gepruned
- **Crash/`kill -9`:** `git worktree prune` beim Orchestrator-Konstruktor räumt verwaiste Git-Metadaten auf; Disk-Dirs bleiben (User könnte uncommitted Work haben)
- **Spec mit `gitStrategy=branch`:** Auto-Mode clamped auf `maxConcurrent=1` mit deutlichem UI-Banner
- **Two parallel stories modifying same file:** Heute auch sequenziell ein Risiko (zwei Branches mergen), parallel erhöht Wahrscheinlichkeit. Konflikt-Pfad oben greift
- **Zwei fast-zeitgleiche Status-Writes auf kanban.json:** `withKanbanLock` macht atomar; `KanbanFileWatcher` debounced; Orchestrator liest in jedem Tick die Datei neu
- **TOCTOU beim Slot-Start:** `scheduleTick` ist serialisiert pro Orchestrator. Innerhalb Tick: Gate.acquire → Lock → re-read → updateStoryStatus(in_progress) → PTY-Spawn
- **`lastIncident` Migration:** Read-Layer mergt einmal in `activeIncidents`-Array, neue Writes nur Array, alte Felder werden beim ersten Re-Write `null`-gesetzt
- **Inflight-Cancel-Race:** Orchestrator-State `cancelling` synchron gesetzt, blockiert neue Slot-Starts während Cleanup
- **Per-ID Watcher-Dedup:** `lastCompletedStoryId: string | null` → `processedTransitions: Map<id, lastSeenStatus>` für N-parallele Stories

## Security & Permissions

- Kein neues Permissions-Modell, kein neuer Auth-Pfad
- Worktrees liegen im selben Filesystem-Scope wie Project-Workdir (`${projectDir}-worktrees/`); kein Cross-User-Access
- PR-Flow für Backlog bleibt unverändert (User-Review vor Merge)

## Performance Considerations

- 2 PTY-Sessions parallel ≈ 2× Memory-Footprint von einem Auto-Mode-Lauf — akzeptabel auf modernen Dev-Maschinen
- API-Rate-Limits: `maxConcurrent=2` ist konservativ, lässt Headroom; Hard-Cap `4` als Sicherheitsnetz
- Lock-Contention auf `kanban.json` bei 2 fast-zeitgleichen Story-Completions: gering (lock kurz, 2 Slots maximal)
- Wallclock-Erwartung: bei 2 unabhängigen Stories ≈ 50% Zeit-Reduktion gegenüber heute

## Scope Boundaries

**IN SCOPE:**
- Spec-Kanban-Auto-Mode parallelisieren (max 2)
- Backlog-Kanban-Auto-Mode parallelisieren (max 2)
- Backlog-Execution auf PTY-Sessions migrieren
- Worktree-per-Story für beide Kanbans
- `withKanbanLock` für `backlog-index.json`-Writes (heute fehlt)
- Multi-Incident-Modell + UI
- Waiting-State-UI bei Cap-Erreichen
- Schema-Update für `backlog-schema.json` (Status-Enum + `resumeContext`)

**OUT OF SCOPE:**
- User-konfigurierbarer Concurrency-Limit (hardcoded auf 2, später möglich)
- Per-Spec-Override des Limits
- Auto-Recovery für stranded Worktree-Dirs auf Disk (manuell aufräumen)
- WebSocket-Versions-Handshake bei Rolling-Restart (App ist lokales Dev-Tool)
- Migration alter Pre-`activeIncidents` Specs (Read-Layer mergt einmal, dann stabil)
- Multi-Spec-Parallelität über mehrere Specs gleichzeitig (globaler Cap erlaubt es technisch, UI exposed nichts dafür)
- Telemetry-Tracking der Slot-Auslastung

## Open Questions

Keine — Plan ist bereits in Plan-Mode mit zwei Review-Runden abgenommen.

## Proposed Tasks (High Level — V2 Lean)

1. **PAM-001: Schema- und Reader-Vorarbeit** — `backlog-schema.json` mit `blocked`-Status + `resumeContext`, TypeScript-Union erweitern, `withKanbanLock` für alle Backlog-Writes
2. **PAM-002: Reader-Helper** — `SpecsReader.getReadyStories`, `BacklogReader.getReadyBacklogItems`, `activeIncidents[]`-Layer mit V1+V2 Branches und `lastIncident`-Migration
3. **PAM-003: KanbanFileWatcher Set-of-IDs API** — Filename-Parameter (kanban.json | backlog-index.json), Set<id>, `addId`/`removeId`, Directory-Watching beibehalten
4. **PAM-004: Slot + Base + Orchestratoren + Backlog-PTY** — `auto-mode-story-slot.ts` (Rename + Slim), `auto-mode-orchestrator-base.ts`, Spec-Orchestrator, Backlog-Orchestrator, `project-concurrency-gate.ts`, Backlog `runClaudeCommand` → `CloudTerminalManager.createSession`, Per-ID-Dedup, `Promise.allSettled` für Cancel, `git worktree prune` beim Konstruktor
5. **PAM-005: Worktree-per-Story Helper** — `createStoryWorktree`, `removeStoryWorktree`, `mergeStoryBranchIntoSpec`, `setupBacklogSymlink`, Symlink-Pfad-Unit-Tests, Konflikt-Pfad
6. **PAM-006: Backlog-Backend-Scheduling + Frontend-Timer-Entfernung** — `backlog.auto-mode.start`/`cancel` Handshake, Frontend-Timer-Entfernung in `dashboard-view.ts`
7. **PAM-007: Echte Parallelität freischalten** — `maxConcurrent=2` aktivieren, Tick-Scheduling, Hard-Requirement `gitStrategy=worktree` für Spec-Parallel, sonst maxConcurrent=1 + UI-Banner
8. **PAM-008: Frontend Multi-Slot + Queued-State** — `AutoModeProgressBoard` State + WS-Demux, Multi-Slot-Pills (running + waiting), Multi-Incident-Modal
9. **PAM-997: Code Review** — Full-Feature-Diff Review (system task)
10. **PAM-998: Integration Validation** — End-to-End-Tests (Full-Stack) (system task, conditional)
11. **PAM-999: Finalize PR** — User-Todos, PR-Erstellung, Cleanup (system task)

---

*Review this document carefully. Once approved, the implementation plan from plan-mode will be formalized and tasks generated.*
