/**
 * Stall-recovery hooks on AutoModeOrchestratorBase.
 *
 *  - completeSlotExternally: drives the same path as the kanban watcher's
 *    `story.completed` (cleanup + emit + onItemCompleted). Used by the
 *    auto-mode stall handler when kanban transitioned to in_review/done
 *    while the watcher hadn't fired yet (self-heal).
 *
 *  - stallRecoverSlot: cleans up activeSlots/gate/PTY without invoking the
 *    failure pipeline (no onItemFailed, no worktree teardown). After cleanup
 *    the orchestrator is re-ticked so the freshly-`ready` item is re-picked.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const slotRefs = vi.hoisted(() => ({ last: null as null | FakeSlot }));

class FakeSlot extends EventEmitter {
  public cancel = vi.fn().mockResolvedValue(undefined);
  public getTitle = (): string => this.title;
  public getSessionId = (): string | null => 'fake-session-id';
  public getStoryId = (): string => this.storyId;
  constructor(public readonly title: string, public readonly storyId: string) {
    super();
  }
  public start = vi.fn().mockResolvedValue('fake-session-id');
}

vi.mock('../../src/server/services/auto-mode-story-slot.js', () => ({
  AutoModeStorySlot: vi.fn().mockImplementation((cfg: { title: string; storyId: string }) => {
    const slot = new FakeSlot(cfg.title, cfg.storyId);
    slotRefs.last = slot;
    return slot;
  }),
}));

import {
  AutoModeOrchestratorBase,
  type ReadyItem,
} from '../../src/server/services/auto-mode-orchestrator-base.js';
import type { CloudTerminalManager } from '../../src/server/services/cloud-terminal-manager.js';

class TestOrchestrator extends AutoModeOrchestratorBase {
  public readyResponses: ReadyItem[] = [];
  public failedCalls: Array<{ id: string; error: string }> = [];
  public completedCalls: string[] = [];
  public markInProgressCalls: string[] = [];
  public recoverStaleCalls = 0;

  protected async getReadySet(excludeIds: Set<string>): Promise<ReadyItem[]> {
    return this.readyResponses.filter(r => !excludeIds.has(r.id));
  }
  protected async recoverStaleInProgress(_activeIds: Set<string>): Promise<void> {
    this.recoverStaleCalls++;
  }
  protected async markItemInProgress(itemId: string): Promise<void> {
    this.markInProgressCalls.push(itemId);
  }
  protected buildExecuteArgs(item: ReadyItem): string {
    return item.id;
  }
  protected async onItemCompleted(itemId: string): Promise<void> {
    this.completedCalls.push(itemId);
  }
  protected async onItemFailed(itemId: string, error: string): Promise<void> {
    this.failedCalls.push({ id: itemId, error });
  }

  public getActiveCount(): number {
    return this.activeSlots.size;
  }
}

let tmpDir: string;

beforeEach(async () => {
  slotRefs.last = null;
  tmpDir = await fs.mkdtemp(join(tmpdir(), 'stall-recovery-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function makeOrchestrator(): TestOrchestrator {
  const cloudTerminalManager = {} as CloudTerminalManager;
  return new TestOrchestrator({
    projectPath: tmpDir,
    kanbanPath: tmpDir,
    watchFilename: 'kanban.json',
    maxConcurrent: 2,
    commandPrefix: 'specwright',
    cloudTerminalManager,
  });
}

describe('AutoModeOrchestratorBase recovery hooks', () => {
  it('completeSlotExternally: cleans up + emits story.completed + invokes onItemCompleted', async () => {
    const o = makeOrchestrator();
    const item: ReadyItem = { id: 'S-001', title: 'Self-heal me' };
    const completedEvents: string[] = [];
    o.on('story.completed', id => completedEvents.push(id));

    await o.startItemDirectly(item);
    expect(o.getActiveCount()).toBe(1);

    o.completeSlotExternally(item.id);
    await Promise.resolve();
    await Promise.resolve();

    expect(o.getActiveCount()).toBe(0);
    expect(completedEvents).toEqual(['S-001']);
    expect(o.completedCalls).toEqual(['S-001']);
    expect(slotRefs.last!.cancel).toHaveBeenCalled();
    // No failure path
    expect(o.failedCalls).toHaveLength(0);
  });

  it('completeSlotExternally is a no-op when the slot is no longer tracked', async () => {
    const o = makeOrchestrator();
    const completedEvents: string[] = [];
    o.on('story.completed', id => completedEvents.push(id));

    o.completeSlotExternally('NEVER-STARTED');
    await Promise.resolve();

    expect(completedEvents).toEqual([]);
    expect(o.completedCalls).toEqual([]);
  });

  it('stallRecoverSlot: cleans up + reschedules tick, does NOT invoke onItemFailed', async () => {
    const o = makeOrchestrator();
    const item: ReadyItem = { id: 'S-002', title: 'Recover me' };
    o.readyResponses = []; // nothing else queued

    await o.startItemDirectly(item);
    expect(o.getActiveCount()).toBe(1);
    const tickCountBefore = o.recoverStaleCalls;

    const ok = await o.stallRecoverSlot(item.id);
    // Allow the chained scheduleTick microtask to run
    await Promise.resolve();
    await Promise.resolve();

    expect(ok).toBe(true);
    expect(o.getActiveCount()).toBe(0);
    expect(slotRefs.last!.cancel).toHaveBeenCalled();
    // Failure pipeline NOT triggered
    expect(o.failedCalls).toHaveLength(0);
    expect(o.completedCalls).toHaveLength(0);
    // scheduleTick triggers recoverStaleInProgress at least once more
    expect(o.recoverStaleCalls).toBeGreaterThan(tickCountBefore);
  });

  it('stallRecoverSlot returns false for an unknown itemId', async () => {
    const o = makeOrchestrator();
    const ok = await o.stallRecoverSlot('NEVER-STARTED');
    expect(ok).toBe(false);
  });
});
