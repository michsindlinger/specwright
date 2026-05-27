/* eslint-disable no-control-regex */
const CSI_RE = /\x1B\[[\x30-\x3F]*[\x20-\x2F]*[\x40-\x7E]/g;
const OSC_RE = /\x1B\][^\x07\x1B]*(?:\x07|\x1B\\)/g;
const SINGLE_ESC_RE = /\x1B[@A-Z\\_^]/g;
/* eslint-enable no-control-regex */

export function stripAnsi(input: string): string {
  if (!input) return input;
  return input
    .replace(CSI_RE, '')
    .replace(OSC_RE, '')
    .replace(SINGLE_ESC_RE, '');
}

/**
 * Collapses TTY rewrite control characters to the final visible text state.
 *
 * - `\b` (backspace, 0x08): drops the previous character on the current line.
 * - Sole `\r` (CR, 0x0D, not followed by LF): resets the current line buffer
 *   (Claude TUI uses CR to overwrite spinner / progress lines in place).
 * - `\r\n` (CRLF): treated as a single line terminator (LF kept).
 * - `\n` (LF): line terminator.
 *
 * Use AFTER `stripAnsi` and ONLY for display contexts (e.g. log panel).
 * Do NOT use for inputs to `parseNumberedOptions` or other parsers that
 * rely on the existing `stripAnsi` output shape.
 */
export function collapseTtyRewrites(input: string): string {
  if (!input) return input;
  const out: string[] = [];
  let line: string[] = [];

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (ch === '\n') {
      out.push(line.join(''), '\n');
      line = [];
      continue;
    }

    if (ch === '\r') {
      if (input[i + 1] === '\n') {
        out.push(line.join(''), '\n');
        line = [];
        i++;
        continue;
      }
      line = [];
      continue;
    }

    if (ch === '\b') {
      line.pop();
      continue;
    }

    line.push(ch);
  }

  if (line.length > 0) out.push(line.join(''));
  return out.join('');
}
