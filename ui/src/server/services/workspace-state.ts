/**
 * WorkspaceStateStore — the one shared workspace per backend (open projects,
 * recents, tab names). See shared/types/workspace.protocol.ts for the model.
 *
 * Durability follows CloudSessionRegistry: versioned JSON under the runtime
 * dir, serialized writes, atomic tmp+rename, and a non-destructive policy for
 * unreadable files (renamed aside, start empty, report unhealthy).
 *
 * Mutations apply to the in-memory state synchronously (handler order is the
 * serialization) and schedule a flush; readers always see the latest state.
 */

import * as fs from 'fs';
import { dirname } from 'path';
import {
  WORKSPACE_MAX_RECENTS,
  type WorkspaceImportMessage,
  type WorkspaceProject,
  type WorkspaceRecent,
  type WorkspaceState,
} from '../../shared/types/workspace.protocol.js';

interface WorkspaceStateFileV1 {
  version: 1;
  port: number;
  updatedAt: string;
  state: WorkspaceState;
}

export interface WorkspaceStoreDeps {
  /** Path normaliser used as project identity (realpath + trailing-slash strip). */
  pathKey: (p: string) => string;
  /** Existence check for open-project validation. */
  pathExists: (p: string) => boolean;
  port?: number;
  now?: () => Date;
}

export class WorkspaceInvalidPathError extends Error {
  public readonly code = 'INVALID_PATH' as const;
  constructor(path: string) {
    super(`project path does not exist: ${path}`);
  }
}

export interface WorkspaceLoadResult {
  /** False on first boot (no file) — caller may seed from live sessions. */
  existed: boolean;
  /** False when the file existed but was unreadable/unknown-version. */
  healthy: boolean;
}

function emptyState(now: Date): WorkspaceState {
  return { openProjects: [], recentProjects: [], sessionNames: {}, updatedAt: now.toISOString() };
}

export class WorkspaceStateStore {
  private state: WorkspaceState;
  private writeChain: Promise<void> = Promise.resolve();
  private readonly now: () => Date;
  private readonly port: number;

  constructor(private readonly filePath: string, private readonly deps: WorkspaceStoreDeps) {
    this.now = deps.now ?? ((): Date => new Date());
    this.port = deps.port ?? (process.env.PORT ? parseInt(process.env.PORT, 10) : 3001);
    this.state = emptyState(this.now());
  }

  public async load(): Promise<WorkspaceLoadResult> {
    let raw: string;
    try {
      raw = await fs.promises.readFile(this.filePath, 'utf-8');
    } catch {
      return { existed: false, healthy: true };
    }
    try {
      const parsed = JSON.parse(raw) as WorkspaceStateFileV1;
      if (parsed.version !== 1 || !parsed.state || !Array.isArray(parsed.state.openProjects)) {
        throw new Error(`unrecognized workspace format (version: ${String(parsed.version)})`);
      }
      this.state = {
        openProjects: parsed.state.openProjects,
        recentProjects: Array.isArray(parsed.state.recentProjects) ? parsed.state.recentProjects : [],
        sessionNames:
          parsed.state.sessionNames && typeof parsed.state.sessionNames === 'object'
            ? parsed.state.sessionNames
            : {},
        updatedAt: parsed.state.updatedAt ?? parsed.updatedAt,
      };
      return { existed: true, healthy: true };
    } catch (err) {
      const backup = `${this.filePath}.unrecognized-${Date.now()}`;
      console.error(
        `[WorkspaceStateStore] unreadable workspace at ${this.filePath} (${(err as Error).message}) — backing up to ${backup}`
      );
      await fs.promises.rename(this.filePath, backup).catch(() => {});
      this.state = emptyState(this.now());
      return { existed: true, healthy: false };
    }
  }

  /** Snapshot (deep enough for JSON serialization; callers must not mutate). */
  public getState(): WorkspaceState {
    return {
      openProjects: [...this.state.openProjects],
      recentProjects: [...this.state.recentProjects],
      sessionNames: { ...this.state.sessionNames },
      updatedAt: this.state.updatedAt,
    };
  }

  public findProject(id: string): WorkspaceProject | undefined {
    return this.state.openProjects.find((p) => p.id === id);
  }

  /**
   * Opens (or re-touches) a project. Idempotent: an already-open project keeps
   * its first-seen raw `path` and `name` — live sessions are matched against
   * that exact string. Always moves the project to the front of the recents.
   */
  public openProject(path: string, name: string): WorkspaceProject {
    if (!this.deps.pathExists(path)) throw new WorkspaceInvalidPathError(path);
    const id = this.deps.pathKey(path);
    const existing = this.findProject(id);
    const entry: WorkspaceProject = existing ?? { id, path, name, openedAt: this.now().toISOString() };
    if (!existing) this.state.openProjects.push(entry);
    this.touchRecent(entry.path, entry.name);
    this.commit();
    return entry;
  }

  public closeProject(id: string): boolean {
    const before = this.state.openProjects.length;
    this.state.openProjects = this.state.openProjects.filter((p) => p.id !== id);
    if (this.state.openProjects.length === before) return false;
    this.commit();
    return true;
  }

  public removeRecent(path: string): boolean {
    const key = this.safeKey(path);
    const before = this.state.recentProjects.length;
    this.state.recentProjects = this.state.recentProjects.filter((r) => this.safeKey(r.path) !== key);
    if (this.state.recentProjects.length === before) return false;
    this.commit();
    return true;
  }

  /** Returns true when the stored value changed. */
  public setSessionName(sessionId: string, name: string | null): boolean {
    const trimmed = name?.trim() ?? '';
    if (!trimmed) {
      if (!(sessionId in this.state.sessionNames)) return false;
      delete this.state.sessionNames[sessionId];
    } else {
      if (this.state.sessionNames[sessionId] === trimmed) return false;
      this.state.sessionNames[sessionId] = trimmed;
    }
    this.commit();
    return true;
  }

  /** Drops names of sessions that no longer exist. Returns the number removed. */
  public pruneSessionNames(liveIds: Set<string>): number {
    let removed = 0;
    for (const id of Object.keys(this.state.sessionNames)) {
      if (!liveIds.has(id)) {
        delete this.state.sessionNames[id];
        removed++;
      }
    }
    if (removed > 0) this.commit();
    return removed;
  }

  /**
   * One-time browser migration: each field fills only if still empty here.
   * Returns true when anything changed.
   */
  public importIfEmpty(payload: Pick<WorkspaceImportMessage, 'openProjects' | 'recentProjects' | 'sessionNames'>): boolean {
    let changed = false;
    if (this.state.openProjects.length === 0 && payload.openProjects?.length) {
      for (const p of payload.openProjects) {
        if (typeof p?.path !== 'string' || !p.path || !this.deps.pathExists(p.path)) continue;
        const id = this.deps.pathKey(p.path);
        if (this.findProject(id)) continue;
        this.state.openProjects.push({
          id,
          path: p.path,
          name: typeof p.name === 'string' && p.name ? p.name : p.path,
          openedAt: this.now().toISOString(),
        });
        changed = true;
      }
    }
    if (this.state.recentProjects.length === 0 && payload.recentProjects?.length) {
      const sorted = [...payload.recentProjects]
        .filter((r) => typeof r?.path === 'string' && r.path)
        .sort((a, b) => (Number(b.lastOpened) || 0) - (Number(a.lastOpened) || 0));
      const seen = new Set<string>();
      for (const r of sorted) {
        const key = this.safeKey(r.path);
        if (seen.has(key)) continue;
        seen.add(key);
        const ts = Number(r.lastOpened);
        this.state.recentProjects.push({
          path: r.path,
          name: typeof r.name === 'string' && r.name ? r.name : r.path,
          lastOpened: new Date(Number.isFinite(ts) && ts > 0 ? ts : this.now().getTime()).toISOString(),
        });
        changed = true;
        if (this.state.recentProjects.length >= WORKSPACE_MAX_RECENTS) break;
      }
    }
    if (Object.keys(this.state.sessionNames).length === 0 && payload.sessionNames) {
      for (const [id, name] of Object.entries(payload.sessionNames)) {
        if (typeof name !== 'string' || !name.trim()) continue;
        this.state.sessionNames[id] = name.trim();
        changed = true;
      }
    }
    if (changed) this.commit();
    return changed;
  }

  /**
   * First boot without a workspace file: projects with running sessions count
   * as open, so a phone connecting before the Mac still sees the agents.
   */
  public seedFromSessions(sessions: Array<{ projectPath: string }>): number {
    let added = 0;
    for (const s of sessions) {
      if (!s.projectPath || !this.deps.pathExists(s.projectPath)) continue;
      const id = this.deps.pathKey(s.projectPath);
      if (this.findProject(id)) continue;
      this.state.openProjects.push({
        id,
        path: s.projectPath,
        name: basename(s.projectPath),
        openedAt: this.now().toISOString(),
      });
      added++;
    }
    if (added > 0) this.commit();
    return added;
  }

  /** Resolves once every scheduled write has landed (tests, shutdown). */
  public flush(): Promise<void> {
    return this.writeChain;
  }

  // ---- internals ----

  private touchRecent(path: string, name: string): void {
    const key = this.safeKey(path);
    const rest = this.state.recentProjects.filter((r) => this.safeKey(r.path) !== key);
    const entry: WorkspaceRecent = { path, name, lastOpened: this.now().toISOString() };
    this.state.recentProjects = [entry, ...rest].slice(0, WORKSPACE_MAX_RECENTS);
  }

  /** pathKey that never throws for vanished paths (recents may point anywhere). */
  private safeKey(p: string): string {
    try {
      return this.deps.pathKey(p);
    } catch {
      return p;
    }
  }

  private commit(): void {
    this.state.updatedAt = this.now().toISOString();
    const snapshot = this.getState();
    const next = this.writeChain
      .then(() => this.writeFile(snapshot))
      .catch((err) => {
        console.error('[WorkspaceStateStore] write failed:', err);
      });
    this.writeChain = next;
  }

  private async writeFile(state: WorkspaceState): Promise<void> {
    const file: WorkspaceStateFileV1 = {
      version: 1,
      port: this.port,
      updatedAt: state.updatedAt,
      state,
    };
    await fs.promises.mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 });
    const tmpPath = `${this.filePath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
    await fs.promises.writeFile(tmpPath, JSON.stringify(file, null, 2), { encoding: 'utf-8', mode: 0o600 });
    await fs.promises.rename(tmpPath, this.filePath);
  }
}

function basename(p: string): string {
  const trimmed = p.replace(/[\\/]+$/, '');
  const idx = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
  return idx >= 0 ? trimmed.slice(idx + 1) : trimmed;
}
