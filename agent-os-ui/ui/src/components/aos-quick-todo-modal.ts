import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  validateFile,
  createStagedImage,
  ALLOWED_MIME_TYPES,
  MAX_IMAGES,
} from '../utils/image-upload.utils.js';
import type { StagedImage } from '../utils/image-upload.utils.js';
import type { AosToastNotification } from './toast-notification.js';
import './aos-image-staging-area.js';

/**
 * Quick-To-Do Modal Component
 *
 * A quick-capture modal for spontaneous ideas and tasks.
 * Opens via context menu -> "Quick-To-Do".
 * Supports image paste (Ctrl+V) and drag & drop.
 *
 * @fires quick-todo-saved - Fired when save succeeds. Detail: { itemId: string }
 * @fires modal-close - Fired when the modal is closed without saving
 */
@customElement('aos-quick-todo-modal')
export class AosQuickTodoModal extends LitElement {
  /**
   * Whether the modal is currently open
   */
  @property({ type: Boolean, reflect: true }) open = false;

  /**
   * The project path to save the todo to.
   * Passed from the parent (app) based on the active project.
   */
  @property({ type: String }) projectPath: string | null = null;

  @state() private todoTitle = '';
  @state() private description = '';
  @state() private priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  @state() private stagedImages: StagedImage[] = [];
  @state() private isDragOver = false;
  @state() private isSaving = false;
  @state() private errorMessage = '';

  private boundKeyHandler = this.handleKeyDown.bind(this);
  private boundPasteHandler = this.handlePaste.bind(this);

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('keydown', this.boundKeyHandler);
    document.addEventListener('paste', this.boundPasteHandler);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.boundKeyHandler);
    document.removeEventListener('paste', this.boundPasteHandler);
  }

  override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('open') && this.open) {
      // Reset form when opening
      this.todoTitle = '';
      this.description = '';
      this.priority = 'medium';
      this.stagedImages = [];
      this.isDragOver = false;
      this.isSaving = false;
      this.errorMessage = '';

      // Focus the title input
      requestAnimationFrame(() => {
        const titleInput = this.querySelector(
          '.quick-todo-modal__input--title'
        ) as HTMLInputElement;
        titleInput?.focus();
      });
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.open) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.closeModal();
    }

    // Enter key saves (unless focus is on textarea)
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.tagName !== 'TEXTAREA') {
        e.preventDefault();
        this.handleSave();
      }
    }

    // Focus trap
    if (e.key === 'Tab') {
      const focusableElements = this.querySelectorAll<HTMLElement>(
        'button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      const focusable = Array.from(focusableElements);
      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  }

  private closeModal(): void {
    this.open = false;
    this.dispatchEvent(
      new CustomEvent('modal-close', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleOverlayClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) {
      this.closeModal();
    }
  }

  private handleTitleInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.todoTitle = input.value;
  }

  private handleDescriptionInput(e: Event): void {
    const textarea = e.target as HTMLTextAreaElement;
    this.description = textarea.value;
  }

  private handlePriorityChange(e: Event): void {
    const select = e.target as HTMLSelectElement;
    this.priority = select.value as 'low' | 'medium' | 'high' | 'critical';
  }

  // --- Image Upload Methods ---

  private showToast(message: string, type: 'error' | 'warning' | 'info' | 'success' = 'error'): void {
    const toast = document.querySelector('aos-toast-notification') as AosToastNotification | null;
    if (toast) {
      toast.show(message, type);
    }
  }

  private handleFilePickerClick(): void {
    const input = this.querySelector('.quick-todo-modal__file-input') as HTMLInputElement | null;
    input?.click();
  }

  private async handleFileInputChange(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      await this.handleFiles(input.files);
      input.value = '';
    }
  }

  private async addFile(file: File): Promise<void> {
    const error = validateFile(file, this.stagedImages.length);
    if (error) {
      this.showToast(error, 'error');
      return;
    }

    const staged = await createStagedImage(file);
    this.stagedImages = [...this.stagedImages, staged];
  }

  private async handleFiles(files: FileList | File[]): Promise<void> {
    for (const file of Array.from(files)) {
      await this.addFile(file);
    }
  }

  private async handlePaste(e: ClipboardEvent): Promise<void> {
    if (!this.open) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    const pastedFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/') || item.type === 'application/pdf') {
        const file = item.getAsFile();
        if (file) {
          pastedFiles.push(file);
        }
      }
    }

    if (pastedFiles.length > 0) {
      e.preventDefault();
      await this.handleFiles(pastedFiles);
    }
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver = true;
  }

  private handleDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    const relatedTarget = e.relatedTarget as Element | null;
    const container = e.currentTarget as Element;
    if (!relatedTarget || !container.contains(relatedTarget)) {
      this.isDragOver = false;
    }
  }

  private async handleDrop(e: DragEvent): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver = false;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await this.handleFiles(files);
    }
  }

  private handleImageRemoved(e: CustomEvent<{ id: string }>): void {
    this.stagedImages = this.stagedImages.filter(img => img.id !== e.detail.id);
  }

  // --- Save ---

  private async handleSave(): Promise<void> {
    const trimmedTitle = this.todoTitle.trim();
    if (!trimmedTitle || this.isSaving) return;

    this.isSaving = true;
    this.errorMessage = '';

    if (!this.projectPath) {
      this.errorMessage = 'Kein Projekt ausgewählt';
      this.isSaving = false;
      return;
    }

    const body: {
      title: string;
      description?: string;
      priority: string;
      images?: Array<{ data: string; filename: string; mimeType: string }>;
    } = {
      title: trimmedTitle,
      description: this.description.trim() || undefined,
      priority: this.priority,
    };

    if (this.stagedImages.length > 0) {
      body.images = this.stagedImages.map((img) => ({
        data: img.dataUrl,
        filename: img.file.name,
        mimeType: img.file.type,
      }));
    }

    try {
      const encodedPath = encodeURIComponent(this.projectPath!);
      const response = await fetch(`/api/backlog/${encodedPath}/quick-todo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json() as { success: boolean; itemId?: string; error?: string };

      if (!result.success) {
        this.errorMessage = result.error || 'Speichern fehlgeschlagen';
        this.isSaving = false;
        return;
      }

      this.isSaving = false;
      this.open = false;
      this.dispatchEvent(
        new CustomEvent('quick-todo-saved', {
          detail: { itemId: result.itemId },
          bubbles: true,
          composed: true,
        })
      );
    } catch {
      this.errorMessage = 'Server nicht erreichbar. Bitte erneut versuchen.';
      this.isSaving = false;
    }
  }

  override render() {
    if (!this.open) {
      return nothing;
    }

    const isSaveDisabled = this.todoTitle.trim().length === 0 || this.isSaving;

    return html`
      <div
        class="quick-todo-modal__overlay"
        @click=${this.handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-todo-modal-title"
      >
        <div
          class="quick-todo-modal ${this.isDragOver ? 'quick-todo-modal--drag-over' : ''}"
          @dragover=${this.handleDragOver}
          @dragleave=${this.handleDragLeave}
          @drop=${this.handleDrop}
        >
          <header class="quick-todo-modal__header">
            <div class="quick-todo-modal__title-row">
              <span class="quick-todo-modal__icon">⚡</span>
              <h2 id="quick-todo-modal-title" class="quick-todo-modal__title">
                Quick-To-Do
              </h2>
            </div>
            <button
              class="quick-todo-modal__close-btn"
              @click=${() => this.closeModal()}
              aria-label="Schließen"
            >
              ✕
            </button>
          </header>

          <div class="quick-todo-modal__content">
            ${this.errorMessage ? html`
              <div class="quick-todo-modal__error" role="alert">
                ${this.errorMessage}
              </div>
            ` : nothing}

            <div class="quick-todo-modal__field">
              <label class="quick-todo-modal__label" for="quick-todo-title">
                Titel <span class="quick-todo-modal__required">*</span>
              </label>
              <input
                id="quick-todo-title"
                type="text"
                class="quick-todo-modal__input quick-todo-modal__input--title"
                placeholder="Was möchtest du festhalten?"
                .value=${this.todoTitle}
                @input=${this.handleTitleInput}
                maxlength="200"
              />
            </div>

            <div class="quick-todo-modal__field">
              <label class="quick-todo-modal__label" for="quick-todo-description">
                Beschreibung (optional)
              </label>
              <textarea
                id="quick-todo-description"
                class="quick-todo-modal__textarea"
                placeholder="Weitere Details..."
                .value=${this.description}
                @input=${this.handleDescriptionInput}
                rows="3"
                maxlength="1000"
              ></textarea>
            </div>

            <div class="quick-todo-modal__field">
              <label class="quick-todo-modal__label" for="quick-todo-priority">
                Priorität
              </label>
              <select
                id="quick-todo-priority"
                class="quick-todo-modal__select"
                .value=${this.priority}
                @change=${this.handlePriorityChange}
              >
                <option value="low">Niedrig</option>
                <option value="medium" selected>Medium</option>
                <option value="high">Hoch</option>
                <option value="critical">Kritisch</option>
              </select>
            </div>

            <div class="quick-todo-modal__field">
              <label class="quick-todo-modal__label">
                Anhänge
                <span class="quick-todo-modal__image-count">${this.stagedImages.length}/${MAX_IMAGES}</span>
              </label>
              <aos-image-staging-area
                .images=${this.stagedImages}
                @image-removed=${this.handleImageRemoved}
              ></aos-image-staging-area>
              <div class="quick-todo-modal__attachment-actions">
                ${this.stagedImages.length === 0 ? html`
                  <div class="quick-todo-modal__drop-hint">
                    Dateien per Drag & Drop oder Ctrl+V einfügen
                  </div>
                ` : nothing}
                <input
                  type="file"
                  class="quick-todo-modal__file-input"
                  accept=${ALLOWED_MIME_TYPES.join(',')}
                  multiple
                  @change=${this.handleFileInputChange}
                  style="display: none;"
                />
                <button
                  type="button"
                  class="quick-todo-modal__file-picker-btn"
                  @click=${this.handleFilePickerClick}
                  ?disabled=${this.stagedImages.length >= MAX_IMAGES}
                >
                  Datei auswählen
                </button>
              </div>
            </div>
          </div>

          ${this.isDragOver ? html`
            <div class="quick-todo-modal__drop-overlay">
              <div class="quick-todo-modal__drop-overlay-content">
                Datei hier ablegen
              </div>
            </div>
          ` : nothing}

          <footer class="quick-todo-modal__footer">
            <button
              class="quick-todo-modal__cancel-btn"
              @click=${() => this.closeModal()}
              ?disabled=${this.isSaving}
            >
              Abbrechen
            </button>
            <button
              class="quick-todo-modal__save-btn"
              @click=${this.handleSave}
              ?disabled=${isSaveDisabled}
            >
              ${this.isSaving ? 'Speichert...' : 'Speichern'}
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
    'aos-quick-todo-modal': AosQuickTodoModal;
  }
}
