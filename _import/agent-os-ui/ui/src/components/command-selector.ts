import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { WorkflowCommand } from './workflow-card.js';

@customElement('aos-command-selector')
export class AosCommandSelector extends LitElement {
  @property({ type: Array }) commands: WorkflowCommand[] = [];
  @property({ type: Boolean }) open = false;
  /** Element that triggers the selector (clicks on it won't close the selector) */
  @property({ attribute: false }) triggerElement: Element | null = null;

  @state() private focusedIndex = -1;

  private boundHandleClickOutside = this.handleClickOutside.bind(this);
  private boundHandleKeyDown = this.handleKeyDown.bind(this);

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('click', this.boundHandleClickOutside);
    document.addEventListener('keydown', this.boundHandleKeyDown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this.boundHandleClickOutside);
    document.removeEventListener('keydown', this.boundHandleKeyDown);
  }

  private handleClickOutside(e: MouseEvent): void {
    if (!this.open) return;
    const path = e.composedPath();
    const target = e.target as Element;

    // Check if click was on the selector or the trigger element
    const isInsideSelector = path.includes(this) || this.contains(target);
    const isOnTrigger = this.triggerElement && (
      path.includes(this.triggerElement) || this.triggerElement.contains(target)
    );

    console.log('[command-selector] handleClickOutside', {
      open: this.open,
      triggerElement: this.triggerElement,
      isInsideSelector,
      isOnTrigger,
      target,
      pathLength: path.length
    });

    if (!isInsideSelector && !isOnTrigger) {
      console.log('[command-selector] closing selector');
      this.close();
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.open) return;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.focusedIndex = Math.min(this.focusedIndex + 1, this.commands.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.focusedIndex = Math.max(this.focusedIndex - 1, 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (this.focusedIndex >= 0 && this.focusedIndex < this.commands.length) {
          this.selectCommand(this.commands[this.focusedIndex]);
        }
        break;
    }
  }

  private selectCommand(command: WorkflowCommand): void {
    this.dispatchEvent(
      new CustomEvent('command-select', {
        detail: { commandId: command.id, commandName: command.name },
        bubbles: true,
        composed: true
      })
    );
    this.close();
  }

  private close(): void {
    this.open = false;
    this.focusedIndex = -1;
    this.dispatchEvent(
      new CustomEvent('selector-close', {
        bubbles: true,
        composed: true
      })
    );
  }

  override render() {
    console.log('[command-selector] render', { open: this.open, commandsCount: this.commands.length });
    if (!this.open) return nothing;

    return html`
      <div class="command-selector" role="listbox" aria-label="Select a command">
        <div class="command-selector__header">Select Command</div>
        <div class="command-selector__list">
          ${this.commands.length === 0
            ? html`<div class="command-selector__empty">No commands available</div>`
            : this.commands.map(
                (command, index) => html`
                  <button
                    class="command-selector__item ${index === this.focusedIndex ? 'command-selector__item--focused' : ''}"
                    role="option"
                    aria-selected=${index === this.focusedIndex}
                    @click=${(e: Event) => {
                      e.stopPropagation();
                      this.selectCommand(command);
                    }}
                    @mouseenter=${() => {
                      this.focusedIndex = index;
                    }}
                  >
                    <span class="command-selector__name">${command.name}</span>
                    <span class="command-selector__description">${command.description}</span>
                  </button>
                `
              )}
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
    'aos-command-selector': AosCommandSelector;
  }
}
