import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { recentlyOpenedService, type RecentlyOpenedEntry } from '../services/recently-opened.service.js';
import { projectStateService } from '../services/project-state.service.js';

/**
 * Event detail for project-selected event
 */
export interface ProjectSelectedDetail {
  path: string;
  name: string;
}

/**
 * Modal dialog for adding projects.
 * Shows recently opened projects and allows manual path input.
 *
 * @fires project-selected - Fired when a project is selected. Detail: { path: string, name: string }
 * @fires modal-close - Fired when the modal is closed without selection
 */
@customElement('aos-project-add-modal')
export class AosProjectAddModal extends LitElement {
  /**
   * Whether the modal is currently open
   */
  @property({ type: Boolean, reflect: true }) open = false;

  /**
   * List of paths that are already open (to prevent duplicates)
   */
  @property({ type: Array }) openProjectPaths: string[] = [];

  @state()
  private recentlyOpened: RecentlyOpenedEntry[] = [];

  @state()
  private errorMessage: string | null = null;

  @state()
  private pathInput = '';

  @state()
  private isValidating = false;

  private boundKeyHandler = this.handleKeyDown.bind(this);

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('keydown', this.boundKeyHandler);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.boundKeyHandler);
  }

  override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('open') && this.open) {
      this.loadRecentlyOpened();
      this.errorMessage = null;
      this.pathInput = '';
      this.isValidating = false;
      // Focus the path input field
      requestAnimationFrame(() => {
        const pathInput = this.querySelector('.project-add-modal__path-input') as HTMLInputElement;
        pathInput?.focus();
      });
    }
  }

  private loadRecentlyOpened(): void {
    this.recentlyOpened = recentlyOpenedService.getRecentlyOpened();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.open) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.closeModal();
    }

    // Focus trap
    if (e.key === 'Tab') {
      const focusableElements = this.querySelectorAll<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"])'
      );
      const focusable = Array.from(focusableElements);
      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  }

  private closeModal(): void {
    this.open = false;
    this.dispatchEvent(
      new CustomEvent('modal-close', {
        bubbles: true,
        composed: true
      })
    );
  }

  private handleOverlayClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) {
      this.closeModal();
    }
  }

  private isProjectAlreadyOpen(path: string): boolean {
    return this.openProjectPaths.includes(path);
  }

  private handleRecentProjectClick(entry: RecentlyOpenedEntry): void {
    if (this.isProjectAlreadyOpen(entry.path)) {
      this.errorMessage = 'Projekt ist bereits geöffnet';
      return;
    }

    this.selectProject(entry.path, entry.name);
  }

  private handleRemoveRecentProject(e: Event, entry: RecentlyOpenedEntry): void {
    e.stopPropagation(); // Prevent triggering the item click
    recentlyOpenedService.removeRecentlyOpened(entry.path);
    this.loadRecentlyOpened(); // Refresh the list
  }

  private selectProject(path: string, name: string): void {
    this.dispatchEvent(
      new CustomEvent<ProjectSelectedDetail>('project-selected', {
        detail: { path, name },
        bubbles: true,
        composed: true
      })
    );
    this.open = false;
  }

  private handlePathInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.pathInput = input.value;
    this.errorMessage = null;
  }

  private handlePathKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && this.pathInput.trim()) {
      e.preventDefault();
      this.handleOpenPath();
    }
  }

  private async handleOpenPath(): Promise<void> {
    const path = this.pathInput.trim();

    if (!path) {
      this.errorMessage = 'Bitte gib einen Pfad ein';
      return;
    }

    if (this.isProjectAlreadyOpen(path)) {
      this.errorMessage = 'Projekt ist bereits geöffnet';
      return;
    }

    this.isValidating = true;
    this.errorMessage = null;

    try {
      // Validate path with backend
      const isValid = await projectStateService.validateProject(path);

      if (!isValid) {
        this.errorMessage = 'Ungültiger Pfad: Ordner existiert nicht oder enthält kein agent-os/ Verzeichnis';
        return;
      }

      // Extract project name from path
      const name = path.split('/').filter(Boolean).pop() || path;

      this.selectProject(path, name);
    } catch (err) {
      console.error('Error validating path:', err);
      this.errorMessage = 'Fehler beim Validieren des Pfads';
    } finally {
      this.isValidating = false;
    }
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Heute';
    } else if (diffDays === 1) {
      return 'Gestern';
    } else if (diffDays < 7) {
      return `vor ${diffDays} Tagen`;
    } else {
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  }

  private renderRecentlyOpenedList() {
    if (this.recentlyOpened.length === 0) {
      return html`
        <div class="project-add-modal__empty">
          <span class="project-add-modal__empty-text">Keine kürzlich geöffneten Projekte</span>
        </div>
      `;
    }

    return html`
      <ul class="project-add-modal__list" role="listbox" aria-label="Kürzlich geöffnete Projekte">
        ${this.recentlyOpened.map((entry) => {
          const isAlreadyOpen = this.isProjectAlreadyOpen(entry.path);
          return html`
            <li
              class="project-add-modal__item ${isAlreadyOpen ? 'project-add-modal__item--disabled' : ''}"
              role="option"
              aria-selected="false"
              aria-disabled=${isAlreadyOpen}
              @click=${() => this.handleRecentProjectClick(entry)}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  this.handleRecentProjectClick(entry);
                }
              }}
              tabindex=${isAlreadyOpen ? '-1' : '0'}
            >
              <div class="project-add-modal__item-info">
                <span class="project-add-modal__item-name">${entry.name}</span>
                <span class="project-add-modal__item-path">${entry.path}</span>
              </div>
              <div class="project-add-modal__item-meta">
                ${isAlreadyOpen
                  ? html`<span class="project-add-modal__item-badge">Geöffnet</span>`
                  : html`<span class="project-add-modal__item-date">${this.formatDate(entry.lastOpened)}</span>`
                }
                <button
                  class="project-add-modal__item-remove"
                  @click=${(e: Event) => this.handleRemoveRecentProject(e, entry)}
                  aria-label="Aus Liste entfernen"
                  title="Aus Liste entfernen"
                >
                  ×
                </button>
              </div>
            </li>
          `;
        })}
      </ul>
    `;
  }

  override render() {
    if (!this.open) {
      return nothing;
    }

    return html`
      <div
        class="project-add-modal__overlay"
        @click=${this.handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-add-modal-title"
      >
        <div class="project-add-modal">
          <header class="project-add-modal__header">
            <h2 id="project-add-modal-title" class="project-add-modal__title">Projekt hinzufügen</h2>
            <button
              class="project-add-modal__close"
              @click=${this.closeModal}
              aria-label="Dialog schließen"
            >
              ×
            </button>
          </header>

          <div class="project-add-modal__content">
            <section class="project-add-modal__section">
              <h3 class="project-add-modal__section-title">Kürzlich geöffnet</h3>
              ${this.renderRecentlyOpenedList()}
            </section>

            ${this.errorMessage
              ? html`
                  <div class="project-add-modal__error" role="alert">
                    ${this.errorMessage}
                  </div>
                `
              : nothing
            }
          </div>

          <footer class="project-add-modal__footer">
            <div class="project-add-modal__path-group">
              <input
                type="text"
                class="project-add-modal__path-input"
                placeholder="/pfad/zum/projekt"
                .value=${this.pathInput}
                @input=${this.handlePathInput}
                @keydown=${this.handlePathKeyDown}
                ?disabled=${this.isValidating}
              />
              <button
                class="project-add-modal__open-button"
                @click=${this.handleOpenPath}
                ?disabled=${this.isValidating || !this.pathInput.trim()}
              >
                ${this.isValidating ? 'Prüfe...' : 'Öffnen'}
              </button>
            </div>
          </footer>
        </div>
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-project-add-modal': AosProjectAddModal;
  }
}
