import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * KAE-004: Auto-mode error information interface
 */
export interface AutoModeError {
  message: string;
  storyId: string;
  storyTitle: string;
  phase: number;
}

/**
 * KAE-004: Modal dialog for handling errors during auto-mode execution.
 * Shows error details and provides Resume/Stop options.
 */
@customElement('aos-auto-mode-error-modal')
export class AosAutoModeErrorModal extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Object }) error: AutoModeError | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('keydown', this.handleKeydown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.handleKeydown);
  }

  private handleKeydown = (e: KeyboardEvent): void => {
    if (!this.open) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.handleStop();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.handleResume();
    }
  };

  private handleResume(): void {
    this.dispatchEvent(
      new CustomEvent('auto-mode-resume', {
        bubbles: true,
        composed: true
      })
    );
    this.open = false;
  }

  private handleStop(): void {
    this.dispatchEvent(
      new CustomEvent('auto-mode-stop', {
        bubbles: true,
        composed: true
      })
    );
    this.open = false;
  }

  override render() {
    if (!this.open || !this.error) {
      return html``;
    }

    return html`
      <div class="auto-mode-error-overlay">
        <div class="auto-mode-error-modal" role="dialog" aria-labelledby="error-modal-title" aria-modal="true">
          <div class="auto-mode-error-header">
            <span class="error-icon">⚠️</span>
            <h2 id="error-modal-title" class="auto-mode-error-title">Auto-Mode Fehler</h2>
          </div>

          <div class="auto-mode-error-content">
            <p class="error-message">${this.error.message}</p>

            <div class="error-details">
              <div class="error-detail-row">
                <span class="detail-label">Story:</span>
                <span class="detail-value">${this.error.storyId} - ${this.error.storyTitle}</span>
              </div>
              <div class="error-detail-row">
                <span class="detail-label">Phase:</span>
                <span class="detail-value">${this.error.phase}/5</span>
              </div>
            </div>
          </div>

          <div class="auto-mode-error-actions">
            <button class="btn btn-secondary" @click=${this.handleStop}>
              Stop
            </button>
            <button class="btn btn-primary" @click=${this.handleResume} autofocus>
              Resume
            </button>
          </div>

          <p class="keyboard-hint">
            <kbd>Enter</kbd> = Resume, <kbd>Esc</kbd> = Stop
          </p>
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
    'aos-auto-mode-error-modal': AosAutoModeErrorModal;
  }
}
