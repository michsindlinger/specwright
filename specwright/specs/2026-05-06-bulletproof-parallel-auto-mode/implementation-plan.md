# Implementierungsplan: Bulletproof Parallel Auto-Mode (v3.28.0)

> **Status:** APPROVED
> **Spec:** specwright/specs/2026-05-06-bulletproof-parallel-auto-mode/
> **Erstellt:** 2026-05-06
> **Basiert auf:** requirements-clarification.md + ~/.claude/plans/alles-in-einem-rutsch-logical-pnueli.md (post-review revision)

---

## Executive Summary

Make Specwright Auto-Mode bulletproof under `gitStrategy=worktree` + `maxConcurrent>1`. v3.27.x patches closed individual symptoms; v3.28.0 closes the architectural race surface via an in-memory per-main-project async mutex (`withMainProjectLock`) that serializes every git index op against the main repo from the orchestrator. Plus tuned cross-process file lock, automatic gitignore install, and parity cleanliness gate on `onItemFailed`.

---

## Architektur-Entscheidungen

### Gewählter Ansatz

**Two-layer locking:**
- **Layer 1 — `withMainProjectLock`** (NEW, in-memory async mutex): Serializes orchestrator git operations on the main repo. Promise-chain pattern keyed by `path.resolve(mainProjectPath)`. Used by `commitMainKanbanIfDirty`, `mergeStoryBranchIntoSpec`, post-merge `purgeShadowSpecMutables`, `setupSpecWorktree` auto-commit.
- **Layer 2 — `withKanbanLock`** (existing, file-based mkdir lock): Serializes kanban.json content writes across processes (Express server + MCP server subprocess). Tuned timeouts (15s/20s/100ms+jitter) + module-init invariant assertion.

**Lock hierarchy invariant:** `withMainProjectLock` → `withKanbanLock`, never reverse. Documented in JSDoc, enforced by static review only.

### Begründung

- **In-memory mutex sufficient for orchestrator** — single Express server process owns the orchestrator. No need to pay fs-touch cost for intra-process serialization.
- **File lock retained for cross-process** — MCP server runs as `npx tsx` subprocess; only fs-based lock can coordinate.
- **Two distinct primitives, not consolidated** — different concerns (intra-process vs. cross-process), different costs (memory vs. fs), different semantics (timeout vs. soft-warn). Documented why in `main-project-mutex.ts` JSDoc.
- **Async mutex with rejection-safe chain** (`prev.catch().then(fn)`) — standard Promise chain `prev.then(fn)` would skip `fn` if `prev` rejected. Test regression covers this.

### Patterns & Technologien

- **Pattern:** Async Mutex via Promise chain (per-key in `Map`). Reference: classic `p-queue` minimal subset, but no external dep.
- **Pattern:** mkdir-based atomic file lock (existing `withKanbanLock`).
- **Technology:** Node.js native `Promise`, `path.resolve`, `console.log/warn/error`.
- **Begründung:** Zero new deps. Native primitives are well-understood, debuggable.

---

## Komponenten-Übersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|---|---|---|
| `ui/src/server/utils/main-project-mutex.ts` | Utility | In-memory per-main-path async mutex; serializes orchestrator git ops |
| `ui/tests/unit/main-project-mutex.test.ts` | Unit Test | Mutex semantics + rejection-poisoning regression + soft 30s warn |
| `ui/tests/unit/kanban-lock-sync.test.ts` | CI Test | Byte-equality of UI + MCP `kanban-lock.ts` copies |
| `ui/tests/integration/parallel-completion.test.ts` | Integration Test | Concurrent commit/merge/purge/updateStatus race scenarios |

### Zu ändernde Komponenten

| Komponente | Änderungsart | Grund |
|---|---|---|
| `ui/src/server/utils/kanban-lock.ts` | Tune | 15s timeout, 20s stale, jittered retry, module-init invariant |
| `specwright/scripts/mcp/kanban-lock.ts` | Mirror tune | Must stay byte-identical to UI copy |
| `ui/src/server/utils/worktree-story.ts` | Async + locked | `commitMainKanbanIfDirty` becomes `async`, dual-locked |
| `ui/src/server/services/auto-mode-spec-orchestrator.ts` | Wrap callsites + new gate | `onItemCompleted` await; post-merge purge wrapped; `onItemFailed` cleanliness gate |
| `ui/src/server/workflow-executor.ts` | Wrap callsites | `mergeStoryBranchIntoSpec` + `setupSpecWorktree` auto-commit wrapped |
| `setup-mcp.sh` | Add gitignore step | Idempotent append of mutable-files block |
| `ui/src/server/specs-reader.ts` | Top-of-file comment | Codify writer-invariant (already correct) |
| `VERSION`, `install.sh`, `CHANGELOG.md`, `CLAUDE.md` | Release | Bump 3.28.0; CHANGELOG entry; CLAUDE.md mutex paragraph |

### Nicht betroffen (explizit)

- LLM workflow markdown (`spec-phase-3-lean.md` etc.) — already migrated to MCP routing via v3.27.2.
- `kanban-mcp-server.ts` — already uses `withKanbanLock` correctly; only constants change via `kanban-lock.ts` tune.
- `auto-mode-cli-flags.ts` — `--dangerously-skip-permissions` from v3.27.7 stays.
- `auto-mode-backlog-orchestrator.ts` — same race surface for `backlog-index.json`, but explicit out-of-scope (TODO comment only).

---

## Umsetzungsphasen

### Phase A: Lock-Primitive
**Ziel:** Mutex + tuned file lock + sync test
**Komponenten:** `main-project-mutex.ts`, `kanban-lock.ts` (UI + MCP), `kanban-lock-sync.test.ts`, `main-project-mutex.test.ts`
**Abhängig von:** —

### Phase B: Critical Races
**Ziel:** Wrap all main-repo git index writers in mutex
**Komponenten:** `commitMainKanbanIfDirty` (async + dual-locked), `mergeStoryBranchIntoSpec`, post-merge `purgeShadowSpecMutables`, `setupSpecWorktree` auto-commit
**Abhängig von:** Phase A

### Phase C: Failure-Path Parity
**Ziel:** `onItemFailed` matches `onItemCompleted` cleanliness behavior
**Komponenten:** `auto-mode-spec-orchestrator.ts onItemFailed`
**Abhängig von:** —

### Phase D: Installer
**Ziel:** Auto-install gitignore on `setup-mcp.sh`
**Komponenten:** `setup-mcp.sh`
**Abhängig von:** —

### Phase E: Tests + Docs + Release
**Ziel:** Integration suite + JSDoc updates + VERSION/CHANGELOG/CLAUDE.md
**Komponenten:** `parallel-completion.test.ts`, `pam-005-worktree-helpers.test.ts` extension, `orchestrator-routing.test.ts` extension, `VERSION`, `install.sh`, `CHANGELOG.md`, `CLAUDE.md`
**Abhängig von:** Phase A + B + C + D

---

## Komponenten-Verbindungen (KRITISCH)

### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zuständige Story | Validierung |
|---|---|---|---|---|
| `main-project-mutex.ts` | `worktree-story.ts commitMainKanbanIfDirty` | `import { withMainProjectLock }` + wrap | BPAM-003 | `grep -n withMainProjectLock ui/src/server/utils/worktree-story.ts` |
| `main-project-mutex.ts` | `workflow-executor.ts mergeStoryBranchIntoSpec` | `import` + wrap | BPAM-004 | `grep -n withMainProjectLock ui/src/server/workflow-executor.ts` |
| `main-project-mutex.ts` | `auto-mode-spec-orchestrator.ts onItemCompleted` post-merge purge | `import` + wrap | BPAM-005 | `grep -nC1 'withMainProjectLock.*purge' ui/src/server/services/auto-mode-spec-orchestrator.ts` |
| `main-project-mutex.ts` | `workflow-executor.ts setupSpecWorktree` auto-commit | `import` + wrap | BPAM-006 | `grep -nC1 'withMainProjectLock.*setup-auto-commit' ui/src/server/workflow-executor.ts` |
| `kanban-lock.ts` (UI) | `kanban-lock.ts` (MCP mirror) | byte-identical copy | BPAM-002 | `diff -q ui/src/server/utils/kanban-lock.ts specwright/scripts/mcp/kanban-lock.ts` |
| `setup-mcp.sh` | user-project `.gitignore` | append idempotent | BPAM-008 | `bash setup-mcp.sh && grep -F 'Specwright mutable kanban state' .gitignore` |
| `auto-mode-spec-orchestrator.ts onItemFailed` | `worktree-story.ts isWorktreeClean` | call before `removeStoryWorktree` | BPAM-007 | `grep -nC2 'isWorktreeClean' ui/src/server/services/auto-mode-spec-orchestrator.ts` |

### Verbindungs-Checkliste

- [ ] `withMainProjectLock` importiert in 3 Hot-Path-Files (`worktree-story.ts`, `workflow-executor.ts`, `auto-mode-spec-orchestrator.ts`)
- [ ] `commitMainKanbanIfDirty` ist async; sole caller awaits
- [ ] `kanban-lock.ts` UI + MCP byte-identisch (CI test enforces)
- [ ] `onItemFailed` ruft `isWorktreeClean` vor `removeStoryWorktree`
- [ ] `setup-mcp.sh` appendet gitignore-Block idempotent

---

## Abhängigkeiten

### Interne Abhängigkeiten

```
main-project-mutex.ts ──used by──> worktree-story.ts (commitMainKanbanIfDirty)
main-project-mutex.ts ──used by──> workflow-executor.ts (mergeStoryBranchIntoSpec, setupSpecWorktree)
main-project-mutex.ts ──used by──> auto-mode-spec-orchestrator.ts (onItemCompleted post-merge purge)
worktree-story.ts (commitMainKanbanIfDirty) ──uses──> kanban-lock.ts (withKanbanLock, inner)
specwright/scripts/mcp/kanban-lock.ts ──must mirror──> ui/src/server/utils/kanban-lock.ts
```

### Externe Abhängigkeiten

- **Node.js** ≥ 18 (Promise.finally semantics, Map iteration order). Already required.
- **`vitest`** for `useFakeTimers` in integration tests. Already in devDeps.
- **`git`** ≥ 2.5 for worktree support. Already required.

---

## Risiken & Mitigationen

| Risiko | W | Impact | Mitigation |
|---|---|---|---|
| Lock hierarchy violated by future code (`kanbanLock` → `mainProjectLock`) → ABBA deadlock | Med | High | JSDoc invariant in both lock files; writer-invariant comment in `specs-reader.ts`; CI cannot detect statically |
| `kanban-lock.ts` copies drift after future edits | Med | Med | `kanban-lock-sync.test.ts` byte-equality CI test |
| Mutex hold > 30s (slow disk/git) | Low | Low | Soft warn at 30s, error at 60s, never throw — surfaces in logs without spurious failure |
| Promise rejection poisons next mutex caller | Med | High | `prev.catch(()=>{}).then(fn)` pattern + dedicated regression test |
| User project missing `.gitignore` | Med | Low | `setup-mcp.sh` prints manual-add instructions; existing v3.27.8 `purgeShadowSpecMutables` defends |
| Auto-mode setup races completion handler on same main repo | High (without fix) | High | D6: wrap `setupSpecWorktree` auto-commit in same mutex as completion handlers |

---

## Self-Review Ergebnisse

### Validiert

- All `kanban.json` writers in `specs-reader.ts` already go through `withKanbanLock` (Phase 1 audit confirmed).
- `commitMainKanbanIfDirty` has exactly one caller — safe `async` conversion.
- MCP-side `kanban-lock.ts` exists at `specwright/scripts/mcp/kanban-lock.ts` with identical constants today.
- `onItemFailed` (current behavior) silently `git worktree remove --force` even with dirty state — confirmed gap.
- v3.27.5/6/7/8 patches retained intact (story branch namespace, `.mcp.json` source, `--dangerously-skip-permissions`, `purgeShadowSpecMutables` post-create + pre-merge + drift defense).

### Identifizierte Probleme & Lösungen (post-review)

| Problem | Ursprünglicher Plan | Verbesserung |
|---|---|---|
| `git rm --cached` then `git add -A` is no-op (`-A` re-adds) | Pre-`git add -A` purge of mutables | Dropped entirely; rely on D7 gitignore + existing v3.27.8 post-create purge |
| Promise chain `prev.then(fn)` skips `fn` if `prev` rejects | Standard chain pattern | `prev.catch(()=>{}).then(fn)` + regression test |
| Debounce `setTimeout` leaks on `cancel()` + non-deterministic CI | `setTimeout(250ms)` debounce | Dropped debounce; per-completion call wrapped in mutex; redundant no-op commits are harmless |
| Lock invariant `LOCK_TIMEOUT_MS < STALE_LOCK_MS` not enforced | Comment-only assertion | Module-init `throw new Error(...)` |
| Two `kanban-lock.ts` copies drift silently | "Keep in sync" docs | CI test asserts byte-equality |
| `onItemFailed` discards uncommitted work | Not in original plan | Added as D8 cleanliness gate parity |
| `setupSpecWorktree` auto-commit races completion handler | Not in original plan | Added as D6 mutex wrap |

### Offene Fragen

None. Plan fully specified after external review (anthropic:opus + deepseek:opus).

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar für |
|---|---|---|
| `withKanbanLock` mkdir-lock pattern | `ui/src/server/utils/kanban-lock.ts` | Inner lock in `commitMainKanbanIfDirty` (D3) — no new fs lock needed |
| `MUTABLE_SPEC_FILES` const | `ui/src/server/utils/worktree-story.ts` | Single source of truth for gitignore step (D7) and purge helpers (existing) |
| `purgeShadowSpecMutables` | `ui/src/server/utils/worktree-story.ts` | Stays sync, called from new mutex-wrapped sites without signature churn |
| `isWorktreeClean` | `ui/src/server/utils/worktree-story.ts` | Reused for D8 onItemFailed cleanliness gate |
| Existing `onItemCompleted` cleanliness pattern | `auto-mode-spec-orchestrator.ts` | Mirrored for `onItemFailed` (D8) |

### Optimierungen

| Ursprünglich | Optimiert zu | Ersparnis |
|---|---|---|
| Custom debounced purge with `setTimeout` | Per-completion mutex-wrapped call | -1 stateful field, -1 cancel-leak risk, -nondeterminism |
| `git rm --cached` + `git add -A` pre-commit | Drop entirely, rely on D7 + existing v3.27.8 | -1 broken sequence (no-op due to `-A` re-add), -1 O(n) glob |
| New consolidated lock abstraction | Two distinct primitives (in-memory + file-based) | Clearer mental model; no abstraction hiding cross-process semantics |

### Feature-Preservation bestätigt

- [x] All requirements from clarification covered (D1-D10).
- [x] No feature sacrificed; parallelism preserved.
- [x] All v3.27.x mitigations retained; v3.28.0 is additive hardening.
- [x] User-facing API unchanged (semver minor).

---

## Nächste Schritte

After approval:
1. Generate kanban.json via `kanban_create` MCP (mode="lean", tier=L, prefix=BPAM, 10 tasks)
2. Execute via `/specwright:execute-tasks specwright/specs/2026-05-06-bulletproof-parallel-auto-mode/`
3. Manual verification scenario (5-story parallel run on test spec)
4. Release: VERSION → 3.28.0, push, CHANGELOG entry
