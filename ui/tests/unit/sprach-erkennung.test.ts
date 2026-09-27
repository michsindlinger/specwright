/**
 * INT-2026-025 (Plan D3; FA-26, FA-27, FA-28; Review F14, F16): SprachErkennung
 * gegen eine Fake-Binärdatei (Node-Skript mit HTTP-Server auf --host/--port).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, type ChildProcess } from 'child_process';
import {
  MODELL_GROESSE,
  SPRACH_VOKABELN,
  SprachErkennung,
  istHalluzination,
  werteAntwortAus,
  type SprachErkennungOptionen,
} from '../../src/server/services/sprach-erkennung.js';

const FAKE_SERVER = `#!${process.execPath}
const http = require('http');
const args = process.argv.slice(2);
const wert = (n) => args[args.indexOf(n) + 1];
const antwort = process.env.FAKE_ANTWORT || JSON.stringify({
  text: ' Hallo Welt\\n',
  segments: [{ id: 0, text: ' Hallo Welt', no_speech_prob: 0.01 }],
});
const srv = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/info') {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ args, cwd: process.cwd(), tmpdir: process.env.TMPDIR }));
    return;
  }
  if (req.method === 'POST' && req.url === '/inference') {
    const teile = [];
    req.on('data', (c) => teile.push(c));
    req.on('end', () => {
      res.setHeader('content-type', 'application/json');
      res.end(antwort);
    });
    return;
  }
  res.end('ok');
});
setTimeout(() => srv.listen(Number(wert('--port')), wert('--host')), Number(process.env.FAKE_VERZOEGERUNG || 0));
`;

let dir: string;
let binaer: string;
let modell: string;
let tmpDir: string;
let pidPfad: string;
const instanzen: SprachErkennung[] = [];
const fremde: ChildProcess[] = [];

function env(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH,
    HOME: dir,
    SPECWRIGHT_WHISPER_SERVER: binaer,
    SPECWRIGHT_WHISPER_MODEL: modell,
    ...extra,
  };
}

function neu(opts: SprachErkennungOptionen = {}): SprachErkennung {
  const s = new SprachErkennung({ env: env(), plattform: 'darwin', tmpDir, pidPfad, bereitTimeoutMs: 5000, ...opts });
  instanzen.push(s);
  return s;
}

async function bis(bedingung: () => boolean, ms = 5000): Promise<void> {
  const frist = Date.now() + ms;
  while (!bedingung()) {
    if (Date.now() > frist) throw new Error('Zeitüberschreitung');
    await new Promise((r) => setTimeout(r, 25));
  }
}

function lebt(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function pidAusDatei(): number {
  return Number.parseInt(fs.readFileSync(pidPfad, 'utf8'), 10);
}

const stimme = (): Int16Array => new Int16Array(16000).fill(1000);

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sprach-erkennung-'));
  binaer = path.join(dir, 'whisper-server');
  fs.writeFileSync(binaer, FAKE_SERVER, { mode: 0o755 });
  modell = path.join(dir, 'modell.bin');
  fs.writeFileSync(modell, '');
  fs.truncateSync(modell, MODELL_GROESSE); // dünn besetzte Datei, belegt keinen Platz
  tmpDir = path.join(dir, 'sprache-tmp');
  pidPfad = path.join(dir, 'whisper-server-3999.pid');
});

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(instanzen.splice(0).map((s) => s.stop()));
  for (const k of fremde.splice(0)) k.kill('SIGKILL');
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('verfuegbarkeit (FA-28)', () => {
  it('verfügbar mit Binärdatei und Modell exakter Größe', () => {
    expect(neu().verfuegbarkeit()).toEqual({ verfuegbar: true });
  });

  it('abgeschaltet vor Plattform', () => {
    const s = neu({ env: env({ SPECWRIGHT_ANRUF: 'off' }), plattform: 'linux' });
    expect(s.verfuegbarkeit()).toMatchObject({ verfuegbar: false, grund: 'abgeschaltet' });
  });

  it('Plattform linux', () => {
    const v = neu({ plattform: 'linux' }).verfuegbarkeit();
    expect(v).toMatchObject({ verfuegbar: false, grund: 'plattform' });
    expect(v.text).toContain('Mac');
  });

  it('Binärdatei fehlt oder ist nicht ausführbar', () => {
    const s = neu({ env: env({ SPECWRIGHT_WHISPER_SERVER: path.join(dir, 'gibt-es-nicht') }) });
    expect(s.verfuegbarkeit()).toMatchObject({ verfuegbar: false, grund: 'binaer_fehlt' });
    fs.chmodSync(binaer, 0o644);
    expect(neu().verfuegbarkeit()).toMatchObject({ grund: 'binaer_fehlt' });
  });

  it('Modell fehlt oder hat falsche Größe', () => {
    fs.truncateSync(modell, 10);
    expect(neu().verfuegbarkeit()).toMatchObject({ verfuegbar: false, grund: 'modell_fehlt' });
    const s = neu({ env: env({ SPECWRIGHT_WHISPER_MODEL: undefined }) });
    expect(s.modellPfad()).toBe(path.join(dir, '.specwright', 'sprache', 'ggml-large-v3-turbo-q5_0.bin'));
    expect(s.verfuegbarkeit()).toMatchObject({ grund: 'modell_fehlt' });
  });

  it('start() tut nichts, wenn nicht verfügbar; erkenne() → erkennung_fehlt', async () => {
    const spawnFn = vi.fn(spawn);
    const s = neu({ plattform: 'linux', spawnFn: spawnFn as unknown as typeof spawn });
    await s.start();
    expect(spawnFn).not.toHaveBeenCalled();
    expect(s.laeuft()).toBe(false);
    expect(await s.erkenne(stimme())).toEqual({ grund: 'erkennung_fehlt' });
  });
});

describe('Prozess und Erkennung (FA-26, FA-27)', () => {
  it('startet auf 127.0.0.1 mit Argumenten laut D3, stdio ignore, cwd/TMPDIR = leerer 0700-Ordner', async () => {
    const spawnFn = vi.fn(spawn);
    const fetchFn = vi.fn(fetch);
    const s = neu({ spawnFn: spawnFn as unknown as typeof spawn, fetchFn: fetchFn as unknown as typeof fetch });
    await s.start();
    await s.start(); // idempotent
    expect(s.laeuft()).toBe(true);
    expect(spawnFn).toHaveBeenCalledTimes(1);

    const [bin, args, opts] = spawnFn.mock.calls[0] as unknown as [string, string[], Record<string, unknown>];
    expect(bin).toBe(binaer);
    const port = args[args.indexOf('--port') + 1];
    expect(args).toEqual(['-m', modell, '--host', '127.0.0.1', '--port', port, '-l', 'de', '-nt', '--prompt', SPRACH_VOKABELN]);
    expect(opts.stdio).toBe('ignore');
    expect(opts.cwd).toBe(tmpDir);
    expect((opts.env as NodeJS.ProcessEnv).TMPDIR).toBe(tmpDir);
    expect(fs.statSync(tmpDir).mode & 0o777).toBe(0o700);

    const info = (await (await fetch(`http://127.0.0.1:${port}/info`)).json()) as { cwd: string; tmpdir: string };
    expect(fs.realpathSync(info.cwd)).toBe(fs.realpathSync(tmpDir));
    expect(info.tmpdir).toBe(tmpDir);

    for (let i = 0; i < 10; i++) expect(await s.erkenne(stimme())).toEqual({ text: 'Hallo Welt' });
    expect(fs.readdirSync(tmpDir)).toEqual([]);

    const urls = fetchFn.mock.calls.map((c) => String(c[0]));
    expect(urls.length).toBeGreaterThan(10);
    for (const u of urls) expect(u.startsWith(`http://127.0.0.1:${port}/`)).toBe(true);
    expect(urls.filter((u) => u.endsWith('/inference'))).toHaveLength(10);

    const inferenz = fetchFn.mock.calls.find((c) => String(c[0]).endsWith('/inference'));
    const body = (inferenz?.[1] as RequestInit).body as FormData;
    expect(body.get('response_format')).toBe('verbose_json');
    expect(body.get('temperature')).toBe('0');
    const datei = body.get('file') as Blob;
    expect(datei.size).toBe(44 + 32000);

    expect(pidAusDatei()).toBeGreaterThan(1);
    const pid = pidAusDatei();
    await s.stop();
    expect(s.laeuft()).toBe(false);
    expect(fs.existsSync(pidPfad)).toBe(false);
    await bis(() => !lebt(pid));
  });

  it('schreibt nichts außer PID-Datei und tmp-Ordner (fs-Spy)', async () => {
    const writeFileSync = vi.spyOn(fs, 'writeFileSync');
    const mkdirSync = vi.spyOn(fs, 'mkdirSync');
    const appendFileSync = vi.spyOn(fs, 'appendFileSync');
    const createWriteStream = vi.spyOn(fs, 'createWriteStream');
    // writeSync nicht: den ruft writeFileSync intern für die PID-Datei.
    const promisesWrite = vi.spyOn(fs.promises, 'writeFile');
    const promisesAppend = vi.spyOn(fs.promises, 'appendFile');
    const s = neu();
    await s.start();
    for (let i = 0; i < 3; i++) await s.erkenne(stimme());
    await s.stop();
    expect(writeFileSync.mock.calls.map((c) => c[0])).toEqual([pidPfad]);
    for (const c of mkdirSync.mock.calls) expect([tmpDir, path.dirname(pidPfad)]).toContain(c[0]);
    expect(appendFileSync).not.toHaveBeenCalled();
    expect(createWriteStream).not.toHaveBeenCalled();
    expect(promisesWrite).not.toHaveBeenCalled();
    expect(promisesAppend).not.toHaveBeenCalled();
  });

  it('leerer Text und Halluzinationen → nichts_verstanden (Review F14)', async () => {
    const antworten = [
      JSON.stringify({ text: '' }),
      JSON.stringify({ text: ' [BLANK_AUDIO]\n' }),
      JSON.stringify({ text: ' Vielen Dank.\n', segments: [{ text: ' Vielen Dank.', no_speech_prob: 4e-12 }] }),
      JSON.stringify({ text: ' Untertitel im Auftrag des ZDF, 2021' }),
      JSON.stringify({ text: ' Untertitelung des SWR' }),
      JSON.stringify({ text: ' Ja, bitte.', segments: [{ text: ' Ja, bitte.', no_speech_prob: 0.9 }] }),
      'kein json',
    ];
    let i = 0;
    const fetchFn = vi.fn(async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      if (String(input).endsWith('/inference')) return new Response(antworten[i++]);
      return fetch(input, init);
    });
    const s = neu({ fetchFn: fetchFn as unknown as typeof fetch });
    await s.start();
    for (let n = 0; n < antworten.length; n++) {
      expect(await s.erkenne(stimme())).toEqual({ grund: 'nichts_verstanden' });
    }
  });

  it('wertet Antworten tolerant aus', () => {
    expect(werteAntwortAus('{"text":" Zwei\u0001 bitte\n"}')).toBe('Zwei bitte');
    expect(werteAntwortAus(JSON.stringify({ text: 'x', segments: [
      { text: ' Freigeben', no_speech_prob: 0.1 },
      { text: ' Vielen Dank.', no_speech_prob: 0.95 },
    ] }))).toBe('Freigeben');
    // Feld fehlt → Segmente nicht filtern, Text der Antwort gilt
    expect(werteAntwortAus(JSON.stringify({ text: ' Plan freigeben', segments: [{ text: ' Plan freigeben' }] }))).toBe('Plan freigeben');
    expect(istHalluzination('Danke, das passt.')).toBe(false);
    expect(istHalluzination('Vielen Dank!')).toBe(true);
  });

  it('bereit-Timeout: start() lehnt ab und beendet den Prozess', async () => {
    const spawnFn = vi.fn(spawn);
    const s = neu({
      env: env({ FAKE_VERZOEGERUNG: '10000' }),
      bereitTimeoutMs: 300,
      spawnFn: spawnFn as unknown as typeof spawn,
    });
    await expect(s.start()).rejects.toThrow(/nicht rechtzeitig/);
    const kind = spawnFn.mock.results[0]?.value as ChildProcess;
    await bis(() => kind.exitCode !== null || kind.signalCode !== null);
    expect(s.laeuft()).toBe(false);
    expect(fs.existsSync(pidPfad)).toBe(false);
  });
});

describe('verwaister Prozess (Review F16)', () => {
  it('beendet PID aus der Datei nicht, wenn der Befehlsname nicht passt (echtes ps)', async () => {
    const schlaefer = spawn('sleep', ['30'], { stdio: 'ignore' });
    fremde.push(schlaefer);
    fs.writeFileSync(pidPfad, `${schlaefer.pid}\n`);
    const s = neu();
    await s.start();
    expect(lebt(schlaefer.pid as number)).toBe(true);
    expect(pidAusDatei()).not.toBe(schlaefer.pid);
  });

  it('beendet PID aus der Datei, wenn der Befehlsname whisper-server ist', async () => {
    const verwaist = spawn('sleep', ['30'], { stdio: 'ignore' });
    fremde.push(verwaist);
    const pid = verwaist.pid as number;
    fs.writeFileSync(pidPfad, `${pid}\n`);
    const prozessNameFn = vi.fn((p: number) => (p === pid ? '/opt/homebrew/bin/whisper-server' : null));
    const s = neu({ prozessNameFn });
    await s.start();
    expect(prozessNameFn).toHaveBeenCalledWith(pid);
    await bis(() => verwaist.exitCode !== null || verwaist.signalCode !== null);
    expect(pidAusDatei()).not.toBe(pid);
  });
});

describe('Absturz (D3, E4)', () => {
  it('erster Absturz → ein Neustart; erkenne wartet darauf; zweiter → abgestürzt', async () => {
    const s = neu({ env: env({ FAKE_VERZOEGERUNG: '300' }) });
    const abgestuerzt = vi.fn();
    s.on('abgestuerzt', abgestuerzt);
    await s.start();
    const pid1 = pidAusDatei();

    process.kill(pid1, 'SIGKILL');
    await bis(() => !s.laeuft());
    expect(await s.erkenne(stimme())).toEqual({ text: 'Hallo Welt' }); // wartet ≤ 5 s auf den Neustart
    expect(s.laeuft()).toBe(true);
    const pid2 = pidAusDatei();
    expect(pid2).not.toBe(pid1);
    expect(s.verfuegbarkeit()).toEqual({ verfuegbar: true });
    expect(abgestuerzt).not.toHaveBeenCalled();

    process.kill(pid2, 'SIGKILL');
    await bis(() => abgestuerzt.mock.calls.length === 1);
    expect(s.laeuft()).toBe(false);
    expect(s.verfuegbarkeit()).toMatchObject({ verfuegbar: false, grund: 'erkennung_abgestuerzt' });
    expect(await s.erkenne(stimme())).toEqual({ grund: 'erkennung_fehlt' });
    expect(fs.existsSync(pidPfad)).toBe(false);

    await s.stop(); // Anrufmodus aus → wieder verfügbar
    expect(s.verfuegbarkeit()).toEqual({ verfuegbar: true });
  });

  it('erkenne während eines hängenden Neustarts → nach 5 s erkennung_neustart', async () => {
    const s = neu({ env: env({ FAKE_VERZOEGERUNG: '0' }), bereitTimeoutMs: 8000 });
    await s.start();
    const pid1 = pidAusDatei();
    // Neustart soll hängen: Fake startet ab jetzt verzögert (gleiches env-Objekt wird neu gelesen)
    (s as unknown as { env: NodeJS.ProcessEnv }).env.FAKE_VERZOEGERUNG = '7000';
    process.kill(pid1, 'SIGKILL');
    await bis(() => !s.laeuft());
    const t0 = Date.now();
    expect(await s.erkenne(stimme())).toEqual({ grund: 'erkennung_neustart' });
    expect(Date.now() - t0).toBeGreaterThanOrEqual(4900);
  }, 15000);

  it('Status-Ereignis bei Zustandswechsel', async () => {
    const s = neu();
    const status = vi.fn();
    s.on('status', status);
    await s.start();
    await s.stop();
    expect(status).toHaveBeenCalled();
  });
});
