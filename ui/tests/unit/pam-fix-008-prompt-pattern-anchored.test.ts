/**
 * PAM-FIX-008: Anchored PROMPT_PATTERN.
 *
 * Verifies that the tightened pattern only matches real interactive
 * terminal prompts and not natural-language Claude commentary that
 * happens to contain phrases like "Do you want to" or "Continue?".
 */

import { describe, it, expect } from 'vitest';
import { PROMPT_PATTERN } from '../../src/server/services/cloud-terminal-manager.js';

describe('PROMPT_PATTERN — anchored variant (PAM-FIX-008)', () => {
  describe('false positives that must NOT match', () => {
    it.each([
      'Do you want to refactor this component?',
      'Phase 1 done. Continue with Phase 2?',
      'Press Enter in your terminal to start the dev server',
      'I noticed you might want to keep both options. Continue?',
      'The user said "Do you want to keep this?" earlier in the conversation.',
      '> note: type something. into the field, then proceed',
    ])('Claude commentary: %s', (sample) => {
      expect(PROMPT_PATTERN.test(sample)).toBe(false);
    });
  });

  describe('real prompts that must match', () => {
    it.each([
      ['(y/n) at end of line', 'Overwrite existing file? (y/n)'],
      ['[Y/n] at end of line', 'Apply migration [Y/n]'],
      ['(yes/no) at end of line', 'Proceed? (yes/no)'],
      ['Press Enter on its own line', 'Press Enter to continue'],
      ['indented Press Enter', '    Press Enter to continue'],
      ['plain Press Return', 'Press Return'],
      ['AskUserQuestion-UI footer', 'Enter to select · ↑/↓ to navigate · Esc to cancel'],
      ['numbered AskUserQuestion-UI option (Chat)', '3. Chat about this'],
      ['numbered AskUserQuestion-UI option (Type)', '4. Type something.'],
    ])('%s: %s', (_label, sample) => {
      expect(PROMPT_PATTERN.test(sample)).toBe(true);
    });
  });

  describe('multi-line output with prompt at the tail', () => {
    it('matches when the prompt is the last line of a buffer', () => {
      const buffer = [
        'Building project...',
        'Wrote 5 files',
        'Apply migration [Y/n]',
      ].join('\n');
      expect(PROMPT_PATTERN.test(buffer)).toBe(true);
    });

    it('does not match when the same phrase appears mid-line as commentary', () => {
      const buffer = [
        'Note: when prompted with [Y/n], type Y to confirm.',
        'Continuing build...',
      ].join('\n');
      expect(PROMPT_PATTERN.test(buffer)).toBe(false);
    });
  });
});
