/**
 * Dialog driver, part 1 (INT-2026-007 Stufe 1): what the UI needs before it
 * writes free text into a session — a stable read of the screen and the
 * recognition of dialog cues. Part 2 (Stufe 2) adds the verified key sequences
 * that answer a Rückfrage or decide a plan (AR-08: the UI only types into a
 * dialog whose state it just read from the screen, and checks after each key).
 *
 * Cues (recorded on Claude Code 2.1.273, fixtures `ui/tests/fixtures/tui/`):
 * - plan dialog: `Claude has written up a plan` / `Would you like to proceed?`
 *   (`PLAN_DIALOG_CUE` of plan-dialog-state.ts),
 * - AskUserQuestion: footer `Enter to select · … · Esc to cancel`, the
 *   review step `Ready to submit your answers?`,
 * - permission prompt: `Do you want to proceed?` / `Do you want to …`,
 * - trust dialog at first start: `Yes, I trust this folder`.
 * Anything not recognised is not a cue — free text is then only pasted when
 * the session's status says it waits (fail closed, plan §3 „Freitext trifft
 * nie einen Dialog").
 */

import type { BlockKind } from '../../shared/types/hook-events.protocol.js';
import { PLAN_DIALOG_CUE, stripScreen } from '../utils/plan-dialog-state.js';

export type DialogCueKind = 'plan' | 'rueckfrage' | 'berechtigung' | 'trust';

export interface DialogCue {
  kind: DialogCueKind;
  /** The line that matched (stripped), for logs and tests. */
  line: string;
}

const RUECKFRAGE_FOOTER = /Enter to select · .*Esc to cancel/;
const RUECKFRAGE_SUBMIT = /Ready to submit your answers\?/;
const PERMISSION_CUE = /^\s*Do you want to (proceed|make this edit|run this command|allow|create|delete|read|overwrite)/i;
const TRUST_CUE = /Yes, I trust this folder|Quick safety check: Is this a project you created/;

/** First dialog cue on the screen, or null when none is visible. Pure. */
export function findDialogCue(screen: string): DialogCue | null {
  const lines = stripScreen(screen);
  for (const line of lines) {
    if (PLAN_DIALOG_CUE.test(line)) return { kind: 'plan', line };
    if (RUECKFRAGE_FOOTER.test(line) || RUECKFRAGE_SUBMIT.test(line)) return { kind: 'rueckfrage', line };
    if (TRUST_CUE.test(line)) return { kind: 'trust', line };
    if (PERMISSION_CUE.test(line)) return { kind: 'berechtigung', line };
  }
  return null;
}

export const hasDialogCue = (screen: string): boolean => findDialogCue(screen) !== null;

/** The empty prompt line Claude Code draws while it waits — and (since 2.1.276) also while it works. */
const IDLE_PROMPT_RE = /^\s*❯\s*$/;
/**
 * Any prompt line, empty or filled. The transcript keeps the user's earlier
 * prompts as `❯ …` lines as well (fixture `2.1.276/prompt-idle.txt`, lines
 * 6/8/18), so only the LAST match is the input box (INT-2026-021, AK-03).
 * Recorded on 2.1.277: the live box separates `❯` from the text with U+00A0,
 * the transcript with a plain space — `\s` covers both and the rule never
 * depends on which one it is.
 */
const PROMPT_LINE_RE = /^\s*❯/;
/**
 * A running turn: the spinner line `✻ Enchanting… (4s · ↓ 204 tokens · thinking)`,
 * `⎿  Running… (3s)` (a tool), or the older `esc to interrupt` hint. The
 * finished marks `✻ Churned for 10s · done 8:38` carry no `…(` and do not match.
 * Recorded on 2.1.276 (INT-2026-018, fixtures `prompt-working.txt`).
 */
const BUSY_CUE = /…\s*\([^)]*\b\d+s\b|esc to interrupt/;

/**
 * INT-2026-018 (AK-08, review E14/E15): does the screen show a session that
 * waits for input — an empty prompt line, no spinner, no dialog cue? Only
 * then may `/clear` be pasted: a `/clear` that lands in a running turn is
 * buffered by Claude Code and executed minutes later, without our command
 * (plan §9 R10). Since INT-2026-021 a thin wrapper around `promptZustand`,
 * with unchanged meaning for every caller.
 */
export function isIdlePrompt(screen: string): boolean {
  return promptZustand(screen) === 'wartet';
}

/** INT-2026-021: the four states of the prompt that `screenCheck` tells apart. */
export type PromptZustand = 'wartet' | 'arbeitet' | 'eingabe_nicht_leer' | 'dialog';

/**
 * INT-2026-021 (AK-01, AK-03, AK-04): what the screen says about the prompt.
 * `wartet` — empty input box, no spinner, no dialog: only then may `/clear`
 * and the phase command be pasted.
 * `eingabe_nicht_leer` — the box carries text the user typed. A paste would be
 * appended to it (`ja, leg den Entwurf an/clear`), so it is refused — but under
 * its own name, not as „arbeitet" (what INT-2026-018 reported for it).
 * `arbeitet` — a spinner runs, or no prompt line is visible at all (startup
 * screen, scrolled view): fail closed, exactly as before.
 * `dialog` — a cue is on screen; checked FIRST so the precedence stays the one
 * the caller has today (`screenCheck` asks `findDialogCue` before the prompt).
 * Pure; the caller reads a stable screen first.
 *
 * INT-2026-023: `eingabe_nicht_leer` is only HALF the rule. Claude Code draws
 * the last command as a dim suggestion into the EMPTY box, and this function
 * cannot tell it from typed text — the drawn text never can. The caller asks
 * {@link eingabeLeerLautCursor} with a cursor probe before it refuses.
 */
export function promptZustand(screen: string): PromptZustand {
  if (findDialogCue(screen) !== null) return 'dialog';
  const lines = stripScreen(screen);
  if (lines.some((l) => BUSY_CUE.test(l))) return 'arbeitet';
  const eingabe = lines.filter((l) => PROMPT_LINE_RE.test(l)).at(-1);
  if (eingabe === undefined) return 'arbeitet';
  return IDLE_PROMPT_RE.test(eingabe) ? 'wartet' : 'eingabe_nicht_leer';
}

/**
 * INT-2026-023: the unfolded pane of a session together with its cursor
 * position, both from ONE tmux call (`TmuxSessionBackend.captureCursorProbe`).
 * `zeilen` holds one entry per terminal row, so `zeilen[y]` is the row the
 * cursor sits in; `x` counts terminal CELLS from the left edge.
 */
export interface CursorProbe {
  zeilen: string[];
  x: number;
  y: number;
}

/**
 * INT-2026-023 (AK-01 bis AK-04): may the UI write into this session although
 * `promptZustand` called the box `eingabe_nicht_leer`?
 *
 * Claude Code draws the last command as a suggestion RIGHT OF the cursor into
 * the empty box after every finished turn — the drawn text therefore cannot
 * decide, the cursor can. Decided on ONE probe (pane + cursor from one tmux
 * call) that is YOUNGER than the caller's stable screen read:
 *
 * 1. A dialog cue or a spinner ON THIS probe → no. That also closes the case
 *    where the user submitted between the two reads and a `/clear` would land
 *    in a running turn (INT-2026-018 §9 R10).
 * 2. The cursor must sit in a row that carries the prompt sign — a multi-line
 *    entry puts it on a follow-up row (AN-02).
 * 3. Between prompt sign and cursor there may only be whitespace. No column
 *    arithmetic: `cursor_x` counts cells, a JS string counts code points. With
 *    wide characters (CJK) the slice reaches too far right and reports „not
 *    empty" — the safe direction.
 *
 * Known limit: whoever types text and then jumps to the start of the line with
 * Ctrl-A/Pos1 has nothing left of the cursor either and looks empty to this
 * rule (plan §9 R2). The cursor position alone cannot tell the two apart.
 *
 * Pure.
 */
export function eingabeLeerLautCursor(probe: CursorProbe): boolean {
  const { zeilen, x, y } = probe;
  if (findDialogCue(zeilen.join('\n')) !== null) return false;
  if (zeilen.some((l) => BUSY_CUE.test(l))) return false;
  const zeile = zeilen[y];
  if (zeile === undefined) return false;
  const treffer = PROMPT_LINE_RE.exec(zeile);
  if (treffer === null) return false;
  const zeichen = [...zeile]; // code points, not UTF-16 units
  if (x > zeichen.length) return false; // cursor beyond what the capture holds
  return zeichen.slice([...treffer[0]].length, x).join('').trim() === '';
}

/**
 * INT-2026-021 (AK-01): the text in the input box, for the message that names
 * it. Only meaningful when `promptZustand` said `eingabe_nicht_leer`; NBSP and
 * runs of whitespace collapse to single spaces, an empty result is `undefined`.
 */
export function eingabeText(screen: string): string | undefined {
  const eingabe = stripScreen(screen)
    .filter((l) => PROMPT_LINE_RE.test(l))
    .at(-1);
  return eingabe?.replace(PROMPT_LINE_RE, '').replace(/\s+/g, ' ').trim() || undefined;
}

/** INT-2026-016 (AK-10): the block kind the dialog probe reports for a cue (trust dialogs have no kind of their own). */
export function cueToBlockKind(kind: DialogCueKind): BlockKind {
  switch (kind) {
    case 'plan':
      return 'plan';
    case 'rueckfrage':
      return 'rueckfrage';
    case 'berechtigung':
      return 'berechtigung';
    default:
      return 'unbekannt';
  }
}

/** The slice of the terminal manager the driver reads. */
export interface ScreenSource {
  readScreen(sessionId: string, opts?: { scrollback?: number }): Promise<{ text: string; live: boolean }>;
  waitForIdle(sessionId: string, idleMs: number): Promise<void>;
}

export type StableScreen = { live: true; text: string } | { live: false; text: string } | 'unstable';

/** Ink redraws in passes: a read counts once two reads in a row agree. */
export const STABLE_READ_ATTEMPTS = 3;
export const STABLE_READ_IDLE_MS = 150;

/**
 * Two identical reads of the live screen, or `unstable` after
 * {@link STABLE_READ_ATTEMPTS}. A raw-buffer read (`live: false`) is returned
 * as such after the first read — it cannot become "stable" in any meaningful
 * way and the callers treat it as "no screen".
 */
export async function readStableScreen(source: ScreenSource, sessionId: string): Promise<StableScreen> {
  let prev = await source.readScreen(sessionId);
  if (!prev.live) return { live: false, text: prev.text };
  for (let i = 0; i < STABLE_READ_ATTEMPTS; i++) {
    await source.waitForIdle(sessionId, STABLE_READ_IDLE_MS);
    const next = await source.readScreen(sessionId);
    if (!next.live) return { live: false, text: next.text };
    if (next.text === prev.text) return { live: true, text: next.text };
    prev = next;
  }
  return 'unstable';
}
