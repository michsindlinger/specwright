/**
 * INT-2026-024 (FA-16–FA-20): the runner against a scripted `exec` and a fake
 * git slice — order of commands (explicit refspec), every pre-check, the
 * `baseSha` comparison after the fetch, rollback per failure point, the
 * `gh pr list` re-check (review E5), redaction, GH_TOKEN, the time budget.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  ABSCHLUSS_BUDGET_MS,
  ABSCHLUSS_TIMEOUTS_MS,
  AbschlussError,
  VorhabenAbschlussRunner,
  abschlussZweig,
  saeubern,
  type AbschlussExecOptions,
  type AbschlussExecResult,
  type AbschlussGit,
} from '../../src/server/services/vorhaben-abschluss.js';
import { GitError } from '../../src/server/services/git.service.js';
import { ABSCHLUSS_CLIENT_TIMEOUT_MS } from '../../src/shared/types/vorhaben.protocol.js';

const BASE_SHA = 'a'.repeat(40);
const BLOB = 'b'.repeat(40);
const TREE = 'c'.repeat(40);
const COMMIT = 'd'.repeat(40);
const ZWEIG = abschlussZweig('INT-2026-001');
const INTENT = '---\nintent_id: "INT-2026-001"  \ntitel: "Test"  \nstatus: "angenommen"  \nversion: "1.0.0"  \ngeaendert: "2026-09-01"  \n---\n\n## Änderungsprotokoll\n\n| Version | Datum | Änderung | IDs | Freigabe |\n|---|---|---|---|---|\n| 1.0.0 | 2026-09-01 | x | — | — |\n';
const PLAN = '# Plan\n\n> **Status:** umgesetzt — PR #7 offen\n';

interface Call {
  cmd: string;
  args: string[];
  opts: AbschlussExecOptions;
}

const ok = (stdout = ''): AbschlussExecResult => ({ code: 0, stdout, stderr: '' });
const fail = (code: number, stderr = ''): AbschlussExecResult => ({ code, stdout: '', stderr });

/** Scripted exec: `answers` maps a key (first two args joined) to a result or a function; default answers make the happy path. */
class FakeExec {
  public calls: Call[] = [];
  public answers = new Map<string, AbschlussExecResult | ((c: Call) => AbschlussExecResult)>();
  public intentText = INTENT;
  public planText: string | undefined = PLAN;
  public baseSha = BASE_SHA;
  readonly exec = async (cmd: string, args: string[], opts: AbschlussExecOptions): Promise<AbschlussExecResult> => {
    const call = { cmd, args, opts };
    this.calls.push(call);
    const plain = args.filter((a) => a !== '-c' && !a.startsWith('credential.'));
    const key = `${cmd} ${plain.slice(0, 2).join(' ')}`;
    const scripted = this.answers.get(key) ?? this.answers.get(`${cmd} ${plain[0]}`);
    if (scripted) return typeof scripted === 'function' ? scripted(call) : scripted;
    switch (key) {
      case 'git rev-parse --is-inside-work-tree':
        return ok('true\n');
      case 'git fetch origin':
        return ok();
      case `git rev-parse refs/remotes/origin/main^{commit}`:
        return ok(`${this.baseSha}\n`);
      case `git ls-tree ${this.baseSha}`:
        return ok(`100644 blob ${BLOB}\t${plain[3]}\n`);
      case `git cat-file -p`:
        if (plain[2].endsWith('intent.md')) return ok(this.intentText);
        return this.planText === undefined ? fail(128, 'fatal: path not found') : ok(this.planText);
      case 'git config user.name':
        return ok('Michael\n');
      case 'git config user.email':
        return ok('m@example.com\n');
      case 'git show-ref --verify':
        return fail(1);
      case 'git ls-remote --exit-code':
        return fail(2);
      case 'gh --version':
        return ok('gh version 2.0\n');
      case 'gh auth status':
        return ok('Logged in\n');
      case `git read-tree ${this.baseSha}`:
        return ok();
      case 'git hash-object -w':
        return ok(`${BLOB}\n`);
      case 'git update-index --cacheinfo':
        return ok();
      case 'git write-tree':
        return ok(`${TREE}\n`);
      case `git commit-tree ${TREE}`:
        return ok(`${COMMIT}\n`);
      case `git update-ref refs/heads/${ZWEIG}`:
        return ok();
      case 'git update-ref -d':
        return ok();
      case 'git push origin':
        return ok();
      default:
        return fail(1, `unscripted: ${key}`);
    }
  };
  names(): string[] {
    return this.calls.map((c) => `${c.cmd} ${c.args.filter((a) => a !== '-c' && !a.startsWith('credential.')).slice(0, 2).join(' ')}`);
  }
}

class FakeGit implements AbschlussGit {
  public pushes: Array<{ branch: string; timeoutMs?: number }> = [];
  public creates: Array<{ head: string; base: string; title: string; body: string; env?: Record<string, string>; timeoutMs?: number }> = [];
  public lists: Array<{ head: string; env?: Record<string, string>; timeoutMs?: number }> = [];
  public pushFails: Error | null = null;
  public createResult: { prUrl?: string; prNumber?: number; stdout: string } | Error = { prUrl: 'https://github.com/o/r/pull/42', prNumber: 42, stdout: 'https://github.com/o/r/pull/42\n' };
  public listResult: Array<{ number: number; url: string }> | Error = [];
  async pushBranch(_p: string, branch: string, opts?: { timeoutMs?: number }): Promise<unknown> {
    this.pushes.push({ branch, timeoutMs: opts?.timeoutMs });
    if (this.pushFails) throw this.pushFails;
    return { success: true };
  }
  async createPullRequestStrict(_p: string, head: string, title: string, body: string, base: string, opts?: { timeoutMs?: number; env?: Record<string, string> }) {
    this.creates.push({ head, base, title, body, env: opts?.env, timeoutMs: opts?.timeoutMs });
    if (this.createResult instanceof Error) throw this.createResult;
    return this.createResult;
  }
  async listOpenPullRequestsForHead(_p: string, head: string, opts?: { timeoutMs?: number; env?: Record<string, string> }) {
    this.lists.push({ head, env: opts?.env, timeoutMs: opts?.timeoutMs });
    if (this.listResult instanceof Error) throw this.listResult;
    return this.listResult;
  }
}

describe('VorhabenAbschlussRunner (INT-2026-024)', () => {
  let tmp: string;
  let fx: FakeExec;
  let git: FakeGit;
  let locks = 0;
  let pat: string | null;
  const lock = async <T>(fn: () => Promise<T>): Promise<T> => {
    locks++;
    return fn();
  };
  const runner = (): VorhabenAbschlussRunner =>
    new VorhabenAbschlussRunner({
      exec: fx.exec,
      git,
      auth: () => (pat ? { extraGitArgs: ['-c', 'credential.https://github.com.helper=', '-c', `credential.https://github.com.helper=!x`], env: { GITHUB_TOKEN: pat, GIT_TERMINAL_PROMPT: '0' } } : null),
      pat: () => pat,
      baseBranch: () => 'main',
      now: () => new Date('2026-09-22T10:00:00Z'),
      timeZone: 'Europe/Berlin',
      tmpDir: tmp,
    });
  const input = { projectPath: '/proj', mainPath: '/proj', dirName: 'INT-2026-001-test', intentId: 'INT-2026-001', baseSha: BASE_SHA, lock };
  const schreibBefehle = ['git read-tree', 'git hash-object', 'git update-index', 'git write-tree', 'git commit-tree', 'git update-ref'];
  const hatGeschrieben = (): boolean => fx.names().some((n) => schreibBefehle.some((s) => n.startsWith(s)) && !n.startsWith('git update-ref -d'));
  const expectAbschlussError = async (p: Promise<unknown>, grund: string, phase?: string): Promise<AbschlussError> => {
    try {
      await p;
    } catch (e) {
      expect(e).toBeInstanceOf(AbschlussError);
      const err = e as AbschlussError;
      expect(err.grund).toBe(grund);
      if (phase) expect(err.phase).toBe(phase);
      expect(err.message).toMatch(/^Nicht abgeschlossen: .+ — .+/);
      return err;
    }
    throw new Error('expected AbschlussError');
  };

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'abschluss-runner-'));
    fx = new FakeExec();
    git = new FakeGit();
    locks = 0;
    pat = null;
  });

  it('vorschau: fetch with the explicit refspec, then rev-parse, ls-tree, cat-file; nothing written; content from origin/main', async () => {
    const v = await runner().vorschau(input);
    expect(fx.names().slice(0, 6)).toEqual(['git rev-parse --is-inside-work-tree', 'git fetch origin', 'git rev-parse refs/remotes/origin/main^{commit}', `git ls-tree ${BASE_SHA}`, 'git cat-file -p', 'git cat-file -p']);
    expect(fx.calls[1].args).toEqual(['fetch', 'origin', '+refs/heads/main:refs/remotes/origin/main']);
    expect(fx.calls[1].opts.timeoutMs).toBe(ABSCHLUSS_TIMEOUTS_MS.fetch);
    expect(hatGeschrieben()).toBe(false);
    expect(readdirSync(tmp)).toEqual([]);
    expect(v).toEqual({
      intentId: 'INT-2026-001',
      titel: 'Test',
      datei: 'intent.md',
      base: 'main',
      baseSha: BASE_SHA,
      zweig: ZWEIG,
      statusAlt: 'angenommen',
      versionAlt: '1.0.0',
      versionNeu: '1.0.1',
      datum: '2026-09-22',
      zeile: ['1.0.1', '2026-09-22', 'Umgesetzt: abgeschlossen aus der UI durch Michael Sindlinger; Belege in `plan.md` §13; Bau-PR #7', '—', 'Product Owner (Klick in der UI)'],
      spalten: ['Version', 'Datum', 'Änderung', 'IDs', 'Freigabe'],
      bauPrs: [7],
      commitTitel: 'chore(INT-2026-001): intent.md auf umgesetzt nach Merge von PR #7',
    });
  });

  it('vorschau without plan.md → no build PRs; PAT → credential args and env on the fetch', async () => {
    fx.planText = undefined;
    pat = 'ghp_' + 'x'.repeat(36);
    const v = await runner().vorschau(input);
    expect(v.bauPrs).toEqual([]);
    expect(v.commitTitel).toBe('chore(INT-2026-001): intent.md auf umgesetzt');
    const fetch = fx.calls[1];
    expect(fetch.args.slice(0, 4)).toEqual(['-c', 'credential.https://github.com.helper=', '-c', 'credential.https://github.com.helper=!x']);
    expect(fetch.opts.env?.GITHUB_TOKEN).toBe(pat);
  });

  it('pre-checks of the preview (FA-16): no repo, no origin/<base>, not on the base branch, text errors — each refuses before any write', async () => {
    fx.answers.set('git rev-parse --is-inside-work-tree', fail(128, 'fatal: not a git repository'));
    await expectAbschlussError(runner().vorschau(input), 'kein_repo', 'vorpruefung');
    fx = new FakeExec();
    fx.answers.set('git fetch origin', fail(128, "fatal: 'origin' does not appear to be a git repository"));
    const e = await expectAbschlussError(runner().vorschau(input), 'kein_hauptzweig');
    expect(e.message).toContain("'origin' does not appear");
    fx = new FakeExec();
    fx.answers.set(`git ls-tree ${BASE_SHA}`, ok(''));
    const e2 = await expectAbschlussError(runner().vorschau(input), 'nicht_auf_hauptzweig');
    expect(e2.message).toContain('erst den Bau-PR mergen');
    fx = new FakeExec();
    fx.intentText = INTENT.replace('status: "angenommen"', 'status: "umgesetzt"');
    const e3 = await expectAbschlussError(runner().vorschau(input), 'schon_umgesetzt');
    expect(e3.message).toContain('Hauptcheckout aktualisieren');
    fx = new FakeExec();
    fx.intentText = INTENT.replace('version: "1.0.0"', 'version: "1.0"');
    const e4 = await expectAbschlussError(runner().vorschau(input), 'version_unlesbar');
    expect(e4.message).toContain('„1.0"');
    fx = new FakeExec();
    fx.intentText = INTENT.replace('geaendert: "2026-09-01"  \n', '');
    await expectAbschlussError(runner().vorschau(input), 'geaendert_fehlt');
    fx = new FakeExec();
    fx.intentText = INTENT.replace('## Änderungsprotokoll', '## Historie');
    const e5 = await expectAbschlussError(runner().vorschau(input), 'protokoll_fehlt');
    expect(e5.message).toContain('Tabelle nach Vorlage ergänzen');
    expect(hatGeschrieben()).toBe(false);
  });

  it('abschliessen happy path: pre-checks in order, plumbing commit under the lock, push, PR — result carries the PR', async () => {
    const r = await runner().abschliessen(input);
    expect(r).toEqual({ prNumber: 42, prUrl: 'https://github.com/o/r/pull/42', zweig: ZWEIG, at: '2026-09-22T10:00:00.000Z' });
    const names = fx.names();
    expect(names).toEqual([
      'git rev-parse --is-inside-work-tree',
      'git fetch origin',
      'git rev-parse refs/remotes/origin/main^{commit}',
      `git ls-tree ${BASE_SHA}`,
      'git cat-file -p',
      'git cat-file -p',
      'git config user.name',
      'git config user.email',
      'git show-ref --verify',
      'git ls-remote --exit-code',
      'gh --version',
      'gh auth status',
      `git read-tree ${BASE_SHA}`,
      'git hash-object -w',
      'git update-index --cacheinfo',
      'git write-tree',
      `git commit-tree ${TREE}`,
      `git update-ref refs/heads/${ZWEIG}`,
    ]);
    // ls-remote asks for exactly the branch, exit 2 = free
    expect(fx.calls[9].args).toEqual(['ls-remote', '--exit-code', '--heads', 'origin', `refs/heads/${ZWEIG}`]);
    expect(fx.calls[9].opts.timeoutMs).toBe(ABSCHLUSS_TIMEOUTS_MS.lsRemote);
    // the plumbing chain: temp index under tmpDir, blob from stdin (the finished text), cacheinfo with mode+blob+path, commit-tree on baseSha with the title, update-ref with the null old value
    const idx = fx.calls[12].opts.env?.GIT_INDEX_FILE ?? '';
    expect(idx.startsWith(join(tmp, 'abschluss-'))).toBe(true);
    expect(fx.calls[13].opts.input).toContain('status: "umgesetzt"  \n');
    expect(fx.calls[13].opts.input).toContain('| 1.0.1 | 2026-09-22 |');
    expect(fx.calls[13].args).toEqual(['hash-object', '-w', '--stdin']);
    expect(fx.calls[14].args).toEqual(['update-index', '--cacheinfo', `100644,${BLOB},intent/INT-2026-001-test/intent.md`]);
    expect(fx.calls[14].opts.env?.GIT_INDEX_FILE).toBe(idx);
    expect(fx.calls[16].args).toEqual(['commit-tree', TREE, '-p', BASE_SHA, '-m', 'chore(INT-2026-001): intent.md auf umgesetzt nach Merge von PR #7']);
    expect(fx.calls[17].args).toEqual(['update-ref', `refs/heads/${ZWEIG}`, COMMIT, '0'.repeat(40)]);
    expect(locks).toBe(1);
    // publish through the git slice with the budget timeouts
    expect(git.pushes).toEqual([{ branch: ZWEIG, timeoutMs: ABSCHLUSS_TIMEOUTS_MS.push }]);
    expect(git.creates).toHaveLength(1);
    expect(git.creates[0]).toMatchObject({ head: ZWEIG, base: 'main', title: 'chore(INT-2026-001): intent.md auf umgesetzt nach Merge von PR #7', timeoutMs: ABSCHLUSS_TIMEOUTS_MS.prCreate });
    expect(git.creates[0].body).toContain('intent/INT-2026-001-test/intent.md');
    expect(git.creates[0].body).toContain('Bau-PR #7');
    expect(git.lists).toHaveLength(0);
    // the temp index directory is gone
    expect(readdirSync(tmp)).toEqual([]);
  });

  it('FA-02: the base branch moved since the preview → ABSCHLUSS_STALE, nothing written', async () => {
    fx.baseSha = 'e'.repeat(40);
    const e = await expectAbschlussError(runner().abschliessen(input), 'stand_veraltet', 'vorpruefung');
    expect(e.message).toContain('Dialog erneut öffnen');
    expect(hatGeschrieben()).toBe(false);
    expect(fx.names()[1]).toBe('git fetch origin');
  });

  it('pre-checks of the start (FA-16): identity, local branch (names git branch -D), remote branch, no net, gh missing, gh not logged in — no write, no push', async () => {
    fx.answers.set('git config user.email', ok(''));
    await expectAbschlussError(runner().abschliessen(input), 'identitaet_fehlt');
    fx = new FakeExec();
    fx.answers.set('git show-ref --verify', ok());
    const e = await expectAbschlussError(runner().abschliessen(input), 'zweig_belegt_lokal');
    expect(e.message).toContain(`git branch -D ${ZWEIG}`);
    fx = new FakeExec();
    fx.answers.set('git ls-remote --exit-code', ok(`${COMMIT}\trefs/heads/${ZWEIG}\n`));
    const e2 = await expectAbschlussError(runner().abschliessen(input), 'zweig_belegt_entfernt');
    expect(e2.message).toContain('PR mergen oder den Zweig auf GitHub löschen');
    fx = new FakeExec();
    fx.answers.set('git ls-remote --exit-code', fail(128, 'fatal: unable to access: Could not resolve host'));
    const e3 = await expectAbschlussError(runner().abschliessen(input), 'kein_netz');
    expect(e3.message).toContain('Could not resolve host');
    fx = new FakeExec();
    fx.answers.set('gh --version', { code: -1, stdout: '', stderr: '', fehler: 'ENOENT' });
    const e4 = await expectAbschlussError(runner().abschliessen(input), 'gh_fehlt');
    expect(e4.message).toContain('gh ist nicht installiert');
    fx = new FakeExec();
    fx.answers.set('gh auth status', fail(1, 'You are not logged into any GitHub hosts'));
    const e5 = await expectAbschlussError(runner().abschliessen(input), 'gh_nicht_angemeldet');
    expect(e5.message).toContain('gh auth login');
    expect(hatGeschrieben()).toBe(false);
    expect(git.pushes).toHaveLength(0);
  });

  it('write failure (commit-tree) → schreiben_fehlgeschlagen, no ref created, no push; update-ref failure likewise', async () => {
    fx.answers.set(`git commit-tree ${TREE}`, fail(128, 'fatal: empty ident'));
    const e = await expectAbschlussError(runner().abschliessen(input), 'schreiben_fehlgeschlagen', 'schreiben');
    expect(e.message).toContain('git commit-tree');
    expect(fx.names().some((n) => n === `git update-ref refs/heads/${ZWEIG}`)).toBe(false);
    expect(git.pushes).toHaveLength(0);
    fx = new FakeExec();
    fx.answers.set(`git update-ref refs/heads/${ZWEIG}`, fail(128, 'fatal: update_ref failed: reference already exists'));
    await expectAbschlussError(runner().abschliessen(input), 'schreiben_fehlgeschlagen', 'schreiben');
    expect(git.pushes).toHaveLength(0);
  });

  it('FA-17: push fails → local ref deleted under the lock, message names the cause without tokens', async () => {
    git.pushFails = new GitError('fatal: Authentication failed for https://x-access-token:ghp_' + 'y'.repeat(36) + '@github.com/o/r', 'AUTH', 'pushBranch');
    const e = await expectAbschlussError(runner().abschliessen(input), 'push_fehlgeschlagen', 'veroeffentlichen');
    expect(e.message).toContain('Push fehlgeschlagen');
    expect(e.message).not.toContain('ghp_');
    expect(fx.names().at(-1)).toBe('git update-ref -d');
    expect(fx.calls.at(-1)!.args).toEqual(['update-ref', '-d', `refs/heads/${ZWEIG}`]);
    expect(locks).toBe(2);
    expect(git.creates).toHaveLength(0);
  });

  it('FA-17 (review E5): gh pr create fails but gh pr list finds the PR → success with its number, no rollback', async () => {
    git.createResult = new GitError('gh hat nicht rechtzeitig geantwortet', 'TIMEOUT', 'createPullRequestStrict');
    git.listResult = [{ number: 43, url: 'https://github.com/o/r/pull/43' }];
    const r = await runner().abschliessen(input);
    expect(r.prNumber).toBe(43);
    expect(r.prUrl).toBe('https://github.com/o/r/pull/43');
    expect(git.lists).toEqual([{ head: ZWEIG, env: { GH_PROMPT_DISABLED: '1' }, timeoutMs: ABSCHLUSS_TIMEOUTS_MS.prList }]);
    expect(fx.names().filter((n) => n === 'git push origin' || n === 'git update-ref -d')).toHaveLength(0);
  });

  it('FA-17: gh pr create fails, gh pr list empty → remote and local rollback, message names the cause', async () => {
    git.createResult = new GitError('GraphQL: No commits between main and chore', 'OPERATION_FAILED', 'createPullRequestStrict');
    const e = await expectAbschlussError(runner().abschliessen(input), 'pr_fehlgeschlagen', 'veroeffentlichen');
    expect(e.message).toContain('Pull Request nicht eröffnet: GraphQL: No commits');
    expect(e.message).not.toContain('stehen geblieben');
    const tail = fx.calls.slice(-2);
    expect(tail[0].args).toEqual(['push', 'origin', '--delete', ZWEIG]);
    expect(tail[0].opts.timeoutMs).toBe(ABSCHLUSS_TIMEOUTS_MS.pushDelete);
    expect(tail[1].args).toEqual(['update-ref', '-d', `refs/heads/${ZWEIG}`]);
  });

  it('FA-17: remote delete fails → „stehen geblieben — von Hand löschen"; gh pr list itself fails → no rollback, „PR-Status unklar"', async () => {
    git.createResult = new GitError('boom', 'OPERATION_FAILED', 'createPullRequestStrict');
    fx.answers.set('git push origin', fail(128, 'fatal: unable to access'));
    const e = await expectAbschlussError(runner().abschliessen(input), 'pr_fehlgeschlagen');
    expect(e.message).toContain(`Zweig \`${ZWEIG}\` ist auf GitHub stehen geblieben — von Hand löschen`);
    expect(fx.names().at(-1)).toBe('git update-ref -d');
    fx = new FakeExec();
    git = new FakeGit();
    git.createResult = new GitError('boom', 'OPERATION_FAILED', 'createPullRequestStrict');
    git.listResult = new GitError('gh: network down', 'OPERATION_FAILED', 'listOpenPullRequestsForHead');
    const e2 = await expectAbschlussError(runner().abschliessen(input), 'pr_unklar');
    expect(e2.message).toContain('PR-Status unklar');
    expect(e2.message).toContain('auf GitHub prüfen');
    expect(e2.message).toContain(`Zweig \`${ZWEIG}\` bleibt stehen`);
    expect(fx.names().filter((n) => n === 'git push origin' || n === 'git update-ref -d')).toHaveLength(0);
  });

  it('AN-S06: gh pr create exit 0 without a number and gh pr list empty → spec text, no rollback, no mark', async () => {
    git.createResult = { stdout: 'Creating pull request…\n' };
    const e = await expectAbschlussError(runner().abschliessen(input), 'pr_ohne_nummer');
    expect(e.message).toContain('PR eröffnet, Nummer unbekannt');
    expect(e.message).toContain('nicht erneut drücken');
    expect(fx.names().filter((n) => n === 'git push origin' || n === 'git update-ref -d')).toHaveLength(0);
  });

  it('FA-18: stderr with a token and a host path is redacted in messages', async () => {
    fx.answers.set('git fetch origin', fail(128, "fatal: unable to access 'https://ghp_" + 'z'.repeat(36) + "@github.com/o/r/': in /Users/michael/Entwicklung/proj/.git/config"));
    const e = await expectAbschlussError(runner().vorschau(input), 'kein_hauptzweig');
    expect(e.message).toContain('<REDACTED>');
    expect(e.message).not.toContain('ghp_');
    expect(e.message).not.toContain('/Users/michael');
    expect(saeubern('cd /home/specwright/proj && x')).toBe('cd <Pfad> && x');
    expect(saeubern('see https://github.com/o/r/pull/1 and intent/INT-2026-001-x/intent.md')).toBe('see https://github.com/o/r/pull/1 and intent/INT-2026-001-x/intent.md');
  });

  it('FA-20: GH_TOKEN from the PAT on every gh call (auth status, pr create, pr list); without PAT none; GH_PROMPT_DISABLED always', async () => {
    pat = 'ghp_' + 'p'.repeat(36);
    git.createResult = new GitError('x', 'OPERATION_FAILED', 'createPullRequestStrict');
    git.listResult = [{ number: 5, url: 'https://github.com/o/r/pull/5' }];
    await runner().abschliessen(input);
    const ghCalls = fx.calls.filter((c) => c.cmd === 'gh');
    expect(ghCalls).toHaveLength(2);
    for (const c of ghCalls) expect(c.opts.env).toEqual({ GH_PROMPT_DISABLED: '1', GH_TOKEN: pat });
    expect(git.creates[0].env).toEqual({ GH_PROMPT_DISABLED: '1', GH_TOKEN: pat });
    expect(git.lists[0].env).toEqual({ GH_PROMPT_DISABLED: '1', GH_TOKEN: pat });
    // the ls-remote and push --delete carry the credential overrides
    const lsRemote = fx.calls.find((c) => c.args.includes('ls-remote'))!;
    expect(lsRemote.opts.env?.GITHUB_TOKEN).toBe(pat);
    fx = new FakeExec();
    git = new FakeGit();
    pat = null;
    await runner().abschliessen(input);
    for (const c of fx.calls.filter((c) => c.cmd === 'gh')) expect(c.opts.env).toEqual({ GH_PROMPT_DISABLED: '1' });
    expect(git.creates[0].env).toEqual({ GH_PROMPT_DISABLED: '1' });
  });

  it('FA-19: the network budget — success path 43 s, failure path 59 s ≤ 60 s; client timeout 75 s', () => {
    const t = ABSCHLUSS_TIMEOUTS_MS;
    expect(t.fetch + t.lsRemote + t.ghAuth + t.push + t.prCreate).toBe(43_000);
    expect(t.fetch + t.lsRemote + t.ghAuth + t.push + t.prCreate + t.prList + t.pushDelete).toBe(59_000);
    expect(t.fetch + t.lsRemote + t.ghAuth + t.push + t.prCreate + t.prList + t.pushDelete).toBeLessThanOrEqual(ABSCHLUSS_BUDGET_MS);
    expect(ABSCHLUSS_CLIENT_TIMEOUT_MS).toBe(75_000);
    expect(ABSCHLUSS_CLIENT_TIMEOUT_MS).toBeGreaterThan(ABSCHLUSS_BUDGET_MS);
  });
});
