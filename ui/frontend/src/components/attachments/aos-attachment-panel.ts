import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { gateway, WebSocketMessage } from '../../gateway.js';
import { readFileAsDataUrl, validateFile } from '../../utils/image-upload.utils.js';
import '../aos-confirm-dialog.js';
import '../aos-image-lightbox.js';

/**
 * Attachment data structure from backend
 */
export interface Attachment {
  filename: string;
  size: number;
  mimeType: string;
  path: string;
  createdAt: string;
}

/**
 * Reusable attachment panel component for managing file attachments.
 * Supports file picker, drag & drop, and clipboard paste for uploads.
 *
 * @fires show-toast - Dispatched when there are notifications to show
 */
@customElement('aos-attachment-panel')
export class AosAttachmentPanel extends LitElement {
  /**
   * Context type: 'spec' or 'backlog'
   */
  @property({ type: String }) contextType: 'spec' | 'backlog' = 'spec';

  /**
   * Spec ID (required if contextType is 'spec')
   */
  @property({ type: String }) specId = '';

  /**
   * Story ID (required if contextType is 'spec')
   */
  @property({ type: String }) storyId = '';

  /**
   * Item ID (required if contextType is 'backlog')
   */
  @property({ type: String }) itemId = '';

  /**
   * List of attachments
   */
  @state()
  private attachments: Attachment[] = [];

  /**
   * Whether a file upload is in progress
   */
  @state()
  private isUploading = false;

  /**
   * Error message to display
   */
  @state()
  private error = '';

  /**
   * Whether drag & drop is active
   */
  @state()
  private isDragging = false;

  /**
   * File pending deletion (for confirmation dialog)
   */
  @state()
  private pendingDeleteFile: Attachment | null = null;

  /**
   * Currently previewing attachment
   */
  @state()
  private previewAttachment: Attachment | null = null;

  /**
   * Preview content (text or base64 for images)
   */
  @state()
  private previewContent = '';

  /**
   * Whether preview is loading
   */
  @state()
  private previewLoading = false;

  /**
   * Preview error message
   */
  @state()
  private previewError = '';

  /**
   * Gateway message handlers
   */
  private uploadHandler: ((msg: WebSocketMessage) => void) | null = null;
  private listHandler: ((msg: WebSocketMessage) => void) | null = null;
  private deleteHandler: ((msg: WebSocketMessage) => void) | null = null;
  private readHandler: ((msg: WebSocketMessage) => void) | null = null;

  private boundKeyHandler = this.handleKeyDown.bind(this);

  override connectedCallback(): void {
    super.connectedCallback();
    this.registerHandlers();
    this.loadAttachments();
    document.addEventListener('keydown', this.boundKeyHandler);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unregisterHandlers();
    document.removeEventListener('keydown', this.boundKeyHandler);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.previewAttachment) return;
    if (e.key === 'Escape') {
      this.closePreview();
    } else if (this.isImagePreview()) {
      if (e.key === 'ArrowLeft') this.showPreviousImage();
      else if (e.key === 'ArrowRight') this.showNextImage();
    }
  }

  private isImagePreview(): boolean {
    return !!this.previewAttachment?.mimeType.startsWith('image/');
  }

  private get imageAttachments(): Attachment[] {
    return this.attachments.filter(a => a.mimeType.startsWith('image/'));
  }

  private get currentImageIndex(): number {
    if (!this.previewAttachment) return -1;
    return this.imageAttachments.findIndex(a => a.filename === this.previewAttachment!.filename);
  }

  private showPreviousImage(): void {
    const images = this.imageAttachments;
    const idx = this.currentImageIndex;
    if (idx > 0) this.handlePreviewClick(images[idx - 1]);
  }

  private showNextImage(): void {
    const images = this.imageAttachments;
    const idx = this.currentImageIndex;
    if (idx < images.length - 1) this.handlePreviewClick(images[idx + 1]);
  }

  private registerHandlers(): void {
    this.uploadHandler = (msg: WebSocketMessage) => {
      const data = (msg as { data?: { success?: boolean; filename?: string; error?: string } }).data;
      this.isUploading = false;
      if (data?.success && data.filename) {
        this.showToast(`Datei "${data.filename}" hochgeladen`, 'success');
        this.loadAttachments();
      } else {
        this.showToast(data?.error || 'Upload fehlgeschlagen', 'error');
      }
    };

    this.listHandler = (msg: WebSocketMessage) => {
      const data = (msg as { data?: { attachments?: Attachment[]; count?: number } }).data;
      if (data?.attachments) {
        this.attachments = data.attachments;
      }
    };

    this.deleteHandler = (msg: WebSocketMessage) => {
      const data = (msg as { data?: { success?: boolean; filename?: string; error?: string } }).data;
      if (data?.success && data.filename) {
        this.showToast(`Datei "${data.filename}" gelöscht`, 'success');
        this.loadAttachments();
      } else {
        this.showToast(data?.error || 'Löschen fehlgeschlagen', 'error');
      }
    };

    this.readHandler = (msg: WebSocketMessage) => {
      const data = (msg as { data?: { success?: boolean; content?: string; mimeType?: string; filename?: string; isBase64?: boolean; error?: string } }).data;
      this.previewLoading = false;
      if (data?.success && data.content !== undefined) {
        this.previewContent = data.content;
      } else {
        this.previewError = data?.error || 'Datei konnte nicht gelesen werden';
        this.showToast(this.previewError, 'error');
      }
    };

    gateway.on('attachment:upload:response', this.uploadHandler);
    gateway.on('attachment:list:response', this.listHandler);
    gateway.on('attachment:delete:response', this.deleteHandler);
    gateway.on('attachment:read:response', this.readHandler);
  }

  private unregisterHandlers(): void {
    if (this.uploadHandler) {
      gateway.off('attachment:upload:response', this.uploadHandler);
    }
    if (this.listHandler) {
      gateway.off('attachment:list:response', this.listHandler);
    }
    if (this.deleteHandler) {
      gateway.off('attachment:delete:response', this.deleteHandler);
    }
    if (this.readHandler) {
      gateway.off('attachment:read:response', this.readHandler);
    }
  }

  private loadAttachments(): void {
    gateway.requestAttachmentList(
      this.contextType,
      this.contextType === 'spec' ? this.specId : undefined,
      this.contextType === 'spec' ? this.storyId : undefined,
      this.contextType === 'backlog' ? this.itemId : undefined
    );
  }

  private handleFileSelect(files: FileList | null): void {
    if (!files || files.length === 0) return;

    this.error = '';
    this.uploadFiles(Array.from(files));
  }

  private async uploadFiles(files: File[]): Promise<void> {
    // Validate first file
    const firstError = validateFile(files[0], this.attachments.length);
    if (firstError) {
      this.error = firstError;
      this.showToast(firstError, 'error');
      return;
    }

    this.isUploading = true;
    this.error = '';

    // Upload files sequentially to avoid overloading WebSocket
    for (const file of files) {
      try {
        const validationError = validateFile(file, this.attachments.length);
        if (validationError) {
          this.showToast(`"${file.name}": ${validationError}`, 'error');
          continue;
        }

        const data = await readFileAsDataUrl(file);
        const base64Data = data.split(',')[1]; // Remove data URL prefix

        gateway.sendAttachmentUpload(
          this.contextType,
          this.contextType === 'spec' ? this.specId : undefined,
          this.contextType === 'spec' ? this.storyId : undefined,
          this.contextType === 'backlog' ? this.itemId : undefined,
          base64Data,
          file.name,
          file.type
        );

        // Small delay between sequential uploads
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch {
        this.showToast(`"${file.name}" konnte nicht gelesen werden`, 'error');
      }
    }

    // Reset uploading state after all files processed
    // Note: Actual state update happens when response is received
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
  }

  private handleDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelect(files);
    }
  }

  private handlePaste(e: ClipboardEvent): void {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          // Generate a name for clipboard images
          const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
          const renamedFile = new File([file], `clipboard-${timestamp}.png`, { type: item.type });
          imageFiles.push(renamedFile);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      this.uploadFiles(imageFiles);
    }
  }

  private handleFileInputChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    this.handleFileSelect(target.files);
    // Reset input so same file can be selected again
    target.value = '';
  }

  private triggerFilePicker(): void {
    const input = this.shadowRoot?.querySelector<HTMLInputElement>('.upload-zone__input');
    input?.click();
  }

  private handleDeleteClick(attachment: Attachment): void {
    this.pendingDeleteFile = attachment;
  }

  private confirmDelete(): void {
    if (!this.pendingDeleteFile) return;

    gateway.sendAttachmentDelete(
      this.contextType,
      this.contextType === 'spec' ? this.specId : undefined,
      this.contextType === 'spec' ? this.storyId : undefined,
      this.contextType === 'backlog' ? this.itemId : undefined,
      this.pendingDeleteFile.filename
    );

    this.pendingDeleteFile = null;
  }

  private cancelDelete(): void {
    this.pendingDeleteFile = null;
  }

  private handlePreviewClick(attachment: Attachment): void {
    this.previewAttachment = attachment;
    this.previewContent = '';
    this.previewError = '';
    this.previewLoading = true;

    gateway.requestAttachmentRead(
      this.contextType,
      this.contextType === 'spec' ? this.specId : undefined,
      this.contextType === 'spec' ? this.storyId : undefined,
      this.contextType === 'backlog' ? this.itemId : undefined,
      attachment.filename
    );
  }

  private closePreview(): void {
    this.previewAttachment = null;
    this.previewContent = '';
    this.previewError = '';
  }

  private getPreviewContent(): unknown {
    if (!this.previewAttachment) return nothing;

    const mimeType = this.previewAttachment.mimeType;

    if (mimeType.startsWith('image/') && this.previewContent) {
      // Return data URL for images
      return html`
        <div class="preview-image-container">
          <img
            src="data:${mimeType};base64,${this.previewContent}"
            alt="${this.previewAttachment.filename}"
            class="preview-image"
          />
        </div>
      `;
    }

    if (mimeType === 'application/pdf' && this.previewContent) {
      return html`
        <div class="preview-pdf-container">
          <iframe
            src="data:application/pdf;base64,${this.previewContent}"
            class="preview-pdf"
          ></iframe>
          <a
            href="data:application/pdf;base64,${this.previewContent}"
            download="${this.previewAttachment.filename}"
            class="preview-download-btn"
          >
            Herunterladen
          </a>
        </div>
      `;
    }

    if (mimeType === 'application/json' && this.previewContent) {
      try {
        const parsed = JSON.parse(this.previewContent);
        const formatted = JSON.stringify(parsed, null, 2);
        return html`
          <pre class="preview-text preview-json">${formatted}</pre>
        `;
      } catch {
        return html`
          <pre class="preview-text">${this.previewContent}</pre>
        `;
      }
    }

    if ((mimeType === 'text/plain' || mimeType === 'text/markdown') && this.previewContent) {
      return html`
        <pre class="preview-text">${this.previewContent}</pre>
      `;
    }

    return nothing;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  private getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.startsWith('text/')) return '📝';
    if (mimeType === 'application/json') return '📋';
    return '📎';
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

  override render() {
    return html`
      <div
        class="attachment-panel"
        @paste=${this.handlePaste}
        tabindex="0"
      >
        <!-- Upload Zone -->
        <div
          class="upload-zone ${this.isDragging ? 'upload-zone--dragging' : ''} ${this.isUploading ? 'upload-zone--uploading' : ''}"
          @dragover=${this.handleDragOver}
          @dragleave=${this.handleDragLeave}
          @drop=${this.handleDrop}
        >
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,application/json,text/markdown"
            class="upload-zone__input"
            @change=${this.handleFileInputChange}
            ?disabled=${this.isUploading}
          />

          <div class="upload-zone__content">
            ${this.isUploading
              ? html`
                  <div class="upload-zone__spinner"></div>
                  <span>Wird hochgeladen...</span>
                `
              : html`
                  <div class="upload-zone__icon">📎</div>
                  <span class="upload-zone__text">
                    Dateien hierher ziehen oder
                    <button class="upload-zone__browse-btn" @click=${this.triggerFilePicker} ?disabled=${this.isUploading}>
                      durchsuchen
                    </button>
                  </span>
                  <span class="upload-zone__hint">Strg+V zum Einfügen • Max. 5MB</span>
                `}
          </div>
        </div>

        <!-- Error Message -->
        ${this.error ? html`
          <div class="attachment-panel__error">${this.error}</div>
        ` : nothing}

        <!-- Attachment List -->
        ${this.attachments.length > 0 ? html`
          <div class="attachment-list">
            <h4 class="attachment-list__title">Anhänge (${this.attachments.length})</h4>
            <ul class="attachment-list__items">
              ${this.attachments.map(
                (attachment) => html`
                  <li class="attachment-item" @click=${() => this.handlePreviewClick(attachment)} title="Vorschau anzeigen">
                    <span class="attachment-item__icon-area">
                      ${attachment.mimeType.startsWith('image/')
                        ? html`<span class="attachment-item__thumbnail">🖼</span>`
                        : html`<span class="attachment-item__icon">${this.getFileIcon(attachment.mimeType)}</span>`
                      }
                    </span>
                    <span class="attachment-item__info">
                      <span class="attachment-item__name">${attachment.filename}</span>
                      <span class="attachment-item__size">${this.formatFileSize(attachment.size)}</span>
                    </span>
                    <button
                      class="attachment-item__delete"
                      @click=${(e: Event) => { e.stopPropagation(); this.handleDeleteClick(attachment); }}
                      title="Löschen"
                      aria-label="Datei löschen"
                    >
                      ✕
                    </button>
                  </li>
                `
              )}
            </ul>
          </div>
        ` : nothing}

        <!-- Image Lightbox -->
        ${this.previewAttachment && this.isImagePreview() ? html`
          <div class="lightbox-overlay" @click=${this.closePreview}>
            <!-- Close button -->
            <button class="lightbox-close" @click=${this.closePreview} aria-label="Schließen">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <!-- Navigation -->
            ${this.imageAttachments.length > 1 ? html`
              <button class="lightbox-nav lightbox-nav--prev"
                @click=${(e: Event) => { e.stopPropagation(); this.showPreviousImage(); }}
                ?disabled=${this.currentImageIndex <= 0}
                aria-label="Vorheriges Bild">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <button class="lightbox-nav lightbox-nav--next"
                @click=${(e: Event) => { e.stopPropagation(); this.showNextImage(); }}
                ?disabled=${this.currentImageIndex >= this.imageAttachments.length - 1}
                aria-label="Nächstes Bild">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            ` : nothing}

            <!-- Image -->
            <div class="lightbox-container" @click=${(e: Event) => e.stopPropagation()}>
              ${this.previewLoading ? html`
                <div class="lightbox-loading"><div class="preview-spinner"></div></div>
              ` : this.previewContent ? html`
                <img
                  src="data:${this.previewAttachment.mimeType};base64,${this.previewContent}"
                  alt="${this.previewAttachment.filename}"
                  class="lightbox-image"
                />
              ` : nothing}
            </div>

            <!-- Info bar -->
            <div class="lightbox-info">
              <span class="lightbox-filename">${this.previewAttachment.filename}</span>
              ${this.imageAttachments.length > 1 ? html`
                <span class="lightbox-counter">${this.currentImageIndex + 1} / ${this.imageAttachments.length}</span>
              ` : nothing}
            </div>
          </div>
        ` : nothing}

        <!-- Non-image Preview Modal -->
        ${this.previewAttachment && !this.isImagePreview() ? html`
          <div class="preview-overlay" @click=${this.closePreview}>
            <div class="preview-modal" @click=${(e: Event) => e.stopPropagation()}>
              <div class="preview-header">
                <h3 class="preview-title">${this.previewAttachment.filename}</h3>
                <button class="preview-close" @click=${this.closePreview} aria-label="Schließen">✕</button>
              </div>
              <div class="preview-content">
                ${this.previewLoading ? html`
                  <div class="preview-loading">
                    <div class="preview-spinner"></div>
                    <span>Wird geladen...</span>
                  </div>
                ` : this.previewError ? html`
                  <div class="preview-error">${this.previewError}</div>
                ` : this.getPreviewContent()}
              </div>
            </div>
          </div>
        ` : nothing}

        <!-- Delete Confirmation Dialog -->
        <aos-confirm-dialog
          .open=${this.pendingDeleteFile !== null}
          title="Datei löschen"
          message=${this.pendingDeleteFile
            ? `Möchten Sie "${this.pendingDeleteFile.filename}" wirklich löschen?`
            : ''}
          confirmText="Löschen"
          @confirm=${this.confirmDelete}
          @cancel=${this.cancelDelete}
        ></aos-confirm-dialog>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      font-family: var(--font-family-sans, 'Space Grotesk', system-ui, -apple-system, sans-serif);
    }

    .attachment-panel {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md, 1rem);
      padding: var(--spacing-md, 1rem);
      background: var(--color-bg-secondary, #1a1a1a);
      border-radius: var(--radius-md, 0.5rem);
      border: 1px solid var(--color-border, #333333);
      max-height: 80vh;
      overflow-y: auto;
    }

    .attachment-panel:focus {
      outline: none;
    }

    .upload-zone {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 120px;
      padding: var(--spacing-lg, 1.5rem);
      border: 2px dashed var(--color-border, #333333);
      border-radius: var(--radius-md, 0.5rem);
      background: var(--color-bg-tertiary, #262626);
      cursor: pointer;
      transition: all var(--transition-normal, 250ms ease);
    }

    .upload-zone:hover {
      border-color: var(--color-border-hover, #404040);
      background: var(--color-bg-elevated, #2d2d2d);
    }

    .upload-zone--dragging {
      border-color: var(--color-accent-primary, #22c55e);
      background: rgba(34, 197, 94, 0.1);
    }

    .upload-zone--uploading {
      cursor: wait;
      opacity: 0.7;
    }

    .upload-zone__input {
      position: absolute;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    }

    .upload-zone__input:disabled {
      cursor: wait;
    }

    .upload-zone__content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-sm, 0.5rem);
      pointer-events: none;
    }

    .upload-zone__icon {
      font-size: 2rem;
    }

    .upload-zone__text {
      color: var(--color-text-secondary, #a3a3a3);
      font-size: var(--font-size-sm, 0.875rem);
    }

    .upload-zone__browse-btn {
      background: none;
      border: none;
      color: var(--color-accent-secondary, #3b82f6);
      cursor: pointer;
      font-size: inherit;
      text-decoration: underline;
      pointer-events: auto;
    }

    .upload-zone__browse-btn:hover {
      color: var(--color-accent-primary, #22c55e);
    }

    .upload-zone__browse-btn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .upload-zone__hint {
      color: var(--color-text-muted, #737373);
      font-size: var(--font-size-xs, 0.75rem);
    }

    .upload-zone__spinner {
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

    .attachment-panel__error {
      padding: var(--spacing-sm, 0.5rem);
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--color-accent-error, #ef4444);
      border-radius: var(--radius-sm, 0.25rem);
      color: var(--color-accent-error, #ef4444);
      font-size: var(--font-size-sm, 0.875rem);
    }

    .attachment-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm, 0.5rem);
    }

    .attachment-list__title {
      margin: 0;
      color: var(--color-text-primary, #ffffff);
      font-size: var(--font-size-sm, 0.875rem);
      font-weight: var(--font-weight-medium, 500);
    }

    .attachment-list__items {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs, 0.25rem);
    }

    .attachment-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm, 0.5rem);
      padding: var(--spacing-sm, 0.5rem);
      background: var(--color-bg-tertiary, #262626);
      border-radius: var(--radius-sm, 0.25rem);
      border: 1px solid var(--color-border, #333333);
      cursor: pointer;
      transition: background var(--transition-fast, 150ms ease);
    }

    .attachment-item:hover {
      background: var(--color-bg-elevated, #2d2d2d);
    }

    .attachment-item__icon-area {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      flex-shrink: 0;
    }

    .attachment-item__icon {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .attachment-item__info {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .attachment-item__name {
      color: var(--color-text-primary, #ffffff);
      font-size: var(--font-size-sm, 0.875rem);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .attachment-item__size {
      color: var(--color-text-muted, #737373);
      font-size: var(--font-size-xs, 0.75rem);
    }

    .attachment-item__delete {
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
      flex-shrink: 0;
    }

    .attachment-item__delete:hover {
      background: var(--color-accent-error, #ef4444);
      color: var(--color-text-primary, #ffffff);
    }

    .attachment-item__thumbnail {
      font-size: 1.25rem;
    }

    /* Lightbox Styles (for images) */
    .lightbox-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.92);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }

    .lightbox-close {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 44px;
      height: 44px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 50%;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
      z-index: 10;
    }

    .lightbox-close:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .lightbox-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 50%;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
      z-index: 10;
    }

    .lightbox-nav:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.25);
    }

    .lightbox-nav:disabled {
      opacity: 0.25;
      cursor: default;
    }

    .lightbox-nav--prev { left: 16px; }
    .lightbox-nav--next { right: 16px; }

    .lightbox-container {
      max-width: 90vw;
      max-height: 85vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .lightbox-image {
      max-width: 90vw;
      max-height: 85vh;
      object-fit: contain;
      border-radius: var(--radius-sm, 0.25rem);
      user-select: none;
    }

    .lightbox-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 200px;
      height: 200px;
    }

    .lightbox-info {
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      padding: 8px 16px;
      border-radius: 20px;
      color: white;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 80%;
    }

    .lightbox-filename {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .lightbox-counter {
      opacity: 0.7;
      font-size: 12px;
      flex-shrink: 0;
    }

    /* Non-image Preview Modal Styles */
    .preview-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .preview-modal {
      background: var(--color-bg-secondary, #1a1a1a);
      border-radius: var(--radius-md, 0.5rem);
      border: 1px solid var(--color-border, #333333);
      max-width: 90vw;
      max-height: 90vh;
      width: 800px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .preview-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-md, 1rem);
      border-bottom: 1px solid var(--color-border, #333333);
    }

    .preview-title {
      margin: 0;
      color: var(--color-text-primary, #ffffff);
      font-size: var(--font-size-md, 1rem);
      font-weight: var(--font-weight-medium, 500);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .preview-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      background: none;
      border: none;
      border-radius: var(--radius-sm, 0.25rem);
      color: var(--color-text-muted, #737373);
      cursor: pointer;
      transition: all var(--transition-fast, 150ms ease);
    }

    .preview-close:hover {
      background: var(--color-accent-error, #ef4444);
      color: var(--color-text-primary, #ffffff);
    }

    .preview-content {
      flex: 1;
      overflow: auto;
      padding: var(--spacing-md, 1rem);
      min-height: 200px;
    }

    .preview-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-md, 1rem);
      height: 200px;
      color: var(--color-text-muted, #737373);
    }

    .preview-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--color-border, #333333);
      border-top-color: var(--color-accent-primary, #22c55e);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .preview-error {
      padding: var(--spacing-md, 1rem);
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--color-accent-error, #ef4444);
      border-radius: var(--radius-sm, 0.25rem);
      color: var(--color-accent-error, #ef4444);
      text-align: center;
    }

    .preview-image-container {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .preview-image {
      max-width: 100%;
      max-height: 70vh;
      object-fit: contain;
      border-radius: var(--radius-sm, 0.25rem);
    }

    .preview-pdf-container {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md, 1rem);
      height: 70vh;
    }

    .preview-pdf {
      flex: 1;
      width: 100%;
      border: none;
      border-radius: var(--radius-sm, 0.25rem);
      background: #ffffff;
    }

    .preview-download-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
      background: var(--color-accent-primary, #22c55e);
      color: var(--color-text-primary, #ffffff);
      border: none;
      border-radius: var(--radius-sm, 0.25rem);
      font-size: var(--font-size-sm, 0.875rem);
      cursor: pointer;
      text-decoration: none;
      align-self: center;
    }

    .preview-download-btn:hover {
      background: var(--color-accent-primary-hover, #16a34a);
    }

    .preview-text {
      margin: 0;
      padding: var(--spacing-md, 1rem);
      background: var(--color-bg-tertiary, #262626);
      border-radius: var(--radius-sm, 0.25rem);
      color: var(--color-text-primary, #ffffff);
      font-family: var(--font-family-mono, 'Fira Code', monospace);
      font-size: var(--font-size-sm, 0.875rem);
      white-space: pre-wrap;
      word-break: break-word;
      overflow-x: auto;
    }

    .preview-json {
      color: var(--color-accent-secondary, #3b82f6);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-attachment-panel': AosAttachmentPanel;
  }
}
