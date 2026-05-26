import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { SpecInfo } from '../spec-card.js';

type DerivedStage = 'in-progress' | 'ready' | 'shipping' | 'done' | 'not-started';

@customElement('aos-mobile-project-card')
export class AosMobileProjectCard extends LitElement {
  @property({ attribute: false }) spec!: SpecInfo;

  private _handleTap(): void {
    this.dispatchEvent(
      new CustomEvent<{ specId: string }>('spec-select', {
        bubbles: true,
        composed: true,
        detail: { specId: this.spec.id },
      })
    );
  }

  private _progress(): number {
    if (!this.spec || this.spec.storyCount === 0) return 0;
    return Math.round((this.spec.completedCount / this.spec.storyCount) * 100);
  }

  private _stage(): DerivedStage {
    const s = this.spec;
    if (!s || s.storyCount === 0) return 'not-started';
    if (s.completedCount === s.storyCount) return 'done';
    if (s.inProgressCount > 0) return 'in-progress';
    if (s.isReady) return 'ready';
    return 'not-started';
  }

  private _stageLabel(stage: DerivedStage): string {
    switch (stage) {
      case 'in-progress': return 'In progress';
      case 'ready': return 'Ready';
      case 'done': return 'Done';
      case 'shipping': return 'Shipping';
      case 'not-started': return 'Not started';
    }
  }

  override render() {
    if (!this.spec) return nothing;
    const stage = this._stage();
    const progress = this._progress();

    return html`
      <button
        class="card"
        @click=${this._handleTap}
        aria-label="${this.spec.name}: ${this._stageLabel(stage)}, ${progress}% complete"
      >
        <div class="card-header">
          <span class="stage-pill stage-pill--${stage}">${this._stageLabel(stage)}</span>
          <span class="spacer"></span>
          ${this.spec.assignedToBot ? html`<span class="live-dot" aria-label="Bot active"></span>` : nothing}
          <svg class="chevron" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <p class="name">${this.spec.name}</p>

        <div class="story-preview">
          <span class="preview-done">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <polyline points="2 6 5 9 10 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ${this.spec.completedCount} done
          </span>
          ${this.spec.inProgressCount > 0 ? html`
            <span class="preview-inprogress">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M6 3.5v2.5l1.5 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
              </svg>
              ${this.spec.inProgressCount} in progress
            </span>
          ` : nothing}
          <span class="story-total">${this.spec.storyCount} stories</span>
        </div>

        <div class="progress-row">
          <div class="progress-track">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
          <span class="progress-pct">${progress}%</span>
        </div>
      </button>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    .card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      padding: var(--space-mobile-md, 0.75rem) var(--space-mobile-lg, 1rem);
      background: var(--color-bg-secondary, #162a45);
      border: 1px solid var(--color-border, #1e3a5f);
      border-radius: 12px;
      text-align: left;
      cursor: pointer;
      font-family: inherit;
      min-height: var(--touch-target-min, 44px);
      transition: background 0.15s, transform 0.1s;
      -webkit-tap-highlight-color: transparent;
      box-sizing: border-box;
    }

    .card:active {
      background: var(--color-bg-hover, #1e3a5f);
      transform: scale(0.98);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .spacer {
      flex: 1;
    }

    .stage-pill {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: var(--radius-full, 9999px);
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      line-height: 1.6;
    }

    .stage-pill--in-progress {
      background: rgba(0, 212, 255, 0.12);
      color: var(--color-accent-primary, #00d4ff);
    }

    .stage-pill--ready {
      background: rgba(34, 197, 94, 0.12);
      color: var(--color-accent-success, #22c55e);
    }

    .stage-pill--done {
      background: rgba(34, 197, 94, 0.08);
      color: var(--color-accent-success, #22c55e);
    }

    .stage-pill--not-started,
    .stage-pill--shipping {
      background: rgba(100, 116, 139, 0.15);
      color: var(--color-text-muted, #64748b);
    }

    .live-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-accent-primary, #00d4ff);
      animation: pulse 1.5s ease infinite;
      flex-shrink: 0;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.55; transform: scale(0.85); }
    }

    .chevron {
      color: var(--color-text-tertiary, #475569);
      flex-shrink: 0;
    }

    .name {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-text-primary, #e8edf2);
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .story-preview {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .preview-done,
    .preview-inprogress,
    .story-total {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 0.6875rem;
      line-height: 1;
    }

    .preview-done {
      color: var(--color-accent-success, #22c55e);
    }

    .preview-inprogress {
      color: var(--color-accent-primary, #00d4ff);
    }

    .story-total {
      color: var(--color-text-muted, #64748b);
      margin-left: auto;
    }

    .progress-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .progress-track {
      flex: 1;
      height: 4px;
      background: var(--color-bg-tertiary, #1c3254);
      border-radius: var(--radius-full, 9999px);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--color-accent-primary, #00d4ff);
      border-radius: var(--radius-full, 9999px);
      transition: width 0.3s ease;
    }

    .progress-pct {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--color-text-secondary, #94a3b8);
      min-width: 2.5ch;
      text-align: right;
      line-height: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-project-card': AosMobileProjectCard;
  }
}
