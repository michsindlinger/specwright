import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import './story-status-badge.js';
import type { StoryStatus } from './story-status-badge.js';
import { buildSpecFilePath, copyPathToClipboard } from '../utils/copy-path.js';

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
  @state() private isDragging = false;
  @state() private copied = false;
  @state() private dropdownOpen = false;

  static override styles = css`
    :host {
      display: block;
      user-select: none;
    }

    .story-card {
      background: var(--bg-color-tertiary, #2d2d2d);
      border: 1px solid var(--border-color, #404040);
      border-radius: 6px;
      padding: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      margin-top: 0.5rem;
      position: relative;
    }

    .story-card.dropdown-open {
      z-index: 10;
    }

    .story-card:hover {
      background: var(--bg-color-hover, #3d3d3d);
      border-color: var(--primary-color, #3b82f6);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .story-card.dragging {
      opacity: 0.5;
      transform: scale(0.95);
    }

    .story-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .story-id {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-color-secondary, #a3a3a3);
      background: var(--bg-color-secondary, #1e1e1e);
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      font-family: monospace;
    }

    .effort-badge {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--primary-color, #3b82f6);
      background: rgba(59, 130, 246, 0.1);
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
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

    .story-title {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-color, #e5e5e5);
      line-height: 1.4;
    }

    .story-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      margin-top: 0.25rem;
    }

    .type-badge {
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: var(--text-color-secondary, #a3a3a3);
    }

    .priority-badge {
      font-size: 0.7rem;
      text-transform: uppercase;
      font-weight: 700;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
    }

    .priority-high {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .priority-medium {
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.1);
    }

    .priority-low {
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
    }

    .story-dor-status {
      margin-top: 0.25rem;
    }

    .story-model-select {
      margin-top: 0.5rem;
      border-top: 1px solid var(--border-color, #404040);
      padding-top: 0.5rem;
    }

    .story-model-select aos-model-selector {
      width: 100%;
    }

    .story-deps {
      margin-top: 0.5rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      align-items: center;
    }

    .deps-label {
      font-size: 0.7rem;
      color: var(--text-color-muted, #737373);
      font-weight: 600;
    }

    .dep-tag {
      font-size: 0.65rem;
      background: var(--bg-color-secondary, #1e1e1e);
      color: var(--text-color-secondary, #a3a3a3);
      padding: 0.05rem 0.3rem;
      border-radius: 3px;
      border: 1px solid var(--border-color, #404040);
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
    if (!this.story.file || !this.specId) return;
    const path = buildSpecFilePath(this.specId, this.story.file);
    const button = e.currentTarget as HTMLElement;
    this.copied = true;
    await copyPathToClipboard(path, button);
    setTimeout(() => { this.copied = false; }, 2000);
  }

  private handleDragStart(e: DragEvent): void {
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

  private getTypeIcon(): string {
    const type = (this.story.type || '').toLowerCase();
    if (type.includes('bug') || type.includes('fix')) return '🐛';
    if (type.includes('backend')) return '⚙️';
    if (type.includes('frontend')) return '🎨';
    if (type.includes('full-stack') || type.includes('fullstack')) return '📦';
    return '✨';
  }

  private getPriorityClass(): string {
    const priority = (this.story.priority || '').toLowerCase();
    if (priority.includes('high') || priority.includes('critical')) return 'priority-high';
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
    return html`
      <div
        class="story-card ${this.isDragging ? 'dragging' : ''} ${this.dropdownOpen ? 'dropdown-open' : ''}"
        draggable="true"
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
          <!-- SCA-004: Attachment button -->
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
          <span class="effort-badge">${this.getEffortLabel()}</span>
        </div>

        <h4 class="story-title">${this.story.title}</h4>

        <div class="story-meta">
          <span class="type-badge">
            <span class="type-icon">${this.getTypeIcon()}</span>
            ${this.story.type}
          </span>
          <span class="priority-badge ${this.getPriorityClass()}">${this.story.priority}</span>
        </div>

        <div class="story-dor-status">
          <aos-story-status-badge
            .status="${this.getEffectiveStatus()}"
            .dorComplete="${this.story.dorComplete}"
            .errorMessage="${this.workflowError}"
          ></aos-story-status-badge>
        </div>

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
