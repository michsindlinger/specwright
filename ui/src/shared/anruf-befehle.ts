/**
 * Deutung gesprochener Antworten im Anrufmodus (INT-2026-025, D11;
 * INT-2026-026, D1). Einzelwort-Befehle gelten nur, wenn der ganze Text das
 * Wort ist („ja, aber …" bleibt Text); gesendet wird nur mit dem Schlusswort
 * „Antwort senden" am Ende ({@link pruefeSchluss}). Rein, ohne IO.
 */

export type AnrufBefehl = 'nochmal' | 'freigeben' | 'auflegen' | 'ja' | 'nein' | 'text';

export type AnrufWahl = { nummern: number[] } | { eigene: string } | { mehrdeutig: number[] };

/** Ergebnis der Schlusswort-Prüfung (INT-2026-026, FA-05–FA-08, FA-12). */
export type AnrufSchluss =
  | { art: 'senden'; rest: string }
  | { art: 'verwerfen' }
  | { art: 'nur_senden' }
  | { art: 'offen' };

/** Kleinschreibung, Umlaute als ae/oe/ue/ss, Satzzeichen weg, ein Leerzeichen. */
export function normalisiereSprache(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Ohne Leerzeichen verglichen: „Frei geben", „noch mal", „auf legen" zählen mit.
// „senden"/„verwerfen" als Einzelwort gibt es nicht mehr: nur das Schlusswort sendet (INT-2026-026, B-01).
const BEFEHLE_ANTWORT: Record<string, AnrufBefehl> = {
  nochmal: 'nochmal',
  nochmals: 'nochmal',
  freigeben: 'freigeben',
  auflegen: 'auflegen',
};

const BEFEHLE_NACHFRAGE: Record<string, AnrufBefehl> = { ja: 'ja', nein: 'nein', auflegen: 'auflegen', nochmal: 'nochmal', nochmals: 'nochmal' };

/**
 * Befehl oder Text. `antwort`: nochmal/freigeben/auflegen; `nachfrage`
 * (Freigabe bestätigen): ja/nein/auflegen/nochmal. Alles andere → text.
 */
export function deuteSprache(text: string, kontext: 'antwort' | 'nachfrage'): AnrufBefehl {
  const kompakt = normalisiereSprache(text).replace(/ /g, '');
  const tabelle = kontext === 'antwort' ? BEFEHLE_ANTWORT : BEFEHLE_NACHFRAGE;
  return Object.prototype.hasOwnProperty.call(tabelle, kompakt) ? (tabelle[kompakt] ?? 'text') : 'text';
}

// Satzzeichen und Leerraum zwischen und nach den Wörtern (\p{P} deckt alle Strich-Varianten).
const SCHLUSS_SENDEN = /(^|[\s\p{P}])antwort(?:en)?[\s\p{P}]*(?:ab)?senden[\s\p{P}]*$/iu;
const SCHLUSS_VERWERFEN = /(^|[\s\p{P}])antwort(?:en)?[\s\p{P}]*verwerfen[\s\p{P}]*$/iu;
const NUR_SENDEN = /(^|[\s\p{P}])(?:ab)?senden[\s\p{P}]*$/iu;
// Rechts vom Rest: Leerraum, Kommas, Doppelpunkte, Striche — der Satzpunkt bleibt.
const REST_ENDE = /[\s,;:\u2010-\u2015\u2212-]+$/u;

/**
 * Schlusswort am Ende des bisher Gesprochenen (INT-2026-026, D1):
 * „Antwort senden"/„Antwort absenden" (auch „Antworten", Satzzeichen und
 * Schreibung egal) → senden mit dem Text davor; „Antwort verwerfen" →
 * verwerfen; „senden" ohne „Antwort" → nur_senden (Hinweis, FA-07); sonst offen.
 */
export function pruefeSchluss(text: string): AnrufSchluss {
  const senden = SCHLUSS_SENDEN.exec(text);
  if (senden) {
    const rest = text.slice(0, senden.index + (senden[1]?.length ?? 0)).replace(REST_ENDE, '').trim();
    return { art: 'senden', rest };
  }
  if (SCHLUSS_VERWERFEN.test(text)) return { art: 'verwerfen' };
  if (NUR_SENDEN.test(text)) return { art: 'nur_senden' };
  return { art: 'offen' };
}

const GRUNDZAHLEN: Record<string, number> = {
  eins: 1, ein: 1, eine: 1, zwei: 2, zwo: 2, drei: 3, vier: 4, fuenf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9,
};
const ORDNUNGSZAHLEN: Record<string, number> = {
  erst: 1, zweit: 2, dritt: 3, viert: 4, fuenft: 5, sechst: 6, siebt: 7, siebent: 7, acht: 8, neunt: 9,
};
// Füllwörter, die neben Nummern stehen dürfen („Nummer zwei", „die zweite", „eins und drei").
const FUELLWOERTER = new Set([
  'nummer', 'nr', 'die', 'der', 'das', 'den', 'option', 'moeglichkeit', 'antwort', 'und', 'sowie', 'plus', 'auch',
  'bitte', 'ich', 'nehme', 'waehle', 'will', 'moechte', 'haette', 'gerne', 'gern', 'mit', 'oder', 'dann',
]);

function nummerAus(wort: string): number | undefined {
  if (/^\d+$/.test(wort)) return Number(wort);
  const grund = GRUNDZAHLEN[wort];
  if (grund !== undefined) return grund;
  const ordnung = /^(.+?)e[nrsm]?$/.exec(wort)?.[1];
  return ordnung !== undefined ? ORDNUNGSZAHLEN[ordnung] : undefined;
}

/** Nur Nummern und Füllwörter → die Nummern; sonst undefined. */
function nummernAus(woerter: string[]): number[] | undefined {
  const nummern: number[] = [];
  for (const w of woerter) {
    const n = nummerAus(w);
    if (n !== undefined) nummern.push(n);
    else if (!FUELLWOERTER.has(w)) return undefined;
  }
  return nummern.length > 0 ? nummern : undefined;
}

function sortiertEindeutig(nummern: number[]): number[] {
  return [...new Set(nummern)].sort((a, b) => a - b);
}

/**
 * Welche Möglichkeit(en) gemeint sind (FA-21): Ziffern, Zahl- und
 * Ordnungswörter, „Nummer zwei", Wortlaut einer Möglichkeit (normalisiert).
 * Mehrfach: alle genannten Nummern; einzeln mit mehreren Nummern oder
 * Wortlaut passt auf mehrere → mehrdeutig; sonst eigene Antwort.
 */
export function waehleMoeglichkeit(text: string, optionen: string[], mehrfach: boolean): AnrufWahl {
  const eigene: AnrufWahl = { eigene: text.trim() };
  const norm = normalisiereSprache(text);
  if (norm.length === 0) return eigene;
  const optNorm = optionen.map(normalisiereSprache);

  // 1. Genau der Wortlaut einer Möglichkeit.
  const gleich = optNorm.flatMap((o, i) => (o.length > 0 && o === norm ? [i + 1] : []));
  if (gleich.length === 1) return { nummern: gleich };
  if (gleich.length > 1) return { mehrdeutig: gleich };

  // 2. Nummern.
  const woerter = norm.split(' ');
  const nummern = nummernAus(woerter);
  if (nummern !== undefined) {
    const liste = sortiertEindeutig(nummern);
    if (liste.every((n) => n >= 1 && n <= optionen.length)) {
      if (liste.length === 1 || mehrfach) return { nummern: liste };
      return { mehrdeutig: liste };
    }
  }

  // 3. Wortlaut im Text genannt oder Teil einer Möglichkeit.
  if (woerter.every((w) => FUELLWOERTER.has(w))) return eigene;
  const imText = optNorm.flatMap((o, i) => (o.length > 0 && ` ${norm} `.includes(` ${o} `) ? [i + 1] : []));
  if (imText.length === 1 || (imText.length > 1 && mehrfach)) return { nummern: imText };
  if (imText.length > 1) return { mehrdeutig: imText };
  const teil = optNorm.flatMap((o, i) => (` ${o} `.includes(` ${norm} `) ? [i + 1] : []));
  if (teil.length === 1) return { nummern: teil };
  if (teil.length > 1) return { mehrdeutig: teil };
  return eigene;
}
