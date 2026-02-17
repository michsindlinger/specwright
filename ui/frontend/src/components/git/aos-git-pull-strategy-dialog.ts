import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/**
 * Dialog for choosing a git pull strategy when branches have diverged.
 * Shown when a push is rejected or when pull fails due to divergent branches.
 *
 * Uses Light DOM for consistent theme styling.
 *
 * @fires pull-strategy-select - Fired with { strategy: 'merge' | 'rebase' | 'ff-only' }
 * @fires pull-strategy-cancel - Fired when user cancels
 */
@customElement('aos-git-pull-strategy-dialog')
export class AosGitPullStrategyDialog extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Boolean }) retryPush = false;

  @state() private selectedStrategy: 'merge' | 'rebase' | 'ff-only' = 'rebase';

  private _handleOverlayClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) {
      this._handleCancel();
    }
  }

  private _handleCancel(): void {
    this.dispatchEvent(
      new CustomEvent('pull-strategy-cancel', { bubbles: true, composed: true })
    );
  }

  private _handleConfirm(): void {
    this.dispatchEvent(
      new CustomEvent('pull-strategy-select', {
        bubbles: true,
        composed: true,
        detail: { strategy: this.selectedStrategy },
      })
    );
  }

  private _handleStrategyChange(strategy: 'merge' | 'rebase' | 'ff-only'): void {
    this.selectedStrategy = strategy;
  }

  private _handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this._handleCancel();
    } else if (e.key === 'Enter') {
      this._handleConfirm();
    }
  }

  override render() {
    if (!this.open) return nothing;

    return html`
      <div
        class="git-pull-strategy-overlay"
        @click=${this._handleOverlayClick}
        @keydown=${this._handleKeydown}
        style="
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        "
      >
        <div
          class="git-pull-strategy-dialog"
          style="
            background: var(--color-bg-secondary, #1e1e2e);
            border: 1px solid var(--color-border, #333);
            border-radius: 12px;
            padding: 24px;
            width: 440px;
            max-width: 90vw;
            color: var(--color-text, #e0e0e0);
          "
        >
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: var(--color-text, #fff);">
            ${this.retryPush ? 'Remote hat neue Commits' : 'Branches sind divergiert'}
          </h3>
          <p style="margin: 0 0 20px 0; font-size: 13px; color: var(--color-text-secondary, #999); line-height: 1.5;">
            ${this.retryPush
              ? 'Der Push wurde abgelehnt, weil der Remote neue Commits enthaelt. Waehle eine Pull-Strategie, um die Aenderungen zu integrieren. Nach erfolgreichem Pull wird automatisch erneut gepusht.'
              : 'Lokale und Remote-Branches sind auseinandergelaufen. Waehle eine Strategie, um die Aenderungen zusammenzufuehren.'}
          </p>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
            ${this._renderOption(
              'rebase',
              'Rebase (Empfohlen)',
              'Setzt lokale Commits auf den Remote-Stand. Ergibt eine lineare History.',
            )}
            ${this._renderOption(
              'merge',
              'Merge',
              'Erstellt einen Merge-Commit. Behaelt beide Historien bei.',
            )}
            ${this._renderOption(
              'ff-only',
              'Fast-Forward Only',
              'Bricht ab, wenn kein Fast-Forward moeglich ist. Sicherste Option.',
            )}
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button
              @click=${this._handleCancel}
              style="
                padding: 8px 16px;
                border-radius: 6px;
                border: 1px solid var(--color-border, #444);
                background: transparent;
                color: var(--color-text-secondary, #aaa);
                cursor: pointer;
                font-size: 13px;
              "
            >Abbrechen</button>
            <button
              @click=${this._handleConfirm}
              style="
                padding: 8px 16px;
                border-radius: 6px;
                border: none;
                background: var(--color-primary, #7c3aed);
                color: #fff;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
              "
            >${this.retryPush ? 'Pull & Push' : 'Pull ausfuehren'}</button>
          </div>
        </div>
      </div>
    `;
  }

  private _renderOption(
    value: 'merge' | 'rebase' | 'ff-only',
    label: string,
    description: string,
  ) {
    const isSelected = this.selectedStrategy === value;
    return html`
      <label
        @click=${() => this._handleStrategyChange(value)}
        style="
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid ${isSelected ? 'var(--color-primary, #7c3aed)' : 'var(--color-border, #333)'};
          background: ${isSelected ? 'rgba(124, 58, 237, 0.08)' : 'transparent'};
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        "
      >
        <input
          type="radio"
          name="pull-strategy"
          .checked=${isSelected}
          @change=${() => this._handleStrategyChange(value)}
          style="margin-top: 2px; accent-color: var(--color-primary, #7c3aed);"
        />
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 13px; font-weight: 500; color: var(--color-text, #fff);">${label}</div>
          <div style="font-size: 12px; color: var(--color-text-secondary, #888); margin-top: 2px;">${description}</div>
        </div>
      </label>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-git-pull-strategy-dialog': AosGitPullStrategyDialog;
  }
}
