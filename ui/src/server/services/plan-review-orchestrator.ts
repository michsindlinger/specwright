import { EventEmitter } from 'events';
import { readFile } from 'fs/promises';
import { WebSocket } from 'ws';
import { CloudTerminalManager } from './cloud-terminal-manager.js';
import { ExternalReviewer, ordneProbeFehler } from './external-reviewer.js';
import { aggregateFindings, formatInject } from './finding-aggregator.js';
import { getIntentReviewPrompt, getReviewPrompt } from '../general-config.js';
import { getDefaultReviewers, getModel, getReviewErsatz } from '../model-config.js';
import { pruefeEingabeWartet, readStableScreen } from './dialog-driver.js';
import { pruefKennung, waehlePruefer, type ProbeErgebnis } from './review-auswahl.js';
import type { ReviewArt, ReviewQuelle, ReviewZiel } from '../../shared/review-ziel.js';
import {
  injectProbe,
  optionLineHas,
  parsePlanDialog,
  sameDialogState,
  sanitizeInjectText,
  type PlanDialogState,
} from '../utils/plan-dialog-state.js';
import { CloudTerminalSessionId } from '../../shared/types/cloud-terminal.protocol.js';
import type { FallbackReason, ProbeGrund, ProbeZeile } from '../../shared/types/plan-review.protocol.js';

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
  /** Review that was produced but did not land. A manual trigger for the same
   *  target re-injects it without another reviewer run. Cleared on success,
   *  toggle-off (plan-mode auto reviews only), a fresh review run and session close. */
  pendingInject?: InjectJob;
  /** INT-2026-037 (FA-23): the pending review is handed over at the next `stop`. */
  wartetAufStop?: boolean;
  /** Hand-over attempts of the pending review (at most UEBERGABE_MAX_VERSUCHE). */
  uebergabeVersuche?: number;
}

/** One aggregated review on its way into the terminal. */
interface InjectJob {
  art: ReviewArt;
  quelle: ReviewQuelle;
  /** Reviewed file (folder) or plan-mode path; the key for a manual re-inject. */
  pfad: string | null;
  /** From the plan-box auto detection (dropped when auto-review is turned off). */
  auto: boolean;
  text: string;
  fallbackReason?: FallbackReason;
  /** Reviewers that delivered / were selected (bell reason "2/3"). */
  fulfilled: number;
  total: number;
}

type InjectFailure = 'focus' | 'unreadable' | 'no-screen' | 'not-visible' | 'dialog-gone' | 'not-active' | 'busy';

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
/** INT-2026-037 (FA-12): a probe result is reused this long. */
export const PROBE_CACHE_MS = 5 * 60 * 1000;
/** INT-2026-037 (FA-23): attempts to hand a review over into an empty prompt line (like FIRST_INPUT_MAX_VERSUCHE). */
export const UEBERGABE_MAX_VERSUCHE = 3;
/** Pause between pasting the review and Enter (like PASTE_ENTER_DELAY_MS of the Vorhaben service). */
const UEBERGABE_ENTER_MS = 150;

const GRUND_TEXT: Record<ProbeGrund, string> = {
  zeitueberschreitung: 'Zeitüberschreitung',
  ueberlastet: 'überlastet',
  anmeldung: 'Anmeldung',
  unbekanntes_modell: 'unbekanntes Modell',
  fehler: 'Fehler',
};
const QUELLE_TEXT: Record<ReviewQuelle, string> = {
  'intent-ordner': 'Absicht im Ordner',
  'plan-ordner': 'Plan im Ordner',
  'plan-mode': 'Plan-Mode-Plan',
};

/** One failed reviewer as the author reads it: category only, never the raw error (AN-S11). */
function ausfallText(z: Pick<ProbeZeile, 'reviewerId' | 'zustand' | 'grund'>): string {
  return `${z.reviewerId}: ${z.zustand === 'fehlt' ? 'nicht in der Konfiguration' : GRUND_TEXT[z.grund ?? 'fehler']}`;
}

/** INT-2026-037 (FA-17): what was reviewed, from where, and on how many reviewers the result rests. */
export function autorKopf(
  art: ReviewArt,
  quelle: ReviewQuelle,
  basis: { erfolgreich: number; gesamt: number; ausfaelle: string[]; ersatz: string[] }
): string {
  const zeilen = [
    `===== ${art === 'intent' ? 'Absicht-Review' : 'Plan-Review'} · ${QUELLE_TEXT[quelle]} =====`,
    `Ergebnis aus ${basis.erfolgreich} von ${basis.gesamt} Prüfern.`,
  ];
  if (basis.ausfaelle.length > 0) zeilen.push(`Ausgefallen: ${basis.ausfaelle.join('; ')}`);
  if (basis.ersatz.length > 0) zeilen.push(`Ersatz: ${basis.ersatz.join('; ')}`);
  return zeilen.join('\n');
}

/** INT-2026-037 (FA-19): the rules the author follows — the same text as in the intent/plan workflows. */
export function autorRegeln(art: ReviewArt): string {
  return (
    'Regeln: Lehne einen Befund nur mit lesbarem Beleg ab (`datei:zeile` oder Abschnitt in Absicht/Spec). ' +
    'Ohne Beleg frag Michael nach R2 („Befund n, Gegenstand: Vorschlag. Ok?“). ' +
    'Übernimm die Schweregrade, wie die Prüfer sie gesetzt haben. ' +
    (art === 'intent' ? 'Blocker, LIKELY-Befunde und jede DROP-Empfehlung – auch von nur einem Prüfer – gehen immer an Michael. ' : '') +
    `Jede Entscheidung kommt ins Dokument: ${art === 'intent' ? 'Absicht → Abschnitt „Review-Entscheidungen“.' : 'Plan → §12.'}`
  );
}

function buildInjectText(
  reviewerOutputs: { providerId: string; modelId: string; output: string }[]
): string {
  return reviewerOutputs.map((r) => `## Reviewer: ${r.providerId}:${r.modelId}\n${r.output}`).join('\n\n');
}

function injectFailureMessage(kind: InjectFailure, dialog?: PlanDialogState): string {
  const target = dialog?.target ?? 3;
  switch (kind) {
    case 'focus':
      return `Could not move the plan dialog to option ${target} (cursor on ${dialog?.focused ?? '?'}); nothing was typed. Move the cursor to option ${target} and press the review button to insert the review.`;
    case 'unreadable':
      return 'Plan dialog is open but its state could not be read; nothing was typed. Move the cursor to "Tell Claude what to change" and press the review button to insert the review.';
    case 'not-visible':
      return `Review text did not show up in option ${target} after typing. Check the tab; the review button inserts it again.`;
    case 'dialog-gone':
      return 'Plan dialog could not be read after typing the review. Check the tab; the review button inserts it again.';
    case 'busy':
      return 'The UI is already writing into this session (another answer or review); nothing was typed. Press the review button again in a moment.';
    case 'no-screen':
      return 'Plan dialog is open, but this session has no tmux screen to read, so the cursor cannot be checked; nothing was typed. Move the cursor to "Tell Claude what to change" and press the review button — the review is then typed without a check.';
    case 'not-active':
      return 'Session is not active; nothing was typed. the review button inserts the review once it is back.';
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
  /** Overridable in tests: is a chosen reviewer in the model config (FA-18)? */
  private imConfig = (r: ReviewerConfig): boolean => r.modelId === undefined || getModel(r.providerId, r.modelId) !== undefined;
  /** Overridable in tests: the stand-in row of the settings (FA-14). */
  private ersatzReihe = (projectPath: string): ReviewerConfig[] => getReviewErsatz(projectPath);
  /** INT-2026-037 (FA-12): probe results per `provider:model`. */
  private probeCache = new Map<string, { ergebnis: ProbeErgebnis; at: number }>();

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

    // INT-2026-037 (FA-23): a review that found no empty prompt line is handed over at the next stop.
    cloudTerminalManager.on('session.agent-event', (sessionId: CloudTerminalSessionId, event: string) => {
      if (event !== 'stop') return;
      const state = this.sessions.get(sessionId);
      const job = state?.pendingInject;
      if (!state || !job || !state.wartetAufStop || state.locked) return;
      state.locked = true;
      state.lockedAt = Date.now();
      this.inject(sessionId, state, job)
        .catch((err: unknown) => this.emit('plan-review:error', sessionId, err instanceof Error ? err.message : String(err)))
        .finally(() => {
          state.locked = false;
          state.lockedAt = null;
        });
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
      // Turning auto-review off drops only a pending plan-box review; an intent or button review stays (FA-23).
      ...(config.enabled || !existing?.pendingInject?.auto
        ? { pendingInject: existing?.pendingInject, wartetAufStop: existing?.wartetAufStop, uebergabeVersuche: existing?.uebergabeVersuche }
        : {}),
    });
    this.cloudTerminalManager.setPlanReviewEnabled(sessionId, config.enabled);
  }

  /**
   * INT-2026-025 (FA-22): true while a review for this session is running
   * (lock held). Read-only — the Anruf sender refuses a voice approval then,
   * so it never races the review text into the plan dialog.
   */
  public isReviewRunning(sessionId: CloudTerminalSessionId): boolean {
    return this.sessions.get(sessionId)?.locked === true;
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
    // INT-2026-007 (plan §4 #1b, AR-08): every machine write into the PTY runs
    // under the session's single-flight lock — read, keys and text of one
    // inject are one logical write; a concurrent UI write is refused, never queued.
    const result = await this.cloudTerminalManager.withMachineWrite(sessionId, () => this.injectUnlocked(sessionId, state, job, retry));
    if (result.ok) return;
    // INT-2026-037 (E30): another machine write (e.g. the first input) holds the lock — wait for the next stop, no attempt counted.
    if (result.grund === 'beschaeftigt' && state.wartetAufStop) return;
    this.injectFailed(sessionId, state, job, result.grund === 'beschaeftigt' ? 'busy' : 'not-active');
  }

  private async injectUnlocked(
    sessionId: CloudTerminalSessionId,
    state: SessionState,
    job: InjectJob,
    retry: boolean
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
      // INT-2026-037 (AR-08): no screen to read → never type at the prompt blind; wait for the next stop.
      if (!dialogOpen) return this.uebergabeWartet(sessionId, state, job);
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
    await this.submitWennLeer(sessionId, state, job, text);
  }

  /**
   * INT-2026-037 (FA-23, AR-08): no plan dialog — type the review and press
   * Enter only into an empty prompt line, checked on a stable screen with the
   * strict check of „Nächster Schritt" (cursor probe against the suggestion).
   * Anything else (text in the box, a dialog, a running turn) waits for the
   * next stop. Runs under the machine-write lock of `inject()`.
   */
  private async submitWennLeer(sessionId: CloudTerminalSessionId, state: SessionState, job: InjectJob, text: string): Promise<void> {
    const ctm = this.cloudTerminalManager;
    const screen = await readStableScreen(ctm, sessionId);
    const leer = screen !== 'unstable' && screen.live && (await pruefeEingabeWartet(ctm, sessionId, screen.text)) === 'wartet';
    if (!leer) return this.uebergabeWartet(sessionId, state, job);
    if (!ctm.sendInput(sessionId, text, { inferUnblock: false })) return this.injectFailed(sessionId, state, job, 'not-active');
    await this.sleep(UEBERGABE_ENTER_MS);
    ctm.sendInput(sessionId, '\r', { inferUnblock: false });
    this.injectSucceeded(sessionId, state, job, false);
  }

  /** Keeps the review for the next stop; after UEBERGABE_MAX_VERSUCHE the button inserts it. */
  private uebergabeWartet(sessionId: CloudTerminalSessionId, state: SessionState, job: InjectJob): void {
    state.pendingInject = job;
    state.uebergabeVersuche = (state.uebergabeVersuche ?? 0) + 1;
    state.wartetAufStop = state.uebergabeVersuche < UEBERGABE_MAX_VERSUCHE;
    if (state.wartetAufStop) {
      console.log(`[PlanReviewOrchestrator] session ${sessionId}: prompt line not empty, review waits for the next stop (${state.uebergabeVersuche}/${UEBERGABE_MAX_VERSUCHE})`);
      return;
    }
    this.emit('plan-review:error', sessionId, `Review nicht übergeben – „${job.art === 'intent' ? 'Absicht prüfen' : 'Plan prüfen'}“ fügt es ein.`);
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
    if (job.pfad) state.lastInjectedPlanPath = job.pfad;
    state.pendingInject = undefined;
    state.wartetAufStop = false;
    state.uebergabeVersuche = 0;
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
    state.wartetAufStop = false;
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
        config: { enabled: false, reviewers: getDefaultReviewers() },
        locked: false,
        lockedAt: null,
        lastInjectedPlanPath: null,
      };
      this.sessions.set(sessionId, state);
    }
    return state;
  }

  /** Plan-box auto detection (dead since Claude Code dropped the box) — gated by the tab toggle. */
  private async handlePlanDetected(
    sessionId: CloudTerminalSessionId,
    planText: string,
    source: 'auto' | 'manual'
  ): Promise<void> {
    const state = this.getOrCreateState(sessionId);
    if (!state.config.enabled) return;
    const pfad = this.cloudTerminalManager.getSession(sessionId)?.lastDetectedPlanPath ?? null;
    this.startReview(sessionId, { art: 'plan', quelle: 'plan-mode', pfad, text: planText }, source);
  }

  /**
   * INT-2026-037 (FA-01, FA-10): starts a review of `ziel` — the button
   * (`manual`, no toggle gate, AN-S04), the intent auto start and the plan box.
   * The lock is checked synchronously: `beschaeftigt` while a review runs (a
   * manual trigger may reclaim a stale lock). The run itself is async.
   */
  public startReview(sessionId: CloudTerminalSessionId, ziel: ReviewZiel, source: 'auto' | 'manual'): 'gestartet' | 'beschaeftigt' {
    const state = this.getOrCreateState(sessionId);
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
        return 'beschaeftigt';
      }
      console.warn(
        `[PlanReviewOrchestrator] Session ${sessionId} reclaiming stale lock (${Math.round(lockAge / 1000)}s) on manual trigger`
      );
    }
    state.locked = true;
    state.lockedAt = Date.now();
    this.runReview(sessionId, state, ziel, source)
      .catch((err: unknown) => {
        console.error(`[PlanReviewOrchestrator] Unhandled error for session ${sessionId}:`, err);
        this.emit('plan-review:error', sessionId, err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        state.locked = false;
        state.lockedAt = null;
      });
    return 'gestartet';
  }

  /** INT-2026-037 (FA-11, FA-12): probes every reviewer once in parallel; results are cached per `provider:model`. */
  private async probeAll(reviewers: ReviewerConfig[]): Promise<Map<string, ProbeErgebnis>> {
    const out = new Map<string, ProbeErgebnis>();
    const eindeutig = new Map(reviewers.filter(this.imConfig).map((r) => [pruefKennung(r), r]));
    await Promise.all(
      [...eindeutig].map(async ([id, r]) => {
        const cached = this.probeCache.get(id);
        if (cached && Date.now() - cached.at < PROBE_CACHE_MS) return void out.set(id, cached.ergebnis);
        const ergebnis = await this.externalReviewer.probe(r.providerId, r.modelId);
        this.probeCache.set(id, { ergebnis, at: Date.now() });
        out.set(id, ergebnis);
      })
    );
    return out;
  }

  /** INT-2026-037 (FA-22): no reviewer delivered — the reasons in the block, nothing typed. */
  private scheitern(sessionId: CloudTerminalSessionId, art: ReviewArt, gruende: string[], gesamt: number): void {
    this.emit('plan-review:error', sessionId, `Review gescheitert: ${gruende.join(', ') || 'kein Prüfer bereit'}`);
    this.reportReviewStatus(
      sessionId,
      'review-failed',
      `${art === 'intent' ? 'Absicht-Review' : 'Plan-Review'} fehlgeschlagen (0/${gesamt} Reviewer)`
    );
  }

  private async runReview(
    sessionId: CloudTerminalSessionId,
    state: SessionState,
    ziel: ReviewZiel,
    source: 'auto' | 'manual'
  ): Promise<void> {
    const session = this.cloudTerminalManager.getSession(sessionId);
    const { art, quelle, pfad } = ziel;
    // Suppress repeat reviews of the same plan only for automatic (TUI-box
    // re-fire) detection. A manual trigger always re-reviews — the user asked
    // for it explicitly (e.g. the previous inject landed on the wrong focus).
    if (source === 'auto' && quelle === 'plan-mode' && pfad && state.lastInjectedPlanPath === pfad) {
      console.log(`[PlanReviewOrchestrator] Skipping ${source} re-review for already-injected plan: ${pfad}`);
      return;
    }

    const pending = state.pendingInject;
    if (source === 'manual' && pending && pending.art === art && (!pfad || !pending.pfad || pending.pfad === pfad)) {
      // The review exists already — it just did not land. Re-inject it instead
      // of paying for another reviewer run.
      state.uebergabeVersuche = 0;
      this.emit('plan-review:started', sessionId, source, pending.total, pending.art, pending.quelle);
      this.emit('plan-review:aggregated', sessionId, pending.text, pending.fallbackReason);
      await this.inject(sessionId, state, pending, true);
      return;
    }

    // FA-01: the folder file as it is NOW; later edits do not change this run.
    let text: string;
    if (ziel.text !== undefined) {
      text = ziel.text;
    } else {
      try {
        text = await readFile(pfad ?? '', 'utf-8');
      } catch (err) {
        this.emit('plan-review:error', sessionId, `Datei nicht lesbar: ${pfad ?? '?'} (${err instanceof Error ? err.message : String(err)})`);
        return;
      }
    }

    state.pendingInject = undefined;
    state.wartetAufStop = false;
    state.uebergabeVersuche = 0;

    // Two different paths on purpose:
    // - `projectPath` (registered project) keys the per-project config.
    // - `reviewCwd` is where the session actually runs, so reviewers read the
    //   same tree the plan was written against. With the session-target
    //   picker those can differ by an arbitrary amount of work — a reviewer
    //   pointed at the main checkout would report "this file doesn't exist".
    const projectPath = session?.projectPath ?? process.cwd();
    const reviewCwd = session?.effectiveCwd ?? projectPath;

    const gewaehlt = state.config.reviewers;
    const ersatz = this.ersatzReihe(projectPath);
    this.emit('plan-review:started', sessionId, source, gewaehlt.length, art, quelle);

    const probe = await this.probeAll([...gewaehlt, ...ersatz]);
    const { laufen, zeilen } = waehlePruefer(gewaehlt, ersatz, probe, this.imConfig);
    this.emit('plan-review:probe', sessionId, zeilen);
    const ausfaelle = zeilen.filter((z) => z.zustand !== 'bereit').map(ausfallText);
    if (laufen.length === 0) return this.scheitern(sessionId, art, ausfaelle, gewaehlt.length);

    const reviewPrompt = art === 'intent' ? getIntentReviewPrompt(projectPath) : getReviewPrompt(projectPath);
    const fullPrompt = `${reviewPrompt}\n\nIMPORTANT: Respond in English only, regardless of the document's language.\n\n${text}`;

    const results = await Promise.allSettled(
      laufen.map((r) =>
        this.externalReviewer
          .reviewPlan(fullPrompt, r.providerId, r.modelId, reviewCwd)
          .then((output) => ({ reviewer: r, output }))
      )
    );

    const fulfilled: { reviewer: ReviewerConfig; output: string }[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const id = pruefKennung(laufen[i]);
      if (result.status === 'fulfilled') {
        fulfilled.push(result.value);
        this.emit('plan-review:reviewer.result', sessionId, id, 'fulfilled', result.value.output, undefined);
      } else {
        const errMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        console.warn(`[PlanReviewOrchestrator] Reviewer ${id} failed for session ${sessionId}: ${errMsg}`);
        this.emit('plan-review:reviewer.result', sessionId, id, 'rejected', undefined, errMsg);
        ausfaelle.push(ausfallText({ reviewerId: id, zustand: 'ausgefallen', grund: ordneProbeFehler(errMsg) }));
      }
    }

    if (fulfilled.length === 0) return this.scheitern(sessionId, art, ausfaelle, laufen.length);

    const mapped = fulfilled.map((f) => ({
      providerId: f.reviewer.providerId,
      modelId: f.reviewer.modelId ?? f.reviewer.providerId,
      output: f.output,
    }));

    let koerper: string;
    let fallbackReason: FallbackReason | undefined;
    if (mapped.length === 1) {
      koerper = buildInjectText(mapped);
      fallbackReason = 'single-reviewer';
    } else {
      const { clusters, fallbackUsed, fallbackReason: reason } = await aggregateFindings(mapped, projectPath);
      if (fallbackUsed) {
        koerper = buildInjectText(mapped);
        fallbackReason = reason;
      } else {
        koerper = formatInject(clusters, mapped, laufen.length);
      }
    }

    const kopf = autorKopf(art, quelle, {
      erfolgreich: fulfilled.length,
      gesamt: laufen.length,
      ausfaelle,
      ersatz: zeilen.filter((z) => z.ersatzFuer !== undefined).map((z) => `${z.reviewerId} ${z.ersatzFuer ? `für ${z.ersatzFuer}` : 'füllt auf'}`),
    });
    const aggregatedText = `${kopf}\n\n${koerper}\n\n${autorRegeln(art)}`;
    this.emit('plan-review:aggregated', sessionId, aggregatedText, fallbackReason);

    await this.inject(sessionId, state, {
      art,
      quelle,
      pfad,
      auto: source === 'auto' && quelle === 'plan-mode',
      text: aggregatedText,
      fallbackReason,
      fulfilled: fulfilled.length,
      total: laufen.length,
    });
  }
}
