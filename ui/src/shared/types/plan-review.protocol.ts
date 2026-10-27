/**
 * Plan Review Protocol Types
 *
 * Defines the WebSocket message contract for the Auto-Plan-Review feature.
 * Server-push messages flow from PlanReviewOrchestrator → websocket.ts → frontend.
 * Client messages flow from frontend → websocket.ts → PlanReviewOrchestrator.
 */

import type { CloudTerminalSessionId } from './cloud-terminal.protocol.js';
import type { ReviewArt, ReviewQuelle } from '../review-ziel.js';

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

/** Backend started a review (intent or plan) and its reviewer calls. */
export interface PlanReviewStarted {
  type: 'plan-review:started';
  sessionId: CloudTerminalSessionId;
  source: 'auto' | 'manual';
  reviewerCount: number;
  /** INT-2026-037 (FA-16): what is reviewed and where the text came from. */
  art: ReviewArt;
  quelle: ReviewQuelle;
  timestamp: string;
}

/** INT-2026-037 (FA-11): why a probe failed. */
export type ProbeGrund = 'zeitueberschreitung' | 'ueberlastet' | 'anmeldung' | 'unbekanntes_modell' | 'fehler';

/** INT-2026-037 (FA-16): one reviewer after the probe — ready, failed (and why) or missing from the config. */
export interface ProbeZeile {
  /** `provider:model` (pruefKennung). */
  reviewerId: string;
  zustand: 'bereit' | 'ausgefallen' | 'fehlt';
  grund?: ProbeGrund;
  /** Raw error text, for the display only — never in the inject text (AN-S11). */
  meldung?: string;
  /** Stand-in: the reviewer it replaces; '' when it only fills up. Absent for chosen reviewers. */
  ersatzFuer?: string;
}

export interface PlanReviewProbe {
  type: 'plan-review:probe';
  sessionId: CloudTerminalSessionId;
  zeilen: ProbeZeile[];
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
  /** true: seen in the plan dialog's free-text option; false: typed without reading the screen back
   *  (at the prompt, or into a dialog of a session without a tmux screen). */
  verified?: boolean;
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
