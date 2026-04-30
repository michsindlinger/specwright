// eslint-disable-next-line no-control-regex
const ANSI_CSI = /\x1b\[[0-9;]*[a-zA-Z]/g;
// OSC sequences: ESC ] ... BEL or ESC ] ... ESC backslash
// eslint-disable-next-line no-control-regex
const ANSI_OSC = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;

const FALLBACK_SIZE = 8 * 1024;

// TUI box corners used by Claude Code plan mode
const BOX_TOP = '╭';
const BOX_BOTTOM = '╰';

/**
 * Extracts clean plan text from a PTY buffer tail.
 *
 * Strategy:
 *   1. Strip ANSI/OSC escape sequences and carriage returns
 *   2. Find the last complete TUI box (╭…╰) — this is the plan content
 *   3. Fallback: last 8 KB of stripped text if no box found
 *   4. Throw if the result is empty
 */
export class PlanBufferExtractor {
  extract(rawBuffer: string): string {
    const stripped = this.stripEscapes(rawBuffer);

    const boxContent = this.extractLastTuiBox(stripped);
    if (boxContent !== null && boxContent.trim().length > 0) {
      return boxContent;
    }

    const fallback = stripped.slice(-FALLBACK_SIZE);
    if (fallback.trim().length === 0) {
      throw new Error('PlanBufferExtractor: no plan content found in buffer');
    }
    return fallback;
  }

  private stripEscapes(raw: string): string {
    return raw
      .replace(ANSI_OSC, '')
      .replace(ANSI_CSI, '')
      .replace(/\r/g, '');
  }

  private extractLastTuiBox(text: string): string | null {
    const bottomIdx = text.lastIndexOf(BOX_BOTTOM);
    if (bottomIdx === -1) return null;

    const topIdx = text.lastIndexOf(BOX_TOP, bottomIdx);
    if (topIdx === -1) return null;

    // Include the full bottom border line
    const afterBottom = text.indexOf('\n', bottomIdx);
    const end = afterBottom === -1 ? text.length : afterBottom + 1;

    return text.slice(topIdx, end);
  }
}
