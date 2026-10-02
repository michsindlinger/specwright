/**
 * EingangService — neue Claude-Sitzung von außen (INT-2026-030, ADR-0007).
 *
 * Ein lokales Programm (hey) schickt Projektpfad und Satz; der Dienst prüft
 * Satz, Projekt, Opus, Hook-Bereitschaft und Obergrenzen, startet über den
 * bestehenden Startpfad eine Sitzung in einer neuen Arbeitskopie und verfolgt,
 * ob der Satz als erster Prompt angekommen ist (Stufe 2).
 *
 * Datenhaltung (security.md §1):
 * - Geheimnis `<runtime>/eingang-<port>.token` (0600, vertraulich) — nie in Log, Antwort, Broadcast.
 * - Zustand `<runtime>/eingang-<port>.json` (0600) — nur Hash des Satzes (RB-04).
 *   Quelle der Wahrheit ist der Speicher; die Datei wird nur beim Bau gelesen.
 * - Protokoll `<runtime>/eingang-<port>.jsonl` (0600) — Satz nur bei berechtigten Anfragen.
 *
 * Der Dienst schreibt in keine Sitzung und schließt keine (FA-18, AR-08): er
 * ruft nur `createSession` und liest einmal den Bildschirm (D12).
 */

import * as fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname } from 'node:path';
import type { WorkspaceState } from '../../shared/types/workspace.protocol.js';
import type {
  CloudTerminalSession,
  CloudTerminalSessionId,
  CloudTerminalModelConfig,
  CloudTerminalType,
} from '../../shared/types/cloud-terminal.protocol.js';
import type { ParsedTarget } from '../utils/session-target.js';
import type { LokalAnfrage } from '../utils/lokal-verbindung.js';
import { CLOUD_SESSION_ID_RE } from './claude-hooks.js';
import { findDialogCue } from './dialog-driver.js';
import {
  GRUND,
  SATZ_MAX,
  bereinigeSatz,
  bildeTitel,
  istBerechtigt,
  satzHash,
} from './eingang-regeln.js';

export const OFFEN_MAX = 3;
export const FENSTER_MAX = 5;
export const FENSTER_MS = 60_000;
export const STUFE2_FRIST_MS = 60_000;
export const ZUSTAND_HALTEN_MS = 24 * 60 * 60 * 1000;
export const PROTOKOLL_TAGE_MS = 30 * 24 * 60 * 60 * 1000;
export const PROTOKOLL_MAX_BYTES = 10 * 1024 * 1024;
const FRUEH_MAX = 20;
const FRUEH_MS = 120_000;
const TOKEN_RE = /^[0-9a-f]{64}$/;

export type EingangZustand = 'startet' | 'aktiv' | 'fehler';

export interface EingangEintrag {
  sessionId: string;
  projektName: string;
  stufe1At: string;
  zustand: EingangZustand;
  grund?: string;
  satzHash: string;
  closedAt?: string;
}

interface ZustandDatei {
  version: 1;
  eintraege: EingangEintrag[];
}

export interface EingangAntwort {
  status: number;
  body: Record<string, unknown>;
}

export interface ProtokollZeile {
  zeit: string;
  art: 'start' | 'status';
  projekt?: string;
  absender: string;
  ergebnis: number;
  grund?: string;
  satz?: string;
  gekuerzt?: true;
  sessionId?: string;
  zustand?: string;
}

/** Ausschnitt des CloudTerminalManager, den der Eingang braucht. */
export interface EingangSitzungen {
  createSession(
    projectPath: string,
    terminalType: CloudTerminalType,
    modelConfig?: CloudTerminalModelConfig,
    cols?: number,
    rows?: number,
    initialPrompt?: string,
    extraCliArgs?: string[],
    extraEnv?: Record<string, string>,
    options?: { sessionTarget?: ParsedTarget; promptNachTrenner?: boolean }
  ): Promise<CloudTerminalSession>;
  getHookSecret(): string | undefined;
  getSession(sessionId: CloudTerminalSessionId): CloudTerminalSession | undefined;
  whenReady(): Promise<void>;
  readScreen(sessionId: CloudTerminalSessionId): Promise<{ text: string }>;
  on(event: 'session.prompt-text' | 'session.closed', listener: (sessionId: string, prompt: string) => void): unknown;
  off(event: 'session.prompt-text' | 'session.closed', listener: (sessionId: string, prompt: string) => void): unknown;
}

export interface EingangDeps {
  sitzungen: EingangSitzungen;
  workspace: {
    getState(): WorkspaceState;
    openProjectFromBackend(path: string, name: string): void;
    setSessionName(sessionId: string, name: string | null): boolean;
  };
  vorhaben: {
    pruefeArbeitskopieMoeglich(projectPath: string): Promise<void>;
    scheduleRescan(delayMs?: number): void;
  };
  /** `getModel('anthropic','opus')` vorhanden (FA-23). */
  opusVerfuegbar: () => boolean;
  /** Hauptordner eines Pfads (`resolveMainWorktreePath`). */
  resolveMainPath: (p: string) => string;
  pfade: { token: string; zustand: string; protokoll: string };
  port: number;
  /** Wert von `SPECWRIGHT_EINGANG`. */
  schalter: string | undefined;
  plattform?: NodeJS.Platform;
  realpath?: (p: string) => string;
  now?: () => Date;
}

const OPUS: CloudTerminalModelConfig = { provider: 'anthropic', model: 'opus' };

const antwort = (status: number, body: Record<string, unknown>): EingangAntwort => ({ status, body });
const fehler = (status: number, text: string): EingangAntwort => antwort(status, { fehler: text });

export class EingangService {
  private readonly deps: EingangDeps;
  private readonly now: () => Date;
  private readonly realpath: (p: string) => string;
  private readonly plattform: NodeJS.Platform;
  private readonly token: string | undefined;
  private eintraege = new Map<string, EingangEintrag>();
  private readonly timer = new Map<string, NodeJS.Timeout>();
  private readonly frueh = new Map<string, { at: number; ersterPrompt?: string; geschlossen?: boolean }>();
  private fenster: number[] = [];
  private reserviert = 0;
  private bereit = false;
  private writeChain: Promise<void> = Promise.resolve();
  private logChain: Promise<void> = Promise.resolve();
  private readonly onPrompt = (sessionId: string, prompt: string): void => this.promptGemeldet(sessionId, prompt);
  private readonly onClosed = (sessionId: string): void => this.sitzungGeschlossen(sessionId);

  constructor(deps: EingangDeps) {
    this.deps = deps;
    this.now = deps.now ?? ((): Date => new Date());
    this.realpath = deps.realpath ?? ((p: string): string => fs.realpathSync(p));
    this.plattform = deps.plattform ?? process.platform;
    this.token = this.eingeschaltet() ? this.ladeOderErzeugeToken() : undefined;
    this.ladeZustand();
    // Listener einmal beim Bau (Plan D8, X1), damit kein frühes Ereignis verloren geht.
    deps.sitzungen.on('session.prompt-text', this.onPrompt);
    deps.sitzungen.on('session.closed', this.onClosed);
  }

  /** Abschalter + macOS (AN-S11, D2 Schritt 1). */
  public eingeschaltet(): boolean {
    return this.deps.schalter === 'on' && this.plattform === 'darwin';
  }

  public istBereit(): boolean {
    return this.bereit;
  }

  /** D2: Berechtigung einer Anfrage. */
  public berechtigt(req: LokalAnfrage): boolean {
    return istBerechtigt(req, { port: this.deps.port, token: this.token, schalter: this.deps.schalter, plattform: this.plattform });
  }

  /**
   * Nach dem Bau: altes Protokoll aufräumen, auf die Wiederherstellung der
   * Sitzungen warten, Zustand abgleichen. Erst danach nimmt der Eingang an.
   */
  public async start(): Promise<void> {
    await this.raeumeProtokollAuf();
    await this.deps.sitzungen.whenReady();
    for (const e of this.eintraege.values()) {
      if (e.closedAt) continue;
      const s = this.deps.sitzungen.getSession(e.sessionId);
      if (!s || s.status === 'closed') this.markiereGeschlossen(e);
      else if (e.zustand === 'startet') this.setzeFrist(e);
    }
    this.raeumeZustandAuf();
    this.speichere();
    this.bereit = true;
  }

  public dispose(): void {
    this.deps.sitzungen.off('session.prompt-text', this.onPrompt);
    this.deps.sitzungen.off('session.closed', this.onClosed);
    for (const t of this.timer.values()) clearTimeout(t);
    this.timer.clear();
  }

  /** Abgewiesene Anfrage (Berechtigung, Parser) — Protokoll ohne Satz (FA-17). */
  public protokolliereAbweisung(art: 'start' | 'status', absender: string, status: number, grund: string): void {
    this.protokolliere({ zeit: this.now().toISOString(), art, absender, ergebnis: status, grund });
  }

  /** POST: Anfrage einer berechtigten Quelle (D7). */
  public async starte(body: unknown, absender: string): Promise<EingangAntwort> {
    const zeile = (a: EingangAntwort, extra: Partial<ProtokollZeile> = {}): EingangAntwort => {
      this.protokolliere({
        zeit: this.now().toISOString(),
        art: 'start',
        absender,
        ergebnis: a.status,
        ...(typeof a.body.fehler === 'string' ? { grund: a.body.fehler } : {}),
        ...extra,
      });
      return a;
    };
    if (!this.bereit) return zeile(fehler(503, GRUND.backendStartet));
    if (!body || typeof body !== 'object' || Array.isArray(body)) return zeile(fehler(400, GRUND.anfrageUngueltig));
    const b = body as { projekt?: unknown; satz?: unknown; titel?: unknown };
    const projektRoh = typeof b.projekt === 'string' ? b.projekt : undefined;

    // Satz und Titel (D4) — Protokoll mit bereinigtem Satz, über 500 gekürzt markiert (AN-P3).
    const { satz, grund: satzGrund } = bereinigeSatz(b.satz);
    const satzLog: Partial<ProtokollZeile> = Array.from(satz).length > SATZ_MAX
      ? { satz: Array.from(satz).slice(0, SATZ_MAX).join(''), gekuerzt: true }
      : satz ? { satz } : {};
    const mitProjekt = (extra: Partial<ProtokollZeile>): Partial<ProtokollZeile> =>
      projektRoh !== undefined ? { projekt: projektRoh.slice(0, 300), ...extra } : extra;
    if (satzGrund) return zeile(fehler(400, satzGrund), mitProjekt(satzLog));
    const titel = bildeTitel(satz, b.titel);
    if (titel.grund || !titel.titel) return zeile(fehler(400, titel.grund ?? GRUND.titelUngueltig), mitProjekt(satzLog));
    if (projektRoh === undefined) return zeile(fehler(400, GRUND.anfrageUngueltig), satzLog);

    // Projekt (D5).
    const projekt = this.findeProjekt(projektRoh);
    if (!projekt) return zeile(fehler(404, GRUND.projektUnbekannt), mitProjekt(satzLog));
    const log = { projekt: projekt.name, ...satzLog };

    if (!this.deps.opusVerfuegbar()) return zeile(fehler(409, GRUND.opusFehlt), log);
    if (!this.deps.sitzungen.getHookSecret()) return zeile(fehler(503, GRUND.hookNichtBereit), log);

    // Obergrenzen (D6) — synchron vor dem ersten await reserviert.
    const jetzt = this.now().getTime();
    this.fenster = this.fenster.filter((t) => t > jetzt - FENSTER_MS);
    if (this.offeneZahl() + this.reserviert >= OFFEN_MAX) return zeile(fehler(429, GRUND.offenGrenze), log);
    if (this.fenster.length + this.reserviert >= FENSTER_MAX) return zeile(fehler(429, GRUND.fensterGrenze), log);
    this.reserviert++;
    let reserviert = true;
    const freigeben = (): void => {
      if (reserviert) {
        reserviert = false;
        this.reserviert--;
      }
    };

    try {
      try {
        await this.deps.vorhaben.pruefeArbeitskopieMoeglich(projekt.path);
      } catch (err) {
        return zeile(fehler(409, (err as Error).message || GRUND.keineArbeitskopie), log);
      }
      if (projekt.nurRecent) {
        try {
          this.deps.workspace.openProjectFromBackend(projekt.path, projekt.name);
          this.deps.vorhaben.scheduleRescan(0);
        } catch (err) {
          return zeile(fehler(409, `${GRUND.keineArbeitskopie}: ${(err as Error).message}`), log);
        }
      }
      let session: CloudTerminalSession;
      try {
        session = await this.deps.sitzungen.createSession(
          projekt.path,
          'claude-code',
          OPUS,
          undefined,
          undefined,
          satz,
          undefined,
          undefined,
          { sessionTarget: { target: { kind: 'new-worktree' }, explicit: true }, promptNachTrenner: true }
        );
      } catch (err) {
        return zeile(fehler(409, `${GRUND.keineArbeitskopie}: ${(err as Error).message}`), log);
      }
      // Synchron direkt nach dem await (D7): Eintrag vor jedem weiteren Ereignis.
      const sessionId = session.sessionId;
      const stufe1 = this.now();
      const eintrag: EingangEintrag = {
        sessionId,
        projektName: projekt.name,
        stufe1At: stufe1.toISOString(),
        zustand: 'startet',
        satzHash: satzHash(satz),
      };
      this.eintraege.set(sessionId, eintrag);
      freigeben();
      this.fenster.push(stufe1.getTime());
      this.wendeFruehAn(eintrag);
      if (eintrag.zustand === 'startet') this.setzeFrist(eintrag);
      this.deps.workspace.setSessionName(sessionId, titel.titel);
      // Zusage erst nach dem Schreiben (D8, X11); Schreibfehler → trotzdem 201.
      await this.speichere();
      return zeile(antwort(201, { zustand: 'startet', sessionId, projekt: projekt.name }), { ...log, sessionId });
    } finally {
      freigeben();
    }
  }

  /** GET: Zustand einer Sitzung von außen (FA-06). */
  public status(sessionId: string, absender: string): EingangAntwort {
    const a = this.zustandVon(sessionId);
    this.protokolliere({
      zeit: this.now().toISOString(),
      art: 'status',
      absender,
      ergebnis: a.status,
      ...(CLOUD_SESSION_ID_RE.test(sessionId) ? { sessionId } : {}),
      zustand: String(a.body.zustand ?? ''),
      ...(a.body.grund ? { grund: String(a.body.grund) } : {}),
    });
    return a;
  }

  // ---------------------------------------------------------------------------

  private zustandVon(sessionId: string): EingangAntwort {
    if (!this.bereit) return fehler(503, GRUND.backendStartet);
    this.raeumeZustandAuf();
    const e = CLOUD_SESSION_ID_RE.test(sessionId) ? this.eintraege.get(sessionId) : undefined;
    if (!e || this.zuAlt(e)) return antwort(200, { zustand: 'unbekannt' });
    return antwort(200, { zustand: e.zustand, ...(e.grund ? { grund: e.grund } : {}) });
  }

  private offeneZahl(): number {
    let n = 0;
    for (const e of this.eintraege.values()) if (!e.closedAt) n++;
    return n;
  }

  private findeProjekt(roh: string): { path: string; name: string; nurRecent: boolean } | undefined {
    const ohneSchraegstrich = roh.replace(/\/+$/, '') || '/';
    let ziel: string;
    try {
      ziel = this.realpath(ohneSchraegstrich);
    } catch {
      return undefined;
    }
    const state = this.deps.workspace.getState();
    const kandidaten = [
      ...state.openProjects.map((p) => ({ path: p.path, name: p.name, nurRecent: false })),
      ...state.recentProjects.map((p) => ({ path: p.path, name: p.name, nurRecent: true })),
    ];
    for (const k of kandidaten) {
      let real: string;
      try {
        real = this.realpath(k.path.replace(/\/+$/, '') || '/');
      } catch {
        continue;
      }
      if (real !== ziel) continue;
      // Pfad einer Arbeitskopie gilt als unbekannt (AN-S07).
      if (this.deps.resolveMainPath(real) !== real) return undefined;
      // Ein offenes Projekt geht vor dem Recents-Eintrag desselben Pfads.
      const offen = state.openProjects.find((p) => {
        try {
          return this.realpath(p.path.replace(/\/+$/, '') || '/') === real;
        } catch {
          return false;
        }
      });
      return offen ? { path: offen.path, name: offen.name, nurRecent: false } : k;
    }
    return undefined;
  }

  private promptGemeldet(sessionId: string, prompt: string): void {
    const e = this.eintraege.get(sessionId);
    if (!e) {
      this.merkeFrueh(sessionId, { ersterPrompt: satzHash(prompt) });
      return;
    }
    if (e.zustand !== 'startet') return;
    this.setzeZustand(e, satzHash(prompt) === e.satzHash ? 'aktiv' : 'fehler', satzHash(prompt) === e.satzHash ? undefined : GRUND.andererText);
  }

  private sitzungGeschlossen(sessionId: string): void {
    const e = this.eintraege.get(sessionId);
    if (!e) {
      this.merkeFrueh(sessionId, { geschlossen: true });
      return;
    }
    if (e.closedAt) return;
    this.markiereGeschlossen(e);
    this.speichere();
  }

  private markiereGeschlossen(e: EingangEintrag): void {
    e.closedAt = this.now().toISOString();
    if (e.zustand === 'startet') {
      e.zustand = 'fehler';
      e.grund = GRUND.sitzungBeendet;
    }
    this.loescheFrist(e.sessionId);
  }

  /** Nur während eines laufenden Starts: sonst gehören die Ereignisse fremden Sitzungen. */
  private merkeFrueh(sessionId: string, ereignis: { ersterPrompt?: string; geschlossen?: boolean }): void {
    if (this.reserviert === 0) return;
    const jetzt = this.now().getTime();
    for (const [id, f] of this.frueh) if (f.at < jetzt - FRUEH_MS) this.frueh.delete(id);
    const alt = this.frueh.get(sessionId);
    if (!alt && this.frueh.size >= FRUEH_MAX) {
      const aeltester = this.frueh.keys().next().value;
      if (aeltester !== undefined) this.frueh.delete(aeltester);
    }
    this.frueh.set(sessionId, {
      at: alt?.at ?? jetzt,
      ersterPrompt: alt?.ersterPrompt ?? ereignis.ersterPrompt,
      geschlossen: alt?.geschlossen || ereignis.geschlossen,
    });
  }

  private wendeFruehAn(e: EingangEintrag): void {
    const f = this.frueh.get(e.sessionId);
    if (!f) return;
    this.frueh.delete(e.sessionId);
    if (f.ersterPrompt !== undefined) {
      if (f.ersterPrompt === e.satzHash) e.zustand = 'aktiv';
      else {
        e.zustand = 'fehler';
        e.grund = GRUND.andererText;
      }
    }
    if (f.geschlossen) this.markiereGeschlossen(e);
  }

  private setzeZustand(e: EingangEintrag, zustand: EingangZustand, grund?: string): void {
    if (e.zustand !== 'startet') return;
    e.zustand = zustand;
    if (grund) e.grund = grund;
    this.loescheFrist(e.sessionId);
    this.speichere();
  }

  private setzeFrist(e: EingangEintrag): void {
    this.loescheFrist(e.sessionId);
    const rest = Date.parse(e.stufe1At) + STUFE2_FRIST_MS - this.now().getTime();
    const t = setTimeout(() => void this.fristAbgelaufen(e.sessionId), Math.max(0, rest));
    t.unref?.();
    this.timer.set(e.sessionId, t);
  }

  private loescheFrist(sessionId: string): void {
    const t = this.timer.get(sessionId);
    if (t) clearTimeout(t);
    this.timer.delete(sessionId);
  }

  /** D12: einmal lesen, nie tippen — Vertrauensdialog als eigener Grund. */
  private async fristAbgelaufen(sessionId: string): Promise<void> {
    this.timer.delete(sessionId);
    const e = this.eintraege.get(sessionId);
    if (!e || e.zustand !== 'startet') return;
    let grund: string = GRUND.zeitueberschreitung;
    try {
      const { text } = await this.deps.sitzungen.readScreen(sessionId);
      if (findDialogCue(text)?.kind === 'trust') grund = GRUND.vertrauensdialog;
    } catch {
      // Lesefehler → Zeitüberschreitung
    }
    this.setzeZustand(e, 'fehler', grund);
  }

  private zuAlt(e: EingangEintrag): boolean {
    return this.now().getTime() - Date.parse(e.stufe1At) > ZUSTAND_HALTEN_MS;
  }

  /**
   * Einträge älter als 24 h fallen weg — offene erst, wenn sie geschlossen
   * sind: sie zählen für die Obergrenze, solange die Sitzung läuft (FA-16, FA-22).
   */
  private raeumeZustandAuf(): void {
    for (const [id, e] of this.eintraege) {
      if (e.closedAt && this.zuAlt(e)) this.eintraege.delete(id);
    }
  }

  // ---- Dateien -------------------------------------------------------------

  private ladeOderErzeugeToken(): string | undefined {
    const pfad = this.deps.pfade.token;
    try {
      const vorhanden = fs.readFileSync(pfad, 'utf-8').trim();
      if (TOKEN_RE.test(vorhanden)) {
        console.log(`[Eingang] an — Geheimnis in ${pfad}`);
        return vorhanden;
      }
    } catch {
      // fehlt → neu
    }
    try {
      const neu = randomBytes(32).toString('hex');
      fs.mkdirSync(dirname(pfad), { recursive: true, mode: 0o700 });
      fs.writeFileSync(pfad, neu + '\n', { mode: 0o600 });
      fs.chmodSync(pfad, 0o600);
      console.log(`[Eingang] an — neues Geheimnis in ${pfad}`);
      return neu;
    } catch (err) {
      console.warn('[Eingang] Geheimnis nicht schreibbar — Eingang nimmt nichts an:', (err as NodeJS.ErrnoException).code ?? 'Fehler');
      return undefined;
    }
  }

  private ladeZustand(): void {
    let roh: string;
    try {
      roh = fs.readFileSync(this.deps.pfade.zustand, 'utf-8');
    } catch {
      return;
    }
    try {
      const datei = JSON.parse(roh) as Partial<ZustandDatei>;
      if (datei.version !== 1 || !Array.isArray(datei.eintraege)) throw new Error('Format');
      for (const e of datei.eintraege) {
        if (
          e && typeof e.sessionId === 'string' && CLOUD_SESSION_ID_RE.test(e.sessionId) &&
          typeof e.stufe1At === 'string' && typeof e.satzHash === 'string' &&
          (e.zustand === 'startet' || e.zustand === 'aktiv' || e.zustand === 'fehler')
        ) {
          this.eintraege.set(e.sessionId, {
            sessionId: e.sessionId,
            projektName: typeof e.projektName === 'string' ? e.projektName : '',
            stufe1At: e.stufe1At,
            zustand: e.zustand,
            satzHash: e.satzHash,
            ...(typeof e.grund === 'string' ? { grund: e.grund } : {}),
            ...(typeof e.closedAt === 'string' ? { closedAt: e.closedAt } : {}),
          });
        }
      }
    } catch {
      console.warn('[Eingang] Zustandsdatei unlesbar — leer begonnen');
    }
  }

  /** Ganzer Stand über eine serialisierte Schreibkette, tmp + rename (D8, X2). */
  private speichere(): Promise<void> {
    const datei: ZustandDatei = { version: 1, eintraege: [...this.eintraege.values()].map((e) => ({ ...e })) };
    const pfad = this.deps.pfade.zustand;
    const next = this.writeChain.then(async () => {
      await fs.promises.mkdir(dirname(pfad), { recursive: true, mode: 0o700 });
      const tmp = `${pfad}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
      await fs.promises.writeFile(tmp, JSON.stringify(datei, null, 2), { encoding: 'utf-8', mode: 0o600 });
      await fs.promises.rename(tmp, pfad);
    }).catch((err: NodeJS.ErrnoException) => {
      console.warn('[Eingang] Zustand nicht geschrieben:', err.code ?? 'Fehler');
    });
    this.writeChain = next;
    return next;
  }

  /** D9: anhängen; über 10 MB vorher nach `.1` rotieren. Fehler blockieren nie die Anfrage. */
  private protokolliere(zeile: ProtokollZeile): void {
    const pfad = this.deps.pfade.protokoll;
    const text = JSON.stringify(zeile) + '\n';
    this.logChain = this.logChain.then(async () => {
      await fs.promises.mkdir(dirname(pfad), { recursive: true, mode: 0o700 });
      try {
        const st = await fs.promises.stat(pfad);
        if (st.size + Buffer.byteLength(text) > PROTOKOLL_MAX_BYTES) await fs.promises.rename(pfad, `${pfad}.1`);
      } catch {
        // noch keine Datei
      }
      await fs.promises.appendFile(pfad, text, { encoding: 'utf-8', mode: 0o600 });
    }).catch((err: NodeJS.ErrnoException) => {
      console.warn('[Eingang] Protokoll nicht geschrieben:', err.code ?? 'Fehler');
    });
  }

  /** Wartet, bis alle Protokoll- und Zustandsschreibvorgänge durch sind (Tests, Herunterfahren). */
  public async flush(): Promise<void> {
    await this.logChain;
    await this.writeChain;
  }

  /** Beim Start: Zeilen älter als 30 Tage verwerfen (AN-S08). */
  private async raeumeProtokollAuf(): Promise<void> {
    const pfad = this.deps.pfade.protokoll;
    const grenze = this.now().getTime() - PROTOKOLL_TAGE_MS;
    for (const datei of [pfad, `${pfad}.1`]) {
      let roh: string;
      try {
        roh = await fs.promises.readFile(datei, 'utf-8');
      } catch {
        continue;
      }
      const zeilen = roh.split('\n').filter((z) => z.trim().length > 0);
      const behalten = zeilen.filter((z) => {
        try {
          const t = Date.parse((JSON.parse(z) as { zeit?: string }).zeit ?? '');
          return Number.isFinite(t) && t >= grenze;
        } catch {
          return false;
        }
      });
      if (behalten.length === zeilen.length) continue;
      try {
        if (behalten.length === 0) await fs.promises.rm(datei, { force: true });
        else {
          const tmp = `${datei}.tmp.${process.pid}`;
          await fs.promises.writeFile(tmp, behalten.join('\n') + '\n', { encoding: 'utf-8', mode: 0o600 });
          await fs.promises.rename(tmp, datei);
        }
        console.log(`[Eingang] Protokoll: ${zeilen.length - behalten.length} Zeile(n) älter als 30 Tage entfernt`);
      } catch (err) {
        console.warn('[Eingang] Protokoll nicht aufgeräumt:', (err as NodeJS.ErrnoException).code ?? 'Fehler');
      }
    }
  }
}
