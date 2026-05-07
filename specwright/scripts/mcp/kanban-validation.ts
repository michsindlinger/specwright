/**
 * Pure validation + transformation functions for kanban operations.
 *
 * No external dependencies (no MCP SDK) — safe to import from tests.
 */

export const DESCRIPTION_MAX_CHARS = 150;

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
