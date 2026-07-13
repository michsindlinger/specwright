/**
 * Plan Review Protocol Types
 *
 * Defines the WebSocket message contract for the Auto-Plan-Review feature.
 * Server-push messages flow from PlanReviewOrchestrator → websocket.ts → frontend.
 * Client messages flow from frontend → websocket.ts → PlanReviewOrchestrator.
 */

import type { CloudTerminalSessionId } from './cloud-terminal.protocol.js';

// ─── Reviewer config (shared with backend types) ───────────────────────────

export interface ReviewerConfig {
  providerId: string;
  modelId: string | undefined;
}

export interface TabReviewConfig {
  enabled: boolean;
  reviewers: ReviewerConfig[];
}

/**
 * Why consensus clustering was skipped and the raw per-reviewer output was
 * injected instead. `undefined` on the aggregated event ⇒ clustering succeeded.
 *  - single-reviewer: fewer than 2 reviewers fulfilled, nothing to cluster
 *  - llm-error:       aggregator model call threw / timed out
 *  - empty-output:    aggregator returned nothing
 *  - parse-error:     aggregator output was not valid JSON (after one retry)
 *  - schema-invalid:  aggregator JSON did not match the cluster schema (after one retry)
 */
export type FallbackReason =
  | 'single-reviewer'
  | 'llm-error'
  | 'empty-output'
  | 'parse-error'
  | 'schema-invalid';

// ─── Server → Client ────────────────────────────────────────────────────────

/** Pushed on tab connect / resume so frontend has current toggle + prompt state. */
export interface PlanReviewConfigSnapshot {
  type: 'plan-review:config.snapshot';
  sessionId: CloudTerminalSessionId;
  enabled: boolean;
  reviewers: ReviewerConfig[];
  prompt: string;
  timestamp: string;
}

/** Backend detected a plan and started reviewer calls. */
export interface PlanReviewStarted {
  type: 'plan-review:started';
  sessionId: CloudTerminalSessionId;
  source: 'auto' | 'manual';
  reviewerCount: number;
  timestamp: string;
}

/** One reviewer finished (either fulfilled or rejected). */
export interface PlanReviewReviewerResult {
  type: 'plan-review:reviewer.result';
  sessionId: CloudTerminalSessionId;
  reviewerId: string;
  status: 'fulfilled' | 'rejected';
  output?: string;
  error?: string;
  timestamp: string;
}

/** All fulfilled reviewers aggregated; inject is about to happen. */
export interface PlanReviewAggregated {
  type: 'plan-review:aggregated';
  sessionId: CloudTerminalSessionId;
  aggregatedText: string;
  /** Present only when clustering was skipped → raw reviewer output injected. */
  fallbackReason?: FallbackReason;
  timestamp: string;
}

/** Aggregated review text was injected into the terminal session. */
export interface PlanReviewInjected {
  type: 'plan-review:injected';
  sessionId: CloudTerminalSessionId;
  timestamp: string;
}

/** A non-recoverable error occurred (e.g. buffer extraction failed, all reviewers failed). */
export interface PlanReviewError {
  type: 'plan-review:error';
  sessionId?: CloudTerminalSessionId;
  message: string;
  timestamp: string;
}

// ─── Client → Server ────────────────────────────────────────────────────────

/** Frontend toggle change or reviewer selection update. Sent without debounce. */
export interface PlanReviewConfigUpdate {
  type: 'plan-review:config.update';
  sessionId: CloudTerminalSessionId;
  enabled: boolean;
  reviewers: ReviewerConfig[];
}

/** Frontend "Review last plan" button click. */
export interface PlanReviewTriggerManual {
  type: 'plan-review:trigger.manual';
  sessionId: CloudTerminalSessionId;
}
