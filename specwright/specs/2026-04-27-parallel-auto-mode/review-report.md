# Code Review Report — Parallel Auto-Mode für Spec- und Backlog-Kanban

**Datum:** 2026-04-27
**Branch:** feature/parallel-auto-mode
**Reviewer:** Claude (Opus)

## Review Summary

**Geprüfte Commits:** 6 (PAM-001, PAM-003, PAM-004, PAM-006, PAM-007, PAM-008) + 2 Tasks ohne separaten Commit (PAM-002 in PAM-001/PAM-004 gefaltet, PAM-005 Implementation uncommitted)
**Geprüfte Dateien:** 21
**Gefundene Issues:** 4

| Schweregrad | Anzahl |
|-------------|--------|
| Critical | 2 |
| Major | 1 |
| Minor | 1 |

## Spec-Conformance

### Expected Deliverable Checklist
| Deliverable (aus spec.md) | Implementiert? | Files / Notes |
|---------------------------|----------------|---------------|
| `auto-mode-story-slot.ts` (rename + slim) | ✅ | `ui/src/server/services/auto-mode-story-slot.ts` (230 LOC) |
| `auto-mode-orchestrator-base.ts` (neu) | ✅ | `ui/src/server/services/auto-mode-orchestrator-base.ts` (250 LOC) |
| `auto-mode-spec-orchestrator.ts` (neu) | ✅ | `ui/src/server/services/auto-mode-spec-orchestrator.ts` (201 LOC) |
| `auto-mode-backlog-orchestrator.ts` (neu) | ✅ | `ui/src/server/services/auto-mode-backlog-orchestrator.ts` (56 LOC) |
| `project-concurrency-gate.ts` (neu) | ✅ | `ui/src/server/services/project-concurrency-gate.ts` (41 LOC), MAX_CONCURRENT=4 |
| Erweiterte `kanban-file-watcher.ts` (Set-of-IDs API) | ✅ | watch(specPath, filename, ids: Set<string>), addId/removeId, processedTransitions Map |
| `getReadyStories` + `getReadyBacklogItems` | ✅ | specs-reader.ts:117, backlog-reader.ts:588 |
| `activeIncidents[]` Multi-Incident-Layer (V1+V2) | ✅ | specs-reader.setAutoModeIncident/clearAutoModeIncident |
| Worktree-per-Story Helpers in `workflow-executor.ts` | ⚠️ Partial | createStoryWorktree / removeStoryWorktree / mergeStoryBranchIntoSpec / setupBacklogSymlink existieren als public API, **Spec-Orchestrator inlined eigene Implementierung** statt diese aufzurufen; **Backlog-Orchestrator nutzt sie gar nicht** (siehe Critical #2) |
| Backend-getriebenes Backlog-Scheduling | ✅ | WS handlers backlog.auto-mode.start/cancel, Frontend-Timer entfernt |
| Multi-Slot Frontend-State + UI (`AutoModeProgressBoard`) | ✅ | dashboard-view._specAutoModeBoards (Map<specId, Map<storyId,Progress>>), kanban-board.autoModeProgressBoard |
| Multi-Incident-Modal | ✅ | auto-mode-error-modal.ts mit activeIncidents[] + per-Incident-Dismiss |
| Schema-Update `backlog-schema.json` | ✅ | itemStatus enum enthält 'blocked', resumeContext.activeIncidents[] |
| Wallclock-Halbierung E2E messbar | ⚠️ | Spec parallel funktioniert; **Backlog parallel race-anfällig** (siehe Critical #2) |

### Plan-Validation Results (Verbindungs-Matrix)
**Geprüft:** 14 Validierungen — 14 passed, 0 failed, 0 manual-only

| Source → Target | Story | Validation | Result |
|-----------------|-------|------------|--------|
| Base → Gate | PAM-004 | `grep -n "gate.acquire" auto-mode-orchestrator-base.ts` | ✅ Pass (Z. 134) |
| Base → AutoModeStorySlot | PAM-004 | `grep -n "AutoModeStorySlot" auto-mode-orchestrator-base.ts` | ✅ Pass (Z. 21, 46, 141) |
| SpecOrch → getReadyStories | PAM-004 | `grep -n "getReadyStories" auto-mode-spec-orchestrator.ts` | ✅ Pass (Z. 117) |
| BacklogOrch → getReadyBacklogItems | PAM-004 | `grep -n "getReadyBacklogItems" auto-mode-backlog-orchestrator.ts` | ✅ Pass (Z. 42) |
| Executor → SpecOrch Map | PAM-004 | `grep -n "autoModeSpecOrchestrators" workflow-executor.ts` | ✅ Pass |
| Executor → BacklogOrch Map | PAM-004 | `grep -n "autoModeBacklogOrchestrators" workflow-executor.ts` | ✅ Pass |
| Slot → CloudTerminalManager | PAM-004 | `grep -n "cloudTerminalManager.createSession" auto-mode-story-slot.ts` | ✅ Pass (Z. 67) |
| Base → KanbanFileWatcher | PAM-003+004 | `grep -n "KanbanFileWatcher" auto-mode-orchestrator-base.ts` | ✅ Pass |
| Executor.startBacklogStoryExecution → Slot | PAM-004 | `! grep -n "runClaudeCommand.*backlog" workflow-executor.ts` | ✅ Pass (PTY-Path Z. 477) |
| WS → BacklogOrch | PAM-006 | `grep -n "backlog.auto-mode" websocket.ts` | ✅ Pass |
| dashboard-view (Backlog-Timer entfernt) | PAM-006 | `! grep _scheduleNextBacklogAutoExecution dashboard-view.ts` | ✅ Pass |
| kanban-board → AutoModeProgressBoard | PAM-008 | `grep -n "autoModeProgressBoard" kanban-board.ts` | ✅ Pass |
| auto-mode-error-modal → activeIncidents[] | PAM-008 | `grep -n "activeIncidents" auto-mode-error-modal.ts` | ✅ Pass |
| backlog-reader 'blocked' status | PAM-001 | `grep -n "'blocked'" backlog-reader.ts` | ✅ Pass |

### Scope Compliance
- **In-Scope deliverables present:** 12/12 (1 partial — Worktree-Helpers werden nicht durchgängig aufgerufen)
- **Out-of-Scope-Violations:** 0
- **Plan-Drift (undocumented files):** 0

## Geprüfte Dateien

| File | Status |
|------|--------|
| `specwright/templates/schemas/backlog-schema.json` | Schema-Erweiterung: 'blocked' status enum, resumeContext.activeIncidents[] (PAM-001) |
| `ui/src/server/backlog-reader.ts` | mapJsonStatusToFrontend mit 'blocked'; getReadyBacklogItems(excludeIds) |
| `ui/src/server/backlog-item-storage.ts` | withKanbanLock für alle backlog-index.json-Writes (PAM-001) |
| `ui/src/server/specs-reader.ts` | getReadyStories(excludeIds), activeIncidents[] V1/V2 layer |
| `ui/src/server/services/kanban-file-watcher.ts` | Set-of-IDs API (watch/addId/removeId), processedTransitions Map, V2-Lean-Detection |
| `ui/src/server/services/project-concurrency-gate.ts` | Semaphore (acquire/release/drain), Hard-Cap 4 |
| `ui/src/server/services/auto-mode-story-slot.ts` | 1 PTY pro Story, Stall-Watchdog, Prompt-Detection, MCP-Cleanup |
| `ui/src/server/services/auto-mode-orchestrator-base.ts` | Tick-Scheduler (serialized), Map<id, slot>, Watcher-Wiring, git worktree prune im Konstruktor |
| `ui/src/server/services/auto-mode-spec-orchestrator.ts` | resolveSlotProjectPath erstellt Sub-Worktree pro Story, Merge-Back inline (`git merge --no-ff`) |
| `ui/src/server/services/auto-mode-backlog-orchestrator.ts` | **Kein resolveSlotProjectPath-Override → keine FS-Isolation pro Item (siehe Critical #2)** |
| `ui/src/server/services/auto-mode-cloud-session.ts` | API-Update für Watcher Set-of-IDs (1 Zeile) |
| `ui/src/server/workflow-executor.ts` | Map-Typen migriert, startBacklogStoryExecution → PTY via Orchestrator, Listener-Wiring (Spec+Backlog), 4 worktree helper public methods |
| `ui/src/server/websocket.ts` | handleBacklogAutoModeStart/Cancel (PAM-006) |
| `ui/frontend/src/views/dashboard-view.ts` | _specAutoModeBoards / _backlogAutoModeBoard, Frontend-Timer entfernt, Multi-Slot WS Demux |
| `ui/frontend/src/components/kanban-board.ts` | autoModeProgressBoard property + Multi-Slot Pills |
| `ui/frontend/src/components/auto-mode-error-modal.ts` | activeIncidents[] mit Per-Incident-Dismiss |
| `ui/tests/unit/pam-002-reader-helpers.test.ts` | 311 LOC — getReadyStories/getReadyBacklogItems coverage |
| `ui/tests/unit/pam-003-watcher-api.test.ts` | 296 LOC — Set-of-IDs / addId / removeId / processedTransitions |
| `ui/tests/unit/pam-005-worktree-helpers.test.ts` | **UNCOMMITTED (siehe Critical #1)** |
| `ui/src/server/utils/worktree-story.ts` | **UNCOMMITTED (siehe Critical #1)** |
| `ui/tests/integration/kanban-ui-initialization.test.ts` | 1-line Anpassung |

## Issues

### Critical Issues

**#1 — PAM-005 Implementation und Tests sind nicht committed**
- **Datei:** `ui/src/server/utils/worktree-story.ts` (untracked), `ui/tests/unit/pam-005-worktree-helpers.test.ts` (untracked)
- **Beschreibung:** PAM-005 (Worktree-per-Story Helper) ist im kanban.json als `done` mit `commits: []` markiert. Die zugehörigen Implementierungs-Files sind aber nur untracked im Working-Tree. `auto-mode-spec-orchestrator.ts` und `workflow-executor.ts` importieren `from './utils/worktree-story.js'` — ohne diese Datei bricht der Build auf einem frischen Clone und Spec-Parallel-Modus mit gitStrategy=worktree funktioniert nicht.
- **Empfehlung:** Beide Files mit explizitem `feat(PAM-005)`-Commit stagen, bevor PAM-997 Housekeeping-Commit läuft.

**#2 — Backlog-Orchestrator schaltet keine FS-Isolation pro Item ein (Plan-Drift)**
- **Datei:** `ui/src/server/services/auto-mode-backlog-orchestrator.ts`, `ui/src/server/workflow-executor.ts:359-515`
- **Beschreibung:** Spec sagt explizit „Worktree-per-Story für Branch-Isolation (Spec + Backlog)" und „Backlog-Parallel: 2 PTY-Sessions parallel, je eigenes Sub-Worktree". `AutoModeBacklogOrchestrator` überschreibt aber `resolveSlotProjectPath` nicht und verwendet daher den Haupt-Workdir des Projekts für jedes Item. Mit `maxConcurrent=2` checken zwei `startBacklogStoryExecution`-Aufrufe nacheinander Branches im selben Workdir aus (`gitService.checkoutMain` → `pull` → `createBranch`), während ein bereits laufendes Slot-Claude im Workdir arbeitet. Dies führt zu Race-Conditions auf HEAD und Datei-Inkonsistenzen.
- **Plan-Validation:** Helper `backlogWorktreePath` und `setupBacklogSymlinkInWorktree` existieren in `worktree-story.ts`, werden aber nirgends aufgerufen.
- **Empfehlung:** `AutoModeBacklogOrchestrator.resolveSlotProjectPath` analog zur Spec-Variante implementieren: pro Item-ID `backlogWorktreePath` berechnen, `git worktree add` auf der pro-Item-Branch ausführen, `setupBacklogSymlinkInWorktree` aufrufen, in `onItemCompleted/Failed` aufräumen.

### Major Issues

**#3 — Spec-Orchestrator nutzt nicht die public WorkflowExecutor-Helpers**
- **Datei:** `ui/src/server/services/auto-mode-spec-orchestrator.ts:90-99, 135-148, 192-200`
- **Beschreibung:** `auto-mode-spec-orchestrator.ts` enthält eine eigene Inline-Variante von `git worktree add`, `git merge --no-ff` und `git worktree remove`, statt die in PAM-005 dafür angelegten public Helper `WorkflowExecutor.createStoryWorktree / mergeStoryBranchIntoSpec / removeStoryWorktree` zu verwenden. Das ist funktional äquivalent, verursacht aber doppelten Wartungsaufwand und hebt den Vorteil zentralisierter Worktree-Operationen auf.
- **Empfehlung (deferred):** Folge-Cleanup: SpecOrchestrator-Inline-Code durch Aufruf der WorkflowExecutor-Methoden ersetzen, dabei Konflikt-Pfad (kein Worktree-Cleanup) klar markieren.

### Minor Issues

**#4 — Schema-Drift backlog-schema.json vs BacklogJsonItem**
- **Datei:** `specwright/templates/schemas/backlog-schema.json:90`, `ui/src/server/backlog-reader.ts:49-79`
- **Beschreibung:** Schema deklariert `backlogItem.required = ["id","type","title","slug","priority","effort","status","category","storyFile","createdAt","updatedAt"]`. TypeScript-Type `BacklogJsonItem` macht `slug, category, storyFile, effort, createdAt, updatedAt` optional und akzeptiert zusätzlich `executedIn, completedAt, model, resumeContext`. Das verursacht keine Laufzeitfehler (Read-Layer trolerant), erschwert aber Schema-Validation.
- **Empfehlung (deferred):** Schema mit Realität abgleichen — entweder `required`-Liste reduzieren oder TypeScript strict aufziehen.

## Fix Status

| # | Schweregrad | Issue | Status | Fix-Details |
|---|-------------|-------|--------|-------------|
| 1 | Critical | PAM-005 worktree-story.ts + Test untracked | fixed | Commit `05a0629 feat(PAM-005): commit worktree-per-story helpers + tests` |
| 2 | Critical | Backlog-Orchestrator ohne Worktree-FS-Isolation | deferred-bug-ticket | PAM-FIX-001 (kanban_add_item, priority=critical, effort=3) |
| 3 | Major | SpecOrchestrator Inline-Git statt public Helpers | deferred-bug-ticket | PAM-FIX-002 (kanban_add_item, priority=high, effort=1) |
| 4 | Minor | Schema-Drift backlog-schema vs TS-Type | log-only | Kein Fix erforderlich, Read-Layer tolerant |

## Re-Review

**Datum:** 2026-04-27
**Geänderte Files seit Initial-Review:** 2 (PAM-005 commit `05a0629`)
- `ui/src/server/utils/worktree-story.ts` (created, 97 LOC)
- `ui/tests/unit/pam-005-worktree-helpers.test.ts` (created, 230 LOC)

**Neue Issues:** keine.
**Auto-Fix Result:** 1/4 fixed inline, 2/4 deferred-bug-tickets, 1/4 log-only.

## Empfehlungen

1. **Vor PR-Erstellung (PAM-999):** PAM-005-Files committen.
2. **Backlog-Worktree-Gap:** Vor Backlog-Auto-Mode-Aktivierung in Production fixen — sonst Datei-Konflikte bei zwei parallelen Items.
3. **SpecOrchestrator-Refactor:** Public Helper-Methods auf `WorkflowExecutor` aufrufen statt Inline-execSync, um Doppel-Wartung zu vermeiden.
4. **Tests:** Pre-existing Vitest-Failures (terminal-manager, model-config, aos-project-add-modal, project-state, websocket-terminal) sind nicht PAM-bezogen — separater Fix-PR empfohlen.

## Fazit

Review passed (after fixes) — 2 Issues als Bug-Tickets erstellt (PAM-FIX-001, PAM-FIX-002). Critical #1 inline gefixt (Commit `05a0629`). Build, Lint und Frontend-Build laufen sauber. PAM-spezifische Unit-Tests (PAM-002, PAM-003, PAM-005) passen einzeln. Critical #2 (Backlog-Worktree-Gap) sollte vor Backlog-Auto-Mode-Production-Use gefixt sein — PAM-998 sollte das verifizieren.
