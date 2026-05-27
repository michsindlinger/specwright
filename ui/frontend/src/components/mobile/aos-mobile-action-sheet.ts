import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './aos-mobile-sheet.js';

export type ActionSheetAction = 'create-spec' | 'create-bug' | 'create-todo';

@customElement('aos-mobile-action-sheet')
export class AosMobileActionSheet extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;

  private _close(): void {
    this.dispatchEvent(new CustomEvent('action-sheet-close', { bubbles: true, composed: true }));
  }

  private _onAction(action: ActionSheetAction): void {
    this.dispatchEvent(
      new CustomEvent<{ action: ActionSheetAction }>('action-select', {
        bubbles: true,
        composed: true,
        detail: { action },
      })
    );
    this._close();
  }

  override render() {
    return html`
      <aos-mobile-sheet
        ?open=${this.open}
        position="bottom"
        label="Create new"
        @sheet-close=${this._close}
      >
        <div class="action-sheet">
          <p class="title">Create</p>

          <ul class="actions" role="list">
            <li role="listitem">
              <button
                class="action-btn touch-target"
                @click=${() => this._onAction('create-spec')}
              >
                <span class="action-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="2.5" y="2.5" width="15" height="15" rx="2" stroke="currentColor" stroke-width="1.4" fill="none"/>
                    <path d="M6 7h8M6 10.5h6M6 14h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                  </svg>
                </span>
                <span class="action-label">New Spec</span>
                <span class="action-desc">Feature specification</span>
              </button>
            </li>

            <li role="listitem">
              <button
                class="action-btn touch-target"
                @click=${() => this._onAction('create-bug')}
              >
                <span class="action-icon action-icon--bug" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="4.5" stroke="currentColor" stroke-width="1.4" fill="none"/>
                    <path d="M10 5.5V3M5.5 10H3M14.5 10H17M6.5 6.5L5 5M13.5 6.5L15 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                    <path d="M7.5 13.5L5.5 15.5M12.5 13.5L14.5 15.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                  </svg>
                </span>
                <span class="action-label">New Bug</span>
                <span class="action-desc">Report an issue</span>
              </button>
            </li>

            <li role="listitem">
              <button
                class="action-btn touch-target"
                @click=${() => this._onAction('create-todo')}
              >
                <span class="action-icon action-icon--todo" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4 10l4 4 8-8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
                <span class="action-label">New Todo</span>
                <span class="action-desc">Quick backlog task</span>
              </button>
            </li>
          </ul>

          <button class="cancel-btn touch-target" @click=${this._close}>
            Cancel
          </button>
        </div>
      </aos-mobile-sheet>
    `;
  }

  static styles = css`
    :host {
      display: contents;
    }

    .touch-target {
      min-height: var(--touch-target-min, 44px);
    }

    .action-sheet {
      padding: 0 var(--space-mobile-md, 0.75rem);
      padding-bottom: calc(var(--space-mobile-md, 0.75rem) + env(safe-area-inset-bottom, 0px));
    }

    .title {
      margin: 0 0 var(--space-mobile-sm, 0.5rem);
      padding: var(--space-mobile-md, 0.75rem) var(--space-mobile-sm, 0.5rem) 0;
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--color-text-muted, #64748b);
    }

    .actions {
      list-style: none;
      margin: 0 0 var(--space-mobile-sm, 0.5rem);
      padding: 0;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: var(--space-mobile-md, 0.75rem);
      width: 100%;
      padding: 0 var(--space-mobile-sm, 0.5rem);
      background: none;
      border: none;
      border-radius: 12px;
      color: var(--color-text-primary, #e8edf2);
      font-family: inherit;
      text-align: left;
      cursor: pointer;
      transition: background 0.12s;
      -webkit-tap-highlight-color: transparent;
    }

    .action-btn:active {
      background: var(--color-bg-hover, #1e3a5f);
    }

    .action-icon {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: var(--color-accent-primary, #00d4ff);
      color: var(--color-bg-sidebar, #0b1929);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .action-icon--bug {
      background: var(--color-accent-error, #ef4444);
      color: #fff;
    }

    .action-icon--todo {
      background: var(--color-accent-success, #22c55e);
      color: #fff;
    }

    .action-label {
      flex: 1;
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.2;
    }

    .action-desc {
      font-size: 0.75rem;
      color: var(--color-text-muted, #64748b);
      white-space: nowrap;
    }

    .cancel-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 0;
      background: var(--color-bg-hover, #1e3a5f);
      border: none;
      border-radius: 12px;
      color: var(--color-text-secondary, #94a3b8);
      font-family: inherit;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.12s, color 0.12s;
      -webkit-tap-highlight-color: transparent;
    }

    .cancel-btn:active {
      background: var(--color-border, #1e3a5f);
      color: var(--color-text-primary, #e8edf2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-action-sheet': AosMobileActionSheet;
  }
}
