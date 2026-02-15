import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { StagedImage } from '../views/chat-view.js';

/**
 * Image Staging Area Component
 *
 * Displays staged images as thumbnails with remove functionality.
 * Shows only when images are present, otherwise renders nothing.
 *
 * @fires image-removed - When user removes an image. Detail: { id: string }
 */
@customElement('aos-image-staging-area')
export class AosImageStagingArea extends LitElement {
  /**
   * Array of staged images to display
   */
  @property({ type: Array }) images: StagedImage[] = [];

  override render() {
    // Hide component when no images staged
    if (this.images.length === 0) {
      return nothing;
    }

    return html`
      <div class="image-staging-area">
        ${this.images.map(
          (img) => html`
            <div class="${img.file.type.startsWith('image/') ? 'staged-image' : 'staged-file'}" title="${img.file.name}">
              ${img.file.type.startsWith('image/')
                ? html`<img
                    src=${img.dataUrl}
                    alt="Staged: ${img.file.name}"
                    class="thumbnail"
                  />`
                : html`<div class="staged-file__content">
                    <span class="staged-file__icon">📄</span>
                    <span class="staged-file__name">${img.file.name}</span>
                  </div>`
              }
              <button
                class="remove-image-btn"
                @click=${() => this.handleRemove(img.id)}
                aria-label="Remove ${img.file.name}"
              >
                ✕
              </button>
            </div>
          `
        )}
      </div>
    `;
  }

  /**
   * Dispatch image-removed event when user clicks remove button
   */
  private handleRemove(id: string): void {
    this.dispatchEvent(
      new CustomEvent('image-removed', {
        detail: { id },
        bubbles: true,
        composed: true
      })
    );
  }

  /**
   * Use Light DOM (no Shadow DOM) for CSS inheritance from theme.css
   */
  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-image-staging-area': AosImageStagingArea;
  }
}
