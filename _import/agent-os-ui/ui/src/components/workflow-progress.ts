import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export interface WorkflowExecution {
  id: string;
  commandId: string;
  commandName: string;
  startTime: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  output?: string;
  error?: string;
  progress?: number;
  terminalSessionId?: string; // For PTY-based workflow terminal reconnection
}

@customElement('aos-workflow-progress')
export class AosWorkflowProgress extends LitElement {
  @property({ type: Object }) execution!: WorkflowExecution;
  @property({ type: Boolean }) expanded = false;

  @state() private elapsed = '0s';
  private elapsedInterval: number | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.startElapsedTimer();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopElapsedTimer();
  }

  override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('execution')) {
      if (this.execution.status === 'running') {
        this.startElapsedTimer();
      } else {
        this.stopElapsedTimer();
      }
    }
  }

  private startElapsedTimer(): void {
    if (this.elapsedInterval) return;

    this.updateElapsed();
    this.elapsedInterval = window.setInterval(() => {
      this.updateElapsed();
    }, 1000);
  }

  private stopElapsedTimer(): void {
    if (this.elapsedInterval) {
      clearInterval(this.elapsedInterval);
      this.elapsedInterval = null;
    }
  }

  private updateElapsed(): void {
    const start = new Date(this.execution.startTime).getTime();
    const now = Date.now();
    const diff = Math.floor((now - start) / 1000);

    if (diff < 60) {
      this.elapsed = `${diff}s`;
    } else if (diff < 3600) {
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      this.elapsed = `${mins}m ${secs}s`;
    } else {
      const hours = Math.floor(diff / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      this.elapsed = `${hours}h ${mins}m`;
    }
  }

  private handleCancel(): void {
    this.dispatchEvent(
      new CustomEvent('workflow-cancel', {
        detail: { executionId: this.execution.id },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleToggleExpand(): void {
    this.expanded = !this.expanded;
  }

  private handleCopyLog(): void {
    const text = this.execution.output || this.execution.error || '';
    navigator.clipboard.writeText(text);
  }

  private handleBackground(): void {
    this.dispatchEvent(
      new CustomEvent('workflow-background', {
        detail: { executionId: this.execution.id },
        bubbles: true,
        composed: true
      })
    );
  }

  private getStatusIcon(): string {
    switch (this.execution.status) {
      case 'running':
        return '⏳';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'cancelled':
        return '🛑';
      default:
        return '❓';
    }
  }

  private getStatusClass(): string {
    return `progress-card ${this.execution.status}`;
  }

  override render() {
    const isRunning = this.execution.status === 'running';
    const isFailed = this.execution.status === 'failed';

    return html`
      <div class=${this.getStatusClass()}>
        <div class="progress-header">
          <div class="progress-info">
            <span class="status-icon">${this.getStatusIcon()}</span>
            <span class="command-name">${this.execution.commandName}</span>
            <span class="elapsed-time">${this.elapsed}</span>
          </div>
          <div class="progress-actions">
            ${isRunning
              ? html`
                  <button
                    class="background-btn"
                    @click=${this.handleBackground}
                    title="Run in background"
                  >
                    ↗
                  </button>
                  <button
                    class="cancel-btn"
                    @click=${this.handleCancel}
                    title="Cancel workflow"
                  >
                    ✕
                  </button>
                `
              : ''}
            <button
              class="expand-btn"
              @click=${this.handleToggleExpand}
              title="${this.expanded ? 'Collapse' : 'Expand'}"
            >
              ${this.expanded ? '▼' : '▶'}
            </button>
          </div>
        </div>

        ${isRunning && this.execution.progress !== undefined
          ? html`
              <div class="progress-bar-container">
                <div
                  class="progress-bar"
                  style="width: ${this.execution.progress}%"
                ></div>
              </div>
            `
          : ''}

        ${this.expanded
          ? html`
              <div class="progress-output">
                <div class="output-header">
                  <span class="output-label">Output</span>
                  ${(this.execution.output || this.execution.error)
                    ? html`
                        <button class="copy-btn" @click=${this.handleCopyLog}>
                          Copy
                        </button>
                      `
                    : ''}
                </div>
                <pre class="output-content ${isFailed ? 'error' : ''}">${
                  this.execution.output || this.execution.error || 'No output yet...'
                }</pre>
              </div>
            `
          : ''}
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-workflow-progress': AosWorkflowProgress;
  }
}
