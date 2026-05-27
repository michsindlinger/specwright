import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { StoryInfo } from '../story-card.js';
import './aos-mobile-story-card.js';

@customElement('aos-mobile-story-list')
export class AosMobileStoryList extends LitElement {
  @property({ type: Array }) stories: StoryInfo[] = [];

  override render() {
    if (this.stories.length === 0) {
      return html`<div class="empty">No stories yet</div>`;
    }

    return html`
      <ul class="list" role="list">
        ${this.stories.map(
          (story) => html`
            <li>
              <aos-mobile-story-card .story=${story}></aos-mobile-story-card>
            </li>
          `
        )}
      </ul>
    `;
  }

  static styles = css`
    :host {
      display: block;
      background: var(--color-bg-secondary, #162a45);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--color-border, #1e3a5f);
    }

    .list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    /* CSS custom property pierces shadow DOM — removes divider from last card */
    .list li:last-child {
      --story-card-divider: none;
    }

    .empty {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-mobile-lg, 1rem);
      color: var(--color-text-muted, #64748b);
      font-size: 0.875rem;
      font-style: italic;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-story-list': AosMobileStoryList;
  }
}
