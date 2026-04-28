/**
 * PAM-FIX-009: prompt-stuck recovery in AutoModeOrchestratorBase.
 *
 * When a slot emits 'prompt-stuck' the orchestrator must:
 *   1. Remove the slot from the activeSlots map
 *   2. Release the concurrency gate
 *   3. Call onItemFailed with a reason that includes the matched text
 *   4. Emit 'story.failed' (in addition to 'story.prompt-stuck')
 *   5. Cancel the slot
 *
 * Without this, a single false-positive prompt detection holds a
 * concurrency slot forever and the kanban never advances.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Hoisted reference so the mock factory can store the last instance for the test.
const slotRefs = vi.hoisted(() => ({ last: null as null | FakeSlot }));

class FakeSlot extends EventEmitter {
  public cancel = vi.fn().mockResolvedValue(undefined);
  public getTitle = (): string => this.title;
  constructor(public readonly title: string) {
    super();
  }
  // Match real slot.start() signature: returns a session id string.
  public start = vi.fn().mockResolvedValue('fake-session-id');
}

vi.mock('../../src/server/services/auto-mode-story-slot.js', () => ({
  AutoModeStorySlot: vi.fn().mockImplementation((cfg: { title: string }) => {
    const slot = new FakeSlot(cfg.title);
    slotRefs.last = slot;
    return slot;
  }),
}));

import {
  AutoModeOrchestratorBase,
  type ReadyItem,
  type OrchestratorBaseConfig,
} from '../../src/server/services/auto-mode-orchestrator-base.js';
import type { CloudTerminalManager } from '../../src/server/services/cloud-terminal-manager.js';

class TestOrchestrator extends AutoModeOrchestratorBase {
  public readyResponses: ReadyItem[] = [];
  public failedCalls: Array<{ id: string; error: string }> = [];
  public completedCalls: string[] = [];

  protected async getReadySet(excludeIds: Set<string>): Promise<ReadyItem[]> {
    return this.readyResponses.filter(r => !excludeIds.has(r.id));
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
  tmpDir = await fs.mkdtemp(join(tmpdir(), 'pam-fix-009-'));
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

describe('AutoModeOrchestratorBase — prompt-stuck recovery', () => {
  it('marks the story as failed and frees the slot when the slot emits prompt-stuck', async () => {
    const o = makeOrchestrator();
    const item: ReadyItem = { id: 'S-001', title: 'My story' };

    const failedEvents: Array<{ id: string; error: string }> = [];
    const promptStuckEvents: Array<{ id: string; text: string }> = [];
    o.on('story.failed', (id: string, error: string) => {
      failedEvents.push({ id, error });
    });
    o.on('story.prompt-stuck', (id: string, text: string) => {
      promptStuckEvents.push({ id, text });
    });

    await o.startItemDirectly(item);

    // Slot should now be active.
    expect(o.getActiveCount()).toBe(1);
    expect(slotRefs.last).not.toBeNull();

    // Simulate a prompt-stuck event from the slot.
    const matchedText = 'Apply migration [Y/n]';
    slotRefs.last!.emit('prompt-stuck', item.id, matchedText);

    // Allow microtasks to flush (onItemFailed is awaited via .catch chain).
    await Promise.resolve();
    await Promise.resolve();

    expect(o.getActiveCount()).toBe(0);
    expect(o.failedCalls).toHaveLength(1);
    expect(o.failedCalls[0].id).toBe(item.id);
    expect(o.failedCalls[0].error).toContain(matchedText);
    expect(o.failedCalls[0].error).toMatch(/Auto-Mode/i);

    expect(failedEvents).toHaveLength(1);
    expect(failedEvents[0].id).toBe(item.id);
    expect(failedEvents[0].error).toContain(matchedText);

    expect(promptStuckEvents).toHaveLength(1);
    expect(promptStuckEvents[0]).toEqual({ id: item.id, text: matchedText });

    expect(slotRefs.last!.cancel).toHaveBeenCalledTimes(1);
  });

  it('does not double-handle when prompt-stuck and error fire for the same slot', async () => {
    const o = makeOrchestrator();
    const item: ReadyItem = { id: 'S-002', title: 'Other story' };

    await o.startItemDirectly(item);
    expect(slotRefs.last).not.toBeNull();

    slotRefs.last!.emit('prompt-stuck', item.id, '(y/n)');
    slotRefs.last!.emit('error', new Error('ptyDied'));

    await Promise.resolve();
    await Promise.resolve();

    expect(o.failedCalls).toHaveLength(1);
    expect(o.failedCalls[0].error).toContain('(y/n)');
  });
});
