import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { GitChangedFile } from '../../../../src/shared/types/git.protocol.js';
import '../aos-confirm-dialog.js';

/**
 * Git commit dialog component.
 * Shows a modal with a scrollable file list (checkboxes + status badges),
 * a commit message textarea, and Commit/Cancel buttons.
 * Includes per-file revert/delete actions and "Alle reverten" bulk action.
 *
 * Uses Light DOM pattern for consistent theme styling.
 * Visibility is controlled via the `open` property from app.ts.
 *
 * @fires git-commit - Fired when user clicks Commit with { files: string[], message: string }
 * @fires dialog-close - Fired when user clicks Cancel or overlay
 * @fires revert-file - Fired when user clicks Revert on a single file { file: string }
 * @fires revert-all - Fired when user clicks "Alle reverten"
 * @fires delete-untracked - Fired when user confirms deletion of an untracked file { file: string }
 */
@customElement('aos-git-commit-dialog')
export class AosGitCommitDialog extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Array }) files: GitChangedFile[] = [];
  @property({ type: String }) error = '';
  @property({ type: Boolean }) committing = false;
  @property({ type: Boolean }) autoPush = false;
  @property({ type: String }) progressPhase: 'idle' | 'committing' | 'pushing' = 'idle';

  @state() private selectedFiles: Set<string> = new Set();
  @state() private commitMessage = '';
  @state() private revertingFiles: Set<string> = new Set();
  @state() private confirmDeleteFile: string | null = null;

  private get canCommit(): boolean {
    return this.selectedFiles.size > 0 && this.commitMessage.trim() !== '' && !this.committing && this.progressPhase !== 'pushing';
  }

  /** Files that can be reverted (modified, added, deleted, renamed - NOT untracked) */
  private get revertableFiles(): GitChangedFile[] {
    return this.files.filter(f => f.status !== '?');
  }

  private get hasRevertableFiles(): boolean {
    return this.revertableFiles.length > 0;
  }

  private _handleOverlayClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) {
      this._handleClose();
    }
  }

  private _handleClose(): void {
    if (this.progressPhase === 'pushing') return;
    this.dispatchEvent(
      new CustomEvent('dialog-close', { bubbles: true, composed: true })
    );
  }

  private _handleFileToggle(filePath: string): void {
    const newSelected = new Set(this.selectedFiles);
    if (newSelected.has(filePath)) {
      newSelected.delete(filePath);
    } else {
      newSelected.add(filePath);
    }
    this.selectedFiles = newSelected;
  }

  private _handleSelectAll(): void {
    if (this.selectedFiles.size === this.files.length) {
      this.selectedFiles = new Set();
    } else {
      this.selectedFiles = new Set(this.files.map(f => f.path));
    }
  }

  private _handleMessageInput(e: Event): void {
    this.commitMessage = (e.target as HTMLTextAreaElement).value;
  }

  private _handleCommit(): void {
    if (!this.canCommit) return;
    this.dispatchEvent(
      new CustomEvent('git-commit', {
        bubbles: true,
        composed: true,
        detail: {
          files: Array.from(this.selectedFiles),
          message: this.commitMessage.trim(),
        },
      })
    );
  }

  private _handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.progressPhase !== 'pushing') {
      this._handleClose();
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && this.canCommit) {
      this._handleCommit();
    }
  }

  private _handleRevertFile(e: Event, filePath: string): void {
    e.preventDefault();
    e.stopPropagation();
    if (this.revertingFiles.has(filePath)) return;

    this.revertingFiles = new Set([...this.revertingFiles, filePath]);
    this.dispatchEvent(
      new CustomEvent('revert-file', {
        bubbles: true,
        composed: true,
        detail: { file: filePath },
      })
    );
  }

  private _handleRevertAll(): void {
    if (!this.hasRevertableFiles) return;
    this.dispatchEvent(
      new CustomEvent('revert-all', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleDeleteUntrackedClick(e: Event, filePath: string): void {
    e.preventDefault();
    e.stopPropagation();
    this.confirmDeleteFile = filePath;
  }

  private _handleDeleteConfirm(): void {
    if (!this.confirmDeleteFile) return;
    this.dispatchEvent(
      new CustomEvent('delete-untracked', {
        bubbles: true,
        composed: true,
        detail: { file: this.confirmDeleteFile },
      })
    );
    this.confirmDeleteFile = null;
  }

  private _handleDeleteCancel(): void {
    this.confirmDeleteFile = null;
  }

  private _getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'M': 'modified',
      'A': 'added',
      'D': 'deleted',
      '?': 'untracked',
      'R': 'renamed',
    };
    return labels[status] || status;
  }

  private _isRevertable(status: string): boolean {
    return status !== '?';
  }

  private _getCommitButtonText(): string {
    if (this.progressPhase === 'pushing') return 'Pushing...';
    if (this.committing && this.autoPush) return 'Committing...';
    if (this.committing) return 'Committing...';
    if (this.autoPush) return `Commit & Push (${this.selectedFiles.size})`;
    return `Commit (${this.selectedFiles.size})`;
  }

  /** Reset internal state when dialog opens */
  override updated(changed: Map<string, unknown>): void {
    if (changed.has('open') && this.open) {
      this.selectedFiles = this.autoPush
        ? new Set(this.files.map(f => f.path))
        : new Set();
      this.commitMessage = '';
      this.revertingFiles = new Set();
      this.confirmDeleteFile = null;
    }
  }

  private _renderFileAction(file: GitChangedFile) {
    if (this._isRevertable(file.status)) {
      const isReverting = this.revertingFiles.has(file.path);
      return html`
        <button
          class="git-commit-dialog__action-btn git-commit-dialog__action-btn--revert"
          @click=${(e: Event) => this._handleRevertFile(e, file.path)}
          ?disabled=${isReverting}
          title="Datei reverten"
        >
          ${isReverting
            ? html`<aos-loading-spinner size="tiny"></aos-loading-spinner>`
            : html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>`
          }
        </button>
      `;
    }
    // Untracked file: show delete button
    return html`
      <button
        class="git-commit-dialog__action-btn git-commit-dialog__action-btn--delete"
        @click=${(e: Event) => this._handleDeleteUntrackedClick(e, file.path)}
        title="Datei loeschen"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;
  }

  override render() {
    if (!this.open) {
      return nothing;
    }

    const allSelected = this.files.length > 0 && this.selectedFiles.size === this.files.length;

    return html`
      <div
        class="git-commit-dialog__overlay"
        @click=${this._handleOverlayClick}
        @keydown=${this._handleKeydown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="git-commit-dialog-title"
      >
        <div class="git-commit-dialog">
          <header class="git-commit-dialog__header">
            <h2 id="git-commit-dialog-title" class="git-commit-dialog__title">${this.autoPush ? 'Commit & Push' : 'Commit'}</h2>
            <button
              class="git-commit-dialog__close-btn"
              @click=${this._handleClose}
              title="Schliessen"
              ?disabled=${this.progressPhase === 'pushing'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </header>

          <div class="git-commit-dialog__body">
            <div class="git-commit-dialog__message-section">
              <label class="git-commit-dialog__label" for="commit-message">Commit Message</label>
              <textarea
                id="commit-message"
                class="git-commit-dialog__textarea"
                placeholder="Beschreibe deine Aenderungen..."
                .value=${this.commitMessage}
                @input=${this._handleMessageInput}
                rows="3"
              ></textarea>
            </div>

            <div class="git-commit-dialog__files-section">
              <div class="git-commit-dialog__files-header">
                <label class="git-commit-dialog__label">
                  Dateien (${this.selectedFiles.size}/${this.files.length} ausgewaehlt)
                </label>
                <div class="git-commit-dialog__files-header-actions">
                  <button
                    class="git-commit-dialog__revert-all-btn"
                    @click=${this._handleRevertAll}
                    ?disabled=${!this.hasRevertableFiles}
                    title="Alle geaenderten Dateien reverten"
                  >
                    Alle reverten
                  </button>
                  <button
                    class="git-commit-dialog__select-all-btn"
                    @click=${this._handleSelectAll}
                  >
                    ${allSelected ? 'Keine' : 'Alle'} auswaehlen
                  </button>
                </div>
              </div>
              <div class="git-commit-dialog__file-list">
                ${this.files.length === 0
                  ? html`<div class="git-commit-dialog__empty">Keine geaenderten Dateien</div>`
                  : this.files.map(file => html`
                    <label class="git-commit-dialog__file-item">
                      <input
                        type="checkbox"
                        class="git-commit-dialog__checkbox"
                        .checked=${this.selectedFiles.has(file.path)}
                        @change=${() => this._handleFileToggle(file.path)}
                      />
                      <span class="git-commit-dialog__file-path">${file.path}</span>
                      <span class="git-commit-dialog__file-status git-commit-dialog__file-status--${this._getStatusLabel(file.status)}">
                        ${this._getStatusLabel(file.status)}
                      </span>
                      ${this._renderFileAction(file)}
                    </label>
                  `)
                }
              </div>
            </div>

            ${this.error ? html`
              <div class="git-commit-dialog__error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                ${this.error}
              </div>
            ` : nothing}
          </div>

          <footer class="git-commit-dialog__footer">
            <span class="git-commit-dialog__hint">Ctrl+Enter zum Committen</span>
            <div class="git-commit-dialog__footer-actions">
              <button
                class="git-commit-dialog__cancel-btn"
                @click=${this._handleClose}
                ?disabled=${this.progressPhase === 'pushing'}
              >
                Abbrechen
              </button>
              <button
                class="git-commit-dialog__commit-btn"
                ?disabled=${!this.canCommit}
                @click=${this._handleCommit}
              >
                ${this._getCommitButtonText()}
              </button>
            </div>
          </footer>
        </div>
      </div>
      <aos-confirm-dialog
        .open=${this.confirmDeleteFile !== null}
        title="Datei loeschen"
        message="Bist du sicher, dass du '${this.confirmDeleteFile ?? ''}' loeschen moechtest? Diese Aktion kann nicht rueckgaengig gemacht werden."
        confirmText="Loeschen"
        @confirm=${this._handleDeleteConfirm}
        @cancel=${this._handleDeleteCancel}
      ></aos-confirm-dialog>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-git-commit-dialog': AosGitCommitDialog;
  }
}
