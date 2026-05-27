import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { StoryInfo } from '../story-card.js';
import './aos-mobile-sheet.js';

@customElement('aos-mobile-story-sheet')
export class AosMobileStorySheet extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ attribute: false }) story: StoryInfo | null = null;

  private _close(): void {
    this.dispatchEvent(new CustomEvent('story-sheet-close', { bubbles: true, composed: true }));
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
      case 'in_progress': return 'In Progress';
      case 'in_review':   return 'In Review';
      case 'blocked':     return 'Blocked';
      default:            return 'Backlog';
    }
  }

  private _modelLabel(model: string | undefined): string {
    if (!model) return '';
    const parts = model.split('/');
    return parts[parts.length - 1];
  }

  private _providerLabel(model: string | undefined): string {
    if (!model) return '';
    const slash = model.indexOf('/');
    if (slash > 0) return model.slice(0, slash);
    if (model === 'opus' || model === 'sonnet' || model === 'haiku') return 'anthropic';
    if (model === 'glm-5') return 'glm';
    return '';
  }

  private _renderHeader(story: StoryInfo) {
    const statusColor = this._statusColor(story.status);
    const statusLabel = this._statusLabel(story.status);

    return html`
      <div class="sheet-header">
        <div class="header-left">
          <span class="story-id-badge">${story.id}</span>
          <span
            class="status-pill"
            style="background:color-mix(in srgb,${statusColor} 15%,transparent);color:${statusColor};border:1px solid color-mix(in srgb,${statusColor} 30%,transparent)"
          >${statusLabel}</span>
        </div>
        <button class="close-btn" @click=${this._close} aria-label="Close story details">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `;
  }

  private _renderTitle(story: StoryInfo) {
    return html`
      <div class="story-title-wrap">
        <h2 class="story-title">${story.title}</h2>
      </div>
    `;
  }

  private _renderMeta(story: StoryInfo) {
    const pills = [
      { label: story.type,     icon: '📋' },
      { label: story.priority, icon: '⚡' },
      { label: story.effort,   icon: '⏱' },
    ].filter(p => p.label);

    if (pills.length === 0) return nothing;

    return html`
      <div class="meta-row" role="list" aria-label="Story metadata">
        ${pills.map(p => html`
          <span class="meta-pill" role="listitem">${p.label}</span>
        `)}
      </div>
    `;
  }

  private _renderAssignments(story: StoryInfo) {
    const modelLbl = this._modelLabel(story.model);
    const provLbl  = this._providerLabel(story.model);
    const hasFlags = story.assignedToBot || story.requiresUserAction || !story.dorComplete;

    if (!modelLbl && !hasFlags) return nothing;

    return html`
      <div class="section">
        <p class="section-label">Assignments</p>
        <div class="assignment-row">
          ${modelLbl ? html`
            <span class="assign-chip">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <circle cx="6" cy="4" r="2.5" stroke="currentColor" stroke-width="1.2" fill="none"/>
                <path d="M1.5 11C1.5 8.8 3.5 7 6 7s4.5 1.8 4.5 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/>
              </svg>
              ${modelLbl}${provLbl ? html`<span class="chip-sep">·</span>${provLbl}` : nothing}
            </span>
          ` : nothing}
          ${story.assignedToBot ? html`
            <span class="assign-chip assign-chip--bot" aria-label="Assigned to bot">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <rect x="2" y="3.5" width="8" height="6" rx="1.5" stroke="currentColor" stroke-width="1.2" fill="none"/>
                <rect x="4" y="1.5" width="4" height="2" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/>
                <circle cx="4.5" cy="6.5" r="0.8" fill="currentColor"/>
                <circle cx="7.5" cy="6.5" r="0.8" fill="currentColor"/>
              </svg>
              Bot
            </span>
          ` : nothing}
          ${story.requiresUserAction ? html`
            <span class="assign-chip assign-chip--warn" aria-label="Requires user action">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 1.5L11 10.5H1L6 1.5Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" fill="none"/>
                <path d="M6 5v2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                <circle cx="6" cy="9" r="0.5" fill="currentColor"/>
              </svg>
              User action
            </span>
          ` : nothing}
          ${!story.dorComplete ? html`
            <span class="assign-chip assign-chip--dor" aria-label="Definition of Ready incomplete">
              DoR incomplete
            </span>
          ` : nothing}
        </div>
      </div>
    `;
  }

  private _renderDependencies(story: StoryInfo) {
    if (!story.dependencies || story.dependencies.length === 0) return nothing;

    return html`
      <div class="section">
        <p class="section-label">Dependencies</p>
        <div class="dep-row" role="list">
          ${story.dependencies.map(dep => html`
            <span class="dep-chip" role="listitem">${dep}</span>
          `)}
        </div>
      </div>
    `;
  }

  override render() {
    if (!this.story) {
      return html`
        <aos-mobile-sheet
          ?open=${this.open}
          position="bottom"
          label="Story details"
          @sheet-close=${this._close}
        ></aos-mobile-sheet>
      `;
    }

    const story = this.story;

    return html`
      <aos-mobile-sheet
        ?open=${this.open}
        position="bottom"
        label="Story details: ${story.id}"
        @sheet-close=${this._close}
      >
        <div class="story-sheet">
          ${this._renderHeader(story)}
          ${this._renderTitle(story)}
          ${this._renderMeta(story)}
          ${this._renderAssignments(story)}
          ${this._renderDependencies(story)}

          <div class="sheet-actions">
            <button class="close-action touch-target" @click=${this._close}>
              Close
            </button>
          </div>
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

    .story-sheet {
      display: flex;
      flex-direction: column;
      padding-bottom: calc(var(--space-mobile-md, 0.75rem) + env(safe-area-inset-bottom, 0px));
    }

    /* ---- Header ---- */
    .sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-mobile-sm, 0.5rem) var(--space-mobile-md, 0.75rem);
      gap: var(--space-mobile-sm, 0.5rem);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
    }

    .story-id-badge {
      flex-shrink: 0;
      font-size: 0.6875rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--color-text-muted, #64748b);
      background: var(--color-bg-tertiary, #1c3254);
      border-radius: var(--radius-full, 9999px);
      padding: 3px 8px;
      white-space: nowrap;
    }

    .status-pill {
      flex-shrink: 0;
      font-size: 0.6875rem;
      font-weight: 600;
      border-radius: var(--radius-full, 9999px);
      padding: 3px 8px;
      white-space: nowrap;
    }

    .close-btn {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: var(--color-bg-tertiary, #1c3254);
      border: none;
      border-radius: 50%;
      color: var(--color-text-secondary, #94a3b8);
      cursor: pointer;
      transition: background 0.12s, color 0.12s;
      -webkit-tap-highlight-color: transparent;
    }

    .close-btn:active {
      background: var(--color-bg-hover, #1e3a5f);
      color: var(--color-text-primary, #e8edf2);
    }

    /* ---- Title ---- */
    .story-title-wrap {
      padding: 4px var(--space-mobile-md, 0.75rem) var(--space-mobile-sm, 0.5rem);
    }

    .story-title {
      margin: 0;
      font-size: 1.0625rem;
      font-weight: 600;
      line-height: 1.35;
      color: var(--color-text-primary, #e8edf2);
    }

    /* ---- Meta pills ---- */
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 0 var(--space-mobile-md, 0.75rem) var(--space-mobile-md, 0.75rem);
    }

    .meta-pill {
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--color-text-secondary, #94a3b8);
      background: var(--color-bg-tertiary, #1c3254);
      border-radius: var(--radius-full, 9999px);
      padding: 3px 10px;
      text-transform: capitalize;
    }

    /* ---- Sections ---- */
    .section {
      padding: var(--space-mobile-sm, 0.5rem) var(--space-mobile-md, 0.75rem);
      border-top: 1px solid var(--color-border, #1e3a5f);
    }

    .section-label {
      margin: 0 0 6px;
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--color-text-muted, #64748b);
    }

    /* ---- Assignment chips ---- */
    .assignment-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .assign-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-secondary, #94a3b8);
      background: var(--color-bg-tertiary, #1c3254);
      border-radius: var(--radius-full, 9999px);
      padding: 4px 10px;
    }

    .assign-chip--bot {
      color: var(--color-accent-primary, #00d4ff);
    }

    .assign-chip--warn {
      color: var(--color-accent-warning, #f59e0b);
    }

    .assign-chip--dor {
      color: var(--color-status-error, #ef4444);
    }

    .chip-sep {
      color: var(--color-text-muted, #64748b);
      margin: 0 1px;
    }

    /* ---- Dependencies ---- */
    .dep-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .dep-chip {
      font-size: 0.6875rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--color-text-muted, #64748b);
      background: var(--color-bg-tertiary, #1c3254);
      border-radius: var(--radius-full, 9999px);
      padding: 3px 8px;
    }

    /* ---- Actions ---- */
    .sheet-actions {
      padding: var(--space-mobile-md, 0.75rem);
      border-top: 1px solid var(--color-border, #1e3a5f);
      margin-top: var(--space-mobile-sm, 0.5rem);
    }

    .close-action {
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

    .close-action:active {
      background: var(--color-border, #1e3a5f);
      color: var(--color-text-primary, #e8edf2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-story-sheet': AosMobileStorySheet;
  }
}
