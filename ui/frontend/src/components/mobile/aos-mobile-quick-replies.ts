import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { gateway } from '../../gateway.js';
import type { MessageHandler } from '../../gateway.js';
import { stripAnsi } from '../../utils/ansi-strip.js';
import { parseNumberedOptions, type ParsedOption } from '../../utils/parse-numbered-options.js';

export interface ReplySendDetail {
  text: string;
}

const MAX_BUFFER = 8_000;

@customElement('aos-mobile-quick-replies')
export class AosMobileQuickReplies extends LitElement {
  @property({ type: String }) sessionId = '';

  @state() private _options: ParsedOption[] = [];

  private _buffer = '';
  private _dataHandler: MessageHandler | null = null;
  private _bufferHandler: MessageHandler | null = null;
  private _connHandler: MessageHandler | null = null;
  private _currentSid: string | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this._setup();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._teardown();
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('sessionId')) {
      this._teardown();
      this._setup();
    }
  }

  private _setup(): void {
    if (!this.sessionId || this._currentSid === this.sessionId) return;
    this._currentSid = this.sessionId;
    this._buffer = '';
    this._options = [];

    this._dataHandler = (msg) => {
      if (msg.sessionId !== this.sessionId) return;
      if (typeof msg.data !== 'string' || !msg.data) return;
      const stripped = stripAnsi(msg.data);
      if (!stripped) return;
      this._buffer = (this._buffer + stripped).slice(-MAX_BUFFER);
      this._options = parseNumberedOptions(this._buffer);
    };
    gateway.on('cloud-terminal:data', this._dataHandler);

    this._bufferHandler = (msg) => {
      if (msg.sessionId !== this.sessionId) return;
      if (typeof msg.buffer !== 'string') return;
      this._buffer = stripAnsi(msg.buffer).slice(-MAX_BUFFER);
      this._options = parseNumberedOptions(this._buffer);
    };
    gateway.on('cloud-terminal:buffer-response', this._bufferHandler);

    this._connHandler = () => {
      if (this.sessionId) {
        gateway.send({
          type: 'cloud-terminal:buffer-request',
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
        });
      }
    };
    gateway.on('gateway.connected', this._connHandler);

    gateway.send({
      type: 'cloud-terminal:buffer-request',
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  private _teardown(): void {
    if (this._dataHandler) { gateway.off('cloud-terminal:data', this._dataHandler); this._dataHandler = null; }
    if (this._bufferHandler) { gateway.off('cloud-terminal:buffer-response', this._bufferHandler); this._bufferHandler = null; }
    if (this._connHandler) { gateway.off('gateway.connected', this._connHandler); this._connHandler = null; }
    this._currentSid = null;
    this._buffer = '';
    this._options = [];
  }

  private _onTap(opt: ParsedOption): void {
    this.dispatchEvent(
      new CustomEvent<ReplySendDetail>('reply-send', {
        bubbles: true,
        composed: true,
        detail: { text: String(opt.index) },
      })
    );
  }

  override render() {
    if (this._options.length === 0) return nothing;

    return html`
      <div class="strip" role="listbox" aria-label="Antwortoptionen">
        ${this._options.map((opt) => html`
          <button
            class="chip touch-target"
            role="option"
            aria-label="${opt.index}. ${opt.label}"
            @click=${() => this._onTap(opt)}
          >
            <span class="chip-index">${opt.index}</span>
            <span class="chip-label">${opt.label}</span>
          </button>
        `)}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      background: var(--color-bg-sidebar, #0b1929);
      border-top: 1px solid var(--color-border, #1e3a5f);
    }

    .strip {
      display: flex;
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      gap: var(--space-mobile-sm, 0.5rem);
      padding: var(--space-mobile-sm, 0.5rem) var(--space-mobile-md, 1rem);
    }

    .strip::-webkit-scrollbar {
      display: none;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 12px;
      min-height: var(--touch-target-min, 44px);
      max-width: 220px;
      background: color-mix(in srgb, var(--color-accent-primary, #00d4ff) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-accent-primary, #00d4ff) 35%, transparent);
      border-radius: 22px;
      color: var(--color-text-primary, #e8edf2);
      font-family: inherit;
      font-size: 0.8125rem;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s, border-color 0.15s;
    }

    .chip:active {
      background: color-mix(in srgb, var(--color-accent-primary, #00d4ff) 22%, transparent);
      border-color: var(--color-accent-primary, #00d4ff);
    }

    .chip-index {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      background: color-mix(in srgb, var(--color-accent-primary, #00d4ff) 20%, transparent);
      border-radius: 50%;
      font-size: 0.6875rem;
      font-weight: 700;
      color: var(--color-accent-primary, #00d4ff);
      flex-shrink: 0;
    }

    .chip-label {
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      text-align: left;
    }

    .touch-target {
      min-height: var(--touch-target-min, 44px);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-quick-replies': AosMobileQuickReplies;
  }
}
