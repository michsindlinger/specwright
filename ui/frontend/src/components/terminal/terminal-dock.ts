/**
 * Where the cloud terminal is the right column of the page (INT-2026-011,
 * FA-01/FA-18): the Vorhaben page (`#/vorhaben/<project>/<INT-…>`) and „Neue
 * Absicht" (`#/neu[/<project>]`) — on `neu` always, so the width does not jump
 * when „Starten" is pressed (plan review F3). The list, the project page and
 * everything else keep the floating sidebar. Pure: route in, boolean out.
 */

import type { ParsedRoute } from '../../types/route.types.js';

export function terminalDockedFor(route: Pick<ParsedRoute, 'view' | 'segments'>): boolean {
  if (route.view === 'neu') return true;
  return route.view === 'vorhaben' && route.segments.length >= 2;
}
