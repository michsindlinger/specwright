/**
 * INT-2026-016 (AK-10): the dialog probe relies on `findDialogCue` matching
 * what Claude Code really draws — checked against the recorded screens under
 * tests/fixtures/tui/<version>/ (2.1.273 from INT-2026-007, 2.1.274 from the
 * Schritt-0 run of this Vorhaben) and against text that must NOT count as a
 * dialog (an idle prompt, prose quoting the cue mid-line).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { cueToBlockKind, findDialogCue, isIdlePrompt } from '../../src/server/services/dialog-driver.js';

const FIXTURES = resolve(process.cwd(), 'tests', 'fixtures', 'tui');
const versions = readdirSync(FIXTURES).filter((v) => /^\d+\.\d+\.\d+$/.test(v));
const read = (version: string, file: string): string => readFileSync(resolve(FIXTURES, version, file), 'utf8');

describe('findDialogCue on recorded screens', () => {
  for (const v of versions) {
    const files = readdirSync(resolve(FIXTURES, v));
    for (const f of files.filter((x) => x.startsWith('plan-dialog'))) {
      it(`${v}/${f} → plan`, () => {
        expect(findDialogCue(read(v, f))?.kind).toBe('plan');
      });
    }
    for (const f of files.filter((x) => x.startsWith('askuserquestion'))) {
      it(`${v}/${f} → rueckfrage`, () => {
        expect(findDialogCue(read(v, f))?.kind).toBe('rueckfrage');
      });
    }
    for (const f of files.filter((x) => x.startsWith('permission'))) {
      it(`${v}/${f} → berechtigung`, () => {
        expect(findDialogCue(read(v, f))?.kind).toBe('berechtigung');
      });
    }
    for (const f of files.filter((x) => x.startsWith('idle'))) {
      it(`${v}/${f} → no cue`, () => {
        expect(findDialogCue(read(v, f))).toBeNull();
      });
    }
  }

  it('the 2.1.274 set exists (Schritt 0 of INT-2026-016)', () => {
    expect(existsSync(resolve(FIXTURES, '2.1.274', 'plan-dialog.txt'))).toBe(true);
  });

  it('an idle prompt and prose quoting a cue mid-line are no dialog', () => {
    expect(findDialogCue('  ⏺ Fertig.\n\n  ❯ \n\n  ⏵⏵ bypass permissions on (shift+tab to cycle)\n')).toBeNull();
    expect(findDialogCue('  ⏺ Der Text sagt: Do you want to proceed with the rollout? Das entscheidet ihr.\n  ❯ \n')).toBeNull();
    expect(findDialogCue('  Do you want to proceed?\n  ❯ 1. Yes\n    2. No\n')?.kind).toBe('berechtigung');
  });
});

describe('INT-2026-018 (AK-08, E14): isIdlePrompt on recorded screens', () => {
  it('2.1.276/prompt-idle.txt → idle (empty prompt line, finished mark „Churned for 10s · done" is no spinner)', () => {
    const idle = read('2.1.276', 'prompt-idle.txt');
    expect(idle).toMatch(/Churned for \d+s · done/);
    expect(isIdlePrompt(idle)).toBe(true);
  });
  it('2.1.276/prompt-working.txt → not idle although the empty prompt line is on screen (spinner „Enchanting… (1s · thinking)")', () => {
    const working = read('2.1.276', 'prompt-working.txt');
    expect(working).toMatch(/^\s*❯\s*$/m);
    expect(isIdlePrompt(working)).toBe(false);
  });
  it('the spinner forms seen in Schritt 0 all count as busy; a tip line or prose with an ellipsis does not', () => {
    const frame = (line: string): string => `❯ Frage
${line}
────
❯ 
────
`;
    for (const line of ['✳ Enchanting… (4s · ↓ 204 tokens · thought for 2s)', '⎿  Running… (3s)', '· Generating… (10s · ↓ 265 tokens · thinking)', '✶ Generating… (7s · ↓ 368 tokens · thinking)', '✻ Canoodling… (running PostToolUse hook · 6s · ↓ 113 tokens)', '  Thinking… (esc to interrupt)']) {
      expect(isIdlePrompt(frame(line)), line).toBe(false);
    }
    expect(isIdlePrompt(frame('  ⎿  Tip: Use git worktrees… (and more)'))).toBe(true);
    expect(isIdlePrompt(frame('⏺ Lädt… (bitte warten)'))).toBe(true);
  });
  it('every dialog fixture is not idle; a screen without a prompt line is not idle', () => {
    for (const v of versions) {
      for (const f of readdirSync(resolve(FIXTURES, v)).filter((x) => /^(plan-dialog|askuserquestion|permission)/.test(x))) {
        expect(isIdlePrompt(read(v, f)), `${v}/${f}`).toBe(false);
      }
    }
    expect(isIdlePrompt('⏺ Fertig.\n  ⏵⏵ bypass permissions on\n')).toBe(false);
  });
});

describe('cueToBlockKind', () => {
  it('maps every cue kind to a block kind; trust has none of its own', () => {
    expect(cueToBlockKind('plan')).toBe('plan');
    expect(cueToBlockKind('rueckfrage')).toBe('rueckfrage');
    expect(cueToBlockKind('berechtigung')).toBe('berechtigung');
    expect(cueToBlockKind('trust')).toBe('unbekannt');
  });
});
