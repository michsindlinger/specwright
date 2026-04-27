# Implementierungsplan: Parallel Auto-Mode für Spec- und Backlog-Kanban

> **Status:** APPROVED
> **Spec:** specwright/specs/2026-04-27-parallel-auto-mode/
> **Erstellt:** 2026-04-27
> **Basiert auf:** requirements-clarification.md
> **Quelle:** Plan-Mode-Plan unter `~/.claude/plans/wir-haben-in-unseren-functional-nest.md`, mit zwei Review-Runden iteriert

---

## Executive Summary

Auto-Mode parallelisiert max 2 unabhängige Stories/Items gleichzeitig — global pro Projekt über Spec-Kanban + Backlog-Kanban hinweg. Worktree-per-Story für Branch-Isolation. Backlog-Execution wird auf PTY-Sessions migriert um Code-Pfad-Duplikation mit Spec-Auto-Mode zu vermeiden. Wallclock-Halbierung bei unabhängigen Stories ohne Race-Conditions, ohne Datenverlust.

---

## Architektur-Entscheidungen

### Gewählter Ansatz

**Geteilter Concurrency-Kern + zwei Scope-spezifische Orchestratoren:**

```
                    ┌──────────────────────────────────┐
                    │ ProjectConcurrencyGate            │ (neu, pro Project)
                    │ - acquire() / release()           │
                    │ - max 2 globale Slots             │
                    └─────────────┬────────────────────┘
                                  │ benutzt
                    ┌─────────────▼─────────────────────┐
                    │ AutoModeOrchestratorBase          │ (abstrakt)
                    │ - Map<id, AutoModeStorySlot>      │
                    │ - serialisierter scheduleTick()   │
                    │ - Worktree-per-Story Lifecycle    │
                    │ - Multi-Incident Mgmt             │
                    └──────┬─────────────────┬──────────┘
                           │                 │
            ┌──────────────▼──┐  ┌──────────▼──────────────┐
            │ AutoModeSpec     │  │ AutoModeBacklog          │
            │ Orchestrator     │  │ Orchestrator             │
            │ - getReadySet via│  │ - getReadySet via        │
            │   SpecsReader    │  │   BacklogReader          │
            │ - Spec-Branch    │  │ - PR-Flow pro Item       │
            │   Merge-Back     │  │ - kein Merge-Back        │
            └─────────┬────────┘  └──────────┬───────────────┘
                      │                      │
                      └──────────┬───────────┘
                                 │ delegiert PTY-Lifecycle
                      ┌──────────▼─────────────┐
                      │ AutoModeStorySlot      │
                      │ - 1 PTY-Session        │
                      │ - Stall + Prompt       │
                      │ - Worktree-Pfad inj.   │
                      └────────────────────────┘
```

### Begründung

- **Eine Slot-Klasse statt zwei Code-Pfade:** Backlog wird auf PTY migriert (statt heutiger `--print`-Spawn). Stall-Watchdog + Prompt-Detection greifen damit auch für Backlog. Spar-Effekt: doppelter Maintenance-Aufwand entfällt.
- **Globaler Cap statt Per-Spec/Per-Backlog:** Schützt Resource-Limits (RAM, API-Rate) — 2 Specs á 2 Slots + Backlog 2 Slots wäre 6 PTYs gleichzeitig.
- **Orchestrator-Base abstrahiert Concurrency, Subklassen liefern Scope-Logik:** Dependency-Resolution + Spec-Merge-Back nur in Spec-Variante, PR-Flow nur in Backlog-Variante.
- **Ein PR statt mehrere:** User-Wunsch. Commit-Disziplin innerhalb des PRs — ein Commit pro Phase, sequenziell review-bar.

### Patterns & Technologien

- **Pattern:** Semaphor (`ProjectConcurrencyGate`), Template Method (Orchestrator-Base + Subklassen), Event-Emitter (Slot-Events)
- **Technologie-Reuse:** `CloudTerminalManager` (PTY), `withKanbanLock` (file-lock), `git worktree`, `KanbanFileWatcher` (mit erweiterter API)
- **Begründung:** Maximaler Reuse bestehender Infrastruktur. Kein neuer externer Dependency, keine neue Lock-Datei-Konvention (würde MCP-Cross-Process-Koordination brechen).

---

## Komponenten-Übersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `AutoModeStorySlot` | Service | 1 PTY-Session, Stall-Watchdog, Prompt-Detection (rename + slim aus `AutoModeCloudSession`) |
| `AutoModeOrchestratorBase` | Service (abstract) | `Map<id, slot>`, `Gate`, serialisierter Scheduling-Tick, Worktree-Lifecycle |
| `AutoModeSpecOrchestrator` | Service | Spec-spezifische Ready-Set-Quelle, Spec-Branch Merge-Back |
| `AutoModeBacklogOrchestrator` | Service | Backlog-spezifische Ready-Set-Quelle, PR-Flow pro Item |
| `ProjectConcurrencyGate` | Util | Schmaler Semaphor, eine Instanz pro `projectPath` |

### Zu ändernde Komponenten

| Komponente | Änderungsart | Grund |
|------------|--------------|-------|
| `auto-mode-cloud-session.ts` | Rename + Slim → `auto-mode-story-slot.ts` | Schedule-Logik wandert in Orchestrator |
| `kanban-file-watcher.ts` | API-Erweiterung (Set-of-IDs + Filename-Param) | Watch von `kanban.json` und `backlog-index.json` |
| `specs-reader.ts` | `getReadyStories` Helper, `activeIncidents[]` Layer (V1+V2) | Multi-Slot-Scheduling braucht ready-set; Multi-Incident-Modell |
| `backlog-reader.ts` | `getReadyBacklogItems`, Status-Enum erweitern, `resumeContext` | Backlog-Orchestrator braucht ready-set + Auto-Mode-State |
| `backlog-item-storage.ts` | `withKanbanLock` für alle Writes | Heute parallele Writes ohne Lock — Race-Risiko |
| `workflow-executor.ts` | Map-Type-Migration, PTY-Migration für Backlog, Worktree-per-Story Helper, Multi-Slot-Cancel | Hauptintegrations-Punkt |
| `websocket.ts` | Backlog-Scheduling Backend-getrieben, neue Event-Types, Multi-Slot-Demux | Frontend-Timer-Entfernung; Multi-Slot-State synchronisieren |
| `dashboard-view.ts` | Backlog-Timer entfernen, `AutoModeProgressBoard`-State pro View | Backend übernimmt Scheduling |
| `kanban-board.ts` (Spec) | Multi-Slot-Pills, `autoModeProgressBoard` | UI für N parallele Slots + Waiting-State |
| `auto-mode-error-modal.ts` | Multi-Incident-Liste | Mehrere Failures gleichzeitig möglich |
| `backlog-schema.json` | Status-Enum + `resumeContext`-Feld | `blocked` heute nicht modelliert; Auto-Mode-State persistieren |

### Nicht betroffen (explizit)

- `CloudTerminalManager` — bleibt stabil, `MAX_SESSIONS=Infinity` bereits gegeben
- `withKanbanLock` Implementation — wird wiederverwendet, nicht generalisiert
- MCP `kanban_start_story` / `kanban_complete_story` — Atomicity bleibt
- Spec-Worktree-Strategie (`gitStrategy='worktree'`) — bleibt als _Voraussetzung_ für Parallelmodus, kein neues Strategie-Enum
- Tech-Stack-Profile, Skills, Templates

---

## Umsetzungsphasen

### Phase 1: Schema- und Reader-Vorarbeit (PAM-001, PAM-002, PAM-003)
**Ziel:** Daten-Layer und Generic-Watcher für Multi-Slot-Verbrauch vorbereiten — Verhalten unverändert.
**Komponenten:** `backlog-schema.json`, `BacklogJsonItem`, `withKanbanLock`-Audit, `SpecsReader.getReadyStories`, `BacklogReader.getReadyBacklogItems`, `activeIncidents[]`-Layer, `KanbanFileWatcher` Set-of-IDs
**Abhängig von:** Nichts (Startphase)

### Phase 2: Slot + Orchestrator-Base + Backlog-PTY-Migration (PAM-004)
**Ziel:** Concurrency-Infrastruktur + Backlog auf PTY umstellen — `maxConcurrent=1`, Status-quo-Verhalten erhalten.
**Komponenten:** `auto-mode-story-slot.ts`, `auto-mode-orchestrator-base.ts`, `auto-mode-spec-orchestrator.ts`, `auto-mode-backlog-orchestrator.ts`, `project-concurrency-gate.ts`, Backlog `runClaudeCommand` → `CloudTerminalManager.createSession`, Per-ID-Dedup, `Promise.allSettled` Cancel, `git worktree prune`
**Abhängig von:** Phase 1

### Phase 3: Worktree-per-Story Helper (PAM-005)
**Ziel:** FS-Isolation pro Slot, Symlinks, Konflikt-Handling.
**Komponenten:** `createStoryWorktree`, `removeStoryWorktree`, `mergeStoryBranchIntoSpec`, `setupBacklogSymlink`, Symlink-Pfad-Tests, Konflikt-Pfad
**Abhängig von:** Phase 2

### Phase 4: Backlog-Backend-Scheduling + Frontend-Timer-Entfernung (PAM-006)
**Ziel:** Backlog-Scheduling vom Frontend-Timer ins Backend verlagern.
**Komponenten:** WebSocket `backlog.auto-mode.start`/`cancel`, `dashboard-view.ts` Timer-Entfernung
**Abhängig von:** Phase 2

### Phase 5: Echte Parallelität freischalten (PAM-007)
**Ziel:** `maxConcurrent=2` global aktivieren, Hard-Requirement `gitStrategy=worktree` für Spec.
**Komponenten:** `ProjectConcurrencyGate` Default-Wert, Tick-Scheduling, UI-Banner-Logik
**Abhängig von:** Phase 3, Phase 4

### Phase 6: Frontend Multi-Slot + Queued-State (PAM-008)
**Ziel:** UI für N parallele Slots, Waiting-Pills, Multi-Incident-Modal.
**Komponenten:** `AutoModeProgressBoard`-State, Multi-Slot-Pills (Spec + Backlog), `auto-mode-error-modal.ts`
**Abhängig von:** Phase 5

### Phase 7: Integration & Validation (PAM-997, PAM-998, PAM-999)
**Ziel:** Code Review, End-to-End-Tests, PR.
**Komponenten:** Alle vorigen + System-Stories
**Abhängig von:** Phase 1-6

---

## Komponenten-Verbindungen (KRITISCH)

### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zuständige Story | Validierung |
|--------|--------|----------------|------------------|-------------|
| `AutoModeOrchestratorBase` | `ProjectConcurrencyGate` | Composition (acquire/release) | PAM-004 | `grep -n "gate.acquire" ui/src/server/services/auto-mode-orchestrator-base.ts` |
| `AutoModeOrchestratorBase` | `AutoModeStorySlot` | Map<id, slot> + EventEmitter | PAM-004 | `grep -n "AutoModeStorySlot" ui/src/server/services/auto-mode-orchestrator-base.ts` |
| `AutoModeSpecOrchestrator` | `SpecsReader.getReadyStories` | Method call inside scheduleTick | PAM-004 | `grep -n "getReadyStories" ui/src/server/services/auto-mode-spec-orchestrator.ts` |
| `AutoModeBacklogOrchestrator` | `BacklogReader.getReadyBacklogItems` | Method call inside scheduleTick | PAM-004 | `grep -n "getReadyBacklogItems" ui/src/server/services/auto-mode-backlog-orchestrator.ts` |
| `WorkflowExecutor` | `AutoModeSpecOrchestrator` | Map<specId, orchestrator> | PAM-004 | `grep -n "autoModeSpecOrchestrators" ui/src/server/workflow-executor.ts` |
| `WorkflowExecutor` | `AutoModeBacklogOrchestrator` | Map<projectPath, orchestrator> | PAM-004 | `grep -n "autoModeBacklogOrchestrators" ui/src/server/workflow-executor.ts` |
| `AutoModeStorySlot` | `CloudTerminalManager` | createSession / closeSession | PAM-004 | `grep -n "cloudTerminalManager.createSession" ui/src/server/services/auto-mode-story-slot.ts` |
| `AutoModeOrchestratorBase` | `KanbanFileWatcher` | watch with Set<id> | PAM-003 + PAM-004 | `grep -n "KanbanFileWatcher" ui/src/server/services/auto-mode-orchestrator-base.ts` |
| `WorkflowExecutor.startBacklogStoryExecution` | `AutoModeStorySlot` (PTY) | Replaces `runClaudeCommand` | PAM-004 | `! grep -n "runClaudeCommand.*backlog" ui/src/server/workflow-executor.ts` |
| `WebSocketHandler` (Backlog) | `AutoModeBacklogOrchestrator` | start/cancel via Map lookup | PAM-006 | `grep -n "backlog.auto-mode" ui/src/server/websocket.ts` |
| `dashboard-view.ts` | (Backlog-Timer entfernt) | KEINE Verbindung mehr | PAM-006 | `! grep -n "_scheduleNextBacklogAutoExecution" ui/frontend/src/views/dashboard-view.ts` |
| Frontend `kanban-board.ts` | `AutoModeProgressBoard` | Property + Render | PAM-008 | `grep -n "autoModeProgressBoard" ui/frontend/src/components/kanban-board.ts` |
| `auto-mode-error-modal.ts` | `activeIncidents[]` | Property mit Liste | PAM-008 | `grep -n "activeIncidents" ui/frontend/src/components/auto-mode-error-modal.ts` |
| `backlog-schema.json` | TypeScript `BacklogJsonItem` | Status-Enum-Sync | PAM-001 | `grep -n "'blocked'" ui/src/server/backlog-reader.ts` |

### Verbindungs-Details

**V1: AutoModeOrchestratorBase → ProjectConcurrencyGate**
- **Art:** Composition + async acquire/release
- **Schnittstelle:** `await this.gate.acquire(); ...; this.gate.release();`
- **Datenfluss:** Slot-Permit (Promise resolves wenn Slot frei)
- **Story:** PAM-004
- **Validierung:** `grep -rn "gate.acquire\|gate.release" ui/src/server/services/`

**V2: AutoModeStorySlot → CloudTerminalManager**
- **Art:** Direkter Service-Call (PTY-Lifecycle)
- **Schnittstelle:** `manager.createSession(projectPath, 'claude-code', modelConfig, undefined, undefined, prompt, mcpFlags)` + `manager.closeSession(sessionId)`
- **Datenfluss:** Session-ID rein, Lifecycle-Events raus
- **Story:** PAM-004
- **Validierung:** `grep -n "cloudTerminalManager" ui/src/server/services/auto-mode-story-slot.ts`

**V3: WorkflowExecutor.startBacklogStoryExecution → AutoModeStorySlot (PTY)**
- **Art:** Code-Replacement (`runClaudeCommand` raus, PTY rein)
- **Schnittstelle:** Backlog-Item bekommt eigenen Slot mit Worktree-Pfad
- **Datenfluss:** itemId + worktreePath + model → Slot-Spawn
- **Story:** PAM-004
- **Validierung:** `! grep -n "runClaudeCommand.*backlog" ui/src/server/workflow-executor.ts && grep -n "AutoModeStorySlot" ui/src/server/workflow-executor.ts`

**V4: Backend ↔ Frontend WebSocket-Demux**
- **Art:** Multi-Slot-Events mit `storyId`-Discriminator
- **Schnittstelle:** `workflow.auto-mode.slot.update`, `workflow.auto-mode.slot.queued`
- **Datenfluss:** Backend pusht pro Slot-Update einen Event; Frontend mergt in `slots[storyId]`
- **Story:** PAM-008
- **Validierung:** Manueller E2E-Test mit 2 parallelen Stories

### Verbindungs-Checkliste

- [x] Jede neue Komponente hat mindestens eine Verbindung definiert
- [x] Jede Verbindung ist einer Story zugeordnet
- [x] Validierungsbefehle sind ausführbar (grep + manuelle Tests)

---

## Abhängigkeiten

### Interne Abhängigkeiten

```
PAM-001 (Schema + Locks) ──┐
                            ├──> PAM-004 (Slot + Orchestrator + PTY-Migration)
PAM-002 (Reader-Helper) ───┤
                            │
PAM-003 (Watcher API) ─────┘

PAM-004 ──┬──> PAM-005 (Worktree Helper)
          ├──> PAM-006 (Backlog Backend-Scheduling)

PAM-005 + PAM-006 ──> PAM-007 (Echte Parallelität freischalten)

PAM-007 ──> PAM-008 (Frontend Multi-Slot + Queued)

PAM-001..008 ──> PAM-997 (Code Review)
PAM-997 ──> PAM-998 (Integration Validation, Full-Stack)
PAM-998 ──> PAM-999 (Finalize PR)
```

### Externe Abhängigkeiten

- `git` ≥ 2.5 (worktree-Support — bereits Voraussetzung im Projekt)
- `node-pty` (CloudTerminalManager) — bereits in Verwendung
- Keine neuen npm-Dependencies

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Symlink-Pfad-Arithmetik bei Sub-Worktree (Spec + Backlog) | Mittel | Hoch (silent break) | Unit-Test mit `realpath`-Auflösung pro Sub-Worktree-Tiefe in PAM-005 |
| Merge-Back-Konflikte (Spec-only, neue Failure-Klasse) | Mittel | Mittel (Story blocked, manuelle Auflösung) | UI-Hinweis mit Worktree-Pfad, Sub-Worktree wird _nicht_ aufgeräumt |
| Backlog-PTY-Migration Funktional-Drift | Niedrig | Mittel | Smoke-Test mit 4 unabhängigen Items vor Phase-7-Aktivierung |
| `--session-id` Resumability geht verloren | Niedrig | Niedrig (heute nicht benutzt) | CHANGELOG-Hinweis |
| `backlog-index.json` parallele Writes ohne Lock heute | Hoch (heute Status quo) | Mittel (Race) | PAM-001: alle Backlog-Writes auf `withKanbanLock` umstellen, vor PAM-004 |
| `fs.watch` Debouncing schluckt Events | Niedrig | Niedrig | Orchestrator liest in jedem Tick die Datei _neu_ statt Event-Payload zu vertrauen (Status quo des Watchers) |
| Inflight-Cancel-Race | Mittel | Mittel | `state = cancelling` synchron VOR Slot-Cleanup gesetzt |
| `createSpecSymlink` Pfad-Arithmetik | Mittel | Hoch | Siehe oben (Symlink-Test) |
| Spec-Worktree-Branch-History bei parallelen Merges | Niedrig | Niedrig | `--no-ff` macht Reihenfolge sichtbar, akzeptabel |
| Backlog-Items mit Datei-Konflikten | Mittel | Mittel | UI-Hinweis im Auto-Mode-Error-Modal bei PR-Conflict |
| Frontend-Timer-Entfernung — UX-Breaking | Niedrig | Niedrig | App ist Single-Process-Dev-Tool, Reload genügt; CHANGELOG-Hinweis |
| Multi-Spec-Parallelität via globalem Gate (Starvation) | Niedrig | Niedrig | FIFO im Gate, User priorisiert via Queue-Reihenfolge |
| Stranded Worktree-Dirs auf Disk nach Crash | Mittel | Niedrig | `git worktree prune` automatisch beim Konstruktor; Disk-Dirs manuell aufräumen (Doku) |
| TOCTOU bei Slot-Start | Niedrig | Hoch (Doppel-Start) | Tick serialisiert + atomare `updateStoryStatus(in_progress)` _innerhalb_ Lock _vor_ PTY-Spawn |
| Cross-Process-Lock-Bruch durch `withFileLock`-Generalisierung | (vermieden) | (vermieden) | `withKanbanLock` weiternutzen statt umbenennen |

---

## Self-Review Ergebnisse

### Validiert (zwei Review-Runden)

- **Plan-Mode-Review #1:** Concurrency-Limit, Failure-Mode, Rollout, Scope-Entscheidungen vom User bestätigt
- **Plan-Mode-Review #2:** 15 detaillierte Punkte adressiert — 8 angenommen, 3 modifiziert, 3 mit Argument abgelehnt, 1 als bewusst-nicht-adressiert dokumentiert
- **Backlog-vs-Spec-Asymmetrie korrekt erkannt:** Backlog nutzt heute `--print`-Spawn ohne PTY → Migration-Entscheidung explizit getroffen (Option A)
- **Cross-Process-Lock-Risiko vermieden:** `withKanbanLock` weiternutzen statt umbenennen
- **TOCTOU + Per-ID-Dedup:** beide explizit adressiert
- **Schema-Drift Backlog-Status:** `blocked`-Enum-Erweiterung in PAM-001 verankert (sonst Type-Crash bei Failure-Pfad)

### Identifizierte Probleme & Lösungen

| Problem | Ursprünglicher Plan | Verbesserung |
|---------|--------------------|--------------|
| Backlog nutzt kein PTY (kritische Fehlannahme) | "AutoModeStorySlot shared zwischen Spec+Backlog" | Backlog-Execution explizit auf `CloudTerminalManager.createSession` migrieren |
| `withFileLock`-Generalisierung würde Cross-Process-Lock zerlegen | Lock-Util generalisieren | Verworfen — `withKanbanLock(dirPath)` weiternutzen für `backlog-index.json`-Writes |
| `KanbanFileWatcher` file-level würde macOS-Reliabilität reduzieren | Switch zu file-watching | Directory-Watching beibehalten, nur API erweitern (Filename-Param + Set<id>) |
| Backlog-Status-Enum ohne `blocked` | Status nicht erweitert | PAM-001 erweitert Schema + TS-Union |
| TOCTOU beim Slot-Start | "Tick serialisiert" | Verschärft: nach `gate.acquire` zusätzlich Re-Read unter Lock + atomare Status-Schreibung VOR PTY-Spawn |
| Per-ID-Dedup fehlt | `lastCompletedStoryId: string` | `processedTransitions: Map<id, lastSeenStatus>` |
| Multi-Spec-Race-Concern | "globaler Cap reicht" | Klargestellt: verschiedene Orchestratoren operieren auf verschiedenen Files → kein Cross-Race; nur Within-Orchestrator-Tick-Serialization nötig |
| Auto-Merge zum `main` (Backlog) | "Merge-Back wie Spec" | Backlog: PR-Flow bleibt unverändert; Auto-Merge nur Spec-Branch-internal |
| Mehrere Incidents überschreiben sich | `lastIncident` (single) | `activeIncidents[]` mit One-shot-Migration aus `lastIncident` |
| Waiting-State unsichtbar | nur "running" State | `slotState: 'running' \| 'waiting'` mit Queued-Pill in UI |

### Offene Fragen

Keine — Plan ist nach zwei Review-Runden vollständig spezifiziert.

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar für |
|---------|-------------|-------------|
| `CloudTerminalManager.createSession` (PTY-Lifecycle) | `ui/src/server/services/cloud-terminal-manager.ts` | `AutoModeStorySlot`, Backlog-PTY-Migration |
| `withKanbanLock(dirPath, fn)` | `ui/src/server/utils/kanban-lock.ts` | Cross-File-Lock für `backlog-index.json` (gleiche `kanban.json.lock`-Filename-Konvention, MCP-kompatibel) |
| `git worktree add/remove/prune` Pattern | `workflow-executor.ts:521-616` | Sub-Worktree-Helper für PAM-005 |
| `createSpecSymlink` | `workflow-executor.ts:~2740` | Vorlage für `setupBacklogSymlink` (Pfad-Arithmetik beachten) |
| `resolveDependencies` V1+V2-Branch-Pattern | `specs-reader.ts:402+` | Vorlage für `setAutoModeIncident` / `clearAutoModeIncident` Multi-Format-Branches |
| `KanbanFileWatcher` directory-watching mit `isProcessing`-Guard | `kanban-file-watcher.ts` | Status-quo-Verhalten beibehalten; nur API erweitern |
| `withKanbanLock` für `kanban.json` heute | `specs-reader.ts:~390` | Identisches Pattern für `backlog-index.json` |
| Branch-Naming `feature/${slug}` (Backlog) | `workflow-executor.ts:374` (BPS-002) | Beibehalten, nur Worktree-Pfad ändert sich |
| Spec-Branch-Konvention `feature/${featureName}` | bestehend | Sub-Story-Branches: `feature/${featureName}/${storyId}` |

### Optimierungen

| Ursprünglich | Optimiert zu | Ersparnis |
|--------------|--------------|-----------|
| Neue `withFileLock`-Util | `withKanbanLock` weiternutzen | Eine Datei weniger, kein Cross-Process-Lock-Risiko |
| `JsonFileWatcher` Rename + file-watching | `KanbanFileWatcher` API-Erweiterung, dir-watching | macOS-Reliabilität, weniger Diff |
| `parallel-story-runner.ts` als separate Klasse | In `auto-mode-orchestrator-base.ts` als abstrakte Base konsolidiert | Eine Datei weniger |
| `shared/constants/auto-mode.ts` | Konstanten inline in Base-Class | Eine Datei weniger |
| Frontend-Timer beibehalten + Backend zusätzlich | Frontend-Timer vollständig entfernen, Backend übernimmt | Single Source of Truth, kein Race zwischen Timern |
| 8 neue Backend-Files | 5 neue Backend-Files (Slot, Base, Spec-Orch, Backlog-Orch, Gate) | Reduzierter Refactor-Surface |

### Feature-Preservation bestätigt

- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert (alle Schritte aus User-bestätigten Entscheidungen + Reviews umgesetzt)
- [x] Alle Akzeptanzkriterien bleiben erfüllbar (UI Multi-Slot, Waiting-State, Multi-Incident)

---

## Bewusst nicht adressiert

- **Cross-Process-Lock-Migration auf `withFileLock`-Generalisierung:** Verworfen — würde MCP-Server-Koordination brechen, kein Mehrwert
- **Rolling-Restart-Schutz beim Backlog-Timer-Wechsel:** App ist lokales Single-Process-Dev-Tool, Reload genügt
- **Voll-automatische Crash-Recovery für stranded Worktree-Dirs:** Nur `git worktree prune` läuft automatisch; Disk-Dirs könnten uncommitted Work enthalten
- **User-konfigurierbarer Concurrency-Limit:** Hardcoded 2, später möglich via `general-config.json`
- **Per-Spec-Override:** Out of Scope für v1
- **Telemetry-Tracking der Slot-Auslastung:** Out of Scope für v1

---

## Nächste Schritte

Nach Genehmigung dieses Plans:
1. Step 2.6-lean: Tasks aus diesem Plan in `kanban.json` (mode=lean) generieren
2. Step 4: Spec ready for `/execute-tasks`
