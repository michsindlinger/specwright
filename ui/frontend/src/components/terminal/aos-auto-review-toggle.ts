import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export interface ReviewerConfig {
  providerId: string;
  modelId: string | undefined;
}

interface ProviderModel {
  id: string;
  name: string;
}

export interface AvailableProvider {
  id: string;
  name: string;
  models: ProviderModel[];
}

/**
 * Auto Review Toggle — dumb tab-header component.
 *
 * Receives state via properties; emits DOM-CustomEvents only (no WS).
 * Events:
 *   auto-review-config-changed  { sessionId, enabled, reviewers }
 *   auto-review-trigger-manual  { sessionId }
 */
@customElement('aos-auto-review-toggle')
export class AosAutoReviewToggle extends LitElement {
  @property({ type: String }) sessionId = '';
  @property({ type: Boolean }) enabled = false;
  @property({ type: Array }) reviewers: ReviewerConfig[] = [];
  @property({ type: Array }) availableProviders: AvailableProvider[] = [];

  @state() private dropdownOpen = false;
  @state() private dropdownPos: { top: number; right: number } | null = null;

  override createRenderRoot() {
    return this;
  }

  private static stylesInjected = false;

  private ensureStyles() {
    if (AosAutoReviewToggle.stylesInjected) return;
    AosAutoReviewToggle.stylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
      aos-auto-review-toggle {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
      }

      .art-toggle-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 7px;
        background: transparent;
        border: 1px solid var(--border-color, #404040);
        border-radius: 3px;
        color: var(--text-color-muted, #606060);
        font-size: 11px;
        cursor: pointer;
        transition: all 0.15s;
        white-space: nowrap;
        user-select: none;
        line-height: 1.4;
      }

      .art-toggle-btn:hover {
        border-color: var(--accent-color, #007acc);
        color: var(--text-color-primary, #e0e0e0);
      }

      .art-toggle-btn.enabled {
        border-color: var(--accent-color, #007acc);
        color: var(--accent-color, #007acc);
        background: rgba(0, 122, 204, 0.08);
      }

      .art-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--text-color-muted, #606060);
        flex-shrink: 0;
      }

      .art-toggle-btn.enabled .art-dot {
        background: var(--accent-color, #007acc);
      }

      .art-reviewers-wrap {
        position: relative;
        display: inline-flex;
      }

      .art-reviewers-btn {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 2px 7px;
        background: transparent;
        border: 1px solid var(--border-color, #404040);
        border-radius: 3px;
        color: var(--text-color-muted, #606060);
        font-size: 11px;
        cursor: pointer;
        transition: all 0.15s;
        white-space: nowrap;
        user-select: none;
        line-height: 1.4;
      }

      .art-reviewers-btn:hover {
        border-color: var(--accent-color, #007acc);
        color: var(--text-color-primary, #e0e0e0);
      }

      .art-count-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 14px;
        height: 14px;
        padding: 0 3px;
        background: var(--accent-color, #007acc);
        border-radius: 7px;
        color: white;
        font-size: 9px;
        font-weight: 600;
      }

      .art-dropdown {
        position: fixed;
        min-width: 180px;
        background: var(--bg-color-secondary, #1e1e1e);
        border: 1px solid var(--border-color, #404040);
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        z-index: 2000;
        padding: 4px 0;
      }

      .art-dropdown-header {
        padding: 4px 10px 2px;
        font-size: 10px;
        font-weight: 600;
        color: var(--text-color-muted, #606060);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        border-bottom: 1px solid var(--border-color, #404040);
        margin-bottom: 2px;
      }

      .art-provider-group {
        padding: 2px 0;
      }

      .art-provider-label {
        padding: 3px 10px 1px;
        font-size: 10px;
        font-weight: 600;
        color: var(--text-color-muted, #606060);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .art-model-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 3px 10px;
        cursor: pointer;
        font-size: 11px;
        color: var(--text-color-secondary, #a0a0a0);
        transition: background 0.1s;
      }

      .art-model-row:hover {
        background: var(--bg-color-hover, #3c3c3c);
        color: var(--text-color-primary, #e0e0e0);
      }

      .art-model-row input[type="checkbox"] {
        margin: 0;
        cursor: pointer;
        accent-color: var(--accent-color, #007acc);
        width: 11px;
        height: 11px;
        flex-shrink: 0;
      }

      .art-empty {
        padding: 6px 10px;
        font-size: 11px;
        color: var(--text-color-muted, #606060);
        font-style: italic;
      }

      .art-trigger-btn {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 2px 7px;
        background: transparent;
        border: 1px solid var(--border-color, #404040);
        border-radius: 3px;
        color: var(--text-color-muted, #606060);
        font-size: 11px;
        cursor: pointer;
        transition: all 0.15s;
        white-space: nowrap;
        user-select: none;
        line-height: 1.4;
      }

      .art-trigger-btn:hover {
        border-color: #4caf50;
        color: #4caf50;
      }

      .art-trigger-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .art-trigger-btn svg,
      .art-toggle-btn svg,
      .art-reviewers-btn svg {
        width: 10px;
        height: 10px;
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);
  }

  private handleOutsideClick = (e: MouseEvent) => {
    if (!e.composedPath().includes(this)) {
      this.closeDropdown();
    }
  };

  private handleReposition = () => {
    if (!this.dropdownOpen) return;
    this.updateDropdownPos();
  };

  private updateDropdownPos() {
    const btn = this.querySelector<HTMLElement>('.art-reviewers-btn');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    this.dropdownPos = {
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    };
  }

  private closeDropdown() {
    this.dropdownOpen = false;
    this.dropdownPos = null;
    document.removeEventListener('click', this.handleOutsideClick);
    window.removeEventListener('resize', this.handleReposition);
    window.removeEventListener('scroll', this.handleReposition, true);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.closeDropdown();
  }

  private toggleEnabled() {
    const newEnabled = !this.enabled;
    this.dispatchEvent(new CustomEvent('auto-review-config-changed', {
      detail: { sessionId: this.sessionId, enabled: newEnabled, reviewers: this.reviewers },
      bubbles: true,
      composed: true,
    }));
  }

  private toggleDropdown(e: Event) {
    e.stopPropagation();
    if (this.dropdownOpen) {
      this.closeDropdown();
      return;
    }
    this.dropdownOpen = true;
    this.updateDropdownPos();
    document.addEventListener('click', this.handleOutsideClick);
    window.addEventListener('resize', this.handleReposition);
    window.addEventListener('scroll', this.handleReposition, true);
  }

  private isProviderSelected(providerId: string): boolean {
    return this.reviewers.some(r => r.providerId === providerId);
  }

  private toggleProvider(providerId: string) {
    let updated: ReviewerConfig[];
    if (this.isProviderSelected(providerId)) {
      updated = this.reviewers.filter(r => r.providerId !== providerId);
    } else {
      updated = [...this.reviewers, { providerId, modelId: undefined }];
    }
    this.dispatchEvent(new CustomEvent('auto-review-config-changed', {
      detail: { sessionId: this.sessionId, enabled: this.enabled, reviewers: updated },
      bubbles: true,
      composed: true,
    }));
  }

  private handleTrigger(e: Event) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('auto-review-trigger-manual', {
      detail: { sessionId: this.sessionId },
      bubbles: true,
      composed: true,
    }));
  }

  private renderDropdown() {
    if (!this.dropdownOpen) return '';

    const hasProviders = this.availableProviders.length > 0;
    const posStyle = this.dropdownPos
      ? `top:${this.dropdownPos.top}px;right:${this.dropdownPos.right}px;`
      : '';

    return html`
      <div class="art-dropdown" style=${posStyle} @click=${(e: Event) => e.stopPropagation()}>
        <div class="art-dropdown-header">Reviewers</div>
        ${hasProviders
          ? this.availableProviders.map(provider => html`
            <div class="art-provider-group">
              <div class="art-model-row" @click=${() => this.toggleProvider(provider.id)}>
                <input
                  type="checkbox"
                  .checked=${this.isProviderSelected(provider.id)}
                  @change=${(e: Event) => { e.stopPropagation(); this.toggleProvider(provider.id); }}
                  @click=${(e: Event) => e.stopPropagation()}
                />
                <span>${provider.name}</span>
              </div>
            </div>
          `)
          : html`<div class="art-empty">No providers configured</div>`
        }
      </div>
    `;
  }

  override render() {
    this.ensureStyles();

    const selectedCount = this.reviewers.length;

    return html`
      <button
        class="art-toggle-btn ${this.enabled ? 'enabled' : ''}"
        title="${this.enabled ? 'Auto-Review on — click to disable' : 'Auto-Review off — click to enable'}"
        @click=${(e: Event) => { e.stopPropagation(); this.toggleEnabled(); }}
      >
        <span class="art-dot"></span>
        AR
      </button>

      <div class="art-reviewers-wrap">
        <button
          class="art-reviewers-btn"
          title="Select reviewers"
          @click=${this.toggleDropdown}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            <path d="M21 21v-2a4 4 0 0 0-3-3.85"></path>
          </svg>
          ${selectedCount > 0
            ? html`<span class="art-count-badge">${selectedCount}</span>`
            : ''}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:8px;height:8px">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        ${this.renderDropdown()}
      </div>

      <button
        class="art-trigger-btn"
        title="Review last plan manually"
        ?disabled=${!this.enabled || selectedCount === 0}
        @click=${this.handleTrigger}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-auto-review-toggle': AosAutoReviewToggle;
  }
}
