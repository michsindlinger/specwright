/**
 * Pure validation + transformation functions for kanban operations.
 *
 * No external dependencies (no MCP SDK) — safe to import from tests.
 */

export const DESCRIPTION_MAX_CHARS = 150;

// ============================================================================
// Dependency status — single source of truth shared with SpecsReader
// ============================================================================

export const SATISFIED_DEP_STATUSES = ['done', 'in_review'] as const;
export type SatisfiedDepStatus = typeof SATISFIED_DEP_STATUSES[number];

export interface DepLookupItem {
  id: string;
  status: string;
}

/**
 * True iff every dep id resolves to an item whose status is in
 * SATISFIED_DEP_STATUSES. Missing deps count as unsatisfied (safe default).
 *
 * Aligned with SpecsReader.resolveDependencies — keep both call sites in
 * sync via this helper so a story can be unblocked iff it would be created
 * unblocked.
 */
export function areDependenciesSatisfied(
  deps: readonly string[],
  items: ReadonlyArray<DepLookupItem>
): boolean {
  if (deps.length === 0) return true;
  for (const depId of deps) {
    const dep = items.find(i => i.id === depId);
    if (!dep) return false;
    if (!(SATISFIED_DEP_STATUSES as readonly string[]).includes(dep.status)) return false;
  }
  return true;
}

/**
 * Computes the initial status for a newly-created story/task.
 *
 *   - deps empty                  → coerced caller status (default 'ready')
 *   - deps present + any unmet    → 'blocked' (caller intent ignored — safety wins)
 *   - deps present + all satisfied → coerced caller status (default 'ready')
 *
 * `knownItems` semantics:
 *   - kanban_add_item: live kanban.tasks/stories (deps already exist)
 *   - kanban_create:   caller's input array; peer items have no runtime
 *                      'done'/'in_review' status yet, so any item with deps
 *                      is forced to 'blocked' — matches create-spec rule
 *                      "status: blocked if no unmet dependencies".
 *
 * Unknown requestedStatus values (anything other than 'ready'|'blocked') are
 * coerced to 'ready' so a malformed caller cannot leak e.g. 'done' through.
 */
export function computeInitialStatus(
  deps: readonly string[],
  requestedStatus: string | undefined,
  knownItems: ReadonlyArray<DepLookupItem>
): 'ready' | 'blocked' {
  const safe: 'ready' | 'blocked' = requestedStatus === 'blocked' ? 'blocked' : 'ready';
  if (deps.length === 0) return safe;
  return areDependenciesSatisfied(deps, knownItems) ? safe : 'blocked';
}

// ============================================================================
// kanban_create overwrite guard (v3.29.5)
// ============================================================================

/**
 * Minimal shape of an existing kanban.json — enough to detect "already
 * initialized" without parsing the full V1/V2 schema.
 */
export interface ExistingKanbanShape {
  mode?: string;
  version?: string;
  tasks?: ReadonlyArray<unknown>;
  stories?: ReadonlyArray<unknown>;
}

/**
 * True iff `existing` already holds task/story content. An empty object,
 * a kanban without tasks[]/stories[], or a stub is treated as not-initialized
 * so legitimate fresh creation still succeeds.
 */
export function isInitializedKanban(existing: ExistingKanbanShape | null | undefined): boolean {
  if (!existing) return false;
  if (Array.isArray(existing.tasks) && existing.tasks.length > 0) return true;
  if (Array.isArray(existing.stories) && existing.stories.length > 0) return true;
  return false;
}

/**
 * Defense-in-depth guard for kanban_create. Throws when the call would
 * silently overwrite an already-initialized kanban (incl. V2→V2 with a
 * different/smaller task set — the failure mode that destroyed system
 * stories 997/998/999 in 3.29.4).
 *
 * Caller intent for legitimate recreation: delete kanban.json first.
 */
export function assertKanbanCreateAllowed(
  existing: ExistingKanbanShape | null | undefined,
  specId: string
): void {
  if (!isInitializedKanban(existing)) return;
  const taskCount =
    (Array.isArray(existing?.tasks) ? existing!.tasks!.length : 0) ||
    (Array.isArray(existing?.stories) ? existing!.stories!.length : 0);
  const schema = existing?.mode === 'lean' || existing?.version === '2.0' ? 'V2 Lean' : 'V1 Classic';
  throw new Error(
    `Refusing to overwrite existing kanban for spec "${specId}". ` +
    `kanban.json is already initialized (${schema}, ${taskCount} item${taskCount === 1 ? '' : 's'}). ` +
    `kanban_create is only valid on a fresh spec. ` +
    `To extend an existing kanban use kanban_add_item; ` +
    `to truly recreate, delete kanban.json first (this destroys runtime state — confirm with user).`
  );
}

export interface TaskDescriptionInput {
  id: string;
  description: string;
}

/**
 * Soft-warn (does not reject) when description exceeds the V2 Lean cap.
 * V2 Lean expects 1-sentence subject-line; detail lives in planSection.
 */
export function validateTaskDescriptions(
  tasks: ReadonlyArray<TaskDescriptionInput>,
  maxChars: number = DESCRIPTION_MAX_CHARS
): string[] {
  const warnings: string[] = [];
  for (const t of tasks) {
    if (t.description.length > maxChars) {
      warnings.push(
        `Task ${t.id}: description ${t.description.length} chars (>${maxChars}). ` +
        `V2 Lean expects 1-sentence subject-line; detail lives in planSection.`
      );
    }
  }
  return warnings;
}

// ============================================================================
// User-Action support (v3.14)
// ============================================================================

/**
 * Minimal shape for a story/task usable by the user-action helpers.
 * Mirrors fields used; does not constrain other fields.
 */
export interface UserActionItemLike {
  id: string;
  status: string;
  classification?: { requiresUserAction?: boolean };
  requiresUserAction?: boolean;
  timing?: { completedAt?: string | null; startedAt?: string | null };
}

/**
 * Returns true when the item is flagged as requiring manual user action.
 * Handles V1 (nested under classification) and V2 (top-level) asymmetry.
 *
 * IMPORTANT: callers must combine this with `status === 'ready'` when filtering
 * for "needs attention" — flagged items in `done` are kept for audit.
 */
export function hasUserActionFlag(item: UserActionItemLike): boolean {
  if (item.requiresUserAction === true) return true;
  if (item.classification?.requiresUserAction === true) return true;
  return false;
}

export type UserActionMutationKind =
  | 'flag'        // set requiresUserAction = true on a `ready` item
  | 'unflag'      // set requiresUserAction = false on a `ready` item
  | 'complete';   // confirmation: status `ready` → `done`, flag preserved

export interface UserActionMutationResult {
  changed: boolean;          // true when the kanban tree was modified
  oldStatus?: string;
  newStatus?: string;
  reason?: string;            // populated when changed === false
}

/**
 * Pure mutation: apply a user-action transition to a single item.
 * Caller is responsible for locking, persisting, board-status recompute,
 * and changeLog append. This function only mutates the item itself.
 *
 * Idempotent: no-op when the requested transition is already in effect.
 */
export function applyUserActionMutation(
  item: UserActionItemLike & { [key: string]: unknown },
  kind: UserActionMutationKind,
  isV2: boolean,
  nowIso: string
): UserActionMutationResult {
  const setFlag = (value: boolean) => {
    if (isV2) {
      item.requiresUserAction = value;
      return;
    }
    item.classification = {
      ...(item.classification ?? { type: 'unknown', priority: 'medium', effort: '0' }),
      requiresUserAction: value,
    } as UserActionItemLike['classification'];
  };

  if (kind === 'flag') {
    if (hasUserActionFlag(item)) {
      return { changed: false, reason: 'already flagged' };
    }
    if (item.status !== 'ready') {
      return { changed: false, reason: `flag only valid on status=ready (current: ${item.status})` };
    }
    setFlag(true);
    return { changed: true };
  }

  if (kind === 'unflag') {
    if (!hasUserActionFlag(item)) {
      return { changed: false, reason: 'not flagged' };
    }
    setFlag(false);
    return { changed: true };
  }

  // complete
  if (!hasUserActionFlag(item)) {
    return { changed: false, reason: 'item is not flagged as user-action' };
  }
  if (item.status !== 'ready') {
    return { changed: false, reason: `complete only valid on status=ready (current: ${item.status})` };
  }
  const oldStatus = item.status;
  item.status = 'done';
  // Preserve flag on done for audit trail (documented convention).
  if (item.timing) {
    item.timing.completedAt = nowIso;
  }
  // V1 also tracks a phase string; V2 task phase enum.
  if ('phase' in item) {
    (item as { phase?: string }).phase = 'done';
  }
  return { changed: true, oldStatus, newStatus: 'done' };
}
