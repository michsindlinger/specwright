/**
 * Vorlesetext des Anrufmodus (INT-2026-025, D7; FA-13, FA-15, FA-16, FA-17).
 * Sprechfassung finden, für das Vorlesen bereinigen, auf 80 Wörter kürzen,
 * Rückfragen als Satzfolge. Rein, ohne IO — von Backend und Tests genutzt.
 */

import { ANRUF_MAX_WOERTER, type AnrufFrage, type AnrufInhalt, type AnrufVorlesetext } from './types/anruf.protocol.js';

const SPRECHFASSUNG_PRAEFIX = /^\s*(?:\*\*|__)?\s*Sprechfassung\s*(?::\s*(?:\*\*|__)?|(?:\*\*|__)\s*:)\s*/i;

/** Absätze (durch Leerzeilen getrennt), ohne vorangestellte Trennlinien `---`. */
function absaetze(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((a) => a.replace(/^(?:\s*(?:-{3,}|\*{3,}|_{3,})\s*\n)+/, '').trim())
    .filter((a) => a.length > 0);
}

/**
 * Text des Absatzes, der mit `Sprechfassung:` beginnt (auch fett), ohne das
 * Präfix; `letzte` (Standard, Antworten) oder `erste` (Plan: steht vorn).
 * Keiner oder leer → null.
 */
export function sprechfassungAus(text: string, wahl: 'letzte' | 'erste' = 'letzte'): string | null {
  const treffer = absaetze(text).filter((a) => SPRECHFASSUNG_PRAEFIX.test(a));
  const absatz = wahl === 'erste' ? treffer[0] : treffer[treffer.length - 1];
  if (absatz === undefined) return null;
  const rest = absatz.replace(SPRECHFASSUNG_PRAEFIX, '').replace(/\s+/g, ' ').trim();
  return rest.length > 0 ? rest : null;
}

// Emojis samt Verbindern/Varianten, Box- und Blockzeichen.
const EMOJI = /\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|‍|️|⃣/gu;
const BOX = /[─-▟■-◿]/g;
const DATEI_ENDUNG = /\w\.[a-z]{1,5}\b/;
const ABKUERZUNG = /^(?:[a-zäöü]\.){2,}$/i;

/** Platzhalter für einen Dateinamen im Vorlesetext (Entscheidung Michael, 27.09.). */
const EINE_DATEI = 'eine Datei';
// Nur bekannte Endungen werden „eine Datei" (`anruf.state` ist kein Dateiname); der Rest fällt weg wie bisher.
const BEKANNTE_ENDUNG =
  /\w\.(?:ts|tsx|js|mjs|cjs|jsx|json|md|txt|sh|py|css|scss|html|yml|yaml|toml|lock|env|sql|go|rs|java|kt|swift|rb|php|vue|svelte|png|jpe?g|svg|gif|pdf|csv|tsv|xml|log|ini|conf|docx|pptx|xlsx)$/;
const NUR_DATEINAME = /^[\w./\\-]+$/;

/**
 * Ein Wort, das eine Pfad- oder Dateiangabe ist (Satzzeichen am Ende bleiben):
 * Dateiname mit bekannter Endung → „eine Datei", sonstige Pfade → weg.
 */
function ohnePfad(token: string): string {
  const ende = /[.,;:!?)»"”]+$/.exec(token)?.[0] ?? '';
  const kern = token.slice(0, token.length - ende.length);
  if (kern.length === 0 || ABKUERZUNG.test(token)) return token;
  if (BEKANNTE_ENDUNG.test(kern)) return EINE_DATEI + ende;
  if (kern.includes('/') || kern.includes('\\') || DATEI_ENDUNG.test(kern)) {
    // Satzende erhalten, Komma & Co. fallen mit dem Wort weg.
    return /[.!?]/.test(ende) ? ende.replace(/[^.!?]/g, '').slice(-1) : '';
  }
  return token;
}

/** Glättet die Sätze um „eine Datei": Doppelungen, Aufzählungen, Dativ nach Präposition. */
function glaetteDatei(t: string): string {
  return t
    .replace(/\bDatei(?:\s+namens)?\s+eine Datei\b/g, 'Datei')
    .replace(/\beine Datei(?:(?:,|\s+und|\s+oder)\s+eine Datei)+/g, 'mehrere Dateien')
    .replace(/\b(in|aus|von|mit|bei|nach|zu)\s+eine Datei\b/gi, '$1 einer Datei')
    .replace(/\b(in|aus|von|mit|bei|nach|zu)\s+mehrere Dateien\b/gi, '$1 mehreren Dateien');
}

/**
 * Für das Vorlesen bereinigen (FA-15): Codeblöcke, Inline-Code, URLs,
 * Tabellenzeilen, Ordnerpfade, Emojis und Box-Zeichen weg; Dateinamen → „eine Datei“;
 * Markdown-Links → Linktext; Überschriften-/Listen-/Zitatzeichen weg;
 * Whitespace auf ein Leerzeichen.
 */
export function bereinige(text: string): string {
  let t = text.replace(/\r\n?/g, '\n');
  t = t.replace(/(^|\n)\s*(```|~~~)[^\n]*\n[\s\S]*?(?:(?<=\n)[ \t]*\2[^\n]*|$)/g, '$1');
  t = t.replace(/`([^`\n]*)`/g, (_m, inhalt: string) => (NUR_DATEINAME.test(inhalt) && BEKANNTE_ENDUNG.test(inhalt) ? EINE_DATEI : ''));
  t = t.replace(/!?\[([^\]\n]*)\]\([^)\n]*\)/g, '$1');
  t = t.replace(/<(?:https?:\/\/|mailto:)[^>\s]*>/gi, '');
  t = t.replace(/\b(?:https?:\/\/|www\.)\S+/gi, '');

  const zeilen: string[] = [];
  for (const roh of t.split('\n')) {
    let z = roh.trim();
    if (z.length === 0) continue;
    if (/^\|.*\|$/.test(z) || /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(z)) continue;
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(z)) continue;
    const ueberschrift = /^#{1,6}\s+/.test(z);
    z = z.replace(/^#{1,6}\s+/, '').replace(/^(?:>\s*)+/, '').replace(/^(?:[-*+•]|\d+[.)])\s+/, '').replace(/^\[[ xX]\]\s+/, '');
    if (ueberschrift && z.length > 0 && !/[.!?:]$/.test(z)) z += '.';
    zeilen.push(z);
  }
  t = zeilen.join(' ');

  t = t.replace(/\*\*|__/g, '').replace(/(^|\s)\*(\S[^*]*?)\*(?=\s|[.,;:!?]|$)/g, '$1$2');
  t = t.replace(EMOJI, ' ').replace(BOX, ' ').replace(/[→←↑↓⇒⇐]/g, ' ');
  t = t
    .split(/\s+/)
    .map(ohnePfad)
    .filter((w) => w.length > 0)
    .join(' ');
  t = glaetteDatei(t);
  t = t.replace(/\s+([.,;:!?])/g, '$1').replace(/([,;:])(?=[.!?])/g, '').replace(/\(\s*\)/g, '');
  t = t.replace(/^[.,;:!?\s]+/, '');
  return t.replace(/\s+/g, ' ').trim();
}

function woerter(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

/** Wortzahl wie beim Kürzen. */
export function wortzahl(text: string): number {
  return woerter(text).length;
}

const SATZENDE = /[.!?…]["»«”“')]?$/;

/**
 * Höchstens `max` Wörter (FA-15): am letzten Satzende innerhalb der Grenze,
 * sonst harte Wortgrenze mit „…". `gekuerzt` sagt, ob etwas wegfiel.
 */
export function kuerze(text: string, max: number = ANRUF_MAX_WOERTER): { text: string; gekuerzt: boolean } {
  const w = woerter(text);
  if (w.length <= max) return { text: w.join(' '), gekuerzt: false };
  const vorn = w.slice(0, max);
  for (let i = vorn.length - 1; i >= 0; i--) {
    if (SATZENDE.test(vorn[i] ?? '')) return { text: vorn.slice(0, i + 1).join(' '), gekuerzt: true };
  }
  return { text: `${vorn.join(' ')} …`, gekuerzt: true };
}

/** Die ersten zwei Sätze, bereinigt (FA-17). */
export function ersteZweiSaetze(text: string): string {
  const w = woerter(bereinige(text));
  let saetze = 0;
  for (let i = 0; i < w.length; i++) {
    if (SATZENDE.test(w[i] ?? '') && ++saetze === 2) return w.slice(0, i + 1).join(' ');
  }
  return w.join(' ');
}

const ZAHLWOERTER = ['Null', 'Eins', 'Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs', 'Sieben', 'Acht', 'Neun', 'Zehn', 'Elf', 'Zwölf'];

/** Deutsches Zahlwort (1–12), darüber Ziffern. */
export function zahlwort(n: number): string {
  return ZAHLWOERTER[n] ?? String(n);
}

function ohneEndzeichen(text: string): string {
  return text.replace(/[\s.,;:!?]+$/, '');
}

/**
 * Rückfrage als Satzfolge (FA-13, FA-16): „Frage: … Eins: … Zwei: … Oder eine
 * eigene Antwort." Über `max` Wörtern: Möglichkeiten bis zur Grenze plus
 * „und n weitere, auf dem Bildschirm". Nur die Beschriftungen, nie Beschreibungen.
 */
export function frageVorlesen(frage: AnrufFrage, max: number = ANRUF_MAX_WOERTER): { text: string; gekuerzt: boolean } {
  let f = bereinige(frage.frage);
  if (f.length > 0 && !/[.!?]$/.test(f)) f += '?';
  const kopf = `Frage: ${f}`;
  const moeglichkeiten = frage.optionen.map((o, i) => `${zahlwort(i + 1)}: ${ohneEndzeichen(bereinige(o))}.`);
  const schluss = 'Oder eine eigene Antwort.';
  const voll = [kopf, ...moeglichkeiten, schluss].join(' ');
  if (wortzahl(voll) <= max) return { text: voll, gekuerzt: false };

  // Platz für „…, und n weitere, auf dem Bildschirm. Oder eine eigene Antwort."
  const rest = (n: number): string => `und ${n} weitere, auf dem Bildschirm.`;
  const reserve = wortzahl(rest(frage.optionen.length)) + wortzahl(schluss);
  const kopfKurz = kuerze(kopf, Math.max(1, max - reserve));
  let genutzt = wortzahl(kopfKurz.text) + reserve;
  const drin: string[] = [];
  for (const m of moeglichkeiten) {
    const n = wortzahl(m);
    if (genutzt + n > max) break;
    drin.push(m);
    genutzt += n;
  }
  const weitere = moeglichkeiten.length - drin.length;
  const teile = [kopfKurz.text];
  if (drin.length > 0) {
    const letzte = drin.length - 1;
    drin[letzte] = `${ohneEndzeichen(drin[letzte] ?? '')}, ${rest(weitere)}`;
    teile.push(...drin);
  } else {
    teile.push(`${zahlwort(weitere)} Möglichkeiten, auf dem Bildschirm.`);
  }
  teile.push(schluss);
  return { text: teile.join(' '), gekuerzt: true };
}

/** Lesbarer Anzeigetext: unbereinigt, Whitespace normalisiert, auf 80 Wörter gekürzt. */
function anzeigeAus(text: string): string {
  return kuerze(text.replace(/\s+/g, ' ').trim()).text;
}

/**
 * Vorlesetext je Meldung (D7). fertig: Sprechfassung der letzten Antwort,
 * sonst erste zwei Sätze mit `ohneSprechfassung`; plan: Sprechfassung des
 * Plans (steht vorn), sonst erste zwei Sätze; rueckfrage: erste Frage, bei
 * mehreren mit Einleitung „n Fragen. Erste Frage: …". Kein Inhalt → undefined.
 */
export function vorlesetextFuer(
  art: 'fertig' | 'plan' | 'rueckfrage',
  inhalt: AnrufInhalt | undefined,
): AnrufVorlesetext | undefined {
  if (!inhalt) return undefined;

  if (art === 'rueckfrage') {
    const fragen = inhalt.fragen ?? [];
    const erste = fragen[0];
    if (!erste) return undefined;
    const einleitung = fragen.length > 1 ? `${zahlwort(fragen.length)} Fragen. Erste ` : '';
    const gelesen = frageVorlesen(erste, ANRUF_MAX_WOERTER - wortzahl(einleitung));
    const anzeige = [erste.frage.replace(/\s+/g, ' ').trim(), ...erste.optionen.map((o, i) => `${i + 1}. ${o.replace(/\s+/g, ' ').trim()}`)].join('\n');
    return { vorlesen: einleitung + gelesen.text, gekuerzt: gelesen.gekuerzt, ohneSprechfassung: false, anzeige };
  }

  const roh = art === 'fertig' ? inhalt.letzteAntwort : inhalt.plan;
  if (roh === undefined || roh.trim().length === 0) return undefined;
  const sf = sprechfassungAus(roh, art === 'plan' ? 'erste' : 'letzte');
  if (sf !== null) {
    const k = kuerze(bereinige(sf));
    if (k.text.length > 0) return { vorlesen: k.text, gekuerzt: k.gekuerzt, ohneSprechfassung: false, anzeige: anzeigeAus(sf) };
  }
  const k = kuerze(ersteZweiSaetze(roh));
  return { vorlesen: k.text, gekuerzt: k.gekuerzt, ohneSprechfassung: true, anzeige: anzeigeAus(roh) };
}
