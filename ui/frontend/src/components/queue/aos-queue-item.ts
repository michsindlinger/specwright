import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { GitStrategy } from '../git-strategy-dialog.js';

/**
 * Queue item status types
 */
export type QueueItemStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

/**
 * Queue item progress data
 */
export interface QueueItemProgress {
  done: number;
  total: number;
  inProgressStoryId?: string;
}

/**
 * Queue item data interface
 */
export type QueueItemType = 'spec' | 'backlog';

export interface QueueItem {
  id: string;
  specId: string;
  specName: string;
  projectPath: string;
  projectName: string;
  status: QueueItemStatus;
  position: number;
  gitStrategy?: GitStrategy;
  itemType?: QueueItemType;
  progress?: QueueItemProgress;
}

/**
 * aos-queue-item: Displays a single item in a queue list.
 * Shows spec name and status with appropriate styling.
 * Drag-drop reordering is handled by the parent component (aos-queue-section).
 */
@customElement('aos-queue-item')
export class AosQueueItem extends LitElement {
  @property({ type: Object }) item!: QueueItem;

  private getStatusIcon(): string {
    switch (this.item.status) {
      case 'pending':
        return '⏳';
      case 'running':
        return '▶️';
      case 'done':
        return '✅';
      case 'failed':
        return '❌';
      case 'skipped':
        return '⏭️';
      default:
        return '⏳';
    }
  }

  private getStatusLabel(): string {
    switch (this.item.status) {
      case 'pending':
        return 'Wartend';
      case 'running':
        return 'Läuft';
      case 'done':
        return 'Fertig';
      case 'failed':
        return 'Fehlgeschlagen';
      case 'skipped':
        return 'Übersprungen';
      default:
        return 'Wartend';
    }
  }

  private getGitStrategyIcon(): string {
    if (!this.item.gitStrategy) return '';
    switch (this.item.gitStrategy) {
      case 'worktree': return '🌳';
      case 'current-branch': return '📌';
      default: return '🌿';
    }
  }

  private getGitStrategyLabel(): string {
    if (!this.item.gitStrategy) return '';
    switch (this.item.gitStrategy) {
      case 'worktree': return 'Worktree';
      case 'current-branch': return 'Aktueller Branch';
      default: return 'Branch';
    }
  }

  private handleRemove(e: Event): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('queue-item-remove', {
        detail: { itemId: this.item.id, specId: this.item.specId },
        bubbles: true,
        composed: true
      })
    );
  }

  /**
   * Handle click on queue item - navigate to kanban for running/done specs
   */
  private handleClick(): void {
    // Only allow navigation to kanban for running or done specs
    if (this.item.status === 'running' || this.item.status === 'done') {
      this.dispatchEvent(
        new CustomEvent('queue-item-view-kanban', {
          detail: { specId: this.item.specId },
          bubbles: true,
          composed: true
        })
      );
    }
  }

  /**
   * Render progress bar for running/completed specs
   */
  private renderProgress() {
    const { progress } = this.item;

    if (!progress || progress.total === 0) {
      return null;
    }

    const percentage = Math.round((progress.done / progress.total) * 100);

    return html`
      <div class="queue-item-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
        <span class="progress-text">${progress.done}/${progress.total}</span>
      </div>
    `;
  }

  /**
   * Get tooltip text explaining why item cannot be edited (SKQ-006)
   */
  private getProtectedTooltip(): string {
    switch (this.item.status) {
      case 'running':
        return 'Laufende Specs können nicht bearbeitet werden';
      case 'done':
        return 'Abgeschlossene Specs können nicht bearbeitet werden';
      case 'failed':
        return 'Fehlgeschlagene Specs können nicht bearbeitet werden';
      case 'skipped':
        return 'Übersprungene Specs können nicht bearbeitet werden';
      default:
        return '';
    }
  }

  /**
   * Check if item is editable (SKQ-006)
   */
  private isEditable(): boolean {
    return this.item.status === 'pending';
  }

  override render() {
    if (!this.item) return html``;

    const statusClass = `queue-item-status-${this.item.status}`;
    const canEdit = this.isEditable();
    const protectedTooltip = this.getProtectedTooltip();
    const canClickToView = this.item.status === 'running' || this.item.status === 'done';

    return html`
      <div
        class="queue-item ${statusClass} ${canEdit ? '' : 'protected'} ${canClickToView ? 'clickable' : ''}"
        title="${canEdit ? '' : protectedTooltip}"
        @click=${canClickToView ? this.handleClick : null}
      >
        <div class="queue-item-position">${this.item.position}</div>
        <div class="queue-item-content">
          <span class="queue-item-name" title="${this.item.specName}">
            ${this.item.specName}
          </span>
          <div class="queue-item-meta">
            <span class="queue-item-status-icon">${this.getStatusIcon()}</span>
            <span class="queue-item-status-label">${this.getStatusLabel()}</span>
            ${this.item.itemType === 'backlog'
              ? html`<span class="queue-item-backlog-badge" title="Backlog">BL</span>`
              : this.item.gitStrategy
                ? html`
                    <span class="queue-item-git-strategy" title="${this.getGitStrategyLabel()}">
                      ${this.getGitStrategyIcon()}
                    </span>
                  `
                : ''}
          </div>
          ${this.renderProgress()}
        </div>
        ${canEdit
          ? html`
              <button
                class="queue-item-remove"
                @click=${this.handleRemove}
                title="Aus Queue entfernen"
                aria-label="Aus Queue entfernen"
              >
                ×
              </button>
            `
          : html`
              <button
                class="queue-item-remove disabled"
                disabled
                title="${protectedTooltip}"
                aria-label="${protectedTooltip}"
              >
                ×
              </button>
            `}
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-queue-item': AosQueueItem;
  }
}
