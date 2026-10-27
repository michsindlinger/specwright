/**
 * INT-2026-037 (FA-13, FA-16, FA-18): which reviewers run after the probe.
 * Pure — the orchestrator probes, this decides.
 */
import type { ProbeGrund, ProbeZeile, ReviewerConfig } from '../../shared/types/plan-review.protocol.js';

export type ProbeErgebnis = { bereit: true } | { bereit: false; grund: ProbeGrund; meldung: string };

/** Key of a reviewer in the probe cache, the events and the inject text (`provider:model`). */
export function pruefKennung(r: ReviewerConfig): string {
  return `${r.providerId}:${r.modelId ?? r.providerId}`;
}

/** A review needs this many ready reviewers before stand-ins stop filling up. */
export const ZIEL_PRUEFER = 3;

/**
 * Chosen reviewers missing from the config → `fehlt`; the ready chosen ones
 * run. While fewer than {@link ZIEL_PRUEFER} are ready, the first ready
 * stand-in whose provider is missing among the ready ones joins (else the
 * first ready one), never one already chosen. `ersatzFuer` names the next
 * failed chosen reviewer in order, '' when none is left (fills up).
 */
export function waehlePruefer(
  gewaehlt: ReviewerConfig[],
  ersatz: ReviewerConfig[],
  probe: ReadonlyMap<string, ProbeErgebnis>,
  imConfig: (r: ReviewerConfig) => boolean
): { laufen: ReviewerConfig[]; zeilen: ProbeZeile[] } {
  const laufen: ReviewerConfig[] = [];
  const zeilen: ProbeZeile[] = [];
  const ausgefallen: string[] = [];
  for (const r of gewaehlt) {
    const id = pruefKennung(r);
    if (!imConfig(r)) {
      zeilen.push({ reviewerId: id, zustand: 'fehlt' });
      ausgefallen.push(id);
      continue;
    }
    const p = probe.get(id);
    if (p?.bereit) {
      laufen.push(r);
      zeilen.push({ reviewerId: id, zustand: 'bereit' });
    } else {
      zeilen.push({ reviewerId: id, zustand: 'ausgefallen', ...(p && !p.bereit ? { grund: p.grund, meldung: p.meldung } : { grund: 'fehler' as const }) });
      ausgefallen.push(id);
    }
  }
  const vergeben = new Set(gewaehlt.map(pruefKennung));
  let kandidaten = ersatz.filter((r) => !vergeben.has(pruefKennung(r)) && probe.get(pruefKennung(r))?.bereit === true);
  while (laufen.length < ZIEL_PRUEFER && kandidaten.length > 0) {
    const anbieter = new Set(laufen.map((r) => r.providerId));
    const wahl = kandidaten.find((r) => !anbieter.has(r.providerId)) ?? kandidaten[0];
    kandidaten = kandidaten.filter((r) => pruefKennung(r) !== pruefKennung(wahl));
    laufen.push(wahl);
    zeilen.push({ reviewerId: pruefKennung(wahl), zustand: 'bereit', ersatzFuer: ausgefallen.shift() ?? '' });
  }
  return { laufen, zeilen };
}
