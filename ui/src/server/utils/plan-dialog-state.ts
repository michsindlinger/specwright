/**
 * Reads the state of Claude Code's plan-approval dialog from screen text.
 *
 *    Claude has written up a plan and is ready to execute.
 *    Would you like to proceed?
 *     ❯ 1. Yes, and switch to BYPASS PERMISSIONS (no further prompts) …
 *       2. Yes, manually approve edits
 *       3. Tell Claude what to change
 *
 * The dialog silently discards typed text unless the free-text option is
 * focused, so PlanReviewOrchestrator reads this state before moving the cursor
 * and again after typing. Input is either a clean tmux screen
 * (`capture-pane -p -J`) or a raw PTY buffer tail.
 *
 * Assumptions about Claude Code's Ink rendering — observed (CLI, 2026-09),
 * not documented:
 * - the focused option carries a pointer glyph (`❯`, `>` without Unicode)
 *   in front of its number, within the first few columns;
 * - redraws are differential: a raw buffer holds stale frames, so only lines
 *   after the LAST cue count and, per option number, the LAST line wins.
 *   Focus moves and typed text, however, arrive as cell-level updates that
 *   rewrite a row WITHOUT its option number — from a raw buffer only full
 *   frames are readable, which is why the orchestrator never navigates on one;
 * - the words of one row are placed with `ESC[<col>G`, not with spaces;
 * - text typed into an option renders on its line and below it, indented to
 *   the option's text column — numbered lists inside it sit further right
 *   than the option numbers themselves.
 * Anything that does not fit yields null. Callers treat null as "unknown",
 * never as "no dialog" when other evidence (the PermissionRequest hook) says
 * one is open: fail closed.
 */

/** Dialog header lines. A permission prompt ("Do you want to proceed?") deliberately does not match. */
export const PLAN_DIALOG_CUE = /Claude has written up a plan|Would you like to proceed\?/;

/** Label of the option that accepts typed feedback. */
const FREE_TEXT_LABEL = /Tell Claude what to change/;

/** `❯ 3. Tell Claude…` / `   2. Yes, manually…` — indent, optional pointer, number, dot, text. */
const OPTION_LINE = /^(\s*)([❯›>]\s*)?(\d{1,2})\.\s+(\S.*)$/;

/** Option numbers start within this column; list items inside typed text sit further right. */
const OPTION_MAX_COL = 5;

/** Words of the inject's first line that must show up in the target option once it landed. */
const PROBE_WORDS = 3;

// eslint-disable-next-line no-control-regex
const OSC = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
// CSI: parameter bytes 0x30–0x3f (incl. ? > =), intermediates 0x20–0x2f, final 0x40–0x7e.
// eslint-disable-next-line no-control-regex
const CSI = /\x1b\[[0-?]*[ -/]*([@-~])/g;
// eslint-disable-next-line no-control-regex
const ESC_OTHER = /\x1b[ -/]*[0-~]/g;
// eslint-disable-next-line no-control-regex
const C0 = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;
/**
 * CSI finals that move the cursor to another row: what follows is a new line.
 * Column moves (G absolute, C forward) stay on the row — Claude Code places
 * even the words of one line with `ESC[<col>G` — and become a space.
 */
const ROW_MOVES = new Set(['A', 'B', 'E', 'F', 'H', 'd', 'f']);
const COLUMN_MOVES = new Set(['G', 'C']);

// Typed into the TUI, CR is Enter and ESC starts key sequences; see sanitizeInjectText().
// eslint-disable-next-line no-control-regex
const UNSAFE_INPUT = /[\x00-\x08\x0b-\x1f\x7f]/g;

export interface PlanDialogState {
  /** Option carrying the pointer. */
  focused: number;
  /** Free-text option: the one labelled "Tell Claude what to change", else the last one. */
  target: number;
  /** Option numbers, always 1..N. */
  options: number[];
  /** Last rendered text per option (pointer and number stripped). */
  lines: Record<number, string>;
}

interface OptionLine {
  n: number;
  marked: boolean;
  text: string;
}

/**
 * Screen text as plain lines: escapes and control characters removed; a
 * cursor move to another row, and a bare `\r`, start a new line so rewritten
 * lines of a raw buffer survive as separate lines (last one wins).
 */
export function stripScreen(raw: string): string[] {
  const text = raw
    .replace(OSC, '')
    .replace(CSI, (_seq: string, final: string) => (ROW_MOVES.has(final) ? '\n' : COLUMN_MOVES.has(final) ? ' ' : ''))
    .replace(ESC_OTHER, '')
    .replace(C0, '');
  return text.split(/\r\n|\r|\n/);
}

function optionLine(line: string): OptionLine | null {
  const m = OPTION_LINE.exec(line);
  if (!m) return null;
  const col = m[1].length + (m[2]?.length ?? 0);
  if (col > OPTION_MAX_COL) return null;
  return { n: Number(m[3]), marked: m[2] !== undefined, text: m[4].trim() };
}

/**
 * The options following a cue: the first contiguous run 1, 2, … N defines the
 * set; later lines for 1..N are redraws and replace earlier ones. Anything
 * else (a list inside typed text, a restart) never adds options.
 */
function parseFrame(lines: string[], from: number): PlanDialogState | null {
  const last = new Map<number, OptionLine>();
  let count = 0;
  let runOpen = true;
  for (let i = from; i < lines.length; i++) {
    const opt = optionLine(lines[i]);
    if (!opt) continue;
    if (runOpen && opt.n === count + 1) {
      count++;
      last.set(opt.n, opt);
      continue;
    }
    runOpen = false;
    if (opt.n >= 1 && opt.n <= count) last.set(opt.n, opt);
  }
  if (count < 2) return null;

  const options = Array.from({ length: count }, (_, i) => i + 1);
  const marked = options.filter((n) => last.get(n)?.marked);
  if (marked.length !== 1) return null;
  const labelled = options.find((n) => FREE_TEXT_LABEL.test(last.get(n)?.text ?? ''));
  const lines_: Record<number, string> = {};
  for (const n of options) lines_[n] = last.get(n)?.text ?? '';
  return { focused: marked[0], target: labelled ?? count, options, lines: lines_ };
}

/**
 * State of the plan-approval dialog in the given screen text, or null when no
 * such dialog is recognisable. Tries cues from the last one backwards so a cue
 * quoted inside typed review text does not hide the real dialog above it.
 */
export function parsePlanDialog(screen: string): PlanDialogState | null {
  const lines = stripScreen(screen);
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!PLAN_DIALOG_CUE.test(lines[i])) continue;
    const state = parseFrame(lines, i + 1);
    if (state) return state;
  }
  return null;
}

/** Same focus, target, option count and focused line — two reads of one settled frame. */
export function sameDialogState(a: PlanDialogState | null, b: PlanDialogState | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.focused === b.focused &&
    a.target === b.target &&
    a.options.length === b.options.length &&
    a.lines[a.focused] === b.lines[b.focused]
  );
}

/** First words of the first non-empty line of `text` — what must appear once it is typed. */
export function injectProbe(text: string): string {
  const first = text.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? '';
  return first.split(/\s+/).slice(0, PROBE_WORDS).join(' ');
}

const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** Whether `probe` shows up on the given option's line (whitespace-insensitive). */
export function optionLineHas(state: PlanDialogState, option: number, probe: string): boolean {
  const line = state.lines[option];
  if (line === undefined || collapse(probe) === '') return false;
  return collapse(line).includes(collapse(probe));
}

/**
 * Makes review text safe to type into Claude's TUI. CR is Enter — it would
 * submit, or with another option focused approve the plan; ESC starts key
 * sequences (arrows move the focus); Tab has bindings of its own. Line feeds
 * stay: inside the dialog's text input they break the line and never submit.
 */
export function sanitizeInjectText(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/\t/g, '  ').replace(UNSAFE_INPUT, '');
}
