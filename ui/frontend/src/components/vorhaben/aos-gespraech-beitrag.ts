/**
 * aos-gespraech-beitrag — one contribution of the Gespräch (INT-2026-007,
 * mock 08): Michael's input (right, with source and send status), Claude's
 * text (left, rendered Markdown, FA-05), a collapsed work block (count and
 * duration only, FA-04) or a dialog card. Stage 1 shows open dialogs as the
 * generic hint card „Sitzung wartet · … — im Terminal antworten" with „Im
 * Terminal öffnen" (FA-21); closed ones stay as „Antwort: …" / „Plan: …".
 * Light DOM (styles in theme.css under `.gespraech`), so `.markdown-body`
 * applies.
 */

import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { Beitrag, BlockKind, DialogKarte } from '../../../../src/shared/types/gespraech.protocol.js';
import { renderBeitrag } from './vorhaben-markdown.js';
import { formatClock } from './vorhaben-sort.js';

export const DIALOG_KIND_LABELS: Record<BlockKind, string> = {
  rueckfrage: 'Rückfrage',
  plan: 'Plan-Entscheidung',
  berechtigung: 'Berechtigung',
  unbekannt: 'Dialog',
};

const QUELLE_LABELS: Record<string, string> = {
  terminal: 'Terminal',
  leser: 'Leser',
  gesprochen: 'gesprochen',
  ui: '',
};

/** "0:35 min" / "12:04 min" from milliseconds. */
export function formatDauer(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')} min`;
}

/** Clock of an ISO timestamp, '' when unknown. */
export function clockOf(at?: string): string {
  if (!at) return '';
  const ms = Date.parse(at);
  return Number.isFinite(ms) ? formatClock(ms) : '';
}

/** Text of a closed dialog as it stays in the Verlauf (FA-13/FA-17/FA-14). */
export function dialogErgebnisText(d: DialogKarte): string {
  if (d.zustand === 'verfallen') return `${DIALOG_KIND_LABELS[d.kind]} · nicht beantwortet — Sitzung beendet`;
  const e = d.ergebnis;
  const wo = e?.durch === 'terminal' ? ' (im Terminal)' : e?.durch === 'unbekannt' ? ' (im Terminal beantwortet)' : '';
  if (d.kind === 'rueckfrage') {
    const answers = e?.answers ? Object.values(e.answers).filter(Boolean) : [];
    return answers.length ? `Antwort: ${answers.join(' · ')}${wo}` : `Rückfrage beantwortet${wo}`;
  }
  if (d.kind === 'plan') {
    switch (e?.plan?.entscheidung) {
      case 'angenommen':
        return `Plan: angenommen${wo}`;
      case 'aenderungen':
        return `Plan: Änderungen gewünscht${e.plan.text ? ` — ${e.plan.text}` : ''}${wo}`;
      case 'abgebrochen':
        return `Plan: abgebrochen${wo}`;
      default:
        return `Plan: entschieden (Ergebnis unbekannt)${wo}`;
    }
  }
  return `${DIALOG_KIND_LABELS[d.kind]}${d.tool ? ` ${d.tool}` : ''} · entschieden${wo}`;
}

/** Whether a dialog card still waits for an answer. */
export function dialogOffen(d: DialogKarte): boolean {
  return d.zustand === 'offen' || d.zustand === 'gesperrt' || d.zustand === 'wird_beantwortet' || d.zustand === 'gestoert';
}

@customElement('aos-gespraech-beitrag')
export class AosGespraechBeitrag extends LitElement {
  @property({ attribute: false }) beitrag!: Beitrag;
  /** Set for a queued protocol entry that has no Beitrag yet — shows „Verwerfen" (E15). */
  @property({ type: String }) entryId = '';

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  private emit(name: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));
  }

  override render() {
    const b = this.beitrag;
    if (!b) return nothing;
    switch (b.art) {
      case 'nutzer':
        return this.renderNutzer(b);
      case 'claude':
        return html`<div class="gespraech-msg claude" data-id=${b.id}>
          <div class="gespraech-who"><b>Claude</b><span>${clockOf(b.at)}</span>${b.ergaenztSich ? html`<span class="gespraech-mark">ergänzt sich</span>` : nothing}</div>
          <div class="markdown-body gespraech-text">${unsafeHTML(renderBeitrag(b.text))}</div>
        </div>`;
      case 'arbeit':
        return html`<div class="gespraech-arbeit" data-id=${b.id}>
          ${b.laeuft ? 'arbeitet …' : 'arbeitet'} · ${b.werkzeuge} ${b.werkzeuge === 1 ? 'Werkzeugaufruf' : 'Werkzeugaufrufe'}${b.dauerMs !== undefined ? ` · ${b.laeuft ? 'seit ' : ''}${formatDauer(b.dauerMs)}` : ''}
        </div>`;
      case 'dialog':
        return this.renderDialog(b.dialog, b.id);
      default:
        return nothing;
    }
  }

  private renderNutzer(b: Extract<Beitrag, { art: 'nutzer' }>) {
    const quelle = QUELLE_LABELS[b.quelle] ?? '';
    const clock = clockOf(b.at);
    return html`<div class="gespraech-msg nutzer ${b.status ?? ''}" data-id=${b.id}>
      <div class="gespraech-who">
        <b>Du</b>
        <span>${[clock, quelle].filter(Boolean).join(' · ')}</span>
        ${b.status === 'eingereiht' ? html`<span class="gespraech-tag warn">eingereiht — kommt nach dem aktuellen Zug dran</span>` : nothing}
        ${b.status === 'nicht_bestaetigt' ? html`<span class="gespraech-tag warn">nicht bestätigt — im Terminal prüfen</span>` : nothing}
        ${b.ergaenztSich ? html`<span class="gespraech-mark">ergänzt sich</span>` : nothing}
      </div>
      <div class="gespraech-text vorformatiert">${b.text}</div>
      ${this.entryId && b.status === 'eingereiht'
        ? html`<div class="gespraech-msg-aktionen"><button type="button" class="gespraech-btn leise" @click=${() => this.emit('gespraech-discard', { entryId: this.entryId })}>Verwerfen</button></div>`
        : nothing}
    </div>`;
  }

  /** Stage 1: generic hint card while open (FA-21 form), text line once closed. */
  private renderDialog(d: DialogKarte, id: string) {
    if (!dialogOffen(d)) {
      return html`<div class="gespraech-dialog geschlossen ${d.zustand}" data-id=${id}>
        <div class="gespraech-dialog-titel">${DIALOG_KIND_LABELS[d.kind].toUpperCase()}</div>
        <div class="gespraech-dialog-text">${dialogErgebnisText(d)}</div>
      </div>`;
    }
    const gestoert = d.zustand === 'gestoert';
    const hinweis = d.kind === 'unbekannt' ? 'Sitzung zeigt einen Dialog — im Terminal antworten' : `Sitzung wartet · ${DIALOG_KIND_LABELS[d.kind]} — im Terminal antworten`;
    return html`<div class="gespraech-dialog offen ${d.kind}" data-id=${id} role="status">
      <div class="gespraech-dialog-titel">${hinweis}</div>
      ${d.kind === 'rueckfrage' && d.questions?.length
        ? html`<ul class="gespraech-dialog-fragen">
            ${d.questions.map((q) => html`<li>${q.question}</li>`)}
          </ul>`
        : nothing}
      ${d.kind === 'berechtigung' && d.tool ? html`<div class="gespraech-dialog-text"><code>${d.tool}</code>${d.detail ? html` · <span class="gespraech-detail">${d.detail}</span>` : nothing}</div>` : nothing}
      ${d.kind === 'plan' && d.plan ? html`<div class="gespraech-dialog-text">Plan liegt vor (${d.plan.split(/\s+/).filter(Boolean).length} Wörter) — Entscheidung im Terminal.</div>` : nothing}
      ${gestoert || d.hinweis ? html`<div class="gespraech-dialog-text warn">${d.hinweis ?? 'im Terminal prüfen und abschließen'}</div>` : nothing}
      <div class="gespraech-msg-aktionen">
        <button type="button" class="gespraech-btn" @click=${() => this.emit('gespraech-terminal')}>Im Terminal öffnen ↗</button>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-gespraech-beitrag': AosGespraechBeitrag;
  }
}
