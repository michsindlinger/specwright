/**
 * aos-anmerkung-editor — the inline field under a chosen block (mock 03a/04b):
 * the derived reference above it (read-only, FA-24), a textarea, "wird auf
 * allen Geräten gespeichert" (FA-26), Löschen/Abbrechen and Fertig. Emits
 * `editor-done {text}`, `editor-delete`, `editor-cancel`; the reader owns
 * the Anmerkung and talks to the backend.
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

@customElement('aos-anmerkung-editor')
export class AosAnmerkungEditor extends LitElement {
  @property({ type: String }) bezug = '';
  @property({ type: String }) text = '';
  /** True for an Anmerkung that does not exist yet (Abbrechen instead of Löschen). */
  @property({ type: Boolean }) neu = true;
  @property({ type: Boolean }) autofocus = true;

  @query('textarea') private textarea?: HTMLTextAreaElement;

  static override styles = css`
    :host {
      display: block;
      margin: var(--spacing-sm) 0 var(--spacing-md);
      border: 1px solid var(--color-accent-primary);
      border-radius: var(--radius-md);
      background: var(--color-bg-secondary);
      padding: var(--spacing-sm) var(--spacing-md);
      font-family: var(--font-family);
    }
    .bezug {
      font-family: var(--font-family-mono);
      font-size: var(--font-size-xs);
      color: var(--color-accent-primary);
      margin-bottom: var(--spacing-xs);
      word-break: break-word;
    }
    textarea {
      width: 100%;
      min-height: 72px;
      box-sizing: border-box;
      resize: vertical;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      font: inherit;
      font-size: var(--font-size-md);
      padding: var(--spacing-xs) var(--spacing-sm);
    }
    textarea:focus {
      outline: 2px solid var(--color-accent-primary);
      outline-offset: 1px;
    }
    .fuss {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-xs);
      flex-wrap: wrap;
    }
    .hinweis {
      font-family: var(--font-family-mono);
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }
    .aktionen {
      display: flex;
      gap: var(--spacing-xs);
      margin-left: auto;
    }
    button {
      font: inherit;
      font-size: var(--font-size-sm);
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
    }
    button.fertig {
      background: var(--color-accent-primary);
      border-color: var(--color-accent-primary);
      color: var(--color-bg-primary);
      font-weight: var(--font-weight-semibold);
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
    }
  `;

  override firstUpdated(): void {
    if (this.autofocus) requestAnimationFrame(() => this.textarea?.focus());
  }

  private done(): void {
    const text = this.textarea?.value.trim() ?? '';
    if (!text) {
      this.cancel();
      return;
    }
    this.dispatchEvent(new CustomEvent<{ text: string }>('editor-done', { bubbles: true, composed: true, detail: { text } }));
  }

  private cancel(): void {
    this.dispatchEvent(new CustomEvent('editor-cancel', { bubbles: true, composed: true }));
  }

  private loeschen(): void {
    this.dispatchEvent(new CustomEvent('editor-delete', { bubbles: true, composed: true }));
  }

  private onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.cancel();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this.done();
    }
  }

  override render() {
    return html`
      <div class="bezug">Bezug: ${this.bezug}</div>
      <textarea .value=${this.text} placeholder="Anmerkung …" @keydown=${this.onKey} aria-label="Anmerkung"></textarea>
      <div class="fuss">
        <span class="hinweis">wird auf allen Geräten gespeichert</span>
        <div class="aktionen">
          ${this.neu
            ? html`<button type="button" @click=${this.cancel}>Abbrechen</button>`
            : html`<button type="button" @click=${this.loeschen}>Löschen</button>`}
          <button type="button" class="fertig" @click=${this.done}>Fertig</button>
        </div>
      </div>
      ${nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-anmerkung-editor': AosAnmerkungEditor;
  }
}
