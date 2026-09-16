/**
 * aos-vorhaben-protokoll — what was sent to which session and whether it
 * arrived (FA-31, mock 03a/06): the newest entry as one line, the rest
 * behind "n weitere Einträge"; each entry can show the exact text. A pending
 * entry turns into "angenommen HH:MM" or "nicht bestätigt — im Terminal
 * prüfen" (the backend decides, this only renders the state).
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ProtokollEintrag } from '../../../../src/shared/types/vorhaben.protocol.js';
import { VORHABEN_DOC_FILES } from '../../../../src/shared/types/vorhaben.protocol.js';
import { formatClock } from './vorhaben-sort.js';

/** Label per Art (R-6): reader sends, free text and card answers of the Gespräch (INT-2026-007). */
export function protokollLabel(e: ProtokollEintrag): string {
  switch (e.art) {
    case 'freigabe':
      return e.doc ? `Freigabe ${VORHABEN_DOC_FILES[e.doc]}` : 'Freigabe';
    case 'aenderungen':
      return `Änderungen (${e.anzahl})`;
    case 'freitext':
      return e.status === 'eingereiht' ? 'Nachricht (eingereiht)' : 'Nachricht';
    case 'rueckfrage':
      return 'Antwort auf Rückfrage';
    case 'plan':
      return 'Plan-Entscheidung';
  }
}

@customElement('aos-vorhaben-protokoll')
export class AosVorhabenProtokoll extends LitElement {
  /** Entries of this Vorhaben, newest first. */
  @property({ attribute: false }) entries: ProtokollEintrag[] = [];
  @property({ type: Boolean }) mobile = false;

  @state() private expanded = false;
  @state() private openText = new Set<string>();

  static override styles = css`
    :host {
      display: block;
      margin-bottom: var(--spacing-md);
      font-family: var(--font-family);
      font-size: var(--font-size-sm);
    }
    .rahmen {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--spacing-xs) var(--spacing-md);
    }
    .eintrag {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      flex-wrap: wrap;
      padding: 4px 0;
    }
    .eintrag + .eintrag {
      border-top: 1px solid var(--color-border);
    }
    .label {
      color: var(--color-text-muted);
      margin-right: var(--spacing-xs);
    }
    .art {
      font-weight: var(--font-weight-semibold);
    }
    .zeit {
      color: var(--color-text-secondary);
    }
    .angenommen {
      color: var(--color-accent-success);
    }
    .offen {
      color: var(--color-text-muted);
    }
    .nicht {
      color: var(--color-accent-warning);
    }
    button {
      background: none;
      border: none;
      color: var(--color-text-secondary);
      font: inherit;
      font-size: var(--font-size-sm);
      cursor: pointer;
      padding: 0;
    }
    button.terminal {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 2px 8px;
      color: var(--color-text-primary);
    }
    .text {
      width: 100%;
      font-family: var(--font-family-mono);
      font-size: var(--font-size-xs);
      white-space: pre-wrap;
      word-break: break-word;
      background: var(--color-bg-tertiary);
      border-radius: var(--radius-sm);
      padding: var(--spacing-xs) var(--spacing-sm);
      color: var(--color-text-secondary);
    }
    .mehr {
      margin-left: auto;
      font-family: var(--font-family-mono);
      font-size: var(--font-size-xs);
    }
  `;

  private toggleText(id: string): void {
    const next = new Set(this.openText);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.openText = next;
  }

  private terminal(e: ProtokollEintrag): void {
    this.dispatchEvent(new CustomEvent<{ sessionId: string }>('protokoll-terminal', { bubbles: true, composed: true, detail: { sessionId: e.sessionId } }));
  }

  override render() {
    if (this.entries.length === 0) return nothing;
    const shown = this.expanded ? this.entries : this.entries.slice(0, 1);
    const rest = this.entries.length - 1;
    return html`<div class="rahmen" aria-label="Protokoll">
      ${shown.map((e, i) => this.renderEintrag(e, i === 0 && rest > 0))}
    </div>`;
  }

  private renderEintrag(e: ProtokollEintrag, withMore: boolean) {
    const art = protokollLabel(e);
    const sent = formatClock(new Date(e.sentAt).getTime());
    const rest = this.entries.length - 1;
    return html`<div class="eintrag">
        <span class="label">Protokoll</span>
        <span class="art">${art}</span>
        <span>an ‚${e.sessionName}'${e.art === 'aenderungen' && e.doc ? ` · ${VORHABEN_DOC_FILES[e.doc]}` : ''}${e.stand ? ` (${e.stand})` : ''}</span>
        <span class="zeit">gesendet ${sent}</span>
        ${e.status === 'angenommen' && e.acceptedAt
          ? html`<span class="angenommen">angenommen ${formatClock(new Date(e.acceptedAt).getTime())}</span>`
          : e.status === 'nicht_bestaetigt'
            ? html`<span class="nicht">nicht bestätigt — im Terminal prüfen</span>
                <button type="button" class="terminal" @click=${() => this.terminal(e)}>Zum Terminal ›</button>`
            : html`<span class="offen">wartet auf Bestätigung …</span>`}
        <button type="button" @click=${() => this.toggleText(e.id)}>${this.openText.has(e.id) ? '▾ Text' : '▸ Text'}</button>
        ${withMore
          ? html`<button type="button" class="mehr" @click=${() => (this.expanded = true)}>▸ ${rest} ${rest === 1 ? 'weiterer Eintrag' : 'weitere Einträge'}</button>`
          : nothing}
        ${this.openText.has(e.id) ? html`<pre class="text">${e.text}</pre>` : nothing}
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-vorhaben-protokoll': AosVorhabenProtokoll;
  }
}
