/**
 * INT-2026-025 (Plan D3; FA-26, FA-27, FA-28): lokale Spracherkennung über
 * einen `whisper-server`-Kindprozess (whisper.cpp) auf `127.0.0.1`.
 *
 * - Der Prozess läuft nur, solange der Anrufmodus an ist (`start`/`stop`).
 * - `stdio: 'ignore'`: erkannter Text landet in keinem Log (FA-27).
 * - `cwd` und `TMPDIR` zeigen auf einen leeren `0700`-Ordner; die Aufnahme geht
 *   als WAV im Speicher per `fetch` an `/inference`, nie auf die Platte.
 * - Geschrieben wird nur die PID-Datei (je Backend-Port), damit ein verwaister
 *   Prozess nach einem Backend-Absturz beim nächsten Start beendet wird (F16).
 * - Absturz → genau ein automatischer Neustart, danach Zustand „abgestürzt"
 *   bis zum nächsten `stop()` (Anrufmodus aus und wieder an).
 *
 * Messung 27.09. (whisper.cpp 1.9.1, large-v3-turbo-q5_0): `verbose_json`
 * liefert `no_speech_prob` je Segment, bei reiner Stille aber ≈ 0 zusammen mit
 * der Halluzination „Vielen Dank." — der eigentliche Schutz bleibt daher die
 * Halluzinationsliste plus Anzeige und „Senden" im Frontend (Review F14, E9).
 */
import { EventEmitter } from 'events';
import { spawn, execFileSync, type ChildProcess } from 'child_process';
import fs from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';
import {
  ANRUF_NICHT_VERFUEGBAR_TEXT,
  type AnrufNichtVerfuegbarGrund,
  type AnrufVerfuegbarkeit,
} from '../../shared/types/anruf.protocol.js';
import { ANRUF_RATE, wavKopf } from '../../shared/anruf-audio.js';
import { getSpracheTmpDir, getWhisperPidPath } from '../utils/runtime-paths.js';
import { anrufAbgeschaltet } from './claude-hooks.js';

export type ErkennungsErgebnis =
  | { text: string }
  | { grund: 'nichts_verstanden' | 'erkennung_neustart' | 'erkennung_fehlt' };

export interface SprachErkennungOptionen {
  env?: NodeJS.ProcessEnv;
  plattform?: NodeJS.Platform;
  spawnFn?: typeof spawn;
  fetchFn?: typeof fetch;
  pidPfad?: string;
  tmpDir?: string;
  bereitTimeoutMs?: number;
  /** Befehlsname zu einer PID (`ps -p <pid> -o comm=`); `null` = kein Prozess. Für Tests injizierbar. */
  prozessNameFn?: (pid: number) => string | null;
}

/** Größe von `ggml-large-v3-turbo-q5_0.bin` (volle Prüfsumme nur im Einrichtungsskript). */
export const MODELL_GROESSE = 574_041_195;

/** Fachvokabular als Erkennungs-Hinweis (Plan §2, Messung EK-01/EK-03). */
export const SPRACH_VOKABELN = 'Spec, Plan, Merge, Pull Request, Commit, Build, CI, Glocke, Absicht, Freigabe';

const STANDARD_BEREIT_TIMEOUT_MS = 15_000;
const NEUSTART_WARTEN_MS = 5_000;
const STOP_KILL_MS = 2_000;
const BEREIT_POLL_MS = 100;
const NO_SPEECH_SCHWELLE = 0.6;

/** Bekannte Whisper-Halluzinationen bei Stille/Rauschen, normalisiert (klein, ohne Satzzeichen). */
const HALLUZINATIONEN_GANZ = new Set([
  'vielen dank',
  'vielen dank fürs zuschauen',
  'danke fürs zuschauen',
  'bis zum nächsten mal',
  'thank you',
  'thanks for watching',
  'musik',
  'applaus',
]);
const HALLUZINATIONEN_ANFANG = ['untertitel', 'copyright'];

type Zustand = 'aus' | 'startet' | 'bereit' | 'neustart' | 'abgestuerzt';

function standardProzessName(pid: number): string | null {
  try {
    const out = execFileSync('ps', ['-p', String(pid), '-o', 'comm='], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const name = out.trim();
    return name.length > 0 ? name : null;
  } catch {
    return null;
  }
}

function istAusfuehrbar(datei: string): boolean {
  try {
    if (!fs.statSync(datei).isFile()) return false;
    fs.accessSync(datei, fs.constants.X_OK);
    return true;
  } catch {
    return false;
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

function warte(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function freierPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const adresse = srv.address();
      const port = typeof adresse === 'object' && adresse ? adresse.port : 0;
      srv.close(() => (port > 0 ? resolve(port) : reject(new Error('kein freier Port'))));
    });
  });
}

function normalisiere(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.!?,;:„“"'»«…*()[\]-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Leer oder bekannte Halluzination → `true`. Exportiert für Tests. */
export function istHalluzination(text: string): boolean {
  const n = normalisiere(text);
  if (n.length === 0) return true;
  if (HALLUZINATIONEN_GANZ.has(n)) return true;
  return HALLUZINATIONEN_ANFANG.some((a) => n.startsWith(a));
}

interface WhisperSegment {
  text?: unknown;
  no_speech_prob?: unknown;
}

/**
 * Antwort von `/inference` → erkannter Text oder `null` (nichts verstanden).
 * Steuerzeichen werden vor `JSON.parse` entfernt (whisper.cpp gibt sie roh aus).
 * Exportiert für Tests.
 */
export function werteAntwortAus(roh: string): string | null {
  let daten: unknown;
  try {
    // eslint-disable-next-line no-control-regex
    daten = JSON.parse(roh.replace(/[\u0000-\u001f\u007f]/g, ' '));
  } catch {
    return null;
  }
  if (typeof daten !== 'object' || daten === null) return null;
  const obj = daten as { text?: unknown; segments?: unknown };
  let text = typeof obj.text === 'string' ? obj.text : '';
  if (Array.isArray(obj.segments) && obj.segments.length > 0) {
    const segmente = obj.segments as WhisperSegment[];
    const mitWert = segmente.filter((s) => typeof s.no_speech_prob === 'number');
    if (mitWert.length === segmente.length) {
      const behalten = segmente.filter((s) => (s.no_speech_prob as number) <= NO_SPEECH_SCHWELLE);
      if (behalten.length === 0) return null;
      text = behalten.map((s) => (typeof s.text === 'string' ? s.text : '')).join('');
    }
  }
  const bereinigt = text
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\*[^*]*\*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (istHalluzination(bereinigt)) return null;
  return bereinigt;
}

export class SprachErkennung extends EventEmitter {
  private readonly env: NodeJS.ProcessEnv;
  private readonly plattform: NodeJS.Platform;
  private readonly spawnFn: typeof spawn;
  private readonly fetchFn: typeof fetch;
  private readonly pidPfad: string;
  private readonly tmpDir: string;
  private readonly bereitTimeoutMs: number;
  private readonly prozessNameFn: (pid: number) => string | null;

  private zustand: Zustand = 'aus';
  private kind: ChildProcess | null = null;
  private port = 0;
  private abstuerze = 0;
  private startVersprechen: Promise<void> | null = null;
  /** Wird bei jedem `stop()` erhöht; ein laufender Start/Neustart mit alter Generation bricht ab. */
  private generation = 0;
  private bereitWartende: Array<() => void> = [];

  constructor(opts: SprachErkennungOptionen = {}) {
    super();
    this.env = opts.env ?? process.env;
    this.plattform = opts.plattform ?? process.platform;
    this.spawnFn = opts.spawnFn ?? spawn;
    this.fetchFn = opts.fetchFn ?? fetch;
    this.pidPfad = opts.pidPfad ?? getWhisperPidPath();
    this.tmpDir = opts.tmpDir ?? getSpracheTmpDir();
    this.bereitTimeoutMs = opts.bereitTimeoutMs ?? STANDARD_BEREIT_TIMEOUT_MS;
    this.prozessNameFn = opts.prozessNameFn ?? standardProzessName;
  }

  /** Pfad der Binärdatei oder `null`. Reihenfolge: Variable, PATH (`which`), Homebrew, /usr/local. */
  binaerPfad(): string | null {
    const gesetzt = this.env.SPECWRIGHT_WHISPER_SERVER;
    if (gesetzt) return istAusfuehrbar(gesetzt) ? gesetzt : null;
    const kandidaten = (this.env.PATH ?? '')
      .split(path.delimiter)
      .filter((d) => d.length > 0)
      .map((d) => path.join(d, 'whisper-server'));
    kandidaten.push('/opt/homebrew/bin/whisper-server', '/usr/local/bin/whisper-server');
    return kandidaten.find(istAusfuehrbar) ?? null;
  }

  modellPfad(): string {
    return (
      this.env.SPECWRIGHT_WHISPER_MODEL ??
      path.join(this.env.HOME ?? os.homedir(), '.specwright', 'sprache', 'ggml-large-v3-turbo-q5_0.bin')
    );
  }

  private modellOk(): boolean {
    try {
      const st = fs.statSync(this.modellPfad());
      return st.isFile() && st.size === MODELL_GROESSE;
    } catch {
      return false;
    }
  }

  verfuegbarkeit(): AnrufVerfuegbarkeit {
    const nicht = (grund: AnrufNichtVerfuegbarGrund): AnrufVerfuegbarkeit => ({
      verfuegbar: false,
      grund,
      text: ANRUF_NICHT_VERFUEGBAR_TEXT[grund],
    });
    if (anrufAbgeschaltet(this.env)) return nicht('abgeschaltet');
    if (this.plattform !== 'darwin') return nicht('plattform');
    if (this.binaerPfad() === null) return nicht('binaer_fehlt');
    if (!this.modellOk()) return nicht('modell_fehlt');
    if (this.zustand === 'abgestuerzt') return nicht('erkennung_abgestuerzt');
    return { verfuegbar: true };
  }

  laeuft(): boolean {
    return this.zustand === 'bereit';
  }

  /**
   * Startet den Prozess (idempotent). Ist die Erkennung nicht verfügbar, passiert
   * nichts (Grund über `verfuegbarkeit()`). Wird er nicht binnen
   * `bereitTimeoutMs` bereit, wird er beendet und das Versprechen abgelehnt.
   */
  start(): Promise<void> {
    if (this.zustand === 'bereit') return Promise.resolve();
    if (this.startVersprechen) return this.startVersprechen;
    if (!this.verfuegbarkeit().verfuegbar) return Promise.resolve();
    const gen = this.generation;
    this.setzeZustand('startet');
    const p = this.starteProzess(gen)
      .catch((err: unknown) => {
        if (gen === this.generation) this.setzeZustand('aus');
        throw err;
      })
      .finally(() => {
        if (this.startVersprechen === p) this.startVersprechen = null;
      });
    this.startVersprechen = p;
    return p;
  }

  async stop(): Promise<void> {
    this.generation++;
    this.startVersprechen = null;
    const kind = this.kind;
    this.kind = null;
    this.abstuerze = 0;
    if (kind) await this.beende(kind);
    this.entfernePidDatei();
    this.setzeZustand('aus');
  }

  async erkenne(pcm: Int16Array): Promise<ErkennungsErgebnis> {
    if (this.zustand === 'neustart' || this.zustand === 'startet') {
      const bereit = await this.warteAufBereit(NEUSTART_WARTEN_MS);
      if (!bereit) return { grund: this.endgueltigWeg() ? 'erkennung_fehlt' : 'erkennung_neustart' };
    }
    if (this.zustand !== 'bereit') return { grund: 'erkennung_fehlt' };

    const pcmBytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
    const wav = new Uint8Array(44 + pcmBytes.byteLength);
    wav.set(wavKopf(pcmBytes.byteLength, ANRUF_RATE), 0);
    wav.set(pcmBytes, 44);
    const form = new FormData();
    form.append('file', new Blob([wav], { type: 'audio/wav' }), 'anruf.wav');
    form.append('response_format', 'verbose_json');
    form.append('temperature', '0');

    let roh: string;
    try {
      const res = await this.fetchFn(`http://127.0.0.1:${this.port}/inference`, { method: 'POST', body: form });
      if (!res.ok) return { grund: 'nichts_verstanden' };
      roh = await res.text();
    } catch {
      // Prozess während der Erkennung weg (E4): Puffer verwerfen, nicht wiederholen.
      return { grund: this.endgueltigWeg() ? 'erkennung_fehlt' : 'erkennung_neustart' };
    }
    const text = werteAntwortAus(roh);
    return text === null ? { grund: 'nichts_verstanden' } : { text };
  }

  // ---------------------------------------------------------------------------

  /** Kein Prozess und keiner unterwegs (aus oder abgestürzt). */
  private endgueltigWeg(): boolean {
    return this.zustand === 'abgestuerzt' || this.zustand === 'aus';
  }

  private setzeZustand(z: Zustand): void {
    if (this.zustand === z) return;
    this.zustand = z;
    if (z === 'bereit') {
      const wartende = this.bereitWartende;
      this.bereitWartende = [];
      for (const w of wartende) w();
    }
    if (z === 'abgestuerzt' || z === 'aus') {
      const wartende = this.bereitWartende;
      this.bereitWartende = [];
      for (const w of wartende) w();
    }
    this.emit('status', this.verfuegbarkeit());
  }

  private warteAufBereit(ms: number): Promise<boolean> {
    if (this.zustand === 'bereit') return Promise.resolve(true);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.bereitWartende = this.bereitWartende.filter((w) => w !== fertig);
        resolve(false);
      }, ms);
      const fertig = (): void => {
        clearTimeout(timer);
        resolve(this.zustand === 'bereit');
      };
      this.bereitWartende.push(fertig);
    });
  }

  private async starteProzess(gen: number): Promise<void> {
    const binaer = this.binaerPfad();
    if (!binaer) throw new Error('whisper-server fehlt');
    await this.beendeVerwaisten();
    this.bereiteTmpDirVor();
    const port = await freierPort();
    if (gen !== this.generation) return;

    const args = [
      '-m', this.modellPfad(),
      '--host', '127.0.0.1',
      '--port', String(port),
      '-l', 'de',
      '-nt',
      '--prompt', SPRACH_VOKABELN,
    ];
    const kind = this.spawnFn(binaer, args, {
      stdio: 'ignore',
      cwd: this.tmpDir,
      env: { ...this.env, TMPDIR: this.tmpDir },
    });
    this.kind = kind;
    this.port = port;
    let beendet = false;
    kind.once('exit', () => {
      beendet = true;
      this.beiEnde(kind, gen);
    });
    kind.once('error', () => {
      beendet = true;
      this.beiEnde(kind, gen);
    });

    const frist = Date.now() + this.bereitTimeoutMs;
    while (Date.now() < frist) {
      if (gen !== this.generation || this.kind !== kind) return;
      if (beendet) throw new Error('whisper-server vor Bereitschaft beendet');
      if (await this.antwortet(port)) {
        if (gen !== this.generation || this.kind !== kind) return;
        if (kind.pid !== undefined) this.schreibePidDatei(kind.pid);
        this.setzeZustand('bereit');
        return;
      }
      await warte(BEREIT_POLL_MS);
    }
    this.kind = null;
    await this.beende(kind);
    throw new Error('whisper-server nicht rechtzeitig bereit');
  }

  private async antwortet(port: number): Promise<boolean> {
    try {
      const res = await this.fetchFn(`http://127.0.0.1:${port}/`, { method: 'GET' });
      await res.arrayBuffer().catch(() => undefined);
      return true;
    } catch {
      return false;
    }
  }

  /** Unerwartetes Ende: genau ein Neustart, danach „abgestürzt". */
  private beiEnde(kind: ChildProcess, gen: number): void {
    if (gen !== this.generation || this.kind !== kind) return;
    this.kind = null;
    this.entfernePidDatei();
    // Ein Ende vor der Bereitschaft (Erststart oder Neustart) behandelt
    // `starteProzess` selbst.
    if (this.zustand === 'startet' || this.zustand === 'neustart') return;
    this.abstuerze++;
    if (this.abstuerze > 1) {
      this.alsAbgestuerzt();
      return;
    }
    this.setzeZustand('neustart');
    this.starteProzess(gen).catch(() => {
      if (gen === this.generation) this.alsAbgestuerzt();
    });
  }

  private alsAbgestuerzt(): void {
    if (this.zustand === 'abgestuerzt') return;
    const kind = this.kind;
    this.kind = null;
    if (kind) void this.beende(kind);
    this.setzeZustand('abgestuerzt');
    this.emit('abgestuerzt');
  }

  private beende(kind: ChildProcess): Promise<void> {
    return new Promise((resolve) => {
      if (kind.exitCode !== null || kind.signalCode !== null) {
        resolve();
        return;
      }
      const timer = setTimeout(() => {
        try {
          kind.kill('SIGKILL');
        } catch {
          // schon weg
        }
      }, STOP_KILL_MS);
      kind.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
      try {
        kind.kill('SIGTERM');
      } catch {
        clearTimeout(timer);
        resolve();
      }
    });
  }

  /** Verwaister Prozess aus der PID-Datei: nur beenden, wenn der Befehlsname passt (F16). */
  private async beendeVerwaisten(): Promise<void> {
    let pid: number;
    try {
      pid = Number.parseInt(fs.readFileSync(this.pidPfad, 'utf8').trim(), 10);
    } catch {
      return;
    }
    if (Number.isInteger(pid) && pid > 1 && pid !== process.pid) {
      const name = this.prozessNameFn(pid);
      if (name !== null && path.basename(name) === 'whisper-server') {
        try {
          process.kill(pid, 'SIGTERM');
        } catch {
          // schon weg
        }
        const frist = Date.now() + STOP_KILL_MS;
        while (Date.now() < frist && lebt(pid)) await warte(50);
        if (lebt(pid)) {
          try {
            process.kill(pid, 'SIGKILL');
          } catch {
            // schon weg
          }
        }
      }
    }
    this.entfernePidDatei();
  }

  private bereiteTmpDirVor(): void {
    fs.rmSync(this.tmpDir, { recursive: true, force: true });
    fs.mkdirSync(this.tmpDir, { recursive: true, mode: 0o700 });
    fs.chmodSync(this.tmpDir, 0o700);
  }

  private schreibePidDatei(pid: number): void {
    fs.mkdirSync(path.dirname(this.pidPfad), { recursive: true });
    fs.writeFileSync(this.pidPfad, `${pid}\n`, { mode: 0o600 });
  }

  private entfernePidDatei(): void {
    try {
      fs.rmSync(this.pidPfad, { force: true });
    } catch {
      // nichts zu tun
    }
  }
}
