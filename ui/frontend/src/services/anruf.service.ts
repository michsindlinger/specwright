/**
 * AnrufClientService (INT-2026-025, D4, D6, D11) — the browser side of the
 * call mode. Mirrors `anruf:state` / `anruf:verfuegbarkeit` from the backend
 * (which owns queue and call state, AR-05) and adds what only a browser can
 * do: ring, read aloud (`speechSynthesis`, local German voice), record the
 * answer (microphone only between „Sprechen" and „Fertig", 16 kHz Int16,
 * ≤ 30 s), interpret spoken commands and send the answer.
 *
 * Every browser API sits behind {@link AnrufDeps}, so tests run with fakes.
 * Nothing here is persisted or logged: recognised text and audio live in
 * memory until the call ends (FA-27).
 */

import { gateway, type WebSocketMessage } from '../gateway.js';
import { playAnrufKlingeln } from '../components/terminal/notification-sound.js';
import {
  ANRUF_AUDIO_MAX_S,
  ANRUF_KLINGEL_ABSTAND_MS,
  ANRUF_KLINGEL_WIEDERHOLUNGEN,
  ANRUF_NICHT_VERFUEGBAR_TEXT,
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
import { deuteSprache, waehleMoeglichkeit } from '../../../src/shared/anruf-befehle.js';
import { ANRUF_RATE, dauerSekunden, downsampleAuf16k, int16ZuBase64, rms } from '../../../src/shared/anruf-audio.js';
import { frageVorlesen } from '../../../src/shared/anruf-text.js';

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
  /** Queues one utterance with this voice. */
  speak(text: string, stimme: AnrufStimme): void;
  cancel(): void;
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
  /** getUserMedia — only between „Sprechen" and „Fertig" (FA-19). Rejects with a DOMException-like `{ name }`. */
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
}

// ---------------------------------------------------------------------------
// View model
// ---------------------------------------------------------------------------

export type AnrufPhase =
  | 'ruhe'
  | 'klingelt'
  | 'fremd'
  | 'vorlesen'
  | 'hoeren'
  | 'erkennen'
  | 'bestaetigen'
  | 'nachfrage'
  | 'sendet'
  | 'ergebnis';

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
  /** Recognised text awaiting confirmation. */
  erkannt?: string;
  /** „Wird gesendet als: …". */
  als?: string;
  /** Rückfrage: the confirmation advances to the next question instead of sending. */
  weiter: boolean;
  hinweis?: string;
  freigabeWortlaut?: string;
  ergebnis?: { ok: boolean; text: string };
}

export type AnrufListener = (ansicht: AnrufAnsicht) => void;

// ---------------------------------------------------------------------------
// Texts and pure helpers
// ---------------------------------------------------------------------------

export const ANRUF_ART_LABEL: Record<AnrufArt, string> = { rueckfrage: 'Rückfrage', plan: 'Plan', fertig: 'Fertig' };

/** Below this RMS (≈ −40 dBFS) the recording counts as silence (D3, Review F14). */
export const ANRUF_RMS_SCHWELLE = 0.01;
export const ANRUF_MIN_DAUER_S = 0.4;
export const ANRUF_ERGEBNIS_MS = 3000;

export const ANRUF_TEXT = {
  nichtsVerstanden: 'Nichts verstanden — nochmal sprechen',
  erkennungNeustart: 'Nicht verstanden — Spracherkennung startet neu, bitte nochmal sprechen',
  erkennungFehlt: 'Spracherkennung nicht verfügbar — bitte im Terminal antworten',
  mikrofonWeg: 'Mikrofon nicht verfügbar',
  keineSprechfassungAnfang: 'Keine Sprechfassung — hier der Anfang der Antwort.',
  keineSprechfassungTerminal: 'Keine Sprechfassung — die Antwort steht nur im Terminal.',
  gesendet: 'Gesendet',
  andereFenster: 'Anruf läuft in einem anderen Fenster',
  besetzt: 'Erst den laufenden Anruf beenden',
  nichtFreigegeben: 'Nicht freigegeben.',
  jaOderNein: 'Sag ja oder nein.',
  nochKeineAntwort: 'Noch keine Antwort — erst sprechen.',
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

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

type Kandidat =
  | { erkannt: string; als: string; art: 'antwort'; antwort: AnrufAntwort }
  | { erkannt: string; als: string; art: 'frage'; teil: AnrufFrageAntwort };

type SprechKontext = 'antwort' | 'bestaetigen' | 'nachfrage';

interface EigenerAnruf {
  meldungId: string;
  phase: 'vorlesen' | 'hoeren' | 'erkennen' | 'bestaetigen' | 'sendet';
  frageIndex: number;
  antworten: AnrufFrageAntwort[];
  kandidat?: Kandidat;
  hinweis?: string;
  kontext: SprechKontext;
  /** „Nein" at the plan confirmation: show the plan again (server stays in freigabe_nachfrage). */
  nachfrageVerlassen: boolean;
}

interface LaufendeAufnahme {
  chunks: Float32Array[];
  strom?: AnrufMikrofonStrom;
  aufnahme?: AnrufAufnahme;
  timer?: ReturnType<typeof setTimeout>;
  endeAngefordert: boolean;
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
  private aufnahme: LaufendeAufnahme | null = null;
  private ergebnis: { ok: boolean; text: string } | undefined;
  private ergebnisTimer: ReturnType<typeof setTimeout> | null = null;
  private klingelId: string | null = null;
  private klingelTimer: ReturnType<typeof setTimeout>[] = [];
  private letzterEigenerId: string | null = null;
  /** Hung up here; ignore `laeuft` for it until the backend confirms the end. */
  private aufgelegtId: string | null = null;
  private beendetIds = new Set<string>();

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
      ...(e?.kandidat ? { erkannt: e.kandidat.erkannt, als: e.kandidat.als } : {}),
      weiter: e?.kandidat?.art === 'frage' && frageIndex < (meldung?.fragen?.length ?? 1) - 1,
      ...(e?.hinweis ? { hinweis: e.hinweis } : {}),
      ...(s?.freigabeWortlaut ? { freigabeWortlaut: s.freigabeWortlaut } : {}),
      ...(this.ergebnis ? { ergebnis: this.ergebnis } : {}),
    };
  }

  private phase(): AnrufPhase {
    const s = this.server;
    if (s?.zustand === 'klingelt' && s.meldung) return 'klingelt';
    if (s && LAEUFT.has(s.zustand) && s.meldung) {
      if (!s.eigener) return 'fremd';
      if (s.meldung.id === this.aufgelegtId) return this.ergebnis ? 'ergebnis' : 'ruhe';
      if (s.zustand === 'sendet') return 'sendet';
      const e = this.eigen;
      if (!e) return 'vorlesen';
      if (s.zustand === 'freigabe_nachfrage' && !e.nachfrageVerlassen && e.phase !== 'hoeren' && e.phase !== 'erkennen' && e.phase !== 'sendet') return 'nachfrage';
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

    if (!(LAEUFT.has(neu.zustand) && m && m.id === this.aufgelegtId)) this.aufgelegtId = null;
    const eigenLaeuft = LAEUFT.has(neu.zustand) && neu.eigener && m !== undefined && m.id !== this.aufgelegtId;
    if (eigenLaeuft && m) {
      if (!this.eigen || this.eigen.meldungId !== m.id) {
        this.beendeEigen();
        this.eigen = { meldungId: m.id, phase: 'vorlesen', frageIndex: 0, antworten: [], kontext: 'antwort', nachfrageVerlassen: false };
        this.letzterEigenerId = m.id;
        this.setzeErgebnis(undefined);
        this.vorlesen();
      } else if (neu.zustand === 'freigabe_nachfrage' && alt?.zustand !== 'freigabe_nachfrage') {
        this.eigen.nachfrageVerlassen = false;
        this.eigen.hinweis = undefined;
        this.sprich(this.nachfrageText(m));
      }
    } else if (this.eigen || this.letzterEigenerId) {
      // Own call ended — by us, by an answer, or elsewhere (FA-11, AN-S08).
      const id = this.eigen?.meldungId ?? this.letzterEigenerId;
      this.beendeEigen();
      this.letzterEigenerId = null;
      if (id && !this.beendetIds.has(id) && neu.endeGrund) {
        this.setzeErgebnis({ ok: false, text: neu.endeGrund });
        this.sprich(neu.endeGrund);
      }
      if (id) this.beendetIds.add(id);
    }
    this.emit();
  };

  private readonly onErkannt = (msg: WebSocketMessage): void => {
    const m = msg as unknown as AnrufErkanntMessage;
    const e = this.eigen;
    if (!e || e.meldungId !== m.meldungId || e.phase !== 'erkennen') return;
    const zurueck = e.kontext === 'bestaetigen' && e.kandidat ? 'bestaetigen' : 'vorlesen';
    if ('grund' in m) {
      e.phase = zurueck;
      e.hinweis = m.grund === 'nichts_verstanden' ? ANRUF_TEXT.nichtsVerstanden : m.grund === 'erkennung_neustart' ? ANRUF_TEXT.erkennungNeustart : ANRUF_TEXT.erkennungFehlt;
      this.sprich(e.hinweis);
      this.emit();
      return;
    }
    this.verarbeiteText(e, m.text);
    this.emit();
  };

  private readonly onErgebnis = (msg: WebSocketMessage): void => {
    const m = msg as unknown as AnrufErgebnisMessage;
    const e = this.eigen;
    if (m.ok) {
      this.beendetIds.add(m.meldungId);
      this.setzeErgebnis({ ok: true, text: ANRUF_TEXT.gesendet });
      this.sprich(`${ANRUF_TEXT.gesendet}.`);
      if (e && e.meldungId === m.meldungId) this.beendeEigen();
    } else {
      const text = m.text;
      this.setzeErgebnis({ ok: false, text });
      this.sprich(`Nicht gesendet. ${text}`);
      if (e && e.meldungId === m.meldungId) {
        // The call may stay open (e.g. text in the input line): the recognised text stays visible.
        e.phase = e.kandidat ? 'bestaetigen' : 'vorlesen';
        e.hinweis = `Nicht gesendet: ${text}`;
      }
    }
    this.emit();
  };

  private readonly onError = (msg: WebSocketMessage): void => {
    const m = msg as unknown as AnrufErrorMessage;
    if (m.code === 'ANRUF_NICHT_LOKAL') return;
    const text = m.code === 'ANRUF_BESETZT' ? ANRUF_TEXT.besetzt : m.message;
    const e = this.eigen;
    if (e && this.phase() !== 'ruhe') {
      if (e.phase === 'sendet') e.phase = e.kandidat ? 'bestaetigen' : 'vorlesen';
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

  private meldeFaehig(): void {
    if (!this.modus.lokal) return;
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
    const id = this.eigen?.meldungId ?? this.meldungId();
    if (id) this.beendetIds.add(id);
    this.beendeEigen();
    this.letzterEigenerId = null;
    if (id && this.server?.meldung?.id === id && LAEUFT.has(this.server.zustand)) this.aufgelegtId = id;
    if (id) this.d.gateway.send({ type: 'anruf:auflegen', meldungId: id });
    this.emit();
  }

  /** Bell „Anrufen" (FA-12): the backend id of the session. */
  anrufen(sessionId: string): void {
    this.d.gateway.send({ type: 'anruf:anrufen', sessionId });
  }

  /** Raw send (FA-20): the confirmed answer. */
  senden(antwort: AnrufAntwort): void {
    const e = this.eigen;
    if (!e) return;
    e.phase = 'sendet';
    e.hinweis = undefined;
    this.d.gateway.send({ type: 'anruf:senden', meldungId: e.meldungId, antwort });
    this.emit();
  }

  /** „Senden" on the confirmation: next question, or send (FA-21: only after the last one). */
  absenden(): void {
    const e = this.eigen;
    const m = this.server?.meldung;
    if (!e || !e.kandidat || !m) return;
    const k = e.kandidat;
    if (k.art === 'antwort') {
      this.senden(k.antwort);
      return;
    }
    const anzahl = m.fragen?.length ?? 1;
    if (e.frageIndex < anzahl - 1) {
      e.antworten = [...e.antworten, k.teil];
      e.frageIndex += 1;
      e.kandidat = undefined;
      e.hinweis = undefined;
      e.phase = 'vorlesen';
      this.vorlesen();
      this.emit();
      return;
    }
    this.senden({ art: 'rueckfrage', antworten: [...e.antworten, k.teil] });
  }

  verwerfen(): void {
    const e = this.eigen;
    if (!e) return;
    e.kandidat = undefined;
    e.hinweis = undefined;
    e.phase = 'vorlesen';
    this.d.sprache.cancel();
    this.emit();
  }

  /** „Nochmal sprechen": drop the candidate and record again. */
  nochmalSprechen(): void {
    const e = this.eigen;
    if (!e) return;
    e.kandidat = undefined;
    e.phase = 'vorlesen';
    void this.sprechenStart();
  }

  /** „Nochmal" (FA-18): stop reading and read again from the start. */
  nochmal(): void {
    if (!this.eigen) return;
    this.eigen.hinweis = undefined;
    this.vorlesen();
    this.emit();
  }

  /** Plan: ask for the confirmation (FA-22); the backend answers with state freigabe_nachfrage. */
  freigebenAnfragen(): void {
    const e = this.eigen;
    const m = this.server?.meldung;
    if (!e || !m || m.art !== 'plan') return;
    e.nachfrageVerlassen = false;
    e.kandidat = undefined;
    e.hinweis = undefined;
    if (this.server?.zustand === 'freigabe_nachfrage') {
      this.sprich(this.nachfrageText(m));
    } else {
      this.d.gateway.send({ type: 'anruf:freigeben.anfragen', meldungId: e.meldungId });
    }
    this.emit();
  }

  /** Confirmation „ja" / button „Freigeben" — only in freigabe_nachfrage (FA-22). */
  freigeben(): void {
    if (this.server?.zustand !== 'freigabe_nachfrage' || !this.eigen || this.eigen.nachfrageVerlassen) return;
    this.senden({ art: 'freigeben' });
  }

  /** „Nein" at the confirmation: back to the plan, nothing released. */
  nein(): void {
    const e = this.eigen;
    if (!e) return;
    e.nachfrageVerlassen = true;
    e.hinweis = ANRUF_TEXT.nichtFreigegeben;
    e.phase = 'vorlesen';
    this.sprich(ANRUF_TEXT.nichtFreigegeben);
    this.emit();
  }

  // -- reading aloud (D4) -----------------------------------------------------

  private sprich(text: string): void {
    const sp = this.d.sprache;
    sp.cancel();
    const stimme = waehleStimme(sp.getVoices());
    if (!stimme) return;
    for (const satz of saetze(text)) sp.speak(satz, stimme);
  }

  private vorlesen(): void {
    const m = this.server?.meldung;
    const e = this.eigen;
    if (!m || !e) return;
    this.sprich(vorleseTextFuer(m, e.frageIndex));
  }

  private nachfrageText(m: AnrufMeldung): string {
    return `Plan für Sitzung ${sitzungText(m)} wirklich freigeben? ${ANRUF_TEXT.jaOderNein}`;
  }

  // -- recording (FA-19, FA-26) -----------------------------------------------

  get nimmtAuf(): boolean {
    return this.aufnahme !== null;
  }

  /** „Sprechen" / space down: open the microphone, record ≤ 30 s. */
  async sprechenStart(): Promise<void> {
    const e = this.eigen;
    const m = this.server?.meldung;
    if (!e || !m || this.aufnahme || nurTerminal(m)) return;
    const phase = this.phase();
    if (phase !== 'vorlesen' && phase !== 'bestaetigen' && phase !== 'nachfrage') return;
    e.kontext = phase === 'nachfrage' ? 'nachfrage' : e.kandidat ? 'bestaetigen' : 'antwort';
    e.phase = 'hoeren';
    e.hinweis = undefined;
    this.d.sprache.cancel();
    const lauf: LaufendeAufnahme = { chunks: [], endeAngefordert: false };
    this.aufnahme = lauf;
    this.emit();

    let strom: AnrufMikrofonStrom;
    try {
      strom = await this.d.mikrofon.oeffne();
    } catch (err) {
      if (this.aufnahme !== lauf) return;
      this.aufnahme = null;
      const name = typeof err === 'object' && err !== null && 'name' in err ? String(err.name) : '';
      this.mikrofonWeg(name === 'NotAllowedError' || name === 'SecurityError' ? 'verweigert' : 'fehlt');
      return;
    }
    if (this.aufnahme !== lauf) {
      strom.stoppe();
      return;
    }
    lauf.strom = strom;
    strom.beiEnde(() => {
      if (this.aufnahme === lauf) this.mikrofonWeg('fehlt');
    });
    try {
      lauf.aufnahme = await strom.starteAufnahme((chunk) => lauf.chunks.push(chunk));
    } catch {
      strom.stoppe();
      if (this.aufnahme === lauf) {
        this.aufnahme = null;
        this.mikrofonWeg('fehlt');
      }
      return;
    }
    if (this.aufnahme !== lauf) {
      lauf.aufnahme.stop();
      strom.stoppe();
      return;
    }
    lauf.timer = setTimeout(() => this.sprechenEnde(), ANRUF_AUDIO_MAX_S * 1000);
    if (lauf.endeAngefordert) this.sprechenEnde();
  }

  /** „Fertig" / space up: stop tracks at once, check, send audio (FA-19, Review F14). */
  sprechenEnde(): void {
    const lauf = this.aufnahme;
    if (!lauf) return;
    if (!lauf.aufnahme) {
      lauf.endeAngefordert = true;
      return;
    }
    this.aufnahme = null;
    if (lauf.timer) clearTimeout(lauf.timer);
    const rate = lauf.aufnahme.sampleRate;
    lauf.aufnahme.stop();
    lauf.strom?.stoppe();
    const float = verbinde(lauf.chunks);
    lauf.chunks.length = 0;
    let pcm = downsampleAuf16k(float, rate);
    const max = ANRUF_RATE * ANRUF_AUDIO_MAX_S;
    if (pcm.length > max) pcm = pcm.subarray(0, max);

    const e = this.eigen;
    if (!e) return;
    if (dauerSekunden(pcm) < ANRUF_MIN_DAUER_S || rms(pcm) < ANRUF_RMS_SCHWELLE) {
      e.phase = e.kontext === 'bestaetigen' && e.kandidat ? 'bestaetigen' : 'vorlesen';
      e.hinweis = ANRUF_TEXT.nichtsVerstanden;
      this.sprich(e.hinweis);
      this.emit();
      return;
    }
    const audio = int16ZuBase64(pcm);
    pcm = new Int16Array(0);
    e.phase = 'erkennen';
    this.d.gateway.send({ type: 'anruf:erkennen', meldungId: e.meldungId, audio });
    this.emit();
  }

  /** Microphone gone during the call (Spec §4): announce, end without sending, report. */
  private mikrofonWeg(grund: AnrufMikrofon): void {
    this.stoppeAufnahme();
    const id = this.eigen?.meldungId;
    this.sprich(`${ANRUF_TEXT.mikrofonWeg}.`);
    if (id) {
      this.beendetIds.add(id);
      this.beendeEigen();
      this.letzterEigenerId = null;
      this.aufgelegtId = id;
      this.d.gateway.send({ type: 'anruf:auflegen', meldungId: id });
    }
    this.setzeErgebnis({ ok: false, text: ANRUF_TEXT.mikrofonWeg });
    this.modus = { ...this.modus, mikrofon: grund };
    this.meldeFaehig();
    this.emit();
  }

  private stoppeAufnahme(): void {
    const lauf = this.aufnahme;
    if (!lauf) return;
    this.aufnahme = null;
    if (lauf.timer) clearTimeout(lauf.timer);
    lauf.aufnahme?.stop();
    lauf.strom?.stoppe();
    lauf.chunks.length = 0;
  }

  // -- interpretation (FA-20…FA-22) -------------------------------------------

  private verarbeiteText(e: EigenerAnruf, text: string): void {
    const m = this.server?.meldung;
    if (!m) return;
    e.hinweis = undefined;
    if (e.kontext === 'nachfrage') {
      e.phase = 'vorlesen';
      const b = deuteSprache(text, 'nachfrage');
      if (b === 'ja') this.freigeben();
      else if (b === 'nein') this.nein();
      else {
        // „ja, aber …" or anything else: not released, ask again (Spec §4).
        e.hinweis = `„${text}“ — ${ANRUF_TEXT.nichtFreigegeben} ${ANRUF_TEXT.jaOderNein}`;
        this.sprich(`${ANRUF_TEXT.nichtFreigegeben} ${ANRUF_TEXT.jaOderNein}`);
      }
      return;
    }
    const b = deuteSprache(text, 'antwort');
    if (e.kontext === 'bestaetigen' && e.kandidat) {
      if (b === 'senden') {
        e.phase = 'bestaetigen';
        this.absenden();
        return;
      }
      if (b === 'verwerfen') {
        this.verwerfen();
        return;
      }
      if (b === 'nochmal') {
        this.nochmalSprechen();
        return;
      }
    } else {
      if (b === 'nochmal') {
        e.phase = 'vorlesen';
        this.nochmal();
        return;
      }
      if (b === 'freigeben' && m.art === 'plan') {
        e.phase = 'vorlesen';
        this.freigebenAnfragen();
        return;
      }
      if (b === 'senden' || b === 'verwerfen') {
        e.phase = 'vorlesen';
        e.hinweis = ANRUF_TEXT.nochKeineAntwort;
        this.sprich(e.hinweis);
        return;
      }
    }
    e.kandidat = this.kandidatAus(m, e.frageIndex, text);
    e.phase = 'bestaetigen';
    this.sprich(e.hinweis ? `${e.kandidat.als}. ${e.hinweis}.` : `${e.kandidat.als}. Senden oder verwerfen?`);
  }

  private kandidatAus(m: AnrufMeldung, index: number, text: string): Kandidat {
    const erkannt = text.trim();
    if (m.art === 'fertig') {
      return { erkannt, art: 'antwort', als: `Neue Eingabe an Sitzung ${sitzungText(m)}`, antwort: { art: 'text', text: erkannt } };
    }
    if (m.art === 'plan') {
      return { erkannt, art: 'antwort', als: 'Überarbeitungswunsch', antwort: { art: 'ueberarbeiten', text: erkannt } };
    }
    const fragen = m.fragen ?? [];
    const frage = fragen[index];
    const vonN = fragen.length > 1 ? ` (Frage ${index + 1} von ${fragen.length})` : '';
    if (!frage) return { erkannt, art: 'frage', als: `Eigene Antwort${vonN}`, teil: { nummern: [], eigene: erkannt } };
    const wahl = waehleMoeglichkeit(erkannt, frage.optionen, frage.mehrfach);
    if ('nummern' in wahl) {
      const texte = wahl.nummern.map((n) => frage.optionen[n - 1] ?? '').join(', ');
      const kopf = wahl.nummern.length === 1 ? `Möglichkeit ${wahl.nummern[0]}` : `Möglichkeiten ${wahl.nummern.join(', ')}`;
      return { erkannt, art: 'frage', als: `${kopf} — ${texte}${vonN}`, teil: { nummern: wahl.nummern } };
    }
    if ('mehrdeutig' in wahl && this.eigen) {
      this.eigen.hinweis = `passt auf ${wahl.mehrdeutig.join(' und ')} — Nummer sagen`;
    }
    return { erkannt, art: 'frage', als: `Eigene Antwort${vonN}`, teil: { nummern: [], eigene: erkannt } };
  }

  // -- housekeeping -----------------------------------------------------------

  private beendeEigen(): void {
    this.stoppeAufnahme();
    if (this.eigen) this.d.sprache.cancel();
    this.eigen = null;
  }

  private setzeErgebnis(ergebnis: { ok: boolean; text: string } | undefined): void {
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

function verbinde(chunks: readonly Float32Array[]): Float32Array {
  const laenge = chunks.reduce((n, c) => n + c.length, 0);
  const aus = new Float32Array(laenge);
  let pos = 0;
  for (const c of chunks) {
    aus.set(c, pos);
    pos += c.length;
  }
  return aus;
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
      speak: (text, stimme) => {
        const s = synth();
        if (!s || typeof SpeechSynthesisUtterance === 'undefined') return;
        const u = new SpeechSynthesisUtterance(text);
        const voice = s.getVoices().find((v) => v.name === stimme.name && v.lang === stimme.lang);
        if (voice) u.voice = voice;
        u.lang = stimme.lang;
        s.speak(u);
      },
      cancel: () => synth()?.cancel(),
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
  };
}

export const anrufService = new AnrufClientService();
