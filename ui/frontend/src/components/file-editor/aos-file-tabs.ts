import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * A single open file tab entry.
 */
export interface FileTab {
  /** Full relative path from project root */
  path: string;
  /** Display filename (basename) */
  filename: string;
  /** Whether the tab has unsaved changes */
  isModified: boolean;
}

/**
 * aos-file-tabs - Horizontal tab bar for open files.
 *
 * Pure presentation component. Receives tabs via property,
 * dispatches events for user interactions (select, close).
 *
 * Events:
 * - `tab-select`: { detail: { path } } - user clicked a tab
 * - `tab-close`:  { detail: { path } } - user clicked the close button
 */
@customElement('aos-file-tabs')
export class AosFileTabs extends LitElement {
  @property({ type: Array }) tabs: FileTab[] = [];
  @property({ type: String }) activeTabPath: string | null = null;

  private static stylesInjected = false;

  override connectedCallback(): void {
    super.connectedCallback();
    if (!AosFileTabs.stylesInjected) {
      this.injectStyles();
      AosFileTabs.stylesInjected = true;
    }
  }

  private injectStyles(): void {
    if (document.getElementById('aos-file-tabs-styles')) return;

    const style = document.createElement('style');
    style.id = 'aos-file-tabs-styles';
    style.textContent = `
      .file-tabs {
        display: flex;
        align-items: stretch;
        background: var(--color-bg-secondary);
        border-bottom: 1px solid var(--color-border);
        overflow-x: auto;
        overflow-y: hidden;
        min-height: 36px;
        scrollbar-width: thin;
      }

      .file-tabs::-webkit-scrollbar {
        height: 2px;
      }

      .file-tabs::-webkit-scrollbar-thumb {
        background: var(--color-border);
        border-radius: var(--radius-full);
      }

      .file-tab {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: 0 var(--spacing-sm);
        padding-right: 2px;
        min-width: 0;
        max-width: 180px;
        height: 36px;
        border: none;
        border-right: 1px solid var(--color-border);
        background: transparent;
        color: var(--color-text-secondary);
        font-family: var(--font-family-sans);
        font-size: var(--font-size-xs);
        cursor: pointer;
        white-space: nowrap;
        transition: background var(--transition-fast), color var(--transition-fast);
        position: relative;
      }

      .file-tab:hover {
        background: var(--color-bg-hover);
        color: var(--color-text-primary);
      }

      .file-tab.active {
        background: var(--color-bg-primary);
        color: var(--color-text-primary);
        box-shadow: inset 0 -2px 0 var(--color-accent);
      }

      .file-tab-name {
        display: flex;
        align-items: center;
        gap: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
        min-width: 0;
      }

      .unsaved-dot {
        display: inline-block;
        width: 6px;
        height: 6px;
        border-radius: var(--radius-full);
        background: var(--color-accent);
        flex-shrink: 0;
      }

      .file-tab-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border: none;
        background: transparent;
        color: var(--color-text-tertiary);
        border-radius: var(--radius-sm);
        cursor: pointer;
        flex-shrink: 0;
        opacity: 0;
        transition: opacity var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
      }

      .file-tab:hover .file-tab-close,
      .file-tab.active .file-tab-close {
        opacity: 1;
      }

      .file-tab-close:hover {
        background: var(--color-bg-hover);
        color: var(--color-text-primary);
      }
    `;
    document.head.appendChild(style);
  }

  private _handleTabClick(path: string): void {
    this.dispatchEvent(
      new CustomEvent('tab-select', {
        detail: { path },
        bubbles: true,
        composed: true
      })
    );
  }

  private _handleTabClose(e: Event, path: string): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('tab-close', {
        detail: { path },
        bubbles: true,
        composed: true
      })
    );
  }

  override render() {
    if (this.tabs.length === 0) return nothing;

    return html`
      <div class="file-tabs" role="tablist">
        ${this.tabs.map(
          (tab) => html`
            <div
              class="file-tab ${tab.path === this.activeTabPath ? 'active' : ''}"
              role="tab"
              aria-selected="${tab.path === this.activeTabPath}"
              tabindex="0"
              title=${tab.path}
              @click=${() => this._handleTabClick(tab.path)}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  this._handleTabClick(tab.path);
                }
              }}
            >
              <span class="file-tab-name">
                ${tab.isModified
                  ? html`<span class="unsaved-dot" title="Ungespeicherte Aenderungen"></span>`
                  : nothing}
                ${tab.filename}
              </span>
              <button
                class="file-tab-close"
                title="Tab schliessen"
                @click=${(e: Event) => this._handleTabClose(e, tab.path)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          `
        )}
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-file-tabs': AosFileTabs;
  }
}
