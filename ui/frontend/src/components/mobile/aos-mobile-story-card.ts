import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { StoryInfo } from '../story-card.js';

@customElement('aos-mobile-story-card')
export class AosMobileStoryCard extends LitElement {
  @property({ attribute: false }) story!: StoryInfo;

  private _handleTap(): void {
    this.dispatchEvent(
      new CustomEvent<{ story: StoryInfo }>('story-open', {
        bubbles: true,
        composed: true,
        detail: { story: this.story },
      })
    );
  }

  private _statusColor(status: StoryInfo['status']): string {
    switch (status) {
      case 'done':        return 'var(--color-accent-success, #22c55e)';
      case 'in_progress': return 'var(--color-accent-primary, #00d4ff)';
      case 'in_review':   return '#8b5cf6';
      case 'blocked':     return 'var(--color-status-error, #ef4444)';
      default:            return 'var(--color-text-muted, #64748b)';
    }
  }

  private _statusLabel(status: StoryInfo['status']): string {
    switch (status) {
      case 'done':        return 'Done';
      case 'in_progress': return 'In progress';
      case 'in_review':   return 'In review';
      case 'blocked':     return 'Blocked';
      default:            return 'Backlog';
    }
  }

  private _modelLabel(): string {
    const m = this.story.model;
    if (!m) return '';
    const parts = m.split('/');
    return parts[parts.length - 1];
  }

  private _providerLabel(): string {
    const m = this.story.model;
    if (!m) return '';
    const slash = m.indexOf('/');
    if (slash > 0) return m.slice(0, slash);
    if (m === 'opus' || m === 'sonnet' || m === 'haiku') return 'anthropic';
    if (m === 'glm-5') return 'glm';
    return '';
  }

  override render() {
    if (!this.story) return nothing;
    const dotColor  = this._statusColor(this.story.status);
    const statusLbl = this._statusLabel(this.story.status);
    const modelLbl  = this._modelLabel();
    const provLbl   = this._providerLabel();

    return html`
      <button
        class="card"
        @click=${this._handleTap}
        aria-label="${this.story.id}: ${this.story.title}, ${statusLbl}"
      >
        <span
          class="status-dot"
          aria-hidden="true"
          style="background:${dotColor};box-shadow:0 0 0 3px color-mix(in srgb,${dotColor} 20%,transparent)"
        ></span>

        <span class="story-id">${this.story.id}</span>

        <span class="story-title">${this.story.title}</span>

        <div class="meta">
          ${modelLbl ? html`
            <span class="meta-badge">
              ${modelLbl}${provLbl ? html`<span class="provider-sep">·</span>${provLbl}` : nothing}
            </span>
          ` : nothing}
          ${this.story.assignedToBot ? html`
            <span class="bot-badge" aria-label="Bot assigned">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <rect x="1.5" y="3" width="7" height="5.5" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
                <rect x="3.5" y="1" width="3" height="2" rx="1" stroke="currentColor" stroke-width="1.2"/>
                <circle cx="3.5" cy="5.75" r="0.8" fill="currentColor"/>
                <circle cx="6.5" cy="5.75" r="0.8" fill="currentColor"/>
              </svg>
            </span>
          ` : nothing}
        </div>

        <svg class="chevron" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    .card {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 0 var(--space-mobile-md, 0.75rem);
      min-height: var(--touch-target-min, 44px);
      background: none;
      border: none;
      border-bottom: var(--story-card-divider, 1px solid var(--color-border, #1e3a5f));
      text-align: left;
      cursor: pointer;
      font-family: inherit;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.12s;
      box-sizing: border-box;
    }

    .card:active {
      background: var(--color-bg-hover, #1e3a5f);
    }

    .status-dot {
      flex-shrink: 0;
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .story-id {
      flex-shrink: 0;
      font-size: 0.6875rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--color-text-muted, #64748b);
      min-width: 4.5ch;
      white-space: nowrap;
    }

    .story-title {
      flex: 1;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-primary, #e8edf2);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.3;
    }

    .meta {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .meta-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 6px;
      background: var(--color-bg-tertiary, #1c3254);
      border-radius: var(--radius-full, 9999px);
      font-size: 0.625rem;
      font-weight: 500;
      color: var(--color-text-secondary, #94a3b8);
      white-space: nowrap;
    }

    .provider-sep {
      color: var(--color-text-muted, #64748b);
      margin: 0 1px;
    }

    .bot-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      background: var(--color-bg-tertiary, #1c3254);
      border-radius: var(--radius-full, 9999px);
      color: var(--color-accent-primary, #00d4ff);
    }

    .chevron {
      flex-shrink: 0;
      color: var(--color-text-tertiary, #475569);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-story-card': AosMobileStoryCard;
  }
}
