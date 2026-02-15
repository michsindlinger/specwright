import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export type GitStrategy = 'branch' | 'worktree' | 'current-branch';

export type GitStrategyContext = 'story-start' | 'queue-add';

export interface GitStrategySelection {
  strategy: GitStrategy;
  storyId?: string;
  specId: string;
  context?: GitStrategyContext;
}

/**
 * Dialog component for selecting Git strategy when starting a story or adding to queue.
 * Shows two options: Git Branch (simple) and Git Worktree (parallel work).
 * The context parameter controls the dialog title and button text.
 */
@customElement('aos-git-strategy-dialog')
export class AosGitStrategyDialog extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String }) storyId = '';
  @property({ type: String }) specId = '';
  @property({ type: String }) context: GitStrategyContext = 'story-start';
  @state() private selectedStrategy: GitStrategy = 'branch';

  private handleOptionClick(strategy: GitStrategy): void {
    this.selectedStrategy = strategy;
  }

  private handleCancel(): void {
    this.dispatchEvent(
      new CustomEvent('git-strategy-cancel', {
        bubbles: true,
        composed: true
      })
    );
    this.open = false;
  }

  private handleConfirm(): void {
    const selection: GitStrategySelection = {
      strategy: this.selectedStrategy,
      storyId: this.storyId || undefined,
      specId: this.specId,
      context: this.context
    };

    this.dispatchEvent(
      new CustomEvent('git-strategy-select', {
        detail: selection,
        bubbles: true,
        composed: true
      })
    );
    this.open = false;
  }

  private handleOverlayClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) {
      this.handleCancel();
    }
  }

  private getDialogTitle(): string {
    return this.context === 'queue-add'
      ? 'Git-Strategie wählen'
      : 'Wie möchtest du arbeiten?';
  }

  private getDialogSubtitle(): string {
    return this.context === 'queue-add'
      ? 'Wähle die Git-Strategie für diese Spec. Die Strategie wird beim Starten angewendet.'
      : 'Wähle die Git-Strategie für diese Spec. Die Auswahl gilt für alle Stories.';
  }

  private getConfirmButtonText(): string {
    return this.context === 'queue-add' ? 'Hinzufügen' : 'Starten';
  }

  override render() {
    if (!this.open) {
      return html``;
    }

    return html`
      <style>
        .git-strategy-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .git-strategy-dialog {
          background-color: var(--color-bg-secondary, #1e1e1e);
          border: 1px solid var(--color-border, #404040);
          border-radius: 8px;
          padding: 1.5rem;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        .git-strategy-header {
          margin-bottom: 1rem;
        }
        .git-strategy-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text-primary, #e5e5e5);
          margin: 0 0 0.5rem 0;
        }
        .git-strategy-subtitle {
          font-size: 0.875rem;
          color: var(--color-text-secondary, #a3a3a3);
          margin: 0;
          line-height: 1.6;
        }
        .git-strategy-options {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .git-strategy-option {
          border: 2px solid var(--color-border, #404040);
          border-radius: 6px;
          padding: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .git-strategy-option:hover {
          border-color: var(--color-primary, #3b82f6);
          background-color: var(--color-bg-hover, #2d2d2d);
        }
        .git-strategy-option.selected {
          border-color: var(--color-primary, #3b82f6);
          background-color: rgba(59, 130, 246, 0.1);
        }
        .git-strategy-option-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }
        .git-strategy-radio {
          width: 20px;
          height: 20px;
          border: 2px solid var(--color-border, #404040);
          border-radius: 50%;
          transition: all 0.2s ease;
        }
        .git-strategy-option.selected .git-strategy-radio {
          border-color: var(--color-primary, #3b82f6);
          background-color: var(--color-primary, #3b82f6);
          position: relative;
        }
        .git-strategy-option.selected .git-strategy-radio::after {
          content: '';
          position: absolute;
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        .git-strategy-option-title {
          font-weight: 500;
          color: var(--color-text-primary, #e5e5e5);
        }
        .git-strategy-badge {
          font-size: 0.75rem;
          background-color: var(--color-success, #22c55e);
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          margin-left: auto;
        }
        .git-strategy-option-description {
          font-size: 0.875rem;
          color: var(--color-text-secondary, #a3a3a3);
          margin: 0;
          padding-left: 28px;
          line-height: 1.6;
        }
        .git-strategy-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }
        .btn {
          padding: 0.5rem 0.75rem;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }
        .btn-secondary {
          background-color: var(--color-bg-tertiary, #2d2d2d);
          color: var(--color-text-primary, #e5e5e5);
          border: 1px solid var(--color-border, #404040);
        }
        .btn-secondary:hover {
          background-color: var(--color-bg-hover, #3d3d3d);
        }
        .btn-primary {
          background-color: var(--color-primary, #3b82f6);
          color: white;
        }
        .btn-primary:hover {
          background-color: var(--color-primary-hover, #2563eb);
        }
      </style>
      <div class="git-strategy-overlay" @click=${this.handleOverlayClick}>
        <div class="git-strategy-dialog" @click=${(e: MouseEvent) => e.stopPropagation()}>
          <div class="git-strategy-header">
            <h2 class="git-strategy-title">${this.getDialogTitle()}</h2>
            <p class="git-strategy-subtitle">
              ${this.getDialogSubtitle()}
            </p>
          </div>

          <div class="git-strategy-options">
            <div
              class="git-strategy-option ${this.selectedStrategy === 'branch' ? 'selected' : ''}"
              @click=${() => this.handleOptionClick('branch')}
            >
              <div class="git-strategy-option-header">
                <div class="git-strategy-radio"></div>
                <span class="git-strategy-option-title">Git Branch</span>
                <span class="git-strategy-badge">Empfohlen</span>
              </div>
              <p class="git-strategy-option-description">
                Einfacher Branch im aktuellen Verzeichnis - empfohlen für die meisten Workflows.
                Du arbeitest im Hauptprojektverzeichnis.
              </p>
            </div>

            <div
              class="git-strategy-option ${this.selectedStrategy === 'worktree' ? 'selected' : ''}"
              @click=${() => this.handleOptionClick('worktree')}
            >
              <div class="git-strategy-option-header">
                <div class="git-strategy-radio"></div>
                <span class="git-strategy-option-title">Git Worktree</span>
              </div>
              <p class="git-strategy-option-description">
                Separates Arbeitsverzeichnis - ideal für parallele Arbeit an mehreren Features.
                Claude Code muss im Worktree-Verzeichnis gestartet werden.
              </p>
            </div>

            <div
              class="git-strategy-option ${this.selectedStrategy === 'current-branch' ? 'selected' : ''}"
              @click=${() => this.handleOptionClick('current-branch')}
            >
              <div class="git-strategy-option-header">
                <div class="git-strategy-radio"></div>
                <span class="git-strategy-option-title">Im aktuellen Branch arbeiten</span>
              </div>
              <p class="git-strategy-option-description">
                Arbeitet direkt im aktuellen Branch ohne neuen Branch zu erstellen.
                Ideal für schnelle Aufgaben oder wenn du bereits im richtigen Branch bist.
              </p>
            </div>
          </div>

          <div class="git-strategy-actions">
            <button class="btn btn-secondary" @click=${this.handleCancel}>
              Abbrechen
            </button>
            <button class="btn btn-primary" @click=${this.handleConfirm}>
              ${this.getConfirmButtonText()}
            </button>
          </div>
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
    'aos-git-strategy-dialog': AosGitStrategyDialog;
  }
}
