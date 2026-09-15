/**
 * aos-vorhaben-seite — one Vorhaben (mock 03): head (id, title, phase +
 * note, state, session/model/worktree), review hint while the session waits
 * (FA-15), protocol of sent answers (FA-31), document tabs in fixed order
 * (FA-17), the reader with annotation marks (FA-23), the send bar
 * (FA-27–FA-30), the collection view (FA-25), the "Freigeben" confirmation
 * (FA-28/FA-29) and the next step with model choice when no session works
 * or waits (FA-12/FA-35/FA-40). Drafts and protocol come from
 * `vorhaben:state`; this component only sends messages.
 */

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Anmerkung, ModelSelection, ProtokollEintrag, VorhabenDocInfo, VorhabenRow } from '../../../../src/shared/types/vorhaben.protocol.js';
import { VORHABEN_DOC_FILES, VORHABEN_DOC_ORDER } from '../../../../src/shared/types/vorhaben.protocol.js';
import { buildAenderungenText, formatStandLabel } from '../../../../src/shared/vorhaben-text.js';
import { vorhabenService, type SendResult } from '../../services/vorhaben.service.js';
import { PHASE_LABELS, STEP_LABELS, ZUSTAND_LABELS, formatStand, relativeTime } from './vorhaben-sort.js';
import { leisteGrund } from './aos-sende-leiste.js';
import './aos-dokument-leser.js';
import './aos-sende-leiste.js';
import './aos-anmerkungen-sammel.js';
import './aos-vorhaben-protokoll.js';
import './aos-naechster-schritt.js';
import '../aos-confirm-dialog.js';
import type { LeserDoc } from './aos-dokument-leser.js';

/** FA-20: review doc when present, else the newest document. */
export function defaultDoc(row: VorhabenRow): LeserDoc {
  if (row.reviewDoc && row.docs.some((d) => d.key === row.reviewDoc)) return row.reviewDoc;
  const newest = [...row.docs].sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
  return newest?.key ?? (row.designFiles.length ? 'design' : 'intent');
}

const GRUND_TEXT: Record<string, string> = {
  keine_sitzung: 'keine Sitzung zu diesem Vorhaben — nächsten Schritt starten',
  arbeitet: 'Sitzung arbeitet — warten',
  dialog: 'Sitzung wartet im Terminal (Dialog) — im Terminal antworten',
  beendet: 'Sitzung beendet — nächsten Schritt starten',
  bereit: '',
};

@customElement('aos-vorhaben-seite')
export class AosVorhabenSeite extends LitElement {
  @property({ attribute: false }) row!: VorhabenRow;
  @property({ type: String }) doc: LeserDoc = 'intent';
  @property({ type: Boolean }) mobile = false;
  /** Drafts of the shown document. */
  @property({ attribute: false }) drafts: Anmerkung[] = [];
  /** Protocol entries of this Vorhaben, newest first. */
  @property({ attribute: false }) protocol: ProtokollEintrag[] = [];
  /** `lastModelKey(...)` → selection (from the state). */
  @property({ attribute: false }) lastModel: Record<string, ModelSelection> = {};

  @state() private sammelOpen = false;
  @state() private lost: string[] = [];
  @state() private sending = false;
  @state() private sendError = '';
  @state() private freigabeOpen = false;
  /** mtimeMs of the document as the reader loaded it (the "Stand" Michael read). */
  @state() private readStand = 0;

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
    aos-naechster-schritt {
      margin-bottom: var(--spacing-md);
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
    .inhalt {
      padding-bottom: var(--spacing-lg);
    }
    .send-fehler {
      color: var(--color-accent-error);
      font-size: var(--font-size-sm);
      margin: var(--spacing-xs) 0;
    }
    .freigabe-text {
      white-space: pre-line;
    }
  `;

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('doc') || (changed.has('row') && (changed.get('row') as VorhabenRow | undefined)?.intentId !== this.row?.intentId)) {
      this.readStand = 0;
      this.sendError = '';
      this.lost = [];
    }
  }

  private back(): void {
    this.dispatchEvent(new CustomEvent('vorhaben-back', { bubbles: true, composed: true }));
  }

  private selectDoc(doc: LeserDoc): void {
    this.doc = doc;
    this.sendError = '';
    this.dispatchEvent(new CustomEvent<{ doc: LeserDoc }>('doc-change', { bubbles: true, composed: true, detail: { doc } }));
  }

  private docInfo(): VorhabenDocInfo | undefined {
    return this.row.docs.find((d) => d.key === this.doc);
  }

  private get docKey(): Exclude<LeserDoc, 'design'> | null {
    return this.doc === 'design' ? null : this.doc;
  }

  /** Stand the reader loaded (falls back to the state's mtime before the first load). */
  private standRead(): number {
    return this.readStand || this.docInfo()?.mtimeMs || 0;
  }

  private docChanged(): boolean {
    const info = this.docInfo();
    return !!info && !!this.readStand && Math.abs(info.mtimeMs - this.readStand) >= 1;
  }

  // ---- drafts ----

  private onAnmerkungSave(e: CustomEvent<{ anmerkung: Anmerkung }>): void {
    const doc = this.docKey;
    if (!doc) return;
    vorhabenService.setDraft(this.row.projectId, this.row.intentId, doc, e.detail.anmerkung);
  }

  private onAnmerkungDelete(e: CustomEvent<{ id: string }>): void {
    const doc = this.docKey;
    if (!doc) return;
    vorhabenService.deleteDraft(this.row.projectId, this.row.intentId, doc, e.detail.id);
  }

  private onLocated(e: CustomEvent<{ lost: string[] }>): void {
    this.lost = e.detail.lost;
  }

  // ---- sending ----

  private standLabel(): string {
    const info = this.docInfo();
    if (this.doc === 'intent' && info?.version) return info.version;
    return `Stand ${formatStandLabel(this.standRead(), Intl.DateTimeFormat().resolvedOptions().timeZone)}`;
  }

  private preview(): string {
    const doc = this.docKey;
    if (!doc || this.drafts.length === 0) return '';
    return buildAenderungenText(doc, this.standLabel(), this.drafts);
  }

  private async send(art: 'aenderungen' | 'freigabe'): Promise<void> {
    const doc = this.docKey;
    if (!doc || this.sending) return;
    this.sending = true;
    this.sendError = '';
    let result: SendResult;
    try {
      result = await vorhabenService.send(this.row.projectId, this.row.intentId, doc, art, this.standRead());
    } catch (err) {
      this.sending = false;
      this.sendError = (err as Error).message || 'Senden fehlgeschlagen';
      return;
    }
    this.sending = false;
    if (result.ok) {
      this.sammelOpen = false;
      this.dispatchEvent(new CustomEvent('show-toast', { bubbles: true, composed: true, detail: { message: art === 'freigabe' ? 'Freigabe gesendet' : `Änderungen (${result.entry.anzahl}) gesendet`, type: 'success' } }));
      return;
    }
    this.sendError = result.message || result.grund;
    if (result.grund === 'stand_veraltet') this.sendError = 'Dokument geändert — neu laden, dann erneut freigeben.';
  }

  private openFreigabe(): void {
    if (this.docChanged()) {
      this.sendError = 'Dokument geändert — neu laden, dann erneut freigeben.';
      return;
    }
    this.freigabeOpen = true;
  }

  private freigabeMessage(): string {
    const doc = this.docKey;
    if (!doc) return '';
    const s = this.row.session;
    const lines = [`an Sitzung ‚${s?.name ?? '?'}' · ${this.row.projectName}`];
    if (this.drafts.length > 0) {
      lines.push(`${this.drafts.length} ${this.drafts.length === 1 ? 'Anmerkung' : 'Anmerkungen'} ungesendet — bleibt erhalten, wird nicht mitgeschickt.`);
    }
    return lines.join('\n');
  }

  private freigabeTitle(): string {
    const doc = this.docKey;
    if (!doc) return '';
    const label = this.standLabel();
    return doc === 'intent' && !label.startsWith('Stand ') ? `Freigabe: ${VORHABEN_DOC_FILES[doc]} ${label}` : `Freigabe: ${VORHABEN_DOC_FILES[doc]} (${label})`;
  }

  private toTerminal(sessionId?: string): void {
    const id = sessionId ?? this.row.session?.id;
    if (this.mobile) {
      this.dispatchEvent(new CustomEvent('terminal-pill-tap', { bubbles: true, composed: true, detail: { route: 'cloud-terminal' } }));
      return;
    }
    if (id) document.dispatchEvent(new CustomEvent('open-terminal-session', { bubbles: true, composed: true, detail: { sessionId: id } }));
  }

  private scrollToNextStep(): void {
    this.renderRoot.querySelector('aos-naechster-schritt')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // ---- render ----

  override render() {
    const r = this.row;
    const docs = VORHABEN_DOC_ORDER.filter((k) => r.docs.some((d) => d.key === k));
    const info = this.docInfo();
    const session = r.session;
    const annotierbar = this.doc !== 'design';
    const freigabeMoeglich = !!r.reviewDoc && r.reviewDoc === this.doc && r.phase !== 'pr';
    const grund = leisteGrund(r);
    const entries = this.protocol.filter((e) => e.projectId === r.projectId && e.intentId === r.intentId);
    return html`
      <div class="inhalt">
        <button type="button" class="zurueck" @click=${this.back}>‹ Vorhaben</button>
        <div class="brot">${r.projectName} · ${r.intentId}</div>
        <h1>${r.titel}</h1>
        <div class="meta">
          <span class="badge">${PHASE_LABELS[r.phase]}${r.bypass ? ' · Spec entfällt' : ''}</span>
          ${r.phaseNote ? html`<span>${r.phaseNote}</span>` : nothing}
          <span><span class="dot ${r.zustand}"></span>${ZUSTAND_LABELS[r.zustand]}${r.zustandDetail && r.zustand !== 'wartet_auf_dich' ? ` · ${r.zustandDetail}` : ''}</span>
          ${session ? html`<span>Sitzung <strong>${session.name}</strong>${session.model ? ` · ${session.model}` : ''}${session.ended ? ' · beendet' : ''}</span>` : nothing}
          ${r.arbeitskopie ? html`<span>Arbeitskopie <code>${r.arbeitskopie}</code></span>` : nothing}
          <span>geändert ${relativeTime(r.lastChangedMs)}</span>
        </div>
        ${this.renderHinweis()}
        <aos-vorhaben-protokoll .entries=${entries} .mobile=${this.mobile} @protokoll-terminal=${(e: CustomEvent<{ sessionId: string }>) => this.toTerminal(e.detail.sessionId)}></aos-vorhaben-protokoll>
        ${this.renderNextStep()}
        <div class="reiter" role="tablist">
          ${docs.map(
            (k) => html`<button type="button" role="tab" class=${this.doc === k ? 'aktiv' : ''} aria-selected=${this.doc === k} @click=${() => this.selectDoc(k)}>${VORHABEN_DOC_FILES[k]}</button>`
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
          .annotierbar=${annotierbar}
          .mobile=${this.mobile}
          .anmerkungen=${this.drafts}
          @anmerkung-save=${this.onAnmerkungSave}
          @anmerkung-delete=${this.onAnmerkungDelete}
          @anmerkungen-located=${this.onLocated}
          @leser-loaded=${(e: CustomEvent<{ mtimeMs: number }>) => (this.readStand = e.detail.mtimeMs)}
        ></aos-dokument-leser>
      </div>
      ${this.sendError ? html`<div class="send-fehler" role="alert">${this.sendError}</div>` : nothing}
      ${annotierbar
        ? html`<aos-sende-leiste
            .row=${r}
            .count=${this.drafts.length}
            .mobile=${this.mobile}
            .sending=${this.sending}
            .freigabeMoeglich=${freigabeMoeglich}
            .docChanged=${this.docChanged()}
            @leiste-sammel=${() => (this.sammelOpen = true)}
            @leiste-send=${() => this.send('aenderungen')}
            @leiste-freigabe=${this.openFreigabe}
            @leiste-terminal=${() => this.toTerminal()}
            @leiste-next-step=${this.scrollToNextStep}
          ></aos-sende-leiste>`
        : nothing}
      <aos-anmerkungen-sammel
        .open=${this.sammelOpen}
        .mobile=${this.mobile}
        .anmerkungen=${this.drafts}
        .lost=${this.lost}
        .docFile=${this.docKey ? VORHABEN_DOC_FILES[this.docKey] : ''}
        .standLabel=${info ? formatStand(this.standRead()) : ''}
        .preview=${this.preview()}
        .sessionName=${session?.name ?? ''}
        .bereit=${grund === 'bereit'}
        .grund=${GRUND_TEXT[grund] ?? ''}
        .sending=${this.sending}
        @sammel-close=${() => (this.sammelOpen = false)}
        @sammel-send=${() => this.send('aenderungen')}
        @anmerkung-save=${this.onAnmerkungSave}
        @anmerkung-delete=${this.onAnmerkungDelete}
      ></aos-anmerkungen-sammel>
      <aos-confirm-dialog
        .open=${this.freigabeOpen}
        .title=${this.freigabeTitle()}
        .message=${this.freigabeMessage()}
        confirmText="Freigeben"
        @confirm=${() => {
          this.freigabeOpen = false;
          void this.send('freigabe');
        }}
        @cancel=${() => (this.freigabeOpen = false)}
      ></aos-confirm-dialog>
    `;
  }

  private renderHinweis() {
    const r = this.row;
    if (r.zustand === 'wartet_auf_dich' && r.reviewDoc && r.step) {
      const info = r.docs.find((d) => d.key === r.reviewDoc);
      return html`<div class="hinweis review">
        <span><span class="dot wartet_auf_dich"></span><strong>Wartet auf deine Antwort zu ${VORHABEN_DOC_FILES[r.reviewDoc]}</strong> · Schritt ${STEP_LABELS[r.step]}</span>
        ${info ? html`<span class="stand">Stand ${formatStand(info.mtimeMs)}</span>` : nothing}
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

  private renderNextStep() {
    const r = this.row;
    if (!r.nextStep) return nothing;
    const key = `${r.projectId}::${r.intentId}::${r.nextStep.step}`;
    return html`<aos-naechster-schritt
      .projectId=${r.projectId}
      .projectPath=${r.projectPath}
      .intentId=${r.intentId}
      .step=${r.nextStep.step}
      .label=${r.nextStep.label}
      .command=${r.nextStep.command}
      .lastModel=${this.lastModel[key]}
      .mobile=${this.mobile}
    ></aos-naechster-schritt>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-vorhaben-seite': AosVorhabenSeite;
  }
}
