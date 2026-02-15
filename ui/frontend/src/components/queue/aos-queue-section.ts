import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { gateway } from '../../gateway.js';
import type { WebSocketMessage } from '../../gateway.js';
import './aos-queue-item.js';
import '../git-strategy-dialog.js';
import type { QueueItem, QueueItemProgress } from './aos-queue-item.js';
import type { GitStrategySelection } from '../git-strategy-dialog.js';

/**
 * aos-queue-section: Queue section for the bottom panel (split-view left side).
 * Displays queued specs with Start/Stop controls, drag-drop reordering,
 * and accepts spec drops from the Specs section (right side).
 *
 * Migrated from aos-queue-sidebar.ts with compact layout for bottom panel.
 */
@customElement('aos-queue-section')
export class AosQueueSection extends LitElement {
  @property({ type: Array }) queue: QueueItem[] = [];
  @property({ type: Boolean }) isQueueRunning = false;

  @state() private dropZoneActive = false;
  @state() private draggedItemId: string | null = null;
  @state() private dropTargetIndex: number | null = null;
  @state() private pendingQueueAdd: { specId: string; specName: string; projectPath?: string; projectName?: string; position?: number } | null = null;
  @state() private showGitStrategyDialog = false;
  @state() private queueProgress: Map<string, QueueItemProgress> = new Map();

  private boundMessageHandlers: Map<string, (msg: WebSocketMessage) => void> = new Map();

  override connectedCallback(): void {
    super.connectedCallback();
    this.setupMessageHandlers();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeMessageHandlers();
  }

  private setupMessageHandlers(): void {
    const handlers: [string, (msg: WebSocketMessage) => void][] = [
      ['workflow.story.start.ack', (msg) => this.handleStoryStart(msg)],
      ['specs.story.updateStatus.ack', (msg) => this.handleStoryStatusUpdate(msg)],
      ['specs.kanban', (msg) => this.handleKanbanUpdate(msg)]
    ];

    for (const [type, handler] of handlers) {
      this.boundMessageHandlers.set(type, handler);
      gateway.on(type, handler);
    }
  }

  private removeMessageHandlers(): void {
    for (const [type, handler] of this.boundMessageHandlers) {
      gateway.off(type, handler);
    }
    this.boundMessageHandlers.clear();
  }

  private handleStoryStart(msg: WebSocketMessage): void {
    const specId = msg.specId as string;
    const storyId = msg.storyId as string;
    if (!specId || !storyId) return;

    const queueItem = this.queue.find(item => item.specId === specId);
    if (!queueItem) return;

    const existing = this.queueProgress.get(specId);
    this.queueProgress.set(specId, {
      done: existing?.done || 0,
      total: existing?.total || 1,
      inProgressStoryId: storyId
    });
    this.requestUpdate();
  }

  private handleStoryStatusUpdate(msg: WebSocketMessage): void {
    const specId = msg.specId as string;
    const status = msg.status as string;
    if (!specId) return;

    const queueItem = this.queue.find(item => item.specId === specId);
    if (!queueItem) return;

    if (status === 'done') {
      const existing = this.queueProgress.get(specId);
      this.queueProgress.set(specId, {
        done: (existing?.done || 0) + 1,
        total: existing?.total || 1,
        inProgressStoryId: undefined
      });
      this.requestUpdate();
    }
  }

  private handleKanbanUpdate(msg: WebSocketMessage): void {
    const kanban = msg.kanban as { specId: string; stories: Array<{ id: string; status: string }> };
    if (!kanban?.specId) return;

    const doneCount = kanban.stories.filter(s => s.status === 'done').length;
    const inProgressStory = kanban.stories.find(s => s.status === 'in_progress');

    this.queueProgress.set(kanban.specId, {
      done: doneCount,
      total: kanban.stories.length,
      inProgressStoryId: inProgressStory?.id
    });
    this.requestUpdate();
  }

  private getProgress(specId: string): QueueItemProgress | undefined {
    return this.queueProgress.get(specId);
  }

  // --- Drag & Drop: Spec Drop Zone ---

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    this.dropZoneActive = true;
  }

  private handleDragLeave(e: DragEvent): void {
    const relatedTarget = e.relatedTarget as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;
    if (!currentTarget.contains(relatedTarget)) {
      this.dropZoneActive = false;
    }
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    this.dropZoneActive = false;

    const dragType = e.dataTransfer?.getData('text/drag-type');

    // Only accept spec drops on the outer container (not queue-item reorders)
    if (dragType === 'queue-item') return;

    const specId = e.dataTransfer?.getData('text/plain');
    const specName = e.dataTransfer?.getData('text/spec-name');
    const projectPath = e.dataTransfer?.getData('text/project-path');
    const projectName = e.dataTransfer?.getData('text/project-name');
    const itemType = e.dataTransfer?.getData('text/item-type') as 'backlog' | null;
    const existingGitStrategy = e.dataTransfer?.getData('text/git-strategy') as 'branch' | 'worktree' | 'current-branch' | null;

    if (!specId) return;

    // Backlog items: skip git strategy dialog, add directly
    if (itemType === 'backlog') {
      const existsInQueue = this.queue.some(item => item.specId === 'backlog' && item.projectPath === projectPath);
      if (existsInQueue) {
        this.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: { message: 'Backlog ist bereits in der Queue', type: 'warning' },
            bubbles: true,
            composed: true
          })
        );
        return;
      }
      this.dispatchEvent(
        new CustomEvent('queue-add', {
          detail: { specId: 'backlog', specName: 'Backlog', projectPath, projectName, itemType: 'backlog' },
          bubbles: true,
          composed: true
        })
      );
      return;
    }

    const existsInQueue = this.queue.some(item => item.specId === specId);
    if (existsInQueue) {
      this.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: { message: 'Spec ist bereits in der Queue', type: 'warning' },
          bubbles: true,
          composed: true
        })
      );
      return;
    }

    if (existingGitStrategy) {
      this.dispatchEvent(
        new CustomEvent('queue-add', {
          detail: {
            specId,
            specName: specName || specId,
            projectPath,
            projectName,
            gitStrategy: { strategy: existingGitStrategy }
          },
          bubbles: true,
          composed: true
        })
      );
      return;
    }

    this.pendingQueueAdd = { specId, specName: specName || specId, projectPath: projectPath || undefined, projectName: projectName || undefined };
    this.showGitStrategyDialog = true;
  }

  // --- Drag & Drop: Queue Item Reordering ---

  private handleItemDragStart(e: DragEvent, item: QueueItem): void {
    if (!e.dataTransfer) return;
    if (item.status !== 'pending') {
      e.preventDefault();
      return;
    }
    this.draggedItemId = item.id;
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.setData('text/drag-type', 'queue-item');
    e.dataTransfer.effectAllowed = 'move';
  }

  private handleItemDragEnd(): void {
    this.draggedItemId = null;
    this.dropTargetIndex = null;
  }

  private handleItemDragOver(e: DragEvent, index: number): void {
    e.preventDefault();
    const dragType = e.dataTransfer?.types.includes('text/drag-type');

    if (this.draggedItemId) {
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      this.dropTargetIndex = index;
    } else if (dragType) {
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      this.dropTargetIndex = index;
    }
  }

  private handleItemDragLeave(): void {
    this.dropTargetIndex = null;
  }

  private handleItemDrop(e: DragEvent, targetIndex: number): void {
    e.preventDefault();
    e.stopPropagation();

    const dragType = e.dataTransfer?.getData('text/drag-type');

    if (dragType === 'queue-item' && this.draggedItemId) {
      const sourceIndex = this.queue.findIndex(item => item.id === this.draggedItemId);
      if (sourceIndex !== -1 && sourceIndex !== targetIndex) {
        this.dispatchEvent(
          new CustomEvent('queue-reorder', {
            detail: { itemId: this.draggedItemId, fromIndex: sourceIndex, toIndex: targetIndex },
            bubbles: true,
            composed: true
          })
        );
      }
    } else if (dragType === 'spec') {
      const specId = e.dataTransfer?.getData('text/plain');
      const specName = e.dataTransfer?.getData('text/spec-name');
      const projectPath = e.dataTransfer?.getData('text/project-path');
      const projectName = e.dataTransfer?.getData('text/project-name');
      const itemType = e.dataTransfer?.getData('text/item-type') as 'backlog' | null;
      const existingGitStrategy = e.dataTransfer?.getData('text/git-strategy') as 'branch' | 'worktree' | 'current-branch' | null;

      if (specId) {
        // Backlog items: skip git strategy dialog
        if (itemType === 'backlog') {
          const existsInQueue = this.queue.some(item => item.specId === 'backlog' && item.projectPath === projectPath);
          if (existsInQueue) {
            this.dispatchEvent(
              new CustomEvent('show-toast', {
                detail: { message: 'Backlog ist bereits in der Queue', type: 'warning' },
                bubbles: true,
                composed: true
              })
            );
          } else {
            this.dispatchEvent(
              new CustomEvent('queue-add', {
                detail: { specId: 'backlog', specName: 'Backlog', projectPath, projectName, position: targetIndex, itemType: 'backlog' },
                bubbles: true,
                composed: true
              })
            );
          }
        } else {
          const existsInQueue = this.queue.some(item => item.specId === specId);
          if (existsInQueue) {
            this.dispatchEvent(
              new CustomEvent('show-toast', {
                detail: { message: 'Spec ist bereits in der Queue', type: 'warning' },
                bubbles: true,
                composed: true
              })
            );
          } else if (existingGitStrategy) {
            this.dispatchEvent(
              new CustomEvent('queue-add', {
                detail: {
                  specId,
                  specName: specName || specId,
                  projectPath,
                  projectName,
                  position: targetIndex,
                  gitStrategy: { strategy: existingGitStrategy }
                },
                bubbles: true,
                composed: true
              })
            );
          } else {
            this.pendingQueueAdd = {
              specId,
              specName: specName || specId,
              projectPath: projectPath || undefined,
              projectName: projectName || undefined,
              position: targetIndex
            };
            this.showGitStrategyDialog = true;
          }
        }
      }
    }

    this.draggedItemId = null;
    this.dropTargetIndex = null;
    this.dropZoneActive = false;
  }

  // --- Event Handlers ---

  private handleItemRemove(e: CustomEvent<{ itemId: string; specId: string }>): void {
    this.dispatchEvent(
      new CustomEvent('queue-remove', {
        detail: e.detail,
        bubbles: true,
        composed: true
      })
    );
  }

  private handleItemViewKanban(e: CustomEvent): void {
    this.dispatchEvent(
      new CustomEvent('queue-item-view-kanban', {
        detail: { specId: e.detail.specId as string },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleGitStrategySelect(e: CustomEvent<GitStrategySelection>): void {
    const { strategy, specId } = e.detail;
    this.dispatchEvent(
      new CustomEvent('queue-add', {
        detail: {
          specId: this.pendingQueueAdd?.specId || specId,
          specName: this.pendingQueueAdd?.specName || specId,
          projectPath: this.pendingQueueAdd?.projectPath,
          projectName: this.pendingQueueAdd?.projectName,
          position: this.pendingQueueAdd?.position,
          gitStrategy: strategy
        },
        bubbles: true,
        composed: true
      })
    );
    this.pendingQueueAdd = null;
    this.showGitStrategyDialog = false;
  }

  private handleGitStrategyCancel(): void {
    this.pendingQueueAdd = null;
    this.showGitStrategyDialog = false;
  }

  private handleQueueStart(): void {
    const hasPending = this.queue.some(item => item.status === 'pending');
    if (!hasPending) {
      this.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: { message: 'Queue ist leer - füge Specs hinzu', type: 'warning' },
          bubbles: true,
          composed: true
        })
      );
      return;
    }
    this.dispatchEvent(new CustomEvent('queue-start', { bubbles: true, composed: true }));
  }

  private handleQueueStop(): void {
    this.dispatchEvent(new CustomEvent('queue-stop', { bubbles: true, composed: true }));
  }

  // --- Keyboard Navigation ---

  private handleKeydown(e: KeyboardEvent): void {
    const items = this.querySelectorAll('.qs-item-wrapper');
    if (items.length === 0) return;

    const currentIndex = Array.from(items).findIndex(
      item => item === document.activeElement || item.contains(document.activeElement)
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      (items[nextIndex] as HTMLElement).focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      (items[prevIndex] as HTMLElement).focus();
    }
  }

  // --- Rendering ---

  private renderEmptyState() {
    return html`
      <div class="qs-empty-state">
        <span class="qs-empty-icon">📋</span>
        <p class="qs-empty-text">Specs hierher ziehen</p>
      </div>
    `;
  }

  private renderQueueControls() {
    const hasPending = this.queue.some(item => item.status === 'pending');
    const hasItems = this.queue.length > 0;
    if (!hasItems) return null;

    return html`
      <div class="qs-controls">
        ${this.isQueueRunning
          ? html`
              <button
                class="qs-control-btn qs-stop-btn"
                @click=${this.handleQueueStop}
                title="Queue stoppen"
                aria-label="Queue stoppen"
              >
                <span class="qs-btn-icon">⏹</span>
                <span class="qs-btn-text">Stoppen</span>
              </button>
            `
          : html`
              <button
                class="qs-control-btn qs-start-btn"
                @click=${this.handleQueueStart}
                ?disabled=${!hasPending}
                title="${hasPending ? 'Queue starten' : 'Keine ausstehenden Specs'}"
                aria-label="${hasPending ? 'Queue starten' : 'Keine ausstehenden Specs'}"
              >
                <span class="qs-btn-icon">▶</span>
                <span class="qs-btn-text">Starten</span>
              </button>
            `}
      </div>
    `;
  }

  private renderQueueItems() {
    return html`
      <div
        class="qs-items"
        role="list"
        aria-label="Queue Items"
        @keydown=${this.handleKeydown}
      >
        ${this.queue.map(
          (item, index) => html`
            <div
              class="qs-item-wrapper ${this.dropTargetIndex === index ? 'drop-target' : ''} ${this.draggedItemId === item.id ? 'dragging' : ''}"
              draggable="${item.status === 'pending' ? 'true' : 'false'}"
              role="listitem"
              tabindex="0"
              aria-label="${item.specName} - ${item.status === 'pending' ? 'Wartend' : item.status}"
              @dragstart=${(e: DragEvent) => this.handleItemDragStart(e, item)}
              @dragend=${this.handleItemDragEnd}
              @dragover=${(e: DragEvent) => this.handleItemDragOver(e, index)}
              @dragleave=${this.handleItemDragLeave}
              @drop=${(e: DragEvent) => this.handleItemDrop(e, index)}
            >
              <aos-queue-item
                .item=${{ ...item, progress: this.getProgress(item.specId) }}
                @queue-item-remove=${this.handleItemRemove}
                @queue-item-view-kanban=${this.handleItemViewKanban}
              ></aos-queue-item>
            </div>
          `
        )}
      </div>
    `;
  }

  override render() {
    const sectionClasses = `qs-section ${this.dropZoneActive ? 'qs-drop-active' : ''}`;

    return html`
      <div
        class="${sectionClasses}"
        @dragover=${this.handleDragOver}
        @dragleave=${this.handleDragLeave}
        @drop=${this.handleDrop}
      >
        <div class="qs-header">
          <div class="qs-header-left">
            <h3 class="qs-title">Queue</h3>
            <span class="qs-count">${this.queue.length}</span>
            ${this.isQueueRunning ? html`<span class="qs-running-indicator" aria-label="Queue läuft">●</span>` : null}
          </div>
          ${this.renderQueueControls()}
        </div>

        <div class="qs-content">
          ${this.queue.length === 0 ? this.renderEmptyState() : this.renderQueueItems()}
        </div>

        <aos-git-strategy-dialog
          .open=${this.showGitStrategyDialog}
          .specId=${this.pendingQueueAdd?.specId || ''}
          context="queue-add"
          @git-strategy-select=${this.handleGitStrategySelect}
          @git-strategy-cancel=${this.handleGitStrategyCancel}
        ></aos-git-strategy-dialog>
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-queue-section': AosQueueSection;
  }
}
