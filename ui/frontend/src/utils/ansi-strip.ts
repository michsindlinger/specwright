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
