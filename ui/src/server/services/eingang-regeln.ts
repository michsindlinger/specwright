/**
 * Eingang von außen — reine Regeln (INT-2026-030, Plan D2, D4).
 *
 * Berechtigung, Bereinigung des Satzes, Tab-Titel und Fingerabdruck. Keine
 * Ein-/Ausgabe, damit alles ohne Backend testbar ist. Der Dienst
 * (`eingang-service.ts`) und der Router (`eingang.routes.ts`) bauen darauf.
 */

import { createHash } from 'node:crypto';
import { istLokaleVerbindung, type LokalAnfrage } from '../utils/lokal-verbindung.js';
import { tokenMatches } from '../routes/cloud-terminal.routes.js';

/** Header, in dem ein Programm das Geheimnis mitschickt. */
export const EINGANG_TOKEN_HEADER = 'x-specwright-eingang-token';

/** Einschaltwert des Abschalters `SPECWRIGHT_EINGANG` (AN-S11). */
export const EINGANG_AN = 'on';

export const SATZ_MAX = 500;
export const TITEL_MAX = 40;

/** Antworttexte (D1). „nicht berechtigt" lautet für jede fehlende Bedingung gleich (FA-12). */
export const GRUND = {
  nichtBerechtigt: 'nicht berechtigt',
  anfrageUngueltig: 'Anfrage ungültig',
  satzLeer: 'Satz fehlt',
  satzZuLang: `Satz zu lang (max. ${SATZ_MAX})`,
  satzSlash: 'Satz darf nicht mit / beginnen',
  titelUngueltig: `Titel ungültig (1 bis ${TITEL_MAX} Zeichen)`,
  projektUnbekannt: 'Projekt unbekannt',
  opusFehlt: 'Modell Opus nicht verfügbar',
  hookNichtBereit: 'Rückmeldung der Sitzungen nicht bereit',
  offenGrenze: 'schon 3 offene Sitzungen von außen',
  fensterGrenze: 'zu viele Anfragen (5 je Minute)',
  backendStartet: 'Backend startet noch',
  keineArbeitskopie: 'Keine Arbeitskopie möglich',
  andererText: 'anderer Text angekommen',
  sitzungBeendet: 'Sitzung beendet',
  zeitueberschreitung: 'Zeitüberschreitung',
  vertrauensdialog: 'Vertrauensdialog offen — Projekt einmal in Claude bestätigen',
} as const;

export interface BerechtigungOptionen {
  /** Backend-Port (Host-Prüfung). */
  port: number;
  /** Geheimnis im Speicher; fehlt es, ist nichts berechtigt. */
  token: string | undefined;
  /** Wert von `SPECWRIGHT_EINGANG`. */
  schalter: string | undefined;
  /** Standard: `process.platform`. */
  plattform?: NodeJS.Platform;
}

function einzelwert(wert: string | string[] | undefined): string | undefined {
  if (Array.isArray(wert)) return wert.length === 1 ? wert[0] : undefined;
  return wert;
}

/**
 * D2: Abschalter + macOS → Lokal-Verbindung (Loopback, Host, keine
 * Weiterleitung) → kein `Origin` (Browser senden ihn immer) → Geheimnis in
 * konstanter Zeit. Liefert nur ja/nein, damit die Antwort nie verrät, welche
 * Prüfung scheiterte.
 */
export function istBerechtigt(req: LokalAnfrage, opts: BerechtigungOptionen): boolean {
  const plattform = opts.plattform ?? process.platform;
  if (opts.schalter !== EINGANG_AN || plattform !== 'darwin') return false;
  if (!istLokaleVerbindung(req, { port: opts.port, plattform })) return false;
  if (req.headers.origin !== undefined) return false;
  if (!opts.token) return false;
  return tokenMatches(einzelwert(req.headers[EINGANG_TOKEN_HEADER]), opts.token);
}

// CSI (ESC [ … final), OSC (ESC ] … BEL | ESC \), übrige Zwei-Byte-Escapes, C1-CSI.
/* eslint-disable no-control-regex -- Steuerzeichen zu finden ist der Zweck dieser Ausdrücke */
const ANSI_CSI = /\u001b\[[0-?]*[ -/]*[@-~]/g;
const ANSI_OSC = /\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)?/g;
const ANSI_SONST = /\u001b[@-Z\\-_]?/g;
const C1_CSI = /\u009b[0-?]*[ -/]*[@-~]/g;
const UMBRUCH = /\r\n|\r|\n|\t/g;
const STEUERZEICHEN = /[\u0000-\u001f\u007f-\u009f]/g;
/* eslint-enable no-control-regex */

const codepoints = (s: string): string[] => Array.from(s);

/**
 * B-03 / AN-S05: Escape-Sequenzen weg, Zeilenumbruch und Tab → ein
 * Leerzeichen, übrige Steuerzeichen weg, trimmen. Mehrere Leerzeichen bleiben.
 */
export function bereinige(raw: string): string {
  return raw
    .replace(ANSI_OSC, '')
    .replace(ANSI_CSI, '')
    .replace(C1_CSI, '')
    .replace(ANSI_SONST, '')
    .replace(UMBRUCH, ' ')
    .replace(STEUERZEICHEN, '')
    .trim();
}

export interface SatzErgebnis {
  /** Bereinigter Satz (auch wenn ungültig — fürs Protokoll, AN-P3). */
  satz: string;
  /** Grund, wenn ungültig. */
  grund?: string;
}

/** B-03, AN-S06, FA-14: nie kürzen, nur annehmen oder abweisen. */
export function bereinigeSatz(raw: unknown): SatzErgebnis {
  if (typeof raw !== 'string') return { satz: '', grund: GRUND.satzLeer };
  const satz = bereinige(raw);
  if (satz.length === 0) return { satz, grund: GRUND.satzLeer };
  if (codepoints(satz).length > SATZ_MAX) return { satz, grund: GRUND.satzZuLang };
  if (satz.startsWith('/')) return { satz, grund: GRUND.satzSlash };
  return { satz };
}

export interface TitelErgebnis {
  titel?: string;
  grund?: string;
}

/**
 * B-09, AN-S12: mitgeschickter Titel bereinigt, 1–40 Zeichen, sonst Absage.
 * Ohne Titel: Wörter des Satzes bis 39 Zeichen an einer Wortgrenze, bei
 * Kürzung „…" (gesamt ≤ 40); ein einzelnes zu langes Wort wird hart geschnitten.
 */
export function bildeTitel(satz: string, titel?: unknown): TitelErgebnis {
  if (titel !== undefined && titel !== null) {
    if (typeof titel !== 'string') return { grund: GRUND.titelUngueltig };
    const t = bereinige(titel);
    const n = codepoints(t).length;
    if (n < 1 || n > TITEL_MAX) return { grund: GRUND.titelUngueltig };
    return { titel: t };
  }
  if (codepoints(satz).length <= TITEL_MAX) return { titel: satz };
  const grenze = TITEL_MAX - 1;
  const woerter = satz.split(' ').filter((w) => w.length > 0);
  let kopf = '';
  for (const wort of woerter) {
    const kandidat = kopf ? `${kopf} ${wort}` : wort;
    if (codepoints(kandidat).length > grenze) break;
    kopf = kandidat;
  }
  if (!kopf) kopf = codepoints(satz).slice(0, grenze).join('');
  return { titel: `${kopf}…` };
}

/** Fingerabdruck für den Vergleich in Stufe 2 (RB-04: Satz nie im Zustand). */
export function satzHash(satz: string): string {
  return createHash('sha256').update(satz, 'utf8').digest('hex');
}
