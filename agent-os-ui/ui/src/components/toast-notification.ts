import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

@customElement('aos-toast-notification')
export class AosToastNotification extends LitElement {
  @state()
  private toasts: ToastMessage[] = [];

  private defaultDuration = 5000;

  public show(message: string, type: ToastType = 'info', duration?: number): void {
    const toast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      message,
      type,
      duration: duration ?? this.defaultDuration,
    };

    this.toasts = [...this.toasts, toast];

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => this.dismiss(toast.id), toast.duration);
    }
  }

  public success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  public error(message: string, duration?: number): void {
    this.show(message, 'error', duration ?? 8000);
  }

  public info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  public warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration ?? 6000);
  }

  public dismiss(id: string): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  public clear(): void {
    this.toasts = [];
  }

  private getIcon(type: ToastType): string {
    const icons: Record<ToastType, string> = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠',
    };
    return icons[type];
  }

  override render() {
    return html`
      <div class="toast-container">
        ${this.toasts.map(
          (toast) => html`
            <div class="toast toast-${toast.type}" role="alert">
              <span class="toast-icon">${this.getIcon(toast.type)}</span>
              <span class="toast-message">${toast.message}</span>
              <button
                class="toast-dismiss"
                @click=${() => this.dismiss(toast.id)}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          `
        )}
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-toast-notification': AosToastNotification;
  }
}
