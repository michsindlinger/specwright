/**
 * Anruf-Dienst (INT-2026-025, Plan D1, D2, D5, D5a, D6, D7, D9, D10).
 *
 * Hält Schalter, Warteschlange und die flüchtigen Hook-Inhalte, leitet aus
 * dem Statusfluss des CloudTerminalManagers die Meldungen ab (D5a), führt die
 * Effekte der reinen Übergangsfunktion `anrufUebergang` aus (D6) und schickt
 * `anruf:*`-Nachrichten an die Clients.
 *
 * Datenlebensdauer (ADR-0006, FA-27): Hook-Inhalte, erkannter Text und Audio
 * leben nur im Speicher. Auf Platte landen nur der Schalter `{ "an": … }`
 * (D10) und die Kontext-Dateien mit den festen Anweisungstexten (D2). Nichts
 * aus Inhalten, Erkennung oder Antworten geht in Logs.
 *
 * Abhängigkeiten sind strukturelle Schnittstellen (Manager, Erkennung,
 * Sender), damit der Dienst ohne echte Prozesse testbar ist.
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  ANRUF_ANWEISUNG_AN,
  ANRUF_AUDIO_MAX_JE_ANRUF_S,
  ANRUF_ANWEISUNG_AUS,
  ANRUF_CLIENT_KULANZ_MS,
  ANRUF_NICHT_VERFUEGBAR_TEXT,
  type AnrufAntwort,
  type AnrufArt,
  type AnrufErrorCode,
  type AnrufErrorMessage,
  type AnrufFrage,
  type AnrufInhalt,
  type AnrufMeldung,
  type AnrufMikrofon,
  type AnrufSendeGrund,
  type AnrufServerMessage,
  type AnrufStateMessage,
  type AnrufVerfuegbarkeit,
} from '../../shared/types/anruf.protocol.js';
import { vorlesetextFuer } from '../../shared/anruf-text.js';
import { ANRUF_RATE } from '../../shared/anruf-audio.js';
import { AnrufWarteschlange, type AnrufEintrag } from './anruf-warteschlange.js';
import { anrufUebergang, type AnrufEreignis, type AnrufUebergangErgebnis, type AnrufZustand, type ZustandMeldung } from './anruf-zustand.js';
import { CLOUD_SESSION_ID_RE, extractAnrufInhalt } from './claude-hooks.js';

// ---------------------------------------------------------------------------
// Strukturelle Abhängigkeiten
// ---------------------------------------------------------------------------

/** Die Felder einer Sitzung, die der Dienst liest (Teil von `CloudTerminalSession`). */
export interface AnrufSitzung {
  sessionId: string;
  projectPath: string;
  effectiveCwd?: string;
  terminalType?: string;
  status?: string;
  agentStatus?: string;
  blockKind?: string;
  agentDoneAt?: Date;
}

/** Detail von `session.agent-event` (cloud-terminal-manager.ts, applyAgentEvent). */
export interface AnrufEventDetail {
  status?: string;
  blockKind?: string;
  blockedBy?: 'hook' | 'probe';
  doneAt?: Date;
}

export type AnrufAgentEventHoerer = (sessionId: string, event: string, detail: AnrufEventDetail) => void;
export type AnrufClosedHoerer = (sessionId: string) => void;

export interface AnrufSitzungsQuelle {
  on(event: 'session.agent-event', listener: AnrufAgentEventHoerer): unknown;
  on(event: 'session.closed', listener: AnrufClosedHoerer): unknown;
  off(event: 'session.agent-event', listener: AnrufAgentEventHoerer): unknown;
  off(event: 'session.closed', listener: AnrufClosedHoerer): unknown;
  getSession(sessionId: string): AnrufSitzung | undefined;
  getAllSessions(): AnrufSitzung[];
}

export type AnrufErkennungsErgebnis =
  | { text: string }
  | { grund: 'nichts_verstanden' | 'erkennung_neustart' | 'erkennung_fehlt' };

export interface AnrufErkennungPort {
  verfuegbarkeit(): AnrufVerfuegbarkeit;
  start(): Promise<void>;
  stop(): Promise<void>;
  laeuft(): boolean;
  erkenne(pcm: Int16Array): Promise<AnrufErkennungsErgebnis>;
  on?(event: 'abgestuerzt' | 'status', listener: () => void): unknown;
  off?(event: 'abgestuerzt' | 'status', listener: () => void): unknown;
}

export interface AnrufSendeAuftragPort {
  sessionId: string;
  art: AnrufArt;
  fragen?: AnrufFrage[];
  antwort: AnrufAntwort;
}

export type AnrufSendeErgebnisPort = { ok: true } | { ok: false; grund: AnrufSendeGrund; text: string };

export interface AnrufSenderPort {
  freigabeWortlaut(sessionId: string): Promise<{ wortlaut: string } | { ok: false; grund: AnrufSendeGrund; text: string }>;
  sende(auftrag: AnrufSendeAuftragPort): Promise<AnrufSendeErgebnisPort>;
}

export interface AnrufServiceDeps {
  quelle: AnrufSitzungsQuelle;
  erkennung: AnrufErkennungPort;
  sender: AnrufSenderPort;
  /** `<runtime>/anruf-<port>.json` (D10). */
  statePath: string;
  /** `<runtime>/anruf-kontext-<port>/` (D2). */
  kontextDir: string;
  /** Kill-Switch `SPECWRIGHT_ANRUF=off`. */
  abgeschaltet?: boolean;
  uhr?: () => number;
  neueId?: () => string;
  /** Anzeigename und Projekt einer Sitzung; Standard: Ordnernamen. */
  sitzungInfo?: (sitzung: AnrufSitzung) => { sitzungName: string; projektName?: string };
}

export type AnrufSend = (message: AnrufServerMessage) => void;

// ---------------------------------------------------------------------------

interface MeldungRec {
  id: string;
  sessionId: string;
  art: AnrufArt;
  /** Eingang (ms). */
  seit: number;
}

interface ClientRec {
  lokal: boolean;
  send: AnrufSend;
  faehig: boolean;
}

const RUECKFRAGE_ODER_PLAN = new Set(['rueckfrage', 'plan']);

function fehlerNachricht(code: AnrufErrorCode, message: string): AnrufErrorMessage {
  return { type: 'anruf:error', code, message };
}

function hatBesitzer(z: AnrufZustand): z is Extract<AnrufZustand, { besitzer: string }> {
  return z.name === 'laeuft' || z.name === 'freigabe_nachfrage' || z.name === 'sendet';
}

function standardSitzungInfo(s: AnrufSitzung): { sitzungName: string; projektName?: string } {
  const projektName = path.basename(s.projectPath);
  const cwd = s.effectiveCwd ?? s.projectPath;
  return { sitzungName: path.basename(cwd) || s.sessionId, ...(projektName ? { projektName } : {}) };
}

/** Atomar schreiben: tmp-Datei `0600` + rename. */
function atomarSchreiben(ziel: string, inhalt: string): void {
  const tmp = `${ziel}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, inhalt, { mode: 0o600 });
  fs.renameSync(tmp, ziel);
}

export class AnrufService {
  private readonly quelle: AnrufSitzungsQuelle;
  private readonly erkennung: AnrufErkennungPort;
  private readonly sender: AnrufSenderPort;
  private readonly statePath: string;
  private readonly kontextDir: string;
  private readonly abgeschaltet: boolean;
  private readonly uhr: () => number;
  private readonly neueId: () => string;
  private readonly sitzungInfo: (s: AnrufSitzung) => { sitzungName: string; projektName?: string };

  private an = false;
  private zustand: AnrufZustand = { name: 'ruhe' };
  private readonly schlange: AnrufWarteschlange;
  private readonly meldungen = new Map<string, MeldungRec>();
  /** Eintrag der klingelnden/laufenden Meldung (für `zurueck`, `ablehnen`, `spaeter`). */
  private aktivEintrag: AnrufEintrag | null = null;
  /** D1: flüchtige Hook-Inhalte, nur bei Modus an. */
  private readonly inhalte = new Map<string, AnrufInhalt>();
  /** Letzter Status je Sitzung (D5a) — auch bei Modus aus, damit Übergänge stimmen. */
  private readonly letzter = new Map<string, { status?: string; blockKind?: string }>();
  /** D2: Claude-Sitzungen, die während der An-Zeit lebten (bekommen beim Ausschalten `aus-<id>.json`). */
  private readonly anSitzungen = new Set<string>();
  private readonly clients = new Map<string, ClientRec>();
  /** Zeitpunkt, zu dem der letzte lokale fähige Client ging (O2). */
  private letzterFaehigerWeg: number | undefined;
  private kulanzTimer: NodeJS.Timeout | null = null;
  private naechsteTimer: NodeJS.Timeout | null = null;
  private endeGrund: { text: string; fuer: string } | null = null;
  private ausstehendeAntwort: AnrufAntwort | null = null;
  /** Audio-Sekunden des laufenden Anrufs (INT-2026-026, D5); neu je Meldung. */
  private audioJeAnruf: { meldungId: string; sekunden: number } | null = null;
  private gestoppt = false;

  constructor(deps: AnrufServiceDeps) {
    this.quelle = deps.quelle;
    this.erkennung = deps.erkennung;
    this.sender = deps.sender;
    this.statePath = deps.statePath;
    this.kontextDir = deps.kontextDir;
    this.abgeschaltet = deps.abgeschaltet ?? false;
    this.uhr = deps.uhr ?? Date.now;
    this.neueId = deps.neueId ?? randomUUID;
    this.sitzungInfo = deps.sitzungInfo ?? standardSitzungInfo;
    this.schlange = new AnrufWarteschlange(this.uhr);
    this.an = !this.abgeschaltet && this.ladeSchalter();

    this.quelle.on('session.agent-event', this.beiAgentEvent);
    this.quelle.on('session.closed', this.beiSessionClosed);
    this.erkennung.on?.('abgestuerzt', this.beiErkennungStatus);
    this.erkennung.on?.('status', this.beiErkennungStatus);
  }

  /**
   * Boot (nach der Wiederherstellung der Sitzungen): verwaiste `aus-*`
   * aufräumen, Status merken, bei Modus an Kontext-Datei schreiben und die
   * Erkennung starten. Beim Einschalten bzw. Boot klingelt nichts Altes (AN-S06).
   */
  start(): void {
    for (const s of this.quelle.getAllSessions()) {
      this.letzter.set(s.sessionId, { status: s.agentStatus, ...(s.agentStatus === 'blocked' && s.blockKind ? { blockKind: s.blockKind } : {}) });
    }
    this.raeumeVerwaisteAus();
    if (this.an) {
      this.schreibeKontextAn();
      for (const s of this.lebendeClaudeSitzungen()) this.anSitzungen.add(s);
      if (this.erkennung.verfuegbarkeit().verfuegbar) this.starteErkennung();
    } else {
      this.entferneDatei(path.join(this.kontextDir, 'an.json'));
    }
  }

  /** Shutdown: Hörer abmelden, Timer stoppen, Erkennung beenden. */
  async stop(): Promise<void> {
    this.gestoppt = true;
    this.quelle.off('session.agent-event', this.beiAgentEvent);
    this.quelle.off('session.closed', this.beiSessionClosed);
    this.erkennung.off?.('abgestuerzt', this.beiErkennungStatus);
    this.erkennung.off?.('status', this.beiErkennungStatus);
    this.stoppeTimer();
    await this.erkennung.stop();
  }

  istAn(): boolean {
    return this.an;
  }

  zustandName(): AnrufZustand['name'] {
    return this.zustand.name;
  }

  wartend(): number {
    return this.schlange.groesse();
  }

  verfuegbarkeit(): AnrufVerfuegbarkeit {
    if (this.abgeschaltet) return { verfuegbar: false, grund: 'abgeschaltet', text: ANRUF_NICHT_VERFUEGBAR_TEXT.abgeschaltet };
    return this.erkennung.verfuegbarkeit();
  }

  // -------------------------------------------------------------------------
  // Clients
  // -------------------------------------------------------------------------

  /** Neuer Client: `anruf:verfuegbarkeit` an alle, `anruf:state` nur an lokale. */
  clientDa(clientId: string, lokal: boolean, send: AnrufSend): void {
    this.clients.set(clientId, { lokal, send, faehig: false });
    this.sendeSicher(send, this.verfuegbarkeitFuer(lokal));
    if (lokal) this.sendeSicher(send, this.stateFuer(clientId));
  }

  /** Client getrennt (AN-S08): laufender Anruf endet ohne Senden, Meldung zurück an ihren Platz. */
  clientWeg(clientId: string): void {
    const warFaehig = this.hatFaehigen();
    if (!this.clients.delete(clientId)) return;
    if (warFaehig && !this.hatFaehigen()) this.faehigeWeg();
    this.anwenden({ art: 'client.weg', clientId });
  }

  /** `anruf:faehig` (D9): Mikrofon und lokale Stimme dieses Browsers. */
  faehig(clientId: string, mikrofon: AnrufMikrofon, stimme: boolean): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    const warFaehig = this.hatFaehigen();
    client.faehig = client.lokal && mikrofon === 'ok' && stimme;
    const istFaehig = this.hatFaehigen();
    if (!warFaehig && istFaehig) {
      this.letzterFaehigerWeg = undefined;
      this.stoppeKulanzTimer();
      this.naechsteKlingeln();
    } else if (warFaehig && !istFaehig) {
      this.faehigeWeg();
    }
  }

  // -------------------------------------------------------------------------
  // Hook-Inhalt (D1)
  // -------------------------------------------------------------------------

  /**
   * Von der Hook-Route zwischen `reportHookContext` und `reportAgentEvent`
   * gerufen (Review F1). Speichert nur bei Modus an; eine Map je Sitzung.
   */
  hookInhalt(sessionId: string, body: Record<string, unknown>): void {
    if (!this.an) return;
    const neu = extractAnrufInhalt(body);
    if (!neu) return;
    const alt = this.inhalte.get(sessionId) ?? {};
    this.inhalte.set(sessionId, { ...alt, ...neu });
    // D5a: eine Probe-Meldung bekommt ihren Inhalt nachträglich.
    if ('meldung' in this.zustand && this.zustand.meldung.sessionId === sessionId) this.broadcastState();
  }

  // -------------------------------------------------------------------------
  // Befehle der Clients (vom Handler validiert)
  // -------------------------------------------------------------------------

  async setModus(clientId: string, an: boolean): Promise<AnrufErrorMessage | undefined> {
    const verf = this.verfuegbarkeit();
    if (an && !verf.verfuegbar) {
      return fehlerNachricht('ANRUF_NICHT_VERFUEGBAR', verf.text ?? 'Anrufmodus ist nicht verfügbar.');
    }
    if (this.abgeschaltet) return fehlerNachricht('ANRUF_NICHT_VERFUEGBAR', ANRUF_NICHT_VERFUEGBAR_TEXT.abgeschaltet);
    if (an === this.an) {
      const client = this.clients.get(clientId);
      if (client) this.sendeSicher(client.send, this.stateFuer(clientId));
      return undefined;
    }
    this.an = an;
    this.speichereSchalter();
    if (an) {
      this.schreibeKontextAn();
      for (const s of this.lebendeClaudeSitzungen()) this.anSitzungen.add(s);
      console.log('[Anruf] Anrufmodus an');
      this.broadcastVerfuegbarkeit();
      this.broadcastState();
      this.starteErkennung();
    } else {
      this.anwenden({ art: 'modus.aus' });
      this.schreibeKontextAus();
      console.log('[Anruf] Anrufmodus aus');
      this.broadcastVerfuegbarkeit();
      this.broadcastState();
      try {
        await this.erkennung.stop();
      } catch (err) {
        console.warn('[Anruf] Erkennung ließ sich nicht sauber beenden:', (err as Error)?.name ?? 'Error');
      }
    }
    return undefined;
  }

  annehmen(clientId: string, meldungId: string): AnrufErrorMessage | undefined {
    return this.alsFehler(this.anwenden({ art: 'annehmen', meldungId, clientId }));
  }

  ablehnen(clientId: string, meldungId: string): AnrufErrorMessage | undefined {
    return this.alsFehler(this.anwenden({ art: 'ablehnen', meldungId, clientId }));
  }

  spaeter(clientId: string, meldungId: string): AnrufErrorMessage | undefined {
    return this.alsFehler(this.anwenden({ art: 'spaeter', meldungId, clientId }));
  }

  auflegen(clientId: string, meldungId: string): AnrufErrorMessage | undefined {
    return this.alsFehler(this.anwenden({ art: 'auflegen', meldungId, clientId }));
  }

  /**
   * Glocke „Anrufen" (FA-12): Meldung aus dem aktuellen Sitzungszustand
   * (Blockart oder Marke „fertig") plus gespeichertem Inhalt.
   */
  anrufen(clientId: string, sessionId: string): AnrufErrorMessage | undefined {
    if (!this.an) return fehlerNachricht('ANRUF_NICHT_VERFUEGBAR', 'Der Anrufmodus ist aus.');
    if (hatBesitzer(this.zustand)) return fehlerNachricht('ANRUF_BESETZT', 'Es läuft schon ein Anruf.');
    const s = this.quelle.getSession(sessionId);
    if (!s || s.status === 'closed') return fehlerNachricht('MELDUNG_WEG', 'Die Sitzung gibt es nicht mehr.');
    let art: AnrufArt | undefined;
    if (s.agentStatus === 'blocked' && s.blockKind && RUECKFRAGE_ODER_PLAN.has(s.blockKind)) art = s.blockKind as AnrufArt;
    else if (s.agentDoneAt) art = 'fertig';
    if (!art) return fehlerNachricht('MELDUNG_WEG', 'Diese Sitzung wartet auf keine Antwort.');

    const wartend = this.schlange.eintragFuerSitzung(sessionId);
    let rec: MeldungRec | undefined = wartend && wartend.art === art ? this.meldungen.get(wartend.id) : undefined;
    let neu = false;
    if (!rec) {
      rec = { id: this.neueId(), sessionId, art, seit: this.uhr() };
      this.meldungen.set(rec.id, rec);
      neu = true;
    }
    const ergebnis = this.anwenden({ art: 'anrufen', meldung: this.zm(rec), clientId });
    if (ergebnis.fehler && neu) this.meldungen.delete(rec.id);
    return this.alsFehler(ergebnis);
  }

  /**
   * `anruf:erkennen`: Audio nur im Speicher, Ergebnis nur an den Besitzer (FA-27, Review F15).
   * `abschnitt` kommt unverändert zurück (INT-2026-026, D5); Audio je Anruf gedeckelt (FA-22).
   */
  async erkennen(clientId: string, meldungId: string, pcm: Int16Array, abschnitt?: number): Promise<AnrufErrorMessage | undefined> {
    if (!this.istLaufenderAnruf(clientId, meldungId)) {
      return fehlerNachricht('INVALID_MESSAGE', 'Kein laufender Anruf dieses Fensters für diese Meldung.');
    }
    if (this.audioJeAnruf?.meldungId !== meldungId) this.audioJeAnruf = { meldungId, sekunden: 0 };
    const sekunden = this.audioJeAnruf.sekunden + pcm.length / ANRUF_RATE;
    if (sekunden > ANRUF_AUDIO_MAX_JE_ANRUF_S) {
      return fehlerNachricht('INVALID_MESSAGE', 'Zu viel Audio in diesem Anruf.');
    }
    this.audioJeAnruf.sekunden = sekunden;
    const nr = abschnitt !== undefined ? { abschnitt } : {};
    let ergebnis: AnrufErkennungsErgebnis;
    if (!this.erkennung.verfuegbarkeit().verfuegbar) {
      ergebnis = { grund: 'erkennung_fehlt' };
    } else {
      try {
        ergebnis = await this.erkennung.erkenne(pcm);
      } catch {
        ergebnis = { grund: 'erkennung_neustart' };
      }
    }
    // Inzwischen aufgelegt oder erledigt: das Ergebnis verfällt.
    if (!this.istLaufenderAnruf(clientId, meldungId)) return undefined;
    const client = this.clients.get(clientId);
    if (client) {
      this.sendeSicher(
        client.send,
        'text' in ergebnis
          ? { type: 'anruf:erkannt', meldungId, ...nr, text: ergebnis.text }
          : { type: 'anruf:erkannt', meldungId, ...nr, grund: ergebnis.grund }
      );
    }
    return undefined;
  }

  /** `anruf:freigeben.anfragen` (Review F6): Wortlaut der Ja-Möglichkeit lesen, dann Nachfrage-Zustand. */
  async freigebenAnfragen(clientId: string, meldungId: string): Promise<AnrufErrorMessage | undefined> {
    const rec = this.meldungen.get(meldungId);
    const nurBildschirm = rec ? this.nurBildschirm(rec) : false;
    const probe = anrufUebergang(this.zustand, { art: 'freigeben.anfragen', meldungId, clientId, nurBildschirm, wortlaut: '' }, this.uhr());
    if (probe.fehler || !rec) return this.alsFehler(probe) ?? fehlerNachricht('MELDUNG_WEG', 'Diese Meldung gibt es nicht mehr.');
    let res: { wortlaut: string } | { ok: false; grund: AnrufSendeGrund; text: string };
    try {
      res = await this.sender.freigabeWortlaut(rec.sessionId);
    } catch {
      res = { ok: false, grund: 'bildschirm_unpassend', text: 'Der Plan-Dialog ließ sich nicht lesen — bitte im Terminal freigeben.' };
    }
    if (!('wortlaut' in res)) {
      const client = this.clients.get(clientId);
      if (client) this.sendeSicher(client.send, { type: 'anruf:ergebnis', meldungId, ok: false, grund: res.grund, text: res.text });
      return undefined;
    }
    return this.alsFehler(this.anwenden({ art: 'freigeben.anfragen', meldungId, clientId, nurBildschirm, wortlaut: res.wortlaut }));
  }

  /** `anruf:senden`: Zustand `sendet`, Sender ausführen, Ergebnis nur an den Besitzer. */
  senden(clientId: string, meldungId: string, antwort: AnrufAntwort): AnrufErrorMessage | undefined {
    const rec = this.meldungen.get(meldungId);
    const nurBildschirm = rec ? this.nurBildschirm(rec) : false;
    this.ausstehendeAntwort = antwort;
    const ergebnis = this.anwenden({ art: 'senden', meldungId, clientId, antwort: antwort.art, nurBildschirm });
    this.ausstehendeAntwort = null;
    return this.alsFehler(ergebnis);
  }

  // -------------------------------------------------------------------------
  // Statusfluss (D5a)
  // -------------------------------------------------------------------------

  private readonly beiAgentEvent: AnrufAgentEventHoerer = (sessionId, event, detail) => {
    const vorher = this.letzter.get(sessionId);
    const status = detail.status;
    const blockKind = status === 'blocked' ? detail.blockKind : undefined;
    this.letzter.set(sessionId, { status, ...(blockKind ? { blockKind } : {}) });
    if (!this.an || this.gestoppt) return;
    this.anSitzungen.add(sessionId);

    const idle = event === 'idle-timeout' || event === 'idle-prompt';
    // Inhalte, die zu keinem wartenden Zustand mehr passen, verfallen (kein Altinhalt für spätere Probe-Meldungen).
    const inhalt = this.inhalte.get(sessionId);
    if (inhalt) {
      const rest: AnrufInhalt = { ...inhalt };
      if (status !== 'blocked') {
        delete rest.fragen;
        delete rest.plan;
      }
      if (!detail.doneAt && !idle && event !== 'stop') delete rest.letzteAntwort;
      if (rest.fragen || rest.plan || rest.letzteAntwort) this.inhalte.set(sessionId, rest);
      else this.inhalte.delete(sessionId);
    }

    // Auflösung (FA-11): Rückfrage/Plan, sobald nicht mehr blocked; fertig bei jedem Ereignis ohne doneAt außer idle-*.
    const art = this.artDerSitzung(sessionId);
    if (art) {
      const aufgeloest = art === 'fertig' ? !detail.doneAt && !idle && event !== 'stop' : status !== 'blocked';
      if (aufgeloest) this.anwenden({ art: 'meldung.erledigt', sessionId });
    }

    // Neue Meldung: Übergang in blocked mit rueckfrage/plan, Wechsel rueckfrage↔plan, oder stop.
    let neueArt: AnrufArt | undefined;
    if (event === 'stop') neueArt = 'fertig';
    else if (status === 'blocked' && blockKind && RUECKFRAGE_ODER_PLAN.has(blockKind)) {
      const warBlockiert = vorher?.status === 'blocked';
      const wechsel = warBlockiert && vorher?.blockKind !== undefined && RUECKFRAGE_ODER_PLAN.has(vorher.blockKind) && vorher.blockKind !== blockKind;
      if (!warBlockiert || wechsel) neueArt = blockKind as AnrufArt;
    }
    if (!neueArt) return;
    if (detail.blockedBy === 'probe' && neueArt !== 'fertig') {
      // Nur am Bildschirm erkannt: ein älterer Inhalt gehört nicht zu diesem Dialog.
      const rest = this.inhalte.get(sessionId);
      if (rest) {
        const ohne: AnrufInhalt = { ...rest };
        if (neueArt === 'rueckfrage') delete ohne.fragen;
        else delete ohne.plan;
        this.inhalte.set(sessionId, ohne);
      }
    }
    if (!this.meldungenErlaubt()) return;
    const rec: MeldungRec = { id: this.neueId(), sessionId, art: neueArt, seit: this.uhr() };
    this.meldungen.set(rec.id, rec);
    this.anwenden({ art: 'meldung.neu', meldung: this.zm(rec) });
  };

  private readonly beiSessionClosed: AnrufClosedHoerer = (sessionId) => {
    this.letzter.delete(sessionId);
    this.inhalte.delete(sessionId);
    this.anSitzungen.delete(sessionId);
    this.entferneAusDatei(sessionId);
    if (this.an && !this.gestoppt) this.anwenden({ art: 'meldung.erledigt', sessionId });
  };

  private readonly beiErkennungStatus = (): void => {
    if (this.gestoppt) return;
    this.broadcastVerfuegbarkeit();
    this.broadcastState();
  };

  // -------------------------------------------------------------------------
  // Zustandsmaschine und Effekte
  // -------------------------------------------------------------------------

  private anwenden(ereignis: AnrufEreignis): AnrufUebergangErgebnis {
    const vorher = this.zustand;
    const ergebnis = anrufUebergang(vorher, ereignis, this.uhr());
    if (ergebnis.fehler) return ergebnis;
    this.zustand = ergebnis.zustand;
    if (ergebnis.endeGrund && hatBesitzer(vorher)) this.endeGrund = { text: ergebnis.endeGrund, fuer: vorher.besitzer };

    let broadcast = false;
    let naechste = false;
    for (const effekt of ergebnis.effekte) {
      switch (effekt.art) {
        case 'einreihen': {
          const rec = this.meldungen.get(effekt.meldungId);
          if (!rec) break;
          const alt = this.schlange.eintragFuerSitzung(rec.sessionId);
          if (alt && alt.id !== rec.id) this.meldungen.delete(alt.id);
          this.schlange.neu({ id: rec.id, sessionId: rec.sessionId, art: rec.art });
          break;
        }
        case 'austragen': {
          const weg = this.schlange.erledigt(effekt.sessionId);
          if (weg) this.meldungen.delete(weg.id);
          break;
        }
        case 'entnehmen': {
          const rec = this.meldungen.get(effekt.meldungId);
          const eintrag = this.schlange.entnehmen(effekt.meldungId);
          this.aktivEintrag =
            eintrag ?? (rec ? { id: rec.id, sessionId: rec.sessionId, art: rec.art, seit: rec.seit, rang: rec.art === 'fertig' ? 1 : 0 } : null);
          break;
        }
        case 'zurueck': {
          const eintrag = this.aktivEintrag && this.aktivEintrag.id === effekt.meldungId ? this.aktivEintrag : null;
          if (!eintrag || !this.schlange.zurueck(eintrag)) this.meldungen.delete(effekt.meldungId);
          this.aktivEintrag = null;
          break;
        }
        case 'ablehnen': {
          this.schlange.ablehnen(this.aktivEintrag && this.aktivEintrag.id === effekt.meldungId ? this.aktivEintrag : effekt.meldungId);
          this.meldungen.delete(effekt.meldungId);
          this.aktivEintrag = null;
          break;
        }
        case 'spaeter': {
          this.schlange.spaeter(this.aktivEintrag && this.aktivEintrag.id === effekt.meldungId ? this.aktivEintrag : effekt.meldungId);
          this.aktivEintrag = null;
          break;
        }
        case 'verwerfen': {
          this.meldungen.delete(effekt.meldungId);
          this.schlange.entnehmen(effekt.meldungId);
          if (this.aktivEintrag?.id === effekt.meldungId) this.aktivEintrag = null;
          break;
        }
        case 'senden': {
          const antwort = this.ausstehendeAntwort;
          if (antwort) void this.fuehreSendenAus(effekt.meldungId, antwort);
          break;
        }
        case 'naechste':
          naechste = true;
          break;
        case 'schlange_leeren': {
          for (const e of this.schlange.alle()) this.meldungen.delete(e.id);
          this.schlange.leeren();
          this.stoppeNaechsteTimer();
          break;
        }
        case 'alles_leeren': {
          this.schlange.leeren();
          this.meldungen.clear();
          this.inhalte.clear();
          this.aktivEintrag = null;
          this.stoppeNaechsteTimer();
          break;
        }
        case 'broadcast':
          broadcast = true;
          break;
      }
    }
    if (broadcast) this.broadcastState();
    if (naechste) this.naechsteKlingeln();
    return ergebnis;
  }

  /** Nächste wartende Meldung klingeln lassen (FA-07), sonst Timer auf `nichtVor` (AN-S09). */
  private naechsteKlingeln(): void {
    if (this.zustand.name !== 'ruhe' || !this.an || this.gestoppt) return;
    if (!this.meldungenErlaubt()) return;
    const n = this.schlange.naechste();
    if (!n) return;
    if ('wartenBis' in n) {
      this.stoppeNaechsteTimer();
      const timer = setTimeout(() => {
        this.naechsteTimer = null;
        this.naechsteKlingeln();
      }, Math.max(0, n.wartenBis - this.uhr()));
      timer.unref?.();
      this.naechsteTimer = timer;
      return;
    }
    const rec = this.meldungen.get(n.eintrag.id);
    if (!rec) {
      this.schlange.entnehmen(n.eintrag.id);
      this.naechsteKlingeln();
      return;
    }
    this.anwenden({ art: 'klingeln', meldung: this.zm(rec) });
  }

  private async fuehreSendenAus(meldungId: string, antwort: AnrufAntwort): Promise<void> {
    const rec = this.meldungen.get(meldungId);
    const besitzer = hatBesitzer(this.zustand) ? this.zustand.besitzer : undefined;
    let res: AnrufSendeErgebnisPort;
    if (!rec) {
      res = { ok: false, grund: 'sitzung_weg', text: 'Die Meldung gibt es nicht mehr.' };
    } else {
      const fragen = rec.art === 'rueckfrage' ? this.inhalte.get(rec.sessionId)?.fragen : undefined;
      try {
        res = await this.sender.sende({ sessionId: rec.sessionId, art: rec.art, ...(fragen ? { fragen } : {}), antwort });
      } catch {
        res = { ok: false, grund: 'bildschirm_unpassend', text: 'Senden ist gescheitert — bitte im Terminal prüfen.' };
      }
    }
    const client = besitzer ? this.clients.get(besitzer) : undefined;
    if (client) {
      this.sendeSicher(client.send, res.ok ? { type: 'anruf:ergebnis', meldungId, ok: true } : { type: 'anruf:ergebnis', meldungId, ok: false, grund: res.grund, text: res.text });
    }
    if (this.gestoppt) return;
    this.anwenden(res.ok ? { art: 'senden.ok', meldungId } : { art: 'senden.fehler', meldungId, grund: res.grund });
  }

  // -------------------------------------------------------------------------
  // Nachrichten
  // -------------------------------------------------------------------------

  private stateFuer(clientId: string): AnrufStateMessage {
    const z = this.zustand;
    const eigener = hatBesitzer(z) && z.besitzer === clientId;
    const msg: AnrufStateMessage = {
      type: 'anruf:state',
      an: this.an,
      verfuegbarkeit: this.verfuegbarkeit(),
      zustand: z.name,
      eigener,
      wartend: this.schlange.groesse(),
    };
    if (z.name !== 'ruhe') {
      const rec = this.meldungen.get(z.meldung.id);
      // Inhalt nur für den Besitzer des laufenden Anrufs (Review F15); klingelnd nur Kopfdaten.
      if (rec) msg.meldung = this.meldungFuerClient(rec, eigener);
    }
    if (z.name === 'freigabe_nachfrage' && eigener) msg.freigabeWortlaut = z.wortlaut;
    if (this.endeGrund && this.endeGrund.fuer === clientId) msg.endeGrund = this.endeGrund.text;
    return msg;
  }

  private meldungFuerClient(rec: MeldungRec, mitInhalt: boolean): AnrufMeldung {
    const s = this.quelle.getSession(rec.sessionId);
    const info = s ? this.sitzungInfo(s) : { sitzungName: rec.sessionId };
    const meldung: AnrufMeldung = {
      id: rec.id,
      sessionId: rec.sessionId,
      sitzungName: info.sitzungName,
      ...(info.projektName ? { projektName: info.projektName } : {}),
      art: rec.art,
      seit: new Date(rec.seit).toISOString(),
      nurBildschirm: this.nurBildschirm(rec),
    };
    if (mitInhalt) {
      const inhalt = this.inhaltFuerArt(rec.sessionId, rec.art);
      const text = vorlesetextFuer(rec.art, inhalt);
      if (text) meldung.text = text;
      if (rec.art === 'rueckfrage' && inhalt?.fragen) meldung.fragen = inhalt.fragen;
    }
    return meldung;
  }

  private verfuegbarkeitFuer(lokal: boolean): AnrufServerMessage {
    const verfuegbarkeit: AnrufVerfuegbarkeit = lokal
      ? this.verfuegbarkeit()
      : { verfuegbar: false, grund: 'nicht_lokal', text: ANRUF_NICHT_VERFUEGBAR_TEXT.nicht_lokal };
    return { type: 'anruf:verfuegbarkeit', an: this.an, verfuegbarkeit, lokal };
  }

  private broadcastState(): void {
    for (const [clientId, client] of this.clients) {
      if (client.lokal) this.sendeSicher(client.send, this.stateFuer(clientId));
    }
    this.endeGrund = null;
  }

  private broadcastVerfuegbarkeit(): void {
    for (const client of this.clients.values()) this.sendeSicher(client.send, this.verfuegbarkeitFuer(client.lokal));
  }

  private sendeSicher(send: AnrufSend, message: AnrufServerMessage): void {
    try {
      send(message);
    } catch {
      // Ein toter Socket darf den Dienst nicht anhalten; der Close-Hörer räumt auf.
    }
  }

  // -------------------------------------------------------------------------
  // Hilfen
  // -------------------------------------------------------------------------

  private alsFehler(ergebnis: AnrufUebergangErgebnis): AnrufErrorMessage | undefined {
    return ergebnis.fehler ? fehlerNachricht(ergebnis.fehler.code, ergebnis.fehler.grund) : undefined;
  }

  private zm(rec: MeldungRec): ZustandMeldung {
    return { id: rec.id, sessionId: rec.sessionId, art: rec.art };
  }

  private inhaltFuerArt(sessionId: string, art: AnrufArt): AnrufInhalt | undefined {
    const inhalt = this.inhalte.get(sessionId);
    if (!inhalt) return undefined;
    if (art === 'fertig') return inhalt.letzteAntwort ? { letzteAntwort: inhalt.letzteAntwort } : undefined;
    if (art === 'plan') return inhalt.plan ? { plan: inhalt.plan } : undefined;
    return inhalt.fragen ? { fragen: inhalt.fragen } : undefined;
  }

  /** AN-S11: Rückfrage/Plan ohne Hook-Inhalt → keine Sprachantwort. „fertig" ohne Inhalt bleibt beantwortbar (D6, Review F5). */
  private nurBildschirm(rec: MeldungRec): boolean {
    return rec.art !== 'fertig' && !this.inhaltFuerArt(rec.sessionId, rec.art);
  }

  private artDerSitzung(sessionId: string): AnrufArt | undefined {
    if (this.zustand.name !== 'ruhe' && this.zustand.meldung.sessionId === sessionId) return this.zustand.meldung.art;
    return this.schlange.eintragFuerSitzung(sessionId)?.art;
  }

  private istLaufenderAnruf(clientId: string, meldungId: string): boolean {
    const z = this.zustand;
    return (z.name === 'laeuft' || z.name === 'freigabe_nachfrage') && z.besitzer === clientId && z.meldung.id === meldungId;
  }

  private hatFaehigen(): boolean {
    for (const c of this.clients.values()) if (c.lokal && c.faehig) return true;
    return false;
  }

  /** O2: Meldungen nur bei einem lokalen fähigen Client oder bis 30 s nach dem letzten. */
  private meldungenErlaubt(): boolean {
    if (this.hatFaehigen()) return true;
    return this.letzterFaehigerWeg !== undefined && this.uhr() - this.letzterFaehigerWeg <= ANRUF_CLIENT_KULANZ_MS;
  }

  private faehigeWeg(): void {
    this.letzterFaehigerWeg = this.uhr();
    this.stoppeKulanzTimer();
    const timer = setTimeout(() => {
      this.kulanzTimer = null;
      if (!this.hatFaehigen() && !this.gestoppt) this.anwenden({ art: 'niemand_da' });
    }, ANRUF_CLIENT_KULANZ_MS + 1);
    timer.unref?.();
    this.kulanzTimer = timer;
  }

  private stoppeKulanzTimer(): void {
    if (this.kulanzTimer) clearTimeout(this.kulanzTimer);
    this.kulanzTimer = null;
  }

  private stoppeNaechsteTimer(): void {
    if (this.naechsteTimer) clearTimeout(this.naechsteTimer);
    this.naechsteTimer = null;
  }

  private stoppeTimer(): void {
    this.stoppeKulanzTimer();
    this.stoppeNaechsteTimer();
  }

  private starteErkennung(): void {
    this.erkennung.start().then(
      () => this.beiErkennungStatus(),
      (err: unknown) => {
        console.warn('[Anruf] Spracherkennung startet nicht:', (err as Error)?.message ?? 'Fehler');
        this.beiErkennungStatus();
      }
    );
  }

  private lebendeClaudeSitzungen(): string[] {
    return this.quelle
      .getAllSessions()
      .filter((s) => s.status !== 'closed' && (s.terminalType === undefined || s.terminalType === 'claude-code'))
      .map((s) => s.sessionId);
  }

  // ---- Persistenz D10 ----

  private ladeSchalter(): boolean {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.statePath, 'utf-8')) as { an?: unknown };
      return parsed.an === true;
    } catch {
      return false;
    }
  }

  private speichereSchalter(): void {
    try {
      fs.mkdirSync(path.dirname(this.statePath), { recursive: true });
      atomarSchreiben(this.statePath, `${JSON.stringify({ an: this.an })}\n`);
    } catch (err) {
      console.warn('[Anruf] Schalter nicht gespeichert:', (err as Error)?.message ?? 'Fehler');
    }
  }

  // ---- Kontext-Dateien D2 ----

  private kontextOrdner(): boolean {
    try {
      fs.mkdirSync(this.kontextDir, { recursive: true, mode: 0o700 });
      fs.chmodSync(this.kontextDir, 0o700);
      return true;
    } catch (err) {
      console.warn('[Anruf] Kontext-Ordner fehlt:', (err as Error)?.message ?? 'Fehler');
      return false;
    }
  }

  private schreibeKontextAn(): void {
    if (!this.kontextOrdner()) return;
    const inhalt = JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: ANRUF_ANWEISUNG_AN } });
    try {
      atomarSchreiben(path.join(this.kontextDir, 'an.json'), inhalt);
    } catch (err) {
      console.warn('[Anruf] an.json nicht geschrieben:', (err as Error)?.message ?? 'Fehler');
    }
  }

  /** Ausschalten: `an.json` weg, `aus-<id>.json` für jede lebende Sitzung der An-Zeit (AN-S04). */
  private schreibeKontextAus(): void {
    this.entferneDatei(path.join(this.kontextDir, 'an.json'));
    const lebend = new Set(this.lebendeClaudeSitzungen());
    const ids = [...this.anSitzungen].filter((id) => lebend.has(id) && CLOUD_SESSION_ID_RE.test(id));
    this.anSitzungen.clear();
    if (ids.length === 0 || !this.kontextOrdner()) return;
    const inhalt = JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: ANRUF_ANWEISUNG_AUS } });
    for (const id of ids) {
      try {
        atomarSchreiben(path.join(this.kontextDir, `aus-${id}.json`), inhalt);
      } catch (err) {
        console.warn('[Anruf] aus-Datei nicht geschrieben:', (err as Error)?.message ?? 'Fehler');
      }
    }
  }

  private entferneAusDatei(sessionId: string): void {
    if (!CLOUD_SESSION_ID_RE.test(sessionId)) return;
    this.entferneDatei(path.join(this.kontextDir, `aus-${sessionId}.json`));
  }

  /** Boot: `aus-*` von Sitzungen, die es nicht mehr gibt, und liegengebliebene tmp-Dateien. */
  private raeumeVerwaisteAus(): void {
    let namen: string[];
    try {
      namen = fs.readdirSync(this.kontextDir);
    } catch {
      return;
    }
    const lebend = new Set(this.lebendeClaudeSitzungen());
    for (const name of namen) {
      const treffer = /^aus-(.+)\.json$/.exec(name);
      if ((treffer && !lebend.has(treffer[1])) || name.includes('.tmp-')) this.entferneDatei(path.join(this.kontextDir, name));
    }
  }

  private entferneDatei(datei: string): void {
    try {
      fs.rmSync(datei, { force: true });
    } catch {
      // weg ist weg
    }
  }
}
