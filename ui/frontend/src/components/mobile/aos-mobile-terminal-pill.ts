import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { cloudTerminalService } from '../../services/cloud-terminal.service.js';

@customElement('aos-mobile-terminal-pill')
export class AosMobileTerminalPill extends LitElement {
  /** Session count passed from parent (overrides internal subscription when > 0) */
  @property({ type: Number }) sessionsCount = 0;

  @state() private _activeCount = 0;

  private readonly _onSessionEvent = () => {
    void this._refresh();
  };

  private async _refresh(): Promise<void> {
    const sessions = await cloudTerminalService.getAllSessions();
    this._activeCount = sessions.filter(s => s.status === 'active').length;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    void this._refresh();
    window.addEventListener('cloud-terminal-session-paused', this._onSessionEvent);
    window.addEventListener('cloud-terminal-session-resumed', this._onSessionEvent);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('cloud-terminal-session-paused', this._onSessionEvent);
    window.removeEventListener('cloud-terminal-session-resumed', this._onSessionEvent);
  }

  private _onTap(): void {
    this.dispatchEvent(
      new CustomEvent('terminal-pill-tap', {
        bubbles: true,
        composed: true,
        detail: { route: 'cloud-terminal' },
      })
    );
  }

  override render() {
    const count = Math.max(this.sessionsCount, this._activeCount);
    const isLive = count > 0;
    const label = isLive
      ? `Cloud Terminal öffnen · ${count} Session${count !== 1 ? 's' : ''} aktiv`
      : 'Cloud Terminal öffnen';

    return html`
      <button
        class="pill"
        part="pill"
        @click=${this._onTap}
        aria-label="${label}"
      >
        ${isLive ? html`<span class="live-dot" aria-hidden="true"></span>` : nothing}
        <svg class="icon" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <rect x="1.5" y="3" width="15" height="12" rx="2" stroke="currentColor" stroke-width="1.4" fill="none"/>
          <path d="M5 7.5l2.5 2-2.5 2M9.5 11.5h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ${isLive
          ? html`<span class="count" aria-hidden="true">${count > 9 ? '9+' : count}</span>`
          : nothing}
      </button>
    `;
  }

  static styles = css`
    :host {
      display: block;
      position: fixed;
      bottom: calc(var(--mobile-bottom-nav-height, 56px) + env(safe-area-inset-bottom, 0px) + 12px);
      right: 16px;
      z-index: 110;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 10px 14px;
      background: var(--color-bg-sidebar, #0b1929);
      color: var(--color-text-primary, #e8edf2);
      border: 1px solid var(--color-accent-primary, #00d4ff);
      border-radius: var(--radius-full, 9999px);
      font-family: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      min-height: var(--touch-target-min, 44px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45),
                  0 0 0 1px rgba(0, 212, 255, 0.15),
                  0 0 12px rgba(0, 212, 255, 0.12);
      -webkit-tap-highlight-color: transparent;
      transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s;
    }

    .pill:active {
      opacity: 0.88;
      transform: scale(0.95);
    }

    .icon {
      flex-shrink: 0;
      color: var(--color-accent-primary, #00d4ff);
    }

    .count {
      color: var(--color-accent-primary, #00d4ff);
      min-width: 1ch;
      line-height: 1;
    }

    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--color-accent-success, #22c55e);
      flex-shrink: 0;
      animation: pulse 1.6s ease infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.5; transform: scale(0.8); }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-terminal-pill': AosMobileTerminalPill;
  }
}
