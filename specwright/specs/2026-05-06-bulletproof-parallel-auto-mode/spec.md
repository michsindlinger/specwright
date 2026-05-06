# Spec Requirements Document

> Spec: Bulletproof Parallel Auto-Mode (v3.28.0)
> Created: 2026-05-06
> Status: Planning

## Overview

Make Specwright Auto-Mode production-grade for the parallel-execution path: `gitStrategy=worktree` + `maxConcurrent>1`. Patches v3.27.0 through v3.27.7 closed individual symptoms (worktree symlinks, MCP routing, story branch namespacing, permission prompts, shadow files), but the architectural race surface — concurrent git index ops on the main project from multiple completion handlers — remains. v3.28.0 introduces an in-memory `withMainProjectLock` mutex per main project path, wraps every main-repo write path through it, tunes the cross-process kanban file lock to realistic timeouts, mirrors the cleanliness gate to `onItemFailed`, and installs gitignore rules automatically via `setup-mcp.sh`.

The driver: spec `2026-05-05-ifdb-wcag-2-2-aa-remediation` (56 tasks) recurringly stalled at every multi-story parallel attempt during this session. Each individual fix exposed the next race; this spec closes the surface comprehensively.

## User Stories

See `requirements-clarification.md` and `implementation-plan.md` in the same folder.

## Spec Scope

- **D1 — `withMainProjectLock`**: New in-memory async mutex `ui/src/server/utils/main-project-mutex.ts`. Promise-chain pattern with `prev.catch().then(fn)` to prevent rejection-poisoning. Soft 30s/60s warn-not-throw timeouts. Documented lock hierarchy.
- **D2 — Lock-protocol tune**: `LOCK_TIMEOUT_MS` 5s→15s, `STALE_LOCK_MS` 30s→20s, `LOCK_RETRY_MS` 100ms+jitter, runtime invariant assert. Mirror UI + MCP copies. CI test enforces byte-equality.
- **D3 — `commitMainKanbanIfDirty` async + dual-locked**: Outer `withMainProjectLock`, inner `withKanbanLock`.
- **D4 — `mergeStoryBranchIntoSpec` wrapped**: Same per-main-path mutex.
- **D5 — Post-merge spec-worktree purge wrapped**: Same mutex; serializes `purgeShadowSpecMutables` calls on shared dir.
- **D6 — `setupSpecWorktree` auto-commit wrapped**: Same mutex; eliminates race against in-flight completion handlers for other stories.
- **D7 — `setup-mcp.sh` gitignore installer**: Idempotent append of `**/kanban.json`, `**/kanban-board.md`, `**/backlog-index.json`.
- **D8 — `onItemFailed` cleanliness gate**: Mirror `onItemCompleted`'s `isWorktreeClean` check; never silently `--force` a dirty worktree.
- **D9 — `specs-reader.ts` writer-invariant comment**: Codify the existing-but-undocumented rule.
- **D10 — CHANGELOG cross-process version warning**.
- **Tests**: New `main-project-mutex.test.ts`, `kanban-lock-sync.test.ts`, `parallel-completion.test.ts`. Extend `pam-005-worktree-helpers.test.ts`, `orchestrator-routing.test.ts` (or new file for `onItemFailed`), `kanban-lock.test.ts`.
- **Manual verification**: 5-story parallel run + race-widen smoke + failure-path test.
- **Release**: `VERSION` → 3.28.0, `install.sh` synced, `CHANGELOG.md` entry, `CLAUDE.md` mutex paragraph.

## Out of Scope

- True multi-process mutex (single Express server owns orchestrator; cross-process need served by `withKanbanLock`).
- `execSync` → `execFile` async refactor.
- Auto-detect `git reset --hard` between auto-mode runs (user responsibility).
- Watcher debounce for kanban-mtime spam (per-itemId, idempotent).
- Backlog-orchestrator parity for `backlog-index.json` (TODO comment only; tracked separately).

## Expected Deliverable

A 5-story parallel auto-mode run on a fresh test spec (`gitStrategy=worktree`, `maxConcurrent=5`) completes cleanly with:

1. Backend logs show serialized `withMainProjectLock` acquires for `commit-kanban-*`, `merge-story-*`, `purge-spec-worktree`, `setup-auto-commit` per main path; never two simultaneous on one path.
2. `git log --oneline feature/${spec}` shows ≥ 5 `--no-ff` merge commits with coherent parent chain.
3. `git log --oneline -- specwright/specs/${spec}/kanban.json` shows ≥ 5 `chore: [story] kanban.json post-completion sync` commits on main.
4. `jq '.changeLog | length' kanban.json` ≥ 10 (5 start + 5 done) — no entries lost.
5. `git status` clean. `git ls-tree feature/${spec} -- specwright/specs/${spec}/kanban.json` empty (gitignored, not tracked).
6. `${proj}-worktrees/` contains no kanban shadows.
7. **Race-widen smoke**: re-run with `setTimeout(0..200ms)` injected into `commitMainKanbanIfDirty` body. Same coherence checks pass.
8. **Failure-path test**: `kill -9` LLM mid-story → sub-worktree kept (D8 gate), incident surfaced, no work lost.

## Integration Requirements

> ⚠️ **IMPORTANT:** Integration tests run automatically after all stories complete via System Story 998.

**Integration Type:** Backend-only (Express server + git + filesystem)

- [ ] **Integration Test 1:** Mutex unit suite passes
   - Command: `cd ui && npm test -- --run main-project-mutex`
   - Validates: serialization, parallel-by-path-key, rejection-poisoning regression, FIFO order, soft 30s warn
   - Requires MCP: no

- [ ] **Integration Test 2:** Lock-sync byte equality
   - Command: `cd ui && npm test -- --run kanban-lock-sync`
   - Validates: UI + MCP copies of `kanban-lock.ts` are byte-identical
   - Requires MCP: no

- [ ] **Integration Test 3:** Parallel-completion integration suite
   - Command: `cd ui && npm test -- --run parallel-completion`
   - Validates: concurrent `commitMainKanbanIfDirty`, `mergeStoryBranchIntoSpec`, `purgeShadowSpecMutables`, `updateStoryStatus`, `setupSpecWorktree` race scenarios
   - Requires MCP: no

- [ ] **Integration Test 4:** TypeScript strict + ESLint clean
   - Command: `cd ui && npm run build:backend && npm run lint`
   - Validates: type safety + style invariants
   - Requires MCP: no

- [ ] **Integration Test 5:** Existing test suite green (regression)
   - Command: `cd ui && npm test -- --run pam-005-worktree-helpers orchestrator-routing kanban-lock pam-fix-008`
   - Validates: no breakage in already-fixed v3.27.x guards
   - Requires MCP: no

**Integration Scenarios:**
- [ ] Scenario 1: 5-story parallel run on fresh synthetic spec (manual verification — see Expected Deliverable)
- [ ] Scenario 2: Race-widen smoke with injected `setTimeout(0..200ms)` in `commitMainKanbanIfDirty`
- [ ] Scenario 3: Failure-path test — `kill -9` LLM mid-story, verify D8 gate keeps worktree

**Notes:**
- All tests are backend-only; no Playwright/MCP needed.
- `setup-mcp.sh` gitignore append is idempotent — re-runs are no-ops.
- v3.28.0 is semver-minor: no breaking API for users; new public-ish helpers (`withMainProjectLock`).

## Spec Documentation

- Implementation Plan: `specwright/specs/2026-05-06-bulletproof-parallel-auto-mode/implementation-plan.md`
- Requirements Clarification: `specwright/specs/2026-05-06-bulletproof-parallel-auto-mode/requirements-clarification.md`
- Source plan: `~/.claude/plans/alles-in-einem-rutsch-logical-pnueli.md` (revised post-review)
