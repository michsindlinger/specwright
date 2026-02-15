import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { gateway, WebSocketMessage } from '../gateway.js';
import '../components/workflow-card.js';
import '../components/workflow-progress.js';
import '../components/workflow-chat.js';
import '../components/docs/aos-docs-viewer.js';
import '../components/execution-tabs.js';
import '../components/aos-terminal.js';
import type { WorkflowCommand } from '../components/workflow-card.js';
import type { WorkflowExecution } from '../components/workflow-progress.js';
import type { InteractiveWorkflowState, WorkflowMessage } from '../components/workflow-chat.js';
import type { ExecutionTabData } from '../components/execution-tab.js';
import { executionStore, ExecutionStoreEvent } from '../stores/execution-store.js';
import type { GeneratedDoc } from '../types/execution.js';
import { routerService } from '../services/router.service.js';
import type { ParsedRoute } from '../types/route.types.js';

interface RunningExecution extends WorkflowExecution {
  output: string;
  progress: number;
}

@customElement('aos-workflow-view')
export class AosWorkflowView extends LitElement {
  @state() private commands: WorkflowCommand[] = [];
  @state() private activeExecution: RunningExecution | null = null;
  @state() private backgroundExecutions: RunningExecution[] = [];
  @state() private hasProject = false;
  @state() private connectionError = false;
  @state() private loading = true;
  @state() private interactiveMode = false;
  @state() private docsViewerOpen = false;
  @state() private docsPanelWidth = 350;
  @state() private isResizing = false;
  @state() private modelProviders: Array<{ id: string; name: string; models: Array<{ id: string; name: string; providerId: string }> }> = [];
  @state() private defaultModelId = '';

  /** Tracks the active workflow state derived from ExecutionStore */
  @state() private interactiveWorkflow: InteractiveWorkflowState | null = null;

  private boundHandlers: Map<string, (msg: WebSocketMessage) => void> = new Map();
  private boundStoreHandler: ((event: ExecutionStoreEvent) => void) | null = null;
  private boundRouteChangeHandler = (route: ParsedRoute) => this.onRouteChanged(route);

  override connectedCallback(): void {
    super.connectedCallback();
    this.setupWebSocketHandlers();
    this.setupStoreSubscription();
    routerService.on('route-changed', this.boundRouteChangeHandler);
    this.checkProjectStatus();
    this.requestCommands();
    this.requestRunningWorkflows();
    this.checkPendingWorkflow();
    this.restoreRouteState();
    // Request model list if already connected (e.g., when navigating back to this view)
    if (gateway.getConnectionStatus()) {
      this.requestModelList();
    }
  }

  /**
   * Check for a pending workflow stored by the dashboard and start it.
   */
  private checkPendingWorkflow(): void {
    const pendingJson = sessionStorage.getItem('pendingWorkflow');
    if (pendingJson) {
      sessionStorage.removeItem('pendingWorkflow');
      try {
        const pending = JSON.parse(pendingJson) as { commandId: string; argument?: string; model?: string };
        // Wait a brief moment for commands to load, then start the workflow
        setTimeout(() => {
          gateway.send({
            type: 'workflow.interactive.start',
            commandId: pending.commandId,
            argument: pending.argument,
            model: pending.model
          });
        }, 500);
      } catch (e) {
        console.error('Failed to parse pending workflow:', e);
      }
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.cleanupWebSocketHandlers();
    this.cleanupStoreSubscription();
    routerService.off('route-changed', this.boundRouteChangeHandler);
  }

  private setupStoreSubscription(): void {
    this.boundStoreHandler = (_event: ExecutionStoreEvent) => {
      // Sync store state to local state for reactivity
      this.syncStoreState();
    };
    executionStore.subscribe(this.boundStoreHandler);
  }

  private cleanupStoreSubscription(): void {
    if (this.boundStoreHandler) {
      executionStore.unsubscribe(this.boundStoreHandler);
      this.boundStoreHandler = null;
    }
  }

  /**
   * DLN-004: Restore state from current URL on initial load.
   * If URL is #/workflows/{executionId}, try to set that execution as active.
   */
  private restoreRouteState(): void {
    const route = routerService.getCurrentRoute();
    if (!route || route.view !== 'workflows') return;

    if (route.segments.length >= 1) {
      const executionId = route.segments[0];
      const execution = executionStore.getExecution(executionId);
      if (execution) {
        executionStore.setActiveExecution(executionId);
      } else {
        // DLN-006: Stale execution ID - show toast and correct URL
        this.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: { message: 'Workflow nicht gefunden', type: 'warning' },
            bubbles: true,
            composed: true
          })
        );
        routerService.navigate('workflows');
      }
    }
  }

  /**
   * DLN-004: Handle route changes from browser back/forward.
   */
  private onRouteChanged(route: ParsedRoute): void {
    if (route.view !== 'workflows') return;

    if (route.segments.length === 0) {
      // URL is #/workflows with no execution ID - no action needed,
      // the workflow list is shown when no active execution exists
      return;
    }

    // URL is #/workflows/{executionId}
    const executionId = route.segments[0];
    const activeId = executionStore.getActiveExecutionId();

    // Already viewing this execution
    if (activeId === executionId) return;

    const execution = executionStore.getExecution(executionId);
    if (execution) {
      executionStore.setActiveExecution(executionId);
    } else {
      // DLN-006: Stale execution ID - show toast and correct URL
      this.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: { message: 'Workflow nicht gefunden', type: 'warning' },
          bubbles: true,
          composed: true
        })
      );
      routerService.navigate('workflows');
    }
  }

  private syncStoreState(): void {
    // Derive interactiveWorkflow from the active execution in the store
    const activeExec = executionStore.getActiveExecution();
    if (activeExec) {
      this.interactiveWorkflow = {
        executionId: activeExec.executionId,
        commandId: activeExec.commandId,
        commandName: activeExec.commandName,
        status: activeExec.status,
        messages: activeExec.messages,
        error: activeExec.error
      };
      this.interactiveMode = true;

      // Sync docs container width from store (for persistence)
      this.docsPanelWidth = activeExec.docsContainerWidth ?? 350;

      // DLN-004: Update URL to reflect active execution
      routerService.navigate('workflows', [activeExec.executionId]);
    } else {
      this.interactiveWorkflow = null;
      this.interactiveMode = executionStore.getExecutionCount() > 0;

      // DLN-004: Reset URL to #/workflows when no active execution
      const route = routerService.getCurrentRoute();
      if (route?.view === 'workflows' && route.segments.length > 0) {
        routerService.navigate('workflows');
      }
    }
  }

  private setupWebSocketHandlers(): void {
    const handlers: Record<string, (msg: WebSocketMessage) => void> = {
      'workflow.list': (msg) => this.handleWorkflowList(msg),
      'workflow.start.ack': (msg) => this.handleWorkflowStartAck(msg),
      'workflow.started': (msg) => this.handleWorkflowStarted(msg),
      'workflow.progress': (msg) => this.handleWorkflowProgress(msg),
      'workflow.complete': (msg) => this.handleWorkflowComplete(msg),
      'workflow.cancel.ack': (msg) => this.handleWorkflowCancelAck(msg),
      'workflow.running': (msg) => this.handleWorkflowRunning(msg),
      'workflow.error': (msg) => this.handleWorkflowError(msg),
      'workflow.interactive.start.ack': (msg) => this.handleInteractiveStartAck(msg),
      'workflow.interactive.message': (msg) => this.handleInteractiveMessage(msg),
      'workflow.interactive.complete': (msg) => this.handleInteractiveComplete(msg),
      'workflow.interactive.error': (msg) => this.handleInteractiveError(msg),
      'workflow.tool': (msg) => this.handleWorkflowTool(msg),
      'terminal.spawned': (msg) => this.handleTerminalSpawned(msg),
      'gateway.connected': () => this.handleConnected(),
      'gateway.disconnected': () => this.handleDisconnected(),
      'project.selected': () => this.handleProjectSelected(),
      'project.current': (msg) => this.handleProjectCurrent(msg),
      'model.list': (msg) => this.handleModelList(msg)
    };

    for (const [type, handler] of Object.entries(handlers)) {
      this.boundHandlers.set(type, handler);
      gateway.on(type, handler);
    }
  }

  private cleanupWebSocketHandlers(): void {
    for (const [type, handler] of this.boundHandlers) {
      gateway.off(type, handler);
    }
    this.boundHandlers.clear();
  }

  private checkProjectStatus(): void {
    gateway.send({ type: 'project.current' });
  }

  private requestCommands(): void {
    this.loading = true;
    gateway.send({ type: 'workflow.list' });
  }

  private requestRunningWorkflows(): void {
    gateway.send({ type: 'workflow.running' });
  }

  private requestModelList(): void {
    gateway.send({ type: 'model.list' });
  }

  private handleModelList(msg: WebSocketMessage): void {
    this.modelProviders = (msg.providers as Array<{ id: string; name: string; models: Array<{ id: string; name: string; providerId: string }> }>) || [];
    const defaultSelection = msg.defaultSelection as { providerId: string; modelId: string } | undefined;
    if (defaultSelection) {
      this.defaultModelId = defaultSelection.modelId;
    }
  }

  private handleWorkflowList(msg: WebSocketMessage): void {
    this.commands = msg.commands as WorkflowCommand[];
    this.loading = false;
  }

  private handleWorkflowStartAck(msg: WebSocketMessage): void {
    const executionId = msg.executionId as string;
    const commandId = msg.commandId as string;
    const command = this.commands.find(c => c.id === commandId);

    if (command) {
      this.activeExecution = {
        id: executionId,
        commandId,
        commandName: command.name,
        startTime: new Date().toISOString(),
        status: 'running',
        output: '',
        progress: 0
      };
    }
  }

  private handleWorkflowStarted(_msg: WebSocketMessage): void {
    // Already handled by start.ack
  }

  private handleWorkflowProgress(msg: WebSocketMessage): void {
    const executionId = msg.executionId as string;
    const output = msg.output as string;
    const progress = msg.progress as number;

    if (this.activeExecution?.id === executionId) {
      this.activeExecution = {
        ...this.activeExecution,
        output: this.activeExecution.output + output + '\n',
        progress
      };
    } else {
      // Check background executions
      const idx = this.backgroundExecutions.findIndex(e => e.id === executionId);
      if (idx !== -1) {
        const exec = this.backgroundExecutions[idx];
        this.backgroundExecutions = [
          ...this.backgroundExecutions.slice(0, idx),
          { ...exec, output: exec.output + output + '\n', progress },
          ...this.backgroundExecutions.slice(idx + 1)
        ];
      }
    }
  }

  private handleWorkflowComplete(msg: WebSocketMessage): void {
    const executionId = msg.executionId as string;
    const status = msg.status as 'completed' | 'failed' | 'cancelled';
    const output = msg.output as string;
    const error = msg.error as string | undefined;

    if (this.activeExecution?.id === executionId) {
      this.activeExecution = {
        ...this.activeExecution,
        status,
        output,
        error,
        progress: 100
      };
    } else {
      const idx = this.backgroundExecutions.findIndex(e => e.id === executionId);
      if (idx !== -1) {
        const exec = this.backgroundExecutions[idx];
        this.backgroundExecutions = [
          ...this.backgroundExecutions.slice(0, idx),
          { ...exec, status, output, error, progress: 100 },
          ...this.backgroundExecutions.slice(idx + 1)
        ];
      }
    }
  }

  private handleWorkflowCancelAck(msg: WebSocketMessage): void {
    const cancelled = msg.cancelled as boolean;
    if (!cancelled) {
      console.warn('Failed to cancel workflow');
    }
  }

  private handleWorkflowRunning(msg: WebSocketMessage): void {
    const executions = msg.executions as WorkflowExecution[];

    // Add running executions to store for terminal reconnection after page reload
    for (const e of executions) {
      // Check if execution is already in store (avoid duplicates)
      const existing = executionStore.getExecution(e.id);
      if (!existing) {
        // Add to store - workflows with terminalSessionId are PTY-based (terminal mode)
        executionStore.addExecution(e.id, e.commandId, e.commandName);
        executionStore.updateStatus(e.id, e.status);
        // Enable terminal if terminalSessionId is provided (PTY-based workflows)
        if (e.terminalSessionId) {
          executionStore.enableTerminal(e.id, e.terminalSessionId);
        }
      }
    }

    // If there are executions but no active one set, make the first one active
    // This ensures the terminal view is shown after page reload
    if (executions.length > 0 && !executionStore.getActiveExecutionId()) {
      executionStore.setActiveExecution(executions[0].id);
    }

    // Sync store state to update interactiveMode and interactiveWorkflow
    this.syncStoreState();

    this.backgroundExecutions = executions.map(e => ({
      ...e,
      output: '',
      progress: 0
    }));
  }

  private handleWorkflowError(msg: WebSocketMessage): void {
    console.error('Workflow error:', msg.error);
    this.loading = false;
  }

  private handleInteractiveStartAck(msg: WebSocketMessage): void {
    const executionId = msg.executionId as string;
    const commandId = msg.commandId as string;
    const command = this.commands.find(c => c.id === commandId);

    if (command) {
      // Add execution to store - this will trigger syncStoreState via subscription
      executionStore.addExecution(executionId, commandId, command.name);
      // Set as active (first execution is auto-active, but explicit for clarity)
      executionStore.setActiveExecution(executionId);
    }
  }

  private handleInteractiveMessage(msg: WebSocketMessage): void {
    const executionId = msg.executionId as string;
    const execution = executionStore.getExecution(executionId);
    if (!execution) return;

    const message: WorkflowMessage = {
      id: crypto.randomUUID(),
      role: msg.role as 'assistant' | 'user' | 'system',
      content: msg.content as string,
      timestamp: new Date().toISOString(),
      isStreaming: msg.isStreaming as boolean | undefined
    };

    // Update store - triggers syncStoreState via subscription
    executionStore.updateStatus(executionId, 'running');
    executionStore.addMessage(executionId, message);
  }

  private handleInteractiveComplete(msg: WebSocketMessage): void {
    const executionId = msg.executionId as string;
    const status = msg.status as 'completed' | 'failed' | 'cancelled';

    // Update store - triggers syncStoreState via subscription
    executionStore.updateStatus(executionId, status);
  }

  private handleInteractiveError(msg: WebSocketMessage): void {
    const executionId = msg.executionId as string;
    const error = msg.error as string;

    // Update store with error - triggers syncStoreState via subscription
    executionStore.setError(executionId, error);
  }

  private handleWorkflowTool(msg: WebSocketMessage): void {
    const toolName = msg.toolName as string;
    const toolInput = msg.toolInput as Record<string, unknown> | undefined;
    const executionId = msg.executionId as string | undefined;

    // Only handle Write tool calls for document generation
    if (toolName === 'Write' && toolInput) {
      const filePath = toolInput.file_path as string;
      const content = toolInput.content as string;

      // Check if it's a markdown file (docs we want to show)
      if (filePath && content && filePath.endsWith('.md')) {
        // Determine which execution this document belongs to
        const targetExecutionId = executionId || executionStore.getActiveExecutionId();
        if (!targetExecutionId) return;

        const newDoc: GeneratedDoc = {
          path: filePath,
          content,
          timestamp: new Date().toISOString()
        };

        // Add document to the execution store
        executionStore.addDocument(targetExecutionId, newDoc);

        // Auto-open docs viewer on first document
        if (!this.docsViewerOpen) {
          this.docsViewerOpen = true;
        }
      }
    }
  }

  private handleTerminalSpawned(msg: WebSocketMessage): void {
    const executionId = msg.executionId as string;
    const terminalSessionId = msg.terminalSessionId as string;

    console.log(`[Terminal] Received terminal.spawned for execution ${executionId}`);

    // Check if execution exists in store
    const execution = executionStore.getExecution(executionId);
    console.log(`[Terminal] Execution exists in store:`, !!execution);

    if (!execution) {
      console.warn(`[Terminal] Execution ${executionId} not found in store! Waiting...`);
      // Retry after a short delay to allow start.ack to process first
      setTimeout(() => {
        const retryExecution = executionStore.getExecution(executionId);
        if (retryExecution) {
          console.log(`[Terminal] Retry successful - enabling terminal`);
          executionStore.enableTerminal(executionId, terminalSessionId);
        } else {
          console.error(`[Terminal] Execution ${executionId} still not found after retry!`);
        }
      }, 100);
      return;
    }

    // Enable terminal mode for this execution
    executionStore.enableTerminal(executionId, terminalSessionId);

    console.log(`[Terminal] Terminal spawned for execution ${executionId}, session: ${terminalSessionId}`);
  }

  private handleConnected(): void {
    this.connectionError = false;
    this.requestCommands();
    this.requestRunningWorkflows();
    this.requestModelList();
    this.checkProjectStatus();
  }

  private handleDisconnected(): void {
    this.connectionError = true;
  }

  private handleProjectSelected(): void {
    this.hasProject = true;
    this.requestCommands();
  }

  private handleProjectCurrent(msg: WebSocketMessage): void {
    this.hasProject = msg.project !== null;
    if (this.hasProject) {
      this.requestCommands();
    }
  }

  private handleStartWorkflow(e: CustomEvent): void {
    const { commandId } = e.detail;
    gateway.send({
      type: 'workflow.start',
      commandId
    });
  }

  private handleStartInteractiveWorkflow(e: CustomEvent): void {
    // Check if a workflow is already running
    if (this.interactiveMode && this.interactiveWorkflow) {
      const isRunning = this.interactiveWorkflow.status === 'running' ||
                        this.interactiveWorkflow.status === 'starting' ||
                        this.interactiveWorkflow.status === 'waiting_input';
      if (isRunning) {
        console.warn('A workflow is already running');
        return;
      }
    }

    const { commandId, argument, model } = e.detail;
    gateway.send({
      type: 'workflow.interactive.start',
      commandId,
      argument,
      model
    });
  }

  private handleWorkflowUserInput(e: CustomEvent): void {
    const activeExecId = executionStore.getActiveExecutionId();
    if (!activeExecId) return;

    const { input } = e.detail;
    const userMessage: WorkflowMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    // Add message to store - triggers syncStoreState via subscription
    executionStore.addMessage(activeExecId, userMessage);
  }

  private handleWorkflowClose(): void {
    // Clear all executions from store - triggers syncStoreState via subscription
    executionStore.clear();
    // Also reset docs viewer when workflow closes
    this.docsViewerOpen = false;
  }

  private handleBackToDashboard(): void {
    const activeExecId = executionStore.getActiveExecutionId();
    if (!activeExecId) return;

    // Disable terminal mode and return to dashboard
    executionStore.disableTerminal(activeExecId);
    // Remove execution to fully close the workflow
    executionStore.removeExecution(activeExecId);

    // Reset docs viewer if no executions remain
    if (executionStore.getExecutionCount() === 0) {
      this.docsViewerOpen = false;
    }
  }

  private handleCancelTerminalWorkflow(): void {
    const activeExecId = executionStore.getActiveExecutionId();
    if (!activeExecId) return;

    // Ask for confirmation
    const confirmed = window.confirm(
      'Workflow wirklich abbrechen?\n\n' +
      'Der Claude-Prozess wird beendet.'
    );
    if (!confirmed) {
      return;
    }

    // Send cancel request to backend
    gateway.send({
      type: 'workflow.interactive.cancel',
      executionId: activeExecId
    });

    // Remove execution and return to workflow list
    executionStore.removeExecution(activeExecId);

    // Reset docs viewer if no executions remain
    if (executionStore.getExecutionCount() === 0) {
      this.docsViewerOpen = false;
    }
  }

  private toggleDocsViewer(): void {
    this.docsViewerOpen = !this.docsViewerOpen;
  }

  private handleDocSelect(index: number): void {
    const activeExecId = executionStore.getActiveExecutionId();
    if (activeExecId) {
      executionStore.setSelectedDocIndex(activeExecId, index);
    }
  }

  private handleResizeStart(e: MouseEvent): void {
    e.preventDefault();
    this.isResizing = true;

    const onMouseMove = (ev: MouseEvent) => {
      if (!this.isResizing) return;

      const viewportWidth = window.innerWidth;
      const minWidth = 200;
      const maxWidth = viewportWidth * 0.6;

      // Calculate new width from right edge
      const newWidth = viewportWidth - ev.clientX;
      this.docsPanelWidth = Math.min(maxWidth, Math.max(minWidth, newWidth));
    };

    const onMouseUp = () => {
      this.isResizing = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      // Save the final width to the execution store for persistence
      const activeExecId = executionStore.getActiveExecutionId();
      if (activeExecId) {
        executionStore.setDocsContainerWidth(activeExecId, this.docsPanelWidth);
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  private handleCancelWorkflow(e: CustomEvent): void {
    const { executionId } = e.detail;
    gateway.send({
      type: 'workflow.cancel',
      executionId
    });
  }

  private handleBackgroundWorkflow(e: CustomEvent): void {
    const { executionId } = e.detail;
    if (this.activeExecution && this.activeExecution.id === executionId) {
      this.backgroundExecutions = [...this.backgroundExecutions, this.activeExecution];
      this.activeExecution = null;
    }
  }

  private handleBringToFront(execution: RunningExecution): void {
    // Move from background to active
    this.backgroundExecutions = this.backgroundExecutions.filter(
      e => e.id !== execution.id
    );
    if (this.activeExecution) {
      this.backgroundExecutions = [...this.backgroundExecutions, this.activeExecution];
    }
    this.activeExecution = execution;
  }

  private handleDismiss(): void {
    this.activeExecution = null;
  }

  private reconnect(): void {
    gateway.connect();
  }

  private getExecutionTabs(): ExecutionTabData[] {
    // Get all executions from store and map to tab data
    return executionStore.getAllExecutions().map(exec => ({
      id: exec.executionId,
      commandName: exec.commandName,
      status: exec.status,
      pendingQuestionCount: exec.pendingQuestionCount,
      hasUnseenChanges: exec.hasUnseenChanges
    }));
  }

  private handleTabSelect(e: CustomEvent<{ tabId: string }>): void {
    // Switch to the selected execution
    executionStore.setActiveExecution(e.detail.tabId);
  }

  private handleTabClose(e: CustomEvent<{ tabId: string }>): void {
    const executionId = e.detail.tabId;
    const execution = executionStore.getExecution(executionId);

    // If workflow is still running, ask for confirmation
    if (execution && (execution.status === 'running' || execution.status === 'starting')) {
      const confirmed = window.confirm(
        'Der Workflow läuft noch. Wirklich beenden?\n\n' +
        'Dies wird den Claude-Prozess abbrechen.'
      );
      if (!confirmed) {
        return; // User cancelled - don't close
      }

      // Cancel the workflow first
      gateway.send({
        type: 'workflow.interactive.cancel',
        executionId
      });
    }

    // Remove the execution from store
    executionStore.removeExecution(executionId);

    // If no executions remain, reset docs viewer
    if (executionStore.getExecutionCount() === 0) {
      this.docsViewerOpen = false;
    }
  }

  private handleTabCancel(e: CustomEvent<{ tabId: string }>): void {
    const executionId = e.detail.tabId;
    const execution = executionStore.getExecution(executionId);

    // Ask for confirmation before cancelling running workflow
    if (execution && (execution.status === 'running' || execution.status === 'starting')) {
      const confirmed = window.confirm(
        'Workflow wirklich abbrechen?\n\n' +
        'Der Claude-Prozess wird beendet.'
      );
      if (!confirmed) {
        return; // User cancelled
      }
    }

    // Send cancel request to backend
    gateway.send({
      type: 'workflow.interactive.cancel',
      executionId
    });
    // Update local state to cancelled
    executionStore.updateStatus(executionId, 'cancelled');
  }

  private handleTabAdd(e: CustomEvent<{ commandId: string; commandName: string }>): void {
    // Start new workflow in a new tab with the selected command
    const { commandId } = e.detail;
    const command = this.commands.find(c => c.id === commandId);
    if (command) {
      gateway.send({
        type: 'workflow.interactive.start',
        commandId
      });
    }
  }

  override render() {
    const hasExecutions = executionStore.getExecutionCount() > 0;
    const activeExecution = executionStore.getActiveExecution();
    const generatedDocs = activeExecution?.generatedDocs ?? [];
    const showSplitView = this.interactiveMode && this.interactiveWorkflow && generatedDocs.length > 0;
    const showTabs = hasExecutions;
    const tabs = this.getExecutionTabs();
    const activeTabId = executionStore.getActiveExecutionId();

    return html`
      <div
        class="workflow-container ${showSplitView && this.docsViewerOpen ? 'workflow-container--split' : ''}"
        @workflow-start=${this.handleStartWorkflow}
        @workflow-start-interactive=${this.handleStartInteractiveWorkflow}
        @workflow-cancel=${this.handleCancelWorkflow}
        @workflow-background=${this.handleBackgroundWorkflow}
        @workflow-user-input=${this.handleWorkflowUserInput}
        @workflow-close=${this.handleWorkflowClose}
        @tab-select=${this.handleTabSelect}
        @tab-close=${this.handleTabClose}
        @tab-cancel=${this.handleTabCancel}
        @tab-add=${this.handleTabAdd}
      >
        ${this.connectionError ? this.renderConnectionError() : ''}
        ${!this.hasProject ? this.renderNoProject() : ''}

        ${showTabs
          ? html`
              <aos-execution-tabs
                .tabs=${tabs}
                .activeTabId=${activeTabId}
                .commands=${this.commands}
              ></aos-execution-tabs>
            `
          : ''}

        ${this.interactiveMode && this.interactiveWorkflow
          ? this.renderInteractiveWorkflow()
          : ''}

        ${showSplitView ? this.renderDocsPanel() : ''}

        ${!this.interactiveMode && this.backgroundExecutions.length > 0
          ? this.renderBackgroundBadge()
          : ''}

        ${!this.interactiveMode
          ? this.activeExecution
            ? this.renderActiveExecution()
            : this.renderCommandList()
          : ''}
      </div>
    `;
  }

  private renderInteractiveWorkflow() {
    if (!this.interactiveWorkflow) return '';

    // Get full execution state from store (includes terminal fields and docs)
    const execution = executionStore.getExecution(this.interactiveWorkflow.executionId);
    const isTerminalMode = execution?.terminalActive === true;
    const hasExitCode = execution?.exitCode !== null && execution?.exitCode !== undefined;
    const generatedDocs = execution?.generatedDocs ?? [];

    const isRunning = this.interactiveWorkflow.status === 'running' ||
                      this.interactiveWorkflow.status === 'starting' ||
                      this.interactiveWorkflow.status === 'waiting_input';

    const hasGeneratedDocs = generatedDocs.length > 0;

    return html`
      <div class="interactive-workflow-area ${hasGeneratedDocs && this.docsViewerOpen ? 'interactive-workflow-area--with-docs' : ''}">
        ${isRunning
          ? html`
              <div class="workflow-running-banner">
                <span class="running-icon">⚡</span>
                <span>Workflow "${this.interactiveWorkflow.commandName}" is running</span>
                ${hasGeneratedDocs
                  ? html`
                      <button
                        class="docs-toggle-btn"
                        @click=${this.toggleDocsViewer}
                        title="${this.docsViewerOpen ? 'Hide documents' : 'Show documents'}"
                      >
                        <span class="docs-icon">📄</span>
                        <span>${generatedDocs.length}</span>
                        <span class="toggle-arrow">${this.docsViewerOpen ? '→' : '←'}</span>
                      </button>
                    `
                  : ''}
              </div>
            `
          : hasGeneratedDocs
            ? html`
                <div class="workflow-docs-banner">
                  <span class="docs-icon">📄</span>
                  <span>${generatedDocs.length} document${generatedDocs.length > 1 ? 's' : ''} generated</span>
                  <button
                    class="docs-toggle-btn"
                    @click=${this.toggleDocsViewer}
                    title="${this.docsViewerOpen ? 'Hide documents' : 'Show documents'}"
                  >
                    <span class="toggle-arrow">${this.docsViewerOpen ? '→' : '←'}</span>
                  </button>
                </div>
              `
            : ''}

        ${isTerminalMode
          ? html`
              <div class="terminal-container">
                <aos-terminal
                  .terminalSessionId=${execution?.terminalSessionId || ''}
                ></aos-terminal>
                <div class="terminal-actions">
                  ${hasExitCode
                    ? html`
                        <button class="back-to-dashboard-btn" @click=${this.handleBackToDashboard}>
                          ← Back to Dashboard
                        </button>
                        <span class="exit-code-badge ${execution.exitCode === 0 ? 'exit-success' : 'exit-error'}">
                          Process exited with code ${execution.exitCode}
                        </span>
                      `
                    : html`
                        <button class="cancel-workflow-btn" @click=${this.handleCancelTerminalWorkflow}>
                          ✕ Abbrechen
                        </button>
                      `}
                </div>
              </div>
            `
          : html`
              <aos-workflow-chat
                .workflowState=${this.interactiveWorkflow}
              ></aos-workflow-chat>
            `}
      </div>
    `;
  }

  private renderDocsPanel() {
    const activeExecution = executionStore.getActiveExecution();
    const generatedDocs = activeExecution?.generatedDocs ?? [];
    const selectedDocIndex = activeExecution?.selectedDocIndex ?? 0;

    if (!this.docsViewerOpen || generatedDocs.length === 0) return '';

    const selectedDoc = generatedDocs[selectedDocIndex];
    const filename = selectedDoc ? selectedDoc.path.split('/').pop() || selectedDoc.path : '';

    return html`
      <div class="workflow-docs-panel" style="width: ${this.docsPanelWidth}px">
        <div
          class="docs-resize-handle"
          @mousedown=${this.handleResizeStart}
        ></div>
        <div class="docs-panel-header">
          <h3 class="docs-panel-title">Generated Documents</h3>
          <button
            class="docs-close-btn"
            @click=${this.toggleDocsViewer}
            title="Close panel"
          >
            ×
          </button>
        </div>

        ${generatedDocs.length > 1
          ? html`
              <div class="docs-list">
                ${generatedDocs.map((doc: GeneratedDoc, index: number) => {
                  const docFilename = doc.path.split('/').pop() || doc.path;
                  return html`
                    <button
                      class="docs-list-item ${index === selectedDocIndex ? 'docs-list-item--selected' : ''}"
                      @click=${() => this.handleDocSelect(index)}
                    >
                      <span class="doc-icon">📄</span>
                      <span class="doc-name">${docFilename}</span>
                    </button>
                  `;
                })}
              </div>
            `
          : ''}

        <div class="docs-viewer-container">
          <aos-docs-viewer
            .content=${selectedDoc?.content || ''}
            .filename=${filename}
            .embedded=${true}
          ></aos-docs-viewer>
        </div>
      </div>
    `;
  }

  private renderConnectionError() {
    return html`
      <div class="connection-error">
        <span class="error-icon">⚠️</span>
        <span>Connection lost</span>
        <button class="reconnect-btn" @click=${this.reconnect}>
          Reconnect
        </button>
      </div>
    `;
  }

  private renderNoProject() {
    return html`
      <div class="no-project-banner">
        <span class="info-icon">ℹ️</span>
        <span>Select a project from the header to view workflows</span>
      </div>
    `;
  }

  private renderBackgroundBadge() {
    const count = this.backgroundExecutions.filter(e => e.status === 'running').length;
    if (count === 0) return '';

    return html`
      <div class="background-badge">
        <span class="badge-icon">⚡</span>
        <span>${count} workflow${count > 1 ? 's' : ''} running</span>
        <button class="view-btn" @click=${() => this.showBackgroundList()}>
          View
        </button>
      </div>
    `;
  }

  private showBackgroundList(): void {
    // For now, just bring the first one to front
    const running = this.backgroundExecutions.find(e => e.status === 'running');
    if (running) {
      this.handleBringToFront(running);
    }
  }

  private renderActiveExecution() {
    if (!this.activeExecution) return '';

    const isDone = this.activeExecution.status !== 'running';

    return html`
      <div class="active-execution">
        <aos-workflow-progress
          .execution=${this.activeExecution}
          .expanded=${true}
        ></aos-workflow-progress>

        ${isDone
          ? html`
              <div class="execution-actions">
                <button class="back-btn" @click=${this.handleDismiss}>
                  ← Back to workflows
                </button>
              </div>
            `
          : ''}
      </div>
    `;
  }

  private renderCommandList() {
    if (this.loading) {
      return html`
        <div class="loading-state">
          <span class="loading-spinner"></span>
          <p>Loading workflows...</p>
        </div>
      `;
    }

    if (this.commands.length === 0) {
      return html`
        <div class="empty-state">
          <div class="empty-icon">⚡</div>
          <h3>No workflows found</h3>
          <p>
            Add workflow commands to your project's
            <code>.claude/commands/agent-os/</code> directory.
          </p>
        </div>
      `;
    }

    return html`
      <div class="command-grid">
        ${this.commands.map(
          (cmd) => html`
            <aos-workflow-card
              .command=${cmd}
              .disabled=${!this.hasProject || this.connectionError}
              .providers=${this.modelProviders}
              .defaultModel=${this.defaultModelId}
            ></aos-workflow-card>
          `
        )}
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-workflow-view': AosWorkflowView;
  }
}
