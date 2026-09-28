/**
 * Anruf-Protokoll (INT-2026-025): Typen, Nachrichten, Gründe und feste Texte
 * des Anrufmodus, geteilt von Backend und Frontend.
 *
 * Datenklasse: Meldungsinhalte (Sprechfassung, Fragen, Plan) sind
 * Projektinhalt und leben nur im Speicher des Backends (ADR-0006); erkannter
 * Text und Audio nur bis zum Ende des Anrufs (FA-27). Nichts davon wird
 * persistiert oder geloggt.
 */

/** Art einer Meldung, die klingeln kann (FA-03). */
export type AnrufArt = 'rueckfrage' | 'plan' | 'fertig';

/** Eine Frage einer Rückfrage, wie sie der Hook liefert (D1). */
export interface AnrufFrage {
  frage: string;
  kopf?: string;
  optionen: string[];
  mehrfach: boolean;
}

/** Flüchtiger Hook-Inhalt einer Sitzung (D1). */
export interface AnrufInhalt {
  /** Stop: letzte Antwort des Agenten, roh. */
  letzteAntwort?: string;
  /** AskUserQuestion: alle Fragen. */
  fragen?: AnrufFrage[];
  /** ExitPlanMode: Plantext. */
  plan?: string;
}

/** Aufbereiteter Vorlesetext einer Meldung (D7). */
export interface AnrufVorlesetext {
  /** Was vorgelesen wird (≤ 80 Wörter, bereinigt). */
  vorlesen: string;
  gekuerzt: boolean;
  ohneSprechfassung: boolean;
  /** Was im Kasten angezeigt wird. */
  anzeige: string;
}

/** Eine Meldung, wie der Client sie sieht. */
export interface AnrufMeldung {
  id: string;
  sessionId: string;
  sitzungName: string;
  projektName?: string;
  art: AnrufArt;
  /** ISO-Zeit des Eingangs. */
  seit: string;
  /** Nur am Bildschirm erkannt, ohne Hook-Inhalt (AN-S11): keine Sprachantwort. */
  nurBildschirm: boolean;
  /** Vorlesetext (bei Rückfragen: der ersten Frage bzw. Einleitung). */
  text?: AnrufVorlesetext;
  /** Rückfrage: alle Fragen zum Anzeigen und Abfragen (FA-16, FA-21). */
  fragen?: AnrufFrage[];
}

export type AnrufZustandName = 'ruhe' | 'klingelt' | 'laeuft' | 'freigabe_nachfrage' | 'sendet' | 'offen';

/** Offene Leitung nach erfolgreichem Senden (INT-2026-027): nur für den Besitzer. */
export interface AnrufLeitung {
  /** ID der zuletzt gesendeten Meldung; `anruf:auflegen` nennt sie. */
  leitungId: string;
  sessionId: string;
  sitzungName: string;
  projektName?: string;
  /** Ende der Frist (ISO). */
  bis: string;
}

export type AnrufNichtVerfuegbarGrund =
  | 'abgeschaltet'
  | 'plattform'
  | 'binaer_fehlt'
  | 'modell_fehlt'
  | 'nicht_lokal'
  | 'erkennung_abgestuerzt';

export interface AnrufVerfuegbarkeit {
  verfuegbar: boolean;
  grund?: AnrufNichtVerfuegbarGrund;
  /** Satz mit Grund und nächstem Schritt (FA-28). */
  text?: string;
}

/** Gründe, aus denen der Sender nicht sendet (D8, FA-24). */
export type AnrufSendeGrund =
  | 'eingabe_nicht_leer'
  | 'anderer_dialog'
  | 'schon_beantwortet'
  | 'beschaeftigt'
  | 'bildschirm_unpassend'
  | 'nicht_bestaetigt'
  | 'sitzung_weg'
  | 'unbekannte_freigabe'
  | 'plan_review_laeuft'
  | 'text_im_dialog';

/** Antwort je Frage einer Rückfrage (FA-21). */
export interface AnrufFrageAntwort {
  /** Gewählte Möglichkeiten (1-basiert). */
  nummern: number[];
  /** Eigene Antwort (Freitext). */
  eigene?: string;
}

/** Was gesendet werden soll. */
export type AnrufAntwort =
  | { art: 'text'; text: string }
  | { art: 'rueckfrage'; antworten: AnrufFrageAntwort[] }
  | { art: 'freigeben' }
  | { art: 'ueberarbeiten'; text: string };

export type AnrufMikrofon = 'ok' | 'fehlt' | 'verweigert';

// ---------------------------------------------------------------------------
// Client → Server
// ---------------------------------------------------------------------------

export interface AnrufModusSetMessage { type: 'anruf:modus.set'; an: boolean }
export interface AnrufFaehigMessage { type: 'anruf:faehig'; mikrofon: AnrufMikrofon; stimme: boolean }
export interface AnrufAnnehmenMessage { type: 'anruf:annehmen'; meldungId: string }
export interface AnrufAblehnenMessage { type: 'anruf:ablehnen'; meldungId: string }
export interface AnrufSpaeterMessage { type: 'anruf:spaeter'; meldungId: string }
export interface AnrufAuflegenMessage { type: 'anruf:auflegen'; meldungId: string }
export interface AnrufAnrufenMessage { type: 'anruf:anrufen'; sessionId: string }
/**
 * Audio als Base64 von 16-kHz-Int16-PCM (mono), ≤ 30 s je Nachricht.
 * `abschnitt`: laufende Nummer des Sprechstücks im Anruf (INT-2026-026, D5),
 * kommt in `anruf:erkannt` zurück, damit der Browser die Texte in Reihenfolge setzt.
 */
export interface AnrufErkennenMessage { type: 'anruf:erkennen'; meldungId: string; audio: string; abschnitt?: number }
export interface AnrufFreigebenAnfragenMessage { type: 'anruf:freigeben.anfragen'; meldungId: string }
export interface AnrufSendenMessage { type: 'anruf:senden'; meldungId: string; antwort: AnrufAntwort }

export type AnrufClientMessage =
  | AnrufModusSetMessage
  | AnrufFaehigMessage
  | AnrufAnnehmenMessage
  | AnrufAblehnenMessage
  | AnrufSpaeterMessage
  | AnrufAuflegenMessage
  | AnrufAnrufenMessage
  | AnrufErkennenMessage
  | AnrufFreigebenAnfragenMessage
  | AnrufSendenMessage;

export const ANRUF_CLIENT_TYPES: ReadonlyArray<AnrufClientMessage['type']> = [
  'anruf:modus.set',
  'anruf:faehig',
  'anruf:annehmen',
  'anruf:ablehnen',
  'anruf:spaeter',
  'anruf:auflegen',
  'anruf:anrufen',
  'anruf:erkennen',
  'anruf:freigeben.anfragen',
  'anruf:senden',
];

// ---------------------------------------------------------------------------
// Server → Client
// ---------------------------------------------------------------------------

/** Nur an lokale Clients (D9). */
export interface AnrufStateMessage {
  type: 'anruf:state';
  an: boolean;
  verfuegbarkeit: AnrufVerfuegbarkeit;
  zustand: AnrufZustandName;
  meldung?: AnrufMeldung;
  /** true, wenn dieser Client den laufenden Anruf besitzt. */
  eigener: boolean;
  /** Zahl der wartenden Meldungen (FA-06). */
  wartend: number;
  /** freigabe_nachfrage: gelesener Wortlaut der Ja-Möglichkeit (AN-S10). */
  freigabeWortlaut?: string;
  /** Grund, mit dem ein Anruf zuletzt ohne Senden endete (Ansage). */
  endeGrund?: string;
  /** Zustand `offen`: Leitung für den Besitzer (INT-2026-027). */
  leitung?: AnrufLeitung;
}

/** An alle Clients: für den Grund im Schalter. */
export interface AnrufVerfuegbarkeitMessage {
  type: 'anruf:verfuegbarkeit';
  an: boolean;
  verfuegbarkeit: AnrufVerfuegbarkeit;
  /** false für Browser, die nicht am Mac des Backends laufen (AN-S13). */
  lokal: boolean;
}

export type AnrufErkanntMessage =
  | { type: 'anruf:erkannt'; meldungId: string; abschnitt?: number; text: string }
  | { type: 'anruf:erkannt'; meldungId: string; abschnitt?: number; grund: 'nichts_verstanden' | 'erkennung_neustart' | 'erkennung_fehlt' };

export type AnrufErgebnisMessage =
  | { type: 'anruf:ergebnis'; meldungId: string; ok: true }
  | { type: 'anruf:ergebnis'; meldungId: string; ok: false; grund: AnrufSendeGrund; text: string };

export type AnrufErrorCode = 'ANRUF_NICHT_LOKAL' | 'ANRUF_BESETZT' | 'INVALID_MESSAGE' | 'ANRUF_NICHT_VERFUEGBAR' | 'MELDUNG_WEG';

export interface AnrufErrorMessage { type: 'anruf:error'; code: AnrufErrorCode; message: string }

export type AnrufServerMessage =
  | AnrufStateMessage
  | AnrufVerfuegbarkeitMessage
  | AnrufErkanntMessage
  | AnrufErgebnisMessage
  | AnrufErrorMessage;

// ---------------------------------------------------------------------------
// Konstanten und Texte
// ---------------------------------------------------------------------------

export const ANRUF_MAX_WOERTER = 80;
export const ANRUF_SPAETER_MS = 5 * 60 * 1000;
export const ANRUF_AUDIO_MAX_S = 30;
/** Audio-Obergrenze als Base64 (30 s × 16 kHz × 2 Byte ≈ 960 KB → ~1,28 MB Base64). */
export const ANRUF_AUDIO_MAX_BASE64 = 1_400_000;
/** Größte Abschnittsnummer, die der Handler annimmt (INT-2026-026, D5). */
export const ANRUF_ABSCHNITT_MAX = 100_000;
/** Freihändig (INT-2026-026): Sprechpause, nach der erkannt und geprüft wird (AN-S01). */
export const ANRUF_PAUSE_MS = 1000;
/** Stille bis zum Auflegen, ab Öffnen des Mikrofons und neu ab jedem erkannten Wort (FA-09). */
export const ANRUF_STILLE_S = 20;
/** Gesprochenes je Frage, danach „Antwort zu lang" (FA-11). */
export const ANRUF_ANTWORT_MAX_S = 120;
/** Audio je Anruf im Backend, Schutz gegen Dauerversand (D5, security.md §2). */
export const ANRUF_AUDIO_MAX_JE_ANRUF_S = 600;
/** Meldungen nur, solange ein lokaler fähiger Client verbunden ist oder vor höchstens so langer Zeit war (O2). */
export const ANRUF_CLIENT_KULANZ_MS = 30 * 1000;
/** Klingelton: dreimal im Abstand von 4 s, danach stiller Kasten (D6). */
export const ANRUF_KLINGEL_WIEDERHOLUNGEN = 3;
export const ANRUF_KLINGEL_ABSTAND_MS = 4000;
/** Leitung bleibt nach erfolgreichem Senden so lange offen für dieselbe Sitzung (INT-2026-027, AK-06). */
export const ANRUF_LEITUNG_OFFEN_MS = 120_000;
/** Grenzen des Hook-Inhalts (D1). */
export const ANRUF_INHALT_GRENZEN = {
  letzteAntwort: 20_000,
  plan: 50_000,
  fragen: 4,
  optionen: 6,
  feld: 500,
} as const;

/** Sprechfassungs-Anweisung, solange der Anrufmodus an ist (D2, FA-14). */
export const ANRUF_ANWEISUNG_AN =
  'Anrufmodus ist an. Beende jede Antwort, mit der du deinen Zug abschließt, mit einem eigenen letzten Absatz, der mit ‚Sprechfassung:‘ beginnt — auch bei sehr kurzen Antworten und auch, wenn die Eingabe eine knappe Antwort verlangt. Michael hört diesen Absatz nur, er sieht den Bildschirm nicht: nenne zuerst das Ergebnis selbst in einem ganzen Satz (die Antwort, den Befund, die Entscheidung — nicht nur, dass du etwas getan hast), dann kurz, was du getan hast, dann, was du jetzt von Michael brauchst. Höchstens 80 Wörter, Alltagssprache, Zahlen als Wörter; keine Codeblöcke, Dateipfade, Tabellen oder Links. Legst du einen Plan mit ExitPlanMode vor, beginne den Plantext mit so einem Absatz.';

/** Einmaliger Gegenhinweis nach dem Ausschalten (D2, AN-S04). */
export const ANRUF_ANWEISUNG_AUS = 'Anrufmodus ist aus: ab jetzt keinen Absatz ‚Sprechfassung:‘ mehr schreiben.';

export const ANRUF_SENDE_GRUND_TEXT: Record<AnrufSendeGrund, string> = {
  eingabe_nicht_leer: 'In der Eingabezeile steht noch Text — im Terminal abschicken oder löschen.',
  anderer_dialog: 'Die Sitzung zeigt gerade einen anderen Dialog — bitte im Terminal beantworten.',
  schon_beantwortet: 'In der Sitzung schon beantwortet.',
  beschaeftigt: 'Die Sitzung ist gerade beschäftigt — gleich nochmal versuchen.',
  bildschirm_unpassend: 'Der Bildschirm der Sitzung passt nicht zur Meldung — bitte im Terminal beantworten.',
  nicht_bestaetigt: 'Die Sitzung hat die Antwort nicht bestätigt — im Terminal prüfen.',
  sitzung_weg: 'Die Sitzung gibt es nicht mehr.',
  unbekannte_freigabe: 'Die Freigabe-Möglichkeit hat einen unbekannten Wortlaut — bitte im Terminal freigeben.',
  plan_review_laeuft: 'Für diesen Plan läuft gerade ein Plan-Review — Freigabe erst danach; Überarbeiten geht.',
  text_im_dialog: 'Im Plan-Dialog steht schon Text — bitte im Terminal prüfen.',
};

export const ANRUF_NICHT_VERFUEGBAR_TEXT: Record<AnrufNichtVerfuegbarGrund, string> = {
  abgeschaltet: 'Nicht verfügbar: abgeschaltet (SPECWRIGHT_ANRUF=off). Variable entfernen und das Backend neu starten.',
  plattform: 'Nicht verfügbar: der Anrufmodus läuft nur, wenn das Backend auf einem Mac läuft.',
  binaer_fehlt: 'Nicht verfügbar: whisper-server fehlt. Einrichten mit „brew install whisper-cpp", dann „npm run sprache:einrichten" in ui/.',
  modell_fehlt: 'Nicht verfügbar: das Sprachmodell fehlt. Einrichten mit „npm run sprache:einrichten" in ui/.',
  nicht_lokal: 'Nicht verfügbar in diesem Browser: der Anrufmodus geht nur im Browser am Mac des Backends, unter http://localhost:3001.',
  erkennung_abgestuerzt: 'Nicht verfügbar: die Spracherkennung ist abgestürzt. Anrufmodus aus- und wieder einschalten.',
};
