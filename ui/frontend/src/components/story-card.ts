import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import './story-status-badge.js';
import './aos-claude-log-panel.js';
import type { StoryStatus } from './story-status-badge.js';
import { buildSpecFilePath, buildBacklogFilePath, copyPathToClipboard } from '../utils/copy-path.js';

export type WorkflowStatus = 'idle' | 'working' | 'success' | 'error';
export type ModelSelection = string; // Dynamic model ID (e.g., 'opus', 'sonnet', 'glm-5')

export interface ModelInfo {
  id: string;
  name: string;
  providerId: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  models: ModelInfo[];
}

export interface StoryInfo {
  id: string;
  title: string;
  type: string;
  priority: string;
  effort: string;
  status: 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked';
  dependencies: string[];
  dorComplete: boolean; // true = Ready (all DoR [x]), false = Blocked (any DoR [ ])
  file?: string; // Relative path to the story file within the spec folder
  model?: ModelSelection; // Default 'opus' if not specified
  workflowStatus?: WorkflowStatus;
  workflowError?: string;
  attachmentCount?: number; // SCA-004: Number of attachments on this story
  commentCount?: number; // BLC-005: Number of comments on this story
  assignedToBot?: boolean; // Backlog item assignment
}

// Default fallback providers (used if none provided)
const DEFAULT_PROVIDERS: ProviderInfo[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      { id: 'opus', name: 'Opus 4.5', providerId: 'anthropic' },
      { id: 'sonnet', name: 'Sonnet 4', providerId: 'anthropic' },
      { id: 'haiku', name: 'Haiku 3.5', providerId: 'anthropic' },
    ],
  },
  {
    id: 'glm',
    name: 'GLM',
    models: [
      { id: 'glm-5', name: 'GLM 5', providerId: 'glm' },
    ],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    models: [
      { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', providerId: 'gemini' },
      { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', providerId: 'gemini' },
    ],
  },
  {
    id: 'kimi-kw',
    name: 'KIMI K2',
    models: [
      { id: 'kimi-k2.5', name: 'Kimi K2.5', providerId: 'kimi-kw' },
    ],
  },
];

@customElement('aos-story-card')
export class AosStoryCard extends LitElement {
  @property({ type: Object }) story!: StoryInfo;
  @property({ type: String }) specId = '';
  @property({ type: String }) workflowStatus: WorkflowStatus = 'idle';
  @property({ type: String }) workflowError: string = '';
  @property({ type: Array }) providers: ProviderInfo[] = DEFAULT_PROVIDERS;
  @property({ type: Boolean, reflect: true }) dragDisabled = false;
  @property({ type: Boolean }) isBacklogMode = false;
  @property({ type: String }) sessionId?: string;
  @state() private isDragging = false;
  @state() private copied = false;
  @state() private dropdownOpen = false;
  @state() private logExpanded = false;

  static override styles = css`
    :host {
      display: block;
      user-select: none;
    }

    .story-card {
      background: var(--color-bg-primary, #0F1F33);
      border: 1px solid var(--color-border, #1E3A5F);
      border-radius: var(--radius-md, 0.5rem);
      padding: 10px 12px;
      cursor: grab;
      transition: transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
      display: flex;
      flex-direction: column;
      gap: 8px;
      position: relative;
    }

    .story-card.active-ring {
      border-color: rgba(0, 212, 255, 0.4);
      box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1);
    }

    .story-card.dropdown-open {
      z-index: 10;
    }

    .story-card:hover {
      border-color: var(--color-border-hover, #2D4F7A);
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
    }

    .story-card.dragging {
      opacity: 0.5;
      transform: scale(0.97);
    }

    .story-card.drag-disabled {
      cursor: default;
    }

    .story-card.drag-disabled:hover {
      transform: none;
      box-shadow: none;
    }

    .story-header {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .story-id {
      font-family: var(--font-family-mono, 'JetBrains Mono', ui-monospace, monospace);
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: var(--color-text-secondary, #94A3B8);
      background: var(--color-bg-tertiary, #1C3254);
      padding: 2px 7px;
      border-radius: var(--radius-sm, 0.25rem);
    }

    .header-spacer { flex: 1; }

    .effort-badge {
      font-family: var(--font-family-mono, 'JetBrains Mono', ui-monospace, monospace);
      font-size: 10.5px;
      font-weight: 600;
      color: var(--color-accent-primary, #00D4FF);
    }

    .copy-path-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      padding: 0.15rem;
      border-radius: 3px;
      cursor: pointer;
      color: var(--text-color-secondary, #a3a3a3);
      opacity: 0;
      transition: opacity 0.2s, color 0.2s;
    }

    .story-card:hover .copy-path-btn {
      opacity: 1;
    }

    .copy-path-btn:hover {
      color: var(--primary-color, #3b82f6);
    }

    .copy-path-btn.copied {
      color: var(--success-color, #22c55e);
      opacity: 1;
    }

    .attachment-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      padding: 0.15rem;
      border-radius: 3px;
      cursor: pointer;
      color: var(--text-color-secondary, #a3a3a3);
      opacity: 0;
      transition: opacity 0.2s, color 0.2s;
      margin-left: 0.25rem;
    }

    .story-card:hover .attachment-btn {
      opacity: 1;
    }

    .attachment-btn:hover {
      color: var(--primary-color, #3b82f6);
    }

    .attachment-btn.has-attachments {
      opacity: 1;
    }

    .attachment-count {
      font-size: 0.7rem;
      font-weight: 600;
      margin-left: 0.15rem;
      color: var(--primary-color, #3b82f6);
    }

    .comment-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      padding: 0.15rem;
      border-radius: 3px;
      cursor: pointer;
      color: var(--text-color-secondary, #a3a3a3);
      opacity: 0;
      transition: opacity 0.2s, color 0.2s;
      margin-left: 0.25rem;
    }

    .story-card:hover .comment-btn {
      opacity: 1;
    }

    .comment-btn:hover {
      color: var(--primary-color, #3b82f6);
    }

    .comment-btn.has-comments {
      opacity: 1;
    }

    .comment-count {
      font-size: 0.7rem;
      font-weight: 600;
      margin-left: 0.15rem;
      color: var(--primary-color, #3b82f6);
    }

    .assign-toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      padding: 0.15rem;
      border-radius: 3px;
      cursor: pointer;
      color: var(--text-color-secondary, #a3a3a3);
      opacity: 0;
      transition: opacity 0.2s, color 0.2s;
      margin-left: 0.25rem;
    }

    .story-card:hover .assign-toggle-btn {
      opacity: 1;
    }

    .assign-toggle-btn:hover {
      color: var(--primary-color, #3b82f6);
    }

    .assign-toggle-btn.assigned {
      color: var(--success-color, #22c55e);
      opacity: 1;
    }

    .assign-toggle-btn.assign-disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .story-title {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.35;
      color: var(--color-text-primary, #E8EDF2);
      text-wrap: pretty;
    }

    .story-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }

    .type-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10.5px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: var(--radius-full, 9999px);
      background: rgba(139, 92, 246, 0.15);
      color: #C4B5FD;
    }
    .type-badge .type-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
    }
    .type-badge.type-backend   { background: rgba(139, 92, 246, 0.15); color: #C4B5FD; }
    .type-badge.type-frontend  { background: rgba(34, 197, 94, 0.15);  color: #22C55E; }
    .type-badge.type-bug       { background: rgba(239, 68, 68, 0.15);  color: #EF4444; }
    .type-badge.type-email     { background: rgba(245, 158, 11, 0.15); color: #F59E0B; }
    .type-badge.type-security  { background: rgba(239, 68, 68, 0.18);  color: #FCA5A5; }
    .type-badge.type-fullstack { background: rgba(0, 212, 255, 0.15);  color: #00D4FF; }
    .type-badge.type-other     { background: var(--color-bg-tertiary, #1C3254); color: var(--color-text-secondary, #94A3B8); }

    .priority-badge {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 2px 7px;
      border-radius: var(--radius-sm, 0.25rem);
    }
    .priority-high,
    .priority-critical {
      color: #EF4444;
      background: rgba(239, 68, 68, 0.15);
    }
    .priority-critical {
      color: #FCA5A5;
      background: rgba(239, 68, 68, 0.2);
    }
    .priority-medium {
      color: #F59E0B;
      background: rgba(245, 158, 11, 0.15);
    }
    .priority-low {
      color: #94A3B8;
      background: rgba(100, 116, 139, 0.15);
    }

    .story-dor-status {
      display: flex;
    }

    .agent-progress {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      background: rgba(0, 212, 255, 0.06);
      border: 1px solid rgba(0, 212, 255, 0.2);
      border-radius: var(--radius-sm, 0.25rem);
      font-size: 11px;
      color: var(--color-accent-primary, #00D4FF);
    }
    .agent-progress .agent-emoji { font-size: 12px; }
    .agent-progress .agent-text { flex: 1; }

    .blocked-reason {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      padding: 6px 8px;
      background: rgba(239, 68, 68, 0.06);
      border: 1px solid rgba(239, 68, 68, 0.22);
      border-radius: var(--radius-sm, 0.25rem);
      font-size: 11px;
      color: #FCA5A5;
      line-height: 1.35;
    }

    .story-model-select {
      display: flex;
    }

    .story-model-select aos-model-selector {
      width: 100%;
    }

    .story-deps {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
      font-size: 10.5px;
      color: var(--color-text-muted, #64748B);
    }

    .log-toggle-row {
      display: flex;
    }

    .log-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-family: var(--font-family-mono, 'JetBrains Mono', ui-monospace, monospace);
      font-size: 10.5px;
      font-weight: 500;
      padding: 3px 8px;
      border-radius: var(--radius-sm, 0.25rem);
      background: rgba(0, 212, 255, 0.08);
      border: 1px solid rgba(0, 212, 255, 0.25);
      color: var(--color-accent-primary, #00D4FF);
      cursor: pointer;
      user-select: none;
      transition: background 150ms ease, border-color 150ms ease;
    }

    .log-toggle-btn:hover {
      background: rgba(0, 212, 255, 0.14);
      border-color: rgba(0, 212, 255, 0.45);
    }

    .log-toggle-btn .chevron {
      display: inline-block;
      transition: transform 150ms ease;
    }

    .log-toggle-btn[aria-expanded="true"] .chevron {
      transform: rotate(90deg);
    }

    .log-panel-wrapper {
      display: block;
    }

    .deps-label {
      font-family: var(--font-family-mono, 'JetBrains Mono', ui-monospace, monospace);
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .dep-tag {
      font-family: var(--font-family-mono, 'JetBrains Mono', ui-monospace, monospace);
      font-size: 10px;
      padding: 1px 6px;
      border-radius: var(--radius-sm, 0.25rem);
      background: var(--color-bg-tertiary, #1C3254);
      color: var(--color-text-secondary, #94A3B8);
    }

    /* Status badge styles (duplicated from theme.css for Shadow DOM) */
    .story-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .story-status-badge .status-indicator {
      font-size: 10px;
    }

    .status-ready {
      background-color: rgba(var(--color-accent-success-rgb), 0.15);
      color: var(--color-accent-primary);
      border: 1px solid rgba(var(--color-accent-success-rgb), 0.3);
    }

    .status-ready .status-indicator {
      color: var(--color-accent-primary);
      text-shadow: 0 0 6px rgba(var(--color-accent-success-rgb), 0.5);
    }

    .status-blocked {
      background-color: rgba(var(--color-accent-error-rgb), 0.15);
      color: var(--color-accent-error);
      border: 1px solid rgba(var(--color-accent-error-rgb), 0.3);
    }

    .status-blocked .status-indicator {
      color: var(--color-accent-error);
      animation: pulse-red 2s ease-in-out infinite;
    }

    .status-in-progress {
      background-color: rgba(var(--color-accent-primary-rgb), 0.15);
      color: var(--color-accent-primary);
      border: 1px solid rgba(var(--color-accent-primary-rgb), 0.3);
    }

    .status-in-progress .status-indicator {
      color: var(--color-accent-primary);
      animation: pulse-blue 2s ease-in-out infinite;
    }

    .status-done {
      background-color: rgba(107, 114, 128, 0.15);
      color: #9ca3af;
      border: 1px solid rgba(107, 114, 128, 0.3);
    }

    .status-done .status-indicator {
      color: #9ca3af;
    }

    .status-unknown {
      background-color: rgba(156, 163, 175, 0.1);
      color: #9ca3af;
      border: 1px dashed rgba(156, 163, 175, 0.4);
    }

    .status-unknown .status-indicator {
      color: #9ca3af;
    }

    .status-working {
      background-color: rgba(245, 158, 11, 0.15);
      color: var(--color-accent-warning);
      border: 1px solid rgba(245, 158, 11, 0.4);
    }

    .status-working .status-indicator {
      color: var(--color-accent-warning);
      animation: pulse-working 1.5s ease-in-out infinite;
    }

    .status-error {
      background-color: rgba(var(--color-accent-error-rgb), 0.15);
      color: var(--color-accent-error);
      border: 1px solid rgba(var(--color-accent-error-rgb), 0.4);
    }

    .status-error .status-indicator {
      color: var(--color-accent-error);
    }

    .status-in-review {
      background-color: rgba(245, 158, 11, 0.15);
      color: var(--color-accent-warning);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .status-in-review .status-indicator {
      color: var(--color-accent-warning);
    }

    @keyframes pulse-working {
      0%, 100% {
        opacity: 1;
        transform: rotate(0deg);
      }
      50% {
        opacity: 0.6;
        transform: rotate(180deg);
      }
    }

    @keyframes pulse-blue {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.6;
      }
    }

    @keyframes pulse-red {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    /* ── Mobile Responsive ─────────────────────────── */

    @media (max-width: 768px) {
      .story-card {
        padding: 0.65rem;
      }

      .story-card:hover {
        transform: none;
        box-shadow: none;
      }

      .story-title {
        font-size: 0.875rem;
      }

      /* Make action buttons always visible on touch */
      .copy-path-btn,
      .attachment-btn,
      .comment-btn,
      .assign-toggle-btn {
        opacity: 1;
      }
    }
  `;
  private handleClick(): void {
    this.dispatchEvent(
      new CustomEvent('story-select', {
        detail: { storyId: this.story.id },
        bubbles: true,
        composed: true
      })
    );
  }

  private async handleCopyPath(e: Event): Promise<void> {
    e.stopPropagation();
    if (!this.story.file) return;
    const path = this.isBacklogMode
      ? buildBacklogFilePath(this.story.file)
      : buildSpecFilePath(this.specId, this.story.file);
    const button = e.currentTarget as HTMLElement;
    this.copied = true;
    await copyPathToClipboard(path, button);
    setTimeout(() => { this.copied = false; }, 2000);
  }

  private handleDragStart(e: DragEvent): void {
    if (this.dragDisabled) { e.preventDefault(); return; }
    if (!e.dataTransfer) return;

    e.dataTransfer.setData('text/plain', this.story.id);
    e.dataTransfer.effectAllowed = 'move';

    this.isDragging = true;

    this.dispatchEvent(
      new CustomEvent('story-drag-start', {
        detail: { storyId: this.story.id, story: this.story },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleDragEnd(): void {
    this.isDragging = false;

    this.dispatchEvent(
      new CustomEvent('story-drag-end', {
        detail: { storyId: this.story.id },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleDropdownToggle(e: CustomEvent): void {
    e.stopPropagation();
    this.dropdownOpen = (e.detail as { open: boolean }).open;
  }

  private handleModelChange(e: CustomEvent): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('story-model-change', {
        detail: {
          storyId: this.story.id,
          model: (e.detail as { modelId: string }).modelId as ModelSelection
        },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleAssignToggle(e: Event): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('backlog-item-assign', {
        detail: { itemId: this.story.id },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleAttachmentClick(e: Event): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('attachment-open', {
        detail: {
          storyId: this.story.id,
          story: this.story
        },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleCommentClick(e: Event): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('comment-open', {
        detail: { itemId: this.story.id },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleLogToggle(e: Event): void {
    e.stopPropagation();
    this.logExpanded = !this.logExpanded;
  }

  private getTypeVariant(): string {
    const type = (this.story.type || '').toLowerCase();
    if (type.includes('bug') || type.includes('fix')) return 'type-bug';
    if (type.includes('email')) return 'type-email';
    if (type.includes('security')) return 'type-security';
    if (type.includes('full-stack') || type.includes('fullstack')) return 'type-fullstack';
    if (type.includes('backend')) return 'type-backend';
    if (type.includes('frontend')) return 'type-frontend';
    return 'type-other';
  }

  private getPriorityClass(): string {
    const priority = (this.story.priority || '').toLowerCase();
    if (priority.includes('critical')) return 'priority-critical';
    if (priority.includes('high')) return 'priority-high';
    if (priority.includes('low')) return 'priority-low';
    return 'priority-medium';
  }

  private getEffortLabel(): string {
    const effort = (this.story.effort || '').toUpperCase();
    switch (effort) {
      case 'XS': return 'XS';
      case 'S': return 'S';
      case 'M': return 'M';
      case 'L': return 'L';
      case 'XL': return 'XL';
      default: return effort;
    }
  }

  /**
   * Get the effective status for the status badge.
   * Workflow status (working/error) takes precedence over story status.
   */
  private getEffectiveStatus(): StoryStatus {
    // Workflow status takes precedence when story is in progress
    if (this.story.status === 'in_progress') {
      if (this.workflowStatus === 'working') {
        return 'working';
      }
      if (this.workflowStatus === 'error') {
        return 'error';
      }
    }
    // Map story status to StoryStatus
    const statusMap: Record<string, StoryStatus> = {
      'backlog': 'backlog',
      'blocked': 'blocked',
      'in_progress': 'in-progress',
      'in_review': 'in-review',
      'done': 'done'
    };
    return statusMap[this.story.status] || 'unknown';
  }

  override render() {
    const isActive = this.story.status === 'in_progress' || this.workflowStatus === 'working';
    const isWorking = this.workflowStatus === 'working';
    const isBlocked = this.story.status === 'blocked';
    // TODO(backend): design also shows tag/category chip, size+SP, agent drafting %, blocked reason, assignee/PR/reviewers.
    // We use story.type for the tag, story.effort for the size label. The rest skip when not present.

    return html`
      <div
        class="story-card ${this.isDragging ? 'dragging' : ''} ${this.dropdownOpen ? 'dropdown-open' : ''} ${this.dragDisabled ? 'drag-disabled' : ''} ${isActive ? 'active-ring' : ''}"
        draggable="${this.dragDisabled ? 'false' : 'true'}"
        @click=${this.handleClick}
        @dragstart=${this.handleDragStart}
        @dragend=${this.handleDragEnd}
      >
        <div class="story-header">
          <span class="story-id">${this.story.id}</span>
          ${this.story.file ? html`
            <button
              class="copy-path-btn ${this.copied ? 'copied' : ''}"
              title="Copy file path"
              @click=${this.handleCopyPath}
            >
              ${this.copied
                ? html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
                : html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`
              }
            </button>
          ` : ''}
          <button
            class="attachment-btn ${(this.story.attachmentCount ?? 0) > 0 ? 'has-attachments' : ''}"
            title="Attachments"
            @click=${this.handleAttachmentClick}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
            ${(this.story.attachmentCount ?? 0) > 0
              ? html`<span class="attachment-count">${this.story.attachmentCount}</span>`
              : ''}
          </button>
          <button
            class="comment-btn ${(this.story.commentCount ?? 0) > 0 ? 'has-comments' : ''}"
            title="Comments"
            @click=${this.handleCommentClick}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            ${(this.story.commentCount ?? 0) > 0
              ? html`<span class="comment-count">${this.story.commentCount}</span>`
              : ''}
          </button>
          ${this.isBacklogMode ? html`
            <button
              class="assign-toggle-btn ${this.story.assignedToBot ? 'assigned' : ''} ${this.story.status !== 'backlog' && !this.story.assignedToBot ? 'assign-disabled' : ''}"
              @click=${this.handleAssignToggle}
              ?disabled=${this.story.status !== 'backlog' && !this.story.assignedToBot}
              aria-label="${this.story.status !== 'backlog' && !this.story.assignedToBot ? 'Item muss im Backlog sein' : (this.story.assignedToBot ? 'Bot-Assignment entfernen' : 'An Bot assignen')}"
              title="${this.story.status !== 'backlog' && !this.story.assignedToBot ? 'Item muss im Backlog sein' : (this.story.assignedToBot ? 'Bot-Assignment entfernen' : 'An Bot assignen')}"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 8V4H8"/>
                <rect width="16" height="12" x="4" y="8" rx="2"/>
                <path d="M2 14h2"/>
                <path d="M20 14h2"/>
                <path d="M15 13v2"/>
                <path d="M9 13v2"/>
              </svg>
            </button>
          ` : ''}
          <span class="header-spacer"></span>
          ${this.story.effort ? html`<span class="effort-badge">${this.getEffortLabel()}</span>` : ''}
        </div>

        <h4 class="story-title">${this.story.title}</h4>

        <div class="story-meta">
          ${this.story.type ? html`
            <span class="type-badge ${this.getTypeVariant()}">
              <span class="type-dot"></span>
              ${this.story.type}
            </span>
          ` : ''}
          ${this.story.priority ? html`
            <span class="priority-badge ${this.getPriorityClass()}">${this.story.priority}</span>
          ` : ''}
        </div>

        <div class="story-dor-status">
          <aos-story-status-badge
            .status="${this.getEffectiveStatus()}"
            .dorComplete="${this.story.dorComplete}"
            .errorMessage="${this.workflowError}"
          ></aos-story-status-badge>
        </div>

        ${this.sessionId ? html`
          <div class="log-toggle-row" @click=${(e: Event) => e.stopPropagation()}>
            <button
              class="log-toggle-btn"
              type="button"
              aria-expanded="${this.logExpanded ? 'true' : 'false'}"
              aria-controls="claude-log-${this.story.id}"
              title="${this.logExpanded ? 'Logs ausblenden' : 'Claude-Logs anzeigen'}"
              @click=${this.handleLogToggle}
            >
              <span class="chevron">▶</span>
              <span>${this.logExpanded ? 'Logs ausblenden' : 'Claude-Logs'}</span>
            </button>
          </div>
        ` : nothing}

        ${this.sessionId && this.logExpanded ? html`
          <div
            class="log-panel-wrapper"
            id="claude-log-${this.story.id}"
            @click=${(e: Event) => e.stopPropagation()}
          >
            <aos-claude-log-panel .sessionId=${this.sessionId}></aos-claude-log-panel>
          </div>
        ` : nothing}

        ${isWorking ? html`
          <div class="agent-progress">
            <span class="agent-emoji">🤖</span>
            <span class="agent-text">Agent running…</span>
          </div>
        ` : ''}

        ${isBlocked && this.workflowError ? html`
          <div class="blocked-reason">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>${this.workflowError}</span>
          </div>
        ` : ''}

        <div class="story-model-select" @click=${(e: Event) => e.stopPropagation()}>
          <aos-model-selector
            .externalProviders=${this.providers}
            .externalSelectedModelId=${this.story.model || 'opus'}
            ?disabled=${this.story.status === 'in_progress'}
            @model-changed=${this.handleModelChange}
            @dropdown-toggle=${this.handleDropdownToggle}
          ></aos-model-selector>
        </div>

        ${this.story.dependencies.length > 0
          ? html`
              <div class="story-deps">
                <span class="deps-label">Deps:</span>
                ${this.story.dependencies.map(dep => html`<span class="dep-tag">${dep}</span>`)}
              </div>
            `
          : ''}
      </div>
    `;
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'aos-story-card': AosStoryCard;
  }
}
