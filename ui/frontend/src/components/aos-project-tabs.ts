import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

export interface ProjectTab {
  id: string;
  name: string;
  path: string;
}

/**
 * Project tabs component for multi-project navigation.
 * Displays open projects as tabs below the header with active state,
 * close buttons, and a plus icon to add new projects.
 *
 * @fires tab-select - Fired when a tab is clicked. Detail: { projectId: string }
 * @fires tab-close - Fired when close button is clicked. Detail: { projectId: string }
 * @fires add-project - Fired when plus icon is clicked
 */
@customElement('aos-project-tabs')
export class AosProjectTabs extends LitElement {
  @property({ type: Array }) projects: ProjectTab[] = [];
  @property({ type: String }) activeProjectId: string | null = null;

  private handleTabSelect(projectId: string): void {
    this.dispatchEvent(
      new CustomEvent('tab-select', {
        detail: { projectId },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleTabClose(e: Event, projectId: string): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('tab-close', {
        detail: { projectId },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleAddClick(): void {
    this.dispatchEvent(
      new CustomEvent('add-project', {
        bubbles: true,
        composed: true
      })
    );
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const tabs = this.querySelectorAll('.project-tab');
    const currentIndex = Array.from(tabs).findIndex(tab => tab === document.activeElement);

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (currentIndex > 0) {
          (tabs[currentIndex - 1] as HTMLElement).focus();
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (currentIndex < tabs.length - 1) {
          (tabs[currentIndex + 1] as HTMLElement).focus();
        }
        break;
      case 'Home':
        e.preventDefault();
        (tabs[0] as HTMLElement)?.focus();
        break;
      case 'End':
        e.preventDefault();
        (tabs[tabs.length - 1] as HTMLElement)?.focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (document.activeElement?.classList.contains('project-tab')) {
          const projectId = (document.activeElement as HTMLElement).dataset.projectId;
          if (projectId) this.handleTabSelect(projectId);
        }
        break;
    }
  }

  private renderEmptyState() {
    return html`
      <div class="project-tabs__empty">
        <span class="project-tabs__empty-text">Kein Projekt geöffnet</span>
        <button
          class="project-tabs__empty-button"
          @click=${this.handleAddClick}
          aria-label="Projekt öffnen"
        >
          Projekt öffnen
        </button>
      </div>
    `;
  }

  private renderTab(project: ProjectTab) {
    const isActive = project.id === this.activeProjectId;
    return html`
      <div
        class="project-tab ${isActive ? 'project-tab--active' : ''}"
        @click=${() => this.handleTabSelect(project.id)}
        @keydown=${this.handleKeyDown}
        role="tab"
        aria-selected=${isActive}
        aria-label="${project.name}"
        tabindex=${isActive ? '0' : '-1'}
        data-project-id=${project.id}
        title="${project.path}"
      >
        <span class="project-tab__name">${project.name}</span>
        <button
          class="project-tab__close"
          @click=${(e: Event) => this.handleTabClose(e, project.id)}
          title="Tab schließen"
          aria-label="${project.name} schließen"
        >
          ×
        </button>
      </div>
    `;
  }

  override render() {
    const hasProjects = this.projects.length > 0;

    if (!hasProjects) {
      return html`
        <div class="project-tabs" role="tablist" aria-label="Geöffnete Projekte">
          ${this.renderEmptyState()}
        </div>
      `;
    }

    return html`
      <div class="project-tabs" role="tablist" aria-label="Geöffnete Projekte">
        <div class="project-tabs__container">
          ${repeat(
            this.projects,
            (project) => project.id,
            (project) => this.renderTab(project)
          )}
        </div>
        <button
          class="project-tabs__add"
          @click=${this.handleAddClick}
          title="Projekt hinzufügen"
          aria-label="Projekt hinzufügen"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/></svg>
        </button>
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-project-tabs': AosProjectTabs;
  }
}
