import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import type { WebSocket } from 'ws';
import { PlanReviewOrchestrator } from '../../src/server/services/plan-review-orchestrator.js';
import { getDefaultReviewers } from '../../src/server/model-config.js';
import type { CloudTerminalManager } from '../../src/server/services/cloud-terminal-manager.js';

/**
 * Builds a mock CloudTerminalManager that satisfies the dependencies used by
 * PlanReviewOrchestrator (EventEmitter + a handful of methods). Returns the
 * mock + handles to control session metadata and capture sendInput calls.
 */
function buildMockCtm(
  opts: {
    lastDetectedPlanPath?: string | null;
    sendInputReturns?: boolean;
    /** PTY lifecycle of the mocked session (default active). */
    sessionStatus?: 'active' | 'paused';
    /** Agent status of the mocked session (default working). */
    agentStatus?: 'working' | 'blocked';
  } = {}
) {
  const emitter = new EventEmitter();
  const sendInput = vi.fn().mockReturnValue(opts.sendInputReturns ?? true);
  const reportAgentEvent = vi.fn().mockReturnValue(true);
  const setPlanReviewEnabled = vi.fn();
  const triggerManualReview = vi.fn();
  const waitForIdle = vi.fn().mockResolvedValue(undefined);
  let planPath: string | null = opts.lastDetectedPlanPath ?? null;

  const ctm = Object.assign(emitter, {
    sendInput,
    reportAgentEvent,
    setPlanReviewEnabled,
    triggerManualReview,
    waitForIdle,
    getSession: vi.fn(() => ({
      sessionId: 'sess-1',
      projectPath: '/tmp/project',
      terminalType: 'claude-code' as const,
      status: opts.sessionStatus ?? ('active' as const),
      agentStatus: opts.agentStatus ?? ('working' as const),
      buffer: [],
      createdAt: new Date(),
      lastActivity: new Date(),
      lastDetectedPlanPath: planPath ?? undefined,
    })),
  }) as unknown as CloudTerminalManager;

  return {
    ctm,
    emitter,
    sendInput,
    reportAgentEvent,
    setPlanReviewEnabled,
    setPlanPath: (p: string | null) => {
      planPath = p;
    },
  };
}

function buildOrchestratorWithMockReviewer(ctm: CloudTerminalManager, reviewerOutput = 'Mock reviewer findings') {
  const orchestrator = new PlanReviewOrchestrator(ctm);
  // Inject reviewer mock to avoid real SDK calls
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (orchestrator as any).externalReviewer = {
    reviewPlan: vi.fn().mockResolvedValue(reviewerOutput),
  };
  return orchestrator;
}

async function waitForNextTick(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe('PlanReviewOrchestrator dedup by planPath', () => {
  let mock: ReturnType<typeof buildMockCtm>;

  beforeEach(() => {
    mock = buildMockCtm();
  });

  it('first trigger with a planPath injects review and remembers the path', async () => {
    mock.setPlanPath('/p/foo.md');
    const orch = buildOrchestratorWithMockReviewer(mock.ctm);
    const started = vi.fn();
    const injected = vi.fn();
    orch.on('plan-review:started', started);
    orch.on('plan-review:injected', injected);

    orch.setTabConfig('sess-1', {
      enabled: true,
      reviewers: [{ providerId: 'mock', modelId: 'mock-1' }],
    });

    mock.emitter.emit('session.plan-detected', 'sess-1', 'plan text', 'auto');
    // Let the async handlePlanDetected pipeline drain
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(started).toHaveBeenCalledOnce();
    expect(injected).toHaveBeenCalledOnce();
    expect(mock.sendInput).toHaveBeenCalledOnce();
  });

  it('second trigger with the same planPath is silently skipped (no review, no inject)', async () => {
    mock.setPlanPath('/p/foo.md');
    const orch = buildOrchestratorWithMockReviewer(mock.ctm);
    const started = vi.fn();
    orch.on('plan-review:started', started);

    orch.setTabConfig('sess-1', {
      enabled: true,
      reviewers: [{ providerId: 'mock', modelId: 'mock-1' }],
    });

    mock.emitter.emit('session.plan-detected', 'sess-1', 'plan text', 'auto');
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(started).toHaveBeenCalledTimes(1);
    expect(mock.sendInput).toHaveBeenCalledTimes(1);

    mock.emitter.emit('session.plan-detected', 'sess-1', 'plan text again', 'auto');
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(started).toHaveBeenCalledTimes(1);
    expect(mock.sendInput).toHaveBeenCalledTimes(1);
  });

  it('manual trigger re-reviews the same already-injected planPath (auto would skip)', async () => {
    mock.setPlanPath('/p/foo.md');
    const orch = buildOrchestratorWithMockReviewer(mock.ctm);
    const started = vi.fn();
    orch.on('plan-review:started', started);

    orch.setTabConfig('sess-1', {
      enabled: true,
      reviewers: [{ providerId: 'mock', modelId: 'mock-1' }],
    });

    // First (auto) review injects and remembers /p/foo.md
    mock.emitter.emit('session.plan-detected', 'sess-1', 'plan text', 'auto');
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(started).toHaveBeenCalledTimes(1);

    // An auto re-fire of the same plan is suppressed
    mock.emitter.emit('session.plan-detected', 'sess-1', 'plan text', 'auto');
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(started).toHaveBeenCalledTimes(1);

    // A manual trigger of the SAME plan re-reviews (prev inject landed on wrong focus)
    mock.emitter.emit('session.plan-detected', 'sess-1', 'plan text', 'manual');
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(started).toHaveBeenCalledTimes(2);
    expect(mock.sendInput).toHaveBeenCalledTimes(2);
  });

  it('second trigger with a different planPath runs a fresh review', async () => {
    mock.setPlanPath('/p/foo.md');
    const orch = buildOrchestratorWithMockReviewer(mock.ctm);
    const started = vi.fn();
    orch.on('plan-review:started', started);

    orch.setTabConfig('sess-1', {
      enabled: true,
      reviewers: [{ providerId: 'mock', modelId: 'mock-1' }],
    });

    mock.emitter.emit('session.plan-detected', 'sess-1', 'plan text', 'auto');
    await new Promise((resolve) => setTimeout(resolve, 30));

    mock.setPlanPath('/p/bar.md');
    mock.emitter.emit('session.plan-detected', 'sess-1', 'plan text 2', 'auto');
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(started).toHaveBeenCalledTimes(2);
    expect(mock.sendInput).toHaveBeenCalledTimes(2);
  });

  it('setTabConfig(enabled:false) clears lastInjectedPlanPath so the same plan can be re-reviewed', async () => {
    mock.setPlanPath('/p/foo.md');
    const orch = buildOrchestratorWithMockReviewer(mock.ctm);
    const started = vi.fn();
    orch.on('plan-review:started', started);

    orch.setTabConfig('sess-1', {
      enabled: true,
      reviewers: [{ providerId: 'mock', modelId: 'mock-1' }],
    });
    mock.emitter.emit('session.plan-detected', 'sess-1', 'plan text', 'auto');
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(started).toHaveBeenCalledTimes(1);

    // User toggles plan-review off (should clear remembered path)
    orch.setTabConfig('sess-1', { enabled: false, reviewers: [] });
    // ... then back on with reviewers
    orch.setTabConfig('sess-1', {
      enabled: true,
      reviewers: [{ providerId: 'mock', modelId: 'mock-1' }],
    });

    mock.emitter.emit('session.plan-detected', 'sess-1', 'plan text', 'auto');
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(started).toHaveBeenCalledTimes(2);
  });

  it('does not remember the path when sendInput fails (allows retry on next trigger)', async () => {
    mock = buildMockCtm({ sendInputReturns: false });
    mock.setPlanPath('/p/foo.md');
    const orch = buildOrchestratorWithMockReviewer(mock.ctm);
    const started = vi.fn();
    orch.on('plan-review:started', started);

    orch.setTabConfig('sess-1', {
      enabled: true,
      reviewers: [{ providerId: 'mock', modelId: 'mock-1' }],
    });

    mock.emitter.emit('session.plan-detected', 'sess-1', 'plan text', 'auto');
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(started).toHaveBeenCalledTimes(1);

    mock.emitter.emit('session.plan-detected', 'sess-1', 'plan text retry', 'auto');
    await new Promise((resolve) => setTimeout(resolve, 30));

    // Since sendInput failed first time, lastInjectedPlanPath stays null, retry proceeds
    expect(started).toHaveBeenCalledTimes(2);
  });

  it('removes session state on session.closed (no memory leak)', async () => {
    mock.setPlanPath('/p/foo.md');
    const orch = buildOrchestratorWithMockReviewer(mock.ctm);
    orch.setTabConfig('sess-1', {
      enabled: true,
      reviewers: [{ providerId: 'mock', modelId: 'mock-1' }],
    });

    mock.emitter.emit('session.plan-detected', 'sess-1', 'plan text', 'auto');
    await new Promise((resolve) => setTimeout(resolve, 30));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionsMap = (orch as any).sessions as Map<string, unknown>;
    expect(sessionsMap.has('sess-1')).toBe(true);

    mock.emitter.emit('session.closed', 'sess-1', 0);
    await waitForNextTick();

    expect(sessionsMap.has('sess-1')).toBe(false);
  });
});

describe('PlanReviewOrchestrator sendSnapshot default reviewers', () => {
  function captureSnapshot(orch: PlanReviewOrchestrator, sessionId: string) {
    const sent: string[] = [];
    const ws = { send: (s: string) => sent.push(s) } as unknown as WebSocket;
    orch.sendSnapshot(sessionId, ws);
    expect(sent).toHaveLength(1);
    return JSON.parse(sent[0]) as { type: string; enabled: boolean; reviewers: unknown[] };
  }

  it('seeds the default reviewers for a fresh session without creating state', () => {
    const mock = buildMockCtm();
    const orch = buildOrchestratorWithMockReviewer(mock.ctm);

    const payload = captureSnapshot(orch, 'sess-1');

    expect(payload.type).toBe('plan-review:config.snapshot');
    expect(payload.enabled).toBe(false);
    expect(payload.reviewers).toEqual(getDefaultReviewers());
    expect(payload.reviewers.length).toBeGreaterThan(0);

    // Pure read: must NOT create orphan session state.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionsMap = (orch as any).sessions as Map<string, unknown>;
    expect(sessionsMap.has('sess-1')).toBe(false);
  });

  it('respects an explicit empty selection and never re-seeds it', () => {
    const mock = buildMockCtm();
    const orch = buildOrchestratorWithMockReviewer(mock.ctm);
    // User explicitly cleared all reviewers — this must be preserved.
    orch.setTabConfig('sess-1', { enabled: false, reviewers: [] });

    const payload = captureSnapshot(orch, 'sess-1');

    expect(payload.reviewers).toEqual([]);
  });
});

/**
 * Agent-status side channel: the orchestrator feeds the tab dot / bell / chime
 * through reportAgentEvent() so an injected (or failed) review is noticed like
 * a permission prompt.
 */
describe('PlanReviewOrchestrator agent-status reports', () => {
  const ONE_REVIEWER = { enabled: true, reviewers: [{ providerId: 'mock', modelId: 'mock-1' }] };

  async function run(mock: ReturnType<typeof buildMockCtm>, orch: PlanReviewOrchestrator): Promise<void> {
    orch.setTabConfig('sess-1', ONE_REVIEWER);
    mock.emitter.emit('session.plan-detected', 'sess-1', 'plan text', 'auto');
    await new Promise((resolve) => setTimeout(resolve, 30));
  }

  it('reports review-injected after a successful inject, before plan-review:injected, without unblock inference', async () => {
    const mock = buildMockCtm({ lastDetectedPlanPath: '/p/foo.md' });
    const orch = buildOrchestratorWithMockReviewer(mock.ctm);
    const injected = vi.fn();
    orch.on('plan-review:injected', injected);

    await run(mock, orch);

    expect(mock.sendInput).toHaveBeenCalledWith('sess-1', expect.stringMatching(/\n$/), { inferUnblock: false });
    expect(mock.reportAgentEvent).toHaveBeenCalledOnce();
    expect(mock.reportAgentEvent).toHaveBeenCalledWith('sess-1', 'review-injected', {
      reason: 'Plan-Review eingefügt (1/1 Reviewer)',
    });
    expect(mock.reportAgentEvent.mock.invocationCallOrder[0]).toBeGreaterThan(mock.sendInput.mock.invocationCallOrder[0]);
    expect(mock.reportAgentEvent.mock.invocationCallOrder[0]).toBeLessThan(injected.mock.invocationCallOrder[0]);
  });

  it('counts fulfilled vs selected reviewers in the reason', async () => {
    const mock = buildMockCtm({ lastDetectedPlanPath: '/p/foo.md' });
    const orch = new PlanReviewOrchestrator(mock.ctm);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (orch as any).externalReviewer = {
      reviewPlan: vi
        .fn()
        .mockResolvedValueOnce('Finding A')
        .mockRejectedValueOnce(new Error('timeout')),
    };
    orch.setTabConfig('sess-1', {
      enabled: true,
      reviewers: [
        { providerId: 'mock', modelId: 'mock-1' },
        { providerId: 'mock2', modelId: 'mock-2' },
      ],
    });
    mock.emitter.emit('session.plan-detected', 'sess-1', 'plan text', 'auto');
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(mock.reportAgentEvent).toHaveBeenCalledWith('sess-1', 'review-injected', {
      reason: 'Plan-Review eingefügt (1/2 Reviewer)',
    });
  });

  it('does not report when sendInput fails', async () => {
    const mock = buildMockCtm({ lastDetectedPlanPath: '/p/foo.md', sendInputReturns: false });
    const orch = buildOrchestratorWithMockReviewer(mock.ctm);

    await run(mock, orch);

    expect(mock.reportAgentEvent).not.toHaveBeenCalled();
  });

  it('reports review-failed when every reviewer fails and the session is blocked (plan dialog open)', async () => {
    const mock = buildMockCtm({ lastDetectedPlanPath: '/p/foo.md', agentStatus: 'blocked' });
    const orch = new PlanReviewOrchestrator(mock.ctm);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (orch as any).externalReviewer = { reviewPlan: vi.fn().mockRejectedValue(new Error('boom')) };
    const error = vi.fn();
    orch.on('plan-review:error', error);

    await run(mock, orch);

    expect(error).toHaveBeenCalledWith('sess-1', 'All reviewers failed');
    expect(mock.sendInput).not.toHaveBeenCalled();
    expect(mock.reportAgentEvent).toHaveBeenCalledOnce();
    expect(mock.reportAgentEvent).toHaveBeenCalledWith('sess-1', 'review-failed', {
      reason: 'Plan-Review fehlgeschlagen (0/1 Reviewer)',
    });
  });

  it('stays silent on total failure when the session is not blocked (nothing provably waits)', async () => {
    const mock = buildMockCtm({ lastDetectedPlanPath: '/p/foo.md', agentStatus: 'working' });
    const orch = new PlanReviewOrchestrator(mock.ctm);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (orch as any).externalReviewer = { reviewPlan: vi.fn().mockRejectedValue(new Error('boom')) };
    const error = vi.fn();
    orch.on('plan-review:error', error);

    await run(mock, orch);

    expect(error).toHaveBeenCalledOnce();
    expect(mock.reportAgentEvent).not.toHaveBeenCalled();
  });

  it('never reports for a session whose PTY is not active', async () => {
    const paused = buildMockCtm({ lastDetectedPlanPath: '/p/foo.md', sessionStatus: 'paused', agentStatus: 'blocked' });
    await run(paused, buildOrchestratorWithMockReviewer(paused.ctm));
    expect(paused.reportAgentEvent).not.toHaveBeenCalled();

    const pausedFail = buildMockCtm({ lastDetectedPlanPath: '/p/foo.md', sessionStatus: 'paused', agentStatus: 'blocked' });
    const orch = new PlanReviewOrchestrator(pausedFail.ctm);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (orch as any).externalReviewer = { reviewPlan: vi.fn().mockRejectedValue(new Error('boom')) };
    await run(pausedFail, orch);
    expect(pausedFail.reportAgentEvent).not.toHaveBeenCalled();
  });

  it('does not report on a lock collision (a review is still running)', async () => {
    const mock = buildMockCtm({ lastDetectedPlanPath: '/p/foo.md', agentStatus: 'blocked' });
    const orch = new PlanReviewOrchestrator(mock.ctm);
    let release: (v: string) => void = () => {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (orch as any).externalReviewer = {
      reviewPlan: vi.fn().mockImplementation(() => new Promise<string>((resolve) => { release = resolve; })),
    };
    const error = vi.fn();
    orch.on('plan-review:error', error);
    orch.setTabConfig('sess-1', ONE_REVIEWER);

    mock.emitter.emit('session.plan-detected', 'sess-1', 'plan text', 'auto');
    await new Promise((resolve) => setTimeout(resolve, 10));
    mock.emitter.emit('session.plan-detected', 'sess-1', 'plan text', 'manual');
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(error).toHaveBeenCalledWith('sess-1', 'Review already in progress for this session');
    expect(mock.reportAgentEvent).not.toHaveBeenCalled();

    release('Findings');
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(mock.reportAgentEvent).toHaveBeenCalledOnce();
    expect(mock.reportAgentEvent).toHaveBeenCalledWith('sess-1', 'review-injected', expect.anything());
  });
});
