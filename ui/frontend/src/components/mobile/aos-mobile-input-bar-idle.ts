import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';

export interface TextSendDetail {
  text: string;
}

@customElement('aos-mobile-input-bar-idle')
export class AosMobileInputBarIdle extends LitElement {
  @property({ type: String }) sessionId = '';

  @state() private _expanded = false;
  @state() private _text = '';

  @query('.text-input') private _input!: HTMLInputElement;

  private _onKeyboardToggle(): void {
    this._expanded = !this._expanded;
    if (this._expanded) {
      this.updateComplete.then(() => this._input?.focus());
    }
  }

  private _onInput(e: Event): void {
    this._text = (e.target as HTMLInputElement).value;
  }

  private _onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this._send();
    }
    if (e.key === 'Escape') {
      this._expanded = false;
      this._text = '';
    }
  }

  private _send(): void {
    const text = this._text.trim();
    if (!text) return;
    this.dispatchEvent(
      new CustomEvent<TextSendDetail>('text-send', {
        bubbles: true,
        composed: true,
        detail: { text },
      })
    );
    this._text = '';
    this._expanded = false;
  }

  private _onMicTap(): void {
    this.dispatchEvent(
      new CustomEvent('show-toast', {
        bubbles: true,
        composed: true,
        detail: { message: 'Voice coming soon', type: 'info' },
      })
    );
  }

  override render() {
    return html`
      <div class="bar" role="group" aria-label="Texteingabe">

        <button
          class="icon-btn keyboard-btn touch-target"
          aria-label="${this._expanded ? 'Tastatur schließen' : 'Tastatur öffnen'}"
          aria-expanded="${this._expanded}"
          @click=${this._onKeyboardToggle}
        >
          ${this._expanded ? _iconKeyboardClose() : _iconKeyboard()}
        </button>

        ${this._expanded
          ? html`
              <input
                class="text-input"
                type="text"
                inputmode="text"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                placeholder="Nachricht eingeben…"
                aria-label="Terminaleingabe"
                .value=${this._text}
                @input=${this._onInput}
                @keydown=${this._onKeydown}
              />
              ${this._text.trim()
                ? html`
                    <button
                      class="icon-btn send-btn touch-target"
                      aria-label="Senden"
                      @click=${this._send}
                    >
                      ${_iconSend()}
                    </button>`
                : nothing}
            `
          : html`
              <button
                class="placeholder-area touch-target"
                aria-label="Texteingabe öffnen"
                @click=${this._onKeyboardToggle}
              >
                <span class="placeholder-text">Nachricht eingeben…</span>
              </button>
            `}

        <button
          class="icon-btn mic-btn touch-target"
          aria-label="Spracheingabe (nicht verfügbar)"
          aria-disabled="true"
          @click=${this._onMicTap}
        >
          ${_iconMic()}
        </button>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      background: var(--color-bg-sidebar, #0b1929);
      border-top: 1px solid var(--color-border, #1e3a5f);
    }

    .bar {
      display: flex;
      align-items: center;
      gap: var(--space-mobile-xs, 0.25rem);
      padding: var(--space-mobile-xs, 0.25rem) var(--space-mobile-sm, 0.5rem);
      min-height: 52px;
    }

    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      padding: 0;
      border-radius: 8px;
      cursor: pointer;
      color: var(--color-text-secondary, #94a3b8);
      flex-shrink: 0;
      -webkit-tap-highlight-color: transparent;
      transition: color 0.15s, background 0.15s;
    }

    .icon-btn:active {
      background: var(--color-bg-hover, #1e3a5f);
      color: var(--color-text-primary, #e8edf2);
    }

    .keyboard-btn {
      color: var(--color-accent-primary, #00d4ff);
    }

    .keyboard-btn:active {
      color: var(--color-accent-primary, #00d4ff);
    }

    .send-btn {
      color: var(--color-accent-primary, #00d4ff);
    }

    .send-btn:active {
      color: var(--color-accent-primary, #00d4ff);
    }

    .mic-btn {
      opacity: 0.35;
      cursor: default;
    }

    .mic-btn:active {
      background: none;
      color: var(--color-text-secondary, #94a3b8);
    }

    .touch-target {
      min-height: var(--touch-target-min, 44px);
      min-width: var(--touch-target-min, 44px);
    }

    .placeholder-area {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
      height: 36px;
      background: color-mix(in srgb, var(--color-text-primary, #e8edf2) 6%, transparent);
      border: 1px solid var(--color-border, #1e3a5f);
      border-radius: 18px;
      padding: 0 var(--space-mobile-md, 1rem);
      cursor: text;
      -webkit-tap-highlight-color: transparent;
      transition: border-color 0.15s, background 0.15s;
    }

    .placeholder-area:active {
      background: color-mix(in srgb, var(--color-text-primary, #e8edf2) 10%, transparent);
      border-color: var(--color-accent-primary, #00d4ff);
    }

    .placeholder-text {
      font-family: inherit;
      font-size: 0.875rem;
      color: var(--color-text-muted, #64748b);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events: none;
    }

    .text-input {
      flex: 1;
      min-width: 0;
      height: 36px;
      background: color-mix(in srgb, var(--color-text-primary, #e8edf2) 6%, transparent);
      border: 1px solid var(--color-accent-primary, #00d4ff);
      border-radius: 18px;
      padding: 0 var(--space-mobile-md, 1rem);
      color: var(--color-text-primary, #e8edf2);
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.875rem;
      outline: none;
      caret-color: var(--color-accent-primary, #00d4ff);
    }

    .text-input::placeholder {
      color: var(--color-text-muted, #64748b);
    }

    .text-input:focus {
      border-color: var(--color-accent-primary, #00d4ff);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent-primary, #00d4ff) 20%, transparent);
    }
  `;
}

function _iconKeyboard() {
  return html`<svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
    <rect x="2" y="5.5" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <path d="M5.5 9.5h1M9.5 9.5h1M13.5 9.5h1M17 9.5h-.5M5.5 13h1M9.5 13h1M13.5 13h1M17 13h-.5M7 16h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}

function _iconKeyboardClose() {
  return html`<svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
    <rect x="2" y="5.5" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <path d="M7 16h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M8 10l6 4M14 10l-6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}

function _iconSend() {
  return html`<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M3 10L17 3l-7 7 7 7-7-7H3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill="none"/>
  </svg>`;
}

function _iconMic() {
  return html`<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="7" y="2" width="6" height="10" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <path d="M4 10c0 3.314 2.686 6 6 6s6-2.686 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    <path d="M10 16v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-input-bar-idle': AosMobileInputBarIdle;
  }
}
