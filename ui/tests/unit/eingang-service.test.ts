/**
 * EingangService (INT-2026-030, Plan D5–D9, D12) mit Fake-Manager.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { mkdtempSync, rmSync, mkdirSync, readFileSync, writeFileSync, existsSync, statSync, realpathSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  EingangService,
  type EingangDeps,
  PROTOKOLL_MAX_BYTES,
} from '../../src/server/services/eingang-service.js';
import { GRUND, satzHash } from '../../src/server/services/eingang-regeln.js';
import type { WorkspaceState } from '../../src/shared/types/workspace.protocol.js';

class FakeManager extends EventEmitter {
  public creates: unknown[][] = [];
  public writes = 0;
  public closes = 0;
  public hookSecret: string | undefined = 'h'.repeat(64);
  public screen = '';
  public screenWirft = false;
  public sessions = new Map<string, { sessionId: string; status: string }>();
  public createFehler: Error | null = null;
  public vorDemReturn: ((id: string) => void) | null = null;
  public verzoegerung: Promise<void> | null = null;
  private n = 0;

  async createSession(...args: unknown[]) {
    this.creates.push(args);
    if (this.verzoegerung) await this.verzoegerung;
    if (this.createFehler) throw this.createFehler;
    const sessionId = `cloud-1700000000000-${++this.n}`;
    this.sessions.set(sessionId, { sessionId, status: 'active' });
    this.vorDemReturn?.(sessionId);
    return { sessionId, status: 'active' } as never;
  }
  getHookSecret() { return this.hookSecret; }
  getSession(id: string) { return this.sessions.get(id) as never; }
  whenReady() { return Promise.resolve(); }
  async readScreen() {
    if (this.screenWirft) throw new Error('tmux weg');
    return { text: this.screen };
  }
  // Würden andere Sitzungen anfassen — der Eingang darf sie nie rufen (FA-18).
  sendInput() { this.writes++; return true; }
  closeSession() { this.closes++; return Promise.resolve(); }
  schliesse(id: string) {
    this.sessions.set(id, { sessionId: id, status: 'closed' });
    this.emit('session.closed', id, 0);
  }
}

describe('EingangService', () => {
  let dir: string;
  let projekt: string;
  let recent: string;
  let worktree: string;
  let mgr: FakeManager;
  let state: WorkspaceState;
  let deps: EingangDeps;
  let svc: EingangService;
  let uhr: Date;
  let geoeffnet: Array<[string, string]>;
  let namen: Array<[string, string | null]>;
  let rescans: number;
  let pruefeFehler: Error | null;
  let opus: boolean;

  const pfade = () => ({
    token: join(dir, 'rt', 'eingang-3111.token'),
    zustand: join(dir, 'rt', 'eingang-3111.json'),
    protokoll: join(dir, 'rt', 'eingang-3111.jsonl'),
  });

  const baue = async (extra: Partial<EingangDeps> = {}): Promise<EingangService> => {
    const s = new EingangService({ ...deps, ...extra });
    await s.start();
    return s;
  };

  const protokoll = async (s = svc): Promise<Array<Record<string, unknown>>> => {
    await s.flush();
    if (!existsSync(pfade().protokoll)) return [];
    return readFileSync(pfade().protokoll, 'utf-8').trim().split('\n').map((z) => JSON.parse(z));
  };

  beforeEach(async () => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), 'eingang-svc-')));
    projekt = join(dir, 'projekt');
    recent = join(dir, 'recent');
    worktree = join(dir, 'projekt-worktrees', 'session-x');
    for (const p of [projekt, recent, worktree]) mkdirSync(p, { recursive: true });
    mgr = new FakeManager();
    uhr = new Date('2026-10-02T10:00:00.000Z');
    geoeffnet = [];
    namen = [];
    rescans = 0;
    pruefeFehler = null;
    opus = true;
    state = {
      openProjects: [{ id: projekt, path: projekt, name: 'Projekt', openedAt: uhr.toISOString() }],
      recentProjects: [
        { path: projekt, name: 'Projekt', lastOpenedAt: uhr.toISOString() },
        { path: recent, name: 'Recent', lastOpenedAt: uhr.toISOString() },
        { path: worktree, name: 'Kopie', lastOpenedAt: uhr.toISOString() },
      ],
      sessionNames: {},
      updatedAt: uhr.toISOString(),
    } as WorkspaceState;
    deps = {
      sitzungen: mgr as never,
      workspace: {
        getState: () => state,
        openProjectFromBackend: (p, n) => { geoeffnet.push([p, n]); },
        setSessionName: (id, n) => { namen.push([id, n]); return true; },
      },
      vorhaben: {
        pruefeArbeitskopieMoeglich: async () => { if (pruefeFehler) throw pruefeFehler; },
        scheduleRescan: () => { rescans++; },
      },
      opusVerfuegbar: () => opus,
      resolveMainPath: (p) => (p.includes('-worktrees') ? projekt : p),
      pfade: pfade(),
      port: 3111,
      schalter: 'on',
      plattform: 'darwin',
      now: () => uhr,
    };
    svc = await baue();
  });

  afterEach(async () => {
    vi.useRealTimers();
    svc.dispose();
    await svc.flush();
    rmSync(dir, { recursive: true, force: true });
  });

  const starte = (body: Record<string, unknown>, s = svc) => s.starte(body, '127.0.0.1');
  const SATZ = 'Kreis Lippe, schau dir die fehlschlagenden Tests im Modul an';

  describe('Geheimnis (D3, AK-12)', () => {
    it('eingeschaltet: Datei 0600 mit 64 Hex, beim zweiten Bau dieselbe', async () => {
      const token = readFileSync(pfade().token, 'utf-8').trim();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
      expect(statSync(pfade().token).mode & 0o777).toBe(0o600);
      const zweiter = await baue();
      expect(readFileSync(pfade().token, 'utf-8').trim()).toBe(token);
      zweiter.dispose();
    });

    it('aus oder Linux: kein Geheimnis erzeugt, nichts berechtigt', async () => {
      rmSync(pfade().token);
      for (const extra of [{ schalter: undefined }, { schalter: 'ON' }, { plattform: 'linux' as const }]) {
        const s = await baue(extra);
        expect(existsSync(pfade().token)).toBe(false);
        expect(s.eingeschaltet()).toBe(false);
        expect(s.berechtigt({ socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost:3111' } })).toBe(false);
        s.dispose();
      }
    });
  });

  describe('Start (AK-01, FA-01, FA-02, D7)', () => {
    it('startet mit Opus, neuer Kopie, Trenner, gespeichertem Projektpfad; 201 ohne Pfad', async () => {
      const a = await starte({ projekt: projekt + '/', satz: SATZ });
      expect(a.status).toBe(201);
      expect(a.body).toEqual({ zustand: 'startet', sessionId: 'cloud-1700000000000-1', projekt: 'Projekt' });
      expect(JSON.stringify(a.body)).not.toContain(dir);
      expect(mgr.creates).toHaveLength(1);
      const [path, typ, model, , , prompt, extra, env, opts] = mgr.creates[0];
      expect(path).toBe(projekt);
      expect(typ).toBe('claude-code');
      expect(model).toEqual({ provider: 'anthropic', model: 'opus' });
      expect(prompt).toBe(SATZ);
      expect(extra).toBeUndefined();
      expect(env).toBeUndefined();
      expect(opts).toEqual({ sessionTarget: { target: { kind: 'new-worktree' }, explicit: true }, promptNachTrenner: true });
      expect(namen).toEqual([['cloud-1700000000000-1', 'Kreis Lippe, schau dir die…']]);
      expect(geoeffnet).toEqual([]);
    });

    it('Satz wird bereinigt übergeben, Titel mitgeschickt', async () => {
      await starte({ projekt, satz: 'eins\nzwei', titel: 'Mein Tab' });
      expect(mgr.creates[0][5]).toBe('eins zwei');
      expect(namen[0][1]).toBe('Mein Tab');
    });

    it('FA-23: Opus fehlt → 409, kein Start', async () => {
      opus = false;
      const a = await starte({ projekt, satz: SATZ });
      expect(a).toEqual({ status: 409, body: { fehler: GRUND.opusFehlt } });
      expect(mgr.creates).toHaveLength(0);
    });

    it('Hook nicht bereit → sofort 503', async () => {
      mgr.hookSecret = undefined;
      const a = await starte({ projekt, satz: SATZ });
      expect(a).toEqual({ status: 503, body: { fehler: GRUND.hookNichtBereit } });
      expect(mgr.creates).toHaveLength(0);
    });

    it('FA-14: ungültiger Satz oder Titel → 400, kein Start', async () => {
      for (const body of [
        { projekt, satz: '' },
        { projekt, satz: 'x'.repeat(501) },
        { projekt, satz: '/clear' },
        { projekt, satz: 'ok', titel: 't'.repeat(41) },
        { satz: 'ohne Projekt' },
      ]) {
        expect((await starte(body)).status).toBe(400);
      }
      expect((await svc.starte('kein objekt', '127.0.0.1')).status).toBe(400);
      expect(mgr.creates).toHaveLength(0);
    });

    it('vor start() → 503 Backend startet noch', async () => {
      const s = new EingangService(deps);
      expect(await s.starte({ projekt, satz: SATZ }, '127.0.0.1')).toEqual({ status: 503, body: { fehler: GRUND.backendStartet } });
      s.dispose();
    });
  });

  describe('Projekt (B-02, AN-S07, D5, AK-08, FA-13)', () => {
    it('unbekannt, nicht vorhanden, Arbeitskopie → 404 ohne Start', async () => {
      for (const p of [join(dir, 'fremd'), '/gibt/es/nicht', worktree]) {
        expect(await starte({ projekt: p, satz: SATZ })).toEqual({ status: 404, body: { fehler: GRUND.projektUnbekannt } });
      }
      mkdirSync(join(dir, 'fremd'));
      expect((await starte({ projekt: join(dir, 'fremd'), satz: SATZ })).status).toBe(404);
      expect(mgr.creates).toHaveLength(0);
    });

    it('nur in den Recents: erst Prüfung, dann öffnen ohne Aktivierung + Rescan, Start mit gespeichertem Pfad', async () => {
      const a = await starte({ projekt: recent, satz: SATZ });
      expect(a.status).toBe(201);
      expect(a.body.projekt).toBe('Recent');
      expect(geoeffnet).toEqual([[recent, 'Recent']]);
      expect(rescans).toBe(1);
      expect(mgr.creates[0][0]).toBe(recent);
    });

    it('Prüfung scheitert (kein Git / Isolation aus) → 409 mit Text, Projekt aus Recents nicht geöffnet', async () => {
      pruefeFehler = new Error('Keine Arbeitskopie möglich: kein Git-Repository — Absicht im Terminal starten.');
      const a = await starte({ projekt: recent, satz: SATZ });
      expect(a).toEqual({ status: 409, body: { fehler: pruefeFehler.message } });
      expect(geoeffnet).toEqual([]);
      expect(mgr.creates).toHaveLength(0);
    });

    it('Manager-Fehler → 409 „Keine Arbeitskopie möglich: …", kein Eintrag, Grenze frei', async () => {
      mgr.createFehler = new Error('git worktree add fehlgeschlagen');
      const a = await starte({ projekt, satz: SATZ });
      expect(a).toEqual({ status: 409, body: { fehler: 'Keine Arbeitskopie möglich: git worktree add fehlgeschlagen' } });
      mgr.createFehler = null;
      for (let i = 0; i < 3; i++) expect((await starte({ projekt, satz: `s${i}` })).status).toBe(201);
    });
  });

  describe('Stufe 2 (AK-03, AK-04, FA-04, FA-05, D12)', () => {
    const id = 'cloud-1700000000000-1';

    it('erster Prompt = Satz → aktiv; späterer anderer Text ändert nichts', async () => {
      await starte({ projekt, satz: SATZ });
      mgr.emit('session.prompt-text', id, SATZ);
      expect(svc.status(id, '127.0.0.1').body).toEqual({ zustand: 'aktiv' });
      mgr.emit('session.prompt-text', id, 'etwas anderes');
      expect(svc.status(id, '127.0.0.1').body).toEqual({ zustand: 'aktiv' });
    });

    it('anderer Text → fehler; späterer Satz ändert nichts', async () => {
      await starte({ projekt, satz: SATZ });
      mgr.emit('session.prompt-text', id, 'anders');
      mgr.emit('session.prompt-text', id, SATZ);
      expect(svc.status(id, '127.0.0.1').body).toEqual({ zustand: 'fehler', grund: GRUND.andererText });
    });

    it('Sitzung endet vor Stufe 2 → fehler „Sitzung beendet"', async () => {
      await starte({ projekt, satz: SATZ });
      mgr.schliesse(id);
      expect(svc.status(id, '127.0.0.1').body).toEqual({ zustand: 'fehler', grund: GRUND.sitzungBeendet });
    });

    it('frühe Ereignisse vor dem Eintrag gehen nicht verloren (X1)', async () => {
      mgr.vorDemReturn = (sid) => mgr.emit('session.prompt-text', sid, SATZ);
      await starte({ projekt, satz: SATZ });
      expect(svc.status(id, '127.0.0.1').body).toEqual({ zustand: 'aktiv' });
      mgr.vorDemReturn = (sid) => mgr.schliesse(sid);
      await starte({ projekt, satz: SATZ });
      expect(svc.status('cloud-1700000000000-2', '127.0.0.1').body).toEqual({ zustand: 'fehler', grund: GRUND.sitzungBeendet });
    });

    it('Prompts fremder Sitzungen ohne laufenden Start werden nicht gemerkt', async () => {
      mgr.emit('session.prompt-text', 'cloud-1700000000000-1', 'UI-Sitzung');
      await starte({ projekt, satz: SATZ });
      expect(svc.status(id, '127.0.0.1').body).toEqual({ zustand: 'startet' });
    });

    describe('60-s-Frist (Fake-Uhr)', () => {
      beforeEach(async () => {
        svc.dispose();
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        svc = await baue();
        await starte({ projekt, satz: SATZ });
      });

      it('nichts gemeldet → Zeitüberschreitung, nie ein Schreibaufruf', async () => {
        await vi.advanceTimersByTimeAsync(59_000);
        expect(svc.status(id, '127.0.0.1').body).toEqual({ zustand: 'startet' });
        await vi.advanceTimersByTimeAsync(1_000);
        expect(svc.status(id, '127.0.0.1').body).toEqual({ zustand: 'fehler', grund: GRUND.zeitueberschreitung });
        expect(mgr.writes).toBe(0);
        mgr.emit('session.prompt-text', id, SATZ);
        expect(svc.status(id, '127.0.0.1').body.zustand).toBe('fehler');
      });

      it('Vertrauensdialog auf dem Bildschirm → eigener Grund', async () => {
        mgr.screen = ' Quick safety check: Is this a project you created or one you trust?\n ❯ 1. Yes, I trust this folder\n   2. No, exit';
        await vi.advanceTimersByTimeAsync(60_000);
        expect(svc.status(id, '127.0.0.1').body).toEqual({ zustand: 'fehler', grund: GRUND.vertrauensdialog });
        expect(mgr.writes).toBe(0);
      });

      it('Bildschirm nicht lesbar → Zeitüberschreitung', async () => {
        mgr.screenWirft = true;
        await vi.advanceTimersByTimeAsync(60_000);
        expect(svc.status(id, '127.0.0.1').body).toEqual({ zustand: 'fehler', grund: GRUND.zeitueberschreitung });
      });
    });
  });

  describe('Statusabfrage (FA-06)', () => {
    it('ungültige oder fremde ID → unbekannt', async () => {
      expect(svc.status('../etc', '127.0.0.1')).toEqual({ status: 200, body: { zustand: 'unbekannt' } });
      expect(svc.status('cloud-1-99', '127.0.0.1').body).toEqual({ zustand: 'unbekannt' });
    });

    it('geschlossene Sitzung < 24 h → letzter Zustand; > 24 h → unbekannt', async () => {
      await starte({ projekt, satz: SATZ });
      const id = 'cloud-1700000000000-1';
      mgr.emit('session.prompt-text', id, SATZ);
      mgr.schliesse(id);
      uhr = new Date(uhr.getTime() + 23 * 3600_000);
      expect(svc.status(id, '127.0.0.1').body).toEqual({ zustand: 'aktiv' });
      uhr = new Date(uhr.getTime() + 2 * 3600_000);
      expect(svc.status(id, '127.0.0.1').body).toEqual({ zustand: 'unbekannt' });
    });
  });

  describe('Obergrenzen (AK-09, FA-15, FA-22, D6)', () => {
    it('4. offene → 429; nach Schließen wieder frei', async () => {
      for (let i = 0; i < 3; i++) expect((await starte({ projekt, satz: `s${i}` })).status).toBe(201);
      expect(await starte({ projekt, satz: 's3' })).toEqual({ status: 429, body: { fehler: GRUND.offenGrenze } });
      mgr.schliesse('cloud-1700000000000-1');
      expect((await starte({ projekt, satz: 's4' })).status).toBe(201);
    });

    it('6. Anfrage binnen 60 s → 429, auch wenn Sitzungen geschlossen sind; nach 60 s frei', async () => {
      for (let i = 0; i < 5; i++) {
        expect((await starte({ projekt, satz: `s${i}` })).status).toBe(201);
        mgr.schliesse(`cloud-1700000000000-${i + 1}`);
      }
      expect(await starte({ projekt, satz: 's5' })).toEqual({ status: 429, body: { fehler: GRUND.fensterGrenze } });
      uhr = new Date(uhr.getTime() + 60_001);
      expect((await starte({ projekt, satz: 's6' })).status).toBe(201);
    });

    it('zwei gleichzeitige als 3./4. → genau eine angenommen', async () => {
      for (let i = 0; i < 2; i++) await starte({ projekt, satz: `s${i}` });
      let loslassen!: () => void;
      mgr.verzoegerung = new Promise<void>((r) => { loslassen = r; });
      const a = starte({ projekt, satz: 'a' });
      const b = starte({ projekt, satz: 'b' });
      loslassen();
      const status = (await Promise.all([a, b])).map((x) => x.status).sort();
      expect(status).toEqual([201, 429]);
      expect(mgr.creates).toHaveLength(3);
    });
  });

  describe('Neustart (FA-16)', () => {
    it('neuer Dienst mit derselben Datei behält Einträge, zählt offene, setzt Restfrist; Unbekannte → geschlossen', async () => {
      for (let i = 0; i < 3; i++) await starte({ projekt, satz: `s${i}` });
      mgr.emit('session.prompt-text', 'cloud-1700000000000-1', 's0');
      svc.dispose();
      await svc.flush();
      mgr.sessions.delete('cloud-1700000000000-3'); // während des Stillstands beendet
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      uhr = new Date(uhr.getTime() + 30_000);
      svc = await baue();
      expect(svc.status('cloud-1700000000000-1', 'x').body).toEqual({ zustand: 'aktiv' });
      expect(svc.status('cloud-1700000000000-2', 'x').body).toEqual({ zustand: 'startet' });
      expect(svc.status('cloud-1700000000000-3', 'x').body).toEqual({ zustand: 'fehler', grund: GRUND.sitzungBeendet });
      // 2 offen → eine weitere geht, dann Grenze
      expect((await starte({ projekt, satz: 'neu' })).status).toBe(201);
      expect((await starte({ projekt, satz: 'zu viel' })).status).toBe(429);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(svc.status('cloud-1700000000000-2', 'x').body).toEqual({ zustand: 'fehler', grund: GRUND.zeitueberschreitung });
    });

    it('unlesbare Zustandsdatei → leer begonnen', async () => {
      svc.dispose();
      await svc.flush();
      writeFileSync(pfade().zustand, '{kaputt');
      svc = await baue();
      expect((await starte({ projekt, satz: SATZ })).status).toBe(201);
    });
  });

  describe('Datenschutz (FA-21, RB-04)', () => {
    it('Satz nie in der Zustandsdatei und nie in console.*; nur der Titel geht an den Arbeitsbereich', async () => {
      const spies = (['log', 'warn', 'error', 'info'] as const).map((m) => vi.spyOn(console, m));
      await starte({ projekt, satz: SATZ });
      mgr.emit('session.prompt-text', 'cloud-1700000000000-1', SATZ);
      await svc.flush();
      const zustand = readFileSync(pfade().zustand, 'utf-8');
      expect(zustand).not.toContain('Lippe');
      expect(zustand).toContain(satzHash(SATZ));
      expect(statSync(pfade().zustand).mode & 0o777).toBe(0o600);
      for (const spy of spies) {
        for (const call of spy.mock.calls) expect(JSON.stringify(call)).not.toContain('fehlschlagenden');
        spy.mockRestore();
      }
      expect(namen.map(([, n]) => n)).toEqual(['Kreis Lippe, schau dir die…']);
    });

    it('FA-18: keine Schreib- oder Schließaufrufe an Sitzungen', async () => {
      await starte({ projekt, satz: SATZ });
      expect(mgr.writes).toBe(0);
      expect(mgr.closes).toBe(0);
    });
  });

  describe('Protokoll (AK-10, FA-17, D9)', () => {
    it('eine Zeile je Anfrage und Abfrage; Satz nur bei berechtigten, Abweisung ohne Satz', async () => {
      svc.protokolliereAbweisung('start', '127.0.0.1', 403, GRUND.nichtBerechtigt);
      await starte({ projekt, satz: SATZ });
      await starte({ projekt: join(dir, 'fremd'), satz: 'unbekannt hier' });
      await starte({ projekt, satz: 'x'.repeat(600) });
      svc.status('cloud-1700000000000-1', '::1');
      const z = await protokoll();
      expect(z).toHaveLength(5);
      expect(z[0]).toMatchObject({ art: 'start', absender: '127.0.0.1', ergebnis: 403, grund: GRUND.nichtBerechtigt });
      expect(z[0].satz).toBeUndefined();
      expect(z[1]).toMatchObject({ art: 'start', projekt: 'Projekt', ergebnis: 201, satz: SATZ, sessionId: 'cloud-1700000000000-1' });
      expect(z[2]).toMatchObject({ ergebnis: 404, grund: GRUND.projektUnbekannt, satz: 'unbekannt hier' });
      expect(z[3]).toMatchObject({ ergebnis: 400, grund: GRUND.satzZuLang, gekuerzt: true });
      expect((z[3].satz as string).length).toBe(500);
      expect(z[4]).toMatchObject({ art: 'status', absender: '::1', ergebnis: 200, zustand: 'startet', sessionId: 'cloud-1700000000000-1' });
      for (const zeile of z) expect(typeof zeile.zeit).toBe('string');
      expect(statSync(pfade().protokoll).mode & 0o777).toBe(0o600);
    });

    it('beim Start: Zeilen älter als 30 Tage weg', async () => {
      svc.dispose();
      await svc.flush();
      const alt = { zeit: new Date(uhr.getTime() - 31 * 86400_000).toISOString(), art: 'start', absender: 'a', ergebnis: 403 };
      const neu = { zeit: new Date(uhr.getTime() - 29 * 86400_000).toISOString(), art: 'start', absender: 'b', ergebnis: 403 };
      writeFileSync(pfade().protokoll, JSON.stringify(alt) + '\n' + JSON.stringify(neu) + '\n');
      svc = await baue();
      const z = await protokoll();
      expect(z.map((x) => x.absender)).toEqual(['b']);
    });

    it('über 10 MB → nach .1 rotiert', async () => {
      writeFileSync(pfade().protokoll, 'x'.repeat(PROTOKOLL_MAX_BYTES));
      svc.protokolliereAbweisung('status', '127.0.0.1', 403, GRUND.nichtBerechtigt);
      const z = await protokoll();
      expect(z).toHaveLength(1);
      expect(statSync(pfade().protokoll + '.1').size).toBe(PROTOKOLL_MAX_BYTES);
    });
  });
});
