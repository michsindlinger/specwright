import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('aos-collapsible-text')
export class AosCollapsibleText extends LitElement {
  @property({ type: String }) content = '';
  @property({ type: Number }) threshold = 500;
  @property({ type: Boolean }) initialExpanded = false;
  @property({ type: Number }) visibleLines = 3;

  @state() private expanded = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.expanded = this.initialExpanded;
  }

  private get shouldCollapse(): boolean {
    return this.content.length > this.threshold;
  }

  private get truncatedContent(): string {
    if (!this.shouldCollapse || this.expanded) {
      return this.content;
    }

    // Get first N lines
    const lines = this.content.split('\n');
    const visibleContent = lines.slice(0, this.visibleLines).join('\n');

    // If we have more lines, add ellipsis
    if (lines.length > this.visibleLines) {
      return visibleContent + '...';
    }

    return visibleContent;
  }

  private toggleExpanded(): void {
    this.expanded = !this.expanded;
  }

  override render() {
    const isCollapsible = this.shouldCollapse;

    return html`
      <div class="collapsible-text ${isCollapsible ? 'is-collapsible' : ''} ${this.expanded ? 'is-expanded' : ''}">
        <div class="collapsible-text-content">
          ${this.truncatedContent}
        </div>
        ${isCollapsible
          ? html`
              <button
                class="collapsible-text-toggle"
                @click=${this.toggleExpanded}
                type="button"
              >
                ${this.expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
              </button>
            `
          : nothing}
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-collapsible-text': AosCollapsibleText;
  }
}
