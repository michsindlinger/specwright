/**
 * VorhabenService — builds the `vorhaben:state` snapshot for every open
 * project (and its worktrees), keeps it fresh through the watcher and
 * broadcasts it after each change (INT-2026-004, stage 1: overview, reader,
 * project docs; stage 2 adds session assignment and the review channel).
 *
 * Project identity is the workspace store (server side); client-supplied
 * paths are never read directly (security.md §6).
 */

import * as fs from 'fs';
import { basename, join } from 'path';
import { listRepoWorktrees, pathKey, type RepoWorktreeInfo } from '../utils/git-worktree-list.js';
import {
  designDirOf,
  docPathOf,
  mergeCandidates,
  nodeReaderFs,
  scanCopy,
  toRow,
  VorhabenParseCache,
  type ReaderFs,
  type ScanCopy,
  type VorhabenCandidate,
} from './vorhaben-reader.js';
import { VorhabenWatcher } from './vorhaben-watcher.js';
import type { VorhabenStateStore } from './vorhaben-state.js';
import {
  VORHABEN_MAX_DOC_BYTES,
  type VorhabenDocKey,
  type VorhabenProjectInfo,
  type VorhabenRow,
  type VorhabenSessionRef,
  type VorhabenState,
  type VorhabenStateMessage,
} from '../../shared/types/vorhaben.protocol.js';

export interface VorhabenWorkspaceSource {
  getState(): { openProjects: Array<{ id: string; path: string; name: string }> };
}

export interface VorhabenServiceDeps {
  workspace: VorhabenWorkspaceSource;
  store: VorhabenStateStore;
  broadcast: (message: { type: string }) => void;
  listWorktrees?: (mainProjectPath: string) => Promise<RepoWorktreeInfo>;
  readerFs?: ReaderFs;
  watcher?: VorhabenWatcher;
  /** Stage 2: session per (projectId, intentId). */
  sessionFor?: (projectId: string, intentId: string) => VorhabenSessionRef | undefined;
  /** Stage 2: preferred copy per intentId of a project (assigned session's cwd). */
  preferredCwdFor?: (projectId: string) => Map<string, string>;
  now?: () => Date;
  /** Worktree list cache TTL. */
  worktreeTtlMs?: number;
}

const DESIGN_FILE_RE = /^[A-Za-z0-9._-]{1,120}\.(png|jpe?g|svg|webp|gif)$/i;
const ANY_DESIGN_FILE_RE = /^[A-Za-z0-9._ -]{1,120}$/;
const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  gif: 'image/gif',
};
const MAX_DESIGN_BYTES = 5 * 1024 * 1024;

export class VorhabenError extends Error {
  constructor(
    public readonly code: 'UNKNOWN_PROJECT' | 'UNKNOWN_VORHABEN' | 'NOT_FOUND' | 'TOO_LARGE' | 'IO_ERROR' | 'INVALID_MESSAGE',
    message: string
  ) {
    super(message);
  }
}

export class VorhabenService {
  private rows: VorhabenRow[] = [];
  private projects: VorhabenProjectInfo[] = [];
  private loading = true;
  private updatedAt: string;
  private readonly cache = new VorhabenParseCache();
  private readonly readerFs: ReaderFs;
  private readonly watcher: VorhabenWatcher;
  private readonly listWorktrees: (p: string) => Promise<RepoWorktreeInfo>;
  private readonly worktreeCache = new Map<string, { at: number; info: RepoWorktreeInfo }>();
  private readonly worktreeTtlMs: number;
  private readonly now: () => Date;
  private scanTimer: NodeJS.Timeout | null = null;
  private scanning: Promise<void> | null = null;
  private scanDirty = false;
  private lastScanAt = 0;
  private stopped = false;

  constructor(private readonly deps: VorhabenServiceDeps) {
    this.readerFs = deps.readerFs ?? nodeReaderFs;
    this.listWorktrees = deps.listWorktrees ?? listRepoWorktrees;
    this.watcher = deps.watcher ?? new VorhabenWatcher();
    this.worktreeTtlMs = deps.worktreeTtlMs ?? 5000;
    this.now = deps.now ?? ((): Date => new Date());
    this.updatedAt = this.now().toISOString();
    this.watcher.on('changed', () => this.scheduleRescan());
  }

  /** First full scan; resolves when the snapshot is complete (FA-07 measures this). */
  public async start(): Promise<void> {
    await this.rescan();
  }

  public stop(): void {
    this.stopped = true;
    if (this.scanTimer) clearTimeout(this.scanTimer);
    this.watcher.close();
  }

  public getState(): VorhabenState {
    return {
      rows: [...this.rows],
      projects: [...this.projects],
      docDrafts: this.deps.store.getDocDrafts(),
      loading: this.loading,
      updatedAt: this.updatedAt,
    };
  }

  public stateMessage(): VorhabenStateMessage {
    return { type: 'vorhaben:state', state: this.getState(), timestamp: this.now().toISOString() };
  }

  public broadcastState(): void {
    this.deps.broadcast(this.stateMessage());
  }

  /** Coalesces rescans (watcher bursts, workspace changes) into one run. */
  public scheduleRescan(delayMs = 100): void {
    if (this.stopped) return;
    if (this.scanTimer) clearTimeout(this.scanTimer);
    this.scanTimer = setTimeout(() => {
      this.scanTimer = null;
      void this.rescan();
    }, delayMs);
  }

  /** Rescan when the snapshot is older than `maxAgeMs` (used by vorhaben:get). */
  public rescanIfStale(maxAgeMs = 5000): void {
    if (Date.now() - this.lastScanAt > maxAgeMs) this.scheduleRescan(0);
  }

  public async rescan(): Promise<void> {
    if (this.scanning) {
      this.scanDirty = true;
      return this.scanning;
    }
    this.scanning = this.runScan().finally(() => {
      this.scanning = null;
      if (this.scanDirty) {
        this.scanDirty = false;
        this.scheduleRescan(0);
      }
    });
    return this.scanning;
  }

  public findRow(projectId: string, intentId: string): VorhabenRow | undefined {
    return this.rows.find((r) => r.projectId === projectId && r.intentId === intentId);
  }

  public findProject(projectId: string): { id: string; path: string; name: string } | undefined {
    return this.deps.workspace.getState().openProjects.find((p) => p.id === projectId);
  }

  public async readDoc(projectId: string, intentId: string, doc: VorhabenDocKey): Promise<{ content: string; mtimeMs: number }> {
    const row = this.requireRow(projectId, intentId);
    const p = docPathOf(row, doc);
    let st: fs.Stats;
    try {
      st = await fs.promises.stat(p);
    } catch {
      throw new VorhabenError('NOT_FOUND', `${basename(p)} fehlt`);
    }
    if (st.size > VORHABEN_MAX_DOC_BYTES) throw new VorhabenError('TOO_LARGE', `${basename(p)} ist größer als 1 MB`);
    try {
      return { content: await fs.promises.readFile(p, 'utf-8'), mtimeMs: st.mtimeMs };
    } catch (err) {
      throw new VorhabenError('IO_ERROR', (err as Error).message);
    }
  }

  /** Image under design/ as data URL; non-images → null (name only, FA-17). */
  public async readDesign(projectId: string, intentId: string, file: string): Promise<string | null> {
    if (!ANY_DESIGN_FILE_RE.test(file) || file.startsWith('.')) throw new VorhabenError('INVALID_MESSAGE', 'ungültiger Dateiname');
    const row = this.requireRow(projectId, intentId);
    if (!row.designFiles.includes(file)) throw new VorhabenError('NOT_FOUND', `${file} fehlt`);
    if (!DESIGN_FILE_RE.test(file)) return null;
    const dir = designDirOf(row);
    const p = join(dir, file);
    let real: string;
    let realDir: string;
    try {
      real = await fs.promises.realpath(p);
      realDir = await fs.promises.realpath(dir);
    } catch {
      throw new VorhabenError('NOT_FOUND', `${file} fehlt`);
    }
    if (!real.startsWith(realDir + '/')) throw new VorhabenError('INVALID_MESSAGE', 'Pfad außerhalb von design/');
    const st = await fs.promises.stat(real);
    if (st.size > MAX_DESIGN_BYTES) throw new VorhabenError('TOO_LARGE', `${file} ist größer als 5 MB`);
    const ext = file.split('.').pop()!.toLowerCase();
    const buf = await fs.promises.readFile(real);
    return `data:${MIME[ext]};base64,${buf.toString('base64')}`;
  }

  // ---- internals ----

  private requireRow(projectId: string, intentId: string): VorhabenRow {
    if (!this.findProject(projectId)) throw new VorhabenError('UNKNOWN_PROJECT', 'Projekt ist nicht geöffnet');
    const row = this.findRow(projectId, intentId);
    if (!row) throw new VorhabenError('UNKNOWN_VORHABEN', `${intentId} nicht gefunden`);
    return row;
  }

  private async worktreesOf(projectPath: string): Promise<RepoWorktreeInfo> {
    const hit = this.worktreeCache.get(projectPath);
    if (hit && Date.now() - hit.at < this.worktreeTtlMs) return hit.info;
    const info = await this.listWorktrees(projectPath);
    this.worktreeCache.set(projectPath, { at: Date.now(), info });
    return info;
  }

  private async runScan(): Promise<void> {
    const projects = this.deps.workspace.getState().openProjects;
    const rows: VorhabenRow[] = [];
    const infos: VorhabenProjectInfo[] = [];
    const allCwds = new Set<string>();
    const livePaths = new Set<string>();

    await Promise.all(
      projects.map(async (project) => {
        const info: VorhabenProjectInfo = {
          id: project.id,
          path: project.path,
          name: project.name,
          arbeitskopie: '',
          worktrees: [],
          hasIntentDir: false,
        };
        const copies: ScanCopy[] = [];
        try {
          const wt = await this.worktreesOf(project.path);
          const ownKey = safeKey(project.path);
          const own = wt.entries.find((e) => safeKey(e.path) === ownKey);
          info.arbeitskopie = own?.branch ?? '';
          copies.push({ cwd: project.path, arbeitskopie: info.arbeitskopie });
          for (const e of wt.entries) {
            if (e.bare || e.prunable || safeKey(e.path) === ownKey) continue;
            const label = e.branch ?? basename(e.path);
            info.worktrees.push(label);
            copies.push({ cwd: e.path, arbeitskopie: label });
          }
        } catch (err) {
          info.error = (err as Error).message;
          copies.push({ cwd: project.path, arbeitskopie: '' });
        }
        const candidates: VorhabenCandidate[] = [];
        for (const copy of copies) {
          allCwds.add(copy.cwd);
          try {
            const found = scanCopy(copy, this.readerFs, this.cache);
            if (copy.cwd === project.path) info.hasIntentDir = this.readerFs.stat(join(copy.cwd, 'intent'))?.isDirectory() ?? false;
            candidates.push(...found);
          } catch (err) {
            if (copy.cwd === project.path) info.error = `intent/ nicht lesbar: ${(err as Error).message}`;
          }
        }
        for (const c of candidates) for (const d of c.docs) livePaths.add(docPathOf(c, d.key));
        const preferred = this.deps.preferredCwdFor?.(project.id) ?? new Map<string, string>();
        for (const c of mergeCandidates(candidates, preferred)) {
          const row = toRow(project, c, this.deps.sessionFor?.(project.id, c.intentId));
          if (row) rows.push(row);
        }
        infos.push(info);
      })
    );

    // Stable order: projects as opened, rows by intentId within a project (client sorts by state).
    const order = new Map(projects.map((p, i) => [p.id, i]));
    infos.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    rows.sort((a, b) => (order.get(a.projectId) ?? 0) - (order.get(b.projectId) ?? 0) || a.intentId.localeCompare(b.intentId));

    this.cache.prune(livePaths);
    this.rows = rows;
    this.projects = infos;
    this.loading = false;
    this.lastScanAt = Date.now();
    this.updatedAt = this.now().toISOString();
    if (!this.stopped) this.watcher.setCopies([...allCwds]);
    this.broadcastState();
  }
}

function safeKey(p: string): string {
  try {
    return pathKey(p);
  } catch {
    return p;
  }
}
