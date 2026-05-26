import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { FocusItem } from '../../utils/focus-strip.derive.js';
import './aos-mobile-focus-card.js';

@customElement('aos-mobile-focus-strip')
export class AosMobileFocusStrip extends LitElement {
  @property({ attribute: false }) items: FocusItem[] = [];

  override render() {
    if (this.items.length === 0) return nothing;

    return html`
      <section class="strip" aria-label="Fokus-Punkte">
        <div class="eyebrow">
          <span class="eyebrow-label">Fokus</span>
          <span class="eyebrow-count" aria-label="${this.items.length} Einträge">${this.items.length}</span>
        </div>
        <div class="scroll-track" role="list">
          ${this.items.map(
            (item) => html`
              <div role="listitem">
                <aos-mobile-focus-card .item=${item}></aos-mobile-focus-card>
              </div>
            `
          )}
        </div>
      </section>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    .strip {
      padding: var(--space-mobile-sm, 0.5rem) 0 var(--space-mobile-sm, 0.5rem);
    }

    .eyebrow {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 var(--space-mobile-lg, 1rem) var(--space-mobile-xs, 0.25rem);
    }

    .eyebrow-label {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--color-text-muted, #64748b);
      line-height: 1;
    }

    .eyebrow-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      background: var(--color-accent-warning, #f59e0b);
      color: #000;
      border-radius: 8px;
      font-size: 0.625rem;
      font-weight: 700;
      line-height: 1;
    }

    .scroll-track {
      display: flex;
      flex-direction: row;
      gap: var(--space-mobile-sm, 0.5rem);
      overflow-x: auto;
      padding: var(--space-mobile-xs, 0.25rem) var(--space-mobile-lg, 1rem);
      /* Prevent scrollbar from showing on mobile */
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .scroll-track::-webkit-scrollbar {
      display: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-focus-strip': AosMobileFocusStrip;
  }
}
