import { LitElement, html, css } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { ChatMessageData } from '../chat-message.js';
import '../chat-message.js';
import '../loading-spinner.js';
import '../model-selector.js';

/**
 * Presentational chat component for interaction with specifications.
 * (CHAT-002)
 */
@customElement('aos-spec-chat')
export class AosSpecChat extends LitElement {
  @property({ type: Array }) messages: ChatMessageData[] = [];
  @property({ type: Boolean }) isLoading = false;
  @property({ type: String }) placeholder = 'Frage zur Spec stellen...';

  @state() private _inputValue = '';

  @query('.messages-container')
  private _messagesContainer!: HTMLElement;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-color-secondary, #1e1e1e);
      color: var(--text-color, #e5e5e5);
      font-family: var(--font-family, sans-serif);
      border-left: 1px solid var(--border-color, #404040);
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      scrollbar-width: thin;
      scrollbar-color: var(--border-color, #404040) transparent;
    }

    .messages-container::-webkit-scrollbar {
      width: 6px;
    }

    .messages-container::-webkit-scrollbar-thumb {
      background-color: var(--border-color, #404040);
      border-radius: 3px;
    }

    .input-area {
      padding: 1rem;
      border-top: 1px solid var(--border-color, #404040);
      background: var(--bg-color-primary, #171717);
      display: flex;
      gap: 0.5rem;
      align-items: flex-end;
    }

    textarea {
      flex: 1;
      background: var(--bg-color-secondary, #262626);
      border: 1px solid var(--border-color, #404040);
      border-radius: 4px;
      color: var(--text-color, #e5e5e5);
      padding: 0.75rem;
      font-family: inherit;
      font-size: 0.9rem;
      resize: none;
      min-height: 40px;
      max-height: 150px;
      transition: border-color 0.2s;
    }

    textarea:focus {
      outline: none;
      border-color: var(--primary-color, #3b82f6);
    }

    button {
      background: var(--primary-color, #3b82f6);
      color: white;
      border: none;
      border-radius: 4px;
      padding: 0.75rem 1rem;
      cursor: pointer;
      font-weight: 600;
      transition: opacity 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    button:hover {
      opacity: 0.9;
    }

    button:disabled {
      background: var(--border-color, #404040);
      cursor: not-allowed;
    }

    .loading-indicator {
      display: flex;
      justify-content: center;
      padding: 0.5rem;
    }

    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0.5;
      text-align: center;
      padding: 2rem;
    }

    .empty-state svg {
      margin-bottom: 1rem;
      width: 48px;
      height: 48px;
    }

    .chat-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-color, #404040);
      background: var(--bg-color-primary, #171717);
      display: flex;
      justify-content: flex-end;
      align-items: center;
    }
  `;

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('messages')) {
      this._scrollToBottom();
    }
  }

  private _scrollToBottom() {
    requestAnimationFrame(() => {
      this._messagesContainer.scrollTop = this._messagesContainer.scrollHeight;
    });
  }

  private _handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this._inputValue = target.value;

    // Auto-resize textarea
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this._handleSubmit();
    }
  }

  private _handleSubmit() {
    const text = this._inputValue.trim();
    if (!text || this.isLoading) return;

    this.dispatchEvent(new CustomEvent('send-message', {
      detail: { text },
      bubbles: true,
      composed: true
    }));

    this._inputValue = '';
    const textarea = this.shadowRoot?.querySelector('textarea');
    if (textarea) {
      textarea.value = '';
      textarea.style.height = 'auto';
    }
  }

  render() {
    return html`
      <div class="chat-header">
        <aos-model-selector></aos-model-selector>
      </div>

      <div class="messages-container">
        ${this.messages.length === 0 ? this._renderEmptyState() : this.messages.map(msg => html`
          <aos-chat-message .message=${msg}></aos-chat-message>
        `)}
        ${this.isLoading ? html`
          <div class="loading-indicator">
            <aos-loading-spinner></aos-loading-spinner>
          </div>
        ` : ''}
      </div>

      <div class="input-area">
        <textarea
          .value=${this._inputValue}
          @input=${this._handleInput}
          @keydown=${this._handleKeyDown}
          placeholder=${this.placeholder}
          rows="1"
          ?disabled=${this.isLoading}
        ></textarea>
        <button
          @click=${this._handleSubmit}
          ?disabled=${!this._inputValue.trim() || this.isLoading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    `;
  }

  private _renderEmptyState() {
    return html`
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <p>Noch keine Nachrichten.<br>Stelle eine Frage zu dieser Spezifikation.</p>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-spec-chat': AosSpecChat;
  }
}
