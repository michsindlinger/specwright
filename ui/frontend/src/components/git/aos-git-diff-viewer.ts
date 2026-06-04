import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { gateway } from '../../gateway.js';
import type { GitFileDiffResult } from '../../../../src/shared/types/git.protocol.js';

/**
 * Git Diff Viewer (read-only, fullscreen overlay).
 *
 * Opened by dispatching a document-level `open-git-diff` CustomEvent with
 * `{ detail: { file: string } }` (the git commit dialog fires this when a file
 * name is clicked). The component requests the diff via the gateway and renders
 * a unified, read-only diff (no editable elements).
 *
 * Mirrors the patterns of `aos-image-lightbox` (Shadow DOM, document event,
 * Escape/overlay close, fade-in) and manages its own state — app.ts only needs
 * to render the tag once.
 */
@customElement('aos-git-diff-viewer')
export class AosGitDiffViewer extends LitElement {
  @state() private isOpen = false;
  @state() private filePath = '';
  @state() private diffText = '';
  @state() private isLoading = false;
  @state() private isBinary = false;
  @state() private isUntracked = false;
  @state() private truncated = false;
  @state() private errorMsg = '';

  /** Fallback timeout so the spinner never spins forever */
  private loadTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private static readonly LOAD_TIMEOUT_MS = 15000;

  private boundHandleOpen = this.handleOpen.bind(this);
  private boundHandleKeyDown = this.handleKeyDown.bind(this);
  private boundHandleDiffResponse = this.handleDiffResponse.bind(this);
  private boundHandleError = this.handleError.bind(this);

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('open-git-diff', this.boundHandleOpen as EventListener);
    document.addEventListener('keydown', this.boundHandleKeyDown);
    gateway.on('git:diff:response', this.boundHandleDiffResponse);
    gateway.on('git:error', this.boundHandleError);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('open-git-diff', this.boundHandleOpen as EventListener);
    document.removeEventListener('keydown', this.boundHandleKeyDown);
    gateway.off('git:diff:response', this.boundHandleDiffResponse);
    gateway.off('git:error', this.boundHandleError);
    this.clearLoadTimeout();
  }

  private clearLoadTimeout(): void {
    if (this.loadTimeoutId !== null) {
      clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = null;
    }
  }

  /** Open the viewer for a file and request its diff */
  private handleOpen(event: Event): void {
    const detail = (event as CustomEvent<{ file: string }>).detail;
    const file = detail?.file;
    if (!file) return;

    this.filePath = file;
    this.diffText = '';
    this.isBinary = false;
    this.isUntracked = false;
    this.truncated = false;
    this.errorMsg = '';
    this.isLoading = true;
    this.isOpen = true;

    gateway.requestGitDiff(file);

    this.clearLoadTimeout();
    this.loadTimeoutId = setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
        this.errorMsg = 'Zeitüberschreitung beim Laden des Diffs.';
      }
    }, AosGitDiffViewer.LOAD_TIMEOUT_MS);
  }

  /** Gateway emits the full message (or just data) keyed by type */
  private handleDiffResponse(payload: unknown): void {
    if (!this.isOpen) return;
    const p = payload as { data?: GitFileDiffResult } & Partial<GitFileDiffResult>;
    const data: GitFileDiffResult | undefined = p?.data ?? (p as GitFileDiffResult);
    if (!data || typeof data.path !== 'string') return;
    // Ignore responses for a different file (stale)
    if (data.path !== this.filePath) return;

    this.clearLoadTimeout();
    this.diffText = data.diff ?? '';
    this.isBinary = !!data.isBinary;
    this.isUntracked = !!data.isUntracked;
    this.truncated = !!data.truncated;
    this.isLoading = false;
  }

  private handleError(payload: unknown): void {
    if (!this.isOpen || !this.isLoading) return;
    const p = payload as { operation?: string; message?: string };
    if (p?.operation && p.operation !== 'diff') return;
    this.clearLoadTimeout();
    this.isLoading = false;
    this.errorMsg = p?.message || 'Diff konnte nicht geladen werden.';
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (this.isOpen && event.key === 'Escape') {
      this.close();
    }
  }

  private handleOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  private close(): void {
    this.clearLoadTimeout();
    this.isOpen = false;
  }

  /** Classify a unified-diff line for coloring */
  private lineClass(line: string): string {
    if (this.isUntracked) return 'diff-line diff-line--add';
    if (line.startsWith('@@')) return 'diff-line diff-line--hunk';
    if (line.startsWith('+++') || line.startsWith('---')) return 'diff-line diff-line--meta';
    if (line.startsWith('diff ') || line.startsWith('index ') ||
        line.startsWith('new file') || line.startsWith('deleted file') ||
        line.startsWith('rename ') || line.startsWith('similarity ')) {
      return 'diff-line diff-line--meta';
    }
    if (line.startsWith('+')) return 'diff-line diff-line--add';
    if (line.startsWith('-')) return 'diff-line diff-line--del';
    return 'diff-line';
  }

  private renderBody() {
    if (this.isLoading) {
      return html`<div class="diff-state"><div class="diff-spinner"></div></div>`;
    }
    if (this.errorMsg) {
      return html`<div class="diff-state diff-state--error">${this.errorMsg}</div>`;
    }
    if (this.isBinary) {
      return html`<div class="diff-state">Binärdatei – kein Diff verfügbar.</div>`;
    }
    if (!this.diffText) {
      return html`<div class="diff-state">Keine Änderungen anzuzeigen.</div>`;
    }
    const lines = this.diffText.split('\n');
    return html`
      ${this.truncated
        ? html`<div class="diff-notice">Diff gekürzt (Datei zu groß).</div>`
        : nothing}
      <pre class="diff-pre">${lines.map(
        line => html`<span class=${this.lineClass(line)}>${line || ' '}</span>`
      )}</pre>
    `;
  }

  override render() {
    if (!this.isOpen) return nothing;

    return html`
      <div
        class="diff-overlay"
        @click=${this.handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-label="Datei-Diff"
      >
        <div class="diff-modal">
          <header class="diff-header">
            <span class="diff-title" title=${this.filePath}>${this.filePath}</span>
            <button class="diff-close" @click=${this.close} aria-label="Schließen">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </header>
          <div class="diff-body">${this.renderBody()}</div>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: contents;
    }

    .diff-overlay {
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.7);
      z-index: 10010;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: diff-fade-in 0.15s ease-out;
    }

    @keyframes diff-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .diff-modal {
      background-color: var(--color-bg-primary, #0d1117);
      border: 1px solid var(--color-border, #30363d);
      border-radius: var(--radius-lg, 12px);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      width: 92vw;
      height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .diff-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--color-border, #30363d);
      flex: 0 0 auto;
    }

    .diff-title {
      font-family: var(--font-mono, monospace);
      font-size: 13px;
      color: var(--color-text-primary, #e6edf3);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .diff-close {
      flex: 0 0 auto;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      color: var(--color-text-secondary, #8b949e);
      cursor: pointer;
      border-radius: var(--radius-md, 6px);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.15s ease, color 0.15s ease;
    }

    .diff-close:hover {
      background-color: var(--color-bg-secondary, #161b22);
      color: var(--color-text-primary, #e6edf3);
    }

    .diff-body {
      flex: 1 1 auto;
      overflow: auto;
      padding: 8px 0;
    }

    .diff-pre {
      margin: 0;
      padding: 0;
      font-family: var(--font-mono, monospace);
      font-size: 12.5px;
      line-height: 1.5;
      tab-size: 2;
      white-space: pre;
    }

    .diff-line {
      display: block;
      padding: 0 16px;
      color: var(--color-text-primary, #e6edf3);
    }

    .diff-line--add {
      background-color: rgba(46, 160, 67, 0.15);
      color: var(--color-success, #3fb950);
    }

    .diff-line--del {
      background-color: rgba(248, 81, 73, 0.15);
      color: var(--color-error, #f85149);
    }

    .diff-line--hunk {
      color: var(--color-primary, #58a6ff);
    }

    .diff-line--meta {
      color: var(--color-text-secondary, #8b949e);
    }

    .diff-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--color-text-secondary, #8b949e);
      font-size: 14px;
    }

    .diff-state--error {
      color: var(--color-error, #f85149);
    }

    .diff-notice {
      padding: 8px 16px;
      color: var(--color-warning, #d29922);
      font-size: 12.5px;
    }

    .diff-spinner {
      width: 36px;
      height: 36px;
      border: 3px solid var(--color-border, #30363d);
      border-top-color: var(--color-primary, #58a6ff);
      border-radius: 50%;
      animation: diff-spin 1s linear infinite;
    }

    @keyframes diff-spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .diff-modal {
        width: 100vw;
        height: 100vh;
        border-radius: 0;
        border: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-git-diff-viewer': AosGitDiffViewer;
  }
}
