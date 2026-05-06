# Requirements Clarification - Bulletproof Parallel Auto-Mode

**Created:** 2026-05-06
**Status:** Approved (derived from approved plan `~/.claude/plans/alles-in-einem-rutsch-logical-pnueli.md`)

## Feature Overview

Make Specwright Auto-Mode production-grade for `gitStrategy=worktree` + `maxConcurrent>1`. Patches v3.27.0..v3.27.7 fixed individual symptoms (story branch namespace, MCP routing, permission prompts, shadow files, story branch collisions); v3.28.0 closes the remaining race-condition surface that surfaces under genuine N-way parallel load.

## Target Users

Specwright UI users running multi-story specs with parallel execution enabled. Concrete trigger: spec `2026-05-05-ifdb-wcag-2-2-aa-remediation` (56 tasks) recurringly stalled despite individual patches.

## Business Value

- **Stops the firefighting loop** — every parallel run during this session needed manual recovery (kanban sync scripts, branch cleanups, lock file removals). v3.28.0 should be the last hardening pass.
- **Restores trust** in parallel mode as a real productivity feature (2× throughput for independent stories).
- **Documented invariants** (lock hierarchy, mutex semantics) reduce future regression risk.

## Functional Requirements

1. **Two slots completing within 100ms must serialize their post-completion git work** without losing changeLog entries, corrupting kanban.json, or producing unexpected merge bases.
2. **Worktree-setup auto-commit must not race with completion handlers** for stories on the same project.
3. **Failed stories must not silently discard uncommitted LLM work** — same cleanliness gate as completed stories.
4. **Lock timeouts must not fire false positives** under realistic contention (raise `LOCK_TIMEOUT_MS`, lower `STALE_LOCK_MS`, jitter retries).
5. **`kanban.json` / `kanban-board.md` / `backlog-index.json` must be in user-project `.gitignore`** automatically when `setup-mcp.sh` runs.
6. **Lock-protocol files must stay byte-identical between UI and MCP copies** — CI test enforces.
7. **Documented lock hierarchy:** `withMainProjectLock` → `withKanbanLock`, never reverse.

## Affected Areas & Dependencies

- `ui/src/server/utils/main-project-mutex.ts` (NEW) — in-memory async mutex per main project path
- `ui/src/server/utils/kanban-lock.ts` + `specwright/scripts/mcp/kanban-lock.ts` (mirror) — tune timeouts, add jitter, add module-init invariant
- `ui/src/server/utils/worktree-story.ts` `commitMainKanbanIfDirty` — async + dual-locked
- `ui/src/server/services/auto-mode-spec-orchestrator.ts` `onItemCompleted`, `onItemFailed` — await commit; cleanliness gate parity
- `ui/src/server/workflow-executor.ts` `mergeStoryBranchIntoSpec`, `setupSpecWorktree` auto-commit — wrap in mutex
- `setup-mcp.sh` — gitignore installer step
- `ui/src/server/specs-reader.ts` — top-of-file writer-invariant comment (already correct, just documented)

## Edge Cases & Error Scenarios

- **Exception in mutex-held `fn`** must release lock for next caller AND let next caller's `fn` actually run (regression for `prev.catch().then(fn)` pattern; Promise rejection-poisoning is the standard pitfall).
- **30s+ mutex hold** logs warn but never throws (real hangs surface in logs without spuriously failing under transient slow I/O).
- **Mismatched lock-protocol versions** between UI and MCP (e.g. partial deploy) → CI test catches at build time.
- **User project without `.gitignore`** → installer prints manual-add instructions instead of erroring.
- **Concurrent `setupSpecWorktree` for spec B with `commitMainKanbanIfDirty` for spec A** on same main repo → same mutex key serializes them.

## Security & Permissions

No security model change. `--dangerously-skip-permissions` (added v3.27.7) remains in `AUTO_MODE_CLI_FLAGS` — Auto-Mode is explicit user opt-in.

## Performance Considerations

- Mutex hold duration bounded by `execSync` git ops (sub-second on typical repos). Server still responds to other projects (mutex keyed per main-project path).
- Lock timeout 5s → 15s allows realistic disk/network latency; stale 30s → 20s tightens crash recovery.
- Jittered retry breaks thundering-herd lockstep when many concurrent waiters wake simultaneously.

## Scope Boundaries

**IN SCOPE:**
- D1: New `withMainProjectLock` in-memory async mutex
- D2: `kanban-lock.ts` constant tuning + module-init invariant + lock-sync CI test
- D3: `commitMainKanbanIfDirty` async + dual-locked
- D4: `mergeStoryBranchIntoSpec` wrapped
- D5: `purgeShadowSpecMutables` post-merge call wrapped
- D6: `setupSpecWorktree` auto-commit wrapped
- D7: `setup-mcp.sh` gitignore installer
- D8: `onItemFailed` cleanliness gate parity
- D9: `specs-reader.ts` writer-invariant comment
- D10: CHANGELOG cross-process version warning
- Tests: mutex unit + integration parallel-completion + extended kanban-lock + extended pam-005 + onItemFailed
- Manual verification scenario (5-story parallel run + race-widen smoke + failure-path test)
- Release: VERSION 3.28.0, install.sh sync, CHANGELOG, CLAUDE.md mutex paragraph

**OUT OF SCOPE (deferred / explicit non-goals):**
- True multi-process mutex (single Express server owns orchestrator; cross-process need served by `withKanbanLock` already)
- `execSync` → `execFile` async refactor
- Auto-detect `git reset --hard` between auto-mode runs
- Watcher debounce for kanban-mtime spam
- Backlog-orchestrator parity for `backlog-index.json` (TODO comment only)

## Open Questions

None. Plan is fully specified after external review (anthropic:opus + deepseek:opus) and revisions documented in plan file's "Review-feedback responses" section.

## Proposed Tasks (High Level)

1. **Mutex primitive** — `main-project-mutex.ts` with rejection-safe chain pattern, soft 30s warn, lock hierarchy JSDoc
2. **Lock-protocol tune** — kanban-lock.ts constants in both copies, jitter, invariant assert, CI sync test
3. **Commit serialization** — `commitMainKanbanIfDirty` async + dual-locked
4. **Merge serialization** — `mergeStoryBranchIntoSpec` wrapped
5. **Spec-worktree purge serialization** — wrap post-merge call site
6. **Setup auto-commit serialization** — wrap `setupSpecWorktree` `git add -A` block
7. **Failure-path cleanliness** — `onItemFailed` mirrors `onItemCompleted` worktree gate
8. **Installer gitignore** — `setup-mcp.sh` appends mutable-files block
9. **Test suites** — unit + integration parallel-completion
10. **Docs + release** — JSDoc invariants, CHANGELOG warning, VERSION → 3.28.0

---
*Approved 2026-05-06 — derived from approved plan + post-review revisions.*
