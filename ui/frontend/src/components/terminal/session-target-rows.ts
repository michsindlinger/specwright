/**
 * Pure row model for the "where should this session run?" picker.
 *
 * Kept DOM-free (no Lit imports) so ordering, disabling and badge rules are
 * unit-testable in the node vitest environment — same pattern as
 * `pane-visibility.ts`.
 */
import type {
  CloudTerminalSessionTarget,
  CloudTerminalWorktreeEntry,
} from '../../../../src/shared/types/cloud-terminal.protocol.js';

/** Why a row cannot be picked, or what is noteworthy about it. */
export type SessionTargetBadge =
  | 'fehlt'
  | 'gesperrt'
  | 'Auto-Mode'
  | 'deaktiviert'
  | string;

export interface SessionTargetRow {
  /** Stable key for lit `repeat` and for `defaultTargetRowId` */
  id: string;
  target: CloudTerminalSessionTarget;
  label: string;
  /** Branch, base branch, or the reason a row is unavailable */
  sublabel: string;
  disabled: boolean;
  /** Tooltip explaining `disabled`, empty when selectable */
  disabledReason: string;
  /**
   * Chips shown on the right, in display order. Several can apply at once —
   * an auto-mode worktree that also carries live sessions shows both, because
   * "Auto-Mode" is a danger signal that must never be masked by a count.
   */
  badges: SessionTargetBadge[];
  /** Uncommitted changes present (unknown cleanliness renders as false) */
  dirty: boolean;
  /**
   * Worktree creation time in epoch ms; null when unknown or not a worktree.
   * Also the sort key of the worktree section (newest first). A skewed clock
   * yields a real-but-wrong value: such a row sorts to the top and reads
   * "gerade erstellt" — display and order stay consistent with each other.
   */
  createdAt: number | null;
  /**
   * Lowercased haystack for the picker's filter: name plus checkout, without
   * the age suffix — otherwise "ta" would match every "vor 3 Tagen" row.
   * Empty on the pinned rows, which the filter never removes.
   */
  searchText: string;
}

export interface TargetsSnapshot {
  isGitRepo: boolean;
  projectRoot: CloudTerminalWorktreeEntry;
  worktrees: CloudTerminalWorktreeEntry[];
  worktreeCreationEnabled: boolean;
  newWorktreeBase: string | null;
  projectRootIsLinkedWorktree: boolean;
}

/** Human-readable "what is checked out here" line for a worktree entry. */
function describeCheckout(entry: CloudTerminalWorktreeEntry): string {
  if (entry.branch) return entry.branch;
  if (entry.head) return `losgelöst @ ${entry.head.slice(0, 7)}`;
  return 'unbekannter Stand';
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Coarse German age label for a worktree ("vor 3 Tagen").
 *
 * Coarse on purpose: the picker answers "is this checkout stale?", not "when
 * exactly was it created" — the exact timestamp lives in the row tooltip.
 * Clock skew (createdAt in the future) degrades to "gerade erstellt" instead of
 * a negative age.
 */
export function formatWorktreeAge(createdAt: number | null, nowMs: number): string | null {
  if (createdAt === null || !Number.isFinite(createdAt) || createdAt <= 0) return null;

  const diff = nowMs - createdAt;
  if (diff < MINUTE_MS) return 'gerade erstellt';
  if (diff < HOUR_MS) {
    const mins = Math.floor(diff / MINUTE_MS);
    return `vor ${mins} Min.`;
  }
  if (diff < DAY_MS) {
    const hours = Math.floor(diff / HOUR_MS);
    return `vor ${hours} Std.`;
  }
  const days = Math.floor(diff / DAY_MS);
  if (days < 31) return days === 1 ? 'vor 1 Tag' : `vor ${days} Tagen`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'vor 1 Monat' : `vor ${months} Monaten`;
}

/** `"feature/x"` + a known creation time → `"feature/x · vor 3 Tagen"`. */
function withAge(sublabel: string, createdAt: number | null, nowMs: number): string {
  const age = formatWorktreeAge(createdAt, nowMs);
  return age ? `${sublabel} · ${age}` : sublabel;
}

/**
 * Creation time usable as a sort key, or null.
 *
 * Mirrors {@link formatWorktreeAge}'s guard so a bogus timestamp is treated as
 * "unknown" instead of jumping to the top of the list.
 */
function usableCreatedAt(value: number | null | undefined): number | null {
  return value !== null && value !== undefined && Number.isFinite(value) && value > 0 ? value : null;
}

/** Newest first; unknown creation date last; name as the explicit tiebreak. */
function byRecency(a: CloudTerminalWorktreeEntry, b: CloudTerminalWorktreeEntry): number {
  const ca = usableCreatedAt(a.createdAt);
  const cb = usableCreatedAt(b.createdAt);
  if (ca !== null && cb !== null && ca !== cb) return cb - ca;
  if (ca !== null && cb === null) return -1;
  if (ca === null && cb !== null) return 1;
  // Explicit tiebreak: makes the result independent of sort stability.
  return a.name.localeCompare(b.name);
}

/** "1 Session aktiv" / "3 Sessions aktiv" — same wording for root and worktrees. */
function occupancyBadge(count: number): string {
  return `${count} ${count === 1 ? 'Session' : 'Sessions'} aktiv`;
}

/**
 * Builds the picker rows in their fixed display order:
 *
 *   1. Neuer Worktree      — omitted when the project is not a git repo
 *   2. Hauptverzeichnis    — the registered project path
 *   3. existing worktrees  — project root filtered out, newest first
 *
 * The order is deliberately not personalized: "new worktree" stays first so
 * running in a shared checkout is always a conscious choice rather than a
 * remembered default. Within the worktree section recency wins over the
 * alphabet — with twenty checkouts the one made yesterday is the one being
 * looked for, and the alphabet buries it in the middle. Worktrees without a
 * usable creation date sort last, among themselves by name.
 *
 * No row is occupancy-disabled — neither the project root nor a worktree.
 * Several sessions may share a directory (shell terminals, the setup wizard
 * and non-git projects all live in the project root), so occupancy is reported
 * as a "N Sessions aktiv" badge and the choice is left to the user.
 */
export function buildTargetRows(
  snapshot: TargetsSnapshot,
  nowMs: number = Date.now()
): SessionTargetRow[] {
  const rows: SessionTargetRow[] = [];

  if (snapshot.isGitRepo) {
    const enabled = snapshot.worktreeCreationEnabled;
    rows.push({
      id: 'new-worktree',
      target: { kind: 'new-worktree' },
      label: 'Neuer Worktree',
      sublabel: enabled
        ? snapshot.newWorktreeBase
          ? `frische Arbeitskopie ab ${snapshot.newWorktreeBase}`
          : 'frische Arbeitskopie'
        : 'Deaktiviert durch Konfiguration (cloudSessionWorktree: false)',
      disabled: !enabled,
      disabledReason: enabled
        ? ''
        : 'Worktree-Erstellung ist in der Konfiguration abgeschaltet',
      badges: enabled ? [] : ['deaktiviert'],
      dirty: false,
      createdAt: null,
      searchText: '',
    });
  }

  const root = snapshot.projectRoot;
  rows.push({
    id: 'main',
    target: { kind: 'main' },
    label: snapshot.projectRootIsLinkedWorktree
      ? 'Projektverzeichnis (ist selbst ein Worktree)'
      : 'Hauptverzeichnis',
    sublabel: snapshot.isGitRepo
      ? withAge(describeCheckout(root), root.createdAt ?? null, nowMs)
      : 'kein Git-Repository',
    disabled: false,
    disabledReason: '',
    badges: root.occupiedCount > 0 ? [occupancyBadge(root.occupiedCount)] : [],
    dirty: root.clean === false,
    // Only linked worktrees have a creation date; a project root that happens
    // to be one still gets its age from the server entry.
    createdAt: root.createdAt ?? null,
    searchText: '',
  });

  const others = snapshot.worktrees
    .filter((w) => !w.isProjectRoot)
    .slice()
    .sort(byRecency);

  for (const wt of others) {
    const badges: SessionTargetBadge[] = [];
    let disabled = false;
    let disabledReason = '';

    // Only the two technically impossible cases disable a row. Occupancy does
    // not: a worktree with a live session is selectable exactly like the
    // project root, and only says so via its badge.
    if (wt.missing) {
      badges.push('fehlt');
      disabled = true;
      disabledReason = 'Verzeichnis existiert nicht mehr';
    } else if (wt.locked) {
      badges.push('gesperrt');
      disabled = true;
      disabledReason = 'Worktree ist von git gesperrt';
    } else {
      // Auto-Mode first: it is the danger signal (auto-mode may rewrite or
      // remove this worktree), the session count is merely informational.
      if (wt.autoModeManaged) badges.push('Auto-Mode');
      if (wt.occupiedCount > 0) badges.push(occupancyBadge(wt.occupiedCount));
    }

    rows.push({
      id: `wt:${wt.path}`,
      target: { kind: 'existing-worktree', path: wt.path },
      label: wt.name,
      sublabel: withAge(describeCheckout(wt), wt.createdAt ?? null, nowMs),
      disabled,
      disabledReason,
      badges,
      dirty: wt.clean === false,
      createdAt: wt.createdAt ?? null,
      searchText: `${wt.name} ${describeCheckout(wt)}`.toLowerCase(),
    });
  }

  return rows;
}

/** Ids of the two rows the search filter never removes. */
export function isPinnedRowId(id: string): boolean {
  return id === 'new-worktree' || id === 'main';
}

/**
 * Narrows the picker to rows matching `query` (case-insensitive substring on
 * name and branch).
 *
 * The pinned rows always survive. That is not cosmetic: it keeps the listbox
 * selectable for any query, keeps `defaultTargetRowId` from returning null, and
 * keeps the "Neuer Worktree" row — and with it its name input — from vanishing
 * while the user types in it.
 */
export function filterTargetRows(rows: SessionTargetRow[], query: string): SessionTargetRow[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return rows;
  return rows.filter((row) => isPinnedRowId(row.id) || row.searchText.includes(needle));
}

/**
 * False only when a non-empty query hid every worktree row — the condition for
 * the "keine Treffer" hint. True for an empty query, so a still-loading list
 * (which has no worktree rows yet) never reads as "nothing found".
 */
export function hasFilterMatches(rows: SessionTargetRow[], query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  return rows.some((row) => !isPinnedRowId(row.id) && row.searchText.includes(needle));
}

/**
 * Row to preselect: the first selectable one, which is "Neuer Worktree" in a
 * normal git repo and falls through to "Hauptverzeichnis" when worktree
 * creation is disabled or the project is not a repo.
 *
 * Stateless by design — no last-used memory, so ending up in a shared checkout
 * always takes a deliberate click.
 */
export function defaultTargetRowId(rows: SessionTargetRow[]): string | null {
  return rows.find((r) => !r.disabled)?.id ?? null;
}
