/**
 * Fakes for the call-mode frontend tests (INT-2026-025): gateway,
 * speechSynthesis, microphone, notifications. No browser API is touched.
 */
import type { WebSocketMessage } from '../../frontend/src/gateway.js';
import {
  AnrufClientService,
  type AnrufAufnahme,
  type AnrufDeps,
  type AnrufErlaubnis,
  type AnrufMikrofonStrom,
  type AnrufStimme,
} from '../../frontend/src/services/anruf.service.js';
import type { AnrufMeldung, AnrufStateMessage } from '../../src/shared/types/anruf.protocol.js';

type Handler = (m: WebSocketMessage) => void;

export class FakeGateway {
  sent: WebSocketMessage[] = [];
  private handlers = new Map<string, Set<Handler>>();
  send(m: WebSocketMessage): void {
    this.sent.push(m);
  }
  on(t: string, h: Handler): void {
    if (!this.handlers.has(t)) this.handlers.set(t, new Set());
    this.handlers.get(t)!.add(h);
  }
  off(t: string, h: Handler): void {
    this.handlers.get(t)?.delete(h);
  }
  emit(m: WebSocketMessage): void {
    for (const h of this.handlers.get(m.type) ?? []) h(m);
  }
  ofType(type: string): WebSocketMessage[] {
    return this.sent.filter((m) => m.type === type);
  }
}

export class FakeSprache {
  voices: AnrufStimme[] = [
    { name: 'Google Deutsch', lang: 'de-DE', localService: false },
    { name: 'Markus', lang: 'de-DE', localService: true },
    { name: 'Anna', lang: 'de-DE', localService: true },
  ];
  gesprochen: Array<{ text: string; stimme: string }> = [];
  cancels = 0;
  private cb: (() => void) | null = null;
  getVoices(): AnrufStimme[] {
    return this.voices;
  }
  speak(text: string, stimme: AnrufStimme): void {
    this.gesprochen.push({ text, stimme: stimme.name });
  }
  cancel(): void {
    this.cancels++;
  }
  onVoicesChanged(cb: () => void): void {
    this.cb = cb;
  }
  voicesChanged(): void {
    this.cb?.();
  }
  get texte(): string[] {
    return this.gesprochen.map((g) => g.text);
  }
}

export class FakeStrom implements AnrufMikrofonStrom {
  gestoppt = false;
  aufnahmeGestoppt = false;
  private endeCb: (() => void) | null = null;
  private chunk: ((c: Float32Array) => void) | null = null;
  constructor(private readonly rate = 48000) {}
  stoppe(): void {
    this.gestoppt = true;
  }
  beiEnde(cb: () => void): void {
    this.endeCb = cb;
  }
  async starteAufnahme(onChunk: (c: Float32Array) => void): Promise<AnrufAufnahme> {
    this.chunk = onChunk;
    return {
      sampleRate: this.rate,
      stop: () => {
        this.aufnahmeGestoppt = true;
      },
    };
  }
  /** Feeds `sekunden` of a sine at `amplitude`. */
  liefere(sekunden: number, amplitude = 0.5): void {
    const n = Math.round(this.rate * sekunden);
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) c[i] = amplitude * Math.sin((2 * Math.PI * 440 * i) / this.rate);
    this.chunk?.(c);
  }
  endeVonAussen(): void {
    this.endeCb?.();
  }
}

export class FakeMikrofon {
  erlaubnisWert: AnrufErlaubnis = 'granted';
  vorhandenWert = true;
  eingang = true;
  oeffnungen = 0;
  fehler: { name: string } | null = null;
  stroeme: FakeStrom[] = [];
  private cb: (() => void) | null = null;
  vorhanden(): boolean {
    return this.vorhandenWert;
  }
  async erlaubnis(): Promise<AnrufErlaubnis> {
    return this.erlaubnisWert;
  }
  onErlaubnisAenderung(cb: () => void): void {
    this.cb = cb;
  }
  aendere(e: AnrufErlaubnis): void {
    this.erlaubnisWert = e;
    this.cb?.();
  }
  async hatEingang(): Promise<boolean> {
    return this.eingang;
  }
  async oeffne(): Promise<AnrufMikrofonStrom> {
    this.oeffnungen++;
    if (this.fehler) throw this.fehler;
    const s = new FakeStrom();
    this.stroeme.push(s);
    return s;
  }
  get letzter(): FakeStrom {
    return this.stroeme[this.stroeme.length - 1]!;
  }
}

export class FakeMitteilung {
  erlaubnisWert: NotificationPermission | 'fehlt' = 'granted';
  gezeigt: Array<{ titel: string; body: string; tag: string }> = [];
  anfragen_ = 0;
  erlaubnis(): NotificationPermission | 'fehlt' {
    return this.erlaubnisWert;
  }
  async anfragen(): Promise<void> {
    this.anfragen_++;
  }
  zeige(titel: string, body: string, tag: string): void {
    this.gezeigt.push({ titel, body, tag });
  }
}

export interface AnrufWelt {
  dienst: AnrufClientService;
  gw: FakeGateway;
  sprache: FakeSprache;
  mikro: FakeMikrofon;
  mitteilung: FakeMitteilung;
  klingeln: { n: number };
  versteckt: { v: boolean };
}

export function anrufWelt(): AnrufWelt {
  const gw = new FakeGateway();
  const sprache = new FakeSprache();
  const mikro = new FakeMikrofon();
  const mitteilung = new FakeMitteilung();
  const klingeln = { n: 0 };
  const versteckt = { v: false };
  const deps: AnrufDeps = {
    gateway: gw,
    sprache,
    mikrofon: mikro,
    mitteilung,
    istVersteckt: () => versteckt.v,
    klingeln: () => {
      klingeln.n++;
    },
  };
  return { dienst: new AnrufClientService(deps), gw, sprache, mikro, mitteilung, klingeln, versteckt };
}

export const meldungFertig: AnrufMeldung = {
  id: 'm-fertig',
  sessionId: 'cloud-1',
  sitzungName: 'build-matching',
  projektName: 'Applai',
  art: 'fertig',
  seit: '2026-09-27T10:00:00.000Z',
  nurBildschirm: false,
  text: { vorlesen: 'Ich habe das Matching umgebaut. Jetzt brauche ich deine Freigabe.', gekuerzt: true, ohneSprechfassung: false, anzeige: 'Ich habe das Matching umgebaut. Jetzt brauche ich deine Freigabe.' },
};

export const meldungRueckfrage: AnrufMeldung = {
  id: 'm-rf',
  sessionId: 'cloud-2',
  sitzungName: 'plan-anruf',
  projektName: 'Specwright',
  art: 'rueckfrage',
  seit: '2026-09-27T10:00:00.000Z',
  nurBildschirm: false,
  text: { vorlesen: 'Frage: Welches Modell? Eins: Whisper large-v3. Zwei: Whisper large-v3-turbo. Oder eine eigene Antwort.', gekuerzt: false, ohneSprechfassung: false, anzeige: 'Welches Modell?' },
  fragen: [
    { frage: 'Welches Modell?', optionen: ['Whisper large-v3', 'Whisper large-v3-turbo', 'Whisper small'], mehrfach: false },
    { frage: 'Welche Stimme?', optionen: ['Anna', 'Markus'], mehrfach: false },
  ],
};

export const meldungPlan: AnrufMeldung = {
  id: 'm-plan',
  sessionId: 'cloud-3',
  sitzungName: 'int-025-plan',
  projektName: 'Specwright',
  art: 'plan',
  seit: '2026-09-27T10:00:00.000Z',
  nurBildschirm: false,
  text: { vorlesen: 'Der Plan baut den Anrufmodus.', gekuerzt: false, ohneSprechfassung: false, anzeige: 'Der Plan baut den Anrufmodus.' },
};

export function state(p: Partial<AnrufStateMessage>): WebSocketMessage {
  const s: AnrufStateMessage = {
    type: 'anruf:state',
    an: true,
    verfuegbarkeit: { verfuegbar: true },
    zustand: 'ruhe',
    eigener: false,
    wartend: 0,
    ...p,
  };
  return { ...s };
}

export const verfuegbarkeitLokal: WebSocketMessage = { type: 'anruf:verfuegbarkeit', an: true, verfuegbarkeit: { verfuegbar: true }, lokal: true };

/** Lets pending microtasks (fake async APIs) settle. */
export async function ruhe(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}
