/**
 * INT-2026-025 (D7; FA-13, FA-15, FA-16, FA-17): Sprechfassung finden,
 * bereinigen, auf 80 Wörter kürzen, Rückfragen vorlesen.
 */
import { describe, it, expect } from 'vitest';
import {
  bereinige,
  ersteZweiSaetze,
  frageVorlesen,
  kuerze,
  sprechfassungAus,
  vorlesetextFuer,
  wortzahl,
} from '../../src/shared/anruf-text.js';
import type { AnrufFrage } from '../../src/shared/types/anruf.protocol.js';

const satz = (n: number, wort = 'Wort'): string => `${Array.from({ length: n - 1 }, () => wort).join(' ')} Ende.`;

describe('sprechfassungAus', () => {
  it('nimmt den letzten Absatz mit Präfix, ohne Präfix', () => {
    const text = 'Erledigt.\n\nSprechfassung: alt.\n\nMehr Text.\n\n---\nSprechfassung: Ich habe den Test repariert. Bitte prüfen.';
    expect(sprechfassungAus(text)).toBe('Ich habe den Test repariert. Bitte prüfen.');
  });

  it('erkennt fettes Präfix in beiden Schreibweisen', () => {
    expect(sprechfassungAus('A\n\n**Sprechfassung:** Fertig gebaut.')).toBe('Fertig gebaut.');
    expect(sprechfassungAus('A\n\n**Sprechfassung**: Fertig gebaut.')).toBe('Fertig gebaut.');
  });

  it('fasst Zeilen eines Absatzes zusammen', () => {
    expect(sprechfassungAus('Sprechfassung: Zeile eins\nZeile zwei.')).toBe('Zeile eins Zeile zwei.');
  });

  it('ohne Absatz mit Präfix → null; Präfix mitten im Satz zählt nicht', () => {
    expect(sprechfassungAus('Keine Sprechfassung: hier nicht.')).toBeNull();
    expect(sprechfassungAus('Nur Text.')).toBeNull();
    expect(sprechfassungAus('Sprechfassung:   ')).toBeNull();
  });

  it('wahl erste nimmt den ersten Treffer', () => {
    expect(sprechfassungAus('Sprechfassung: vorn.\n\nPlan.\n\nSprechfassung: hinten.', 'erste')).toBe('vorn.');
  });
});

describe('bereinige (FA-15)', () => {
  it('entfernt Codeblöcke, Inline-Code, Pfade, Tabellen und URLs; Links behalten den Text', () => {
    const text = [
      '## Ergebnis',
      'Ich habe `foo()` in src/server/app.ts geändert, siehe [die Doku](https://example.com/x).',
      '```ts',
      'const a = 1;',
      '```',
      '| Spalte | Wert |',
      '|---|---|',
      '| a | b |',
      '- Tests laufen unter https://ci.example.com/run/1 grün 🎉',
      'Datei package.json angepasst.',
    ].join('\n');
    const b = bereinige(text);
    expect(b).not.toMatch(/```|const a|foo\(\)|src\/|app\.ts|\||https?:|example|package\.json|🎉|##/);
    expect(b).toContain('die Doku');
    expect(b).toBe('Ergebnis. Ich habe in einer Datei geändert, siehe die Doku. Tests laufen unter grün Datei angepasst.');
  });

  it('entfernt Listenzeichen, Fett und Box-Zeichen, normalisiert Whitespace', () => {
    expect(bereinige('1. **Erstens**   gut\n* Zweitens ── ok ✅')).toBe('Erstens gut Zweitens ok');
  });

  it('lässt Abkürzungen und Zahlen stehen', () => {
    expect(bereinige('Das ist z.B. Version 4.0.0 fertig.')).toBe('Das ist z.B. Version 4.0.0 fertig.');
  });

  it('erhält das Satzende eines ersetzten oder entfernten Pfads', () => {
    expect(bereinige('Geändert in ui/src/a.ts. Weiter.')).toBe('Geändert in einer Datei. Weiter.');
    expect(bereinige('Liegt unter intent/INT-2026-025/. Weiter.')).toBe('Liegt unter. Weiter.');
  });

  it('Dateinamen werden „eine Datei" (O2, 27.09.), ohne Doppelung', () => {
    expect(bereinige('Ich lege gleich eine Datei namens hallo.txt an.')).toBe('Ich lege gleich eine Datei an.');
    expect(bereinige('Ich habe `hallo.txt` angelegt.')).toBe('Ich habe eine Datei angelegt.');
    expect(bereinige('Die Datei `README.md` ist aktuell.')).toBe('Die Datei ist aktuell.');
    expect(bereinige('Geändert: a.ts, b.ts und c.json.')).toBe('Geändert: mehrere Dateien.');
    expect(bereinige('Fehler in a.ts und b.ts behoben.')).toBe('Fehler in mehreren Dateien behoben.');
  });

  it('kein Dateiname ohne bekannte Endung: `anruf.state` und Ordner fallen weg', () => {
    expect(bereinige('Nachricht `anruf.state` geht raus.')).toBe('Nachricht geht raus.');
    expect(bereinige('Nachricht anruf.state geht raus.')).toBe('Nachricht geht raus.');
  });
});

describe('kuerze (FA-15)', () => {
  it('bis 80 Wörter unverändert', () => {
    const t = satz(80);
    expect(kuerze(t)).toEqual({ text: t, gekuerzt: false });
  });

  it('kürzt am letzten Satzende vor der Grenze', () => {
    const t = `${satz(50)} ${satz(40)}`;
    const k = kuerze(t, 80);
    expect(k.gekuerzt).toBe(true);
    expect(wortzahl(k.text)).toBe(50);
    expect(k.text.endsWith('Ende.')).toBe(true);
  });

  it('ohne Satzende: harte Wortgrenze', () => {
    const k = kuerze(Array.from({ length: 100 }, () => 'wort').join(' '), 80);
    expect(k.gekuerzt).toBe(true);
    expect(wortzahl(k.text.replace(' …', ''))).toBe(80);
  });
});

describe('ersteZweiSaetze (FA-17)', () => {
  it('zwei Sätze, bereinigt', () => {
    expect(ersteZweiSaetze('Erster Satz in `x.ts`. Zweiter Satz! Dritter Satz.')).toBe('Erster Satz in einer Datei. Zweiter Satz!');
  });
  it('weniger als zwei Sätze → alles', () => {
    expect(ersteZweiSaetze('Nur einer')).toBe('Nur einer');
  });
});

describe('frageVorlesen (FA-13, FA-16)', () => {
  it('Frage mit nummerierten Möglichkeiten als Zahlwort', () => {
    const f: AnrufFrage = { frage: 'Welche Datenbank?', optionen: ['Postgres', 'SQLite.'], mehrfach: false };
    expect(frageVorlesen(f)).toEqual({
      text: 'Frage: Welche Datenbank? Eins: Postgres. Zwei: SQLite. Oder eine eigene Antwort.',
      gekuerzt: false,
    });
  });

  it('über 80 Wörtern: Möglichkeiten bis zur Grenze plus „und n weitere, auf dem Bildschirm"', () => {
    const lang = Array.from({ length: 25 }, () => 'lang').join(' ');
    const f: AnrufFrage = { frage: 'Welcher Weg?', optionen: [lang, lang, lang, lang, lang], mehrfach: false };
    const r = frageVorlesen(f);
    expect(r.gekuerzt).toBe(true);
    expect(wortzahl(r.text)).toBeLessThanOrEqual(80);
    expect(r.text).toContain('Zwei:');
    expect(r.text).not.toContain('Drei:');
    expect(r.text).toContain('und 3 weitere, auf dem Bildschirm.');
  });
});

describe('vorlesetextFuer', () => {
  it('kein Inhalt → undefined', () => {
    expect(vorlesetextFuer('fertig', undefined)).toBeUndefined();
    expect(vorlesetextFuer('fertig', {})).toBeUndefined();
    expect(vorlesetextFuer('rueckfrage', { fragen: [] })).toBeUndefined();
  });

  it('fertig mit Sprechfassung', () => {
    const v = vorlesetextFuer('fertig', { letzteAntwort: 'Details …\n\nSprechfassung: Fertig mit `x`. Bitte testen.' });
    expect(v).toEqual({ vorlesen: 'Fertig mit. Bitte testen.', gekuerzt: false, ohneSprechfassung: false, anzeige: 'Fertig mit `x`. Bitte testen.' });
  });

  it('fertig: lange Sprechfassung wird am Satzende gekürzt, gekuerzt=true', () => {
    const v = vorlesetextFuer('fertig', { letzteAntwort: `Sprechfassung: ${satz(60)} ${satz(30)}` });
    expect(v?.gekuerzt).toBe(true);
    expect(wortzahl(v?.vorlesen ?? '')).toBe(60);
  });

  it('fertig ohne Sprechfassung: zwei Sätze und ohneSprechfassung', () => {
    const v = vorlesetextFuer('fertig', { letzteAntwort: 'Ich habe gebaut. Tests grün. Noch mehr.\n\n```\ncode\n```' });
    expect(v?.vorlesen).toBe('Ich habe gebaut. Tests grün.');
    expect(v?.ohneSprechfassung).toBe(true);
  });

  it('plan: Sprechfassung vorn', () => {
    const v = vorlesetextFuer('plan', { plan: 'Sprechfassung: Ich baue den Knopf.\n\n# Plan\n\nSchritt eins.' });
    expect(v?.vorlesen).toBe('Ich baue den Knopf.');
    expect(v?.ohneSprechfassung).toBe(false);
  });

  it('plan ohne Sprechfassung: erste zwei Sätze des Plans', () => {
    const v = vorlesetextFuer('plan', { plan: '# Knopf bauen\n\nWir bauen einen Knopf. Dann testen wir.' });
    expect(v?.vorlesen).toBe('Knopf bauen. Wir bauen einen Knopf.');
    expect(v?.ohneSprechfassung).toBe(true);
  });

  it('rueckfrage: erste Frage, bei mehreren mit Einleitung; Anzeige mit allen Möglichkeiten', () => {
    const fragen: AnrufFrage[] = [
      { frage: 'Welche Farbe?', optionen: ['Rot', 'Blau'], mehrfach: false },
      { frage: 'Welche Größe?', optionen: ['S', 'M'], mehrfach: false },
    ];
    const v = vorlesetextFuer('rueckfrage', { fragen });
    expect(v?.vorlesen).toBe('Zwei Fragen. Erste Frage: Welche Farbe? Eins: Rot. Zwei: Blau. Oder eine eigene Antwort.');
    expect(v?.anzeige).toBe('Welche Farbe?\n1. Rot\n2. Blau');
    expect(vorlesetextFuer('rueckfrage', { fragen: [fragen[0] as AnrufFrage] })?.vorlesen.startsWith('Frage: Welche Farbe?')).toBe(true);
  });
});
