import { describe, it, expect } from 'vitest';
import { ZUSTAND_LABELS, sortRows, groupRows, groupOf, countWaitingForMe, relativeTime, formatStand } from '../../frontend/src/components/vorhaben/vorhaben-sort.js';
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
    row({ intentId: 'INT-2026-006', zustand: 'wartet_rueckfrage', lastChangedMs: 60, projectId: 'q' }),
  ];

  it('INT-2026-010 (AN-S01): every waiting state — review, dialog, plan, permission — is „Wartet auf dich"; the dialog labels stay', () => {
    for (const z of ['wartet_auf_dich', 'wartet', 'wartet_rueckfrage', 'wartet_plan', 'wartet_berechtigung'] as const) expect(groupOf(row({ zustand: z }))).toBe('wartet_auf_dich');
    expect(ZUSTAND_LABELS.wartet_rueckfrage).toBe('wartet · Rückfrage');
    expect(ZUSTAND_LABELS.wartet_plan).toBe('wartet · Plan-Entscheidung');
    expect(ZUSTAND_LABELS.wartet_berechtigung).toBe('wartet · Berechtigung');
  });

  it('INT-2026-010 (FA-02): a Vorhaben without a session „ruht"', () => {
    expect(ZUSTAND_LABELS.keine_sitzung).toBe('ruht');
    expect(ZUSTAND_LABELS.sitzung_beendet).toBe('ruht · Sitzung beendet');
    expect(groupOf(row({ zustand: 'keine_sitzung' }))).toBe('laeuft');
    expect(groupOf(row({ zustand: 'arbeitet' }))).toBe('laeuft');
  });

  it('INT-2026-016 (AK-01): the session state decides the group before the phase — umgesetzt hides only rows without a live session', () => {
    expect(groupOf(row({ phase: 'umgesetzt', zustand: 'arbeitet' }))).toBe('laeuft');
    for (const z of ['wartet_auf_dich', 'wartet', 'wartet_rueckfrage', 'wartet_plan', 'wartet_berechtigung'] as const) {
      expect(groupOf(row({ phase: 'umgesetzt', zustand: z }))).toBe('wartet_auf_dich');
    }
    expect(groupOf(row({ phase: 'umgesetzt', zustand: 'keine_sitzung' }))).toBe('umgesetzt');
    expect(groupOf(row({ phase: 'umgesetzt', zustand: 'sitzung_beendet' }))).toBe('umgesetzt');
    expect(groupOf(row({ phase: 'umgesetzt', zustand: 'bau_unterbrochen' }))).toBe('umgesetzt');
    // The other phases never collapse, whatever the session does.
    expect(groupOf(row({ phase: 'pr', zustand: 'keine_sitzung' }))).toBe('laeuft');
  });

  it('INT-2026-016 (AK-01): an umgesetzt row with a waiting session sorts with the waiting rows, not into the collapsed group', () => {
    const mixed = [
      row({ intentId: 'INT-2026-010', phase: 'umgesetzt', zustand: 'wartet', lastChangedMs: 500 }),
      row({ intentId: 'INT-2026-011', phase: 'umgesetzt', zustand: 'keine_sitzung', lastChangedMs: 600 }),
      row({ intentId: 'INT-2026-012', phase: 'bau', zustand: 'arbeitet', lastChangedMs: 400 }),
    ];
    expect(groupRows(mixed, null).map((g) => [g.key, g.rows.map((r) => r.intentId)])).toEqual([
      ['wartet_auf_dich', ['INT-2026-010']],
      ['laeuft', ['INT-2026-012']],
      ['umgesetzt', ['INT-2026-011']],
    ]);
  });

  it('orders: wartet auf dich (newest change first) → läuft by change desc → umgesetzt', () => {
    expect(sortRows(rows).map((r) => r.intentId)).toEqual(['INT-2026-006', 'INT-2026-002', 'INT-2026-004', 'INT-2026-005', 'INT-2026-001', 'INT-2026-003']);
  });

  it('two groups plus umgesetzt, in fixed order; empty groups are dropped', () => {
    const g = groupRows(rows, null);
    expect(g.map((x) => [x.key, x.rows.length])).toEqual([['wartet_auf_dich', 3], ['laeuft', 2], ['umgesetzt', 1]]);
    expect(g.map((x) => x.label)).toEqual(['Wartet auf dich', 'Läuft', 'Umgesetzt']);
    expect(groupOf(rows[2])).toBe('umgesetzt');
  });

  it('filters by project without touching the others', () => {
    expect(groupRows(rows, 'q').flatMap((x) => x.rows.map((r) => r.intentId))).toEqual(['INT-2026-006']);
    expect(groupRows(rows, 'p').flatMap((x) => x.rows).length).toBe(5);
  });

  it('counts everything that waits for Michael (the bell and the phone badge)', () => {
    expect(countWaitingForMe(rows)).toBe(3);
  });

  it('formats relative time and Stand', () => {
    const now = Date.parse('2026-09-15T16:42:00');
    expect(relativeTime(now - 4 * 60000, now)).toBe('vor 4 min');
    expect(relativeTime(now - 3 * 3600000, now)).toBe('vor 3 h');
    expect(relativeTime(now - 26 * 3600000, now)).toBe('gestern');
    expect(formatStand(now)).toBe('15.09. 16:42');
  });
});
