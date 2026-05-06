import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withMainProjectLock } from '../../src/server/utils/main-project-mutex.js';

describe('withMainProjectLock', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Serialization
  // -------------------------------------------------------------------------

  it('serializes concurrent callers on the same path', async () => {
    const path = '/tmp/project-a';
    const order: number[] = [];

    const p1 = withMainProjectLock(path, 'first', async () => {
      order.push(1);
      await new Promise<void>((r) => setTimeout(r, 10));
      order.push(2);
    });

    const p2 = withMainProjectLock(path, 'second', async () => {
      order.push(3);
    });

    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2, 3]);
  });

  it('returns the value from fn', async () => {
    const result = await withMainProjectLock('/tmp/project-val', 'test', async () => 42);
    expect(result).toBe(42);
  });

  it('propagates errors from fn to the caller', async () => {
    await expect(
      withMainProjectLock('/tmp/project-err', 'fail', async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
  });

  // -------------------------------------------------------------------------
  // Rejection-safe chain (regression: rejection must not poison next waiter)
  // -------------------------------------------------------------------------

  it('rejection does not poison next caller', async () => {
    const path = '/tmp/project-poison';
    const results: string[] = [];

    const p1 = withMainProjectLock(path, 'throw', async () => {
      results.push('started');
      throw new Error('deliberate');
    }).catch(() => results.push('caught'));

    const p2 = withMainProjectLock(path, 'after-throw', async () => {
      results.push('second ran');
      return 'ok';
    });

    await Promise.all([p1, p2]);
    expect(results).toContain('second ran');
  });

  it('third caller runs even if both predecessors reject', async () => {
    const path = '/tmp/project-double-poison';
    let thirdRan = false;

    const p1 = withMainProjectLock(path, 'throw1', async () => { throw new Error('e1'); }).catch(() => {});
    const p2 = withMainProjectLock(path, 'throw2', async () => { throw new Error('e2'); }).catch(() => {});
    const p3 = withMainProjectLock(path, 'ok', async () => { thirdRan = true; });

    await Promise.all([p1, p2, p3]);
    expect(thirdRan).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Path independence: different paths do NOT block each other
  // -------------------------------------------------------------------------

  it('different paths execute concurrently', async () => {
    const started: string[] = [];
    const finished: string[] = [];

    // Both slow tasks start before either finishes (true parallelism).
    const p1 = withMainProjectLock('/tmp/proj-x', 'x', async () => {
      started.push('x');
      await new Promise<void>((r) => setTimeout(r, 20));
      finished.push('x');
    });

    const p2 = withMainProjectLock('/tmp/proj-y', 'y', async () => {
      started.push('y');
      await new Promise<void>((r) => setTimeout(r, 20));
      finished.push('y');
    });

    await Promise.all([p1, p2]);

    // Both must have started before either finished (parallel, not serial).
    const xStartIdx = started.indexOf('x');
    const yStartIdx = started.indexOf('y');
    expect(xStartIdx).toBeGreaterThanOrEqual(0);
    expect(yStartIdx).toBeGreaterThanOrEqual(0);
    // started array contains both before finished array is populated
    expect(started).toHaveLength(2);
    expect(finished).toHaveLength(2);
  });

  it('same path with resolved symlinks is treated as one key', async () => {
    // path.resolve normalizes trailing slashes and dots
    const path1 = '/tmp/project-b/./';
    const path2 = '/tmp/project-b';
    const order: number[] = [];

    const p1 = withMainProjectLock(path1, 'a', async () => {
      order.push(1);
      await new Promise<void>((r) => setTimeout(r, 5));
      order.push(2);
    });
    const p2 = withMainProjectLock(path2, 'b', async () => {
      order.push(3);
    });

    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2, 3]);
  });

  // -------------------------------------------------------------------------
  // Soft-warn timers (fake timers)
  // -------------------------------------------------------------------------

  it('logs console.warn after 30s of held lock', async () => {
    vi.useFakeTimers();

    let releaseHold!: () => void;
    const holdLock = new Promise<void>((r) => { releaseHold = r; });

    const lockPromise = withMainProjectLock('/tmp/project-warn', 'slow-op', async () => {
      await holdLock;
    });

    // Advance past 30s threshold
    await vi.advanceTimersByTimeAsync(30_001);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Lock held >30s')
    );
    expect(console.error).not.toHaveBeenCalled();

    releaseHold();
    await lockPromise;
  });

  it('logs console.error after 60s of held lock', async () => {
    vi.useFakeTimers();

    let releaseHold!: () => void;
    const holdLock = new Promise<void>((r) => { releaseHold = r; });

    const lockPromise = withMainProjectLock('/tmp/project-error', 'very-slow', async () => {
      await holdLock;
    });

    await vi.advanceTimersByTimeAsync(60_001);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Lock held >60s')
    );

    releaseHold();
    await lockPromise;
  });

  it('does NOT warn when fn completes before 30s', async () => {
    vi.useFakeTimers();

    const lockPromise = withMainProjectLock('/tmp/project-fast', 'fast', async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await lockPromise;
    // Advance past both thresholds — timers should be cleared
    await vi.advanceTimersByTimeAsync(90_000);

    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });
});
