import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { WorkflowCommand, ProviderInfo } from './workflow-card.js';
import type { SpecInfo, SpecSelectedEventDetail } from './aos-spec-selector.js';
import './aos-spec-selector.js';

// Default fallback providers (same as workflow-card.ts)
const DEFAULT_PROVIDERS: ProviderInfo[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      { id: 'opus', name: 'Opus 4.5', providerId: 'anthropic' },
      { id: 'sonnet', name: 'Sonnet 4', providerId: 'anthropic' },
      { id: 'haiku', name: 'Haiku 3.5', providerId: 'anthropic' },
    ],
  },
  {
    id: 'glm',
    name: 'GLM',
    models: [
      { id: 'glm-5', name: 'GLM 5', providerId: 'glm' },
    ],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    models: [
      { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', providerId: 'gemini' },
      { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', providerId: 'gemini' },
    ],
  },
  {
    id: 'kimi-kw',
    name: 'KIMI K2',
    models: [
      { id: 'kimi-k2.5', name: 'Kimi K2.5', providerId: 'kimi-kw' },
    ],
  },
];

export type CreateSpecModalMode = 'direct' | 'add-story';
export type CreateSpecModalStep = 'spec-select' | 'workflow';

/**
 * Generic workflow modal dialog.
 * Shows command info, textarea for optional argument, and triggers the workflow.
 * Can be used for any workflow command or default to create-spec if no command provided.
 *
 * Supports two modes:
 * - 'direct': Shows workflow modal immediately (default)
 * - 'add-story': Two-step flow: spec selector -> workflow modal with spec argument
 *
 * @fires workflow-start-interactive - Fired when user clicks Start. Detail: { commandId: string, argument?: string }
 * @fires modal-close - Fired when the modal is closed without starting
 */
@customElement('aos-create-spec-modal')
export class AosCreateSpecModal extends LitElement {
  /**
   * Whether the modal is currently open
   */
  @property({ type: Boolean, reflect: true }) open = false;

  /**
   * The workflow command to display (optional, defaults to create-spec)
   */
  @property({ type: Object }) command: WorkflowCommand | null = null;

  /**
   * Modal mode: 'direct' for immediate workflow display, 'add-story' for two-step flow
   */
  @property({ type: String }) mode: CreateSpecModalMode = 'direct';

  /**
   * Available model providers and their models
   */
  @property({ type: Array }) providers: ProviderInfo[] = DEFAULT_PROVIDERS;

  /**
   * Whether the workflow is currently running (disables model selection)
   */
  @property({ type: Boolean }) isWorkflowRunning = false;

  @state() private argumentValue = '';
  @state() private currentStep: CreateSpecModalStep = 'workflow';
  @state() private selectedSpec: SpecInfo | null = null;
  @state() private isDirty = false;
  @state() private selectedModel = 'opus';

  private boundKeyHandler = this.handleKeyDown.bind(this);
  private boundInputHandler = this.handleInputDelegation.bind(this);
  private boundSpecSelectedHandler = this.handleSpecSelected.bind(this);

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('keydown', this.boundKeyHandler);
    this.addEventListener('input', this.boundInputHandler);
    this.addEventListener('spec-selected' as string, this.boundSpecSelectedHandler);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.boundKeyHandler);
    this.removeEventListener('input', this.boundInputHandler);
    this.removeEventListener('spec-selected' as string, this.boundSpecSelectedHandler);
  }

  override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('open') && this.open) {
      this.argumentValue = '';
      this.isDirty = false;
      // Reset to spec-select step if add-story mode
      if (this.mode === 'add-story') {
        this.currentStep = 'spec-select';
        this.selectedSpec = null;
        // Trigger spec selector to show
        requestAnimationFrame(() => {
          const specSelector = this.querySelector('aos-spec-selector') as unknown as { show?: () => void };
          specSelector?.show?.();
        });
      } else {
        this.currentStep = 'workflow';
      }
      // Focus the first focusable element
      requestAnimationFrame(() => {
        if (this.currentStep === 'spec-select') {
          const specSelector = this.querySelector('aos-spec-selector') as unknown as { focus?: () => void };
          specSelector?.focus?.();
        } else {
          const textarea = this.querySelector('.create-spec-modal__textarea') as HTMLTextAreaElement;
          textarea?.focus();
        }
      });
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.open) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      // In add-story mode, ESC goes back to spec select if on workflow step
      if (this.mode === 'add-story' && this.currentStep === 'workflow' && !this.isDirty) {
        this.currentStep = 'spec-select';
        this.selectedSpec = null;
        return;
      }
      this.closeModal();
    }

    // Focus trap
    if (e.key === 'Tab') {
      const focusableElements = this.querySelectorAll<HTMLElement>(
        'button, textarea, input, [tabindex]:not([tabindex="-1"])'
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

  private handleInputDelegation(e: Event): void {
    // Track input events from textarea
    if ((e.target as HTMLElement).classList.contains('create-spec-modal__textarea')) {
      const textarea = e.target as HTMLTextAreaElement;
      this.argumentValue = textarea.value;
      this.isDirty = textarea.value.trim().length > 0;
    }
  }

  private handleSpecSelected(e: Event): void {
    const customEvent = e as CustomEvent<SpecSelectedEventDetail>;
    const { spec } = customEvent.detail;
    this.selectedSpec = spec;
    this.currentStep = 'workflow';
    this.isDirty = false;
  }

  private handleBack(e: Event): void {
    // Prevent any event propagation
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (this.isDirty) {
      // TODO: Show confirmation dialog
      // For now, just go back
    }
    // Go back to spec selector step
    this.currentStep = 'spec-select';
    this.selectedSpec = null;
    this.isDirty = false;
  }

  private closeModal(): void {
    this.open = false;
    this.selectedSpec = null;
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

  private handleTextareaInput(e: Event): void {
    const textarea = e.target as HTMLTextAreaElement;
    this.argumentValue = textarea.value;
    this.isDirty = textarea.value.trim().length > 0;
  }

  private handleModelChange(e: CustomEvent): void {
    this.selectedModel = (e.detail as { modelId: string }).modelId;
  }

  private handleStart(): void {
    const cmd = this.command || {
      id: 'specwright:create-spec',
      description: 'Create a detailed specification with user stories through DevTeam collaboration (PO + Architect).'
    };

    // Get the argument - either from selected spec (for add-story) or from textarea
    const argument = this.mode === 'add-story' && this.selectedSpec
      ? this.selectedSpec.id
      : (this.argumentValue.trim() || undefined);

    this.dispatchEvent(
      new CustomEvent('workflow-start-interactive', {
        detail: {
          commandId: cmd.id,
          argument,
          model: this.selectedModel
        },
        bubbles: true,
        composed: true
      })
    );
    this.open = false;
  }

  private getCommandName(): string {
    return this.command?.id ? `/${this.command.id}` : '/specwright:create-spec';
  }

  private getCommandDescription(): string {
    return this.command?.description || 'Create a detailed specification with user stories through DevTeam collaboration (PO + Architect).';
  }

  private getInitialArgument(): string | undefined {
    if (this.mode === 'add-story' && this.selectedSpec) {
      return `Füge folgende Story zu Spec: ${this.selectedSpec.id} hinzu.`;
    }
    return undefined;
  }

  override render() {
    if (!this.open) {
      return nothing;
    }

    // In add-story mode, show spec selector first
    if (this.mode === 'add-story' && this.currentStep === 'spec-select') {
      return this.renderSpecSelectorStep();
    }

    // Direct mode or workflow step of add-story mode
    return this.renderWorkflowStep();
  }

  private renderSpecSelectorStep() {
    return html`
      <div
        class="create-spec-modal__overlay"
        @click=${this.handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-spec-modal-title"
      >
        <div class="create-spec-modal">
          <header class="create-spec-modal__header">
            <h2 id="create-spec-modal-title" class="create-spec-modal__title">
              Story zu Spec hinzufügen
            </h2>
            <button
              class="create-spec-modal__close-btn"
              @click=${() => this.closeModal()}
              aria-label="Close"
            >
              ✕
            </button>
          </header>

          <div class="create-spec-modal__content">
            <aos-spec-selector></aos-spec-selector>
          </div>
        </div>
      </div>
    `;
  }

  private renderWorkflowStep() {
    const commandName = this.getCommandName();
    const commandDescription = this.getCommandDescription();
    const showBackButton = this.mode === 'add-story';
    const initialArgument = this.getInitialArgument();

    return html`
      <div
        class="create-spec-modal__overlay"
        @click=${this.handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-spec-modal-title"
      >
        <div class="create-spec-modal">
          <header class="create-spec-modal__header">
            <div class="create-spec-modal__title-row">
              <span class="create-spec-modal__command">${commandName}</span>
              <div class="create-spec-modal__icons">
                <span class="create-spec-modal__settings-icon">&#9881;</span>
                <span class="create-spec-modal__play-icon">&#9654;</span>
              </div>
            </div>
            <p class="create-spec-modal__description">
              ${commandDescription}
            </p>
          </header>

          <div class="create-spec-modal__content">
            <textarea
              class="create-spec-modal__textarea"
              placeholder="Enter argument (optional)..."
              .value=${initialArgument || this.argumentValue}
              @input=${this.handleTextareaInput}
              rows="4"
            ></textarea>

            <div class="create-spec-modal__model-select">
              <label class="create-spec-modal__model-label">LLM Model</label>
              <aos-model-selector
                .externalProviders=${this.providers}
                .externalSelectedModelId=${this.selectedModel}
                ?disabled=${this.isWorkflowRunning}
                @model-changed=${this.handleModelChange}
              ></aos-model-selector>
            </div>
          </div>

          <footer class="create-spec-modal__footer">
            ${showBackButton
              ? html`
                  <button
                    class="create-spec-modal__back-btn"
                    @click=${(e: Event) => this.handleBack(e)}
                  >
                    ← Zurück
                  </button>
                `
              : ''}
            <button
              class="create-spec-modal__cancel-btn"
              @click=${() => this.closeModal()}
            >
              Cancel
            </button>
            <button
              class="create-spec-modal__start-btn"
              @click=${this.handleStart}
            >
              Start
            </button>
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
    'aos-create-spec-modal': AosCreateSpecModal;
  }
}
