/**
 * INT-2026-025 (D11; FA-20, FA-21, FA-22, Spec §4 „ja, aber …"): Befehlswörter
 * nur als ganzer Text; Möglichkeiten per Nummer, Zahlwort, Wortlaut.
 * INT-2026-026 (D1; FA-05–FA-08, FA-12, FA-13): Schlusswort „Antwort senden"
 * am Ende, „senden"/„verwerfen" kein Einzelwort mehr, „auflegen" neu.
 */
import { describe, it, expect } from 'vitest';
import { deuteSprache, pruefeSchluss, waehleMoeglichkeit } from '../../src/shared/anruf-befehle.js';

describe('deuteSprache', () => {
  it.each([
    ['nochmal', 'nochmal'],
    ['Noch mal.', 'nochmal'],
    ['Nochmals', 'nochmal'],
    ['Freigeben', 'freigeben'],
    ['Frei geben.', 'freigeben'],
    ['Auflegen.', 'auflegen'],
    ['auf legen', 'auflegen'],
  ] as const)('antwort: %s → %s', (text, erwartet) => {
    expect(deuteSprache(text, 'antwort')).toBe(erwartet);
  });

  it('„senden" und „verwerfen" sind kein Einzelwort mehr (B-01)', () => {
    expect(deuteSprache('Senden.', 'antwort')).toBe('text');
    expect(deuteSprache('absenden', 'antwort')).toBe('text');
    expect(deuteSprache('Verwerfen!', 'antwort')).toBe('text');
  });

  it('Befehlswort im Satz bleibt Text (FA-13)', () => {
    expect(deuteSprache('Bitte senden wir das morgen', 'antwort')).toBe('text');
    expect(deuteSprache('Das war es. Auflegen', 'antwort')).toBe('text');
    expect(deuteSprache('ja', 'antwort')).toBe('text');
  });

  it('nachfrage: ja/nein/auflegen/nochmal; „ja, aber …" ist Text', () => {
    expect(deuteSprache('Ja.', 'nachfrage')).toBe('ja');
    expect(deuteSprache('Nein', 'nachfrage')).toBe('nein');
    expect(deuteSprache('Auflegen', 'nachfrage')).toBe('auflegen');
    expect(deuteSprache('Nochmal', 'nachfrage')).toBe('nochmal');
    expect(deuteSprache('ja, aber mach X', 'nachfrage')).toBe('text');
    expect(deuteSprache('freigeben', 'nachfrage')).toBe('text');
    expect(deuteSprache('', 'nachfrage')).toBe('text');
  });
});

describe('pruefeSchluss', () => {
  it.each([
    ['Mach die Tests. Antwort senden.', 'Mach die Tests.'],
    ['Mach die Tests. Antworten senden', 'Mach die Tests.'],
    ['mach die tests antwort absenden!', 'mach die tests'],
    ['Mach die Tests, Antwort, senden.', 'Mach die Tests'],
    ['Mach die Tests – Antwort senden', 'Mach die Tests'],
    ['Mach die Tests — ANTWORT SENDEN …', 'Mach die Tests'],
    ['Die zweite. Antwort senden.', 'Die zweite.'],
    ['Antwort senden.', ''],
    ['  antwort senden  ', ''],
  ] as const)('senden: %s → %j', (text, rest) => {
    expect(pruefeSchluss(text)).toEqual({ art: 'senden', rest });
  });

  it('„Antwort senden" mitten im Satz → offen (FA-06, R10)', () => {
    expect(pruefeSchluss('Antwort senden und dann die Doku')).toEqual({ art: 'offen' });
    expect(pruefeSchluss('Die Antwort senden wir morgen.')).toEqual({ art: 'offen' });
    expect(pruefeSchluss('Das kannst du jetzt senden, und danach noch die Doku')).toEqual({ art: 'offen' });
  });

  it('inneres Schlusswort bleibt im Rest, wenn am Ende noch eins steht (FA-06)', () => {
    expect(pruefeSchluss('Antwort senden und dann die Doku. Antwort senden.')).toEqual({ art: 'senden', rest: 'Antwort senden und dann die Doku.' });
  });

  it('Wort nur als Teil eines anderen Worts zählt nicht', () => {
    expect(pruefeSchluss('Mach die Gegenantwort senden')).toEqual({ art: 'nur_senden' });
  });

  it('„senden"/„absenden" ohne „Antwort" → nur_senden (FA-07)', () => {
    expect(pruefeSchluss('Mach die Tests. Senden.')).toEqual({ art: 'nur_senden' });
    expect(pruefeSchluss('absenden')).toEqual({ art: 'nur_senden' });
  });

  it('„Antwort verwerfen" am Ende → verwerfen (FA-12)', () => {
    expect(pruefeSchluss('Ach nein, Quatsch. Antwort verwerfen.')).toEqual({ art: 'verwerfen' });
    expect(pruefeSchluss('Antworten verwerfen')).toEqual({ art: 'verwerfen' });
    expect(pruefeSchluss('verwerfen')).toEqual({ art: 'offen' });
  });

  it('sonst offen', () => {
    expect(pruefeSchluss('')).toEqual({ art: 'offen' });
    expect(pruefeSchluss('Mach die Tests.')).toEqual({ art: 'offen' });
  });
});

describe('waehleMoeglichkeit', () => {
  const opt = ['Postgres', 'SQLite', 'Grüne Wiese', 'Redis Cache'];

  it.each([
    ['2', [2]],
    ['Zwei.', [2]],
    ['Nummer zwei', [2]],
    ['die zweite', [2]],
    ['die Erste bitte', [1]],
    ['vierte', [4]],
    ['SQLite', [2]],
    ['gruene wiese', [3]],
    ['Ich nehme Postgres', [1]],
  ] as const)('einzeln: %s → %j', (text, nummern) => {
    expect(waehleMoeglichkeit(text, opt, false)).toEqual({ nummern });
  });

  it('mehrfach: alle genannten Nummern', () => {
    expect(waehleMoeglichkeit('eins und drei', opt, true)).toEqual({ nummern: [1, 3] });
    expect(waehleMoeglichkeit('1, 3', opt, true)).toEqual({ nummern: [1, 3] });
    expect(waehleMoeglichkeit('Postgres und Redis Cache', opt, true)).toEqual({ nummern: [1, 4] });
  });

  it('einzeln mit mehreren Nummern → mehrdeutig', () => {
    expect(waehleMoeglichkeit('eins und drei', opt, false)).toEqual({ mehrdeutig: [1, 3] });
  });

  it('Wortlaut passt auf mehrere → mehrdeutig', () => {
    expect(waehleMoeglichkeit('Postgres', ['Postgres mit Prisma', 'Postgres ohne ORM', 'SQLite'], false)).toEqual({ mehrdeutig: [1, 2] });
  });

  it('nichts passt oder Nummer außerhalb → eigene Antwort (Originaltext getrimmt)', () => {
    expect(waehleMoeglichkeit('  Nimm lieber MongoDB. ', opt, false)).toEqual({ eigene: 'Nimm lieber MongoDB.' });
    expect(waehleMoeglichkeit('sieben', opt, false)).toEqual({ eigene: 'sieben' });
    expect(waehleMoeglichkeit('die', opt, false)).toEqual({ eigene: 'die' });
  });
});
