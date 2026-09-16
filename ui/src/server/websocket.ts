import { WebSocketServer, WebSocket, RawData } from 'ws';
import { Server } from 'http';
import { randomUUID } from 'crypto';
import { resolveCommandDir } from './utils/project-dirs.js';
import { ProjectManager } from './projects.js';
import { WorkflowExecutor } from './workflow-executor.js';
import { webSocketManager } from './websocket-manager.service.js';
import { gitHandler } from './handlers/git.handler.js';
import { fileHandler } from './handlers/file.handler.js';
import { documentPreviewHandler } from './handlers/document-preview.handler.js';
import { PreviewWatcher } from './services/preview-watcher.service.js';
import {
  getAllProviders,
  getReviewerProviders,
  providersForModelList,
  getDefaultSelection,
  loadModelConfig,
  updateProvider,
  addProvider,
  removeProvider,
  addModel,
  removeModel,
  updateModel,
  setDefaults,
  setStepDefault,
  getStepDefault,
  getStepDefaults,
  type StepKey,
  type ModelConfig,
  type Model,
  type ModelProvider
} from './model-config.js';
import { loadGeneralConfig, updateGeneralConfig, getReviewPrompt, getCloudSessionWorktreeEnabled } from './general-config.js';
import { resolveMainWorktreePath } from './utils/worktree-detect.js';
import { loadPromptTemplates, savePromptTemplate, deletePromptTemplate } from './prompt-templates.js';
import { extractPromptFromImage } from './services/prompt-template-extractor.js';
import { loadGithubConfigStatus, updateGithubPat, clearGithubPat } from './github-config.js';
import { CloudTerminalManager } from './services/cloud-terminal-manager.js';
import { PlanReviewOrchestrator } from './services/plan-review-orchestrator.js';
import type { TabReviewConfig } from './services/plan-review-orchestrator.js';
import { setupService, type StepOutput, type StepComplete } from './services/setup.service.js';
import { ProjectConcurrencyGate } from './services/project-concurrency-gate.js';
import { WorkspaceStateStore } from './services/workspace-state.js';
import { WorkspaceHandler } from './services/workspace-handler.js';
import { getWorkspaceStatePath, getVorhabenStatePath } from './utils/runtime-paths.js';
import { VorhabenStateStore } from './services/vorhaben-state.js';
import { VorhabenService } from './services/vorhaben-service.js';
import { VorhabenHandler } from './services/vorhaben-handler.js';
import { GespraechService, defaultConfigDirs } from './services/gespraech-service.js';
import { GespraechHandler } from './services/gespraech-handler.js';
import { ProjectDocsService } from './services/project-docs.service.js';
import { existsSync } from 'fs';
import type {
  CloudTerminalSessionId,
  CloudTerminalAgentEvent,
  CloudTerminalAgentEventDetail,
  CloudTerminalAgentStatus,
  CloudTerminalType,
  CloudTerminalModelConfig,
  CloudTerminalWorkflowMetadata,
  CloudTerminalWorktreeEntry
} from '../shared/types/cloud-terminal.protocol.js';
import { CLOUD_TERMINAL_ERROR_CODES } from '../shared/types/cloud-terminal.protocol.js';
import { listRepoWorktrees, listWorktreeCreationTimes, pathKey } from './utils/git-worktree-list.js';
import { parseSessionTarget, SessionTargetError, type ParsedTarget } from './utils/session-target.js';
import { resolveSessionBase } from './utils/cloud-session-worktree.js';
import { isWorktreeClean } from './utils/worktree-story.js';

interface WebSocketClient extends WebSocket {
  clientId: string;
  isAlive: boolean;
  projectId?: string; // MPRO-005: Track which project this client is associated with
}

interface WebSocketMessage {
  type: string;
  clientId?: string;
  projectId?: string; // MPRO-005: Project context for multi-project support
  timestamp?: string;
  name?: string;
  [key: string]: unknown;
}

export class WebSocketHandler {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private projectManager: ProjectManager;
  private workflowExecutor: WorkflowExecutor;
  private fileHandler;
  private cloudTerminalManager: CloudTerminalManager;
  private planReviewOrchestrator: PlanReviewOrchestrator;
  private previewWatcher: PreviewWatcher;
  private unsubscribeConcurrency: (() => void) | null = null;
  /** Shared workspace (open projects, recents, tab names) — one per backend. */
  private workspaceStore: WorkspaceStateStore;
  private workspaceHandler: WorkspaceHandler;
  private vorhabenStore: VorhabenStateStore;
  private vorhabenService: VorhabenService;
  private vorhabenHandler: VorhabenHandler;
  // INT-2026-007: the Gespräch of a session (transcript + hooks), subscribed per client.
  private gespraechService: GespraechService;
  private gespraechHandler: GespraechHandler;
  /** Sessions the user closed via cloud-terminal:close — their `closed` event carries closedBy:'user'. */
  private userClosedSessionIds = new Set<string>();
  /** Sessions created through a WS create handler (they broadcast their own `created`). */
  private wsCreatedSessionIds = new Set<string>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.projectManager = new ProjectManager();
    this.workflowExecutor = new WorkflowExecutor();
    this.fileHandler = fileHandler;
    this.cloudTerminalManager = new CloudTerminalManager(this.workflowExecutor.getTerminalManager());
    this.planReviewOrchestrator = new PlanReviewOrchestrator(this.cloudTerminalManager);
    this.previewWatcher = new PreviewWatcher();
    this.previewWatcher.init();
    this.workspaceStore = new WorkspaceStateStore(getWorkspaceStatePath(), { pathKey, pathExists: (p: string): boolean => existsSync(p) });
    this.workspaceHandler = new WorkspaceHandler(this.workspaceStore, (m) => this.broadcast(m as WebSocketMessage));
    // INT-2026-004: Vorhaben view — reads intent/ of the open projects, broadcasts vorhaben:state.
    this.vorhabenStore = new VorhabenStateStore(getVorhabenStatePath());
    this.vorhabenService = new VorhabenService({
      workspace: this.workspaceStore,
      store: this.vorhabenStore,
      broadcast: (m) => this.broadcast(m as WebSocketMessage),
      // Stage 2: review channel + next step run through the terminal manager.
      sessions: this.cloudTerminalManager,
      setSessionName: (sessionId, name) => this.workspaceHandler.setSessionName(sessionId, name),
      // INT-2026-010 (FA-22): „Freigeben" without a session starts the step with the settings' step default.
      defaultModel: (step) => getStepDefault(step),
    });
    this.vorhabenHandler = new VorhabenHandler(this.vorhabenService, new ProjectDocsService(), this.vorhabenStore, (m) => this.broadcast(m as WebSocketMessage));
    this.gespraechService = new GespraechService({
      manager: this.cloudTerminalManager,
      protocol: this.vorhabenStore,
      configDirs: () => defaultConfigDirs(getAllProviders().map((p) => p.id)),
    });
    this.gespraechHandler = new GespraechHandler({
      gespraech: this.gespraechService,
      vorhaben: this.vorhabenService,
      sendTo: (clientId, m) => {
        const c = this.clients.get(clientId);
        if (!c || c.readyState !== WebSocket.OPEN) return false;
        c.send(JSON.stringify(m));
        return true;
      },
    });
    this.bootWorkspace();
    this.setupConnectionHandler();
    this.startHeartbeat();
    this.setupCloudTerminalListeners();
    this.setupPlanReviewListeners();
    this.setupSetupListeners();
    this.setupConcurrencyBroadcast();
  }

  /**
   * Loads the shared workspace once boot-restore has settled. First boot
   * without a file: projects with live sessions count as open (a phone
   * connecting before the Mac still sees the agents). Names of sessions that
   * did not survive the restart are pruned.
   */
  private bootWorkspace(): void {
    void this.cloudTerminalManager.whenReady().then(async () => {
      const { existed } = await this.workspaceStore.load();
      const live = this.cloudTerminalManager.getAllSessions();
      if (!existed) {
        const seeded = this.workspaceStore.seedFromSessions(live);
        if (seeded > 0) console.log(`[WebSocket] workspace seeded with ${seeded} project(s) from live sessions`);
      }
      const pruned = this.workspaceStore.pruneSessionNames(new Set(live.map((s) => s.sessionId)));
      if (pruned > 0) console.log(`[WebSocket] workspace: pruned ${pruned} stale tab name(s)`);
      const vh = await this.vorhabenStore.load();
      if (!vh.healthy) console.warn('[WebSocket] vorhaben state was unreadable — started empty (backup kept)');
      const t0 = Date.now();
      await this.vorhabenService.start();
      console.log(`[WebSocket] vorhaben: first scan in ${Date.now() - t0} ms (${this.vorhabenService.getState().rows.length} rows)`);
    }).catch((err) => {
      console.error('[WebSocket] workspace boot failed:', err);
    });
  }

  private setupConcurrencyBroadcast(): void {
    this.unsubscribeConcurrency = ProjectConcurrencyGate.onStateChange((state) => {
      this.broadcast({
        type: 'claude.concurrency.state',
        state,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * MPRO-005: Get the project path for a specific client connection.
   * Uses client.projectId which is set when project.switch is called.
   * Falls back to global projectManager for backward compatibility.
   */
  private getClientProjectPath(client: WebSocketClient): string | null {
    // Prefer client-specific project (multi-project support)
    if (client.projectId) {
      return client.projectId;
    }
    // Fallback to global project for backward compatibility
    const globalProject = this.projectManager.getCurrentProject();
    return globalProject?.path || null;
  }

  private setupConnectionHandler(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const client = ws as WebSocketClient;
      client.clientId = randomUUID();
      client.isAlive = true;
      client.projectId = undefined; // MPRO-005: Will be set when project.select or project.switch is called

      this.clients.set(client.clientId, client);

      // Send connection confirmation
      const connectedMessage: WebSocketMessage = {
        type: 'connected',
        clientId: client.clientId,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(connectedMessage));

      // Initial sync: send current Claude concurrency state to this client
      client.send(JSON.stringify({
        type: 'claude.concurrency.state',
        state: ProjectConcurrencyGate.getCurrentState(),
        timestamp: new Date().toISOString(),
      }));

      console.log(`Client connected: ${client.clientId}`);

      // Handle pong responses for heartbeat
      client.on('pong', () => {
        client.isAlive = true;
      });

      // Handle incoming messages
      client.on('message', (data: RawData) => {
        this.handleMessage(client, data);
      });

      // Handle client disconnect
      client.on('close', () => {
        console.log(`Client disconnected: ${client.clientId}`);
        this.gespraechHandler.onClientClosed(client.clientId);
        this.clients.delete(client.clientId);
      });

      // Handle errors
      client.on('error', (error: Error) => {
        console.error(`WebSocket error for client ${client.clientId}:`, error.message);
      });
    });
  }

  /**
   * Runs a cloud-terminal message handler once the boot-restore of persisted
   * sessions has settled (see CloudTerminalManager.whenReady). Resolved
   * promise → next microtask, so the per-keystroke overhead is negligible and
   * relative message order is preserved.
   */
  private gateOnCloudTerminalRestore(fn: () => void): void {
    void this.cloudTerminalManager.whenReady().then(fn).catch((err) => {
      console.error('[WebSocketHandler] cloud-terminal handler failed:', err);
    });
  }

  private handleMessage(client: WebSocketClient, data: RawData): void {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage;
      console.log(`Message from ${client.clientId}:`, message.type);

      switch (message.type) {
        case 'ping':
          // App-level liveness probe (mobile Safari zombie-connection detection).
          // Protocol-level ping/pong is not accessible from the browser, so the
          // client sends this after tab resume to verify the socket is alive.
          client.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;
        case 'project.list':
          this.handleProjectList(client);
          break;
        case 'project.current':
          this.handleProjectCurrent(client);
          break;
        case 'project.select':
          this.handleProjectSelect(client, message);
          break;
        case 'project.switch':
          // MPRO-005: Handle project context switch via WebSocketManager
          this.handleProjectSwitch(client, message);
          break;
        case 'model.list':
          this.handleModelList(client);
          break;
        case 'model.providers.list':
          this.handleModelProvidersList(client);
          break;
        case 'workflow.list':
          this.handleWorkflowList(client);
          break;
        case 'workflow.start':
          this.handleWorkflowStart(client, message);
          break;
        case 'workflow.cancel':
          this.handleWorkflowCancel(client, message);
          break;
        case 'workflow.running':
          this.handleWorkflowRunning(client);
          break;
        case 'workflow.retry':
          this.handleWorkflowRetry(client, message);
          break;
        case 'workflow.interactive.start':
          this.handleWorkflowInteractiveStart(client, message);
          break;
        case 'workflow.interactive.cancel':
          this.handleWorkflowInteractiveCancel(client, message);
          break;
        case 'terminal.input':
          this.handleTerminalInput(client, message);
          break;
        case 'terminal.resize':
          this.handleTerminalResize(client, message);
          break;
        case 'terminal.buffer.request':
          this.handleTerminalBufferRequest(client, message);
          break;
        case 'settings.config.get':
          this.handleSettingsConfigGet(client);
          break;
        case 'settings.provider.update':
          this.handleSettingsProviderUpdate(client, message);
          break;
        case 'settings.provider.add':
          this.handleSettingsProviderAdd(client, message);
          break;
        case 'settings.provider.remove':
          this.handleSettingsProviderRemove(client, message);
          break;
        case 'settings.model.add':
          this.handleSettingsModelAdd(client, message);
          break;
        case 'settings.model.remove':
          this.handleSettingsModelRemove(client, message);
          break;
        case 'settings.model.update':
          this.handleSettingsModelUpdate(client, message);
          break;
        case 'settings.defaults.update':
          this.handleSettingsDefaultsUpdate(client, message);
          break;
        case 'settings.step-defaults.update':
          this.handleSettingsStepDefaultsUpdate(client, message);
          break;
        case 'settings.general.get':
          this.handleSettingsGeneralGet(client);
          break;
        case 'workspace:get':
        case 'workspace:open-project':
        case 'workspace:close-project':
        case 'workspace:remove-recent':
        case 'workspace:set-session-name':
        case 'workspace:import':
          // Gated like cloud-terminal handlers: the workspace is seeded from
          // restored sessions, so it must not answer before restore settled.
          this.gateOnCloudTerminalRestore(() => {
            this.workspaceHandler.handle(message as Record<string, unknown>, (m) => client.send(JSON.stringify(m)));
            if (message.type === 'workspace:open-project' || message.type === 'workspace:close-project' || message.type === 'workspace:import') {
              this.vorhabenService.scheduleRescan();
            }
          });
          break;
        case 'vorhaben:get':
        case 'vorhaben:doc.read':
        case 'vorhaben:design.read':
        case 'vorhaben:draft.set':
        case 'vorhaben:draft.delete':
        case 'vorhaben:send':
        case 'vorhaben:start-step':
        case 'vorhaben:ansicht.set':
        case 'project-docs:list':
        case 'project-docs:read':
        case 'project-docs:write':
        case 'project-docs:draft.set':
        case 'project-docs:draft.clear':
          this.gateOnCloudTerminalRestore(() => {
            this.vorhabenHandler.handle(message as Record<string, unknown>, (m) => client.send(JSON.stringify(m)));
          });
          break;
        case 'gespraech:subscribe':
        case 'gespraech:unsubscribe':
        case 'gespraech:send-text':
        case 'gespraech:discard':
          // INT-2026-007: gated like the Vorhaben handlers (sessions come from the restore).
          this.gateOnCloudTerminalRestore(() => {
            this.gespraechHandler.handle(client.clientId, message as Record<string, unknown>, (m) => client.send(JSON.stringify(m)));
          });
          break;
        case 'settings.general.update':
          this.handleSettingsGeneralUpdate(client, message);
          break;
        case 'prompt-templates:list.get':
          this.handlePromptTemplatesListGet(client);
          break;
        case 'prompt-templates:save':
          this.handlePromptTemplatesSave(client, message);
          break;
        case 'prompt-templates:delete':
          this.handlePromptTemplatesDelete(client, message);
          break;
        case 'prompt-templates:extract-from-image':
          void this.handlePromptTemplatesExtractFromImage(client, message);
          break;
        case 'settings.github.get':
          this.handleSettingsGithubGet(client);
          break;
        case 'settings.github.update':
          this.handleSettingsGithubUpdate(client, message);
          break;
        case 'settings.github.clear':
          this.handleSettingsGithubClear(client);
          break;
        // Git Messages (GIT-001)
        case 'git:status':
          this.handleGitStatus(client);
          break;
        case 'git:branches':
          this.handleGitBranches(client);
          break;
        case 'git:commit':
          this.handleGitCommit(client, message);
          break;
        case 'git:pull':
          this.handleGitPull(client, message);
          break;
        case 'git:push':
          this.handleGitPush(client);
          break;
        case 'git:checkout':
          this.handleGitCheckout(client, message);
          break;
        case 'git:revert':
          this.handleGitRevert(client, message);
          break;
        case 'git:delete-untracked':
          this.handleGitDeleteUntracked(client, message);
          break;
        case 'git:pr-info':
          this.handleGitPrInfo(client);
          break;
        case 'git:generate-commit-message':
          this.handleGitGenerateCommitMessage(client, message);
          break;
        case 'git:diff':
          this.handleGitDiff(client, message);
          break;
        // Attachment Messages (SCA-001)
        // Comment Messages (BLC-001)
        // File Editor Messages (FE-001)
        case 'files:list':
          this.handleFileList(client, message);
          break;
        case 'files:read':
          this.handleFileRead(client, message);
          break;
        case 'files:write':
          this.handleFileWrite(client, message);
          break;
        case 'files:create':
          this.handleFileCreate(client, message);
          break;
        case 'files:mkdir':
          this.handleFileMkdir(client, message);
          break;
        case 'files:rename':
          this.handleFileRename(client, message);
          break;
        case 'files:delete':
          this.handleFileDelete(client, message);
          break;
        // Setup Messages (SETUP-003)
        case 'setup:check-status':
          this.handleSetupCheckStatus(client);
          break;
        case 'setup:run-step':
          this.handleSetupRunStep(client, message);
          break;
        case 'setup:start-devteam':
          void this.handleSetupStartDevteam(client, message);
          break;
        // Cloud Terminal Messages (CCT-001)
        // All handlers are gated on the boot-restore of persisted tmux-backed
        // sessions: a client that connects right after a backend restart must
        // never see a half-populated session map (list) or race the restore
        // with a create. The gate resolves immediately once restore settled
        // (and always for non-tmux setups), and per-client message order is
        // preserved because every case chains on the same settled promise.
        case 'cloud-terminal:create':
          this.gateOnCloudTerminalRestore(() => void this.handleCloudTerminalCreate(client, message));
          break;
        case 'cloud-terminal:create-workflow':
          this.gateOnCloudTerminalRestore(() => void this.handleCloudTerminalCreateWorkflow(client, message));
          break;
        case 'cloud-terminal:close':
          this.gateOnCloudTerminalRestore(() => this.handleCloudTerminalClose(client, message));
          break;
        case 'cloud-terminal:pause':
          this.gateOnCloudTerminalRestore(() => this.handleCloudTerminalPause(client, message));
          break;
        case 'cloud-terminal:resume':
          this.gateOnCloudTerminalRestore(() => this.handleCloudTerminalResume(client, message));
          break;
        case 'cloud-terminal:input':
          this.gateOnCloudTerminalRestore(() => this.handleCloudTerminalInput(client, message));
          break;
        case 'cloud-terminal:paste-image':
          this.gateOnCloudTerminalRestore(() => void this.handleCloudTerminalPasteImage(client, message));
          break;
        case 'cloud-terminal:resize':
          this.gateOnCloudTerminalRestore(() => this.handleCloudTerminalResize(client, message));
          break;
        case 'cloud-terminal:list':
          this.gateOnCloudTerminalRestore(() => this.handleCloudTerminalList(client, message));
          break;
        case 'cloud-terminal:targets':
          this.gateOnCloudTerminalRestore(() => void this.handleCloudTerminalTargets(client, message));
          break;
        case 'cloud-terminal:buffer-request':
          this.gateOnCloudTerminalRestore(() => this.handleCloudTerminalBufferRequest(client, message));
          break;
        // Plan Review Messages (APR-004, APR-007)
        case 'plan-review:prompt.get':
          this.handlePlanReviewPromptGet(client);
          break;
        case 'plan-review:prompt.update':
          this.handlePlanReviewPromptUpdate(client, message);
          break;
        case 'plan-review:config.update':
          this.handlePlanReviewConfigUpdate(client, message);
          break;
        case 'plan-review:trigger.manual':
          this.handlePlanReviewTriggerManual(client, message);
          break;
        // Document Preview Messages (DPP-002)
        case 'document-preview.save':
          this.handleDocumentPreviewSave(client, message);
          break;
        default: {
          const response: WebSocketMessage = {
            type: 'ack',
            originalType: message.type,
            clientId: client.clientId,
            timestamp: new Date().toISOString()
          };
          client.send(JSON.stringify(response));
        }
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  private handleProjectList(client: WebSocketClient): void {
    const projects = this.projectManager.listProjects();
    const response: WebSocketMessage = {
      type: 'project.list',
      projects,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private handleProjectCurrent(client: WebSocketClient): void {
    // FIX: Don't overwrite client.projectId if already set via project.switch
    // This prevents race condition where project.current overrides the correct project
    let project = this.projectManager.getCurrentProject();

    if (!client.projectId) {
      // Register client with current project if one exists
      if (project) {
        webSocketManager.switchProjectForConnection(client, project.path);
        client.projectId = project.path;
        console.log(`[WebSocket] Client ${client.clientId} registered with current project: ${project.path}`);
      }
    } else {
      // Client already has a project from project.switch - use that instead
      console.log(`[WebSocket] Client ${client.clientId} already has project ${client.projectId}, using that`);
      project = { name: client.projectId.split('/').pop() || 'Unknown', path: client.projectId };
    }

    const response: WebSocketMessage = {
      type: 'project.current',
      project,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private handleProjectSelect(client: WebSocketClient, message: WebSocketMessage): void {
    const name = message.name as string;
    if (!name) {
      const errorResponse: WebSocketMessage = {
        type: 'project.error',
        error: 'Project name is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const result = this.projectManager.selectProject(name);
    if (result.success && result.project) {
      // Register client with WebSocketManager for project-scoped broadcasts
      webSocketManager.switchProjectForConnection(client, result.project.path);
      client.projectId = result.project.path;

      const response: WebSocketMessage = {
        type: 'project.selected',
        project: result.project,
        timestamp: new Date().toISOString()
      };
      this.broadcast(response);

      console.log(`[WebSocket] Client ${client.clientId} selected project: ${result.project.path}`);
    } else {
      const errorResponse: WebSocketMessage = {
        type: 'project.error',
        error: result.error,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * MPRO-005: Handle project switch for multi-project WebSocket routing.
   * Associates the client with a project in the WebSocketManager.
   */
  private handleProjectSwitch(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = message.path as string;
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'project.switch.error',
        error: 'Project path is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    // Register/switch the connection in the WebSocketManager
    webSocketManager.switchProjectForConnection(client, projectPath);
    client.projectId = projectPath;

    const response: WebSocketMessage = {
      type: 'project.switch.ack',
      projectId: projectPath,
      clientId: client.clientId,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));

    console.log(`[WebSocket] Client ${client.clientId} switched to project: ${projectPath}`);
  }

  private handleModelList(client: WebSocketClient): void {
    const defaultSelection = getDefaultSelection();

    const response: WebSocketMessage = {
      type: 'model.list',
      // All providers with providerId per model and the derived `cliKind` (INT-2026-011, D1).
      providers: providersForModelList(),
      defaultSelection,
      // INT-2026-004 (FA-40/41): resolved per-step defaults for the Vorhaben page.
      stepDefaults: getStepDefaults(),
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private handleModelProvidersList(client: WebSocketClient): void {
    // Plan reviewers: Claude CLIs only — a foreign agent CLI cannot review (INT-2026-011, AK-07).
    const providers = getReviewerProviders();

    // Transform providers to include providerId in each model (same format as handleModelList)
    const transformedProviders = providers.map(provider => ({
      id: provider.id,
      name: provider.name,
      models: provider.models.map(model => ({
        id: model.id,
        name: model.name,
        providerId: provider.id
      }))
    }));

    const response: WebSocketMessage = {
      type: 'model.providers.list',
      providers: transformedProviders,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private async handleWorkflowList(client: WebSocketClient): Promise<void> {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'workflow.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const commands = await this.workflowExecutor.listCommands(projectPath);
    const response: WebSocketMessage = {
      type: 'workflow.list',
      commands,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private async handleWorkflowStart(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const commandId = message.commandId as string;
    const params = message.params as Record<string, unknown> | undefined;

    if (!commandId) {
      const errorResponse: WebSocketMessage = {
        type: 'workflow.error',
        error: 'Command ID is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'workflow.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      const executionId = await this.workflowExecutor.startExecution(
        client,
        commandId,
        projectPath,
        params
      );

      // MPRO-005: Mark workflow active in WebSocketManager and broadcast to project
      webSocketManager.markWorkflowActive(projectPath);
      this.broadcastRunningCount();
      this.broadcastRunningCountToProject(projectPath);

      const response: WebSocketMessage = {
        type: 'workflow.start.ack',
        executionId,
        commandId,
        projectId: projectPath,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'workflow.error',
        error: error instanceof Error ? error.message : 'Failed to start workflow',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  private handleWorkflowCancel(client: WebSocketClient, message: WebSocketMessage): void {
    const executionId = message.executionId as string;

    if (!executionId) {
      const errorResponse: WebSocketMessage = {
        type: 'workflow.error',
        error: 'Execution ID is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    // MPRO-005: Get execution to find project path before cancelling
    const execution = this.workflowExecutor.getExecution(executionId);
    const projectPath = execution?.projectPath;

    const cancelled = this.workflowExecutor.cancelExecution(executionId);
    const response: WebSocketMessage = {
      type: 'workflow.cancel.ack',
      executionId,
      cancelled,
      projectId: projectPath,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));

    // MPRO-005: Mark workflow inactive and broadcast to project
    if (cancelled && projectPath) {
      // Check if any other workflows are still running for this project
      const projectRunning = this.workflowExecutor.getRunningExecutions()
        .filter(e => e.projectPath === projectPath);
      if (projectRunning.length === 0) {
        webSocketManager.markWorkflowInactive(projectPath);
      }
      this.broadcastRunningCountToProject(projectPath);
    }

    // Broadcast updated running count to all
    this.broadcastRunningCount();
  }

  private handleWorkflowRunning(client: WebSocketClient): void {
    const running = this.workflowExecutor.getRunningExecutions();
    const response: WebSocketMessage = {
      type: 'workflow.running',
      executions: running.map(e => ({
        id: e.id,
        commandId: e.commandId,
        commandName: e.commandName,
        startTime: e.startTime,
        status: e.status,
        terminalSessionId: e.id // For PTY-based workflows, executionId is the terminal session ID
      })),
      count: running.length,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private async handleWorkflowRetry(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const executionId = message.executionId as string;

    if (!executionId) {
      const errorResponse: WebSocketMessage = {
        type: 'workflow.error',
        error: 'Execution ID is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const success = await this.workflowExecutor.retryExecution(executionId);

    const response: WebSocketMessage = {
      type: 'workflow.retry.ack',
      executionId,
      success,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private async handleWorkflowInteractiveStart(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const commandId = message.commandId as string;
    const argument = message.argument as string | undefined;
    const model = message.model as string | undefined;  // LLM-001: Extract model parameter

    if (!commandId) {
      const errorResponse: WebSocketMessage = {
        type: 'workflow.interactive.error',
        error: 'Command ID is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'workflow.interactive.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      // LLM-001: Build params with optional argument and model
      const params: Record<string, unknown> = {};
      if (argument) params.argument = argument;
      if (model) params.model = model;

      const executionId = await this.workflowExecutor.startExecution(
        client,
        commandId,
        projectPath,
        Object.keys(params).length > 0 ? params : undefined
      );

      // MPRO-005: Mark workflow active in WebSocketManager and broadcast to project
      webSocketManager.markWorkflowActive(projectPath);
      this.broadcastRunningCount();
      this.broadcastRunningCountToProject(projectPath);

      const response: WebSocketMessage = {
        type: 'workflow.interactive.start.ack',
        executionId,
        commandId,
        projectId: projectPath,
        timestamp: new Date().toISOString()
      };
      console.log(`[WebSocket] Sending workflow.interactive.start.ack for execution ${executionId}`);
      client.send(JSON.stringify(response));
      console.log(`[WebSocket] start.ack sent`);
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'workflow.interactive.error',
        error: error instanceof Error ? error.message : 'Failed to start workflow',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * MPRO-005: Broadcast running count to all connected clients.
   * For per-project counts, use broadcastRunningCountToProject.
   */
  private broadcastRunningCount(): void {
    const running = this.workflowExecutor.getRunningExecutions();
    const message: WebSocketMessage = {
      type: 'workflow.running.count',
      count: running.length,
      timestamp: new Date().toISOString()
    };
    this.broadcast(message);
  }

  /**
   * MPRO-005: Broadcast running count for a specific project.
   */
  private broadcastRunningCountToProject(projectId: string): void {
    const running = this.workflowExecutor.getRunningExecutions()
      .filter(e => e.projectPath === projectId);
    const message: WebSocketMessage = {
      type: 'workflow.running.count',
      projectId,
      count: running.length,
      timestamp: new Date().toISOString()
    };
    webSocketManager.sendToProject(projectId, message);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const client = ws as WebSocketClient;
        if (!client.isAlive) {
          console.log(`Client ${client.clientId} failed heartbeat, terminating`);
          this.clients.delete(client.clientId);
          return client.terminate();
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000);
  }

  public broadcast(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  /** Expose the CloudTerminalManager for the agent-event REST route (Stop hook callback). */
  public getCloudTerminalManager(): CloudTerminalManager {
    return this.cloudTerminalManager;
  }

  /** Expose the Vorhaben service for the deploy-readiness gate (FA-34). */
  public getVorhabenService(): VorhabenService {
    return this.vorhabenService;
  }

  public shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.unsubscribeConcurrency?.();
    this.unsubscribeConcurrency = null;
    this.wss.clients.forEach((client) => {
      client.close();
    });
    this.wss.close();
    // DPP-002: Clean up PreviewWatcher
    this.previewWatcher.stop();
    this.vorhabenService.stop();
    // MPRO-005: Clean up WebSocketManager
    webSocketManager.shutdown();
  }

  /**
   * Handle terminal input from frontend
   * Forwards user input to the PTY process via TerminalManager
   */
  private handleTerminalInput(client: WebSocketClient, message: WebSocketMessage): void {
    const executionId = message.executionId as string;
    const data = message.data as string;

    if (!executionId || typeof data !== 'string') {
      const errorResponse: WebSocketMessage = {
        type: 'terminal.error',
        error: 'executionId and data are required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      const terminalManager = this.workflowExecutor.getTerminalManager();
      terminalManager.write(executionId, data);
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'terminal.error',
        error: error instanceof Error ? error.message : 'Failed to write to terminal',
        executionId,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * Handle terminal resize from frontend
   * Updates PTY terminal dimensions for proper rendering
   */
  private handleTerminalResize(client: WebSocketClient, message: WebSocketMessage): void {
    const executionId = message.executionId as string;
    const cols = message.cols as number;
    const rows = message.rows as number;

    if (!executionId || typeof cols !== 'number' || typeof rows !== 'number') {
      const errorResponse: WebSocketMessage = {
        type: 'terminal.error',
        error: 'executionId, cols, and rows are required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      const terminalManager = this.workflowExecutor.getTerminalManager();
      terminalManager.resize({ executionId, cols, rows });
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'terminal.error',
        error: error instanceof Error ? error.message : 'Failed to resize terminal',
        executionId,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * Handle terminal buffer request from frontend
   * Used on reconnect to restore terminal state
   */
  private handleTerminalBufferRequest(client: WebSocketClient, message: WebSocketMessage): void {
    const executionId = message.executionId as string;

    if (!executionId) {
      const errorResponse: WebSocketMessage = {
        type: 'terminal.error',
        error: 'executionId is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      const terminalManager = this.workflowExecutor.getTerminalManager();
      const buffer = terminalManager.getBuffer(executionId);

      const response: WebSocketMessage = {
        type: 'terminal.buffer.response',
        executionId,
        buffer,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'terminal.error',
        error: error instanceof Error ? error.message : 'Failed to retrieve terminal buffer',
        executionId,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * Handle interactive workflow cancel request
   * Kills both the PTY terminal process and the workflow execution
   */
  private handleWorkflowInteractiveCancel(client: WebSocketClient, message: WebSocketMessage): void {
    const executionId = message.executionId as string;

    if (!executionId) {
      const errorResponse: WebSocketMessage = {
        type: 'workflow.interactive.error',
        error: 'Execution ID is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    console.log(`[WebSocket] Cancelling interactive workflow: ${executionId}`);

    // Kill the PTY terminal process
    const terminalManager = this.workflowExecutor.getTerminalManager();
    const terminalKilled = terminalManager.kill(executionId);
    console.log(`[WebSocket] Terminal kill result: ${terminalKilled}`);

    // Also cancel the workflow execution (cleanup)
    const workflowCancelled = this.workflowExecutor.cancelExecution(executionId);
    console.log(`[WebSocket] Workflow cancel result: ${workflowCancelled}`);

    const response: WebSocketMessage = {
      type: 'workflow.interactive.cancel.ack',
      executionId,
      cancelled: terminalKilled || workflowCancelled,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));

    // Broadcast updated running count
    this.broadcastRunningCount();
  }

  private handleSettingsConfigGet(client: WebSocketClient): void {
    const config: ModelConfig = loadModelConfig();
    const response: WebSocketMessage = {
      type: 'settings.config',
      config,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private handleSettingsProviderUpdate(client: WebSocketClient, message: WebSocketMessage): void {
    const providerId = message.providerId as string;
    const cliCommand = message.cliCommand as string | undefined;
    const cliFlags = message.cliFlags as string[] | undefined;
    const name = message.name as string | undefined;

    if (!providerId) {
      const errorResponse: WebSocketMessage = {
        type: 'settings.error',
        error: 'Provider ID is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      const updates: Partial<{ name: string; cliCommand: string; cliFlags: string[] }> = {};
      if (cliCommand !== undefined) updates.cliCommand = cliCommand;
      if (cliFlags !== undefined) updates.cliFlags = cliFlags;
      if (name !== undefined) updates.name = name;

      const config = updateProvider(providerId, updates);
      const response: WebSocketMessage = {
        type: 'settings.config',
        config,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'settings.error',
        error: error instanceof Error ? error.message : 'Failed to update provider',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  private handleSettingsProviderAdd(client: WebSocketClient, message: WebSocketMessage): void {
    const provider = message.provider as ModelProvider;

    if (!provider || !provider.id || !provider.name || !provider.cliCommand) {
      const errorResponse: WebSocketMessage = {
        type: 'settings.error',
        error: 'Provider with id, name, and cliCommand are required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      const config = addProvider(provider);
      const response: WebSocketMessage = {
        type: 'settings.config',
        config,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'settings.error',
        error: error instanceof Error ? error.message : 'Failed to add provider',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  private handleSettingsProviderRemove(client: WebSocketClient, message: WebSocketMessage): void {
    const providerId = message.providerId as string;

    if (!providerId) {
      const errorResponse: WebSocketMessage = {
        type: 'settings.error',
        error: 'Provider ID is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      const config = removeProvider(providerId);
      const response: WebSocketMessage = {
        type: 'settings.config',
        config,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'settings.error',
        error: error instanceof Error ? error.message : 'Failed to remove provider',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  private handleSettingsModelAdd(client: WebSocketClient, message: WebSocketMessage): void {
    const providerId = message.providerId as string;
    const model = message.model as Model;

    if (!providerId || !model || !model.id || !model.name) {
      const errorResponse: WebSocketMessage = {
        type: 'settings.error',
        error: 'Provider ID and model with id/name are required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      const config = addModel(providerId, model);
      const response: WebSocketMessage = {
        type: 'settings.config',
        config,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'settings.error',
        error: error instanceof Error ? error.message : 'Failed to add model',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  private handleSettingsModelRemove(client: WebSocketClient, message: WebSocketMessage): void {
    const providerId = message.providerId as string;
    const modelId = message.modelId as string;

    if (!providerId || !modelId) {
      const errorResponse: WebSocketMessage = {
        type: 'settings.error',
        error: 'Provider ID and Model ID are required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      const config = removeModel(providerId, modelId);
      const response: WebSocketMessage = {
        type: 'settings.config',
        config,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'settings.error',
        error: error instanceof Error ? error.message : 'Failed to remove model',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  private handleSettingsModelUpdate(client: WebSocketClient, message: WebSocketMessage): void {
    const providerId = message.providerId as string;
    const oldModelId = message.oldModelId as string;
    const model = message.model as Model;

    if (!providerId || !oldModelId || !model || !model.id || !model.name) {
      const errorResponse: WebSocketMessage = {
        type: 'settings.error',
        error: 'Provider ID, old model ID, and model with id/name are required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      const config = updateModel(providerId, oldModelId, model);
      const response: WebSocketMessage = {
        type: 'settings.config',
        config,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'settings.error',
        error: error instanceof Error ? error.message : 'Failed to update model',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  private handleSettingsDefaultsUpdate(client: WebSocketClient, message: WebSocketMessage): void {
    const providerId = message.providerId as string;
    const modelId = message.modelId as string;

    if (!providerId || !modelId) {
      const errorResponse: WebSocketMessage = {
        type: 'settings.error',
        error: 'Provider ID and Model ID are required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      const config = setDefaults(providerId, modelId);
      const response: WebSocketMessage = {
        type: 'settings.config',
        config,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'settings.error',
        error: error instanceof Error ? error.message : 'Failed to update defaults',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * FA-41: default model per v4 step. `providerId`/`modelId` set the step,
   * `null` for both clears it (back to "wie Standard"). Answers like
   * `settings.defaults.update` with the whole config.
   */
  private handleSettingsStepDefaultsUpdate(client: WebSocketClient, message: WebSocketMessage): void {
    const step = message.step as StepKey;
    const providerId = message.providerId as string | null | undefined;
    const modelId = message.modelId as string | null | undefined;
    const clear = providerId === null && modelId === null;
    if (!step || (!clear && (!providerId || !modelId))) {
      client.send(JSON.stringify({
        type: 'settings.error',
        error: 'step and providerId/modelId (or null to clear) are required',
        timestamp: new Date().toISOString()
      }));
      return;
    }
    try {
      const config = setStepDefault(step, clear ? null : { providerId: providerId as string, modelId: modelId as string });
      client.send(JSON.stringify({ type: 'settings.config', config, timestamp: new Date().toISOString() }));
    } catch (error) {
      client.send(JSON.stringify({
        type: 'settings.error',
        error: error instanceof Error ? error.message : 'Failed to update step defaults',
        timestamp: new Date().toISOString()
      }));
    }
  }

  private handleSettingsGeneralGet(client: WebSocketClient): void {
    const projectPath = this.getClientProjectPath(client) || undefined;
    const config = loadGeneralConfig(projectPath);
    const response: WebSocketMessage = {
      type: 'settings.general',
      config,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private handleSettingsGeneralUpdate(client: WebSocketClient, message: WebSocketMessage): void {
    const baseBranch = message.baseBranch as string | undefined;
    const projectPath = this.getClientProjectPath(client) || undefined;

    try {
      const updates: Parameters<typeof updateGeneralConfig>[0] = {};
      if (baseBranch !== undefined) updates.baseBranch = baseBranch;
      const config = updateGeneralConfig(updates, projectPath);
      const response: WebSocketMessage = {
        type: 'settings.general',
        config,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'settings.error',
        error: error instanceof Error ? error.message : 'Failed to update general settings',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  private handlePromptTemplatesListGet(client: WebSocketClient): void {
    const templates = loadPromptTemplates();
    const response: WebSocketMessage = {
      type: 'prompt-templates:list',
      templates,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private handlePromptTemplatesSave(client: WebSocketClient, message: WebSocketMessage): void {
    try {
      const templates = savePromptTemplate({
        id: message.id as string | undefined,
        name: message.name as string,
        content: message.content as string,
      });
      const response: WebSocketMessage = {
        type: 'prompt-templates:list',
        templates,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'prompt-templates:error',
        error: error instanceof Error ? error.message : 'Failed to save template',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  private handlePromptTemplatesDelete(client: WebSocketClient, message: WebSocketMessage): void {
    try {
      const templates = deletePromptTemplate(message.id as string);
      const response: WebSocketMessage = {
        type: 'prompt-templates:list',
        templates,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'prompt-templates:error',
        error: error instanceof Error ? error.message : 'Failed to delete template',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  private async handlePromptTemplatesExtractFromImage(
    client: WebSocketClient,
    message: WebSocketMessage
  ): Promise<void> {
    try {
      const base64 = message.base64 as string;
      const mimeType = message.mimeType as string;
      if (typeof base64 !== 'string' || !base64) {
        throw new Error('Image data is required');
      }
      if (typeof mimeType !== 'string' || !mimeType) {
        throw new Error('Image MIME type is required');
      }
      const { name, content } = await extractPromptFromImage(base64, mimeType);
      const response: WebSocketMessage = {
        type: 'prompt-templates:extracted',
        name,
        content,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'prompt-templates:error',
        error: error instanceof Error ? error.message : 'Failed to extract prompt from image',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  private handleSettingsGithubGet(client: WebSocketClient): void {
    const config = loadGithubConfigStatus();
    const response: WebSocketMessage = {
      type: 'settings.github',
      config,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private handleSettingsGithubUpdate(client: WebSocketClient, message: WebSocketMessage): void {
    const pat = message.pat as string | undefined;
    if (typeof pat !== 'string' || pat.length === 0) {
      const errorResponse: WebSocketMessage = {
        type: 'settings.error',
        error: 'GitHub PAT is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      const config = updateGithubPat(pat);
      const response: WebSocketMessage = {
        type: 'settings.github',
        config,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'settings.error',
        error: error instanceof Error ? error.message : 'Failed to update GitHub settings',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  private handleSettingsGithubClear(client: WebSocketClient): void {
    try {
      clearGithubPat();
      const response: WebSocketMessage = {
        type: 'settings.github',
        config: loadGithubConfigStatus(),
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'settings.error',
        error: error instanceof Error ? error.message : 'Failed to clear GitHub settings',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  private handlePlanReviewPromptGet(client: WebSocketClient): void {
    const prompt = getReviewPrompt();
    const response: WebSocketMessage = {
      type: 'plan-review:prompt',
      prompt,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private handlePlanReviewPromptUpdate(client: WebSocketClient, message: WebSocketMessage): void {
    const reviewPrompt = message.prompt as string | undefined;
    try {
      const config = updateGeneralConfig({ reviewPrompt });
      const response: WebSocketMessage = {
        type: 'plan-review:prompt',
        prompt: config.reviewPrompt,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'plan-review:error',
        error: error instanceof Error ? error.message : 'Failed to update review prompt',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * GIT-001: Handle git:status message.
   */
  private handleGitStatus(client: WebSocketClient): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendGitNoProjectError(client, 'status');
      return;
    }
    gitHandler.handleStatus(client, projectPath);
  }

  /**
   * GIT-001: Handle git:branches message.
   */
  private handleGitBranches(client: WebSocketClient): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendGitNoProjectError(client, 'branches');
      return;
    }
    gitHandler.handleBranches(client, projectPath);
  }

  /**
   * GIT-001: Handle git:commit message.
   */
  private handleGitCommit(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendGitNoProjectError(client, 'commit');
      return;
    }
    gitHandler.handleCommit(client, message, projectPath);
  }

  /**
   * GIT-001: Handle git:pull message.
   */
  private handleGitPull(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendGitNoProjectError(client, 'pull');
      return;
    }
    gitHandler.handlePull(client, message, projectPath);
  }

  /**
   * GIT-001: Handle git:push message.
   */
  private handleGitPush(client: WebSocketClient): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendGitNoProjectError(client, 'push');
      return;
    }
    gitHandler.handlePush(client, projectPath);
  }

  /**
   * GIT-001: Handle git:checkout message.
   */
  private handleGitCheckout(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendGitNoProjectError(client, 'checkout');
      return;
    }
    gitHandler.handleCheckout(client, message, projectPath);
  }

  /**
   * GITE-001: Handle git:revert message.
   */
  private handleGitRevert(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendGitNoProjectError(client, 'revert');
      return;
    }
    gitHandler.handleRevert(client, message, projectPath);
  }

  /**
   * GITE-001: Handle git:delete-untracked message.
   */
  private handleGitDeleteUntracked(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendGitNoProjectError(client, 'delete-untracked');
      return;
    }
    gitHandler.handleDeleteUntracked(client, message, projectPath);
  }

  /**
   * GITE-001: Handle git:pr-info message.
   */
  private handleGitPrInfo(client: WebSocketClient): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendGitNoProjectError(client, 'pr-info');
      return;
    }
    gitHandler.handlePrInfo(client, projectPath);
  }

  /**
   * Handle git:generate-commit-message message.
   */
  private handleGitGenerateCommitMessage(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendGitNoProjectError(client, 'generate-commit-message');
      return;
    }
    gitHandler.handleGenerateCommitMessage(client, message, projectPath);
  }

  /**
   * Handle git:diff message.
   */
  private handleGitDiff(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendGitNoProjectError(client, 'diff');
      return;
    }
    gitHandler.handleDiff(client, message, projectPath);
  }

  /**
   * Send git error for missing project.
   */
  private sendGitNoProjectError(client: WebSocketClient, operation: string): void {
    const errorResponse: WebSocketMessage = {
      type: 'git:error',
      code: 'NO_PROJECT',
      message: 'No project selected',
      operation,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(errorResponse));
  }

  // ============================================================================
  // Attachment Handlers (SCA-001)
  // ============================================================================

  private handleFileList(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendFileNoProjectError(client, 'files:list:error', 'list', message.path as string);
      return;
    }
    this.fileHandler.handleList(client, message, projectPath);
  }

  private handleFileRead(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendFileNoProjectError(client, 'files:read:error', 'read', message.path as string);
      return;
    }
    this.fileHandler.handleRead(client, message, projectPath);
  }

  private handleFileWrite(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendFileNoProjectError(client, 'files:write:error', 'write', message.path as string);
      return;
    }
    this.fileHandler.handleWrite(client, message, projectPath);
  }

  private handleFileCreate(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendFileNoProjectError(client, 'files:create:error', 'create', message.path as string);
      return;
    }
    this.fileHandler.handleCreate(client, message, projectPath);
  }

  private handleFileMkdir(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendFileNoProjectError(client, 'files:mkdir:error', 'mkdir', message.path as string);
      return;
    }
    this.fileHandler.handleMkdir(client, message, projectPath);
  }

  private handleFileRename(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendFileNoProjectError(client, 'files:rename:error', 'rename', message.oldPath as string);
      return;
    }
    this.fileHandler.handleRename(client, message, projectPath);
  }

  private handleFileDelete(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendFileNoProjectError(client, 'files:delete:error', 'delete', message.path as string);
      return;
    }
    this.fileHandler.handleDelete(client, message, projectPath);
  }

  private sendFileNoProjectError(client: WebSocketClient, type: string, operation: string, path?: string): void {
    const errorResponse: WebSocketMessage = {
      type,
      code: 'NO_PROJECT',
      message: 'No project selected',
      operation,
      path,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(errorResponse));
  }

  // ============================================================================
  // Document Preview Handlers (DPP-002)
  // ============================================================================

  private handleDocumentPreviewSave(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'document-preview.save.error',
        message: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }
    documentPreviewHandler.handleSave(client, message, projectPath);
  }

  // ============================================================================
  // Setup Wizard Handlers (SETUP-003)
  // ============================================================================

  private setupSetupListeners(): void {
    setupService.on('step-output', (data: StepOutput) => {
      this.broadcast({
        type: 'setup:step-output',
        step: data.step,
        data: data.data,
        timestamp: new Date().toISOString()
      });
    });

    setupService.on('step-complete', (data: StepComplete) => {
      this.broadcast({
        type: 'setup:step-complete',
        step: data.step,
        success: data.success,
        exitCode: data.exitCode,
        error: data.error,
        timestamp: new Date().toISOString()
      });
    });
  }

  private async handleSetupCheckStatus(client: WebSocketClient): Promise<void> {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'setup:error',
        code: 'NO_PROJECT',
        message: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      const steps = await setupService.checkStatus(projectPath);
      const response: WebSocketMessage = {
        type: 'setup:status',
        steps,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'setup:error',
        code: 'CHECK_FAILED',
        message: error instanceof Error ? error.message : 'Status check failed',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  private handleSetupRunStep(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'setup:error',
        code: 'NO_PROJECT',
        message: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const step = message.step as number;
    if (!step || step < 1 || step > 3) {
      const errorResponse: WebSocketMessage = {
        type: 'setup:error',
        code: 'INVALID_STEP',
        message: 'Step must be 1, 2, or 3',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      setupService.runStep(step as 1 | 2 | 3, projectPath);
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'setup:error',
        code: 'RUN_FAILED',
        message: error instanceof Error ? error.message : 'Failed to run step',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  private async handleSetupStartDevteam(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const projectPath = message.projectPath as string || this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'setup:error',
        code: 'NO_PROJECT',
        message: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const modelConfig = message.modelConfig as CloudTerminalModelConfig | undefined;
    if (!modelConfig || !modelConfig.model) {
      const errorResponse: WebSocketMessage = {
        type: 'setup:error',
        code: 'INVALID_MESSAGE',
        message: 'Model configuration is required for DevTeam setup',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      const session = await this.cloudTerminalManager.createSession(projectPath, 'claude-code', modelConfig);
      console.log(`[WebSocket] DevTeam setup session created: ${session.sessionId}`);

      // Send initial command to start DevTeam build
      setTimeout(() => {
        const commandPrefix = resolveCommandDir(projectPath);
        // INT-2026-007 (H1): a machine write like any other — under the session's lock.
        void this.cloudTerminalManager.withMachineWrite(session.sessionId, async () => {
          this.cloudTerminalManager.sendInput(session.sessionId, `/${commandPrefix}:build-development-team\n`);
        });
      }, 1000);

      this.wsCreatedSessionIds.add(session.sessionId);
      // Send cloud-terminal:created for the terminal UI
      const createdResponse: WebSocketMessage = {
        type: 'cloud-terminal:created',
        requestId: message.requestId,
        sessionId: session.sessionId,
        session,
        timestamp: new Date().toISOString()
      };
      this.broadcast(createdResponse);

      // Send setup-specific response
      const setupResponse: WebSocketMessage = {
        type: 'setup:devteam-started',
        sessionId: session.sessionId,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(setupResponse));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'setup:error',
        code: 'DEVTEAM_FAILED',
        message: error instanceof Error ? error.message : 'Failed to start DevTeam setup',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  // ============================================================================
  // Cloud Terminal Handlers (CCT-001)
  // ============================================================================

  /**
   * Set up CloudTerminalManager event listeners
   * Forwards session events to connected clients
   */
  private setupCloudTerminalListeners(): void {
    // Note: session.created is handled directly in handleCloudTerminalCreate
    // to include the requestId for correlation

    // Session closed
    this.cloudTerminalManager.on('session.closed', (sessionId: CloudTerminalSessionId, exitCode?: number) => {
      // closedBy:'user' lets every client drop the tab; a plain process exit
      // keeps the tab with its "Prozess beendet" message (today's UX).
      const closedByUser = this.userClosedSessionIds.delete(sessionId);
      this.wsCreatedSessionIds.delete(sessionId);
      const message: WebSocketMessage = {
        type: 'cloud-terminal:closed',
        sessionId,
        exitCode,
        ...(closedByUser ? { closedBy: 'user' } : {}),
        timestamp: new Date().toISOString()
      };
      this.broadcast(message);
      // A session that is gone for good takes its tab name with it.
      this.workspaceHandler.onSessionClosed(sessionId);
    });

    // Sessions not created through a WS handler (auto-mode orchestrators) never
    // announced themselves — every client only learned of them after a reload.
    // Broadcast a `created` without requestId so open clients adopt the tab live.
    this.cloudTerminalManager.on('session.created', (created: { sessionId: CloudTerminalSessionId }) => {
      const sessionId = created.sessionId;
      setImmediate(() => {
        if (this.wsCreatedSessionIds.has(sessionId)) return;
        const session = this.cloudTerminalManager.getSession(sessionId);
        if (!session || session.status === 'closed') return;
        this.broadcast({
          type: 'cloud-terminal:created',
          sessionId,
          session,
          timestamp: new Date().toISOString(),
        });
      });
    });

    // Session paused
    this.cloudTerminalManager.on('session.paused', (sessionId: CloudTerminalSessionId) => {
      const message: WebSocketMessage = {
        type: 'cloud-terminal:paused',
        sessionId,
        timestamp: new Date().toISOString()
      };
      this.broadcast(message);
    });

    // Session resumed
    this.cloudTerminalManager.on('session.resumed', (sessionId: CloudTerminalSessionId, bufferedOutput?: string) => {
      const message: WebSocketMessage = {
        type: 'cloud-terminal:resumed',
        sessionId,
        bufferedOutput,
        timestamp: new Date().toISOString()
      };
      this.broadcast(message);
    });

    // Session data (terminal output)
    this.cloudTerminalManager.on('session.data', (sessionId: CloudTerminalSessionId, data: string) => {
      const message: WebSocketMessage = {
        type: 'cloud-terminal:data',
        sessionId,
        data,
        timestamp: new Date().toISOString()
      };
      this.broadcast(message);
    });

    // Session error
    this.cloudTerminalManager.on('session.error', (sessionId: CloudTerminalSessionId, error: Error) => {
      const message: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: 'SESSION_ERROR',
        message: error.message,
        sessionId,
        timestamp: new Date().toISOString()
      };
      this.broadcast(message);
    });

    // User-facing notice (per-session worktree: kept-because-dirty, or started
    // without a worktree). Non-fatal — surfaced so the reason is visible in the
    // UI instead of only in the server log.
    this.cloudTerminalManager.on(
      'session.notice',
      (sessionId: CloudTerminalSessionId, level: 'warn' | 'info', noticeMessage: string) => {
        this.broadcast({
          type: 'cloud-terminal:notice',
          sessionId,
          level,
          message: noticeMessage,
          timestamp: new Date().toISOString(),
        });
      }
    );

    // Agent status reduced from Claude Code hooks (tab dot + agent-finished bell).
    this.cloudTerminalManager.on(
      'session.agent-event',
      (
        sessionId: CloudTerminalSessionId,
        event: CloudTerminalAgentEvent,
        detail: CloudTerminalAgentEventDetail & { status: CloudTerminalAgentStatus; statusAt: Date }
      ) => {
        this.broadcast({
          type: 'cloud-terminal:agent-event',
          sessionId,
          event,
          status: detail.status,
          statusAt: detail.statusAt.toISOString(),
          ...(detail.preview ? { preview: detail.preview } : {}),
          ...(detail.reason ? { reason: detail.reason } : {}),
          timestamp: new Date().toISOString(),
        });
      }
    );
  }

  /**
   * Wire PlanReviewOrchestrator events to WS broadcasts (APR-007).
   */
  private setupPlanReviewListeners(): void {
    this.planReviewOrchestrator.on(
      'plan-review:started',
      (sessionId: string, source: 'auto' | 'manual', reviewerCount: number) => {
        this.broadcast({
          type: 'plan-review:started',
          sessionId,
          source,
          reviewerCount,
          timestamp: new Date().toISOString(),
        });
      }
    );

    this.planReviewOrchestrator.on(
      'plan-review:reviewer.result',
      (sessionId: string, reviewerId: string, status: 'fulfilled' | 'rejected', output?: string, error?: string) => {
        this.broadcast({
          type: 'plan-review:reviewer.result',
          sessionId,
          reviewerId,
          status,
          ...(output !== undefined ? { output } : {}),
          ...(error !== undefined ? { error } : {}),
          timestamp: new Date().toISOString(),
        });
      }
    );

    this.planReviewOrchestrator.on(
      'plan-review:aggregated',
      (sessionId: string, aggregatedText: string, fallbackReason?: string) => {
        this.broadcast({
          type: 'plan-review:aggregated',
          sessionId,
          aggregatedText,
          ...(fallbackReason !== undefined ? { fallbackReason } : {}),
          timestamp: new Date().toISOString(),
        });
      }
    );

    this.planReviewOrchestrator.on('plan-review:injected', (sessionId: string, verified?: boolean) => {
      this.broadcast({
        type: 'plan-review:injected',
        sessionId,
        ...(verified !== undefined ? { verified } : {}),
        timestamp: new Date().toISOString(),
      });
    });

    this.planReviewOrchestrator.on('plan-review:error', (sessionId: string, errorMessage: string) => {
      this.broadcast({
        type: 'plan-review:error',
        sessionId,
        message: errorMessage,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private handlePlanReviewConfigUpdate(client: WebSocketClient, message: WebSocketMessage): void {
    const sessionId = message.sessionId as string;
    const enabled = message.enabled as boolean;
    const reviewers = message.reviewers as TabReviewConfig['reviewers'];

    if (!sessionId || typeof enabled !== 'boolean' || !Array.isArray(reviewers)) {
      client.send(
        JSON.stringify({
          type: 'plan-review:error',
          message: 'sessionId, enabled (boolean), and reviewers (array) are required',
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    this.planReviewOrchestrator.setTabConfig(sessionId, { enabled, reviewers });
  }

  private handlePlanReviewTriggerManual(client: WebSocketClient, message: WebSocketMessage): void {
    const sessionId = message.sessionId as string;

    if (!sessionId) {
      client.send(
        JSON.stringify({
          type: 'plan-review:error',
          message: 'sessionId is required',
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    this.planReviewOrchestrator.triggerManualReview(sessionId);
  }

  /**
   * Handle cloud-terminal:create
   * Creates a new Cloud Terminal session
   */
  private async handleCloudTerminalCreate(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const projectPath = message.projectPath as string || this.getClientProjectPath(client);
    const terminalType = (message.terminalType as CloudTerminalType) || 'claude-code';
    const modelConfig = message.modelConfig as CloudTerminalModelConfig | undefined;
    const cols = message.cols as number | undefined;
    const rows = message.rows as number | undefined;

    // `requestId` is echoed on errors too: in split-screen every mounted pane
    // listens on the same socket, and an unfiltered error would tear down
    // sibling panes as well. Target errors (occupied / invalid) made that a
    // routine path rather than an exotic one.
    const requestId = message.requestId;

    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        requestId,
        code: 'INVALID_PROJECT_PATH',
        message: 'Project path is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    // modelConfig is only required for claude-code terminals
    if (terminalType === 'claude-code' && (!modelConfig || !modelConfig.model)) {
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        requestId,
        code: 'INVALID_MESSAGE',
        message: 'Model configuration is required for claude-code terminals',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    let sessionTarget: ParsedTarget;
    try {
      sessionTarget = parseSessionTarget(message.sessionTarget);
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        requestId,
        code: error instanceof SessionTargetError
          ? error.code
          : CLOUD_TERMINAL_ERROR_CODES.INVALID_SESSION_TARGET,
        message: error instanceof Error ? error.message : 'Invalid session target',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      // Where the session runs is the client's choice; absent `sessionTarget`
      // still means "new per-session worktree" for older clients. Shell
      // terminals ignore it entirely and stay in the project dir.
      const session = await this.cloudTerminalManager.createSession(
        projectPath, terminalType, modelConfig, cols, rows,
        undefined, undefined, undefined, { sessionTarget }
      );
      console.log(`[WebSocket] Cloud Terminal ${terminalType} session created: ${session.sessionId} (cwd: ${session.effectiveCwd})`);

      // Notices raised during creation cannot travel via cloud-terminal:notice
      // (the client does not know the sessionId yet), so they ride along here.
      const notices = this.cloudTerminalManager.takePendingNotices(session.sessionId);

      this.wsCreatedSessionIds.add(session.sessionId);
      // Send created response with requestId for correlation
      const createdResponse: WebSocketMessage = {
        type: 'cloud-terminal:created',
        requestId,
        sessionId: session.sessionId,
        session,
        ...(notices.length > 0 ? { notices } : {}),
        timestamp: new Date().toISOString()
      };
      this.broadcast(createdResponse);
      this.planReviewOrchestrator.sendSnapshot(session.sessionId, client);
    } catch (error) {
      const errorCode = (error as Error & { code?: string }).code || 'SPAWN_FAILED';
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        requestId,
        code: errorCode,
        message: error instanceof Error ? error.message : 'Failed to create Cloud Terminal session',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * Handle cloud-terminal:targets
   *
   * Answers "where could this session run?": the registered project root plus
   * every git worktree of the repo, annotated with branch, cleanliness and
   * live-session occupancy.
   *
   * Lives here rather than in the git handler because occupancy is only known
   * to CloudTerminalManager. Response goes to the requesting client only —
   * unlike `cloud-terminal:created`, targets are not shared state.
   */
  private async handleCloudTerminalTargets(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const requestId = message.requestId as string | undefined;
    const projectPath = message.projectPath as string || this.getClientProjectPath(client);

    const sendError = (code: string, text: string): void => {
      client.send(JSON.stringify({
        type: 'cloud-terminal:targets:error',
        requestId,
        code,
        message: text,
        timestamp: new Date().toISOString(),
      }));
    };

    if (!projectPath) {
      sendError(CLOUD_TERMINAL_ERROR_CODES.INVALID_PROJECT_PATH, 'Project path is required');
      return;
    }

    try {
      const mainProjectPath = resolveMainWorktreePath(projectPath);
      const [info, createdAtByPath] = await Promise.all([
        listRepoWorktrees(mainProjectPath),
        listWorktreeCreationTimes(mainProjectPath),
      ]);
      const occupied = this.cloudTerminalManager.getOccupiedPaths();
      const projectKey = pathKey(projectPath);

      // `git status` per worktree is synchronous and not free. Beyond a handful
      // of worktrees we report `clean: null` and the UI simply omits the badge.
      const CLEANLINESS_BUDGET = 8;
      const withCleanliness = info.entries.length <= CLEANLINESS_BUDGET;

      const toEntry = (
        path: string,
        branch: string | null,
        head: string | null,
        flags: { isMain: boolean; missing: boolean; locked: boolean }
      ): CloudTerminalWorktreeEntry => {
        const hit = occupied.get(path);
        const name = path.split('/').filter(Boolean).pop() ?? path;
        return {
          path,
          name,
          branch,
          head,
          isMain: flags.isMain,
          isProjectRoot: path === projectKey,
          clean: withCleanliness && !flags.missing ? isWorktreeClean(path) : null,
          missing: flags.missing,
          locked: flags.locked,
          occupied: Boolean(hit),
          occupiedBy: hit?.sessionId,
          occupiedCount: hit?.count ?? 0,
          // `backlogBranchName` is `feature/<slug>`, which collides with
          // hand-made feature worktrees — so only the unambiguous markers
          // count: a `story/*` branch or a `backlog-*` directory.
          autoModeManaged: Boolean(branch?.startsWith('story/')) || name.startsWith('backlog-'),
          // Only linked worktrees have an admin dir — the main worktree and
          // non-git project roots stay null and render without an age.
          createdAt: createdAtByPath.get(path) ?? null,
        };
      };

      const worktrees = info.entries
        .filter((e) => !e.bare)
        .map((e) => toEntry(e.path, e.branch, e.head, {
          isMain: e.path === info.mainWorktreePath,
          missing: e.prunable,
          locked: e.locked,
        }));

      const projectRoot =
        worktrees.find((w) => w.isProjectRoot) ??
        toEntry(projectKey, null, null, { isMain: false, missing: false, locked: false });

      let newWorktreeBase: string | null = null;
      if (info.isGitRepo) {
        try {
          newWorktreeBase = await resolveSessionBase(mainProjectPath);
        } catch {
          newWorktreeBase = null;
        }
      }

      client.send(JSON.stringify({
        type: 'cloud-terminal:targets:response',
        requestId,
        isGitRepo: info.isGitRepo,
        projectRoot,
        mainWorktreePath: info.mainWorktreePath ?? projectKey,
        projectRootIsLinkedWorktree:
          info.mainWorktreePath !== null && info.mainWorktreePath !== projectKey,
        worktrees,
        worktreeCreationEnabled: getCloudSessionWorktreeEnabled(mainProjectPath),
        newWorktreeBase,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('[WebSocket] cloud-terminal:targets failed:', error);
      sendError(
        CLOUD_TERMINAL_ERROR_CODES.WORKTREE_LIST_FAILED,
        error instanceof Error ? error.message : 'Failed to list worktrees'
      );
    }
  }

  /**
   * Handle cloud-terminal:create-workflow (WTT-001)
   * Creates a new Cloud Terminal session for workflow execution
   * Automatically sends the workflow command after session initialization
   */
  private async handleCloudTerminalCreateWorkflow(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const projectPath = message.projectPath as string || this.getClientProjectPath(client);
    const workflowMetadata = message.workflowMetadata as CloudTerminalWorkflowMetadata | undefined;
    const modelConfig = message.modelConfig as CloudTerminalModelConfig | undefined;
    const cols = message.cols as number | undefined;
    const rows = message.rows as number | undefined;

    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: 'INVALID_PROJECT_PATH',
        message: 'Project path is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    if (!workflowMetadata || !workflowMetadata.workflowCommand) {
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: 'INVALID_MESSAGE',
        message: 'Workflow metadata with workflowCommand is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    if (!modelConfig || !modelConfig.model) {
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: 'INVALID_MESSAGE',
        message: 'Model configuration is required for workflow sessions',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      const session = await this.cloudTerminalManager.createWorkflowSession(
        projectPath,
        workflowMetadata,
        modelConfig,
        cols,
        rows
      );
      console.log(
        `[WebSocket] Workflow session created: ${session.sessionId} for command: ${workflowMetadata.workflowCommand}`
      );

      this.wsCreatedSessionIds.add(session.sessionId);
      // Send created response with workflow metadata and requestId for correlation
      const createdResponse: WebSocketMessage = {
        type: 'cloud-terminal:created',
        requestId: message.requestId,
        sessionId: session.sessionId,
        session,
        workflowMetadata,
        timestamp: new Date().toISOString()
      };
      this.broadcast(createdResponse);
      this.planReviewOrchestrator.sendSnapshot(session.sessionId, client);
    } catch (error) {
      const errorCode = (error as Error & { code?: string }).code || 'SPAWN_FAILED';
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: errorCode,
        message: error instanceof Error ? error.message : 'Failed to create workflow session',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * Handle cloud-terminal:close
   * Closes a Cloud Terminal session
   */
  private handleCloudTerminalClose(client: WebSocketClient, message: WebSocketMessage): void {
    const sessionId = message.sessionId as string;

    if (!sessionId) {
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: 'INVALID_MESSAGE',
        message: 'Session ID is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    // Mark BEFORE the close: the session.closed listener reads the set synchronously.
    this.userClosedSessionIds.add(sessionId);
    const closed = this.cloudTerminalManager.closeSession(sessionId);
    if (!closed) this.userClosedSessionIds.delete(sessionId);

    if (!closed) {
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: 'SESSION_NOT_FOUND',
        message: `Session not found: ${sessionId}`,
        sessionId,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
    // Response is sent via the session.closed event listener
  }

  /**
   * Handle cloud-terminal:pause
   * Pauses a Cloud Terminal session (buffers output)
   */
  private handleCloudTerminalPause(client: WebSocketClient, message: WebSocketMessage): void {
    const sessionId = message.sessionId as string;

    if (!sessionId) {
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: 'INVALID_MESSAGE',
        message: 'Session ID is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const paused = this.cloudTerminalManager.pauseSession(sessionId);

    if (!paused) {
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: 'SESSION_NOT_FOUND',
        message: `Session not found or cannot be paused: ${sessionId}`,
        sessionId,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
    // Response is sent via the session.paused event listener
  }

  /**
   * Handle cloud-terminal:resume
   * Resumes a paused Cloud Terminal session
   */
  private handleCloudTerminalResume(client: WebSocketClient, message: WebSocketMessage): void {
    const sessionId = message.sessionId as string;

    if (!sessionId) {
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: 'INVALID_MESSAGE',
        message: 'Session ID is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const bufferedOutput = this.cloudTerminalManager.resumeSession(sessionId);

    if (bufferedOutput === null) {
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: 'SESSION_NOT_FOUND',
        message: `Session not found or cannot be resumed: ${sessionId}`,
        sessionId,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }
    // Response is sent via the session.resumed event listener
    this.planReviewOrchestrator.sendSnapshot(sessionId, client);
  }

  /**
   * Handle cloud-terminal:input
   * Sends input to a Cloud Terminal session
   */
  private handleCloudTerminalInput(client: WebSocketClient, message: WebSocketMessage): void {
    const sessionId = message.sessionId as string;
    const data = message.data as string;

    if (!sessionId || typeof data !== 'string') {
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: 'INVALID_MESSAGE',
        message: 'Session ID and data are required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const written = this.cloudTerminalManager.sendInput(sessionId, data);

    if (!written) {
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: 'SESSION_NOT_FOUND',
        message: `Session not found or not active: ${sessionId}`,
        sessionId,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * Handle cloud-terminal:paste-image
   * Persists the uploaded image bytes and injects the resulting absolute path into the PTY.
   * Ownership: matches handleCloudTerminalInput — sessionId acts as the capability token.
   */
  private async handleCloudTerminalPasteImage(
    client: WebSocketClient,
    message: WebSocketMessage,
  ): Promise<void> {
    const sessionId = message.sessionId as string;
    const base64 = (message as { base64?: unknown }).base64;
    const mimeType = (message as { mimeType?: unknown }).mimeType;

    if (!sessionId || typeof base64 !== 'string' || typeof mimeType !== 'string') {
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: CLOUD_TERMINAL_ERROR_CODES.INVALID_MESSAGE,
        message: 'sessionId, base64, and mimeType are required',
        sessionId,
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      const { absolutePath } = await this.cloudTerminalManager.savePastedImage(
        sessionId, base64, mimeType,
      );
      const savedResponse: WebSocketMessage = {
        type: 'cloud-terminal:paste-image-saved',
        sessionId,
        absolutePath,
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(savedResponse));
    } catch (err) {
      const code = (err as { code?: string }).code
        ?? CLOUD_TERMINAL_ERROR_CODES.PASTE_IMAGE_FAILED;
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code,
        message: err instanceof Error ? err.message : String(err),
        sessionId,
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * Handle cloud-terminal:resize
   * Resizes a Cloud Terminal session
   */
  private handleCloudTerminalResize(client: WebSocketClient, message: WebSocketMessage): void {
    const sessionId = message.sessionId as string;
    const cols = message.cols as number;
    const rows = message.rows as number;

    if (!sessionId || typeof cols !== 'number' || typeof rows !== 'number') {
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: 'INVALID_MESSAGE',
        message: 'Session ID, cols, and rows are required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const result = this.cloudTerminalManager.resizeSession(sessionId, cols, rows);

    if (result !== 'ok') {
      // Only a genuinely missing session is SESSION_NOT_FOUND (which the UI treats as
      // "expired" and tears down). A live session whose resize failed reports the
      // distinct, non-fatal RESIZE_FAILED so the session is not killed by a resize hiccup.
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: result === 'not_found' ? 'SESSION_NOT_FOUND' : 'RESIZE_FAILED',
        message: result === 'not_found'
          ? `Session not found: ${sessionId}`
          : `Resize could not be applied for session: ${sessionId}`,
        sessionId,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * Handle cloud-terminal:list
   * Lists all Cloud Terminal sessions for a project
   */
  private handleCloudTerminalList(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = message.projectPath as string || this.getClientProjectPath(client);

    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: 'INVALID_PROJECT_PATH',
        message: 'Project path is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const sessions = this.cloudTerminalManager.getSessionsForProject(projectPath);

    const response: WebSocketMessage = {
      type: 'cloud-terminal:list-response',
      projectPath,
      sessions,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  /**
   * Handle cloud-terminal:buffer-request
   * Returns the buffered output for a Cloud Terminal session
   * Used when terminal component is re-mounted (e.g., after project switch)
   */
  private handleCloudTerminalBufferRequest(client: WebSocketClient, message: WebSocketMessage): void {
    const sessionId = message.sessionId as string;

    if (!sessionId) {
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: 'INVALID_MESSAGE',
        message: 'Session ID is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    // Raw chunks joined without separator (preserves exact PTY output), plus the
    // tmux attach-mode preamble for tmux-backed sessions — the frontend resets
    // xterm before replaying, and a trimmed buffer no longer carries those modes.
    const buffer = this.cloudTerminalManager.getReplayBuffer(sessionId);

    if (buffer === undefined) {
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: 'SESSION_NOT_FOUND',
        message: `Session not found: ${sessionId}`,
        sessionId,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const response: WebSocketMessage = {
      type: 'cloud-terminal:buffer-response',
      sessionId,
      buffer,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }
}
