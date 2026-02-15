import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Lightweight confirmation dialog for destructive actions.
 * Shows a title, message, and two buttons (Cancel and Confirm).
 *
 * @fires confirm - Fired when user clicks the Confirm button
 * @fires cancel - Fired when user clicks the Cancel button
 */
@customElement('aos-confirm-dialog')
export class AosConfirmDialog extends LitElement {
  /**
   * Whether the dialog is currently open
   */
  @property({ type: Boolean, reflect: true }) open = false;

  /**
   * The title of the confirmation dialog
   */
  @property({ type: String }) title = '';

  /**
   * The message displayed to the user
   */
  @property({ type: String }) message = '';

  /**
   * Text for the confirm button (default: "Verwerfen")
   */
  @property({ type: String }) confirmText = 'Verwerfen';

  private handleConfirm(): void {
    this.dispatchEvent(
      new CustomEvent('confirm', {
        bubbles: true,
        composed: true
      })
    );
  }

  private handleCancel(): void {
    this.dispatchEvent(
      new CustomEvent('cancel', {
        bubbles: true,
        composed: true
      })
    );
  }

  private handleOverlayClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) {
      this.handleCancel();
    }
  }

  override render() {
    if (!this.open) {
      return nothing;
    }

    return html`
      <div
        class="confirm-dialog__overlay"
        @click=${this.handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div class="confirm-dialog">
          <header class="confirm-dialog__header">
            <h2 id="confirm-dialog-title" class="confirm-dialog__title">
              ${this.title}
            </h2>
          </header>

          <div class="confirm-dialog__body">
            <p id="confirm-dialog-message" class="confirm-dialog__message">
              ${this.message}
            </p>
          </div>

          <footer class="confirm-dialog__footer">
            <button
              class="confirm-dialog__cancel-btn"
              @click=${this.handleCancel}
            >
              Abbrechen
            </button>
            <button
              class="confirm-dialog__destructive-btn"
              @click=${this.handleConfirm}
            >
              ${this.confirmText}
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
    'aos-confirm-dialog': AosConfirmDialog;
  }
}
