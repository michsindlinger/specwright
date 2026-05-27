import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('aos-mobile-terminal-header')
export class AosMobileTerminalHeader extends LitElement {
  @property({ type: Number }) sessionsCount = 0;
  @property({ type: String }) activeModel = '';

  private _onBack(): void {
    this.dispatchEvent(new CustomEvent('back-tap', { bubbles: true, composed: true }));
  }

  private _onNewSession(): void {
    this.dispatchEvent(new CustomEvent('new-session', { bubbles: true, composed: true }));
  }

  private _subtext(): string {
    const parts: string[] = [];
    if (this.sessionsCount > 0) {
      parts.push(`${this.sessionsCount} Session${this.sessionsCount !== 1 ? 's' : ''}`);
    }
    if (this.activeModel) {
      parts.push(this.activeModel);
    }
    return parts.join(' · ');
  }

  override render() {
    const subtext = this._subtext();

    return html`
      <header class="terminal-header" role="banner">
        <button
          class="back-btn touch-target"
          aria-label="Back"
          @click=${this._onBack}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12.5 4.5L7 10l5.5 5.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <div class="identity">
          <span class="icon-tile" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <rect x="1.5" y="3" width="15" height="12" rx="2" stroke="currentColor" stroke-width="1.4" fill="none"/>
              <path d="M5 7.5l2.5 2-2.5 2M9.5 11.5h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <div class="text-stack">
            <span class="title">Cloud Terminal</span>
            ${subtext
              ? html`<span class="subtext">${subtext}</span>`
              : nothing}
          </div>
        </div>

        <button
          class="new-btn touch-target"
          aria-label="New session"
          @click=${this._onNewSession}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <span class="new-label">Neue</span>
        </button>
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

    .terminal-header {
      display: flex;
      align-items: center;
      height: var(--mobile-top-bar-height, 52px);
      padding: 0 var(--space-mobile-sm, 0.5rem);
      background: var(--color-bg-sidebar, #0b1929);
      border-bottom: 1px solid var(--color-border, #1e3a5f);
      gap: var(--space-mobile-sm, 0.5rem);
    }

    .back-btn {
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
      -webkit-tap-highlight-color: transparent;
    }

    .back-btn:active {
      background: var(--color-bg-hover, #1e3a5f);
      color: var(--color-text-primary, #e8edf2);
    }

    .touch-target {
      min-height: var(--touch-target-min, 44px);
      min-width: var(--touch-target-min, 44px);
    }

    .identity {
      display: flex;
      align-items: center;
      gap: var(--space-mobile-sm, 0.5rem);
      flex: 1;
      min-width: 0;
    }

    .icon-tile {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--color-accent-primary, #00d4ff);
      color: var(--color-bg-sidebar, #0b1929);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .text-stack {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-text-primary, #e8edf2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }

    .subtext {
      font-size: 0.6875rem;
      color: var(--color-text-muted, #64748b);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.3;
    }

    .new-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      background: none;
      border: 1px solid var(--color-accent-primary, #00d4ff);
      color: var(--color-accent-primary, #00d4ff);
      cursor: pointer;
      border-radius: 8px;
      padding: 0 10px;
      flex-shrink: 0;
      font-family: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      transition: background 0.15s, color 0.15s;
      -webkit-tap-highlight-color: transparent;
    }

    .new-btn:active {
      background: color-mix(in srgb, var(--color-accent-primary, #00d4ff) 15%, transparent);
    }

    .new-label {
      line-height: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-terminal-header': AosMobileTerminalHeader;
  }
}
