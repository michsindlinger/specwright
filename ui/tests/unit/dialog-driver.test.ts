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
import { cueToBlockKind, eingabeText, findDialogCue, isIdlePrompt, promptZustand } from '../../src/server/services/dialog-driver.js';

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

describe('INT-2026-021 (AK-01, AK-03, AK-04): promptZustand names what the screen shows', () => {
  const rahmen = (box: string, verlauf = '❯ Frage\n⏺ Antwort.\n✻ Churned for 10s · done 8:38\n'): string =>
    `${verlauf}────\n${box}\n────\n  ⏵⏵ bypass permissions on (shift+tab to cycle)\n`;

  it('2.1.277/prompt-eingabe-text.txt → eingabe_nicht_leer (real capture: the box holds „npm run verify", U+00A0 after ❯)', () => {
    const screen = read('2.1.277', 'prompt-eingabe-text.txt');
    expect(screen).toMatch(/❯\u00a0npm run verify/);
    expect(promptZustand(screen)).toBe('eingabe_nicht_leer');
    expect(eingabeText(screen)).toBe('npm run verify');
    expect(isIdlePrompt(screen)).toBe(false);
  });

  it('the recorded idle, working and dialog screens keep their meaning', () => {
    expect(promptZustand(read('2.1.276', 'prompt-idle.txt'))).toBe('wartet');
    expect(promptZustand(read('2.1.276', 'prompt-working.txt'))).toBe('arbeitet');
    expect(promptZustand(read('2.1.273', 'plan-dialog.txt'))).toBe('dialog');
  });

  it('a lone NBSP is an empty box, NBSP plus text is not (2.1.277 draws the live box with U+00A0)', () => {
    expect(promptZustand(rahmen('❯\u00a0'))).toBe('wartet');
    expect(promptZustand(rahmen('❯\u00a0npm run verify'))).toBe('eingabe_nicht_leer');
    expect(eingabeText(rahmen('❯\u00a0npm run verify'))).toBe('npm run verify');
    expect(eingabeText(rahmen('❯\u00a0'))).toBeUndefined();
  });

  it('the LAST prompt line decides — the transcript above keeps the earlier prompts', () => {
    expect(promptZustand(rahmen('❯ '))).toBe('wartet');
    expect(promptZustand(rahmen('❯ ja, leg den Entwurf an'))).toBe('eingabe_nicht_leer');
    // the regression this fixes: an empty line in the transcript used to be enough for „idle"
    expect(promptZustand(rahmen('❯ ja, leg den Entwurf an', '❯ \n⏺ Antwort.\n'))).toBe('eingabe_nicht_leer');
  });

  it('a dialog outranks a spinner, and a spinner outranks a filled box', () => {
    expect(promptZustand('  Do you want to proceed?\n✳ Enchanting… (4s · ↓ 204 tokens)\n❯ 1. Yes\n')).toBe('dialog');
    expect(promptZustand(rahmen('❯ npm run verify', '✳ Enchanting… (4s · ↓ 204 tokens)\n'))).toBe('arbeitet');
  });

  it('no prompt line at all → arbeitet (fail closed, unchanged)', () => {
    expect(promptZustand('⏺ Fertig.\n  ⏵⏵ bypass permissions on\n')).toBe('arbeitet');
  });

  it('isIdlePrompt stays the thin wrapper for every recorded screen (equivalence guard)', () => {
    for (const v of versions) {
      for (const f of readdirSync(resolve(FIXTURES, v))) {
        const screen = read(v, f);
        expect(isIdlePrompt(screen), `${v}/${f}`).toBe(promptZustand(screen) === 'wartet');
      }
    }
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
