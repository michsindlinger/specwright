import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('aos-mobile-spec-top-bar')
export class AosMobileSpecTopBar extends LitElement {
  @property({ type: String }) projectLabel = '';
  @property({ type: String }) idPrefix = '';
  @property({ type: String }) projectColor = 'var(--color-accent-primary, #00d4ff)';
  @property({ type: Number }) progress = 0;
  @property({ type: Number }) storiesDone = 0;
  @property({ type: Number }) storiesTotal = 0;

  private _dispatch(name: string): void {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true }));
  }

  override render() {
    const pct = Math.max(0, Math.min(100, Math.round(this.progress)));
    return html`
      <header class="bar" role="banner">
        <div class="row-top">
          <button
            class="icon-btn touch-target"
            aria-label="Back to specs"
            @click=${() => this._dispatch('back-tap')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M12 4l-6 6 6 6"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>

          <div class="brand">
            <span
              class="project-dot"
              aria-hidden="true"
              style="background:${this.projectColor};box-shadow:0 0 6px color-mix(in srgb, ${this.projectColor} 50%, transparent);"
            ></span>
            <div class="labels">
              <span class="title">${this.projectLabel}</span>
              <span class="meta">
                ${this.idPrefix ? html`<span class="id-prefix">${this.idPrefix}</span>` : ''}
                ${this.idPrefix ? html`<span class="dot">·</span>` : ''}
                <span>${this.storiesDone}/${this.storiesTotal}</span>
                <span class="pct">${pct}%</span>
              </span>
            </div>
          </div>

          <button
            class="icon-btn touch-target"
            aria-label="More options"
            @click=${() => this._dispatch('more-tap')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="4" cy="9" r="1.5" fill="currentColor"/>
              <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
              <circle cx="14" cy="9" r="1.5" fill="currentColor"/>
            </svg>
          </button>
        </div>

        <div class="row-bottom">
          <div class="progress-track" role="progressbar"
               aria-valuenow=${pct} aria-valuemin="0" aria-valuemax="100">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
          <button class="chip" @click=${() => this._dispatch('chat-tap')}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M2 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5l-2 2V8H3a1 1 0 0 1-1-1V3z"
                stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
            </svg>
            Chat
          </button>
          <button class="chip" @click=${() => this._dispatch('docs-tap')}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M3 1.5h4.5L9.5 3.5V10a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5z"
                stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
              <path d="M7.5 1.5V3.5H9.5" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
            </svg>
            Docs
          </button>
        </div>
      </header>
    `;
  }

  static styles = css`
    :host {
      display: block;
      flex-shrink: 0;
    }

    .bar {
      background: var(--color-bg-sidebar, #0b1929);
      border-bottom: 1px solid var(--color-border, #1e3a5f);
      padding: 0.5rem 0.625rem 0.625rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .row-top {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .icon-btn {
      width: 32px;
      height: 32px;
      padding: 0;
      background: transparent;
      border: none;
      color: var(--color-text-secondary, #94a3b8);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-radius: 8px;
      flex-shrink: 0;
    }

    .icon-btn:active {
      background: var(--color-bg-hover, #1e3a5f);
      color: var(--color-text-primary, #e8edf2);
    }

    .touch-target {
      min-height: var(--touch-target-min, 44px);
      min-width: var(--touch-target-min, 44px);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.4375rem;
      flex: 1;
      min-width: 0;
    }

    .project-dot {
      width: 8px;
      height: 8px;
      border-radius: 2px;
      flex-shrink: 0;
    }

    .labels {
      display: flex;
      flex-direction: column;
      line-height: 1.15;
      min-width: 0;
      flex: 1;
    }

    .title {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--color-text-primary, #e8edf2);
      letter-spacing: -0.005em;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .meta {
      font-size: 0.625rem;
      color: var(--color-text-muted, #64748b);
      font-family: var(--font-family-mono, ui-monospace, monospace);
      display: flex;
      align-items: center;
      gap: 0.3125rem;
    }

    .id-prefix {
      letter-spacing: 0.02em;
    }

    .dot {
      opacity: 0.7;
    }

    .pct {
      color: var(--color-accent-primary, #00d4ff);
      font-weight: 600;
    }

    .row-bottom {
      display: flex;
      align-items: center;
      gap: 0.4375rem;
    }

    .progress-track {
      flex: 1;
      height: 4px;
      border-radius: 2px;
      background: var(--color-bg-tertiary, #1c3254);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #00d4ff, #33ddff);
      border-radius: 2px;
      transition: width 200ms ease;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5625rem;
      background: var(--color-bg-secondary, #0f1f33);
      border: 1px solid var(--color-border, #1e3a5f);
      border-radius: var(--radius-md, 8px);
      color: var(--color-text-secondary, #94a3b8);
      font-size: 0.6875rem;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
    }

    .chip:active {
      background: var(--color-bg-hover, #1e3a5f);
      color: var(--color-text-primary, #e8edf2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-spec-top-bar': AosMobileSpecTopBar;
  }
}
