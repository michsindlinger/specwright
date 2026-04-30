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

describe('ProjectConcurrencyGate — stampede invariant', () => {
  it('cap not exceeded when release and a new acquire run on the same tick', async () => {
    const max = ProjectConcurrencyGate.globalMax;
    for (let i = 0; i < max; i++) {
      await ProjectConcurrencyGate.acquireGlobalOnly();
    }

    // Existing waiter
    const w = ProjectConcurrencyGate.acquireGlobalOnly();
    await Promise.resolve();
    expect(ProjectConcurrencyGate.globalActive).toBe(max);
    expect(ProjectConcurrencyGate.globalWaiting).toBe(1);

    // SYNC: release immediately followed by a new acquire — must NOT bypass the waiter
    ProjectConcurrencyGate.releaseGlobalOnly();
    const newAcq = ProjectConcurrencyGate.acquireGlobalOnly();

    await w;
    // After w resolves, second acquire is still waiting (cap respected)
    expect(ProjectConcurrencyGate.globalActive).toBeLessThanOrEqual(max);

    ProjectConcurrencyGate.releaseGlobalOnly();
    await newAcq;
    expect(ProjectConcurrencyGate.globalActive).toBeLessThanOrEqual(max);
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

describe('ProjectConcurrencyGate — onStateChange listener', () => {
  it('fires on acquireGlobalOnly without wait — running incremented', async () => {
    const states: GlobalGateState[] = [];
    const unsub = ProjectConcurrencyGate.onStateChange(s => states.push(s));

    await ProjectConcurrencyGate.acquireGlobalOnly();

    expect(states).toHaveLength(1);
    expect(states[0].running).toBe(1);
    expect(states[0].waiting).toBe(0);
    unsub();
  });

  it('fires on instance.acquire without wait — running incremented', async () => {
    const states: GlobalGateState[] = [];
    const unsub = ProjectConcurrencyGate.onStateChange(s => states.push(s));
    const gate = new ProjectConcurrencyGate(2);

    await gate.acquire();

    expect(states).toHaveLength(1);
    expect(states[0].running).toBe(1);
    unsub();
  });

  it('fires on releaseGlobalOnly — running decremented', async () => {
    await ProjectConcurrencyGate.acquireGlobalOnly();

    const states: GlobalGateState[] = [];
    const unsub = ProjectConcurrencyGate.onStateChange(s => states.push(s));

    ProjectConcurrencyGate.releaseGlobalOnly();

    expect(states).toHaveLength(1);
    expect(states[0].running).toBe(0);
    unsub();
  });

  it('fires on enqueue with correct waiting count (off-by-one regression)', async () => {
    const max = ProjectConcurrencyGate.globalMax;
    for (let i = 0; i < max; i++) {
      await ProjectConcurrencyGate.acquireGlobalOnly();
    }

    const states: GlobalGateState[] = [];
    const unsub = ProjectConcurrencyGate.onStateChange(s => states.push(s));

    const blocked = ProjectConcurrencyGate.acquireGlobalOnly();
    await Promise.resolve();

    // After enqueue, waiting must reflect the just-pushed waiter
    const enqueueState = states.find(s => s.waiting === 1);
    expect(enqueueState).toBeDefined();
    expect(enqueueState!.running).toBe(max);
    expect(enqueueState!.waiting).toBe(1);

    unsub();
    ProjectConcurrencyGate.releaseGlobalOnly();
    await blocked;
  });

  it('fires once on hand-off in releaseGlobal — no double-fire after wait-resolve', async () => {
    const max = ProjectConcurrencyGate.globalMax;
    for (let i = 0; i < max; i++) {
      await ProjectConcurrencyGate.acquireGlobalOnly();
    }

    const blocked = ProjectConcurrencyGate.acquireGlobalOnly();
    await Promise.resolve();

    const states: GlobalGateState[] = [];
    const unsub = ProjectConcurrencyGate.onStateChange(s => states.push(s));

    ProjectConcurrencyGate.releaseGlobalOnly();
    await blocked;

    // Exactly one fire from releaseGlobal handoff (waiting=0, running stays max)
    // No second fire from the wait-resolve path
    expect(states).toHaveLength(1);
    expect(states[0].running).toBe(max);
    expect(states[0].waiting).toBe(0);
    unsub();
  });

  it('drain fires onStateChange exactly once regardless of held slots', async () => {
    const max = ProjectConcurrencyGate.globalMax;
    const gate = new ProjectConcurrencyGate(max);

    for (let i = 0; i < max; i++) {
      await gate.acquire();
    }

    const states: GlobalGateState[] = [];
    const unsub = ProjectConcurrencyGate.onStateChange(s => states.push(s));

    gate.drain();

    expect(states).toHaveLength(1);
    expect(states[0].running).toBe(0);
    unsub();
  });

  it('drain on empty gate fires no state-change event', () => {
    const gate = new ProjectConcurrencyGate(2);

    const states: GlobalGateState[] = [];
    const unsub = ProjectConcurrencyGate.onStateChange(s => states.push(s));

    gate.drain();

    expect(states).toHaveLength(0);
    unsub();
  });

  it('multiple listeners all receive updates', async () => {
    const a: GlobalGateState[] = [];
    const b: GlobalGateState[] = [];
    const u1 = ProjectConcurrencyGate.onStateChange(s => a.push(s));
    const u2 = ProjectConcurrencyGate.onStateChange(s => b.push(s));

    await ProjectConcurrencyGate.acquireGlobalOnly();

    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    u1();
    u2();
  });

  it('unsubscribe removes listener', async () => {
    const calls: number[] = [];
    const unsub = ProjectConcurrencyGate.onStateChange(() => calls.push(1));
    unsub();

    await ProjectConcurrencyGate.acquireGlobalOnly();
    expect(calls).toHaveLength(0);
  });

  it('listener exception does not break other listeners', async () => {
    const ok: GlobalGateState[] = [];
    const u1 = ProjectConcurrencyGate.onStateChange(() => { throw new Error('boom'); });
    const u2 = ProjectConcurrencyGate.onStateChange(s => ok.push(s));

    await ProjectConcurrencyGate.acquireGlobalOnly();

    expect(ok).toHaveLength(1);
    u1();
    u2();
  });

  it('getCurrentState reflects counters at any time', async () => {
    expect(ProjectConcurrencyGate.getCurrentState()).toEqual({
      running: 0,
      max: ProjectConcurrencyGate.globalMax,
      waiting: 0,
    });

    await ProjectConcurrencyGate.acquireGlobalOnly();
    expect(ProjectConcurrencyGate.getCurrentState().running).toBe(1);

    ProjectConcurrencyGate.releaseGlobalOnly();
    expect(ProjectConcurrencyGate.getCurrentState().running).toBe(0);
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

  it('resetForTests clears stateListeners', async () => {
    const calls: number[] = [];
    ProjectConcurrencyGate.onStateChange(() => calls.push(1));
    // don't unsub — reset should clear it
    ProjectConcurrencyGate.resetForTests();

    await ProjectConcurrencyGate.acquireGlobalOnly();
    expect(calls).toHaveLength(0);
  });
});
