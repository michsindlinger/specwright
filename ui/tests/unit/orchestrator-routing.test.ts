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

// ============================================================================
// resolveSlotProjectPath — sub-worktree creation in parallel mode (v3.27.4)
// ============================================================================

describe('AutoModeSpecOrchestrator.resolveSlotProjectPath (v3.27.4 hardening)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function callResolve(orch: AutoModeSpecOrchestrator, itemId: string): Promise<string> {
    return (orch as unknown as { resolveSlotProjectPath: (item: { id: string; title: string }) => Promise<string> })
      .resolveSlotProjectPath({ id: itemId, title: itemId });
  }

  it('parallel mode + missing worktreeOps → halt + incident + throw', async () => {
    const incidentSpy = vi.spyOn(SpecsReader.prototype, 'setAutoModeIncident').mockResolvedValue(undefined);
    const orch = AutoModeSpecOrchestrator.create(
      '/tmp/spec-worktree',
      '2026-05-05-x',
      'specwright',
      makeStubCtm(),
      2,                  // maxConcurrent > 1 (parallel)
      'worktree',
      '/tmp/main-repo',
      'feature/x',
      undefined           // worktreeOps missing
    );
    const haltSpy = vi.spyOn(orch, 'haltScheduling').mockImplementation(() => {});

    await expect(callResolve(orch, 'WCAG-012')).rejects.toThrow();
    expect(haltSpy).toHaveBeenCalledTimes(1);
    expect(incidentSpy).toHaveBeenCalledTimes(1);
    const incident = incidentSpy.mock.calls[0][2] as { type: string; storyId: string; message: string };
    expect(incident.type).toBe('error');
    expect(incident.storyId).toBe('WCAG-012');
    expect(incident.message).toContain('Per-story worktree konnte nicht erstellt werden');
  });

  it('serial mode + missing worktreeOps → silent fallback to projectPath (no halt)', async () => {
    const incidentSpy = vi.spyOn(SpecsReader.prototype, 'setAutoModeIncident').mockResolvedValue(undefined);
    const orch = AutoModeSpecOrchestrator.create(
      '/tmp/spec-worktree',
      '2026-05-05-x',
      'specwright',
      makeStubCtm(),
      1,                  // maxConcurrent = 1 (serial — fallback safe)
      'worktree',
      '/tmp/main-repo',
      'feature/x',
      undefined
    );
    const haltSpy = vi.spyOn(orch, 'haltScheduling').mockImplementation(() => {});

    const path = await callResolve(orch, 'WCAG-012');
    expect(path).toBe('/tmp/spec-worktree');
    expect(haltSpy).not.toHaveBeenCalled();
    expect(incidentSpy).not.toHaveBeenCalled();
  });

  it('parallel mode + createStoryWorktree throws → halt + incident + rethrow', async () => {
    const incidentSpy = vi.spyOn(SpecsReader.prototype, 'setAutoModeIncident').mockResolvedValue(undefined);
    const failingWorktreeOps = {
      createStoryWorktree: vi.fn().mockRejectedValue(new Error('git worktree add failed')),
      removeStoryWorktree: vi.fn().mockResolvedValue(undefined),
      mergeStoryBranchIntoSpec: vi.fn().mockResolvedValue(undefined),
    };
    const orch = AutoModeSpecOrchestrator.create(
      '/tmp/spec-worktree',
      '2026-05-05-x',
      'specwright',
      makeStubCtm(),
      2,
      'worktree',
      '/tmp/main-repo',
      'feature/x',
      failingWorktreeOps
    );
    const haltSpy = vi.spyOn(orch, 'haltScheduling').mockImplementation(() => {});

    await expect(callResolve(orch, 'WCAG-012')).rejects.toThrow('git worktree add failed');
    expect(haltSpy).toHaveBeenCalledTimes(1);
    expect(incidentSpy).toHaveBeenCalledTimes(1);
    const incident = incidentSpy.mock.calls[0][2] as { storyId: string; message: string };
    expect(incident.storyId).toBe('WCAG-012');
    expect(incident.message).toContain('git worktree add failed');
  });

  it('serial mode + createStoryWorktree throws → silent fallback (no halt)', async () => {
    const incidentSpy = vi.spyOn(SpecsReader.prototype, 'setAutoModeIncident').mockResolvedValue(undefined);
    const failingWorktreeOps = {
      createStoryWorktree: vi.fn().mockRejectedValue(new Error('boom')),
      removeStoryWorktree: vi.fn().mockResolvedValue(undefined),
      mergeStoryBranchIntoSpec: vi.fn().mockResolvedValue(undefined),
    };
    const orch = AutoModeSpecOrchestrator.create(
      '/tmp/spec-worktree',
      '2026-05-05-x',
      'specwright',
      makeStubCtm(),
      1,                  // serial
      'worktree',
      '/tmp/main-repo',
      'feature/x',
      failingWorktreeOps
    );
    const haltSpy = vi.spyOn(orch, 'haltScheduling').mockImplementation(() => {});

    const path = await callResolve(orch, 'WCAG-012');
    expect(path).toBe('/tmp/spec-worktree');
    expect(haltSpy).not.toHaveBeenCalled();
    expect(incidentSpy).not.toHaveBeenCalled();
  });

  it('parallel mode + createStoryWorktree succeeds → returns sub-worktree path', async () => {
    const ops = {
      createStoryWorktree: vi.fn().mockResolvedValue('/tmp/sub-worktree-WCAG-012'),
      removeStoryWorktree: vi.fn().mockResolvedValue(undefined),
      mergeStoryBranchIntoSpec: vi.fn().mockResolvedValue(undefined),
    };
    const orch = AutoModeSpecOrchestrator.create(
      '/tmp/spec-worktree',
      '2026-05-05-x',
      'specwright',
      makeStubCtm(),
      2,
      'worktree',
      '/tmp/main-repo',
      'feature/x',
      ops
    );

    const path = await callResolve(orch, 'WCAG-012');
    expect(path).toBe('/tmp/sub-worktree-WCAG-012');
    expect(ops.createStoryWorktree).toHaveBeenCalledWith('/tmp/main-repo', '2026-05-05-x', 'WCAG-012');
  });

  it('non-worktree gitStrategy → returns projectPath without calling worktreeOps', async () => {
    const ops = {
      createStoryWorktree: vi.fn(),
      removeStoryWorktree: vi.fn(),
      mergeStoryBranchIntoSpec: vi.fn(),
    };
    const orch = AutoModeSpecOrchestrator.create(
      '/tmp/main-repo',
      '2026-05-05-x',
      'specwright',
      makeStubCtm(),
      2,
      'branch',           // not worktree
      undefined,
      'feature/x',
      ops
    );

    const path = await callResolve(orch, 'WCAG-012');
    expect(path).toBe('/tmp/main-repo');
    expect(ops.createStoryWorktree).not.toHaveBeenCalled();
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
