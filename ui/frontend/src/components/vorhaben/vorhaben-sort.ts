/**
 * Pure ordering/grouping of Vorhaben rows for the overview (FA-02, FA-03).
 * Groups since INT-2026-010 (AN-S01): "Wartet auf dich" (every `wartet*`
 * state — a session that waits for an answer waits for Michael) → "Läuft"
 * (everything else, by last change, newest first) → umgesetzt (collapsed).
 * The key `wartet` stays in the type for the tests of older stages.
 *
 * INT-2026-016 (AK-01): the session state decides the group BEFORE the
 * phase. The phase is the state of the file (intent.md `umgesetzt`), the
 * session state is the state of whoever works on it right now; a row whose
 * session works or waits is never collapsed, whatever the file says. Only a
 * row without a live session is filed by its phase.
 *
 * INT-2026-024 (FA-14, AK-08): one exception before that chain — a row that
 * is `umgesetzt` (file or mark) is filed under „Umgesetzt" unless its session
 * WORKS or shows a DIALOG (Rückfrage, Plan, Berechtigung). A session that only
 * waits (done, quiet, ended) no longer holds a finished Vorhaben under „Wartet
 * auf dich".
 */

import type { VorhabenPendingIntent, VorhabenPhase, VorhabenRow, VorhabenZustand } from '../../../../src/shared/types/vorhaben.protocol.js';

export type VorhabenGroupKey = 'wartet_auf_dich' | 'wartet' | 'laeuft' | 'umgesetzt';

export interface VorhabenGroup {
  key: VorhabenGroupKey;
  label: string;
  rows: VorhabenRow[];
  /** INT-2026-022 (FA-12/FA-13): pending `/intent` sessions without a folder, newest first, rendered before the rows. */
  pendings: VorhabenPendingIntent[];
}

export const GROUP_LABELS: Record<VorhabenGroupKey, string> = {
  wartet_auf_dich: 'Wartet auf dich',
  wartet: 'Wartet',
  laeuft: 'Läuft',
  umgesetzt: 'Umgesetzt',
};

/** Every `wartet*` state: the session waits for Michael (review, question, dialog, permission). */
export function isWaitingZustand(z: VorhabenZustand): boolean {
  return z === 'wartet_auf_dich' || z === 'wartet' || z === 'wartet_rueckfrage' || z === 'wartet_plan' || z === 'wartet_berechtigung';
}

/** The three dialog states of INT-2026-007 — the session shows something Michael must answer in the terminal. */
export function isDialogZustand(z: VorhabenZustand): boolean {
  return z === 'wartet_rueckfrage' || z === 'wartet_plan' || z === 'wartet_berechtigung';
}

export function groupOf(row: VorhabenRow): VorhabenGroupKey {
  if (row.phase === 'umgesetzt' && row.zustand !== 'arbeitet' && !isDialogZustand(row.zustand)) return 'umgesetzt';
  if (isWaitingZustand(row.zustand)) return 'wartet_auf_dich';
  if (row.zustand === 'arbeitet') return 'laeuft';
  if (row.phase === 'umgesetzt') return 'umgesetzt';
  return 'laeuft';
}

/** INT-2026-022 (FA-13): an entry without a folder has no phase — its session state alone decides; never „umgesetzt". */
export function pendingGroupOf(p: Pick<VorhabenPendingIntent, 'zustand'>): VorhabenGroupKey {
  return isWaitingZustand(p.zustand) ? 'wartet_auf_dich' : 'laeuft';
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

/**
 * Filter by project (null = all), then group in fixed order; empty groups are dropped.
 * INT-2026-022 (FA-12/FA-13/FA-16): pending intents join their group (newest start first, before the rows);
 * an entry whose session already carries a row is left out — entry and row of one session never stand together.
 */
export function groupRows(rows: VorhabenRow[], projectId: string | null, pendings: VorhabenPendingIntent[] = []): VorhabenGroup[] {
  const filtered = projectId ? rows.filter((r) => r.projectId === projectId) : rows;
  const sorted = sortRows(filtered);
  const groups: VorhabenGroup[] = GROUP_ORDER.map((key) => ({ key, label: GROUP_LABELS[key], rows: [], pendings: [] }));
  for (const row of sorted) groups.find((g) => g.key === groupOf(row))!.rows.push(row);
  const claimed = new Set(rows.filter((r) => r.session && !r.session.ended).map((r) => r.session!.id));
  const shown = pendings
    .filter((p) => (!projectId || p.projectId === projectId) && !claimed.has(p.sessionId))
    .sort((a, b) => (a.since > b.since ? -1 : a.since < b.since ? 1 : 0));
  for (const p of shown) groups.find((g) => g.key === pendingGroupOf(p))!.pendings.push(p);
  return groups.filter((g) => g.rows.length > 0 || g.pendings.length > 0);
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
