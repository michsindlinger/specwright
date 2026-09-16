// @vitest-environment happy-dom
/**
 * INT-2026-010 (FA-17, review E6): git state lives in a process-long service —
 * the eleven gateway subscriptions are registered once, a status response
 * updates the state, and a commit → push run survives a consumer that
 * unsubscribes and re-subscribes (route change of the project page).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Handler = (msg: Record<string, unknown>) => void;
const handlers = new Map<string, Set<Handler>>();
const sent: Array<Record<string, unknown>> = [];
vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: {
    on: (type: string, h: Handler) => {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type)!.add(h);
    },
    off: (type: string, h: Handler) => handlers.get(type)?.delete(h),
    send: (m: Record<string, unknown>) => sent.push(m),
    requestGitStatus: () => sent.push({ type: 'git:status' }),
    requestGitBranches: () => sent.push({ type: 'git:branches' }),
    requestGitPrInfo: () => sent.push({ type: 'git:pr-info' }),
    requestGitPull: (strategy?: string) => sent.push({ type: 'git:pull', strategy }),
    requestGitPush: () => sent.push({ type: 'git:push' }),
    sendGitCheckout: (branch: string) => sent.push({ type: 'git:checkout', branch }),
    sendGitCommit: (files: string[], message: string) => sent.push({ type: 'git:commit', files, message }),
    requestGenerateCommitMessage: (files: string[]) => sent.push({ type: 'git:generate-commit-message', files }),
    sendGitRevert: (files: string[]) => sent.push({ type: 'git:revert', files }),
    sendGitDeleteUntracked: (file: string) => sent.push({ type: 'git:delete-untracked', file }),
  },
}));

const fire = (type: string, msg: Record<string, unknown>): void => {
  for (const h of handlers.get(type) ?? []) h({ type, ...msg });
};

describe('git-state.service', () => {
  beforeEach(() => {
    sent.length = 0;
  });

  it('registers the eleven gateway subscriptions exactly once, however many consumers come and go', async () => {
    const { gitState } = await import('../../frontend/src/services/git-state.service.js');
    expect(gitState.subscriptionCount).toBe(0);
    const u1 = gitState.subscribe(() => undefined);
    const u2 = gitState.subscribe(() => undefined);
    u1();
    u2();
    gitState.subscribe(() => undefined)();
    expect(gitState.subscriptionCount).toBe(11);
    const types = [...handlers.keys()].filter((t) => t.startsWith('git'));
    expect(types.sort()).toEqual([
      'git:branches:response', 'git:checkout:response', 'git:commit:response', 'git:delete-untracked:response', 'git:error',
      'git:generate-commit-message:response', 'git:pr-info:response', 'git:pull:response', 'git:push:response', 'git:revert:response', 'git:status:response',
    ]);
    for (const t of types) expect(handlers.get(t)!.size).toBe(1);
  });

  it('git:status:response updates the state and notifies subscribers; loadStatus without a project clears it', async () => {
    const { gitState } = await import('../../frontend/src/services/git-state.service.js');
    const seen: unknown[] = [];
    const unsub = gitState.subscribe((s) => seen.push(s.gitStatus?.branch ?? null));
    gitState.loadStatus(true);
    expect(gitState.state.gitLoading).toBe(true);
    expect(sent.map((m) => m.type)).toEqual(['git:status', 'git:branches', 'git:pr-info']);
    fire('git:status:response', { data: { branch: 'main', files: [] } });
    expect(gitState.state.gitLoading).toBe(false);
    expect(gitState.state.gitStatus?.branch).toBe('main');
    expect(seen.at(-1)).toBe('main');
    gitState.loadStatus(false);
    expect(gitState.state.gitStatus).toBeNull();
    expect(gitState.state.hasProject).toBe(false);
    unsub();
  });

  it('commit → push survives a consumer leaving and returning (route change during the push)', async () => {
    const { gitState } = await import('../../frontend/src/services/git-state.service.js');
    const unsub = gitState.subscribe(() => undefined);
    gitState.openCommitDialog(true);
    expect(gitState.state.showCommitDialog).toBe(true);
    expect(gitState.state.commitAndPushPhase).toBe('committing');
    gitState.commit(['a.ts'], 'feat: x');
    expect(sent.at(-1)).toMatchObject({ type: 'git:commit', files: ['a.ts'] });
    fire('git:commit:response', { data: { hash: 'abc', filesChanged: 1 } });
    expect(gitState.state.commitAndPushPhase).toBe('pushing');
    expect(sent.at(-1)).toMatchObject({ type: 'git:push' });
    // the project page (a consumer) is gone while the push runs
    unsub();
    // closing the dialog is refused while pushing
    gitState.closeCommitDialog();
    expect(gitState.state.showCommitDialog).toBe(true);
    fire('git:push:response', { data: { success: true, summary: '', commitsPushed: 1 } });
    // a returning consumer sees the finished run
    let last: unknown = null;
    const unsub2 = gitState.subscribe((s) => (last = s.commitAndPushPhase));
    expect(last).toBe('idle');
    expect(gitState.state.showCommitDialog).toBe(false);
    expect(gitState.state.pendingAutoPush).toBe(false);
    unsub2();
  });

  it('push rejected opens the pull-strategy dialog with retry; a generated commit message reaches its listener', async () => {
    const { gitState } = await import('../../frontend/src/services/git-state.service.js');
    gitState.push();
    fire('git:error', { operation: 'push', code: 'PUSH_REJECTED', message: 'rejected' });
    expect(gitState.state.showPullStrategyDialog).toBe(true);
    expect(gitState.state.pullStrategyRetryPush).toBe(true);
    expect(gitState.state.isGitOperationRunning).toBe(false);
    gitState.pullStrategySelect('rebase');
    expect(gitState.state.showPullStrategyDialog).toBe(false);
    expect(sent.at(-1)).toMatchObject({ type: 'git:pull', strategy: 'rebase' });
    const messages: string[] = [];
    const off = gitState.onGeneratedMessage((m) => messages.push(m));
    gitState.generateCommitMessage(['a.ts']);
    expect(gitState.state.generatingCommitMessage).toBe(true);
    fire('git:generate-commit-message:response', { data: { message: 'feat: generated' } });
    expect(messages).toEqual(['feat: generated']);
    expect(gitState.state.generatingCommitMessage).toBe(false);
    off();
  });
});
