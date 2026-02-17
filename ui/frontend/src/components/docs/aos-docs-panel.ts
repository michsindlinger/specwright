import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { gateway, WebSocketMessage } from '../../gateway.js';
import './aos-docs-sidebar.js';
import './aos-docs-viewer.js';
import './aos-docs-editor.js';
import type { DocFile } from './aos-docs-sidebar.js';
import type { AosDocsEditor } from './aos-docs-editor.js';
import type { AosDocsSidebar } from './aos-docs-sidebar.js';

type DocsViewMode = 'viewing' | 'editing';

@customElement('aos-docs-panel')
export class AosDocsPanel extends LitElement {
  @property({ type: Boolean }) active = false;

  @state() private docs: DocFile[] = [];
  @state() private selectedDoc: string | null = null;
  @state() private docContent = '';
  @state() private viewMode: DocsViewMode = 'viewing';
  @state() private hasUnsavedChanges = false;
  @state() private loading = true;
  @state() private loadingDoc = false;
  @state() private saving = false;
  @state() private error = '';
  @state() private docError = '';

  private boundHandlers: Map<string, (msg: WebSocketMessage) => void> = new Map();

  override connectedCallback() {
    super.connectedCallback();
    this.setupHandlers();
    if (this.active) {
      this.loadDocs();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeHandlers();
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('active') && this.active) {
      this.loadDocs();
    }
  }

  private setupHandlers(): void {
    const handlers: [string, (msg: WebSocketMessage) => void][] = [
      ['docs.list', (msg) => this.onDocsList(msg)],
      ['docs.read', (msg) => this.onDocsContent(msg)],
      ['docs.saved', (msg) => this.onDocsSaved(msg)],
      ['docs.error', (msg) => this.onDocsError(msg)]
    ];

    for (const [type, handler] of handlers) {
      this.boundHandlers.set(type, handler);
      gateway.on(type, handler);
    }
  }

  private removeHandlers(): void {
    for (const [type, handler] of this.boundHandlers) {
      gateway.off(type, handler);
    }
    this.boundHandlers.clear();
  }

  private loadDocs(): void {
    this.loading = true;
    this.error = '';
    gateway.send({ type: 'docs.list' });
  }

  private onDocsList(msg: WebSocketMessage): void {
    const files = msg.files as DocFile[] | undefined;
    this.docs = files || [];
    this.loading = false;

    if (msg.message) {
      this.error = msg.message as string;
    }
  }

  private onDocsContent(msg: WebSocketMessage): void {
    const filename = msg.filename as string;
    const content = msg.content as string;

    if (filename === this.selectedDoc) {
      this.docContent = content;
      this.loadingDoc = false;
      this.docError = '';
    }
  }

  private onDocsSaved(msg: WebSocketMessage): void {
    this.saving = false;
    this.hasUnsavedChanges = false;
    this.viewMode = 'viewing';

    const editor = this.querySelector('aos-docs-editor') as AosDocsEditor | null;
    if (editor) {
      editor.markSaveSuccess();
    }

    if (msg.timestamp) {
      this.loadDocs();
    }
  }

  private onDocsError(msg: WebSocketMessage): void {
    const errorMessage = (msg.error as string) || 'Ein Fehler ist aufgetreten';
    const code = msg.code as number | undefined;

    if (this.saving) {
      this.saving = false;
      const editor = this.querySelector('aos-docs-editor') as AosDocsEditor | null;
      if (editor) {
        editor.markSaveError(errorMessage);
      }
    } else if (this.loadingDoc) {
      this.loadingDoc = false;
      this.docError = errorMessage;
    } else if (this.loading) {
      this.loading = false;
      this.error = errorMessage;
    } else {
      if (code === 404) {
        this.docError = 'Dokument nicht gefunden';
      } else {
        this.error = errorMessage;
      }
    }
  }

  private handleDocSelected(e: CustomEvent): void {
    const filename = e.detail.filename as string;

    if (this.hasUnsavedChanges) {
      return;
    }

    this.selectedDoc = filename;
    this.loadingDoc = true;
    this.docError = '';
    this.docContent = '';
    this.viewMode = 'viewing';
    gateway.send({ type: 'docs.read', filename });
  }

  private handleUnsavedChangesWarning(e: CustomEvent): void {
    const pendingFilename = e.detail.pendingFilename as string;

    const choice = window.confirm(
      'Sie haben ungespeicherte Änderungen. Möchten Sie fortfahren und die Änderungen verwerfen?'
    );

    const sidebar = this.querySelector('aos-docs-sidebar') as AosDocsSidebar | null;
    if (sidebar) {
      sidebar.confirmNavigation(choice ? 'discard' : 'cancel');
    }

    if (choice) {
      this.hasUnsavedChanges = false;
      this.selectedDoc = pendingFilename;
      this.loadingDoc = true;
      this.docError = '';
      this.docContent = '';
      this.viewMode = 'viewing';
      gateway.send({ type: 'docs.read', filename: pendingFilename });
    }
  }

  private handleSaveRequested(): void {
    this.handleDocSaved(new CustomEvent('doc-saved', {
      detail: {
        filename: this.selectedDoc,
        content: this.docContent
      }
    }));
  }

  private handleEditRequested(): void {
    this.viewMode = 'editing';
    this.hasUnsavedChanges = false;
  }

  private handleEditCancelled(): void {
    this.viewMode = 'viewing';
    this.hasUnsavedChanges = false;
  }

  private handleDocSaved(e: CustomEvent): void {
    const { filename, content } = e.detail as { filename: string; content: string };

    this.saving = true;
    this.docContent = content;
    gateway.send({ type: 'docs.write', filename, content });
  }

  private handleRetryRequested(): void {
    if (this.selectedDoc) {
      this.loadingDoc = true;
      this.docError = '';
      gateway.send({ type: 'docs.read', filename: this.selectedDoc });
    }
  }

  public checkUnsavedChanges(): boolean {
    return this.hasUnsavedChanges;
  }

  public confirmTabChange(action: 'save' | 'discard' | 'cancel'): void {
    if (action === 'cancel') {
      return;
    }

    if (action === 'save' && this.selectedDoc) {
      const editor = this.querySelector('aos-docs-editor') as AosDocsEditor | null;
      if (editor) {
        this.handleDocSaved(new CustomEvent('doc-saved', {
          detail: {
            filename: this.selectedDoc,
            content: this.docContent
          }
        }));
      }
    }

    if (action === 'discard') {
      this.hasUnsavedChanges = false;
    }
  }

  private updateUnsavedState(): void {
    const editor = this.querySelector('aos-docs-editor') as AosDocsEditor | null;
    if (editor && this.viewMode === 'editing') {
      this.hasUnsavedChanges = true;
    }
  }

  override render() {
    if (this.loading) {
      return html`
        <div class="docs-panel">
          <div class="docs-panel-loading">
            <div class="loading-spinner"></div>
            <p>Dokumente werden geladen...</p>
          </div>
        </div>
      `;
    }

    if (this.error && this.docs.length === 0) {
      return html`
        <div class="docs-panel">
          <div class="docs-panel-empty">
            <span class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
            <h3>Keine Projekt-Dokumente gefunden</h3>
            <p>${this.error}</p>
          </div>
        </div>
      `;
    }

    return html`
      <div class="docs-panel">
        <aos-docs-sidebar
          .docs=${this.docs}
          .selectedDoc=${this.selectedDoc}
          .hasUnsavedChanges=${this.hasUnsavedChanges}
          @doc-selected=${this.handleDocSelected}
          @unsaved-changes-warning=${this.handleUnsavedChangesWarning}
          @save-requested=${this.handleSaveRequested}
        ></aos-docs-sidebar>

        <div class="docs-panel-content">
          ${this.viewMode === 'editing' && this.selectedDoc
            ? html`
                <aos-docs-editor
                  .content=${this.docContent}
                  .filename=${this.selectedDoc}
                  .saving=${this.saving}
                  @doc-saved=${this.handleDocSaved}
                  @edit-cancelled=${this.handleEditCancelled}
                  @input=${this.updateUnsavedState}
                ></aos-docs-editor>
              `
            : html`
                <aos-docs-viewer
                  .content=${this.docContent}
                  .filename=${this.selectedDoc || ''}
                  .loading=${this.loadingDoc}
                  .error=${this.docError}
                  .editable=${true}
                  @edit-requested=${this.handleEditRequested}
                  @retry-requested=${this.handleRetryRequested}
                ></aos-docs-viewer>
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
    'aos-docs-panel': AosDocsPanel;
  }
}
