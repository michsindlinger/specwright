import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import { CloudTerminalManager } from './cloud-terminal-manager.js';
import { ExternalReviewer } from './external-reviewer.js';
import { aggregateFindings, formatInject } from './finding-aggregator.js';
import { getReviewPrompt } from '../general-config.js';
import { getDefaultReviewers } from '../model-config.js';
import {
  injectProbe,
  optionLineHas,
  parsePlanDialog,
  sameDialogState,
  sanitizeInjectText,
  type PlanDialogState,
} from '../utils/plan-dialog-state.js';
import { CloudTerminalSessionId } from '../../shared/types/cloud-terminal.protocol.js';
import type { FallbackReason } from '../../shared/types/plan-review.protocol.js';

export interface ReviewerConfig {
  providerId: string;
  modelId: string | undefined;
}

export interface TabReviewConfig {
  enabled: boolean;
  reviewers: ReviewerConfig[];
}

interface SessionState {
  config: TabReviewConfig;
  locked: boolean;
  /** Epoch ms when `locked` was last set. Used to recover from a stale lock
   *  (a reviewer/inject that hung and never reached the finally-reset) on an
   *  explicit manual re-trigger. null when unlocked. */
  lockedAt: number | null;
  /** Resolved plan-file path of the most recently injected review.
   *  Used to suppress repeat reviews of the same plan (e.g., when TUI boxes
   *  re-fire plan detection during plan execution). Reset on toggle-off. */
  lastInjectedPlanPath: string | null;
  /** Review that was produced but did not land in the plan dialog. A manual
   *  trigger for the same plan re-injects it without another reviewer run.
   *  Cleared on success, toggle-off, a fresh review run and session close. */
  pendingInject?: InjectJob;
}

/** One aggregated review on its way into the terminal. */
interface InjectJob {
  planPath: string | null;
  text: string;
  fallbackReason?: FallbackReason;
  /** Reviewers that delivered / were selected (bell reason "2/3"). */
  fulfilled: number;
  total: number;
}

type InjectFailure = 'focus' | 'unreadable' | 'no-screen' | 'not-visible' | 'dialog-gone' | 'not-active';

/** A manual re-trigger may reclaim a lock older than this — a fresh lock means
 *  a review is genuinely still running, so concurrent manual triggers still
 *  block to avoid double-injection. */
const STALE_LOCK_MS = 3 * 60 * 1000;

const ARROW_DOWN = '\x1b[B';
const ARROW_UP = '\x1b[A';
/** Pause after a navigation key so Ink's redraw reaches the PTY before the idle wait. */
const KEY_SETTLE_MS = 100;
/** A dialog state counts once two reads in a row agree (Ink redraws in passes). */
const STABLE_READ_ATTEMPTS = 4;
const STABLE_READ_IDLE_MS = 150;
/** Pause after typing the review before checking that it rendered. */
const INJECT_SETTLE_MS = 200;
/** History lines read with the post-inject screen: a long review pushes the dialog header up. */
const INJECT_VERIFY_SCROLLBACK = 2000;
/** agentStatusReason values meaning "the plan dialog is open" (the hook, or our own review events). */
const PLAN_DIALOG_REASON = /ExitPlanMode|^Plan-Review /;

function buildInjectText(
  reviewerOutputs: { providerId: string; modelId: string; output: string }[]
): string {
  const sections = reviewerOutputs
    .map((r) => `## Reviewer: ${r.providerId}:${r.modelId}\n${r.output}`)
    .join('\n\n');
  return (
    "Please address these issues coming from review agents. Don't follow everything blind, if you have good arguments against a recommendation, argue for it.\n\n" +
    '===== External Review =====\n' +
    sections +
    '\n==========================='
  );
}

function injectFailureMessage(kind: InjectFailure, dialog?: PlanDialogState): string {
  const target = dialog?.target ?? 3;
  switch (kind) {
    case 'focus':
      return `Could not move the plan dialog to option ${target} (cursor on ${dialog?.focused ?? '?'}); nothing was typed. Move the cursor to option ${target} and press "Review last plan" to insert the review.`;
    case 'unreadable':
      return 'Plan dialog is open but its state could not be read; nothing was typed. Move the cursor to "Tell Claude what to change" and press "Review last plan" to insert the review.';
    case 'not-visible':
      return `Review text did not show up in option ${target} after typing. Check the tab; "Review last plan" inserts it again.`;
    case 'dialog-gone':
      return 'Plan dialog could not be read after typing the review. Check the tab; "Review last plan" inserts it again.';
    case 'no-screen':
      return 'Plan dialog is open, but this session has no tmux screen to read, so the cursor cannot be checked; nothing was typed. Move the cursor to "Tell Claude what to change" and press "Review last plan" — the review is then typed without a check.';
    case 'not-active':
      return 'Session is not active; nothing was typed. "Review last plan" inserts the review once it is back.';
  }
}

/**
 * Coordinates plan-detected events → parallel reviewer spawns → aggregation → inject.
 *
 * Emits (as EventEmitter):
 *   'plan-review:started'          (sessionId, source, reviewerCount)
 *   'plan-review:reviewer.result'  (sessionId, providerId, status, output?, error?)
 *   'plan-review:aggregated'       (sessionId, aggregatedText, fallbackReason?)
 *   'plan-review:injected'         (sessionId)
 *   'plan-review:error'            (sessionId, message)
 *
 * websocket.ts (APR-007) listens to these events and forwards to WS clients.
 *
 * Besides its own events it feeds the session's agent status (tab dot, bell,
 * chime) through CloudTerminalManager.reportAgentEvent(): `review-injected`
 * once the review text sits in Claude's plan dialog, `review-failed` when no
 * reviewer delivered and the dialog is provably still open (session blocked).
 *
 * Injecting reads the screen first: Claude's plan dialog drops typed text
 * unless its free-text option is focused, so the cursor is moved there and
 * the text verified afterwards (see inject()). A review that did not land is
 * kept and re-injected by the next manual trigger for the same plan.
 */
export class PlanReviewOrchestrator extends EventEmitter {
  private sessions: Map<CloudTerminalSessionId, SessionState> = new Map();
  private readonly cloudTerminalManager: CloudTerminalManager;
  private readonly externalReviewer: ExternalReviewer;
  /** Overridable in tests. */
  private sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  constructor(cloudTerminalManager: CloudTerminalManager) {
    super();
    this.cloudTerminalManager = cloudTerminalManager;
    this.externalReviewer = new ExternalReviewer();

    cloudTerminalManager.on(
      'session.plan-detected',
      (sessionId: CloudTerminalSessionId, planText: string, source: 'auto' | 'manual') => {
        this.handlePlanDetected(sessionId, planText, source).catch((err: unknown) => {
          console.error(`[PlanReviewOrchestrator] Unhandled error for session ${sessionId}:`, err);
          this.emit('plan-review:error', sessionId, err instanceof Error ? err.message : String(err));
        });
      }
    );

    cloudTerminalManager.on('session.closed', (sessionId: CloudTerminalSessionId) => {
      this.sessions.delete(sessionId);
    });
  }

  /** Update per-session toggle + reviewer selection; syncs planReviewEnabled flag in CTM. */
  public setTabConfig(sessionId: CloudTerminalSessionId, config: TabReviewConfig): void {
    const existing = this.sessions.get(sessionId);
    this.sessions.set(sessionId, {
      config,
      locked: existing?.locked ?? false,
      lockedAt: existing?.lockedAt ?? null,
      lastInjectedPlanPath: config.enabled ? (existing?.lastInjectedPlanPath ?? null) : null,
      pendingInject: config.enabled ? existing?.pendingInject : undefined,
    });
    this.cloudTerminalManager.setPlanReviewEnabled(sessionId, config.enabled);
  }

  /** Delegate manual trigger to CloudTerminalManager which emits session.plan-detected. */
  public triggerManualReview(sessionId: CloudTerminalSessionId): void {
    this.cloudTerminalManager.triggerManualReview(sessionId);
  }

  /** Push current config snapshot to a single WS client (called on tab connect/resume). */
  public sendSnapshot(sessionId: CloudTerminalSessionId, ws: WebSocket): void {
    const state = this.sessions.get(sessionId);
    // Pure read: never create state here (avoids orphan-state leaks / races).
    // A fresh session (no state yet) gets the default reviewers pre-selected,
    // enabled stays false so nothing auto-fires until the user turns AR on.
    const config = state?.config ?? { enabled: false, reviewers: getDefaultReviewers() };
    const prompt = getReviewPrompt();
    ws.send(
      JSON.stringify({
        type: 'plan-review:config.snapshot',
        sessionId,
        enabled: config.enabled,
        reviewers: config.reviewers,
        prompt,
      })
    );
  }

  /**
   * Feeds the agent status (tab dot / bell / chime). Only for a live PTY;
   * `review-failed` additionally requires the session to be blocked already —
   * that is the only proof the plan dialog is still open. A manual re-review
   * while Claude works, or a dialog the user answered meanwhile, must not paint
   * the tab orange for a review that has nothing to wait for.
   */
  private reportReviewStatus(
    sessionId: CloudTerminalSessionId,
    event: 'review-injected' | 'review-failed',
    reason: string
  ): void {
    const session = this.cloudTerminalManager.getSession(sessionId);
    if (!session || session.status !== 'active') return;
    if (event === 'review-failed' && session.agentStatus !== 'blocked') return;
    this.cloudTerminalManager.reportAgentEvent(sessionId, event, { reason });
  }

  /**
   * Types an aggregated review into the session. In Claude's plan dialog the
   * text only lands when the free-text option is focused (the dialog drops
   * keystrokes otherwise), so: read the screen, move the cursor there one key
   * at a time, type without a trailing newline, check the text rendered in
   * that option. Anything short of that is reported as a failure and the
   * review kept for a manual re-inject — nothing is ever typed into the dialog
   * with another option focused. Outside a dialog (the REPL prompt) the text
   * is typed and submitted as before, unverified. `retry` marks the user's
   * explicit re-trigger after a failure (see the raw-buffer branch).
   */
  private async inject(
    sessionId: CloudTerminalSessionId,
    state: SessionState,
    job: InjectJob,
    retry = false
  ): Promise<void> {
    const ctm = this.cloudTerminalManager;
    const text = sanitizeInjectText(job.text);
    const meta = ctm.getSession(sessionId);
    if (!meta || meta.status !== 'active') return this.injectFailed(sessionId, state, job, 'not-active');

    const dialogOpenByHook =
      meta.agentStatus === 'blocked' && PLAN_DIALOG_REASON.test(meta.agentStatusReason ?? '');
    const hookKnown = meta.agentStatus !== undefined && meta.agentStatus !== 'unknown';

    await ctm.waitForIdle(sessionId, 500);
    const screen = await ctm.readScreen(sessionId);
    if (!screen.live) {
      // No tmux pane, only the raw buffer. Claude moves the focus and echoes
      // typed text as cell-level updates that drop the option number, so from
      // a raw buffer neither the cursor nor the landing can be checked. Never
      // press keys blind: ask the user to place the cursor, and type unverified
      // on their explicit re-trigger. A buffer also keeps frames of dialogs long
      // gone — believe it only when there are no hooks to ask.
      const dialogOpen = dialogOpenByHook || (!hookKnown && parsePlanDialog(screen.text) !== null);
      if (!dialogOpen) return this.submitAtPrompt(sessionId, state, job, text);
      if (!retry) return this.injectFailed(sessionId, state, job, 'no-screen');
      if (!ctm.sendInput(sessionId, text, { inferUnblock: false })) {
        return this.injectFailed(sessionId, state, job, 'not-active');
      }
      return this.injectSucceeded(sessionId, state, job, false);
    }

    const before = await this.readDialog(sessionId);
    if (before === 'unstable') return this.injectFailed(sessionId, state, job, 'unreadable');

    if (before) {
      const dialog = await this.focusFeedbackOption(sessionId, before);
      if (!dialog) return this.injectFailed(sessionId, state, job, 'unreadable');
      if (dialog.focused !== dialog.target) return this.injectFailed(sessionId, state, job, 'focus', dialog);
      // Machine text, not the user's answer (inferUnblock: false), and no
      // trailing newline: the user submits the feedback with Enter.
      if (!ctm.sendInput(sessionId, text, { inferUnblock: false })) {
        return this.injectFailed(sessionId, state, job, 'not-active');
      }
      await this.sleep(INJECT_SETTLE_MS);
      await ctm.waitForIdle(sessionId, 500);
      const after = await this.readDialog(sessionId, INJECT_VERIFY_SCROLLBACK);
      if (!after || after === 'unstable') return this.injectFailed(sessionId, state, job, 'dialog-gone');
      // The label is gone once text is typed — check the option chosen BEFORE.
      if (!optionLineHas(after, dialog.target, injectProbe(text))) {
        return this.injectFailed(sessionId, state, job, 'not-visible', dialog);
      }
      return this.injectSucceeded(sessionId, state, job, true);
    }

    if (dialogOpenByHook) return this.injectFailed(sessionId, state, job, 'unreadable');
    this.submitAtPrompt(sessionId, state, job, text);
  }

  /** REPL prompt, no plan dialog: type and submit as before, unverified. */
  private submitAtPrompt(sessionId: CloudTerminalSessionId, state: SessionState, job: InjectJob, text: string): void {
    if (!this.cloudTerminalManager.sendInput(sessionId, text + '\n', { inferUnblock: false })) {
      return this.injectFailed(sessionId, state, job, 'not-active');
    }
    this.injectSucceeded(sessionId, state, job, false);
  }

  /**
   * Plan-dialog state once two reads in a row agree (Ink redraws in passes, a
   * single read can catch a half-drawn frame). null = stably no dialog;
   * 'unstable' = the reads kept disagreeing.
   */
  private async readDialog(
    sessionId: CloudTerminalSessionId,
    scrollback = 0
  ): Promise<PlanDialogState | null | 'unstable'> {
    const read = async (): Promise<PlanDialogState | null> => {
      const { text, live } = await this.cloudTerminalManager.readScreen(sessionId, { scrollback });
      // A capture that fell back to the raw buffer mid-way is not trustworthy.
      return live ? parsePlanDialog(text) : null;
    };
    let prev = await read();
    for (let i = 0; i < STABLE_READ_ATTEMPTS; i++) {
      await this.cloudTerminalManager.waitForIdle(sessionId, STABLE_READ_IDLE_MS);
      const next = await read();
      if (sameDialogState(prev, next)) return next;
      prev = next;
    }
    return 'unstable';
  }

  /**
   * Moves the dialog cursor onto the free-text option one key at a time,
   * re-reading the screen after each key — never a precomputed key count, so a
   * misread can cost a step but never overshoot. Bounded by the option count.
   * Returns the final state, or null when the dialog could not be read.
   */
  private async focusFeedbackOption(
    sessionId: CloudTerminalSessionId,
    initial: PlanDialogState
  ): Promise<PlanDialogState | null> {
    let dialog = initial;
    for (let step = 0; dialog.focused !== dialog.target && step < dialog.options.length; step++) {
      const key = dialog.focused < dialog.target ? ARROW_DOWN : ARROW_UP;
      if (!this.cloudTerminalManager.sendInput(sessionId, key, { inferUnblock: false })) return null;
      await this.sleep(KEY_SETTLE_MS);
      const next = await this.readDialog(sessionId);
      if (!next || next === 'unstable') return null;
      dialog = next;
    }
    return dialog;
  }

  private injectSucceeded(
    sessionId: CloudTerminalSessionId,
    state: SessionState,
    job: InjectJob,
    verified: boolean
  ): void {
    if (job.planPath) state.lastInjectedPlanPath = job.planPath;
    state.pendingInject = undefined;
    this.reportReviewStatus(sessionId, 'review-injected', `Plan-Review eingefügt (${job.fulfilled}/${job.total} Reviewer)`);
    this.emit('plan-review:injected', sessionId, verified);
  }

  private injectFailed(
    sessionId: CloudTerminalSessionId,
    state: SessionState,
    job: InjectJob,
    kind: InjectFailure,
    dialog?: PlanDialogState
  ): void {
    state.pendingInject = job;
    const message = injectFailureMessage(kind, dialog);
    console.warn(`[PlanReviewOrchestrator] inject ${kind} for session ${sessionId}: ${message}`);
    this.emit('plan-review:error', sessionId, message);
    this.reportReviewStatus(
      sessionId,
      'review-failed',
      `Plan-Review nicht angekommen (${job.fulfilled}/${job.total} Reviewer)`
    );
  }

  private getOrCreateState(sessionId: CloudTerminalSessionId): SessionState {
    let state = this.sessions.get(sessionId);
    if (!state) {
      state = {
        config: { enabled: false, reviewers: [] },
        locked: false,
        lockedAt: null,
        lastInjectedPlanPath: null,
      };
      this.sessions.set(sessionId, state);
    }
    return state;
  }

  private async handlePlanDetected(
    sessionId: CloudTerminalSessionId,
    planText: string,
    source: 'auto' | 'manual'
  ): Promise<void> {
    const state = this.getOrCreateState(sessionId);

    if (!state.config.enabled) {
      return;
    }

    if (state.locked) {
      // A manual trigger is an explicit re-review intent: reclaim the lock if
      // it is stale (a prior review hung without reaching the finally-reset).
      // A fresh lock means a review is genuinely running — keep blocking so we
      // never inject twice.
      const lockAge = state.lockedAt === null ? Infinity : Date.now() - state.lockedAt;
      const canReclaim = source === 'manual' && lockAge >= STALE_LOCK_MS;
      if (!canReclaim) {
        console.warn(
          `[PlanReviewOrchestrator] Session ${sessionId} review already in progress, ignoring ${source} trigger`
        );
        this.emit('plan-review:error', sessionId, 'Review already in progress for this session');
        return;
      }
      console.warn(
        `[PlanReviewOrchestrator] Session ${sessionId} reclaiming stale lock (${Math.round(lockAge / 1000)}s) on manual trigger`
      );
    }

    const session = this.cloudTerminalManager.getSession(sessionId);
    const planPath = session?.lastDetectedPlanPath ?? null;
    // Suppress repeat reviews of the same plan only for automatic (TUI-box
    // re-fire) detection. A manual trigger always re-reviews — the user asked
    // for it explicitly (e.g. the previous inject landed on the wrong focus).
    if (source === 'auto' && planPath && state.lastInjectedPlanPath === planPath) {
      console.log(
        `[PlanReviewOrchestrator] Skipping ${source} re-review for already-injected plan: ${planPath}`
      );
      return;
    }

    const pending = state.pendingInject;
    if (source === 'manual' && pending && (!planPath || !pending.planPath || pending.planPath === planPath)) {
      // The review exists already — it just did not land. Re-inject it instead
      // of paying for another reviewer run.
      state.locked = true;
      state.lockedAt = Date.now();
      try {
        this.emit('plan-review:started', sessionId, source, pending.total);
        this.emit('plan-review:aggregated', sessionId, pending.text, pending.fallbackReason);
        await this.inject(sessionId, state, pending, true);
      } finally {
        state.locked = false;
        state.lockedAt = null;
      }
      return;
    }

    const { reviewers } = state.config;
    if (reviewers.length === 0) {
      return;
    }

    state.locked = true;
    state.lockedAt = Date.now();
    state.pendingInject = undefined;

    try {
      // Two different paths on purpose:
      // - `projectPath` (registered project) keys the per-project config.
      // - `reviewCwd` is where the session actually runs, so reviewers read the
      //   same tree the plan was written against. With the session-target
      //   picker those can differ by an arbitrary amount of work — a reviewer
      //   pointed at the main checkout would report "this file doesn't exist".
      const projectPath = session?.projectPath ?? process.cwd();
      const reviewCwd = session?.effectiveCwd ?? projectPath;

      this.emit('plan-review:started', sessionId, source, reviewers.length);

      const reviewPrompt = getReviewPrompt(projectPath);
      const fullPrompt = `${reviewPrompt}\n\nIMPORTANT: Respond in English only, regardless of the plan's language.\n\n${planText}`;

      const results = await Promise.allSettled(
        reviewers.map((r) =>
          this.externalReviewer
            .reviewPlan(fullPrompt, r.providerId, r.modelId, reviewCwd)
            .then((output) => ({ reviewer: r, output }))
        )
      );

      const fulfilled: { reviewer: ReviewerConfig; output: string }[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const reviewer = reviewers[i];
        if (result.status === 'fulfilled') {
          fulfilled.push(result.value);
          this.emit(
            'plan-review:reviewer.result',
            sessionId,
            reviewer.providerId,
            'fulfilled',
            result.value.output,
            undefined
          );
        } else {
          const errMsg =
            result.reason instanceof Error ? result.reason.message : String(result.reason);
          console.warn(
            `[PlanReviewOrchestrator] Reviewer ${reviewer.providerId} failed for session ${sessionId}: ${errMsg}`
          );
          this.emit(
            'plan-review:reviewer.result',
            sessionId,
            reviewer.providerId,
            'rejected',
            undefined,
            errMsg
          );
        }
      }

      if (fulfilled.length === 0) {
        this.emit('plan-review:error', sessionId, 'All reviewers failed');
        this.reportReviewStatus(
          sessionId,
          'review-failed',
          `Plan-Review fehlgeschlagen (0/${reviewers.length} Reviewer)`
        );
        return;
      }

      const mapped = fulfilled.map((f) => ({
        providerId: f.reviewer.providerId,
        modelId: f.reviewer.modelId ?? f.reviewer.providerId,
        output: f.output,
      }));

      let aggregatedText: string;
      let fallbackReason: FallbackReason | undefined;
      if (mapped.length === 1) {
        aggregatedText = buildInjectText(mapped);
        fallbackReason = 'single-reviewer';
      } else {
        const { clusters, fallbackUsed, fallbackReason: reason } = await aggregateFindings(
          mapped,
          projectPath
        );
        if (fallbackUsed) {
          aggregatedText = buildInjectText(mapped);
          fallbackReason = reason;
        } else {
          aggregatedText = formatInject(clusters, mapped, reviewers.length);
        }
      }

      this.emit('plan-review:aggregated', sessionId, aggregatedText, fallbackReason);

      await this.inject(sessionId, state, {
        planPath,
        text: aggregatedText,
        fallbackReason,
        fulfilled: fulfilled.length,
        total: reviewers.length,
      });
    } finally {
      state.locked = false;
      state.lockedAt = null;
    }
  }
}
