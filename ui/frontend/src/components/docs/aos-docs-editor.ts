import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState, Compartment, Extension } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { themeService, type ResolvedTheme } from '../../services/theme.service.js';

const lightTheme = EditorView.theme({
  '&': {
    backgroundColor: '#FFFFFF',
    color: '#1e293b'
  },
  '.cm-cursor': {
    borderLeftColor: '#1E3A5F'
  },
  '.cm-activeLine': {
    backgroundColor: '#FFF8F3'
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#FFF8F3'
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: '#F5EDE5 !important'
  },
  '.cm-gutters': {
    backgroundColor: '#FFFBF7',
    color: '#64748b',
    borderRight: '1px solid #E8E0D8'
  },
  '.cm-lineNumbers .cm-gutterElement': {
    color: '#64748b'
  }
}, { dark: false });

function getEditorTheme(theme: ResolvedTheme): Extension {
  return theme === 'light' ? lightTheme : oneDark;
}

@customElement('aos-docs-editor')
export class AosDocsEditor extends LitElement {
  @property({ type: String }) content = '';
  @property({ type: String }) filename = '';
  @property({ type: Boolean }) saving = false;

  @state() private hasUnsavedChanges = false;
  @state() private originalContent = '';
  @state() private currentContent = '';
  @state() private saveError = '';
  @state() private showLargeFileWarning = false;

  private editorView: EditorView | null = null;
  private editorContainer: HTMLDivElement | null = null;
  private themeCompartment = new Compartment();
  private boundThemeChangeHandler = (theme: ResolvedTheme) => this.onThemeChanged(theme);

  private static readonly LARGE_FILE_THRESHOLD = 1024 * 1024; // 1MB

  override connectedCallback(): void {
    super.connectedCallback();
    this.originalContent = this.content;
    this.currentContent = this.content;
    this.showLargeFileWarning = this.content.length > AosDocsEditor.LARGE_FILE_THRESHOLD;
    themeService.onChange(this.boundThemeChangeHandler);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    themeService.offChange(this.boundThemeChangeHandler);
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = null;
    }
  }

  override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('content') && !this.editorView) {
      this.originalContent = this.content;
      this.currentContent = this.content;
    }
  }

  override firstUpdated(): void {
    this.initializeEditor();
  }

  private onThemeChanged(theme: ResolvedTheme): void {
    if (this.editorView) {
      this.editorView.dispatch({
        effects: this.themeCompartment.reconfigure(getEditorTheme(theme))
      });
    }
  }

  private initializeEditor(): void {
    this.editorContainer = this.querySelector('.editor-codemirror') as HTMLDivElement;
    if (!this.editorContainer) return;

    const updateListener = EditorView.updateListener.of(update => {
      if (update.docChanged) {
        this.currentContent = update.state.doc.toString();
        this.hasUnsavedChanges = this.currentContent !== this.originalContent;
        this.saveError = '';
      }
    });

    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      markdown(),
      this.themeCompartment.of(getEditorTheme(themeService.getResolvedTheme())),
      syntaxHighlighting(defaultHighlightStyle),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      updateListener,
      EditorView.lineWrapping,
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '14px'
        },
        '.cm-scroller': {
          overflow: 'auto',
          fontFamily: 'var(--font-family-mono)'
        },
        '.cm-content': {
          padding: 'var(--spacing-md)'
        },
        '.cm-gutters': {
          backgroundColor: 'var(--color-bg-secondary)',
          borderRight: '1px solid var(--color-border)'
        }
      })
    ];

    const state = EditorState.create({
      doc: this.content,
      extensions
    });

    this.editorView = new EditorView({
      state,
      parent: this.editorContainer
    });
  }

  private handleSave(): void {
    if (!this.hasUnsavedChanges || this.saving) return;

    this.dispatchEvent(
      new CustomEvent('doc-saved', {
        detail: {
          filename: this.filename,
          content: this.currentContent
        },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleCancel(): void {
    if (this.hasUnsavedChanges) {
      const confirmed = window.confirm('Änderungen verwerfen? Alle ungespeicherten Änderungen gehen verloren.');
      if (!confirmed) return;
    }

    this.dispatchEvent(
      new CustomEvent('edit-cancelled', {
        bubbles: true,
        composed: true
      })
    );
  }

  public markSaveSuccess(): void {
    this.originalContent = this.currentContent;
    this.hasUnsavedChanges = false;
    this.saveError = '';
  }

  public markSaveError(error: string): void {
    this.saveError = error;
  }

  override render() {
    return html`
      <div class="docs-editor">
        <div class="editor-header">
          <div class="editor-title-area">
            <h2 class="editor-title">${this.filename}</h2>
            ${this.hasUnsavedChanges
              ? html`<span class="unsaved-badge">Ungespeichert</span>`
              : null}
          </div>
          <div class="editor-actions">
            <button
              class="cancel-btn"
              @click=${this.handleCancel}
              ?disabled=${this.saving}
            >
              Abbrechen
            </button>
            <button
              class="save-btn"
              @click=${this.handleSave}
              ?disabled=${!this.hasUnsavedChanges || this.saving}
            >
              ${this.saving
                ? html`<span class="saving-spinner"></span> Speichern...`
                : 'Speichern'}
            </button>
          </div>
        </div>

        ${this.showLargeFileWarning
          ? html`
              <div class="large-file-warning">
                <span class="warning-icon">⚠️</span>
                Große Datei - Bearbeitung kann langsam sein
              </div>
            `
          : null}

        ${this.saveError
          ? html`
              <div class="save-error">
                <span class="error-icon">❌</span>
                Speichern fehlgeschlagen: ${this.saveError}
              </div>
            `
          : null}

        <div class="editor-codemirror"></div>
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-docs-editor': AosDocsEditor;
  }
}
