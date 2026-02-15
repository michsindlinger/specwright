import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { marked, type Tokens } from 'marked';
import hljs from 'highlight.js';
import './aos-docs-editor.js';

// Checkbox index counter - reset per renderMarkdown() call
let checkboxIndex = 0;

// Configure marked with highlight.js and interactive checkbox renderer
const renderer = {
  code({ text, lang }: Tokens.Code): string {
    const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
    const highlighted = lang && hljs.getLanguage(lang)
      ? hljs.highlight(text, { language }).value
      : hljs.highlightAuto(text).value;
    return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
  },
  checkbox({ checked }: Tokens.Checkbox): string {
    const idx = checkboxIndex++;
    const checkedAttr = checked ? ' checked' : '';
    return `<input type="checkbox" data-checkbox-index="${idx}"${checkedAttr}>`;
  }
};

marked.use({ renderer, gfm: true, breaks: false });

@customElement('aos-docs-viewer')
export class AosDocsViewer extends LitElement {
  @property({ type: String }) content = '';
  @property({ type: String }) filename = '';
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error = '';
  @property({ type: Boolean }) embedded = false;
  @property({ type: Boolean }) editable = false;
  @property({ type: Boolean }) isSaving = false;

  @state() private renderedContent = '';
  @state() private isEditing = false;

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('content')) {
      this.renderMarkdown();
    }
  }

  private renderMarkdown(): void {
    if (!this.content) {
      this.renderedContent = '';
      return;
    }

    try {
      checkboxIndex = 0;
      this.renderedContent = marked.parse(this.content) as string;
    } catch {
      this.renderedContent = `<p class="markdown-error">Fehler beim Rendern des Markdown-Inhalts</p>`;
    }
  }

  private handleContentClick(e: Event): void {
    const target = e.target as HTMLElement;

    // Handle image clicks - open lightbox
    if (target.tagName === 'IMG') {
      this.openImageLightbox(target as HTMLImageElement);
      return;
    }

    // Handle checkbox clicks
    if (target.tagName !== 'INPUT' || target.getAttribute('type') !== 'checkbox') return;
    const idxAttr = target.getAttribute('data-checkbox-index');
    if (idxAttr === null) return;

    e.preventDefault();
    const idx = parseInt(idxAttr, 10);
    const updatedContent = this.toggleCheckboxInMarkdown(this.content, idx);
    if (updatedContent !== null) {
      this.dispatchEvent(
        new CustomEvent('checkbox-toggled', {
          detail: { content: updatedContent },
          bubbles: true,
          composed: true
        })
      );
    }
  }

  private openImageLightbox(img: HTMLImageElement): void {
    const overlay = document.createElement('div');
    overlay.className = 'image-lightbox-overlay';

    const fullImg = document.createElement('img');
    fullImg.src = img.src;
    fullImg.alt = img.alt;

    overlay.appendChild(fullImg);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.addEventListener('click', close);
    fullImg.addEventListener('click', (e) => e.stopPropagation());

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  private toggleCheckboxInMarkdown(markdown: string, targetIndex: number): string | null {
    const lines = markdown.split('\n');
    let inCodeBlock = false;
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Track fenced code block boundaries
      if (line.trimStart().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock) continue;

      // Match checkbox patterns: - [ ] or - [x] or - [X]
      const match = line.match(/^(\s*- \[)([ xX])(\])/);
      if (match) {
        if (currentIndex === targetIndex) {
          const isChecked = match[2] !== ' ';
          const newCheckChar = isChecked ? ' ' : 'x';
          lines[i] = line.replace(/^(\s*- \[)([ xX])(\])/, `$1${newCheckChar}$3`);
          return lines.join('\n');
        }
        currentIndex++;
      }
    }
    return null;
  }

  private handleEditClick(): void {
    if (this.editable) {
      this.isEditing = true;
    }
    this.dispatchEvent(
      new CustomEvent('edit-requested', {
        bubbles: true,
        composed: true
      })
    );
  }

  private handleCancelEdit(): void {
    this.isEditing = false;
    this.dispatchEvent(
      new CustomEvent('edit-cancelled', {
        bubbles: true,
        composed: true
      })
    );
  }

  private handleDocSaved(e: CustomEvent): void {
    // Forward the save event to parent with the content
    this.dispatchEvent(
      new CustomEvent('save-requested', {
        detail: { content: e.detail.content },
        bubbles: true,
        composed: true
      })
    );
  }

  public exitEditMode(): void {
    this.isEditing = false;
  }

  private handleRetry(): void {
    this.dispatchEvent(
      new CustomEvent('retry-requested', {
        bubbles: true,
        composed: true
      })
    );
  }

  override render() {
    // Loading state
    if (this.loading) {
      return html`
        <div class="docs-viewer">
          <div class="viewer-loading">
            <div class="loading-spinner"></div>
            <p>Dokument wird geladen...</p>
          </div>
        </div>
      `;
    }

    // Error state
    if (this.error) {
      return html`
        <div class="docs-viewer">
          <div class="viewer-error">
            <span class="error-icon">⚠️</span>
            <h3>Dokument konnte nicht geladen werden</h3>
            <p>${this.error}</p>
            <button class="retry-btn" @click=${this.handleRetry}>
              Erneut versuchen
            </button>
          </div>
        </div>
      `;
    }

    // No document selected state
    if (!this.filename) {
      return html`
        <div class="docs-viewer">
          <div class="viewer-empty">
            <span class="empty-icon">📄</span>
            <p>Wählen Sie ein Dokument aus der Seitenleiste aus</p>
          </div>
        </div>
      `;
    }

    // Document content view
    const viewerClass = this.embedded ? 'docs-viewer docs-viewer--embedded' : 'docs-viewer';

    // Edit mode with CodeMirror editor
    if (this.isEditing) {
      return html`
        <div class="${viewerClass}">
          <aos-docs-editor
            .content=${this.content}
            .filename=${this.filename}
            .saving=${this.isSaving}
            @doc-saved=${this.handleDocSaved}
            @edit-cancelled=${this.handleCancelEdit}
          ></aos-docs-editor>
        </div>
      `;
    }

    // View mode
    return html`
      <div class="${viewerClass}">
        <div class="viewer-header">
          <h2 class="viewer-title">${this.filename}</h2>
          ${this.editable
            ? html`
                <button class="edit-btn" @click=${this.handleEditClick}>
                  <span class="edit-icon">✏️</span>
                  Bearbeiten
                </button>
              `
            : ''}
        </div>

        <div class="viewer-content markdown-body" @click=${this.handleContentClick}>
          ${this.content
            ? unsafeHTML(this.renderedContent)
            : html`
                <div class="empty-document">
                  <p>Dieses Dokument ist leer.</p>
                </div>
              `}
        </div>
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }

  // Styles for the viewer - injected into the document
  static styles = css`
    .docs-viewer {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .docs-viewer--embedded {
      height: 100%;
    }

    .viewer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-color, #404040);
      background: var(--bg-color-tertiary, #2d2d2d);
    }

    .viewer-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-color, #e5e5e5);
    }

    .edit-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      background: var(--primary-color, #3b82f6);
      color: white;
    }

    .edit-btn:hover {
      background: var(--primary-color-hover, #2563eb);
    }

    .viewer-content {
      flex: 1;
      overflow: auto;
      padding: 1.5rem;
    }

    .viewer-loading, .viewer-error, .viewer-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 2rem;
      text-align: center;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border-color, #404040);
      border-top-color: var(--primary-color, #3b82f6);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-icon, .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .retry-btn {
      margin-top: 1rem;
      padding: 0.5rem 1.5rem;
      background: var(--primary-color, #3b82f6);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .retry-btn:hover {
      background: var(--primary-color-hover, #2563eb);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-docs-viewer': AosDocsViewer;
  }
}
