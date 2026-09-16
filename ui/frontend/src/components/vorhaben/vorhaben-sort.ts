/**
 * Pure ordering/grouping of Vorhaben rows for the overview (FA-02, FA-03).
 * Groups since INT-2026-010 (AN-S01): "Wartet auf dich" (every `wartet*`
 * state — a session that waits for an answer waits for Michael) → "Läuft"
 * (everything else, by last change, newest first) → umgesetzt (collapsed).
 * The key `wartet` stays in the type for the tests of older stages.
 */

import type { VorhabenPhase, VorhabenRow, VorhabenZustand } from '../../../../src/shared/types/vorhaben.protocol.js';

export type VorhabenGroupKey = 'wartet_auf_dich' | 'wartet' | 'laeuft' | 'umgesetzt';

export interface VorhabenGroup {
  key: VorhabenGroupKey;
  label: string;
  rows: VorhabenRow[];
}

export const GROUP_LABELS: Record<VorhabenGroupKey, string> = {
  wartet_auf_dich: 'Wartet auf dich',
  wartet: 'Wartet',
  laeuft: 'Läuft',
  umgesetzt: 'Umgesetzt',
};

export function groupOf(row: VorhabenRow): VorhabenGroupKey {
  if (row.phase === 'umgesetzt') return 'umgesetzt';
  if (row.zustand === 'wartet_auf_dich' || row.zustand === 'wartet' || row.zustand === 'wartet_rueckfrage' || row.zustand === 'wartet_plan' || row.zustand === 'wartet_berechtigung') return 'wartet_auf_dich';
  return 'laeuft';
}

const GROUP_ORDER: VorhabenGroupKey[] = ['wartet_auf_dich', 'laeuft', 'umgesetzt'];

/** Sorted copy: group order, then newest change first (FA-02). */
export function sortRows(rows: VorhabenRow[]): VorhabenRow[] {
  return [...rows].sort((a, b) => {
    const ga = GROUP_ORDER.indexOf(groupOf(a));
    const gb = GROUP_ORDER.indexOf(groupOf(b));
    if (ga !== gb) return ga - gb;
    return b.lastChangedMs - a.lastChangedMs || a.intentId.localeCompare(b.intentId);
  });
}

/** Filter by project (null = all), then group in fixed order; empty groups are dropped. */
export function groupRows(rows: VorhabenRow[], projectId: string | null): VorhabenGroup[] {
  const filtered = projectId ? rows.filter((r) => r.projectId === projectId) : rows;
  const sorted = sortRows(filtered);
  const groups: VorhabenGroup[] = GROUP_ORDER.map((key) => ({ key, label: GROUP_LABELS[key], rows: [] }));
  for (const row of sorted) groups.find((g) => g.key === groupOf(row))!.rows.push(row);
  return groups.filter((g) => g.rows.length > 0);
}

export function countWaitingForMe(rows: VorhabenRow[]): number {
  return rows.filter((r) => groupOf(r) === 'wartet_auf_dich').length;
}

export const PHASE_LABELS: Record<VorhabenPhase, string> = {
  absicht: 'Absicht',
  spec: 'Spec',
  plan: 'Plan',
  bau: 'Bau',
  pr: 'PR',
  umgesetzt: 'Umgesetzt',
  unbekannt: 'unbekannt',
};

export const ZUSTAND_LABELS: Record<VorhabenZustand, string> = {
  wartet_auf_dich: 'wartet auf dich',
  wartet: 'wartet',
  wartet_rueckfrage: 'wartet · Rückfrage',
  wartet_plan: 'wartet · Plan-Entscheidung',
  wartet_berechtigung: 'wartet · Berechtigung',
  arbeitet: 'arbeitet',
  bau_unterbrochen: 'Bau unterbrochen',
  keine_sitzung: 'ruht',
  sitzung_beendet: 'ruht · Sitzung beendet',
};

export const STEP_LABELS: Record<'intent' | 'spec' | 'plan' | 'build', string> = {
  intent: 'Absicht',
  spec: 'Spec',
  plan: 'Plan',
  build: 'Bau',
};

/** "vor 4 min", "vor 1 h", "gestern", or a date. */
export function relativeTime(ms: number, now = Date.now()): string {
  const diff = Math.max(0, now - ms);
  const min = Math.round(diff / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'gestern';
  if (d < 7) return `vor ${d} Tagen`;
  return new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

/** "15.09. 16:42" — the Stand shown next to documents (FA-27/28 format base). */
export function formatStand(ms: number): string {
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}. ${hh}:${mi}`;
}

export function formatClock(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
