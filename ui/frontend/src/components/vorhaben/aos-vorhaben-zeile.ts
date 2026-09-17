/**
 * aos-vorhaben-zeile — one row of the overview (mock 01/02): project,
 * id, title, phase (+ note), state (+ detail, model), last change. A view,
 * not a board: no drag, no status controls (FA-08). The phase column is
 * bounded (INT-2026-013, AK-01): the note is clipped with an ellipsis
 * before the title gives up any width.
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { VorhabenRow } from '../../../../src/shared/types/vorhaben.protocol.js';
import { PHASE_LABELS, ZUSTAND_LABELS, STEP_LABELS, groupOf, relativeTime } from './vorhaben-sort.js';

@customElement('aos-vorhaben-zeile')
export class AosVorhabenZeile extends LitElement {
  @property({ attribute: false }) row!: VorhabenRow;

  static override styles = css`
    :host {
      display: block;
    }
    .zeile {
      display: grid;
      grid-template-columns: minmax(90px, 130px) 118px minmax(0, 1fr) minmax(0, max-content) minmax(150px, auto) 70px;
      gap: var(--spacing-md);
      align-items: center;
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--color-border);
      border-left-width: 3px;
      border-radius: var(--radius-md);
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      text-align: left;
      width: 100%;
      cursor: pointer;
      font: inherit;
    }
    .zeile:hover {
      background: var(--color-bg-hover, var(--color-bg-tertiary));
    }
    .zeile:focus-visible {
      outline: 2px solid var(--color-accent-primary);
      outline-offset: 1px;
    }
    .zeile.g-wartet_auf_dich {
      border-left-color: var(--color-accent-primary);
    }
    .zeile.g-wartet {
      border-left-color: var(--color-accent-warning);
    }
    .projekt {
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .id {
      font-family: var(--font-family-mono);
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }
    .titel {
      font-weight: var(--font-weight-semibold);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .phase {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: var(--font-size-sm);
      white-space: nowrap;
      /* The item's max-width bounds its max-content contribution to the track (overflow alone would not). */
      max-width: 36ch;
      min-width: 0;
      overflow: hidden;
    }
    .badge {
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--color-bg-tertiary);
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
    }
    .note {
      color: var(--color-text-muted);
      font-family: var(--font-family-mono);
      font-size: var(--font-size-sm);
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .zustand {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: var(--font-size-sm);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-text-muted);
      flex: none;
    }
    .dot.wartet_auf_dich {
      background: var(--color-accent-primary);
    }
    .dot.wartet,
    .dot.wartet_rueckfrage,
    .dot.wartet_plan,
    .dot.wartet_berechtigung {
      background: var(--color-accent-warning);
    }
    .dot.arbeitet {
      background: var(--color-accent-success);
    }
    .zustand strong {
      font-weight: var(--font-weight-semibold);
    }
    .detail {
      color: var(--color-text-secondary);
    }
    .zeit {
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
      text-align: right;
      white-space: nowrap;
    }
    @media (max-width: 767px) {
      .zeile {
        grid-template-columns: 1fr auto;
        grid-template-areas: 'kopf zeit' 'titel titel' 'phase zustand';
        gap: var(--spacing-xs) var(--spacing-sm);
      }
      .kopf {
        grid-area: kopf;
        display: flex;
        gap: var(--spacing-xs);
        min-width: 0;
      }
      .zeit {
        grid-area: zeit;
      }
      .titel {
        grid-area: titel;
        white-space: normal;
      }
      .phase {
        grid-area: phase;
      }
      .zustand {
        grid-area: zustand;
        justify-self: end;
      }
    }
    @media (min-width: 768px) {
      .kopf {
        display: contents;
      }
    }
  `;

  private open(): void {
    this.dispatchEvent(new CustomEvent<{ row: VorhabenRow }>('vorhaben-open', { bubbles: true, composed: true, detail: { row: this.row } }));
  }

  override render() {
    const r = this.row;
    const group = groupOf(r);
    const detail = r.zustand === 'wartet_auf_dich' && r.step ? `${STEP_LABELS[r.step]} · ${r.zustandDetail}` : r.zustandDetail;
    return html`
      <button
        type="button"
        class="zeile g-${group}"
        aria-label="${r.projectName} ${r.intentId} ${r.titel}"
        @click=${this.open}
      >
        <span class="kopf">
          <span class="projekt">${r.projectName}</span>
          <span class="id">${r.intentId}</span>
        </span>
        <span class="titel">${r.titel}</span>
        <span class="phase">
          <span class="badge">${PHASE_LABELS[r.phase]}</span>
          ${r.phaseNote ? html`<span class="note">${r.phaseNote}</span>` : nothing}
        </span>
        <span class="zustand">
          <span class="dot ${r.zustand}"></span>
          <strong>${ZUSTAND_LABELS[r.zustand]}</strong>
          ${detail ? html`<span class="detail">· ${detail}</span>` : nothing}
        </span>
        <span class="zeit">${relativeTime(r.lastChangedMs)}</span>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-vorhaben-zeile': AosVorhabenZeile;
  }
}
