/**
 * Unit tests for CLOG-001: AutoModeOrchestratorBase.getSnapshot() exposes sessionId
 *
 * Verifies that snapshot:
 * - Includes sessionId on active slots when slot.getSessionId() returns a value
 * - Maps null sessionId to undefined (clean optional field)
 * - Does not set sessionId on queued items (no PTY started yet)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  AutoModeOrchestratorBase,
  type ReadyItem,
  type OrchestratorBaseConfig,
} from '../../src/server/services/auto-mode-orchestrator-base.js';
import type { CloudTerminalManager } from '../../src/server/services/cloud-terminal-manager.js';

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

  /** Inject fake active slot with title + sessionId. */
  public injectActiveSlot(id: string, title: string, sessionId: string | null): void {
    const fakeSlot = {
      getTitle: () => title,
      getSessionId: () => sessionId,
    } as unknown;
    (this.activeSlots as Map<string, unknown>).set(id, fakeSlot);
  }
}

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(join(tmpdir(), 'clog-001-'));
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

describe('AutoModeOrchestratorBase.getSnapshot — sessionId exposure', () => {
  it('exposes sessionId on active slot when slot has one', async () => {
    const o = makeOrchestrator();
    o.injectActiveSlot('S-001', 'First story', 'cloud-term-abc-123');
    const snap = await o.getSnapshot();
    expect(snap.active).toEqual([
      { id: 'S-001', title: 'First story', sessionId: 'cloud-term-abc-123' },
    ]);
  });

  it('maps null sessionId to undefined on active slot', async () => {
    const o = makeOrchestrator();
    o.injectActiveSlot('S-001', 'Pre-start slot', null);
    const snap = await o.getSnapshot();
    expect(snap.active).toHaveLength(1);
    expect(snap.active[0].sessionId).toBeUndefined();
    expect(snap.active[0].id).toBe('S-001');
    expect(snap.active[0].title).toBe('Pre-start slot');
  });

  it('does not set sessionId on queued items', async () => {
    const o = makeOrchestrator();
    o.injectActiveSlot('S-001', 'Running', 'sess-1');
    o.readyResponses = [
      { id: 'S-002', title: 'Queued A' },
      { id: 'S-003', title: 'Queued B' },
    ];
    const snap = await o.getSnapshot();
    expect(snap.queued).toEqual([
      { id: 'S-002', title: 'Queued A' },
      { id: 'S-003', title: 'Queued B' },
    ]);
    for (const q of snap.queued) {
      expect(q.sessionId).toBeUndefined();
    }
  });

  it('handles mixed active slots (some with sessionId, some without)', async () => {
    const o = makeOrchestrator();
    o.injectActiveSlot('S-001', 'Started', 'sess-xyz');
    o.injectActiveSlot('S-002', 'Booting', null);
    const snap = await o.getSnapshot();
    expect(snap.active).toEqual([
      { id: 'S-001', title: 'Started', sessionId: 'sess-xyz' },
      { id: 'S-002', title: 'Booting', sessionId: undefined },
    ]);
  });
});
