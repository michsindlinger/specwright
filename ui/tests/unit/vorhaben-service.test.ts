import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { VorhabenService } from '../../src/server/services/vorhaben-service.js';
import { VorhabenStateStore } from '../../src/server/services/vorhaben-state.js';
import { VorhabenWatcher } from '../../src/server/services/vorhaben-watcher.js';
import { VorhabenHandler, type OutboundMessage } from '../../src/server/services/vorhaben-handler.js';
import { ProjectDocsService } from '../../src/server/services/project-docs.service.js';
import type { VorhabenStateMessage } from '../../src/shared/types/vorhaben.protocol.js';

const intentText = (status: string): string => `---\nintent_id: "INT-2026-004"  \ntitel: "Titel"  \nstatus: "${status}"  \nversion: "1.0.0"  \nbypass: "nein"  \n---\n`;

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

describe('VorhabenService + VorhabenHandler (stage 1)', () => {
  let root: string;
  let projA: string;
  let wtA: string;
  let store: VorhabenStateStore;
  let broadcast: ReturnType<typeof vi.fn<(m: OutboundMessage) => void>>;
  let reply: ReturnType<typeof vi.fn<(m: OutboundMessage) => void>>;
  let service: VorhabenService;
  let handler: VorhabenHandler;
  const openProjects: Array<{ id: string; path: string; name: string }> = [];

  const lastState = (): VorhabenStateMessage['state'] => {
    const states = broadcast.mock.calls.map((c) => c[0]).filter((m) => m.type === 'vorhaben:state') as VorhabenStateMessage[];
    return states[states.length - 1].state;
  };

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'vorhaben-service-'));
    projA = join(root, 'a');
    wtA = join(root, 'a-wt');
    mkdirSync(join(projA, 'intent', 'INT-2026-004-ui'), { recursive: true });
    writeFileSync(join(projA, 'intent', 'INT-2026-004-ui', 'intent.md'), intentText('angenommen'));
    mkdirSync(join(projA, 'intent', 'INT-2026-004-ui', 'design'));
    writeFileSync(join(projA, 'intent', 'INT-2026-004-ui', 'design', 'x.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    writeFileSync(join(projA, 'intent', 'INT-2026-004-ui', 'design', 'mock.css'), 'body{}');
    mkdirSync(join(wtA, 'intent', 'INT-2026-005-neu'), { recursive: true });
    writeFileSync(join(wtA, 'intent', 'INT-2026-005-neu', 'intent.md'), intentText('entwurf'));
    mkdirSync(join(projA, 'docs'));
    writeFileSync(join(projA, 'docs', 'architecture.md'), '# A');
    mkdirSync(join(root, 'b'));
    openProjects.splice(0, openProjects.length, { id: 'pa', path: projA, name: 'A' }, { id: 'pb', path: join(root, 'b'), name: 'B' });

    store = new VorhabenStateStore(join(root, 'state.json'), { port: 3111 });
    await store.load();
    broadcast = vi.fn();
    reply = vi.fn();
    service = new VorhabenService({
      workspace: { getState: () => ({ openProjects }) },
      store,
      broadcast,
      watcher: new VorhabenWatcher({ debounceMs: 30 }),
      listWorktrees: async (p) =>
        p === projA
          ? { isGitRepo: true, mainWorktreePath: projA, entries: [
              { path: projA, head: 'x', branch: 'main', detached: false, bare: false, locked: false, prunable: false },
              { path: wtA, head: 'y', branch: 'feat/neu', detached: false, bare: false, locked: false, prunable: false },
            ] }
          : { isGitRepo: false, mainWorktreePath: null, entries: [] },
    });
    handler = new VorhabenHandler(service, new ProjectDocsService({ gitDirty: async () => null }), store, broadcast);
    await service.start();
  });

  afterEach(async () => {
    service.stop();
    await store.flush();
    rmSync(root, { recursive: true, force: true });
  });

  it('start() broadcasts a complete snapshot: rows from project and worktree, project infos (V-02, V-03, V-05)', () => {
    const state = lastState();
    expect(state.loading).toBe(false);
    expect(state.rows.map((r) => [r.intentId, r.arbeitskopie, r.projectId])).toEqual([
      ['INT-2026-004', 'main', 'pa'],
      ['INT-2026-005', 'feat/neu', 'pa'],
    ]);
    expect(state.rows[0]).toMatchObject({ phase: 'spec', zustand: 'keine_sitzung', designFiles: ['mock.css', 'x.png'], nextStep: { command: '/spec INT-2026-004' } });
    expect(state.projects).toEqual([
      expect.objectContaining({ id: 'pa', arbeitskopie: 'main', worktrees: ['feat/neu'], hasIntentDir: true }),
      expect.objectContaining({ id: 'pb', hasIntentDir: false, worktrees: [] }),
    ]);
  });

  it('vorhaben:get replies with the state; non-vorhaben messages are ignored', () => {
    expect(handler.handle({ type: 'workspace:get' }, reply)).toBe(false);
    expect(handler.handle({ type: 'vorhaben:get' }, reply)).toBe(true);
    expect(reply.mock.calls[0][0].type).toBe('vorhaben:state');
  });

  it('a document change is broadcast within 2 s (FA-04, V-04)', async () => {
    const before = broadcast.mock.calls.length;
    writeFileSync(join(projA, 'intent', 'INT-2026-004-ui', 'spec.md'), '# Spec\n\n> **Status:** freigegeben\n');
    await waitFor(() => (broadcast.mock.calls.length > before ? true : undefined), 4000);
    const state = lastState();
    expect(state.rows[0]).toMatchObject({ phase: 'plan', nextStep: { command: '/plan INT-2026-004' } });
  });

  it('a project without intent/ picks up a new folder (dir-added → rescan)', async () => {
    const before = broadcast.mock.calls.length;
    mkdirSync(join(root, 'b', 'intent', 'INT-2026-001-b'), { recursive: true });
    writeFileSync(join(root, 'b', 'intent', 'INT-2026-001-b', 'intent.md'), intentText('entwurf'));
    await waitFor(() => (lastState().rows.some((r) => r.projectId === 'pb') ? true : undefined), 4000);
    expect(broadcast.mock.calls.length).toBeGreaterThan(before);
  });

  it('doc.read validates and returns content; unknown project/vorhaben are errors', async () => {
    handler.handle({ type: 'vorhaben:doc.read', requestId: 'r1', projectId: 'pa', intentId: 'INT-2026-004', doc: 'intent' }, reply);
    await waitFor(() => (reply.mock.calls.length ? true : undefined), 1000);
    expect(reply.mock.calls[0][0]).toMatchObject({ type: 'vorhaben:doc', requestId: 'r1', doc: 'intent' });
    expect((reply.mock.calls[0][0] as { content: string }).content).toContain('INT-2026-004');

    reply.mockClear();
    handler.handle({ type: 'vorhaben:doc.read', projectId: 'zz', intentId: 'INT-2026-004', doc: 'intent' }, reply);
    await waitFor(() => (reply.mock.calls.length ? true : undefined), 1000);
    expect(reply.mock.calls[0][0]).toMatchObject({ type: 'vorhaben:error', code: 'UNKNOWN_PROJECT' });

    reply.mockClear();
    handler.handle({ type: 'vorhaben:doc.read', projectId: 'pa', intentId: '../../etc', doc: 'intent' }, reply);
    expect(reply.mock.calls[0][0]).toMatchObject({ type: 'vorhaben:error', code: 'INVALID_MESSAGE' });

    reply.mockClear();
    handler.handle({ type: 'vorhaben:doc.read', projectId: 'pa', intentId: 'INT-2026-004', doc: 'plan' }, reply);
    await waitFor(() => (reply.mock.calls.length ? true : undefined), 1000);
    expect(reply.mock.calls[0][0]).toMatchObject({ type: 'vorhaben:error', code: 'NOT_FOUND' });
  });

  it('design.read returns a data URL for images, null for other files, rejects traversal', async () => {
    handler.handle({ type: 'vorhaben:design.read', projectId: 'pa', intentId: 'INT-2026-004', file: 'x.png' }, reply);
    await waitFor(() => (reply.mock.calls.length ? true : undefined), 1000);
    expect((reply.mock.calls[0][0] as { dataUrl: string }).dataUrl).toMatch(/^data:image\/png;base64,/);
    reply.mockClear();
    handler.handle({ type: 'vorhaben:design.read', projectId: 'pa', intentId: 'INT-2026-004', file: 'mock.css' }, reply);
    await waitFor(() => (reply.mock.calls.length ? true : undefined), 1000);
    expect((reply.mock.calls[0][0] as { dataUrl: string | null }).dataUrl).toBeNull();
    reply.mockClear();
    handler.handle({ type: 'vorhaben:design.read', projectId: 'pa', intentId: 'INT-2026-004', file: '../intent.md' }, reply);
    await waitFor(() => (reply.mock.calls.length ? true : undefined), 1000);
    expect(reply.mock.calls[0][0]).toMatchObject({ type: 'vorhaben:error' });
  });

  it('project-docs: list/read/write/conflict + drafts broadcast state (V-08, FA-46, FA-47)', async () => {
    handler.handle({ type: 'project-docs:list', projectId: 'pa' }, reply);
    await waitFor(() => (reply.mock.calls.length ? true : undefined), 1000);
    const list = reply.mock.calls[0][0] as { docs: Array<{ key: string; exists: boolean }> };
    expect(list.docs.map((d) => d.exists)).toEqual([false, true, false, false, false]);

    reply.mockClear();
    handler.handle({ type: 'project-docs:read', projectId: 'pa', key: 'architecture' }, reply);
    await waitFor(() => (reply.mock.calls.length ? true : undefined), 1000);
    const doc = reply.mock.calls[0][0] as { content: string; mtimeMs: number };
    expect(doc.content).toBe('# A');

    // draft set → broadcast with docDrafts
    const n = broadcast.mock.calls.length;
    handler.handle({ type: 'project-docs:draft.set', projectId: 'pa', key: 'architecture', text: '# A neu', openedMtime: doc.mtimeMs }, reply);
    expect(broadcast.mock.calls.length).toBe(n + 1);
    expect(lastState().docDrafts['pa::architecture']).toMatchObject({ text: '# A neu' });

    // stale write → conflict, no change
    reply.mockClear();
    handler.handle({ type: 'project-docs:write', projectId: 'pa', key: 'architecture', content: '# A neu', expectedMtime: doc.mtimeMs - 5000 }, reply);
    await waitFor(() => (reply.mock.calls.length ? true : undefined), 1000);
    expect(reply.mock.calls[0][0]).toMatchObject({ type: 'project-docs:conflict' });

    // matching write → written, draft cleared + broadcast
    reply.mockClear();
    handler.handle({ type: 'project-docs:write', projectId: 'pa', key: 'architecture', content: '# A neu', expectedMtime: doc.mtimeMs }, reply);
    await waitFor(() => (reply.mock.calls.length ? true : undefined), 1000);
    expect(reply.mock.calls[0][0]).toMatchObject({ type: 'project-docs:written', key: 'architecture' });
    expect(lastState().docDrafts['pa::architecture']).toBeUndefined();

    // invalid key
    reply.mockClear();
    handler.handle({ type: 'project-docs:read', projectId: 'pa', key: 'README' }, reply);
    expect(reply.mock.calls[0][0]).toMatchObject({ type: 'vorhaben:error', code: 'INVALID_MESSAGE' });
  });
});
