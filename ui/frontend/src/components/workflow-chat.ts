import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { gateway, WebSocketMessage } from '../gateway.js';
import { renderMarkdownStreaming } from '../utils/markdown-renderer.js';
import './workflow-step-indicator.js';
import './loading-spinner.js';
import type { StepIndicatorStatus } from './workflow-step-indicator.js';

export interface WorkflowMessage {
  id: string;
  role: 'assistant' | 'user' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface InteractiveWorkflowState {
  executionId: string;
  commandId: string;
  commandName: string;
  status: 'starting' | 'running' | 'waiting_input' | 'completed' | 'failed' | 'cancelled';
  messages: WorkflowMessage[];
  error?: string;
}

@customElement('aos-workflow-chat')
export class AosWorkflowChat extends LitElement {
  @property({ type: Object }) workflowState: InteractiveWorkflowState | null = null;

  @state() private inputValue = '';
  @state() private isSubmitting = false;
  @state() private textQuestionId: string | null = null;  // For text-based questions (no AskUserQuestion tool)
  @state() private currentStep = 0;
  @state() private totalSteps = 0;
  @state() private stepName = '';
  @state() private showCancelConfirm = false;
  @state() private isCancelling = false;
  @state() private retryableError: { message: string; canRetry: boolean } | null = null;
  @state() private pendingToolCalls = 0;

  private boundHandlers: Map<string, (msg: WebSocketMessage) => void> = new Map();
  private messagesContainer: HTMLElement | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setupWebSocketHandlers();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.cleanupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    const handlers: Record<string, (msg: WebSocketMessage) => void> = {
      'workflow.interactive.message': (msg) => this.handleWorkflowMessage(msg),
      'workflow.interactive.input_request': (msg) => this.handleInputRequest(msg),
      'workflow.interactive.complete': (msg) => this.handleWorkflowComplete(msg),
      'workflow.interactive.error': (msg) => this.handleWorkflowError(msg),
      'workflow.interactive.step': (msg) => this.handleWorkflowStep(msg),
      'workflow.cancel.ack': (msg) => this.handleCancelAck(msg),
      'workflow.retry.ack': (msg) => this.handleRetryAck(msg),
      'workflow.tool': (msg) => this.handleToolStart(msg),
      'workflow.tool.complete': (msg) => this.handleToolComplete(msg)
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

  private handleWorkflowMessage(msg: WebSocketMessage): void {
    if (msg.executionId !== this.workflowState?.executionId) return;

    const message: WorkflowMessage = {
      id: crypto.randomUUID(),
      role: msg.role as 'assistant' | 'user' | 'system',
      content: msg.content as string,
      timestamp: new Date().toISOString(),
      isStreaming: msg.isStreaming as boolean | undefined
    };

    this.dispatchEvent(
      new CustomEvent('workflow-message', {
        detail: { message },
        bubbles: true,
        composed: true
      })
    );

    this.scrollToBottom();
  }

  private handleInputRequest(msg: WebSocketMessage): void {
    if (msg.executionId !== this.workflowState?.executionId) return;

    // Store the text-based question ID for submitting the answer
    this.textQuestionId = msg.questionId as string || `text-question-${Date.now()}`;

    this.dispatchEvent(
      new CustomEvent('workflow-input-request', {
        detail: { prompt: msg.prompt, questionId: this.textQuestionId },
        bubbles: true,
        composed: true
      })
    );

    this.scrollToBottom();
  }

  private handleWorkflowComplete(msg: WebSocketMessage): void {
    if (msg.executionId !== this.workflowState?.executionId) return;

    // Clear states when workflow completes
    this.textQuestionId = null;
    this.isCancelling = false;
    this.showCancelConfirm = false;
    this.retryableError = null;
    this.pendingToolCalls = 0;

    this.dispatchEvent(
      new CustomEvent('workflow-complete', {
        detail: { status: msg.status },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleWorkflowError(msg: WebSocketMessage): void {
    if (msg.executionId !== this.workflowState?.executionId) return;

    // Store error for inline display with retry option
    const errorMessage = msg.error as string || 'Unknown error';
    const canRetry = (msg.canRetry as boolean) ?? true; // Default to allowing retry

    this.retryableError = {
      message: errorMessage,
      canRetry
    };

    this.dispatchEvent(
      new CustomEvent('workflow-error', {
        detail: { error: msg.error },
        bubbles: true,
        composed: true
      })
    );

    this.scrollToBottom();
  }

  private handleWorkflowStep(msg: WebSocketMessage): void {
    if (msg.executionId !== this.workflowState?.executionId) return;

    this.currentStep = (msg.currentStep as number) || 0;
    this.totalSteps = (msg.totalSteps as number) || 0;
    this.stepName = (msg.stepName as string) || '';

    this.dispatchEvent(
      new CustomEvent('workflow-step-change', {
        detail: {
          currentStep: this.currentStep,
          totalSteps: this.totalSteps,
          stepName: this.stepName
        },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleCancelAck(msg: WebSocketMessage): void {
    if (msg.executionId !== this.workflowState?.executionId) return;

    // Reset cancelling state - the complete event will handle final state
    this.isCancelling = false;
  }

  private handleRetryAck(msg: WebSocketMessage): void {
    if (msg.executionId !== this.workflowState?.executionId) return;

    const success = msg.success as boolean;
    if (success) {
      // Clear error on successful retry
      this.retryableError = null;
    }
  }

  private handleToolStart(msg: WebSocketMessage): void {
    if (msg.executionId !== this.workflowState?.executionId) return;
    this.pendingToolCalls++;
  }

  private handleToolComplete(msg: WebSocketMessage): void {
    if (msg.executionId !== this.workflowState?.executionId) return;
    this.pendingToolCalls = Math.max(0, this.pendingToolCalls - 1);
  }

  private handleInputChange(e: Event): void {
    const target = e.target as HTMLTextAreaElement;
    this.inputValue = target.value;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.submitInput();
    }
  }

  private submitInput(): void {
    if (!this.inputValue.trim() || this.isSubmitting || !this.workflowState) return;

    this.isSubmitting = true;

    // Include questionId if we have a text-based question pending
    const questionId = this.textQuestionId || `text-input-${Date.now()}`;

    gateway.send({
      type: 'workflow.interactive.input',
      executionId: this.workflowState.executionId,
      input: this.inputValue.trim(),
      questionId: questionId
    });

    this.dispatchEvent(
      new CustomEvent('workflow-user-input', {
        detail: { input: this.inputValue.trim(), questionId },
        bubbles: true,
        composed: true
      })
    );

    this.inputValue = '';
    this.textQuestionId = null;  // Clear the text question ID
    this.isSubmitting = false;
  }

  private handleCancelRequest(): void {
    // Show confirmation dialog
    this.showCancelConfirm = true;
  }

  private handleCancelConfirm(): void {
    if (!this.workflowState) return;

    this.showCancelConfirm = false;
    this.isCancelling = true;

    this.dispatchEvent(
      new CustomEvent('workflow-cancel', {
        detail: { executionId: this.workflowState.executionId },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleCancelDismiss(): void {
    this.showCancelConfirm = false;
  }

  private handleRetry(): void {
    if (!this.workflowState) return;

    // Clear the error
    this.retryableError = null;

    // Dispatch retry event
    gateway.send({
      type: 'workflow.retry',
      executionId: this.workflowState.executionId
    });

    this.dispatchEvent(
      new CustomEvent('workflow-retry', {
        detail: { executionId: this.workflowState.executionId },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleErrorCancel(): void {
    // Cancel workflow after error
    if (!this.workflowState) return;

    this.dispatchEvent(
      new CustomEvent('workflow-cancel', {
        detail: { executionId: this.workflowState.executionId },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleClose(): void {
    this.dispatchEvent(
      new CustomEvent('workflow-close', {
        bubbles: true,
        composed: true
      })
    );
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      if (this.messagesContainer) {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      }
    });
  }

  override updated(): void {
    this.messagesContainer = this.querySelector('.workflow-messages');
    this.scrollToBottom();
  }

  override render() {
    if (!this.workflowState) {
      return html`<div class="workflow-chat-empty">No active workflow</div>`;
    }

    const { commandName, status, messages, error } = this.workflowState;
    const isRunning = status === 'running' || status === 'starting';
    // Input is enabled when status is waiting_input OR when we have a text-based question
    const isWaitingInput = status === 'waiting_input' || this.textQuestionId !== null;
    const isDone = status === 'completed' || status === 'failed' || status === 'cancelled';

    return html`
      <div class="workflow-chat">
        <div class="workflow-chat-header">
          <div class="workflow-chat-info">
            <span class="workflow-status-icon">${this.getStatusIcon(status)}</span>
            <span class="workflow-name">${commandName}</span>
            <span class="workflow-status-badge ${status}">${this.getStatusLabel(status)}</span>
          </div>
          <div class="workflow-chat-actions">
            ${isRunning && !this.isCancelling
              ? html`
                  <button class="cancel-workflow-btn" @click=${this.handleCancelRequest} title="Cancel workflow">
                    ✕ Abbrechen
                  </button>
                `
              : nothing}
            ${this.isCancelling
              ? html`
                  <span class="cancelling-indicator">
                    <span class="loading-spinner small"></span>
                    Warte auf Abschluss...
                  </span>
                `
              : nothing}
            ${isDone
              ? html`
                  <button class="close-workflow-btn" @click=${this.handleClose} title="Close">
                    ← Back
                  </button>
                `
              : nothing}
          </div>
        </div>

        <aos-workflow-step-indicator
          .currentStep=${this.currentStep}
          .totalSteps=${this.totalSteps}
          .stepName=${this.stepName}
          .status=${this.getStepIndicatorStatus(status)}
        ></aos-workflow-step-indicator>

        <div class="workflow-messages" @scroll=${this.scrollToBottom}>
          ${messages.length === 0 && isRunning
            ? html`
                <div class="workflow-starting">
                  <span class="loading-spinner"></span>
                  <p>Starting workflow...</p>
                </div>
              `
            : nothing}
          ${messages.map((msg) => this.renderMessage(msg))}
          ${this.pendingToolCalls > 0
            ? html`
                <div class="workflow-processing">
                  <aos-loading-spinner size="small" .label=${this.getProcessingLabel()}></aos-loading-spinner>
                </div>
              `
            : nothing}
          ${this.retryableError
            ? html`
                <div class="workflow-error-inline">
                  <div class="error-header">
                    <span class="error-icon">⚠️</span>
                    <span class="error-title">Fehler aufgetreten</span>
                  </div>
                  <div class="error-message">${this.retryableError.message}</div>
                  <div class="error-actions">
                    ${this.retryableError.canRetry
                      ? html`
                          <button class="retry-btn primary" @click=${this.handleRetry}>
                            ↻ Erneut versuchen
                          </button>
                        `
                      : nothing}
                    <button class="retry-btn secondary" @click=${this.handleErrorCancel}>
                      ✕ Abbrechen
                    </button>
                  </div>
                </div>
              `
            : error
              ? html`
                  <div class="workflow-error-message">
                    <span class="error-icon">⚠️</span>
                    <span>${error}</span>
                  </div>
                `
              : nothing}
        </div>

        ${!isDone && !this.retryableError
          ? html`
              <div class="workflow-input-area">
                <div class="input-wrapper">
                  <textarea
                    class="workflow-input"
                    placeholder=${isWaitingInput ? 'Type your response...' : 'Workflow is processing...'}
                    .value=${this.inputValue}
                    @input=${this.handleInputChange}
                    @keydown=${this.handleKeyDown}
                    ?disabled=${!isWaitingInput || this.isSubmitting}
                  ></textarea>
                  <button
                    class="send-btn"
                    @click=${this.submitInput}
                    ?disabled=${!isWaitingInput || !this.inputValue.trim() || this.isSubmitting}
                    title="Send"
                  >
                    ${this.isSubmitting
                      ? html`<span class="loading-spinner small"></span>`
                      : html`<span class="send-icon">→</span>`}
                  </button>
                </div>
              </div>
            `
          : nothing}

        ${this.showCancelConfirm
          ? html`
              <div class="cancel-confirm-overlay">
                <div class="cancel-confirm-dialog">
                  <div class="cancel-confirm-icon">⚠️</div>
                  <div class="cancel-confirm-title">Workflow wirklich abbrechen?</div>
                  <div class="cancel-confirm-message">
                    Der aktuelle Workflow wird beendet. Diese Aktion kann nicht rückgängig gemacht werden.
                  </div>
                  <div class="cancel-confirm-actions">
                    <button class="cancel-confirm-btn secondary" @click=${this.handleCancelDismiss}>
                      Zurück
                    </button>
                    <button class="cancel-confirm-btn primary" @click=${this.handleCancelConfirm}>
                      Ja, abbrechen
                    </button>
                  </div>
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private renderMessage(msg: WorkflowMessage) {
    // Trim whitespace from content to avoid extra space
    const trimmedContent = msg.content?.trim() || '';

    // Render markdown to HTML - use streaming renderer to handle incomplete structures during streaming
    const renderedHtml = msg.isStreaming
      ? renderMarkdownStreaming(trimmedContent)
      : renderMarkdownStreaming(trimmedContent);

    return html`
      <div class="workflow-message ${msg.role}">
        <div class="message-header">
          <span class="role-badge ${msg.role}">${msg.role === 'assistant' ? 'Claude' : msg.role}</span>
          <span class="timestamp">${this.formatTimestamp(msg.timestamp)}</span>
        </div>
        <div class="message-content markdown-content">
          ${unsafeHTML(renderedHtml)}
          ${msg.isStreaming ? html`<span class="cursor"></span>` : ''}
        </div>
      </div>
    `;
  }

  private getStatusIcon(status: InteractiveWorkflowState['status']): string {
    switch (status) {
      case 'starting':
      case 'running':
        return '⚡';
      case 'waiting_input':
        return '💬';
      case 'completed':
        return '✓';
      case 'failed':
        return '✕';
      case 'cancelled':
        return '⊘';
      default:
        return '•';
    }
  }

  private getStatusLabel(status: InteractiveWorkflowState['status']): string {
    switch (status) {
      case 'starting':
        return 'Starting';
      case 'running':
        return 'Running';
      case 'waiting_input':
        return 'Awaiting Input';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  private getStepIndicatorStatus(status: InteractiveWorkflowState['status']): StepIndicatorStatus {
    switch (status) {
      case 'starting':
      case 'running':
      case 'waiting_input':
        return 'running';
      case 'completed':
        return 'completed';
      case 'failed':
      case 'cancelled':
        return 'error';
      default:
        return 'processing';
    }
  }

  private formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private getProcessingLabel(): string {
    if (this.pendingToolCalls > 1) {
      return `Processing (${this.pendingToolCalls} operations)...`;
    }
    return 'Processing...';
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-workflow-chat': AosWorkflowChat;
  }
}
