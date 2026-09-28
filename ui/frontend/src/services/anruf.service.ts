/**
 * AnrufClientService (INT-2026-025, D4, D6, D11; INT-2026-026, D3, D4) — the
 * browser side of the call mode. Mirrors `anruf:state` / `anruf:verfuegbarkeit`
 * from the backend (which owns queue and call state, AR-05) and adds what only
 * a browser can do: ring, read aloud (`speechSynthesis`, local German voice),
 * listen hands-free after reading (microphone only while an accepted call
 * waits for an answer, cut into pieces at speaking pauses), put the pieces'
 * recognised text together and send it when it ends with „Antwort senden".
 *
 * Every browser API sits behind {@link AnrufDeps}, so tests run with fakes.
 * Nothing here is persisted or logged: recognised text and audio live in
 * memory until the call ends (FA-22).
 */

import { gateway, type WebSocketMessage } from '../gateway.js';
import { playAnrufHinweis, playAnrufKlingeln } from '../components/terminal/notification-sound.js';
import {
  ANRUF_ANTWORT_MAX_S,
  ANRUF_AUDIO_MAX_S,
  ANRUF_KLINGEL_ABSTAND_MS,
  ANRUF_KLINGEL_WIEDERHOLUNGEN,
  ANRUF_NICHT_VERFUEGBAR_TEXT,
  ANRUF_STILLE_S,
  type AnrufAntwort,
  type AnrufArt,
  type AnrufErgebnisMessage,
  type AnrufErkanntMessage,
  type AnrufErrorMessage,
  type AnrufFrageAntwort,
  type AnrufMeldung,
  type AnrufMikrofon,
  type AnrufStateMessage,
  type AnrufVerfuegbarkeitMessage,
  type AnrufZustandName,
} from '../../../src/shared/types/anruf.protocol.js';
import { deuteSprache, pruefeSchluss, waehleMoeglichkeit } from '../../../src/shared/anruf-befehle.js';
import { ANRUF_RATE, int16ZuBase64 } from '../../../src/shared/anruf-audio.js';
import { frageVorlesen } from '../../../src/shared/anruf-text.js';
import { Sprechpausen } from './anruf-sprechpausen.js';
import { Diktat } from './anruf-diktat.js';

export { ANRUF_MIN_DAUER_S, ANRUF_RMS_SCHWELLE } from './anruf-sprechpausen.js';

// ---------------------------------------------------------------------------
// Injectable browser APIs
// ---------------------------------------------------------------------------

export interface AnrufGateway {
  send(message: WebSocketMessage): void;
  on(type: string, handler: (message: WebSocketMessage) => void): void;
  off(type: string, handler: (message: WebSocketMessage) => void): void;
}

export interface AnrufStimme {
  name: string;
  lang: string;
  localService: boolean;
}

/** `speechSynthesis`, reduced to what the call needs. */
export interface AnrufSprachausgabe {
  getVoices(): AnrufStimme[];
  /**
   * Queues one utterance with this voice. `beiEnde` (INT-2026-026, D4): end of
   * this utterance — `true` when spoken to the end, `false` when cancelled.
   */
  speak(text: string, stimme: AnrufStimme, beiEnde?: (ok: boolean) => void): void;
  cancel(): void;
  /** Speaking or utterances queued (`speaking || pending`) — fallback when `onend` stays away. */
  aktiv(): boolean;
  onVoicesChanged(cb: () => void): void;
}

/** One running recording (AudioContext + AudioWorklet in the browser). */
export interface AnrufAufnahme {
  sampleRate: number;
  stop(): void;
}

/** An open microphone stream. */
export interface AnrufMikrofonStrom {
  /** Stops all tracks (the browser's recording indicator goes off). */
  stoppe(): void;
  /** Track ended from outside (device unplugged, permission revoked). */
  beiEnde(cb: () => void): void;
  starteAufnahme(onChunk: (chunk: Float32Array) => void): Promise<AnrufAufnahme>;
}

export type AnrufErlaubnis = 'granted' | 'denied' | 'prompt' | 'unbekannt';

export interface AnrufMikrofonApi {
  vorhanden(): boolean;
  erlaubnis(): Promise<AnrufErlaubnis>;
  onErlaubnisAenderung(cb: () => void): void;
  /** At least one audio input (true when the browser does not tell). */
  hatEingang(): Promise<boolean>;
  /** getUserMedia — only while an accepted call waits for an answer (FA-03). Rejects with a DOMException-like `{ name }`. */
  oeffne(): Promise<AnrufMikrofonStrom>;
}

export interface AnrufMitteilungApi {
  erlaubnis(): NotificationPermission | 'fehlt';
  anfragen(): Promise<void>;
  zeige(titel: string, body: string, tag: string): void;
}

export interface AnrufDeps {
  gateway: AnrufGateway;
  sprache: AnrufSprachausgabe;
  mikrofon: AnrufMikrofonApi;
  mitteilung: AnrufMitteilungApi;
  istVersteckt(): boolean;
  klingeln(): void;
  /** One short note before a message that arrives in the open line (INT-2026-027, AK-11). */
  hinweiston(): void;
}

// ---------------------------------------------------------------------------
// View model
// ---------------------------------------------------------------------------

export type AnrufPhase =
  | 'ruhe'
  | 'klingelt'
  | 'fremd'
  | 'vorlesen'
  | 'zuhoeren'
  | 'mikrofon_zu'
  | 'nachfrage'
  | 'sendet'
  | 'ergebnis'
  /** Line stays open after „Gesendet", microphone off (INT-2026-027). */
  | 'leitung';

export interface AnrufModusAnsicht {
  /** Mode switched on (backend). */
  an: boolean;
  /** An `anruf:verfuegbarkeit` or `anruf:state` has arrived. */
  bekannt: boolean;
  /** Backend side available (whisper-server, model, platform). */
  verfuegbar: boolean;
  /** Backend reason sentence, when not available. */
  text?: string;
  /** This browser runs on the backend's Mac (AN-S13). */
  lokal: boolean;
  mikrofon: AnrufMikrofon;
  /** A local German voice exists (D4). */
  stimme: boolean;
}

export interface AnrufErgebnis {
  ok: boolean;
  text: string;
  /** Hung up without sending, the message stays in the bell (FA-09). */
  glocke?: boolean;
  /** The open line ended (INT-2026-027): nothing was pending, shown without „Nicht gesendet". */
  leitung?: boolean;
}

export interface AnrufAnsicht {
  modus: AnrufModusAnsicht;
  phase: AnrufPhase;
  zustand: AnrufZustandName;
  meldung?: AnrufMeldung;
  wartend: number;
  /** Rückfrage: index of the question being asked. */
  frageIndex: number;
  /** Rückfrage/plan without content or only seen on screen: only „Im Terminal öffnen". */
  nurTerminal: boolean;
  /** Text shown while reading. */
  anzeige?: string;
  gekuerzt: boolean;
  /** Recognised so far (gap-free), without nothing cut off; empty when nothing said. */
  text?: string;
  /** „Wird gesendet als: …" for {@link text} without the closing phrase. */
  als?: string;
  /** Pieces sent to the recognition whose text is not in yet („… wird erkannt"). */
  erkenntNoch: boolean;
  /** Text is held (failed send, too long): only „Antwort senden" alone, „Antwort verwerfen", „auflegen" act (D6). */
  gehalten: boolean;
  /** Listening (or microphone closed) inside the plan confirmation. */
  hoertInNachfrage: boolean;
  /** Rückfrage: the closing phrase advances to the next question instead of sending. */
  weiter: boolean;
  hinweis?: string;
  freigabeWortlaut?: string;
  ergebnis?: AnrufErgebnis;
  /** Phase `leitung`: the session the open line waits for. */
  leitung?: { sitzungName: string; projektName?: string };
}

export type AnrufListener = (ansicht: AnrufAnsicht) => void;

// ---------------------------------------------------------------------------
// Texts and pure helpers
// ---------------------------------------------------------------------------

export const ANRUF_ART_LABEL: Record<AnrufArt, string> = { rueckfrage: 'Rückfrage', plan: 'Plan', fertig: 'Fertig' };

export const ANRUF_ERGEBNIS_MS = 3000;
/** No result for a piece after this long → counted as not understood (Finding 9). */
export const ANRUF_ERKENNUNG_FRIST_MS = 15_000;
/** Fallback check for the end of reading (D4). */
export const ANRUF_VORLESE_PRUEF_MS = 500;
/** Pause between the note and reading a message from the open line (AK-11). */
export const ANRUF_HINWEIS_VORLAUF_MS = 400;
/** Hard limit for reading: 3 s + 90 ms per character (D4, R11). */
export function vorleseFristMs(text: string): number {
  return 3000 + text.length * 90;
}

export const ANRUF_TEXT = {
  nichtsVerstanden: 'Nicht verstanden',
  erkennungNeustart: 'Nicht verstanden — Spracherkennung startet neu, bitte nochmal sprechen',
  erkennungFehlt: 'Spracherkennung nicht verfügbar — bitte im Terminal antworten',
  mikrofonWeg: 'Mikrofon nicht verfügbar',
  mikrofonVerweigert: 'Mikrofon nicht freigegeben',
  keineSprechfassungAnfang: 'Keine Sprechfassung — hier der Anfang der Antwort.',
  keineSprechfassungTerminal: 'Keine Sprechfassung — die Antwort steht nur im Terminal.',
  gesendet: 'Gesendet',
  andereFenster: 'Anruf läuft in einem anderen Fenster',
  leitungAndereFenster: 'Leitung offen in einem anderen Fenster',
  besetzt: 'Erst den laufenden Anruf beenden',
  nichtFreigegeben: 'Nicht freigegeben.',
  jaOderNein: 'Sag ja oder nein.',
  nochKeineAntwort: 'Noch keine Antwort — erst sprechen.',
  verworfen: 'Verworfen',
  schlussHinweis: 'Zum Senden: „Antwort senden“',
  gehaltenHinweis: 'Gehaltener Text: „Antwort senden“ oder „Antwort verwerfen“',
  zuLang: 'Antwort zu lang',
  keineAntwort: 'Keine Antwort, aufgelegt',
  verbindungWeg: 'Verbindung unterbrochen — nichts gesendet',
} as const;

export const ANRUF_CLIENT_GRUND_TEXT = {
  mikrofonVerweigert: 'Nicht verfügbar: Mikrofon nicht freigegeben — in den Browser-Einstellungen für localhost erlauben.',
  mikrofonFehlt: 'Nicht verfügbar: kein Mikrofon gefunden — Mikrofon anschließen oder in den Systemeinstellungen wählen.',
  stimmeFehlt: 'Nicht verfügbar: keine lokale deutsche Stimme — in den macOS-Einstellungen unter Bedienungshilfen › Gesprochene Inhalte eine deutsche Stimme (z. B. Anna) laden.',
} as const;

/** Mode on and this window can take calls — the bell chime yields to the ring tone (Review F12). */
export function anrufAktiv(m: AnrufModusAnsicht): boolean {
  return m.an && m.verfuegbar && m.lokal && m.mikrofon === 'ok' && m.stimme;
}

/**
 * Why the switch cannot be turned on (FA-28), or null. Order: not this
 * browser, backend reason, microphone, voice. Turning it off is always allowed.
 */
export function schalterSperrgrund(m: AnrufModusAnsicht): string | null {
  if (!m.bekannt) return null;
  if (!m.lokal) return ANRUF_NICHT_VERFUEGBAR_TEXT.nicht_lokal;
  if (!m.verfuegbar) return m.text ?? 'Nicht verfügbar.';
  if (m.mikrofon === 'verweigert') return ANRUF_CLIENT_GRUND_TEXT.mikrofonVerweigert;
  if (m.mikrofon === 'fehlt') return ANRUF_CLIENT_GRUND_TEXT.mikrofonFehlt;
  if (!m.stimme) return ANRUF_CLIENT_GRUND_TEXT.stimmeFehlt;
  return null;
}

/** First local German voice, „Anna" preferred (D4). */
export function waehleStimme(voices: readonly AnrufStimme[]): AnrufStimme | undefined {
  const deutsch = voices.filter((v) => v.localService && /^de([-_]|$)/i.test(v.lang));
  return deutsch.find((v) => /\banna\b/i.test(v.name)) ?? deutsch[0];
}

/** Sentence-wise utterances (Chrome drops long ones, D4). */
export function saetze(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** No usable content for a spoken answer (AN-S11, Review F5). */
export function nurTerminal(m: AnrufMeldung): boolean {
  if (m.nurBildschirm) return true;
  if (m.art === 'rueckfrage') return !m.fragen || m.fragen.length === 0;
  if (m.art === 'plan') return !m.text;
  return false;
}

function sitzungText(m: AnrufMeldung): string {
  return `„${m.sitzungName}“`;
}

/** What is read after accepting (question `index` for Rückfragen). */
export function vorleseTextFuer(m: AnrufMeldung, index: number): string {
  if (nurTerminal(m)) {
    if (m.art === 'rueckfrage') return `Rückfrage in Sitzung ${sitzungText(m)} — die Frage steht nur im Terminal.`;
    if (m.art === 'plan') return `Plan in Sitzung ${sitzungText(m)} — der Plan steht nur im Terminal.`;
    return `Meldung in Sitzung ${sitzungText(m)} — sie steht nur im Terminal.`;
  }
  if (m.art === 'rueckfrage' && index > 0) {
    const frage = m.fragen?.[index];
    return frage ? `Nächste Frage. ${frageVorlesen(frage).text}` : '';
  }
  if (!m.text) return ANRUF_TEXT.keineSprechfassungTerminal;
  const teile: string[] = [];
  if (m.text.ohneSprechfassung) teile.push(ANRUF_TEXT.keineSprechfassungAnfang);
  teile.push(m.text.vorlesen);
  if (m.text.gekuerzt) teile.push('Gekürzt.');
  return teile.join(' ');
}

/** The text that would be sent: without a closing phrase at the end. */
function ohneSchluss(text: string): string {
  const s = pruefeSchluss(text);
  return s.art === 'senden' ? s.rest : text.trim();
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

type Kandidat =
  | { als: string; art: 'antwort'; antwort: AnrufAntwort }
  | { als: string; art: 'frage'; teil: AnrufFrageAntwort; mehrdeutig?: number[] };

type SprechKontext = 'antwort' | 'nachfrage';
type VorleseErgebnis = 'fertig' | 'abgebrochen';

interface EigenerAnruf {
  meldungId: string;
  phase: 'vorlesen' | 'zuhoeren' | 'mikrofon_zu' | 'sendet';
  frageIndex: number;
  antworten: AnrufFrageAntwort[];
  hinweis?: string;
  /** What listening expects: an answer, or ja/nein at the plan confirmation. */
  kontext: SprechKontext;
  /** „Nein" at the plan confirmation: show the plan again (server stays in freigabe_nachfrage). */
  nachfrageVerlassen: boolean;
  diktat: Diktat;
  /** Noise floor learned by the first opening, handed to the next (Finding 5). */
  grundrauschen?: number;
  /** Last answer sent; „Antwort senden" alone resends it after a failure (FA-17). */
  gesendet?: AnrufAntwort;
}

/** One opening of the microphone (D3). */
interface Zuhoeren {
  strom?: AnrufMikrofonStrom;
  aufnahme?: AnrufAufnahme;
  pausen?: Sprechpausen;
  /** Sample time up to which quiet is confirmed (end of the last piece, or `onRuhe`). */
  ruhigAb: number;
  /** `diktat.neu` at the last evaluation — evaluate each new text once. */
  ausgewertet: string;
}

const LAEUFT: ReadonlySet<AnrufZustandName> = new Set(['laeuft', 'freigabe_nachfrage', 'sendet']);

export class AnrufClientService {
  private deps: AnrufDeps | null;
  private readonly depsFabrik: () => AnrufDeps;
  private started = false;
  private readonly listeners = new Set<AnrufListener>();

  private server: AnrufStateMessage | null = null;
  private modus: AnrufModusAnsicht = { an: false, bekannt: false, verfuegbar: false, lokal: false, mikrofon: 'fehlt', stimme: false };
  private gemeldet: string | null = null;
  private eigen: EigenerAnruf | null = null;
  private hoeren: Zuhoeren | null = null;
  private readonly fristen = new Map<number, ReturnType<typeof setTimeout>>();
  private vorleseAbbruch: (() => void) | null = null;
  private ergebnis: AnrufErgebnis | undefined;
  private ergebnisTimer: ReturnType<typeof setTimeout> | null = null;
  private klingelId: string | null = null;
  private klingelTimer: ReturnType<typeof setTimeout>[] = [];
  private letzterEigenerId: string | null = null;
  /** Hung up here; ignore `laeuft` for it until the backend confirms the end. */
  private aufgelegtId: string | null = null;
  private beendetIds = new Set<string>();
  /** Note played, reading follows (AK-11). */
  private hinweisTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(deps?: AnrufDeps | (() => AnrufDeps)) {
    this.deps = typeof deps === 'object' ? deps : null;
    this.depsFabrik = typeof deps === 'function' ? deps : browserDeps;
  }

  private get d(): AnrufDeps {
    this.deps ??= this.depsFabrik();
    return this.deps;
  }

  // -- subscription -----------------------------------------------------------

  subscribe(listener: AnrufListener): () => void {
    this.listeners.add(listener);
    this.start();
    listener(this.ansicht);
    return () => this.listeners.delete(listener);
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    const g = this.d.gateway;
    g.on('anruf:state', this.onState);
    g.on('anruf:verfuegbarkeit', this.onVerfuegbarkeit);
    g.on('anruf:erkannt', this.onErkannt);
    g.on('anruf:ergebnis', this.onErgebnis);
    g.on('anruf:error', this.onError);
    g.on('gateway.connected', this.onConnected);
    g.on('gateway.disconnected', this.onDisconnected);
    this.d.sprache.onVoicesChanged(() => void this.pruefeFaehig());
    this.d.mikrofon.onErlaubnisAenderung(() => void this.pruefeFaehig());
    void this.pruefeFaehig();
  }

  get ansicht(): AnrufAnsicht {
    const s = this.server;
    const phase = this.phase();
    const meldung = s?.meldung;
    const e = this.eigen && meldung && this.eigen.meldungId === meldung.id ? this.eigen : null;
    const frageIndex = e?.frageIndex ?? 0;
    const frage = meldung?.fragen?.[frageIndex];
    const anzeige = !meldung
      ? undefined
      : nurTerminal(meldung)
        ? vorleseTextFuer(meldung, 0)
        : meldung.art === 'rueckfrage' && frage
          ? frage.frage
          : (meldung.text?.anzeige ?? (meldung.art === 'fertig' ? ANRUF_TEXT.keineSprechfassungTerminal : undefined));
    const text = e?.diktat.text || undefined;
    const senden = text ? ohneSchluss(text) : '';
    const kandidat = e && meldung && senden ? this.kandidatAus(meldung, frageIndex, senden) : undefined;
    return {
      modus: { ...this.modus },
      phase,
      zustand: s?.zustand ?? 'ruhe',
      ...(meldung ? { meldung } : {}),
      wartend: s?.wartend ?? 0,
      frageIndex,
      nurTerminal: meldung ? nurTerminal(meldung) : false,
      ...(anzeige !== undefined ? { anzeige } : {}),
      gekuerzt: frageIndex === 0 && (meldung?.text?.gekuerzt ?? false),
      ...(text ? { text } : {}),
      ...(kandidat ? { als: kandidat.als } : {}),
      erkenntNoch: (e?.diktat.offen ?? 0) > 0,
      gehalten: e?.diktat.gehalten ?? false,
      hoertInNachfrage: !!e && e.kontext === 'nachfrage' && s?.zustand === 'freigabe_nachfrage' && !e.nachfrageVerlassen,
      weiter: meldung?.art === 'rueckfrage' && frageIndex < (meldung.fragen?.length ?? 1) - 1,
      ...(e?.hinweis ? { hinweis: e.hinweis } : {}),
      ...(s?.freigabeWortlaut ? { freigabeWortlaut: s.freigabeWortlaut } : {}),
      ...(this.ergebnis ? { ergebnis: this.ergebnis } : {}),
      ...(phase === 'leitung' && s?.leitung
        ? { leitung: { sitzungName: s.leitung.sitzungName, ...(s.leitung.projektName ? { projektName: s.leitung.projektName } : {}) } }
        : {}),
    };
  }

  private phase(): AnrufPhase {
    const s = this.server;
    if (s?.zustand === 'klingelt' && s.meldung) return 'klingelt';
    if (s?.zustand === 'offen') {
      // INT-2026-027: no message in the open line; only the owner gets `leitung`.
      if (!s.eigener || !s.leitung) return 'fremd';
      if (s.leitung.leitungId === this.aufgelegtId) return this.ergebnis ? 'ergebnis' : 'ruhe';
      return 'leitung';
    }
    if (s && LAEUFT.has(s.zustand) && s.meldung) {
      if (!s.eigener) return 'fremd';
      if (s.meldung.id === this.aufgelegtId) return this.ergebnis ? 'ergebnis' : 'ruhe';
      if (s.zustand === 'sendet') return 'sendet';
      const e = this.eigen;
      if (!e) return 'vorlesen';
      if (s.zustand === 'freigabe_nachfrage' && !e.nachfrageVerlassen && e.phase === 'vorlesen') return 'nachfrage';
      return e.phase;
    }
    return this.ergebnis ? 'ergebnis' : 'ruhe';
  }

  private emit(): void {
    const a = this.ansicht;
    for (const l of this.listeners) l(a);
  }

  // -- server messages --------------------------------------------------------

  private readonly onConnected = (): void => {
    this.gemeldet = null;
  };

  /** Connection lost while in a call: stop listening, send nothing (Finding 21); the backend ends the call (client.weg). */
  private readonly onDisconnected = (): void => {
    const e = this.eigen;
    if (!e) return;
    this.beendetIds.add(e.meldungId);
    this.beendeEigen();
    this.letzterEigenerId = null;
    this.setzeErgebnis({ ok: false, text: ANRUF_TEXT.verbindungWeg });
    this.emit();
  };

  private readonly onVerfuegbarkeit = (msg: WebSocketMessage): void => {
    const m = msg as unknown as AnrufVerfuegbarkeitMessage;
    this.modus = {
      ...this.modus,
      bekannt: true,
      an: m.an === true,
      verfuegbar: m.verfuegbarkeit?.verfuegbar === true,
      lokal: m.lokal === true,
      ...(m.verfuegbarkeit?.text ? { text: m.verfuegbarkeit.text } : { text: undefined }),
    };
    this.meldeFaehig();
    this.emit();
  };

  private readonly onState = (msg: WebSocketMessage): void => {
    const neu = msg as unknown as AnrufStateMessage;
    const alt = this.server;
    this.server = neu;
    // anruf:state reaches local clients only (D9).
    this.modus = {
      ...this.modus,
      bekannt: true,
      lokal: true,
      an: neu.an === true,
      verfuegbar: neu.verfuegbarkeit?.verfuegbar === true,
      ...(neu.verfuegbarkeit?.text ? { text: neu.verfuegbarkeit.text } : { text: undefined }),
    };
    this.meldeFaehig();

    const m = neu.meldung;
    // Ringing (FA-03, FA-04): ring tone 3× every 4 s, notification when hidden.
    if (neu.zustand === 'klingelt' && m) {
      if (this.klingelId !== m.id) this.starteKlingeln(m);
    } else {
      this.stoppeKlingeln();
    }

    const nochAufgelegt =
      (LAEUFT.has(neu.zustand) && m && m.id === this.aufgelegtId) || (neu.zustand === 'offen' && neu.leitung?.leitungId === this.aufgelegtId);
    if (!nochAufgelegt) this.aufgelegtId = null;
    // The previous state was this window's call or open line (INT-2026-027).
    const ausLeitung = alt?.eigener === true && (alt.zustand === 'offen' || alt.zustand === 'sendet');
    const eigenLaeuft = neu.an && LAEUFT.has(neu.zustand) && neu.eigener && m !== undefined && m.id !== this.aufgelegtId;
    if (eigenLaeuft && m) {
      if (!this.eigen || this.eigen.meldungId !== m.id) {
        this.beendeEigen();
        this.eigen = {
          meldungId: m.id,
          phase: 'vorlesen',
          frageIndex: 0,
          antworten: [],
          kontext: 'antwort',
          nachfrageVerlassen: false,
          diktat: new Diktat(),
        };
        this.letzterEigenerId = m.id;
        this.setzeErgebnis(undefined);
        if (ausLeitung) this.hinweisDannVorlesen();
        else this.vorlesen();
      } else if (neu.zustand === 'freigabe_nachfrage' && alt?.zustand !== 'freigabe_nachfrage') {
        this.eigen.nachfrageVerlassen = false;
        this.eigen.hinweis = undefined;
        this.eigen.diktat.leeren();
        void this.vorleseDannHoere(this.nachfrageText(m), 'nachfrage');
      }
    } else if (this.eigen || this.letzterEigenerId) {
      // Own call ended — by us, by an answer, elsewhere, or mode off (FA-03, AN-S08).
      const id = this.eigen?.meldungId ?? this.letzterEigenerId;
      this.beendeEigen();
      this.letzterEigenerId = null;
      if (id && !this.beendetIds.has(id) && neu.endeGrund) {
        this.setzeErgebnis({ ok: false, text: neu.endeGrund });
        void this.sprich(neu.endeGrund);
      }
      if (id) this.beendetIds.add(id);
    } else if (alt?.zustand === 'offen' && alt.eigener && neu.zustand !== 'offen' && neu.endeGrund) {
      // Open line ended by the deadline or mode off (AK-10); the button „Auflegen" brings no endeGrund.
      this.setzeErgebnis({ ok: false, text: neu.endeGrund, leitung: true });
      void this.sprich(neu.endeGrund);
    }
    this.emit();
  };

  private readonly onErkannt = (msg: WebSocketMessage): void => {
    const m = msg as unknown as AnrufErkanntMessage;
    const e = this.eigen;
    const nr = m.abschnitt;
    if (!e || e.meldungId !== m.meldungId || nr === undefined) return;
    const frist = this.fristen.get(nr);
    if (frist) clearTimeout(frist);
    this.fristen.delete(nr);
    if ('grund' in m) {
      if (!e.diktat.ergebnis(nr, null)) return;
      if (m.grund === 'erkennung_neustart') {
        e.hinweis = ANRUF_TEXT.erkennungNeustart;
        if (e.phase === 'zuhoeren') void this.vorleseDannHoere(e.hinweis, e.kontext);
      } else if (m.grund === 'erkennung_fehlt') {
        this.stoppeZuhoeren();
        e.phase = 'mikrofon_zu';
        e.hinweis = ANRUF_TEXT.erkennungFehlt;
        void this.sprich(e.hinweis);
      }
    } else if (!e.diktat.ergebnis(nr, m.text)) {
      return;
    }
    this.werteAusWennBereit();
    this.emit();
  };

  private readonly onErgebnis = (msg: WebSocketMessage): void => {
    const m = msg as unknown as AnrufErgebnisMessage;
    const e = this.eigen;
    if (m.ok) {
      this.beendetIds.add(m.meldungId);
      this.setzeErgebnis({ ok: true, text: ANRUF_TEXT.gesendet });
      // Announce after ending: beendeEigen cancels speech (D10, FA-18).
      if (e && e.meldungId === m.meldungId) this.beendeEigen();
      void this.sprich(`${ANRUF_TEXT.gesendet}.`);
    } else if (e && e.meldungId === m.meldungId && m.grund !== 'schon_beantwortet') {
      // The call stays open (e.g. text in the input line): hold the text, listen again (FA-17, D6).
      e.diktat.halten();
      e.hinweis = `Nicht gesendet: ${m.text}`;
      void this.vorleseDannHoere(`Nicht gesendet. ${m.text}`, e.kontext);
    } else {
      // Answered elsewhere: the backend ends the call and announces why.
      this.setzeErgebnis({ ok: false, text: m.text });
    }
    this.emit();
  };

  private readonly onError = (msg: WebSocketMessage): void => {
    const m = msg as unknown as AnrufErrorMessage;
    if (m.code === 'ANRUF_NICHT_LOKAL') return;
    const text = m.code === 'ANRUF_BESETZT' ? ANRUF_TEXT.besetzt : m.message;
    const e = this.eigen;
    if (e && this.phase() !== 'ruhe') {
      if (e.phase === 'sendet') e.diktat.halten();
      // Refused audio (Finding 13) or send: microphone closed, buttons stay.
      if (e.phase === 'sendet' || e.phase === 'zuhoeren') {
        this.stoppeZuhoeren();
        e.phase = 'mikrofon_zu';
      }
      e.hinweis = text;
    } else {
      this.setzeErgebnis({ ok: false, text });
    }
    this.emit();
  };

  // -- ringing ----------------------------------------------------------------

  private starteKlingeln(m: AnrufMeldung): void {
    this.stoppeKlingeln();
    this.klingelId = m.id;
    this.d.klingeln();
    for (let i = 1; i < ANRUF_KLINGEL_WIEDERHOLUNGEN; i++) {
      this.klingelTimer.push(setTimeout(() => this.d.klingeln(), i * ANRUF_KLINGEL_ABSTAND_MS));
    }
    if (this.d.istVersteckt() && this.d.mitteilung.erlaubnis() === 'granted') {
      const projekt = m.projektName ? ` · ${m.projektName}` : '';
      try {
        this.d.mitteilung.zeige(`Anruf: ${ANRUF_ART_LABEL[m.art]}`, `Sitzung ${sitzungText(m)}${projekt}`, m.id);
      } catch {
        // Notification constructor can throw (e.g. no service worker on some platforms) — the ring stays.
      }
    }
  }

  private stoppeKlingeln(): void {
    for (const t of this.klingelTimer) clearTimeout(t);
    this.klingelTimer = [];
    this.klingelId = null;
  }

  // -- capability (anruf:faehig) ---------------------------------------------

  /** Checks microphone and voice; reports when this browser is local. */
  async pruefeFaehig(): Promise<void> {
    const stimme = waehleStimme(this.d.sprache.getVoices()) !== undefined;
    let mikrofon: AnrufMikrofon = 'ok';
    if (!this.d.mikrofon.vorhanden()) mikrofon = 'fehlt';
    else {
      const erlaubnis = await this.d.mikrofon.erlaubnis();
      if (erlaubnis === 'denied') mikrofon = 'verweigert';
      else if (!(await this.d.mikrofon.hatEingang())) mikrofon = 'fehlt';
    }
    this.setzeFaehig(mikrofon, stimme);
  }

  private setzeFaehig(mikrofon: AnrufMikrofon, stimme: boolean): void {
    if (this.modus.mikrofon === mikrofon && this.modus.stimme === stimme && this.gemeldet !== null) return;
    this.modus = { ...this.modus, mikrofon, stimme };
    this.meldeFaehig();
    this.emit();
  }

  /**
   * Reports capability. Held back during an own call (D9): the backend would
   * end the call after its grace time, and FA-21 keeps it usable by button.
   * {@link beendeEigen} reports the held value.
   */
  private meldeFaehig(): void {
    if (!this.modus.lokal || this.eigen) return;
    const key = `${this.modus.mikrofon}|${this.modus.stimme}`;
    if (this.gemeldet === key) return;
    this.gemeldet = key;
    this.d.gateway.send({ type: 'anruf:faehig', mikrofon: this.modus.mikrofon, stimme: this.modus.stimme });
  }

  // -- commands ---------------------------------------------------------------

  /**
   * Switch (FA-01): switching on asks the browser once for the microphone
   * (Ablauf A) and for notifications; stays off when a client reason remains.
   */
  async setModus(an: boolean): Promise<boolean> {
    if (!an) {
      this.d.gateway.send({ type: 'anruf:modus.set', an: false });
      return true;
    }
    if (this.d.mikrofon.vorhanden() && (await this.d.mikrofon.erlaubnis()) === 'prompt') {
      try {
        const strom = await this.d.mikrofon.oeffne();
        strom.stoppe();
      } catch {
        // denied or missing — pruefeFaehig() below reports the reason
      }
    }
    try {
      if (this.d.mitteilung.erlaubnis() === 'default') await this.d.mitteilung.anfragen();
    } catch {
      // notification permission is optional
    }
    await this.pruefeFaehig();
    if (schalterSperrgrund(this.modus) !== null) return false;
    this.d.gateway.send({ type: 'anruf:modus.set', an: true });
    return true;
  }

  private meldungId(): string | undefined {
    return this.server?.meldung?.id;
  }

  annehmen(): void {
    const id = this.meldungId();
    if (id && this.server?.zustand === 'klingelt') this.d.gateway.send({ type: 'anruf:annehmen', meldungId: id });
  }

  ablehnen(): void {
    const id = this.meldungId();
    if (id && this.server?.zustand === 'klingelt') this.d.gateway.send({ type: 'anruf:ablehnen', meldungId: id });
  }

  spaeter(): void {
    const id = this.meldungId();
    if (id && this.server?.zustand === 'klingelt') this.d.gateway.send({ type: 'anruf:spaeter', meldungId: id });
  }

  auflegen(): void {
    const s = this.server;
    const leitungId = s?.zustand === 'offen' && s.eigener ? s.leitung?.leitungId : undefined;
    const id = this.eigen?.meldungId ?? this.meldungId() ?? leitungId;
    if (id) this.beendetIds.add(id);
    this.beendeEigen();
    this.letzterEigenerId = null;
    if (id && ((s?.meldung?.id === id && LAEUFT.has(s.zustand)) || id === leitungId)) this.aufgelegtId = id;
    if (id) this.d.gateway.send({ type: 'anruf:auflegen', meldungId: id });
    this.emit();
  }

  /** Bell „Anrufen" (FA-12): the backend id of the session. */
  anrufen(sessionId: string): void {
    this.d.gateway.send({ type: 'anruf:anrufen', sessionId });
  }

  /** Button „Senden" (FA-20): the shown text, same way as the closing phrase; held text resends. */
  senden(): void {
    const e = this.eigen;
    const m = this.server?.meldung;
    if (!e || !m) return;
    if (e.diktat.gehalten && e.gesendet) {
      this.sendeAntwort(e.gesendet);
      return;
    }
    const text = ohneSchluss(e.diktat.text);
    if (!text) return;
    this.schliesseAb(e, m, text);
  }

  /** Button „Verwerfen" (FA-20): clears the text, listening goes on. */
  verwerfen(): void {
    const e = this.eigen;
    if (!e) return;
    e.diktat.leeren();
    e.gesendet = undefined;
    e.hinweis = undefined;
    if (this.hoeren) this.hoeren.ausgewertet = '';
    this.emit();
  }

  /** „Nochmal" (FA-02, D7): microphone closed, read again from the start, then listen; the text stays. */
  nochmal(): void {
    const e = this.eigen;
    const m = this.server?.meldung;
    if (!e || !m) return;
    e.hinweis = undefined;
    if (this.inNachfrage(e)) void this.vorleseDannHoere(this.nachfrageText(m), 'nachfrage');
    else this.vorlesen();
    this.emit();
  }

  /** Button „Zuhören" (FA-21): opens the microphone again. */
  zuhoeren(): void {
    const e = this.eigen;
    if (!e || e.phase !== 'mikrofon_zu') return;
    e.hinweis = e.diktat.gehalten ? e.hinweis : undefined;
    void this.hoereZu(this.inNachfrage(e) ? 'nachfrage' : 'antwort');
  }

  /** Plan: ask for the confirmation (FA-14); the backend answers with state freigabe_nachfrage. */
  freigebenAnfragen(): void {
    const e = this.eigen;
    const m = this.server?.meldung;
    if (!e || !m || m.art !== 'plan') return;
    e.nachfrageVerlassen = false;
    e.hinweis = undefined;
    e.diktat.leeren();
    if (this.server?.zustand === 'freigabe_nachfrage') {
      void this.vorleseDannHoere(this.nachfrageText(m), 'nachfrage');
    } else {
      this.stoppeZuhoeren();
      e.phase = 'vorlesen';
      this.d.gateway.send({ type: 'anruf:freigeben.anfragen', meldungId: e.meldungId });
    }
    this.emit();
  }

  /** Confirmation „ja" / button „Freigeben" — only in freigabe_nachfrage (FA-14). */
  freigeben(): void {
    if (this.server?.zustand !== 'freigabe_nachfrage' || !this.eigen || this.eigen.nachfrageVerlassen) return;
    this.sendeAntwort({ art: 'freigeben' });
  }

  /** „Nein" at the confirmation: back to the plan, nothing released; listening again. */
  nein(): void {
    const e = this.eigen;
    if (!e) return;
    e.nachfrageVerlassen = true;
    e.diktat.leeren();
    e.hinweis = ANRUF_TEXT.nichtFreigegeben;
    void this.vorleseDannHoere(ANRUF_TEXT.nichtFreigegeben, 'antwort');
    this.emit();
  }

  private inNachfrage(e: EigenerAnruf): boolean {
    return this.server?.zustand === 'freigabe_nachfrage' && !e.nachfrageVerlassen;
  }

  private sendeAntwort(antwort: AnrufAntwort): void {
    const e = this.eigen;
    if (!e) return;
    this.stoppeZuhoeren();
    this.brichVorlesenAb();
    e.phase = 'sendet';
    e.hinweis = undefined;
    e.gesendet = antwort;
    this.d.gateway.send({ type: 'anruf:senden', meldungId: e.meldungId, antwort });
    this.emit();
  }

  // -- reading aloud (D4) -----------------------------------------------------

  /**
   * Reads `text` sentence-wise; resolves once: `fertig` after the last
   * sentence (end signal, or `aktiv()` false twice, or the hard limit —
   * then speech is cancelled), `abgebrochen` when newer speech or a cancel
   * came first.
   */
  private sprich(text: string): Promise<VorleseErgebnis> {
    this.brichVorlesenAb();
    const sp = this.d.sprache;
    const stimme = waehleStimme(sp.getVoices());
    const liste = saetze(text);
    if (!stimme || liste.length === 0) return Promise.resolve('fertig');
    return new Promise<VorleseErgebnis>((resolve) => {
      let erledigt = false;
      let aus = 0;
      const ende = (ergebnis: VorleseErgebnis): void => {
        if (erledigt) return;
        erledigt = true;
        clearInterval(pruef);
        clearTimeout(frist);
        if (this.vorleseAbbruch === abbruch) this.vorleseAbbruch = null;
        resolve(ergebnis);
      };
      const abbruch = (): void => ende('abgebrochen');
      this.vorleseAbbruch = abbruch;
      liste.forEach((satz, i) => {
        sp.speak(satz, stimme, i === liste.length - 1 ? (ok) => ende(ok ? 'fertig' : 'abgebrochen') : undefined);
      });
      const pruef = setInterval(() => {
        aus = sp.aktiv() ? 0 : aus + 1;
        if (aus >= 2) ende('fertig');
      }, ANRUF_VORLESE_PRUEF_MS);
      // Chrome pauses speech in a background tab and keeps `speaking` true (R11): give up, listen anyway.
      const frist = setTimeout(() => {
        ende('fertig');
        sp.cancel();
      }, vorleseFristMs(text));
    });
  }

  private brichVorlesenAb(): void {
    const abbruch = this.vorleseAbbruch;
    this.vorleseAbbruch = null;
    abbruch?.();
    this.d.sprache.cancel();
  }

  /** A message from the open line: one note, then read it like after accepting (AK-03, AK-11). */
  private hinweisDannVorlesen(): void {
    const e = this.eigen;
    if (!e) return;
    // Cuts „Gesendet." when the next message comes quickly (R5).
    this.brichVorlesenAb();
    e.phase = 'vorlesen';
    this.d.hinweiston();
    this.hinweisTimer = setTimeout(() => {
      this.hinweisTimer = null;
      if (this.eigen === e && e.phase === 'vorlesen') this.vorlesen();
    }, ANRUF_HINWEIS_VORLAUF_MS);
  }

  /** Reads the message (or the current question); listens afterwards unless there is nothing to answer. */
  private vorlesen(): void {
    const m = this.server?.meldung;
    const e = this.eigen;
    if (!m || !e) return;
    const text = vorleseTextFuer(m, e.frageIndex);
    if (nurTerminal(m)) {
      this.stoppeZuhoeren();
      e.phase = 'vorlesen';
      void this.sprich(text);
      return;
    }
    void this.vorleseDannHoere(text, 'antwort');
  }

  /** Microphone closed while speaking (FA-02); opens after the last word (FA-01). */
  private async vorleseDannHoere(text: string, kontext: SprechKontext): Promise<void> {
    const e = this.eigen;
    if (!e) return;
    this.stoppeZuhoeren();
    e.phase = 'vorlesen';
    e.kontext = kontext;
    this.emit();
    const ergebnis = await this.sprich(text);
    if (ergebnis === 'fertig' && this.eigen === e && e.phase === 'vorlesen') await this.hoereZu(kontext);
  }

  private nachfrageText(m: AnrufMeldung): string {
    return `Plan für Sitzung ${sitzungText(m)} wirklich freigeben? ${ANRUF_TEXT.jaOderNein}`;
  }

  // -- listening (D2, D3) -----------------------------------------------------

  /** Opens the microphone for the own running call; idempotent while one is open or opening. */
  private async hoereZu(kontext: SprechKontext): Promise<void> {
    const e = this.eigen;
    const m = this.server?.meldung;
    if (!e || !m || nurTerminal(m) || this.hoeren || e.phase === 'sendet') return;
    const lauf: Zuhoeren = { ruhigAb: 0, ausgewertet: '' };
    this.hoeren = lauf;
    e.kontext = kontext;
    e.diktat.markiere();

    let strom: AnrufMikrofonStrom;
    try {
      strom = await this.d.mikrofon.oeffne();
    } catch (err) {
      if (this.hoeren !== lauf) return;
      this.hoeren = null;
      const name = typeof err === 'object' && err !== null && 'name' in err ? String(err.name) : '';
      this.mikrofonFehler(name === 'NotAllowedError' || name === 'SecurityError' ? 'verweigert' : 'fehlt');
      return;
    }
    if (this.hoeren !== lauf) {
      strom.stoppe();
      return;
    }
    lauf.strom = strom;
    strom.beiEnde(() => {
      if (this.hoeren === lauf) this.mikrofonFehler('fehlt');
    });
    let aufnahme: AnrufAufnahme;
    try {
      aufnahme = await strom.starteAufnahme((chunk) => this.chunk(lauf, chunk));
    } catch {
      strom.stoppe();
      if (this.hoeren === lauf) {
        this.hoeren = null;
        this.mikrofonFehler('fehlt');
      }
      return;
    }
    if (this.hoeren !== lauf) {
      aufnahme.stop();
      strom.stoppe();
      return;
    }
    lauf.aufnahme = aufnahme;
    lauf.pausen = new Sprechpausen({
      rate: aufnahme.sampleRate,
      ...(e.grundrauschen !== undefined ? { grundrauschen: e.grundrauschen } : {}),
      onStueck: (pcm, _start, endeSek) => this.stueck(lauf, pcm, endeSek),
      onRuhe: () => {
        lauf.ruhigAb = lauf.pausen?.jetztSek ?? lauf.ruhigAb;
        this.werteAusWennBereit();
      },
    });
    // „Ich höre zu" only once the recording runs (R8).
    e.phase = 'zuhoeren';
    this.emit();
  }

  private chunk(lauf: Zuhoeren, chunk: Float32Array): void {
    const p = lauf.pausen;
    if (!p || this.hoeren !== lauf) return;
    p.fuettere(chunk);
    const e = this.eigen;
    if (!e || this.hoeren !== lauf) return;
    if (p.grundrauschen !== undefined) e.grundrauschen = p.grundrauschen;
    this.pruefeStille(lauf, e);
  }

  /** A spoken piece: numbered to the recognition (D5), with a 15-s limit (Finding 9). */
  private stueck(lauf: Zuhoeren, pcm: Int16Array, endeSek: number): void {
    const e = this.eigen;
    if (!e || this.hoeren !== lauf) return;
    const nr = e.diktat.neuesStueck(pcm.length / ANRUF_RATE, endeSek);
    lauf.ruhigAb = endeSek;
    const meldungId = e.meldungId;
    this.fristen.set(
      nr,
      setTimeout(() => {
        this.fristen.delete(nr);
        const jetzt = this.eigen;
        if (!jetzt || jetzt.meldungId !== meldungId || !jetzt.diktat.ergebnis(nr, null)) return;
        jetzt.hinweis = ANRUF_TEXT.nichtsVerstanden;
        this.werteAusWennBereit();
        this.emit();
      }, ANRUF_ERKENNUNG_FRIST_MS)
    );
    this.d.gateway.send({ type: 'anruf:erkennen', meldungId, audio: int16ZuBase64(pcm), abschnitt: nr });
    this.emit();
  }

  /**
   * 20 s without recognised words since opening or the last words (FA-09):
   * hang up without sending. Never while a recognition is open; while a piece
   * is open only after a forced cut could have been recognised (R4, ≤ 50 s).
   */
  private pruefeStille(lauf: Zuhoeren, e: EigenerAnruf): void {
    const p = lauf.pausen;
    if (!p || e.phase !== 'zuhoeren' || e.diktat.offen > 0) return;
    const seit = p.jetztSek - (e.diktat.letzteSpracheSek ?? 0);
    if (seit < ANRUF_STILLE_S) return;
    if (p.sprichtGerade && seit < ANRUF_STILLE_S + ANRUF_AUDIO_MAX_S) return;
    this.stilleAuflegen();
  }

  private stilleAuflegen(): void {
    this.auflegen();
    this.setzeErgebnis({ ok: false, text: ANRUF_TEXT.keineAntwort, glocke: true });
    void this.sprich(`${ANRUF_TEXT.keineAntwort}.`);
    this.emit();
  }

  /**
   * Evaluates once every piece has its text and no level came after the last
   * piece (Finding 1, R6) — otherwise the next piece or `onRuhe` retries.
   */
  private werteAusWennBereit(): void {
    const e = this.eigen;
    const lauf = this.hoeren;
    const m = this.server?.meldung;
    if (!e || !lauf || !m || e.phase !== 'zuhoeren' || !lauf.pausen) return;
    if (e.diktat.offen > 0 || lauf.pausen.sprichtGerade || lauf.pausen.pegelSeit(lauf.ruhigAb)) return;
    const neu = e.diktat.neu;
    if (!neu || neu === lauf.ausgewertet) return;
    lauf.ausgewertet = neu;
    this.werteAus(e, m, neu);
    this.emit();
  }

  private werteAus(e: EigenerAnruf, m: AnrufMeldung, neu: string): void {
    const d = e.diktat;
    // 1. Plan confirmation: only ja/nein (FA-14).
    if (e.kontext === 'nachfrage') {
      const b = deuteSprache(neu, 'nachfrage');
      if (b === 'auflegen') return this.auflegen();
      d.leeren();
      if (b === 'ja') return this.freigeben();
      if (b === 'nein') return this.nein();
      if (b === 'nochmal') return this.nochmal();
      // „ja, aber …" or anything else: not released, ask again.
      e.hinweis = `„${neu}“ — ${ANRUF_TEXT.nichtFreigegeben} ${ANRUF_TEXT.jaOderNein}`;
      void this.vorleseDannHoere(`${ANRUF_TEXT.nichtFreigegeben} ${ANRUF_TEXT.jaOderNein}`, 'nachfrage');
      return;
    }
    // 2. Single words, only as everything said since opening (FA-13).
    const b = deuteSprache(neu, 'antwort');
    if (b === 'auflegen') return this.auflegen();
    if (b === 'nochmal') {
      d.verwirfNeu();
      return this.nochmal();
    }
    if (b === 'freigeben' && m.art === 'plan') {
      d.verwirfNeu();
      return this.freigebenAnfragen();
    }
    // 3. Held text: nothing appended; only the closing phrase alone or „Antwort verwerfen" (D6).
    if (d.gehalten) {
      const s = pruefeSchluss(neu);
      if (s.art === 'senden' && !s.rest) return this.senden();
      if (s.art === 'verwerfen') return this.verworfen(e);
      d.verwirfNeu();
      e.hinweis = ANRUF_TEXT.gehaltenHinweis;
      return;
    }
    // 4. Closing phrase at the end of everything said (FA-05–FA-08, FA-12).
    const s = pruefeSchluss(d.text);
    if (s.art === 'senden') {
      if (s.rest) return this.schliesseAb(e, m, s.rest);
      d.leeren();
      e.hinweis = ANRUF_TEXT.nochKeineAntwort;
      void this.vorleseDannHoere(ANRUF_TEXT.nochKeineAntwort, 'antwort');
      return;
    }
    if (s.art === 'verwerfen') return this.verworfen(e);
    if (s.art === 'nur_senden') e.hinweis = ANRUF_TEXT.schlussHinweis;
    else if (e.hinweis === ANRUF_TEXT.schlussHinweis || e.hinweis === ANRUF_TEXT.nichtsVerstanden) e.hinweis = undefined;
    // 5. Two minutes per question (FA-11): nothing sent, text held, microphone off.
    if (d.sekunden >= ANRUF_ANTWORT_MAX_S) {
      d.halten();
      this.stoppeZuhoeren();
      e.phase = 'mikrofon_zu';
      e.hinweis = ANRUF_TEXT.zuLang;
      void this.sprich(`${ANRUF_TEXT.zuLang}.`);
    }
  }

  private verworfen(e: EigenerAnruf): void {
    e.diktat.leeren();
    e.gesendet = undefined;
    e.hinweis = ANRUF_TEXT.verworfen;
    void this.vorleseDannHoere(`${ANRUF_TEXT.verworfen}.`, 'antwort');
  }

  /** Answer complete: next question, or send (FA-15, FA-16). */
  private schliesseAb(e: EigenerAnruf, m: AnrufMeldung, text: string): void {
    const k = this.kandidatAus(m, e.frageIndex, text);
    if (k.art === 'antwort') {
      this.sendeAntwort(k.antwort);
      return;
    }
    if (k.mehrdeutig) {
      e.diktat.leeren();
      e.hinweis = `Passt auf ${k.mehrdeutig.join(' und ')} — Nummer sagen`;
      void this.vorleseDannHoere(e.hinweis, 'antwort');
      return;
    }
    const anzahl = m.fragen?.length ?? 1;
    if (e.frageIndex < anzahl - 1) {
      e.antworten = [...e.antworten, k.teil];
      e.frageIndex += 1;
      e.diktat.leeren();
      e.hinweis = undefined;
      this.vorlesen();
      this.emit();
      return;
    }
    this.sendeAntwort({ art: 'rueckfrage', antworten: [...e.antworten, k.teil] });
  }

  /**
   * Microphone cannot open or went away (FA-21, D9): announce, show
   * „Zuhören", no hang-up. A denial is reported to the backend only after the call.
   */
  private mikrofonFehler(grund: AnrufMikrofon): void {
    this.stoppeZuhoeren();
    const e = this.eigen;
    if (grund === 'verweigert') this.modus = { ...this.modus, mikrofon: 'verweigert' };
    if (!e) return;
    const text = grund === 'verweigert' ? ANRUF_TEXT.mikrofonVerweigert : ANRUF_TEXT.mikrofonWeg;
    e.phase = 'mikrofon_zu';
    e.hinweis = text;
    void this.sprich(`${text}.`);
    this.emit();
  }

  private stoppeZuhoeren(): void {
    const lauf = this.hoeren;
    if (!lauf) return;
    this.hoeren = null;
    lauf.aufnahme?.stop();
    lauf.strom?.stoppe();
    lauf.pausen = undefined;
  }

  // -- interpretation (FA-15, FA-16) ------------------------------------------

  private kandidatAus(m: AnrufMeldung, index: number, text: string): Kandidat {
    const erkannt = text.trim();
    if (m.art === 'fertig') {
      return { art: 'antwort', als: `Neue Eingabe an Sitzung ${sitzungText(m)}`, antwort: { art: 'text', text: erkannt } };
    }
    if (m.art === 'plan') {
      return { art: 'antwort', als: 'Überarbeitungswunsch', antwort: { art: 'ueberarbeiten', text: erkannt } };
    }
    const fragen = m.fragen ?? [];
    const frage = fragen[index];
    const vonN = fragen.length > 1 ? ` (Frage ${index + 1} von ${fragen.length})` : '';
    if (!frage) return { art: 'frage', als: `Eigene Antwort${vonN}`, teil: { nummern: [], eigene: erkannt } };
    const wahl = waehleMoeglichkeit(erkannt, frage.optionen, frage.mehrfach);
    if ('nummern' in wahl) {
      const texte = wahl.nummern.map((n) => frage.optionen[n - 1] ?? '').join(', ');
      const kopf = wahl.nummern.length === 1 ? `Möglichkeit ${wahl.nummern[0]}` : `Möglichkeiten ${wahl.nummern.join(', ')}`;
      return { art: 'frage', als: `${kopf} — ${texte}${vonN}`, teil: { nummern: wahl.nummern } };
    }
    return {
      art: 'frage',
      als: `Eigene Antwort${vonN}`,
      teil: { nummern: [], eigene: erkannt },
      ...('mehrdeutig' in wahl ? { mehrdeutig: wahl.mehrdeutig } : {}),
    };
  }

  // -- housekeeping -----------------------------------------------------------

  private beendeEigen(): void {
    if (this.hinweisTimer) clearTimeout(this.hinweisTimer);
    this.hinweisTimer = null;
    this.stoppeZuhoeren();
    for (const t of this.fristen.values()) clearTimeout(t);
    this.fristen.clear();
    if (this.eigen) {
      this.brichVorlesenAb();
      this.eigen.diktat.leeren();
    }
    this.eigen = null;
    // Capability held back during the call (D9).
    this.meldeFaehig();
  }

  private setzeErgebnis(ergebnis: AnrufErgebnis | undefined): void {
    if (this.ergebnisTimer) clearTimeout(this.ergebnisTimer);
    this.ergebnisTimer = null;
    this.ergebnis = ergebnis;
    if (ergebnis) {
      this.ergebnisTimer = setTimeout(() => {
        this.ergebnis = undefined;
        this.ergebnisTimer = null;
        this.emit();
      }, ANRUF_ERGEBNIS_MS);
    }
  }
}

// ---------------------------------------------------------------------------
// Browser implementation
// ---------------------------------------------------------------------------

const WORKLET_NAME = 'aos-anruf-aufnahme';
const WORKLET_QUELLE = `class P extends AudioWorkletProcessor{process(i){const c=i[0]&&i[0][0];if(c)this.port.postMessage(c.slice(0));return true}}registerProcessor('${WORKLET_NAME}',P);`;

function stromAus(stream: MediaStream): AnrufMikrofonStrom {
  return {
    stoppe: () => {
      for (const t of stream.getTracks()) t.stop();
    },
    beiEnde: (cb) => {
      for (const t of stream.getAudioTracks()) t.addEventListener('ended', () => cb());
    },
    starteAufnahme: async (onChunk) => {
      const ctx = new AudioContext();
      const url = URL.createObjectURL(new Blob([WORKLET_QUELLE], { type: 'application/javascript' }));
      try {
        await ctx.audioWorklet.addModule(url);
      } finally {
        URL.revokeObjectURL(url);
      }
      const quelle = ctx.createMediaStreamSource(stream);
      const knoten = new AudioWorkletNode(ctx, WORKLET_NAME);
      const stumm = ctx.createGain();
      stumm.gain.value = 0;
      knoten.port.onmessage = (ev: MessageEvent<Float32Array>) => onChunk(ev.data);
      // Connected to a muted gain so the graph is pulled, nothing is heard.
      quelle.connect(knoten).connect(stumm).connect(ctx.destination);
      return {
        sampleRate: ctx.sampleRate,
        stop: () => {
          knoten.port.onmessage = null;
          quelle.disconnect();
          knoten.disconnect();
          void ctx.close();
        },
      };
    },
  };
}

function browserDeps(): AnrufDeps {
  const synth = (): SpeechSynthesis | undefined => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : undefined);
  const mediaDevices = (): MediaDevices | undefined => (typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined);
  const permission = async (): Promise<PermissionStatus | null> => {
    try {
      return (await navigator.permissions?.query({ name: 'microphone' })) ?? null;
    } catch {
      return null;
    }
  };
  return {
    gateway,
    sprache: {
      getVoices: () => synth()?.getVoices() ?? [],
      speak: (text, stimme, beiEnde) => {
        const s = synth();
        if (!s || typeof SpeechSynthesisUtterance === 'undefined') {
          beiEnde?.(true);
          return;
        }
        const u = new SpeechSynthesisUtterance(text);
        const voice = s.getVoices().find((v) => v.name === stimme.name && v.lang === stimme.lang);
        if (voice) u.voice = voice;
        u.lang = stimme.lang;
        if (beiEnde) {
          u.onend = () => beiEnde(true);
          // Cancelled speech must not open the microphone; any other error ends reading (D4).
          u.onerror = (ev) => beiEnde(ev.error !== 'interrupted' && ev.error !== 'canceled');
        }
        s.speak(u);
      },
      cancel: () => synth()?.cancel(),
      aktiv: () => {
        const s = synth();
        return !!s && (s.speaking || s.pending);
      },
      onVoicesChanged: (cb) => synth()?.addEventListener('voiceschanged', cb),
    },
    mikrofon: {
      vorhanden: () => typeof mediaDevices()?.getUserMedia === 'function',
      erlaubnis: async () => (await permission())?.state ?? 'unbekannt',
      onErlaubnisAenderung: (cb) => {
        void permission().then((p) => p?.addEventListener('change', cb));
      },
      hatEingang: async () => {
        const md = mediaDevices();
        if (!md?.enumerateDevices) return true;
        try {
          return (await md.enumerateDevices()).some((dev) => dev.kind === 'audioinput');
        } catch {
          return true;
        }
      },
      oeffne: async () => {
        const md = mediaDevices();
        if (!md) throw new DOMException('Kein Mikrofon', 'NotFoundError');
        const stream = await md.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
        return stromAus(stream);
      },
    },
    mitteilung: {
      erlaubnis: () => (typeof Notification === 'undefined' ? 'fehlt' : Notification.permission),
      anfragen: async () => {
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') await Notification.requestPermission();
      },
      zeige: (titel, body, tag) => {
        if (typeof Notification === 'undefined') return;
        const n = new Notification(titel, { body, tag });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      },
    },
    istVersteckt: () => typeof document !== 'undefined' && document.hidden,
    klingeln: () => playAnrufKlingeln(),
    hinweiston: () => playAnrufHinweis(),
  };
}

export const anrufService = new AnrufClientService();
