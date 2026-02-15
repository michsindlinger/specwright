import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ContextProvider } from '@lit/context';

import './views/dashboard-view.js';
import './views/chat-view.js';
import './views/workflow-view.js';
import './views/settings-view.js';
import './views/not-found-view.js';
import './components/model-selector.js';
import './components/toast-notification.js';
import './components/loading-spinner.js';
import './components/aos-project-tabs.js';
import './components/aos-project-add-modal.js';
import './components/aos-context-menu.js';
import './components/aos-quick-todo-modal.js';
import './components/terminal/aos-cloud-terminal-sidebar.js';
import './components/git/aos-git-status-bar.js';
import './components/git/aos-git-commit-dialog.js';
import './components/queue/aos-global-queue-panel.js';
import './components/queue/aos-queue-section.js';
import './components/queue/aos-specs-section.js';
import type { QueueItem } from './components/queue/aos-queue-item.js';
import type { TerminalSession } from './components/terminal/aos-cloud-terminal-sidebar.js';
import type { ProjectSelectedDetail } from './components/aos-project-add-modal.js';
import type { GitStatusData, GitBranchEntry, GitPrInfo } from '../../src/shared/types/git.protocol.js';
import type { MenuSelectEventDetail } from './components/aos-context-menu.js';
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
import type { ProviderInfo } from './components/workflow-card.js';
import type { ViewType } from './types/route.types.js';

type Route = ViewType;

interface NavItem {
  route: Route;
  label: string;
  icon: string;
}

@customElement('aos-app')
export class AosApp extends LitElement {
  @state()
  private currentRoute: Route = 'dashboard';

  @state()
  private isReconnecting = false;

  @state()
  private openProjects: Project[] = [];

  @state()
  private activeProjectId: string | null = null;

  @state()
  private showAddProjectModal = false;

  @state()
  private showWorkflowModal = false;

  @state()
  private workflowModalCommand: { id: string; name: string; description: string } | null = null;

  @state()
  private workflowModalMode: 'direct' | 'add-story' = 'direct';

  @state()
  private providers: ProviderInfo[] = [];

  @state()
  private isTerminalSidebarOpen = false;

  @state()
  private terminalSessions: TerminalSession[] = [];

  @state()
  private activeTerminalSessionId: string | null = null;

  @state()
  private gitStatus: GitStatusData | null = null;

  @state()
  private gitLoading = false;

  @state()
  private gitBranches: GitBranchEntry[] = [];

  @state()
  private showCommitDialog = false;

  @state()
  private commitError = '';

  @state()
  private committing = false;

  @state()
  private isGitOperationRunning = false;

  @state()
  private gitPrInfo: GitPrInfo | null = null;

  @state()
  private pendingAutoPush = false;

  @state()
  private commitAndPushPhase: 'idle' | 'committing' | 'pushing' = 'idle';

  @state()
  private showQuickTodoModal = false;

  // GSQ-005: Bottom Panel state
  @state()
  private isBottomPanelOpen = false;

  @state()
  private bottomPanelActiveTab: 'queue-specs' | 'log' = 'queue-specs';

  // GSQ-005: Queue state (migrated from dashboard-view)
  @state()
  private globalQueue: QueueItem[] = [];

  @state()
  private isQueueRunning = false;

  private toastRef: AosToastNotification | null = null;

  private projectContextProvider = new ContextProvider(this, {
    context: projectContext,
    initialValue: this.getContextValue(),
  });

  private navItems: NavItem[] = [
    { route: 'dashboard', label: 'Dashboard', icon: '📊' },
    { route: 'chat', label: 'Chat', icon: '💬' },
    { route: 'workflows', label: 'Workflows', icon: '⚡' },
    { route: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  private boundRouteChangeHandler = (route: import('./types/route.types.js').ParsedRoute) => {
    this.currentRoute = route.view;
  };
  private boundContextMenuHandler = (e: Event) =>
    this.handleContextMenu(e as MouseEvent);
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
    }
    this.isReconnecting = false;
  };
  private boundErrorHandler: MessageHandler = (msg) => {
    const errorMessage = (msg.message as string) || 'Ein Fehler ist aufgetreten';
    this.showToast(errorMessage, 'error');
  };
  private boundModelProvidersHandler: MessageHandler = (msg) => {
    const providers = msg.providers as ProviderInfo[] | undefined;
    if (providers && providers.length > 0) {
      this.providers = providers;
    }
  };
  private boundCloudTerminalListHandler: MessageHandler = (msg) => {
    this.handleCloudTerminalListResponse(msg);
  };
  private boundGitStatusHandler: MessageHandler = (msg) => {
    this.gitStatus = msg.data as GitStatusData;
    this.gitLoading = false;
  };
  private boundGitErrorHandler: MessageHandler = (msg) => {
    this.gitLoading = false;
    const operation = msg.operation as string | undefined;
    const code = msg.code as string | undefined;
    const rawMessage = msg.message as string;

    if (operation === 'commit') {
      this.committing = false;
      this.commitError = rawMessage || 'Commit fehlgeschlagen';
      return;
    }

    if (operation === 'push' && this.pendingAutoPush) {
      this.pendingAutoPush = false;
      this.commitAndPushPhase = 'idle';
      this.isGitOperationRunning = false;
      this.showCommitDialog = false;
      this.commitError = '';
      this.showToast('Commit erfolgreich, Push fehlgeschlagen', 'warning');
      this._handleRefreshGit();
      return;
    }

    if (operation === 'pull' || operation === 'push') {
      this.isGitOperationRunning = false;
    }

    const friendlyMessage = this._mapGitErrorMessage(code, rawMessage, operation);
    this.showToast(friendlyMessage, 'error');
  };
  private boundGitBranchesHandler: MessageHandler = (msg) => {
    this.gitBranches = (msg.branches as GitBranchEntry[]) || [];
  };
  private boundGitCheckoutHandler: MessageHandler = (msg) => {
    const data = msg.data as { success: boolean; branch: string } | undefined;
    if (data?.success) {
      this.showToast(`Branch gewechselt zu ${data.branch}`, 'success');
      this._loadGitStatus();
      gateway.requestGitBranches();
    }
  };
  private boundGitCommitHandler: MessageHandler = (msg) => {
    const data = msg.data as { hash: string; filesChanged: number } | undefined;
    this.committing = false;
    if (data) {
      if (this.pendingAutoPush) {
        this.commitAndPushPhase = 'pushing';
        this.isGitOperationRunning = true;
        gateway.requestGitPush();
        return;
      }
      this.showCommitDialog = false;
      this.commitError = '';
      this.showToast(`Commit erfolgreich (${data.filesChanged} Datei(en))`, 'success');
      this._handleRefreshGit();
    }
  };
  private boundGitPullHandler: MessageHandler = (msg) => {
    this.isGitOperationRunning = false;
    const data = msg.data as { success: boolean; summary: string; commitsReceived: number; hasConflicts: boolean } | undefined;
    if (data) {
      if (data.commitsReceived === 0) {
        this.showToast('Bereits aktuell', 'info');
      } else {
        this.showToast(`Pull erfolgreich: ${data.commitsReceived} Datei(en) aktualisiert`, 'success');
      }
      this._handleRefreshGit();
    }
  };
  private boundGitPushHandler: MessageHandler = (msg) => {
    this.isGitOperationRunning = false;
    const data = msg.data as { success: boolean; summary: string; commitsPushed: number } | undefined;
    if (data) {
      if (this.pendingAutoPush) {
        this.pendingAutoPush = false;
        this.commitAndPushPhase = 'idle';
        this.showCommitDialog = false;
        this.commitError = '';
        this.showToast('Commit & Push erfolgreich', 'success');
        this._handleRefreshGit();
        return;
      }
      if (data.commitsPushed === 0) {
        this.showToast('Nichts zum Pushen - alles aktuell', 'info');
      } else {
        this.showToast(`Push erfolgreich: ${data.commitsPushed} Commits`, 'success');
      }
      this._handleRefreshGit();
    }
  };
  private boundGitRevertHandler: MessageHandler = (msg) => {
    const data = msg.data as { revertedFiles: string[]; failedFiles: string[] } | undefined;
    if (data) {
      const count = data.revertedFiles.length;
      if (data.failedFiles.length > 0) {
        this.showToast(`${count} Datei(en) revertiert, ${data.failedFiles.length} fehlgeschlagen`, 'warning');
      } else {
        this.showToast(`${count} Datei(en) revertiert`, 'success');
      }
      this._handleRefreshGit();
    }
  };
  private boundGitDeleteUntrackedHandler: MessageHandler = (msg) => {
    const data = msg.data as { file: string; success: boolean } | undefined;
    if (data) {
      if (data.success) {
        this.showToast(`Datei geloescht: ${data.file}`, 'success');
      } else {
        this.showToast(`Loeschen fehlgeschlagen: ${data.file}`, 'error');
      }
      this._handleRefreshGit();
    }
  };
  private boundGitPrInfoHandler: MessageHandler = (msg) => {
    this.gitPrInfo = (msg.data as GitPrInfo | null) ?? null;
  };
  // GSQ-005: Queue gateway handlers
  private boundQueueStateHandler: MessageHandler = (msg) => {
    const items = (msg.items as QueueItem[]) || [];
    const isQueueRunning = msg.isQueueRunning as boolean | undefined;
    this.globalQueue = items;
    if (isQueueRunning !== undefined) {
      this.isQueueRunning = isQueueRunning;
    }
  };
  private boundQueueStartAckHandler: MessageHandler = (msg) => {
    const isQueueRunning = msg.isQueueRunning as boolean | undefined;
    if (isQueueRunning !== undefined) {
      this.isQueueRunning = isQueueRunning;
    }
  };
  private boundQueueCompleteHandler: MessageHandler = () => {
    this.isQueueRunning = false;
  };
  private boundKeydownHandler = (e: KeyboardEvent) => this._handleGlobalKeydown(e);

  override connectedCallback(): void {
    super.connectedCallback();
    routerService.on('route-changed', this.boundRouteChangeHandler);
    routerService.init();
    window.addEventListener('contextmenu', this.boundContextMenuHandler);

    // Setup gateway listeners
    gateway.on('gateway.reconnecting', this.boundReconnectingHandler);
    gateway.on('gateway.connected', this.boundConnectedHandler);
    gateway.on('gateway.error', this.boundErrorHandler);
    gateway.on('model.providers.list', this.boundModelProvidersHandler);
    gateway.on('cloud-terminal:list-response', this.boundCloudTerminalListHandler);
    gateway.on('git:status:response', this.boundGitStatusHandler);
    gateway.on('git:branches:response', this.boundGitBranchesHandler);
    gateway.on('git:checkout:response', this.boundGitCheckoutHandler);
    gateway.on('git:commit:response', this.boundGitCommitHandler);
    gateway.on('git:pull:response', this.boundGitPullHandler);
    gateway.on('git:push:response', this.boundGitPushHandler);
    gateway.on('git:revert:response', this.boundGitRevertHandler);
    gateway.on('git:delete-untracked:response', this.boundGitDeleteUntrackedHandler);
    gateway.on('git:pr-info:response', this.boundGitPrInfoHandler);
    gateway.on('git:error', this.boundGitErrorHandler);
    // GSQ-005: Queue gateway handlers
    gateway.on('queue.state', this.boundQueueStateHandler);
    gateway.on('queue.start.ack', this.boundQueueStartAckHandler);
    gateway.on('queue.complete', this.boundQueueCompleteHandler);
    // GSQ-005: Keyboard shortcut
    document.addEventListener('keydown', this.boundKeydownHandler);

    // Global error handler
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener(
      'unhandledrejection',
      this.handleUnhandledRejection.bind(this)
    );

    // GSQ-005: Restore bottom panel height from localStorage
    try {
      const savedHeight = localStorage.getItem('global-queue-panel-height');
      if (savedHeight) {
        const height = parseInt(savedHeight, 10);
        if (height >= 200) {
          this._bottomPanelHeight = height;
        }
      }
    } catch {
      // localStorage unavailable
    }

    // Connect WebSocket first, then restore project state after connection
    gateway.connect();
    this.restoreProjectStateWhenConnected();

    // Load model providers when connected
    if (gateway.getConnectionStatus()) {
      gateway.send({ type: 'model.providers.list' });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    routerService.off('route-changed', this.boundRouteChangeHandler);
    window.removeEventListener('contextmenu', this.boundContextMenuHandler);
    gateway.off('gateway.reconnecting', this.boundReconnectingHandler);
    gateway.off('gateway.connected', this.boundConnectedHandler);
    gateway.off('gateway.error', this.boundErrorHandler);
    gateway.off('model.providers.list', this.boundModelProvidersHandler);
    gateway.off('cloud-terminal:list-response', this.boundCloudTerminalListHandler);
    gateway.off('git:status:response', this.boundGitStatusHandler);
    gateway.off('git:branches:response', this.boundGitBranchesHandler);
    gateway.off('git:checkout:response', this.boundGitCheckoutHandler);
    gateway.off('git:commit:response', this.boundGitCommitHandler);
    gateway.off('git:pull:response', this.boundGitPullHandler);
    gateway.off('git:push:response', this.boundGitPushHandler);
    gateway.off('git:revert:response', this.boundGitRevertHandler);
    gateway.off('git:delete-untracked:response', this.boundGitDeleteUntrackedHandler);
    gateway.off('git:pr-info:response', this.boundGitPrInfoHandler);
    gateway.off('git:error', this.boundGitErrorHandler);
    // GSQ-005: Cleanup queue handlers + keyboard shortcut
    gateway.off('queue.state', this.boundQueueStateHandler);
    gateway.off('queue.start.ack', this.boundQueueStartAckHandler);
    gateway.off('queue.complete', this.boundQueueCompleteHandler);
    document.removeEventListener('keydown', this.boundKeydownHandler);
  }

  private handleGlobalError(event: ErrorEvent): void {
    console.error('Global error:', event.error);
    this.showToast('Ein unerwarteter Fehler ist aufgetreten', 'error');
  }

  private handleContextMenu(event: MouseEvent): void {
    // Prevent browser context menu
    event.preventDefault();

    // Guard: Don't show context menu if a modal is already open
    if (this.showAddProjectModal || this.showWorkflowModal || this.showQuickTodoModal) {
      return;
    }

    // Get reference to context menu element (light DOM)
    const contextMenu = this.querySelector(
      'aos-context-menu'
    ) as unknown as { show: (x: number, y: number) => void };

    // Show context menu at cursor position
    contextMenu?.show(event.clientX, event.clientY);
  }

  private handleMenuItemSelect(event: CustomEvent<MenuSelectEventDetail>): void {
    // Note: Context menu closes itself automatically when item is clicked
    const { action } = event.detail;

    // Handle different menu actions
    switch (action) {
      case 'add-story':
        // Open workflow modal in add-story mode (with spec selector)
        this.workflowModalMode = 'add-story';
        this.workflowModalCommand = {
          id: 'agent-os:add-story',
          name: 'Story hinzufügen',
          description: 'Eine neue Story zu einer bestehenden Spec hinzufügen'
        };
        this.showWorkflowModal = true;
        break;

      case 'create-spec':
        // Open workflow modal for create-spec
        this.workflowModalMode = 'direct';
        this.workflowModalCommand = {
          id: 'agent-os:create-spec',
          name: 'Neue Spec erstellen',
          description: 'Eine neue Feature-Spezifikation erstellen'
        };
        this.showWorkflowModal = true;
        break;

      case 'create-bug':
        // Open workflow modal for add-bug
        this.workflowModalMode = 'direct';
        this.workflowModalCommand = {
          id: 'agent-os:add-bug',
          name: 'Bug erstellen',
          description: 'Einen neuen Bug zur Bearbeitung erfassen'
        };
        this.showWorkflowModal = true;
        break;

      case 'create-todo':
        // Open workflow modal for add-todo
        this.workflowModalMode = 'direct';
        this.workflowModalCommand = {
          id: 'agent-os:add-todo',
          name: 'TODO erstellen',
          description: 'Eine neue Aufgabe zum Backlog hinzufügen'
        };
        this.showWorkflowModal = true;
        break;

      case 'quick-todo':
        // Open Quick-To-Do modal
        this.showQuickTodoModal = true;
        break;

      default:
        console.log('Unknown context menu action:', action);
        this.showToast(`Unbekannte Aktion: ${action}`, 'warning');
    }
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

  private navigateTo(route: Route): void {
    routerService.navigate(route);
  }

  private getPageTitle(): string {
    const titles: Record<Route, string> = {
      dashboard: 'Dashboard',
      chat: 'Chat',
      workflows: 'Workflows',
      settings: 'Settings',
      'not-found': 'Page Not Found',
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
      return;
    }

    // MPRO-006: First switch project context in backend, THEN update UI
    // This ensures WebSocket has the correct projectId before Dashboard loads specs
    const result = await projectStateService.switchProject(project);
    if (!result.success) {
      this.showToast(`Failed to switch project: ${result.error}`, 'error');
      return; // Don't switch UI if backend failed
    }

    // Now update UI after backend is ready
    this.activeProjectId = projectId;
    this.updateContextProvider();

    // Load git status for new project
    this._loadGitStatus();

    // Update active terminal session to match new project
    // (projectTerminalSessions will now filter by new project path)
    const newProjectSessions = this.terminalSessions.filter(s => s.projectPath === project.path);
    if (newProjectSessions.length > 0) {
      // Check if current active session is in the new project
      const currentInNewProject = newProjectSessions.some(s => s.id === this.activeTerminalSessionId);
      if (!currentInNewProject) {
        this.activeTerminalSessionId = newProjectSessions[0].id;
      }
    } else {
      // No sessions for this project, clear active
      this.activeTerminalSessionId = null;
    }

    // Persist state
    this.persistProjectState();
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
    }

    this.updateContextProvider();
    this.persistProjectState();
  }

  private handleAddProject(): void {
    this.showAddProjectModal = true;
  }

  private handleAddProjectModalClose(): void {
    this.showAddProjectModal = false;
  }

  private handleWorkflowModalClose(): void {
    this.showWorkflowModal = false;
    this.workflowModalCommand = null;
    this.workflowModalMode = 'direct';
  }

  private handleQuickTodoModalClose(): void {
    this.showQuickTodoModal = false;
  }

  private handleQuickTodoSaved(e: CustomEvent<{ itemId: string }>): void {
    const { itemId } = e.detail;
    this.showQuickTodoModal = false;
    this.showToast(`Quick-To-Do erstellt (${itemId})`, 'success');
  }

  // --- Cloud Terminal Event Handlers ---

  private _handleTerminalToggle(): void {
    this.isTerminalSidebarOpen = !this.isTerminalSidebarOpen;
  }

  private _handleTerminalClose(): void {
    this.isTerminalSidebarOpen = false;
  }

  private _handleNewTerminalSession(): void {
    // Get current project path from active project
    const activeProject = this.openProjects.find(p => p.id === this.activeProjectId);
    const projectPath = activeProject?.path || '';
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
    };
    this.terminalSessions = [...this.terminalSessions, newSession];
    this.activeTerminalSessionId = newSession.id;
  }

  /**
   * Generate a type-specific session name.
   * Shell terminals: "Terminal 1", "Terminal 2", ...
   * Claude Code sessions: "Claude Session 1", "Claude Session 2", ...
   */
  private _generateSessionName(projectPath: string, terminalType: 'shell' | 'claude-code'): string {
    const projectSessions = this.terminalSessions.filter(s => s.projectPath === projectPath);
    if (terminalType === 'shell') {
      const shellCount = projectSessions.filter(s => s.terminalType === 'shell').length;
      return `Terminal ${shellCount + 1}`;
    }
    const claudeCount = projectSessions.filter(s => s.terminalType !== 'shell').length;
    return `Claude Session ${claudeCount + 1}`;
  }

  /**
   * Get terminal sessions filtered by current project
   */
  private get projectTerminalSessions(): TerminalSession[] {
    const activeProject = this.openProjects.find(p => p.id === this.activeProjectId);
    const projectPath = activeProject?.path || '';
    return this.terminalSessions.filter(s => s.projectPath === projectPath);
  }

  private _handleTerminalSessionSelect(e: CustomEvent<{ sessionId: string }>): void {
    this.activeTerminalSessionId = e.detail.sessionId;
  }

  private _handleTerminalSessionClose(e: CustomEvent<{ sessionId: string }>): void {
    const sessionId = e.detail.sessionId;
    this.terminalSessions = this.terminalSessions.filter(s => s.id !== sessionId);

    if (this.activeTerminalSessionId === sessionId) {
      this.activeTerminalSessionId = this.terminalSessions.length > 0
        ? this.terminalSessions[this.terminalSessions.length - 1].id
        : null;
    }
  }

  private _handleTerminalSessionConnected(e: CustomEvent<{ sessionId: string; terminalSessionId: string; terminalType?: 'shell' | 'claude-code' }>): void {
    const { sessionId, terminalSessionId, terminalType } = e.detail;
    const resolvedType = terminalType || 'claude-code';

    // Update session with backend ID, terminalType, and type-specific name
    this.terminalSessions = this.terminalSessions.map(s => {
      if (s.id !== sessionId) return s;
      return {
        ...s,
        terminalSessionId,
        terminalType: resolvedType,
        name: this._generateSessionName(s.projectPath, resolvedType),
      };
    });
  }

  private handleWorkflowStart(e: CustomEvent<{ commandId: string; argument?: string; model?: string }>): void {
    const { commandId, argument, model } = e.detail;

    // Store the workflow request in sessionStorage for the workflow view to pick up
    const pendingWorkflow = {
      commandId,
      argument: argument?.trim() || undefined,
      model: model || undefined
    };
    sessionStorage.setItem('pendingWorkflow', JSON.stringify(pendingWorkflow));

    // Navigate to workflows page where it will auto-start
    routerService.navigate('workflows');
  }

  private async handleProjectSelected(
    e: CustomEvent<ProjectSelectedDetail>
  ): Promise<void> {
    const { path, name } = e.detail;

    // Generate unique ID for the project
    const id = `project-${Date.now()}`;

    // Add to open projects
    const newProject: Project = { id, name, path };
    this.openProjects = [...this.openProjects, newProject];
    this.activeProjectId = id;

    // Update recently opened
    recentlyOpenedService.addRecentlyOpened(path, name);

    // Close modal
    this.showAddProjectModal = false;

    // Initialize project context with backend (also sends WebSocket message)
    const result = await projectStateService.switchProject(newProject);
    if (!result.success) {
      this.showToast(`Failed to initialize project: ${result.error}`, 'warning');
    }

    // Update context provider and persist state
    this.updateContextProvider();
    this.persistProjectState();

    // Load git status for newly opened project
    this._loadGitStatus();
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

    this.openProjects = [...this.openProjects, project];
    this.activeProjectId = project.id;

    projectStateService.switchProject(project).then((result) => {
      if (!result.success) {
        this.showToast(`Failed to initialize project: ${result.error}`, 'warning');
      }
    });

    this.updateContextProvider();
    this.persistProjectState();
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

  /**
   * Persist current project state to sessionStorage.
   */
  private persistProjectState(): void {
    projectStateService.persistState(this.openProjects, this.activeProjectId);
  }

  /**
   * Wait for WebSocket connection before restoring project state.
   * This prevents timeout errors when trying to send project.switch before connection.
   */
  private restoreProjectStateWhenConnected(): void {
    if (gateway.getConnectionStatus()) {
      // Already connected, restore immediately
      this.restoreProjectState();
    } else {
      // Wait for connection, then restore
      const onConnected = () => {
        gateway.off('gateway.connected', onConnected);
        this.restoreProjectState();
      };
      gateway.on('gateway.connected', onConnected);
    }
  }

  /**
   * Restore project state from sessionStorage after browser refresh.
   */
  private async restoreProjectState(): Promise<void> {
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
    this.persistProjectState();

    // Restore terminal sessions for all open projects
    this.restoreTerminalSessions();

    // Load git status for active project
    this._loadGitStatus();
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
    const backendSessions = msg.sessions as Array<{
      sessionId: string;
      projectPath: string;
      status: string;
      terminalType?: 'shell' | 'claude-code';
      modelConfig?: { model: string; provider?: string };
      createdAt: string;
    }> | undefined;

    if (!backendSessions || backendSessions.length === 0) {
      return;
    }

    // Convert backend sessions to frontend TerminalSession format
    let shellIndex = 0;
    let claudeIndex = 0;
    const newSessions: TerminalSession[] = backendSessions
      .filter(s => s.status !== 'closed')
      .map((backendSession) => {
        // Check if we already have this session
        const existing = this.terminalSessions.find(
          ts => ts.terminalSessionId === backendSession.sessionId
        );
        if (existing) {
          return existing;
        }

        // Resolve terminal type (backward compat: default to 'claude-code')
        const type = backendSession.terminalType || 'claude-code';
        const name = type === 'shell'
          ? `Terminal ${++shellIndex}`
          : `Claude Session ${++claudeIndex}`;

        // Create new frontend session entry
        return {
          id: `restored-${backendSession.sessionId}`,
          name,
          status: backendSession.status === 'active' ? 'active' : 'disconnected',
          createdAt: new Date(backendSession.createdAt),
          projectPath: backendSession.projectPath,
          terminalSessionId: backendSession.sessionId,
          terminalType: type,
        } as TerminalSession;
      });

    // Merge with existing sessions (avoid duplicates)
    const existingIds = new Set(this.terminalSessions.map(s => s.terminalSessionId));
    const sessionsToAdd = newSessions.filter(
      s => s.terminalSessionId && !existingIds.has(s.terminalSessionId)
    );

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

  // --- Git Event Handlers ---

  private _handleRefreshGit(): void {
    this.gitLoading = true;
    gateway.requestGitStatus();
  }

  private _handlePullGit(e?: CustomEvent<{ rebase?: boolean }>): void {
    const rebase = e?.detail?.rebase === true;
    this.isGitOperationRunning = true;
    gateway.requestGitPull(rebase);
  }

  private _handlePushGit(): void {
    this.isGitOperationRunning = true;
    gateway.requestGitPush();
  }

  private _handleCheckoutBranch(e: CustomEvent<{ branch: string }>): void {
    const { branch } = e.detail;
    this.gitLoading = true;
    gateway.sendGitCheckout(branch);
  }

  private _handleOpenCommitDialog(e?: CustomEvent<{ autoPush?: boolean }>): void {
    this.commitError = '';
    this.pendingAutoPush = e?.detail?.autoPush === true;
    this.commitAndPushPhase = this.pendingAutoPush ? 'committing' : 'idle';
    this.showCommitDialog = true;
  }

  private _handleCommitDialogClose(): void {
    if (this.commitAndPushPhase === 'pushing') return;
    this.showCommitDialog = false;
    this.commitError = '';
    this.pendingAutoPush = false;
    this.commitAndPushPhase = 'idle';
  }

  private _handleGitCommit(e: CustomEvent<{ files: string[]; message: string }>): void {
    const { files, message } = e.detail;
    this.committing = true;
    this.commitError = '';
    if (this.pendingAutoPush) {
      this.commitAndPushPhase = 'committing';
    }
    gateway.sendGitCommit(files, message);
  }

  private _handleRevertFile(e: CustomEvent<{ file: string }>): void {
    gateway.sendGitRevert([e.detail.file]);
  }

  private _handleRevertAll(): void {
    const revertableFiles = (this.gitStatus?.files ?? [])
      .filter(f => f.status !== '?')
      .map(f => f.path);
    if (revertableFiles.length > 0) {
      gateway.sendGitRevert(revertableFiles);
    }
  }

  private _handleDeleteUntracked(e: CustomEvent<{ file: string }>): void {
    gateway.sendGitDeleteUntracked(e.detail.file);
  }

  // --- GSQ-007: Queue event handlers (from queue-section and specs-section) ---

  private _handleQueueAdd(e: CustomEvent): void {
    const detail = e.detail as {
      specId: string;
      specName: string;
      projectPath?: string;
      projectName?: string;
      position?: number;
      gitStrategy?: { strategy: string };
      itemType?: 'spec' | 'backlog';
    };

    // For backlogs, check specId + projectPath combo; for specs, check specId
    const projectPath = detail.projectPath || this.openProjects.find(p => p.id === this.activeProjectId)?.path || '';
    const existsInQueue = detail.itemType === 'backlog'
      ? this.globalQueue.some(item => item.specId === 'backlog' && item.projectPath === projectPath)
      : this.globalQueue.some(item => item.specId === detail.specId);
    if (existsInQueue) {
      this.showToast(detail.itemType === 'backlog' ? 'Backlog ist bereits in der Queue' : 'Spec ist bereits in der Queue', 'warning');
      return;
    }

    const activeProject = this.openProjects.find(p => p.id === this.activeProjectId);
    gateway.sendQueueAdd(
      detail.specId,
      detail.specName,
      detail.projectPath || activeProject?.path || '',
      detail.projectName || activeProject?.name || '',
      detail.gitStrategy?.strategy as 'branch' | 'worktree' | 'current-branch' | undefined,
      detail.position,
      detail.itemType
    );
  }

  private _handleQueueRemove(e: CustomEvent<{ itemId: string; specId: string }>): void {
    gateway.sendQueueRemove(e.detail.itemId);
  }

  private _handleQueueReorder(e: CustomEvent<{ itemId: string; fromIndex: number; toIndex: number }>): void {
    gateway.sendQueueReorder(e.detail.itemId, e.detail.toIndex);
  }

  private _handleQueueStart(): void {
    gateway.sendQueueStart();
  }

  private _handleQueueStop(): void {
    gateway.sendQueueStop();
  }

  private _handleShowToast(e: CustomEvent<{ message: string; type: 'success' | 'error' | 'info' | 'warning' }>): void {
    this.showToast(e.detail.message, e.detail.type);
  }

  // --- GSQ-005: Bottom Panel Event Handlers ---

  private _handleGlobalKeydown(e: KeyboardEvent): void {
    // Cmd/Ctrl+Shift+Q toggles bottom panel
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Q') {
      e.preventDefault();
      this.isBottomPanelOpen = !this.isBottomPanelOpen;
    }
  }

  private _handleBottomPanelToggle(): void {
    this.isBottomPanelOpen = !this.isBottomPanelOpen;
  }

  private _handleBottomPanelClose(): void {
    this.isBottomPanelOpen = false;
  }

  private _handleBottomPanelTabChange(e: CustomEvent<{ tab: string }>): void {
    this.bottomPanelActiveTab = e.detail.tab as 'queue-specs' | 'log';
  }

  private _handleBottomPanelResize(e: CustomEvent<{ height: number }>): void {
    this._bottomPanelHeight = e.detail.height;
    this.requestUpdate();
  }

  private _bottomPanelHeight = 350;

  private _getBottomPanelHeight(): number {
    return this._bottomPanelHeight;
  }

  private _mapGitErrorMessage(code: string | undefined, rawMessage: string, operation: string | undefined): string {
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
      default:
        return `Git ${operation || 'Fehler'}: ${rawMessage}`;
    }
  }

  /**
   * Load git status for the current active project.
   * Called on project switch and initial load.
   */
  private _loadGitStatus(): void {
    if (!this.activeProjectId) {
      this.gitStatus = null;
      this.gitBranches = [];
      this.gitPrInfo = null;
      return;
    }
    this.gitLoading = true;
    gateway.requestGitStatus();
    gateway.requestGitBranches();
    gateway.requestGitPrInfo();
  }

  // --- Rendering ---

  private renderView() {
    switch (this.currentRoute) {
      case 'dashboard':
        return html`<aos-dashboard-view></aos-dashboard-view>`;
      case 'chat':
        return html`<aos-chat-view></aos-chat-view>`;
      case 'workflows':
        return html`<aos-workflow-view></aos-workflow-view>`;
      case 'settings':
        return html`<aos-settings-view></aos-settings-view>`;
      default:
        return html`<aos-not-found-view></aos-not-found-view>`;
    }
  }

  override render() {
    return html`
      <aside class="sidebar">
        <div class="logo">
          <h1>Agent <span>OS</span></h1>
        </div>
        <nav>
          <ul class="nav-list">
            ${this.navItems.map(
              (item) => html`
                <li class="nav-item">
                  <a
                    class="nav-link ${this.currentRoute === item.route
                      ? 'active'
                      : ''}"
                    @click=${() => this.navigateTo(item.route)}
                  >
                    <span class="nav-icon">${item.icon}</span>
                    ${item.label}
                  </a>
                </li>
              `
            )}
          </ul>
          <div class="nav-divider"></div>
          <ul class="nav-list">
            <li class="nav-item">
              <a
                class="nav-link ${this.isBottomPanelOpen ? 'active' : ''}"
                @click=${this._handleBottomPanelToggle}
              >
                <span class="nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="vertical-align: middle;">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                </span>
                Queue${this.globalQueue.length > 0 ? html` <span class="queue-count">(${this.globalQueue.length})</span>` : ''}
                ${this.isQueueRunning
                  ? html`<span class="queue-badge" aria-label="Queue läuft"></span>`
                  : ''}
              </a>
            </li>
          </ul>
        </nav>
      </aside>
      <main class="main-content" style="${this.isBottomPanelOpen ? `padding-bottom: ${this._getBottomPanelHeight()}px` : ''}">
        <header class="header">
          <h2 class="header-title">${this.getPageTitle()}</h2>
          <div class="header-actions">
            ${this.isReconnecting
              ? html`<span class="reconnecting-indicator">
                  <aos-loading-spinner size="small"></aos-loading-spinner>
                  <span>Verbinde...</span>
                </span>`
              : ''}
            <button
              class="terminal-btn ${this.terminalSessions.length > 0 ? 'has-sessions' : ''}"
              @click=${this._handleTerminalToggle}
              title="Cloud Terminal"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
              ${this.projectTerminalSessions.length > 0
                ? html`<span class="terminal-badge">${this.projectTerminalSessions.length}</span>`
                : ''}
            </button>
            <aos-model-selector></aos-model-selector>
          </div>
        </header>
        <aos-project-tabs
          .projects=${this.openProjects}
          .activeProjectId=${this.activeProjectId}
          @tab-select=${this.handleProjectTabSelect}
          @tab-close=${this.handleProjectTabClose}
          @add-project=${this.handleAddProject}
        ></aos-project-tabs>
        <aos-git-status-bar
          .gitStatus=${this.gitStatus}
          .loading=${this.gitLoading}
          .hasProject=${this.activeProjectId !== null}
          .branches=${this.gitBranches}
          .isOperationRunning=${this.isGitOperationRunning}
          .prInfo=${this.gitPrInfo}
          @refresh-git=${this._handleRefreshGit}
          @pull-git=${this._handlePullGit}
          @push-git=${this._handlePushGit}
          @open-commit-dialog=${this._handleOpenCommitDialog}
          @checkout-branch=${this._handleCheckoutBranch}
        ></aos-git-status-bar>
        <div class="view-container">${this.renderView()}</div>
      </main>
      <aos-global-queue-panel
        .isOpen=${this.isBottomPanelOpen}
        .activeTab=${this.bottomPanelActiveTab}
        .queue=${this.globalQueue}
        .isQueueRunning=${this.isQueueRunning}
        @panel-close=${this._handleBottomPanelClose}
        @tab-change=${this._handleBottomPanelTabChange}
        @panel-resize=${this._handleBottomPanelResize}
        @queue-add=${this._handleQueueAdd}
        @queue-remove=${this._handleQueueRemove}
        @queue-reorder=${this._handleQueueReorder}
        @queue-start=${this._handleQueueStart}
        @queue-stop=${this._handleQueueStop}
        @show-toast=${this._handleShowToast}
      ></aos-global-queue-panel>
      <aos-toast-notification></aos-toast-notification>
      <aos-project-add-modal
        .open=${this.showAddProjectModal}
        .openProjectPaths=${this.openProjects.map((p) => p.path)}
        @project-selected=${this.handleProjectSelected}
        @modal-close=${this.handleAddProjectModalClose}
      ></aos-project-add-modal>
      <aos-context-menu
        @menu-item-select=${this.handleMenuItemSelect}
      ></aos-context-menu>
      <aos-create-spec-modal
        .open=${this.showWorkflowModal}
        .command=${this.workflowModalCommand}
        .mode=${this.workflowModalMode}
        .providers=${this.providers}
        @modal-close=${this.handleWorkflowModalClose}
        @workflow-start-interactive=${this.handleWorkflowStart}
      ></aos-create-spec-modal>
      <aos-quick-todo-modal
        .open=${this.showQuickTodoModal}
        .projectPath=${this.openProjects.find(p => p.id === this.activeProjectId)?.path ?? null}
        @modal-close=${this.handleQuickTodoModalClose}
        @quick-todo-saved=${this.handleQuickTodoSaved}
      ></aos-quick-todo-modal>
      <aos-cloud-terminal-sidebar
        .isOpen=${this.isTerminalSidebarOpen}
        .sessions=${this.projectTerminalSessions}
        .activeSessionId=${this.activeTerminalSessionId}
        @sidebar-close=${this._handleTerminalClose}
        @new-session=${this._handleNewTerminalSession}
        @session-select=${this._handleTerminalSessionSelect}
        @session-close=${this._handleTerminalSessionClose}
        @session-connected=${this._handleTerminalSessionConnected}
      ></aos-cloud-terminal-sidebar>
      <aos-git-commit-dialog
        .open=${this.showCommitDialog}
        .files=${this.gitStatus?.files ?? []}
        .error=${this.commitError}
        .committing=${this.committing}
        .autoPush=${this.pendingAutoPush}
        .progressPhase=${this.commitAndPushPhase}
        @git-commit=${this._handleGitCommit}
        @revert-file=${this._handleRevertFile}
        @revert-all=${this._handleRevertAll}
        @delete-untracked=${this._handleDeleteUntracked}
        @dialog-close=${this._handleCommitDialogClose}
      ></aos-git-commit-dialog>
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
