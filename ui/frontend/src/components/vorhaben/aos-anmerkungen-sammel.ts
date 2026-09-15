/**
 * aos-anmerkungen-sammel — all Anmerkungen of a document in document order
 * (FA-25, mock 05): reference and text, edit and delete, "so erhält es die
 * Sitzung" (the exact text the backend will build), send. Mac: a sheet over
 * the document; phone: a sheet from the bottom. Marks lost after a document
 * change are shown as "Stelle nicht mehr gefunden" (spec §4).
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Anmerkung } from '../../../../src/shared/types/vorhaben.protocol.js';

@customElement('aos-anmerkungen-sammel')
export class AosAnmerkungenSammel extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Boolean, reflect: true }) mobile = false;
  @property({ attribute: false }) anmerkungen: Anmerkung[] = [];
  /** Ids whose block was not found any more. */
  @property({ type: Array }) lost: string[] = [];
  @property({ type: String }) docFile = '';
  /** e.g. `15.09. 16:42`. */
  @property({ type: String }) standLabel = '';
  /** Preview of the input as the session will receive it. */
  @property({ type: String }) preview = '';
  @property({ type: String }) sessionName = '';
  @property({ type: Boolean }) bereit = false;
  /** Reason text when not ready. */
  @property({ type: String }) grund = '';
  @property({ type: Boolean }) sending = false;

  @state() private editingId: string | null = null;

  static override styles = css`
    :host {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 60;
      font-family: var(--font-family);
    }
    :host([open]) {
      display: block;
    }
    .schleier {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
    }
    .bogen {
      position: absolute;
      left: 50%;
      top: 5vh;
      transform: translateX(-50%);
      width: min(760px, calc(100vw - 32px));
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg, 0 12px 40px rgba(0, 0, 0, 0.4));
      overflow: hidden;
    }
    :host([mobile]) .bogen,
    .bogen.mobil {
      left: 0;
      right: 0;
      top: auto;
      bottom: 0;
      transform: none;
      width: 100%;
      max-height: 85vh;
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      border-bottom: none;
    }
    .griff {
      width: 40px;
      height: 4px;
      border-radius: 2px;
      background: var(--color-border);
      margin: 8px auto 0;
    }
    .kopf {
      display: flex;
      align-items: baseline;
      gap: var(--spacing-sm);
      padding: var(--spacing-md) var(--spacing-lg) var(--spacing-sm);
      border-bottom: 1px solid var(--color-border);
    }
    .kopf h2 {
      margin: 0;
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-semibold);
    }
    .kopf .stand,
    .kopf .reihenfolge {
      font-family: var(--font-family-mono);
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }
    .kopf .reihenfolge {
      margin-left: auto;
    }
    .schliessen {
      background: none;
      border: none;
      color: var(--color-text-secondary);
      font-size: 18px;
      cursor: pointer;
      padding: 0 0 0 var(--spacing-sm);
    }
    .liste {
      overflow-y: auto;
      padding: var(--spacing-md) var(--spacing-lg);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }
    .karte {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--color-bg-secondary);
    }
    .karte.verloren {
      border-color: var(--color-accent-warning);
    }
    .bezug {
      font-family: var(--font-family-mono);
      font-size: var(--font-size-xs);
      color: var(--color-accent-primary);
      margin-bottom: 4px;
      word-break: break-word;
    }
    .karte.verloren .bezug {
      color: var(--color-accent-warning);
    }
    .text {
      font-size: var(--font-size-md);
      white-space: pre-wrap;
      word-break: break-word;
    }
    textarea {
      width: 100%;
      min-height: 64px;
      box-sizing: border-box;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      font: inherit;
      padding: var(--spacing-xs) var(--spacing-sm);
    }
    .karte-aktionen {
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-xs);
    }
    .leer {
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
    }
    .vorschau-titel {
      font-size: var(--font-size-xs);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      margin: var(--spacing-md) 0 var(--spacing-xs);
    }
    .vorschau {
      font-family: var(--font-family-mono);
      font-size: var(--font-size-xs);
      white-space: pre-wrap;
      word-break: break-word;
      background: var(--color-bg-tertiary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--spacing-sm) var(--spacing-md);
      color: var(--color-text-secondary);
    }
    .fuss {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-lg);
      border-top: 1px solid var(--color-border);
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      flex-wrap: wrap;
    }
    .fuss .ziel {
      margin-right: auto;
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
    button.primary {
      background: var(--color-accent-primary);
      border-color: var(--color-accent-primary);
      color: var(--color-bg-primary);
      font-weight: var(--font-weight-semibold);
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .bogen.mobil .fuss {
      flex-direction: column;
      align-items: stretch;
    }
    .bogen.mobil .fuss .ziel {
      order: 3;
      text-align: center;
      margin: 0;
      font-family: var(--font-family-mono);
      font-size: var(--font-size-xs);
    }
    .bogen.mobil .fuss button {
      padding: 10px;
    }
  `;

  private close(): void {
    this.editingId = null;
    this.dispatchEvent(new CustomEvent('sammel-close', { bubbles: true, composed: true }));
  }

  private send(): void {
    this.dispatchEvent(new CustomEvent('sammel-send', { bubbles: true, composed: true }));
  }

  private saveEdit(a: Anmerkung, textarea: HTMLTextAreaElement): void {
    const text = textarea.value.trim();
    this.editingId = null;
    if (!text || text === a.text) return;
    this.dispatchEvent(new CustomEvent<{ anmerkung: Anmerkung }>('anmerkung-save', { bubbles: true, composed: true, detail: { anmerkung: { ...a, text, updatedAt: new Date().toISOString() } } }));
  }

  private loeschen(a: Anmerkung): void {
    this.dispatchEvent(new CustomEvent<{ id: string }>('anmerkung-delete', { bubbles: true, composed: true, detail: { id: a.id } }));
  }

  override render() {
    if (!this.open) return nothing;
    const n = this.anmerkungen.length;
    return html`
      <div class="schleier" @click=${this.close}></div>
      <div class="bogen ${this.mobile ? 'mobil' : ''}" role="dialog" aria-label="Anmerkungen">
        ${this.mobile ? html`<div class="griff"></div>` : nothing}
        <div class="kopf">
          <h2>${n} ${n === 1 ? 'Anmerkung' : 'Anmerkungen'}${this.docFile ? ` zu ${this.docFile}` : ''}</h2>
          ${this.standLabel ? html`<span class="stand">Stand ${this.standLabel}</span>` : nothing}
          <span class="reihenfolge">in Dokumentreihenfolge</span>
          <button type="button" class="schliessen" aria-label="Schließen" @click=${this.close}>✕</button>
        </div>
        <div class="liste">
          ${n === 0 ? html`<div class="leer">Keine Anmerkungen zu diesem Dokument.</div>` : nothing}
          ${this.anmerkungen.map((a, i) => this.renderKarte(a, i))}
          ${n > 0 && this.preview
            ? html`<div class="vorschau-titel">So erhält es die Sitzung</div>
                <pre class="vorschau">${this.preview}</pre>`
            : nothing}
        </div>
        <div class="fuss">
          <span class="ziel">${this.sessionName ? html`an Sitzung <strong>${this.sessionName}</strong> · ${this.bereit ? 'bereit' : this.grund}` : this.grund}</span>
          <button type="button" @click=${this.close}>Schließen</button>
          <button type="button" class="primary" ?disabled=${!this.bereit || n === 0 || this.sending} @click=${this.send}>Änderungen schicken</button>
        </div>
      </div>
    `;
  }

  private renderKarte(a: Anmerkung, i: number) {
    const lost = this.lost.includes(a.id);
    const editing = this.editingId === a.id;
    return html`<div class="karte ${lost ? 'verloren' : ''}">
      <div class="bezug">${i + 1} · Bezug: ${a.ref}${lost ? ' · Stelle nicht mehr gefunden' : ''}</div>
      ${editing
        ? html`<textarea .value=${a.text} aria-label="Anmerkung bearbeiten"></textarea>
            <div class="karte-aktionen">
              <button type="button" @click=${() => (this.editingId = null)}>Abbrechen</button>
              <button type="button" class="primary" @click=${(e: Event) => this.saveEdit(a, (e.target as HTMLElement).closest('.karte')!.querySelector('textarea')!)}>Fertig</button>
            </div>`
        : html`<div class="text">${a.text}</div>
            <div class="karte-aktionen">
              <button type="button" @click=${() => this.loeschen(a)}>Löschen</button>
              <button type="button" @click=${() => (this.editingId = a.id)}>Bearbeiten</button>
            </div>`}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-anmerkungen-sammel': AosAnmerkungenSammel;
  }
}
