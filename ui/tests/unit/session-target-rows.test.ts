/**
 * Unit tests for the session-target picker row model (pure, no DOM).
 */

import { describe, it, expect } from 'vitest';
import {
  buildTargetRows,
  defaultTargetRowId,
  formatWorktreeAge,
  type TargetsSnapshot,
} from '../../frontend/src/components/terminal/session-target-rows.js';
import type { CloudTerminalWorktreeEntry } from '../../src/shared/types/cloud-terminal.protocol.js';

function entry(over: Partial<CloudTerminalWorktreeEntry> = {}): CloudTerminalWorktreeEntry {
  return {
    path: '/repo',
    name: 'repo',
    branch: 'main',
    head: 'abc1234',
    isMain: true,
    isProjectRoot: true,
    clean: true,
    missing: false,
    locked: false,
    occupied: false,
    occupiedCount: 0,
    autoModeManaged: false,
    createdAt: null,
    ...over,
  };
}

function snapshot(over: Partial<TargetsSnapshot> = {}): TargetsSnapshot {
  return {
    isGitRepo: true,
    projectRoot: entry(),
    worktrees: [entry()],
    worktreeCreationEnabled: true,
    newWorktreeBase: 'main',
    projectRootIsLinkedWorktree: false,
    ...over,
  };
}

describe('buildTargetRows', () => {
  it('orders new-worktree, main, then worktrees sorted by name', () => {
    const rows = buildTargetRows(
      snapshot({
        worktrees: [
          entry(),
          entry({ path: '/wt/zulu', name: 'zulu', isMain: false, isProjectRoot: false, branch: 'feature/z' }),
          entry({ path: '/wt/alpha', name: 'alpha', isMain: false, isProjectRoot: false, branch: 'feature/a' }),
        ],
      })
    );
    expect(rows.map((r) => r.id)).toEqual(['new-worktree', 'main', 'wt:/wt/alpha', 'wt:/wt/zulu']);
  });

  it('never lists the project root twice', () => {
    const rows = buildTargetRows(snapshot());
    expect(rows.filter((r) => r.label === 'repo')).toHaveLength(0);
    expect(rows.filter((r) => r.id === 'main')).toHaveLength(1);
  });

  it('shows the base branch on the new-worktree row', () => {
    const rows = buildTargetRows(snapshot({ newWorktreeBase: 'develop' }));
    expect(rows[0].sublabel).toContain('develop');
  });

  it('labels the main row with its current branch', () => {
    const rows = buildTargetRows(
      snapshot({ projectRoot: entry({ branch: 'fix/plan-review' }) })
    );
    expect(rows.find((r) => r.id === 'main')?.sublabel).toBe('fix/plan-review');
  });

  it('disables an occupied worktree and badges it "aktiv"', () => {
    const rows = buildTargetRows(
      snapshot({
        worktrees: [
          entry(),
          entry({
            path: '/wt/a', name: 'a', isMain: false, isProjectRoot: false,
            occupied: true, occupiedCount: 1, occupiedBy: 'cloud-1',
          }),
        ],
      })
    );
    const row = rows.find((r) => r.id === 'wt:/wt/a');
    expect(row?.disabled).toBe(true);
    expect(row?.badge).toBe('aktiv');
    expect(row?.disabledReason).not.toBe('');
  });

  it('badges missing and locked worktrees and disables them', () => {
    const rows = buildTargetRows(
      snapshot({
        worktrees: [
          entry(),
          entry({ path: '/wt/m', name: 'm', isMain: false, isProjectRoot: false, missing: true }),
          entry({ path: '/wt/l', name: 'l', isMain: false, isProjectRoot: false, locked: true }),
        ],
      })
    );
    expect(rows.find((r) => r.id === 'wt:/wt/m')).toMatchObject({ badge: 'fehlt', disabled: true });
    expect(rows.find((r) => r.id === 'wt:/wt/l')).toMatchObject({ badge: 'gesperrt', disabled: true });
  });

  it('badges auto-mode worktrees WITHOUT disabling them', () => {
    const rows = buildTargetRows(
      snapshot({
        worktrees: [
          entry(),
          entry({
            path: '/wt/s', name: 's', isMain: false, isProjectRoot: false,
            branch: 'story/feat/S1', autoModeManaged: true,
          }),
        ],
      })
    );
    expect(rows.find((r) => r.id === 'wt:/wt/s')).toMatchObject({
      badge: 'Auto-Mode',
      disabled: false,
    });
  });

  it('shows an occupancy count on main but keeps it selectable', () => {
    const rows = buildTargetRows(
      snapshot({ projectRoot: entry({ occupied: true, occupiedCount: 2 }) })
    );
    const main = rows.find((r) => r.id === 'main');
    expect(main?.badge).toBe('2 Sessions aktiv');
    expect(main?.disabled).toBe(false);
  });

  it('uses the singular form for a single main session', () => {
    const rows = buildTargetRows(
      snapshot({ projectRoot: entry({ occupied: true, occupiedCount: 1 }) })
    );
    expect(rows.find((r) => r.id === 'main')?.badge).toBe('1 Session aktiv');
  });

  it('treats unknown cleanliness as not dirty', () => {
    const rows = buildTargetRows(snapshot({ projectRoot: entry({ clean: null }) }));
    expect(rows.find((r) => r.id === 'main')?.dirty).toBe(false);
  });

  it('flags a dirty working tree', () => {
    const rows = buildTargetRows(snapshot({ projectRoot: entry({ clean: false }) }));
    expect(rows.find((r) => r.id === 'main')?.dirty).toBe(true);
  });

  it('renders a detached HEAD with its short sha, never "null"', () => {
    const rows = buildTargetRows(
      snapshot({
        worktrees: [
          entry(),
          entry({
            path: '/wt/d', name: 'd', isMain: false, isProjectRoot: false,
            branch: null, head: 'deadbeefcafe',
          }),
        ],
      })
    );
    const sub = rows.find((r) => r.id === 'wt:/wt/d')?.sublabel ?? '';
    expect(sub).toContain('deadbee');
    expect(sub).not.toContain('null');
  });

  it('offers only the project directory when the project is not a git repo', () => {
    const rows = buildTargetRows(
      snapshot({ isGitRepo: false, worktrees: [], projectRoot: entry({ branch: null, head: null }) })
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('main');
    expect(defaultTargetRowId(rows)).toBe('main');
  });

  it('disables the new-worktree row when creation is switched off', () => {
    const rows = buildTargetRows(snapshot({ worktreeCreationEnabled: false }));
    expect(rows[0]).toMatchObject({ id: 'new-worktree', disabled: true, badge: 'deaktiviert' });
    expect(rows[0].sublabel).toContain('cloudSessionWorktree');
  });

  it('labels the project row explicitly when it is itself a linked worktree', () => {
    const rows = buildTargetRows(snapshot({ projectRootIsLinkedWorktree: true }));
    expect(rows.find((r) => r.id === 'main')?.label).toContain('ist selbst ein Worktree');
  });
});

describe('defaultTargetRowId', () => {
  it('preselects new-worktree in a normal repo', () => {
    expect(defaultTargetRowId(buildTargetRows(snapshot()))).toBe('new-worktree');
  });

  it('falls through to main when worktree creation is disabled', () => {
    expect(
      defaultTargetRowId(buildTargetRows(snapshot({ worktreeCreationEnabled: false })))
    ).toBe('main');
  });

  it('is stateless — identical input always yields the same row', () => {
    const rows = buildTargetRows(snapshot());
    expect(defaultTargetRowId(rows)).toBe(defaultTargetRowId(rows));
    expect(defaultTargetRowId(buildTargetRows(snapshot()))).toBe('new-worktree');
  });

  it('returns null when every row is disabled', () => {
    expect(defaultTargetRowId([])).toBeNull();
  });
});

describe('worktree age', () => {
  const NOW = Date.UTC(2026, 6, 25, 12, 0, 0);
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it('formats minutes, hours, days and months', () => {
    expect(formatWorktreeAge(NOW - 30_000, NOW)).toBe('gerade erstellt');
    expect(formatWorktreeAge(NOW - 5 * MIN, NOW)).toBe('vor 5 Min.');
    expect(formatWorktreeAge(NOW - 3 * HOUR, NOW)).toBe('vor 3 Std.');
    expect(formatWorktreeAge(NOW - DAY, NOW)).toBe('vor 1 Tag');
    expect(formatWorktreeAge(NOW - 12 * DAY, NOW)).toBe('vor 12 Tagen');
    expect(formatWorktreeAge(NOW - 90 * DAY, NOW)).toBe('vor 3 Monaten');
  });

  it('degrades a future timestamp to "gerade erstellt" instead of a negative age', () => {
    expect(formatWorktreeAge(NOW + 10 * DAY, NOW)).toBe('gerade erstellt');
  });

  it('returns null when no date is known', () => {
    expect(formatWorktreeAge(null, NOW)).toBeNull();
    expect(formatWorktreeAge(0, NOW)).toBeNull();
  });

  it('appends the age to the worktree sublabel and exposes createdAt on the row', () => {
    const rows = buildTargetRows(
      snapshot({
        worktrees: [
          entry(),
          entry({
            path: '/wt/alpha', name: 'alpha', isMain: false, isProjectRoot: false,
            branch: 'feature/a', createdAt: NOW - 3 * DAY,
          }),
        ],
      }),
      NOW
    );
    const row = rows.find((r) => r.id === 'wt:/wt/alpha');
    expect(row?.sublabel).toBe('feature/a · vor 3 Tagen');
    expect(row?.createdAt).toBe(NOW - 3 * DAY);
  });

  it('leaves the sublabel untouched when the worktree has no known date', () => {
    const rows = buildTargetRows(
      snapshot({
        worktrees: [
          entry(),
          entry({
            path: '/wt/beta', name: 'beta', isMain: false, isProjectRoot: false,
            branch: 'feature/b', createdAt: null,
          }),
        ],
      }),
      NOW
    );
    expect(rows.find((r) => r.id === 'wt:/wt/beta')?.sublabel).toBe('feature/b');
  });

  it('dates the project row when it is itself a linked worktree', () => {
    const rows = buildTargetRows(
      snapshot({
        projectRoot: entry({ branch: 'feature/root', createdAt: NOW - 2 * DAY }),
        projectRootIsLinkedWorktree: true,
      }),
      NOW
    );
    expect(rows.find((r) => r.id === 'main')?.sublabel).toBe('feature/root · vor 2 Tagen');
  });
});
