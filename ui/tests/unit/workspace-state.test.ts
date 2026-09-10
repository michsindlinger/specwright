import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { WorkspaceStateStore, WorkspaceInvalidPathError } from '../../src/server/services/workspace-state.js';
import { WORKSPACE_MAX_RECENTS } from '../../src/shared/types/workspace.protocol.js';

/** Lexical stand-in for realpath: strip trailing slashes, collapse `//`. */
const key = (p: string): string => p.replace(/\/+/g, '/').replace(/\/+$/, '') || '/';

describe('WorkspaceStateStore', () => {
  let dir: string;
  let filePath: string;
  let existing: Set<string>;
  let clock: number;
  let store: WorkspaceStateStore;

  const build = (): WorkspaceStateStore =>
    new WorkspaceStateStore(filePath, {
      pathKey: key,
      pathExists: (p) => existing.has(key(p)),
      port: 3111,
      now: () => new Date(clock),
    });

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'workspace-test-'));
    filePath = join(dir, 'workspace-3111.json');
    existing = new Set(['/a', '/b', '/c']);
    clock = Date.parse('2026-09-10T20:00:00Z');
    store = build();
  });

  afterEach(async () => {
    await store.flush();
    rmSync(dir, { recursive: true, force: true });
  });

  it('missing file loads as not-existed, healthy, empty', async () => {
    expect(await store.load()).toEqual({ existed: false, healthy: true });
    expect(store.getState().openProjects).toEqual([]);
  });

  it('openProject dedupes by pathKey and keeps the first raw path and name', async () => {
    const first = store.openProject('/a', 'A');
    const again = store.openProject('/a/', 'renamed');
    expect(again).toBe(first);
    expect(store.getState().openProjects).toEqual([
      { id: '/a', path: '/a', name: 'A', openedAt: new Date(clock).toISOString() },
    ]);
    await store.flush();
    const file = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(file.version).toBe(1);
    expect(file.port).toBe(3111);
    expect(file.state.openProjects).toHaveLength(1);
  });

  it('rejects a path that does not exist', () => {
    expect(() => store.openProject('/nope', 'x')).toThrow(WorkspaceInvalidPathError);
    expect(store.getState().openProjects).toEqual([]);
  });

  it('recents move to front, dedupe, and cap at WORKSPACE_MAX_RECENTS', () => {
    for (let i = 0; i < WORKSPACE_MAX_RECENTS + 5; i++) {
      existing.add(`/p${i}`);
      clock += 1000;
      store.openProject(`/p${i}`, `p${i}`);
    }
    const recents = store.getState().recentProjects;
    expect(recents).toHaveLength(WORKSPACE_MAX_RECENTS);
    expect(recents[0].path).toBe(`/p${WORKSPACE_MAX_RECENTS + 4}`);
    clock += 1000;
    store.openProject('/p10', 'p10');
    expect(store.getState().recentProjects[0].path).toBe('/p10');
    expect(store.getState().recentProjects.filter((r) => r.path === '/p10')).toHaveLength(1);
  });

  it('closeProject and removeRecent report whether anything changed', () => {
    store.openProject('/a', 'A');
    expect(store.closeProject('/a')).toBe(true);
    expect(store.closeProject('/a')).toBe(false);
    expect(store.removeRecent('/a/')).toBe(true);
    expect(store.removeRecent('/a')).toBe(false);
    expect(store.getState().recentProjects).toEqual([]);
  });

  it('setSessionName sets, trims, ignores no-ops and clears with null/empty', () => {
    expect(store.setSessionName('s1', '  Deploy ')).toBe(true);
    expect(store.setSessionName('s1', 'Deploy')).toBe(false);
    expect(store.getState().sessionNames).toEqual({ s1: 'Deploy' });
    expect(store.setSessionName('s1', '')).toBe(true);
    expect(store.setSessionName('s1', null)).toBe(false);
    expect(store.getState().sessionNames).toEqual({});
  });

  it('pruneSessionNames drops names of dead sessions', () => {
    store.setSessionName('live', 'L');
    store.setSessionName('dead', 'D');
    expect(store.pruneSessionNames(new Set(['live']))).toBe(1);
    expect(store.getState().sessionNames).toEqual({ live: 'L' });
    expect(store.pruneSessionNames(new Set(['live']))).toBe(0);
  });

  it('importIfEmpty fills only empty fields, validates paths, and is idempotent', () => {
    store.openProject('/a', 'A');
    const changed = store.importIfEmpty({
      openProjects: [{ path: '/b', name: 'B' }],
      recentProjects: [
        { path: '/c', name: 'C', lastOpened: 2000 },
        { path: '/nope', name: 'gone', lastOpened: 3000 },
        { path: '/c/', name: 'C dup', lastOpened: 1000 },
      ],
      sessionNames: { s1: 'One', s2: '   ' },
    });
    expect(changed).toBe(true);
    const state = store.getState();
    // openProjects was non-empty → untouched
    expect(state.openProjects.map((p) => p.path)).toEqual(['/a']);
    // recents were seeded by openProject('/a') → non-empty → untouched
    expect(state.recentProjects.map((r) => r.path)).toEqual(['/a']);
    expect(state.sessionNames).toEqual({ s1: 'One' });

    const fresh = build();
    expect(fresh.importIfEmpty({ recentProjects: [{ path: '/c', name: 'C', lastOpened: 2000 }, { path: '/c/', name: 'dup', lastOpened: 1000 }] })).toBe(true);
    expect(fresh.getState().recentProjects).toEqual([{ path: '/c', name: 'C', lastOpened: new Date(2000).toISOString() }]);
    expect(fresh.importIfEmpty({ recentProjects: [{ path: '/b', name: 'B', lastOpened: 1 }] })).toBe(false);
  });

  it('seedFromSessions adds distinct existing project paths with basename names', () => {
    const added = store.seedFromSessions([
      { projectPath: '/a' },
      { projectPath: '/a/' },
      { projectPath: '/b' },
      { projectPath: '/nope' },
    ]);
    expect(added).toBe(2);
    expect(store.getState().openProjects.map((p) => [p.id, p.name])).toEqual([
      ['/a', 'a'],
      ['/b', 'b'],
    ]);
  });

  it('round-trips through disk and renames an unknown-version file aside', async () => {
    store.openProject('/a', 'A');
    store.setSessionName('s1', 'One');
    await store.flush();

    const reloaded = build();
    expect(await reloaded.load()).toEqual({ existed: true, healthy: true });
    expect(reloaded.getState().openProjects[0].id).toBe('/a');
    expect(reloaded.getState().sessionNames).toEqual({ s1: 'One' });

    writeFileSync(filePath, JSON.stringify({ version: 99, state: {} }));
    const broken = build();
    expect(await broken.load()).toEqual({ existed: true, healthy: false });
    expect(broken.getState().openProjects).toEqual([]);
    expect(existsSync(filePath)).toBe(false);
    expect(readdirSync(dir).some((f) => f.startsWith('workspace-3111.json.unrecognized-'))).toBe(true);
  });

  it('serializes concurrent mutations: last state on disk, no tmp leftovers', async () => {
    for (let i = 0; i < 25; i++) store.setSessionName('s', `name-${i}`);
    store.openProject('/b', 'B');
    await store.flush();
    const file = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(file.state.sessionNames).toEqual({ s: 'name-24' });
    expect(file.state.openProjects.map((p: { id: string }) => p.id)).toEqual(['/b']);
    expect(readdirSync(dir).filter((f) => f.includes('.tmp.'))).toEqual([]);
  });
});
