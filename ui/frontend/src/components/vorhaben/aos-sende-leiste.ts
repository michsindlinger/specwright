/**
 * aos-sende-leiste — the bar at the bottom of the Vorhaben page (mock 03a,
 * 04a): count of Anmerkungen, target session and readiness, "Alle ansehen",
 * "Änderungen schicken". When the session is not ready the bar names the
 * reason and the next step instead (FA-30); it never sends by itself.
 * INT-2026-010 (FA-22, review F6): „Freigeben" lives in the action bar under
 * the document (aos-vorhaben-seite), not here — one purpose per element.
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { VorhabenRow } from '../../../../src/shared/types/vorhaben.protocol.js';
import { formatClock } from './vorhaben-sort.js';

export type LeisteGrund = 'bereit' | 'keine_sitzung' | 'arbeitet' | 'dialog' | 'beendet';

/** Readiness of the row's session for a send (client-side mirror of the backend checks). */
export function leisteGrund(row: VorhabenRow): LeisteGrund {
  const s = row.session;
  if (!s || row.zustand === 'keine_sitzung') return 'keine_sitzung';
  if (s.ended || row.zustand === 'sitzung_beendet') return 'beendet';
  switch (s.agentStatus) {
    case 'working':
      return 'arbeitet';
    case 'blocked':
      return 'dialog';
    case 'error':
      return 'beendet';
    default:
      return 'bereit';
  }
}

/** INT-2026-007 (FA-09/FA-15): what the session waits for, by dialog kind. */
export function dialogZielText(row: VorhabenRow): string {
  switch (row.zustand) {
    case 'wartet_rueckfrage':
      return 'Sitzung stellt eine Rückfrage — im Terminal antworten';
    case 'wartet_plan':
      return 'Sitzung wartet auf die Plan-Entscheidung — im Terminal';
    case 'wartet_berechtigung':
      return `Sitzung wartet auf eine Berechtigung${row.zustandDetail && row.zustandDetail !== 'Berechtigung' ? ` (${row.zustandDetail})` : ''} — im Terminal`;
    default:
      return `Sitzung fragt im Terminal${row.zustandDetail ? ` (${row.zustandDetail})` : ''}`;
  }
}

@customElement('aos-sende-leiste')
export class AosSendeLeiste extends LitElement {
  @property({ attribute: false }) row!: VorhabenRow;
  @property({ type: Number }) count = 0;
  @property({ type: Boolean, reflect: true }) mobile = false;
  @property({ type: Boolean }) sending = false;
  /** The document changed since it was read (FA-27 warning). */
  @property({ type: Boolean }) docChanged = false;

  static override styles = css`
    /* Mac: fixed above the page (main-content has overflow-x:hidden, so sticky
       would never engage), left of the terminal. With a Gespräch (INT-2026-010,
       FA-12: Gespräch left, document right) the bar starts where the document
       column starts: --gespraech-versatz is the column's left edge, set by
       aos-vorhaben-seite; without a Gespräch both are 0 → full width. */
    :host {
      display: block;
      position: fixed;
      bottom: 0;
      left: calc(var(--gespraech-versatz, 0px) + var(--gespraech-width, 0px));
      right: var(--terminal-open-width, 0px);
      z-index: 50;
      background: var(--color-bg-primary);
      border-top: 1px solid var(--color-border);
      padding: var(--spacing-sm) var(--spacing-xl);
      font-family: var(--font-family);
      font-size: var(--font-size-sm);
      box-shadow: 0 -6px 16px rgba(0, 0, 0, 0.25);
      transition: right 0.3s ease, left 0.3s ease;
    }
    /* Below 1024 px the Gespräch sits under the document (design.md §5) → the bar spans the full width again. */
    @media (max-width: 1023px) {
      :host {
        left: 0;
      }
    }
    /* Phone: sticky at the bottom of the page. */
    :host([mobile]) {
      position: sticky;
      left: auto;
      right: auto;
      padding: var(--spacing-sm) var(--spacing-md);
      box-shadow: none;
    }
    .zeile {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      flex-wrap: wrap;
    }
    .zaehler {
      font-weight: var(--font-weight-semibold);
      white-space: nowrap;
    }
    .ziel {
      color: var(--color-text-secondary);
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    .ziel strong {
      color: var(--color-text-primary);
    }
    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-text-muted);
      flex: none;
    }
    .dot.bereit {
      background: var(--color-accent-primary);
    }
    .dot.arbeitet {
      background: var(--color-accent-success);
    }
    .dot.dialog {
      background: var(--color-accent-warning);
    }
    .dot.beendet {
      background: var(--color-accent-error);
    }
    .aktionen {
      margin-left: auto;
      display: flex;
      gap: var(--spacing-xs);
      align-items: center;
      flex-wrap: wrap;
    }
    button {
      font: inherit;
      font-size: var(--font-size-sm);
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text-primary);
      cursor: pointer;
      white-space: nowrap;
    }
    button.leise {
      border-color: transparent;
      color: var(--color-text-secondary);
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
    .warnung {
      width: 100%;
      color: var(--color-accent-warning);
      font-size: var(--font-size-xs);
    }
    :host([mobile]) .aktionen {
      margin-left: 0;
      width: 100%;
    }
    :host([mobile]) .aktionen button {
      flex: 1;
      padding: 10px;
    }
  `;

  private emit(name: string): void {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true }));
  }

  override render() {
    const grund = leisteGrund(this.row);
    const s = this.row.session;
    const n = this.count;
    const bereit = grund === 'bereit';
    const zaehler = `${n} ${n === 1 ? 'Anmerkung' : 'Anmerkungen'}`;
    return html`<div class="zeile">
      <span class="zaehler">${zaehler}</span>
      ${this.renderZiel(grund, s?.name ?? '')}
      <div class="aktionen">
        ${this.mobile ? nothing : html`<button type="button" class="leise" ?disabled=${n === 0} @click=${() => this.emit('leiste-sammel')}>Alle ansehen</button>`}
        ${this.renderAktionen(grund, bereit)}
      </div>
      ${this.docChanged && bereit
        ? html`<div class="warnung">Dokument geändert seit dem Lesen — Änderungen schicken nennt den gelesenen Stand.</div>`
        : nothing}
    </div>`;
  }

  private renderZiel(grund: LeisteGrund, name: string) {
    switch (grund) {
      case 'bereit':
        return html`<span class="ziel"><span class="dot bereit"></span>an Sitzung <strong>${name}</strong> · bereit</span>`;
      case 'arbeitet':
        return html`<span class="ziel"><span class="dot arbeitet"></span>Sitzung arbeitet — warten</span>`;
      case 'dialog':
        return html`<span class="ziel"><span class="dot dialog"></span>${dialogZielText(this.row)}</span>`;
      case 'beendet':
        return html`<span class="ziel"><span class="dot beendet"></span>Sitzung ‚${name}' beendet${this.endedAt()}</span>`;
      default:
        return html`<span class="ziel"><span class="dot"></span>keine Sitzung zu diesem Vorhaben</span>`;
    }
  }

  private endedAt(): string {
    const last = this.row.lastChangedMs;
    return last ? ` ${formatClock(last)}` : '';
  }

  private renderAktionen(grund: LeisteGrund, bereit: boolean) {
    const n = this.count;
    if (grund === 'dialog') {
      return html`${this.mobile ? html`<button type="button" class="leise" ?disabled=${n === 0} @click=${() => this.emit('leiste-sammel')}>Alle</button>` : nothing}
        <button type="button" @click=${() => this.emit('leiste-terminal')}>Zum Terminal ›</button>`;
    }
    if ((grund === 'keine_sitzung' || grund === 'beendet') && this.row.nextStep) {
      return html`${this.mobile ? html`<button type="button" class="leise" ?disabled=${n === 0} @click=${() => this.emit('leiste-sammel')}>Alle</button>` : nothing}
        <button type="button" @click=${() => this.emit('leiste-next-step')}>${this.row.nextStep.label} ›</button>`;
    }
    return html`${this.mobile ? html`<button type="button" class="leise" ?disabled=${n === 0} @click=${() => this.emit('leiste-sammel')}>Alle</button>` : nothing}
      <button type="button" ?disabled=${!bereit || n === 0 || this.sending} @click=${() => this.emit('leiste-send')}>${this.mobile ? 'Schicken' : 'Änderungen schicken'}</button>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-sende-leiste': AosSendeLeiste;
  }
}
