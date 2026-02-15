import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { buildSpecFilePath, copyPathToClipboard } from '../../utils/copy-path.js';

export interface SpecFileInfo {
  relativePath: string;
  filename: string;
}

export interface SpecFileGroup {
  folder: string;
  files: SpecFileInfo[];
}

@customElement('aos-spec-file-tabs')
export class AosSpecFileTabs extends LitElement {
  @property({ type: Array }) files: SpecFileGroup[] = [];
  @property({ type: String, attribute: 'active-file' }) activeFile = '';
  @property({ type: String, attribute: 'spec-id' }) specId = '';
  @state() private copiedPath = '';

  static override styles = css`
    :host {
      display: block;
    }

    .spec-file-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0;
      background: var(--bg-color-tertiary, #252526);
      border-bottom: 1px solid var(--border-color, #404040);
      padding: 0;
    }

    .spec-file-group {
      display: contents;
    }

    .spec-file-group-label {
      display: flex;
      align-items: center;
      padding: 8px 10px 8px 12px;
      font-size: 10px;
      color: var(--text-color-muted, #606060);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      user-select: none;
      flex-shrink: 0;
    }

    .spec-file-tab {
      padding: 8px 14px;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--text-color-secondary, #a0a0a0);
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
      user-select: none;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .spec-file-tab:hover {
      background: var(--bg-color-hover, #3c3c3c);
      color: var(--text-color, #e5e5e5);
    }

    .spec-file-tab.active {
      color: var(--text-color, #e5e5e5);
      border-bottom-color: var(--primary-color, #3b82f6);
      background: var(--bg-color-secondary, #1e1e1e);
    }

    .tab-copy-btn {
      opacity: 0;
      background: transparent;
      border: none;
      color: var(--text-color-secondary, #a0a0a0);
      cursor: pointer;
      padding: 0;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.15s, color 0.15s;
      flex-shrink: 0;
    }

    .spec-file-tab:hover .tab-copy-btn {
      opacity: 1;
    }

    .tab-copy-btn:hover {
      color: var(--text-color, #e5e5e5);
    }

    .tab-copy-btn.copy-path--copied {
      opacity: 1;
      color: var(--success-color, #22c55e);
    }
  `;

  private _handleTabClick(file: SpecFileInfo) {
    this.dispatchEvent(
      new CustomEvent('file-selected', {
        detail: { relativePath: file.relativePath, filename: file.filename },
        bubbles: true,
        composed: true,
      })
    );
  }

  private async _handleCopyClick(e: Event, file: SpecFileInfo) {
    e.stopPropagation();
    const path = buildSpecFilePath(this.specId, file.relativePath);
    const button = e.currentTarget as HTMLElement;
    this.copiedPath = file.relativePath;
    await copyPathToClipboard(path, button);
    setTimeout(() => {
      this.copiedPath = '';
    }, 2000);
  }

  override render() {
    const nonEmptyGroups = this.files.filter((g) => g.files.length > 0);

    if (nonEmptyGroups.length === 0) {
      return nothing;
    }

    const showLabels = nonEmptyGroups.length > 1;

    return html`
      <div class="spec-file-tabs">
        ${nonEmptyGroups.map(
          (group) => html`
            <div class="spec-file-group">
              ${showLabels
                ? html`<span class="spec-file-group-label"
                    >${group.folder === 'root' ? 'root' : group.folder + '/'}</span
                  >`
                : nothing}
              ${group.files.map(
                (file) => html`
                  <button
                    class="spec-file-tab ${file.relativePath === this.activeFile ? 'active' : ''}"
                    @click=${() => this._handleTabClick(file)}
                    title=${file.relativePath}
                  >
                    ${file.filename}
                    ${this.specId ? html`
                      <span
                        class="tab-copy-btn ${this.copiedPath === file.relativePath ? 'copy-path--copied' : ''}"
                        @click=${(e: Event) => this._handleCopyClick(e, file)}
                        title="Copy file path"
                      >
                        ${this.copiedPath === file.relativePath
                          ? html`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
                          : html`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`
                        }
                      </span>
                    ` : nothing}
                  </button>
                `
              )}
            </div>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-spec-file-tabs': AosSpecFileTabs;
  }
}
