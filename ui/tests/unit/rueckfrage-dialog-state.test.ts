/**
 * INT-2026-025 (Plan §4 #11): parseRueckfrageDialog against the screens
 * recorded with Claude Code 2.1.283 (tests/fixtures/tui/2.1.283/) and
 * synthetic edge cases that must fail closed.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseRueckfrageDialog, parseTabZeile } from '../../src/server/utils/rueckfrage-dialog-state.js';

const FIXTURES = resolve(process.cwd(), 'tests', 'fixtures', 'tui', '2.1.283');
const read = (file: string): string => readFileSync(resolve(FIXTURES, `${file}.txt`), 'utf8');
const parse = (file: string) => parseRueckfrageDialog(read(file));

const FARBEN = ['Rot', 'Blau', 'Gruen'];

describe('parseRueckfrageDialog on recorded 2.1.283 screens', () => {
  it('einzelfrage: single question, single tab, focus on 1', () => {
    expect(parse('einzelfrage')).toEqual({
      tabs: [{ titel: 'Farbe', beantwortet: false }],
      aktiverTab: 0,
      frage: 'Welche Farbe soll der Knopf haben?',
      optionen: [
        { nr: 1, text: 'Rot' },
        { nr: 2, text: 'Blau' },
        { nr: 3, text: 'Gruen' },
        { nr: 4, text: 'Type something.' },
      ],
      mehrfach: false,
      eigeneNr: 4,
      eigeneText: null,
      fokusNr: 1,
      fokusAufSubmit: false,
      pruefseite: false,
    });
  });

  it('einzelfrage-beantwortet: dialog gone → null', () => {
    expect(parse('einzelfrage-beantwortet')).toBeNull();
  });

  it('mehrfach-einzig: checkboxes, Submit tab excluded, nothing ticked', () => {
    const d = parse('mehrfach-einzig');
    expect(d).not.toBeNull();
    expect(d?.tabs).toEqual([{ titel: 'Farben', beantwortet: false }]);
    expect(d?.aktiverTab).toBe(0);
    expect(d?.frage).toBe('Welche Farben magst du?');
    expect(d?.mehrfach).toBe(true);
    expect(d?.optionen.map((o) => o.text)).toEqual([...FARBEN, 'Type something']);
    expect(d?.optionen.every((o) => o.haken === false)).toBe(true);
    expect(d?.eigeneNr).toBe(4);
    expect(d?.eigeneText).toBeNull();
    expect(d?.fokusNr).toBe(1);
    expect(d?.fokusAufSubmit).toBe(false);
  });

  it('mehrfach-einzig-haken: ticks on 1 and 3, tab answered, cursor stays on 1', () => {
    const d = parse('mehrfach-einzig-haken');
    expect(d?.tabs).toEqual([{ titel: 'Farben', beantwortet: true }]);
    expect(d?.optionen.map((o) => o.haken)).toEqual([true, false, true, false]);
    expect(d?.fokusNr).toBe(1);
  });

  it('mehrfach-einzig-tab: review page with Submit answers / Cancel', () => {
    expect(parse('mehrfach-einzig-tab')).toEqual({
      tabs: [{ titel: 'Farben', beantwortet: true }],
      aktiverTab: null,
      frage: '',
      optionen: [],
      mehrfach: false,
      eigeneNr: null,
      eigeneText: null,
      fokusNr: 1,
      fokusAufSubmit: false,
      pruefseite: true,
      pruefseiteOptionen: [
        { nr: 1, text: 'Submit answers' },
        { nr: 2, text: 'Cancel' },
      ],
    });
  });

  it('zwei-fragen-start: two tabs, active tab not decidable, old prompt above ignored', () => {
    const d = parse('zwei-fragen-start');
    expect(d?.tabs).toEqual([
      { titel: 'Farbe', beantwortet: false },
      { titel: 'Tiere', beantwortet: false },
    ]);
    expect(d?.aktiverTab).toBeNull();
    expect(d?.frage).toBe('Welche Farbe?');
    expect(d?.mehrfach).toBe(false);
    expect(d?.optionen.map((o) => o.text)).toEqual([...FARBEN, 'Type something.']);
    expect(d?.fokusNr).toBe(1);
    expect(d?.pruefseite).toBe(false);
  });

  it('zwei-eigene-fokus: focus on the own-answer row, still empty', () => {
    const d = parse('zwei-eigene-fokus');
    expect(d?.fokusNr).toBe(4);
    expect(d?.eigeneNr).toBe(4);
    expect(d?.eigeneText).toBeNull();
  });

  it('zwei-eigene-text: typed text replaces "Type something."', () => {
    const d = parse('zwei-eigene-text');
    expect(d?.fokusNr).toBe(4);
    expect(d?.eigeneNr).toBe(4);
    expect(d?.eigeneText).toBe('Türkis, aber hell');
    expect(d?.optionen[3]).toEqual({ nr: 4, text: 'Türkis, aber hell' });
  });

  it('zwei-frage2: second (multi-select) question, first tab answered', () => {
    const d = parse('zwei-frage2');
    expect(d?.tabs).toEqual([
      { titel: 'Farbe', beantwortet: true },
      { titel: 'Tiere', beantwortet: false },
    ]);
    expect(d?.aktiverTab).toBeNull();
    expect(d?.frage).toBe('Welche Tiere?');
    expect(d?.mehrfach).toBe(true);
    expect(d?.optionen.map((o) => o.text)).toEqual(['Hund', 'Katze', 'Maus', 'Type something']);
    expect(d?.optionen.map((o) => o.haken)).toEqual([false, false, false, false]);
    expect(d?.fokusNr).toBe(1);
  });

  it('mehrfach-eigene-fokus: digit ticked the own row without focusing it', () => {
    const d = parse('mehrfach-eigene-fokus');
    expect(d?.tabs?.map((t) => t.beantwortet)).toEqual([true, true]);
    expect(d?.optionen.map((o) => o.haken)).toEqual([false, true, false, true]);
    expect(d?.eigeneNr).toBe(4);
    expect(d?.eigeneText).toBeNull();
    expect(d?.fokusNr).toBe(1);
  });

  it('mehrfach-eigene-text: typed own answer in a multi-select row', () => {
    const d = parse('mehrfach-eigene-text');
    expect(d?.mehrfach).toBe(true);
    expect(d?.optionen[3]).toEqual({ nr: 4, text: 'Igel', haken: true });
    expect(d?.eigeneText).toBe('Igel');
    expect(d?.fokusNr).toBe(4);
    expect(d?.fokusAufSubmit).toBe(false);
  });

  it('pruefseite-zwei: review page after two questions', () => {
    const d = parse('pruefseite-zwei');
    expect(d?.pruefseite).toBe(true);
    expect(d?.tabs?.map((t) => t.titel)).toEqual(['Farbe', 'Tiere']);
    expect(d?.pruefseiteOptionen).toEqual([
      { nr: 1, text: 'Submit answers' },
      { nr: 2, text: 'Cancel' },
    ]);
    expect(d?.fokusNr).toBe(1);
  });

  it('plan-dialog: not a Rückfrage dialog → null', () => {
    expect(parse('plan-dialog')).toBeNull();
  });
});

/** Synthetic single/multi question screen, built from the measured layout. */
function frage(opts: {
  kopf?: string;
  mehrfach?: boolean;
  fokus?: number | 'submit';
  eigene?: string;
  trenner?: boolean;
  footer?: boolean;
  vorher?: string[];
}): string {
  const mehrfach = opts.mehrfach ?? false;
  const fokus = opts.fokus ?? 1;
  const p = (n: number): string => (fokus === n ? '❯' : ' ');
  const box = (t: string): string => (mehrfach ? `[ ] ${t}` : t);
  const eigene = opts.eigene ?? (mehrfach ? 'Type something' : 'Type something.');
  return [
    ...(opts.vorher ?? []),
    '─'.repeat(40),
    opts.kopf ?? (mehrfach ? '←  ☐ Farben  ✔ Submit  →' : ' ☐ Farbe'),
    'Welche Farbe',
    'soll es sein?',
    `${p(1)} 1. ${box('Rot')}`,
    '     Warm',
    `${p(2)} 2. ${box('Blau')}`,
    '     Kühl',
    `${p(3)} 3. ${box(eigene)}`,
    ...(mehrfach ? [`${fokus === 'submit' ? '❯' : ' '}    Submit`] : []),
    ...(opts.trenner === false ? [] : ['─'.repeat(40)]),
    '  4. Chat about this',
    ...(opts.footer === false ? [] : ['Enter to select · ↑/↓ to navigate · Esc to cancel']),
    '',
  ].join('\n');
}

describe('parseRueckfrageDialog synthetic edge cases', () => {
  it('wrapped question lines are joined; "Chat about this" is no option', () => {
    const d = parseRueckfrageDialog(frage({}));
    expect(d?.frage).toBe('Welche Farbe soll es sein?');
    expect(d?.optionen.map((o) => o.nr)).toEqual([1, 2, 3]);
    expect(d?.eigeneNr).toBe(3);
  });

  it('focus on Submit → fokusNr null, fokusAufSubmit true', () => {
    const d = parseRueckfrageDialog(frage({ mehrfach: true, fokus: 'submit' }));
    expect(d?.fokusAufSubmit).toBe(true);
    expect(d?.fokusNr).toBeNull();
  });

  it('missing separator → null', () => {
    expect(parseRueckfrageDialog(frage({ trenner: false }))).toBeNull();
  });

  it('missing footer → null', () => {
    expect(parseRueckfrageDialog(frage({ footer: false }))).toBeNull();
  });

  it('missing tab header → null', () => {
    expect(parseRueckfrageDialog(frage({ kopf: 'Irgendein Text' }))).toBeNull();
  });

  it('no focus → null', () => {
    expect(parseRueckfrageDialog(frage({ fokus: 9 }))).toBeNull();
  });

  it('two focus marks → null', () => {
    const screen = frage({}).replace('  2. Blau', '❯ 2. Blau');
    expect(parseRueckfrageDialog(screen)).toBeNull();
  });

  it('checkboxes on some options only → null', () => {
    const screen = frage({ mehrfach: true }).replace('[ ] Blau', 'Blau');
    expect(parseRueckfrageDialog(screen)).toBeNull();
  });

  it('multi-select without Submit row → null', () => {
    const screen = frage({ mehrfach: true }).replace(/\n\s+Submit\n/, '\n');
    expect(parseRueckfrageDialog(screen)).toBeNull();
  });

  it('gap in option numbers → null', () => {
    const screen = frage({}).replace('  2. Blau', '  5. Blau');
    expect(parseRueckfrageDialog(screen)).toBeNull();
  });

  it('an older answered dialog above does not leak into the result', () => {
    const alt = frage({ kopf: ' ☒ Alt' }).split('\n').slice(0, -3);
    const d = parseRueckfrageDialog(frage({ vorher: [...alt, '⏺ User answered Claude\'s questions:'] }));
    expect(d?.tabs).toEqual([{ titel: 'Farbe', beantwortet: false }]);
  });

  it('raw PTY escapes are stripped', () => {
    const screen = frage({}).replace('Rot', '\x1b[1mRot\x1b[22m');
    expect(parseRueckfrageDialog(screen)?.optionen[0].text).toBe('Rot');
  });

  it('review page without the header above → null', () => {
    const screen = ['Review your answers', 'Ready to submit your answers?', '❯ 1. Submit answers', '  2. Cancel'].join('\n');
    expect(parseRueckfrageDialog(screen)).toBeNull();
  });

  it('review page without focus → null', () => {
    const screen = [' ☒ Farbe', 'Review your answers', 'Ready to submit your answers?', '  1. Submit answers', '  2. Cancel'].join('\n');
    expect(parseRueckfrageDialog(screen)).toBeNull();
  });

  it('empty screen → null', () => {
    expect(parseRueckfrageDialog('')).toBeNull();
  });
});

describe('parseTabZeile', () => {
  it('reads titles with spaces and ignores the Submit tab', () => {
    expect(parseTabZeile('←  ☒ Auth method  ☐ Tiere  ✔ Submit  →')).toEqual([
      { titel: 'Auth method', beantwortet: true },
      { titel: 'Tiere', beantwortet: false },
    ]);
  });

  it('rejects prose and a Submit tab that is not last', () => {
    expect(parseTabZeile('Welche Farbe?')).toBeNull();
    expect(parseTabZeile('←  ✔ Submit  ☐ Farbe  →')).toBeNull();
    expect(parseTabZeile('Text mit ☐ mitten drin')).toBeNull();
  });
});
