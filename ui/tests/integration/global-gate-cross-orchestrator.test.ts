/**
 * Integration: global cap enforced across two ProjectConcurrencyGate instances.
 *
 * Scenario: two Auto-Mode orchestrators, each with maxConcurrent=2.
 * Without global cap: 4 Claude sessions would run in parallel.
 * With global cap (default=2): only 2 sessions run at once.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectConcurrencyGate } from '../../src/server/services/project-concurrency-gate.js';

beforeEach(() => {
  ProjectConcurrencyGate.resetForTests();
});

describe('global-gate cross-orchestrator', () => {
  it('two gates (maxConcurrent=2 each) never exceed globalMax simultaneously', async () => {
    const globalMax = ProjectConcurrencyGate.globalMax; // 2 by default
    const gate1 = new ProjectConcurrencyGate(2);
    const gate2 = new ProjectConcurrencyGate(2);

    let peakActive = 0;
    let currentActive = 0;

    // Simulate 4 parallel story executions (2 per orchestrator)
    async function runItem(gate: ProjectConcurrencyGate, durationMs: number): Promise<void> {
      await gate.acquire();
      currentActive++;
      peakActive = Math.max(peakActive, currentActive);
      // Simulate async work
      await new Promise<void>(res => setTimeout(res, durationMs));
      currentActive--;
      gate.release();
    }

    // Start all 4 items concurrently — two from each "orchestrator"
    await Promise.all([
      runItem(gate1, 20),
      runItem(gate1, 20),
      runItem(gate2, 20),
      runItem(gate2, 20),
    ]);

    expect(peakActive).toBeLessThanOrEqual(globalMax);
    expect(currentActive).toBe(0);
  });

  it('global cap serializes excess work — all items still complete', async () => {
    const gate1 = new ProjectConcurrencyGate(2);
    const gate2 = new ProjectConcurrencyGate(2);

    const completed: string[] = [];

    async function runItem(gate: ProjectConcurrencyGate, id: string): Promise<void> {
      await gate.acquire();
      await new Promise<void>(res => setTimeout(res, 5));
      completed.push(id);
      gate.release();
    }

    await Promise.all([
      runItem(gate1, 'g1-a'),
      runItem(gate1, 'g1-b'),
      runItem(gate2, 'g2-a'),
      runItem(gate2, 'g2-b'),
    ]);

    expect(completed).toHaveLength(4);
    expect(completed).toContain('g1-a');
    expect(completed).toContain('g1-b');
    expect(completed).toContain('g2-a');
    expect(completed).toContain('g2-b');
  });

  it('gate.drain() during concurrent load releases all global slots', async () => {
    const globalMax = ProjectConcurrencyGate.globalMax;
    const gate1 = new ProjectConcurrencyGate(globalMax);
    const gate2 = new ProjectConcurrencyGate(globalMax);

    // Fill global cap via gate1
    for (let i = 0; i < globalMax; i++) {
      await gate1.acquire();
    }
    expect(ProjectConcurrencyGate.globalActive).toBe(globalMax);

    // gate2 waits for a slot
    let gate2Done = false;
    const gate2Work = gate2.acquire().then(() => {
      gate2Done = true;
      gate2.release();
    });

    await Promise.resolve();
    expect(gate2Done).toBe(false);
    expect(ProjectConcurrencyGate.globalWaiting).toBe(1);

    // Draining gate1 (cancel scenario) should unblock gate2
    gate1.drain();
    await gate2Work;

    expect(gate2Done).toBe(true);
    expect(ProjectConcurrencyGate.globalWaiting).toBe(0);
  });
});
