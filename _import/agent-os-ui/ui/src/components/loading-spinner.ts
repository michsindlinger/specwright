import { LitElement, html, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('aos-loading-spinner')
export class AosLoadingSpinner extends LitElement {
  @property({ type: String })
  size: 'small' | 'medium' | 'large' = 'medium';

  @property({ type: String })
  label = '';

  private getSizePixels(): number {
    const sizes: Record<string, number> = {
      small: 20,
      medium: 32,
      large: 48,
    };
    return sizes[this.size] || 32;
  }

  override render() {
    const size = this.getSizePixels();
    const strokeWidth = size < 24 ? 2 : 3;

    return html`
      <div class="spinner-container spinner-${this.size}">
        <svg
          class="spinner-svg"
          width="${size}"
          height="${size}"
          viewBox="0 0 50 50"
          aria-label="${this.label || 'Loading'}"
          role="status"
        >
          ${svg`
            <circle
              class="spinner-track"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke-width="${strokeWidth}"
            />
            <circle
              class="spinner-progress"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke-width="${strokeWidth}"
              stroke-linecap="round"
            />
          `}
        </svg>
        ${this.label ? html`<span class="spinner-label">${this.label}</span>` : ''}
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-loading-spinner': AosLoadingSpinner;
  }
}
