import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { cloudTerminalService } from '../../services/cloud-terminal.service.js';

export type BottomNavItem = 'home' | 'specs' | 'terminal' | 'me';

@customElement('aos-mobile-bottom-nav')
export class AosMobileBottomNav extends LitElement {
  @property({ type: String, reflect: true }) activeItem: BottomNavItem = 'home';
  /** Session count override (when > 0). Otherwise live-subscribed via cloudTerminalService. */
  @property({ type: Number }) sessionsCount = 0;

  @state() private _liveSessions = 0;

  private readonly _onSessionEvent = () => {
    void this._refreshSessions();
  };

  private async _refreshSessions(): Promise<void> {
    const sessions = await cloudTerminalService.getAllSessions();
    this._liveSessions = sessions.filter(s => s.status === 'active').length;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    void this._refreshSessions();
    window.addEventListener('cloud-terminal-session-paused', this._onSessionEvent);
    window.addEventListener('cloud-terminal-session-resumed', this._onSessionEvent);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('cloud-terminal-session-paused', this._onSessionEvent);
    window.removeEventListener('cloud-terminal-session-resumed', this._onSessionEvent);
  }

  private get _effectiveSessionsCount(): number {
    return Math.max(this.sessionsCount, this._liveSessions);
  }

  private _onNavTap(item: BottomNavItem): void {
    if (item === this.activeItem) return;
    this.dispatchEvent(
      new CustomEvent<{ item: BottomNavItem }>('nav-tap', {
        bubbles: true,
        composed: true,
        detail: { item },
      })
    );
  }

  private _onFabTap(): void {
    this.dispatchEvent(new CustomEvent('fab-tap', { bubbles: true, composed: true }));
  }

  private _badge(count: number) {
    if (count <= 0) return nothing;
    return html`<span class="live-badge" aria-label="${count} active session${count !== 1 ? 's' : ''}">${count > 9 ? '9+' : count}</span>`;
  }

  override render() {
    return html`
      <nav class="bottom-nav" role="navigation" aria-label="Main navigation">
        <button
          class="nav-item ${this.activeItem === 'home' ? 'nav-item--active' : ''}"
          aria-label="Home"
          aria-current=${this.activeItem === 'home' ? 'page' : nothing}
          @click=${() => this._onNavTap('home')}
        >
          <svg class="nav-icon" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path d="M3 9.5L11 3l8 6.5V19a1 1 0 0 1-1 1H14v-5h-4v5H4a1 1 0 0 1-1-1V9.5Z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>
          </svg>
          <span class="nav-label">Home</span>
        </button>

        <button
          class="nav-item ${this.activeItem === 'specs' ? 'nav-item--active' : ''}"
          aria-label="Specs"
          aria-current=${this.activeItem === 'specs' ? 'page' : nothing}
          @click=${() => this._onNavTap('specs')}
        >
          <svg class="nav-icon" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M7 8h8M7 12h6M7 16h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span class="nav-label">Specs</span>
        </button>

        <button
          class="fab"
          aria-label="Create new"
          @click=${this._onFabTap}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>

        <button
          class="nav-item ${this.activeItem === 'terminal' ? 'nav-item--active' : ''}"
          aria-label="Terminal${this._effectiveSessionsCount > 0 ? `, ${this._effectiveSessionsCount} active session${this._effectiveSessionsCount !== 1 ? 's' : ''}` : ''}"
          aria-current=${this.activeItem === 'terminal' ? 'page' : nothing}
          @click=${() => this._onNavTap('terminal')}
        >
          <span class="nav-icon-wrap">
            <svg class="nav-icon" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <rect x="2" y="4" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M6 9l3 3-3 3M12 15h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ${this._badge(this._effectiveSessionsCount)}
          </span>
          <span class="nav-label">Terminal</span>
        </button>

        <button
          class="nav-item ${this.activeItem === 'me' ? 'nav-item--active' : ''}"
          aria-label="Me"
          aria-current=${this.activeItem === 'me' ? 'page' : nothing}
          @click=${() => this._onNavTap('me')}
        >
          <svg class="nav-icon" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <circle cx="11" cy="8" r="3.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M4 19c0-3.866 3.134-7 7-7h0a7 7 0 0 1 7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          </svg>
          <span class="nav-label">Me</span>
        </button>
      </nav>
    `;
  }

  static styles = css`
    :host {
      display: block;
      position: sticky;
      bottom: 0;
      z-index: 100;
    }

    .bottom-nav {
      display: flex;
      align-items: center;
      height: var(--mobile-bottom-nav-height, 60px);
      padding: 0 var(--space-mobile-xs, 0.25rem);
      padding-bottom: env(safe-area-inset-bottom, 0);
      background: var(--color-bg-sidebar, #0b1929);
      border-top: 1px solid var(--color-border, #1e3a5f);
    }

    .nav-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      min-height: var(--touch-target-min, 44px);
      padding: 0;
      background: none;
      border: none;
      color: var(--color-text-secondary, #94a3b8);
      font-family: inherit;
      font-size: 0.625rem;
      font-weight: 500;
      cursor: pointer;
      border-radius: 8px;
      transition: color 0.15s, background 0.15s;
      letter-spacing: 0.01em;
      -webkit-tap-highlight-color: transparent;
    }

    .nav-item:active {
      background: var(--color-bg-hover, #1e3a5f);
    }

    .nav-item--active {
      color: var(--color-accent-primary, #00d4ff);
      cursor: default;
    }

    .nav-item--active .nav-label {
      font-weight: 600;
    }

    .nav-icon {
      flex-shrink: 0;
    }

    .nav-icon-wrap {
      position: relative;
      display: inline-flex;
    }

    .nav-label {
      line-height: 1;
    }

    .live-badge {
      position: absolute;
      top: -4px;
      right: -6px;
      min-width: 14px;
      height: 14px;
      padding: 0 3px;
      background: var(--color-accent-error, #ef4444);
      color: #fff;
      border-radius: 7px;
      font-size: 0.5625rem;
      font-weight: 700;
      line-height: 14px;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    .fab {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-accent-primary, #00d4ff);
      color: var(--color-bg-sidebar, #0b1929);
      border: none;
      border-radius: 50%;
      cursor: pointer;
      margin: 0 var(--space-mobile-sm, 0.5rem);
      flex: 0 0 auto;
      box-shadow: 0 2px 8px rgba(0, 212, 255, 0.35);
      transition: opacity 0.15s, transform 0.1s;
      -webkit-tap-highlight-color: transparent;
    }

    .fab:active {
      opacity: 0.85;
      transform: scale(0.94);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-bottom-nav': AosMobileBottomNav;
  }
}
