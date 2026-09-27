/**
 * Anruf-Sender (INT-2026-025, Plan D8, AR-08): schickt die Antwort eines
 * Anrufs als Tasten in die Claude-Code-Sitzung — Rückfrage beantworten, Plan
 * freigeben oder überarbeiten, nach „fertig" eine neue Eingabe.
 *
 * Regeln (AR-08):
 * - jeder Vorgang läuft in genau EINEM `withMachineWrite` (kein Verschachteln,
 *   Review F2); ein laufender Maschinen-Schreibvorgang → `beschaeftigt`;
 * - jede Taste mit `inferUnblock: false` — erst die Bestätigung der Sitzung
 *   (Hook-Ereignis bzw. verschwundener Dialog) zählt als Antwort;
 * - nach jeder Taste eine Pause und ein stabiles Nachlesen; passt das Bild
 *   nicht, wird abgebrochen — ohne Esc, ohne Löschen;
 * - feste Obergrenze der Tasten je Vorgang (Rückfrage Σ(Ziffern + 3) + 2).
 *
 * Tastenprotokoll Claude Code 2.1.283 (Plan §2 und §14, Fixtures
 * tests/fixtures/tui/2.1.283/):
 * - Einzelauswahl: Ziffer n wählt und springt weiter (einzige Frage: sendet).
 * - Einzelauswahl, eigene Antwort: Ziffer der eigenen Zeile fokussiert sie,
 *   Bracketed Paste ersetzt die Beschriftung, Enter springt weiter / sendet.
 * - Mehrfachauswahl: Ziffer schaltet den Haken, der Fokus bleibt; `Tab` geht
 *   weiter. Mit eigener Antwort: Ziffer setzt nur den Haken, der Fokus wird
 *   mit Pfeiltasten einzeln auf die Zeile gebracht, dann Paste; `Tab` springt
 *   danach auf „Submit" der Frage, `Enter` dort geht weiter.
 * - Nach der letzten Frage erscheint (bei mehreren Fragen oder
 *   Mehrfachauswahl) die Prüfseite; `1` = „Submit answers".
 * - Plan: `1` gibt frei; Ziffer der Freitext-Option fokussiert sie, Paste
 *   ersetzt die Beschriftung, Enter schickt die Überarbeitung.
 *
 * Datenklasse: der gesendete Text ist Projektinhalt (ADR-0006) — er wird
 * weder geloggt noch gespeichert.
 */

import type { BlockKind } from '../../shared/types/hook-events.protocol.js';
import type { CloudTerminalAgentEvent, CloudTerminalAgentStatus, CloudTerminalSessionStatus } from '../../shared/types/cloud-terminal.protocol.js';
import {
  ANRUF_SENDE_GRUND_TEXT,
  type AnrufAntwort,
  type AnrufArt,
  type AnrufFrage,
  type AnrufFrageAntwort,
  type AnrufSendeGrund,
} from '../../shared/types/anruf.protocol.js';
import type { MachineWriteResult } from './cloud-terminal-manager.js';
import { eingabeText, findDialogCue, promptZustand, pruefeEingabeWartet, readStableScreen, type CursorProbe } from './dialog-driver.js';
import { injectProbe, optionLineHas, parsePlanDialog, planOptionVoll, sanitizeInjectText, type PlanDialogState } from '../utils/plan-dialog-state.js';
import { parseRueckfrageDialog, type RueckfrageDialog } from '../utils/rueckfrage-dialog-state.js';

// ---------------------------------------------------------------------------
// Schnittstelle
// ---------------------------------------------------------------------------

export type AnrufAgentEventListener = (
  sessionId: string,
  event: CloudTerminalAgentEvent,
  detail?: { status?: CloudTerminalAgentStatus }
) => void;

/** Der Ausschnitt des CloudTerminalManager, den der Sender braucht (strukturell erfüllt). */
export interface AnrufSenderQuelle {
  withMachineWrite<T>(id: string, fn: () => Promise<T>): Promise<MachineWriteResult<T>>;
  sendInput(id: string, data: string, opts?: { inferUnblock?: boolean }): void | boolean;
  readScreen(id: string, opts?: { scrollback?: number }): Promise<{ text: string; live: boolean }>;
  readCursorProbe?(id: string): Promise<CursorProbe | null>;
  waitForIdle(id: string, ms: number): Promise<void>;
  getSession(id: string): { status?: CloudTerminalSessionStatus; agentStatus?: CloudTerminalAgentStatus; blockKind?: BlockKind } | undefined;
  on(event: 'session.agent-event', l: AnrufAgentEventListener): unknown;
  off(event: 'session.agent-event', l: AnrufAgentEventListener): unknown;
}

export interface AnrufSendeAuftrag {
  sessionId: string;
  art: AnrufArt;
  /** Rückfrage: die Fragen aus dem Hook (D1), in Reihenfolge der Tabs. */
  fragen?: AnrufFrage[];
  antwort: AnrufAntwort;
}

export type AnrufSendeErgebnis = { ok: true } | { ok: false; grund: AnrufSendeGrund; text: string };

export type AnrufFreigabeWortlaut = { wortlaut: string } | { ok: false; grund: AnrufSendeGrund; text: string };

export interface AnrufSenderDeps {
  quelle: AnrufSenderQuelle;
  planReview?: { isReviewRunning(id: string): boolean };
  /** Pause nach jeder Taste (Standard 100 ms). */
  pauseMs?: number;
  /** Frist der Bestätigung für Rückfrage und neue Eingabe (Standard 10 s); Plan freigeben höchstens 3 s. */
  bestaetigungMs?: number;
  /** Pause zwischen Paste und dem Nachlesen davor (Standard 150 ms). */
  pasteMs?: number;
}

// ---------------------------------------------------------------------------
// Konstanten
// ---------------------------------------------------------------------------

/** Wortlaute der Option 1 im Plan-Dialog, bei denen „freigeben" die Taste `1` drückt (Review F8). */
export const ANRUF_JA_LISTE: readonly string[] = [
  'Yes, and switch to BYPASS PERMISSIONS (no further prompts) for this session',
  'Yes, and auto-accept edits',
  'Yes, manually approve edits',
];

const PAUSE_MS = 100;
const PASTE_MS = 150;
const BESTAETIGUNG_MS = 10_000;
const FREIGABE_BESTAETIGUNG_MS = 3_000;
const POLL_MS = 250;

const PASTE_START = '\x1b[200~';
const PASTE_END = '\x1b[201~';
const ENTER = '\r';
const TAB = '\t';
const PFEIL_RUNTER = '\x1b[B';
const PFEIL_HOCH = '\x1b[A';

const FREITEXT_LABEL = /^Tell Claude what to change\.?$/;
const CLEAR_CONTEXT = /clear context/i;
/** Claude Code fasst lange Pastes zu einem Platzhalter zusammen. */
const PASTE_PLATZHALTER = /\[Pasted text/;
const SUBMIT_ANSWERS = /^Submit answers$/;
const TEXTANFANG_ZEICHEN = 40;
const TEXT_STEHT_HINWEIS = 'Dein Text steht noch in der Eingabezeile bzw. im Plan-Dialog — im Terminal prüfen, abschicken oder löschen';

// ---------------------------------------------------------------------------
// Hilfen
// ---------------------------------------------------------------------------

class SendeAbbruch extends Error {
  constructor(readonly grund: AnrufSendeGrund) {
    super(grund);
  }
}

const abbruch = (grund: AnrufSendeGrund): SendeAbbruch => new SendeAbbruch(grund);

const falsch = (grund: AnrufSendeGrund): { ok: false; grund: AnrufSendeGrund; text: string } => ({
  ok: false,
  grund,
  text: ANRUF_SENDE_GRUND_TEXT[grund],
});

const zusammen = (s: string): string => s.replace(/\s+/g, ' ').trim();

const gleicheFrage = (bildschirm: string, hook: string): boolean => zusammen(bildschirm) === zusammen(hook);

/** Zeilenumbrüche → Leerzeichen, dann `sanitizeInjectText` (Review F19). */
export function anrufText(text: string): string {
  return sanitizeInjectText(text.replace(/\r\n|\r|\n/g, ' ')).trim();
}

const paste = (text: string): string => PASTE_START + text + PASTE_END;

/** Trägt die Zeile den Anfang des eingefügten Textes (oder den Paste-Platzhalter)? */
function zeigtText(zeile: string | null | undefined, probe: string): boolean {
  if (!zeile) return false;
  return zusammen(zeile).includes(zusammen(probe)) || PASTE_PLATZHALTER.test(zeile);
}

interface Vorgang {
  id: string;
  tasten: number;
  grenze: number;
  /** Eingefügter Text, der noch nicht abgeschickt ist (Hinweis beim Abbruch, ext. Review 12). */
  textSteht?: string;
  ereignisse: Array<{ event: CloudTerminalAgentEvent; status?: CloudTerminalAgentStatus }>;
}

/** Obergrenze der Tasten einer Rückfrage: Σ(Ziffern + 3 + Navigation) + 2. */
export function rueckfrageObergrenze(fragen: AnrufFrage[], antworten: AnrufFrageAntwort[]): number {
  let summe = 2;
  fragen.forEach((f, i) => {
    const a = antworten[i];
    const ziffern = (a?.nummern.length ?? 0) + (a?.eigene !== undefined ? 1 : 0);
    // Mehrfachauswahl mit eigener Antwort: Fokus einzeln auf die eigene Zeile (§14).
    const navigation = f.mehrfach && a?.eigene !== undefined ? f.optionen.length + 1 : 0;
    summe += ziffern + 3 + navigation;
  });
  return summe;
}

// ---------------------------------------------------------------------------
// Sender
// ---------------------------------------------------------------------------

export class AnrufSender {
  private readonly quelle: AnrufSenderQuelle;
  private readonly planReview?: { isReviewRunning(id: string): boolean };
  private readonly pauseMs: number;
  private readonly bestaetigungMs: number;
  private readonly pasteMs: number;

  constructor(deps: AnrufSenderDeps) {
    this.quelle = deps.quelle;
    this.planReview = deps.planReview;
    this.pauseMs = deps.pauseMs ?? PAUSE_MS;
    this.bestaetigungMs = deps.bestaetigungMs ?? BESTAETIGUNG_MS;
    this.pasteMs = deps.pasteMs ?? (deps.pauseMs === 0 ? 0 : PASTE_MS);
  }

  /**
   * Liest den Plan-Dialog und liefert den Wortlaut der Ja-Option für die
   * Nachfrage (AN-S10). Drückt keine Taste und nimmt keinen Lock.
   */
  async freigabeWortlaut(sessionId: string): Promise<AnrufFreigabeWortlaut> {
    try {
      if (this.planReview?.isReviewRunning(sessionId)) throw abbruch('plan_review_laeuft');
      this.pruefeStatus(sessionId, 'plan');
      const { dialog, bild } = await this.liesPlanBild(sessionId);
      return { wortlaut: this.jaWortlaut(dialog, bild) };
    } catch (e) {
      if (e instanceof SendeAbbruch) return falsch(e.grund);
      return falsch('bildschirm_unpassend');
    }
  }

  async sende(auftrag: AnrufSendeAuftrag): Promise<AnrufSendeErgebnis> {
    const { sessionId } = auftrag;
    if (!this.quelle.getSession(sessionId)) return falsch('sitzung_weg');
    const vorgang: Vorgang = { id: sessionId, tasten: 0, grenze: 0, ereignisse: [] };
    const hoerer: AnrufAgentEventListener = (id, event, detail) => {
      if (id === sessionId) vorgang.ereignisse.push({ event, status: detail?.status });
    };
    const ergebnis = await this.quelle.withMachineWrite(sessionId, async (): Promise<AnrufSendeErgebnis> => {
      this.quelle.on('session.agent-event', hoerer);
      try {
        await this.fuehreAus(vorgang, auftrag);
        return { ok: true };
      } catch (e) {
        const grund = e instanceof SendeAbbruch ? e.grund : 'bildschirm_unpassend';
        return this.abbruchErgebnis(grund, vorgang.textSteht);
      } finally {
        this.quelle.off('session.agent-event', hoerer);
      }
    });
    if (!ergebnis.ok) return falsch(ergebnis.grund === 'beschaeftigt' ? 'beschaeftigt' : 'sitzung_weg');
    return ergebnis.value;
  }

  // ---- Ablauf ------------------------------------------------------------

  private async fuehreAus(v: Vorgang, auftrag: AnrufSendeAuftrag): Promise<void> {
    const { antwort } = auftrag;
    if (auftrag.art === 'fertig' && antwort.art === 'text') return this.sendeText(v, antwort.text);
    if (auftrag.art === 'rueckfrage' && antwort.art === 'rueckfrage') return this.sendeRueckfrage(v, auftrag.fragen ?? [], antwort.antworten);
    if (auftrag.art === 'plan' && antwort.art === 'freigeben') return this.sendeFreigabe(v);
    if (auftrag.art === 'plan' && antwort.art === 'ueberarbeiten') return this.sendeUeberarbeitung(v, antwort.text);
    throw abbruch('bildschirm_unpassend');
  }

  /** Fertig → neue Eingabe: leere Eingabezeile, Paste, Pause, Enter; Bestätigung `prompt-submitted`. */
  private async sendeText(v: Vorgang, roh: string): Promise<void> {
    const text = anrufText(roh);
    if (text === '') throw abbruch('bildschirm_unpassend');
    v.grenze = 2;
    this.pruefeStatus(v.id, 'fertig');
    const bild = await this.lies(v.id);
    switch (await pruefeEingabeWartet(this.quelle, v.id, bild)) {
      case 'wartet':
        break;
      case 'eingabe_nicht_leer':
        throw abbruch('eingabe_nicht_leer');
      case 'dialog':
        throw abbruch('anderer_dialog');
      case 'arbeitet':
        throw abbruch('beschaeftigt');
    }
    await this.taste(v, paste(text), this.pasteMs);
    v.textSteht = text;
    const nachher = await this.lies(v.id);
    if (promptZustand(nachher) !== 'eingabe_nicht_leer' || !zeigtText(eingabeText(nachher), injectProbe(text))) {
      throw abbruch('bildschirm_unpassend');
    }
    const ab = v.ereignisse.length;
    await this.taste(v, ENTER);
    await this.bestaetige(v, ab, (e) => e.event === 'prompt-submitted', () => false, this.bestaetigungMs);
    v.textSteht = undefined;
  }

  /** Plan freigeben: feste Ja-Liste, kein Text im Dialog, Fokus nicht auf Freitext → `1`; Bestätigung Cue weg ≤ 3 s. */
  private async sendeFreigabe(v: Vorgang): Promise<void> {
    v.grenze = 1;
    if (this.planReview?.isReviewRunning(v.id)) throw abbruch('plan_review_laeuft');
    this.pruefeStatus(v.id, 'plan');
    const { dialog, bild } = await this.liesPlanBild(v.id);
    this.jaWortlaut(dialog, bild);
    this.pruefePlanVorzustand(dialog);
    const ab = v.ereignisse.length;
    await this.taste(v, '1');
    await this.bestaetige(
      v,
      ab,
      () => false,
      (bild) => findDialogCue(bild)?.kind !== 'plan',
      Math.min(this.bestaetigungMs, FREIGABE_BESTAETIGUNG_MS)
    );
  }

  /** Plan überarbeiten: Ziffer der Freitext-Option (aus `target`), Paste, Enter; Bestätigung Cue weg / working. */
  private async sendeUeberarbeitung(v: Vorgang, roh: string): Promise<void> {
    const text = anrufText(roh);
    if (text === '') throw abbruch('bildschirm_unpassend');
    v.grenze = 3;
    this.pruefeStatus(v.id, 'plan');
    const vorher = await this.liesPlan(v.id);
    this.pruefePlanVorzustand(vorher);
    const ziel = vorher.target;

    await this.taste(v, String(ziel));
    const fokus = await this.liesPlan(v.id);
    if (fokus.focused !== ziel || fokus.target !== ziel || !FREITEXT_LABEL.test(fokus.lines[ziel] ?? '')) throw abbruch('bildschirm_unpassend');

    const probe = injectProbe(text);
    await this.taste(v, paste(text), this.pasteMs);
    v.textSteht = text;
    const mitText = await this.liesPlan(v.id);
    if (mitText.focused !== ziel || !(optionLineHas(mitText, ziel, probe) || PASTE_PLATZHALTER.test(mitText.lines[ziel] ?? ''))) {
      throw abbruch('bildschirm_unpassend');
    }

    const ab = v.ereignisse.length;
    await this.taste(v, ENTER);
    // Nach „Tell Claude what to change" kommt kein PostToolUse (§14): der Dialog
    // verschwindet, die Sitzung arbeitet, oder ein neuer Dialog ohne unseren Text steht da.
    await this.bestaetige(
      v,
      ab,
      (e) => e.status === 'working' || e.event === 'prompt-submitted',
      (bild) => {
        if (findDialogCue(bild)?.kind !== 'plan') return true;
        const neu = parsePlanDialog(bild);
        return neu !== null && !zeigtText(neu.lines[neu.target], probe);
      },
      this.bestaetigungMs
    );
    v.textSteht = undefined;
  }

  /** Rückfrage: je Frage das gemessene Primitiv, nach jeder Taste nachlesen; zuletzt Prüfseite `1`. */
  private async sendeRueckfrage(v: Vorgang, fragen: AnrufFrage[], antworten: AnrufFrageAntwort[]): Promise<void> {
    this.pruefeAntworten(fragen, antworten);
    v.grenze = rueckfrageObergrenze(fragen, antworten);
    this.pruefeStatus(v.id, 'rueckfrage');

    const bild = await this.lies(v.id);
    const cue = findDialogCue(bild);
    if (cue && cue.kind !== 'rueckfrage') throw abbruch('anderer_dialog');
    let dialog = parseRueckfrageDialog(bild);
    if (!dialog) throw abbruch('bildschirm_unpassend');
    // Vorzustand (Review F7): nichts im Terminal begonnen.
    if (dialog.pruefseite || !dialog.tabs || dialog.tabs.length !== fragen.length) throw abbruch('bildschirm_unpassend');
    if (dialog.tabs.some((t) => t.beantwortet)) throw abbruch('bildschirm_unpassend');
    if (!gleicheFrage(dialog.frage, fragen[0].frage)) throw abbruch('anderer_dialog');

    const ab = v.ereignisse.length;
    for (let i = 0; i < fragen.length; i++) {
      const naechste = await this.beantworteFrage(v, i, fragen, antworten[i], dialog);
      if (naechste === 'fertig') break;
      dialog = naechste;
    }
    await this.bestaetige(v, ab, (e) => e.event === 'unblocked', (b) => findDialogCue(b)?.kind !== 'rueckfrage', this.bestaetigungMs);
  }

  private async beantworteFrage(
    v: Vorgang,
    i: number,
    fragen: AnrufFrage[],
    antwort: AnrufFrageAntwort,
    dialog: RueckfrageDialog
  ): Promise<RueckfrageDialog | 'fertig'> {
    const frage = fragen[i];
    this.pruefeFrageVorzustand(dialog, frage);
    const eigeneNr = dialog.eigeneNr as number;
    const eigene = antwort.eigene !== undefined ? anrufText(antwort.eigene) : undefined;

    if (!frage.mehrfach) {
      if (eigene === undefined) {
        await this.taste(v, String(antwort.nummern[0]));
        return this.weiter(v, i, fragen);
      }
      await this.taste(v, String(eigeneNr));
      const fokus = await this.liesFrage(v.id, frage);
      if (fokus.fokusNr !== eigeneNr || fokus.eigeneText !== null) throw abbruch('bildschirm_unpassend');
      await this.fuegeEigeneEin(v, frage, eigeneNr, eigene);
      await this.taste(v, ENTER);
      return this.weiter(v, i, fragen);
    }

    // Mehrfachauswahl: Haken einzeln setzen, der Fokus bleibt stehen.
    const ziffern = [...new Set(antwort.nummern)].sort((a, b) => a - b);
    if (eigene !== undefined) ziffern.push(eigeneNr);
    const gesetzt = new Set<number>();
    let aktuell = dialog;
    for (const n of ziffern) {
      await this.taste(v, String(n));
      const nach = await this.liesFrage(v.id, frage);
      gesetzt.add(n);
      const haken = new Set(nach.optionen.filter((o) => o.haken).map((o) => o.nr));
      if (haken.size !== gesetzt.size || [...gesetzt].some((g) => !haken.has(g))) throw abbruch('bildschirm_unpassend');
      if (nach.fokusNr !== aktuell.fokusNr || nach.fokusAufSubmit) throw abbruch('bildschirm_unpassend');
      aktuell = nach;
    }

    if (eigene !== undefined) {
      // Fokus einzeln auf die eigene Zeile (§14: die Ziffer fokussiert hier nicht).
      for (let schritt = 0; aktuell.fokusNr !== eigeneNr && schritt <= frage.optionen.length; schritt++) {
        const runter = aktuell.fokusNr !== null && aktuell.fokusNr < eigeneNr;
        await this.taste(v, runter ? PFEIL_RUNTER : PFEIL_HOCH);
        aktuell = await this.liesFrage(v.id, frage);
      }
      if (aktuell.fokusNr !== eigeneNr || aktuell.eigeneText !== null) throw abbruch('bildschirm_unpassend');
      await this.fuegeEigeneEin(v, frage, eigeneNr, eigene);
    }

    await this.taste(v, TAB);
    const nachTab = await this.lies(v.id);
    const aufSubmit = parseRueckfrageDialog(nachTab);
    if (aufSubmit && !aufSubmit.pruefseite && gleicheFrage(aufSubmit.frage, frage.frage)) {
      // Mit eigener Antwort landet Tab auf „Submit" der Frage; Enter geht weiter.
      if (!aufSubmit.fokusAufSubmit) throw abbruch('bildschirm_unpassend');
      await this.taste(v, ENTER);
      return this.weiter(v, i, fragen);
    }
    return this.weiter(v, i, fragen, nachTab);
  }

  /** Paste der eigenen Antwort in die fokussierte eigene Zeile, dann nachlesen. */
  private async fuegeEigeneEin(v: Vorgang, frage: AnrufFrage, eigeneNr: number, text: string): Promise<void> {
    if (text === '') throw abbruch('bildschirm_unpassend');
    await this.taste(v, paste(text), this.pasteMs);
    v.textSteht = text;
    const nach = await this.liesFrage(v.id, frage);
    if (nach.fokusNr !== eigeneNr || !zeigtText(nach.eigeneText, injectProbe(text))) throw abbruch('bildschirm_unpassend');
  }

  /**
   * Das Bild nach dem Abschluss der Frage `i`: die nächste Frage (Tab `i`
   * beantwortet), nach der letzten die Prüfseite (`1`) oder kein Dialog mehr.
   */
  private async weiter(v: Vorgang, i: number, fragen: AnrufFrage[], gelesen?: string): Promise<RueckfrageDialog | 'fertig'> {
    const bild = gelesen ?? (await this.lies(v.id));
    const letzte = i === fragen.length - 1;
    const dialog = parseRueckfrageDialog(bild);
    if (!dialog) {
      if (letzte && findDialogCue(bild)?.kind !== 'rueckfrage') {
        v.textSteht = undefined;
        return 'fertig';
      }
      throw abbruch('bildschirm_unpassend');
    }
    if (dialog.pruefseite) {
      const erste = dialog.pruefseiteOptionen?.[0];
      if (!letzte || !erste || erste.nr !== 1 || !SUBMIT_ANSWERS.test(erste.text)) throw abbruch('bildschirm_unpassend');
      if (dialog.tabs?.some((t) => !t.beantwortet)) throw abbruch('bildschirm_unpassend');
      v.textSteht = undefined;
      await this.taste(v, '1');
      return 'fertig';
    }
    if (letzte || !gleicheFrage(dialog.frage, fragen[i + 1].frage)) throw abbruch('bildschirm_unpassend');
    if (dialog.tabs?.[i]?.beantwortet !== true) throw abbruch('bildschirm_unpassend');
    v.textSteht = undefined;
    return dialog;
  }

  // ---- Prüfungen ---------------------------------------------------------

  /** FA-24: Sitzungsstatus passt zur Meldung. */
  private pruefeStatus(sessionId: string, art: AnrufArt): void {
    const s = this.quelle.getSession(sessionId);
    if (!s || (s.status !== undefined && s.status !== 'active')) throw abbruch('sitzung_weg');
    if (art === 'fertig') {
      if (s.agentStatus === 'done' || s.agentStatus === 'idle') return;
      if (s.agentStatus === 'blocked') throw abbruch('anderer_dialog');
      if (s.agentStatus === 'working') throw abbruch('beschaeftigt');
      throw abbruch('bildschirm_unpassend');
    }
    if (s.agentStatus !== 'blocked') throw abbruch('schon_beantwortet');
    if (s.blockKind !== art) throw abbruch('anderer_dialog');
  }

  private pruefeAntworten(fragen: AnrufFrage[], antworten: AnrufFrageAntwort[]): void {
    if (fragen.length === 0 || fragen.length > 4 || antworten.length !== fragen.length) throw abbruch('bildschirm_unpassend');
    fragen.forEach((f, i) => {
      const a = antworten[i];
      if (a.nummern.some((n) => !Number.isInteger(n) || n < 1 || n > f.optionen.length)) throw abbruch('bildschirm_unpassend');
      const eigene = a.eigene !== undefined;
      if (eigene && anrufText(a.eigene ?? '') === '') throw abbruch('bildschirm_unpassend');
      if (f.mehrfach ? a.nummern.length === 0 && !eigene : a.nummern.length + (eigene ? 1 : 0) !== 1) {
        throw abbruch('bildschirm_unpassend');
      }
    });
  }

  /** Review F7: Art passt, eigene Zeile ist die letzte, Fokus nicht auf ihr, keine vorgesetzten Haken, kein Text. */
  private pruefeFrageVorzustand(d: RueckfrageDialog, frage: AnrufFrage): void {
    if (d.pruefseite || d.mehrfach !== frage.mehrfach) throw abbruch('bildschirm_unpassend');
    if (d.eigeneNr !== frage.optionen.length + 1 || d.optionen.length !== frage.optionen.length + 1) throw abbruch('bildschirm_unpassend');
    if (d.fokusNr === null || d.fokusNr === d.eigeneNr || d.fokusAufSubmit) throw abbruch('bildschirm_unpassend');
    if (d.eigeneText !== null) throw abbruch('bildschirm_unpassend');
    if (d.optionen.some((o) => o.haken)) throw abbruch('bildschirm_unpassend');
  }

  /** Kein fremder Text in der Freitext-Option (Plan-Review-Kollision), Fokus nicht auf ihr. */
  private pruefePlanVorzustand(d: PlanDialogState): void {
    if (!FREITEXT_LABEL.test(d.lines[d.target] ?? '')) throw abbruch('text_im_dialog');
    if (d.focused === d.target) throw abbruch('bildschirm_unpassend');
  }

  /** Review F8: Option 1 steht wörtlich in der Ja-Liste, sonst `unbekannte_freigabe`; umbrochene Beschriftung zusammengesetzt. */
  private jaWortlaut(d: PlanDialogState, bild: string): string {
    const wortlaut = planOptionVoll(bild, 1) ?? zusammen(d.lines[1] ?? '');
    if (CLEAR_CONTEXT.test(wortlaut) || !ANRUF_JA_LISTE.includes(wortlaut)) throw abbruch('unbekannte_freigabe');
    return wortlaut;
  }

  // ---- Lesen, Tasten, Bestätigung ---------------------------------------

  private async lies(sessionId: string): Promise<string> {
    const bild = await readStableScreen(this.quelle, sessionId);
    if (bild === 'unstable' || !bild.live) throw abbruch('bildschirm_unpassend');
    return bild.text;
  }

  private async liesPlan(sessionId: string): Promise<PlanDialogState> {
    return (await this.liesPlanBild(sessionId)).dialog;
  }

  private async liesPlanBild(sessionId: string): Promise<{ dialog: PlanDialogState; bild: string }> {
    const bild = await this.lies(sessionId);
    const cue = findDialogCue(bild);
    if (cue && cue.kind !== 'plan') throw abbruch('anderer_dialog');
    const dialog = parsePlanDialog(bild);
    if (!dialog) throw abbruch('bildschirm_unpassend');
    return { dialog, bild };
  }

  /** Dieselbe Frage wie erwartet, noch nicht weitergesprungen. */
  private async liesFrage(sessionId: string, frage: AnrufFrage): Promise<RueckfrageDialog> {
    const dialog = parseRueckfrageDialog(await this.lies(sessionId));
    if (!dialog || dialog.pruefseite || !gleicheFrage(dialog.frage, frage.frage)) throw abbruch('bildschirm_unpassend');
    return dialog;
  }

  private async taste(v: Vorgang, daten: string, pauseMs = this.pauseMs): Promise<void> {
    if (v.tasten >= v.grenze) throw abbruch('bildschirm_unpassend');
    v.tasten++;
    if (this.quelle.sendInput(v.id, daten, { inferUnblock: false }) === false) throw abbruch('sitzung_weg');
    await schlafe(pauseMs);
  }

  /**
   * Wartet auf ein passendes Ereignis seit `ab` oder ein passendes Bild. Ein
   * Bild zählt hier, weil die UI den Wechsel gerade selbst ausgelöst hat (AR-08).
   */
  private async bestaetige(
    v: Vorgang,
    ab: number,
    ereignisPasst: (e: Vorgang['ereignisse'][number]) => boolean,
    bildPasst: (bild: string) => boolean,
    fristMs: number
  ): Promise<void> {
    const ende = Date.now() + fristMs;
    for (;;) {
      if (v.ereignisse.slice(ab).some(ereignisPasst)) return;
      if (!this.quelle.getSession(v.id)) throw abbruch('sitzung_weg');
      const { text, live } = await this.quelle.readScreen(v.id);
      if (live && bildPasst(text)) return;
      if (v.ereignisse.slice(ab).some(ereignisPasst)) return;
      const rest = ende - Date.now();
      if (rest <= 0) throw abbruch('nicht_bestaetigt');
      await schlafe(Math.min(POLL_MS, rest));
    }
  }

  private abbruchErgebnis(grund: AnrufSendeGrund, textSteht: string | undefined): AnrufSendeErgebnis {
    const basis = ANRUF_SENDE_GRUND_TEXT[grund];
    if (textSteht === undefined) return { ok: false, grund, text: basis };
    const anfang = textSteht.length > TEXTANFANG_ZEICHEN ? `${textSteht.slice(0, TEXTANFANG_ZEICHEN)}…` : textSteht;
    return { ok: false, grund, text: `${basis} ${TEXT_STEHT_HINWEIS}: „${anfang}"` };
  }
}

function schlafe(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    t.unref?.();
  });
}
