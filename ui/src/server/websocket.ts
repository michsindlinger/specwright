import { WebSocketServer, WebSocket, RawData } from 'ws';
import { Server } from 'http';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { projectDir, resolveCommandDir } from './utils/project-dirs.js';
import { ProjectManager } from './projects.js';
import { ClaudeHandler } from './claude-handler.js';
import { WorkflowExecutor } from './workflow-executor.js';
import { SpecsReader } from './specs-reader.js';
import { DocsReader } from './docs-reader.js';
import { webSocketManager } from './websocket-manager.service.js';
import { BacklogReader } from './backlog-reader.js';
import { ImageStorageService, type ImageInfo } from './image-storage.js';
import { queueHandler } from './handlers/queue.handler.js';
import { gitHandler } from './handlers/git.handler.js';
import { attachmentHandler } from './handlers/attachment.handler.js';
import { fileHandler } from './handlers/file.handler.js';
import {
  getAllProviders,
  getDefaultSelection,
  loadModelConfig,
  updateProvider,
  addProvider,
  removeProvider,
  addModel,
  removeModel,
  setDefaults,
  type ModelConfig,
  type Model,
  type ModelProvider
} from './model-config.js';
import { CloudTerminalManager } from './services/cloud-terminal-manager.js';
import { setupService, type StepOutput, type StepComplete } from './services/setup.service.js';
import type {
  CloudTerminalSessionId,
  CloudTerminalType,
  CloudTerminalModelConfig,
  CloudTerminalWorkflowMetadata
} from '../shared/types/cloud-terminal.protocol.js';

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
  private claudeHandler: ClaudeHandler;
  private workflowExecutor: WorkflowExecutor;
  private specsReader: SpecsReader;
  private docsReader: DocsReader;
  private backlogReader: BacklogReader;
  private imageStorageService: ImageStorageService;
  private attachmentHandler;
  private fileHandler;
  private cloudTerminalManager: CloudTerminalManager;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.projectManager = new ProjectManager();
    this.claudeHandler = new ClaudeHandler();
    this.workflowExecutor = new WorkflowExecutor();
    this.specsReader = new SpecsReader();
    this.docsReader = new DocsReader();
    this.backlogReader = new BacklogReader();
    this.imageStorageService = new ImageStorageService();
    this.attachmentHandler = attachmentHandler;
    this.fileHandler = fileHandler;
    this.cloudTerminalManager = new CloudTerminalManager(this.workflowExecutor.getTerminalManager());
    this.setupConnectionHandler();
    this.startHeartbeat();
    this.setupCloudTerminalListeners();
    this.setupSetupListeners();
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
        this.clients.delete(client.clientId);
      });

      // Handle errors
      client.on('error', (error: Error) => {
        console.error(`WebSocket error for client ${client.clientId}:`, error.message);
      });
    });
  }

  private handleMessage(client: WebSocketClient, data: RawData): void {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage;
      console.log(`Message from ${client.clientId}:`, message.type);

      switch (message.type) {
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
        case 'chat.send':
          this.handleChatSend(client, message);
          break;
        case 'chat.send.with-images':
          this.handleChatSendWithImages(client, message);
          break;
        case 'chat.history':
          this.handleChatHistory(client);
          break;
        case 'chat.clear':
          this.handleChatClear(client);
          break;
        case 'chat.settings.update':
          this.handleChatSettingsUpdate(client, message);
          break;
        case 'chat.settings.get':
          this.handleChatSettingsGet(client);
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
        case 'workflow.answer':
          this.handleWorkflowAnswer(client, message);
          break;
        case 'workflow.retry':
          this.handleWorkflowRetry(client, message);
          break;
        case 'workflow.interactive.start':
          this.handleWorkflowInteractiveStart(client, message);
          break;
        case 'workflow.interactive.input':
          this.handleWorkflowInteractiveInput(client, message);
          break;
        case 'workflow.interactive.answerBatch':
          this.handleWorkflowInteractiveAnswerBatch(client, message);
          break;
        case 'workflow.interactive.cancel':
          this.handleWorkflowInteractiveCancel(client, message);
          break;
        case 'specs.list':
          this.handleSpecsList(client);
          break;
        case 'specs.list-all':
          this.handleSpecsListAll(client, message);
          break;
        case 'specs.delete':
          this.handleSpecsDelete(client, message);
          break;
        case 'specs.kanban':
          this.handleSpecsKanban(client, message);
          break;
        case 'specs.story':
          this.handleSpecsStory(client, message);
          break;
        case 'specs.story.updateStatus':
          this.handleSpecsStoryUpdateStatus(client, message);
          break;
        case 'specs.story.updateModel':
          this.handleSpecsStoryUpdateModel(client, message);
          break;
        case 'specs.story.save':
          this.handleSpecsStorySave(client, message);
          break;
        case 'specs.read':
          this.handleSpecsRead(client, message);
          break;
        case 'specs.save':
          this.handleSpecsSave(client, message);
          break;
        case 'specs.files':
          this.handleSpecsFiles(client, message);
          break;
        case 'workflow.story.start':
          this.handleWorkflowStoryStart(client, message).catch((err) => {
            console.error('[WebSocket] Unhandled error in handleWorkflowStoryStart:', err);
          });
          break;
        case 'docs.list':
          this.handleDocsList(client);
          break;
        case 'docs.read':
          this.handleDocsRead(client, message);
          break;
        case 'docs.write':
          this.handleDocsWrite(client, message);
          break;
        case 'backlog.list':
          this.handleBacklogList(client);
          break;
        case 'backlog.kanban':
          this.handleBacklogKanban(client);
          break;
        case 'backlog.story-detail':
          this.handleBacklogStoryDetail(client, message);
          break;
        case 'backlog.story-status':
          this.handleBacklogStoryStatus(client, message);
          break;
        case 'backlog.story.model':
          this.handleBacklogStoryModel(client, message);
          break;
        case 'backlog.story.start':
          this.handleBacklogStoryStart(client, message);
          break;
        case 'backlog.story.save':
          this.handleBacklogStorySave(client, message);
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
        case 'settings.defaults.update':
          this.handleSettingsDefaultsUpdate(client, message);
          break;
        case 'queue.add':
          this.handleQueueAdd(client, message);
          break;
        case 'queue.remove':
          this.handleQueueRemove(client, message);
          break;
        case 'queue.reorder':
          this.handleQueueReorder(client, message);
          break;
        case 'queue.state':
          this.handleQueueState(client);
          break;
        case 'queue.clear':
          this.handleQueueClear(client);
          break;
        case 'queue.clearCompleted':
          this.handleQueueClearCompleted(client);
          break;
        case 'queue.start':
          this.handleQueueStart(client);
          break;
        case 'queue.stop':
          this.handleQueueStop(client);
          break;
        case 'queue.log.state':
          this.handleQueueLogState(client);
          break;
        case 'queue.story.complete':
          this.handleQueueStoryComplete(client, message);
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
        // Attachment Messages (SCA-001)
        case 'attachment:upload':
          this.handleAttachmentUpload(client, message);
          break;
        case 'attachment:list':
          this.handleAttachmentList(client, message);
          break;
        case 'attachment:delete':
          this.handleAttachmentDelete(client, message);
          break;
        case 'attachment:read':
          this.handleAttachmentRead(client, message);
          break;
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
          this.handleSetupStartDevteam(client, message);
          break;
        // Cloud Terminal Messages (CCT-001)
        case 'cloud-terminal:create':
          this.handleCloudTerminalCreate(client, message);
          break;
        case 'cloud-terminal:create-workflow':
          this.handleCloudTerminalCreateWorkflow(client, message);
          break;
        case 'cloud-terminal:close':
          this.handleCloudTerminalClose(client, message);
          break;
        case 'cloud-terminal:pause':
          this.handleCloudTerminalPause(client, message);
          break;
        case 'cloud-terminal:resume':
          this.handleCloudTerminalResume(client, message);
          break;
        case 'cloud-terminal:input':
          this.handleCloudTerminalInput(client, message);
          break;
        case 'cloud-terminal:resize':
          this.handleCloudTerminalResize(client, message);
          break;
        case 'cloud-terminal:list':
          this.handleCloudTerminalList(client, message);
          break;
        case 'cloud-terminal:buffer-request':
          this.handleCloudTerminalBufferRequest(client, message);
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

  private handleChatSend(client: WebSocketClient, message: WebSocketMessage): void {
    const content = message.content as string;
    const specId = message.specId as string | undefined;

    if (!content) {
      const errorResponse: WebSocketMessage = {
        type: 'chat.error',
        error: 'Message content is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'chat.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    this.claudeHandler.handleChatSend(client, content, projectPath, specId)
      .catch((error: Error) => {
        console.error('[Chat] Error in handleChatSend:', error);
        const errorResponse: WebSocketMessage = {
          type: 'chat.error',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        client.send(JSON.stringify(errorResponse));
      });
  }

  /**
   * CIMG-004: Handle chat messages with image attachments.
   * Processes images (stores base64 images via ImageStorageService) and forwards to ClaudeHandler.
   */
  private async handleChatSendWithImages(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const content = message.content as string || '';
    const images = message.images as Array<{
      data: string;
      mimeType: string;
      filename: string;
      isBase64: boolean;
    }> | undefined;

    // Require at least content or images
    if (!content && (!images || images.length === 0)) {
      const errorResponse: WebSocketMessage = {
        type: 'chat.send.with-images.error',
        error: 'Message content or images are required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'chat.send.with-images.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      // Process and store images
      const savedImages: ImageInfo[] = [];

      if (images && images.length > 0) {
        for (const image of images) {
          if (image.isBase64) {
            // Save base64 image to storage
            const result = await this.imageStorageService.saveImage(
              projectPath,
              image.data,
              image.filename,
              image.mimeType
            );

            if (result.success && result.imageInfo) {
              savedImages.push(result.imageInfo);
            } else {
              console.error(`[Chat] Failed to save image ${image.filename}:`, result.error);
              // Continue with other images even if one fails
            }
          } else {
            // Image is already a path reference - validate it exists
            const imageInfo = await this.imageStorageService.getImageInfo(projectPath, image.data);
            if (imageInfo) {
              savedImages.push(imageInfo);
            } else {
              console.warn(`[Chat] Image not found: ${image.data}`);
            }
          }
        }
      }

      // Forward to ClaudeHandler with images
      await this.claudeHandler.handleChatSendWithImages(
        client,
        content,
        projectPath,
        savedImages
      );

    } catch (error) {
      console.error('[Chat] Error in handleChatSendWithImages:', error);
      const errorResponse: WebSocketMessage = {
        type: 'chat.send.with-images.error',
        error: error instanceof Error ? error.message : 'Failed to process message with images',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  private handleChatHistory(client: WebSocketClient): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const response: WebSocketMessage = {
        type: 'chat.history',
        messages: [],
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
      return;
    }

    const messages = this.claudeHandler.getHistory(client.clientId, projectPath);
    const response: WebSocketMessage = {
      type: 'chat.history',
      messages,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private handleChatClear(client: WebSocketClient): void {
    const projectPath = this.getClientProjectPath(client);
    if (projectPath) {
      this.claudeHandler.clearHistory(client.clientId, projectPath);
    }
    const response: WebSocketMessage = {
      type: 'chat.cleared',
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private handleChatSettingsUpdate(client: WebSocketClient, message: WebSocketMessage): void {
    const providerId = message.providerId as string;
    const modelId = message.modelId as string;

    if (!providerId || !modelId) {
      const errorResponse: WebSocketMessage = {
        type: 'chat.error',
        error: 'Provider ID and Model ID are required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'chat.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const selectedModel = this.claudeHandler.updateModelSettings(
      client.clientId,
      projectPath,
      providerId,
      modelId
    );

    const response: WebSocketMessage = {
      type: 'chat.settings.response',
      selectedModel,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private handleChatSettingsGet(client: WebSocketClient): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'chat.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const selectedModel = this.claudeHandler.getModelSettings(
      client.clientId,
      projectPath
    );

    const response: WebSocketMessage = {
      type: 'chat.settings.response',
      selectedModel,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private handleModelList(client: WebSocketClient): void {
    const providers = getAllProviders();
    const defaultSelection = getDefaultSelection();

    // Transform providers to include providerId in each model
    const transformedProviders = providers.map(provider => ({
      id: provider.id,
      name: provider.name,
      models: provider.models.map(model => ({
        id: model.id,
        name: model.name,
        description: model.description,
        providerId: provider.id
      }))
    }));

    const response: WebSocketMessage = {
      type: 'model.list',
      providers: transformedProviders,
      defaultSelection,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private handleModelProvidersList(client: WebSocketClient): void {
    const providers = getAllProviders();

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

  private handleWorkflowAnswer(client: WebSocketClient, message: WebSocketMessage): void {
    const executionId = message.executionId as string;
    const questionId = message.questionId as string;
    const answers = message.answers as string[] | string;

    if (!executionId || !questionId) {
      const errorResponse: WebSocketMessage = {
        type: 'workflow.error',
        error: 'Execution ID and Question ID are required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    if (answers === undefined || answers === null) {
      const errorResponse: WebSocketMessage = {
        type: 'workflow.error',
        error: 'Answer is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const success = this.workflowExecutor.submitAnswer(executionId, questionId, answers);

    const response: WebSocketMessage = {
      type: 'workflow.answer.ack',
      executionId,
      questionId,
      success,
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

  private handleWorkflowInteractiveInput(client: WebSocketClient, message: WebSocketMessage): void {
    const executionId = message.executionId as string;
    const input = message.input as string;
    const questionId = message.questionId as string | undefined;

    if (!executionId) {
      const errorResponse: WebSocketMessage = {
        type: 'workflow.interactive.error',
        error: 'Execution ID is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    if (!input) {
      const errorResponse: WebSocketMessage = {
        type: 'workflow.interactive.error',
        error: 'Input is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    // If questionId is provided, use submitAnswer; otherwise handle as generic input
    if (questionId) {
      const success = this.workflowExecutor.submitAnswer(executionId, questionId, input);
      const response: WebSocketMessage = {
        type: 'workflow.interactive.input.ack',
        executionId,
        questionId,
        success,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } else {
      // Generic input without a specific question - just acknowledge
      const response: WebSocketMessage = {
        type: 'workflow.interactive.input.ack',
        executionId,
        success: true,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    }
  }

  /**
   * MQP-002: Handle batch answer submission from frontend
   */
  private handleWorkflowInteractiveAnswerBatch(client: WebSocketClient, message: WebSocketMessage): void {
    const executionId = message.executionId as string;
    const batchId = message.batchId as string;
    const answers = message.answers as Array<{ questionId: string; answer: string | string[]; isOther: boolean }>;

    if (!executionId) {
      const errorResponse: WebSocketMessage = {
        type: 'workflow.interactive.error',
        error: 'Execution ID is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    if (!batchId) {
      const errorResponse: WebSocketMessage = {
        type: 'workflow.interactive.error',
        error: 'Batch ID is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    if (!answers || !Array.isArray(answers)) {
      const errorResponse: WebSocketMessage = {
        type: 'workflow.interactive.error',
        error: 'Answers array is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    // Convert answers array to Record<string, string | string[]>
    const answersRecord: Record<string, string | string[]> = {};
    for (const ans of answers) {
      answersRecord[ans.questionId] = ans.answer;
    }

    const success = this.workflowExecutor.submitAnswerBatch(executionId, batchId, answersRecord);

    const response: WebSocketMessage = {
      type: 'workflow.interactive.answerBatch.ack',
      executionId,
      batchId,
      success,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
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

  public shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss.clients.forEach((client) => {
      client.close();
    });
    this.wss.close();
    // MPRO-005: Clean up WebSocketManager
    webSocketManager.shutdown();
  }

  private async handleSpecsList(client: WebSocketClient): Promise<void> {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const specs = await this.specsReader.listSpecs(projectPath);
    const response: WebSocketMessage = {
      type: 'specs.list',
      specs,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  /**
   * GSQ-002: Handle specs.list-all - lists specs from ALL open projects.
   * Uses projects from the message (sent by frontend) if available,
   * falls back to config.json for backward compatibility.
   */
  private async handleSpecsListAll(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const messageProjects = message.projects as Array<{ path: string; name: string }> | undefined;

    const allProjects = (messageProjects && messageProjects.length > 0)
      ? messageProjects.filter(p => this.projectManager.validatePath(p.path))
      : this.projectManager.listProjects()
          .filter(p => p.exists)
          .map(p => ({ path: p.path, name: p.name }));

    const projects = await this.specsReader.listAllSpecs(allProjects);

    // Enrich each project with backlog summary
    const enrichedProjects = await Promise.all(
      projects.map(async (project: { projectPath: string; projectName: string; specs: unknown[] }) => {
        try {
          const backlog = await this.backlogReader.getKanbanBoard(project.projectPath);
          const stories = backlog.stories || [];
          const openCount = stories.filter(s => s.status === 'backlog' || s.status === 'blocked').length;
          const inProgressCount = stories.filter(s => s.status === 'in_progress' || s.status === 'in_review').length;
          const completedCount = stories.filter(s => s.status === 'done').length;
          return {
            ...project,
            backlog: stories.length > 0 ? {
              itemCount: stories.length,
              openCount,
              inProgressCount,
              completedCount,
            } : undefined,
          };
        } catch {
          return project;
        }
      })
    );

    const response: WebSocketMessage = {
      type: 'specs.list-all',
      projects: enrichedProjects,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private async handleSpecsDelete(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const specId = message.specId as string;
    if (!specId) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.delete',
        success: false,
        error: 'Spec ID is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.delete',
        success: false,
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      const success = await this.specsReader.deleteSpec(projectPath, specId);
      const response: WebSocketMessage = {
        type: 'specs.delete',
        success,
        specId,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.delete',
        success: false,
        specId,
        error: error instanceof Error ? error.message : 'Failed to delete spec',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  private async handleSpecsKanban(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const specId = message.specId as string;

    if (!specId) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.error',
        error: 'Spec ID is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    // First check if kanban board exists, if not initialize it
    let kanban = await this.specsReader.getKanbanBoard(projectPath, specId);

    if (!kanban.hasKanbanFile && kanban.stories.length > 0) {
      // Auto-initialize kanban board on first view
      try {
        await this.specsReader.initializeKanbanBoard(projectPath, specId);
        // Re-fetch the kanban board after initialization
        kanban = await this.specsReader.getKanbanBoard(projectPath, specId);
      } catch (error) {
        console.error('Failed to auto-initialize kanban board:', error);
        // Continue with uninitialized board as fallback
      }
    }

    const response: WebSocketMessage = {
      type: 'specs.kanban',
      kanban,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private async handleSpecsStory(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const specId = message.specId as string;
    const storyId = message.storyId as string;

    if (!specId || !storyId) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.error',
        error: 'Spec ID and Story ID are required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const story = await this.specsReader.getStoryDetail(projectPath, specId, storyId);
    if (!story) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.error',
        error: 'Story not found',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    // Transform relative attachment paths to API URLs (images and file links)
    const encodedPath = encodeURIComponent(projectPath);
    story.content = story.content.replace(
      /(!?)\[([^\]]*)\]\(attachments\//g,
      `$1[$2](/api/attachments/${encodedPath}/spec/${specId}/`
    );

    const response: WebSocketMessage = {
      type: 'specs.story',
      story,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  /**
   * Handle story status update from kanban drag & drop.
   * Persists the status change to the kanban-board.md file.
   */
  private async handleSpecsStoryUpdateStatus(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const specId = message.specId as string;
    const storyId = message.storyId as string;
    const status = message.status as 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked';

    if (!specId || !storyId || !status) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.story.updateStatus.error',
        error: 'Spec ID, Story ID, and status are required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.story.updateStatus.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      await this.specsReader.updateStoryStatus(
        projectPath,
        specId,
        storyId,
        status
      );

      const response: WebSocketMessage = {
        type: 'specs.story.updateStatus.ack',
        specId,
        storyId,
        status,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.story.updateStatus.error',
        error: error instanceof Error ? error.message : 'Failed to update story status',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * MSK-002: Handle story model update from dropdown selection.
   * Persists the model change to the kanban-board.md file.
   */
  private async handleSpecsStoryUpdateModel(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    console.log('[WebSocket] handleSpecsStoryUpdateModel called with:', JSON.stringify(message, null, 2));

    const specId = message.specId as string;
    const storyId = message.storyId as string;
    const model = message.model as string;

    console.log(`[WebSocket] Parsed: specId=${specId}, storyId=${storyId}, model=${model}`);

    if (!specId || !storyId || !model) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.story.updateModel.error',
        error: 'Spec ID, Story ID, and model are required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    // MSK-003-FIX: Validate model value against all configured models (not just Anthropic)
    const allModels = getAllProviders().flatMap(p => p.models.map(m => m.id));
    if (!allModels.includes(model)) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.story.updateModel.error',
        error: `Invalid model value: ${model}. Must be one of: ${allModels.join(', ')}`,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.story.updateModel.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      await this.specsReader.updateStoryModel(
        projectPath,
        specId,
        storyId,
        model  // MSK-003-FIX: Pass any valid model ID, not just Anthropic
      );

      const response: WebSocketMessage = {
        type: 'specs.story.updateModel.ack',
        specId,
        storyId,
        model,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.story.updateModel.error',
        error: error instanceof Error ? error.message : 'Failed to update story model',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * Handle specs.story.save - saves story markdown file content
   */
  private async handleSpecsStorySave(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const specId = message.specId as string;
    const storyId = message.storyId as string;
    const content = message.content as string;

    if (!specId || !storyId) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.story.save.error',
        error: 'Spec ID and Story ID are required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    if (content === undefined || content === null) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.story.save.error',
        error: 'Content is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.story.save.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      // Find the story file
      const storiesPath = projectDir(projectPath, 'specs', specId, 'stories');
      const files = await fs.readdir(storiesPath);
      const storyFile = files.find(f => {
        const idMatch = f.match(/story-(\d+)/);
        if (idMatch) {
          return storyId.includes(idMatch[1]) || storyId.endsWith(idMatch[1]);
        }
        return false;
      });

      if (!storyFile) {
        const errorResponse: WebSocketMessage = {
          type: 'specs.story.save.error',
          error: `Story file not found: ${storyId}`,
          timestamp: new Date().toISOString()
        };
        client.send(JSON.stringify(errorResponse));
        return;
      }

      // Write the story file
      const storyFilePath = join(storiesPath, storyFile);
      await fs.writeFile(storyFilePath, content, 'utf-8');

      const response: WebSocketMessage = {
        type: 'specs.story.save',
        specId,
        storyId,
        content,
        success: true,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.story.save.error',
        error: error instanceof Error ? error.message : 'Failed to save story',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * Handle specs.read - reads spec.md or spec-lite.md content
   */
  private async handleSpecsRead(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const specId = message.specId as string;
    const fileType = message.fileType as 'spec' | 'spec-lite' | undefined;
    const relativePath = message.relativePath as string | undefined;

    if (!specId || (!fileType && !relativePath)) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.read.error',
        error: 'Spec ID and either fileType or relativePath are required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.read.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      // SDVE-001: Support relativePath alongside legacy fileType
      const resolvedRelativePath = relativePath || (fileType === 'spec' ? 'spec.md' : 'spec-lite.md');

      const result = await this.specsReader.readSpecFile(projectPath, specId, resolvedRelativePath);

      if (!result) {
        const errorResponse: WebSocketMessage = {
          type: 'specs.read.error',
          error: 'File not found or invalid path',
          timestamp: new Date().toISOString()
        };
        client.send(JSON.stringify(errorResponse));
        return;
      }

      const response: WebSocketMessage = {
        type: 'specs.read',
        specId,
        fileType: fileType || null,
        relativePath: resolvedRelativePath,
        filename: result.filename,
        content: result.content,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.read.error',
        error: error instanceof Error ? error.message : 'Failed to read spec file',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * Handle specs.save - saves spec.md, spec-lite.md, or any .md file via relativePath
   * SDVE-001: Extended with relativePath parameter, backward-compatible with fileType
   */
  private async handleSpecsSave(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const specId = message.specId as string;
    const fileType = message.fileType as 'spec' | 'spec-lite' | undefined;
    const relativePath = message.relativePath as string | undefined;
    const content = message.content as string;

    if (!specId || (!fileType && !relativePath)) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.save.error',
        error: 'Spec ID and either fileType or relativePath are required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    if (content === undefined || content === null) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.save.error',
        error: 'Content is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.save.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      // SDVE-001: Support relativePath alongside legacy fileType
      const resolvedRelativePath = relativePath || (fileType === 'spec' ? 'spec.md' : 'spec-lite.md');

      const result = await this.specsReader.saveSpecFile(projectPath, specId, resolvedRelativePath, content);

      if (!result.success) {
        const errorResponse: WebSocketMessage = {
          type: 'specs.save.error',
          error: result.error || 'Failed to save file',
          timestamp: new Date().toISOString()
        };
        client.send(JSON.stringify(errorResponse));
        return;
      }

      const response: WebSocketMessage = {
        type: 'specs.save',
        specId,
        fileType: fileType || null,
        relativePath: resolvedRelativePath,
        filename: resolvedRelativePath.split('/').pop() || resolvedRelativePath,
        content,
        success: true,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.save.error',
        error: error instanceof Error ? error.message : 'Failed to save spec file',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * SDVE-001: Handle specs.files - lists all markdown files in a spec folder
   */
  private async handleSpecsFiles(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const specId = message.specId as string;

    if (!specId) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.files.error',
        error: 'Spec ID is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.files.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      const groups = await this.specsReader.listSpecFiles(projectPath, specId);
      const response: WebSocketMessage = {
        type: 'specs.files',
        specId,
        groups,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'specs.files.error',
        error: error instanceof Error ? error.message : 'Failed to list spec files',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * KSE-003/KSE-005: Handle workflow.story.start - triggered when story is dragged to In Progress
   * Updates kanban status and starts workflow execution for the specific story.
   * Supports gitStrategy parameter for branch/worktree selection.
   */
  private async handleWorkflowStoryStart(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    console.log('[WebSocket] handleWorkflowStoryStart called with:', { specId: message.specId, storyId: message.storyId, gitStrategy: message.gitStrategy, model: message.model, autoMode: message.autoMode });
    const specId = message.specId as string;
    const storyId = message.storyId as string;
    const gitStrategy = (message.gitStrategy as 'branch' | 'worktree' | 'current-branch') || 'branch';
    // MSK-003-FIX: Prefer model from message (sent by frontend before updateStatus races)
    const modelFromMessage = message.model as string | undefined;
    const autoMode = message.autoMode === true;

    if (!specId || !storyId) {
      const errorResponse: WebSocketMessage = {
        type: 'workflow.story.error',
        error: 'Spec ID and Story ID are required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'workflow.story.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      // MSK-003-FIX: Use model from message if provided, otherwise read from kanban
      let model = modelFromMessage;
      if (!model) {
        const kanban = await this.specsReader.getKanbanBoard(projectPath, specId);
        const story = kanban.stories.find(s => s.id === storyId);
        model = story?.model || 'opus';
      }
      console.log(`[WebSocket] Story ${storyId} using model: ${model} (from ${modelFromMessage ? 'message' : 'kanban'})`);

      // Update kanban board status to in_progress
      await this.specsReader.updateStoryStatus(
        projectPath,
        specId,
        storyId,
        'in_progress'
      );

      // KSE-005: Start the workflow executor with git strategy
      // The workflow executor will handle branch/worktree creation
      // MSK-003-FIX: Pass model to startStoryExecution
      const executionId = await this.workflowExecutor.startStoryExecution(
        client,
        specId,
        storyId,
        projectPath,
        gitStrategy,
        model,  // Pass model to workflow executor
        autoMode  // Pass auto-mode flag to control auto-continuation
      );

      // MPRO-005: Mark workflow active in WebSocketManager and broadcast to project
      webSocketManager.markWorkflowActive(projectPath);

      // Broadcast running count to all clients
      this.broadcastRunningCount();
      this.broadcastRunningCountToProject(projectPath);

      const response: WebSocketMessage = {
        type: 'workflow.story.start.ack',
        executionId,
        specId,
        storyId,
        gitStrategy,
        projectId: projectPath,
        model,  // Add model to response (MSK-003)
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      console.error('[WebSocket] handleWorkflowStoryStart error:', error);
      const errorResponse: WebSocketMessage = {
        type: 'workflow.story.error',
        error: error instanceof Error ? error.message : 'Failed to start story workflow',
        specId,
        storyId,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  private async handleDocsList(client: WebSocketClient): Promise<void> {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'docs.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const result = await this.docsReader.listDocs(projectPath);
    const response: WebSocketMessage = {
      type: 'docs.list',
      files: result.files,
      message: result.message,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private async handleDocsRead(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const filename = message.filename as string;

    if (!filename) {
      const errorResponse: WebSocketMessage = {
        type: 'docs.error',
        error: 'Filename is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'docs.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const doc = await this.docsReader.readDoc(projectPath, filename);
    if (!doc) {
      const errorResponse: WebSocketMessage = {
        type: 'docs.error',
        error: 'Datei nicht gefunden',
        code: 404,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const response: WebSocketMessage = {
      type: 'docs.read',
      filename: doc.filename,
      content: doc.content,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private async handleDocsWrite(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const filename = message.filename as string;
    const content = message.content as string;

    if (!filename) {
      const errorResponse: WebSocketMessage = {
        type: 'docs.error',
        error: 'Filename is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    if (content === undefined || content === null) {
      const errorResponse: WebSocketMessage = {
        type: 'docs.error',
        error: 'Content is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'docs.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const result = await this.docsReader.writeDoc(projectPath, filename, content);

    if (!result.success) {
      const errorResponse: WebSocketMessage = {
        type: 'docs.error',
        error: result.error || 'Fehler beim Speichern',
        code: 400,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const response: WebSocketMessage = {
      type: 'docs.write',
      success: true,
      timestamp: result.timestamp
    };
    client.send(JSON.stringify(response));
  }

  private async handleBacklogList(client: WebSocketClient): Promise<void> {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'backlog.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const items = await this.backlogReader.listBacklogItems(projectPath);
    const response: WebSocketMessage = {
      type: 'backlog.list',
      items,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private async handleBacklogKanban(client: WebSocketClient): Promise<void> {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'backlog.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const kanban = await this.backlogReader.getKanbanBoard(projectPath);
    const response: WebSocketMessage = {
      type: 'backlog.kanban',
      kanban,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }

  private async handleBacklogStoryDetail(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'backlog.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const storyId = message.storyId as string;
    if (!storyId) {
      const errorResponse: WebSocketMessage = {
        type: 'backlog.error',
        error: 'Missing storyId',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    // Read story details from backlog-index.json
    const backlogPath = projectDir(projectPath, 'backlog', 'backlog-index.json');
    try {
      const backlogContent = await fs.readFile(backlogPath, 'utf-8');
      const backlogJson = JSON.parse(backlogContent) as { items: Array<{ id: string; title: string; type: string; priority: string; effort?: number; status: string; rootCause?: string; file?: string; storyFile?: string }> };
      const item = backlogJson.items.find((i: typeof backlogJson.items[0]) => i.id === storyId);

      if (!item) {
        const errorResponse: WebSocketMessage = {
          type: 'backlog.error',
          error: `Story not found: ${storyId}`,
          timestamp: new Date().toISOString()
        };
        client.send(JSON.stringify(errorResponse));
        return;
      }

      // Read the story file content (support both 'file' and legacy 'storyFile' field)
      const fileRef = item.file || item.storyFile;
      const storyFilePath = projectDir(projectPath, 'backlog', fileRef || '');
      let storyContent = await fs.readFile(storyFilePath, 'utf-8');

      // Transform relative attachment paths to API URLs (images and file links)
      const encodedPath = encodeURIComponent(projectPath);
      storyContent = storyContent.replace(
        /(!?)\[([^\]]*)\]\(attachments\//g,
        `$1[$2](/api/backlog/${encodedPath}/attachments/`
      );

      const response: WebSocketMessage = {
        type: 'backlog.story-detail',
        story: {
          id: item.id,
          title: item.title,
          type: item.type,
          priority: item.priority,
          effort: item.effort,
          status: item.status,
          rootCause: item.rootCause,
          content: storyContent
        },
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (err) {
      const errorResponse: WebSocketMessage = {
        type: 'backlog.error',
        error: `Failed to load story: ${err}`,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  private async handleBacklogStoryStatus(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'backlog.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const storyId = message.storyId as string;
    const newStatus = message.status as string;

    if (!storyId || !newStatus) {
      const errorResponse: WebSocketMessage = {
        type: 'backlog.error',
        error: 'Missing storyId or status',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    // Update status in backlog-index.json
    const backlogPath = projectDir(projectPath, 'backlog', 'backlog-index.json');
    try {
      const backlogContent = await fs.readFile(backlogPath, 'utf-8');
      const backlogJson = JSON.parse(backlogContent) as {
        items: Array<{ id: string; status: string; updatedAt?: string; completedAt?: string }>;
        statistics?: { byStatus: Record<string, number> };
        metadata?: { lastUpdated: string };
      };
      const itemIndex = backlogJson.items.findIndex((i: typeof backlogJson.items[0]) => i.id === storyId);

      if (itemIndex === -1) {
        const errorResponse: WebSocketMessage = {
          type: 'backlog.error',
          error: `Story not found: ${storyId}`,
          timestamp: new Date().toISOString()
        };
        client.send(JSON.stringify(errorResponse));
        return;
      }

      // Map UI status to JSON status (UKB-003: added 'blocked' and 'in_review')
      const statusMap: Record<string, string> = {
        'backlog': 'open',
        'in_progress': 'in_progress',
        'in_review': 'in_review',
        'blocked': 'blocked',
        'done': 'done'
      };

      backlogJson.items[itemIndex].status = statusMap[newStatus] || newStatus;
      if (newStatus === 'done') {
        backlogJson.items[itemIndex].completedAt = new Date().toISOString();
      }

      // Update statistics if present (UKB-003: added 'blocked' and 'in_review')
      if (backlogJson.statistics) {
        backlogJson.statistics.byStatus = {
          open: 0,
          in_progress: 0,
          in_review: 0,
          blocked: 0,
          done: 0
        };

        for (const item of backlogJson.items) {
          const status = item.status as string;
          if (status in backlogJson.statistics.byStatus) {
            backlogJson.statistics.byStatus[status]++;
          }
        }
      }

      // Write updated backlog-index.json
      await fs.writeFile(backlogPath, JSON.stringify(backlogJson, null, 2));

      // Send updated kanban to all clients
      const kanban = await this.backlogReader.getKanbanBoard(projectPath);
      const response: WebSocketMessage = {
        type: 'backlog.kanban',
        kanban,
        timestamp: new Date().toISOString()
      };
      webSocketManager.sendToProject(projectPath, response);
    } catch (err) {
      const errorResponse: WebSocketMessage = {
        type: 'backlog.error',
        error: `Failed to update status: ${err}`,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  private async handleBacklogStoryModel(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'backlog.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const storyId = message.storyId as string;
    const model = message.model as string;

    if (!storyId || !model) {
      const errorResponse: WebSocketMessage = {
        type: 'backlog.error',
        error: 'Missing storyId or model',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    // Update model in backlog-index.json
    const backlogPath = projectDir(projectPath, 'backlog', 'backlog-index.json');
    try {
      const backlogContent = await fs.readFile(backlogPath, 'utf-8');
      const backlogJson = JSON.parse(backlogContent) as {
        items: Array<{ id: string; model?: string; updatedAt?: string }>;
        metadata?: { lastUpdated: string };
      };
      const itemIndex = backlogJson.items.findIndex((i: typeof backlogJson.items[0]) => i.id === storyId);

      if (itemIndex === -1) {
        const errorResponse: WebSocketMessage = {
          type: 'backlog.error',
          error: `Story not found: ${storyId}`,
          timestamp: new Date().toISOString()
        };
        client.send(JSON.stringify(errorResponse));
        return;
      }

      backlogJson.items[itemIndex].model = model;

      // Write updated backlog-index.json
      await fs.writeFile(backlogPath, JSON.stringify(backlogJson, null, 2));

      // Send updated kanban to all clients
      const kanban = await this.backlogReader.getKanbanBoard(projectPath);
      const response: WebSocketMessage = {
        type: 'backlog.kanban',
        kanban,
        timestamp: new Date().toISOString()
      };
      webSocketManager.sendToProject(projectPath, response);
    } catch (err) {
      const errorResponse: WebSocketMessage = {
        type: 'backlog.error',
        error: `Failed to update model: ${err}`,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * BKE-001: Handle backlog.story.start - triggered when backlog story is dragged to In Progress
   * Starts workflow execution for the specific backlog story using single-story mode.
   */
  private async handleBacklogStoryStart(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    console.log('[WebSocket] handleBacklogStoryStart called with:', { storyId: message.storyId, model: message.model });

    const storyId = message.storyId as string;
    const model = (message.model as string) || 'opus';

    if (!storyId) {
      const errorResponse: WebSocketMessage = {
        type: 'backlog.story.start.error',
        error: 'Story ID is required',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'backlog.story.start.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      console.log(`[WebSocket] Starting backlog story execution: ${storyId} with model: ${model}`);

      // BKE-001: Start the workflow executor with single-story mode
      const executionId = await this.workflowExecutor.startBacklogStoryExecution(
        client,
        projectPath,
        storyId,
        model
      );

      // MPRO-005: Mark workflow active in WebSocketManager and broadcast to project
      webSocketManager.markWorkflowActive(projectPath);
      this.broadcastRunningCount();
      this.broadcastRunningCountToProject(projectPath);

      const response: WebSocketMessage = {
        type: 'backlog.story.start.ack',
        executionId,
        storyId,
        projectId: projectPath,
        model,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      console.error('[WebSocket] handleBacklogStoryStart error:', error);
      const errorResponse: WebSocketMessage = {
        type: 'backlog.story.start.error',
        error: error instanceof Error ? error.message : 'Failed to start backlog story workflow',
        storyId,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * Handle backlog.story.save - saves story markdown file content
   */
  private async handleBacklogStorySave(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      const errorResponse: WebSocketMessage = {
        type: 'backlog.story.save.error',
        error: 'No project selected',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const storyId = message.storyId as string;
    const content = message.content as string;

    if (!storyId) {
      const errorResponse: WebSocketMessage = {
        type: 'backlog.story.save.error',
        error: 'Missing storyId',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    if (content === undefined || content === null) {
      const errorResponse: WebSocketMessage = {
        type: 'backlog.story.save.error',
        error: 'Missing content',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      // Read story details from backlog-index.json to get the file path
      const backlogPath = projectDir(projectPath, 'backlog', 'backlog-index.json');
      const backlogContent = await fs.readFile(backlogPath, 'utf-8');
      const backlogJson = JSON.parse(backlogContent) as { items: Array<{ id: string; file?: string; storyFile?: string }> };
      const item = backlogJson.items.find((i: typeof backlogJson.items[0]) => i.id === storyId);

      if (!item) {
        const errorResponse: WebSocketMessage = {
          type: 'backlog.story.save.error',
          error: `Story not found: ${storyId}`,
          timestamp: new Date().toISOString()
        };
        client.send(JSON.stringify(errorResponse));
        return;
      }

      // Write the story file (support both 'file' and legacy 'storyFile' field)
      const fileRef = item.file || item.storyFile;
      const storyFilePath = projectDir(projectPath, 'backlog', fileRef || '');
      await fs.writeFile(storyFilePath, content, 'utf-8');

      const response: WebSocketMessage = {
        type: 'backlog.story.save',
        storyId,
        content,
        success: true,
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      const errorResponse: WebSocketMessage = {
        type: 'backlog.story.save.error',
        error: error instanceof Error ? error.message : 'Failed to save story',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
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
   * SKQ-004/GSQ-001: Handle queue.add message.
   * Adds a spec to the global queue. projectPath comes from message payload.
   */
  private handleQueueAdd(client: WebSocketClient, message: WebSocketMessage): void {
    queueHandler.handleAdd(client, message);
  }

  /**
   * SKQ-004/GSQ-001: Handle queue.remove message.
   * Removes a queue item by ID (global queue, no projectPath needed).
   */
  private handleQueueRemove(client: WebSocketClient, message: WebSocketMessage): void {
    queueHandler.handleRemove(client, message);
  }

  /**
   * SKQ-004/GSQ-001: Handle queue.reorder message.
   * Reorders queue items (global queue, no projectPath needed).
   */
  private handleQueueReorder(client: WebSocketClient, message: WebSocketMessage): void {
    queueHandler.handleReorder(client, message);
  }

  /**
   * SKQ-004/GSQ-001: Handle queue.state message.
   * Returns the global queue state.
   */
  private handleQueueState(client: WebSocketClient): void {
    queueHandler.handleGetState(client);
  }

  /**
   * SKQ-004/GSQ-001: Handle queue.clear message.
   * Clears the entire global queue.
   */
  private handleQueueClear(client: WebSocketClient): void {
    queueHandler.handleClear(client);
  }

  /**
   * SKQ-004/GSQ-001: Handle queue.clearCompleted message.
   * Removes all completed items from the global queue.
   */
  private handleQueueClearCompleted(client: WebSocketClient): void {
    queueHandler.handleClearCompleted(client);
  }

  /**
   * SKQ-005/GSQ-001: Handle queue.start message.
   * Starts global queue execution.
   */
  private handleQueueStart(client: WebSocketClient): void {
    const firstItem = queueHandler.handleStart(client);

    // If a spec was started, we need to trigger the workflow execution
    // Use the projectPath from the queue item itself
    if (firstItem) {
      this.triggerSpecExecution(client, firstItem.projectPath, firstItem);
    }
  }

  /**
   * SKQ-005/GSQ-001: Handle queue.stop message.
   * Stops global queue execution after current spec completes.
   */
  private handleQueueStop(client: WebSocketClient): void {
    queueHandler.handleStop(client);
  }

  /**
   * GSQ-003: Handle queue.log.state message.
   * Returns all current execution log entries to the requesting client.
   */
  private handleQueueLogState(client: WebSocketClient): void {
    queueHandler.handleGetLogState(client);
  }

  /**
   * SKQ-005/GSQ-001: Handle queue.story.complete message from frontend.
   * Called when a story completes while queue is running without a selected spec.
   * Advances to next story in spec or next spec in queue.
   * projectPath comes from message payload or queue item.
   */
  private async handleQueueStoryComplete(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    const specId = message.specId as string;
    const storyId = message.storyId as string;
    const projectPath = message.projectPath as string;

    if (!specId || !storyId) {
      console.log('[WebSocket] queue.story.complete missing specId or storyId');
      return;
    }

    // Get projectPath from message payload or fall back to queue item lookup
    let resolvedProjectPath = projectPath;
    if (!resolvedProjectPath) {
      const queueItem = queueHandler.getItemBySpecId(this.getClientProjectPath(client) || '', specId);
      resolvedProjectPath = queueItem?.projectPath || this.getClientProjectPath(client) || '';
    }

    if (!resolvedProjectPath) {
      console.log('[WebSocket] queue.story.complete: No project path available');
      return;
    }

    // Check if queue is still running
    const queueState = queueHandler.getState();
    if (!queueState.isQueueRunning) {
      console.log('[WebSocket] queue.story.complete: Queue not running');
      return;
    }

    console.log(`[WebSocket] Queue story complete: ${specId}/${storyId} (project: ${resolvedProjectPath})`);

    // Log story completion
    const currentQueueItem = queueHandler.getItemBySpecId(resolvedProjectPath, specId);
    const storyTitle = (message.storyTitle as string) || storyId;
    if (currentQueueItem) {
      queueHandler.logStoryEvent(
        'story-complete',
        currentQueueItem.projectPath,
        currentQueueItem.projectName,
        currentQueueItem.specId,
        currentQueueItem.specName,
        storyId,
        storyTitle,
        `Story abgeschlossen: ${storyTitle}`
      );
    }

    try {
      // Check if this is a backlog item (specId === 'backlog')
      if (specId === 'backlog') {
        // Backlog execution: find next backlog story
        const backlog = await this.backlogReader.getKanbanBoard(resolvedProjectPath);
        const nextStory = backlog.stories.find(s => s.status === 'backlog');

        if (nextStory) {
          console.log(`[WebSocket] Starting next backlog story: ${nextStory.id}`);
          const queueItem = queueHandler.getItemBySpecId(resolvedProjectPath, specId);

          if (queueItem) {
            queueHandler.logStoryEvent(
              'story-start',
              queueItem.projectPath,
              queueItem.projectName,
              queueItem.specId,
              queueItem.specName,
              nextStory.id,
              nextStory.title || nextStory.id,
              `Backlog-Story gestartet: ${nextStory.title || nextStory.id}`
            );
          }

          const executionId = await this.workflowExecutor.startBacklogStoryExecution(
            client,
            resolvedProjectPath,
            nextStory.id,
            nextStory.model || 'opus'
          );

          console.log(`[WebSocket] Next backlog story execution started: ${executionId}`);
        } else {
          // All backlog stories done - advance to next queue item
          console.log(`[WebSocket] Backlog complete for ${resolvedProjectPath}, checking next queue item`);

          const nextItem = queueHandler.handleSpecComplete(resolvedProjectPath, specId, true);

          if (nextItem) {
            console.log(`[WebSocket] Starting next queue item: ${nextItem.specId} (project: ${nextItem.projectPath})`);
            await this.triggerSpecExecution(client, nextItem.projectPath, nextItem);
          } else {
            console.log('[WebSocket] Queue execution complete');
          }
        }
      } else {
        // Spec execution: find next spec story
        const kanban = await this.specsReader.getKanbanBoard(resolvedProjectPath, specId);
        const nextStory = kanban.stories.find(s => s.status === 'backlog');

        if (nextStory) {
          // Start next story in same spec
          console.log(`[WebSocket] Starting next story: ${nextStory.id}`);
          const queueItem = queueHandler.getItemBySpecId(resolvedProjectPath, specId);

          // Log story start
          if (queueItem) {
            queueHandler.logStoryEvent(
              'story-start',
              queueItem.projectPath,
              queueItem.projectName,
              queueItem.specId,
              queueItem.specName,
              nextStory.id,
              nextStory.title || nextStory.id,
              `Story gestartet: ${nextStory.title || nextStory.id}`
            );
          }

          const executionId = await this.workflowExecutor.startStoryExecution(
            client,
            specId,
            nextStory.id,
            resolvedProjectPath,
            queueItem?.gitStrategy || 'branch',
            nextStory.model || 'opus',
            true  // queue stories always auto-continue
          );

          console.log(`[WebSocket] Next story execution started: ${executionId}`);
        } else {
          // All stories in this spec are done - advance to next spec
          console.log(`[WebSocket] Spec ${specId} complete, checking for next spec in queue`);

          const nextItem = queueHandler.handleSpecComplete(resolvedProjectPath, specId, true);

          if (nextItem) {
            // Start next spec - use the next item's projectPath
            console.log(`[WebSocket] Starting next spec: ${nextItem.specId} (project: ${nextItem.projectPath})`);
            await this.triggerSpecExecution(client, nextItem.projectPath, nextItem);
          } else {
            console.log('[WebSocket] Queue execution complete');
          }
        }
      }
    } catch (error) {
      console.error(`[WebSocket] Error advancing queue: ${error}`);

      // Log error
      if (currentQueueItem) {
        queueHandler.logStoryEvent(
          'error',
          currentQueueItem.projectPath,
          currentQueueItem.projectName,
          currentQueueItem.specId,
          currentQueueItem.specName,
          storyId,
          storyTitle,
          `Fehler bei Queue-Ausführung: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Mark current spec as failed
      queueHandler.handleSpecComplete(resolvedProjectPath, specId, false);
    }
  }

  /**
   * SKQ-005: Trigger spec execution for a queue item.
   * Starts the workflow executor for the given spec.
   */
  private async triggerSpecExecution(
    client: WebSocketClient,
    projectPath: string,
    queueItem: { specId: string; specName: string; gitStrategy?: 'branch' | 'worktree' | 'current-branch'; itemType?: 'spec' | 'backlog' }
  ): Promise<void> {
    // Route to backlog execution if itemType is 'backlog'
    if (queueItem.itemType === 'backlog') {
      await this.triggerBacklogExecution(client, projectPath, queueItem);
      return;
    }

    try {
      console.log(`[WebSocket] Triggering spec execution for ${queueItem.specId}`);

      // Use the existing workflow story start mechanism
      // Find the first story in the spec to start (or use auto-mode)
      const kanban = await this.specsReader.getKanbanBoard(projectPath, queueItem.specId);

      // Get first story in backlog
      const firstStory = kanban.stories.find(s => s.status === 'backlog');

      if (firstStory) {
        // Start the workflow using existing infrastructure
        const executionId = await this.workflowExecutor.startStoryExecution(
          client,
          queueItem.specId,
          firstStory.id,
          projectPath,
          queueItem.gitStrategy || 'branch',
          firstStory.model || 'opus',
          true  // queue stories always auto-continue
        );

        // MPRO-005: Mark workflow active
        webSocketManager.markWorkflowActive(projectPath);
        this.broadcastRunningCount();
        this.broadcastRunningCountToProject(projectPath);

        console.log(`[WebSocket] Queue spec execution started: ${executionId}`);
      } else {
        console.log(`[WebSocket] No backlog stories found for spec ${queueItem.specId}`);

        // Mark spec as complete (nothing to do)
        queueHandler.handleSpecComplete(projectPath, queueItem.specId, true);
      }
    } catch (error) {
      console.error(`[WebSocket] Failed to start spec execution: ${error}`);

      // Mark spec as failed
      queueHandler.handleSpecComplete(projectPath, queueItem.specId, false);
    }
  }

  /**
   * Trigger backlog execution for a queue item with itemType 'backlog'.
   * Uses backlogReader and startBacklogStoryExecution instead of spec-based execution.
   */
  private async triggerBacklogExecution(
    client: WebSocketClient,
    projectPath: string,
    _queueItem: { specId: string; specName: string }
  ): Promise<void> {
    try {
      console.log(`[WebSocket] Triggering backlog execution for project: ${projectPath}`);

      const backlog = await this.backlogReader.getKanbanBoard(projectPath);
      const firstStory = backlog.stories.find(s => s.status === 'backlog');

      if (firstStory) {
        const executionId = await this.workflowExecutor.startBacklogStoryExecution(
          client,
          projectPath,
          firstStory.id,
          firstStory.model || 'opus'
        );

        webSocketManager.markWorkflowActive(projectPath);
        this.broadcastRunningCount();
        this.broadcastRunningCountToProject(projectPath);

        console.log(`[WebSocket] Queue backlog execution started: ${executionId}`);
      } else {
        console.log(`[WebSocket] No backlog stories found for project ${projectPath}`);
        queueHandler.handleSpecComplete(projectPath, 'backlog', true);
      }
    } catch (error) {
      console.error(`[WebSocket] Failed to start backlog execution: ${error}`);
      queueHandler.handleSpecComplete(projectPath, 'backlog', false);
    }
  }

  // ============================================================================
  // Git Handlers (GIT-001)
  // ============================================================================

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

  /**
   * SCA-001: Handle attachment:upload message.
   */
  private handleAttachmentUpload(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendAttachmentNoProjectError(client, 'upload');
      return;
    }
    this.attachmentHandler.handleUpload(client, message, projectPath);
  }

  /**
   * SCA-001: Handle attachment:list message.
   */
  private handleAttachmentList(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendAttachmentNoProjectError(client, 'list');
      return;
    }
    this.attachmentHandler.handleList(client, message, projectPath);
  }

  /**
   * SCA-001: Handle attachment:delete message.
   */
  private handleAttachmentDelete(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendAttachmentNoProjectError(client, 'delete');
      return;
    }
    this.attachmentHandler.handleDelete(client, message, projectPath);
  }

  /**
   * SCA-005: Handle attachment:read message for preview.
   */
  private handleAttachmentRead(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = this.getClientProjectPath(client);
    if (!projectPath) {
      this.sendAttachmentNoProjectError(client, 'read');
      return;
    }
    this.attachmentHandler.handleRead(client, message, projectPath);
  }

  /**
   * SCA-001: Send attachment error for missing project.
   */
  private sendAttachmentNoProjectError(client: WebSocketClient, operation: string): void {
    const errorResponse: WebSocketMessage = {
      type: 'attachment:error',
      code: 'NO_PROJECT',
      message: 'No project selected',
      operation,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(errorResponse));
  }

  // ============================================================================
  // File Editor Handlers (FE-001)
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

  private handleSetupStartDevteam(client: WebSocketClient, message: WebSocketMessage): void {
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
      const session = this.cloudTerminalManager.createSession(projectPath, 'claude-code', modelConfig);
      console.log(`[WebSocket] DevTeam setup session created: ${session.sessionId}`);

      // Send initial command to start DevTeam build
      setTimeout(() => {
        const commandPrefix = resolveCommandDir(projectPath);
        this.cloudTerminalManager.sendInput(session.sessionId, `/${commandPrefix}:build-development-team\n`);
      }, 1000);

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
      const message: WebSocketMessage = {
        type: 'cloud-terminal:closed',
        sessionId,
        exitCode,
        timestamp: new Date().toISOString()
      };
      this.broadcast(message);
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
  }

  /**
   * Handle cloud-terminal:create
   * Creates a new Cloud Terminal session
   */
  private handleCloudTerminalCreate(client: WebSocketClient, message: WebSocketMessage): void {
    const projectPath = message.projectPath as string || this.getClientProjectPath(client);
    const terminalType = (message.terminalType as CloudTerminalType) || 'claude-code';
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

    // modelConfig is only required for claude-code terminals
    if (terminalType === 'claude-code' && (!modelConfig || !modelConfig.model)) {
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: 'INVALID_MESSAGE',
        message: 'Model configuration is required for claude-code terminals',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      const session = this.cloudTerminalManager.createSession(projectPath, terminalType, modelConfig, cols, rows);
      console.log(`[WebSocket] Cloud Terminal ${terminalType} session created: ${session.sessionId}`);

      // Send created response with requestId for correlation
      const createdResponse: WebSocketMessage = {
        type: 'cloud-terminal:created',
        requestId: message.requestId,
        sessionId: session.sessionId,
        session,
        timestamp: new Date().toISOString()
      };
      this.broadcast(createdResponse);
    } catch (error) {
      const errorCode = (error as Error & { code?: string }).code || 'SPAWN_FAILED';
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: errorCode,
        message: error instanceof Error ? error.message : 'Failed to create Cloud Terminal session',
        timestamp: new Date().toISOString()
      };
      client.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * Handle cloud-terminal:create-workflow (WTT-001)
   * Creates a new Cloud Terminal session for workflow execution
   * Automatically sends the workflow command after session initialization
   */
  private handleCloudTerminalCreateWorkflow(client: WebSocketClient, message: WebSocketMessage): void {
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
      const session = this.cloudTerminalManager.createWorkflowSession(
        projectPath,
        workflowMetadata,
        modelConfig,
        cols,
        rows
      );
      console.log(
        `[WebSocket] Workflow session created: ${session.sessionId} for command: ${workflowMetadata.workflowCommand}`
      );

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

    const closed = this.cloudTerminalManager.closeSession(sessionId);

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
    }
    // Response is sent via the session.resumed event listener
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

    const resized = this.cloudTerminalManager.resizeSession(sessionId, cols, rows);

    if (!resized) {
      const errorResponse: WebSocketMessage = {
        type: 'cloud-terminal:error',
        code: 'SESSION_NOT_FOUND',
        message: `Session not found: ${sessionId}`,
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

    const session = this.cloudTerminalManager.getSession(sessionId);

    if (!session) {
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

    // Join buffer lines and send as response
    const buffer = session.buffer.join('\n');

    const response: WebSocketMessage = {
      type: 'cloud-terminal:buffer-response',
      sessionId,
      buffer,
      timestamp: new Date().toISOString()
    };
    client.send(JSON.stringify(response));
  }
}
