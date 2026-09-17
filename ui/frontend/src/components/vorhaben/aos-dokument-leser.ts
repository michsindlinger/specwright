/**
 * aos-dokument-leser — renders one Vorhaben document (or the design/ folder)
 * MacDown-near: headings, lists, tables, code, Mermaid, frontmatter table
 * (FA-17). Shadow DOM: the shared markdownStyles plus its own sheet — the
 * reader is used inside other shadow roots, where theme.css never reaches.
 *
 * Stage 1: reading, images from design/, "Dokument geändert — neu laden"
 * with the reading position kept (FA-19). Stage 2: every block is an anchor
 * (FA-23) — on the Mac a mark in the left gutter (click, or Enter/Space on
 * the focused block) opens the inline editor under the block; on the phone a
 * tap shows "Anmerkung | Kopieren" first, never the field straight away.
 * The reference comes from the block (FA-24, vorhaben-anchors.ts). Existing
 * Anmerkungen show as numbered marks and are relocated by text after the
 * document changed. The editor is inserted imperatively into the rendered
 * HTML (unsafeHTML keeps it until the document is re-rendered).
 *
 * Stage 3 (INT-2026-010, FA-13/FA-14): a fully marked document (INT-2026-009
 * reader markers) shows its agent sections as closed `<details class="technik">`
 * and a switch "Technik zeigen | ausblenden" above the body; the switch is
 * transient per page visit (PO decision, not user state). Unmarked and partly
 * marked documents stay fully open without the switch (AN-S03). Jumps into a
 * closed section open its `<details>` ancestors first (`ensureSichtbar`).
 */

import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { vorhabenService } from '../../services/vorhaben.service.js';
import { renderMermaidDiagrams } from '../../utils/mermaid-render.js';
import { renderDocument } from './vorhaben-markdown.js';
import { formatClock } from './vorhaben-sort.js';
import { DOKUMENT_GESAMT, deriveAnchors, locateAnmerkung, type BlockAnchor } from './vorhaben-anchors.js';
import { markdownStyles } from '../../styles/markdown-styles.js';
import { dokumentLeserStyles } from './dokument-leser-styles.js';
import type { Anmerkung, VorhabenDocKey } from '../../../../src/shared/types/vorhaben.protocol.js';
import './aos-anmerkung-editor.js';
import type { AosAnmerkungEditor } from './aos-anmerkung-editor.js';

export type LeserDoc = VorhabenDocKey | 'design';

const IMAGE_RE = /\.(png|jpe?g|svg|webp|gif)$/i;
/** Width of the click gutter left of a block (matches the CSS mark). */
const GUTTER_PX = 32;

interface Editing {
  /** -1 = "Dokument gesamt". */
  ordinal: number;
  ref: string;
  snippet: string;
  /** Existing Anmerkung being edited, else undefined. */
  id?: string;
  text: string;
}

export function newAnmerkungId(): string {
  return `an-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

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
  /** Stage 2: blocks can be annotated (Vorhaben documents, not the project-doc preview). */
  @property({ type: Boolean }) annotierbar = false;
  @property({ type: Boolean }) mobile = false;
  /** Drafts of this document (from `vorhaben:state`). */
  @property({ attribute: false }) anmerkungen: Anmerkung[] = [];

  @state() private html = '';
  /** FA-13: the loaded document is fully marked → technik sections are collapsible. */
  @state() private gekennzeichnet = false;
  /** Transient "Technik zeigen" state of this document view (reset when another document loads). */
  @state() private technikOffen = false;
  @state() private loading = false;
  @state() private error = '';
  @state() private loadedMtime = 0;
  @state() private changedAt: number | null = null;
  @state() private images: Record<string, string | null> = {};
  @state() private editing: Editing | null = null;

  private pendingScrollTo: string | null = null;
  private loadToken = 0;
  private anchors: BlockAnchor[] = [];
  private anchorsHtml = '';
  private editorEl: AosAnmerkungEditor | null = null;
  private tapbarEl: HTMLElement | null = null;
  private lastLostKey = '';

  static override styles = [markdownStyles, dokumentLeserStyles];

  /** Query root for headings, Mermaid containers and copy buttons. */
  private get root(): ParentNode {
    return this.renderRoot;
  }

  private get body(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>('.markdown-body');
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('content') && this.content !== undefined) {
      this.setRendered(renderDocument(this.content));
      this.technikOffen = false;
      this.error = '';
      this.changedAt = null;
      return;
    }
    if (changed.has('projectId') || changed.has('intentId') || changed.has('doc') || (changed.has('content') && this.content === undefined)) {
      this.changedAt = null;
      this.editing = null;
      this.technikOffen = false;
      void this.load();
      return;
    }
    if (changed.has('mtimeMs') && this.loadedMtime && this.mtimeMs && Math.abs(this.mtimeMs - this.loadedMtime) >= 1 && this.doc !== 'design') {
      this.changedAt = this.mtimeMs;
    }
    if (changed.has('designFiles') && this.doc === 'design') void this.load();
  }

  protected override async updated(changed: PropertyValues): Promise<void> {
    // Synchronous DOM work first: right after the commit the DOM matches
    // `this.html`; after an await a newer load may already have replaced it.
    if (changed.has('html') || changed.has('anmerkungen') || changed.has('annotierbar') || changed.has('mobile')) this.syncAnchors();
    if (changed.has('html') || changed.has('technikOffen')) this.applyTechnik();
    if (changed.has('editing') || changed.has('html')) this.syncEditor();
    await renderMermaidDiagrams(this.root);
    if (this.pendingScrollTo) {
      const id = this.pendingScrollTo;
      this.pendingScrollTo = null;
      const target = [...this.root.querySelectorAll<HTMLElement>('[id]')].find((el) => el.id === id);
      if (target) {
        this.ensureSichtbar(target);
        target.scrollIntoView({ block: 'start' });
      }
    }
  }

  private setRendered(rendered: { html: string; gekennzeichnet: boolean }): void {
    this.html = rendered.html;
    this.gekennzeichnet = rendered.gekennzeichnet;
  }

  // ---- technik sections (FA-13) ----

  /** Sets `open` on every technik section to the switch state (fresh HTML renders them closed). */
  private applyTechnik(): void {
    // Attribute, not the `open` property: identical in browsers, and happy-dom (tests) has no HTMLDetailsElement.
    this.root.querySelectorAll<HTMLElement>('details.technik').forEach((d) => d.toggleAttribute('open', this.technikOffen));
  }

  private toggleTechnik(): void {
    this.technikOffen = !this.technikOffen;
  }

  /** Opens every closed `<details>` above `el` so a jump or an editor lands on a visible block. */
  private ensureSichtbar(el: Element): void {
    const ownSummary = el.closest('summary')?.parentElement ?? null; // a summary heading is visible while its box is closed
    let d = el.parentElement?.closest<HTMLElement>('details') ?? null;
    while (d) {
      if (d !== ownSummary) d.setAttribute('open', '');
      d = d.parentElement?.closest<HTMLElement>('details') ?? null;
    }
  }

  /** A heading inside a closed `<details>` (not its summary) is not on screen. */
  private isVerborgen(el: Element): boolean {
    const ownSummary = el.closest('summary')?.parentElement ?? null;
    let d = el.parentElement?.closest<HTMLElement>('details') ?? null;
    while (d) {
      if (d !== ownSummary && !d.hasAttribute('open')) return true;
      d = d.parentElement?.closest<HTMLElement>('details') ?? null;
    }
    return false;
  }

  /** Reloads the document, keeping the nearest visible heading in view (FA-19). */
  public reload(): void {
    this.pendingScrollTo = this.firstVisibleHeadingId();
    this.changedAt = null;
    void this.load();
  }

  /** Opens the editor for "Dokument gesamt" (action above the document). */
  public openGesamt(): void {
    this.editing = { ordinal: -1, ref: DOKUMENT_GESAMT, snippet: '', text: '' };
  }

  /** Scrolls to and opens an existing Anmerkung (from the collection view). */
  public openAnmerkung(id: string): void {
    const a = this.anmerkungen.find((x) => x.id === id);
    if (!a) return;
    const anchor = locateAnmerkung(this.anchors, a);
    if (!anchor) {
      this.editing = { ordinal: -1, ref: a.ref, snippet: a.snippet, id: a.id, text: a.text };
      return;
    }
    this.ensureSichtbar(anchor.element);
    anchor.element.scrollIntoView({ block: 'center' });
    this.editing = { ordinal: anchor.ordinal, ref: a.ref, snippet: a.snippet, id: a.id, text: a.text };
  }

  private firstVisibleHeadingId(): string | null {
    const headings = this.root.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
    for (const h of headings) {
      if (this.isVerborgen(h)) continue;
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
        this.setRendered(renderDocument(content));
        this.loadedMtime = mtimeMs;
        this.mtimeMs = mtimeMs;
        // The page remembers the stand Michael read (FA-27/FA-28 "Stand").
        this.dispatchEvent(new CustomEvent<{ mtimeMs: number }>('leser-loaded', { bubbles: true, composed: true, detail: { mtimeMs } }));
      }
    } catch (err) {
      if (token !== this.loadToken) return;
      this.error = (err as Error).message || 'Dokument konnte nicht geladen werden';
      this.html = '';
    } finally {
      if (token === this.loadToken) this.loading = false;
    }
  }

  // ---- anchors and marks (FA-23/FA-24) ----

  /** Derives anchors once per rendered HTML and paints the marks of existing Anmerkungen. */
  private syncAnchors(): void {
    const body = this.body;
    if (!body) {
      this.anchors = [];
      return;
    }
    if (this.anchorsHtml !== this.html) {
      this.anchors = deriveAnchors(body);
      this.anchorsHtml = this.html;
      this.anchors.forEach((a) => {
        a.element.setAttribute('data-ordinal', String(a.ordinal));
      });
    }
    for (const a of this.anchors) {
      a.element.removeAttribute('data-anmerkung');
      if (this.annotierbar && !this.mobile) a.element.setAttribute('tabindex', '0');
      else a.element.removeAttribute('tabindex');
    }
    body.classList.toggle('annotierbar', this.annotierbar);
    body.classList.toggle('mobil', this.mobile);
    if (!this.annotierbar) return;
    const lost: string[] = [];
    this.anmerkungen.forEach((a, i) => {
      if (a.ordinal < 0) return;
      const anchor = locateAnmerkung(this.anchors, a);
      if (!anchor) {
        lost.push(a.id);
        return;
      }
      const prev = anchor.element.getAttribute('data-anmerkung');
      anchor.element.setAttribute('data-anmerkung', prev ? `${prev},${i + 1}` : String(i + 1));
    });
    const key = lost.join(',');
    if (key !== this.lastLostKey) {
      this.lastLostKey = key;
      this.dispatchEvent(new CustomEvent<{ lost: string[] }>('anmerkungen-located', { bubbles: true, composed: true, detail: { lost } }));
    }
  }

  private anchorOf(el: Element | null): BlockAnchor | undefined {
    const block = el?.closest<HTMLElement>('[data-ordinal]');
    if (!block) return undefined;
    return this.anchors[Number(block.getAttribute('data-ordinal'))];
  }

  /** Editor for a block: an existing Anmerkung of the block is edited, else a new one starts. */
  private openFor(anchor: BlockAnchor): void {
    this.removeTapbar();
    const existing = this.anmerkungen.find((a) => locateAnmerkung(this.anchors, a)?.ordinal === anchor.ordinal);
    this.editing = existing
      ? { ordinal: anchor.ordinal, ref: existing.ref, snippet: existing.snippet, id: existing.id, text: existing.text }
      : { ordinal: anchor.ordinal, ref: anchor.ref, snippet: anchor.snippet, text: '' };
  }

  /** Where an editor or tap bar goes: after the block, after the table for rows, after the code box. */
  private insertionPoint(anchor: BlockAnchor): HTMLElement {
    const el = anchor.element;
    if (el.tagName === 'TR') return el.closest<HTMLElement>('table') ?? el;
    if (el.tagName === 'PRE') return el.closest<HTMLElement>('.code-block') ?? el;
    return el;
  }

  private syncEditor(): void {
    if (this.editorEl) {
      this.editorEl.remove();
      this.editorEl = null;
    }
    this.root.querySelectorAll('.leser-aktiv').forEach((el) => el.classList.remove('leser-aktiv'));
    const ed = this.editing;
    if (!ed || ed.ordinal < 0) return; // "Dokument gesamt" is rendered by the template
    const anchor = this.anchors[ed.ordinal];
    if (!anchor || !anchor.element.isConnected) return;
    const el = document.createElement('aos-anmerkung-editor');
    el.bezug = ed.ref;
    el.text = ed.text;
    el.neu = !ed.id;
    el.addEventListener('editor-done', (e) => this.onEditorDone((e as CustomEvent<{ text: string }>).detail.text));
    el.addEventListener('editor-cancel', () => (this.editing = null));
    el.addEventListener('editor-delete', () => this.onEditorDelete());
    this.insertionPoint(anchor).insertAdjacentElement('afterend', el);
    anchor.element.classList.add('leser-aktiv');
    this.editorEl = el;
  }

  private onEditorDone(text: string): void {
    const ed = this.editing;
    if (!ed) return;
    const anmerkung: Anmerkung = {
      id: ed.id ?? newAnmerkungId(),
      ordinal: ed.ordinal,
      ref: ed.ref,
      snippet: ed.snippet,
      text,
      updatedAt: new Date().toISOString(),
    };
    this.editing = null;
    this.dispatchEvent(new CustomEvent<{ anmerkung: Anmerkung }>('anmerkung-save', { bubbles: true, composed: true, detail: { anmerkung } }));
  }

  private onEditorDelete(): void {
    const id = this.editing?.id;
    this.editing = null;
    if (id) this.dispatchEvent(new CustomEvent<{ id: string }>('anmerkung-delete', { bubbles: true, composed: true, detail: { id } }));
  }

  // ---- phone: tap → action bar ----

  private showTapbar(anchor: BlockAnchor): void {
    this.removeTapbar();
    const bar = document.createElement('div');
    bar.className = 'leser-tapbar';
    bar.setAttribute('role', 'toolbar');
    const anm = document.createElement('button');
    anm.type = 'button';
    anm.className = 'leser-tapbar-btn primary';
    anm.textContent = '✎ Anmerkung';
    anm.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openFor(anchor);
    });
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'leser-tapbar-btn';
    copy.textContent = 'Kopieren';
    copy.addEventListener('click', (e) => {
      e.stopPropagation();
      void navigator.clipboard?.writeText(anchor.snippet);
      this.removeTapbar();
    });
    bar.append(anm, copy);
    this.insertionPoint(anchor).insertAdjacentElement('afterend', bar);
    anchor.element.classList.add('leser-getippt');
    this.tapbarEl = bar;
  }

  private removeTapbar(): void {
    if (!this.tapbarEl) return;
    this.tapbarEl.remove();
    this.tapbarEl = null;
    this.root.querySelectorAll('.leser-getippt').forEach((el) => el.classList.remove('leser-getippt'));
  }

  private readonly onClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    const btn = target.closest<HTMLButtonElement>('.copy-btn');
    if (btn) {
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
      return;
    }
    if (!this.annotierbar) return;
    if (target.closest('aos-anmerkung-editor, .leser-tapbar')) return;
    const anchor = this.anchorOf(target);
    if (!anchor) {
      this.removeTapbar();
      return;
    }
    if (this.mobile) {
      // Tap = action bar first (spec: never the field straight away).
      if (this.tapbarEl && anchor.element.classList.contains('leser-getippt')) this.removeTapbar();
      else this.showTapbar(anchor);
      return;
    }
    // Mac: the mark in the left gutter opens; clicks inside the text keep selecting text.
    const rect = anchor.element.getBoundingClientRect();
    if (event.clientX < rect.left && event.clientX >= rect.left - GUTTER_PX) this.openFor(anchor);
    else if (anchor.element.hasAttribute('data-anmerkung') && !window.getSelection()?.toString()) this.openFor(anchor);
  };

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (!this.annotierbar || this.mobile) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target as HTMLElement;
    if (target.closest('aos-anmerkung-editor, a, button, input, textarea')) return;
    const anchor = this.anchorOf(target);
    if (!anchor || target !== anchor.element) return;
    event.preventDefault();
    this.openFor(anchor);
  };

  override render() {
    const gesamt = this.editing && this.editing.ordinal < 0 ? this.editing : null;
    return html`
      <div class="vorhaben-leser" @click=${this.onClick} @keydown=${this.onKeydown}>
        ${this.changedAt !== null
          ? html`<div class="leser-reload" role="status">
              <span>Dokument geändert um ${formatClock(this.changedAt)}</span>
              <button type="button" class="leser-reload-btn" @click=${() => this.reload()}>neu laden</button>
            </div>`
          : nothing}
        ${this.annotierbar && this.doc !== 'design' && this.html
          ? html`<div class="leser-werkzeuge">
              <button type="button" class="leser-gesamt-btn" @click=${() => this.openGesamt()}>Allgemeine Anmerkung</button>
              ${this.mobile ? html`<span class="leser-tipp">Tippe auf eine Stelle für eine Anmerkung</span>` : html`<span class="leser-tipp">Marke am Rand oder Enter auf einer Stelle: Anmerkung</span>`}
            </div>`
          : nothing}
        ${gesamt
          ? html`<aos-anmerkung-editor
              .bezug=${gesamt.ref}
              .text=${gesamt.text}
              .neu=${!gesamt.id}
              @editor-done=${(e: CustomEvent<{ text: string }>) => this.onEditorDone(e.detail.text)}
              @editor-cancel=${() => (this.editing = null)}
              @editor-delete=${() => this.onEditorDelete()}
            ></aos-anmerkung-editor>`
          : nothing}
        ${this.gekennzeichnet && this.doc !== 'design' && this.html
          ? html`<div class="leser-technik">
              <button type="button" class="leser-technik-btn" aria-pressed=${this.technikOffen ? 'true' : 'false'} @click=${() => this.toggleTechnik()}>
                ${this.technikOffen ? 'Technik ausblenden' : 'Technik zeigen'}
              </button>
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
