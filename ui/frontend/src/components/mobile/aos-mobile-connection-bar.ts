import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('aos-mobile-connection-bar')
export class AosMobileConnectionBar extends LitElement {
  @property({ type: Boolean }) connected = false;
  @property({ type: String }) cloudHost = '';
  @property({ type: String }) branch = '';

  private _onKebab(): void {
    this.dispatchEvent(new CustomEvent('kebab-tap', { bubbles: true, composed: true }));
  }

  private _info(): string {
    const parts: string[] = [];
    if (this.cloudHost) parts.push(this.cloudHost);
    if (this.branch) parts.push(this.branch);
    return parts.join(' · ');
  }

  override render() {
    const info = this._info();
    const label = this.connected ? 'Verbunden' : 'Getrennt';

    return html`
      <div class="bar" role="status" aria-live="polite">
        <span class="status-badge ${this.connected ? 'status-badge--connected' : 'status-badge--disconnected'}">
          <span class="status-dot" aria-hidden="true"></span>
          <span class="status-label">${label}</span>
        </span>

        ${info
          ? html`<span class="info" aria-label="Server: ${info}">${info}</span>`
          : nothing}

        <button
          class="kebab-btn touch-target"
          aria-label="Verbindungsoptionen"
          @click=${this._onKebab}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="3" r="1.2" fill="currentColor"/>
            <circle cx="8" cy="8" r="1.2" fill="currentColor"/>
            <circle cx="8" cy="13" r="1.2" fill="currentColor"/>
          </svg>
        </button>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      background: var(--color-bg-sidebar, #0b1929);
      border-bottom: 1px solid var(--color-border, #1e3a5f);
    }

    .bar {
      display: flex;
      align-items: center;
      gap: var(--space-mobile-sm, 0.5rem);
      padding: 0 var(--space-mobile-sm, 0.5rem) 0 var(--space-mobile-md, 1rem);
      min-height: 36px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: 100px;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      flex-shrink: 0;
    }

    .status-badge--connected {
      background: color-mix(in srgb, #22c55e 12%, transparent);
      color: #22c55e;
    }

    .status-badge--disconnected {
      background: color-mix(in srgb, #ef4444 12%, transparent);
      color: #ef4444;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      flex-shrink: 0;
    }

    .status-badge--connected .status-dot {
      animation: pulse-dot 2s ease-in-out infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .status-label {
      line-height: 1;
    }

    .info {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.75rem;
      color: var(--color-text-muted, #64748b);
      font-family: var(--font-mono, ui-monospace, monospace);
      min-width: 0;
    }

    .kebab-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      color: var(--color-text-muted, #64748b);
      cursor: pointer;
      border-radius: 8px;
      padding: 0;
      flex-shrink: 0;
      -webkit-tap-highlight-color: transparent;
      transition: color 0.15s, background 0.15s;
      margin-left: auto;
    }

    .kebab-btn:active {
      background: var(--color-bg-hover, #1e3a5f);
      color: var(--color-text-primary, #e8edf2);
    }

    .touch-target {
      min-height: var(--touch-target-min, 44px);
      min-width: var(--touch-target-min, 44px);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-connection-bar': AosMobileConnectionBar;
  }
}
