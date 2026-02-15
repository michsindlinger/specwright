import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { gateway } from '../../gateway.js';
import type { WebSocketMessage } from '../../gateway.js';
import { projectContext } from '../../context/project-context.js';
import type { ProjectContextValue } from '../../context/project-context.js';
import '../git-strategy-dialog.js';
import type { GitStrategySelection } from '../git-strategy-dialog.js';

interface SpecInfo {
  id: string;
  name: string;
  createdDate: string;
  storyCount: number;
  completedCount: number;
  inProgressCount: number;
  hasKanban: boolean;
  gitStrategy: 'branch' | 'worktree' | 'current-branch' | null;
  projectPath?: string;
  projectName?: string;
}

interface BacklogSummary {
  itemCount: number;
  openCount: number;
  completedCount: number;
  inProgressCount: number;
}

interface ProjectSpecs {
  projectPath: string;
  projectName: string;
  specs: SpecInfo[];
  backlog?: BacklogSummary;
}

/**
 * aos-specs-section: Specs section for the bottom panel (split-view right side).
 * Displays all specs from all open projects, grouped by project.
 * Supports drag-to-queue and [+Q] button for adding specs to the queue.
 *
 * Uses Light DOM (inherits global styles from theme.css).
 */
@customElement('aos-specs-section')
export class AosSpecsSection extends LitElement {
  @consume({ context: projectContext, subscribe: true })
  private projectCtx!: ProjectContextValue;

  @state() private projects: ProjectSpecs[] = [];
  @state() private collapsedProjects: Set<string> = new Set();
  @state() private loading = false;
  @state() private showCompleted = false;
  @state() private pendingQueueAdd: { specId: string; specName: string; projectPath?: string; projectName?: string } | null = null;
  @state() private showGitStrategyDialog = false;

  private boundMessageHandlers: Map<string, (msg: WebSocketMessage) => void> = new Map();
  private lastOpenProjectPaths = '';

  override connectedCallback(): void {
    super.connectedCallback();
    this.setupMessageHandlers();
    this.fetchSpecs();
  }

  override updated(changed: Map<string, unknown>): void {
    // Re-fetch specs when open projects change (project added or closed)
    if (changed.has('projectCtx')) {
      const currentPaths = (this.projectCtx?.openProjects ?? [])
        .map(p => p.path).sort().join(',');
      if (currentPaths !== this.lastOpenProjectPaths) {
        this.lastOpenProjectPaths = currentPaths;
        this.fetchSpecs();
      }
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeMessageHandlers();
  }

  private setupMessageHandlers(): void {
    const handlers: [string, (msg: WebSocketMessage) => void][] = [
      ['specs.list-all', (msg) => this.handleSpecsListAll(msg)],
      ['gateway.connected', () => this.fetchSpecs()],
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

  private fetchSpecs(): void {
    this.loading = true;
    const openProjects = this.projectCtx?.openProjects ?? [];
    gateway.send({
      type: 'specs.list-all',
      projects: openProjects.map(p => ({ path: p.path, name: p.name })),
    });
  }

  private handleSpecsListAll(msg: WebSocketMessage): void {
    const projects = msg.projects as ProjectSpecs[] | undefined;
    this.projects = projects || [];
    this.loading = false;
  }

  // --- Project Collapsing ---

  private toggleProject(projectPath: string): void {
    const updated = new Set(this.collapsedProjects);
    if (updated.has(projectPath)) {
      updated.delete(projectPath);
    } else {
      updated.add(projectPath);
    }
    this.collapsedProjects = updated;
  }

  // --- Drag & Drop ---

  private handleDragStart(e: DragEvent, spec: SpecInfo): void {
    if (!e.dataTransfer) return;
    e.dataTransfer.setData('text/plain', spec.id);
    e.dataTransfer.setData('text/spec-name', spec.name);
    e.dataTransfer.setData('text/drag-type', 'spec');
    e.dataTransfer.setData('text/project-path', spec.projectPath || '');
    e.dataTransfer.setData('text/project-name', spec.projectName || '');
    if (spec.gitStrategy) {
      e.dataTransfer.setData('text/git-strategy', spec.gitStrategy);
    }
    e.dataTransfer.effectAllowed = 'copy';

    // Custom drag ghost
    const ghost = document.createElement('div');
    ghost.className = 'ss-drag-ghost';
    ghost.textContent = `${spec.name} (${spec.projectName || 'Projekt'})`;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    requestAnimationFrame(() => ghost.remove());
  }

  // --- Backlog Queue Add ---

  private handleBacklogAddToQueue(project: ProjectSpecs): void {
    this.dispatchEvent(
      new CustomEvent('queue-add', {
        detail: {
          specId: 'backlog',
          specName: 'Backlog',
          projectPath: project.projectPath,
          projectName: project.projectName,
          itemType: 'backlog',
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleBacklogDragStart(e: DragEvent, project: ProjectSpecs): void {
    if (!e.dataTransfer) return;
    e.dataTransfer.setData('text/plain', 'backlog');
    e.dataTransfer.setData('text/spec-name', 'Backlog');
    e.dataTransfer.setData('text/drag-type', 'spec');
    e.dataTransfer.setData('text/item-type', 'backlog');
    e.dataTransfer.setData('text/project-path', project.projectPath);
    e.dataTransfer.setData('text/project-name', project.projectName);
    e.dataTransfer.effectAllowed = 'copy';

    const ghost = document.createElement('div');
    ghost.className = 'ss-drag-ghost';
    ghost.textContent = `Backlog (${project.projectName})`;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    requestAnimationFrame(() => ghost.remove());
  }

  // --- Queue Add ---

  private handleAddToQueue(spec: SpecInfo): void {
    if (spec.gitStrategy) {
      this.dispatchEvent(
        new CustomEvent('queue-add', {
          detail: {
            specId: spec.id,
            specName: spec.name,
            projectPath: spec.projectPath,
            projectName: spec.projectName,
            gitStrategy: { strategy: spec.gitStrategy },
          },
          bubbles: true,
          composed: true,
        })
      );
    } else {
      this.pendingQueueAdd = {
        specId: spec.id,
        specName: spec.name,
        projectPath: spec.projectPath,
        projectName: spec.projectName,
      };
      this.showGitStrategyDialog = true;
    }
  }

  private handleGitStrategySelect(e: CustomEvent<GitStrategySelection>): void {
    const { strategy } = e.detail;
    if (this.pendingQueueAdd) {
      this.dispatchEvent(
        new CustomEvent('queue-add', {
          detail: {
            specId: this.pendingQueueAdd.specId,
            specName: this.pendingQueueAdd.specName,
            projectPath: this.pendingQueueAdd.projectPath,
            projectName: this.pendingQueueAdd.projectName,
            gitStrategy: strategy,
          },
          bubbles: true,
          composed: true,
        })
      );
    }
    this.pendingQueueAdd = null;
    this.showGitStrategyDialog = false;
  }

  private handleGitStrategyCancel(): void {
    this.pendingQueueAdd = null;
    this.showGitStrategyDialog = false;
  }

  // --- Keyboard Navigation ---

  private handleKeydown(e: KeyboardEvent): void {
    const cards = this.querySelectorAll('.ss-spec-card');
    if (cards.length === 0) return;

    const currentIndex = Array.from(cards).findIndex(
      (card) => card === document.activeElement || card.contains(document.activeElement)
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < cards.length - 1 ? currentIndex + 1 : 0;
      (cards[nextIndex] as HTMLElement).focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : cards.length - 1;
      (cards[prevIndex] as HTMLElement).focus();
    } else if (e.key === 'Enter' && currentIndex >= 0) {
      e.preventDefault();
      const btn = (cards[currentIndex] as HTMLElement).querySelector('.ss-add-btn') as HTMLElement;
      btn?.click();
    }
  }

  // --- Status Helpers ---

  private isSpecCompleted(spec: SpecInfo): boolean {
    return spec.completedCount === spec.storyCount && spec.storyCount > 0;
  }

  private getStatusLabel(spec: SpecInfo): string {
    if (this.isSpecCompleted(spec)) return 'done';
    if (spec.inProgressCount > 0) return 'running';
    if (spec.hasKanban) return 'ready';
    return 'new';
  }

  private getStatusClass(status: string): string {
    switch (status) {
      case 'done': return 'ss-status-done';
      case 'running': return 'ss-status-running';
      case 'ready': return 'ss-status-ready';
      default: return 'ss-status-new';
    }
  }

  // --- Rendering ---

  private renderLoading() {
    return html`
      <div class="ss-loading">
        <span class="ss-loading-text">Specs laden...</span>
      </div>
    `;
  }

  private renderEmptyState() {
    return html`
      <div class="ss-empty-state">
        <span class="ss-empty-icon">📄</span>
        <p class="ss-empty-text">Keine Specs gefunden</p>
      </div>
    `;
  }

  private renderBacklogCard(project: ProjectSpecs) {
    if (!project.backlog || project.backlog.openCount === 0) return null;

    const { openCount, inProgressCount, completedCount, itemCount } = project.backlog;

    return html`
      <div
        class="ss-spec-card ss-backlog-card"
        draggable="true"
        tabindex="0"
        role="listitem"
        aria-label="Backlog - ${openCount} offene Items"
        @dragstart=${(e: DragEvent) => this.handleBacklogDragStart(e, project)}
      >
        <div class="ss-card-main">
          <span class="ss-spec-name">Backlog</span>
          <div class="ss-card-badges">
            <span class="ss-status-badge ${inProgressCount > 0 ? 'ss-status-running' : 'ss-status-ready'}">${inProgressCount > 0 ? 'running' : 'ready'}</span>
            <span class="ss-progress">${completedCount}/${itemCount}</span>
            <span class="ss-backlog-badge">BL</span>
          </div>
        </div>
        <button
          class="ss-add-btn"
          @click=${() => this.handleBacklogAddToQueue(project)}
          title="Backlog zur Queue hinzufuegen"
          aria-label="Backlog zur Queue hinzufuegen"
        >+Q</button>
      </div>
    `;
  }

  private renderSpecCard(spec: SpecInfo) {
    const status = this.getStatusLabel(spec);
    const statusClass = this.getStatusClass(status);

    return html`
      <div
        class="ss-spec-card"
        draggable="true"
        tabindex="0"
        role="listitem"
        aria-label="${spec.name} - ${status} - ${spec.completedCount}/${spec.storyCount} Stories"
        @dragstart=${(e: DragEvent) => this.handleDragStart(e, spec)}
      >
        <div class="ss-card-main">
          <span class="ss-spec-name" title="${spec.id}">${spec.name}</span>
          <div class="ss-card-badges">
            <span class="ss-status-badge ${statusClass}">${status}</span>
            <span class="ss-progress">${spec.completedCount}/${spec.storyCount}</span>
            ${spec.gitStrategy
              ? html`<span class="ss-git-badge" title="Git: ${spec.gitStrategy}">${spec.gitStrategy === 'worktree' ? 'WT' : 'BR'}</span>`
              : ''}
          </div>
        </div>
        <button
          class="ss-add-btn"
          @click=${() => this.handleAddToQueue(spec)}
          title="Zur Queue hinzufuegen"
          aria-label="${spec.name} zur Queue hinzufuegen"
        >+Q</button>
      </div>
    `;
  }

  private renderProjectGroup(project: ProjectSpecs) {
    const isCollapsed = this.collapsedProjects.has(project.projectPath);
    const activeSpecs = project.specs.filter(s => !this.isSpecCompleted(s));
    const completedSpecs = project.specs.filter(s => this.isSpecCompleted(s));
    const activeCount = activeSpecs.length;

    return html`
      <div class="ss-project-group">
        <button
          class="ss-project-header"
          @click=${() => this.toggleProject(project.projectPath)}
          aria-expanded="${!isCollapsed}"
          aria-label="${project.projectName} - ${activeCount} aktive Specs"
        >
          <span class="ss-collapse-icon">${isCollapsed ? '▸' : '▾'}</span>
          <span class="ss-project-name">${project.projectName}</span>
          <span class="ss-spec-count">${activeCount}</span>
        </button>
        ${!isCollapsed
          ? html`
              <div class="ss-project-specs" role="list" aria-label="${project.projectName} Specs">
                ${this.renderBacklogCard(project)}
                ${activeSpecs.map((spec) => this.renderSpecCard(spec))}
                ${this.showCompleted && completedSpecs.length > 0
                  ? completedSpecs.map((spec) => this.renderSpecCard(spec))
                  : ''}
              </div>
            `
          : ''}
      </div>
    `;
  }

  override render() {
    const totalActive = this.projects.reduce(
      (sum, p) => sum + p.specs.filter(s => !this.isSpecCompleted(s)).length, 0);
    const totalCompleted = this.projects.reduce(
      (sum, p) => sum + p.specs.filter(s => this.isSpecCompleted(s)).length, 0);

    return html`
      <div class="ss-section" @keydown=${this.handleKeydown}>
        <div class="ss-header">
          <div class="ss-header-left">
            <h3 class="ss-title">Specs</h3>
            <span class="ss-count">${totalActive}</span>
          </div>
          <div class="ss-header-actions">
            ${totalCompleted > 0 ? html`
              <button
                class="ss-toggle-completed-btn ${this.showCompleted ? 'active' : ''}"
                @click=${() => { this.showCompleted = !this.showCompleted; }}
                title="${this.showCompleted ? 'Abgeschlossene ausblenden' : `${totalCompleted} abgeschlossene einblenden`}"
                aria-label="${this.showCompleted ? 'Abgeschlossene ausblenden' : `${totalCompleted} abgeschlossene einblenden`}"
                aria-pressed="${this.showCompleted}"
              >${totalCompleted} done</button>
            ` : ''}
            <button
              class="ss-refresh-btn"
              @click=${() => this.fetchSpecs()}
              title="Specs neu laden"
              aria-label="Specs neu laden"
            >↻</button>
          </div>
        </div>

        <div class="ss-content">
          ${this.loading
            ? this.renderLoading()
            : this.projects.length === 0 || (totalActive === 0 && !this.showCompleted)
              ? this.renderEmptyState()
              : this.projects
                  .filter(p => this.showCompleted || p.specs.some(s => !this.isSpecCompleted(s)))
                  .map((project) => this.renderProjectGroup(project))}
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
    'aos-specs-section': AosSpecsSection;
  }
}
