import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import type { WebSocket } from 'ws';
import { PlanReviewOrchestrator } from '../../src/server/services/plan-review-orchestrator.js';
import { getDefaultReviewers } from '../../src/server/model-config.js';
import { DEFAULT_REVIEW_PROMPT } from '../../src/server/general-config.js';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// INT-2026-037: the aggregation path without the clustering LLM (system boundary) — formatInject runs for real.
vi.mock('../../src/server/services/finding-aggregator.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/server/services/finding-aggregator.js')>()),
  aggregateFindings: vi.fn(async () => ({ clusters: [], fallbackUsed: false })),
}));
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
  // Default: a live screen without a plan dialog, empty prompt line → the REPL inject path.
  const readScreen = vi.fn().mockResolvedValue({ text: '❯ ', live: true });
  const setPlanReviewEnabled = vi.fn();
  const triggerManualReview = vi.fn();
  const waitForIdle = vi.fn().mockResolvedValue(undefined);
  let planPath: string | null = opts.lastDetectedPlanPath ?? null;

  const ctm = Object.assign(emitter, {
    sendInput,
    reportAgentEvent,
    readScreen,
    // INT-2026-007: the inject runs under the session's machine-write lock
    withMachineWrite: vi.fn(async (_id: string, fn: () => Promise<unknown>) => ({ ok: true as const, value: await fn() })),
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
    probe: vi.fn().mockResolvedValue({ bereit: true }),
  };
  testDoubles(orchestrator);
  return orchestrator;
}

/** INT-2026-037: mock reviewers count as configured, no stand-ins from the real settings. */
function testDoubles(orch: PlanReviewOrchestrator): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (orch as any).imConfig = () => true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (orch as any).ersatzReihe = () => [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (orch as any).sleep = () => Promise.resolve();
}

/** INT-2026-037 (FA-23): review texts typed at the prompt — each is followed by its own Enter (`\r`). */
function textInputs(mock: { sendInput: { mock: { calls: unknown[][] } } }): number {
  return mock.sendInput.mock.calls.filter((c) => c[1] !== '\r').length;
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
    expect(textInputs(mock)).toBe(1);
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
    expect(textInputs(mock)).toBe(1);

    mock.emitter.emit('session.plan-detected', 'sess-1', 'plan text again', 'auto');
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(started).toHaveBeenCalledTimes(1);
    expect(textInputs(mock)).toBe(1);
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
    expect(textInputs(mock)).toBe(2);
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
    expect(textInputs(mock)).toBe(2);
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

    expect(mock.sendInput).toHaveBeenLastCalledWith('sess-1', '\r', { inferUnblock: false });
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
    testDoubles(orch);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (orch as any).externalReviewer = { probe: vi.fn().mockResolvedValue({ bereit: true }),
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
    testDoubles(orch);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (orch as any).externalReviewer = { probe: vi.fn().mockResolvedValue({ bereit: true }), reviewPlan: vi.fn().mockRejectedValue(new Error('boom')) };
    const error = vi.fn();
    orch.on('plan-review:error', error);

    await run(mock, orch);

    expect(error).toHaveBeenCalledWith('sess-1', expect.stringMatching(/^Review gescheitert: mock:mock-1: Fehler/));
    expect(mock.sendInput).not.toHaveBeenCalled();
    expect(mock.reportAgentEvent).toHaveBeenCalledOnce();
    expect(mock.reportAgentEvent).toHaveBeenCalledWith('sess-1', 'review-failed', {
      reason: 'Plan-Review fehlgeschlagen (0/1 Reviewer)',
    });
  });

  it('stays silent on total failure when the session is not blocked (nothing provably waits)', async () => {
    const mock = buildMockCtm({ lastDetectedPlanPath: '/p/foo.md', agentStatus: 'working' });
    const orch = new PlanReviewOrchestrator(mock.ctm);
    testDoubles(orch);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (orch as any).externalReviewer = { probe: vi.fn().mockResolvedValue({ bereit: true }), reviewPlan: vi.fn().mockRejectedValue(new Error('boom')) };
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
    testDoubles(orch);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (orch as any).externalReviewer = { probe: vi.fn().mockResolvedValue({ bereit: true }), reviewPlan: vi.fn().mockRejectedValue(new Error('boom')) };
    await run(pausedFail, orch);
    expect(pausedFail.reportAgentEvent).not.toHaveBeenCalled();
  });

  it('does not report on a lock collision (a review is still running)', async () => {
    const mock = buildMockCtm({ lastDetectedPlanPath: '/p/foo.md', agentStatus: 'blocked' });
    const orch = new PlanReviewOrchestrator(mock.ctm);
    testDoubles(orch);
    let release: (v: string) => void = () => {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (orch as any).externalReviewer = { probe: vi.fn().mockResolvedValue({ bereit: true }),
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
    testDoubles(orch);
    const reviewPlan = vi.fn().mockResolvedValue('Mock reviewer findings');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (orch as any).externalReviewer = { reviewPlan, probe: vi.fn().mockResolvedValue({ bereit: true }) };
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
    expect(texts(t.mock)[0].startsWith('===== Plan-Review · Plan-Mode-Plan =====')).toBe(true);
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

  it('no dialog by hook or screen (REPL): typed, then Enter on its own, unverified', async () => {
    const t = setup({ agentStatus: 'working', agentStatusReason: undefined });
    await trigger(t.mock);

    expect(keys(t.mock)).toEqual([]);
    expect(texts(t.mock)).toHaveLength(2);
    expect(texts(t.mock)[0].endsWith('\n')).toBe(false);
    expect(texts(t.mock)[1]).toBe('\r');
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
    expect(t.started).toHaveBeenLastCalledWith('sess-1', 'manual', 1, 'plan', 'plan-mode');
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

  it('raw-buffer mode, hooks say no dialog: nothing typed blind (AR-08), the review waits for the next stop', async () => {
    const t = setup({ agentStatus: 'working', agentStatusReason: undefined });
    t.mock.readScreen.mockResolvedValue({ text: render(LABELS, 1).text, live: false });
    await trigger(t.mock);

    expect(sent(t.mock)).toEqual([]);
    expect(t.injected).not.toHaveBeenCalled();
  });

  it('sanitizes the review before typing: CR and ESC never reach the TUI', async () => {
    const t = setup();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (t.orch as any).externalReviewer = { probe: vi.fn().mockResolvedValue({ bereit: true }), reviewPlan: vi.fn().mockResolvedValue('Line one\r\nLine two\rthree \x1b[A up') };
    fakeDialog(t.mock, 3);
    await trigger(t.mock);

    const typed = texts(t.mock)[0];
    expect(typed).not.toMatch(/[\r\x1b]/);
    expect(typed).toContain('Line one\nLine two\nthree [A up');
  });
});

describe('INT-2026-025 (FA-22): isReviewRunning', () => {
  it('is true while a review holds the lock and false for unknown or idle sessions', async () => {
    const mock = buildMockCtm();
    mock.setPlanPath('/p/lauf.md');
    const orch = new PlanReviewOrchestrator(mock.ctm);
    testDoubles(orch);
    let fertig: (v: string) => void = () => {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (orch as any).externalReviewer = { probe: vi.fn().mockResolvedValue({ bereit: true }), reviewPlan: vi.fn(() => new Promise<string>((r) => { fertig = r; })) };
    expect(orch.isReviewRunning('sess-x')).toBe(false);
    orch.setTabConfig('sess-x', { enabled: true, reviewers: [{ providerId: 'mock', modelId: 'mock-1' }] });
    expect(orch.isReviewRunning('sess-x')).toBe(false);
    mock.emitter.emit('session.plan-detected', 'sess-x', 'plan text', 'auto');
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(orch.isReviewRunning('sess-x')).toBe(true);
    fertig('findings');
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(orch.isReviewRunning('sess-x')).toBe(false);
  });
});

describe('INT-2026-037 (FA-23): hand-over only into an empty prompt line', () => {
  function setupRepl() {
    const mock = buildMockCtm({ lastDetectedPlanPath: '/p/foo.md' });
    const orch = buildOrchestratorWithMockReviewer(mock.ctm);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (orch as any).sleep = () => Promise.resolve();
    const injected = vi.fn();
    orch.on('plan-review:injected', injected);
    orch.setTabConfig('sess-1', { enabled: true, reviewers: [{ providerId: 'mock', modelId: 'mock-1' }] });
    return { mock, orch, injected };
  }
  const settle = () => new Promise((resolve) => setTimeout(resolve, 30));

  it('text in the input box: nothing typed; next stop with an empty line types the review and presses Enter', async () => {
    const t = setupRepl();
    t.mock.readScreen.mockResolvedValue({ text: '❯ ich tippe gerade', live: true });
    t.mock.emitter.emit('session.plan-detected', 'sess-1', 'plan text', 'manual');
    await settle();
    expect(t.mock.sendInput).not.toHaveBeenCalled();
    expect(t.injected).not.toHaveBeenCalled();

    t.mock.readScreen.mockResolvedValue({ text: '❯ ', live: true });
    t.mock.emitter.emit('session.agent-event', 'sess-1', 'stop');
    await settle();
    const sent = t.mock.sendInput.mock.calls.map((c: unknown[]) => c[1] as string);
    expect(sent).toHaveLength(2);
    expect(sent[0]).toContain('Mock reviewer findings');
    expect(sent[1]).toBe('\r');
    expect(t.injected).toHaveBeenCalledOnce();
  });

  it('a dialog cue without plan dialog (permission prompt): waits, types nothing', async () => {
    const t = setupRepl();
    t.mock.readScreen.mockResolvedValue({ text: ' Do you want to proceed?\n ❯ 1. Yes\n   2. No', live: true });
    t.mock.emitter.emit('session.plan-detected', 'sess-1', 'plan text', 'manual');
    await settle();
    expect(t.mock.sendInput).not.toHaveBeenCalled();
  });
});

describe('INT-2026-037: intent and plan review from the Vorhaben folder', () => {
  type Probe = { bereit: true } | { bereit: false; grund: string; meldung: string };
  let dir: string;
  let intentPfad: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'int037-'));
    intentPfad = join(dir, 'intent.md');
    writeFileSync(intentPfad, '# Absicht\n\nZ-01: weniger Code.\n');
  });

  function setupReview(opts: {
    reviewers?: { providerId: string; modelId: string }[];
    ersatz?: { providerId: string; modelId: string }[];
    probe?: (providerId: string, modelId: string) => Probe | Promise<Probe>;
    review?: (prompt: string, providerId: string, modelId: string) => Promise<string>;
    imConfig?: (r: { providerId: string; modelId?: string }) => boolean;
  } = {}) {
    const mock = buildMockCtm();
    const orch = new PlanReviewOrchestrator(mock.ctm);
    testDoubles(orch);
    const probe = vi.fn(async (p: string, m: string) => (opts.probe ? opts.probe(p, m) : { bereit: true as const }));
    const reviewPlan = vi.fn(opts.review ?? (async (_prompt: string, p: string, m: string) => `Finding von ${p}:${m}, ausführlich genug für einen Befund.`));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const o = orch as any;
    o.externalReviewer = { reviewPlan, probe };
    o.ersatzReihe = () => opts.ersatz ?? [];
    if (opts.imConfig) o.imConfig = opts.imConfig;
    // aggregation needs an LLM — the tests use one reviewer or check the fallback-free parts
    const events = { started: vi.fn(), probeEvent: vi.fn(), result: vi.fn(), aggregated: vi.fn(), injected: vi.fn(), error: vi.fn() };
    orch.on('plan-review:started', events.started);
    orch.on('plan-review:probe', events.probeEvent);
    orch.on('plan-review:reviewer.result', events.result);
    orch.on('plan-review:aggregated', events.aggregated);
    orch.on('plan-review:injected', events.injected);
    orch.on('plan-review:error', events.error);
    orch.setTabConfig('sess-1', { enabled: false, reviewers: opts.reviewers ?? [{ providerId: 'anthropic', modelId: 'sonnet' }] });
    return { mock, orch, probe, reviewPlan, ...events };
  }
  const settle = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));
  const intentZiel = () => ({ art: 'intent' as const, quelle: 'intent-ordner' as const, pfad: intentPfad });
  const aggregated = (t: { aggregated: ReturnType<typeof vi.fn> }): string => t.aggregated.mock.calls[0][1] as string;

  it('FA-01/AK-01: reviews the file as it is at the start; a later edit does not change the run', async () => {
    let fertig: (v: string) => void = () => {};
    const t = setupReview({ review: () => new Promise<string>((r) => { fertig = r; }) });
    expect(t.orch.startReview('sess-1', intentZiel(), 'manual')).toBe('gestartet');
    await settle();
    writeFileSync(intentPfad, 'ganz anderer Text');
    fertig('Finding: alles da, ausführlich genug für einen Befund.');
    await settle();
    const prompt = t.reviewPlan.mock.calls[0][0] as string;
    expect(prompt).toContain('Z-01: weniger Code.');
    expect(prompt).not.toContain('ganz anderer Text');
    expect(t.started).toHaveBeenCalledWith('sess-1', 'manual', 1, 'intent', 'intent-ordner');
  });

  it('FA-04/FA-05/FA-06: the intent prompt asks for EXISTS/DROP with budget 15; the plan prompt keeps its budget 6', async () => {
    const t = setupReview();
    t.orch.startReview('sess-1', intentZiel(), 'manual');
    await settle();
    const prompt = t.reviewPlan.mock.calls[0][0] as string;
    expect(prompt).toContain('file:line');
    expect(prompt).toContain('DROP');
    expect(prompt).toContain('at most 15 tool calls');
    expect(prompt).not.toContain('preserve all features');
    expect(DEFAULT_REVIEW_PROMPT).toContain('at most 6 tool calls');
  });

  it('FA-03: an unreadable folder file is an error in the block, no reviewer call', async () => {
    const t = setupReview();
    t.orch.startReview('sess-1', { ...intentZiel(), pfad: join(dir, 'fehlt.md') }, 'manual');
    await settle();
    expect(t.error).toHaveBeenCalledWith('sess-1', expect.stringContaining('Datei nicht lesbar'));
    expect(t.reviewPlan).not.toHaveBeenCalled();
  });

  it('FA-12: a probe result is reused for 5 minutes, probed again after that', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const t = setupReview();
      t.orch.startReview('sess-1', intentZiel(), 'manual');
      await settle();
      expect(t.probe).toHaveBeenCalledTimes(1);
      vi.setSystemTime(Date.now() + 4 * 60_000);
      t.orch.startReview('sess-1', intentZiel(), 'manual');
      await settle();
      expect(t.probe).toHaveBeenCalledTimes(1);
      vi.setSystemTime(Date.now() + 2 * 60_000);
      t.orch.startReview('sess-1', intentZiel(), 'manual');
      await settle();
      expect(t.probe).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('FA-15/EK-03: chosen and stand-ins are probed in parallel — a hanging probe costs its timeout once, not twice', async () => {
    const t = setupReview({
      reviewers: [{ providerId: 'glm', modelId: 'glm-5.2' }],
      ersatz: [{ providerId: 'anthropic', modelId: 'fable' }],
      probe: (p) => (p === 'glm' ? new Promise<Probe>((r) => setTimeout(() => r({ bereit: false, grund: 'zeitueberschreitung', meldung: 'Reviewer timeout' }), 60)) : { bereit: true }),
    });
    const start = Date.now();
    t.orch.startReview('sess-1', intentZiel(), 'manual');
    await settle(100);
    expect(t.injected).toHaveBeenCalledOnce();
    expect(Date.now() - start).toBeLessThan(140);
    // both probes started before the first finished
    expect(t.probe).toHaveBeenCalledTimes(2);
  });

  it('FA-13/FA-16/FA-17/FA-18: failed and missing reviewers, stand-in, provider:model ids, basis in the inject — no raw stderr', async () => {
    const t = setupReview({
      reviewers: [
        { providerId: 'anthropic', modelId: 'sonnet' },
        { providerId: 'anthropic', modelId: 'opus' },
        { providerId: 'glm', modelId: 'glm-5.2' },
        { providerId: 'deepseek', modelId: 'opus' },
      ],
      ersatz: [{ providerId: 'anthropic', modelId: 'fable' }],
      imConfig: (r) => r.providerId !== 'deepseek',
      probe: (p) => (p === 'glm' ? { bereit: false, grund: 'ueberlastet', meldung: '529 overloaded — stderr: /home/geheim/pfad' } : { bereit: true }),
      review: async (_prompt, p, m) => {
        if (m === 'opus') throw new Error('Reviewer failed — stderr: /home/geheim/pfad');
        return `Finding von ${p}:${m}, ausführlich genug für einen Befund.`;
      },
    });
    t.orch.startReview('sess-1', intentZiel(), 'manual');
    await settle(60);

    expect(t.probe).not.toHaveBeenCalledWith('deepseek', 'opus');
    expect(t.probeEvent).toHaveBeenCalledWith('sess-1', [
      { reviewerId: 'anthropic:sonnet', zustand: 'bereit' },
      { reviewerId: 'anthropic:opus', zustand: 'bereit' },
      { reviewerId: 'glm:glm-5.2', zustand: 'ausgefallen', grund: 'ueberlastet', meldung: '529 overloaded — stderr: /home/geheim/pfad' },
      { reviewerId: 'deepseek:opus', zustand: 'fehlt' },
      { reviewerId: 'anthropic:fable', zustand: 'bereit', ersatzFuer: 'glm:glm-5.2' },
    ]);
    const ids = t.result.mock.calls.map((c: unknown[]) => c[1]);
    expect(ids).toEqual(['anthropic:sonnet', 'anthropic:opus', 'anthropic:fable']);
    const text = aggregated(t);
    expect(text).toContain('===== Absicht-Review · Absicht im Ordner =====');
    expect(text).toContain('Ergebnis aus 2 von 3 Prüfern.');
    expect(text).toContain('glm:glm-5.2: überlastet');
    expect(text).toContain('deepseek:opus: nicht in der Konfiguration');
    expect(text).toContain('anthropic:opus: Fehler');
    expect(text).toContain('anthropic:fable für glm:glm-5.2');
    expect(text).not.toContain('/home/geheim/pfad');
  });

  it('FA-19: both inject paths end with the rules — evidence, R2, DROP to Michael; no "argue for it", no "briefly justify"', async () => {
    const one = setupReview();
    one.orch.startReview('sess-1', intentZiel(), 'manual');
    await settle();
    const two = setupReview({ reviewers: [{ providerId: 'anthropic', modelId: 'sonnet' }, { providerId: 'anthropic', modelId: 'opus' }] });
    two.orch.startReview('sess-1', { art: 'plan', quelle: 'plan-ordner', pfad: intentPfad }, 'manual');
    await settle(100);
    expect(aggregated(two)).toContain('External review consensus (2 successful reviewers)');
    for (const text of [aggregated(one), aggregated(two)]) {
      expect(text).toContain('lesbarem Beleg');
      expect(text).toContain('R2');
      expect(text).not.toContain('argue for it');
      expect(text).not.toContain('briefly justify');
    }
    expect(aggregated(one)).toMatch(/DROP-Empfehlung.*immer an Michael/);
    expect(aggregated(two)).not.toContain('DROP-Empfehlung');
    expect(aggregated(two)).toContain('Plan → §12');
  });

  it('FA-22/AK-11: every probe fails → "Review gescheitert" with reasons, nothing typed', async () => {
    const t = setupReview({
      reviewers: [{ providerId: 'glm', modelId: 'glm-5.2' }],
      ersatz: [{ providerId: 'minimax', modelId: 'MiniMax-M2.5' }],
      probe: () => ({ bereit: false, grund: 'anmeldung', meldung: '401' }),
    });
    t.orch.startReview('sess-1', intentZiel(), 'manual');
    await settle();
    expect(t.error).toHaveBeenCalledWith('sess-1', 'Review gescheitert: glm:glm-5.2: Anmeldung');
    expect(t.reviewPlan).not.toHaveBeenCalled();
    expect(t.mock.sendInput).not.toHaveBeenCalled();
  });

  it('FA-23 (button): three refused hand-overs → message; the button then inserts the waiting result without a new review', async () => {
    const t = setupReview();
    t.mock.readScreen.mockResolvedValue({ text: '❯ ich tippe', live: true });
    t.orch.startReview('sess-1', intentZiel(), 'manual');
    await settle();
    t.mock.emitter.emit('session.agent-event', 'sess-1', 'stop');
    await settle();
    t.mock.emitter.emit('session.agent-event', 'sess-1', 'stop');
    await settle();
    expect(t.error).toHaveBeenCalledWith('sess-1', 'Review nicht übergeben – „Absicht prüfen“ fügt es ein.');
    t.mock.emitter.emit('session.agent-event', 'sess-1', 'stop');
    await settle();
    expect(t.mock.sendInput).not.toHaveBeenCalled();

    t.mock.readScreen.mockResolvedValue({ text: '❯ ', live: true });
    t.orch.startReview('sess-1', intentZiel(), 'manual');
    await settle();
    expect(t.reviewPlan).toHaveBeenCalledOnce();
    expect(t.mock.sendInput).toHaveBeenLastCalledWith('sess-1', '\r', { inferUnblock: false });
    expect(t.injected).toHaveBeenCalledOnce();
  });

  it('FA-23: a busy machine-write lock at a stop is no attempt — the next stop still hands over', async () => {
    const t = setupReview();
    t.mock.readScreen.mockResolvedValue({ text: '❯ ich tippe', live: true });
    t.orch.startReview('sess-1', intentZiel(), 'manual');
    await settle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wmw = (t.mock.ctm as any).withMachineWrite as ReturnType<typeof vi.fn>;
    for (let i = 0; i < 3; i++) {
      wmw.mockResolvedValueOnce({ ok: false, grund: 'beschaeftigt' });
      t.mock.emitter.emit('session.agent-event', 'sess-1', 'stop');
      await settle();
    }
    t.mock.readScreen.mockResolvedValue({ text: '❯ ', live: true });
    t.mock.emitter.emit('session.agent-event', 'sess-1', 'stop');
    await settle();
    expect(t.injected).toHaveBeenCalledOnce();
    expect(t.error).not.toHaveBeenCalled();
  });

  it('FA-24/OF-01: the hand-over does not check the intent status — an "angenommen" intent is handed over', async () => {
    writeFileSync(intentPfad, '---\nstatus: "angenommen"\n---\n# Absicht\n');
    const t = setupReview();
    t.orch.startReview('sess-1', intentZiel(), 'auto');
    await settle();
    expect(t.injected).toHaveBeenCalledOnce();
  });

  it('a second start while a review runs is refused synchronously (beschaeftigt)', async () => {
    const t = setupReview({ review: () => new Promise<string>(() => {}) });
    expect(t.orch.startReview('sess-1', intentZiel(), 'auto')).toBe('gestartet');
    expect(t.orch.startReview('sess-1', intentZiel(), 'auto')).toBe('beschaeftigt');
  });
});
