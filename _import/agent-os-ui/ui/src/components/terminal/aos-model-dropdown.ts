import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { gateway, type WebSocketMessage } from '../../gateway.js';

interface Model {
  id: string;
  name: string;
  providerId: string;
}

interface Provider {
  id: string;
  name: string;
  models: Model[];
}

/** Discriminated union for model-selected event detail */
export type ModelSelectedDetail =
  | { terminalType: 'shell' }
  | { providerId: string; modelId: string };

/**
 * Model Dropdown Component for Cloud Terminal
 *
 * A simplified model selector dropdown for terminal session creation.
 * Features:
 * - Dropdown with provider groups
 * - Model selection with visual feedback
 * - Gateway integration for model list
 * - Emits model-selected event on selection
 */
@customElement('aos-model-dropdown')
export class AosModelDropdown extends LitElement {
  @state() private providers: Provider[] = [];
  @state() private selectedModel: Model | null = null;
  @state() private isTerminalSelected = false;
  @state() private isOpen = false;
  @state() private isLoading = true;

  // Store bound handlers for cleanup
  private boundHandleModelList = this.handleModelList.bind(this);
  private boundHandleGatewayConnected = this.handleGatewayConnected.bind(this);

  static override styles = css`
    :host {
      display: inline-block;
      position: relative;
      font-family: var(--font-family, sans-serif);
      user-select: none;
    }

    .dropdown-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background-color: var(--bg-color-tertiary, #2d2d2d);
      border: 1px solid var(--border-color, #404040);
      border-radius: 4px;
      color: var(--text-color, #e5e5e5);
      cursor: pointer;
      font-size: 0.85rem;
      min-width: 180px;
      transition: all 0.2s;
    }

    .dropdown-button:hover {
      background-color: var(--bg-color-hover, #3d3d3d);
      border-color: var(--accent-color, #007acc);
    }

    .dropdown-button:focus {
      outline: none;
      border-color: var(--accent-color, #007acc);
    }

    .dropdown-button:disabled {
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

    .model-provider {
      font-size: 0.75rem;
      color: var(--text-color-secondary, #a0a0a0);
    }

    .chevron {
      transition: transform 0.2s;
      font-size: 0.7rem;
      color: var(--text-color-secondary, #a0a0a0);
    }

    .chevron.open {
      transform: rotate(180deg);
    }

    .dropdown-menu {
      position: absolute;
      top: calc(100% + 0.25rem);
      left: 0;
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
      color: var(--text-color-secondary, #a0a0a0);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .model-option {
      display: flex;
      flex-direction: column;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      transition: background-color 0.2s;
      font-size: 0.85rem;
    }

    .model-option:hover {
      background-color: var(--bg-color-hover, #3d3d3d);
    }

    .model-option.selected {
      background-color: var(--accent-color, #007acc);
      color: white;
    }

    .model-option.selected .model-provider-name {
      color: rgba(255, 255, 255, 0.8);
    }

    .model-option-name {
      font-weight: 500;
    }

    .model-provider-name {
      font-size: 0.75rem;
      color: var(--text-color-secondary, #a0a0a0);
    }

    .loading-text {
      padding: 1rem;
      text-align: center;
      color: var(--text-color-secondary, #a0a0a0);
      font-size: 0.85rem;
    }

    .empty-text {
      padding: 1rem;
      text-align: center;
      color: var(--text-color-secondary, #a0a0a0);
      font-size: 0.85rem;
    }

    .terminal-icon {
      width: 14px;
      height: 14px;
      color: var(--text-color-secondary, #a0a0a0);
      flex-shrink: 0;
    }

    .model-option .terminal-icon {
      display: inline-block;
      vertical-align: middle;
      margin-right: 0.25rem;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setupGatewayHandlers();

    // Request model list when connected
    if (gateway.getConnectionStatus()) {
      this.requestModelList();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleOutsideClick);
    gateway.off('model.list', this.boundHandleModelList);
    gateway.off('gateway.connected', this.boundHandleGatewayConnected);
  }

  private setupGatewayHandlers(): void {
    gateway.on('model.list', this.boundHandleModelList);
    gateway.on('gateway.connected', this.boundHandleGatewayConnected);
  }

  private requestModelList(): void {
    this.isLoading = true;
    gateway.send({ type: 'model.list' });
  }

  private handleGatewayConnected(): void {
    this.requestModelList();
  }

  private handleModelList(message: WebSocketMessage): void {
    const providers = message.providers as Provider[];
    if (providers && providers.length > 0) {
      this.providers = providers;

      // Set default model from backend if available
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
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      document.addEventListener('click', this.handleOutsideClick);
    } else {
      document.removeEventListener('click', this.handleOutsideClick);
    }
  }

  /** Select a plain shell terminal (no model needed) */
  private selectTerminal(): void {
    this.selectedModel = null;
    this.isTerminalSelected = true;
    this.isOpen = false;
    document.removeEventListener('click', this.handleOutsideClick);

    this.dispatchEvent(
      new CustomEvent('model-selected', {
        detail: { terminalType: 'shell' as const },
        bubbles: true,
        composed: true,
      })
    );
  }

  private selectModel(model: Model): void {
    this.selectedModel = model;
    this.isTerminalSelected = false;
    this.isOpen = false;
    document.removeEventListener('click', this.handleOutsideClick);

    // Emit custom event for parent components
    this.dispatchEvent(
      new CustomEvent('model-selected', {
        detail: { providerId: model.providerId, modelId: model.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private getSelectedProviderName(): string {
    if (!this.selectedModel) return '';
    const provider = this.providers.find(
      (p) => p.id === this.selectedModel?.providerId
    );
    return provider?.name || this.selectedModel.providerId;
  }

  /** Render the selected button label */
  private renderButtonLabel() {
    if (this.isTerminalSelected) {
      return html`<div class="model-name">Terminal</div>
        <div class="model-provider">Shell</div>`;
    }
    if (this.selectedModel) {
      return html`<div class="model-name">${this.selectedModel.name}</div>
        <div class="model-provider">${this.getSelectedProviderName()}</div>`;
    }
    return html`<span class="model-name">Session auswählen...</span>`;
  }

  override render() {
    return html`
      <button
        class="dropdown-button"
        @click=${this.toggleDropdown}
        aria-expanded=${this.isOpen}
        aria-haspopup="listbox"
      >
        <div class="model-info">
          ${this.renderButtonLabel()}
        </div>
        <span class="chevron ${this.isOpen ? 'open' : ''}">▼</span>
      </button>

      ${this.isOpen
        ? html`
            <div class="dropdown-menu" role="listbox">
              <div class="provider-group">
                <div class="provider-label">Terminal</div>
                <div
                  class="model-option ${this.isTerminalSelected ? 'selected' : ''}"
                  role="option"
                  aria-selected=${this.isTerminalSelected}
                  @click=${this.selectTerminal}
                >
                  <span class="model-option-name">Terminal</span>
                  <span class="model-provider-name">Shell</span>
                </div>
              </div>
              ${this.isLoading
                ? html`<div class="loading-text">Modelle werden geladen...</div>`
                : this.providers.map(
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
                              <span class="model-option-name">${model.name}</span>
                              <span class="model-provider-name">${provider.name}</span>
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
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-model-dropdown': AosModelDropdown;
  }
}
