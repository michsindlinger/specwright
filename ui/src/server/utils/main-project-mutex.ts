import { resolve as resolvePath } from 'path';

/**
 * In-memory async mutex per main-project path.
 *
 * Serializes orchestrator git index operations against the main repo so that
 * concurrent completion handlers (commitMainKanbanIfDirty, mergeStoryBranchIntoSpec,
 * purgeShadowSpecMutables, setupSpecWorktree auto-commit) never race on the same
 * working tree's index.
 *
 * **Lock hierarchy invariant (CRITICAL):**
 *   withMainProjectLock  →  withKanbanLock   (always outer → inner)
 *   Never acquire withMainProjectLock while already holding withKanbanLock.
 *   Violation = ABBA deadlock. Enforced by static review only; see component
 *   connections matrix in implementation-plan.md.
 *
 * **Why two distinct primitives instead of one?**
 *   - withMainProjectLock: intra-process only (single Express server owns the
 *     orchestrator). Promise-chain cost = near-zero.
 *   - withKanbanLock: cross-process (MCP server runs as npx-tsx subprocess).
 *     Only fs-mkdir can coordinate across process boundaries.
 *
 * **Rejection-safe chain:**
 *   Uses `prev.catch(()=>{}).then(fn)` semantics so a throwing caller never
 *   starves subsequent waiters. See regression test "rejection does not poison".
 */

const WARN_MS = 30_000;
const ERROR_MS = 60_000;

// Map from resolved path → tail of the Promise chain.
const _locks = new Map<string, Promise<void>>();

export async function withMainProjectLock<T>(
  mainProjectPath: string,
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const key = resolvePath(mainProjectPath);
  const prev = _locks.get(key) ?? Promise.resolve();

  let release!: () => void;
  const lock = new Promise<void>((res) => {
    release = res;
  });
  _locks.set(key, lock);

  // Wait for previous holder to finish; swallow any rejection so this waiter
  // always gets its turn even if the previous fn threw.
  await prev.catch(() => {});

  const warnTimer = setTimeout(() => {
    console.warn(`[MainProjectMutex] Lock held >30s — label="${label}" path=${key}`);
  }, WARN_MS);
  const errorTimer = setTimeout(() => {
    console.error(`[MainProjectMutex] Lock held >60s — label="${label}" path=${key} — possible deadlock`);
  }, ERROR_MS);

  try {
    return await fn();
  } finally {
    clearTimeout(warnTimer);
    clearTimeout(errorTimer);
    release();
    // Clean up map entry when no further waiters are queued.
    if (_locks.get(key) === lock) {
      _locks.delete(key);
    }
  }
}
