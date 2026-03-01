import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type InputMode = 'push-to-talk' | 'voice-activity';

@customElement('aos-call-controls')
export class AosCallControls extends LitElement {
  @property({ type: Boolean }) muted = false;
  @property({ type: String, attribute: 'input-mode' }) inputMode: InputMode = 'voice-activity';
  @property({ type: Boolean, attribute: 'call-active' }) callActive = false;
  @property({ type: Boolean, attribute: 'ptt-active' }) pttActive = false;

  private boundKeyDown = (e: KeyboardEvent): void => this.handleKeyDown(e);
  private boundKeyUp = (e: KeyboardEvent): void => this.handleKeyUp(e);

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('keydown', this.boundKeyDown);
    document.addEventListener('keyup', this.boundKeyUp);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.boundKeyDown);
    document.removeEventListener('keyup', this.boundKeyUp);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.code !== 'Space' || this.inputMode !== 'push-to-talk' || !this.callActive || e.repeat) return;
    e.preventDefault();
    this.dispatchEvent(new CustomEvent('ptt-start', { bubbles: true, composed: true }));
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.code !== 'Space' || this.inputMode !== 'push-to-talk' || !this.callActive) return;
    e.preventDefault();
    this.dispatchEvent(new CustomEvent('ptt-end', { bubbles: true, composed: true }));
  }

  private onMuteToggle(): void {
    this.dispatchEvent(new CustomEvent('mute-toggle', { bubbles: true, composed: true }));
  }

  private onHangUp(): void {
    this.dispatchEvent(new CustomEvent('hang-up', { bubbles: true, composed: true }));
  }

  private onModeChange(): void {
    const newMode: InputMode = this.inputMode === 'push-to-talk' ? 'voice-activity' : 'push-to-talk';
    this.dispatchEvent(new CustomEvent<{ mode: InputMode }>('mode-change', {
      detail: { mode: newMode },
      bubbles: true,
      composed: true,
    }));
  }

  override render() {
    if (!this.callActive) return nothing;

    return html`
      <div class="controls">
        <button
          class="control-btn control-btn--mode"
          @click=${this.onModeChange}
          title="${this.inputMode === 'push-to-talk' ? 'Wechsel zu VAD' : 'Wechsel zu Push-to-Talk'}"
        >
          ${this.inputMode === 'voice-activity' ? html`
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M12 3v18"/>
              <path d="M8 6v12"/>
              <path d="M16 6v12"/>
              <path d="M4 9v6"/>
              <path d="M20 9v6"/>
            </svg>
          ` : html`
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="10" width="20" height="6" rx="2"/>
            </svg>
          `}
          <span class="mode-label">${this.inputMode === 'voice-activity' ? 'VAD' : 'PTT'}</span>
        </button>

        <button
          class="control-btn ${this.muted ? 'control-btn--active' : ''}"
          @click=${this.onMuteToggle}
          title="${this.muted ? 'Unmute' : 'Mute'}"
        >
          ${this.muted ? html`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="1" y1="1" x2="23" y2="23"/>
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          ` : html`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          `}
        </button>

        <button
          class="control-btn control-btn--hangup"
          @click=${this.onHangUp}
          title="Auflegen"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/>
            <line x1="23" y1="1" x2="1" y2="23"/>
          </svg>
        </button>
      </div>

      ${this.inputMode === 'push-to-talk' ? html`
        <div class="ptt-hint ${this.pttActive ? 'ptt-hint--active' : ''}">
          ${this.pttActive ? 'Aufnahme...' : 'Leertaste gedrueckt halten'}
        </div>
      ` : nothing}
    `;
  }

  static override styles = css`
    :host {
      display: block;
    }

    .controls {
      display: flex;
      gap: 1.5rem;
      align-items: center;
      justify-content: center;
    }

    .control-btn {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-bg-tertiary, #1e1e2e);
      color: var(--color-text-primary, #e0e0e0);
      transition: background 0.15s, transform 0.1s;
    }

    .control-btn:hover {
      background: var(--color-bg-secondary, #16162a);
      transform: scale(1.05);
    }

    .control-btn:active {
      transform: scale(0.95);
    }

    .control-btn--active {
      background: var(--color-accent-primary, #818cf8);
      color: white;
    }

    .control-btn--hangup {
      width: 64px;
      height: 64px;
      background: var(--color-accent-red, #f87171);
      color: white;
    }

    .control-btn--hangup:hover {
      background: #ef4444;
    }

    .control-btn--mode {
      width: 48px;
      height: 48px;
      flex-direction: column;
      gap: 2px;
    }

    .mode-label {
      font-size: 0.5rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .ptt-hint {
      text-align: center;
      margin-top: 0.75rem;
      font-size: 0.75rem;
      color: var(--color-text-tertiary, #707080);
      transition: color 0.15s;
    }

    .ptt-hint--active {
      color: var(--color-accent-green, #4ade80);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-call-controls': AosCallControls;
  }
}
