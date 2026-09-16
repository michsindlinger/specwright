/**
 * aos-gespraech-eingabe — the input under the Gespräch (INT-2026-007, mock
 * 08a–d): a text field, Enter sends / Shift+Enter breaks the line, the button
 * reads „Senden" (session waits) or „Einreihen" (session works, AN-S09).
 * When sending is not possible the field is locked and the reason stands in
 * place of the button (FA-06/FA-15); a finished session offers the next step
 * (Ablauf L). The text stays in the field while locked — nothing is sent by
 * itself. Light DOM.
 */

import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export type EingabeModus = 'senden' | 'einreihen' | 'gesperrt';

@customElement('aos-gespraech-eingabe')
export class AosGespraechEingabe extends LitElement {
  @property({ type: String }) modus: EingabeModus = 'senden';
  /** Reason shown when locked (also under „Einreihen" as hint). */
  @property({ type: String }) grund = '';
  @property({ type: Boolean }) sending = false;
  /** Label of the next step button (session ended / none) — empty = no button. */
  @property({ type: String }) nextStepLabel = '';
  /** Offer „Im Terminal öffnen" next to the reason (no Gespräch, permission). */
  @property({ type: Boolean }) terminalKnopf = false;
  @property({ type: String }) fehler = '';

  @state() private text = '';

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  /** The current draft (kept while locked; cleared after a successful send). */
  get value(): string {
    return this.text;
  }

  set value(v: string) {
    this.text = v;
    const ta = this.querySelector('textarea');
    if (ta && ta.value !== v) ta.value = v;
  }

  private emit(name: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));
  }

  private submit(): void {
    if (this.modus === 'gesperrt' || this.sending) return;
    const text = this.text.trim();
    if (!text) return;
    this.emit('gespraech-send', { text });
  }

  private onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      this.submit();
    }
  }

  private onInput(e: Event): void {
    this.text = (e.target as HTMLTextAreaElement).value;
  }

  override render() {
    const locked = this.modus === 'gesperrt';
    const empty = this.text.trim().length === 0;
    return html`<div class="gespraech-eingabe ${locked ? 'gesperrt' : ''}">
      <textarea
        class="gespraech-feld"
        rows="2"
        placeholder=${locked ? 'Eingabe nicht möglich — Grund unten' : 'Nachricht an die Sitzung …'}
        aria-label="Nachricht an die Sitzung"
        .value=${this.text}
        ?disabled=${locked}
        @input=${this.onInput}
        @keydown=${this.onKeydown}
      ></textarea>
      ${this.fehler ? html`<div class="gespraech-fehler" role="alert">${this.fehler}</div>` : nothing}
      <div class="gespraech-eingabe-zeile">
        ${locked
          ? html`<span class="gespraech-grund"><span class="gespraech-dot mute"></span>${this.grund}</span>`
          : html`<span class="gespraech-kbd">⏎ senden · ⇧⏎ neue Zeile${this.modus === 'einreihen' && this.grund ? ` · ${this.grund}` : ''}</span>`}
        <span class="gespraech-grow"></span>
        ${locked && this.terminalKnopf ? html`<button type="button" class="gespraech-btn" @click=${() => this.emit('gespraech-terminal')}>Im Terminal öffnen ↗</button>` : nothing}
        ${locked && this.nextStepLabel ? html`<button type="button" class="gespraech-btn primary" @click=${() => this.emit('gespraech-next-step')}>${this.nextStepLabel}</button>` : nothing}
        ${!locked
          ? html`<button type="button" class="gespraech-btn ${this.modus === 'senden' ? 'primary' : ''}" ?disabled=${empty || this.sending} @click=${this.submit}>
              ${this.modus === 'einreihen' ? 'Einreihen' : 'Senden'}
            </button>`
          : nothing}
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-gespraech-eingabe': AosGespraechEingabe;
  }
}
