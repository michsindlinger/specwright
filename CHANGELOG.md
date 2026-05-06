# Changelog

## 3.27.5 - 2026-05-06

### Behoben
- **Story-Sub-Branches kollidierten mit Spec-Branch (git ref hierarchy):** `storyBranchName(specId, storyId)` baute `feature/${feature}/${storyId}` — kollidierte mit der Spec-Branch `feature/${feature}`. Git-Refs sind hierarchisch und `git worktree add -b feature/foo/STORY` failed mit `fatal: cannot lock ref 'refs/heads/feature/foo/STORY': 'refs/heads/feature/foo' exists; cannot create 'refs/heads/feature/foo/STORY'`. Folge: jeder Parallel-Auto-Mode-Lauf (`maxConcurrent > 1`) hängte unmittelbar nach `git_strategy_set` (siehe v3.27.4-Halt-Mechanik).
- Story-Branches leben jetzt in eigenem Namespace `story/${feature}/${storyId}` — keine Kollision mit Spec-Branch.

### Behaviour-Change
- Bestehende Story-Sub-Worktrees aus Pre-v3.27.5 (Branch `feature/${feature}/${storyId}`) gibt es in der Praxis nicht — die Branch-Erstellung schlug ja immer fehl. Migration daher trivial: bei nächstem Auto-Mode-Run werden Sub-Worktrees mit neuem `story/...`-Branch-Schema erstellt.

### Tests
- `pam-005-worktree-helpers.test.ts > storyBranchName`: Erwartungen auf `story/...`-Format aktualisiert. +1 Regression-Test (`does NOT collide with spec branch`). 50/50 passing.

## 3.27.4 - 2026-05-06

### Behoben
- **Race-Condition bei Parallel-Auto-Mode ohne Story-Sub-Worktrees:** Wenn `gitStrategy='worktree'` + `maxConcurrent > 1` und `createStoryWorktree` fehlschlug (oder `worktreeOps` fehlte), fiel `AutoModeSpecOrchestrator.resolveSlotProjectPath` silent auf den geteilten Spec-Worktree-CWD zurück. Zwei parallele Stories landeten dann im selben CWD und blockierten sich gegenseitig — beide LLMs stallten in Endlosschleife (Stall-Recovery → Reset → Pickup → Stall …), Code-Fixes wurden zwar committed aber `kanban_complete_story` nie erreicht. Konkret beobachtet bei Spec `2026-05-05-ifdb-wcag-2-2-aa-remediation` (WCAG-012 + WCAG-013).
- Fallback-Verhalten ist jetzt strict: bei `maxConcurrent > 1` + Sub-Worktree-Failure halt + Incident + Throw (`story.sub-worktree-failure` Event). Bei `maxConcurrent === 1` bleibt der Silent-Fallback erlaubt (serial in geteiltem CWD = unproblematisch).

### Geändert
- `auto-mode-spec-orchestrator.ts:resolveSlotProjectPath`: neue Hilfsmethode `handleSubWorktreeFailure(itemId, reason)` setzt Auto-Mode-Incident, emittet `story.sub-worktree-failure`, ruft `haltScheduling()`. Throws nach Setup, damit der aufrufende `launchSlot` die Slot-Erstellung abbricht.
- `auto-mode-orchestrator-base.ts:launchSlot`: `resolveSlotProjectPath` Aufruf jetzt in try/catch — bei Throw wird `gate` released und der Slot wird nicht gestartet (kein Leak, kein activeSlots-Eintrag). Zusätzlicher `isCancelling`-Check zwischen `acquire` und Slot-Start.

### Behaviour-Change
- Auto-Mode-Halts wegen Sub-Worktree-Failure produzieren neuen Event-Type `story.sub-worktree-failure` (zusätzlich zu `story.dirty-worktree`, `story.merge-conflict`). UI-Handler sollten ihn ggf. spezifisch anzeigen — Default-Incident-Banner reicht aus.

### Tests
- `orchestrator-routing.test.ts`: +6 Tests für `resolveSlotProjectPath` (parallel + missing ops, serial + missing ops, parallel + throw, serial + throw, parallel + success, non-worktree). 14/14 passing.
- Bestehende Tests `pam-005-worktree-helpers` (49) + `orchestrator-routing` (existierende 8) unverändert grün.

## 3.27.3 - 2026-05-06

### Behoben
- Auto-Mode-Spec hängt erneut bei `<<BLOCKER:kanban.json-missing-V2-lean-spec-cannot-track-status>>` wenn ein manueller `git restore`-Style-Commit (oder ein Branch-Merge der einen alten kanban.json wiederbelebt) zwischen Auto-Mode-Stop und -Restart das gestrippte `kanban.json` ins Worktree zurückbringt. Die v3.27.0-Strip-Logik in `seedSpecDirInWorktree` lief nur einmalig beim Worktree-Setup und nutzte `fs.rm` — Index-Einträge aus späteren Commits blieben unberührt.
- Strip in `seedSpecDirInWorktree` + `seedBacklogDirInWorktree` ist jetzt zweistufig: `fs.rm` für Working-Tree + `git rm --cached --ignore-unmatch` für den Index. Catcht Restore-Commit-Drift beim nächsten Seed-Run.
- Neuer Helper `purgeShadowSpecMutables(worktreePath, specId)` (`worktree-story.ts`) als idempotente Drift-Defense. Wird nach jedem `onItemCompleted` in `auto-mode-spec-orchestrator.ts` aufgerufen — fängt Drift zwischen Stories ab (LLM-Fehler, Branch-Merges während Auto-Mode-Lauf).

### Geändert
- Spec-Orchestrator `onItemCompleted` (auto-mode-spec-orchestrator.ts): nach `commitMainKanbanIfDirty` zusätzlich `purgeShadowSpecMutables` für Spec-Worktree (skip wenn `gitStrategy !== 'worktree'` oder `projectPath === mainProjectPath`).
- JSDoc auf `MUTABLE_SPEC_FILES` erweitert um Drift-Defense-Hinweis (Doppel-Schutz: Seed + per-item Purge).

### Behaviour-Change
- Worktree-Branches die per `git restore`/Merge ein `kanban.json`/`kanban-board.md` (oder `backlog-index.json`) zurückgebracht hatten, bekommen beim nächsten Seed ODER nach jedem Story-Done einen `chore: drop shadow ...`-Commit. Architektur-bedingt korrekt — diese Files leben nur in main.

### Tests
- `pam-005-worktree-helpers.test.ts`: +6 Tests für `purgeShadowSpecMutables` (idempotent, restore-commit drift, both files, untracked-on-disk, missing path, non-repo) und +2 Tests für `seedSpecDirInWorktree` v3.27.3 strip-via-git-rm (restore-commit, tracked-but-missing). 49/49 passing.

## 3.27.2 - 2026-05-06

### Behoben
- Auto-Mode-V2-Lean-Specs blieben mit `<<BLOCKER:kanban.json-missing-V2-lean-spec-cannot-track-status>>` stehen, wenn der LLM im Worktree-CWD `kanban.json` nicht fand. Root-Cause: Workflow-Markdown las `kanban.json` direkt vom Filesystem statt über die kanban-MCP. Da `kanban.json` nach v3.27.0 nur noch im main-Repo lebt (Worktree-Strip via `seedSpecDirInWorktree`), schlugen alle direkten FS-Reads im Worktree fehl.
- Migriert auf MCP-Tool-Calls (`kanban_read`, `kanban_start_story`, `kanban_complete_story`, `kanban_update_phase`):
  - `spec-phase-1-lean.md` v2.0 → v2.1 — Validate + Finalize über MCP, kein direkter `ls/READ/WRITE`.
  - `spec-phase-3.md` v5.5 → v5.6 — Routing-Note, `specTier` aus `resumeInfo`, `phase_complete` über `kanban_update_phase` (oder no-op wenn `kanban_complete_story` `remaining=0` schon `currentPhase=complete` setzt).
  - `spec-phase-3-lean.md` v2.0 → v2.1 — gleiche Migration für V2-Lean-Variante (kritisch: V2-Lean ist der Standard-Pfad ab v3.24).
  - `spec-phase-3-code-review.md` v1.1 → v1.2, `spec-phase-3-integration-validation.md` v1.0 → v1.1, `spec-phase-3-finalize-pr.md` v1.0 → v1.1 — System-Stories (997/998/999) starten/abschließen über `kanban_start_story` + `kanban_complete_story`.

### Geändert
- `git add specwright/specs/{spec}/kanban.json` aus allen Worktree-Workflows entfernt — die Datei lebt nur in main, der Worktree-`git add` war silent-No-Op und ließ Mutationen als uncommitted Changes in main liegen.
- Neuer Helper `commitMainKanbanIfDirty` (`worktree-story.ts`) committet `kanban.json` aus dem main-Repo nach jedem `onItemCompleted`-Event in `auto-mode-spec-orchestrator.ts`. Cadence: per-Story (nicht per-Watcher-Tick), Skip auf early-return-Pfaden (dirty Worktree, Merge-Konflikt — werden bei nächstem erfolgreichen Story-Done re-synct).
- JSDoc auf `MUTABLE_SPEC_FILES` ergänzt um Hinweis auf orchestrator-side Commit-Pfad.

### Behaviour-Change
- Pro Story-Done entsteht jetzt zusätzlich ein `chore: [{storyId}] kanban.json post-completion sync`-Commit auf dem main-Branch. Hält das main-Working-Tree zwischen Story-Boundaries clean.

### Tests
- `pam-005-worktree-helpers.test.ts`: +5 Tests für `commitMainKanbanIfDirty` (modified, clean, missing, non-repo, isolation/only-kanban-staged). 41/41 passing.

### Out-of-Scope (Follow-up)
- `auto-mode-backlog-orchestrator.ts` hat dieselbe Lücke für `backlog-index.json`. TODO-Kommentar in `commitMainKanbanIfDirty`-JSDoc verweist darauf; Fix wenn analoger Blocker auftritt.

## 3.27.1 - 2026-05-05

### Behoben
- Auto-Mode-Spec im Sub-Worktree: UI sah Story-Fortschritt nicht. Drei kombinierte Lücken nach v3.27.0 — alle adressiert:
  - **Watcher-Path-Mismatch** (`auto-mode-spec-orchestrator.ts:71`, `auto-mode-backlog-orchestrator.ts`): Watcher zeigte auf Worktree-`kanban.json`/`backlog-index.json` statt main. MCP-Writes auf main wurden nie als Story-Done erkannt → Slot blieb belegt, weitere Stories warteten endlos. Watcher routet jetzt über `mainProjectPath ?? projectPath`.
  - **Seed-Helper Early-Return** (`worktree-story.ts seedSpecDirInWorktree` + `seedBacklogDirInWorktree`): Frühes `return` bei existierendem Worktree-Spec-Dir (z.B. aus base-branch-Checkout / auto-commit-before-worktree) übersprang den Mutable-Strip → `kanban.json`/`kanban-board.md`/`backlog-index.json` blieben als Shadow im Worktree und divergierten von main. Strip läuft jetzt unconditional.
  - **`mainProjectPath` collapse** (`workflow-executor.ts`): Wenn der UI-Project-Pfad selbst ein Sub-Worktree war, fiel `mainProjectPath` auf `projectPath` zurück → Slot-Check `slotProjectPath !== mainProjectPath` false → `SPECWRIGHT_MAIN_PROJECT_PATH` env-var nie gesetzt → MCP defaultete auf `process.cwd()` (Worktree). Neuer `resolveMainWorktreePath`-Helper (`worktree-detect.ts`) detektiert Sub-Worktrees via `git rev-parse --git-common-dir` und liefert den canonical main-worktree-Pfad.
- Finalize verwirft jetzt mutable-File-Drift im Worktree vor jedem `isWorktreeClean()`-Gate (`workflow-executor.ts finalizeSpecExecution`, beide Gates) — `rm` statt `git checkout HEAD --`, weil mutable Files nach Fix #2 nicht mehr getrackt sind.
- Plan-Review-Reviewer (`external-reviewer.ts`) haben jetzt Read/Grep/Glob auf den Codebase (vorher `tools: []`); Output-Validation lehnt substanzlose Reviews (nur tool_call-XML / Code-Blocks ohne Prosa) als Failure ab statt sie als gültigen Review durchzureichen.
- **Spec-/Backlog-Orchestrator-interne Kanban-Operationen** (`getReadyStories`, `resetStaleInProgress`, `updateStoryStatus`, `setAutoModeIncident`, `clearAutoModeIncident`, `resolveDependencies`, `getReadyBacklogItems`, `markItemInProgress`, `resetStaleInProgressItems`) liefen gegen `this.config.projectPath` (= Worktree-CWD bei gitStrategy=worktree). Da das Worktree-Spec-Dir nach Seed-Strip keine `kanban.json` enthält, sah `getReadyStories` ein leeres Kanban → keine Stories ready → Auto-Mode blieb stumm trotz aktivem `Auto`-Toggle. Operationen routen jetzt über `mainProjectPath` (canonical Source of Truth). Auch `worktreeOps`-git-Operationen (`mergeStoryBranchIntoSpec`, `removeStoryWorktree`) routen über main, da der git-Common-Dir dort liegt.

### Geändert
- `MUTABLE_SPEC_FILES` und `MUTABLE_BACKLOG_FILES` jetzt aus `worktree-story.ts` exportiert (single source of truth, importiert von `workflow-executor.ts`).
- `AutoModeBacklogOrchestrator.create` akzeptiert optionales `mainProjectPath`-Argument für defense-in-depth-Routing.
- `DEFAULT_REVIEW_PROMPT` (`general-config.ts`) benennt verfügbare Tools explizit und untersagt raw `<tool_call>`-XML.

### Behaviour-Change
- Feature-Branches die `kanban.json`/`kanban-board.md`/`backlog-index.json` getrackt hatten, bekommen beim nächsten Seed-Run einen `chore:`-Commit mit deren Deletion. Architektur-bedingt korrekt — mutable Files leben nur in main und werden via MCP-env-var-Routing aktualisiert.

### Tests
- `pam-005-worktree-helpers.test.ts`: +3 Tests für unconditional mutable-strip + MUTABLE_*_FILES exports.
- `worktree-detect.test.ts` (neu): 5 Tests für `resolveMainWorktreePath` (kein Repo, main, sub-worktree, nested path, nicht-existent).
- `external-reviewer.test.ts` (neu): 6 Tests für `isSubstanceLessReview`.
- `orchestrator-routing.test.ts` (neu): 8 Tests für Spec- und Backlog-Orchestrator Kanban-Op-Routing über `mainProjectPath` inklusive non-worktree-Regression und `getSpecWorkingDirectory`-Beibehaltung.

## 3.27.0 - 2026-05-04

### Behoben
- Auto-Mode Worktree-Strategie: Spec-Worktree-Symlinks ersetzt durch echte Datei-Kopie + `chore:`-Seed-Commit auf Feature-Branch. Symlinks haben `git status --porcelain` dauerhaft als dirty gezeigt → `isWorktreeClean()` blockierte `finalizeSpecExecution` → kein `git push`, kein `gh pr create`. Nach Fix entsteht der PR automatisch am Ende der Story-Ausführung.
- Symlink-Pollution-Folgefehler (`fatal: pathspec ... is beyond a symbolic link`) bei Claude-`git add` im Worktree fällt weg.
- Backlog-Auto-Mode analog migriert.

### Geändert
- MCP `kanban-mcp-server.ts` resolved Projektpfad jetzt über `SPECWRIGHT_MAIN_PROJECT_PATH` env-var (vom UI-Server gesetzt, wenn Claude im Worktree läuft). Schreib- und Lese-Operationen landen im Hauptprojekt → UI sieht Live-Fortschritt ohne Symlink.
- `.mcp.json` wird ins Worktree kopiert statt verlinkt.
- Alte Worktrees mit Legacy-Symlinks werden beim nächsten Auto-Mode-Run automatisch migriert (Symlink → Real-Seed).

## 3.19.3 - 2026-04-16

### Behoben
- UI `_initializeKanbanBoard` legte ein Legacy `kanban-board.md` an, obwohl `kanban.json` (v4.0) vom Workflow erstellt werden sollte — Folge: UI-Fallback hat die JSON-Version verschattet, wenn /create-spec Step 8.2 (MCP `kanban_create`) nicht ausgeführt wurde. Die Methode prüft jetzt zuerst auf `kanban.json` und bricht ab, bevor ein MD-Fallback geschrieben wird.

## 3.1.0 - 2026-02-18

### Neu
- Update-Benachrichtigung fuer CLI und UI
- `check-update.sh` Script fuer Versionspruefung
- `/check-update` Slash Command
- `VERSION` Datei als Single Source of Truth
- Update-Banner in der Getting Started Seite

### Geaendert
- `install.sh` schreibt jetzt `.installed-version` pro Projekt und `.version` global
- create-spec v3.6: Phase Detection und Resume Support

## 3.0.0 - 2026-01-15

Initiales Open Source Release.
