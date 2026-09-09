/**
 * Pure agent-status reducer for claude-code cloud sessions.
 *
 * The manager feeds hook events (and two of its own) through
 * {@link reduceAgentStatus}; the result is what the UI shows as the tab dot.
 * Kept free of IO so the full transition table is unit-testable.
 */

import type { CloudTerminalAgentEvent, CloudTerminalAgentStatus } from '../../shared/types/cloud-terminal.protocol.js';

/**
 * Transition table. Rules that only apply from a specific previous status are
 * the "decay" paths: idle-prompt unsticks a `working` session Claude never
 * closed with Stop (user interrupt), idle-timeout ages a `done` session.
 * `done` is deliberately NOT shortened by idle-prompt (~60 s): "finished, come
 * and look" must stay visible for the full AGENT_IDLE_AFTER_MS.
 */
export function reduceAgentStatus(
  prev: CloudTerminalAgentStatus,
  event: CloudTerminalAgentEvent
): CloudTerminalAgentStatus {
  switch (event) {
    case 'session-start':
      return 'idle';
    case 'prompt-submitted':
      return 'working';
    case 'blocked':
      return 'blocked';
    case 'unblocked':
      return 'working';
    case 'user-input':
      return prev === 'blocked' ? 'working' : prev;
    case 'stop':
      return 'done';
    case 'stop-failure':
      return 'error';
    case 'idle-prompt':
      return prev === 'working' ? 'idle' : prev;
    case 'idle-timeout':
      return prev === 'done' ? 'idle' : prev;
  }
}

/**
 * Whether an event counts as session activity for the auto-mode stall
 * watchdog (`lastActivity`). Decay events do not: a silent slot must not look
 * alive just because it aged.
 */
export function bumpsActivity(event: CloudTerminalAgentEvent): boolean {
  return event !== 'idle-prompt' && event !== 'idle-timeout';
}

/**
 * Input that answers a Claude dialog: Enter/newline anywhere in the chunk
 * (typed or pasted), or exactly one answer key — a menu digit, y/n, or ESC
 * (cancels the dialog). Arrow keys, Tab and plain text do not qualify.
 */
// eslint-disable-next-line no-control-regex
export const UNBLOCKING_INPUT_RE = /[\r\n]|^(?:[0-9yYnN]|\x1b)$/;

export function isUnblockingInput(data: string): boolean {
  return UNBLOCKING_INPUT_RE.test(data);
}
