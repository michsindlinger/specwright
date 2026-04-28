import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectConcurrencyGate, GlobalGateState } from '../../src/server/services/project-concurrency-gate.js';

beforeEach(() => {
  ProjectConcurrencyGate.resetForTests();
});

// Note: SPECWRIGHT_GLOBAL_CLAUDE_CONCURRENCY env var is frozen at module-load
// time (readonly field), so its override cannot be tested here without re-importing
// the module. Tests below use the default cap (2) set at startup.

describe('ProjectConcurrencyGate — acquireGlobalOnly / releaseGlobalOnly', () => {
  it('acquires up to globalMax without blocking', async () => {
    const max = ProjectConcurrencyGate.globalMax;
    const promises: Promise<void>[] = [];
    for (let i = 0; i < max; i++) {
      promises.push(ProjectConcurrencyGate.acquireGlobalOnly());
    }
    await Promise.all(promises);
    expect(ProjectConcurrencyGate.globalActive).toBe(max);
    expect(ProjectConcurrencyGate.globalWaiting).toBe(0);
  });

  it('blocks when at cap, unblocks after release', async () => {
    const max = ProjectConcurrencyGate.globalMax;
    for (let i = 0; i < max; i++) {
      await ProjectConcurrencyGate.acquireGlobalOnly();
    }

    let resolved = false;
    const blocked = ProjectConcurrencyGate.acquireGlobalOnly().then(() => { resolved = true; });

    await Promise.resolve(); // flush microtasks
    expect(resolved).toBe(false);
    expect(ProjectConcurrencyGate.globalWaiting).toBe(1);

    ProjectConcurrencyGate.releaseGlobalOnly();
    await blocked;
    expect(resolved).toBe(true);
    expect(ProjectConcurrencyGate.globalActive).toBe(max);
  });

  it('FIFO order: waiters resolved in order', async () => {
    const max = ProjectConcurrencyGate.globalMax;
    for (let i = 0; i < max; i++) {
      await ProjectConcurrencyGate.acquireGlobalOnly();
    }

    const order: number[] = [];
    const p1 = ProjectConcurrencyGate.acquireGlobalOnly().then(() => order.push(1));
    const p2 = ProjectConcurrencyGate.acquireGlobalOnly().then(() => order.push(2));
    const p3 = ProjectConcurrencyGate.acquireGlobalOnly().then(() => order.push(3));

    // Release one slot — first waiter should resolve
    ProjectConcurrencyGate.releaseGlobalOnly();
    await p1;
    expect(order).toEqual([1]);

    ProjectConcurrencyGate.releaseGlobalOnly();
    await p2;
    expect(order).toEqual([1, 2]);

    ProjectConcurrencyGate.releaseGlobalOnly();
    await p3;
    expect(order).toEqual([1, 2, 3]);
  });

  it('globalActive and globalWaiting getters stay consistent', async () => {
    const max = ProjectConcurrencyGate.globalMax;
    for (let i = 0; i < max; i++) {
      await ProjectConcurrencyGate.acquireGlobalOnly();
    }

    const blocked = ProjectConcurrencyGate.acquireGlobalOnly();
    await Promise.resolve();
    expect(ProjectConcurrencyGate.globalActive).toBe(max);
    expect(ProjectConcurrencyGate.globalWaiting).toBe(1);

    ProjectConcurrencyGate.releaseGlobalOnly();
    await blocked;
    expect(ProjectConcurrencyGate.globalActive).toBe(max);
    expect(ProjectConcurrencyGate.globalWaiting).toBe(0);
  });
});

describe('ProjectConcurrencyGate — cross-instance global cap', () => {
  it('two instances share the global cap', async () => {
    const max = ProjectConcurrencyGate.globalMax; // 2
    const gate1 = new ProjectConcurrencyGate(max);
    const gate2 = new ProjectConcurrencyGate(max);

    await gate1.acquire();
    await gate2.acquire();
    expect(ProjectConcurrencyGate.globalActive).toBe(2);

    // Third acquire on either instance must block
    let resolved = false;
    const blocked = gate1.acquire().then(() => { resolved = true; });
    await Promise.resolve();
    expect(resolved).toBe(false);
    expect(ProjectConcurrencyGate.globalWaiting).toBe(1);

    gate2.release();
    await blocked;
    expect(resolved).toBe(true);
  });

  it('releasing on either instance unblocks the waiter', async () => {
    const max = ProjectConcurrencyGate.globalMax;
    const gate1 = new ProjectConcurrencyGate(max);
    const gate2 = new ProjectConcurrencyGate(max);

    await gate1.acquire();
    await gate2.acquire();

    const blocked = gate2.acquire();
    await Promise.resolve();
    expect(ProjectConcurrencyGate.globalWaiting).toBe(1);

    gate1.release();
    await blocked;
    expect(ProjectConcurrencyGate.globalWaiting).toBe(0);
  });
});

describe('ProjectConcurrencyGate — drain() releases global slots', () => {
  it('releases all global slots held by the drained instance', async () => {
    const max = ProjectConcurrencyGate.globalMax;
    const gate = new ProjectConcurrencyGate(max);
    const gate2 = new ProjectConcurrencyGate(max);

    // Fill global cap via gate
    for (let i = 0; i < max; i++) {
      await gate.acquire();
    }
    expect(ProjectConcurrencyGate.globalActive).toBe(max);

    // gate2 would block
    let resolved = false;
    const blocked = gate2.acquire().then(() => { resolved = true; });
    await Promise.resolve();
    expect(resolved).toBe(false);

    gate.drain();
    await blocked;
    expect(resolved).toBe(true);
  });

  it('drain on empty gate has no effect on global counter', () => {
    const gate = new ProjectConcurrencyGate(2);
    gate.drain();
    expect(ProjectConcurrencyGate.globalActive).toBe(0);
    expect(ProjectConcurrencyGate.globalWaiting).toBe(0);
  });
});

describe('ProjectConcurrencyGate — onQueued listener', () => {
  it('fires listener with state before blocking acquire', async () => {
    const max = ProjectConcurrencyGate.globalMax;
    for (let i = 0; i < max; i++) {
      await ProjectConcurrencyGate.acquireGlobalOnly();
    }

    const states: GlobalGateState[] = [];
    const unsub = ProjectConcurrencyGate.onQueued(s => states.push(s));

    const blocked = ProjectConcurrencyGate.acquireGlobalOnly();
    await Promise.resolve();
    expect(states).toHaveLength(1);
    expect(states[0].running).toBe(max);
    expect(states[0].max).toBe(max);
    expect(states[0].waiting).toBe(1);

    unsub();
    ProjectConcurrencyGate.releaseGlobalOnly();
    await blocked;
  });

  it('unsubscribe removes listener', async () => {
    const max = ProjectConcurrencyGate.globalMax;
    for (let i = 0; i < max; i++) {
      await ProjectConcurrencyGate.acquireGlobalOnly();
    }

    const calls: number[] = [];
    const unsub = ProjectConcurrencyGate.onQueued(() => calls.push(1));
    unsub();

    const blocked = ProjectConcurrencyGate.acquireGlobalOnly();
    await Promise.resolve();
    expect(calls).toHaveLength(0);

    ProjectConcurrencyGate.releaseGlobalOnly();
    await blocked;
  });
});

describe('ProjectConcurrencyGate — test isolation (resetForTests)', () => {
  it('resetForTests clears running counter and waiters', async () => {
    const max = ProjectConcurrencyGate.globalMax;
    for (let i = 0; i < max; i++) {
      await ProjectConcurrencyGate.acquireGlobalOnly();
    }
    expect(ProjectConcurrencyGate.globalActive).toBe(max);

    ProjectConcurrencyGate.resetForTests();
    expect(ProjectConcurrencyGate.globalActive).toBe(0);
    expect(ProjectConcurrencyGate.globalWaiting).toBe(0);
  });

  it('resetForTests clears queuedListeners', async () => {
    const max = ProjectConcurrencyGate.globalMax;
    for (let i = 0; i < max; i++) {
      await ProjectConcurrencyGate.acquireGlobalOnly();
    }

    const calls: number[] = [];
    ProjectConcurrencyGate.onQueued(() => calls.push(1));
    // don't unsub — reset should clear it
    ProjectConcurrencyGate.resetForTests();

    // fill cap again and trigger potential listener
    for (let i = 0; i < max; i++) {
      await ProjectConcurrencyGate.acquireGlobalOnly();
    }
    const blocked = ProjectConcurrencyGate.acquireGlobalOnly();
    await Promise.resolve();
    expect(calls).toHaveLength(0);

    ProjectConcurrencyGate.releaseGlobalOnly();
    await blocked;
  });
});
