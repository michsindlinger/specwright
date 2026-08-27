/**
 * Sanitizer for replayed PTY buffers.
 *
 * Kept DOM-free so it is unit-testable without a browser, mirroring the pure-helper
 * convention used by `pane-visibility.ts`.
 *
 * Why this exists: on reconnect/wake the terminal replays the captured raw PTY buffer
 * into xterm (`terminal.write(buffer)`). That buffer contains the terminal QUERY-REQUEST
 * sequences a TUI (Claude Code) emitted at startup — Device Attributes, cursor/status
 * reports, mode queries, colour queries, etc. xterm is a real emulator and AUTO-ANSWERS
 * those requests while parsing the write; the answers fire through `onData` and our
 * handler forwards them to the LIVE PTY as if the user had typed them. Across every
 * session that resumes on the same wake, this injects synthetic input into the running
 * process (the "auto-/clear on wake" bug).
 *
 * Fix: strip the query-REQUESTS from the historical replay stream before writing it, so
 * xterm has nothing to answer. This is a pure, stateless transform — no timing window,
 * no guard state that could get stuck and block real input. It is safe because the app
 * already received answers to these requests at capture time; it is not waiting for them
 * again. Only the small, well-defined set of emulator-answered *requests* is removed;
 * every rendering sequence (SGR, cursor moves, OSC SET, alt-screen, mouse modes) and the
 * answers themselves are preserved. Live (non-replay) data is never passed through here,
 * so the genuine startup handshake keeps working.
 */

/**
 * Remove terminal query-request escape sequences that xterm would auto-answer.
 *
 * @param data raw PTY replay stream (already decoded to a UTF-8 string)
 * @returns the same stream with emulator-answered query requests removed
 */
export function stripTerminalQueries(data: string): string {
  if (!data) return data;
  // This helper's whole purpose is matching ANSI/VT control sequences, so ESC/BEL
  // literals in these patterns are intentional.
  /* eslint-disable no-control-regex */
  return data
    // Device Attributes (DA1/DA2/DA3): ESC [ c | ESC [ 0 c | ESC [ > c | ESC [ = c | ESC [ ? ... c
    .replace(/\x1b\[[>=?]?[0-9;]*c/g, '')
    // Device Status Report / cursor-position request: ESC [ 5n | 6n | ?6n | ?15n ...
    .replace(/\x1b\[\??[0-9;]*n/g, '')
    // DECRQM (mode query), DEC-private and ANSI: ESC [ ? <n> $ p | ESC [ <n> $ p
    .replace(/\x1b\[\??[0-9;]*\$p/g, '')
    // XTVERSION request: ESC [ > q | ESC [ > 0 q
    .replace(/\x1b\[>[0-9]*q/g, '')
    // Window-manipulation REPORT requests (CSI t): report codes 11,13,14,15,16,18,19,20,21
    .replace(/\x1b\[(?:11|13|14|15|16|18|19|20|21)(?:;[0-9]+)*t/g, '')
    // OSC colour QUERY (10/11/12 fg/bg/cursor) — only the "?" query form, BEL or ST terminated
    .replace(/\x1b\]1[0-2];\?(?:\x07|\x1b\\)/g, '')
    // OSC palette colour QUERY (4;n;?)
    .replace(/\x1b\]4;[0-9]+;\?(?:\x07|\x1b\\)/g, '')
    // OSC 52 clipboard SET (tmux mouse-copy): replaying a historical copy would
    // clobber the user's current clipboard via the frontend OSC-52 handler
    .replace(/\x1b\]52;[^\x07\x1b]*(?:\x07|\x1b\\)/g, '');
  /* eslint-enable no-control-regex */
}
