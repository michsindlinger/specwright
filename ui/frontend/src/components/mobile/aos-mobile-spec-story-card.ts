import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { StoryInfo } from '../story-card.js';

type Tone = { bg: string; fg: string };

const PRIORITY_TONE: Record<string, Tone> = {
  low:      { bg: 'rgba(100,116,139,0.15)', fg: '#94a3b8' },
  medium:   { bg: 'rgba(245,158,11,0.15)',  fg: '#f59e0b' },
  high:     { bg: 'rgba(239,68,68,0.15)',   fg: '#ef4444' },
  critical: { bg: 'rgba(239,68,68,0.22)',   fg: '#fca5a5' },
};

const PRIORITY_BAR: Record<string, string> = {
  low: '#64748b', medium: '#f59e0b', high: '#ef4444', critical: '#ef4444',
};

const TYPE_TONE: Record<string, { color: string; label: string }> = {
  'user-story':  { color: '#8b5cf6', label: 'Story' },
  'bug':         { color: '#ef4444', label: 'Bug' },
  'task':        { color: '#64748b', label: 'Task' },
  'spike':       { color: '#f59e0b', label: 'Spike' },
  'docs':        { color: '#94a3b8', label: 'Docs' },
  'frontend':    { color: '#22c55e', label: 'Frontend' },
  'backend':     { color: '#8b5cf6', label: 'Backend' },
  'security':    { color: '#ef4444', label: 'Security' },
  'email':       { color: '#f59e0b', label: 'Email' },
};

const STATUS_DOT: Record<StoryInfo['status'], string> = {
  backlog:     'var(--stage-backlog, #64748b)',
  blocked:     'var(--stage-blocked, #ef4444)',
  in_progress: 'var(--stage-in-progress, #00d4ff)',
  in_review:   'var(--stage-in-review, #f59e0b)',
  done:        'var(--stage-done, #22c55e)',
};

const STATUS_FG: Record<StoryInfo['status'], string> = {
  backlog:     '#94a3b8',
  blocked:     '#ef4444',
  in_progress: '#00d4ff',
  in_review:   '#f59e0b',
  done:        '#22c55e',
};

const STATUS_LABEL: Record<StoryInfo['status'], string> = {
  backlog:     'Backlog',
  blocked:     'Blocked',
  in_progress: 'In progress',
  in_review:   'In review',
  done:        'Done',
};

@customElement('aos-mobile-spec-story-card')
export class AosMobileSpecStoryCard extends LitElement {
  @property({ attribute: false }) story!: StoryInfo;
  @property({ type: Boolean }) glow = false;
  @property({ type: Boolean }) compact = false;

  private _handleTap(): void {
    this.dispatchEvent(
      new CustomEvent<{ story: StoryInfo }>('story-open', {
        bubbles: true,
        composed: true,
        detail: { story: this.story },
      })
    );
  }

  private _typeMeta(): { color: string; label: string } | null {
    if (!this.story.type) return null;
    const key = this.story.type.toLowerCase();
    return TYPE_TONE[key] ?? { color: '#64748b', label: this.story.type };
  }

  private _priorityTone(): Tone {
    const key = (this.story.priority ?? '').toLowerCase();
    return PRIORITY_TONE[key] ?? { bg: 'rgba(100,116,139,0.15)', fg: '#94a3b8' };
  }

  private _priorityBar(): string {
    const key = (this.story.priority ?? '').toLowerCase();
    return PRIORITY_BAR[key] ?? '#64748b';
  }

  private _modelLabel(): string {
    const m = this.story.model;
    if (!m) return '';
    const parts = m.split('/');
    return parts[parts.length - 1] ?? '';
  }

  override render() {
    if (!this.story) return nothing;
    const s = this.story;
    const isActive = s.status === 'in_progress';
    const showGlow = this.glow || isActive;
    const type = this._typeMeta();
    const pTone = this._priorityTone();
    const dot = STATUS_DOT[s.status];
    const fg = STATUS_FG[s.status];
    const modelLbl = this._modelLabel();

    return html`
      <button
        class="card ${showGlow ? 'glow' : ''} ${this.compact ? 'compact' : ''}"
        style="border-left-color:${this._priorityBar()};"
        @click=${this._handleTap}
        aria-label="${s.id}: ${s.title}, ${STATUS_LABEL[s.status]}"
      >
        <div class="row-id">
          <span class="id-badge">${s.id}</span>
          ${type
            ? html`<span class="tag" style="background:${type.color}1f;color:${type.color};">
                <span class="tag-dot" style="background:${type.color};"></span>${type.label}
              </span>`
            : nothing}
          <span class="spacer"></span>
          ${s.effort
            ? html`<span class="size">${s.effort}</span>`
            : nothing}
        </div>

        <div class="title">${s.title}</div>

        <div class="row-pills">
          <span class="status" style="border-color:${fg}40;background:${fg}1f;color:${fg};">
            ${isActive
              ? html`<span class="live-dot" style="background:${dot};" aria-hidden="true"></span>`
              : html`<span class="status-dot" style="background:${dot};" aria-hidden="true"></span>`}
            ${STATUS_LABEL[s.status]}
          </span>
          ${s.priority
            ? html`<span class="priority" style="background:${pTone.bg};color:${pTone.fg};">
                ${s.priority}
              </span>`
            : nothing}
          ${s.dependencies && s.dependencies.length > 0
            ? html`<span class="deps" title="${s.dependencies.length} dependency/-ies">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M2 4h6M2 7h4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
                </svg>
                ${s.dependencies.length}
              </span>`
            : nothing}
          ${s.assignedToBot
            ? html`<span class="bot" title="Assigned to bot">🤖</span>`
            : nothing}
          ${s.requiresUserAction
            ? html`<span class="warn" title="Requires user action">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M6 2v4M6 8.5v.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                  <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.1"/>
                </svg>
              </span>`
            : nothing}
        </div>

        ${this.compact
          ? nothing
          : html`
              ${s.status === 'blocked'
                ? html`<div class="blocked-row">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M6 2v4M6 8.5v.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                      <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.1"/>
                    </svg>
                    <span>${s.dependencies && s.dependencies.length > 0
                      ? `Blocked by: ${s.dependencies.join(', ')}`
                      : 'Blocked'}</span>
                  </div>`
                : nothing}

              ${!s.dorComplete && s.status === 'backlog'
                ? html`<div class="dor-row">DoR incomplete — fill checklist to ready</div>`
                : nothing}

              <div class="footer">
                ${modelLbl
                  ? html`<span class="model">
                      <span class="model-dot"></span>
                      ${modelLbl}
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true" style="transform:rotate(90deg);">
                        <path d="M2 1l3 3-3 3" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </span>`
                  : nothing}
                <span class="spacer"></span>
                ${s.attachmentCount && s.attachmentCount > 0
                  ? html`<span class="counter" title="Attachments">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M7 3l-4 4a1.5 1.5 0 1 0 2.1 2.1l4-4a3 3 0 1 0-4.2-4.2l-4 4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
                      </svg>
                      ${s.attachmentCount}
                    </span>`
                  : nothing}
                ${s.commentCount && s.commentCount > 0
                  ? html`<span class="counter" title="Comments">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M2 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5l-2 2V8H3a1 1 0 0 1-1-1V3z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
                      </svg>
                      ${s.commentCount}
                    </span>`
                  : nothing}
              </div>
            `}
      </button>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    .card {
      display: block;
      width: 100%;
      text-align: left;
      background: var(--color-bg-primary, #0a1422);
      border: 1px solid var(--color-border, #1e3a5f);
      border-left: 3px solid var(--color-border, #1e3a5f);
      border-radius: var(--radius-md, 8px);
      padding: 0.6875rem 0.75rem;
      cursor: pointer;
      color: inherit;
      font-family: inherit;
    }

    .card.compact {
      padding: 0.5625rem 0.6875rem;
    }

    .card.glow {
      border-color: rgba(0, 212, 255, 0.4);
      box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1);
    }

    .card:active {
      background: var(--color-bg-hover, #1e3a5f);
    }

    .row-id {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-bottom: 0.4375rem;
    }

    .card.compact .row-id {
      margin-bottom: 0.3125rem;
    }

    .spacer {
      flex: 1;
    }

    .id-badge {
      font-family: var(--font-family-mono, ui-monospace, monospace);
      font-size: 0.625rem;
      font-weight: 600;
      padding: 0.125rem 0.375rem;
      border-radius: var(--radius-sm, 4px);
      background: var(--color-bg-tertiary, #1c3254);
      color: var(--color-text-secondary, #94a3b8);
      letter-spacing: 0.02em;
    }

    .tag {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.625rem;
      font-weight: 500;
      padding: 0.125rem 0.4375rem;
      border-radius: var(--radius-full, 999px);
    }

    .tag-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
    }

    .size {
      font-family: var(--font-family-mono, ui-monospace, monospace);
      font-size: 0.625rem;
      font-weight: 600;
      color: var(--color-accent-primary, #00d4ff);
    }

    .title {
      font-size: 0.84375rem;
      font-weight: 600;
      line-height: 1.3;
      color: var(--color-text-primary, #e8edf2);
      margin-bottom: 0.5rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card.compact .title {
      font-size: 0.78125rem;
      margin-bottom: 0.375rem;
    }

    .row-pills {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      flex-wrap: wrap;
      margin-bottom: 0.5rem;
    }

    .card.compact .row-pills {
      margin-bottom: 0;
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.3125rem;
      padding: 0.125rem 0.5rem;
      border: 1px solid;
      border-radius: var(--radius-full, 999px);
      font-size: 0.65625rem;
      font-weight: 600;
    }

    .status-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
    }

    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      box-shadow: 0 0 0 0 currentColor;
      animation: pulse 1.6s infinite;
    }

    @keyframes pulse {
      0%   { box-shadow: 0 0 0 0 rgba(0, 212, 255, 0.6); }
      70%  { box-shadow: 0 0 0 6px rgba(0, 212, 255, 0); }
      100% { box-shadow: 0 0 0 0 rgba(0, 212, 255, 0); }
    }

    .priority {
      font-size: 0.59375rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 0.125rem 0.375rem;
      border-radius: var(--radius-sm, 4px);
    }

    .deps {
      display: inline-flex;
      align-items: center;
      gap: 0.1875rem;
      font-size: 0.625rem;
      color: var(--color-text-muted, #64748b);
      font-family: var(--font-family-mono, ui-monospace, monospace);
    }

    .bot {
      font-size: 0.75rem;
      line-height: 1;
    }

    .warn {
      display: inline-flex;
      color: var(--color-accent-warning, #f59e0b);
    }

    .blocked-row {
      display: flex;
      align-items: flex-start;
      gap: 0.375rem;
      padding: 0.375rem 0.5rem;
      margin-top: 0.25rem;
      background: rgba(239, 68, 68, 0.06);
      border: 1px solid rgba(239, 68, 68, 0.22);
      border-radius: var(--radius-sm, 4px);
      font-size: 0.65625rem;
      color: #fca5a5;
      line-height: 1.35;
    }

    .dor-row {
      padding: 0.375rem 0.5rem;
      margin-top: 0.25rem;
      background: rgba(245, 158, 11, 0.06);
      border: 1px solid rgba(245, 158, 11, 0.22);
      border-radius: var(--radius-sm, 4px);
      font-size: 0.65625rem;
      color: var(--color-accent-warning, #f59e0b);
    }

    .footer {
      margin-top: 0.4375rem;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.65625rem;
      color: var(--color-text-muted, #64748b);
    }

    .model {
      display: inline-flex;
      align-items: center;
      gap: 0.3125rem;
      padding: 0.1875rem 0.5rem;
      background: var(--color-bg-secondary, #0f1f33);
      border: 1px solid var(--color-border, #1e3a5f);
      border-radius: var(--radius-sm, 4px);
      color: var(--color-text-secondary, #94a3b8);
      font-size: 0.65625rem;
      font-weight: 500;
    }

    .model-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--color-accent-primary, #00d4ff);
    }

    .counter {
      display: inline-flex;
      align-items: center;
      gap: 0.1875rem;
      font-family: var(--font-family-mono, ui-monospace, monospace);
      font-size: 0.625rem;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-spec-story-card': AosMobileSpecStoryCard;
  }
}
