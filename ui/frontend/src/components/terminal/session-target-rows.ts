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
  | 'aktiv'
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
  badge: SessionTargetBadge | null;
  /** Uncommitted changes present (unknown cleanliness renders as false) */
  dirty: boolean;
  /** Worktree creation time in epoch ms; null when unknown or not a worktree */
  createdAt: number | null;
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
 * Builds the picker rows in their fixed display order:
 *
 *   1. Neuer Worktree      — omitted when the project is not a git repo
 *   2. Hauptverzeichnis    — the registered project path
 *   3. existing worktrees  — project root filtered out, sorted by name
 *
 * The order is deliberately not personalized: "new worktree" stays first so
 * running in a shared checkout is always a conscious choice rather than a
 * remembered default.
 *
 * The project-root row is never occupancy-disabled. Shell terminals, the setup
 * wizard and non-git projects all run there, so blocking it would lock the user
 * out after the first session; instead it carries a "N Sessions aktiv" badge.
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
      badge: enabled ? null : 'deaktiviert',
      dirty: false,
      createdAt: null,
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
    badge: root.occupiedCount > 0
      ? `${root.occupiedCount} ${root.occupiedCount === 1 ? 'Session' : 'Sessions'} aktiv`
      : null,
    dirty: root.clean === false,
    // Only linked worktrees have a creation date; a project root that happens
    // to be one still gets its age from the server entry.
    createdAt: root.createdAt ?? null,
  });

  const others = snapshot.worktrees
    .filter((w) => !w.isProjectRoot)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const wt of others) {
    let badge: SessionTargetBadge | null = null;
    let disabled = false;
    let disabledReason = '';

    if (wt.occupied) {
      badge = 'aktiv';
      disabled = true;
      disabledReason = 'Läuft bereits in einer anderen Session';
    } else if (wt.missing) {
      badge = 'fehlt';
      disabled = true;
      disabledReason = 'Verzeichnis existiert nicht mehr';
    } else if (wt.locked) {
      badge = 'gesperrt';
      disabled = true;
      disabledReason = 'Worktree ist von git gesperrt';
    } else if (wt.autoModeManaged) {
      // Not disabled: auto-mode worktrees are attachable, but the user should
      // know something else may rewrite or remove them.
      badge = 'Auto-Mode';
    }

    rows.push({
      id: `wt:${wt.path}`,
      target: { kind: 'existing-worktree', path: wt.path },
      label: wt.name,
      sublabel: withAge(describeCheckout(wt), wt.createdAt ?? null, nowMs),
      disabled,
      disabledReason,
      badge,
      dirty: wt.clean === false,
      createdAt: wt.createdAt ?? null,
    });
  }

  return rows;
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
