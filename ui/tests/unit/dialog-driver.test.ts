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
import { cueToBlockKind, findDialogCue } from '../../src/server/services/dialog-driver.js';

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

describe('cueToBlockKind', () => {
  it('maps every cue kind to a block kind; trust has none of its own', () => {
    expect(cueToBlockKind('plan')).toBe('plan');
    expect(cueToBlockKind('rueckfrage')).toBe('rueckfrage');
    expect(cueToBlockKind('berechtigung')).toBe('berechtigung');
    expect(cueToBlockKind('trust')).toBe('unbekannt');
  });
});
