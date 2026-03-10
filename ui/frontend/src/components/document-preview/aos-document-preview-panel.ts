import { LitElement, html, svg } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { gateway, type WebSocketMessage, type MessageHandler } from '../../gateway.js';
import '../docs/aos-docs-viewer.js';
import '../file-editor/aos-file-editor.js';
import type { AosFileEditor } from '../file-editor/aos-file-editor.js';

/**
 * Document Preview Panel
 *
 * Overlay side-panel sliding in from the left for previewing and editing
 * documents generated during Claude Code workflows.
 *
 * Features:
 * - Slide in/out animation from left (follows aos-file-tree-sidebar pattern)
 * - View mode: Markdown rendering via aos-docs-viewer (embedded)
 * - Edit mode: CodeMirror editor via aos-file-editor
 * - Save via WebSocket (document-preview.save)
 * - Unsaved changes warning on content switch
 * - Gateway integration for open/close/save messages
 */
@customElement('aos-document-preview-panel')
export class AosDocumentPreviewPanel extends LitElement {
  @property({ type: Boolean }) isOpen = false;
  @property({ type: String }) content = '';
  @property({ type: String }) filePath = '';

  @state() private isEditing = false;
  @state() private hasUnsavedChanges = false;
  @state() private editContent = '';
  @state() private isSaving = false;
  @state() private saveSuccess = false;
  @state() private saveError = '';

  private boundHandlers: Map<string, MessageHandler> = new Map();

  // Light DOM for styling compatibility
  override createRenderRoot() {
    return this;
  }

  private static stylesInjected = false;

  private ensureStyles() {
    if (AosDocumentPreviewPanel.stylesInjected) return;
    AosDocumentPreviewPanel.stylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
      aos-document-preview-panel {
        display: block;
      }

      .doc-preview-panel {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 400px;
        background: var(--color-bg-secondary, #1e1e1e);
        border-right: 1px solid var(--color-border, #404040);
        z-index: 1000;
        display: flex;
        flex-direction: column;
        box-shadow: 5px 0 15px rgba(0, 0, 0, 0.3);
        transform: translateX(-100%);
        transition: transform 0.3s ease;
      }

      .doc-preview-panel.open {
        transform: translateX(0);
      }

      .doc-preview-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid var(--color-border, #404040);
        background: var(--color-bg-tertiary, #252526);
        min-height: 20px;
      }

      .doc-preview-header-left {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        flex: 1;
      }

      .doc-preview-title-icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        color: var(--color-accent-primary, #007acc);
      }

      .doc-preview-filename {
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text-primary, #e0e0e0);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .doc-preview-actions {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
      }

      .doc-preview-btn {
        background: transparent;
        border: none;
        color: var(--color-text-secondary, #a0a0a0);
        cursor: pointer;
        padding: 6px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .doc-preview-btn:hover {
        background: var(--color-bg-hover, #3c3c3c);
        color: var(--color-text-primary, #e0e0e0);
      }

      .doc-preview-btn svg {
        width: 16px;
        height: 16px;
      }

      .doc-preview-btn--active {
        color: var(--color-accent-primary, #007acc);
      }

      .doc-preview-content {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }

      .doc-preview-content aos-docs-viewer {
        flex: 1;
      }

      .doc-preview-content .file-editor {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .doc-preview-content .editor-codemirror {
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      .doc-preview-save-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        border-top: 1px solid var(--color-border, #404040);
        background: var(--color-bg-tertiary, #252526);
        gap: 8px;
      }

      .doc-preview-save-btn {
        padding: 6px 16px;
        background: var(--color-accent-primary, #007acc);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: background 0.2s;
      }

      .doc-preview-save-btn:hover {
        background: var(--color-accent-primary-hover, #0062a3);
      }

      .doc-preview-save-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .doc-preview-save-status {
        font-size: 12px;
        color: var(--color-text-secondary, #a0a0a0);
      }

      .doc-preview-save-status--success {
        color: var(--color-success, #4caf50);
      }

      .doc-preview-save-status--error {
        color: var(--color-error, #f44336);
      }

      .doc-preview-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 2rem;
        text-align: center;
        color: var(--color-text-secondary, #a0a0a0);
      }

      .doc-preview-error svg {
        width: 48px;
        height: 48px;
        margin-bottom: 1rem;
        color: var(--color-text-muted, #666);
      }
    `;
    document.head.appendChild(style);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.setupGatewayHandlers();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeGatewayHandlers();
  }

  private setupGatewayHandlers(): void {
    const handlers: [string, MessageHandler][] = [
      ['document-preview.save.response', (msg) => this.onSaveResponse(msg)],
      ['document-preview.error', (msg) => this.onPreviewError(msg)],
    ];

    for (const [type, handler] of handlers) {
      this.boundHandlers.set(type, handler);
      gateway.on(type, handler);
    }
  }

  private removeGatewayHandlers(): void {
    for (const [type, handler] of this.boundHandlers) {
      gateway.off(type, handler);
    }
    this.boundHandlers.clear();
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('content') && changedProperties.get('content') !== undefined) {
      const oldContent = changedProperties.get('content') as string;
      if (oldContent !== this.content) {
        this.onContentChanged(oldContent);
      }
    }
    if (changedProperties.has('isOpen') && !this.isOpen) {
      this.resetState();
    }
  }

  private onContentChanged(oldContent: string): void {
    if (this.hasUnsavedChanges && oldContent !== '') {
      const discard = confirm('Ungespeicherte Aenderungen verwerfen?');
      if (!discard) {
        // Revert to old content - user wants to keep editing
        this.content = oldContent;
        return;
      }
    }
    // Reset edit state for new content
    this.isEditing = false;
    this.hasUnsavedChanges = false;
    this.editContent = this.content;
    this.saveSuccess = false;
    this.saveError = '';
  }

  private resetState(): void {
    this.isEditing = false;
    this.hasUnsavedChanges = false;
    this.editContent = '';
    this.isSaving = false;
    this.saveSuccess = false;
    this.saveError = '';
  }

  private onSaveResponse(msg: WebSocketMessage): void {
    this.isSaving = false;
    if (msg.success) {
      this.saveSuccess = true;
      this.saveError = '';
      this.hasUnsavedChanges = false;
      // Update base content to match saved content
      this.content = this.editContent;
      // Mark editor as saved
      const editor = this.querySelector('aos-file-editor') as AosFileEditor | null;
      if (editor) {
        editor.markSaveSuccess();
      }
      // Clear success indicator after delay
      setTimeout(() => {
        this.saveSuccess = false;
      }, 2000);
    } else {
      this.saveError = (msg.message as string) || 'Speichern fehlgeschlagen';
      const editor = this.querySelector('aos-file-editor') as AosFileEditor | null;
      if (editor) {
        editor.markSaveError(this.saveError);
      }
    }
  }

  private onPreviewError(msg: WebSocketMessage): void {
    this.saveError = (msg.error as string) || 'Ein Fehler ist aufgetreten';
  }

  private _handleToggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.editContent = this.content;
    }
  }

  private _handleEditorContentChanged(e: CustomEvent<{ content: string; hasUnsavedChanges: boolean }>): void {
    this.editContent = e.detail.content;
    this.hasUnsavedChanges = e.detail.hasUnsavedChanges;
    this.saveSuccess = false;
    this.saveError = '';
  }

  private _handleSave(): void {
    if (!this.hasUnsavedChanges || this.isSaving) return;

    this.isSaving = true;
    this.saveError = '';
    gateway.send({
      type: 'document-preview.save',
      filePath: this.filePath,
      content: this.editContent,
      timestamp: new Date().toISOString(),
    });
  }

  private _handleClose(): void {
    if (this.hasUnsavedChanges) {
      const discard = confirm('Ungespeicherte Aenderungen verwerfen?');
      if (!discard) return;
    }
    this.dispatchEvent(
      new CustomEvent('close', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private get displayFilename(): string {
    if (!this.filePath) return '';
    return this.filePath.split('/').pop() || this.filePath;
  }

  override render() {
    this.ensureStyles();

    return html`
      <div class="doc-preview-panel ${this.isOpen ? 'open' : ''}">
        <div class="doc-preview-header">
          <div class="doc-preview-header-left">
            <svg class="doc-preview-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span class="doc-preview-filename" title="${this.filePath}">${this.displayFilename}</span>
          </div>
          <div class="doc-preview-actions">
            ${this.content ? html`
              <button
                class="doc-preview-btn ${this.isEditing ? 'doc-preview-btn--active' : ''}"
                @click=${this._handleToggleEdit}
                title="${this.isEditing ? 'Vorschau anzeigen' : 'Bearbeiten'}"
              >
                ${this.isEditing
                  ? svg`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
                  : svg`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`
                }
              </button>
            ` : null}
            <button
              class="doc-preview-btn"
              @click=${this._handleClose}
              title="Schliessen"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div class="doc-preview-content">
          ${this.renderContent()}
        </div>

        ${this.isEditing ? this.renderSaveBar() : null}
      </div>
    `;
  }

  private renderContent() {
    if (!this.content && !this.filePath) {
      return html`
        <div class="doc-preview-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <p>Kein Dokument geladen</p>
        </div>
      `;
    }

    if (this.isEditing) {
      return html`
        <aos-file-editor
          .content=${this.content}
          .filename=${this.displayFilename}
          @content-changed=${this._handleEditorContentChanged}
          @save-requested=${this._handleSave}
        ></aos-file-editor>
      `;
    }

    return html`
      <aos-docs-viewer
        .content=${this.content}
        .filename=${this.displayFilename}
        .embedded=${true}
      ></aos-docs-viewer>
    `;
  }

  private renderSaveBar() {
    return html`
      <div class="doc-preview-save-bar">
        <span class="doc-preview-save-status ${this.saveSuccess ? 'doc-preview-save-status--success' : ''} ${this.saveError ? 'doc-preview-save-status--error' : ''}">
          ${this.saveSuccess ? 'Gespeichert' : ''}
          ${this.saveError ? this.saveError : ''}
          ${!this.saveSuccess && !this.saveError && this.hasUnsavedChanges ? 'Ungespeicherte Aenderungen' : ''}
        </span>
        <button
          class="doc-preview-save-btn"
          @click=${this._handleSave}
          ?disabled=${!this.hasUnsavedChanges || this.isSaving}
        >
          ${this.isSaving ? 'Speichert...' : 'Speichern'}
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-document-preview-panel': AosDocumentPreviewPanel;
  }
}
