import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { TerminalSession } from '../terminal/aos-cloud-terminal-sidebar.js';
import { getTabTitle } from '../terminal/tab-title.js';

@customElement('aos-mobile-session-tabs')
export class AosMobileSessionTabs extends LitElement {
  @property({ type: Array }) sessions: TerminalSession[] = [];
  @property({ type: String }) activeSessionId: string | null = null;

  private _onSelect(sessionId: string): void {
    if (sessionId === this.activeSessionId) return;
    this.dispatchEvent(
      new CustomEvent<{ sessionId: string }>('session-select', {
        bubbles: true,
        composed: true,
        detail: { sessionId },
      })
    );
  }

  private _onClose(e: Event, session: TerminalSession): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent<{ sessionId: string; status: string; isWorkflow: boolean }>('session-close', {
        bubbles: true,
        composed: true,
        detail: {
          sessionId: session.id,
          status: session.status,
          isWorkflow: session.isWorkflow ?? false,
        },
      })
    );
  }

  private _statusColor(status: TerminalSession['status']): string {
    switch (status) {
      case 'active': return 'var(--color-status-active, #22c55e)';
      case 'paused': return 'var(--color-status-paused, #f59e0b)';
      case 'error': return 'var(--color-status-error, #ef4444)';
      default: return 'var(--color-text-muted, #64748b)';
    }
  }

  override render() {
    if (this.sessions.length === 0) {
      return html`<div class="empty">Keine Sessions aktiv</div>`;
    }

    return html`
      <div class="tabs-scroll" role="tablist" aria-label="Terminal sessions">
        ${this.sessions.map((session) => {
          const isActive = session.id === this.activeSessionId;
          const title = getTabTitle(session);
          return html`
            <button
              class="tab ${isActive ? 'tab--active' : ''}"
              role="tab"
              aria-selected=${isActive}
              aria-label="${title}"
              title="${title} (${session.status})"
              @click=${() => this._onSelect(session.id)}
            >
              <span
                class="status-dot"
                aria-hidden="true"
                style="background:${this._statusColor(session.status)}"
              ></span>
              <span class="tab-name">${title}</span>
              ${session.needsInput
                ? html`<span class="input-badge" aria-label="Eingabe erforderlich">!</span>`
                : nothing}
              <button
                class="close-btn"
                aria-label="Session schließen: ${title}"
                @click=${(e: Event) => this._onClose(e, session)}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                </svg>
              </button>
            </button>
          `;
        })}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      background: var(--color-bg-sidebar, #0b1929);
      border-bottom: 1px solid var(--color-border, #1e3a5f);
    }

    .tabs-scroll {
      display: flex;
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      gap: 2px;
      padding: 0 var(--space-mobile-sm, 0.5rem);
    }

    .tabs-scroll::-webkit-scrollbar {
      display: none;
    }

    .tab {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 10px;
      min-height: var(--touch-target-min, 44px);
      min-width: 80px;
      max-width: 160px;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--color-text-secondary, #94a3b8);
      font-family: inherit;
      font-size: 0.8125rem;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
      transition: color 0.15s, border-color 0.15s;
      -webkit-tap-highlight-color: transparent;
    }

    .tab--active {
      color: var(--color-text-primary, #e8edf2);
      border-bottom-color: var(--color-accent-primary, #00d4ff);
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .tab-name {
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      text-align: left;
    }

    .input-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      background: var(--color-status-paused, #f59e0b);
      border-radius: 50%;
      font-size: 9px;
      font-weight: 700;
      color: #000;
      flex-shrink: 0;
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      padding: 0;
      background: none;
      border: none;
      border-radius: 4px;
      color: var(--color-text-muted, #64748b);
      cursor: pointer;
      flex-shrink: 0;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s, color 0.15s;
    }

    .close-btn:active {
      background: var(--color-bg-hover, #1e3a5f);
      color: var(--color-text-primary, #e8edf2);
    }

    .empty {
      display: flex;
      align-items: center;
      padding: 0 var(--space-mobile-md, 1rem);
      min-height: 40px;
      color: var(--color-text-muted, #64748b);
      font-size: 0.8125rem;
      font-style: italic;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-session-tabs': AosMobileSessionTabs;
  }
}
