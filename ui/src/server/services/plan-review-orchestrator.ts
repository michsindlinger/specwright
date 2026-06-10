import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import { CloudTerminalManager } from './cloud-terminal-manager.js';
import { ExternalReviewer } from './external-reviewer.js';
import { aggregateFindings, formatInject } from './finding-aggregator.js';
import { getReviewPrompt } from '../general-config.js';
import { CloudTerminalSessionId } from '../../shared/types/cloud-terminal.protocol.js';

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
}

/** A manual re-trigger may reclaim a lock older than this — a fresh lock means
 *  a review is genuinely still running, so concurrent manual triggers still
 *  block to avoid double-injection. */
const STALE_LOCK_MS = 3 * 60 * 1000;

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

/**
 * Coordinates plan-detected events → parallel reviewer spawns → aggregation → inject.
 *
 * Emits (as EventEmitter):
 *   'plan-review:started'          (sessionId, source, reviewerCount)
 *   'plan-review:reviewer.result'  (sessionId, providerId, status, output?, error?)
 *   'plan-review:aggregated'       (sessionId, aggregatedText)
 *   'plan-review:injected'         (sessionId)
 *   'plan-review:error'            (sessionId, message)
 *
 * websocket.ts (APR-007) listens to these events and forwards to WS clients.
 */
export class PlanReviewOrchestrator extends EventEmitter {
  private sessions: Map<CloudTerminalSessionId, SessionState> = new Map();
  private readonly cloudTerminalManager: CloudTerminalManager;
  private readonly externalReviewer: ExternalReviewer;

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
    const config = state?.config ?? { enabled: false, reviewers: [] };
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

    const { reviewers } = state.config;
    if (reviewers.length === 0) {
      return;
    }

    state.locked = true;
    state.lockedAt = Date.now();

    try {
      const projectPath = session?.projectPath ?? process.cwd();

      this.emit('plan-review:started', sessionId, source, reviewers.length);

      const reviewPrompt = getReviewPrompt(projectPath);
      const fullPrompt = `${reviewPrompt}\n\nIMPORTANT: Respond in English only, regardless of the plan's language.\n\n${planText}`;

      const results = await Promise.allSettled(
        reviewers.map((r) =>
          this.externalReviewer
            .reviewPlan(fullPrompt, r.providerId, r.modelId, projectPath)
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
        return;
      }

      const mapped = fulfilled.map((f) => ({
        providerId: f.reviewer.providerId,
        modelId: f.reviewer.modelId ?? f.reviewer.providerId,
        output: f.output,
      }));

      let aggregatedText: string;
      if (mapped.length === 1) {
        aggregatedText = buildInjectText(mapped);
      } else {
        const { clusters, fallbackUsed } = await aggregateFindings(mapped, projectPath);
        aggregatedText = fallbackUsed
          ? buildInjectText(mapped)
          : formatInject(clusters, mapped, reviewers.length);
      }

      this.emit('plan-review:aggregated', sessionId, aggregatedText);

      await this.cloudTerminalManager.waitForIdle(sessionId, 500);
      const written = this.cloudTerminalManager.sendInput(sessionId, aggregatedText + '\n');
      if (written && planPath) {
        state.lastInjectedPlanPath = planPath;
      }

      this.emit('plan-review:injected', sessionId);
    } finally {
      state.locked = false;
      state.lockedAt = null;
    }
  }
}
