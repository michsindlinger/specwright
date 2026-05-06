import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { withKanbanLock } from '../../src/server/utils/kanban-lock.js';

function tempPath(suffix: string): string {
  return join(tmpdir(), `kanban-lock-test-${process.pid}-${suffix}-${Date.now()}`);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('withKanbanLock', () => {
  it('acquires lock, runs fn, releases lock', async () => {
    const specPath = tempPath('basic');
    mkdirSync(specPath, { recursive: true });

    let ran = false;
    await withKanbanLock(specPath, async () => { ran = true; });

    expect(ran).toBe(true);
    expect(existsSync(join(specPath, 'kanban.json.lock'))).toBe(false);
    rmSync(specPath, { recursive: true, force: true });
  });

  it('returns value from fn', async () => {
    const specPath = tempPath('return');
    mkdirSync(specPath, { recursive: true });
    const result = await withKanbanLock(specPath, async () => 42);
    expect(result).toBe(42);
    rmSync(specPath, { recursive: true, force: true });
  });

  it('propagates error from fn and releases lock', async () => {
    const specPath = tempPath('error');
    mkdirSync(specPath, { recursive: true });

    await expect(
      withKanbanLock(specPath, async () => { throw new Error('fn-error'); })
    ).rejects.toThrow('fn-error');

    expect(existsSync(join(specPath, 'kanban.json.lock'))).toBe(false);
    rmSync(specPath, { recursive: true, force: true });
  });

  it('serializes concurrent callers', async () => {
    const specPath = tempPath('serial');
    mkdirSync(specPath, { recursive: true });
    const order: number[] = [];

    const p1 = withKanbanLock(specPath, async () => {
      order.push(1);
      await new Promise<void>((r) => setTimeout(r, 20));
      order.push(2);
    });
    const p2 = withKanbanLock(specPath, async () => {
      order.push(3);
    });

    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2, 3]);
    rmSync(specPath, { recursive: true, force: true });
  });

  it('throws on timeout when lock is externally held', async () => {
    const specPath = tempPath('timeout');
    mkdirSync(specPath, { recursive: true });
    const lockPath = join(specPath, 'kanban.json.lock');
    mkdirSync(lockPath);

    await expect(
      withKanbanLock(specPath, async () => {}, 200)
    ).rejects.toThrow('Kanban lock timeout');

    rmSync(specPath, { recursive: true, force: true });
  });

  it('removes stale lock and acquires successfully', async () => {
    const specPath = tempPath('stale');
    mkdirSync(specPath, { recursive: true });
    const lockPath = join(specPath, 'kanban.json.lock');
    mkdirSync(lockPath);

    // Backdate mtime to 25s ago (beyond STALE_LOCK_MS=20s)
    const staleTime = new Date(Date.now() - 25_000);
    utimesSync(lockPath, staleTime, staleTime);

    vi.spyOn(console, 'warn').mockImplementation(() => {});

    let ran = false;
    await withKanbanLock(specPath, async () => { ran = true; });

    expect(ran).toBe(true);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('stale lock'));
    rmSync(specPath, { recursive: true, force: true });
  });
});
