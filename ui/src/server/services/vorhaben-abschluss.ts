/**
 * VorhabenAbschlussRunner (INT-2026-024, FA-06–FA-08, FA-16–FA-20) — the
 * deterministic git side of „Abschließen": preview and completion of a
 * Vorhaben without a language model and without touching the main checkout.
 *
 * Preview: `git fetch origin +refs/heads/<base>:refs/remotes/origin/<base>`
 * (explicit refspec — a bare branch name updates the remote ref only when
 * the remote's configured refspec covers it, review E4), read `intent.md`
 * and `plan.md` of that commit, run the text function.
 *
 * Completion (D1): pre-checks that write nothing, then a plumbing commit in a
 * temporary index (`read-tree` → `hash-object` → `update-index --cacheinfo` →
 * `write-tree` → `commit-tree` → `update-ref`) under the main-project lock —
 * no worktree, no checkout, the main checkout's index is never opened, and
 * NO git hook of the target project runs (a permanent property, documented in
 * `architecture.md` §2). Then push and `gh pr create` outside the lock; on
 * failure a rollback that first asks `gh pr list` whether GitHub created the
 * PR after all (review E5).
 *
 * Every message is „Nicht abgeschlossen: <Ursache> — <nächster Schritt>"
 * (FA-18), tokens redacted, host paths never included. `exec` and the git
 * slice are injectable so the unit tests run without git or GitHub.
 */

import { execFile } from 'child_process';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { GIT_CONFIG } from '../../shared/types/git.protocol.js';
import type { VorhabenAbschlussVorschau } from '../../shared/types/vorhaben.protocol.js';
import { getBaseBranch } from '../general-config.js';
import { loadGithubPat } from '../github-config.js';
import { redactGithubTokens } from '../utils/redact-secrets.js';
import { getRuntimeDir } from '../utils/runtime-paths.js';
import { buildGithubAuthOverrides, detectAuthError, type GithubAuthOverrides } from './git-auth.js';
import { GitError, gitService } from './git.service.js';
import { AbschlussTextError, bauPrNummern, bereiteAbschlussVor, commitTitel, datumLokal, prBody, type AbschlussTextGrund } from './vorhaben-abschluss-text.js';
import { parseIntentHead } from './vorhaben-reader.js';

// ---- injectable process runner ----

export interface AbschlussExecOptions {
  cwd: string;
  /** Merged over process.env. */
  env?: Record<string, string>;
  timeoutMs: number;
  /** Written to stdin, then stdin is closed. */
  input?: string;
}

export interface AbschlussExecResult {
  /** Exit code; -1 when the process could not run (`fehler`). */
  code: number;
  stdout: string;
  stderr: string;
  fehler?: 'ENOENT' | 'TIMEOUT';
}

export type AbschlussExec = (cmd: string, args: string[], opts: AbschlussExecOptions) => Promise<AbschlussExecResult>;

/** The slice of GitService the runner uses — never `createPullRequest` (it swallows failures, review E16). */
export interface AbschlussGit {
  pushBranch(projectPath: string, branchName: string, opts?: { timeoutMs?: number }): Promise<unknown>;
  createPullRequestStrict(
    projectPath: string,
    head: string,
    title: string,
    body: string,
    base: string,
    opts?: { timeoutMs?: number; env?: Record<string, string> }
  ): Promise<{ prUrl?: string; prNumber?: number; stdout: string }>;
  listOpenPullRequestsForHead(projectPath: string, head: string, opts?: { timeoutMs?: number; env?: Record<string, string> }): Promise<Array<{ number: number; url: string }>>;
}

export interface VorhabenAbschlussRunnerDeps {
  exec?: AbschlussExec;
  git?: AbschlussGit;
  /** PAT-based credential overrides for fetch/ls-remote/push --delete; default = settings. */
  auth?: () => GithubAuthOverrides | null;
  /** The PAT handed to `gh` as GH_TOKEN (FA-20); default = settings. */
  pat?: () => string | null;
  baseBranch?: (projectPath: string) => string;
  now?: () => Date;
  timeZone?: string;
  /** Parent of the per-run temp directory holding the index; default = runtime dir. */
  tmpDir?: string;
  /** Extra env for every `gh` call (tests put a fake `gh` first in PATH). */
  ghEnv?: Record<string, string>;
}

/** FA-19 (review E8): per-step network timeouts; success path 43 s, failure path 59 s — below the 60-s budget. */
export const ABSCHLUSS_TIMEOUTS_MS = {
  fetch: 8_000,
  lsRemote: 8_000,
  ghAuth: 5_000,
  push: 10_000,
  prCreate: 12_000,
  prList: 8_000,
  pushDelete: 8_000,
} as const;
export const ABSCHLUSS_BUDGET_MS = 60_000;

export type AbschlussPhase = 'vorpruefung' | 'schreiben' | 'veroeffentlichen';
export type AbschlussGrund =
  | 'kein_repo'
  | 'kein_hauptzweig'
  | 'nicht_auf_hauptzweig'
  | AbschlussTextGrund
  | 'stand_veraltet'
  | 'identitaet_fehlt'
  | 'zweig_belegt_lokal'
  | 'zweig_belegt_entfernt'
  | 'kein_netz'
  | 'gh_fehlt'
  | 'gh_nicht_angemeldet'
  | 'schreiben_fehlgeschlagen'
  | 'push_fehlgeschlagen'
  | 'pr_fehlgeschlagen'
  | 'pr_unklar'
  | 'pr_ohne_nummer';

export class AbschlussError extends Error {
  constructor(
    public readonly phase: AbschlussPhase,
    public readonly grund: AbschlussGrund,
    ursacheUndSchritt: string
  ) {
    super(`Nicht abgeschlossen: ${ursacheUndSchritt}`);
    this.name = 'AbschlussError';
  }
}

/** Cause and next step per reason (FA-18, spec §4 wording). `x` = branch / base / detail as the reason needs. */
export const GRUND_TEXT: Record<Exclude<AbschlussGrund, AbschlussTextGrund>, (x: string) => string> = {
  kein_repo: () => 'das Projekt ist kein Git-Repository — Abschluss nur in einem Repository möglich',
  kein_hauptzweig: (x) => `kein entfernter Hauptzweig erreichbar (${x}) — Remote „origin" und Netz prüfen`,
  nicht_auf_hauptzweig: () => 'das Vorhaben liegt noch nicht auf dem Hauptzweig — erst den Bau-PR mergen',
  stand_veraltet: () => 'der Hauptzweig hat sich seit der Vorschau geändert — Dialog erneut öffnen',
  identitaet_fehlt: () => 'keine Git-Identität auf dem Host — `git config --global user.name` und `user.email` setzen',
  zweig_belegt_lokal: (x) => `Zweig \`${x}\` existiert lokal — \`git branch -D ${x}\` im Projekt, dann erneut`,
  zweig_belegt_entfernt: (x) => `Zweig \`${x}\` existiert auf GitHub — den offenen PR mergen oder den Zweig auf GitHub löschen, dann erneut`,
  kein_netz: (x) => `GitHub nicht erreichbar (${x}) — Netz prüfen, dann erneut`,
  gh_fehlt: () => 'gh ist nicht installiert — GitHub CLI auf dem Host installieren',
  gh_nicht_angemeldet: () => 'gh ist nicht angemeldet — `gh auth login` auf dem Host oder PAT in den Einstellungen hinterlegen',
  schreiben_fehlgeschlagen: (x) => `Commit konnte nicht erzeugt werden (${x}) — erneut versuchen`,
  push_fehlgeschlagen: (x) => `Push fehlgeschlagen: ${x} — Zugang und Netz prüfen, dann erneut`,
  pr_fehlgeschlagen: (x) => `Pull Request nicht eröffnet: ${x} — erneut versuchen`,
  pr_unklar: (x) => `PR-Status unklar (${x}) — auf GitHub prüfen`,
  pr_ohne_nummer: () => "PR eröffnet, Nummer unbekannt — auf GitHub prüfen und danach ‚Abschließen' nicht erneut drücken",
};

export interface AbschlussErgebnis {
  prNumber: number;
  prUrl: string;
  zweig: string;
  at: string;
}

export interface AbschlussInput {
  projectPath: string;
  dirName: string;
  intentId: string;
}

export interface AbschliessenInput extends AbschlussInput {
  /** Lock key (the project's main worktree path); the caller wraps `withMainProjectLock`. */
  mainPath: string;
  baseSha: string;
  lock: <T>(fn: () => Promise<T>) => Promise<T>;
}

export function abschlussZweig(intentId: string): string {
  return `chore/${intentId}-abschluss`;
}

const SHA_RE = /^[0-9a-f]{40}$/;
const NUL = '0000000000000000000000000000000000000000';
/** `/a/b`, `/Users/x/y` … outside URLs (`https://…`) and inside words (`intent/x`). */
const HOST_PATH_RE = /(?<![:/\w])(?:\/[^\s'"`:,;)/]+){2,}/g;

/** Tokens out, host paths out, whitespace collapsed — what a message may carry (FA-18). */
export function saeubern(text: string): string {
  return redactGithubTokens(text).replace(HOST_PATH_RE, '<Pfad>').replace(/\s+/g, ' ').trim();
}

function defaultExec(cmd: string, args: string[], opts: AbschlussExecOptions): Promise<AbschlussExecResult> {
  return new Promise((resolve) => {
    const child = execFile(
      cmd,
      args,
      {
        cwd: opts.cwd,
        env: opts.env ? { ...process.env, ...opts.env } : process.env,
        timeout: opts.timeoutMs,
        maxBuffer: 1024 * 1024,
        encoding: 'utf-8',
      },
      (err, stdout, stderr) => {
        const out = String(stdout ?? '');
        const errText = String(stderr ?? '');
        if (!err) {
          resolve({ code: 0, stdout: out, stderr: errText });
          return;
        }
        const e = err as Error & { code?: string | number; killed?: boolean };
        if (e.code === 'ENOENT') {
          resolve({ code: -1, stdout: out, stderr: errText, fehler: 'ENOENT' });
          return;
        }
        if (e.killed) {
          resolve({ code: -1, stdout: out, stderr: errText, fehler: 'TIMEOUT' });
          return;
        }
        resolve({ code: typeof e.code === 'number' ? e.code : 1, stdout: out, stderr: errText });
      }
    );
    if (child.stdin) {
      if (opts.input !== undefined) child.stdin.end(opts.input);
      else child.stdin.end();
    }
  });
}

interface Bereitet {
  vorschau: VorhabenAbschlussVorschau;
  text: string;
  /** Tree entry mode of intent.md on the base commit (`100644`). */
  modus: string;
}

export class VorhabenAbschlussRunner {
  private readonly exec: AbschlussExec;
  private readonly git: AbschlussGit;
  private readonly auth: () => GithubAuthOverrides | null;
  private readonly pat: () => string | null;
  private readonly baseBranch: (projectPath: string) => string;
  private readonly now: () => Date;
  private readonly timeZone: string;
  private readonly tmpDir: string;
  private readonly extraGhEnv: Record<string, string>;

  constructor(deps: VorhabenAbschlussRunnerDeps = {}) {
    this.exec = deps.exec ?? defaultExec;
    this.git = deps.git ?? gitService;
    this.auth = deps.auth ?? buildGithubAuthOverrides;
    this.pat = deps.pat ?? loadGithubPat;
    this.baseBranch = deps.baseBranch ?? getBaseBranch;
    this.now = deps.now ?? ((): Date => new Date());
    this.timeZone = deps.timeZone ?? process.env.SPECWRIGHT_TZ ?? 'Europe/Berlin';
    this.tmpDir = deps.tmpDir ?? getRuntimeDir();
    this.extraGhEnv = deps.ghEnv ?? {};
  }

  /** FA-02: what the dialog shows — nothing written. */
  public async vorschau(input: AbschlussInput): Promise<VorhabenAbschlussVorschau> {
    return (await this.bereiten(input)).vorschau;
  }

  /**
   * FA-06–FA-08, FA-16, FA-17: pre-checks (nothing written) → plumbing commit
   * under the lock → push and PR outside it → rollback on failure.
   */
  public async abschliessen(input: AbschliessenInput): Promise<AbschlussErgebnis> {
    const { projectPath, dirName, lock } = input;
    const b = await this.bereiten(input);
    const { base, zweig } = b.vorschau;
    if (b.vorschau.baseSha !== input.baseSha) throw this.vp('stand_veraltet');
    const baseSha = b.vorschau.baseSha;

    // ---- Vorprüfung (FA-16) ----
    for (const key of ['user.name', 'user.email']) {
      const r = await this.gitLocal(['config', key], projectPath);
      if (r.code !== 0 || !r.stdout.trim()) throw this.vp('identitaet_fehlt');
    }
    const local = await this.gitLocal(['show-ref', '--verify', '--quiet', `refs/heads/${zweig}`], projectPath);
    if (local.code === 0) throw this.vp('zweig_belegt_lokal', zweig);
    const auth = this.auth();
    const remote = await this.exec('git', [...(auth?.extraGitArgs ?? []), 'ls-remote', '--exit-code', '--heads', 'origin', `refs/heads/${zweig}`], {
      cwd: projectPath,
      env: auth?.env,
      timeoutMs: ABSCHLUSS_TIMEOUTS_MS.lsRemote,
    });
    if (remote.code === 0) throw this.vp('zweig_belegt_entfernt', zweig);
    if (remote.code !== 2) throw this.vp('kein_netz', this.fehlerText(remote));
    const ghVersion = await this.exec('gh', ['--version'], { cwd: projectPath, env: this.ghEnv(), timeoutMs: GIT_CONFIG.OPERATION_TIMEOUT_MS });
    if (ghVersion.fehler === 'ENOENT' || ghVersion.code !== 0) throw this.vp('gh_fehlt');
    const ghAuth = await this.exec('gh', ['auth', 'status'], { cwd: projectPath, env: this.ghEnv(), timeoutMs: ABSCHLUSS_TIMEOUTS_MS.ghAuth });
    if (ghAuth.code !== 0) throw this.vp('gh_nicht_angemeldet');

    // ---- Schreiben (lokal, unter dem Lock): Plumbing-Commit im temporären Index, kein Hook ----
    const titel = b.vorschau.commitTitel;
    const pfad = `intent/${dirName}/intent.md`;
    await lock(async () => {
      const dir = await mkdtemp(join(this.tmpDir, 'abschluss-'));
      try {
        const env = { GIT_INDEX_FILE: join(dir, 'index') };
        await this.schreibSchritt(['read-tree', baseSha], projectPath, env);
        const blob = (await this.schreibSchritt(['hash-object', '-w', '--stdin'], projectPath, undefined, b.text)).trim();
        if (!SHA_RE.test(blob)) throw new AbschlussError('schreiben', 'schreiben_fehlgeschlagen', GRUND_TEXT.schreiben_fehlgeschlagen('hash-object ohne Blob'));
        await this.schreibSchritt(['update-index', '--cacheinfo', `${b.modus},${blob},${pfad}`], projectPath, env);
        const tree = (await this.schreibSchritt(['write-tree'], projectPath, env)).trim();
        const commit = (await this.schreibSchritt(['commit-tree', tree, '-p', baseSha, '-m', titel], projectPath, env)).trim();
        if (!SHA_RE.test(commit)) throw new AbschlussError('schreiben', 'schreiben_fehlgeschlagen', GRUND_TEXT.schreiben_fehlgeschlagen('commit-tree ohne Commit'));
        // Fails when the branch appeared meanwhile — the second guard behind the pre-check.
        await this.schreibSchritt(['update-ref', `refs/heads/${zweig}`, commit, NUL], projectPath);
      } finally {
        await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      }
    });

    // ---- Veröffentlichen (Netz, außerhalb des Locks) ----
    try {
      await this.git.pushBranch(projectPath, zweig, { timeoutMs: ABSCHLUSS_TIMEOUTS_MS.push });
    } catch (err) {
      const rest = await this.rueckbauLokal(lock, projectPath, zweig);
      throw this.vf('push_fehlgeschlagen', `${this.gitFehler(err)}${rest}`);
    }
    let pr: { prUrl?: string; prNumber?: number } | undefined;
    let prFehler: string | undefined;
    try {
      pr = await this.git.createPullRequestStrict(projectPath, zweig, titel, prBody(dirName, b.vorschau.versionAlt, b.vorschau.versionNeu, b.vorschau.bauPrs), base, {
        timeoutMs: ABSCHLUSS_TIMEOUTS_MS.prCreate,
        env: this.ghEnv(),
      });
    } catch (err) {
      prFehler = this.gitFehler(err);
    }
    if (pr?.prNumber && pr.prUrl) return { prNumber: pr.prNumber, prUrl: pr.prUrl, zweig, at: this.now().toISOString() };

    // Review E5: GitHub may have created the PR although the answer got lost — ask before any rollback.
    let offen: Array<{ number: number; url: string }>;
    try {
      offen = await this.git.listOpenPullRequestsForHead(projectPath, zweig, { timeoutMs: ABSCHLUSS_TIMEOUTS_MS.prList, env: this.ghEnv() });
    } catch (err) {
      throw this.vf('pr_unklar', `${this.gitFehler(err)}; Zweig \`${zweig}\` bleibt stehen`);
    }
    if (offen.length === 1) return { prNumber: offen[0].number, prUrl: offen[0].url, zweig, at: this.now().toISOString() };
    if (offen.length > 1) throw this.vf('pr_unklar', `mehrere offene Pull Requests für \`${zweig}\`; Zweig bleibt stehen`);
    // `gh pr create` succeeded without a parsable number and no open PR is listed (AN-S06): no rollback — the PR may exist.
    if (prFehler === undefined) throw this.vf('pr_ohne_nummer');
    const rest = await this.rueckbau(lock, projectPath, zweig);
    throw this.vf('pr_fehlgeschlagen', `${prFehler}${rest}`);
  }

  // ---- internals ----

  private async bereiten(input: AbschlussInput): Promise<Bereitet> {
    const { projectPath, dirName, intentId } = input;
    const inside = await this.gitLocal(['rev-parse', '--is-inside-work-tree'], projectPath);
    if (inside.code !== 0 || inside.stdout.trim() !== 'true') throw this.vp('kein_repo');
    const base = this.baseBranch(projectPath);
    const auth = this.auth();
    const fetch = await this.exec('git', [...(auth?.extraGitArgs ?? []), 'fetch', 'origin', `+refs/heads/${base}:refs/remotes/origin/${base}`], {
      cwd: projectPath,
      env: auth?.env,
      timeoutMs: ABSCHLUSS_TIMEOUTS_MS.fetch,
    });
    if (fetch.code !== 0) throw this.vp('kein_hauptzweig', this.fehlerText(fetch));
    const rev = await this.gitLocal(['rev-parse', `refs/remotes/origin/${base}^{commit}`], projectPath);
    const baseSha = rev.stdout.trim();
    if (rev.code !== 0 || !SHA_RE.test(baseSha)) throw this.vp('kein_hauptzweig', `origin/${base} nicht vorhanden`);
    const pfad = `intent/${dirName}/intent.md`;
    const ls = await this.gitLocal(['ls-tree', baseSha, '--', pfad], projectPath);
    const entry = /^(\d{6})\s+blob\s+([0-9a-f]{40})\t/.exec(ls.stdout);
    if (ls.code !== 0 || !entry) throw this.vp('nicht_auf_hauptzweig');
    const intent = await this.gitLocal(['cat-file', '-p', `${baseSha}:${pfad}`], projectPath);
    if (intent.code !== 0) throw this.vp('nicht_auf_hauptzweig');
    const plan = await this.gitLocal(['cat-file', '-p', `${baseSha}:intent/${dirName}/plan.md`], projectPath);
    const datum = datumLokal(this.now(), this.timeZone);
    const bauPrs = bauPrNummern(plan.code === 0 ? plan.stdout : undefined);
    let t;
    try {
      t = bereiteAbschlussVor(intent.stdout, { datum, bauPrs });
    } catch (err) {
      if (err instanceof AbschlussTextError) throw new AbschlussError('vorpruefung', err.grund, err.message);
      throw err;
    }
    return {
      vorschau: {
        intentId,
        titel: parseIntentHead(intent.stdout)?.titel ?? '(Kopf nicht lesbar)',
        datei: 'intent.md',
        base,
        baseSha,
        zweig: abschlussZweig(intentId),
        statusAlt: t.statusAlt,
        versionAlt: t.versionAlt,
        versionNeu: t.versionNeu,
        datum,
        zeile: t.zeile,
        spalten: t.spalten,
        bauPrs,
        commitTitel: commitTitel(intentId, bauPrs),
      },
      text: t.text,
      modus: entry[1],
    };
  }

  /** Local git call (milliseconds; the 10-s timeout is a guard, not part of the budget). */
  private gitLocal(args: string[], cwd: string, env?: Record<string, string>, input?: string): Promise<AbschlussExecResult> {
    return this.exec('git', args, { cwd, env, timeoutMs: GIT_CONFIG.OPERATION_TIMEOUT_MS, ...(input !== undefined ? { input } : {}) });
  }

  private async schreibSchritt(args: string[], cwd: string, env?: Record<string, string>, input?: string): Promise<string> {
    const r = await this.gitLocal(args, cwd, env, input);
    if (r.code !== 0) throw new AbschlussError('schreiben', 'schreiben_fehlgeschlagen', GRUND_TEXT.schreiben_fehlgeschlagen(`git ${args[0]}: ${this.fehlerText(r)}`));
    return r.stdout;
  }

  /** Deletes the local ref under the lock; '' when gone, else the leftover named for the message. */
  private async rueckbauLokal(lock: AbschliessenInput['lock'], cwd: string, zweig: string): Promise<string> {
    const r = await lock(() => this.gitLocal(['update-ref', '-d', `refs/heads/${zweig}`], cwd));
    return r.code === 0 ? '' : ` — lokaler Zweig \`${zweig}\` steht noch (\`git branch -D ${zweig}\`)`;
  }

  /** Remote then local; every leftover is named (FA-17). */
  private async rueckbau(lock: AbschliessenInput['lock'], cwd: string, zweig: string): Promise<string> {
    const auth = this.auth();
    const del = await this.exec('git', [...(auth?.extraGitArgs ?? []), 'push', 'origin', '--delete', zweig], {
      cwd,
      env: auth?.env,
      timeoutMs: ABSCHLUSS_TIMEOUTS_MS.pushDelete,
    });
    const remoteRest = del.code === 0 ? '' : ` — Zweig \`${zweig}\` ist auf GitHub stehen geblieben — von Hand löschen`;
    return remoteRest + (await this.rueckbauLokal(lock, cwd, zweig));
  }

  private ghEnv(): Record<string, string> {
    const pat = this.pat();
    return { GH_PROMPT_DISABLED: '1', ...(pat ? { GH_TOKEN: pat } : {}), ...this.extraGhEnv };
  }

  private fehlerText(r: AbschlussExecResult): string {
    if (r.fehler === 'ENOENT') return 'Programm nicht gefunden';
    if (r.fehler === 'TIMEOUT') return 'keine Antwort (Zeitüberschreitung)';
    return saeubern(r.stderr || r.stdout) || `Exit ${r.code}`;
  }

  private gitFehler(err: unknown): string {
    const raw = err instanceof GitError ? err.message : ((err as Error)?.message ?? String(err));
    return saeubern(detectAuthError(raw) ?? raw) || 'unbekannter Fehler';
  }

  private vp(grund: Exclude<AbschlussGrund, AbschlussTextGrund>, x = ''): AbschlussError {
    return new AbschlussError('vorpruefung', grund, GRUND_TEXT[grund](x));
  }

  private vf(grund: Exclude<AbschlussGrund, AbschlussTextGrund>, x = ''): AbschlussError {
    return new AbschlussError('veroeffentlichen', grund, GRUND_TEXT[grund](x));
  }
}
