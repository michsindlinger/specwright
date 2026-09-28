/**
 * INT-2026-025 (D11, Review F12): when the bell chime stays silent because
 * the call rings instead. Pure; `ringsForAgentEvent` stays unchanged — app.ts
 * asks this function only after that one said „ring".
 *
 * Silent only when all hold: call mode on and available, this window is a
 * local browser with microphone and a local German voice, and the event is
 * one that rings as a call (a `stop`, or the transition into `blocked` with a
 * question or a plan). Permissions, unknown dialogs, plan-review events and
 * mode off keep the chime (FA-02, FA-05).
 */

import type { CloudTerminalAgentStatus } from '../../../../src/shared/types/cloud-terminal.protocol.js';
import type { BlockKind } from '../../../../src/shared/types/hook-events.protocol.js';

export interface AnrufTonInput {
  /** Mode on, backend available, this browser local and capable. */
  anrufAktiv: boolean;
  event: string;
  status: CloudTerminalAgentStatus;
  prevStatus: CloudTerminalAgentStatus | undefined;
  blockKind: BlockKind | undefined;
}

/** Whether the event rings as a call (D5a, FA-03). */
export function istAnrufEreignis(input: Omit<AnrufTonInput, 'anrufAktiv'>): boolean {
  if (input.event === 'stop') return true;
  if (input.event === 'review-injected' || input.event === 'review-failed') return false;
  return input.status === 'blocked' && input.prevStatus !== 'blocked' && (input.blockKind === 'rueckfrage' || input.blockKind === 'plan');
}

/** True → do not play the two-note chime for this event. */
export function glockentonUnterdrueckt(input: AnrufTonInput): boolean {
  return input.anrufAktiv && istAnrufEreignis(input);
}
