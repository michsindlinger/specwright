import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export interface TranscriptMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: string;
  isInterim?: boolean;
}

@customElement('aos-call-transcript')
export class AosCallTranscript extends LitElement {
  @property({ type: Array }) messages: TranscriptMessage[] = [];

  override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('messages')) {
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      const container = this.renderRoot.querySelector('.transcript-list');
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

  override render() {
    if (this.messages.length === 0) {
      return html`<div class="empty">Gespraech startet...</div>`;
    }

    return html`
      <div class="transcript-list">
        ${this.messages.map(msg => html`
          <div class="message message--${msg.role}${msg.isInterim ? ' message--interim' : ''}">
            <div class="message-header">
              <span class="message-role">${msg.role === 'user' ? 'Du' : 'Agent'}</span>
              <span class="message-time">${this.formatTime(msg.timestamp)}</span>
            </div>
            <p class="message-text">${msg.text}</p>
          </div>
        `)}
      </div>
    `;
  }

  static override styles = css`
    :host {
      display: block;
    }

    .transcript-list {
      max-height: 200px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      scrollbar-width: thin;
      scrollbar-color: var(--color-bg-tertiary, #1e1e2e) transparent;
    }

    .message {
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      background: var(--color-bg-secondary, #16162a);
    }

    .message--user {
      border-left: 3px solid var(--color-accent-primary, #818cf8);
    }

    .message--agent {
      border-left: 3px solid var(--color-accent-green, #4ade80);
    }

    .message--interim {
      opacity: 0.5;
    }

    .message--interim .message-text {
      font-style: italic;
    }

    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
    }

    .message-role {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .message--user .message-role {
      color: var(--color-accent-primary, #818cf8);
    }

    .message--agent .message-role {
      color: var(--color-accent-green, #4ade80);
    }

    .message-time {
      font-size: 0.6875rem;
      color: var(--color-text-tertiary, #707080);
      font-variant-numeric: tabular-nums;
    }

    .message-text {
      margin: 0;
      font-size: 0.875rem;
      color: var(--color-text-primary, #e0e0e0);
      line-height: 1.4;
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
    'aos-call-transcript': AosCallTranscript;
  }
}
