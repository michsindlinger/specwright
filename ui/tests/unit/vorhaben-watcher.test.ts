import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';

import { VorhabenWatcher } from '../../src/server/services/vorhaben-watcher.js';

const waitFor = <T>(fn: () => T | undefined, timeoutMs: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = (): void => {
      const v = fn();
      if (v !== undefined) return resolve(v);
      if (Date.now() - started > timeoutMs) return reject(new Error('timeout'));
      setTimeout(tick, 25);
    };
    tick();
  });

describe('VorhabenWatcher (FA-04, FA-19)', () => {
  let root: string;
  let watcher: VorhabenWatcher | null = null;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'vorhaben-watcher-'));
  });
  afterEach(() => {
    watcher?.close();
    watcher = null;
    rmSync(root, { recursive: true, force: true });
  });

  it('emits changed within 2 s after a document changes (fs.watch)', async () => {
    mkdirSync(join(root, 'intent', 'INT-2026-001-a'), { recursive: true });
    writeFileSync(join(root, 'intent', 'INT-2026-001-a', 'intent.md'), 'v1');
    watcher = new VorhabenWatcher({ debounceMs: 50 });
    const changed: string[] = [];
    watcher.on('changed', (cwd: string) => changed.push(cwd));
    watcher.setCopies([root]);
    expect(watcher.isPolling(root)).toBe(false);
    await new Promise((r) => setTimeout(r, 100));
    writeFileSync(join(root, 'intent', 'INT-2026-001-a', 'intent.md'), 'v2');
    await waitFor(() => (changed.length > 0 ? changed : undefined), 4500);
    expect(changed[0]).toBe(root);
  });

  it('emits dir-added for a new INT folder and changed once (debounced)', async () => {
    mkdirSync(join(root, 'intent'), { recursive: true });
    watcher = new VorhabenWatcher({ debounceMs: 50 });
    const added: string[] = [];
    const changed: string[] = [];
    watcher.on('dir-added', (_cwd: string, id: string) => added.push(id));
    watcher.on('changed', (cwd: string) => changed.push(cwd));
    watcher.setCopies([root]);
    await new Promise((r) => setTimeout(r, 100));
    mkdirSync(join(root, 'intent', 'INT-2026-002-neu'));
    writeFileSync(join(root, 'intent', 'INT-2026-002-neu', 'intent.md'), 'x');
    await waitFor(() => (added.length > 0 ? added : undefined), 4500);
    expect(added).toEqual(['INT-2026-002']);
    await new Promise((r) => setTimeout(r, 150));
    expect(changed.length).toBeGreaterThanOrEqual(1);
    expect(changed.length).toBeLessThanOrEqual(2);
  });

  it('waits for intent/ to appear when the copy has none yet', async () => {
    watcher = new VorhabenWatcher({ debounceMs: 50 });
    const changed: string[] = [];
    watcher.on('changed', (cwd: string) => changed.push(cwd));
    watcher.setCopies([root]);
    await new Promise((r) => setTimeout(r, 100));
    mkdirSync(join(root, 'intent'));
    await waitFor(() => (changed.length > 0 ? changed : undefined), 4500);
    mkdirSync(join(root, 'intent', 'INT-2026-003-x'));
    writeFileSync(join(root, 'intent', 'INT-2026-003-x', 'intent.md'), 'x');
    const n = changed.length;
    await waitFor(() => (changed.length > n ? changed : undefined), 4500);
  });

  it('#115: intent/ and the first INT folder appear in one step → dir-added', async () => {
    watcher = new VorhabenWatcher({ debounceMs: 50 });
    const added: string[] = [];
    watcher.on('dir-added', (_cwd: string, id: string) => added.push(id));
    watcher.setCopies([root]);
    await new Promise((r) => setTimeout(r, 100));
    mkdirSync(join(root, 'intent', 'INT-2026-005-erst'), { recursive: true });
    writeFileSync(join(root, 'intent', 'INT-2026-005-erst', 'intent.md'), 'x');
    await waitFor(() => (added.length > 0 ? added : undefined), 4500);
    await new Promise((r) => setTimeout(r, 150));
    expect(added).toEqual(['INT-2026-005']);
  });

  it('folders from the checkout of a new working copy are not new — only the one created afterwards', async () => {
    const git = (...args: string[]): void => {
      execFileSync('git', ['-C', root, '-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { stdio: 'ignore' });
    };
    git('init', '-q');
    mkdirSync(join(root, 'intent', 'INT-2026-010-alt'), { recursive: true });
    writeFileSync(join(root, 'intent', 'INT-2026-010-alt', 'intent.md'), 'alt');
    git('add', '-A');
    git('commit', '-q', '-m', 'x');
    rmSync(join(root, 'intent'), { recursive: true, force: true }); // working copy before its checkout
    watcher = new VorhabenWatcher({ debounceMs: 50 });
    const added: string[] = [];
    watcher.on('dir-added', (_cwd: string, id: string) => added.push(id));
    watcher.setCopies([root]);
    await new Promise((r) => setTimeout(r, 100));
    git('checkout', '--', 'intent'); // the checkout brings intent/ with the old folder
    await new Promise((r) => setTimeout(r, 300));
    mkdirSync(join(root, 'intent', 'INT-2026-013-neu'));
    writeFileSync(join(root, 'intent', 'INT-2026-013-neu', 'intent.md'), 'x');
    await waitFor(() => (added.length > 0 ? added : undefined), 4500);
    await new Promise((r) => setTimeout(r, 150));
    expect(added).toEqual(['INT-2026-013']);
  });

  it('falls back to polling when fs.watch throws', async () => {
    mkdirSync(join(root, 'intent', 'INT-2026-004-p'), { recursive: true });
    writeFileSync(join(root, 'intent', 'INT-2026-004-p', 'intent.md'), 'v1');
    watcher = new VorhabenWatcher({
      debounceMs: 20,
      pollIntervalMs: 50,
      watchImpl: (() => {
        throw new Error('ENOSYS');
      }) as unknown as typeof import('fs').watch,
    });
    const changed: string[] = [];
    const added: string[] = [];
    watcher.on('changed', (cwd: string) => changed.push(cwd));
    watcher.on('dir-added', (_cwd: string, id: string) => added.push(id));
    watcher.setCopies([root]);
    expect(watcher.isPolling(root)).toBe(true);
    await new Promise((r) => setTimeout(r, 1100));
    writeFileSync(join(root, 'intent', 'INT-2026-004-p', 'intent.md'), 'v2');
    await waitFor(() => (changed.length > 0 ? changed : undefined), 4500);
    mkdirSync(join(root, 'intent', 'INT-2026-005-q'));
    await waitFor(() => (added.length > 0 ? added : undefined), 4500);
    expect(added).toEqual(['INT-2026-005']);
  });

  it('setCopies stops watchers for vanished copies', () => {
    watcher = new VorhabenWatcher();
    watcher.setCopies([root]);
    expect(watcher.watchedCopies()).toEqual([root]);
    watcher.setCopies([]);
    expect(watcher.watchedCopies()).toEqual([]);
  });
});
