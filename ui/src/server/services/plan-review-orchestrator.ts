import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import { CloudTerminalManager } from './cloud-terminal-manager.js';
import { ExternalReviewer } from './external-reviewer.js';
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
}

function buildInjectText(
  reviewerOutputs: { providerId: string; modelId: string; output: string }[]
): string {
  const sections = reviewerOutputs
    .map((r) => `## Reviewer: ${r.providerId}:${r.modelId}\n${r.output}`)
    .join('\n\n');
  return (
    'Please review your previous plan against the following external review feedback and update your plan accordingly.' +
    ' Focus on legitimate concerns; ignore feedback that conflicts with the original requirements.\n\n' +
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
  }

  /** Update per-session toggle + reviewer selection; syncs planReviewEnabled flag in CTM. */
  public setTabConfig(sessionId: CloudTerminalSessionId, config: TabReviewConfig): void {
    const existing = this.sessions.get(sessionId);
    this.sessions.set(sessionId, {
      config,
      locked: existing?.locked ?? false,
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
      state = { config: { enabled: false, reviewers: [] }, locked: false };
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
      console.warn(
        `[PlanReviewOrchestrator] Session ${sessionId} review already in progress, ignoring ${source} trigger`
      );
      this.emit('plan-review:error', sessionId, 'Review already in progress for this session');
      return;
    }

    const { reviewers } = state.config;
    if (reviewers.length === 0) {
      return;
    }

    state.locked = true;

    try {
      const session = this.cloudTerminalManager.getSession(sessionId);
      const projectPath = session?.projectPath ?? process.cwd();

      this.emit('plan-review:started', sessionId, source, reviewers.length);

      const reviewPrompt = getReviewPrompt(projectPath);
      const fullPrompt = `${reviewPrompt}\n\n${planText}`;

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

      const aggregatedText = buildInjectText(
        fulfilled.map((f) => ({
          providerId: f.reviewer.providerId,
          modelId: f.reviewer.modelId ?? f.reviewer.providerId,
          output: f.output,
        }))
      );

      this.emit('plan-review:aggregated', sessionId, aggregatedText);

      await this.cloudTerminalManager.waitForIdle(sessionId, 500);
      this.cloudTerminalManager.sendInput(sessionId, aggregatedText + '\n');

      this.emit('plan-review:injected', sessionId);
    } finally {
      state.locked = false;
    }
  }
}
