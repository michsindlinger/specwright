/**
 * Text of a review answer (INT-2026-004, FA-27/FA-28/FA-33) — shared by the
 * backend (which sends it) and the frontend (which previews it in the
 * collection view), so what Michael sees is byte-identical to what the
 * session receives. Pure string functions, no IO.
 */

import { ANMERKUNG_MAX_CHARS, ARBEITSTITEL_MAX_CHARS, VORHABEN_DOC_FILES, type Anmerkung, type VorhabenDocKey } from './types/vorhaben.protocol.js';

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

/**
 * INT-2026-022 (FA-14): working title of a pending intent from the text typed on „Neue Absicht" —
 * first non-empty line, trimmed, runs of whitespace → one space, control characters out, cut to
 * ARBEITSTITEL_MAX_CHARS (79 + „…"). Only whitespace → '' (the caller stores nothing, the UI
 * falls back to the session name; review E13). Pure, shared with the frontend tests.
 */
export function arbeitstitelAus(text: string): string {
  const line = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\t/g, ' ').replace(UNSAFE_INPUT, '').replace(/\s+/g, ' ').trim())
    .find((l) => l.length > 0);
  if (!line) return '';
  const chars = [...line];
  return chars.length > ARBEITSTITEL_MAX_CHARS ? `${chars.slice(0, ARBEITSTITEL_MAX_CHARS - 1).join('')}…` : line;
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
