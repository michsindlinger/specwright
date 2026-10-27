/**
 * INT-2026-037 (FA-02, FA-10): what the review button and the auto start
 * review — the intent or the plan of a Vorhaben. Shared by backend and
 * frontend; imports types only.
 */
import type { VorhabenDocKey, VorhabenStep } from './types/vorhaben.protocol.js';

export type ReviewArt = 'intent' | 'plan';
/** Where the reviewed text came from: the file in the Vorhaben folder, or Claude's plan-mode buffer. */
export type ReviewQuelle = 'intent-ordner' | 'plan-ordner' | 'plan-mode';

export interface ReviewZiel {
  art: ReviewArt;
  quelle: ReviewQuelle;
  /** File in the Vorhaben folder (read when the review starts) or the plan-mode path; null when unknown. */
  pfad: string | null;
  /** Plan-mode text from the buffer; folder sources are read from `pfad`. */
  text?: string;
}

const PLAN_STEPS: readonly (VorhabenStep | undefined)[] = ['plan', 'build'];

/**
 * `plan` without a Vorhaben, with a plan document, or when the row or its
 * session is in step plan/build; otherwise `intent` when an intent document
 * exists; else `plan`. Pure.
 */
export function reviewZielArt(row?: { step?: VorhabenStep; session?: { step?: VorhabenStep }; docs: { key: VorhabenDocKey }[] }): ReviewArt {
  if (!row) return 'plan';
  if (row.docs.some((d) => d.key === 'plan') || PLAN_STEPS.includes(row.step) || PLAN_STEPS.includes(row.session?.step)) return 'plan';
  return row.docs.some((d) => d.key === 'intent') ? 'intent' : 'plan';
}
