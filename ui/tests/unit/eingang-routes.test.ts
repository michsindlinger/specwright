/**
 * Eingang-Router (INT-2026-030, Plan D1/D2; AK-02, AK-07, AK-12; FA-03, FA-07,
 * FA-12, FA-17, FA-19) über einen echten HTTP-Server auf 127.0.0.1, damit
 * `Host`, `Origin` und Weiterleitungs-Header wie im Betrieb ankommen.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import { createServer, request, type Server } from 'http';
import type { AddressInfo } from 'net';
import { EventEmitter } from 'events';
import { mkdtempSync, rmSync, mkdirSync, readFileSync, existsSync, realpathSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { createEingangRouter } from '../../src/server/routes/eingang.routes.js';
import { EingangService, type EingangDeps } from '../../src/server/services/eingang-service.js';
import { EINGANG_TOKEN_HEADER, GRUND } from '../../src/server/services/eingang-regeln.js';

class FakeManager extends EventEmitter {
  public creates = 0;
  async createSession() {
    this.creates++;
    return { sessionId: `cloud-1700000000000-${this.creates}`, status: 'active' } as never;
  }
  getHookSecret() { return 'h'.repeat(64); }
  getSession() { return { status: 'active' } as never; }
  whenReady() { return Promise.resolve(); }
  async readScreen() { return { text: '' }; }
}

interface Antwort { status: number; body: Record<string, unknown> }

describe('Eingang-Router', () => {
  let dir: string;
  let projekt: string;
  let server: Server;
  let port: number;
  let mgr: FakeManager;
  let svc: EingangService | undefined;
  let deps: EingangDeps;
  let schalter: string | undefined;

  const pfade = () => ({
    token: join(dir, 'eingang.token'),
    zustand: join(dir, 'eingang.json'),
    protokoll: join(dir, 'eingang.jsonl'),
  });
  const token = (): string => readFileSync(pfade().token, 'utf-8').trim();

  const anfrage = (
    method: 'GET' | 'POST',
    path: string,
    opts: { headers?: Record<string, string>; body?: string } = {}
  ): Promise<Antwort> =>
    new Promise((resolve, reject) => {
      const req = request(
        { host: '127.0.0.1', port, method, path, headers: { host: `localhost:${port}`, ...(opts.headers ?? {}) } },
        (res) => {
          let roh = '';
          res.on('data', (c) => { roh += c; });
          res.on('end', () => resolve({ status: res.statusCode ?? 0, body: roh ? JSON.parse(roh) : {} }));
        }
      );
      req.on('error', reject);
      if (opts.body !== undefined) req.write(opts.body);
      req.end();
    });

  const post = (body: unknown, headers: Record<string, string> = {}) =>
    anfrage('POST', '/api/eingang/sitzung', {
      headers: { 'content-type': 'application/json', [EINGANG_TOKEN_HEADER]: token(), ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

  const baueDienst = async (extra: Partial<EingangDeps> = {}) => {
    svc?.dispose();
    svc = new EingangService({ ...deps, port, ...extra });
    await svc.start();
  };

  const protokoll = async (): Promise<Array<Record<string, unknown>>> => {
    await svc?.flush();
    if (!existsSync(pfade().protokoll)) return [];
    return readFileSync(pfade().protokoll, 'utf-8').trim().split('\n').map((z) => JSON.parse(z));
  };

  beforeEach(async () => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), 'eingang-routes-')));
    projekt = join(dir, 'projekt');
    mkdirSync(projekt);
    mgr = new FakeManager();
    schalter = 'on';
    const app = express();
    app.use('/api/eingang', createEingangRouter(() => svc, () => schalter));
    app.use(express.json({ limit: '30mb' }));
    server = createServer(app);
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    port = (server.address() as AddressInfo).port;
    deps = {
      sitzungen: mgr as never,
      workspace: {
        getState: () => ({
          openProjects: [{ id: projekt, path: projekt, name: 'Projekt', openedAt: '' }],
          recentProjects: [],
          sessionNames: {},
          updatedAt: '',
        }),
        openProjectFromBackend: () => undefined,
        setSessionName: () => true,
      },
      vorhaben: { pruefeArbeitskopieMoeglich: async () => undefined, scheduleRescan: () => undefined },
      opusVerfuegbar: () => true,
      resolveMainPath: (p) => p,
      pfade: pfade(),
      port: 0,
      schalter: 'on',
      plattform: 'darwin',
    };
    await baueDienst();
  });

  afterEach(async () => {
    svc?.dispose();
    await svc?.flush();
    svc = undefined;
    await new Promise<void>((r) => server.close(() => r()));
    rmSync(dir, { recursive: true, force: true });
  });

  it('AK-02/FA-03: berechtigt → 201 mit Stufe 1, Sitzungs-ID und Projektname, kein Pfad', async () => {
    const a = await post({ projekt, satz: 'Tests ansehen' });
    expect(a).toEqual({ status: 201, body: { zustand: 'startet', sessionId: 'cloud-1700000000000-1', projekt: 'Projekt' } });
    expect(JSON.stringify(a.body)).not.toContain(dir);
  });

  it('GET liefert den Zustand; fremde und ungültige IDs → unbekannt (FA-06, FA-07)', async () => {
    await post({ projekt, satz: 'Tests ansehen' });
    const h = { [EINGANG_TOKEN_HEADER]: token() };
    expect(await anfrage('GET', '/api/eingang/sitzung/cloud-1700000000000-1', { headers: h })).toEqual({ status: 200, body: { zustand: 'startet' } });
    mgr.emit('session.prompt-text', 'cloud-1700000000000-1', 'Tests ansehen');
    expect((await anfrage('GET', '/api/eingang/sitzung/cloud-1700000000000-1', { headers: h })).body).toEqual({ zustand: 'aktiv' });
    expect((await anfrage('GET', '/api/eingang/sitzung/cloud-9-9', { headers: h })).body).toEqual({ zustand: 'unbekannt' });
    expect((await anfrage('GET', '/api/eingang/sitzung/kaputt', { headers: h })).body).toEqual({ zustand: 'unbekannt' });
  });

  describe('AK-07/FA-12: jede fehlende Bedingung → 403 gleicher Text, kein Start', () => {
    const faelle: Array<[string, () => Record<string, string>]> = [
      ['ohne Geheimnis', () => ({ [EINGANG_TOKEN_HEADER]: '' })],
      ['falsches Geheimnis', () => ({ [EINGANG_TOKEN_HEADER]: 'f'.repeat(64) })],
      ['x-forwarded-for (Tunnel)', () => ({ 'x-forwarded-for': '100.64.0.2' })],
      ['x-forwarded-host', () => ({ 'x-forwarded-host': 'mac.ts.net' })],
      ['tailscale-user-login', () => ({ 'tailscale-user-login': 'michael@example.com' })],
      ['cf-connecting-ip', () => ({ 'cf-connecting-ip': '1.2.3.4' })],
      ['fremder Host', () => ({ host: 'mac.tailnet.ts.net' })],
      ['Origin (Browser)', () => ({ origin: 'http://localhost:3001' })],
      ['fremde Origin', () => ({ origin: 'https://evil.example' })],
    ];
    for (const [name, headers] of faelle) {
      it(name, async () => {
        const a = await post({ projekt, satz: 'Tests ansehen' }, headers());
        expect(a).toEqual({ status: 403, body: { fehler: GRUND.nichtBerechtigt } });
        const g = await anfrage('GET', '/api/eingang/sitzung/cloud-1700000000000-1', { headers: { [EINGANG_TOKEN_HEADER]: token(), ...headers() } });
        expect(g).toEqual({ status: 403, body: { fehler: GRUND.nichtBerechtigt } });
        expect(mgr.creates).toBe(0);
        const z = await protokoll();
        expect(z.map((x) => [x.art, x.ergebnis])).toEqual([['start', 403], ['status', 403]]);
        expect(z.every((x) => x.satz === undefined)).toBe(true);
      });
    }
  });

  it('AK-12/FA-19: Schalter fehlt, off, ON oder Linux → 403, auch mit gültigem Geheimnis', async () => {
    const gueltig = token();
    for (const extra of [{ schalter: undefined }, { schalter: 'off' }, { schalter: 'ON' }, { plattform: 'linux' as const }]) {
      await baueDienst(extra);
      const a = await post({ projekt, satz: 'Tests ansehen' }, { [EINGANG_TOKEN_HEADER]: gueltig });
      expect(a).toEqual({ status: 403, body: { fehler: GRUND.nichtBerechtigt } });
    }
    expect(mgr.creates).toBe(0);
  });

  it('Dienst noch nicht gebaut: aus → 403, an → 503', async () => {
    svc?.dispose();
    await svc?.flush();
    svc = undefined;
    schalter = undefined;
    expect((await anfrage('POST', '/api/eingang/sitzung', { body: '{}' })).status).toBe(403);
    schalter = 'on';
    expect(await anfrage('POST', '/api/eingang/sitzung', { body: '{}' })).toEqual({ status: 503, body: { fehler: GRUND.backendStartet } });
  });

  it('D1: Parser-Fehler (kaputtes JSON, > 8 KB) → 400 mit Protokollzeile; falscher Content-Type → 400', async () => {
    expect(await post('{kaputt')).toEqual({ status: 400, body: { fehler: GRUND.anfrageUngueltig } });
    expect((await post({ projekt, satz: 'x'.repeat(9000) })).status).toBe(400);
    const textPlain = await anfrage('POST', '/api/eingang/sitzung', {
      headers: { 'content-type': 'text/plain', [EINGANG_TOKEN_HEADER]: token() },
      body: JSON.stringify({ projekt, satz: 'Tests ansehen' }),
    });
    expect(textPlain).toEqual({ status: 400, body: { fehler: GRUND.anfrageUngueltig } });
    expect(mgr.creates).toBe(0);
    const z = await protokoll();
    expect(z.map((x) => x.ergebnis)).toEqual([400, 400, 400]);
  });

  it('Gründe der Prüfungen kommen mit Status durch (400/404)', async () => {
    expect(await post({ projekt, satz: '/clear' })).toEqual({ status: 400, body: { fehler: GRUND.satzSlash } });
    expect(await post({ projekt: join(dir, 'fremd'), satz: 'ok' })).toEqual({ status: 404, body: { fehler: GRUND.projektUnbekannt } });
  });
});
