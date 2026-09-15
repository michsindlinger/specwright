/**
 * aos-vorhaben-seite — one Vorhaben (mock 03): head (id, title, phase +
 * note, state, session/model/worktree), review hint while the session waits
 * (FA-15), document tabs in fixed order (FA-17), the reader. Stage 2 adds the
 * protocol, the annotation bar and the "next step" button; until then the
 * next step is named as a terminal hint (FA-12).
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { VorhabenDocInfo, VorhabenRow } from '../../../../src/shared/types/vorhaben.protocol.js';
import { VORHABEN_DOC_ORDER } from '../../../../src/shared/types/vorhaben.protocol.js';
import { PHASE_LABELS, STEP_LABELS, ZUSTAND_LABELS, formatStand, relativeTime } from './vorhaben-sort.js';
import './aos-dokument-leser.js';
import type { LeserDoc } from './aos-dokument-leser.js';

/** FA-20: review doc when present, else the newest document. */
export function defaultDoc(row: VorhabenRow): LeserDoc {
  if (row.reviewDoc && row.docs.some((d) => d.key === row.reviewDoc)) return row.reviewDoc;
  const newest = [...row.docs].sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
  return newest?.key ?? (row.designFiles.length ? 'design' : 'intent');
}

@customElement('aos-vorhaben-seite')
export class AosVorhabenSeite extends LitElement {
  @property({ attribute: false }) row!: VorhabenRow;
  @property({ type: String }) doc: LeserDoc = 'intent';

  static override styles = css`
    :host {
      display: block;
    }
    .zurueck {
      background: none;
      border: none;
      color: var(--color-text-muted);
      font: inherit;
      font-size: var(--font-size-sm);
      cursor: pointer;
      padding: 0;
      margin-bottom: var(--spacing-xs);
    }
    .brot {
      font-family: var(--font-family-mono);
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }
    h1 {
      margin: var(--spacing-xs) 0;
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-semibold);
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-sm);
      align-items: center;
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      margin-bottom: var(--spacing-md);
    }
    .badge {
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--color-bg-tertiary);
    }
    .hinweis {
      display: flex;
      justify-content: space-between;
      gap: var(--spacing-md);
      align-items: center;
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      margin-bottom: var(--spacing-md);
      font-size: var(--font-size-sm);
    }
    .hinweis.review {
      border-color: var(--color-accent-primary);
      background: rgba(var(--color-accent-primary-rgb, 0, 212, 255), 0.06);
    }
    .hinweis code {
      font-family: var(--font-family-mono);
      color: var(--color-accent-primary);
    }
    .stand {
      color: var(--color-text-muted);
      font-family: var(--font-family-mono);
      white-space: nowrap;
    }
    .reiter {
      display: flex;
      gap: var(--spacing-xs);
      border-bottom: 1px solid var(--color-border);
      margin-bottom: var(--spacing-md);
      overflow-x: auto;
    }
    .reiter button {
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      padding: var(--spacing-xs) var(--spacing-sm);
      font-family: var(--font-family-mono);
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      cursor: pointer;
      white-space: nowrap;
    }
    .reiter button.aktiv {
      color: var(--color-text-primary);
      border-bottom-color: var(--color-accent-primary);
    }
    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-text-muted);
      margin-right: 4px;
    }
    .dot.wartet_auf_dich {
      background: var(--color-accent-primary);
    }
    .dot.wartet,
    .dot.wartet_im_terminal {
      background: var(--color-accent-warning);
    }
    .dot.arbeitet {
      background: var(--color-accent-success);
    }
  `;

  private back(): void {
    this.dispatchEvent(new CustomEvent('vorhaben-back', { bubbles: true, composed: true }));
  }

  private selectDoc(doc: LeserDoc): void {
    this.doc = doc;
    this.dispatchEvent(new CustomEvent<{ doc: LeserDoc }>('doc-change', { bubbles: true, composed: true, detail: { doc } }));
  }

  private docInfo(): VorhabenDocInfo | undefined {
    return this.row.docs.find((d) => d.key === this.doc);
  }

  override render() {
    const r = this.row;
    const docs = VORHABEN_DOC_ORDER.filter((k) => r.docs.some((d) => d.key === k));
    const info = this.docInfo();
    const session = r.session;
    return html`
      <button type="button" class="zurueck" @click=${this.back}>‹ Vorhaben</button>
      <div class="brot">${r.projectName} · ${r.intentId}</div>
      <h1>${r.titel}</h1>
      <div class="meta">
        <span class="badge">${PHASE_LABELS[r.phase]}${r.bypass ? ' · Spec entfällt' : ''}</span>
        ${r.phaseNote ? html`<span>${r.phaseNote}</span>` : nothing}
        <span><span class="dot ${r.zustand}"></span>${ZUSTAND_LABELS[r.zustand]}${r.zustandDetail && r.zustand !== 'wartet_auf_dich' ? ` · ${r.zustandDetail}` : ''}</span>
        ${session ? html`<span>Sitzung <strong>${session.name}</strong>${session.model ? ` · ${session.model}` : ''}</span>` : nothing}
        ${r.arbeitskopie ? html`<span>Arbeitskopie <code>${r.arbeitskopie}</code></span>` : nothing}
        <span>geändert ${relativeTime(r.lastChangedMs)}</span>
      </div>
      ${this.renderHinweis()}
      <div class="reiter" role="tablist">
        ${docs.map(
          (k) => html`<button type="button" role="tab" class=${this.doc === k ? 'aktiv' : ''} aria-selected=${this.doc === k} @click=${() => this.selectDoc(k)}>${k === 'build-stand' ? 'build-stand.md' : `${k}.md`}</button>`
        )}
        ${r.designFiles.length
          ? html`<button type="button" role="tab" class=${this.doc === 'design' ? 'aktiv' : ''} aria-selected=${this.doc === 'design'} @click=${() => this.selectDoc('design')}>design/</button>`
          : nothing}
      </div>
      <aos-dokument-leser
        .projectId=${r.projectId}
        .intentId=${r.intentId}
        .doc=${this.doc}
        .mtimeMs=${info?.mtimeMs ?? 0}
        .designFiles=${r.designFiles}
      ></aos-dokument-leser>
    `;
  }

  private renderHinweis() {
    const r = this.row;
    if (r.zustand === 'wartet_auf_dich' && r.reviewDoc && r.step) {
      const info = r.docs.find((d) => d.key === r.reviewDoc);
      return html`<div class="hinweis review">
        <span><span class="dot wartet_auf_dich"></span><strong>Wartet auf deine Antwort zu ${r.reviewDoc}.md</strong> · Schritt ${STEP_LABELS[r.step]}</span>
        ${info ? html`<span class="stand">Stand ${formatStand(info.mtimeMs)}</span>` : nothing}
      </div>`;
    }
    if (r.nextStep) {
      return html`<div class="hinweis">
        <span><strong>Nächster Schritt:</strong> ${r.nextStep.label} — im Terminal: <code>${r.nextStep.command}</code></span>
      </div>`;
    }
    if (r.phase === 'absicht' && !r.session) {
      return html`<div class="hinweis"><span>Entwurf im Terminal fortsetzen.</span></div>`;
    }
    if (r.zustand === 'wartet_im_terminal') {
      return html`<div class="hinweis"><span>Die Sitzung zeigt einen Dialog — im Terminal antworten.</span></div>`;
    }
    return nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-vorhaben-seite': AosVorhabenSeite;
  }
}
