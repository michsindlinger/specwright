/**
 * Unit tests for PAM-FIX-003: AutoModeOrchestratorBase.getSnapshot()
 *
 * Verifies that snapshot:
 * - Lists active slots from in-memory map (with title from slot)
 * - Lists queued items from a fresh getReadySet() pull
 * - Excludes active IDs from the queued list
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  AutoModeOrchestratorBase,
  type ReadyItem,
  type OrchestratorBaseConfig,
} from '../../src/server/services/auto-mode-orchestrator-base.js';
import type { CloudTerminalManager } from '../../src/server/services/cloud-terminal-manager.js';

// Test subclass: feeds a controllable ready set, no real spec/backlog reader.
class TestOrchestrator extends AutoModeOrchestratorBase {
  public readyResponses: ReadyItem[] = [];

  constructor(config: OrchestratorBaseConfig) {
    super(config);
  }

  protected async getReadySet(excludeIds: Set<string>): Promise<ReadyItem[]> {
    return this.readyResponses.filter(r => !excludeIds.has(r.id));
  }

  protected buildExecuteArgs(item: ReadyItem): string {
    return item.id;
  }

  protected async onItemCompleted(_itemId: string): Promise<void> { /* no-op */ }
  protected async onItemFailed(_itemId: string, _error: string): Promise<void> { /* no-op */ }

  /** Test helper: inject fake active slot with a title. */
  public injectActiveSlot(id: string, title: string): void {
    const fakeSlot = {
      getTitle: () => title,
      getSessionId: () => null,
    } as unknown;
    (this.activeSlots as Map<string, unknown>).set(id, fakeSlot);
  }
}

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(join(tmpdir(), 'pam-fix-003-'));
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

describe('AutoModeOrchestratorBase.getSnapshot', () => {
  it('returns empty active and queued when nothing scheduled', async () => {
    const o = makeOrchestrator();
    const snap = await o.getSnapshot();
    expect(snap.active).toEqual([]);
    expect(snap.queued).toEqual([]);
  });

  it('returns active slots with title from slot', async () => {
    const o = makeOrchestrator();
    o.injectActiveSlot('S-001', 'First story');
    o.injectActiveSlot('S-002', 'Second story');
    const snap = await o.getSnapshot();
    expect(snap.active).toEqual([
      { id: 'S-001', title: 'First story' },
      { id: 'S-002', title: 'Second story' },
    ]);
  });

  it('returns queued items from fresh ready set, excluding active IDs', async () => {
    const o = makeOrchestrator();
    o.injectActiveSlot('S-001', 'First (running)');
    o.readyResponses = [
      { id: 'S-001', title: 'First (running)' }, // would be excluded
      { id: 'S-002', title: 'Second (queued)' },
      { id: 'S-003', title: 'Third (queued)' },
    ];
    const snap = await o.getSnapshot();
    expect(snap.active.map(s => s.id)).toEqual(['S-001']);
    expect(snap.queued.map(s => s.id)).toEqual(['S-002', 'S-003']);
    expect(snap.queued).toEqual([
      { id: 'S-002', title: 'Second (queued)' },
      { id: 'S-003', title: 'Third (queued)' },
    ]);
  });

  it('returns full ready set as queued when no active slots (no maxConcurrent trimming)', async () => {
    const o = makeOrchestrator();
    o.readyResponses = [
      { id: 'S-001', title: 'A' },
      { id: 'S-002', title: 'B' },
      { id: 'S-003', title: 'C' },
      { id: 'S-004', title: 'D' },
    ];
    const snap = await o.getSnapshot();
    // maxConcurrent=2 but snapshot does NOT trim — all 4 returned.
    expect(snap.queued).toHaveLength(4);
    expect(snap.active).toHaveLength(0);
  });

  it('snapshot is read-only and does not start any new slots', async () => {
    const o = makeOrchestrator();
    o.readyResponses = [{ id: 'S-001', title: 'X' }];
    const launchSpy = vi.spyOn(o as unknown as { launchSlot: () => Promise<void> }, 'launchSlot' as never);
    await o.getSnapshot();
    expect(launchSpy).not.toHaveBeenCalled();
  });
});
