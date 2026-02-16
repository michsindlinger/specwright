import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState, Compartment, Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { html as htmlLang } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { markdown } from '@codemirror/lang-markdown';
import { yaml } from '@codemirror/lang-yaml';
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

function getLanguageExtension(filename: string): Extension {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'ts':
    case 'tsx':
      return javascript({ typescript: true, jsx: ext === 'tsx' });
    case 'js':
    case 'jsx':
      return javascript({ jsx: ext === 'jsx' });
    case 'json':
      return json();
    case 'html':
    case 'htm':
      return htmlLang();
    case 'css':
    case 'scss':
    case 'less':
      return css();
    case 'md':
    case 'markdown':
      return markdown();
    case 'yaml':
    case 'yml':
      return yaml();
    default:
      return [];
  }
}

@customElement('aos-file-editor')
export class AosFileEditor extends LitElement {
  @property({ type: String }) content = '';
  @property({ type: String }) filename = '';

  @state() private hasUnsavedChanges = false;
  @state() private currentContent = '';
  @state() private saveError = '';

  private editorView: EditorView | null = null;
  private editorContainer: HTMLDivElement | null = null;
  private themeCompartment = new Compartment();
  private languageCompartment = new Compartment();
  private boundThemeChangeHandler = (theme: ResolvedTheme) => this.onThemeChanged(theme);

  override connectedCallback(): void {
    super.connectedCallback();
    this.currentContent = this.content;
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
    if (changedProperties.has('content') && this.editorView) {
      const currentDoc = this.editorView.state.doc.toString();
      if (currentDoc !== this.content) {
        this.editorView.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: this.content }
        });
        this.hasUnsavedChanges = false;
        this.currentContent = this.content;
      }
    }
    if (changedProperties.has('filename') && this.editorView) {
      this.editorView.dispatch({
        effects: this.languageCompartment.reconfigure(getLanguageExtension(this.filename))
      });
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

    const saveKeymap = keymap.of([{
      key: 'Mod-s',
      run: () => {
        this.handleSave();
        return true;
      }
    }]);

    const updateListener = EditorView.updateListener.of(update => {
      if (update.docChanged) {
        this.currentContent = update.state.doc.toString();
        this.hasUnsavedChanges = this.currentContent !== this.content;
        this.saveError = '';
        this.dispatchEvent(
          new CustomEvent('content-changed', {
            detail: {
              content: this.currentContent,
              hasUnsavedChanges: this.hasUnsavedChanges
            },
            bubbles: true,
            composed: true
          })
        );
      }
    });

    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      this.languageCompartment.of(getLanguageExtension(this.filename)),
      this.themeCompartment.of(getEditorTheme(themeService.getResolvedTheme())),
      syntaxHighlighting(defaultHighlightStyle),
      saveKeymap,
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
    if (!this.hasUnsavedChanges) return;

    this.dispatchEvent(
      new CustomEvent('save-requested', {
        detail: {
          filename: this.filename,
          content: this.currentContent
        },
        bubbles: true,
        composed: true
      })
    );
  }

  public markSaveSuccess(): void {
    this.content = this.currentContent;
    this.hasUnsavedChanges = false;
    this.saveError = '';
  }

  public markSaveError(error: string): void {
    this.saveError = error;
  }

  override render() {
    return html`
      <div class="file-editor">
        ${this.saveError
          ? html`
              <div class="save-error">
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
    'aos-file-editor': AosFileEditor;
  }
}
