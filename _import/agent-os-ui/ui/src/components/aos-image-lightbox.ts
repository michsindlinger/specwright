import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

/**
 * Image Lightbox Component (CIMG-006)
 *
 * A modal overlay for displaying images in full screen.
 * Features:
 * - Dark overlay background (rgba(0,0,0,0.9))
 * - X button in top-right corner
 * - Centered image with max 90vw/90vh
 * - Close on Escape key
 * - Close on click outside image
 * - Fade in/out animation
 */
export interface LightboxImage {
  path: string;
  filename: string;
  mimeType: string;
}

export interface LightboxOpenEvent {
  imagePath: string;
  images: LightboxImage[];
  filename: string;
  mimeType: string;
}

@customElement('aos-image-lightbox')
export class AosImageLightbox extends LitElement {
  @property({ type: Boolean }) isOpen = false;
  @property({ type: String }) imageSrc = '';
  @property({ type: String }) filename = '';
  @property({ type: Array }) images: LightboxImage[] = [];
  @state() private currentIndex = 0;
  @state() private isAnimating = false;

  // Track if image is loaded for smooth transitions
  @state() private imageLoaded = false;

  private boundHandleKeyDown = this.handleKeyDown.bind(this);
  private boundHandleOverlayClick = this.handleOverlayClick.bind(this);

  override connectedCallback(): void {
    super.connectedCallback();
    // Listen for open-lightbox events
    document.addEventListener('open-lightbox', this.handleOpenLightbox as EventListener);
    // Add global keyboard listener
    document.addEventListener('keydown', this.boundHandleKeyDown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('open-lightbox', this.handleOpenLightbox as EventListener);
    document.removeEventListener('keydown', this.boundHandleKeyDown);
  }

  /**
   * Handle open-lightbox custom event from chat message thumbnails
   */
  private handleOpenLightbox(event: Event): void {
    const customEvent = event as CustomEvent<LightboxOpenEvent>;
    const { imagePath, images, filename, mimeType } = customEvent.detail;

    // Check if it's a PDF - don't open lightbox for PDFs
    if (mimeType === 'application/pdf') {
      // Open PDF in new tab instead
      const pdfUrl = `/api/images/${encodeURIComponent(imagePath)}`;
      window.open(pdfUrl, '_blank');
      return;
    }

    // Find current image index
    const index = images.findIndex(img => img.path === imagePath);

    this.images = images;
    this.currentIndex = index >= 0 ? index : 0;
    this.imageSrc = `/api/images/${encodeURIComponent(imagePath)}`;
    this.filename = filename;
    this.imageLoaded = false;
    this.isOpen = true;
    this.isAnimating = false;
  }

  /**
   * Handle Escape key to close lightbox
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isOpen) return;

    if (event.key === 'Escape') {
      this.close();
    } else if (event.key === 'ArrowLeft') {
      this.showPrevious();
    } else if (event.key === 'ArrowRight') {
      this.showNext();
    }
  }

  /**
   * Handle click on overlay (outside image) to close
   */
  private handleOverlayClick(event: Event): void {
    const target = event.target as HTMLElement;
    // Close if clicking on the overlay (not the image container or image)
    if (target.classList.contains('lightbox-overlay')) {
      this.close();
    }
  }

  /**
   * Show previous image in gallery
   */
  private showPrevious(): void {
    if (this.images.length <= 1) return;
    this.imageLoaded = false;
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.updateImage();
  }

  /**
   * Show next image in gallery
   */
  private showNext(): void {
    if (this.images.length <= 1) return;
    this.imageLoaded = false;
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.updateImage();
  }

  /**
   * Update current image based on index
   */
  private updateImage(): void {
    const currentImage = this.images[this.currentIndex];
    if (currentImage) {
      this.imageSrc = `/api/images/${encodeURIComponent(currentImage.path)}`;
      this.filename = currentImage.filename;
    }
  }

  /**
   * Close the lightbox with animation
   */
  private close(): void {
    this.isAnimating = true;
    // Wait for animation to complete
    setTimeout(() => {
      this.isOpen = false;
      this.isAnimating = false;
      this.imageSrc = '';
      this.filename = '';
    }, 200); // Match CSS transition duration
  }

  /**
   * Handle image load for smooth transitions
   */
  private handleImageLoad(): void {
    this.imageLoaded = true;
  }

  /**
   * Handle image load error
   */
  private handleImageError(): void {
    this.imageLoaded = true;
  }

  override render() {
    if (!this.isOpen) {
      return html``;
    }

    const hasMultiple = this.images.length > 1;
    const showPrevButton = hasMultiple && this.currentIndex > 0;
    const showNextButton = hasMultiple && this.currentIndex < this.images.length - 1;

    return html`
      <div
        class="lightbox-overlay ${this.isAnimating ? 'lightbox-overlay--closing' : ''}"
        @click=${this.boundHandleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-label="Image lightbox"
      >
        <!-- X Close Button -->
        <button
          class="lightbox-close"
          @click=${this.close}
          aria-label="Close lightbox"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <!-- Navigation Buttons (only show if multiple images) -->
        ${hasMultiple ? html`
          <button
            class="lightbox-nav lightbox-nav--prev"
            @click=${(e: Event) => { e.stopPropagation(); this.showPrevious(); }}
            aria-label="Previous image"
            ?disabled=${!showPrevButton}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button
            class="lightbox-nav lightbox-nav--next"
            @click=${(e: Event) => { e.stopPropagation(); this.showNext(); }}
            aria-label="Next image"
            ?disabled=${!showNextButton}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        ` : ''}

        <!-- Image Container -->
        <div class="lightbox-container">
          <img
            src=${ifDefined(this.imageSrc || undefined)}
            alt="${this.filename || 'Image'}"
            class="lightbox-image ${this.imageLoaded ? 'lightbox-image--loaded' : ''}"
            @load=${this.handleImageLoad}
            @error=${this.handleImageError}
            @click=${(e: Event) => e.stopPropagation()}
          />
          ${!this.imageLoaded ? html`
            <div class="lightbox-loading">
              <div class="lightbox-spinner"></div>
            </div>
          ` : ''}
        </div>

        <!-- Image Info (optional filename display) -->
        ${this.filename ? html`
          <div class="lightbox-info">
            <span class="lightbox-filename">${this.filename}</span>
            ${hasMultiple ? html`
              <span class="lightbox-counter">${this.currentIndex + 1} / ${this.images.length}</span>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: contents;
    }

    .lightbox-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.9);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 1;
      transition: opacity 0.2s ease;
    }

    .lightbox-overlay--closing {
      opacity: 0;
    }

    .lightbox-close {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 44px;
      height: 44px;
      background-color: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 50%;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s ease;
      z-index: 10000;
    }

    .lightbox-close:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }

    .lightbox-close:focus {
      outline: 2px solid rgba(255, 255, 255, 0.5);
      outline-offset: 2px;
    }

    .lightbox-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 48px;
      height: 48px;
      background-color: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 50%;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s ease;
      z-index: 10000;
    }

    .lightbox-nav:hover:not(:disabled) {
      background-color: rgba(255, 255, 255, 0.2);
    }

    .lightbox-nav:focus {
      outline: 2px solid rgba(255, 255, 255, 0.5);
      outline-offset: 2px;
    }

    .lightbox-nav:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .lightbox-nav--prev {
      left: 20px;
    }

    .lightbox-nav--next {
      right: 20px;
    }

    .lightbox-container {
      position: relative;
      max-width: 90vw;
      max-height: 90vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .lightbox-image {
      max-width: 90vw;
      max-height: 90vh;
      object-fit: contain;
      opacity: 0;
      transition: opacity 0.3s ease;
      user-select: none;
      -webkit-user-select: none;
    }

    .lightbox-image--loaded {
      opacity: 1;
    }

    .lightbox-loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .lightbox-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .lightbox-info {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0, 0, 0, 0.7);
      padding: 8px 16px;
      border-radius: 20px;
      color: white;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 80%;
    }

    .lightbox-filename {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .lightbox-counter {
      opacity: 0.7;
      font-size: 12px;
    }

    /* Responsive: smaller touch targets on mobile */
    @media (max-width: 768px) {
      .lightbox-close {
        top: 10px;
        right: 10px;
        width: 40px;
        height: 40px;
      }

      .lightbox-nav {
        width: 40px;
        height: 40px;
      }

      .lightbox-nav--prev {
        left: 10px;
      }

      .lightbox-nav--next {
        right: 10px;
      }

      .lightbox-container {
        max-width: 95vw;
        max-height: 85vh;
      }

      .lightbox-image {
        max-width: 95vw;
        max-height: 85vh;
      }

      .lightbox-info {
        bottom: 10px;
        padding: 6px 12px;
        font-size: 12px;
        max-width: 90%;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-image-lightbox': AosImageLightbox;
  }
}
