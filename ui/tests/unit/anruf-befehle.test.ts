/**
 * INT-2026-025 (D11; FA-20, FA-21, FA-22, Spec §4 „ja, aber …"): Befehlswörter
 * nur als ganzer Text; Möglichkeiten per Nummer, Zahlwort, Wortlaut.
 */
import { describe, it, expect } from 'vitest';
import { deuteSprache, waehleMoeglichkeit } from '../../src/shared/anruf-befehle.js';

describe('deuteSprache', () => {
  it.each([
    ['Senden.', 'senden'],
    ['senden', 'senden'],
    ['Verwerfen!', 'verwerfen'],
    ['nochmal', 'nochmal'],
    ['Noch mal.', 'nochmal'],
    ['Nochmal sprechen', 'nochmal'],
    ['Freigeben', 'freigeben'],
    ['Frei geben.', 'freigeben'],
  ] as const)('antwort: %s → %s', (text, erwartet) => {
    expect(deuteSprache(text, 'antwort')).toBe(erwartet);
  });

  it('Befehlswort im Satz bleibt Text', () => {
    expect(deuteSprache('Bitte senden wir das morgen', 'antwort')).toBe('text');
    expect(deuteSprache('ja', 'antwort')).toBe('text');
  });

  it('nachfrage: nur ja/nein; „ja, aber …" ist Text', () => {
    expect(deuteSprache('Ja.', 'nachfrage')).toBe('ja');
    expect(deuteSprache('Nein', 'nachfrage')).toBe('nein');
    expect(deuteSprache('ja, aber mach X', 'nachfrage')).toBe('text');
    expect(deuteSprache('freigeben', 'nachfrage')).toBe('text');
    expect(deuteSprache('', 'nachfrage')).toBe('text');
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
