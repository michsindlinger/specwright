import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { gateway, WebSocketMessage } from '../../gateway.js';
import { renderMarkdown } from '../../utils/markdown-renderer.js';

/**
 * Comment data structure from backend (see comment.protocol.ts)
 */
interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  editedAt?: string;
  imageFilename?: string;
}

/**
 * Reusable comment thread component for Backlog items.
 * Displays a chronological list of comments with Markdown rendering,
 * inline editing, and delete actions.
 *
 * @fires show-toast - Dispatched for user notifications
 */
@customElement('aos-comment-thread')
export class AosCommentThread extends LitElement {
  /**
   * Backlog item ID whose comments are displayed.
   */
  @property({ type: String }) itemId = '';

  /**
   * List of comments, oldest first.
   */
  @state()
  private comments: Comment[] = [];

  /**
   * Text in the new comment textarea.
   */
  @state()
  private newText = '';

  /**
   * Whether a comment creation request is in flight.
   */
  @state()
  private isSubmitting = false;

  /**
   * ID of the comment currently in edit mode (null = none).
   */
  @state()
  private editingCommentId: string | null = null;

  /**
   * Text in the edit textarea.
   */
  @state()
  private editText = '';

  /**
   * Whether the initial comment list is being loaded.
   */
  @state()
  private isLoading = false;

  /**
   * Gateway message handlers (kept for cleanup in disconnectedCallback).
   */
  private listHandler: ((msg: WebSocketMessage) => void) | null = null;
  private createHandler: ((msg: WebSocketMessage) => void) | null = null;
  private updateHandler: ((msg: WebSocketMessage) => void) | null = null;
  private deleteHandler: ((msg: WebSocketMessage) => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.registerHandlers();
    if (this.itemId) {
      this.loadComments();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unregisterHandlers();
  }

  private registerHandlers(): void {
    this.listHandler = (msg: WebSocketMessage) => {
      const data = (msg as { data?: { comments?: Comment[]; count?: number } }).data;
      if (data?.comments) {
        this.comments = data.comments;
        this.isLoading = false;
        this.updateComplete.then(() => this.scrollToBottom());
      }
    };

    this.createHandler = (msg: WebSocketMessage) => {
      const data = (msg as { data?: { comment?: Comment; count?: number } }).data;
      this.isSubmitting = false;
      if (data?.comment) {
        this.comments = [...this.comments, data.comment];
        this.newText = '';
        this.updateComplete.then(() => this.scrollToBottom());
      } else {
        this.showToast('Kommentar konnte nicht erstellt werden', 'error');
      }
    };

    this.updateHandler = (msg: WebSocketMessage) => {
      const data = (msg as { data?: { comment?: Comment } }).data;
      if (data?.comment) {
        this.comments = this.comments.map(c =>
          c.id === data.comment!.id ? data.comment! : c
        );
        this.editingCommentId = null;
        this.editText = '';
      } else {
        this.showToast('Kommentar konnte nicht aktualisiert werden', 'error');
      }
    };

    this.deleteHandler = (msg: WebSocketMessage) => {
      const data = (msg as { data?: { commentId?: string; count?: number } }).data;
      if (data?.commentId) {
        this.comments = this.comments.filter(c => c.id !== data.commentId);
      } else {
        this.showToast('Kommentar konnte nicht gelöscht werden', 'error');
      }
    };

    gateway.on('comment:list:response', this.listHandler);
    gateway.on('comment:create:response', this.createHandler);
    gateway.on('comment:update:response', this.updateHandler);
    gateway.on('comment:delete:response', this.deleteHandler);
  }

  private unregisterHandlers(): void {
    if (this.listHandler) gateway.off('comment:list:response', this.listHandler);
    if (this.createHandler) gateway.off('comment:create:response', this.createHandler);
    if (this.updateHandler) gateway.off('comment:update:response', this.updateHandler);
    if (this.deleteHandler) gateway.off('comment:delete:response', this.deleteHandler);
  }

  private loadComments(): void {
    this.isLoading = true;
    gateway.requestCommentList(this.itemId);
  }

  private scrollToBottom(): void {
    const list = this.shadowRoot?.querySelector('.comment-list');
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }

  private handleNewTextInput(e: Event): void {
    this.newText = (e.target as HTMLTextAreaElement).value;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      this.handleSubmit();
    }
  }

  private handleSubmit(): void {
    const text = this.newText.trim();
    if (!text || this.isSubmitting) return;
    this.isSubmitting = true;
    gateway.sendCommentCreate(this.itemId, text);
  }

  private handleEditClick(comment: Comment): void {
    this.editingCommentId = comment.id;
    this.editText = comment.text;
  }

  private handleEditTextInput(e: Event): void {
    this.editText = (e.target as HTMLTextAreaElement).value;
  }

  private handleSave(): void {
    if (!this.editingCommentId || !this.editText.trim()) return;
    gateway.sendCommentUpdate(this.itemId, this.editingCommentId, this.editText.trim());
  }

  private handleCancelEdit(): void {
    this.editingCommentId = null;
    this.editText = '';
  }

  private handleDelete(commentId: string): void {
    gateway.sendCommentDelete(this.itemId, commentId);
  }

  private formatDate(isoString: string): string {
    try {
      return new Date(isoString).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' | 'warning'): void {
    this.dispatchEvent(
      new CustomEvent('show-toast', {
        bubbles: true,
        composed: true,
        detail: { message, type }
      })
    );
  }

  private renderComment(comment: Comment) {
    const isEditing = this.editingCommentId === comment.id;
    return html`
      <div class="comment">
        <div class="comment__header">
          <span class="comment__author">${comment.author}</span>
          <span class="comment__date">${this.formatDate(comment.createdAt)}</span>
          ${comment.editedAt ? html`<span class="comment__edited">bearbeitet</span>` : nothing}
          <div class="comment__actions">
            <button
              class="comment__action-btn"
              @click=${() => this.handleEditClick(comment)}
              title="Bearbeiten"
              aria-label="Kommentar bearbeiten"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button
              class="comment__action-btn comment__action-btn--delete"
              @click=${() => this.handleDelete(comment.id)}
              title="Löschen"
              aria-label="Kommentar löschen"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="comment__body">
          ${isEditing
            ? html`
                <textarea
                  class="comment__edit-textarea"
                  .value=${this.editText}
                  @input=${this.handleEditTextInput}
                ></textarea>
                <div class="comment__edit-actions">
                  <button
                    class="comment__save-btn"
                    @click=${this.handleSave}
                    ?disabled=${!this.editText.trim()}
                  >Speichern</button>
                  <button
                    class="comment__cancel-btn"
                    @click=${this.handleCancelEdit}
                  >Abbrechen</button>
                </div>
              `
            : html`
                <div class="comment__text">${unsafeHTML(renderMarkdown(comment.text))}</div>
              `}
        </div>
      </div>
    `;
  }

  override render() {
    return html`
      <div class="comment-thread">
        <!-- Comment list (oldest first, auto-scroll to bottom) -->
        <div class="comment-list">
          ${this.isLoading
            ? html`
                <div class="comment-list__loading">
                  <div class="spinner"></div>
                </div>
              `
            : this.comments.length === 0
              ? html`<div class="comment-list__empty">Noch keine Kommentare</div>`
              : this.comments.map(c => this.renderComment(c))}
        </div>

        <!-- New comment input -->
        <div class="comment-input">
          <textarea
            class="comment-input__textarea"
            placeholder="Kommentar schreiben... (Markdown unterstützt, Strg+Enter zum Senden)"
            .value=${this.newText}
            @input=${this.handleNewTextInput}
            @keydown=${this.handleKeyDown}
            ?disabled=${this.isSubmitting}
          ></textarea>
          <div class="comment-input__actions">
            <button
              class="comment-input__submit"
              @click=${this.handleSubmit}
              ?disabled=${!this.newText.trim() || this.isSubmitting}
            >
              ${this.isSubmitting ? 'Wird gesendet...' : 'Kommentar senden'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      font-family: var(--font-family-sans, 'Space Grotesk', system-ui, -apple-system, sans-serif);
    }

    .comment-thread {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md, 1rem);
    }

    /* ── Comment List ─────────────────────────────────── */

    .comment-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm, 0.5rem);
      max-height: 400px;
      overflow-y: auto;
    }

    .comment-list__empty {
      color: var(--color-text-muted, #737373);
      font-size: var(--font-size-sm, 0.875rem);
      text-align: center;
      padding: var(--spacing-lg, 1.5rem) 0;
    }

    .comment-list__loading {
      display: flex;
      justify-content: center;
      padding: var(--spacing-lg, 1.5rem) 0;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--color-border, #333333);
      border-top-color: var(--color-accent-primary, #22c55e);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ── Single Comment ───────────────────────────────── */

    .comment {
      background: var(--color-bg-tertiary, #262626);
      border: 1px solid var(--color-border, #333333);
      border-radius: var(--radius-md, 0.5rem);
      padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
    }

    .comment__header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm, 0.5rem);
      margin-bottom: var(--spacing-xs, 0.25rem);
    }

    .comment__author {
      font-size: var(--font-size-xs, 0.75rem);
      font-weight: var(--font-weight-medium, 500);
      color: var(--color-accent-primary, #22c55e);
      background: rgba(34, 197, 94, 0.1);
      padding: 2px 8px;
      border-radius: var(--radius-full, 9999px);
    }

    .comment__date {
      font-size: var(--font-size-xs, 0.75rem);
      color: var(--color-text-muted, #737373);
      flex: 1;
    }

    .comment__edited {
      font-size: var(--font-size-xs, 0.75rem);
      color: var(--color-text-muted, #737373);
      font-style: italic;
    }

    /* Action buttons are hidden until the comment is hovered */
    .comment__actions {
      display: none;
      gap: var(--spacing-xs, 0.25rem);
    }

    .comment:hover .comment__actions {
      display: flex;
    }

    .comment__action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      background: none;
      border: none;
      border-radius: var(--radius-sm, 0.25rem);
      color: var(--color-text-muted, #737373);
      cursor: pointer;
      transition: all var(--transition-fast, 150ms ease);
    }

    .comment__action-btn:hover {
      background: var(--color-bg-elevated, #2d2d2d);
      color: var(--color-text-primary, #ffffff);
    }

    .comment__action-btn--delete:hover {
      background: var(--color-accent-error, #ef4444);
      color: var(--color-text-primary, #ffffff);
    }

    /* ── Comment Body ─────────────────────────────────── */

    .comment__body {
      color: var(--color-text-primary, #ffffff);
      font-size: var(--font-size-sm, 0.875rem);
    }

    .comment__text {
      line-height: 1.6;
    }

    /* Collapse bottom margin on last paragraph inside comment text */
    .comment__text p:last-child {
      margin-bottom: 0;
    }

    /* ── Inline Edit Mode ─────────────────────────────── */

    .comment__edit-textarea {
      width: 100%;
      min-height: 80px;
      padding: var(--spacing-sm, 0.5rem);
      background: var(--color-bg-secondary, #1a1a1a);
      border: 1px solid var(--color-border, #333333);
      border-radius: var(--radius-sm, 0.25rem);
      color: var(--color-text-primary, #ffffff);
      font-family: inherit;
      font-size: var(--font-size-sm, 0.875rem);
      resize: vertical;
      box-sizing: border-box;
    }

    .comment__edit-textarea:focus {
      outline: none;
      border-color: var(--color-accent-primary, #22c55e);
    }

    .comment__edit-actions {
      display: flex;
      gap: var(--spacing-sm, 0.5rem);
      margin-top: var(--spacing-xs, 0.25rem);
    }

    .comment__save-btn {
      padding: var(--spacing-xs, 0.25rem) var(--spacing-md, 1rem);
      background: var(--color-accent-primary, #22c55e);
      border: none;
      border-radius: var(--radius-sm, 0.25rem);
      color: var(--color-text-inverse, #000000);
      font-size: var(--font-size-sm, 0.875rem);
      font-weight: var(--font-weight-medium, 500);
      cursor: pointer;
      transition: background var(--transition-fast, 150ms ease);
    }

    .comment__save-btn:hover:not(:disabled) {
      background: var(--color-accent-primary-hover, #16a34a);
    }

    .comment__save-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .comment__cancel-btn {
      padding: var(--spacing-xs, 0.25rem) var(--spacing-md, 1rem);
      background: transparent;
      border: 1px solid var(--color-border, #333333);
      border-radius: var(--radius-sm, 0.25rem);
      color: var(--color-text-secondary, #a3a3a3);
      font-size: var(--font-size-sm, 0.875rem);
      cursor: pointer;
      transition: all var(--transition-fast, 150ms ease);
    }

    .comment__cancel-btn:hover {
      border-color: var(--color-border-hover, #404040);
      color: var(--color-text-primary, #ffffff);
    }

    /* ── New Comment Input ────────────────────────────── */

    .comment-input {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm, 0.5rem);
    }

    .comment-input__textarea {
      width: 100%;
      min-height: 80px;
      padding: var(--spacing-sm, 0.5rem);
      background: var(--color-bg-secondary, #1a1a1a);
      border: 1px solid var(--color-border, #333333);
      border-radius: var(--radius-md, 0.5rem);
      color: var(--color-text-primary, #ffffff);
      font-family: inherit;
      font-size: var(--font-size-sm, 0.875rem);
      resize: vertical;
      box-sizing: border-box;
      transition: border-color var(--transition-fast, 150ms ease);
    }

    .comment-input__textarea:focus {
      outline: none;
      border-color: var(--color-accent-primary, #22c55e);
    }

    .comment-input__textarea:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .comment-input__actions {
      display: flex;
      justify-content: flex-end;
    }

    .comment-input__submit {
      padding: var(--spacing-sm, 0.5rem) var(--spacing-lg, 1.5rem);
      background: var(--color-accent-primary, #22c55e);
      border: none;
      border-radius: var(--radius-md, 0.5rem);
      color: var(--color-text-inverse, #000000);
      font-size: var(--font-size-sm, 0.875rem);
      font-weight: var(--font-weight-medium, 500);
      cursor: pointer;
      transition: background var(--transition-fast, 150ms ease);
    }

    .comment-input__submit:hover:not(:disabled) {
      background: var(--color-accent-primary-hover, #16a34a);
    }

    .comment-input__submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-comment-thread': AosCommentThread;
  }
}
