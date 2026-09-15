/**
 * Text of a review answer (INT-2026-004, FA-27/FA-28/FA-33) — shared by the
 * backend (which sends it) and the frontend (which previews it in the
 * collection view), so what Michael sees is byte-identical to what the
 * session receives. Pure string functions, no IO.
 */

import { ANMERKUNG_MAX_CHARS, VORHABEN_DOC_FILES, type Anmerkung, type VorhabenDocKey } from './types/vorhaben.protocol.js';

// Typed into the TUI, CR is Enter and ESC starts key sequences (same set as sanitizeInjectText).
// eslint-disable-next-line no-control-regex
const UNSAFE_INPUT = /[\x00-\x08\x0b-\x1f\x7f]/g;

/**
 * FA-33: an Anmerkung is one line inside the one input — control characters
 * out, line breaks and runs of whitespace → one space, capped at 4 000 chars.
 */
export function normalizeAnmerkungText(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/\t/g, '  ').replace(UNSAFE_INPUT, '').replace(/\s+/g, ' ').trim().slice(0, ANMERKUNG_MAX_CHARS);
}

/** `Änderungen zu spec.md (Stand 2026-09-15 16:42):` + `n. [Bezug] Text` per Anmerkung (FA-27). */
export function buildAenderungenText(doc: VorhabenDocKey, standLabel: string, anmerkungen: Anmerkung[]): string {
  const head = `Änderungen zu ${VORHABEN_DOC_FILES[doc]} (${standLabel}):`;
  const lines = anmerkungen.map((a, i) => `${i + 1}. [${normalizeAnmerkungText(a.ref) || 'Dokument gesamt'}] ${normalizeAnmerkungText(a.text)}`);
  return [head, ...lines].join('\n');
}

/** `Freigabe: intent.md 1.2.0` · `Freigabe: spec.md (Stand …)` (FA-28). */
export function buildFreigabeText(doc: VorhabenDocKey, standLabel: string): string {
  return doc === 'intent' && !standLabel.startsWith('Stand ')
    ? `Freigabe: ${VORHABEN_DOC_FILES[doc]} ${standLabel}`
    : `Freigabe: ${VORHABEN_DOC_FILES[doc]} (${standLabel})`;
}

/** `JJJJ-MM-TT HH:MM` in the given zone (spec FA-27/FA-28). */
export function formatStandLabel(ms: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(ms));
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}
