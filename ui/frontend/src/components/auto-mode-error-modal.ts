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
 * PAM-008: Single incident entry (structurally compatible with KanbanAutoModeIncident).
 */
export interface AutoModeIncident {
  type: string;
  message: string;
  storyId?: string;
  timestamp: string;
  matchedText?: string;
  silentMs?: number;
}

/**
 * KAE-004 / PAM-008: Modal for auto-mode errors and incidents.
 * - Single error (error property): shows Resume/Stop buttons.
 * - Multi-incident list (activeIncidents): shows list with per-incident dismiss.
 */
@customElement('aos-auto-mode-error-modal')
export class AosAutoModeErrorModal extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Object }) error: AutoModeError | null = null;
  @property({ type: Array }) activeIncidents: AutoModeIncident[] = [];

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
    if (this.activeIncidents.length > 0) {
      if (e.key === 'Escape') { e.preventDefault(); this.handleStop(); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); this.handleStop(); }
    else if (e.key === 'Enter') { e.preventDefault(); this.handleResume(); }
  };

  private handleResume(): void {
    this.dispatchEvent(new CustomEvent('auto-mode-resume', { bubbles: true, composed: true }));
    this.open = false;
  }

  private handleStop(): void {
    this.dispatchEvent(new CustomEvent('auto-mode-stop', { bubbles: true, composed: true }));
    this.open = false;
  }

  private handleDismissIncident(incident: AutoModeIncident): void {
    this.dispatchEvent(new CustomEvent('incident-dismiss', {
      detail: { storyId: incident.storyId },
      bubbles: true,
      composed: true
    }));
  }

  private renderIncidentList() {
    return html`
      <div class="auto-mode-error-overlay">
        <div class="auto-mode-error-modal" role="dialog" aria-modal="true" style="min-width:400px;max-width:600px">
          <div class="auto-mode-error-header" style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
            <span class="error-icon">⚠️</span>
            <h2 style="margin:0;font-size:1.1rem">Auto-Mode Fehler (${this.activeIncidents.length})</h2>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
            ${this.activeIncidents.map(inc => html`
              <div style="display:flex;align-items:flex-start;gap:12px;padding:10px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px">
                <div style="flex:1;min-width:0">
                  ${inc.storyId ? html`<div style="font-family:monospace;font-size:0.8rem;color:#3b82f6;margin-bottom:4px">${inc.storyId}</div>` : ''}
                  <div style="font-size:0.9rem;word-break:break-word">${inc.message}</div>
                </div>
                <button
                  style="flex-shrink:0;padding:4px 10px;font-size:0.8rem;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:inherit;cursor:pointer"
                  @click=${() => this.handleDismissIncident(inc)}
                >Dismiss</button>
              </div>
            `)}
          </div>
          <div style="display:flex;justify-content:flex-end">
            <button
              style="padding:6px 16px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);border-radius:4px;color:#ef4444;cursor:pointer"
              @click=${this.handleStop}
            >Auto-Mode stoppen</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderSingleError() {
    if (!this.error) return html``;
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

  override render() {
    if (!this.open) return html``;
    if (this.activeIncidents.length > 0) return this.renderIncidentList();
    return this.renderSingleError();
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
