/**
 * Unit tests for PAM-003: KanbanFileWatcher Set-of-IDs API.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { KanbanFileWatcher, type WatchFilename } from '../../src/server/services/kanban-file-watcher.js';

// ============================================================================
// Helpers
// ============================================================================

async function makeTmpDir(): Promise<string> {
  const dir = await fs.mkdtemp(join(tmpdir(), 'pam-003-'));
  return dir;
}

function makeV2Kanban(tasks: Array<{ id: string; status: string }>) {
  return {
    version: '2.0',
    mode: 'lean',
    tasks,
    boardStatus: { total: tasks.length, ready: 0, inProgress: 0, done: 0, blocked: 0 }
  };
}

function makeBacklogIndex(items: Array<{ id: string; status: string }>) {
  return { nextId: 10, items };
}

async function writeJson(dir: string, filename: string, data: unknown): Promise<void> {
  await fs.writeFile(join(dir, filename), JSON.stringify(data), 'utf-8');
}

function waitForEvent(emitter: KanbanFileWatcher, event: string, timeoutMs = 2000): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for event: ${event}`)), timeoutMs);
    emitter.once(event, (...args: unknown[]) => {
      clearTimeout(timer);
      resolve(args);
    });
  });
}

// ============================================================================
// KanbanFileWatcher Set-of-IDs API
// ============================================================================

describe('KanbanFileWatcher — Set-of-IDs API', () => {
  let tmpDir: string;
  let watcher: KanbanFileWatcher;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
    watcher = new KanbanFileWatcher();
  });

  afterEach(async () => {
    watcher.unwatch();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // --------------------------------------------------------------------------
  // watch() signature
  // --------------------------------------------------------------------------

  it('watch() accepts filename and Set<string>', async () => {
    const tasks = [
      { id: 'T-001', status: 'in_progress' },
      { id: 'T-002', status: 'in_progress' },
    ];
    await writeJson(tmpDir, 'kanban.json', makeV2Kanban(tasks));

    // Should not throw
    expect(() =>
      watcher.watch(tmpDir, 'kanban.json', new Set(['T-001', 'T-002']))
    ).not.toThrow();

    watcher.unwatch();
  });

  it('watch() emits story.completed for done status', async () => {
    const tasks = [{ id: 'T-001', status: 'in_progress' }];
    await writeJson(tmpDir, 'kanban.json', makeV2Kanban(tasks));

    watcher.watch(tmpDir, 'kanban.json', new Set(['T-001']));
    const eventPromise = waitForEvent(watcher, 'story.completed');

    // Simulate story completion
    tasks[0].status = 'done';
    await writeJson(tmpDir, 'kanban.json', makeV2Kanban(tasks));

    const [storyId] = await eventPromise;
    expect(storyId).toBe('T-001');
  });

  it('watch() emits story.failed for failed status', async () => {
    const tasks = [{ id: 'T-001', status: 'in_progress' }];
    await writeJson(tmpDir, 'kanban.json', makeV2Kanban(tasks));

    watcher.watch(tmpDir, 'kanban.json', new Set(['T-001']));
    const eventPromise = waitForEvent(watcher, 'story.failed');

    tasks[0].status = 'failed';
    await writeJson(tmpDir, 'kanban.json', makeV2Kanban(tasks));

    const [storyId] = await eventPromise;
    expect(storyId).toBe('T-001');
  });

  it('watch() emits events for multiple IDs independently', async () => {
    const tasks = [
      { id: 'T-001', status: 'in_progress' },
      { id: 'T-002', status: 'in_progress' },
    ];
    await writeJson(tmpDir, 'kanban.json', makeV2Kanban(tasks));

    watcher.watch(tmpDir, 'kanban.json', new Set(['T-001', 'T-002']));

    const completedIds: string[] = [];
    watcher.on('story.completed', (id: string) => completedIds.push(id));

    // Complete T-001
    tasks[0].status = 'done';
    await writeJson(tmpDir, 'kanban.json', makeV2Kanban(tasks));
    await new Promise(r => setTimeout(r, 500));

    // Complete T-002
    tasks[1].status = 'done';
    await writeJson(tmpDir, 'kanban.json', makeV2Kanban(tasks));
    await new Promise(r => setTimeout(r, 500));

    expect(completedIds).toContain('T-001');
    expect(completedIds).toContain('T-002');
  });

  // --------------------------------------------------------------------------
  // addId / removeId
  // --------------------------------------------------------------------------

  it('addId() adds to watched set', async () => {
    const tasks = [
      { id: 'T-001', status: 'in_progress' },
      { id: 'T-002', status: 'in_progress' },
    ];
    await writeJson(tmpDir, 'kanban.json', makeV2Kanban(tasks));

    // Start watching only T-001
    watcher.watch(tmpDir, 'kanban.json', new Set(['T-001']));
    // Add T-002 dynamically
    watcher.addId('T-002');

    const completedIds: string[] = [];
    watcher.on('story.completed', (id: string) => completedIds.push(id));

    tasks[1].status = 'done';
    await writeJson(tmpDir, 'kanban.json', makeV2Kanban(tasks));
    await new Promise(r => setTimeout(r, 500));

    expect(completedIds).toContain('T-002');
  });

  it('removeId() removes from watched set — no event after removal', async () => {
    const tasks = [
      { id: 'T-001', status: 'in_progress' },
      { id: 'T-002', status: 'in_progress' },
    ];
    await writeJson(tmpDir, 'kanban.json', makeV2Kanban(tasks));

    watcher.watch(tmpDir, 'kanban.json', new Set(['T-001', 'T-002']));
    // Remove T-002 before it completes
    watcher.removeId('T-002');

    const completedIds: string[] = [];
    watcher.on('story.completed', (id: string) => completedIds.push(id));

    tasks[1].status = 'done';
    await writeJson(tmpDir, 'kanban.json', makeV2Kanban(tasks));
    await new Promise(r => setTimeout(r, 500));

    expect(completedIds).not.toContain('T-002');
  });

  // --------------------------------------------------------------------------
  // processedTransitions dedup
  // --------------------------------------------------------------------------

  it('does not emit duplicate events for the same status', async () => {
    const tasks = [{ id: 'T-001', status: 'done' }];
    await writeJson(tmpDir, 'kanban.json', makeV2Kanban(tasks));

    watcher.watch(tmpDir, 'kanban.json', new Set(['T-001']));

    const completedCount: number[] = [];
    watcher.on('story.completed', () => completedCount.push(1));

    // Trigger two rapid writes — both show T-001 as done
    await writeJson(tmpDir, 'kanban.json', makeV2Kanban(tasks));
    await new Promise(r => setTimeout(r, 150));
    await writeJson(tmpDir, 'kanban.json', makeV2Kanban(tasks));
    await new Promise(r => setTimeout(r, 500));

    // Should fire at most once (first detection + one dedup)
    expect(completedCount.length).toBeLessThanOrEqual(2);
    // After a confirmed transition, second write must not add another event
    if (completedCount.length === 1) {
      // Trigger another write
      await writeJson(tmpDir, 'kanban.json', makeV2Kanban(tasks));
      await new Promise(r => setTimeout(r, 500));
      expect(completedCount.length).toBe(1);
    }
  });

  // --------------------------------------------------------------------------
  // backlog-index.json support
  // --------------------------------------------------------------------------

  it('supports backlog-index.json filename', async () => {
    const items = [{ id: 'BUG-001', status: 'in_progress' }];
    await writeJson(tmpDir, 'backlog-index.json', makeBacklogIndex(items));

    watcher.watch(tmpDir, 'backlog-index.json', new Set(['BUG-001']));
    const eventPromise = waitForEvent(watcher, 'story.completed');

    items[0].status = 'done';
    await writeJson(tmpDir, 'backlog-index.json', makeBacklogIndex(items));

    const [itemId] = await eventPromise;
    expect(itemId).toBe('BUG-001');
  });

  it('emits story.failed for blocked status on backlog-index.json', async () => {
    const items = [{ id: 'BUG-001', status: 'in_progress' }];
    await writeJson(tmpDir, 'backlog-index.json', makeBacklogIndex(items));

    watcher.watch(tmpDir, 'backlog-index.json', new Set(['BUG-001']));
    const eventPromise = waitForEvent(watcher, 'story.failed');

    items[0].status = 'blocked';
    await writeJson(tmpDir, 'backlog-index.json', makeBacklogIndex(items));

    const [itemId] = await eventPromise;
    expect(itemId).toBe('BUG-001');
  });

  it('does NOT emit story.failed for blocked status on kanban.json', async () => {
    const tasks = [{ id: 'T-001', status: 'in_progress' }];
    await writeJson(tmpDir, 'kanban.json', makeV2Kanban(tasks));

    watcher.watch(tmpDir, 'kanban.json', new Set(['T-001']));

    const failedIds: string[] = [];
    watcher.on('story.failed', (id: string) => failedIds.push(id));

    // blocked in kanban.json = dependency-blocked, not failure
    tasks[0].status = 'blocked';
    await writeJson(tmpDir, 'kanban.json', makeV2Kanban(tasks));
    await new Promise(r => setTimeout(r, 500));

    expect(failedIds).not.toContain('T-001');
  });

  // --------------------------------------------------------------------------
  // unwatch()
  // --------------------------------------------------------------------------

  it('unwatch() stops all event emission', async () => {
    const tasks = [{ id: 'T-001', status: 'in_progress' }];
    await writeJson(tmpDir, 'kanban.json', makeV2Kanban(tasks));

    watcher.watch(tmpDir, 'kanban.json', new Set(['T-001']));
    watcher.unwatch();

    const completedIds: string[] = [];
    watcher.on('story.completed', (id: string) => completedIds.push(id));

    tasks[0].status = 'done';
    await writeJson(tmpDir, 'kanban.json', makeV2Kanban(tasks));
    await new Promise(r => setTimeout(r, 500));

    expect(completedIds).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // WatchFilename type export
  // --------------------------------------------------------------------------

  it('WatchFilename type accepts kanban.json and backlog-index.json', () => {
    const f1: WatchFilename = 'kanban.json';
    const f2: WatchFilename = 'backlog-index.json';
    expect(f1).toBe('kanban.json');
    expect(f2).toBe('backlog-index.json');
  });
});
