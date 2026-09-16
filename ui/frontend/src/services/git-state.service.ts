/**
 * GitStateService — process-long git state of the active project (INT-2026-010,
 * FA-17, review E6/E17/E21). Before, `app.ts` held the eleven gateway
 * subscriptions, the handlers and the state, because the git bar sat in the
 * frame. Now the bar is a section of the project page: a component that comes
 * and goes with the route. The state and the subscriptions must not — a
 * commit → push run has to survive a route change, and the two dialogs stay
 * overlays in `app.ts` (no dialog caught in a shadow root). So this singleton
 * owns them, like `vorhabenService` owns `vorhaben:state`.
 *
 * Consumers: `aos-projekt-git` (the bar, view only) and `app.ts` (the two
 * dialogs). Actions are methods; every state change notifies subscribers.
 */

import { gateway, type MessageHandler } from '../gateway.js';
import type { GitStatusData, GitBranchEntry, GitPrInfo } from '../../../src/shared/types/git.protocol.js';
import type { AosToastNotification } from '../components/toast-notification.js';

export type PullStrategy = 'merge' | 'rebase' | 'ff-only';

export interface GitState {
  gitStatus: GitStatusData | null;
  gitLoading: boolean;
  gitBranches: GitBranchEntry[];
  gitPrInfo: GitPrInfo[];
  isGitOperationRunning: boolean;
  /** True while a project is active — the bar shows "kein Projekt" otherwise. */
  hasProject: boolean;
  showCommitDialog: boolean;
  commitError: string;
  committing: boolean;
  generatingCommitMessage: boolean;
  pendingAutoPush: boolean;
  commitAndPushPhase: 'idle' | 'committing' | 'pushing';
  showPullStrategyDialog: boolean;
  pullStrategyRetryPush: boolean;
}

export type GitStateListener = (state: GitState) => void;
export type GeneratedMessageListener = (message: string) => void;

const INITIAL: GitState = {
  gitStatus: null,
  gitLoading: false,
  gitBranches: [],
  gitPrInfo: [],
  isGitOperationRunning: false,
  hasProject: false,
  showCommitDialog: false,
  commitError: '',
  committing: false,
  generatingCommitMessage: false,
  pendingAutoPush: false,
  commitAndPushPhase: 'idle',
  showPullStrategyDialog: false,
  pullStrategyRetryPush: false,
};

export class GitStateService {
  private _state: GitState = { ...INITIAL };
  private readonly listeners = new Set<GitStateListener>();
  private readonly messageListeners = new Set<GeneratedMessageListener>();
  private started = false;
  private readonly handlers: Array<[string, MessageHandler]> = [
    ['git:status:response', (msg) => this.onStatus(msg)],
    ['git:branches:response', (msg) => this.onBranches(msg)],
    ['git:checkout:response', (msg) => this.onCheckout(msg)],
    ['git:commit:response', (msg) => this.onCommit(msg)],
    ['git:pull:response', (msg) => this.onPull(msg)],
    ['git:push:response', (msg) => this.onPush(msg)],
    ['git:revert:response', (msg) => this.onRevert(msg)],
    ['git:delete-untracked:response', (msg) => this.onDeleteUntracked(msg)],
    ['git:pr-info:response', (msg) => this.onPrInfo(msg)],
    ['git:generate-commit-message:response', (msg) => this.onGenerateCommitMessage(msg)],
    ['git:error', (msg) => this.onError(msg)],
  ];

  get state(): GitState {
    return this._state;
  }

  /** Subscribes; registers the gateway subscriptions once, on first use. */
  subscribe(listener: GitStateListener): () => void {
    this.listeners.add(listener);
    this.ensureStarted();
    listener(this._state);
    return () => this.listeners.delete(listener);
  }

  /** A generated commit message arrived — the commit dialog fills its textarea. */
  onGeneratedMessage(listener: GeneratedMessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  /** Registers the eleven gateway subscriptions exactly once (idempotent). */
  ensureStarted(): void {
    if (this.started) return;
    this.started = true;
    for (const [type, handler] of this.handlers) gateway.on(type, handler);
  }

  /** Number of gateway subscriptions this service holds — for the test only. */
  get subscriptionCount(): number {
    return this.started ? this.handlers.length : 0;
  }

  private set(patch: Partial<GitState>): void {
    this._state = { ...this._state, ...patch };
    for (const l of this.listeners) l(this._state);
  }

  private toast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
    const toast = document.querySelector('aos-toast-notification') as AosToastNotification | null;
    toast?.show(message, type);
  }

  // ---- actions (from app.ts, unchanged in effect) ----

  /** Load status, branches and PR info for the active project; clears when there is none. */
  loadStatus(hasProject: boolean): void {
    this.ensureStarted();
    if (!hasProject) {
      this.set({ hasProject: false, gitStatus: null, gitBranches: [], gitPrInfo: [] });
      return;
    }
    this.set({ hasProject: true, gitLoading: true });
    gateway.requestGitStatus();
    gateway.requestGitBranches();
    gateway.requestGitPrInfo();
  }

  refresh(): void {
    this.set({ gitLoading: true });
    gateway.requestGitStatus();
    gateway.requestGitPrInfo();
  }

  pull(strategy?: PullStrategy): void {
    this.set({ isGitOperationRunning: true });
    gateway.requestGitPull(strategy);
  }

  push(): void {
    this.set({ isGitOperationRunning: true });
    gateway.requestGitPush();
  }

  checkout(branch: string): void {
    this.set({ gitLoading: true });
    gateway.sendGitCheckout(branch);
  }

  openCommitDialog(autoPush = false): void {
    this.set({ commitError: '', pendingAutoPush: autoPush, commitAndPushPhase: autoPush ? 'committing' : 'idle', showCommitDialog: true });
    gateway.requestGitStatus();
  }

  closeCommitDialog(): void {
    if (this._state.commitAndPushPhase === 'pushing') return;
    this.set({ showCommitDialog: false, commitError: '', pendingAutoPush: false, commitAndPushPhase: 'idle' });
  }

  commit(files: string[], message: string): void {
    this.set({ committing: true, commitError: '', ...(this._state.pendingAutoPush ? { commitAndPushPhase: 'committing' as const } : {}) });
    gateway.sendGitCommit(files, message);
  }

  generateCommitMessage(files: string[]): void {
    this.set({ generatingCommitMessage: true });
    gateway.requestGenerateCommitMessage(files);
  }

  revertFile(file: string): void {
    gateway.sendGitRevert([file]);
  }

  revertAll(): void {
    const revertableFiles = (this._state.gitStatus?.files ?? []).filter((f) => f.status !== '?').map((f) => f.path);
    if (revertableFiles.length > 0) gateway.sendGitRevert(revertableFiles);
  }

  deleteUntracked(file: string): void {
    gateway.sendGitDeleteUntracked(file);
  }

  pullStrategySelect(strategy: PullStrategy): void {
    this.set({ showPullStrategyDialog: false, isGitOperationRunning: true });
    gateway.requestGitPull(strategy);
  }

  pullStrategyCancel(): void {
    this.set({ showPullStrategyDialog: false, pullStrategyRetryPush: false });
  }

  // ---- gateway responses (moved 1:1 from app.ts) ----

  private onStatus(msg: Record<string, unknown>): void {
    this.set({ gitStatus: msg.data as GitStatusData, gitLoading: false });
  }

  private onBranches(msg: Record<string, unknown>): void {
    this.set({ gitBranches: (msg.branches as GitBranchEntry[]) || [] });
  }

  private onCheckout(msg: Record<string, unknown>): void {
    const data = msg.data as { success: boolean; branch: string } | undefined;
    if (data?.success) {
      this.toast(`Branch gewechselt zu ${data.branch}`, 'success');
      this.loadStatus(this._state.hasProject);
    }
  }

  private onCommit(msg: Record<string, unknown>): void {
    const data = msg.data as { hash: string; filesChanged: number } | undefined;
    this.set({ committing: false });
    if (!data) return;
    if (this._state.pendingAutoPush) {
      this.set({ commitAndPushPhase: 'pushing', isGitOperationRunning: true });
      gateway.requestGitPush();
      return;
    }
    this.set({ showCommitDialog: false, commitError: '' });
    this.toast(`Commit erfolgreich (${data.filesChanged} Datei(en))`, 'success');
    this.refresh();
  }

  private onPull(msg: Record<string, unknown>): void {
    this.set({ isGitOperationRunning: false });
    const data = msg.data as { success: boolean; summary: string; commitsReceived: number; hasConflicts: boolean } | undefined;
    if (!data) return;
    // Auto-push after successful pull when pull was triggered from push rejection
    if (this._state.pullStrategyRetryPush) {
      this.set({ pullStrategyRetryPush: false, isGitOperationRunning: true });
      this.toast('Pull erfolgreich, starte Push...', 'info');
      gateway.requestGitPush();
      return;
    }
    if (data.commitsReceived === 0) this.toast('Bereits aktuell', 'info');
    else this.toast(`Pull erfolgreich: ${data.commitsReceived} Datei(en) aktualisiert`, 'success');
    this.refresh();
  }

  private onPush(msg: Record<string, unknown>): void {
    this.set({ isGitOperationRunning: false });
    const data = msg.data as { success: boolean; summary: string; commitsPushed: number } | undefined;
    if (!data) return;
    if (this._state.pendingAutoPush) {
      this.set({ pendingAutoPush: false, commitAndPushPhase: 'idle', showCommitDialog: false, commitError: '' });
      this.toast('Commit & Push erfolgreich', 'success');
      this.refresh();
      return;
    }
    if (data.commitsPushed === 0) this.toast('Nichts zum Pushen - alles aktuell', 'info');
    else this.toast(`Push erfolgreich: ${data.commitsPushed} Commits`, 'success');
    this.refresh();
  }

  private onRevert(msg: Record<string, unknown>): void {
    const data = msg.data as { revertedFiles: string[]; failedFiles: string[] } | undefined;
    if (!data) return;
    const count = data.revertedFiles.length;
    if (data.failedFiles.length > 0) this.toast(`${count} Datei(en) revertiert, ${data.failedFiles.length} fehlgeschlagen`, 'warning');
    else this.toast(`${count} Datei(en) revertiert`, 'success');
    this.refresh();
  }

  private onDeleteUntracked(msg: Record<string, unknown>): void {
    const data = msg.data as { file: string; success: boolean } | undefined;
    if (!data) return;
    if (data.success) this.toast(`Datei geloescht: ${data.file}`, 'success');
    else this.toast(`Loeschen fehlgeschlagen: ${data.file}`, 'error');
    this.refresh();
  }

  private onPrInfo(msg: Record<string, unknown>): void {
    this.set({ gitPrInfo: (msg.data as GitPrInfo[]) ?? [] });
  }

  private onGenerateCommitMessage(msg: Record<string, unknown>): void {
    this.set({ generatingCommitMessage: false });
    const data = msg.data as { message: string } | undefined;
    if (data?.message) for (const l of this.messageListeners) l(data.message);
  }

  private onError(msg: Record<string, unknown>): void {
    const operation = msg.operation as string | undefined;
    const code = msg.code as string | undefined;
    const rawMessage = msg.message as string;
    this.set({ gitLoading: false });

    if (operation === 'commit') {
      this.set({ committing: false, commitError: rawMessage || 'Commit fehlgeschlagen' });
      return;
    }
    if (operation === 'generate-commit-message') {
      this.set({ generatingCommitMessage: false });
      this.toast(rawMessage || 'Commit Message konnte nicht generiert werden', 'error');
      return;
    }
    // Push rejected: open pull strategy dialog with auto-retry push
    if (code === 'PUSH_REJECTED') {
      const patch: Partial<GitState> = { isGitOperationRunning: false, pullStrategyRetryPush: true, showPullStrategyDialog: true };
      if (this._state.pendingAutoPush) Object.assign(patch, { pendingAutoPush: false, commitAndPushPhase: 'idle', showCommitDialog: false, commitError: '' });
      this.set(patch);
      return;
    }
    // Divergent branches: open pull strategy dialog without auto-retry push
    if (code === 'DIVERGENT_BRANCHES') {
      this.set({ isGitOperationRunning: false, pullStrategyRetryPush: false, showPullStrategyDialog: true });
      return;
    }
    if (operation === 'push' && this._state.pendingAutoPush) {
      this.set({ pendingAutoPush: false, commitAndPushPhase: 'idle', isGitOperationRunning: false, showCommitDialog: false, commitError: '' });
      this.toast('Commit erfolgreich, Push fehlgeschlagen', 'warning');
      this.refresh();
      return;
    }
    if (operation === 'pull' || operation === 'push') this.set({ isGitOperationRunning: false });
    this.toast(mapGitErrorMessage(code, rawMessage, operation), 'error');
  }
}

export function mapGitErrorMessage(code: string | undefined, rawMessage: string, operation: string | undefined): string {
  switch (code) {
    case 'MERGE_CONFLICT':
      return 'Merge-Konflikte erkannt. Bitte Konflikte ausserhalb der Anwendung loesen.';
    case 'NETWORK_ERROR':
      return 'Remote nicht erreichbar. Bitte Netzwerkverbindung pruefen.';
    case 'NOT_A_REPO':
      return 'Kein Git-Repository in diesem Verzeichnis.';
    case 'NO_PROJECT':
      return 'Kein Projekt ausgewaehlt.';
    case 'TIMEOUT':
      return 'Git-Operation abgelaufen. Bitte erneut versuchen.';
    case 'DIVERGENT_BRANCHES':
      return 'Branches sind divergiert. Bitte Pull-Strategie waehlen.';
    case 'PUSH_REJECTED':
      return 'Push abgelehnt. Remote enthaelt neue Commits.';
    default:
      return `Git ${operation || 'Fehler'}: ${rawMessage}`;
  }
}

export const gitState = new GitStateService();
