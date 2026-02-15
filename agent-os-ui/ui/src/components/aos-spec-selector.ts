import { LitElement, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { gateway, type WebSocketMessage } from '../gateway.js';
import type { SpecInfo } from './spec-card.js';

// Re-export SpecInfo for convenience
export type { SpecInfo };

export interface SpecSelectedEventDetail {
  spec: SpecInfo;
}

export interface SpecDeletedEventDetail {
  specId: string;
}

/**
 * Spec Selector Component
 * Displays a list of available specs with search functionality.
 *
 * @fires spec-selected - Fired when a spec is selected. Detail: { spec: SpecInfo }
 * @fires spec-deleted - Fired when a spec is deleted. Detail: { specId: string }
 *
 * Usage:
 * ```ts
 * const selector = document.querySelector<AosSpecSelector>('aos-spec-selector');
 * selector?.open = true;
 * selector?.onSpecSelected = (spec) => console.log('Selected:', spec);
 * ```
 */
@customElement('aos-spec-selector')
export class AosSpecSelector extends LitElement {
  @state() private open = false;
  @state() private specs: SpecInfo[] = [];
  @state() private isLoading = false;
  @state() private searchTerm = '';
  @state() private deletingSpecId: string | null = null;

  private boundKeyDownHandler = this.handleKeyDown.bind(this);
  private boundClickOutsideHandler = this.handleClickOutside.bind(this);
  private boundSpecsListHandler = this.onSpecsList.bind(this);
  private boundSpecDeleteHandler = this.onSpecDelete.bind(this);

  connectedCallback(): void {
    super.connectedCallback();
    gateway.on('specs.list', this.boundSpecsListHandler);
    gateway.on('specs.delete', this.boundSpecDeleteHandler);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    gateway.off('specs.list', this.boundSpecsListHandler);
    gateway.off('specs.delete', this.boundSpecDeleteHandler);
    this.removeGlobalListeners();
  }

  /**
   * Open the spec selector modal
   */
  show(): void {
    this.open = true;
    this.loadSpecs();
    this.addGlobalListeners();
    // Focus search input after render
    this.updateComplete.then(() => {
      const input = this.shadowRoot?.querySelector('input') as HTMLInputElement;
      input?.focus();
    });
  }

  /**
   * Close the spec selector modal
   */
  hide(): void {
    this.open = false;
    this.searchTerm = '';
    this.removeGlobalListeners();
  }

  private addGlobalListeners(): void {
    document.addEventListener('keydown', this.boundKeyDownHandler);
    document.addEventListener('click', this.boundClickOutsideHandler);
  }

  private removeGlobalListeners(): void {
    document.removeEventListener('keydown', this.boundKeyDownHandler);
    document.removeEventListener('click', this.boundClickOutsideHandler);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.hide();
    } else if (e.key === 'Enter') {
      const firstVisible = this.filteredSpecs[0];
      if (firstVisible) {
        this.selectSpec(firstVisible);
      }
    }
  }

  private handleClickOutside(e: MouseEvent): void {
    const target = e.target as Node;
    if (!this.contains(target)) {
      this.hide();
    }
  }

  private loadSpecs(): void {
    this.isLoading = true;
    gateway.send({ type: 'specs.list' });
  }

  private onSpecsList(msg: WebSocketMessage): void {
    this.specs = (msg.specs as SpecInfo[]) || [];
    this.isLoading = false;
  }

  private onSpecDelete(msg: WebSocketMessage): void {
    if (msg.success) {
      const specId = msg.specId as string;
      this.specs = this.specs.filter((spec) => spec.id !== specId);
      this.deletingSpecId = null;

      this.dispatchEvent(
        new CustomEvent('spec-deleted', {
          detail: { specId } as SpecDeletedEventDetail,
          bubbles: true,
          composed: true
        })
      );
    } else {
      this.deletingSpecId = null;
      // Could show error message here
      console.error('Failed to delete spec:', msg.error);
    }
  }

  private handleSearchInput(e: InputEvent): void {
    const target = e.target as HTMLInputElement;
    this.searchTerm = target.value;
  }

  private get filteredSpecs(): SpecInfo[] {
    if (!this.searchTerm) {
      return this.specs;
    }
    const term = this.searchTerm.toLowerCase();
    return this.specs.filter(
      (spec) =>
        spec.name.toLowerCase().includes(term) || spec.id.toLowerCase().includes(term)
    );
  }

  private selectSpec(spec: SpecInfo): void {
    this.hide();

    this.dispatchEvent(
      new CustomEvent('spec-selected', {
        detail: { spec } as SpecSelectedEventDetail,
        bubbles: true,
        composed: true
      })
    );
  }

  private startDeleteSpec(spec: SpecInfo, e: Event): void {
    e.stopPropagation();
    this.deletingSpecId = spec.id;
  }

  private cancelDelete(): void {
    this.deletingSpecId = null;
  }

  private confirmDelete(): void {
    if (this.deletingSpecId) {
      gateway.send({
        type: 'specs.delete',
        specId: this.deletingSpecId,
        timestamp: new Date().toISOString()
      });
    }
  }

  private getProgressPercentage(spec: SpecInfo): number {
    if (spec.storyCount === 0) return 0;
    return Math.round((spec.completedCount / spec.storyCount) * 100);
  }

  override render() {
    if (!this.open) {
      return nothing;
    }

    return html`
      <div class="spec-selector-overlay" @click=${(e: Event) => e.stopPropagation()}>
        <div class="spec-selector" @click=${(e: Event) => e.stopPropagation()}>
          <div class="spec-selector__header">
            <h2 class="spec-selector__title">Spec auswählen</h2>
            <button class="spec-selector__close-btn" @click=${() => this.hide()} aria-label="Schließen">
              ✕
            </button>
          </div>

          <div class="spec-selector__search">
            <input
              type="text"
              class="spec-selector__search-input"
              placeholder="Spec suchen..."
              .value=${this.searchTerm}
              @input=${this.handleSearchInput}
              aria-label="Spec-Suche"
            />
          </div>

          <div class="spec-selector__content">
            ${this.isLoading
              ? html`
                  <div class="spec-selector__loading">
                    <span class="spec-selector__spinner"></span>
                    <span>Specs werden geladen...</span>
                  </div>
                `
              : this.specs.length === 0
                ? html`
                    <div class="spec-selector__empty">
                      <p class="spec-selector__empty-text">Keine Specs vorhanden</p>
                      <p class="spec-selector__empty-hint">
                        Erstelle zuerst eine Spec über das Kontextmenü
                      </p>
                    </div>
                  `
                : this.filteredSpecs.length === 0
                  ? html`
                      <div class="spec-selector__empty">
                        <p class="spec-selector__empty-text">Keine Specs gefunden</p>
                        <p class="spec-selector__empty-hint">
                          Versuche einen anderen Suchbegriff
                        </p>
                      </div>
                    `
                  : html`
                      <div class="spec-selector__list">
                        ${this.filteredSpecs.map(
                          (spec) => html`
                            <div
                              class="spec-selector__item"
                              @click=${() => this.selectSpec(spec)}
                              role="button"
                              tabindex="0"
                              @keydown=${(e: KeyboardEvent) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  this.selectSpec(spec);
                                }
                              }}
                            >
                              <div class="spec-selector__item-main">
                                <span class="spec-selector__item-name">${spec.name}</span>
                                <span class="spec-selector__item-id">${spec.id}</span>
                              </div>
                              <div class="spec-selector__item-meta">
                                <span class="spec-selector__item-progress">
                                  ${this.getProgressPercentage(spec)}%
                                </span>
                                <span class="spec-selector__item-stories">
                                  ${spec.completedCount}/${spec.storyCount} Stories
                                </span>
                              </div>
                              <button
                                class="spec-selector__delete-btn"
                                @click=${(e: Event) => this.startDeleteSpec(spec, e)}
                                aria-label="Spec löschen"
                                title="Spec löschen"
                              >
                                🗑
                              </button>
                            </div>
                          `
                        )}
                      </div>
                    `}
          </div>

          <aos-confirm-dialog
            ?open=${this.deletingSpecId !== null}
            title="Spec löschen"
            message="Möchtest du diese Spezifikation wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
            confirmText="Löschen"
            @confirm=${this.confirmDelete}
            @cancel=${this.cancelDelete}
          ></aos-confirm-dialog>
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
    'aos-spec-selector': AosSpecSelector;
  }
}
