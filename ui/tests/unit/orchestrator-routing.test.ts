import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';
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

// D15 / v3.28.4: AutoModeSpecOrchestrator.create() force-downs maxConcurrent
// to 1 when gitStrategy='worktree'. Tests for parallel-mode behavior bypass
// the force-down by constructing via ctor directly. Production uses .create().
function makeParallelWorktreeOrch(opts: {
  worktreeOps?: import('../../src/server/services/auto-mode-spec-orchestrator.js').SpecWorktreeOps;
  maxConcurrent?: number;
  specBranch?: string;
}): AutoModeSpecOrchestrator {
  return new AutoModeSpecOrchestrator({
    projectPath: '/tmp/spec-worktree',
    mainProjectPath: '/tmp/main-repo',
    kanbanPath: '/tmp/main-repo/specwright/specs/2026-05-05-x',
    watchFilename: 'kanban.json',
    maxConcurrent: opts.maxConcurrent ?? 2,
    commandPrefix: 'specwright',
    cloudTerminalManager: makeStubCtm(),
    specId: '2026-05-05-x',
    gitStrategy: 'worktree',
    specBranch: opts.specBranch,
    worktreeOps: opts.worktreeOps,
  });
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
    const orch = makeParallelWorktreeOrch({ specBranch: 'feature/x', worktreeOps: undefined });
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
    const orch = makeParallelWorktreeOrch({ specBranch: 'feature/x', worktreeOps: failingWorktreeOps });
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
    const orch = makeParallelWorktreeOrch({ specBranch: 'feature/x', worktreeOps: ops });

    const path = await callResolve(orch, 'WCAG-012');
    expect(path).toBe('/tmp/sub-worktree-WCAG-012');
    expect(ops.createStoryWorktree).toHaveBeenCalledWith('/tmp/main-repo', '2026-05-05-x', 'WCAG-012', 'feature/x');
  });

  it('parallel mode + missing specBranch → halt + incident (BPAM-011 strict-failure)', async () => {
    const incidentSpy = vi.spyOn(SpecsReader.prototype, 'setAutoModeIncident').mockResolvedValue(undefined);
    const ops = {
      createStoryWorktree: vi.fn(),
      removeStoryWorktree: vi.fn().mockResolvedValue(undefined),
      mergeStoryBranchIntoSpec: vi.fn().mockResolvedValue(undefined),
    };
    const orch = makeParallelWorktreeOrch({ specBranch: undefined, worktreeOps: ops });
    const haltSpy = vi.spyOn(orch, 'haltScheduling').mockImplementation(() => {});

    await expect(callResolve(orch, 'WCAG-012')).rejects.toThrow(/specBranch/);
    expect(ops.createStoryWorktree).not.toHaveBeenCalled();
    expect(haltSpy).toHaveBeenCalledTimes(1);
    expect(incidentSpy).toHaveBeenCalledTimes(1);
  });

  it('v3.30: D15-clamp removed → maxConcurrent>1 + worktree preserves parallel mode (caller-controlled)', async () => {
    // Previously create() forced maxConcurrent=1 when gitStrategy=worktree (D15 safety).
    // From v3.30 the caller (workflow-executor) resolves the effective value from
    // user-input + settings and create() must respect it. With max=5 + worktree and
    // no worktreeOps, the parallel-mode invariant kicks in: isParallel=true → halt
    // with "no worktreeOps configured" (instead of silent serial-fallback).
    const incidentSpy = vi.spyOn(SpecsReader.prototype, 'setAutoModeIncident').mockResolvedValue(undefined);
    const orchNoOps = AutoModeSpecOrchestrator.create(
      '/tmp/spec-worktree',
      '2026-05-05-x',
      'specwright',
      makeStubCtm(),
      5,                  // user requested parallel — must NOT be clamped to 1
      'worktree',
      '/tmp/main-repo',
      'feature/x',
      undefined           // no worktreeOps
    );
    const haltSpy = vi.spyOn(orchNoOps, 'haltScheduling').mockImplementation(() => {});
    await expect(callResolve(orchNoOps, 'WCAG-012')).rejects.toThrow(/no worktreeOps/);
    expect(haltSpy).toHaveBeenCalledTimes(1);
    expect(incidentSpy).toHaveBeenCalledTimes(1);
  });

  it('serial mode + missing specBranch → silent fallback to projectPath', async () => {
    const incidentSpy = vi.spyOn(SpecsReader.prototype, 'setAutoModeIncident').mockResolvedValue(undefined);
    const ops = {
      createStoryWorktree: vi.fn(),
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
      undefined,
      ops
    );
    const haltSpy = vi.spyOn(orch, 'haltScheduling').mockImplementation(() => {});

    const path = await callResolve(orch, 'WCAG-012');
    expect(path).toBe('/tmp/spec-worktree');
    expect(ops.createStoryWorktree).not.toHaveBeenCalled();
    expect(haltSpy).not.toHaveBeenCalled();
    expect(incidentSpy).not.toHaveBeenCalled();
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

// ============================================================================
// onItemFailed cleanliness gate (BPAM-007)
// ============================================================================

describe('AutoModeSpecOrchestrator.onItemFailed cleanliness gate (BPAM-007)', () => {
  let tmpDir: string;
  let cleanWtPath: string;
  let dirtyWtPath: string;

  beforeEach(async () => {
    vi.restoreAllMocks();
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'onfail-gate-'));

    // Clean git repo — `isWorktreeClean` returns true
    cleanWtPath = join(tmpDir, 'clean-wt');
    await fs.mkdir(cleanWtPath, { recursive: true });
    execSync('git init -q', { cwd: cleanWtPath });
    execSync('git config user.email test@test.com', { cwd: cleanWtPath });
    execSync('git config user.name test', { cwd: cleanWtPath });
    await fs.writeFile(join(cleanWtPath, 'README.md'), 'init');
    execSync('git add . && git commit -q -m init', { cwd: cleanWtPath });

    // Dirty git repo — has uncommitted file; `isWorktreeClean` returns false
    dirtyWtPath = join(tmpDir, 'dirty-wt');
    await fs.mkdir(dirtyWtPath, { recursive: true });
    execSync('git init -q', { cwd: dirtyWtPath });
    execSync('git config user.email test@test.com', { cwd: dirtyWtPath });
    execSync('git config user.name test', { cwd: dirtyWtPath });
    await fs.writeFile(join(dirtyWtPath, 'README.md'), 'init');
    execSync('git add . && git commit -q -m init', { cwd: dirtyWtPath });
    await fs.writeFile(join(dirtyWtPath, 'uncommitted.txt'), 'dirty work left by LLM');
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  function makeOrch(wtPath: string) {
    const removeSpy = vi.fn().mockResolvedValue(undefined);
    const worktreeOps = {
      createStoryWorktree: vi.fn().mockResolvedValue(wtPath),
      removeStoryWorktree: removeSpy,
      mergeStoryBranchIntoSpec: vi.fn().mockResolvedValue(undefined),
    };
    const orch = AutoModeSpecOrchestrator.create(
      '/tmp/spec-wt',
      '2026-05-05-x',
      'specwright',
      makeStubCtm(),
      2,
      'worktree',
      '/tmp/main-repo',
      'feature/x',
      worktreeOps
    );
    // Inject the story worktree path as if resolveSlotProjectPath had already run
    (orch as unknown as { storyWorktrees: Map<string, string> }).storyWorktrees.set('T-001', wtPath);
    return { orch, removeSpy };
  }

  it('dirty worktree: sets incident, emits story.dirty-worktree, halts, skips removeStoryWorktree', async () => {
    const incidentSpy = vi.spyOn(SpecsReader.prototype, 'setAutoModeIncident').mockResolvedValue(undefined);
    const { orch, removeSpy } = makeOrch(dirtyWtPath);
    const haltSpy = vi.spyOn(orch, 'haltScheduling').mockImplementation(() => {});
    const schedSpy = vi.spyOn(orch, 'scheduleTick').mockResolvedValue(undefined);

    const emitted: unknown[][] = [];
    orch.on('story.dirty-worktree', (...args) => emitted.push(args));

    await (orch as unknown as { onItemFailed: (id: string, err: string) => Promise<void> })
      .onItemFailed('T-001', 'execution failed');

    // Incident must be recorded
    expect(incidentSpy).toHaveBeenCalledTimes(1);
    const incident = incidentSpy.mock.calls[0][2] as { type: string; storyId: string; message: string };
    expect(incident.type).toBe('error');
    expect(incident.storyId).toBe('T-001');
    expect(incident.message).toContain('uncommittete Änderungen');

    // Event emitted so UI can surface the incident
    expect(emitted).toHaveLength(1);
    expect(emitted[0][0]).toBe('T-001');   // itemId
    expect(emitted[0][1]).toBe(dirtyWtPath); // wtPath

    // Scheduling halted — dirty worktree must not be silently discarded
    expect(haltSpy).toHaveBeenCalledTimes(1);

    // Worktree NOT removed — user needs to inspect and recover data
    expect(removeSpy).not.toHaveBeenCalled();

    // No further tick scheduled
    expect(schedSpy).not.toHaveBeenCalled();
  });

  it('clean worktree: removes worktree, schedules next tick, no incident', async () => {
    const incidentSpy = vi.spyOn(SpecsReader.prototype, 'setAutoModeIncident').mockResolvedValue(undefined);
    const { orch, removeSpy } = makeOrch(cleanWtPath);
    const haltSpy = vi.spyOn(orch, 'haltScheduling').mockImplementation(() => {});
    const schedSpy = vi.spyOn(orch, 'scheduleTick').mockResolvedValue(undefined);

    await (orch as unknown as { onItemFailed: (id: string, err: string) => Promise<void> })
      .onItemFailed('T-001', 'execution failed');

    // Clean failure → remove worktree, continue scheduling
    expect(removeSpy).toHaveBeenCalledWith('/tmp/main-repo', cleanWtPath);
    expect(schedSpy).toHaveBeenCalledTimes(1);

    // No halt, no incident for a clean failure
    expect(haltSpy).not.toHaveBeenCalled();
    expect(incidentSpy).not.toHaveBeenCalled();
  });

  it('D16 onItemCompleted: dirty worktree → auto-commit + merge (no halt)', async () => {
    const incidentSpy = vi.spyOn(SpecsReader.prototype, 'setAutoModeIncident').mockResolvedValue(undefined);
    const updateStatusSpy = vi.spyOn(SpecsReader.prototype, 'updateStoryStatus').mockResolvedValue(undefined);
    const clearIncidentSpy = vi.spyOn(SpecsReader.prototype, 'clearAutoModeIncident').mockResolvedValue(undefined);
    const mergeSpy = vi.fn().mockResolvedValue(undefined);
    const removeSpy = vi.fn().mockResolvedValue(undefined);
    const worktreeOps = {
      createStoryWorktree: vi.fn().mockResolvedValue(dirtyWtPath),
      removeStoryWorktree: removeSpy,
      mergeStoryBranchIntoSpec: mergeSpy,
    };
    const orch = AutoModeSpecOrchestrator.create(
      '/tmp/spec-wt',
      '2026-05-05-x',
      'specwright',
      makeStubCtm(),
      1,
      'worktree',
      '/tmp/main-repo',
      'feature/x',
      worktreeOps
    );
    (orch as unknown as { storyWorktrees: Map<string, string> }).storyWorktrees.set('T-001', dirtyWtPath);
    const haltSpy = vi.spyOn(orch, 'haltScheduling').mockImplementation(() => {});
    const schedSpy = vi.spyOn(orch, 'scheduleTick').mockResolvedValue(undefined);
    // commitMainKanbanIfDirty hits real git on mainProjectPath which doesn't
    // exist; mock it out — this test focuses on the dirty-gate auto-commit.
    vi.doMock('../../src/server/utils/worktree-story.js', async (orig) => {
      const actual = await orig() as Record<string, unknown>;
      return { ...actual, commitMainKanbanIfDirty: vi.fn().mockResolvedValue(undefined) };
    });

    await (orch as unknown as { onItemCompleted: (id: string) => Promise<void> })
      .onItemCompleted('T-001');

    // Auto-commit happened — worktree now clean
    const status = execSync('git status --porcelain', { cwd: dirtyWtPath, encoding: 'utf-8' }).trim();
    expect(status).toBe('');
    // Last commit message identifies as D16 auto-commit
    const lastMsg = execSync('git log -1 --pretty=%s', { cwd: dirtyWtPath, encoding: 'utf-8' }).trim();
    expect(lastMsg).toContain('T-001');
    expect(lastMsg).toContain('D16');

    // No halt, no dirty incident — orchestrator proceeds to merge
    expect(haltSpy).not.toHaveBeenCalled();
    expect(incidentSpy).not.toHaveBeenCalled();
    expect(mergeSpy).toHaveBeenCalledTimes(1);

    // Suppress unused-var warnings
    void updateStatusSpy; void clearIncidentSpy; void schedSpy;
  });

  it('no worktree registered for story: schedules next tick only (no-op worktree path)', async () => {
    const incidentSpy = vi.spyOn(SpecsReader.prototype, 'setAutoModeIncident').mockResolvedValue(undefined);
    const removeSpy = vi.fn().mockResolvedValue(undefined);
    const worktreeOps = {
      createStoryWorktree: vi.fn(),
      removeStoryWorktree: removeSpy,
      mergeStoryBranchIntoSpec: vi.fn(),
    };
    const orch = AutoModeSpecOrchestrator.create(
      '/tmp/spec-wt',
      '2026-05-05-x',
      'specwright',
      makeStubCtm(),
      2,
      'worktree',
      '/tmp/main-repo',
      'feature/x',
      worktreeOps
    );
    // No entry in storyWorktrees for T-002
    const schedSpy = vi.spyOn(orch, 'scheduleTick').mockResolvedValue(undefined);

    await (orch as unknown as { onItemFailed: (id: string, err: string) => Promise<void> })
      .onItemFailed('T-002', 'fail');

    expect(removeSpy).not.toHaveBeenCalled();
    expect(incidentSpy).not.toHaveBeenCalled();
    expect(schedSpy).toHaveBeenCalledTimes(1);
  });
});
