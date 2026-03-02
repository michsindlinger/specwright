import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export interface VoiceAction {
  toolId: string;
  toolName: string;
  status: 'running' | 'complete' | 'error';
  timestamp: string;
  output?: string;
}

@customElement('aos-action-log')
export class AosActionLog extends LitElement {
  @property({ type: Array }) actions: VoiceAction[] = [];

  override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('actions')) {
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      const container = this.renderRoot.querySelector('.action-list');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }

  private formatTime(timestamp: string): string {
    try {
      const d = new Date(timestamp);
      return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  }

  private renderStatusIcon(status: VoiceAction['status']) {
    if (status === 'running') {
      return html`<span class="status-icon status-icon--running"></span>`;
    }
    if (status === 'complete') {
      return html`<span class="status-icon status-icon--complete">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </span>`;
    }
    return html`<span class="status-icon status-icon--error">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </span>`;
  }

  override render() {
    if (this.actions.length === 0) {
      return html`<div class="empty">Warte auf Agent-Aktionen...</div>`;
    }

    return html`
      <div class="action-list">
        ${this.actions.map(action => html`
          <div class="action-item action-item--${action.status}">
            ${this.renderStatusIcon(action.status)}
            <span class="action-name">${action.toolName}</span>
            <span class="action-time">${this.formatTime(action.timestamp)}</span>
          </div>
        `)}
      </div>
    `;
  }

  static override styles = css`
    :host {
      display: block;
    }

    .action-list {
      max-height: 160px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      scrollbar-width: thin;
      scrollbar-color: var(--color-bg-tertiary, #1e1e2e) transparent;
    }

    .action-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      background: var(--color-bg-secondary, #16162a);
      font-size: 0.8125rem;
      transition: opacity 0.2s;
    }

    .action-item--running {
      border-left: 2px solid var(--color-accent-primary, #818cf8);
    }

    .action-item--complete {
      opacity: 0.7;
    }

    .action-item--error {
      border-left: 2px solid var(--color-accent-red, #f87171);
    }

    .status-icon {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .status-icon--running {
      width: 12px;
      height: 12px;
      border: 2px solid var(--color-accent-primary, #818cf8);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .status-icon--complete {
      color: var(--color-accent-green, #4ade80);
    }

    .status-icon--error {
      color: var(--color-accent-red, #f87171);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .action-name {
      flex: 1;
      color: var(--color-text-primary, #e0e0e0);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .action-time {
      flex-shrink: 0;
      font-size: 0.75rem;
      color: var(--color-text-tertiary, #707080);
      font-variant-numeric: tabular-nums;
    }

    .empty {
      padding: 1rem;
      text-align: center;
      font-size: 0.8125rem;
      color: var(--color-text-tertiary, #707080);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-action-log': AosActionLog;
  }
}
