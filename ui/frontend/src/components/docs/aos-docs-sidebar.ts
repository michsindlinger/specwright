import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export interface DocFile {
  filename: string;
  lastModified: string;
}

@customElement('aos-docs-sidebar')
export class AosDocsSidebar extends LitElement {
  @property({ type: Array }) docs: DocFile[] = [];
  @property({ type: String }) selectedDoc: string | null = null;
  @property({ type: Boolean }) hasUnsavedChanges = false;
  @property({ type: String }) emptyMessage = 'Keine Projekt-Dokumente gefunden';

  private pendingSelection: string | null = null;

  private handleDocClick(filename: string): void {
    if (this.hasUnsavedChanges) {
      this.pendingSelection = filename;
      this.dispatchEvent(
        new CustomEvent('unsaved-changes-warning', {
          detail: { pendingFilename: filename },
          bubbles: true,
          composed: true
        })
      );
      return;
    }

    this.selectDoc(filename);
  }

  private selectDoc(filename: string): void {
    this.dispatchEvent(
      new CustomEvent('doc-selected', {
        detail: { filename },
        bubbles: true,
        composed: true
      })
    );
  }

  public confirmNavigation(action: 'save' | 'discard' | 'cancel'): void {
    if (action === 'cancel') {
      this.pendingSelection = null;
      return;
    }

    if (action === 'save') {
      this.dispatchEvent(
        new CustomEvent('save-requested', {
          bubbles: true,
          composed: true
        })
      );
    }

    if (this.pendingSelection) {
      this.selectDoc(this.pendingSelection);
      this.pendingSelection = null;
    }
  }

  private formatDate(isoDate: string): string {
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  }

  private getSortedDocs(): DocFile[] {
    return [...this.docs].sort((a, b) => a.filename.localeCompare(b.filename));
  }

  override render() {
    const sortedDocs = this.getSortedDocs();

    return html`
      <div class="docs-sidebar">
        <div class="sidebar-header">
          <h3>Dokumente</h3>
          <span class="doc-count">${sortedDocs.length}</span>
        </div>

        <div class="doc-list">
          ${sortedDocs.length === 0
            ? html`
                <div class="empty-state">
                  <span class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
                  <p>${this.emptyMessage}</p>
                </div>
              `
            : sortedDocs.map(
                doc => html`
                  <div
                    class="doc-item ${this.selectedDoc === doc.filename ? 'active' : ''}"
                    @click=${() => this.handleDocClick(doc.filename)}
                    role="button"
                    tabindex="0"
                    @keydown=${(e: KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.handleDocClick(doc.filename);
                      }
                    }}
                  >
                    <span class="doc-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
                    <div class="doc-info">
                      <span class="doc-name">${doc.filename}</span>
                      ${doc.lastModified
                        ? html`<span class="doc-date">${this.formatDate(doc.lastModified)}</span>`
                        : nothing}
                    </div>
                    ${this.selectedDoc === doc.filename && this.hasUnsavedChanges
                      ? html`<span class="unsaved-indicator" title="Ungespeicherte Änderungen">●</span>`
                      : nothing}
                  </div>
                `
              )}
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
    'aos-docs-sidebar': AosDocsSidebar;
  }
}
