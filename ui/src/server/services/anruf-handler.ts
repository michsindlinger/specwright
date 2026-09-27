/**
 * WebSocket-Handler der `anruf:*`-Nachrichten (INT-2026-025, Plan #16, D9,
 * security.md §6). Muster: `vorhaben-handler.ts` — Typen und Felder prüfen,
 * dann den Dienst rufen; Fehler als `anruf:error` an den Absender.
 *
 * Nur lokale Clients (Browser am Mac des Backends, `istLokalerBrowser`)
 * dürfen `anruf:*` schicken; alle anderen bekommen `ANRUF_NICHT_LOKAL`.
 * Nachrichteninhalte (Audio, Antworttext) werden nie geloggt (FA-27).
 */

import {
  ANRUF_AUDIO_MAX_BASE64,
  ANRUF_CLIENT_TYPES,
  ANRUF_INHALT_GRENZEN,
  type AnrufAntwort,
  type AnrufClientMessage,
  type AnrufErrorMessage,
  type AnrufFrageAntwort,
  type AnrufMikrofon,
  type AnrufServerMessage,
} from '../../shared/types/anruf.protocol.js';
import { base64ZuInt16 } from '../../shared/anruf-audio.js';
import { CLOUD_SESSION_ID_RE } from './claude-hooks.js';

/** Was der Handler vom Dienst braucht (AnrufService erfüllt das). */
export interface AnrufServiceBefehle {
  setModus(clientId: string, an: boolean): Promise<AnrufErrorMessage | undefined>;
  faehig(clientId: string, mikrofon: AnrufMikrofon, stimme: boolean): void;
  annehmen(clientId: string, meldungId: string): AnrufErrorMessage | undefined;
  ablehnen(clientId: string, meldungId: string): AnrufErrorMessage | undefined;
  spaeter(clientId: string, meldungId: string): AnrufErrorMessage | undefined;
  auflegen(clientId: string, meldungId: string): AnrufErrorMessage | undefined;
  anrufen(clientId: string, sessionId: string): AnrufErrorMessage | undefined;
  erkennen(clientId: string, meldungId: string, pcm: Int16Array): Promise<AnrufErrorMessage | undefined>;
  freigebenAnfragen(clientId: string, meldungId: string): Promise<AnrufErrorMessage | undefined>;
  senden(clientId: string, meldungId: string, antwort: AnrufAntwort): AnrufErrorMessage | undefined;
}

export interface AnrufAbsender {
  clientId: string;
  lokal: boolean;
}

type Reply = (message: AnrufServerMessage) => void;

const MELDUNG_ID_RE = /^[A-Za-z0-9_-]{1,100}$/;
const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;
const MIKROFON: ReadonlySet<string> = new Set<AnrufMikrofon>(['ok', 'fehlt', 'verweigert']);
/** Obergrenze für gesendeten Text (Antwort, Überarbeitung, eigene Antwort). */
export const ANRUF_TEXT_MAX = 10_000;
/** Höchste Nummer einer Möglichkeit: Optionen + „eigene Antwort". */
const NUMMER_MAX = ANRUF_INHALT_GRENZEN.optionen + 1;

function fehler(code: AnrufErrorMessage['code'], message: string): AnrufErrorMessage {
  return { type: 'anruf:error', code, message };
}

function istText(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= ANRUF_TEXT_MAX;
}

function meldungId(message: Record<string, unknown>): string | undefined {
  const id = message.meldungId;
  return typeof id === 'string' && MELDUNG_ID_RE.test(id) ? id : undefined;
}

/** Validiert die Antwort-Union (`anruf:senden`); liefert sie oder `undefined`. */
export function pruefeAntwort(roh: unknown): AnrufAntwort | undefined {
  if (!roh || typeof roh !== 'object' || Array.isArray(roh)) return undefined;
  const a = roh as Record<string, unknown>;
  switch (a.art) {
    case 'text':
      return istText(a.text) ? { art: 'text', text: a.text } : undefined;
    case 'ueberarbeiten':
      return istText(a.text) ? { art: 'ueberarbeiten', text: a.text } : undefined;
    case 'freigeben':
      return { art: 'freigeben' };
    case 'rueckfrage': {
      if (!Array.isArray(a.antworten) || a.antworten.length === 0 || a.antworten.length > ANRUF_INHALT_GRENZEN.fragen) return undefined;
      const antworten: AnrufFrageAntwort[] = [];
      for (const rohAntwort of a.antworten) {
        if (!rohAntwort || typeof rohAntwort !== 'object' || Array.isArray(rohAntwort)) return undefined;
        const r = rohAntwort as Record<string, unknown>;
        if (!Array.isArray(r.nummern) || r.nummern.length > NUMMER_MAX) return undefined;
        const nummern: number[] = [];
        for (const n of r.nummern) {
          if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > NUMMER_MAX || nummern.includes(n)) return undefined;
          nummern.push(n);
        }
        if (r.eigene !== undefined && !istText(r.eigene)) return undefined;
        if (nummern.length === 0 && r.eigene === undefined) return undefined;
        antworten.push({ nummern, ...(typeof r.eigene === 'string' ? { eigene: r.eigene } : {}) });
      }
      return { art: 'rueckfrage', antworten };
    }
    default:
      return undefined;
  }
}

/** Base64 von 16-kHz-Int16-PCM → PCM; `undefined` bei ungültig, leer oder zu groß. */
export function pruefeAudio(roh: unknown): Int16Array | undefined {
  if (typeof roh !== 'string' || roh.length === 0 || roh.length > ANRUF_AUDIO_MAX_BASE64) return undefined;
  if (roh.length % 4 !== 0 || !BASE64_RE.test(roh)) return undefined;
  try {
    const pcm = base64ZuInt16(roh);
    return pcm.length > 0 ? pcm : undefined;
  } catch {
    return undefined;
  }
}

export class AnrufHandler {
  constructor(private readonly service: AnrufServiceBefehle) {}

  /** Behandelt `anruf:*`; liefert `false` für andere Typen. */
  handle(message: Record<string, unknown>, absender: AnrufAbsender, reply: Reply): boolean {
    const type = message.type;
    if (typeof type !== 'string' || !type.startsWith('anruf:')) return false;
    if (!absender.lokal) {
      reply(fehler('ANRUF_NICHT_LOKAL', 'Der Anrufmodus geht nur im Browser am Mac des Backends (http://localhost).'));
      return true;
    }
    if (!(ANRUF_CLIENT_TYPES as ReadonlyArray<string>).includes(type)) {
      reply(fehler('INVALID_MESSAGE', `Unbekannte Anruf-Nachricht: ${type.slice(0, 60)}`));
      return true;
    }
    const antworte = (err: AnrufErrorMessage | undefined): void => {
      if (err) reply(err);
    };
    const { clientId } = absender;

    switch (type as AnrufClientMessage['type']) {
      case 'anruf:modus.set': {
        if (typeof message.an !== 'boolean') {
          reply(fehler('INVALID_MESSAGE', 'an (boolean) ist erforderlich'));
          return true;
        }
        void this.service.setModus(clientId, message.an).then(antworte, () => reply(fehler('INVALID_MESSAGE', 'Anrufmodus ließ sich nicht umschalten')));
        return true;
      }
      case 'anruf:faehig': {
        if (typeof message.mikrofon !== 'string' || !MIKROFON.has(message.mikrofon) || typeof message.stimme !== 'boolean') {
          reply(fehler('INVALID_MESSAGE', "mikrofon ('ok'|'fehlt'|'verweigert') und stimme (boolean) sind erforderlich"));
          return true;
        }
        this.service.faehig(clientId, message.mikrofon as AnrufMikrofon, message.stimme);
        return true;
      }
      case 'anruf:anrufen': {
        const sessionId = message.sessionId;
        if (typeof sessionId !== 'string' || !CLOUD_SESSION_ID_RE.test(sessionId)) {
          reply(fehler('INVALID_MESSAGE', 'sessionId ist erforderlich'));
          return true;
        }
        antworte(this.service.anrufen(clientId, sessionId));
        return true;
      }
      case 'anruf:annehmen':
      case 'anruf:ablehnen':
      case 'anruf:spaeter':
      case 'anruf:auflegen':
      case 'anruf:freigeben.anfragen':
      case 'anruf:erkennen':
      case 'anruf:senden':
        return this.mitMeldung(type as AnrufClientMessage['type'], message, clientId, reply, antworte);
      default:
        reply(fehler('INVALID_MESSAGE', 'Unbekannte Anruf-Nachricht'));
        return true;
    }
  }

  private mitMeldung(
    type: AnrufClientMessage['type'],
    message: Record<string, unknown>,
    clientId: string,
    reply: Reply,
    antworte: (err: AnrufErrorMessage | undefined) => void
  ): boolean {
    const id = meldungId(message);
    if (!id) {
      reply(fehler('INVALID_MESSAGE', 'meldungId ist erforderlich'));
      return true;
    }
    const scheitert = (): void => reply(fehler('INVALID_MESSAGE', 'Anruf-Befehl ist gescheitert'));
    switch (type) {
      case 'anruf:annehmen':
        antworte(this.service.annehmen(clientId, id));
        return true;
      case 'anruf:ablehnen':
        antworte(this.service.ablehnen(clientId, id));
        return true;
      case 'anruf:spaeter':
        antworte(this.service.spaeter(clientId, id));
        return true;
      case 'anruf:auflegen':
        antworte(this.service.auflegen(clientId, id));
        return true;
      case 'anruf:freigeben.anfragen':
        void this.service.freigebenAnfragen(clientId, id).then(antworte, scheitert);
        return true;
      case 'anruf:erkennen': {
        const pcm = pruefeAudio(message.audio);
        if (!pcm) {
          reply(fehler('INVALID_MESSAGE', `audio muss gültiges Base64 (≤ ${ANRUF_AUDIO_MAX_BASE64} Zeichen) sein`));
          return true;
        }
        void this.service.erkennen(clientId, id, pcm).then(antworte, scheitert);
        return true;
      }
      case 'anruf:senden': {
        const antwort = pruefeAntwort(message.antwort);
        if (!antwort) {
          reply(fehler('INVALID_MESSAGE', 'antwort ist ungültig'));
          return true;
        }
        antworte(this.service.senden(clientId, id, antwort));
        return true;
      }
      default:
        reply(fehler('INVALID_MESSAGE', 'Unbekannte Anruf-Nachricht'));
        return true;
    }
  }
}
