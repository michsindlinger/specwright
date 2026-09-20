/**
 * glocke-ziel — where a tap on a bell entry goes (INT-2026-010, FA-06).
 *
 * Pure function, DOM-free (tests: ui/tests/unit/glocke-ziel.test.ts). The bell
 * knows only the backend session id; the Vorhaben is looked up in the
 * `vorhaben:state` snapshot app.ts already mirrors (plan §3 „Zuordnungsregel",
 * review E4):
 *
 *   1. rows whose `session.id` is the session — first the ones whose
 *      assignment has not `ended` (a closed session keeps its rows as
 *      `ended`; a session that moved on by command lost its older rows
 *      altogether, INT-2026-016 AK-08), among several the one with the newest
 *      `lastChangedMs`;
 *   2. otherwise a pending `/intent` session → the „Neue Absicht" page of its
 *      project WITH the session as second segment (INT-2026-022, D2: with
 *      several pending sessions the page would otherwise show the newest);
 *   3. otherwise the terminal (a session without a Vorhaben).
 */

import type { VorhabenState } from '../../../../src/shared/types/vorhaben.protocol.js';

export type GlockeZiel =
  | { route: 'vorhaben'; segments: [projectId: string, intentId: string] }
  | { route: 'neu'; segments: [projectId: string, sessionId: string] }
  | { route: 'terminal' };

export function glockeZiel(terminalSessionId: string, state: VorhabenState | null | undefined): GlockeZiel {
  if (!terminalSessionId || !state) return { route: 'terminal' };
  const candidates = state.rows.filter((r) => r.session?.id === terminalSessionId);
  if (candidates.length > 0) {
    const live = candidates.filter((r) => !r.session?.ended);
    const pool = live.length > 0 ? live : candidates;
    const best = pool.reduce((a, b) => (b.lastChangedMs > a.lastChangedMs ? b : a));
    return { route: 'vorhaben', segments: [best.projectId, best.intentId] };
  }
  const pending = state.pendingIntents.find((p) => p.sessionId === terminalSessionId);
  if (pending) return { route: 'neu', segments: [pending.projectId, pending.sessionId] };
  return { route: 'terminal' };
}
