/**
 * INT-2026-024 (FA-06, FA-07, FA-08, FA-17, FA-21, R9): the runner against a
 * REAL git — temp project with a local bare „origin", `gh` faked through a
 * script first in PATH. Proves: one commit on `origin/chore/…-abschluss` ab
 * `origin/main`, only intent.md changed, the main checkout untouched (status,
 * HEAD, branch, no worktree dir, temp index gone), rollback on a failed
 * `gh pr create`, and that the project's `pre-commit`/`commit-msg` hooks never
 * run (plumbing commit — the permanent property of architecture.md §2).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { AbschlussError, VorhabenAbschlussRunner } from '../../src/server/services/vorhaben-abschluss.js';
import { withMainProjectLock } from '../../src/server/utils/main-project-mutex.js';

const INTENT = [
  '---',
  'intent_id: "INT-2026-001"  ',
  'titel: "Echtes Git"  ',
  'status: "in Arbeit"  ',
  'version: "0.1.0"  ',
  'erstellt: "2026-09-01"  ',
  'geaendert: "2026-09-01"  ',
  'bypass: "ja"  ',
  '---',
  '',
  '# Absicht: Echtes Git',
  '',
  '## Änderungsprotokoll',
  '',
  '<!-- leser: agent -->',
  '',
  '| Version | Datum | Autor | Änderung |',
  '|---|---|---|---|',
  '| 0.1.0 | 2026-09-01 | Michael Sindlinger | Entwurf |',
  '',
].join('\n');
const PLAN = '# Plan\n\n> **Status:** umgesetzt, PR #85 offen — `verify: OK`\n';
const FAKE_GH = `#!/bin/sh
echo "$@" >> "$FAKE_GH_LOG"
case "$1" in
  --version) echo "gh version 2.99.0"; exit 0;;
  auth) echo "Logged in to github.com"; exit 0;;
  pr)
    case "$2" in
      create)
        if [ -n "$FAKE_GH_PR_CREATE_EXIT" ]; then echo "fake gh: pull request rejected" >&2; exit "$FAKE_GH_PR_CREATE_EXIT"; fi
        echo "https://github.com/scratch/scratch/pull/\${FAKE_GH_PR_NUMBER:-42}"; exit 0;;
      list) echo "\${FAKE_GH_PR_LIST:-[]}"; exit 0;;
    esac;;
esac
echo "fake gh: unknown $*" >&2; exit 1
`;

const git = (cwd: string, ...args: string[]): string => execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).replace(/\n$/, '');

describe('VorhabenAbschlussRunner with real git (INT-2026-024)', () => {
  let root: string;
  let origin: string;
  let proj: string;
  let fakeBin: string;
  let ghLog: string;
  let hookMarker: string;
  let tmpIndexDir: string;
  let headBefore: string;
  let statusBefore: string;

  const runner = (ghEnv: Record<string, string> = {}): VorhabenAbschlussRunner =>
    new VorhabenAbschlussRunner({
      auth: () => null,
      pat: () => null,
      baseBranch: () => 'main',
      now: () => new Date('2026-09-22T12:00:00Z'),
      timeZone: 'Europe/Berlin',
      tmpDir: tmpIndexDir,
      ghEnv: { PATH: `${fakeBin}:${process.env.PATH ?? ''}`, FAKE_GH_LOG: ghLog, ...ghEnv },
    });
  const lock = <T>(fn: () => Promise<T>): Promise<T> => withMainProjectLock(proj, 'test-abschluss', fn);
  const input = () => ({ projectPath: proj, mainPath: proj, dirName: 'INT-2026-001-echt', intentId: 'INT-2026-001', lock });
  const hauptcheckoutUnveraendert = (): void => {
    expect(git(proj, 'status', '--porcelain')).toBe(statusBefore);
    expect(git(proj, 'rev-parse', 'HEAD')).toBe(headBefore);
    expect(git(proj, 'symbolic-ref', 'HEAD')).toBe('refs/heads/main');
    expect(existsSync(`${proj}-worktrees`)).toBe(false);
    expect(readdirSync(tmpIndexDir)).toEqual([]);
    expect(existsSync(hookMarker)).toBe(false);
    // the working copy of intent.md still says „in Arbeit"
    expect(readFileSync(join(proj, 'intent', 'INT-2026-001-echt', 'intent.md'), 'utf-8')).toBe(INTENT);
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'abschluss-git-'));
    origin = join(root, 'origin.git');
    proj = join(root, 'proj');
    fakeBin = join(root, 'fake-bin');
    ghLog = join(root, 'gh.log');
    hookMarker = join(root, 'hook-ran');
    tmpIndexDir = join(root, 'runtime');
    mkdirSync(fakeBin);
    mkdirSync(tmpIndexDir);
    writeFileSync(join(fakeBin, 'gh'), FAKE_GH);
    chmodSync(join(fakeBin, 'gh'), 0o755);
    execFileSync('git', ['init', '--bare', '-q', '--initial-branch=main', origin]);
    execFileSync('git', ['init', '-q', '--initial-branch=main', proj]);
    git(proj, 'config', 'user.name', 'Test Nutzer');
    git(proj, 'config', 'user.email', 'test@example.com');
    git(proj, 'config', 'commit.gpgsign', 'false');
    const dir = join(proj, 'intent', 'INT-2026-001-echt');
    mkdirSync(join(dir, 'design'), { recursive: true });
    writeFileSync(join(dir, 'intent.md'), INTENT);
    writeFileSync(join(dir, 'plan.md'), PLAN);
    writeFileSync(join(dir, 'spec.md'), '# Spec\n\n> **Status:** freigegeben\n');
    writeFileSync(join(dir, 'design', 'skizze.txt'), 'skizze');
    writeFileSync(join(proj, 'README.md'), '# Proj\n');
    git(proj, 'add', '-A');
    git(proj, 'commit', '-q', '-m', 'init');
    git(proj, 'remote', 'add', 'origin', origin);
    git(proj, 'push', '-q', '-u', 'origin', 'main');
    // hooks that would fail every porcelain commit — they must never run (R9)
    for (const hook of ['pre-commit', 'commit-msg']) {
      const p = join(proj, '.git', 'hooks', hook);
      writeFileSync(p, `#!/bin/sh\ntouch "${hookMarker}"\nexit 1\n`);
      chmodSync(p, 0o755);
    }
    // an unstaged change in the main checkout (Michael's checkout may be dirty)
    writeFileSync(join(proj, 'README.md'), '# Proj\n\nungestaged\n');
    headBefore = git(proj, 'rev-parse', 'HEAD');
    statusBefore = git(proj, 'status', '--porcelain');
    expect(statusBefore).toBe(' M README.md');
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('the hooks fire on a porcelain commit (so the property below is real)', () => {
    expect(() => execFileSync('git', ['commit', '-q', '--allow-empty', '-m', 'x'], { cwd: proj, stdio: 'ignore' })).toThrow();
    expect(existsSync(hookMarker)).toBe(true);
  });

  it('vorschau reads origin/main (not the working copy): status „in Arbeit", 0.1.0 → 0.1.1, 4-column row, Bau-PR #85', async () => {
    // the working copy differs from origin/main — the preview must follow origin
    writeFileSync(join(proj, 'intent', 'INT-2026-001-echt', 'intent.md'), INTENT.replace('status: "in Arbeit"', 'status: "angenommen"'));
    const v = await runner().vorschau(input());
    expect(v.statusAlt).toBe('in Arbeit');
    expect(v.versionAlt).toBe('0.1.0');
    expect(v.versionNeu).toBe('0.1.1');
    expect(v.titel).toBe('Echtes Git');
    expect(v.baseSha).toBe(git(proj, 'rev-parse', 'origin/main'));
    expect(v.spalten).toEqual(['Version', 'Datum', 'Autor', 'Änderung']);
    expect(v.zeile).toEqual(['0.1.1', '2026-09-22', 'Michael Sindlinger (UI)', 'Umgesetzt: abgeschlossen aus der UI durch Michael Sindlinger; Belege in `plan.md` §13; Bau-PR #85']);
    expect(v.commitTitel).toBe('chore(INT-2026-001): intent.md auf umgesetzt nach Merge von PR #85');
    expect(readdirSync(tmpIndexDir)).toEqual([]);
    writeFileSync(join(proj, 'intent', 'INT-2026-001-echt', 'intent.md'), INTENT);
  });

  it('abschliessen: exactly one commit on origin/chore/…-abschluss from origin/main, only intent.md changed, PR #42; main checkout untouched; hooks did not run', async () => {
    const baseSha = git(proj, 'rev-parse', 'origin/main');
    const r = await runner().abschliessen({ ...input(), baseSha });
    expect(r).toEqual({ prNumber: 42, prUrl: 'https://github.com/scratch/scratch/pull/42', zweig: 'chore/INT-2026-001-abschluss', at: '2026-09-22T12:00:00.000Z' });
    // on the bare origin
    const zweig = 'chore/INT-2026-001-abschluss';
    expect(git(origin, 'rev-list', '--count', `main..${zweig}`)).toBe('1');
    expect(git(origin, 'log', '-1', '--format=%s', zweig)).toBe('chore(INT-2026-001): intent.md auf umgesetzt nach Merge von PR #85');
    expect(git(origin, 'log', '-1', '--format=%an <%ae>', zweig)).toBe('Test Nutzer <test@example.com>');
    expect(git(origin, 'log', '-1', '--format=%P', zweig)).toBe(baseSha);
    expect(git(origin, 'diff', '--name-only', `main..${zweig}`)).toBe('intent/INT-2026-001-echt/intent.md');
    const neu = git(origin, 'show', `${zweig}:intent/INT-2026-001-echt/intent.md`);
    expect(neu).toContain('status: "umgesetzt"  \n');
    expect(neu).toContain('version: "0.1.1"  \n');
    expect(neu).toContain('geaendert: "2026-09-22"  \n');
    expect(neu).toContain('| 0.1.0 | 2026-09-01 | Michael Sindlinger | Entwurf |\n| 0.1.1 | 2026-09-22 | Michael Sindlinger (UI) | Umgesetzt: abgeschlossen aus der UI durch Michael Sindlinger; Belege in `plan.md` §13; Bau-PR #85 |');
    expect(neu.endsWith('Bau-PR #85 |')).toBe(true);
    // the local ref exists too (push -u) and the main checkout is as before (FA-08)
    expect(git(proj, 'rev-parse', `refs/heads/${zweig}`)).toBe(git(origin, 'rev-parse', zweig));
    hauptcheckoutUnveraendert();
    // gh got --head/--base and the fixed title, then no pr list
    const log = readFileSync(ghLog, 'utf-8').trim().split('\n');
    expect(log[0]).toBe('--version');
    expect(log[1]).toBe('auth status');
    expect(log[2]).toContain(`pr create --head ${zweig} --base main --title chore(INT-2026-001): intent.md auf umgesetzt nach Merge von PR #85 --body`);
    expect(log[2]).not.toMatch(/\/private\/|\/var\/folders|\/tmp\//);
    expect(log).toHaveLength(3);
  });

  it('a second attempt refuses: the branch exists locally and remotely (nothing written twice)', async () => {
    const baseSha = git(proj, 'rev-parse', 'origin/main');
    await runner().abschliessen({ ...input(), baseSha });
    try {
      await runner().abschliessen({ ...input(), baseSha });
      throw new Error('expected throw');
    } catch (e) {
      expect((e as AbschlussError).grund).toBe('zweig_belegt_lokal');
      expect((e as Error).message).toContain('git branch -D chore/INT-2026-001-abschluss');
    }
    git(proj, 'branch', '-D', 'chore/INT-2026-001-abschluss');
    try {
      await runner().abschliessen({ ...input(), baseSha });
      throw new Error('expected throw');
    } catch (e) {
      expect((e as AbschlussError).grund).toBe('zweig_belegt_entfernt');
    }
    expect(git(origin, 'rev-list', '--count', 'main..chore/INT-2026-001-abschluss')).toBe('1');
  });

  it('stale baseSha → ABSCHLUSS_STALE before any write', async () => {
    try {
      await runner().abschliessen({ ...input(), baseSha: 'f'.repeat(40) });
      throw new Error('expected throw');
    } catch (e) {
      expect((e as AbschlussError).grund).toBe('stand_veraltet');
    }
    expect(() => git(proj, 'rev-parse', '--verify', '--quiet', 'refs/heads/chore/INT-2026-001-abschluss')).toThrow();
    hauptcheckoutUnveraendert();
  });

  it('FA-17: gh pr create fails and gh pr list is empty → remote and local branch deleted, main checkout untouched, message names the cause', async () => {
    const baseSha = git(proj, 'rev-parse', 'origin/main');
    try {
      await runner({ FAKE_GH_PR_CREATE_EXIT: '1' }).abschliessen({ ...input(), baseSha });
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(AbschlussError);
      expect((e as AbschlussError).grund).toBe('pr_fehlgeschlagen');
      expect((e as Error).message).toContain('pull request rejected');
      expect((e as Error).message).not.toContain('stehen geblieben');
    }
    expect(() => git(origin, 'rev-parse', '--verify', '--quiet', 'chore/INT-2026-001-abschluss')).toThrow();
    expect(() => git(proj, 'rev-parse', '--verify', '--quiet', 'refs/heads/chore/INT-2026-001-abschluss')).toThrow();
    hauptcheckoutUnveraendert();
    // a third attempt after the rollback works
    const r = await runner().abschliessen({ ...input(), baseSha });
    expect(r.prNumber).toBe(42);
  });

  it('review E5: gh pr create fails but gh pr list knows the PR → success, branch stays', async () => {
    const baseSha = git(proj, 'rev-parse', 'origin/main');
    const r = await runner({ FAKE_GH_PR_CREATE_EXIT: '1', FAKE_GH_PR_LIST: '[{"number":77,"url":"https://github.com/scratch/scratch/pull/77"}]' }).abschliessen({ ...input(), baseSha });
    expect(r.prNumber).toBe(77);
    expect(git(origin, 'rev-list', '--count', 'main..chore/INT-2026-001-abschluss')).toBe('1');
    hauptcheckoutUnveraendert();
  });

  it('FA-16: no git identity → identitaet_fehlt before any write; missing gh → gh_fehlt', async () => {
    const baseSha = git(proj, 'rev-parse', 'origin/main');
    git(proj, 'config', '--unset', 'user.email');
    // the global config may carry an identity on the developer's Mac — force the empty case through HOME
    const savedHome = process.env.HOME;
    process.env.HOME = root;
    process.env.GIT_CONFIG_GLOBAL = join(root, 'empty-gitconfig');
    writeFileSync(process.env.GIT_CONFIG_GLOBAL, '');
    try {
      await runner().abschliessen({ ...input(), baseSha });
      throw new Error('expected throw');
    } catch (e) {
      expect((e as AbschlussError).grund).toBe('identitaet_fehlt');
    } finally {
      process.env.HOME = savedHome;
      delete process.env.GIT_CONFIG_GLOBAL;
    }
    git(proj, 'config', 'user.email', 'test@example.com');
    const leer = join(root, 'leer');
    mkdirSync(leer);
    try {
      await runner({ PATH: leer }).abschliessen({ ...input(), baseSha });
      throw new Error('expected throw');
    } catch (e) {
      expect((e as AbschlussError).grund).toBe('gh_fehlt');
    }
    hauptcheckoutUnveraendert();
  });
});
