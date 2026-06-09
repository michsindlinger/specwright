import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { projectContext, type ProjectContextValue } from '../context/project-context.js';
import { buildSpecFilePath, copyPathToClipboard } from '../utils/copy-path.js';
import type { Priority, DependencyStatus } from '../../../src/shared/types/spec-dependencies.protocol.js';
import './aos-priority-badge.js';

export interface SpecInfo {
  id: string;
  name: string;
  createdDate: string;
  storyCount: number;
  completedCount: number;
  inProgressCount: number;
  hasKanban: boolean;
  gitStrategy: 'branch' | 'worktree' | 'current-branch' | null;
  assignedToBot?: boolean;
  isReady?: boolean;
  // SPD-001/002: priority & dependency fields (optional, absent on legacy specs)
  priority?: Priority;
  blockedBy?: string[];
  dependencyStatus?: DependencyStatus;
  orderIndex?: number;
  // SPD-005: client-side resolved names for blockedBy IDs
  blockedByNames?: string[];
}

type DerivedStage = 'in-progress' | 'ready' | 'shipping' | 'done' | 'not-started';

@customElement('aos-spec-card')
export class AosSpecCard extends LitElement {
  @consume({ context: projectContext, subscribe: true })
  private projectCtx!: ProjectContextValue;

  @property({ type: Object }) spec!: SpecInfo;
  @state() private isDragging = false;
  @state() private copySuccess = false;

  private handleClick(): void {
    this.dispatchEvent(
      new CustomEvent('spec-select', {
        detail: { specId: this.spec.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleDelete(e: Event): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('spec-delete', {
        detail: { specId: this.spec.id, specName: this.spec.name },
        bubbles: true,
        composed: true,
      })
    );
  }

  private async handleCopySpecPath(e: Event): Promise<void> {
    e.stopPropagation();
    const path = buildSpecFilePath(this.spec.id, 'spec.md');
    const button = e.currentTarget as HTMLElement;
    await copyPathToClipboard(path, button);
    this.copySuccess = true;
    setTimeout(() => { this.copySuccess = false; }, 2000);
  }

  private handleAssignToggle(e: Event): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('spec-assign', {
        detail: { specId: this.spec.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handlePriorityChange(e: CustomEvent<{ priority: string | null }>): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('spec-priority-change', {
        detail: { specId: this.spec.id, priority: e.detail.priority },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleEditDependencies(e: Event): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('spec-edit-dependencies', {
        detail: { specId: this.spec.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleDragStart(e: DragEvent): void {
    if (!e.dataTransfer) return;
    this.isDragging = true;
    e.dataTransfer.setData('text/plain', this.spec.id);
    e.dataTransfer.setData('text/spec-name', this.spec.name);
    e.dataTransfer.setData('text/drag-type', 'spec');
    e.dataTransfer.setData('text/project-path', this.projectCtx?.activeProject?.path || '');
    e.dataTransfer.setData('text/project-name', this.projectCtx?.activeProject?.name || '');
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

  // Derive stage from known counts — avoids inventing a backend field.
  private deriveStage(): DerivedStage {
    const s = this.spec;
    if (s.storyCount === 0) return 'not-started';
    if (s.completedCount === s.storyCount) return 'done';
    if (s.inProgressCount > 0) return 'in-progress';
    if (s.isReady) return 'ready';
    return 'not-started';
  }

  private stageLabel(stage: DerivedStage): string {
    switch (stage) {
      case 'in-progress': return 'In progress';
      case 'ready': return 'Ready';
      case 'done': return 'Done';
      case 'shipping': return 'Shipping';
      case 'not-started': return 'Not started';
    }
  }

  override render() {
    const progress = this.getProgressPercentage();
    const backlogCount = this.spec.storyCount - this.spec.completedCount - this.spec.inProgressCount;
    const stage = this.deriveStage();
    const isDone = progress === 100;
    const hasProgress = progress > 0 && progress < 100;
    const cardClasses = `spec-card sw-hover-lift spec-card--stage-${stage}${this.isDragging ? ' dragging' : ''}`;

    return html`
      <article
        class="${cardClasses}"
        draggable="true"
        @click=${this.handleClick}
        @dragstart=${this.handleDragStart}
        @dragend=${this.handleDragEnd}
      >
        <header class="spec-card__header">
          <span class="spec-card__stage-pill spec-card__stage-pill--${stage}">
            <span class="spec-card__stage-dot"></span>
            ${this.stageLabel(stage)}
          </span>
          ${this.spec.hasKanban
            ? html`<span class="spec-card__type-badge">Kanban</span>`
            : html`<span class="spec-card__type-badge spec-card__type-badge--muted">Discovery</span>`}
          <aos-priority-badge
            .priority=${this.spec.priority ?? null}
            @priority-change=${this.handlePriorityChange}
          ></aos-priority-badge>
          <button
            class="spec-card__dep-btn"
            @click=${this.handleEditDependencies}
            aria-label="Abhängigkeiten bearbeiten"
            title="Abhängigkeiten bearbeiten"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </button>
          <span class="spec-card__header-spacer"></span>
          <button
            class="assign-toggle-btn ${this.spec.assignedToBot ? 'assigned' : ''} ${!this.spec.isReady && !this.spec.assignedToBot ? 'assign-disabled' : ''}"
            @click=${this.handleAssignToggle}
            ?disabled=${!this.spec.isReady && !this.spec.assignedToBot}
            aria-label="${!this.spec.isReady && !this.spec.assignedToBot ? 'Spec muss "ready" sein' : (this.spec.assignedToBot ? 'Bot-Assignment entfernen' : 'An Bot assignen')}"
            title="${!this.spec.isReady && !this.spec.assignedToBot ? 'Spec muss "ready" sein' : (this.spec.assignedToBot ? 'Bot-Assignment entfernen' : 'An Bot assignen')}"
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
          <button
            class="spec-copy-path-btn ${this.copySuccess ? 'copy-path--copied' : ''}"
            @click=${this.handleCopySpecPath}
            aria-label="Spec-Pfad kopieren"
            title="Spec-Pfad kopieren"
          >
            ${this.copySuccess
              ? html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
              : html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`
            }
          </button>
          <button
            class="spec-delete-btn"
            @click=${this.handleDelete}
            aria-label="Spec löschen"
            title="Spec löschen"
          >🗑</button>
        </header>

        <h3 class="spec-card__title">${this.spec.name}</h3>

        <div class="spec-card__progress">
          <div class="spec-card__progress-meta">
            <span class="spec-card__progress-count">${this.spec.completedCount}/${this.spec.storyCount} stories</span>
            <span class="spec-card__progress-pct ${progress > 0 ? '' : 'spec-card__progress-pct--zero'}">${progress}%</span>
          </div>
          <div class="progress-bar-bg">
            <div
              class="progress-bar-fill ${isDone ? 'progress-bar-fill--done' : ''} ${hasProgress ? 'sw-progress-fill' : ''}"
              style="width: ${progress}%"
            ></div>
          </div>
        </div>

        <div class="spec-stats">
          <div class="stat">
            <span class="stat-value">${this.spec.storyCount}</span>
            <span class="stat-label">Stories</span>
          </div>
          <div class="stat">
            <span class="stat-value ${this.spec.completedCount > 0 ? 'stat-value--success' : ''}">${this.spec.completedCount}</span>
            <span class="stat-label">Done</span>
          </div>
          <div class="stat">
            <span class="stat-value ${this.spec.inProgressCount > 0 ? 'stat-value--accent' : ''}">${this.spec.inProgressCount}</span>
            <span class="stat-label">In Progress</span>
          </div>
          <div class="stat">
            <span class="stat-value ${backlogCount > 0 ? 'stat-value--muted-strong' : ''}">${backlogCount}</span>
            <span class="stat-label">Backlog</span>
          </div>
        </div>

        <footer class="spec-card__footer">
          <span class="spec-card__date" aria-label="Created date">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${this.formatDate(this.spec.createdDate)}
          </span>
          ${this.spec.dependencyStatus === 'blocked' ? html`
            <span class="spec-card__blocked-hint" title="${(this.spec.blockedByNames ?? this.spec.blockedBy ?? []).join(', ')}">
              🔒 ${this.renderBlockedLabel()}
            </span>
          ` : ''}
          ${this.spec.assignedToBot ? html`
            <span class="spec-card__agent">
              <span class="sw-live-dot"></span>
              Bot assigned
            </span>
          ` : ''}
        </footer>
      </article>
    `;
  }

  private renderBlockedLabel(): string {
    const names = this.spec.blockedByNames;
    if (names && names.length > 0) {
      return names.length <= 2
        ? `Blockiert durch ${names.join(', ')}`
        : `Blockiert durch ${names[0]} +${names.length - 1}`;
    }
    const count = (this.spec.blockedBy ?? []).length;
    return count > 0 ? `Blockiert durch ${count} Spec${count !== 1 ? 's' : ''}` : 'Blockiert';
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return 'Unknown date';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
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
