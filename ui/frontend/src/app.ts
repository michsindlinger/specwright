import { LitElement, html, type PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ContextProvider } from '@lit/context';

import './views/aos-vorhaben-view.js';
import './views/not-found-view.js';
import './components/rahmen/aos-kopfzeile.js';
import './components/toast-notification.js';
import './components/loading-spinner.js';
import './components/aos-project-add-modal.js';
import './components/aos-notepad-panel.js';
import './components/terminal/aos-cloud-terminal-sidebar.js';
import './components/mobile/aos-mobile-terminal-header.js';
import './components/mobile/aos-mobile-session-tabs.js';
import './components/mobile/aos-mobile-connection-bar.js';
import './components/mobile/aos-mobile-quick-replies.js';
import './components/file-editor/aos-file-tree-sidebar.js';
import './components/file-editor/aos-file-editor-panel.js';
import './components/document-preview/aos-document-preview-panel.js';
import type { AosFileEditorPanel } from './components/file-editor/aos-file-editor-panel.js';
import './components/git/aos-git-commit-dialog.js';
import './components/git/aos-git-diff-viewer.js';
import './components/git/aos-git-pull-strategy-dialog.js';
import type { TerminalSession } from './components/terminal/aos-cloud-terminal-sidebar.js';
import {
  ringsForAgentEvent,
  buildBellRows,
  type BellRow,
} from './components/terminal/agent-notifications.js';
import type { CloudTerminalAgentStatus } from '../../src/shared/types/cloud-terminal.protocol.js';
import { playAgentDoneChime } from './components/terminal/notification-sound.js';
import type { ProjectSelectedDetail } from './components/aos-project-add-modal.js';
import type { RecentlyOpenedEntry } from './services/recently-opened.service.js';
import type { WorkspaceState } from '../../src/shared/types/workspace.protocol.js';
import type { VorhabenState } from '../../src/shared/types/vorhaben.protocol.js';
import { assignAutoNames, isOwnCreateRequest, toRestoredTab, type BackendSessionLike, type WorkflowMetadataLike } from './components/terminal/session-naming.js';
import { glockeZiel } from './components/rahmen/glocke-ziel.js';
import { terminalDockedFor } from './components/terminal/terminal-dock.js';
import { isBackToOverviewShortcut, isTypingTarget } from './utils/keyboard-shortcuts.js';
import type { GlockeOpenDetail, GlockeSession } from './components/rahmen/aos-glocke.js';
import { gitState, type GitState, type PullStrategy } from './services/git-state.service.js';
import { vorhabenService } from './services/vorhaben.service.js';
import { MobileBreakpointController } from './controllers/mobile-breakpoint-controller.js';
import type { AosGettingStartedView } from './views/aos-getting-started-view.js';

const AGENT_STATUS_VALUES: ReadonlySet<string> = new Set(['unknown', 'idle', 'working', 'blocked', 'error', 'done']);

/** Picks the agent-status fields off a backend session record (ISO → epoch ms). */
/**
 * INT-2026-016 (AK-05): project id and Vorhaben id of a docked route —
 * `vorhaben/<project>/<INT-…>` or `neu/<project>`; nothing otherwise.
 */
export function pageOfRoute(route: { view: string; segments: string[] }): { projectId: string | null; intentId: string | null } {
  const decode = (v: string | undefined): string | null => {
    if (!v) return null;
    try {
      return decodeURIComponent(v);
    } catch {
      return null;
    }
  };
  if (route.view === 'vorhaben' && route.segments.length >= 2) {
    const intentId = /^INT-\d{4}-\d{3}$/.test(route.segments[1]) ? route.segments[1] : null;
    return { projectId: decode(route.segments[0]), intentId };
  }
  if (route.view === 'neu' && route.segments.length >= 1) return { projectId: decode(route.segments[0]), intentId: null };
  return { projectId: null, intentId: null };
}

function agentStatusFields(b: { agentStatus?: CloudTerminalAgentStatus; agentStatusAt?: string; agentStatusReason?: string; agentDoneAt?: string }): {
  agentStatus?: CloudTerminalAgentStatus;
  agentStatusAt?: number;
  agentStatusReason?: string;
  agentDoneAt?: number;
} {
  if (b.agentStatus === undefined) return {};
  const at = typeof b.agentStatusAt === 'string' ? Date.parse(b.agentStatusAt) : NaN;
  const doneAt = typeof b.agentDoneAt === 'string' ? Date.parse(b.agentDoneAt) : NaN;
  return {
    agentStatus: b.agentStatus,
    agentStatusAt: Number.isFinite(at) ? at : undefined,
    agentStatusReason: b.agentStatusReason,
    agentDoneAt: Number.isFinite(doneAt) ? doneAt : undefined,
  };
}
import { recentlyOpenedService } from './services/recently-opened.service.js';
import { projectStateService } from './services/project-state.service.js';
import { routerService } from './services/router.service.js';
import { gateway, type MessageHandler } from './gateway.js';
import type { AosToastNotification } from './components/toast-notification.js';
import {
  projectContext,
  type Project,
  type ProjectContextValue,
} from './context/project-context.js';
import type { ViewType } from './types/route.types.js';

type Route = ViewType;

@customElement('aos-app')
export class AosApp extends LitElement {
  @state()
  private currentRoute: Route = 'vorhaben';

  @state()
  private isReconnecting = false;

  @state()
  private openProjects: Project[] = [];

  @state()
  private activeProjectId: string | null = null;

  /**
   * Shared workspace (server state, mirrored on every device): recents for the
   * add-project modal and user-given tab names keyed by backend session id.
   * Open projects live in `openProjects`; the active project stays device-local.
   */
  @state()
  private recentProjects: RecentlyOpenedEntry[] = [];

  private sessionNames: Record<string, string> = {};
  private workspaceReady = false;
  /** Projects we already asked `cloud-terminal:list` for on this connection. */
  private listedProjectPaths = new Set<string>();
  /** requestId → path of workspace:open-project calls awaiting their ack. */
  private pendingOpen = new Map<string, string>();
  private workspaceFallbackTimer: ReturnType<typeof setTimeout> | null = null;

  @state()
  private showAddProjectModal = false;

  @state()
  private isTerminalSidebarOpen = false;

  /**
   * The terminal is the right column of the page (INT-2026-011, FA-01): on
   * the Vorhaben page and on „Neue Absicht" — derived from the route, never
   * stored (AR-05). Docked is a presentation of the same sidebar; open/closed
   * stays `isTerminalSidebarOpen` (Cmd/Ctrl+D, FA-05).
   */
  @state()
  private terminalDocked = false;

  /**
   * Session of the current page (INT-2026-013, B3): set by the Vorhaben view
   * (`vorhaben-page-session`, `null` = none) and cleared by the route handler
   * on routes that are not docked. Backend id (`terminalSessionId`).
   */
  @state()
  private pageSessionId: string | null = null;

  /**
   * The page's tab to put in front as soon as it exists (FA-08, review F2:
   * `cloud-terminal:created`/`list` may arrive after the page asked). Armed
   * by _syncDock() when page session or dock change and by the toggle
   * (Cmd+D, header) on a docked page; resolved in willUpdate() on every
   * update and kept until the tab really is in front (INT-2026-013 B3/B4).
   */
  private pendingDockSessionId: string | null = null;
  /** Project switch _syncDock() fired and still waits for (at most one in flight — the service debounces). */
  private dockSwitchProjectId: string | null = null;
  /** Switch attempts for the current pending tab; after three failures a toast says so. */
  private dockSwitchAttempts = 0;
  private static readonly DOCK_SWITCH_MAX_ATTEMPTS = 3;

  /**
   * INT-2026-016 (AK-05): the project and Vorhaben the docked page is about,
   * read from the route (`#/vorhaben/<project>/<INT-…>`, `#/neu/<project>`).
   * `null` when the route names no open project — the dock then follows the
   * active project as before. The workspace's active project is never
   * switched for this (it is shared by every window and device, AR-05).
   */
  @state()
  private pageProjectId: string | null = null;
  @state()
  private pageIntentId: string | null = null;

  /**
   * INT-2026-016 (AK-06): tabs created with „Neue Session" on a docked
   * Vorhaben page, keyed by frontend tab id — bound to that Vorhaben once the
   * backend session is connected (claude-code only). Cleared on connect,
   * tab close and route change.
   */
  private assignOnConnect = new Map<string, { projectId: string; intentId: string }>();

  @state()
  private isFileTreeOpen = false;

  @state()
  private isDocumentPreviewOpen = false;

  @state()
  private documentPreviewContent = '';

  @state()
  private documentPreviewFilePath = '';

  @state()
  private terminalSessions: TerminalSession[] = [];

  @state()
  private activeTerminalSessionId: string | null = null;

  /** Remember last active terminal session per project */
  private lastActiveSessionByProject = new Map<string, string>();

  /** Floating notepad (Cmd/Ctrl+Shift+E); the panel owns the shortcut and reports via events. */
  @state()
  private showNotepad = false;

  private toastRef: AosToastNotification | null = null;

  /**
   * INT-2026-010: the frame is a header line (`aos-kopfzeile`) with the bell.
   * `vorhabenState` is the lookup table for the bell jump (`glockeZiel`),
   * `git` feeds the two git dialogs that stay overlays here (the bar itself
   * lives on the project page, state in `gitState`), the breakpoint drives the
   * phone-only terminal symbol and the phone branch of the terminal jump.
   */
  @state()
  private vorhabenState: VorhabenState | null = null;

  @state()
  private git: GitState = gitState.state;

  private readonly breakpoint = new MobileBreakpointController(this);
  private unsubscribeVorhaben: (() => void) | null = null;
  private unsubscribeGit: (() => void) | null = null;
  private unsubscribeGeneratedMessage: (() => void) | null = null;

  private projectContextProvider = new ContextProvider(this, {
    context: projectContext,
    initialValue: this.getContextValue(),
  });

  private boundRouteChangeHandler = (route: import('./types/route.types.js').ParsedRoute) => {
    this.currentRoute = route.view;
    const wasDocked = this.terminalDocked;
    this.terminalDocked = terminalDockedFor(route);
    // Routes without a docked column have no page session — also the ones
    // where the Vorhaben view is replaced and cannot announce (review #7).
    if (!this.terminalDocked) this.pageSessionId = null;
    // INT-2026-016 (AK-05): the page's project and Vorhaben from the address.
    const page = this.terminalDocked ? pageOfRoute(route) : { projectId: null, intentId: null };
    this.pageProjectId = page.projectId;
    this.pageIntentId = page.intentId;
    this.assignOnConnect.clear();
    // Leaving a docked page closes the terminal (INT-2026-015, AK-01): the target page is usable at
    // once. Only the window — sessions and tabs stay, a waiting one rings the bell (AK-03, NZ-06).
    // Docked → docked keeps it open on the new page's session (AK-02); the phone has no docked
    // column and keeps its overlay (NZ-05). Nothing is stored: open/closed stays browser state (RB-01).
    if (wasDocked && !this.terminalDocked && !this.breakpoint.isMobile) {
      this.isTerminalSidebarOpen = false;
      // The floating sidebar shows the active project's tabs again: leave a page-project tab behind.
      this._restoreActiveProjectTab();
    }
  };
  private boundReconnectingHandler: MessageHandler = (msg) => {
    this.isReconnecting = true;
    this.showToast(
      `Verbindung verloren. Reconnecting in ${Math.round((msg.delay as number) / 1000)}s...`,
      'warning'
    );
  };
  private boundConnectedHandler: MessageHandler = () => {
    if (this.isReconnecting) {
      this.showToast('Verbindung wiederhergestellt', 'success');
      // A reconnect may have missed workspace broadcasts and session events.
      this.listedProjectPaths.clear();
      this.requestWorkspace();
    }
    this.isReconnecting = false;
  };
  private boundErrorHandler: MessageHandler = (msg) => {
    const errorMessage = (msg.message as string) || 'Ein Fehler ist aufgetreten';
    this.showToast(errorMessage, 'error');
  };
  private boundCloudTerminalListHandler: MessageHandler = (msg) => {
    this.handleCloudTerminalListResponse(msg);
  };
  // DPP-004: Document Preview handlers
  private boundDocumentPreviewOpenHandler: MessageHandler = (msg) => {
    this.isDocumentPreviewOpen = true;
    this.documentPreviewContent = msg.content as string;
    this.documentPreviewFilePath = msg.filePath as string;
  };
  private boundDocumentPreviewCloseHandler: MessageHandler = () => {
    this.isDocumentPreviewOpen = false;
    this.documentPreviewContent = '';
    this.documentPreviewFilePath = '';
  };
  // WSM-002: Handler for cloud-terminal:closed (setup session re-validation)
  private boundCloudTerminalClosedHandler: MessageHandler = (msg) => {
    this._handleCloudTerminalClosed(msg);
  };
  private boundCloudTerminalAgentEventHandler: MessageHandler = (msg) => {
    this._handleCloudTerminalAgentEvent(msg);
  };
  private boundCloudTerminalCreatedHandler: MessageHandler = (msg) => {
    this._handleCloudTerminalCreatedElsewhere(msg);
  };
  private boundWorkspaceStateHandler: MessageHandler = (msg) => {
    void this._handleWorkspaceState(msg);
  };
  private boundWorkspaceAckHandler: MessageHandler = (msg) => {
    void this._handleWorkspaceAck(msg);
  };
  private boundWorkspaceErrorHandler: MessageHandler = (msg) => {
    const requestId = typeof msg.requestId === 'string' ? msg.requestId : undefined;
    if (requestId && !this.pendingOpen.has(requestId)) return;
    if (requestId) this.pendingOpen.delete(requestId);
    this.showToast(`Projekt konnte nicht geöffnet werden: ${String(msg.message ?? msg.code ?? 'unbekannt')}`, 'warning');
  };
  private boundKeydownHandler = (e: KeyboardEvent) => this._handleGlobalKeydown(e);
  // Handler for open-terminal-session events (Vorhaben page „Sitzung öffnen").
  // Maps the backend CloudTerminalSessionId to the frontend TerminalSession.id
  // (which is what aos-cloud-terminal-sidebar matches activeSessionId against).
  private _handleOpenTerminalSession = (e: CustomEvent<{ sessionId: string }>): void => {
    const { sessionId } = e.detail;
    if (!sessionId) return;
    this._openSessionInTerminal(sessionId);
  };

  /**
   * Bring a backend session into the terminal. Mac with a floating sidebar:
   * alone on the screen (INT-2026-005 solo). Phone (INT-2026-010, FA-20) and
   * the docked column (INT-2026-011, AN-S08): no solo — just select the tab
   * (switching the project first when it belongs to another one) and open
   * the sidebar.
   */
  private _openSessionInTerminal(terminalSessionId: string): void {
    const match = this.terminalSessions.find(s => s.terminalSessionId === terminalSessionId);
    if (!match) {
      this.showToast('Terminal-Session nicht mehr aktiv', 'warning');
      return;
    }
    if (this.breakpoint.isMobile || this.terminalDocked) {
      this._selectSessionTab(match);
      this.isTerminalSidebarOpen = true;
    } else {
      this._showSessionSolo(match.id);
    }
    if (match.needsInput) {
      this.terminalSessions = this.terminalSessions.map(s =>
        s.id === match.id ? { ...s, needsInput: false } : s
      );
    }
  }

  /**
   * Make a tab the active one without solo/fullscreen: the project switch
   * lands on the tab via `lastActiveSessionByProject` (the bell's path), else
   * the active id changes directly. Used by the phone and the docked column
   * for explicit openers (INT-2026-011); the page-session follow runs through
   * _syncDock() (INT-2026-013).
   */
  private _selectSessionTab(match: TerminalSession): void {
    const project = this.openProjects.find(p => p.path === match.projectPath);
    if (project && project.id !== this.activeProjectId) {
      this.lastActiveSessionByProject.set(project.id, match.id);
      this.switchToProject(project.id);
    } else {
      this.activeTerminalSessionId = match.id;
    }
  }

  /**
   * The Vorhaben page (or „Neue Absicht") says which session belongs to it
   * (INT-2026-011, FA-02/FA-08/FA-18; INT-2026-013 B3: every change, `null`
   * = none). Only state here — _syncDock() opens the docked terminal on that
   * tab, waits for a tab that has not arrived yet and retries a failed
   * project switch.
   */
  private _handleVorhabenPageSession = (e: CustomEvent<{ terminalSessionId: string | null }>): void => {
    this.pageSessionId = e.detail?.terminalSessionId || null;
  };

  /** Remember the tab to put in front; a fresh arming starts the switch attempts from zero. */
  private _armDock(terminalSessionId: string): void {
    this.pendingDockSessionId = terminalSessionId;
    this.dockSwitchAttempts = 0;
  }

  /**
   * One reconciliation for the docked column (INT-2026-013, AK-03/AK-04), run
   * at the end of willUpdate() — state changes there are allowed in Lit and
   * cost no second cycle. Page session or dock changed → arm the page's tab
   * and open the sidebar (FA-02: it appears in the same update), or drop the
   * memory when the page has none / the route is not docked. Then resolve the
   * memory: tab missing → wait (FA-08); tab in another project → switch it
   * the way the bell does, at most one switch in flight and at most three
   * attempts, then a toast; tab in the active project → in front, done.
   */
  private _syncDock(changed: PropertyValues): void {
    if (changed.has('pageSessionId') || changed.has('terminalDocked')) {
      if (this.terminalDocked && this.pageSessionId) {
        this._armDock(this.pageSessionId);
        this.isTerminalSidebarOpen = true;
      } else {
        this.pendingDockSessionId = null;
        this.dockSwitchProjectId = null;
      }
    }
    // A switch landed (ours or a foreign one that orphaned ours in the service's debounce).
    if (changed.has('activeProjectId')) this.dockSwitchProjectId = null;
    const pending = this.pendingDockSessionId;
    if (!pending) return;
    const match = this.terminalSessions.find(s => s.terminalSessionId === pending);
    if (!match) return;
    const project = this.openProjects.find(p => p.path === match.projectPath);
    if (project && project.id !== this.activeProjectId) {
      if (this.dockSwitchProjectId !== null) return;
      if (this.dockSwitchAttempts >= AosApp.DOCK_SWITCH_MAX_ATTEMPTS) {
        this.pendingDockSessionId = null;
        this.showToast('Projektwechsel für die Sitzung fehlgeschlagen — Tab von Hand wählen', 'warning');
        return;
      }
      this.dockSwitchAttempts++;
      this.dockSwitchProjectId = project.id;
      this.lastActiveSessionByProject.set(project.id, match.id);
      this.switchToProject(project.id);
      return;
    }
    this.pendingDockSessionId = null;
    this.dockSwitchProjectId = null;
    if (this.activeTerminalSessionId !== match.id) this.activeTerminalSessionId = match.id;
    if (match.needsInput) {
      this.terminalSessions = this.terminalSessions.map(s => (s.id === match.id ? { ...s, needsInput: false } : s));
    }
  }

  /**
   * INT-2026-016 (AK-05): the project the docked column shows — the page's
   * project when the address names an open one, else the active project.
   */
  private get pageProject(): Project | undefined {
    return this.pageProjectId ? this.openProjects.find(p => p.id === this.pageProjectId) : undefined;
  }

  private get dockProject(): Project | undefined {
    return (this.terminalDocked ? this.pageProject : undefined) ?? this.openProjects.find(p => p.id === this.activeProjectId);
  }

  /**
   * INT-2026-016 (AK-05): a docked column without a page session shows the
   * page project's last tab (else its first, else the empty state) — never a
   * tab of the workspace-active project. Runs at the end of willUpdate();
   * a pending page tab (_syncDock) takes precedence.
   */
  private _syncDockProject(): void {
    if (!this.terminalDocked || !this.isTerminalSidebarOpen || this.pendingDockSessionId) return;
    const pp = this.pageProject;
    if (!pp) return;
    const active = this.terminalSessions.find(s => s.id === this.activeTerminalSessionId);
    if (active && active.projectPath === pp.path) return;
    if (active) {
      const owner = this.openProjects.find(p => p.path === active.projectPath);
      if (owner) this.lastActiveSessionByProject.set(owner.id, active.id);
    }
    const remembered = this.lastActiveSessionByProject.get(pp.id);
    const candidate =
      this.terminalSessions.find(s => s.id === remembered && s.projectPath === pp.path) ??
      this.terminalSessions.find(s => s.projectPath === pp.path);
    this.activeTerminalSessionId = candidate?.id ?? null;
  }

  /** After a docked page of another project: the floating sidebar is about the active project again. */
  private _restoreActiveProjectTab(): void {
    const activeProject = this.openProjects.find(p => p.id === this.activeProjectId);
    if (!activeProject) return;
    const active = this.terminalSessions.find(s => s.id === this.activeTerminalSessionId);
    if (active && active.projectPath === activeProject.path) return;
    const remembered = this.lastActiveSessionByProject.get(activeProject.id);
    const candidate =
      this.terminalSessions.find(s => s.id === remembered && s.projectPath === activeProject.path) ??
      this.terminalSessions.find(s => s.projectPath === activeProject.path);
    if (candidate) this.activeTerminalSessionId = candidate.id;
  }

  /**
   * INT-2026-016 (AK-06, AK-07): bind a tab to the Vorhaben of the docked
   * page. The backend answers (or refuses with a reason); both land as a
   * toast, the row follows in the next `vorhaben:state`. No retry — a second
   * click is cheaper than a queue (plan R9).
   */
  private async _assignSessionToVorhaben(projectId: string, intentId: string, terminalSessionId: string, name: string): Promise<void> {
    try {
      await vorhabenService.assignSession(projectId, intentId, terminalSessionId);
      this.showToast(`Sitzung ‚${name}' gehört jetzt zu ${intentId}`, 'success');
    } catch (err) {
      this.showToast(err instanceof Error && err.message ? err.message : `Zuordnung zu ${intentId} fehlgeschlagen`, 'warning');
    }
  }

  /**
   * Bell entry tapped (INT-2026-010, FA-06): the session's Vorhaben, the
   * „Neue Absicht" page of a pending `/intent` session, else the terminal.
   * The entry is dropped here — the page is where Michael reads the answer.
   */
  private _handleGlockeOpen(e: CustomEvent<GlockeOpenDetail>): void {
    const { sessionId, terminalSessionId } = e.detail;
    const ziel = terminalSessionId ? glockeZiel(terminalSessionId, this.vorhabenState) : { route: 'terminal' as const };
    if (ziel.route === 'vorhaben') {
      routerService.navigate('vorhaben', [encodeURIComponent(ziel.segments[0]), ziel.segments[1]]);
      return;
    }
    if (ziel.route === 'neu') {
      routerService.navigate('neu', [encodeURIComponent(ziel.segments[0])]);
      return;
    }
    if (terminalSessionId) this._openSessionInTerminal(terminalSessionId);
    else {
      this.activeTerminalSessionId = sessionId;
      this.isTerminalSidebarOpen = true;
    }
  }

  /**
   * The session the user is looking at: the active tab of an OPEN sidebar.
   * With the sidebar closed nothing is visible, so every session may ring and
   * be listed — including the one left active behind the closed sidebar
   * (INT-2026-010 review E2; before, that session stayed silent).
   */
  private get sichtbareSessionId(): string | null {
    return this.isTerminalSidebarOpen ? this.activeTerminalSessionId : null;
  }

  /**
   * INT-2026-016 (AK-02): derived, never kept — the backend snapshot in
   * `terminalSessions` (dialog or „fertig, unbeantwortet"-mark) decides, the
   * Vorhaben rows only label. Same bell after a reload and on every device.
   */
  private get glockeRows(): BellRow[] {
    return buildBellRows(this.terminalSessions, this.vorhabenState?.rows ?? [], this.sichtbareSessionId);
  }

  private get glockeSessions(): GlockeSession[] {
    return this.terminalSessions.map(s => ({ id: s.id, name: s.name, projectPath: s.projectPath }));
  }

  override connectedCallback(): void {
    super.connectedCallback();
    routerService.on('route-changed', this.boundRouteChangeHandler);
    routerService.init();

    // Setup gateway listeners
    gateway.on('gateway.reconnecting', this.boundReconnectingHandler);
    gateway.on('gateway.connected', this.boundConnectedHandler);
    gateway.on('gateway.error', this.boundErrorHandler);
    gateway.on('cloud-terminal:list-response', this.boundCloudTerminalListHandler);
    // DPP-004: Document Preview handlers
    gateway.on('document-preview.open', this.boundDocumentPreviewOpenHandler);
    gateway.on('document-preview.close', this.boundDocumentPreviewCloseHandler);
    // WSM-002: Listen for terminal close events (setup session re-validation)
    gateway.on('cloud-terminal:closed', this.boundCloudTerminalClosedHandler);
    gateway.on('cloud-terminal:agent-event', this.boundCloudTerminalAgentEventHandler);
    gateway.on('cloud-terminal:created', this.boundCloudTerminalCreatedHandler);
    gateway.on('workspace:state', this.boundWorkspaceStateHandler);
    gateway.on('workspace:ack', this.boundWorkspaceAckHandler);
    gateway.on('workspace:error', this.boundWorkspaceErrorHandler);
    document.addEventListener('keydown', this.boundKeydownHandler);
    // INT-2026-010: bell jump table, git dialogs (state lives in the services).
    this.unsubscribeVorhaben = vorhabenService.subscribe((st) => {
      this.vorhabenState = st;
    });
    this.unsubscribeGit = gitState.subscribe((g) => {
      this.git = g;
    });
    this.unsubscribeGeneratedMessage = gitState.onGeneratedMessage((message) => {
      const dialog = this.querySelector('aos-git-commit-dialog') as import('./components/git/aos-git-commit-dialog.js').AosGitCommitDialog | null;
      dialog?.setCommitMessage(message);
    });

    // Listen for open-terminal-session events (Vorhaben page)
    document.addEventListener('open-terminal-session', this._handleOpenTerminalSession as EventListener);
    // The Vorhaben page names its session → docked terminal on that tab (INT-2026-011)
    document.addEventListener('vorhaben-page-session', this._handleVorhabenPageSession as EventListener);

    // Global error handler
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener(
      'unhandledrejection',
      this.handleUnhandledRejection.bind(this)
    );


    // Connect WebSocket first, then restore project state after connection
    gateway.connect();
    this.restoreProjectStateWhenConnected();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    routerService.off('route-changed', this.boundRouteChangeHandler);
    gateway.off('gateway.reconnecting', this.boundReconnectingHandler);
    gateway.off('gateway.connected', this.boundConnectedHandler);
    gateway.off('gateway.error', this.boundErrorHandler);
    gateway.off('cloud-terminal:list-response', this.boundCloudTerminalListHandler);
    // DPP-004: Remove Document Preview listeners
    gateway.off('document-preview.open', this.boundDocumentPreviewOpenHandler);
    gateway.off('document-preview.close', this.boundDocumentPreviewCloseHandler);
    // WSM-002: Remove terminal close listener
    gateway.off('cloud-terminal:closed', this.boundCloudTerminalClosedHandler);
    gateway.off('cloud-terminal:agent-event', this.boundCloudTerminalAgentEventHandler);
    gateway.off('cloud-terminal:created', this.boundCloudTerminalCreatedHandler);
    gateway.off('workspace:state', this.boundWorkspaceStateHandler);
    gateway.off('workspace:ack', this.boundWorkspaceAckHandler);
    gateway.off('workspace:error', this.boundWorkspaceErrorHandler);
    document.removeEventListener('keydown', this.boundKeydownHandler);
    this.unsubscribeVorhaben?.();
    this.unsubscribeGit?.();
    this.unsubscribeGeneratedMessage?.();
    this.unsubscribeVorhaben = this.unsubscribeGit = this.unsubscribeGeneratedMessage = null;
    document.removeEventListener('open-terminal-session', this._handleOpenTerminalSession as EventListener);
    document.removeEventListener('vorhaben-page-session', this._handleVorhabenPageSession as EventListener);
  }

  private handleGlobalError(event: ErrorEvent): void {
    console.error('Global error:', event.error);
    this.showToast('Ein unerwarteter Fehler ist aufgetreten', 'error');
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    console.error('Unhandled rejection:', event.reason);
    this.showToast('Ein Fehler ist aufgetreten', 'error');
  }

  public showToast(
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info'
  ): void {
    if (!this.toastRef) {
      this.toastRef = this.querySelector('aos-toast-notification');
    }
    this.toastRef?.show(message, type);
  }

  private getPageTitle(): string {
    const titles: Record<Route, string> = {
      vorhaben: 'Vorhaben',
      neu: 'Neue Absicht',
      projekt: 'Projekt',
      'not-found': 'Seite nicht gefunden',
    };
    return titles[this.currentRoute];
  }

  // --- Project Tab Event Handlers ---

  private async handleProjectTabSelect(
    e: CustomEvent<{ projectId: string }>
  ): Promise<void> {
    const { projectId } = e.detail;
    const project = this.openProjects.find((p) => p.id === projectId);

    if (!project || project.id === this.activeProjectId) {
      this.dockSwitchProjectId = null;
      return;
    }

    // MPRO-006: First switch project context in backend, THEN update UI
    // This ensures WebSocket has the correct projectId before views load project data
    const result = await projectStateService.switchProject(project);
    if (!result.success) {
      this.showToast(`Failed to switch project: ${result.error}`, 'error');
      // The docked page's tab may still be waiting: let _syncDock() try again (INT-2026-013).
      this.dockSwitchProjectId = null;
      if (this.pendingDockSessionId) this.requestUpdate();
      return; // Don't switch UI if backend failed
    }
    this.dockSwitchProjectId = null;

    // Remember last active terminal session for the project we're leaving
    const previousProject = this.openProjects.find(p => p.id === this.activeProjectId);
    if (previousProject && this.activeTerminalSessionId) {
      this.lastActiveSessionByProject.set(previousProject.id, this.activeTerminalSessionId);
    }

    // Now update UI after backend is ready
    this.activeProjectId = projectId;
    this.updateContextProvider();

    // DPP-004: Reset document preview panel on project switch
    this._handleDocumentPreviewClose();

    // Load git status for new project (state lives in gitState, INT-2026-010)
    gitState.loadStatus(true);

    // Reset file tree to show new project's files
    const sidebar = this.querySelector('aos-file-tree-sidebar') as { reset(): void } | null;
    if (sidebar) sidebar.reset();

    // Update active terminal session to match new project
    // (projectTerminalSessions will now filter by new project path)
    const newProjectSessions = this.terminalSessions.filter(s => s.projectPath === project.path);
    if (newProjectSessions.length > 0) {
      // Restore previously active session for this project, or fall back to first
      const remembered = this.lastActiveSessionByProject.get(projectId);
      const rememberedExists = remembered && newProjectSessions.some(s => s.id === remembered);
      this.activeTerminalSessionId = rememberedExists ? remembered : newProjectSessions[0].id;
    } else {
      // No sessions for this project, clear active
      this.activeTerminalSessionId = null;
    }

    // Active project is device-local (the phone may look at another project).
    this.persistActiveProject();
  }

  private async handleProjectTabClose(
    e: CustomEvent<{ projectId: string }>
  ): Promise<void> {
    const { projectId } = e.detail;
    this.openProjects = this.openProjects.filter((p) => p.id !== projectId);

    // If we closed the active project, switch to another one
    if (this.activeProjectId === projectId) {
      if (this.openProjects.length > 0) {
        const newActive = this.openProjects[0];
        this.activeProjectId = newActive.id;

        // Switch to new active project (also sends WebSocket message)
        const result = await projectStateService.switchProject(newActive);
        if (!result.success) {
          this.showToast(`Failed to switch project: ${result.error}`, 'error');
        }
      } else {
        this.activeProjectId = null;
      }
      gitState.loadStatus(this.activeProjectId !== null);
    }

    this.updateContextProvider();
    this.persistActiveProject();
    // Optimistic locally; the server broadcast converges every device.
    gateway.send({ type: 'workspace:close-project', id: projectId, timestamp: new Date().toISOString() });
  }

  private handleAddProject(): void {
    this.showAddProjectModal = true;
  }

  private handleAddProjectModalClose(): void {
    this.showAddProjectModal = false;
  }

  private _handleRecentRemove(e: CustomEvent<{ path: string }>): void {
    gateway.send({ type: 'workspace:remove-recent', path: e.detail.path, timestamp: new Date().toISOString() });
  }

  private _handleDocumentPreviewClose(): void {
    this.isDocumentPreviewOpen = false;
    this.documentPreviewContent = '';
    this.documentPreviewFilePath = '';
  }

  // --- File Tree Sidebar Event Handlers ---

  private _handleFileTreeToggle(): void {
    this.isFileTreeOpen = !this.isFileTreeOpen;
  }

  private _handleFileTreeClose(): void {
    this.isFileTreeOpen = false;
  }

  private _handleFileTreeFileOpen(e: CustomEvent<{ path: string; filename: string }>): void {
    const panel = this.querySelector('aos-file-editor-panel') as AosFileEditorPanel | null;
    if (panel) {
      panel.openFile(e.detail.path, e.detail.filename);
    }
  }

  // --- Cloud Terminal Event Handlers ---

  private _handleTerminalToggle(): void {
    this._toggleTerminalSidebar();
  }

  /**
   * Cmd/Ctrl+D and the header toggle (FA-05). Opening on a docked page puts
   * the page's session in front (INT-2026-013, AK-04) — explicit openers
   * (bell, „Im Terminal öffnen", setup) keep their own tab.
   */
  private _toggleTerminalSidebar(): void {
    this.isTerminalSidebarOpen = !this.isTerminalSidebarOpen;
    if (this.isTerminalSidebarOpen && this.terminalDocked && this.pageSessionId) this._armDock(this.pageSessionId);
  }

  private _handleTerminalClose(): void {
    this.isTerminalSidebarOpen = false;
  }

  private _handleNewTerminalSession(e?: CustomEvent<{ projectPath?: string }>): void {
    // Project path: explicit override (per-pane "+" in split mode), the docked
    // page's project (INT-2026-016, AK-05/AK-06), else the active project.
    const dockProject = this.dockProject;
    const projectPath = e?.detail?.projectPath || dockProject?.path || '';
    if (!projectPath) {
      this.showToast('Kein Projekt ausgewählt', 'error');
      return;
    }

    // Create session with generic name - updated to type-specific name on connect
    const newSession: TerminalSession = {
      id: `session-${Date.now()}`,
      name: 'Neue Session',
      status: 'active',
      createdAt: new Date(),
      projectPath,
      customNameSet: false,
    };
    this.terminalSessions = [...this.terminalSessions, newSession];
    this.activeTerminalSessionId = newSession.id;
    // INT-2026-016 (AK-06): started on a docked Vorhaben page → it belongs to that Vorhaben once connected.
    const pp = this.pageProject;
    if (this.terminalDocked && this.currentRoute === 'vorhaben' && pp && this.pageIntentId && pp.path === projectPath && !this.breakpoint.isMobile) {
      this.assignOnConnect.set(newSession.id, { projectId: pp.id, intentId: this.pageIntentId });
    }
  }

  /**
   * Get terminal sessions filtered by current project
   */
  private get projectTerminalSessions(): TerminalSession[] {
    // INT-2026-016 (AK-05): docked = the page's project; otherwise the active project.
    const projectPath = this.dockProject?.path || '';
    return this.terminalSessions.filter(s => s.projectPath === projectPath);
  }

  /** projectPath -> display name, for the cross-project split-screen pane dropdowns. */
  private get terminalProjectNames(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const p of this.openProjects) map[p.path] = p.name;
    return map;
  }

  private _handleTerminalSessionSelect(e: CustomEvent<{ sessionId: string; clearNeedsInput?: boolean; userInitiated?: boolean }>): void {
    this.activeTerminalSessionId = e.detail.sessionId;
    // INT-2026-016 (AK-07): a user's click on a Claude tab in the docked column of a
    // Vorhaben page without a live session binds that tab to the Vorhaben. Only the
    // click — Cmd+D, list responses and project switches select programmatically.
    const pp = this.pageProject;
    if (e.detail.userInitiated && this.terminalDocked && this.isTerminalSidebarOpen && this.currentRoute === 'vorhaben' && pp && this.pageIntentId && !this.pageSessionId && !this.breakpoint.isMobile) {
      const tab = this.terminalSessions.find(s => s.id === e.detail.sessionId);
      if (tab?.terminalSessionId && tab.projectPath === pp.path && (tab.terminalType ?? 'claude-code') === 'claude-code') {
        void this._assignSessionToVorhaben(pp.id, this.pageIntentId, tab.terminalSessionId, tab.name);
      }
    }

    // WTT-004: Clear needsInput flag when tab becomes active
    if (e.detail.clearNeedsInput) {
      this.terminalSessions = this.terminalSessions.map(session =>
        session.id === e.detail.sessionId
          ? { ...session, needsInput: false }
          : session
      );
    }
  }

  /**
   * A Claude Code hook fired in a claude-code session. Two consumers:
   * 1. the agent status on the session (every event, active tab included) —
   *    the server has already reduced it, the client only stores it;
   * 2. the bell: a `stop` becomes a notification entry, and a session going
   *    `blocked` rings the chime — the row itself is derived from the status by
   *    buildBellRows(), so it needs no entry of its own. Neither happens while
   *    the user is looking at that very session — active tab of an OPEN
   *    sidebar (INT-2026-010); with the sidebar closed every session reports.
   * 3. The chime decision lives in ringsForAgentEvent() (one ring per message
   *    at most; plan-review events ring even on an already blocked session).
   * Sessions of projects that are not open are unknown here and ignored.
   */
  private _handleCloudTerminalAgentEvent(msg: Record<string, unknown>): void {
    const backendId = typeof msg.sessionId === 'string' ? msg.sessionId : null;
    if (!backendId) return;
    const match = this.terminalSessions.find(s => s.terminalSessionId === backendId);
    if (!match) return;

    const event = typeof msg.event === 'string' ? msg.event : '';
    // "looking at" = active tab of an open sidebar (INT-2026-010, review E2).
    const isActive = match.id === this.sichtbareSessionId;
    let ring = false;

    const status = msg.status;
    if (typeof status === 'string' && AGENT_STATUS_VALUES.has(status)) {
      const at = typeof msg.statusAt === 'string' ? Date.parse(msg.statusAt) : NaN;
      const agentStatus = status as CloudTerminalAgentStatus;
      // Decided against the status BEFORE this message (one ring per blockade).
      ring = ringsForAgentEvent({ event, status: agentStatus, prevStatus: match.agentStatus, isActive });
      // Server status is authoritative: a session that is working/done/idle
      // is by definition not waiting for input, whatever the regex thought.
      const clearNeedsInput = agentStatus === 'working' || agentStatus === 'done' || agentStatus === 'idle';
      // INT-2026-016 (AK-02): the „fertig, unbeantwortet"-mark travels with the event;
      // absent means cleared (an answer, a dialog, a start). The Stop preview is kept
      // only as long as the mark — and only in the browser that saw the event.
      const doneAtRaw = typeof msg.doneAt === 'string' ? Date.parse(msg.doneAt) : NaN;
      const agentDoneAt = Number.isFinite(doneAtRaw) ? doneAtRaw : undefined;
      const agentDonePreview = agentDoneAt ? (event === 'stop' && typeof msg.preview === 'string' ? msg.preview : match.agentDonePreview) : undefined;
      this.terminalSessions = this.terminalSessions.map(s =>
        s.id === match.id
          ? {
              ...s,
              agentStatus,
              agentStatusAt: Number.isFinite(at) ? at : Date.now(),
              agentStatusReason: typeof msg.reason === 'string' ? msg.reason : undefined,
              agentDoneAt,
              agentDonePreview,
              ...(clearNeedsInput ? { needsInput: false } : {}),
            }
          : s
      );
    }
    // Same chime for finished, blocked and plan-review — obeys the bell's mute
    // toggle and rings even while the sidebar is closed, when it matters most.
    if (ring) playAgentDoneChime();
  }

  /**
   * Bell entry clicked in single mode for a session of another project: switch
   * project and land on that session. `lastActiveSessionByProject` is the hook
   * handleProjectTabSelect() already uses to pick the session after a switch.
   */
  private _handleTerminalSessionJump(e: CustomEvent<{ sessionId: string; projectPath: string }>): void {
    const { sessionId, projectPath } = e.detail;
    const project = this.openProjects.find(p => p.path === projectPath);
    if (project && project.id !== this.activeProjectId) {
      this.lastActiveSessionByProject.set(project.id, sessionId);
      this.switchToProject(project.id);
      return;
    }
    this.activeTerminalSessionId = sessionId;
  }

  override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('terminalSessions')) {
      // One choke point for tab names (list, adoption, connect, rename): the
      // helper returns the same array when nothing changes, so no extra cycle.
      this.terminalSessions = assignAutoNames(this.terminalSessions, this.sessionNames);
    }
    this._syncDock(changed);
    this._syncDockProject();
  }

  /**
   * WTT-004: Handle input-needed event from terminal session.
   * Sets needsInput flag on the session to show badge on tab.
   */
  private _handleTerminalInputNeeded(e: CustomEvent<{ sessionId: string }>): void {
    const { sessionId } = e.detail;

    // Only set needsInput if this session is NOT currently active
    if (sessionId === this.activeTerminalSessionId) return;

    this.terminalSessions = this.terminalSessions.map(session =>
      session.id === sessionId
        ? { ...session, needsInput: true }
        : session
    );
  }

  private _handleTerminalSessionRename(e: CustomEvent<{ sessionId: string; name: string }>): void {
    const { sessionId, name } = e.detail;
    this.terminalSessions = this.terminalSessions.map(s =>
      s.id === sessionId ? { ...s, name, customNameSet: true } : s
    );
    // Shared by stable backend id: every device shows the same tab name.
    const session = this.terminalSessions.find(s => s.id === sessionId);
    if (session?.terminalSessionId) this._shareSessionName(session.terminalSessionId, name);
  }

  private _shareSessionName(terminalSessionId: string, name: string): void {
    this.sessionNames = { ...this.sessionNames, [terminalSessionId]: name };
    gateway.send({
      type: 'workspace:set-session-name',
      sessionId: terminalSessionId,
      name,
      timestamp: new Date().toISOString(),
    });
  }

  private _handleTerminalSessionClose(e: CustomEvent<{ sessionId: string }>): void {
    const sessionId = e.detail.sessionId;
    const session = this.terminalSessions.find(s => s.id === sessionId);

    // Send close message to backend to terminate the session
    if (session?.terminalSessionId) {
      gateway.send({
        type: 'cloud-terminal:close',
        sessionId: session.terminalSessionId,
        timestamp: new Date().toISOString(),
      });
      // The server drops the shared name when the session is gone.
    }

    this.terminalSessions = this.terminalSessions.filter(s => s.id !== sessionId);
    this.assignOnConnect.delete(sessionId);

    if (this.activeTerminalSessionId === sessionId) {
      this.activeTerminalSessionId = this.terminalSessions.length > 0
        ? this.terminalSessions[this.terminalSessions.length - 1].id
        : null;
    }
  }

  private _handleTerminalSessionConnected(e: CustomEvent<{ sessionId: string; terminalSessionId: string; terminalType?: 'shell' | 'claude-code'; effectiveCwd?: string; createdAt?: string }>): void {
    const { sessionId, terminalSessionId, terminalType, effectiveCwd, createdAt } = e.detail;
    const resolvedType = terminalType || 'claude-code';
    const created = createdAt ? Date.parse(createdAt) : NaN;

    // Update session with backend ID, terminalType and the server's createdAt
    // (all devices sort auto-names on it). willUpdate() assigns the name.
    this.terminalSessions = this.terminalSessions.map(s => {
      if (s.id !== sessionId) return s;
      const updated = {
        ...s,
        terminalSessionId,
        terminalType: resolvedType,
        ...(effectiveCwd ? { effectiveCwd } : {}),
        ...(Number.isFinite(created) ? { createdAt: new Date(created) } : {}),
      };
      // Rename-before-connect: a custom name set before terminalSessionId existed
      // can now be shared against the stable backend id.
      if (updated.customNameSet) this._shareSessionName(terminalSessionId, updated.name);
      return updated;
    });
    // INT-2026-016 (AK-06): „Neue Session" on a docked Vorhaben page → bind it now (claude-code only).
    const pend = this.assignOnConnect.get(sessionId);
    if (pend) {
      this.assignOnConnect.delete(sessionId);
      if (resolvedType === 'claude-code') {
        const name = this.terminalSessions.find(s => s.id === sessionId)?.name ?? terminalSessionId;
        void this._assignSessionToVorhaben(pend.projectId, pend.intentId, terminalSessionId, name);
      }
    }
  }

  // --- Legacy tab-name store (localStorage) — read once for the workspace migration only. ---

  private _loadSessionNames(): Record<string, string> {
    try {
      const raw = localStorage.getItem('cloud-terminal-session-names');
      if (!raw) return {};
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, string>;
      }
      return {};
    } catch {
      return {};
    }
  }

  private handleWorkflowStart(e: CustomEvent<{ commandId: string; argument?: string; model?: string }>): void {
    const { commandId, argument, model } = e.detail;

    // WTT-003: Open workflow in terminal tab instead of old workflow view
    this._openWorkflowTerminalTab({
      command: commandId,
      argument: argument?.trim() || undefined,
      model: model,
    });
  }

  private handleProjectSelected(e: CustomEvent<ProjectSelectedDetail>): void {
    const { path, name } = e.detail;
    this.showAddProjectModal = false;
    this.requestOpenProject(path, name);
  }

  /**
   * Opens a project in the shared workspace. The server dedupes by normalised
   * path, broadcasts the new state to every device and acks us with the
   * server-side project id, which we then activate (see _handleWorkspaceAck).
   */
  private requestOpenProject(path: string, name: string): void {
    const requestId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `open-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.pendingOpen.set(requestId, path);
    gateway.send({
      type: 'workspace:open-project',
      requestId,
      path,
      name,
      timestamp: new Date().toISOString(),
    });
  }

  private async _handleWorkspaceAck(msg: Record<string, unknown>): Promise<void> {
    const requestId = typeof msg.requestId === 'string' ? msg.requestId : '';
    const projectId = typeof msg.projectId === 'string' ? msg.projectId : '';
    if (!requestId || !this.pendingOpen.has(requestId)) return;
    const requestedPath = this.pendingOpen.get(requestId)!;
    this.pendingOpen.delete(requestId);
    const project = this.openProjects.find(p => p.id === projectId);
    if (!project) return; // state broadcast not applied yet — the next state will carry it
    await this.activateProject(project);
    // WSM-003: Validate project and navigate to getting-started if needed
    this._validateAndNavigate(project.path || requestedPath);
  }

  /**
   * WSM-003: newly added project → project page when Specwright is missing,
   * incomplete, needs migration, or CLI/MCP/product brief are absent. The
   * Getting-Started section there fetches the details itself (INT-2026-010).
   */
  private async _validateAndNavigate(path: string): Promise<void> {
    try {
      const validateResponse = await fetch('/api/project/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      if (!validateResponse.ok) return;
      const data = await validateResponse.json() as {
        valid: boolean;
        hasSpecwright?: boolean;
        hasProductBrief?: boolean;
        needsMigration?: boolean;
        hasIncompleteInstallation?: boolean;
        hasClaudeCli?: boolean;
        hasMcpKanban?: boolean;
      };
      const ok = (data.hasSpecwright ?? false) && !(data.hasIncompleteInstallation ?? false) && (data.hasProductBrief ?? false)
        && !(data.needsMigration ?? false) && (data.hasClaudeCli ?? true) && (data.hasMcpKanban ?? true);
      if (!ok) routerService.navigate('projekt');
    } catch {
      // Validation failed, skip navigation
    }
  }

  // WSM-002: Handle start-setup-terminal event from Getting Started view
  private _handleStartSetupTerminal(e: CustomEvent<{ type: 'install' | 'migrate' | 'update' }>): void {
    const { type } = e.detail;
    const activeProject = this.openProjects.find(p => p.id === this.activeProjectId);
    if (!activeProject) {
      this.showToast('Kein Projekt ausgewählt', 'error');
      return;
    }
    this._openSetupTerminalTab(type, activeProject.path);
  }

  // WSM-002: Open a setup terminal tab (install, migrate, or update)
  private _openSetupTerminalTab(setupType: 'install' | 'migrate' | 'update', projectPath: string): void {
    // Guard: Check if a setup terminal is already running
    const existingSetup = this.terminalSessions.find(
      s => s.isSetupSession === true && s.status !== 'disconnected' && s.projectPath === projectPath
    );
    if (existingSetup) {
      // Focus existing setup terminal instead of creating a new one
      this.activeTerminalSessionId = existingSetup.id;
      if (!this.isTerminalSidebarOpen) {
        this.isTerminalSidebarOpen = true;
      }
      this.showToast('Setup-Terminal läuft bereits', 'info');
      return;
    }

    const sessionId = `setup-${setupType}-${Date.now()}`;
    const sessionNames: Record<string, string> = {
      install: 'Installation',
      migrate: 'Migration',
      update: 'Update',
    };
    const sessionName = sessionNames[setupType] || setupType;
    const commands: Record<string, string> = {
      install: 'curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/install.sh | bash -s -- --yes --all',
      migrate: 'curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/migrate-to-specwright.sh | bash -s -- --yes --no-symlinks',
      update: 'curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/check-update.sh | bash -s -- --update',
    };
    const command = commands[setupType];

    // Create setup session
    const newSession: TerminalSession = {
      id: sessionId,
      name: sessionName,
      status: 'active',
      createdAt: new Date(),
      projectPath,
      terminalType: 'shell',
      isSetupSession: true,
      setupType,
      customNameSet: false,
    };

    this.terminalSessions = [...this.terminalSessions, newSession];
    this.activeTerminalSessionId = sessionId;

    // Open sidebar
    if (!this.isTerminalSidebarOpen) {
      this.isTerminalSidebarOpen = true;
    }

    // Create shell terminal via gateway
    gateway.send({
      type: 'cloud-terminal:create',
      requestId: sessionId,
      projectPath,
      terminalType: 'shell' as const,
      timestamp: new Date().toISOString(),
    });

    // One-shot listener: wait for terminal creation, then send the command
    const handleCreated: MessageHandler = (msg) => {
      if (msg.requestId !== sessionId) return;
      gateway.off('cloud-terminal:created', handleCreated);

      const terminalSessionId = msg.sessionId as string;
      if (terminalSessionId) {
        // Update session with backend terminal ID
        this.terminalSessions = this.terminalSessions.map(s =>
          s.id === sessionId
            ? { ...s, terminalSessionId }
            : s
        );

        // Send the install/migrate command after terminal is ready
        setTimeout(() => {
          gateway.send({
            type: 'cloud-terminal:input',
            sessionId: terminalSessionId,
            data: command + '\n',
            timestamp: new Date().toISOString(),
          });
        }, 500); // TERMINAL_READY_DELAY
      }
    };
    gateway.on('cloud-terminal:created', handleCreated);
  }

  // WSM-002: Handle cloud-terminal:closed for setup session re-validation
  private _handleCloudTerminalClosed(msg: Record<string, unknown>): void {
    const sessionId = msg.sessionId as string;
    const exitCode = msg.exitCode as number | undefined;

    // Closed deliberately on some device → the tab disappears everywhere.
    // (No-op on the closing device: it already removed the tab.)
    if (msg.closedBy === 'user') {
      const tab = this.terminalSessions.find(s => s.terminalSessionId === sessionId);
      if (tab) {
        this.terminalSessions = this.terminalSessions.filter(s => s.id !== tab.id);
        if (this.activeTerminalSessionId === tab.id) {
          const remaining = this.terminalSessions.filter(s => s.projectPath === tab.projectPath);
          this.activeTerminalSessionId = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
        }
      }
      return;
    }

    // Find the matching setup session
    const setupSession = this.terminalSessions.find(
      s => s.terminalSessionId === sessionId && s.isSetupSession === true
    );
    if (!setupSession) return;

    // Update session status
    this.terminalSessions = this.terminalSessions.map(s =>
      s.terminalSessionId === sessionId
        ? { ...s, status: 'disconnected' as const }
        : s
    );

    // Re-validate project only on success (exit code 0): the Getting-Started
    // section reloads itself when mounted (INT-2026-010).
    if (exitCode === 0) {
      const view = this.querySelector('aos-getting-started-view') as AosGettingStartedView | null;
      void view?.load();
    }
  }

  // --- Project Context Management ---

  /**
   * Get the current context value for the ContextProvider.
   */
  private getContextValue(): ProjectContextValue {
    const activeProject = this.activeProjectId
      ? (this.openProjects.find((p) => p.id === this.activeProjectId) ?? null)
      : null;

    return {
      activeProject,
      openProjects: this.openProjects,
      switchProject: (projectId: string) => this.switchToProject(projectId),
      addProject: (project: Project) => this.addNewProject(project),
      closeProject: (projectId: string) => this.closeProjectById(projectId),
      recentProjects: this.recentProjects,
    };
  }

  /**
   * Update the context provider with current state.
   */
  private updateContextProvider(): void {
    this.projectContextProvider.setValue(this.getContextValue());
  }

  /**
   * Switch to a project by ID (used by context consumers).
   */
  private switchToProject(projectId: string): void {
    const event = new CustomEvent('tab-select', {
      detail: { projectId },
    });
    this.handleProjectTabSelect(event as CustomEvent<{ projectId: string }>);
  }

  /**
   * Add a new project (used by context consumers).
   */
  private addNewProject(project: Project): void {
    // Check if already open
    const existing = this.openProjects.find((p) => p.path === project.path);
    if (existing) {
      // Just switch to it
      this.switchToProject(existing.id);
      return;
    }
    this.requestOpenProject(project.path, project.name);
  }

  /**
   * Close a project by ID (used by context consumers).
   */
  private closeProjectById(projectId: string): void {
    const event = new CustomEvent('tab-close', {
      detail: { projectId },
    });
    this.handleProjectTabClose(event as CustomEvent<{ projectId: string }>);
  }

  /** The active project is device-local: the phone may look at another project than the Mac. */
  private persistActiveProject(): void {
    try {
      if (this.activeProjectId) localStorage.setItem('specwright-active-project', this.activeProjectId);
      else localStorage.removeItem('specwright-active-project');
    } catch {
      // localStorage unavailable
    }
  }

  private loadActiveProjectId(): string | null {
    try {
      return localStorage.getItem('specwright-active-project');
    } catch {
      return null;
    }
  }

  /**
   * Wait for WebSocket connection before restoring project state.
   * This prevents timeout errors when trying to send project.switch before connection.
   */
  private restoreProjectStateWhenConnected(): void {
    if (gateway.getConnectionStatus()) {
      // Already connected, restore immediately
      this.requestWorkspace();
    } else {
      // Wait for connection, then restore
      const onConnected = () => {
        gateway.off('gateway.connected', onConnected);
        this.requestWorkspace();
      };
      gateway.on('gateway.connected', onConnected);
    }
  }

  /**
   * Asks the backend for the shared workspace. Falls back to the legacy
   * localStorage restore once if no `workspace:state` arrives (older backend).
   */
  private requestWorkspace(): void {
    gateway.send({ type: 'workspace:get', timestamp: new Date().toISOString() });
    if (this.workspaceReady || this.workspaceFallbackTimer) return;
    this.workspaceFallbackTimer = setTimeout(() => {
      this.workspaceFallbackTimer = null;
      if (!this.workspaceReady) void this.restoreProjectState();
    }, 5000);
  }

  /**
   * Applies a `workspace:state` broadcast: open projects, recents and shared
   * tab names. Active project stays device-local (kept if still open, else the
   * remembered one, else the first). Terminal sessions are listed once per
   * project per connection.
   */
  private async _handleWorkspaceState(msg: Record<string, unknown>): Promise<void> {
    const state = msg.state as WorkspaceState | undefined;
    if (!state || !Array.isArray(state.openProjects)) return;
    const firstState = !this.workspaceReady;
    this.workspaceReady = true;
    if (this.workspaceFallbackTimer) {
      clearTimeout(this.workspaceFallbackTimer);
      this.workspaceFallbackTimer = null;
    }

    const projects: Project[] = state.openProjects.map(p => ({ id: p.id, name: p.name, path: p.path }));
    this.openProjects = projects;

    // Active project: keep, else remembered, else first.
    const remembered = this.loadActiveProjectId();
    const nextActive =
      (this.activeProjectId && projects.some(p => p.id === this.activeProjectId) ? this.activeProjectId : null) ??
      (remembered && projects.some(p => p.id === remembered) ? remembered : null) ??
      (projects[0]?.id ?? null);
    const activeChanged = nextActive !== this.activeProjectId;
    // MPRO-006: when the active project changes, the backend context switch
    // (project.switch) must land BEFORE consumers see the new active project,
    // otherwise consumers ask the backend against "no project selected".
    // activateProject() does exactly that; only the unchanged case can
    // publish the new project list right away.
    if (!activeChanged) this.updateContextProvider();

    this.recentProjects = (Array.isArray(state.recentProjects) ? state.recentProjects : []).map(r => ({
      path: r.path,
      name: r.name,
      lastOpened: Date.parse(r.lastOpened) || Date.now(),
    }));
    if (!activeChanged) this.updateContextProvider();

    const names = state.sessionNames && typeof state.sessionNames === 'object' ? state.sessionNames : {};
    this.sessionNames = names;
    this.terminalSessions = assignAutoNames(this.terminalSessions, names);

    // Drop tabs of projects that were closed elsewhere.
    const openPaths = new Set(projects.map(p => p.path));
    const remaining = this.terminalSessions.filter(s => openPaths.has(s.projectPath));
    if (remaining.length !== this.terminalSessions.length) {
      this.terminalSessions = remaining;
      if (this.activeTerminalSessionId && !remaining.some(s => s.id === this.activeTerminalSessionId)) {
        this.activeTerminalSessionId = null;
      }
    }

    // List terminal sessions for projects we have not asked about on this connection.
    for (const project of projects) {
      if (this.listedProjectPaths.has(project.path)) continue;
      this.listedProjectPaths.add(project.path);
      gateway.send({ type: 'cloud-terminal:list', projectPath: project.path, timestamp: new Date().toISOString() });
    }

    if (activeChanged && nextActive) {
      const project = projects.find(p => p.id === nextActive);
      if (project) await this.activateProject(project);
    } else if (activeChanged) {
      this.activeTerminalSessionId = null;
      this._handleDocumentPreviewClose();
    }

    if (firstState) this.migrateLocalWorkspaceOnce(state);
  }

  /**
   * Makes a project the active one on this device: backend context switch,
   * git status, file tree, remembered terminal tab. Shared by tab select,
   * workspace ack and workspace state.
   */
  private async activateProject(project: Project): Promise<void> {
    const result = await projectStateService.switchProject(project);
    if (!result.success) {
      this.showToast(`Failed to switch project: ${result.error}`, 'error');
    }
    const previousProject = this.openProjects.find(p => p.id === this.activeProjectId);
    if (previousProject && previousProject.id !== project.id && this.activeTerminalSessionId) {
      this.lastActiveSessionByProject.set(previousProject.id, this.activeTerminalSessionId);
    }
    this.activeProjectId = project.id;
    this.updateContextProvider();
    this.persistActiveProject();
    this._handleDocumentPreviewClose();
    gitState.loadStatus(true);
    const sidebar = this.querySelector('aos-file-tree-sidebar') as { reset(): void } | null;
    if (sidebar) sidebar.reset();
    const projectSessions = this.terminalSessions.filter(s => s.projectPath === project.path);
    if (projectSessions.length > 0) {
      const remembered = this.lastActiveSessionByProject.get(project.id);
      const rememberedExists = remembered && projectSessions.some(s => s.id === remembered);
      this.activeTerminalSessionId = rememberedExists ? remembered : projectSessions[0].id;
    } else {
      this.activeTerminalSessionId = null;
    }
  }

  /**
   * One-time upload of this browser's legacy localStorage workspace (open
   * projects, recents, tab names). The server fills only fields that are still
   * empty, so a late device never overwrites a workspace others already use.
   */
  private migrateLocalWorkspaceOnce(serverState: WorkspaceState): void {
    const FLAG = 'specwright-workspace-migrated';
    let migrated: string | null = null;
    try { migrated = localStorage.getItem(FLAG); } catch { return; }
    if (migrated) return;

    const stored = projectStateService.loadPersistedState();
    const recents = recentlyOpenedService.getRecentlyOpened();
    const names = this._loadSessionNames();
    const openProjects = (stored?.openProjects ?? []).map(p => ({ path: p.path, name: p.name }));
    if (openProjects.length || recents.length || Object.keys(names).length) {
      gateway.send({
        type: 'workspace:import',
        ...(openProjects.length ? { openProjects } : {}),
        ...(recents.length ? { recentProjects: recents } : {}),
        ...(Object.keys(names).length ? { sessionNames: names } : {}),
        timestamp: new Date().toISOString(),
      });
    }
    // Carry the old (random) active id over by path, if that project is (or becomes) open.
    if (stored?.activeProjectId && !this.loadActiveProjectId()) {
      const oldActive = stored.openProjects.find(p => p.id === stored.activeProjectId);
      const match = oldActive && serverState.openProjects.find(p => p.path === oldActive.path);
      if (match) {
        try { localStorage.setItem('specwright-active-project', match.id); } catch { /* ignore */ }
      }
    }
    try { localStorage.setItem(FLAG, new Date().toISOString()); } catch { /* ignore */ }
  }

  /**
   * LEGACY fallback: restore project state from localStorage. Only used when the
   * backend never answered `workspace:get` (older backend during a rolling update).
   */
  private async restoreProjectState(): Promise<void> {
    if (this.workspaceReady) return;
    const storedState = projectStateService.loadPersistedState();
    if (!storedState || storedState.openProjects.length === 0) {
      return;
    }

    // Project restoration in progress

    // Validate all stored projects are still accessible
    const { validProjects, removedPaths } =
      await projectStateService.restoreProjects(storedState.openProjects);

    // Show notification for removed projects
    if (removedPaths.length > 0) {
      const count = removedPaths.length;
      this.showToast(
        `${count} project${count > 1 ? 's' : ''} could not be restored`,
        'warning'
      );
    }

    // Restore valid projects
    this.openProjects = validProjects;

    // Determine active project
    if (storedState.activeProjectId) {
      const stillExists = validProjects.some(
        (p) => p.id === storedState.activeProjectId
      );
      this.activeProjectId = stillExists
        ? storedState.activeProjectId
        : validProjects.length > 0
          ? validProjects[0].id
          : null;
    } else {
      this.activeProjectId = validProjects.length > 0 ? validProjects[0].id : null;
    }

    // Initialize the active project with backend (also sends WebSocket message)
    if (this.activeProjectId) {
      const activeProject = this.openProjects.find(
        (p) => p.id === this.activeProjectId
      );
      if (activeProject) {
        const result = await projectStateService.switchProject(activeProject);
        if (!result.success) {
          this.showToast(
            `Failed to restore project context: ${result.error}`,
            'warning'
          );
        }
      }
    }

    this.updateContextProvider();
    this.persistActiveProject();

    // Restore terminal sessions for all open projects
    this.restoreTerminalSessions();

    // Load git status for active project
    gitState.loadStatus(this.activeProjectId !== null);
    // Project restoration complete
  }

  /**
   * Restore terminal sessions from backend after page reload.
   * Queries the backend for active sessions for each open project.
   */
  private restoreTerminalSessions(): void {
    // Query terminal sessions for each open project
    for (const project of this.openProjects) {
      gateway.send({
        type: 'cloud-terminal:list',
        projectPath: project.path,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle cloud-terminal:list-response from backend.
   * Merges backend sessions into frontend terminalSessions state.
   */
  private handleCloudTerminalListResponse(msg: Record<string, unknown>): void {
    const backendSessions = msg.sessions as BackendSessionLike[] | undefined;
    if (!backendSessions || backendSessions.length === 0) {
      return;
    }

    // Tabs for sessions we do not know yet. Names are settled by willUpdate().
    const known = new Set(this.terminalSessions.map(s => s.terminalSessionId));
    const sessionsToAdd: TerminalSession[] = backendSessions
      .filter(b => b.status !== 'closed' && !known.has(b.sessionId))
      .map(b => toRestoredTab(b));

    // A list response after a (re)connect is the freshest agent-status source
    // for sessions we already know — refresh them in place.
    const byBackendId = new Map(backendSessions.map(b => [b.sessionId, b]));
    let refreshed = false;
    const refreshedSessions = this.terminalSessions.map(s => {
      const b = s.terminalSessionId ? byBackendId.get(s.terminalSessionId) : undefined;
      if (!b || b.agentStatus === undefined) return s;
      const fields = agentStatusFields({
        agentStatus: b.agentStatus,
        agentStatusAt: typeof b.agentStatusAt === 'string' ? b.agentStatusAt : b.agentStatusAt?.toISOString(),
        agentStatusReason: b.agentStatusReason,
        agentDoneAt: typeof b.agentDoneAt === 'string' ? b.agentDoneAt : b.agentDoneAt?.toISOString(),
      });
      if (fields.agentStatus === s.agentStatus && fields.agentStatusAt === s.agentStatusAt && fields.agentStatusReason === s.agentStatusReason && fields.agentDoneAt === s.agentDoneAt) return s;
      refreshed = true;
      return { ...s, ...fields, ...(fields.agentDoneAt ? {} : { agentDonePreview: undefined }) };
    });
    if (refreshed) this.terminalSessions = refreshedSessions;

    if (sessionsToAdd.length > 0) {
      this.terminalSessions = [...this.terminalSessions, ...sessionsToAdd];

      // Set active session if none is set and we have sessions for current project
      if (!this.activeTerminalSessionId) {
        const currentProjectSessions = this.projectTerminalSessions;
        if (currentProjectSessions.length > 0) {
          this.activeTerminalSessionId = currentProjectSessions[0].id;
        }
      }
    }
  }

  /**
   * A session was created by another device (or by an auto-mode orchestrator):
   * adopt it as a tab if its project is open here. Our own creates are
   * correlated by requestId and handled by aos-terminal-session.
   */
  private _handleCloudTerminalCreatedElsewhere(msg: Record<string, unknown>): void {
    if (isOwnCreateRequest(this.terminalSessions, msg.requestId)) return;
    const session = msg.session as BackendSessionLike | undefined;
    const sessionId = typeof msg.sessionId === 'string' ? msg.sessionId : session?.sessionId;
    if (!session || !sessionId) return;
    if (this.terminalSessions.some(s => s.terminalSessionId === sessionId)) return;
    if (!this.openProjects.some(p => p.path === session.projectPath)) return;
    const tab = toRestoredTab({ ...session, sessionId }, msg.workflowMetadata as WorkflowMetadataLike | undefined);
    this.terminalSessions = [...this.terminalSessions, tab];
    const activeProject = this.openProjects.find(p => p.id === this.activeProjectId);
    if (!this.activeTerminalSessionId && activeProject?.path === session.projectPath) {
      this.activeTerminalSessionId = tab.id;
    }
    // A step started from the Vorhaben page: the page names its session via
    // `vorhaben-page-session`; when that arrived before this tab, willUpdate()
    // resolves the pending dock now (INT-2026-011, FA-08).
  }

  /**
   * Put one session alone on the screen (INT-2026-005): open the sidebar, make the
   * session active, then let the sidebar go fullscreen and zoom its pane — after the
   * render, so the sidebar already lists the tab in `allSessions`. In single mode with
   * another project active the sidebar answers with `session-jump` and
   * `_handleTerminalSessionJump` switches the project. Reached only via
   * `open-terminal-session` from pages without a docked terminal (INT-2026-011).
   */
  private _showSessionSolo(tabId: string): void {
    this.activeTerminalSessionId = tabId;
    this.isTerminalSidebarOpen = true;
    void this.updateComplete.then(() => {
      const sidebar = this.querySelector('aos-cloud-terminal-sidebar') as { showSessionSolo(id: string): void } | null;
      sidebar?.showSessionSolo(tabId);
    });
  }

  private _handleShowToast(e: CustomEvent<{ message: string; type: 'success' | 'error' | 'info' | 'warning' }>): void {
    this.showToast(e.detail.message, e.detail.type);
  }

  // --- Keyboard shortcuts ---

  private _handleGlobalKeydown(e: KeyboardEvent): void {
    // Cmd/Ctrl+D toggles cloud terminal sidebar
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key === 'd') {
      e.preventDefault();
      this._toggleTerminalSidebar();
      return;
    }
    // Cmd+← = „‹ Vorhaben" on the docked pages (INT-2026-015, AK-05) — the same two routes that dock
    // the terminal (terminal-dock.ts; a page that docks without a back shortcut would split this
    // predicate, reviews E5/G9); Mac only like the column itself (NZ-05); a held key counts once.
    // Text fields keep the key (AK-06); the terminal's own textarea does not — xterm ignores
    // Cmd+Arrow (AK-07/AK-08). Everywhere else the browser keeps it (AK-09).
    if (isBackToOverviewShortcut(e)) {
      if (!this.terminalDocked || this.breakpoint.isMobile || e.repeat || isTypingTarget(e.composedPath())) return;
      e.preventDefault();
      routerService.navigate('vorhaben');
    }
  }

  // WTT-003: Open a workflow terminal tab from UI triggers (Team, Getting Started)
  private _openWorkflowTerminalTab(detail: {
    command: string;
    argument?: string;
    model?: string;
    projectPath?: string;
  }): void {
    const { command, argument, model, projectPath } = detail;

    // Resolve project path
    const resolvedProjectPath = projectPath || this.openProjects.find(p => p.id === this.activeProjectId)?.path || '';

    if (!resolvedProjectPath) {
      this.showToast('Kein Projekt ausgewählt', 'error');
      return;
    }

    // Build workflow context: only the argument
    const workflowContext = argument?.trim() || undefined;

    // Parse model to get provider and model ID
    const modelConfig = this._parseModelConfig(model);

    // Generate unique session ID
    const sessionId = `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Create session title: "workflowName: argument" or just "workflowName"
    const tabTitle = workflowContext ? `${command}: ${workflowContext}` : command;

    // Create the workflow session in app state (single source of truth)
    const newSession: TerminalSession = {
      id: sessionId,
      name: tabTitle,
      status: 'active',
      createdAt: new Date(),
      projectPath: resolvedProjectPath,
      terminalType: 'claude-code',
      isWorkflow: true,
      workflowName: command,
      workflowContext,
      needsInput: false,
      modelId: modelConfig.modelId,
      providerId: modelConfig.providerId,
      customNameSet: false,
    };

    // Add to app's terminalSessions (flows down to sidebar via projectTerminalSessions)
    this.terminalSessions = [...this.terminalSessions, newSession];

    // Set the new session as active
    this.activeTerminalSessionId = sessionId;

    // Open sidebar if closed
    if (!this.isTerminalSidebarOpen) {
      this.isTerminalSidebarOpen = true;
    }

    console.log('[App] Opened workflow terminal tab:', { command, argument, sessionId });
  }

  // WTT-003: Parse model string to provider and model ID
  private _parseModelConfig(model?: string): { providerId?: string; modelId?: string } {
    if (!model) {
      return { providerId: undefined, modelId: undefined };
    }

    // Model format: "provider/model" or just "model"
    if (model.includes('/')) {
      const [providerId, modelId] = model.split('/');
      return { providerId, modelId };
    }

    // Map known model IDs to their providers
    const modelProviderMap: Record<string, string> = {
      'opus': 'anthropic',
      'sonnet': 'anthropic',
      'haiku': 'anthropic',
      'glm-5': 'glm',
      'kimi-k2.5': 'kimi-kw',
    };

    const providerId = modelProviderMap[model];
    return { providerId, modelId: model };
  }

  // --- Rendering ---

  private renderView() {
    switch (this.currentRoute) {
      case 'vorhaben':
      case 'neu':
      case 'projekt':
        return html`<aos-vorhaben-view
          .route=${this.currentRoute}
          @show-toast=${this._handleShowToast}
          @add-project=${this.handleAddProject}
          @file-tree-toggle=${this._handleFileTreeToggle}
          @workflow-start-interactive=${this.handleWorkflowStart}
          @start-setup-terminal=${this._handleStartSetupTerminal}
        ></aos-vorhaben-view>`;
      default:
        return html`<aos-not-found-view></aos-not-found-view>`;
    }
  }

  /**
   * The frame (INT-2026-010, FA-07): one header line, the view, the overlays.
   * No sidebar, no project tabs, no git bar — their content lives on the
   * project page; the bell is the only thing that is always there.
   */
  override render() {
    const g = this.git;
    return html`
      <aos-kopfzeile
        .titel=${this.getPageTitle()}
        .mobile=${this.breakpoint.isMobile}
        .reconnecting=${this.isReconnecting}
        .terminalOffen=${this.isTerminalSidebarOpen}
        .glockeRows=${this.glockeRows}
        .glockeSessions=${this.glockeSessions}
        .projectNames=${this.terminalProjectNames}
        @glocke-open=${this._handleGlockeOpen}
        @terminal-toggle=${this._handleTerminalToggle}
      ></aos-kopfzeile>
      <main class="main-content">
        <div class="view-container">${this.renderView()}</div>
        <aos-file-editor-panel .sidebarOpen=${this.isFileTreeOpen}></aos-file-editor-panel>
      </main>
      <aos-toast-notification></aos-toast-notification>
      <aos-git-diff-viewer></aos-git-diff-viewer>
      <aos-project-add-modal
        .open=${this.showAddProjectModal}
        .openProjectPaths=${this.openProjects.map((p) => p.path)}
        .recentProjects=${this.recentProjects}
        @project-selected=${this.handleProjectSelected}
        @modal-close=${this.handleAddProjectModalClose}
        @recent-remove=${this._handleRecentRemove}
      ></aos-project-add-modal>
      <aos-notepad-panel
        .open=${this.showNotepad}
        @notepad-toggle=${() => { this.showNotepad = !this.showNotepad; }}
        @panel-close=${() => { this.showNotepad = false; }}
      ></aos-notepad-panel>
      <aos-file-tree-sidebar
        .isOpen=${this.isFileTreeOpen}
        @sidebar-close=${this._handleFileTreeClose}
        @file-open=${this._handleFileTreeFileOpen}
      ></aos-file-tree-sidebar>
      <aos-document-preview-panel
        .isOpen=${this.isDocumentPreviewOpen}
        .content=${this.documentPreviewContent}
        .filePath=${this.documentPreviewFilePath}
        @close=${this._handleDocumentPreviewClose}
      ></aos-document-preview-panel>
      <aos-cloud-terminal-sidebar
        .isOpen=${this.isTerminalSidebarOpen}
        .docked=${this.terminalDocked}
        .sessions=${this.projectTerminalSessions}
        .allSessions=${this.terminalSessions}
        .projectNames=${this.terminalProjectNames}
        .activeSessionId=${this.activeTerminalSessionId}
        @sidebar-close=${this._handleTerminalClose}
        @session-jump=${this._handleTerminalSessionJump}
        @new-session=${this._handleNewTerminalSession}
        @session-select=${this._handleTerminalSessionSelect}
        @session-close=${this._handleTerminalSessionClose}
        @session-rename=${this._handleTerminalSessionRename}
        @session-connected=${this._handleTerminalSessionConnected}
        @input-needed=${this._handleTerminalInputNeeded}
      ></aos-cloud-terminal-sidebar>
      <aos-git-commit-dialog
        .open=${g.showCommitDialog}
        .files=${g.gitStatus?.files ?? []}
        .error=${g.commitError}
        .committing=${g.committing}
        .autoPush=${g.pendingAutoPush}
        .progressPhase=${g.commitAndPushPhase}
        .generatingMessage=${g.generatingCommitMessage}
        @git-commit=${(e: CustomEvent<{ files: string[]; message: string }>) => gitState.commit(e.detail.files, e.detail.message)}
        @revert-file=${(e: CustomEvent<{ file: string }>) => gitState.revertFile(e.detail.file)}
        @revert-all=${() => gitState.revertAll()}
        @delete-untracked=${(e: CustomEvent<{ file: string }>) => gitState.deleteUntracked(e.detail.file)}
        @generate-commit-message=${(e: CustomEvent<{ files: string[] }>) => gitState.generateCommitMessage(e.detail.files)}
        @dialog-close=${() => gitState.closeCommitDialog()}
      ></aos-git-commit-dialog>
      <aos-git-pull-strategy-dialog
        .open=${g.showPullStrategyDialog}
        .retryPush=${g.pullStrategyRetryPush}
        @pull-strategy-select=${(e: CustomEvent<{ strategy: PullStrategy }>) => gitState.pullStrategySelect(e.detail.strategy)}
        @pull-strategy-cancel=${() => gitState.pullStrategyCancel()}
      ></aos-git-pull-strategy-dialog>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-app': AosApp;
  }
}
