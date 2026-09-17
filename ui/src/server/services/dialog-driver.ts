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
