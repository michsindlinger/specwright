/**
 * AutoModeStorySlot two-edge stall watchdog.
 *
 *  - Edge 1 (5 min): emits 'stalled' once when crossing STALL_THRESHOLD_MS.
 *  - Edge 2 (10 min): emits 'stalled' once more when crossing STALL_RECOVERY_MS.
 *  - Activity below the warn threshold resets BOTH edges so future stalls re-fire.
 *
 * The slot reads `lastActivity` from CloudTerminalManager.getSession; we mock a
 * minimal manager and step the clock with vi.useFakeTimers.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { AutoModeStorySlot, STALL_THRESHOLD_MS, STALL_RECOVERY_MS } from '../../src/server/services/auto-mode-story-slot.js';
import type { CloudTerminalManager } from '../../src/server/services/cloud-terminal-manager.js';

class FakeCloudTerminalManager extends EventEmitter {
  public sessionId = 'fake-session';
  public lastActivity = new Date();
  public createSession = vi.fn(() => ({ sessionId: this.sessionId }));
  public closeSession = vi.fn();
  public setAutoModeActive = vi.fn();
  public getSession = vi.fn(() => ({ lastActivity: this.lastActivity }));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function makeSlot(mgr: FakeCloudTerminalManager): AutoModeStorySlot {
  return new AutoModeStorySlot({
    projectPath: '/tmp/fake',
    storyId: 'S-001',
    title: 'Test story',
    executeArgs: 'spec S-001',
    model: 'sonnet',
    cloudTerminalManager: mgr as unknown as CloudTerminalManager,
    commandPrefix: 'specwright',
  });
}

describe('AutoModeStorySlot stall watchdog — two edges', () => {
  it('fires once at the 5-min warn edge and once again at the 10-min recovery edge', async () => {
    const mgr = new FakeCloudTerminalManager();
    const slot = makeSlot(mgr);

    const stalledEvents: Array<{ silentMs: number }> = [];
    slot.on('stalled', (_id: string, silentMs: number) => {
      stalledEvents.push({ silentMs });
    });

    await slot.start();

    // Move lastActivity into the past and advance the watchdog interval.
    // Edge 1: 6 min idle → exactly one event.
    mgr.lastActivity = new Date(Date.now() - (STALL_THRESHOLD_MS + 60_000));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(stalledEvents).toHaveLength(1);
    expect(stalledEvents[0].silentMs).toBeGreaterThanOrEqual(STALL_THRESHOLD_MS);
    expect(stalledEvents[0].silentMs).toBeLessThan(STALL_RECOVERY_MS);

    // Still <10 min — no further fire.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(stalledEvents).toHaveLength(1);

    // Edge 2: cross 10 min → second event with silentMs >= STALL_RECOVERY_MS.
    mgr.lastActivity = new Date(Date.now() - (STALL_RECOVERY_MS + 30_000));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(stalledEvents).toHaveLength(2);
    expect(stalledEvents[1].silentMs).toBeGreaterThanOrEqual(STALL_RECOVERY_MS);

    // Past edge 2: still only 2 events total.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(stalledEvents).toHaveLength(2);

    await slot.cancel();
  });

  it('resets both edges when activity drops below the warn threshold', async () => {
    const mgr = new FakeCloudTerminalManager();
    const slot = makeSlot(mgr);

    const stalledEvents: number[] = [];
    slot.on('stalled', (_id: string, silentMs: number) => {
      stalledEvents.push(silentMs);
    });

    await slot.start();

    // First stall (warn edge).
    mgr.lastActivity = new Date(Date.now() - (STALL_THRESHOLD_MS + 60_000));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(stalledEvents).toHaveLength(1);

    // Activity resumes (lastActivity is fresh).
    mgr.lastActivity = new Date();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(stalledEvents).toHaveLength(1); // no re-fire

    // Stall again from cold state — must re-fire warn edge.
    mgr.lastActivity = new Date(Date.now() - (STALL_THRESHOLD_MS + 60_000));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(stalledEvents).toHaveLength(2);

    await slot.cancel();
  });
});
