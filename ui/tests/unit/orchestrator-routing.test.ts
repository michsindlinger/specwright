import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { SpecsReader } from '../../src/server/specs-reader.js';
import { BacklogReader } from '../../src/server/backlog-reader.js';
import { AutoModeSpecOrchestrator } from '../../src/server/services/auto-mode-spec-orchestrator.js';
import { AutoModeBacklogOrchestrator } from '../../src/server/services/auto-mode-backlog-orchestrator.js';
import type { CloudTerminalManager } from '../../src/server/services/cloud-terminal-manager.js';

// Stub CloudTerminalManager — orchestrator base wires event listeners via .on().
function makeStubCtm(): CloudTerminalManager {
  const emitter = new EventEmitter();
  return emitter as unknown as CloudTerminalManager;
}

describe('AutoModeSpecOrchestrator path routing', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getReadyStories receives mainProjectPath when projectPath differs (worktree case)', async () => {
    const spy = vi.spyOn(SpecsReader.prototype, 'getReadyStories').mockResolvedValue([]);
    const orch = AutoModeSpecOrchestrator.create(
      '/tmp/spec-worktree',          // projectPath = worktree
      '2026-05-05-x',
      'specwright',
      makeStubCtm(),
      2,
      'worktree',
      '/tmp/main-repo',              // mainProjectPath = main
      'feature/x',
      undefined
    );

    await (orch as unknown as { getReadySet: (e: Set<string>) => Promise<unknown[]> }).getReadySet(new Set());

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe('/tmp/main-repo');
    expect(spy.mock.calls[0][1]).toBe('2026-05-05-x');
  });

  it('updateStoryStatus (markItemInProgress) targets mainProjectPath', async () => {
    const spy = vi.spyOn(SpecsReader.prototype, 'updateStoryStatus').mockResolvedValue(undefined);
    const orch = AutoModeSpecOrchestrator.create(
      '/tmp/spec-worktree',
      '2026-05-05-x',
      'specwright',
      makeStubCtm(),
      2,
      'worktree',
      '/tmp/main-repo',
      'feature/x',
      undefined
    );

    await (orch as unknown as { markItemInProgress: (id: string) => Promise<void> }).markItemInProgress('S-001');

    expect(spy).toHaveBeenCalledWith('/tmp/main-repo', '2026-05-05-x', 'S-001', 'in_progress');
  });

  it('resetStaleInProgress targets mainProjectPath', async () => {
    const spy = vi.spyOn(SpecsReader.prototype, 'resetStaleInProgress').mockResolvedValue([]);
    const orch = AutoModeSpecOrchestrator.create(
      '/tmp/spec-worktree',
      '2026-05-05-x',
      'specwright',
      makeStubCtm(),
      2,
      'worktree',
      '/tmp/main-repo',
      'feature/x',
      undefined
    );

    await (orch as unknown as { recoverStaleInProgress: (a: Set<string>) => Promise<void> }).recoverStaleInProgress(new Set());

    expect(spy).toHaveBeenCalledWith('/tmp/main-repo', '2026-05-05-x', new Set());
  });

  it('non-worktree fallback: mainProjectPath undefined collapses to projectPath', async () => {
    const spy = vi.spyOn(SpecsReader.prototype, 'getReadyStories').mockResolvedValue([]);
    const orch = AutoModeSpecOrchestrator.create(
      '/tmp/main-repo',              // projectPath = main
      '2026-05-05-x',
      'specwright',
      makeStubCtm(),
      1,
      'branch',
      undefined,                     // mainProjectPath omitted
      'feature/x',
      undefined
    );

    await (orch as unknown as { getReadySet: (e: Set<string>) => Promise<unknown[]> }).getReadySet(new Set());

    expect(spy.mock.calls[0][0]).toBe('/tmp/main-repo');
  });

  it('getSpecWorkingDirectory still returns the spec-worktree projectPath (for finalize)', () => {
    const orch = AutoModeSpecOrchestrator.create(
      '/tmp/spec-worktree',
      '2026-05-05-x',
      'specwright',
      makeStubCtm(),
      2,
      'worktree',
      '/tmp/main-repo',
      'feature/x',
      undefined
    );
    expect(orch.getSpecWorkingDirectory()).toBe('/tmp/spec-worktree');
    expect(orch.getMainProjectPath()).toBe('/tmp/main-repo');
  });
});

describe('AutoModeBacklogOrchestrator path routing', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getReadyBacklogItems targets mainProjectPath when projectPath differs', async () => {
    const spy = vi.spyOn(BacklogReader.prototype, 'getReadyBacklogItems').mockResolvedValue([]);
    const orch = AutoModeBacklogOrchestrator.create(
      '/tmp/sub-worktree',           // projectPath = sub-worktree (UI-project is a worktree)
      'specwright',
      makeStubCtm(),
      2,
      '/tmp/main-repo'                // mainProjectPath = main
    );

    await (orch as unknown as { getReadySet: (e: Set<string>) => Promise<unknown[]> }).getReadySet(new Set());

    expect(spy.mock.calls[0][0]).toBe('/tmp/main-repo');
  });

  it('markItemInProgress targets mainProjectPath', async () => {
    const spy = vi.spyOn(BacklogReader.prototype, 'markItemInProgress').mockResolvedValue(undefined);
    const orch = AutoModeBacklogOrchestrator.create(
      '/tmp/sub-worktree',
      'specwright',
      makeStubCtm(),
      2,
      '/tmp/main-repo'
    );

    await (orch as unknown as { markItemInProgress: (id: string) => Promise<void> }).markItemInProgress('BUG-007');

    expect(spy).toHaveBeenCalledWith('/tmp/main-repo', 'BUG-007');
  });

  it('non-worktree regression: mainProjectPath omitted collapses to projectPath', async () => {
    const spy = vi.spyOn(BacklogReader.prototype, 'getReadyBacklogItems').mockResolvedValue([]);
    const orch = AutoModeBacklogOrchestrator.create(
      '/tmp/main-repo',
      'specwright',
      makeStubCtm(),
      2
      // mainProjectPath omitted
    );

    await (orch as unknown as { getReadySet: (e: Set<string>) => Promise<unknown[]> }).getReadySet(new Set());

    expect(spy.mock.calls[0][0]).toBe('/tmp/main-repo');
  });
});
