/**
 * INT-2026-025 (Plan §4 #11, D8): reads the state of Claude Code's
 * AskUserQuestion dialog from screen text, so the Anruf sender can check the
 * picture before and after every key.
 *
 *    ←  ☐ Farbe  ☐ Tiere  ✔ Submit  →        (single question: " ☐ Farbe")
 *    Welche Tiere?
 *    ❯ 1. [ ] Hund                            (multi-select: checkboxes)
 *             Treuer Begleiter                (description, not an option)
 *      4. [ ] Type something                  (own answer; typed text replaces it)
 *         Submit                              (multi-select only)
 *    ──────────────
 *      5. Chat about this                     (not an option)
 *    Enter to select · … · Esc to cancel
 *
 * The review page after the last question replaces question and options with
 * "Review your answers … Ready to submit your answers? ❯ 1. Submit answers /
 * 2. Cancel" under the same tab header.
 *
 * Assumptions — measured on Claude Code 2.1.283 (fixtures under
 * tests/fixtures/tui/2.1.283/), not documented:
 * - the dialog block starts at the tab header (☐ unanswered, ☒ answered,
 *   "✔ Submit" as extra tab when there are several questions or a
 *   multi-select question); the active tab is only marked by colour, which a
 *   text capture loses — `aktiverTab` is therefore only set when there is a
 *   single question tab;
 * - the own-answer row is the last numbered option above the separator;
 * - the focused row carries `❯` in front of its number (or of "Submit").
 * Anything that does not fit yields null. Callers treat null as "unknown"
 * and abort (fail closed).
 */
import { stripScreen } from './plan-dialog-state.js';

export interface RueckfrageTab {
  titel: string;
  beantwortet: boolean;
}

export interface RueckfrageOption {
  nr: number;
  text: string;
  /** Only for multi-select: `[✔]` = true, `[ ]` = false. */
  haken?: boolean;
}

export interface RueckfrageDialog {
  /** Question tabs from the header; the "✔ Submit" tab is not included. */
  tabs: RueckfrageTab[] | null;
  /** Index into `tabs` of the current question, only when certain (single question tab). */
  aktiverTab: number | null;
  /** Question text (wrapped lines joined); empty on the review page. */
  frage: string;
  /** Numbered options above the separator, without description lines. */
  optionen: RueckfrageOption[];
  mehrfach: boolean;
  /** Number of the own-answer row ("Type something" or the typed text). */
  eigeneNr: number | null;
  /** Typed own answer, null while the row still reads "Type something". */
  eigeneText: string | null;
  /** Number of the row with `❯`; null when the focus is on "Submit". */
  fokusNr: number | null;
  /** `❯` in front of "Submit" (multi-select). */
  fokusAufSubmit: boolean;
  pruefseite: boolean;
  /** Review page only: "1. Submit answers" / "2. Cancel". */
  pruefseiteOptionen?: { nr: number; text: string }[];
}

/** Footer of a question page. The plan dialog has none. */
const FOOTER = /^\s*Enter to select\b/;
const PLAN_CUE = /Would you like to proceed\?|Claude has written up a plan/;
const REVIEW_TITLE = /^\s*Review your answers\s*$/;
const REVIEW_READY = /^\s*Ready to submit your answers\?\s*$/;
/** `────` — at least 10 box-drawing dashes, optionally with a label (tmux status). */
const SEPARATOR = /^\s*─{10,}/;
/** `❯ 3. Gruen` — indent, optional pointer, number, dot, text. */
const OPTION_LINE = /^(\s*)([❯›>]\s*)?(\d{1,2})\.\s+(\S.*)$/;
const OPTION_MAX_COL = 5;
const SUBMIT_LINE = /^\s*([❯›>]\s*)?Submit\s*$/;
const CHECKBOX = /^\[( |✔|✓)\]\s+(\S.*)$/;
const TYPE_SOMETHING = /^Type something\.?$/;
const TAB_MARK = /[☐☒]/;
/** Search window above the footer for the header. */
const MAX_BLOCK_LINES = 80;

interface Zeile {
  nr: number;
  fokus: boolean;
  text: string;
}

function optionZeile(line: string): Zeile | null {
  const m = OPTION_LINE.exec(line);
  if (!m) return null;
  const col = m[1].length + (m[2]?.length ?? 0);
  if (col > OPTION_MAX_COL) return null;
  return { nr: Number(m[3]), fokus: m[2] !== undefined, text: m[4].trim() };
}

/**
 * `←  ☐ Farbe  ☒ Tiere  ✔ Submit  →` or ` ☐ Farbe`. Returns the question tabs
 * (Submit excluded) or null when the line is not a tab header.
 */
export function parseTabZeile(line: string): RueckfrageTab[] | null {
  if (!TAB_MARK.test(line)) return null;
  let rest = line.trim();
  if (rest.startsWith('←')) rest = rest.slice(1).trim();
  if (rest.endsWith('→')) rest = rest.slice(0, -1).trim();
  if (!/^[☐☒]\s/.test(rest)) return null;
  const teile = rest.split(/\s+(?=[☐☒✔]\s)/);
  const tabs: RueckfrageTab[] = [];
  for (let i = 0; i < teile.length; i++) {
    const m = /^([☐☒✔])\s+(\S.*)$/.exec(teile[i]);
    if (!m) return null;
    const titel = m[2].trim();
    if (m[1] === '✔') {
      // Only the trailing "Submit" tab carries ✔.
      if (titel !== 'Submit' || i !== teile.length - 1) return null;
      continue;
    }
    tabs.push({ titel, beantwortet: m[1] === '☒' });
  }
  return tabs.length > 0 ? tabs : null;
}

/** Index of the last tab header at or above `bis`, not further up than `ab`. */
function findeKopf(lines: string[], ab: number, bis: number): { index: number; tabs: RueckfrageTab[] } | null {
  for (let i = bis; i >= ab; i--) {
    const tabs = parseTabZeile(lines[i]);
    if (tabs) return { index: i, tabs };
  }
  return null;
}

function aktiverTabAus(tabs: RueckfrageTab[]): number | null {
  return tabs.length === 1 ? 0 : null;
}

function parseFrageSeite(lines: string[], footer: number): RueckfrageDialog | null {
  const kopf = findeKopf(lines, Math.max(0, footer - MAX_BLOCK_LINES), footer - 1);
  if (!kopf) return null;
  const block = lines.slice(kopf.index + 1, footer);
  if (block.some((l) => PLAN_CUE.test(l))) return null;

  const trenner = block.findIndex((l) => SEPARATOR.test(l));
  if (trenner < 0) return null;

  const frageZeilen: string[] = [];
  const zeilen: Zeile[] = [];
  let submitZeilen = 0;
  let fokusAufSubmit = false;
  for (let i = 0; i < trenner; i++) {
    const line = block[i];
    const opt = optionZeile(line);
    if (opt) {
      zeilen.push(opt);
      continue;
    }
    const submit = SUBMIT_LINE.exec(line);
    if (submit && zeilen.length > 0) {
      submitZeilen++;
      if (submit[1] !== undefined) fokusAufSubmit = true;
      continue;
    }
    if (zeilen.length === 0 && line.trim() !== '') frageZeilen.push(line.trim());
    // Everything else below the first option is a description line.
  }

  const frage = frageZeilen.join(' ');
  if (frage === '' || zeilen.length < 2) return null;
  // Options are exactly 1..N in order.
  if (zeilen.some((z, i) => z.nr !== i + 1)) return null;

  const mitBox = zeilen.map((z) => CHECKBOX.exec(z.text));
  const mehrfach = mitBox.every((m) => m !== null);
  if (!mehrfach && mitBox.some((m) => m !== null)) return null;
  // Multi-select has exactly one "Submit" row; single-select none.
  if (submitZeilen !== (mehrfach ? 1 : 0)) return null;

  const optionen: RueckfrageOption[] = zeilen.map((z, i) => {
    const m = mitBox[i];
    return m ? { nr: z.nr, text: m[2].trim(), haken: m[1] !== ' ' } : { nr: z.nr, text: z.text };
  });

  const fokussiert = zeilen.filter((z) => z.fokus);
  if (fokussiert.length + (fokusAufSubmit ? 1 : 0) !== 1) return null;

  const eigene = optionen[optionen.length - 1];
  return {
    tabs: kopf.tabs,
    aktiverTab: aktiverTabAus(kopf.tabs),
    frage,
    optionen,
    mehrfach,
    eigeneNr: eigene.nr,
    eigeneText: TYPE_SOMETHING.test(eigene.text) ? null : eigene.text,
    fokusNr: fokusAufSubmit ? null : fokussiert[0].nr,
    fokusAufSubmit,
    pruefseite: false,
  };
}

function parsePruefseite(lines: string[], ready: number): RueckfrageDialog | null {
  const von = Math.max(0, ready - MAX_BLOCK_LINES);
  let titel = -1;
  for (let i = ready - 1; i >= von; i--) {
    if (REVIEW_TITLE.test(lines[i])) {
      titel = i;
      break;
    }
  }
  if (titel < 0) return null;
  const kopf = findeKopf(lines, von, titel - 1);
  if (!kopf || kopf.index !== lastNonEmptyAbove(lines, titel)) return null;

  const zeilen: Zeile[] = [];
  for (let i = ready + 1; i < lines.length; i++) {
    if (lines[i].trim() === '') {
      if (zeilen.length > 0) break;
      continue;
    }
    const opt = optionZeile(lines[i]);
    if (!opt) break;
    zeilen.push(opt);
  }
  if (zeilen.length < 2 || zeilen.some((z, i) => z.nr !== i + 1)) return null;
  const fokussiert = zeilen.filter((z) => z.fokus);
  if (fokussiert.length !== 1) return null;

  return {
    tabs: kopf.tabs,
    aktiverTab: null,
    frage: '',
    optionen: [],
    mehrfach: false,
    eigeneNr: null,
    eigeneText: null,
    fokusNr: fokussiert[0].nr,
    fokusAufSubmit: false,
    pruefseite: true,
    pruefseiteOptionen: zeilen.map((z) => ({ nr: z.nr, text: z.text })),
  };
}

function lastNonEmptyAbove(lines: string[], index: number): number {
  for (let i = index - 1; i >= 0; i--) if (lines[i].trim() !== '') return i;
  return -1;
}

/**
 * State of the AskUserQuestion dialog at the bottom of the screen, or null
 * when none is recognisable. Only the lowest dialog block counts: a question
 * page ends with the "Enter to select" footer, the review page with its
 * option list under "Ready to submit your answers?" — whichever comes last.
 */
export function parseRueckfrageDialog(screen: string): RueckfrageDialog | null {
  const lines = stripScreen(screen).map((l) => l.replace(/\s+$/, ''));
  let footer = -1;
  let ready = -1;
  for (let i = lines.length - 1; i >= 0 && footer < 0 && ready < 0; i--) {
    if (FOOTER.test(lines[i])) footer = i;
    else if (REVIEW_READY.test(lines[i])) ready = i;
  }
  if (footer >= 0) return parseFrageSeite(lines, footer);
  if (ready >= 0) return parsePruefseite(lines, ready);
  return null;
}
