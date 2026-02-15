import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export interface WorkflowCommand {
  id: string;
  name: string;
  description: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  providerId: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  models: ModelInfo[];
}


@customElement('aos-workflow-card')
export class AosWorkflowCard extends LitElement {
  @property({ type: Object }) command!: WorkflowCommand;
  @property({ type: Boolean }) disabled = false;
  @property({ type: String, attribute: false }) initialArgument?: string;
  @property({ type: Array }) providers: ProviderInfo[] = [];
  @property({ type: String }) defaultModel = '';

  @state() private showArgumentInput = false;
  @state() private argumentValue = '';
  @state() private selectedModel = '';

  override willUpdate(changedProperties: Map<string, unknown>): void {
    super.willUpdate(changedProperties);

    // Initialize or update selectedModel when providers/defaultModel change
    if ((changedProperties.has('providers') || changedProperties.has('defaultModel')) && this.providers.length > 0) {
      // If we have a defaultModel from backend, use it
      if (this.defaultModel) {
        this.selectedModel = this.defaultModel;
      } else if (!this.selectedModel) {
        // Otherwise use first model from first provider
        this.selectedModel = this.providers[0].models[0]?.id || '';
      }
    }
  }

  private handleClick(e: Event): void {
    if (this.disabled || this.showArgumentInput) return;

    // If clicking on the options icon or model dropdown, don't start workflow
    const target = e.target as HTMLElement;
    if (target.closest('.options-icon') || target.closest('.model-dropdown')) return;

    this.startInteractiveWorkflow(undefined, this.selectedModel);
  }

  private handleOptionsClick(e: Event): void {
    e.stopPropagation();
    if (this.disabled) return;
    this.showArgumentInput = !this.showArgumentInput;
    if (!this.showArgumentInput) {
      this.argumentValue = '';
    }
  }

  private handleArgumentInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    this.argumentValue = target.value;
  }

  private handleArgumentKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.startInteractiveWorkflow(this.argumentValue, this.selectedModel);
    } else if (e.key === 'Escape') {
      this.showArgumentInput = false;
      this.argumentValue = '';
    }
  }

  private handleStartWithArgument(e: Event): void {
    e.stopPropagation();
    const value = this.initialArgument || this.argumentValue;
    this.startInteractiveWorkflow(value, this.selectedModel);
  }

  private handleModelChange(e: Event): void {
    e.stopPropagation();
    const select = e.target as HTMLSelectElement;
    this.selectedModel = select.value;
  }

  private handleCancelArgument(e: Event): void {
    e.stopPropagation();
    this.showArgumentInput = false;
    this.argumentValue = '';
  }

  private startInteractiveWorkflow(argument?: string, model?: string): void {
    this.dispatchEvent(
      new CustomEvent('workflow-start-interactive', {
        detail: {
          commandId: this.command.id,
          argument: argument?.trim() || undefined,
          model: model || this.selectedModel
        },
        bubbles: true,
        composed: true
      })
    );

    // Reset state
    this.showArgumentInput = false;
    this.argumentValue = '';
  }

  override render() {
    // If initialArgument is provided, show argument input with pre-filled value
    const hasInitialArgument = this.initialArgument && this.initialArgument.trim().length > 0;

    return html`
      <div
        class="workflow-card ${this.disabled ? 'disabled' : ''} ${this.showArgumentInput || hasInitialArgument ? 'expanded' : ''}"
        @click=${this.handleClick}
      >
        <div class="card-header">
          <span class="command-name">${this.command.name}</span>
          <div class="card-actions">
            <button
              class="options-icon"
              @click=${this.handleOptionsClick}
              title="Start with arguments"
              ?disabled=${this.disabled}
            >
              ⚙
            </button>
            <span class="start-icon">▶</span>
          </div>
        </div>
        <p class="command-description">${this.command.description}</p>

        <div class="workflow-model-select" @click=${(e: Event) => e.stopPropagation()}>
          <select
            class="model-dropdown"
            .value=${this.selectedModel}
            ?disabled=${this.disabled || this.providers.length === 0}
            @change=${this.handleModelChange}
          >
            ${this.providers.length === 0
              ? html`<option>Loading models...</option>`
              : this.providers.map(provider => html`
                  <optgroup label="${provider.name}">
                    ${provider.models.map(model => html`
                      <option value="${model.id}" ?selected=${this.selectedModel === model.id}>
                        ${model.name}
                      </option>
                    `)}
                  </optgroup>
                `)}
          </select>
        </div>

        ${this.showArgumentInput || hasInitialArgument
          ? html`
              <div class="argument-input-area" @click=${(e: Event) => e.stopPropagation()}>
                <input
                  type="text"
                  class="argument-input"
                  placeholder="Enter argument (optional)..."
                  .value=${hasInitialArgument ? this.initialArgument : this.argumentValue}
                  @input=${this.handleArgumentInput}
                  @keydown=${this.handleArgumentKeyDown}
                  autofocus
                />
                <div class="argument-actions">
                  <button class="cancel-argument-btn" @click=${this.handleCancelArgument}>
                    Cancel
                  </button>
                  <button class="start-argument-btn" @click=${this.handleStartWithArgument}>
                    Start
                  </button>
                </div>
              </div>
            `
          : ''}

      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-workflow-card': AosWorkflowCard;
  }
}
