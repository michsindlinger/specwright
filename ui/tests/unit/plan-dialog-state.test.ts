import { describe, it, expect } from 'vitest';
import {
  injectProbe,
  optionLineHas,
  parsePlanDialog,
  sameDialogState,
  sanitizeInjectText,
  stripScreen,
} from '../../src/server/utils/plan-dialog-state.js';

const ptr = (on: boolean): string => (on ? '❯' : ' ');

/**
 * The plan dialog as a clean tmux screen: pointer on `focus` (0 = none),
 * option 3 showing `opt3`, `below` rendered under option 3 (typed text).
 * The plan above the cue carries its own numbered list on purpose.
 */
function dialog(focus: number, opt3 = 'Tell Claude what to change', below: string[] = []): string {
  return [
    " Here is Claude's plan:",
    '╌╌╌╌╌╌╌╌╌╌',
    ' 1. Create CONTRIBUTING.md',
    ' 2. Link it from the README',
    '╌╌╌╌╌╌╌╌╌╌',
    ' Claude has written up a plan and is ready to execute.',
    ' Would you like to proceed?',
    ` ${ptr(focus === 1)} 1. Yes, and switch to BYPASS PERMISSIONS (no further`,
    '      prompts) for this session',
    ` ${ptr(focus === 2)} 2. Yes, manually approve edits`,
    ` ${ptr(focus === 3)} 3. ${opt3}`,
    ...below,
    '      shift+tab to approve with this feedback',
    ' ctrl+g to edit in Vim · ~/.claude/plans/foo.md',
  ].join('\n');
}

const options = (lines: string[]): string => [' Would you like to proceed?', ...lines].join('\n');

describe('parsePlanDialog()', () => {
  it('reads focus and the free-text option from a clean screen', () => {
    expect(parsePlanDialog(dialog(1))).toEqual({
      focused: 1,
      target: 3,
      options: [1, 2, 3],
      lines: {
        1: 'Yes, and switch to BYPASS PERMISSIONS (no further',
        2: 'Yes, manually approve edits',
        3: 'Tell Claude what to change',
      },
    });
    expect(parsePlanDialog(dialog(2))?.focused).toBe(2);
  });

  it('takes the last option once typed text replaced the label', () => {
    expect(parsePlanDialog(dialog(3, 'hello'))).toMatchObject({ focused: 3, target: 3, lines: { 3: 'hello' } });
  });

  it('finds the free-text option by its label, not by position', () => {
    expect(parsePlanDialog(options([' ❯ 1. Yes', '   2. Yes, manually', '   3. No', '   4. Tell Claude what to change'])))
      .toMatchObject({ target: 4, options: [1, 2, 3, 4] });
    expect(parsePlanDialog(options([' ❯ 1. Yes', '   2. Yes, manually', '   3. Tell Claude what to change', '   4. Something new'])))
      .toMatchObject({ target: 3, options: [1, 2, 3, 4] });
  });

  it('ignores numbered lists inside the typed review (they sit right of the option column)', () => {
    const screen = dialog(3, 'External review consensus (2 successful reviewers).', [
      '',
      '      🔴 BLOCKER (2/2 agreement, must address):',
      '      1. Hook registration timing creates a race',
      '      2. No retry on transient PUT failures',
      '      3. Line-number references drift',
      '      4. Unverified helper',
    ]);
    expect(parsePlanDialog(screen)).toMatchObject({
      focused: 3,
      target: 3,
      options: [1, 2, 3],
      lines: { 3: 'External review consensus (2 successful reviewers).' },
    });
  });

  it('looks past a cue quoted inside the typed review', () => {
    const screen = dialog(3, 'External review consensus (1 successful reviewer).', [
      '      The plan claims the dialog asks "Would you like to proceed?" first.',
    ]);
    expect(parsePlanDialog(screen)).toMatchObject({ focused: 3, target: 3 });
  });

  it('follows differential redraws in a raw buffer: last line per option wins', () => {
    const esc = '\x1b';
    const raw =
      `${esc}]0;claude${esc}\\` +
      `${esc}[?25l` +
      dialog(1).replace(/\n/g, '\r\n') +
      `${esc}[4A\r${esc}[2K   1. Yes, and switch to BYPASS PERMISSIONS (no further` +
      `${esc}[2B\r${esc}[2K${esc}[36m ❯ 3. Tell Claude what to change${esc}[39m` +
      `${esc}[?25h`;
    expect(parsePlanDialog(raw)).toMatchObject({ focused: 3, target: 3 });
  });

  it('splits lines rewritten via absolute cursor positioning', () => {
    const raw = dialog(1) + '\x1b[12;1H   1. Yes, and switch\x1b[14;1H ❯ 3. Tell Claude what to change';
    expect(parsePlanDialog(raw)?.focused).toBe(3);
  });

  it('reads a raw Claude Code frame whose words are placed with ESC[<col>G', () => {
    const e = '\x1b';
    const frame =
      `${e}[2G${e}[38;5;246mWould${e}[8Gyou${e}[12Glike${e}[17Gto${e}[20Gproceed?${e}[39m\n\n\n\n` +
      `${e}[2G${e}[38;5;153m❯${e}[4G${e}[38;5;246m1.${e}[7G${e}[38;5;153mYes,${e}[12Gand${e}[16Gswitch${e}[39m\n\n` +
      `${e}[4G${e}[38;5;246m2.${e}[7GYes,${e}[12Gmanually${e}[21Gapprove${e}[29Gedits${e}[39m\n\n` +
      `${e}[4G3.${e}[7GTell${e}[12GClaude${e}[19Gwhat${e}[24Gto${e}[27Gchange${e}[39m\n`;
    expect(parsePlanDialog(frame)).toMatchObject({ focused: 1, target: 3, lines: { 2: 'Yes, manually approve edits' } });
  });

  it('does not see cell-level focus updates of a raw buffer (why raw-buffer mode never navigates)', () => {
    // Captured from Claude Code after one ArrowDown: the marker cell of option 1
    // is blanked, option 2's row is rewritten as "❯ <text>" without its number.
    const e = '\x1b';
    const update = `${e}[1C${e}[8A ${e}[7GYes, and switch\n${e}[1C${e}[1B${e}[38;5;153m❯${e}[7GYes, manually approve edits${e}[39m\n`;
    expect(parsePlanDialog(dialog(1) + update)?.focused).toBe(1);
  });

  it('takes the last frame when the buffer holds several', () => {
    expect(parsePlanDialog(dialog(2) + '\n' + dialog(1))?.focused).toBe(1);
  });

  it('accepts an ASCII pointer', () => {
    expect(parsePlanDialog(dialog(1).replace('❯', '>'))?.focused).toBe(1);
  });

  it('returns null without a plan cue, for a permission prompt, without or with two pointers', () => {
    expect(parsePlanDialog(' 1. Create CONTRIBUTING.md\n 2. Link it\n ❯ 3. Done')).toBeNull();
    expect(parsePlanDialog(' Do you want to proceed?\n ❯ 1. Yes\n   2. No')).toBeNull();
    expect(parsePlanDialog(dialog(0))).toBeNull();
    expect(parsePlanDialog(dialog(1).replace('   2. Yes, manually', ' ❯ 2. Yes, manually'))).toBeNull();
    expect(parsePlanDialog('')).toBeNull();
  });
});

describe('stripScreen()', () => {
  it('drops escapes and control characters; \\r and cursor moves start new lines', () => {
    expect(stripScreen('a\x1b[?2004h\x1b[1mb\x1b[0m\rc\x1b[3;1Hd\x1b]0;t\x07e\x07')).toEqual(['ab', 'c', 'de']);
  });
});

describe('stripScreen() column moves', () => {
  it('turns ESC[<col>G and ESC[<n>C into spaces and keeps the row', () => {
    expect(stripScreen('\x1b[2GWould\x1b[8Gyou\x1b[1Clike')).toEqual([' Would you like']);
  });
});

describe('sameDialogState()', () => {
  it('two nulls agree; otherwise focus, target and the focused line must match', () => {
    const a = parsePlanDialog(dialog(1));
    expect(sameDialogState(null, null)).toBe(true);
    expect(sameDialogState(a, null)).toBe(false);
    expect(sameDialogState(a, parsePlanDialog(dialog(1)))).toBe(true);
    expect(sameDialogState(a, parsePlanDialog(dialog(2)))).toBe(false);
    expect(sameDialogState(parsePlanDialog(dialog(3, 'Ext')), parsePlanDialog(dialog(3, 'External')))).toBe(false);
  });
});

describe('injectProbe() / optionLineHas()', () => {
  it('probes the first words of both inject formats', () => {
    expect(injectProbe('External review consensus (3 successful reviewers (of 4 selected)).\n\n🔴 BLOCKER'))
      .toBe('External review consensus');
    expect(injectProbe("\n\nPlease address these issues coming from review agents. Don't follow"))
      .toBe('Please address these');
  });

  it('finds the probe on the option line only, whitespace-insensitive, also after a typed prefix', () => {
    const state = parsePlanDialog(
      dialog(3, 'xExternal  review consensus (1 successful reviewer).', ['      Please address these later'])
    )!;
    expect(optionLineHas(state, 3, 'External review consensus')).toBe(true);
    expect(optionLineHas(state, 3, 'Please address these')).toBe(false);
    expect(optionLineHas(state, 1, 'External review consensus')).toBe(false);
    expect(optionLineHas(state, 3, '')).toBe(false);
  });
});

describe('sanitizeInjectText()', () => {
  it('turns CR into LF, tabs into spaces, and strips ESC and other controls that act as keys', () => {
    expect(sanitizeInjectText('a\r\nb\rc\x1b[Ad\te\x07f\n')).toBe('a\nb\nc[Ad  ef\n');
  });
});
