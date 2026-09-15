/**
 * aos-dokument-leser — renders one Vorhaben document (or the design/ folder)
 * MacDown-near: headings, lists, tables, code, Mermaid, frontmatter table
 * (FA-17). Shadow DOM: the shared markdownStyles plus its own sheet — the
 * reader is used inside other shadow roots, where theme.css never reaches.
 *
 * Stage 1: reading, images from design/, "Dokument geändert — neu laden"
 * with the reading position kept (FA-19). Stage 2 adds the annotation marks.
 */

import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { vorhabenService } from '../../services/vorhaben.service.js';
import { renderMermaidDiagrams } from '../../utils/mermaid-render.js';
import { renderDocument } from './vorhaben-markdown.js';
import { formatClock } from './vorhaben-sort.js';
import { markdownStyles } from '../../styles/markdown-styles.js';
import { dokumentLeserStyles } from './dokument-leser-styles.js';
import type { VorhabenDocKey } from '../../../../src/shared/types/vorhaben.protocol.js';

export type LeserDoc = VorhabenDocKey | 'design';

const IMAGE_RE = /\.(png|jpe?g|svg|webp|gif)$/i;

@customElement('aos-dokument-leser')
export class AosDokumentLeser extends LitElement {
  @property({ type: String }) projectId = '';
  @property({ type: String }) intentId = '';
  @property({ type: String }) doc: LeserDoc = 'intent';
  /** Stand of the document from `vorhaben:state`; a change after loading shows the reload hint. */
  @property({ type: Number }) mtimeMs = 0;
  @property({ type: Array }) designFiles: string[] = [];
  /** Inline content (project-doc preview): no fetch, no reload hint. */
  @property({ type: String }) content: string | undefined = undefined;

  @state() private html = '';
  @state() private loading = false;
  @state() private error = '';
  @state() private loadedMtime = 0;
  @state() private changedAt: number | null = null;
  @state() private images: Record<string, string | null> = {};

  private pendingScrollTo: string | null = null;
  private loadToken = 0;

  static override styles = [markdownStyles, dokumentLeserStyles];

  /** Query root for headings, Mermaid containers and copy buttons. */
  private get root(): ParentNode {
    return this.renderRoot;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('content') && this.content !== undefined) {
      this.html = renderDocument(this.content);
      this.error = '';
      this.changedAt = null;
      return;
    }
    if (changed.has('projectId') || changed.has('intentId') || changed.has('doc') || (changed.has('content') && this.content === undefined)) {
      this.changedAt = null;
      void this.load();
      return;
    }
    if (changed.has('mtimeMs') && this.loadedMtime && this.mtimeMs && Math.abs(this.mtimeMs - this.loadedMtime) >= 1 && this.doc !== 'design') {
      this.changedAt = this.mtimeMs;
    }
    if (changed.has('designFiles') && this.doc === 'design') void this.load();
  }

  protected override async updated(): Promise<void> {
    await renderMermaidDiagrams(this.root);
    if (this.pendingScrollTo) {
      const id = this.pendingScrollTo;
      this.pendingScrollTo = null;
      const target = [...this.root.querySelectorAll<HTMLElement>('[id]')].find((el) => el.id === id);
      target?.scrollIntoView({ block: 'start' });
    }
  }

  /** Reloads the document, keeping the nearest visible heading in view (FA-19). */
  public reload(): void {
    this.pendingScrollTo = this.firstVisibleHeadingId();
    this.changedAt = null;
    void this.load();
  }

  private firstVisibleHeadingId(): string | null {
    const headings = this.root.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
    for (const h of headings) {
      const rect = h.getBoundingClientRect();
      if (rect.bottom >= 0) return h.id;
    }
    return null;
  }

  private async load(): Promise<void> {
    if (this.content !== undefined) return;
    const token = ++this.loadToken;
    if (!this.projectId || !this.intentId) {
      this.html = '';
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      if (this.doc === 'design') {
        const images: Record<string, string | null> = {};
        for (const file of this.designFiles) {
          if (!IMAGE_RE.test(file)) {
            images[file] = null;
            continue;
          }
          try {
            images[file] = await vorhabenService.readDesign(this.projectId, this.intentId, file);
          } catch {
            images[file] = null;
          }
          if (token !== this.loadToken) return;
        }
        this.images = images;
        this.html = '';
      } else {
        const { content, mtimeMs } = await vorhabenService.readDoc(this.projectId, this.intentId, this.doc);
        if (token !== this.loadToken) return;
        this.html = renderDocument(content);
        this.loadedMtime = mtimeMs;
        this.mtimeMs = mtimeMs;
      }
    } catch (err) {
      if (token !== this.loadToken) return;
      this.error = (err as Error).message || 'Dokument konnte nicht geladen werden';
      this.html = '';
    } finally {
      if (token === this.loadToken) this.loading = false;
    }
  }

  private readonly onClick = (event: Event): void => {
    const btn = (event.target as HTMLElement).closest<HTMLButtonElement>('.copy-btn');
    if (!btn) return;
    const code = btn.getAttribute('data-code') ?? '';
    void navigator.clipboard?.writeText(code).then(() => {
      const label = btn.querySelector('.copy-btn-text');
      if (label) {
        label.textContent = 'Kopiert';
        setTimeout(() => {
          label.textContent = 'Copy';
        }, 1500);
      }
    });
  };

  override render() {
    return html`
      <div class="vorhaben-leser" @click=${this.onClick}>
        ${this.changedAt !== null
          ? html`<div class="leser-reload" role="status">
              <span>Dokument geändert um ${formatClock(this.changedAt)}</span>
              <button type="button" class="leser-reload-btn" @click=${() => this.reload()}>neu laden</button>
            </div>`
          : nothing}
        ${this.loading && !this.html ? html`<div class="leser-status">Lädt …</div>` : nothing}
        ${this.error ? html`<div class="leser-status leser-error">${this.error}</div>` : nothing}
        ${this.doc === 'design' ? this.renderDesign() : html`<div class="markdown-body">${unsafeHTML(this.html)}</div>`}
      </div>
    `;
  }

  private renderDesign() {
    if (this.designFiles.length === 0) return html`<div class="leser-status">Keine Dateien unter design/.</div>`;
    return html`<div class="leser-design">
      ${this.designFiles.map((file) => {
        const src = this.images[file];
        return src
          ? html`<figure class="leser-figure"><img src=${src} alt=${file} loading="lazy" /><figcaption>${file}</figcaption></figure>`
          : html`<div class="leser-file">${file}</div>`;
      })}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-dokument-leser': AosDokumentLeser;
  }
}
