/**
 * Unit tests for PAM-FIX-004 / PAM-FIX-005:
 *  - PROMPT_PATTERN extension covers Claude-Code AskUserQuestion-UI output
 *  - BLOCKER_PATTERN matches `<<BLOCKER:reason>>` markers
 */

import { describe, it, expect } from 'vitest';
import {
  PROMPT_PATTERN,
  BLOCKER_PATTERN,
} from '../../src/server/services/cloud-terminal-manager.js';

describe('PROMPT_PATTERN', () => {
  it.each([
    ['(y/n) at line end', 'Continue? (y/n)'],
    ['[Y/n] at line end', 'Overwrite [Y/n]'],
    ['Press Enter line', 'Press Enter to continue'],
    // Claude-Code AskUserQuestion-UI footer (numbered + UI hint)
    ['Esc to cancel hint', 'Enter to select · ↑/↓ to navigate · Esc to cancel'],
    ['Chat about this numbered', '5. Chat about this'],
    ['Type something. numbered', '4. Type something.'],
  ])('matches %s: %s', (_label, sample) => {
    expect(PROMPT_PATTERN.test(sample)).toBe(true);
  });

  it.each([
    'Building the project...',
    'Tests passed: 42/42',
    'Story IG-001 done',
    'Wrote 5 files',
    // Migrated from positive to negative (PAM-FIX-008): natural Claude commentary
    'Do you want to delete?',
    'Continue?',
    'Phase 1 done. Continue with Phase 2?',
    'Press Enter in your terminal to start the dev server',
  ])('does not match normal output: %s', (sample) => {
    expect(PROMPT_PATTERN.test(sample)).toBe(false);
  });
});

describe('BLOCKER_PATTERN', () => {
  it('captures the reason from a blocker marker', () => {
    const m = BLOCKER_PATTERN.exec('<<BLOCKER:strapi not running>>');
    expect(m).not.toBeNull();
    expect(m![1]).toBe('strapi not running');
  });

  it('captures the reason when surrounded by other output', () => {
    const data = 'something happened\n<<BLOCKER:dependency missing>>\ntrailing log';
    const m = BLOCKER_PATTERN.exec(data);
    expect(m).not.toBeNull();
    expect(m![1].trim()).toBe('dependency missing');
  });

  it('does not match incomplete markers', () => {
    expect(BLOCKER_PATTERN.test('<<BLOCKER:>>')).toBe(false);
    expect(BLOCKER_PATTERN.test('<<BLOCKER missing colon>>')).toBe(false);
    expect(BLOCKER_PATTERN.test('BLOCKER:no angle brackets')).toBe(false);
  });
});
