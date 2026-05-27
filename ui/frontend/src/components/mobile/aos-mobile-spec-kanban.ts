import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { StoryInfo } from '../story-card.js';
import './aos-mobile-spec-story-card.js';

type SpecStatus = StoryInfo['status'];

interface ColumnDef {
  key: SpecStatus;
  label: string;
  accent: string;
  glow?: boolean;
}

const SPEC_COLUMNS: readonly ColumnDef[] = [
  { key: 'backlog',     label: 'Backlog',     accent: 'var(--stage-backlog, #64748b)' },
  { key: 'blocked',     label: 'Blocked',     accent: 'var(--stage-blocked, #ef4444)' },
  { key: 'in_progress', label: 'In Progress', accent: 'var(--stage-in-progress, #00d4ff)', glow: true },
  { key: 'in_review',   label: 'In Review',   accent: 'var(--stage-in-review, #f59e0b)' },
  { key: 'done',        label: 'Done',        accent: 'var(--stage-done, #22c55e)' },
];

@customElement('aos-mobile-spec-kanban')
export class AosMobileSpecKanban extends LitElement {
  @property({ type: Array }) stories: StoryInfo[] = [];
  @property({ type: String }) initialColumn: SpecStatus = 'in_progress';

  @state() private _activeColumn: SpecStatus = 'in_progress';
  @state() private _initialized = false;

  override willUpdate(changed: Map<string, unknown>): void {
    if (!this._initialized && changed.has('initialColumn')) {
      this._activeColumn = this.initialColumn;
    }
    if (!this._initialized) {
      this._activeColumn = this.initialColumn;
      this._initialized = true;
    }
  }

  private _storiesByColumn(): Record<SpecStatus, StoryInfo[]> {
    const buckets: Record<SpecStatus, StoryInfo[]> = {
      backlog: [], blocked: [], in_progress: [], in_review: [], done: [],
    };
    for (const s of this.stories) {
      const key = (buckets[s.status] ? s.status : 'backlog') as SpecStatus;
      buckets[key].push(s);
    }
    return buckets;
  }

  private _selectColumn(key: SpecStatus): void {
    this._activeColumn = key;
  }

  private _dispatch(name: string): void {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true }));
  }

  override render() {
    const buckets = this._storiesByColumn();
    const active = SPEC_COLUMNS.find(c => c.key === this._activeColumn) ?? SPEC_COLUMNS[2];
    const activeStories = buckets[active.key];

    return html`
      <div class="control-bar">
        <span class="ctl-toggle on" aria-disabled="true">
          Auto
          <span class="switch on"><span class="knob"></span></span>
        </span>
        <span class="ctl-toggle" aria-disabled="true">
          Bot
          <span class="switch"><span class="knob"></span></span>
        </span>
        <span class="spacer"></span>
        <span class="model-pill" aria-disabled="true">
          <span class="model-dot"></span>
          Opus 4.7
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true" style="transform:rotate(90deg);">
            <path d="M2 1l3 3-3 3" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </div>

      <div class="column-tabs" role="tablist">
        ${SPEC_COLUMNS.map(col => {
          const isActive = col.key === active.key;
          const count = buckets[col.key].length;
          return html`
            <button
              class="tab ${isActive ? 'active' : ''}"
              role="tab"
              aria-selected=${isActive}
              style="border-top-color:${col.accent};${isActive ? `border-color:color-mix(in srgb,${col.accent} 50%,var(--color-border,#1e3a5f));` : ''}"
              @click=${() => this._selectColumn(col.key)}
            >
              <span
                class="tab-dot"
                style="background:${col.accent};${isActive && col.glow ? `box-shadow:0 0 6px ${col.accent};` : ''}"
              ></span>
              ${col.label}
              <span
                class="tab-count"
                style="${isActive ? `color:${col.accent};` : ''}"
              >${count}</span>
            </button>
          `;
        })}
      </div>

      <div class="column-header">
        <span class="eyebrow" style="color:${active.accent};">${active.label}</span>
        <span class="counts">${activeStories.length} stor${activeStories.length === 1 ? 'y' : 'ies'}</span>
        <span class="spacer"></span>
        <button class="filter-btn" aria-label="Filter">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M1 2h8M2.5 5h5M4 8h2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
          </svg>
          Filter
        </button>
      </div>

      <div class="card-list">
        ${activeStories.length === 0
          ? html`
              <div class="empty">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="opacity:0.5;">
                  <path d="M3 13l3-8h12l3 8M3 13v6h18v-6M3 13h6l1 2h4l1-2h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <div class="empty-title">No stories in ${active.label}</div>
                <div class="empty-sub">Drag from another column, or add a new one.</div>
              </div>
            `
          : activeStories.map(s => html`
              <aos-mobile-spec-story-card .story=${s}></aos-mobile-spec-story-card>
            `)}
      </div>

      <div class="pagination" aria-hidden="true">
        ${SPEC_COLUMNS.map(col => {
          const isActive = col.key === active.key;
          return html`
            <span
              class="dot ${isActive ? 'active' : ''}"
              style="${isActive ? `background:${col.accent};` : ''}"
            ></span>
          `;
        })}
      </div>

      <button class="fab" @click=${() => this._dispatch('new-story-tap')} aria-label="New story">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        New story
      </button>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      position: relative;
      background: var(--color-bg-primary, #0a1422);
      color: var(--color-text-primary, #e8edf2);
      font-family: var(--font-family-sans, system-ui, sans-serif);
    }

    .spacer { flex: 1; }

    /* control bar */
    .control-bar {
      flex-shrink: 0;
      padding: 0.5rem 0.75rem;
      background: var(--color-bg-primary, #0a1422);
      border-bottom: 1px solid var(--color-border, #1e3a5f);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .ctl-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.1875rem 0.3125rem 0.1875rem 0.5625rem;
      background: var(--color-bg-secondary, #0f1f33);
      border: 1px solid var(--color-border, #1e3a5f);
      border-radius: var(--radius-full, 999px);
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--color-text-muted, #64748b);
    }
    .ctl-toggle.on {
      color: var(--color-accent-primary, #00d4ff);
    }

    .switch {
      width: 22px;
      height: 12px;
      border-radius: 7px;
      background: var(--color-bg-tertiary, #1c3254);
      position: relative;
      display: inline-block;
    }
    .switch.on {
      background: rgba(0, 212, 255, 0.7);
    }
    .knob {
      position: absolute;
      top: 1.5px;
      left: 2px;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #94a3b8;
      transition: left 150ms;
    }
    .switch.on .knob {
      left: 11px;
      background: #0b1929;
    }

    .model-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.3125rem;
      padding: 0.25rem 0.5625rem;
      background: var(--color-bg-secondary, #0f1f33);
      border: 1px solid var(--color-border, #1e3a5f);
      border-radius: var(--radius-md, 8px);
      color: var(--color-text-secondary, #94a3b8);
      font-size: 0.6875rem;
      font-weight: 500;
    }
    .model-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--color-accent-primary, #00d4ff);
    }

    /* tabs */
    .column-tabs {
      flex-shrink: 0;
      padding: 0.625rem 0.75rem 0.5rem;
      background: var(--color-bg-primary, #0a1422);
      border-bottom: 1px solid var(--color-border, #1e3a5f);
      display: flex;
      gap: 0.375rem;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .column-tabs::-webkit-scrollbar { display: none; }

    .tab {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.6875rem;
      background: transparent;
      border: 1px solid var(--color-border, #1e3a5f);
      border-top: 2px solid var(--color-border, #1e3a5f);
      border-radius: var(--radius-md, 8px);
      color: var(--color-text-secondary, #94a3b8);
      font-size: 0.71875rem;
      font-weight: 500;
      white-space: nowrap;
      flex-shrink: 0;
      cursor: pointer;
      font-family: inherit;
    }
    .tab.active {
      background: var(--color-bg-secondary, #0f1f33);
      color: var(--color-text-primary, #e8edf2);
      font-weight: 600;
    }

    .tab-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .tab-count {
      font-family: var(--font-family-mono, ui-monospace, monospace);
      font-size: 0.625rem;
      font-weight: 700;
      padding: 0 0.375rem;
      border-radius: var(--radius-full, 999px);
      background: var(--color-bg-tertiary, #1c3254);
      color: var(--color-text-muted, #64748b);
      line-height: 1.6;
    }

    /* column header */
    .column-header {
      flex-shrink: 0;
      padding: 0.75rem 0.875rem 0.25rem;
      display: flex;
      align-items: center;
      gap: 0.4375rem;
    }

    .eyebrow {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .counts {
      font-size: 0.625rem;
      color: var(--color-text-muted, #64748b);
      font-family: var(--font-family-mono, ui-monospace, monospace);
    }

    .filter-btn {
      padding: 0.25rem 0.5rem;
      background: transparent;
      border: 1px solid var(--color-border, #1e3a5f);
      border-radius: var(--radius-sm, 4px);
      color: var(--color-text-secondary, #94a3b8);
      font-size: 0.65625rem;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      cursor: pointer;
      font-family: inherit;
    }

    /* list */
    .card-list {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0.375rem 0.875rem 5.625rem;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }

    .empty {
      margin: 1.25rem 0.25rem;
      padding: 2.25rem 1rem;
      border: 1px dashed var(--color-border, #1e3a5f);
      border-radius: var(--radius-md, 8px);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.375rem;
      color: var(--color-text-muted, #64748b);
    }
    .empty-title {
      font-size: 0.78125rem;
      font-weight: 600;
      color: var(--color-text-secondary, #94a3b8);
    }
    .empty-sub {
      font-size: 0.6875rem;
      text-align: center;
      line-height: 1.4;
    }

    /* pagination */
    .pagination {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 1rem;
      display: flex;
      justify-content: center;
      gap: 0.3125rem;
      z-index: 4;
      pointer-events: none;
    }
    .dot {
      width: 5px;
      height: 5px;
      border-radius: 3px;
      background: var(--color-border, #1e3a5f);
      transition: width 200ms;
    }
    .dot.active {
      width: 14px;
    }

    /* fab */
    .fab {
      position: absolute;
      right: 0.875rem;
      bottom: 2.25rem;
      display: inline-flex;
      align-items: center;
      gap: 0.4375rem;
      padding: 0.6875rem 1rem 0.6875rem 0.8125rem;
      border-radius: var(--radius-full, 999px);
      background: var(--color-accent-primary, #00d4ff);
      color: var(--color-text-inverse, #0f1f33);
      border: none;
      box-shadow: 0 6px 18px rgba(0, 212, 255, 0.45), 0 0 0 4px rgba(0, 212, 255, 0.1);
      font-size: 0.78125rem;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      z-index: 5;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-spec-kanban': AosMobileSpecKanban;
  }
}
