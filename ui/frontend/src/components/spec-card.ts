import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { projectContext, type ProjectContextValue } from '../context/project-context.js';

export interface SpecInfo {
  id: string;
  name: string;
  createdDate: string;
  storyCount: number;
  completedCount: number;
  inProgressCount: number;
  hasKanban: boolean;
  gitStrategy: 'branch' | 'worktree' | 'current-branch' | null;
}

@customElement('aos-spec-card')
export class AosSpecCard extends LitElement {
  @consume({ context: projectContext, subscribe: true })
  private projectCtx!: ProjectContextValue;

  @property({ type: Object }) spec!: SpecInfo;
  @state() private isDragging = false;

  private handleClick(): void {
    this.dispatchEvent(
      new CustomEvent('spec-select', {
        detail: { specId: this.spec.id },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleDelete(e: Event): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('spec-delete', {
        detail: { specId: this.spec.id, specName: this.spec.name },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleDragStart(e: DragEvent): void {
    if (!e.dataTransfer) return;

    this.isDragging = true;
    e.dataTransfer.setData('text/plain', this.spec.id);
    e.dataTransfer.setData('text/spec-name', this.spec.name);
    e.dataTransfer.setData('text/drag-type', 'spec');
    // Pass project path and name for global queue drop zone
    e.dataTransfer.setData('text/project-path', this.projectCtx?.activeProject?.path || '');
    e.dataTransfer.setData('text/project-name', this.projectCtx?.activeProject?.name || '');
    // Pass existing gitStrategy if available (to skip dialog when already defined)
    if (this.spec.gitStrategy) {
      e.dataTransfer.setData('text/git-strategy', this.spec.gitStrategy);
    }
    e.dataTransfer.effectAllowed = 'copy';
  }

  private handleDragEnd(): void {
    this.isDragging = false;
  }

  private getProgressPercentage(): number {
    if (this.spec.storyCount === 0) return 0;
    return Math.round((this.spec.completedCount / this.spec.storyCount) * 100);
  }

  override render() {
    const progress = this.getProgressPercentage();
    const backlogCount = this.spec.storyCount - this.spec.completedCount - this.spec.inProgressCount;

    const cardClasses = this.isDragging ? 'spec-card dragging' : 'spec-card';

    return html`
      <div
        class="${cardClasses}"
        draggable="true"
        @click=${this.handleClick}
        @dragstart=${this.handleDragStart}
        @dragend=${this.handleDragEnd}
      >
        <div class="spec-header">
          <h3 class="spec-name">${this.spec.name}</h3>
          <div class="spec-header-actions">
            ${this.spec.hasKanban
              ? html`<span class="kanban-badge">Kanban</span>`
              : html`<span class="no-kanban-badge">Not Started</span>`}
            <button
              class="spec-delete-btn"
              @click=${this.handleDelete}
              aria-label="Spec löschen"
              title="Spec löschen"
            >
              🗑
            </button>
          </div>
        </div>

        <div class="spec-date">${this.formatDate(this.spec.createdDate)}</div>

        <div class="spec-progress">
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${progress}%"></div>
          </div>
          <span class="progress-text">${progress}%</span>
        </div>

        <div class="spec-stats">
          <div class="stat">
            <span class="stat-value">${this.spec.storyCount}</span>
            <span class="stat-label">Stories</span>
          </div>
          <div class="stat">
            <span class="stat-value stat-done">${this.spec.completedCount}</span>
            <span class="stat-label">Done</span>
          </div>
          <div class="stat">
            <span class="stat-value stat-progress">${this.spec.inProgressCount}</span>
            <span class="stat-label">In Progress</span>
          </div>
          <div class="stat">
            <span class="stat-value stat-backlog">${backlogCount}</span>
            <span class="stat-label">Backlog</span>
          </div>
        </div>
      </div>
    `;
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return 'Unknown date';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-spec-card': AosSpecCard;
  }
}
