import { describe, it, expect } from 'vitest';
import { sortRows, groupRows, groupOf, countWaitingForMe, relativeTime, formatStand } from '../../frontend/src/components/vorhaben/vorhaben-sort.js';
import type { VorhabenRow } from '../../src/shared/types/vorhaben.protocol.js';

const row = (o: Partial<VorhabenRow> & { intentId: string }): VorhabenRow => ({
  projectId: 'p', projectPath: '/p', projectName: 'P', dirName: o.intentId, cwd: '/p', arbeitskopie: 'main', titel: o.intentId,
  phase: 'spec', phaseNote: '', bypass: false, zustand: 'keine_sitzung', zustandDetail: '', docs: [], designFiles: [], hasBuildStand: false,
  lastChangedAt: '', lastChangedMs: 0, ...o,
});

describe('vorhaben-sort (FA-02, FA-03, FA-05)', () => {
  const rows = [
    row({ intentId: 'INT-2026-001', zustand: 'keine_sitzung', lastChangedMs: 100 }),
    row({ intentId: 'INT-2026-002', zustand: 'wartet', lastChangedMs: 50 }),
    row({ intentId: 'INT-2026-003', phase: 'umgesetzt', lastChangedMs: 900 }),
    row({ intentId: 'INT-2026-004', zustand: 'wartet_auf_dich', reviewDoc: 'plan', lastChangedMs: 10 }),
    row({ intentId: 'INT-2026-005', zustand: 'arbeitet', lastChangedMs: 300 }),
    row({ intentId: 'INT-2026-006', zustand: 'wartet_im_terminal', lastChangedMs: 60, projectId: 'q' }),
  ];

  it('orders: wartet auf dich → wartet (incl. Terminal) → laufend by change desc → umgesetzt', () => {
    expect(sortRows(rows).map((r) => r.intentId)).toEqual(['INT-2026-004', 'INT-2026-006', 'INT-2026-002', 'INT-2026-005', 'INT-2026-001', 'INT-2026-003']);
  });

  it('groups in fixed order and drops empty groups', () => {
    const g = groupRows(rows, null);
    expect(g.map((x) => [x.key, x.rows.length])).toEqual([['wartet_auf_dich', 1], ['wartet', 2], ['laeuft', 2], ['umgesetzt', 1]]);
    expect(groupOf(rows[2])).toBe('umgesetzt');
  });

  it('filters by project without touching the others', () => {
    expect(groupRows(rows, 'q').flatMap((x) => x.rows.map((r) => r.intentId))).toEqual(['INT-2026-006']);
    expect(groupRows(rows, 'p').flatMap((x) => x.rows).length).toBe(5);
  });

  it('counts only wartet_auf_dich (FA-37)', () => {
    expect(countWaitingForMe(rows)).toBe(1);
  });

  it('formats relative time and Stand', () => {
    const now = Date.parse('2026-09-15T16:42:00');
    expect(relativeTime(now - 4 * 60000, now)).toBe('vor 4 min');
    expect(relativeTime(now - 3 * 3600000, now)).toBe('vor 3 h');
    expect(relativeTime(now - 26 * 3600000, now)).toBe('gestern');
    expect(formatStand(now)).toBe('15.09. 16:42');
  });
});
