import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { gateway, WebSocketMessage } from '../gateway.js';

interface Project {
  name: string;
  path: string;
  exists: boolean;
  error?: string;
}

@customElement('aos-project-selector')
export class AosProjectSelector extends LitElement {
  @state()
  private projects: Project[] = [];

  @state()
  private currentProject: { name: string; path: string } | null = null;

  @state()
  private isOpen = false;

  @state()
  private isLoading = true;

  @state()
  private error: string | null = null;

  // Note: Styles are in theme.css (Light DOM mode - static styles don't apply)

  override connectedCallback(): void {
    super.connectedCallback();
    this.setupGatewayHandlers();
    gateway.connect();
    this.requestProjectList();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleOutsideClick);
  }

  private setupGatewayHandlers(): void {
    gateway.on('project.list', this.handleProjectList.bind(this));
    gateway.on('project.current', this.handleProjectCurrent.bind(this));
    gateway.on('project.selected', this.handleProjectSelected.bind(this));
    gateway.on('project.error', this.handleProjectError.bind(this));
    gateway.on('gateway.connected', () => {
      this.requestProjectList();
    });
  }

  private requestProjectList(): void {
    this.isLoading = true;
    gateway.send({ type: 'project.list' });
    gateway.send({ type: 'project.current' });
  }

  private handleProjectList(message: WebSocketMessage): void {
    this.projects = message.projects as Project[];
    this.isLoading = false;
  }

  private handleProjectCurrent(message: WebSocketMessage): void {
    this.currentProject = message.project as { name: string; path: string } | null;
    this.isLoading = false;
  }

  private handleProjectSelected(message: WebSocketMessage): void {
    this.currentProject = message.project as { name: string; path: string };
    this.error = null;
    this.isOpen = false;
  }

  private handleProjectError(message: WebSocketMessage): void {
    this.error = message.error as string;
  }

  private handleOutsideClick = (event: MouseEvent): void => {
    if (!this.contains(event.target as Node)) {
      this.isOpen = false;
      document.removeEventListener('click', this.handleOutsideClick);
    }
  };

  private toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      document.addEventListener('click', this.handleOutsideClick);
    } else {
      document.removeEventListener('click', this.handleOutsideClick);
    }
  }

  private selectProject(project: Project): void {
    if (!project.exists) {
      this.error = `Project path not found: ${project.path}`;
      return;
    }
    gateway.send({ type: 'project.select', name: project.name });
  }

  override render() {
    if (this.isLoading) {
      return html`
        <button class="selector-button" disabled>
          <div class="project-info">
            <div class="project-name">Loading...</div>
          </div>
        </button>
      `;
    }

    if (this.projects.length === 0) {
      return html`
        <button class="selector-button" disabled>
          <div class="project-info">
            <div class="project-name">No projects configured</div>
            <div class="project-path">Add a project in config.json</div>
          </div>
        </button>
      `;
    }

    return html`
      <button
        class="selector-button"
        @click=${this.toggleDropdown}
        aria-expanded=${this.isOpen}
        aria-haspopup="listbox"
      >
        <div class="project-info">
          <div class="project-name">${this.currentProject?.name ?? 'Select Project'}</div>
          <div class="project-path">${this.currentProject?.path ?? ''}</div>
        </div>
        <span class="chevron ${this.isOpen ? 'open' : ''}">▼</span>
      </button>

      ${this.isOpen
        ? html`
            <div class="dropdown" role="listbox">
              ${this.error
                ? html`<div class="error-message">${this.error}</div>`
                : ''}
              ${this.projects.map(
                (project) => html`
                  <div
                    class="dropdown-item ${this.currentProject?.name === project.name
                      ? 'selected'
                      : ''} ${!project.exists ? 'invalid' : ''}"
                    role="option"
                    aria-selected=${this.currentProject?.name === project.name}
                    @click=${() => this.selectProject(project)}
                  >
                    <span
                      class="status-indicator ${project.exists ? 'valid' : 'invalid'}"
                    ></span>
                    <div class="project-info">
                      <div class="project-name">${project.name}</div>
                      <div class="project-path">${project.path}</div>
                    </div>
                  </div>
                `
              )}
            </div>
          `
        : ''}
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-project-selector': AosProjectSelector;
  }
}
