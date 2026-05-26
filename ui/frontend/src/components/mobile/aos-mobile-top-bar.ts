import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('aos-mobile-top-bar')
export class AosMobileTopBar extends LitElement {
  @property({ type: String }) workspaceName = '';
  @property({ type: String }) breadcrumb = '';
  @property({ type: String }) avatarSrc = '';
  @property({ type: String }) avatarInitials = '';
  @property({ type: Number }) notificationCount = 0;

  private _onHamburger(): void {
    this.dispatchEvent(new CustomEvent('menu-open', { bubbles: true, composed: true }));
  }

  private _onAvatar(): void {
    this.dispatchEvent(new CustomEvent('avatar-tap', { bubbles: true, composed: true }));
  }

  override render() {
    const label = this.breadcrumb || this.workspaceName;

    return html`
      <header class="top-bar" role="banner">
        <button
          class="icon-btn touch-target hamburger"
          aria-label="Open menu"
          @click=${this._onHamburger}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="2" y="4" width="16" height="2" rx="1" fill="currentColor"/>
            <rect x="2" y="9" width="16" height="2" rx="1" fill="currentColor"/>
            <rect x="2" y="14" width="16" height="2" rx="1" fill="currentColor"/>
          </svg>
        </button>

        <div class="brand">
          <svg class="logo" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <rect width="22" height="22" rx="6" fill="var(--color-accent-primary, #00D4FF)" opacity="0.15"/>
            <path d="M6 11 L11 6 L16 11 L11 16 Z" fill="var(--color-accent-primary, #00D4FF)"/>
          </svg>
          ${label
            ? html`<span class="label">${label}</span>`
            : nothing}
        </div>

        <div class="actions">
          <div class="bell" role="img" aria-label="Notifications${this.notificationCount > 0 ? `, ${this.notificationCount} unread` : ''}">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 2a1 1 0 0 1 1 1v.26A6 6 0 0 1 16 9v3l1.707 1.707A1 1 0 0 1 17 15.5H3a1 1 0 0 1-.707-1.793L4 12V9a6 6 0 0 1 5-5.74V3a1 1 0 0 1 1-1zm0 16a2 2 0 0 0 2-2H8a2 2 0 0 0 2 2z" fill="currentColor"/>
            </svg>
            ${this.notificationCount > 0
              ? html`<span class="bell-badge" aria-hidden="true">${this.notificationCount > 9 ? '9+' : this.notificationCount}</span>`
              : nothing}
          </div>

          <button
            class="avatar-btn touch-target"
            aria-label="Account"
            @click=${this._onAvatar}
          >
            ${this.avatarSrc
              ? html`<img class="avatar-img" src=${this.avatarSrc} alt="" aria-hidden="true"/>`
              : html`<span class="avatar-initials">${this.avatarInitials || '?'}</span>`}
          </button>
        </div>
      </header>
    `;
  }

  static styles = css`
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .top-bar {
      display: flex;
      align-items: center;
      height: var(--mobile-top-bar-height, 52px);
      padding: 0 var(--space-mobile-sm, 0.5rem);
      background: var(--color-bg-sidebar, #0b1929);
      border-bottom: 1px solid var(--color-border, #1e3a5f);
      gap: var(--space-mobile-sm, 0.5rem);
    }

    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      color: var(--color-text-secondary, #94a3b8);
      cursor: pointer;
      border-radius: 8px;
      padding: 0;
      flex-shrink: 0;
      transition: color 0.15s, background 0.15s;
    }

    .icon-btn:active {
      background: var(--color-bg-hover, #1e3a5f);
      color: var(--color-text-primary, #e8edf2);
    }

    .touch-target {
      min-height: var(--touch-target-min, 44px);
      min-width: var(--touch-target-min, 44px);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: var(--space-mobile-sm, 0.5rem);
      flex: 1;
      min-width: 0;
    }

    .logo {
      flex-shrink: 0;
    }

    .label {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-text-primary, #e8edf2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: var(--space-mobile-xs, 0.25rem);
      flex-shrink: 0;
    }

    .bell {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      color: var(--color-text-secondary, #94a3b8);
      pointer-events: none;
    }

    .bell-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      min-width: 14px;
      height: 14px;
      background: var(--color-accent-error, #ef4444);
      border-radius: 7px;
      font-size: 0.625rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 3px;
      line-height: 1;
    }

    .avatar-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 50%;
      padding: 0;
    }

    .avatar-btn:active .avatar-initials,
    .avatar-btn:active .avatar-img {
      opacity: 0.75;
    }

    .avatar-img {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }

    .avatar-initials {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: var(--color-accent-primary, #00d4ff);
      color: var(--color-bg-sidebar, #0b1929);
      font-size: 0.75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-top-bar': AosMobileTopBar;
  }
}
