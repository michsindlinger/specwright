import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { gateway, type WebSocketMessage } from '../../gateway.js';
import './aos-file-tabs.js';
import './aos-file-editor.js';
import type { AosFileEditor } from './aos-file-editor.js';
import type { FileTab } from './aos-file-tabs.js';

/**
 * Internal state for each open file.
 */
interface OpenFile {
  path: string;
  filename: string;
  content: string;
  originalContent: string;
  language: string;
  isModified: boolean;
  lastAccessed: number;
  isBinary: boolean;
}

const MAX_TABS = 15;

/** Threshold in bytes for "large file" warning (1 MB) */
const LARGE_FILE_THRESHOLD = 1_000_000;

/** File extensions considered binary (not editable as text) */
const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp',
  'mp3', 'mp4', 'wav', 'ogg', 'webm', 'avi', 'mov',
  'zip', 'tar', 'gz', 'bz2', 'rar', '7z',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'exe', 'dll', 'so', 'dylib', 'bin',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
]);

function isBinaryFilename(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * aos-file-editor-panel - Orchestrator for multi-tab file editing.
 *
 * Manages open files state, tab bar, and editor instance.
 * Communicates with backend via gateway for files:read and files:write.
 *
 * Edge cases (FE-007):
 * - Binary files: Shows hint instead of editor content
 * - Tab sync on rename: Updates tab path/name when file renamed via context menu
 * - Tab sync on delete: Closes tab when file deleted via context menu
 * - Write errors: Shows error via editor markSaveError + warning banner
 * - Large files: Shows performance warning for files > 1 MB
 */
@customElement('aos-file-editor-panel')
export class AosFileEditorPanel extends LitElement {
  /** Whether the file-tree sidebar is open. When false and no files are open, the panel hides itself. */
  @property({ type: Boolean }) sidebarOpen = false;

  @state() private openFiles: OpenFile[] = [];
  @state() private activeTabPath = '';
  @state() private isLoading = false;
  @state() private loadError = '';
  @state() private writeError = '';

  private boundHandlers: Map<string, (msg: WebSocketMessage) => void> = new Map();

  private static stylesInjected = false;

  private boundFileRenamed = (e: Event) => this._handleFileRenamed(e as CustomEvent);
  private boundFileDeleted = (e: Event) => this._handleFileDeleted(e as CustomEvent);

  override connectedCallback(): void {
    super.connectedCallback();
    this.setupHandlers();

    this.addEventListener('file-open', this._handleFileOpen as EventListener);

    // Listen for context menu file operations (rename/delete) to sync tabs
    document.addEventListener('file-renamed', this.boundFileRenamed);
    document.addEventListener('file-deleted', this.boundFileDeleted);

    if (!AosFileEditorPanel.stylesInjected) {
      this.injectStyles();
      AosFileEditorPanel.stylesInjected = true;
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeHandlers();
    this.removeEventListener('file-open', this._handleFileOpen as EventListener);
    document.removeEventListener('file-renamed', this.boundFileRenamed);
    document.removeEventListener('file-deleted', this.boundFileDeleted);
  }

  private setupHandlers(): void {
    const handlers: [string, (msg: WebSocketMessage) => void][] = [
      ['files:read:response', (msg) => this.onFileReadResponse(msg)],
      ['files:read:error', (msg) => this.onFileReadError(msg)],
      ['files:write:response', (msg) => this.onFileWriteResponse(msg)],
      ['files:write:error', (msg) => this.onFileWriteError(msg)],
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

  private injectStyles(): void {
    if (document.getElementById('aos-file-editor-panel-styles')) return;

    const style = document.createElement('style');
    style.id = 'aos-file-editor-panel-styles';
    style.textContent = `
      .file-editor-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }

      .file-editor-content {
        flex: 1;
        overflow: hidden;
        position: relative;
      }

      .file-editor-content .file-editor {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .file-editor-content .editor-codemirror {
        flex: 1;
        overflow: hidden;
      }

      .file-editor-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--color-text-tertiary);
        gap: var(--spacing-md);
        user-select: none;
      }

      .file-editor-empty span {
        font-size: var(--font-size-sm);
      }

      .file-editor-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--color-text-tertiary);
        font-size: var(--font-size-sm);
      }

      .file-editor-error {
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--color-danger-bg, #2d1b1b);
        color: var(--color-danger, #e74c3c);
        font-size: var(--font-size-xs);
        border-bottom: 1px solid var(--color-danger, #e74c3c);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .file-editor-error-dismiss {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: var(--radius-sm);
        opacity: 0.7;
        font-size: var(--font-size-xs);
      }

      .file-editor-error-dismiss:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.1);
      }

      .file-editor-binary {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--color-text-tertiary);
        gap: var(--spacing-md);
        user-select: none;
      }

      .file-editor-binary span {
        font-size: var(--font-size-sm);
      }

      .file-editor-warning {
        padding: var(--spacing-xs) var(--spacing-md);
        background: rgba(245, 158, 11, 0.1);
        color: var(--color-warning, #f59e0b);
        font-size: var(--font-size-xs);
        border-bottom: 1px solid rgba(245, 158, 11, 0.3);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .file-editor-warning-dismiss {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: var(--radius-sm);
        opacity: 0.7;
        font-size: var(--font-size-xs);
      }

      .file-editor-warning-dismiss:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.1);
      }
    `;
    document.head.appendChild(style);
  }

  // --- Public API ---

  private _handleFileOpen = (e: Event): void => {
    const detail = (e as CustomEvent<{ path: string; filename: string }>).detail;
    this.openFile(detail.path, detail.filename);
  };

  public openFile(path: string, filename: string): void {
    const existing = this.openFiles.find((f) => f.path === path);
    if (existing) {
      existing.lastAccessed = Date.now();
      this.activeTabPath = path;
      this.openFiles = [...this.openFiles];
      return;
    }

    const binary = isBinaryFilename(filename);

    if (this.openFiles.length >= MAX_TABS) {
      this.closeLruTab();
    }

    const newFile: OpenFile = {
      path,
      filename,
      content: '',
      originalContent: '',
      language: filename,
      isModified: false,
      lastAccessed: Date.now(),
      isBinary: binary,
    };
    this.openFiles = [...this.openFiles, newFile];
    this.activeTabPath = path;

    if (binary) {
      // Don't request content for binary files
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.loadError = '';
    gateway.send({ type: 'files:read', path });
  }

  public hasUnsavedChanges(): boolean {
    return this.openFiles.some((f) => f.isModified);
  }

  // --- Context Menu Tab Sync Handlers (FE-007) ---

  private _handleFileRenamed(e: CustomEvent<{ oldPath: string; newPath: string }>): void {
    const { oldPath, newPath } = e.detail;
    const file = this.openFiles.find((f) => f.path === oldPath);
    if (!file) return;

    const newName = newPath.split('/').pop() || newPath;
    file.path = newPath;
    file.filename = newName;
    file.language = newName;
    file.isBinary = isBinaryFilename(newName);

    if (this.activeTabPath === oldPath) {
      this.activeTabPath = newPath;
    }

    this.openFiles = [...this.openFiles];
  }

  private _handleFileDeleted(e: CustomEvent<{ path: string }>): void {
    const { path } = e.detail;
    const file = this.openFiles.find((f) => f.path === path);
    if (!file) return;

    // Close the tab for the deleted file (no unsaved prompt - file is gone)
    this.closeTab(path);
  }

  // --- Gateway Response Handlers ---

  private onFileReadResponse(msg: WebSocketMessage): void {
    const path = msg.path as string;
    const content = msg.content as string;
    const isBinary = msg.isBinary as boolean | undefined;
    const size = msg.size as number | undefined;

    const file = this.openFiles.find((f) => f.path === path);
    if (!file) return;

    // Backend may signal binary via isBinary flag
    if (isBinary) {
      file.isBinary = true;
      file.content = '';
      file.originalContent = '';
      this.openFiles = [...this.openFiles];
      this.isLoading = false;
      this.loadError = '';
      return;
    }

    file.content = content;
    file.originalContent = content;
    file.isModified = false;

    // Large file warning (> 1 MB)
    const fileSize = size || new Blob([content]).size;
    if (fileSize > LARGE_FILE_THRESHOLD) {
      this.writeError = `Grosse Datei (${(fileSize / 1_000_000).toFixed(1)} MB) - Performance kann beeintraechtigt sein`;
    }

    this.openFiles = [...this.openFiles];
    this.isLoading = false;
    this.loadError = '';
  }

  private onFileReadError(msg: WebSocketMessage): void {
    const path = msg.path as string;
    const error = (msg.message as string) || 'Datei konnte nicht geladen werden';

    this.openFiles = this.openFiles.filter((f) => f.path !== path);
    if (this.activeTabPath === path) {
      this.activeTabPath = this.openFiles.length > 0 ? this.openFiles[this.openFiles.length - 1].path : '';
    }
    this.isLoading = false;
    this.loadError = error;
  }

  private onFileWriteResponse(msg: WebSocketMessage): void {
    const path = msg.path as string;

    const file = this.openFiles.find((f) => f.path === path);
    if (!file) return;

    file.originalContent = file.content;
    file.isModified = false;
    this.openFiles = [...this.openFiles];
    this.writeError = '';

    const editorEl = this.querySelector('aos-file-editor') as AosFileEditor | null;
    if (editorEl && this.activeTabPath === path) {
      editorEl.markSaveSuccess();
    }
  }

  private onFileWriteError(msg: WebSocketMessage): void {
    const error = (msg.message as string) || 'Speichern fehlgeschlagen';
    const code = msg.code as string | undefined;

    // Show write error in banner for visibility
    if (code === 'ENOENT') {
      this.writeError = 'Die Datei existiert nicht mehr. Datei neu erstellen oder Tab schliessen.';
    } else if (code === 'EACCES' || code === 'EPERM') {
      this.writeError = 'Keine Schreibberechtigung fuer diese Datei.';
    } else {
      this.writeError = error;
    }

    const editorEl = this.querySelector('aos-file-editor') as AosFileEditor | null;
    if (editorEl) {
      editorEl.markSaveError(error);
    }
  }

  // --- Tab Event Handlers ---

  private _handleTabSelect(e: CustomEvent<{ path: string }>): void {
    const { path } = e.detail;
    const file = this.openFiles.find((f) => f.path === path);
    if (file) {
      file.lastAccessed = Date.now();
      this.activeTabPath = path;
      this.openFiles = [...this.openFiles];
    }
  }

  private _handleTabClose(e: CustomEvent<{ path: string }>): void {
    const { path } = e.detail;
    const file = this.openFiles.find((f) => f.path === path);
    if (!file) return;

    if (file.isModified) {
      const confirmed = window.confirm('Ungespeicherte Aenderungen. Trotzdem schliessen?');
      if (!confirmed) return;
    }

    this.closeTab(path);
  }

  private closeTab(path: string): void {
    const index = this.openFiles.findIndex((f) => f.path === path);
    this.openFiles = this.openFiles.filter((f) => f.path !== path);

    if (this.activeTabPath === path) {
      if (this.openFiles.length > 0) {
        const newIndex = Math.min(index, this.openFiles.length - 1);
        this.activeTabPath = this.openFiles[newIndex].path;
      } else {
        this.activeTabPath = '';
      }
    }
  }

  private closeLruTab(): void {
    const unmodified = this.openFiles
      .filter((f) => !f.isModified)
      .sort((a, b) => a.lastAccessed - b.lastAccessed);

    if (unmodified.length > 0) {
      this.closeTab(unmodified[0].path);
      return;
    }

    const oldest = [...this.openFiles].sort((a, b) => a.lastAccessed - b.lastAccessed)[0];
    const confirmed = window.confirm(
      `Tab-Limit (${MAX_TABS}) erreicht. "${oldest.filename}" hat ungespeicherte Aenderungen. Trotzdem schliessen?`
    );
    if (confirmed) {
      this.closeTab(oldest.path);
    }
  }

  // --- Editor Event Handlers ---

  private _handleContentChanged(e: CustomEvent<{ content: string; hasUnsavedChanges: boolean }>): void {
    const file = this.openFiles.find((f) => f.path === this.activeTabPath);
    if (!file) return;

    file.content = e.detail.content;
    file.isModified = e.detail.hasUnsavedChanges;
    this.openFiles = [...this.openFiles];
  }

  private _handleSaveRequested(e: CustomEvent<{ filename: string; content: string }>): void {
    const file = this.openFiles.find((f) => f.path === this.activeTabPath);
    if (!file) return;

    gateway.send({
      type: 'files:write',
      path: file.path,
      content: e.detail.content,
    });
  }

  private _dismissLoadError(): void {
    this.loadError = '';
  }

  private _dismissWriteError(): void {
    this.writeError = '';
  }

  // --- Computed ---

  private get activeFile(): OpenFile | undefined {
    return this.openFiles.find((f) => f.path === this.activeTabPath);
  }

  private get fileTabs(): FileTab[] {
    return this.openFiles.map((f) => ({
      path: f.path,
      filename: f.filename,
      isModified: f.isModified,
    }));
  }

  // --- Rendering ---

  private renderBinaryHint() {
    return html`
      <div class="file-editor-binary">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.4">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <span>Binaerdatei kann nicht angezeigt werden</span>
      </div>
    `;
  }

  override render() {
    // Hide panel entirely when sidebar is closed and no files are open
    if (!this.sidebarOpen && this.openFiles.length === 0) {
      return nothing;
    }

    const active = this.activeFile;

    return html`
      <div class="file-editor-panel">
        ${this.loadError
          ? html`<div class="file-editor-error">
              <span>${this.loadError}</span>
              <button class="file-editor-error-dismiss" @click=${this._dismissLoadError}>&times;</button>
            </div>`
          : nothing}

        ${this.writeError
          ? html`<div class="file-editor-warning">
              <span>${this.writeError}</span>
              <button class="file-editor-warning-dismiss" @click=${this._dismissWriteError}>&times;</button>
            </div>`
          : nothing}

        <aos-file-tabs
          .tabs=${this.fileTabs}
          .activeTabPath=${this.activeTabPath}
          @tab-select=${this._handleTabSelect}
          @tab-close=${this._handleTabClose}
        ></aos-file-tabs>

        <div class="file-editor-content">
          ${this.isLoading
            ? html`<div class="file-editor-loading">Laden...</div>`
            : active
              ? active.isBinary
                ? this.renderBinaryHint()
                : html`
                    <aos-file-editor
                      .content=${active.content}
                      .filename=${active.filename}
                      @content-changed=${this._handleContentChanged}
                      @save-requested=${this._handleSaveRequested}
                    ></aos-file-editor>
                  `
              : html`
                  <div class="file-editor-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.4">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                    <span>Keine Datei geoeffnet</span>
                  </div>
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
    'aos-file-editor-panel': AosFileEditorPanel;
  }
}
