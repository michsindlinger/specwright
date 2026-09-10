/**
 * Replay-buffer assembly for cloud-terminal sessions.
 *
 * Kept free of manager/PTY dependencies so it is unit-testable in isolation
 * (same convention as the other pure `cloud-terminal-*` helpers).
 *
 * Why the preamble exists: the frontend replays the captured PTY buffer after
 * `terminal.reset()` (reconnect, wake, remount). `reset()` drops every terminal
 * mode — alternate screen, mouse tracking, bracketed paste. With tmux in the
 * loop those modes are set exactly ONCE, by the tmux client at attach time,
 * and never repeated. The session buffer is bounded (chunk count + byte size),
 * so on a long-running, chatty session the attach chunk is the first thing
 * trimmed away. A replay from such a buffer leaves xterm on the normal screen
 * with mouse tracking OFF: the wheel no longer reaches tmux (copy-mode
 * scrolling is dead) and xterm scrolls its own scrollback of stale redraw
 * frames instead. Observed on every session whose buffer had grown past the
 * chunk limit (~7 MB).
 *
 * Prepending the modes the tmux client establishes at attach makes the replay
 * self-contained regardless of what the trimming removed. The sequences are
 * idempotent mode sets, so an untrimmed buffer (which still carries the real
 * attach chunk) is unaffected.
 */

/**
 * Terminal modes the tmux client sets on the outer terminal at attach
 * (mirrors `ui/config/tmux-cloud.conf`: mouse on, SGR mouse reporting,
 * alternate screen). Order matches what tmux itself emits.
 *
 * - `?1049h`  alternate screen (tmux client stays on it; no outer scrollback)
 * - `?1h` `ESC =`  application cursor keys / keypad, as tmux sends on attach
 * - `?1006h ?1000h ?1002h`  SGR mouse encoding + button/drag tracking
 *   (xterm needs these to forward wheel events to tmux instead of scrolling)
 * - `?2004h`  bracketed paste; tmux re-wraps pastes per pane mode, so it is
 *   safe to keep on even when the inner app did not request it
 */
export const TMUX_CLIENT_MODE_PREAMBLE =
  '\x1b[?1049h\x1b[?1h\x1b=\x1b[?1006h\x1b[?1000h\x1b[?1002h\x1b[?2004h';

/**
 * Build the string a `cloud-terminal:buffer-request` replies with.
 *
 * Chunks are joined without a separator — they are raw PTY output and any
 * inserted byte would corrupt escape sequences at chunk boundaries.
 *
 * @param chunks raw PTY output chunks, oldest first
 * @param tmuxBacked true when the session runs inside a tmux session
 *   (plain node-pty sessions get the buffer verbatim — there the inner app
 *   owns the modes and the replay carries them or not, as before)
 */
export function buildReplayBuffer(chunks: readonly string[], tmuxBacked: boolean): string {
  const body = chunks.join('');
  return tmuxBacked ? TMUX_CLIENT_MODE_PREAMBLE + body : body;
}
