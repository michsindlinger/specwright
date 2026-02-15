import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export interface ExecutionTabData {
  id: string;
  commandName: string;
  status: 'starting' | 'running' | 'waiting_input' | 'completed' | 'failed' | 'cancelled';
  /** Number of pending questions waiting for input (for waiting_input status) */
  pendingQuestionCount?: number;
  /** Whether this tab has unseen changes (for background notifications) */
  hasUnseenChanges?: boolean;
}

@customElement('aos-execution-tab')
export class AosExecutionTab extends LitElement {
  @property({ type: Object }) tab: ExecutionTabData | null = null;
  @property({ type: Boolean }) active = false;

  private handleClick(): void {
    if (!this.tab) return;
    this.dispatchEvent(
      new CustomEvent('tab-select', {
        detail: { tabId: this.tab.id },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleClose(e: Event): void {
    e.stopPropagation();
    if (!this.tab) return;
    this.dispatchEvent(
      new CustomEvent('tab-close', {
        detail: { tabId: this.tab.id },
        bubbles: true,
        composed: true
      })
    );
  }

  /**
   * Render notification badge for background tabs with unseen changes.
   * Badge shows when tab is not active AND (has pending questions OR has unseen changes).
   */
  private renderNotificationBadge() {
    if (!this.tab || this.active) return nothing;

    const { pendingQuestionCount, hasUnseenChanges, status } = this.tab;
    const showBadge = hasUnseenChanges || (pendingQuestionCount && pendingQuestionCount > 0);

    if (!showBadge) return nothing;

    // For waiting_input with questions, show the count
    if (status === 'waiting_input' && pendingQuestionCount && pendingQuestionCount > 0) {
      return html`
        <span class="notification-badge notification-badge--attention" aria-label="${pendingQuestionCount} questions waiting">
          ${pendingQuestionCount}
        </span>
      `;
    }

    // For other unseen changes (completed/failed), show a dot indicator
    return html`
      <span class="notification-badge notification-badge--pulse" aria-label="New activity"></span>
    `;
  }

  private renderStatusIndicator() {
    if (!this.tab) return nothing;

    const { status, pendingQuestionCount } = this.tab;

    switch (status) {
      case 'starting':
      case 'running':
        return html`
          <span class="status-indicator status-indicator--spinner" aria-label="Running">
            <span class="status-indicator__spinner"></span>
          </span>
        `;
      case 'waiting_input':
        return html`
          <span class="status-indicator status-indicator--badge" aria-label="${pendingQuestionCount || 1} questions waiting">
            <span class="status-indicator__badge">${pendingQuestionCount || 1}</span>
          </span>
        `;
      case 'completed':
        return html`
          <span class="status-indicator status-indicator--completed" aria-label="Completed">
            <svg class="status-indicator__icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
            </svg>
          </span>
        `;
      case 'failed':
        return html`
          <span class="status-indicator status-indicator--failed" aria-label="Failed">
            <svg class="status-indicator__icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/>
            </svg>
          </span>
        `;
      case 'cancelled':
        return html`
          <span class="status-indicator status-indicator--cancelled" aria-label="Cancelled">
            <svg class="status-indicator__icon" viewBox="0 0 16 16" fill="currentColor">
              <path fill-rule="evenodd" d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16ZM4.22 4.22a.75.75 0 0 1 1.06 0L8 6.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L9.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L8 9.06l-2.72 2.72a.75.75 0 0 1-1.06-1.06L6.94 8 4.22 5.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/>
            </svg>
          </span>
        `;
      default:
        return html`<span class="status-indicator">•</span>`;
    }
  }

  override render() {
    if (!this.tab) return nothing;

    const { commandName, status, hasUnseenChanges } = this.tab;
    const hasNotification = !this.active && hasUnseenChanges;

    return html`
      <div
        class="execution-tab ${this.active ? 'execution-tab--active' : ''} execution-tab--${status} ${hasNotification ? 'execution-tab--has-notification' : ''}"
        @click=${this.handleClick}
        role="tab"
        aria-selected=${this.active}
        aria-label="${commandName} - ${status}${hasNotification ? ' (new activity)' : ''}"
        tabindex="0"
      >
        ${this.renderStatusIndicator()}
        <span class="execution-tab__name">${commandName}</span>
        ${this.renderNotificationBadge()}
        <button
          class="execution-tab__close"
          @click=${this.handleClose}
          title="Close tab"
          aria-label="Close ${commandName} tab"
        >
          ×
        </button>
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-execution-tab': AosExecutionTab;
  }
}
