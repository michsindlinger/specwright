/**
 * VorhabenWatcher — one recursive `fs.watch` per project copy's `intent/`
 * (project dir or worktree), debounced 300 ms like the kanban watcher.
 * Emits `changed(cwd)` and, for a new `INT-…` folder, `dir-added(cwd, intentId)`
 * (FA-21: assigns a `/intent` session to the folder it creates).
 *
 * When `intent/` does not exist yet the copy root is watched non-recursively
 * until it appears. If `fs.watch` throws (ENOSYS, EMFILE, …) the copy falls
 * back to polling a directory signature every 3 s.
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import { join } from 'path';

const INTENT_DIR_RE = /^(INT-\d{4}-\d{3})(?:-[A-Za-z0-9._-]+)?$/;
export const VORHABEN_WATCH_DEBOUNCE_MS = 300;
export const VORHABEN_POLL_INTERVAL_MS = 3000;

export interface VorhabenWatcherOptions {
  debounceMs?: number;
  pollIntervalMs?: number;
  /** Test hook: force the polling fallback. */
  forcePoll?: boolean;
  /** Test hook: replace fs.watch. */
  watchImpl?: typeof fs.watch;
}

interface WatchedCopy {
  cwd: string;
  watcher: fs.FSWatcher | null;
  /** True while the root (not intent/) is watched, waiting for intent/ to appear. */
  waitingForIntentDir: boolean;
  pollTimer: NodeJS.Timeout | null;
  pollSignature: string;
  debounce: NodeJS.Timeout | null;
  pendingAdded: Set<string>;
}

export class VorhabenWatcher extends EventEmitter {
  private readonly copies = new Map<string, WatchedCopy>();
  private readonly debounceMs: number;
  private readonly pollIntervalMs: number;
  private readonly forcePoll: boolean;
  private readonly watchImpl: typeof fs.watch;
  private closed = false;

  constructor(opts: VorhabenWatcherOptions = {}) {
    super();
    this.debounceMs = opts.debounceMs ?? VORHABEN_WATCH_DEBOUNCE_MS;
    this.pollIntervalMs = opts.pollIntervalMs ?? VORHABEN_POLL_INTERVAL_MS;
    this.forcePoll = opts.forcePoll ?? false;
    this.watchImpl = opts.watchImpl ?? fs.watch;
  }

  /** Replaces the watched set: new copies start, vanished copies stop. */
  public setCopies(cwds: string[]): void {
    const wanted = new Set(cwds);
    for (const cwd of [...this.copies.keys()]) {
      if (!wanted.has(cwd)) this.unwatch(cwd);
    }
    for (const cwd of wanted) {
      if (!this.copies.has(cwd)) this.watch(cwd);
    }
  }

  public watchedCopies(): string[] {
    return [...this.copies.keys()];
  }

  public isPolling(cwd: string): boolean {
    return this.copies.get(cwd)?.pollTimer !== null && this.copies.has(cwd);
  }

  public watch(cwd: string): void {
    if (this.closed || this.copies.has(cwd)) return;
    const copy: WatchedCopy = {
      cwd,
      watcher: null,
      waitingForIntentDir: false,
      pollTimer: null,
      pollSignature: '',
      debounce: null,
      pendingAdded: new Set(),
    };
    this.copies.set(cwd, copy);
    this.start(copy);
  }

  public unwatch(cwd: string): void {
    const copy = this.copies.get(cwd);
    if (!copy) return;
    this.stop(copy);
    this.copies.delete(cwd);
  }

  public close(): void {
    this.closed = true;
    for (const cwd of [...this.copies.keys()]) this.unwatch(cwd);
  }

  // ---- internals ----

  private start(copy: WatchedCopy): void {
    this.stop(copy);
    const intentDir = join(copy.cwd, 'intent');
    const hasIntentDir = safeIsDir(intentDir);
    if (this.forcePoll) {
      this.startPolling(copy);
      return;
    }
    try {
      if (hasIntentDir) {
        copy.waitingForIntentDir = false;
        copy.watcher = this.watchImpl(intentDir, { recursive: true, persistent: false }, (event, filename) => {
          this.onEvent(copy, event, filename);
        });
      } else if (safeIsDir(copy.cwd)) {
        copy.waitingForIntentDir = true;
        copy.watcher = this.watchImpl(copy.cwd, { persistent: false }, (_event, filename) => {
          if (filename !== null && String(filename) === 'intent' && safeIsDir(intentDir)) {
            // intent/ appeared: switch to the recursive watch and rescan.
            this.start(copy);
            this.schedule(copy);
          }
        });
      } else {
        this.startPolling(copy);
        return;
      }
      copy.watcher.on('error', (err) => {
        console.warn(`[VorhabenWatcher] watch error on ${copy.cwd} (${(err as Error).message}) — polling`);
        this.startPolling(copy);
      });
    } catch (err) {
      console.warn(`[VorhabenWatcher] fs.watch failed on ${copy.cwd} (${(err as Error).message}) — polling`);
      this.startPolling(copy);
    }
  }

  private stop(copy: WatchedCopy): void {
    if (copy.watcher) {
      try {
        copy.watcher.close();
      } catch {
        /* ignore */
      }
      copy.watcher = null;
    }
    if (copy.pollTimer) {
      clearInterval(copy.pollTimer);
      copy.pollTimer = null;
    }
    if (copy.debounce) {
      clearTimeout(copy.debounce);
      copy.debounce = null;
    }
  }

  private onEvent(copy: WatchedCopy, event: string, filename: string | Buffer | null): void {
    const name = filename === null ? '' : String(filename);
    // A new INT-… folder directly under intent/ (filename has no separator).
    if (event === 'rename' && name && !name.includes('/') && !name.includes('\\')) {
      const m = INTENT_DIR_RE.exec(name);
      if (m && safeIsDir(join(copy.cwd, 'intent', name))) copy.pendingAdded.add(m[1]);
    }
    this.schedule(copy);
  }

  private schedule(copy: WatchedCopy): void {
    if (copy.debounce) clearTimeout(copy.debounce);
    copy.debounce = setTimeout(() => {
      copy.debounce = null;
      const added = [...copy.pendingAdded];
      copy.pendingAdded.clear();
      for (const id of added) this.emit('dir-added', copy.cwd, id);
      this.emit('changed', copy.cwd);
    }, this.debounceMs);
  }

  private startPolling(copy: WatchedCopy): void {
    if (copy.watcher) {
      try {
        copy.watcher.close();
      } catch {
        /* ignore */
      }
      copy.watcher = null;
    }
    if (copy.pollTimer) return;
    copy.pollSignature = signature(copy.cwd);
    copy.pollTimer = setInterval(() => {
      const next = signature(copy.cwd);
      if (next === copy.pollSignature) return;
      const before = new Set(copy.pollSignature.split('\n').map((l) => l.split('\t')[0]));
      for (const line of next.split('\n')) {
        const dir = line.split('\t')[0];
        const m = INTENT_DIR_RE.exec(dir);
        if (m && !before.has(dir)) copy.pendingAdded.add(m[1]);
      }
      copy.pollSignature = next;
      this.schedule(copy);
    }, this.pollIntervalMs);
    copy.pollTimer.unref?.();
  }
}

function safeIsDir(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** Cheap directory signature for the polling fallback: folder + document mtimes. */
function signature(cwd: string): string {
  const intentDir = join(cwd, 'intent');
  let names: string[];
  try {
    names = fs.readdirSync(intentDir).filter((n) => INTENT_DIR_RE.test(n)).sort();
  } catch {
    return '';
  }
  const lines: string[] = [];
  for (const name of names) {
    const folder = join(intentDir, name);
    const parts = [name];
    for (const file of ['', 'intent.md', 'spec.md', 'plan.md', 'build-stand.md', 'design']) {
      try {
        parts.push(String(Math.floor(fs.statSync(join(folder, file)).mtimeMs)));
      } catch {
        parts.push('-');
      }
    }
    lines.push(parts.join('\t'));
  }
  return lines.join('\n');
}
