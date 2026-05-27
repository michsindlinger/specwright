import { stripAnsi } from './ansi-strip.js';

export interface ParsedOption {
  index: number;
  label: string;
}

// Matches: "1. label", "1) label", "[1] label" (leading whitespace OK)
const OPTION_RE = /^\s*(?:\[(\d+)\]|(\d+)[.)]) +(.+)$/;

/**
 * Parse the last block of consecutively numbered options from terminal output.
 * Returns empty array if fewer than 2 options are detected.
 *
 * Supported formats: "1. text", "1) text", "[1] text"
 */
export function parseNumberedOptions(text: string): ParsedOption[] {
  if (!text) return [];

  const lines = stripAnsi(text).split('\n');
  let bestBlock: ParsedOption[] = [];
  let currentBlock: ParsedOption[] = [];

  for (const line of lines) {
    if (!line.trim()) continue; // blank lines don't break a block

    const match = OPTION_RE.exec(line);
    if (match) {
      const n = parseInt(match[1] ?? match[2], 10);
      const label = (match[3] ?? '').trim();

      if (n === 1) {
        if (currentBlock.length >= 2) bestBlock = currentBlock;
        currentBlock = [{ index: n, label }];
      } else if (currentBlock.length > 0 && n === currentBlock[currentBlock.length - 1].index + 1) {
        currentBlock.push({ index: n, label });
      } else {
        if (currentBlock.length >= 2) bestBlock = currentBlock;
        currentBlock = [];
      }
    } else {
      if (currentBlock.length >= 2) bestBlock = currentBlock;
      currentBlock = [];
    }
  }

  if (currentBlock.length >= 2) bestBlock = currentBlock;
  return bestBlock;
}
