import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ProposedEdge } from '../../../src/shared/types/spec-dependencies.protocol.js';
import type { SpecInfo } from './spec-card.js';

export interface ProposalsApplyDetail {
  proposals: ProposedEdge[];
}

/**
 * SPD-007: AI dependency proposal dialog.
 * Shows ProposedEdge[] from the AI analysis with confidence badges and reason text.
 * User can dismiss individual proposals; confirmed ones are applied via proposals-apply.
 */
@customElement('aos-dependency-proposal-dialog')
export class AosDependencyProposalDialog extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ type: Boolean }) loading = false;
  @property({ type: Array }) proposals: ProposedEdge[] = [];
  @property({ type: Array }) allSpecs: SpecInfo[] = [];

  @state() private dismissed = new Set<number>();

  override updated(changed: Map<string, unknown>) {
    if (changed.has('proposals')) {
      this.dismissed = new Set();
    }
  }

  private _specName(id: string): string {
    return this.allSpecs.find(s => s.id === id)?.name ?? id;
  }

  private _dismiss(index: number): void {
    this.dismissed = new Set([...this.dismissed, index]);
  }

  private _undoDismiss(index: number): void {
    const next = new Set(this.dismissed);
    next.delete(index);
    this.dismissed = next;
  }

  private _confirmAll(): void {
    const confirmed = this.proposals.filter((_, i) => !this.dismissed.has(i));
    this.dispatchEvent(new CustomEvent<ProposalsApplyDetail>('proposals-apply', {
      detail: { proposals: confirmed },
      bubbles: true,
      composed: true,
    }));
  }

  private _close(): void {
    this.dispatchEvent(new CustomEvent('proposal-dialog-close', {
      bubbles: true,
      composed: true,
    }));
  }

  private _confidenceLabel(c: 'high' | 'medium' | 'low'): string {
    return c === 'high' ? 'Hoch' : c === 'medium' ? 'Mittel' : 'Niedrig';
  }

  override render() {
    if (!this.open) return html``;

    const confirmedCount = this.proposals.filter((_, i) => !this.dismissed.has(i)).length;

    return html`
      <div class="proposal-overlay" @click=${this._close}>
        <div
          class="proposal-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="proposal-title"
          @click=${(e: Event) => e.stopPropagation()}
        >
          <div class="proposal-dialog__header">
            <span id="proposal-title" class="proposal-dialog__title">KI-Abhängigkeitsvorschläge</span>
            <button class="proposal-dialog__close" @click=${this._close} aria-label="Schließen">✕</button>
          </div>

          <div class="proposal-dialog__body">
            ${this.loading ? html`
              <div class="proposal-loading">
                <span class="proposal-spinner">⟳</span>
                <span>Analysiere Abhängigkeiten…</span>
              </div>
            ` : this.proposals.length === 0 ? html`
              <p class="proposal-empty">Keine Abhängigkeiten erkannt.</p>
            ` : html`
              <p class="proposal-hint">
                Die KI hat mögliche Abhängigkeiten erkannt. Bestätige oder verwerfe jeden Vorschlag.
                Bestätigte Kanten werden als "blockiert durch" gespeichert.
              </p>
              <div class="proposal-list">
                ${this.proposals.map((p, i) => this._renderProposal(p, i))}
              </div>
            `}
          </div>

          <div class="proposal-dialog__footer">
            <button class="proposal-btn proposal-btn--cancel" @click=${this._close}>
              ${this.loading ? 'Abbrechen' : 'Schließen'}
            </button>
            ${!this.loading && this.proposals.length > 0 ? html`
              <button
                class="proposal-btn proposal-btn--confirm"
                @click=${this._confirmAll}
                ?disabled=${confirmedCount === 0}
              >
                ${confirmedCount} übernehmen
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  private _renderProposal(p: ProposedEdge, index: number) {
    const isDismissed = this.dismissed.has(index);

    return html`
      <div class="proposal-item${isDismissed ? ' proposal-item--dismissed' : ''}">
        <div class="proposal-edge">
          <span class="proposal-spec">${this._specName(p.from)}</span>
          <span class="proposal-arrow" title="wartet auf">←</span>
          <span class="proposal-spec proposal-spec--prereq">${this._specName(p.to)}</span>
        </div>
        <div class="proposal-meta">
          <span class="proposal-confidence proposal-confidence--${p.confidence}">
            ${this._confidenceLabel(p.confidence)}
          </span>
          ${p.needsReview ? html`
            <span class="proposal-review-flag" title="KI-Konfidenz niedrig — bitte manuell prüfen">⚠ bitte prüfen</span>
          ` : ''}
          <span class="proposal-reason">${p.reason}</span>
        </div>
        <div class="proposal-item__actions">
          ${isDismissed ? html`
            <button class="proposal-undo" @click=${() => this._undoDismiss(index)}>Rückgängig</button>
          ` : html`
            <button class="proposal-dismiss-btn" @click=${() => this._dismiss(index)}>Verwerfen</button>
          `}
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
    'aos-dependency-proposal-dialog': AosDependencyProposalDialog;
  }
}
