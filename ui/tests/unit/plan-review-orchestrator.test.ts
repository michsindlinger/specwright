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
    /** Hook reason of the mocked session, e.g. 'Berechtigung: ExitPlanMode'. */
    agentStatusReason?: string;
  } = {}
) {
  const emitter = new EventEmitter();
  const sendInput = vi.fn().mockReturnValue(opts.sendInputReturns ?? true);
  const reportAgentEvent = vi.fn().mockReturnValue(true);
  // Default: a live screen without a plan dialog → the REPL inject path.
  const readScreen = vi.fn().mockResolvedValue({ text: '', live: true });
  const setPlanReviewEnabled = vi.fn();
  const triggerManualReview = vi.fn();
  const waitForIdle = vi.fn().mockResolvedValue(undefined);
  let planPath: string | null = opts.lastDetectedPlanPath ?? null;

  const ctm = Object.assign(emitter, {
    sendInput,
    reportAgentEvent,
    readScreen,
    setPlanReviewEnabled,
    triggerManualReview,
    waitForIdle,
    getSession: vi.fn(() => ({
      sessionId: 'sess-1',
      projectPath: '/tmp/project',
      terminalType: 'claude-code' as const,
      status: opts.sessionStatus ?? ('active' as const),
      agentStatus: opts.agentStatus ?? ('working' as const),
      agentStatusReason: opts.agentStatusReason,
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
    readScreen,
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

/**
 * Inject into Claude's plan dialog: the dialog drops typed text unless the
 * free-text option is focused. A fake dialog reacts to the keys the
 * orchestrator sends and renders what a tmux capture would show.
 */
describe('PlanReviewOrchestrator inject into the plan dialog', () => {
  const DOWN = '\x1b[B';
  const UP = '\x1b[A';
  const LABELS = ['Yes, and switch to BYPASS PERMISSIONS', 'Yes, manually approve edits', 'Tell Claude what to change'];
  const ONE = { enabled: true, reviewers: [{ providerId: 'mock', modelId: 'mock-1' }] };
  type Mock = ReturnType<typeof buildMockCtm>;
  interface Behaviour { frozen?: boolean; dropText?: boolean; labels?: string[] }

  const render = (labels: string[], focus: number) => ({
    text: [' Would you like to proceed?', ...labels.map((l, i) => ` ${i + 1 === focus ? '❯' : ' '} ${i + 1}. ${l}`)].join('\n'),
    live: true,
  });

  /** Arrow keys move the pointer (unless frozen); text lands in the free-text option only when it is focused. */
  function fakeDialog(mock: Mock, start: number, b: Behaviour = {}): Behaviour {
    const labels = [...(b.labels ?? LABELS)];
    const free = labels.indexOf('Tell Claude what to change') + 1;
    let focus = start;
    mock.sendInput.mockImplementation((_id: string, data: string) => {
      if (data === DOWN) {
        if (!b.frozen) focus = Math.min(focus + 1, labels.length);
      } else if (data === UP) {
        if (!b.frozen) focus = Math.max(focus - 1, 1);
      } else if (focus === free && !b.dropText) {
        labels[free - 1] = data.split('\n')[0];
      }
      return true;
    });
    mock.readScreen.mockImplementation(async () => render(labels, focus));
    return b;
  }

  function setup(opts: Parameters<typeof buildMockCtm>[0] = {}) {
    const mock = buildMockCtm({
      lastDetectedPlanPath: '/p/foo.md',
      agentStatus: 'blocked',
      agentStatusReason: 'Berechtigung: ExitPlanMode',
      ...opts,
    });
    const orch = new PlanReviewOrchestrator(mock.ctm);
    const reviewPlan = vi.fn().mockResolvedValue('Mock reviewer findings');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (orch as any).externalReviewer = { reviewPlan };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (orch as any).sleep = () => Promise.resolve();
    const started = vi.fn();
    const injected = vi.fn();
    const error = vi.fn();
    orch.on('plan-review:started', started);
    orch.on('plan-review:injected', injected);
    orch.on('plan-review:error', error);
    orch.setTabConfig('sess-1', ONE);
    return { mock, orch, reviewPlan, started, injected, error };
  }

  async function trigger(mock: Mock, source: 'auto' | 'manual' = 'auto'): Promise<void> {
    mock.emitter.emit('session.plan-detected', 'sess-1', 'plan text', source);
    await new Promise((resolve) => setTimeout(resolve, 30));
  }

  const sent = (mock: Mock): string[] => mock.sendInput.mock.calls.map((c: unknown[]) => c[1] as string);
  const keys = (mock: Mock): string[] => sent(mock).filter((d) => d === DOWN || d === UP);
  const texts = (mock: Mock): string[] => sent(mock).filter((d) => d !== DOWN && d !== UP);

  it('moves the pointer from option 1 to 3 key by key, types without a newline, verifies, reports', async () => {
    const t = setup();
    fakeDialog(t.mock, 1);
    await trigger(t.mock);

    expect(keys(t.mock)).toEqual([DOWN, DOWN]);
    expect(texts(t.mock)).toHaveLength(1);
    expect(texts(t.mock)[0].startsWith('Please address these issues')).toBe(true);
    expect(texts(t.mock)[0].endsWith('\n')).toBe(false);
    const lastKey = t.mock.sendInput.mock.calls.findLastIndex((c: unknown[]) => c[1] === DOWN);
    const textAt = t.mock.sendInput.mock.calls.findIndex((c: unknown[]) => c[1] !== DOWN);
    expect(textAt).toBeGreaterThan(lastKey);
    for (const call of t.mock.sendInput.mock.calls) expect(call[2]).toEqual({ inferUnblock: false });

    expect(t.error).not.toHaveBeenCalled();
    expect(t.injected).toHaveBeenCalledWith('sess-1', true);
    expect(t.mock.reportAgentEvent).toHaveBeenCalledWith('sess-1', 'review-injected', {
      reason: 'Plan-Review eingefügt (1/1 Reviewer)',
    });
  });

  it('sends no keys when the free-text option is focused already, and goes up when it is below', async () => {
    const at3 = setup();
    fakeDialog(at3.mock, 3);
    await trigger(at3.mock);
    expect(keys(at3.mock)).toEqual([]);
    expect(at3.injected).toHaveBeenCalledWith('sess-1', true);

    const below = setup();
    fakeDialog(below.mock, 4, { labels: ['Yes', 'Yes, manually', 'Tell Claude what to change', 'Something new'] });
    await trigger(below.mock);
    expect(keys(below.mock)).toEqual([UP]);
    expect(below.injected).toHaveBeenCalledWith('sess-1', true);
  });

  it('never types when the pointer does not move: bounded keys, focus error, review kept', async () => {
    const t = setup();
    fakeDialog(t.mock, 1, { frozen: true });
    await trigger(t.mock);

    expect(keys(t.mock)).toEqual([DOWN, DOWN, DOWN]);
    expect(texts(t.mock)).toEqual([]);
    expect(t.injected).not.toHaveBeenCalled();
    expect(t.error).toHaveBeenCalledWith('sess-1', expect.stringContaining('nothing was typed'));
    expect(t.mock.reportAgentEvent).toHaveBeenCalledWith('sess-1', 'review-failed', {
      reason: 'Plan-Review nicht angekommen (1/1 Reviewer)',
    });
  });

  it('hook says the dialog is open but the screen is unreadable: nothing typed', async () => {
    const t = setup();
    await trigger(t.mock);

    expect(sent(t.mock)).toEqual([]);
    expect(t.error).toHaveBeenCalledWith('sess-1', expect.stringContaining('could not be read'));
    expect(t.injected).not.toHaveBeenCalled();
  });

  it('screen reads that never settle: nothing typed, no keys', async () => {
    const t = setup();
    let i = 0;
    t.mock.readScreen.mockImplementation(async () => render(LABELS, (i++ % 2) + 1));
    await trigger(t.mock);

    expect(sent(t.mock)).toEqual([]);
    expect(t.error).toHaveBeenCalledWith('sess-1', expect.stringContaining('could not be read'));
  });

  it('navigates from the settled state after unstable first reads', async () => {
    const t = setup();
    fakeDialog(t.mock, 1);
    t.mock.readScreen
      .mockResolvedValueOnce(render(LABELS, 1))
      .mockResolvedValueOnce(render(LABELS, 2))
      .mockResolvedValueOnce(render(LABELS, 1));
    await trigger(t.mock);

    expect(keys(t.mock)).toEqual([DOWN, DOWN]);
    expect(t.injected).toHaveBeenCalledWith('sess-1', true);
  });

  it('no dialog by hook or screen (REPL): typed with a newline, unverified', async () => {
    const t = setup({ agentStatus: 'working', agentStatusReason: undefined });
    await trigger(t.mock);

    expect(keys(t.mock)).toEqual([]);
    expect(texts(t.mock)).toHaveLength(1);
    expect(texts(t.mock)[0].endsWith('\n')).toBe(true);
    expect(t.injected).toHaveBeenCalledWith('sess-1', false);
  });

  it('text not visible in the option after typing: error, not injected, path not remembered', async () => {
    const t = setup();
    fakeDialog(t.mock, 3, { dropText: true });
    await trigger(t.mock);

    expect(texts(t.mock)).toHaveLength(1);
    expect(t.injected).not.toHaveBeenCalled();
    expect(t.error).toHaveBeenCalledWith('sess-1', expect.stringContaining('did not show up in option 3'));

    // Not remembered as injected: the next automatic detection reviews again.
    await trigger(t.mock);
    expect(t.reviewPlan).toHaveBeenCalledTimes(2);
  });

  it('a manual trigger re-injects a review that did not land — without another reviewer run', async () => {
    const t = setup();
    const b = fakeDialog(t.mock, 3, { dropText: true });
    await trigger(t.mock);
    expect(t.error).toHaveBeenCalledOnce();

    b.dropText = false;
    await trigger(t.mock, 'manual');
    expect(t.reviewPlan).toHaveBeenCalledOnce();
    expect(t.started).toHaveBeenCalledTimes(2);
    expect(t.started).toHaveBeenLastCalledWith('sess-1', 'manual', 1);
    expect(t.injected).toHaveBeenCalledWith('sess-1', true);

    // Delivered → cache cleared: the next manual trigger reviews afresh.
    await trigger(t.mock, 'manual');
    expect(t.reviewPlan).toHaveBeenCalledTimes(2);
  });

  it('turning auto-review off drops a pending review', async () => {
    const t = setup();
    fakeDialog(t.mock, 3, { dropText: true });
    await trigger(t.mock);
    t.orch.setTabConfig('sess-1', { ...ONE, enabled: false });
    t.orch.setTabConfig('sess-1', ONE);

    await trigger(t.mock, 'manual');
    expect(t.reviewPlan).toHaveBeenCalledTimes(2);
  });

  it('inactive session: nothing sent, not-active error', async () => {
    const t = setup({ sessionStatus: 'paused' });
    fakeDialog(t.mock, 1);
    await trigger(t.mock);

    expect(sent(t.mock)).toEqual([]);
    expect(t.error).toHaveBeenCalledWith('sess-1', expect.stringContaining('not active'));
    expect(t.injected).not.toHaveBeenCalled();
  });

  it('raw-buffer mode: a hook-open dialog is never navigated blind — fails first, types unverified on the explicit re-trigger', async () => {
    const t = setup();
    t.mock.readScreen.mockResolvedValue({ text: render(LABELS, 1).text, live: false });
    await trigger(t.mock);

    expect(sent(t.mock)).toEqual([]);
    expect(t.error).toHaveBeenCalledWith('sess-1', expect.stringContaining('no tmux screen'));
    expect(t.injected).not.toHaveBeenCalled();

    await trigger(t.mock, 'manual');
    expect(t.reviewPlan).toHaveBeenCalledOnce();
    expect(keys(t.mock)).toEqual([]);
    expect(texts(t.mock)).toHaveLength(1);
    expect(texts(t.mock)[0].endsWith('\n')).toBe(false);
    expect(t.injected).toHaveBeenCalledWith('sess-1', false);
  });

  it('raw-buffer mode, hooks say no dialog: a stale frame in the buffer is ignored, submitted at the prompt', async () => {
    const t = setup({ agentStatus: 'working', agentStatusReason: undefined });
    t.mock.readScreen.mockResolvedValue({ text: render(LABELS, 1).text, live: false });
    await trigger(t.mock);

    expect(keys(t.mock)).toEqual([]);
    expect(texts(t.mock)[0].endsWith('\n')).toBe(true);
    expect(t.injected).toHaveBeenCalledWith('sess-1', false);
  });

  it('sanitizes the review before typing: CR and ESC never reach the TUI', async () => {
    const t = setup();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (t.orch as any).externalReviewer = { reviewPlan: vi.fn().mockResolvedValue('Line one\r\nLine two\rthree \x1b[A up') };
    fakeDialog(t.mock, 3);
    await trigger(t.mock);

    const typed = texts(t.mock)[0];
    expect(typed).not.toMatch(/[\r\x1b]/);
    expect(typed).toContain('Line one\nLine two\nthree [A up');
  });
});
