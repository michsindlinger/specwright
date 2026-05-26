import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type MobileTab = 'specs' | 'backlog' | 'docs';

@customElement('aos-mobile-segmented')
export class AosMobileSegmented extends LitElement {
  @property({ type: String, reflect: true }) activeTab: MobileTab = 'specs';
  @property({ type: Number }) specsCount = 0;
  @property({ type: Number }) backlogCount = 0;
  @property({ type: Number }) docsCount = 0;

  private _select(tab: MobileTab): void {
    if (tab === this.activeTab) return;
    this.activeTab = tab;
    this.dispatchEvent(
      new CustomEvent<{ tab: MobileTab }>('tab-change', {
        bubbles: true,
        composed: true,
        detail: { tab },
      })
    );
  }

  private _badge(count: number) {
    if (count <= 0) return nothing;
    return html`<span class="badge" aria-hidden="true">${count > 99 ? '99+' : count}</span>`;
  }

  override render() {
    const tabs: Array<{ id: MobileTab; label: string; count: number }> = [
      { id: 'specs', label: 'Specs', count: this.specsCount },
      { id: 'backlog', label: 'Backlog', count: this.backlogCount },
      { id: 'docs', label: 'Docs', count: this.docsCount },
    ];

    return html`
      <div class="segmented" role="tablist" aria-label="Dashboard views">
        ${tabs.map(
          ({ id, label, count }) => html`
            <button
              class="segment ${this.activeTab === id ? 'segment--active' : ''}"
              role="tab"
              aria-selected=${this.activeTab === id}
              aria-controls="tab-panel-${id}"
              id="tab-${id}"
              @click=${() => this._select(id)}
            >
              <span class="segment-label">${label}</span>
              ${this._badge(count)}
            </button>
          `
        )}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      padding: var(--space-mobile-xs, 0.25rem) var(--space-mobile-screen-x, 1rem);
      background: var(--color-bg-sidebar, #0b1929);
    }

    .segmented {
      display: flex;
      background: var(--color-bg-surface, #112240);
      border-radius: 10px;
      padding: 3px;
      gap: 0;
    }

    .segment {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      min-height: var(--touch-target-min, 44px);
      padding: 0 var(--space-mobile-xs, 0.25rem);
      background: none;
      border: none;
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary, #94a3b8);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      white-space: nowrap;
    }

    .segment:active:not(.segment--active) {
      background: var(--color-bg-hover, #1e3a5f);
      color: var(--color-text-primary, #e8edf2);
    }

    .segment--active {
      background: var(--color-bg-sidebar, #0b1929);
      color: var(--color-text-primary, #e8edf2);
      font-weight: 600;
      cursor: default;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
    }

    .segment-label {
      line-height: 1;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      background: var(--color-accent-primary, #00d4ff);
      color: var(--color-bg-sidebar, #0b1929);
      border-radius: 9px;
      font-size: 0.6875rem;
      font-weight: 700;
      line-height: 1;
    }

    .segment--active .badge {
      background: var(--color-accent-primary, #00d4ff);
      color: var(--color-bg-sidebar, #0b1929);
    }

    .segment:not(.segment--active) .badge {
      background: var(--color-bg-hover, #1e3a5f);
      color: var(--color-text-secondary, #94a3b8);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-segmented': AosMobileSegmented;
  }
}
