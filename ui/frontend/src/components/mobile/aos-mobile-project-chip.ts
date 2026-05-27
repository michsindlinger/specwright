import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('aos-mobile-project-chip')
export class AosMobileProjectChip extends LitElement {
  @property({ type: String }) projectId = '';
  @property({ type: String }) name = '';
  @property({ type: Boolean, reflect: true }) active = false;

  private _onTap(): void {
    if (this.active) return;
    this.dispatchEvent(
      new CustomEvent('chip-tap', {
        bubbles: true,
        composed: true,
        detail: { projectId: this.projectId },
      })
    );
  }

  override render() {
    return html`
      <button
        class="chip ${this.active ? 'chip--active' : ''}"
        aria-pressed=${this.active}
        aria-label="Switch to ${this.name}"
        @click=${this._onTap}
      >
        ${this.name}
      </button>
    `;
  }

  static styles = css`
    :host {
      display: inline-block;
      flex-shrink: 0;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      height: 32px;
      padding: 0 var(--space-mobile-sm, 0.5rem);
      background: var(--color-bg-surface, #112240);
      border: 1px solid var(--color-border, #1e3a5f);
      border-radius: 16px;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary, #94a3b8);
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
      font-family: inherit;
    }

    .chip:active {
      background: var(--color-bg-hover, #1e3a5f);
    }

    .chip--active {
      background: var(--color-accent-primary, #00d4ff);
      border-color: var(--color-accent-primary, #00d4ff);
      color: var(--color-bg-sidebar, #0b1929);
      font-weight: 600;
      cursor: default;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-project-chip': AosMobileProjectChip;
  }
}
