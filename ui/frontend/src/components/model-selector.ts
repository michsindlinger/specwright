import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { gateway, WebSocketMessage } from '../gateway.js';

export interface ModelSelectorModel {
  id: string;
  name: string;
  providerId: string;
}

export interface ModelSelectorProvider {
  id: string;
  name: string;
  models: ModelSelectorModel[];
}

@customElement('aos-model-selector')
export class AosModelSelector extends LitElement {
  /** External providers – when set, gateway fetch is skipped (embedded mode) */
  @property({ type: Array }) externalProviders: ModelSelectorProvider[] = [];

  /** Pre-select a model by ID (embedded mode) */
  @property({ type: String }) externalSelectedModelId = '';

  /** Disable the selector */
  @property({ type: Boolean }) disabled = false;

  /** When true, selecting a model also updates the global backend setting */
  @property({ type: Boolean }) syncGlobal = false;

  @state()
  private providers: ModelSelectorProvider[] = [];

  @state()
  private selectedModel: ModelSelectorModel | null = null;

  @state()
  private isOpen = false;

  @state()
  private isLoading = false;

  // Store bound handlers for cleanup
  private boundHandleModelSelected = this.handleModelSelected.bind(this);
  private boundHandleModelList = this.handleModelList.bind(this);
  private boundHandleGatewayConnected = this.handleGatewayConnected.bind(this);

  private get isEmbedded(): boolean {
    return this.externalProviders.length > 0;
  }

  static override styles = css`
    :host {
      display: inline-block;
      position: relative;
      font-family: var(--font-family, sans-serif);
      user-select: none;
    }

    .model-selector-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.75rem;
      background-color: var(--bg-color-tertiary, #2d2d2d);
      border: 1px solid var(--border-color, #404040);
      border-radius: 4px;
      color: var(--text-color, #e5e5e5);
      cursor: pointer;
      font-size: 0.85rem;
      min-width: 140px;
      transition: all 0.2s;
    }

    .model-selector-button:hover:not(:disabled) {
      background-color: var(--bg-color-hover, #3d3d3d);
      border-color: var(--primary-color, #3b82f6);
    }

    .model-selector-button:focus {
      outline: none;
      border-color: var(--primary-color, #3b82f6);
    }

    .model-selector-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .model-info {
      flex: 1;
      text-align: left;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .model-name {
      font-weight: 500;
    }

    .chevron {
      transition: transform 0.2s;
      font-size: 0.7rem;
      color: var(--text-color-secondary, #a3a3a3);
    }

    .chevron.open {
      transform: rotate(180deg);
    }

    .model-dropdown {
      position: absolute;
      top: calc(100% + 0.25rem);
      right: 0;
      min-width: 220px;
      background-color: var(--bg-color-secondary, #1e1e1e);
      border: 1px solid var(--border-color, #404040);
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      z-index: 1000;
      max-height: 400px;
      overflow-y: auto;
    }

    .provider-group {
      padding: 0.25rem 0;
    }

    .provider-group:not(:last-child) {
      border-bottom: 1px solid var(--border-color, #404040);
    }

    .provider-label {
      padding: 0.5rem 0.75rem;
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--text-color-secondary, #a3a3a3);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .model-option {
      display: flex;
      align-items: center;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      transition: background-color 0.2s;
      font-size: 0.85rem;
    }

    .model-option:hover {
      background-color: var(--bg-color-hover, #3d3d3d);
    }

    .model-option.selected {
      background-color: var(--primary-color, #3b82f6);
      color: white;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.isEmbedded) {
      this.setupGatewayHandlers();
      if (gateway.getConnectionStatus()) {
        this.requestModelList();
      }
    }
  }

  override willUpdate(changedProperties: Map<string, unknown>): void {
    super.willUpdate(changedProperties);

    // Embedded mode: sync providers and selection from properties
    if (changedProperties.has('externalProviders') || changedProperties.has('externalSelectedModelId')) {
      if (this.isEmbedded) {
        this.providers = this.externalProviders;
        this.isLoading = false;
        this.syncExternalSelection();
      }
    }
  }

  private syncExternalSelection(): void {
    if (!this.externalSelectedModelId || this.providers.length === 0) return;
    // Find the model across all providers
    for (const provider of this.providers) {
      const model = provider.models.find(m => m.id === this.externalSelectedModelId);
      if (model) {
        this.selectedModel = model;
        return;
      }
    }
    // Fallback: select first model
    if (!this.selectedModel && this.providers[0]?.models[0]) {
      this.selectedModel = this.providers[0].models[0];
    }
  }

  private requestModelList(): void {
    this.isLoading = true;
    gateway.send({ type: 'model.list' });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleOutsideClick);
    if (!this.isEmbedded) {
      gateway.off('model.selected', this.boundHandleModelSelected);
      gateway.off('model.list', this.boundHandleModelList);
      gateway.off('gateway.connected', this.boundHandleGatewayConnected);
    }
  }

  private setupGatewayHandlers(): void {
    gateway.on('model.selected', this.boundHandleModelSelected);
    gateway.on('model.list', this.boundHandleModelList);
    gateway.on('gateway.connected', this.boundHandleGatewayConnected);
  }

  private handleGatewayConnected(): void {
    this.requestModelList();
  }

  private handleModelSelected(message: WebSocketMessage): void {
    const model = message.model as ModelSelectorModel;
    if (model) {
      this.selectedModel = model;
      this.isOpen = false;
    }
  }

  private handleModelList(message: WebSocketMessage): void {
    const providers = message.providers as ModelSelectorProvider[];
    if (providers && providers.length > 0) {
      this.providers = providers;

      const defaultSelection = message.defaultSelection as {
        providerId: string;
        modelId: string;
      };
      if (defaultSelection) {
        const provider = providers.find(
          (p) => p.id === defaultSelection.providerId
        );
        const model = provider?.models.find(
          (m) => m.id === defaultSelection.modelId
        );
        if (model) {
          this.selectedModel = model;
        }
      }
    }
    this.isLoading = false;
  }

  private handleOutsideClick = (event: MouseEvent): void => {
    const path = event.composedPath();
    if (!path.includes(this)) {
      this.isOpen = false;
      document.removeEventListener('click', this.handleOutsideClick);
    }
  };

  private toggleDropdown(): void {
    if (this.disabled) return;
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      document.addEventListener('click', this.handleOutsideClick);
    } else {
      document.removeEventListener('click', this.handleOutsideClick);
    }
  }

  private selectModel(model: ModelSelectorModel): void {
    this.selectedModel = model;
    this.isOpen = false;
    document.removeEventListener('click', this.handleOutsideClick);

    // Emit custom event for parent components
    this.dispatchEvent(
      new CustomEvent('model-changed', {
        detail: { providerId: model.providerId, modelId: model.id },
        bubbles: true,
        composed: true,
      })
    );

    // Only sync to backend when explicitly requested (header) or in standalone mode
    if (this.syncGlobal || !this.isEmbedded) {
      gateway.sendModelSettings(model.providerId, model.id);
    }
  }

  /** Public getter so parent components can read the selected model ID */
  get value(): string {
    return this.selectedModel?.id || '';
  }

  override render() {
    if (this.isLoading || (!this.selectedModel && this.providers.length === 0)) {
      return html`
        <button class="model-selector-button" disabled>
          <div class="model-info">
            <span class="model-name">Loading models...</span>
          </div>
        </button>
      `;
    }

    const displayName = this.selectedModel?.name || 'Select model...';

    return html`
      <button
        class="model-selector-button"
        @click=${this.toggleDropdown}
        ?disabled=${this.disabled}
        aria-expanded=${this.isOpen}
        aria-haspopup="listbox"
      >
        <div class="model-info">
          <span class="model-name">${displayName}</span>
        </div>
        <span class="chevron ${this.isOpen ? 'open' : ''}">▼</span>
      </button>

      ${this.isOpen
        ? html`
            <div class="model-dropdown" role="listbox">
              ${this.providers.map(
                (provider) => html`
                  <div class="provider-group">
                    <div class="provider-label">${provider.name}</div>
                    ${provider.models.map(
                      (model) => html`
                        <div
                          class="model-option ${this.selectedModel?.id === model.id
                            ? 'selected'
                            : ''}"
                          role="option"
                          aria-selected=${this.selectedModel?.id === model.id}
                          @click=${() => this.selectModel(model)}
                        >
                          <span class="model-name">${model.name}</span>
                        </div>
                      `
                    )}
                  </div>
                `
              )}
            </div>
          `
        : ''}
    `;
  }

  protected override createRenderRoot() {
    return super.createRenderRoot();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-model-selector': AosModelSelector;
  }
}
