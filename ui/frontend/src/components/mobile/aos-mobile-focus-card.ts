import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { FocusItem, FocusAccent } from '../../utils/focus-strip.derive.js';

@customElement('aos-mobile-focus-card')
export class AosMobileFocusCard extends LitElement {
  @property({ attribute: false }) item: FocusItem | null = null;

  private _onTap(): void {
    if (!this.item) return;
    this.dispatchEvent(
      new CustomEvent<{ targetRoute: string }>('focus-tap', {
        bubbles: true,
        composed: true,
        detail: { targetRoute: this.item.targetRoute },
      })
    );
  }

  private _accentVar(accent: FocusAccent): string {
    if (accent === 'warning') return 'var(--color-accent-warning, #f59e0b)';
    if (accent === 'error') return 'var(--color-accent-error, #ef4444)';
    return 'var(--color-accent-primary, #00d4ff)';
  }

  private _icon(item: FocusItem) {
    const color = this._accentVar(item.accent);
    if (item.type === 'blocked-story') {
      return html`
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 1L13 12H1L7 1Z" stroke="${color}" stroke-width="1.5" fill="none" stroke-linejoin="round"/>
          <path d="M7 5.5v3M7 10h.01" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      `;
    }
    if (item.type === 'paused-auto-mode') {
      return html`
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <rect x="3" y="2" width="3" height="10" rx="1" fill="${color}"/>
          <rect x="8" y="2" width="3" height="10" rx="1" fill="${color}"/>
        </svg>
      `;
    }
    return html`
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="6" stroke="${color}" stroke-width="1.5" fill="none"/>
        <path d="M7 4.5v3.5M7 9.5h.01" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `;
  }

  private _typeLabel(item: FocusItem): string {
    if (item.type === 'blocked-story') return 'Blockiert';
    if (item.type === 'paused-auto-mode') return 'Pausiert';
    return 'Incident';
  }

  override render() {
    if (!this.item) return nothing;
    const { item } = this;
    const accentColor = this._accentVar(item.accent);

    return html`
      <button
        class="card"
        style="--accent: ${accentColor}"
        @click=${this._onTap}
        aria-label="${item.title}: ${item.subtitle}"
      >
        <div class="card-header">
          ${this._icon(item)}
          <span class="type-label" style="color: ${accentColor}">${this._typeLabel(item)}</span>
        </div>
        <p class="title">${item.title}</p>
        <p class="subtitle">${item.subtitle}</p>
      </button>
    `;
  }

  static styles = css`
    :host {
      display: block;
      flex-shrink: 0;
    }

    .card {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 200px;
      padding: var(--space-mobile-md, 0.75rem);
      background: var(--color-bg-secondary, #162a45);
      border: 1px solid var(--color-border, #1e3a5f);
      border-left: 3px solid var(--accent, #f59e0b);
      border-radius: 10px;
      text-align: left;
      cursor: pointer;
      font-family: inherit;
      min-height: var(--touch-target-min, 44px);
      transition: background 0.15s, transform 0.1s;
      -webkit-tap-highlight-color: transparent;
    }

    .card:active {
      background: var(--color-bg-hover, #1e3a5f);
      transform: scale(0.97);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .type-label {
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      line-height: 1;
    }

    .title {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-text-primary, #e8edf2);
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .subtitle {
      margin: 0;
      font-size: 0.6875rem;
      color: var(--color-text-secondary, #94a3b8);
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-focus-card': AosMobileFocusCard;
  }
}
