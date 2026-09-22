/**
 * aos-vorhaben-seite — one Vorhaben (mock 03; INT-2026-010 skizze 3): head
 * with project name (grey line above the id, INT-2026-017), id, title and
 * the Phasen-Chips intent · spec · plan · build
 * (+ design/ when sketches exist; FA-12), state line, review hint while the
 * session waits (FA-15), protocol of sent answers (FA-31), the reader with
 * annotation marks (FA-23) or „Kein Dokument in dieser Phase", below it the
 * action bar: the next step — always shown, greyed out while a session of
 * the Vorhaben works or waits (FA-21) — and „Freigeben" when the shown
 * document awaits approval (FA-22): sent to the waiting session like every
 * review answer, or, without a session, the step's session is started with
 * the Freigabe as first input (AN-S06). Then the send bar for Anmerkungen
 * (FA-27–FA-30), the collection view (FA-25) and the „Freigeben" confirmation
 * (FA-28/FA-29 — an own small dialog: aos-confirm-dialog is light DOM styled
 * by theme.css and stays unstyled inside a shadow root). Which document is
 * shown comes from the shared view state (`state.ansicht.phase`, AR-05); this
 * component only sends `doc-change`. Drafts and protocol come from
 * `vorhaben:state`; this component only sends messages.
 *
 * INT-2026-024: „Abschließen" in the action bar (phases spec, plan, bau, pr,
 * unbekannt) opens a confirmation built from the backend's preview of the
 * remote base branch (FA-02); after the PR exists the row carries a mark — the
 * page shows the hint with the PR link and „Abschluss zurücknehmen" instead
 * (FA-11, FA-15). Failures stand under the button until the next attempt
 * (FA-18); „läuft" locks the buttons (FA-19).
 */

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Anmerkung, ModelSelection, ProtokollEintrag, VorhabenAbschlussVorschau, VorhabenDocInfo, VorhabenPhase, VorhabenRow, VorhabenStep, VorhabenZustand } from '../../../../src/shared/types/vorhaben.protocol.js';
import { VORHABEN_DOC_FILES, lastModelKey, stepCommand } from '../../../../src/shared/types/vorhaben.protocol.js';
import type { CloudTerminalSessionTarget } from '../../../../src/shared/types/cloud-terminal.protocol.js';
import { buildAenderungenText, buildFreigabeText, formatStandLabel } from '../../../../src/shared/vorhaben-text.js';
import { vorhabenService, VorhabenRequestError, type ModelListInfo, type SendResult } from '../../services/vorhaben.service.js';
import { ladeModelle, vorauswahl } from './model-wahl.js';
import { STEP_LABELS, ZUSTAND_LABELS, formatClock, formatStand } from './vorhaben-sort.js';
import { dialogZielText, leisteGrund, ZUORDNUNG_HINWEIS } from './aos-sende-leiste.js';
import './aos-dokument-leser.js';
import './aos-sende-leiste.js';
import './aos-anmerkungen-sammel.js';
import './aos-vorhaben-protokoll.js';
import './aos-naechster-schritt.js';
import type { AosDokumentLeser, LeserDoc, LeserLoadedDetail } from './aos-dokument-leser.js';
import type { KennungEintrag } from '../../services/kennungen.service.js';

/** The four phase chips of the Vorhaben page (FA-12) and the document each one shows. */
export type PhasenChip = 'intent' | 'spec' | 'plan' | 'build';
export const PHASEN_CHIPS: ReadonlyArray<{ chip: PhasenChip; doc: Exclude<LeserDoc, 'design'>; label: string }> = [
  { chip: 'intent', doc: 'intent', label: 'intent' },
  { chip: 'spec', doc: 'spec', label: 'spec' },
  { chip: 'plan', doc: 'plan', label: 'plan' },
  { chip: 'build', doc: 'build-stand', label: 'build' },
];

/** Reached phase → chip (absicht→intent, spec, plan, bau|pr|umgesetzt→build); null when unknown. */
export function erreichterChip(phase: VorhabenPhase): PhasenChip | null {
  switch (phase) {
    case 'absicht':
      return 'intent';
    case 'spec':
      return 'spec';
    case 'plan':
      return 'plan';
    case 'bau':
    case 'pr':
    case 'umgesetzt':
      return 'build';
    default:
      return null;
  }
}

/** Step whose session writes the document (`build-stand` → build). */
export function stepOfDoc(doc: LeserDoc): VorhabenStep | undefined {
  switch (doc) {
    case 'intent':
      return 'intent';
    case 'spec':
      return 'spec';
    case 'plan':
      return 'plan';
    case 'build-stand':
      return 'build';
    default:
      return undefined;
  }
}

/** Default document (INT-2026-010 §3): review doc → document of the reached phase → newest. */
export function defaultDoc(row: VorhabenRow): LeserDoc {
  const has = (key: string): boolean => row.docs.some((d) => d.key === key);
  if (row.reviewDoc && has(row.reviewDoc)) return row.reviewDoc;
  const chip = erreichterChip(row.phase);
  const phaseDoc = chip ? PHASEN_CHIPS.find((c) => c.chip === chip)!.doc : undefined;
  if (phaseDoc && has(phaseDoc)) return phaseDoc;
  const newest = [...row.docs].sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
  return newest?.key ?? (row.designFiles.length ? 'design' : 'intent');
}

/** INT-2026-024 (FA-01): phases in which „Abschließen" is offered — not „Absicht", not „Umgesetzt", never with a mark. */
export const ABSCHLUSS_PHASEN: ReadonlyArray<VorhabenPhase> = ['spec', 'plan', 'bau', 'pr', 'unbekannt'];
export function abschlussMoeglich(row: Pick<VorhabenRow, 'phase' | 'abschluss'>): boolean {
  return !row.abschluss?.marke && ABSCHLUSS_PHASEN.includes(row.phase);
}
/** FA-19 (review E8): what the page says when the browser gave up before the backend — the row carries the true state. */
export const ABSCHLUSS_TIMEOUT_TEXT = 'Keine Antwort vom Backend binnen 75 s — der Stand folgt aus der Zeile';

/** A live session that works or sits in a dialog — the Freigabe cannot go anywhere right now. */
export function freigabeGesperrtDurchSitzung(zustand: VorhabenZustand): boolean {
  return zustand === 'arbeitet' || zustand === 'wartet_rueckfrage' || zustand === 'wartet_plan' || zustand === 'wartet_berechtigung';
}

const GRUND_TEXT: Record<string, string> = {
  keine_sitzung: 'keine Sitzung zu diesem Vorhaben — nächsten Schritt starten',
  arbeitet: 'Sitzung arbeitet — warten',
  dialog: 'Sitzung wartet im Terminal (Dialog) — im Terminal antworten',
  beendet: 'Sitzung beendet — nächsten Schritt starten',
  bereit: '',
};

/** INT-2026-016 (AK-07): the collector's target line names the docked terminal's way too (Mac only). */
export function grundText(grund: string, mobile: boolean): string {
  const base = GRUND_TEXT[grund] ?? '';
  if (mobile || (grund !== 'keine_sitzung' && grund !== 'beendet')) return base;
  return `${base} oder ${ZUORDNUNG_HINWEIS}`;
}

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
  /** INT-2026-019 (AK-08/AK-09): why the resume on opening was refused; null = nothing to show. */
  @property({ attribute: false }) resumeHinweis: string | null = null;
  @state() private sammelOpen = false;
  @state() private lost: string[] = [];
  @state() private sending = false;
  @state() private sendError = '';
  @state() private freigabeOpen = false;
  /** Models for the dialog's preview when „Freigeben" has to start a session (FA-22, review E11). */
  @state() private models: ModelListInfo | null = null;
  /** mtimeMs of the document as the reader loaded it (the "Stand" Michael read). */
  @state() private readStand = 0;
  // INT-2026-024: „Abschließen" — preview in flight, the dialog with it, a local failure (TIMEOUT or a refused start), „zurücknehmen" dialog.
  @state() private abschlussVorschau: VorhabenAbschlussVorschau | null = null;
  @state() private vorschauLaedt = false;
  @state() private abschlussOpen = false;
  @state() private abschlussFehlerLokal = '';
  @state() private zuruecknehmenOpen = false;
  @state() private zuruecknehmenLaeuft = false;

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
    .kopf {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--spacing-md);
      flex-wrap: wrap;
      margin-bottom: var(--spacing-sm);
    }
    .kopf-text {
      min-width: 0;
      flex: 1 1 320px;
    }
    .projekt {
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
    }
    .kennung {
      font-family: var(--font-family-mono);
      font-size: var(--font-size-lg);
      color: var(--color-accent-primary);
      letter-spacing: 0.02em;
    }
    h1 {
      margin: 2px 0 0;
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-semibold);
      line-height: 1.3;
    }
    .chips {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      align-items: center;
    }
    .chip {
      font: inherit;
      font-family: var(--font-family-mono);
      font-size: var(--font-size-sm);
      padding: 4px 12px;
      border-radius: 999px;
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text-muted);
      cursor: pointer;
      white-space: nowrap;
    }
    .chip.erreicht {
      color: var(--color-text-primary);
      border-color: var(--color-accent-primary);
    }
    .chip.hinter {
      color: var(--color-text-secondary);
    }
    .chip.gewaehlt {
      background: var(--color-accent-primary);
      border-color: var(--color-accent-primary);
      color: var(--color-bg-primary);
      font-weight: var(--font-weight-semibold);
    }
    .chip.leer:not(.gewaehlt) {
      border-style: dashed;
    }
    .chip:focus-visible {
      outline: 2px solid var(--color-accent-primary);
      outline-offset: 2px;
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
    .dot.wartet_rueckfrage,
    .dot.wartet_plan,
    .dot.wartet_berechtigung {
      background: var(--color-accent-warning);
    }
    .dot.arbeitet {
      background: var(--color-accent-success);
    }
    .inhalt {
      /* room for the fixed send bar */
      padding-bottom: 72px;
    }
    .kein-dokument {
      padding: var(--spacing-xl) var(--spacing-md);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text-muted);
      text-align: center;
      font-size: var(--font-size-sm);
    }
    /* action bar under the document (FA-12, FA-21, FA-22) */
    .aktionen {
      display: flex;
      align-items: stretch;
      gap: var(--spacing-sm);
      flex-wrap: wrap;
      margin-top: var(--spacing-lg);
      padding-top: var(--spacing-md);
      border-top: 1px solid var(--color-border);
    }
    .aktionen aos-naechster-schritt {
      flex: 1 1 360px;
      min-width: 0;
    }
    .aktionen .seite-knopf {
      font: inherit;
      font-size: var(--font-size-sm);
      padding: 7px 16px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text-primary);
      cursor: pointer;
      white-space: nowrap;
      align-self: center;
    }
    .aktionen .seite-knopf.primary {
      background: var(--color-accent-primary);
      border-color: var(--color-accent-primary);
      color: var(--color-bg-primary);
      font-weight: var(--font-weight-semibold);
    }
    .aktionen .seite-knopf:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .send-fehler,
    .abschluss-fehler {
      color: var(--color-accent-error);
      font-size: var(--font-size-sm);
      margin: var(--spacing-xs) 0;
    }
    /* INT-2026-024: the mark's hint (neutral, like the resume line) and the dialog rows */
    .hinweis.abschluss a {
      color: var(--color-accent-primary);
      text-decoration: none;
    }
    .hinweis.abschluss a:hover {
      text-decoration: underline;
    }
    .dialog .zeilen {
      display: grid;
      gap: 4px;
      margin-bottom: var(--spacing-sm);
      word-break: break-word;
    }
    .dialog .zeilen code {
      font-family: var(--font-family-mono);
      color: var(--color-accent-primary);
    }
    .dialog .nicht {
      color: var(--color-text-muted);
      margin-bottom: var(--spacing-sm);
    }
    /* Freigabe confirmation (mock 06) — above the terminal sidebar */
    .schleier {
      position: fixed;
      inset: 0;
      z-index: 1100;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-md);
    }
    .dialog {
      width: min(460px, 100%);
      background: var(--color-bg-primary);
      border: 1px solid var(--color-accent-primary);
      border-radius: var(--radius-lg);
      padding: var(--spacing-md) var(--spacing-lg);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
      font-size: var(--font-size-sm);
    }
    .dialog h2 {
      margin: 0 0 var(--spacing-xs);
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-semibold);
      font-family: var(--font-family-mono);
      word-break: break-word;
    }
    .dialog .ziel {
      color: var(--color-text-secondary);
      margin-bottom: var(--spacing-sm);
    }
    .dialog .ziel code {
      font-family: var(--font-family-mono);
      color: var(--color-accent-primary);
    }
    .dialog .warnung {
      border: 1px solid var(--color-accent-warning);
      border-radius: var(--radius-md);
      padding: var(--spacing-xs) var(--spacing-sm);
      margin-bottom: var(--spacing-sm);
      background: rgba(255, 180, 0, 0.06);
    }
    .dialog .warnung strong {
      color: var(--color-accent-warning);
    }
    .dialog .aktionen-dialog {
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-sm);
    }
    .dialog button {
      font: inherit;
      font-size: var(--font-size-sm);
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
    }
    .dialog button.primary {
      background: var(--color-accent-primary);
      border-color: var(--color-accent-primary);
      color: var(--color-bg-primary);
      font-weight: var(--font-weight-semibold);
    }
    :host([mobile]) .kopf {
      align-items: flex-start;
    }
    :host([mobile]) .aktionen aos-naechster-schritt {
      flex-basis: 100%;
    }
    :host([mobile]) .aktionen .seite-knopf {
      flex: 1 1 auto;
      padding: 10px;
    }
  `;

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('mobile')) this.toggleAttribute('mobile', this.mobile);
    if (changed.has('doc') || (changed.has('row') && (changed.get('row') as VorhabenRow | undefined)?.intentId !== this.row?.intentId)) {
      this.readStand = 0;
      this.sendError = '';
      this.abschlussFehlerLokal = '';
      this.abschlussOpen = false;
      this.zuruecknehmenOpen = false;
      this.lost = [];
      // Another document: no Kennungen until its reader reported them (FA-16/FA-17) — the design view and „Kein Dokument" never do.
      this.emitKennungen(new Map());
    }
  }

  /** The terminal links exactly the Kennungen of the shown document (INT-2026-011, FA-13) — the view feeds them to `kennungenService`. */
  private emitKennungen(kennungen: ReadonlyMap<string, KennungEintrag>): void {
    this.dispatchEvent(new CustomEvent<{ kennungen: ReadonlyMap<string, KennungEintrag> }>('kennungen-changed', { bubbles: true, composed: true, detail: { kennungen } }));
  }

  private onLeserLoaded(e: CustomEvent<LeserLoadedDetail>): void {
    this.readStand = e.detail.mtimeMs;
    this.emitKennungen(e.detail.kennungen);
  }

  /** A Kennung link in the terminal was clicked (FA-13/FA-14): the reader opens the section and scrolls to the block. */
  public openKennung(code: string): boolean {
    const leser = this.renderRoot.querySelector('aos-dokument-leser') as AosDokumentLeser | null;
    return leser?.openKennung(code) ?? false;
  }

  private back(): void {
    this.dispatchEvent(new CustomEvent('vorhaben-back', { bubbles: true, composed: true }));
  }

  /** Chip click: shown at once, and the view persists it for every device (`vorhaben:ansicht.set`). */
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

  /** The shown document exists on disk (design/ counts when files exist). */
  private docVorhanden(): boolean {
    return this.doc === 'design' ? this.row.designFiles.length > 0 : !!this.docInfo();
  }

  /** A session that is still alive (not ended, not `keine_sitzung`). */
  private liveSession(): VorhabenRow['session'] | undefined {
    const s = this.row.session;
    if (!s || s.ended || this.row.zustand === 'keine_sitzung' || this.row.zustand === 'sitzung_beendet') return undefined;
    return s;
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

  // ---- Freigeben (FA-22) ----

  /** The shown document awaits approval by its status (session-independent, FA-22). */
  private freigabeMoeglich(): boolean {
    return !!this.docKey && this.row.freigabeDoc === this.docKey;
  }

  /**
   * Why „Freigeben" is disabled right now — '' when it can go. A working
   * session or an open dialog cannot take it; an intent draft without a
   * session cannot be resumed by a new `/specwright:intent` (the workflow has
   * no argument, NZ-05) and continues in the terminal.
   */
  private freigabeSperre(): string {
    const r = this.row;
    if (this.sending) return 'Wird gesendet …';
    if (this.docChanged()) return 'Dokument geändert — neu laden, dann erneut freigeben';
    const live = this.liveSession();
    if (live) {
      // Just started: its first input (this Freigabe, or the intent text) is still on its way — nothing else goes in before.
      if (live.firstInputPending) return 'Sitzung startet — die erste Eingabe wird nach der ersten Frage übergeben';
      return freigabeGesperrtDurchSitzung(r.zustand) ? 'Sitzung arbeitet oder wartet im Dialog — die Freigabe geht, sobald sie auf dich wartet' : '';
    }
    if (this.docKey === 'intent') return 'Absicht-Sitzung beendet — Entwurf im Terminal fortsetzen';
    return '';
  }

  private freigabeStep(): VorhabenStep | undefined {
    const doc = this.docKey;
    return doc ? stepOfDoc(doc) : undefined;
  }

  /** Where the step's session would run: the copy the row was read from (project or worktree). */
  private freigabeTarget(): CloudTerminalSessionTarget {
    const r = this.row;
    return r.cwd === r.projectPath ? { kind: 'main' } : { kind: 'existing-worktree', path: r.cwd };
  }

  /** Model the backend will pick without one from the client: last model of (Vorhaben, step) → step default (mirrors `startStep`). */
  private freigabeModell(): ModelSelection | null {
    const step = this.freigabeStep();
    if (!step || !this.models) return null;
    return vorauswahl(this.models, step, this.lastModel[lastModelKey(this.row.projectId, this.row.intentId, step)]);
  }

  private openFreigabe(): void {
    if (this.freigabeSperre()) {
      if (this.docChanged()) this.sendError = 'Dokument geändert — neu laden, dann erneut freigeben.';
      return;
    }
    this.freigabeOpen = true;
    if (!this.liveSession() && !this.models) {
      void ladeModelle()
        .then((m) => (this.models = m))
        .catch(() => undefined);
    }
  }

  private freigabeTitle(): string {
    const doc = this.docKey;
    if (!doc) return '';
    return buildFreigabeText(doc, this.standLabel());
  }

  /** AN-S06: no session waits → start the step's session with the Freigabe as its first input. */
  private async startFreigabe(): Promise<void> {
    const doc = this.docKey;
    const step = this.freigabeStep();
    if (!doc || !step || step === 'intent' || this.sending) return;
    const r = this.row;
    this.sending = true;
    this.sendError = '';
    try {
      const { sessionId } = await vorhabenService.startStep(r.projectId, r.intentId, step, undefined, this.freigabeTarget(), { firstInput: buildFreigabeText(doc, this.standLabel()) });
      this.dispatchEvent(
        new CustomEvent<{ sessionId: string; step: VorhabenStep; intentId: string; firstInput: true }>('vorhaben-session-started', {
          bubbles: true,
          composed: true,
          detail: { sessionId, step, intentId: r.intentId, firstInput: true },
        })
      );
    } catch (err) {
      this.sendError = (err as Error).message || 'Sitzung konnte nicht gestartet werden';
    } finally {
      this.sending = false;
    }
  }

  // ---- Abschließen (INT-2026-024) ----

  private toast(message: string, type: 'success' | 'error' = 'success'): void {
    this.dispatchEvent(new CustomEvent('show-toast', { bubbles: true, composed: true, detail: { message, type } }));
  }

  /** FA-02: the backend reads the remote base branch and returns what the dialog shows; a refusal stands under the button. */
  private async openAbschluss(): Promise<void> {
    const r = this.row;
    if (this.vorschauLaedt || r.abschluss?.laeuft) return;
    this.vorschauLaedt = true;
    this.abschlussFehlerLokal = '';
    try {
      this.abschlussVorschau = await vorhabenService.abschlussVorschau(r.projectId, r.intentId);
      this.abschlussOpen = true;
    } catch (err) {
      this.abschlussFehlerLokal = (err as Error).message || 'Vorschau fehlgeschlagen';
    } finally {
      this.vorschauLaedt = false;
    }
  }

  /** The dialog was confirmed: the backend gets the shown `baseSha`; the row shows „läuft", then mark or failure. */
  private async startAbschluss(): Promise<void> {
    const v = this.abschlussVorschau;
    const r = this.row;
    this.abschlussOpen = false;
    if (!v) return;
    this.abschlussFehlerLokal = '';
    try {
      const { prNumber } = await vorhabenService.abschliessen(r.projectId, r.intentId, v.baseSha);
      this.toast(`Abschluss-PR #${prNumber} eröffnet`);
    } catch (err) {
      const e = err as VorhabenRequestError;
      this.abschlussFehlerLokal = e instanceof VorhabenRequestError && e.code === 'TIMEOUT' ? ABSCHLUSS_TIMEOUT_TEXT : e.message || 'Abschluss fehlgeschlagen';
    }
  }

  /** FA-15: drops the mark; branch and PR stay. */
  private async zuruecknehmen(): Promise<void> {
    const r = this.row;
    this.zuruecknehmenOpen = false;
    if (this.zuruecknehmenLaeuft) return;
    this.zuruecknehmenLaeuft = true;
    this.abschlussFehlerLokal = '';
    try {
      await vorhabenService.abschlussZuruecknehmen(r.projectId, r.intentId);
      this.toast('Abschluss zurückgenommen');
    } catch (err) {
      this.abschlussFehlerLokal = (err as Error).message || 'Zurücknehmen fehlgeschlagen';
    } finally {
      this.zuruecknehmenLaeuft = false;
    }
  }

  /**
   * The failure line under the button: the backend's stored reason wins; a mark or „läuft" on the row
   * supersedes a local text (the TIMEOUT case — the row carries the true state, review E8).
   */
  private abschlussFehlerText(): string {
    const a = this.row.abschluss;
    if (a?.fehler) return a.fehler.message;
    if (a?.marke || a?.laeuft) return '';
    return this.abschlussFehlerLokal;
  }

  /** Spec §6 „Bestätigungsdialog Vorhaben abschließen". */
  private renderAbschlussDialog() {
    const v = this.abschlussVorschau;
    const r = this.row;
    if (!v) return nothing;
    const close = (): void => {
      this.abschlussOpen = false;
    };
    return html`<div class="schleier" @click=${close}>
      <div class="dialog abschluss" role="dialog" aria-modal="true" aria-label="Vorhaben abschließen" @click=${(e: Event) => e.stopPropagation()}>
        <h2>Vorhaben abschließen</h2>
        <div class="zeilen">
          <div><code>${v.intentId}</code> · ${v.titel || r.titel}</div>
          <div>Absichtsdatei: <code>${v.datei}</code> im Ordner des Vorhabens</div>
          <div>Auf dem Hauptzweig (<code>${v.base}</code>): Status <strong>${v.statusAlt}</strong>, Version ${v.versionAlt} → <strong>${v.versionNeu}</strong></div>
          <div>Protokollzeile: ${v.zeile.filter((z) => z).join(' · ')}</div>
          <div>Zweig <code>${v.zweig}</code> · Pull Request gegen <code>${v.base}</code>${v.bauPrs.length ? html` · Bau-PR ${v.bauPrs.map((n) => `#${n}`).join(', ')}` : nothing}</div>
        </div>
        <div class="nicht">Nicht: mergen · spec.md/plan.md ändern · Sitzung oder Arbeitskopie beenden · Board-Karte anlegen</div>
        <div class="aktionen-dialog">
          <button type="button" class="abbrechen" @click=${close}>Abbrechen</button>
          <button type="button" class="primary bestaetigen" @click=${() => void this.startAbschluss()}>Abschließen und PR eröffnen</button>
        </div>
      </div>
    </div>`;
  }

  /** Spec Ablauf C step 3. */
  private renderZuruecknehmenDialog() {
    const marke = this.row.abschluss?.marke;
    const close = (): void => {
      this.zuruecknehmenOpen = false;
    };
    return html`<div class="schleier" @click=${close}>
      <div class="dialog zuruecknehmen" role="dialog" aria-modal="true" aria-label="Abschluss zurücknehmen" @click=${(e: Event) => e.stopPropagation()}>
        <h2>Abschluss zurücknehmen</h2>
        <div class="zeilen">
          <div>Die Zeile steht wieder in ihrer Phase.</div>
          <div>Zweig${marke ? html` <code>${marke.zweig}</code>` : nothing} und Pull Request${marke ? html` <a href=${marke.prUrl} target="_blank" rel="noopener">#${marke.prNumber}</a>` : nothing} bleiben bestehen — den PR auf GitHub schließen, wenn er nicht gelten soll.</div>
        </div>
        <div class="aktionen-dialog">
          <button type="button" class="abbrechen" @click=${close}>Abbrechen</button>
          <button type="button" class="primary bestaetigen" @click=${() => void this.zuruecknehmen()}>Zurücknehmen</button>
        </div>
      </div>
    </div>`;
  }

  /** Mac and phone alike (INT-2026-010, FA-20): app.ts owns the phone branch (active session + open sidebar). */
  private toTerminal(sessionId?: string): void {
    const id = sessionId ?? this.row.session?.id;
    if (id) document.dispatchEvent(new CustomEvent('open-terminal-session', { bubbles: true, composed: true, detail: { sessionId: id } }));
  }

  /** Scrolls the „nächster Schritt" block into view (send bar). */
  public scrollToNextStep(): void {
    this.renderRoot.querySelector('aos-naechster-schritt')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // ---- render ----

  override render() {
    const r = this.row;
    const info = this.docInfo();
    const session = r.session;
    const vorhanden = this.docVorhanden();
    const annotierbar = this.doc !== 'design' && vorhanden;
    const grund = leisteGrund(r);
    const entries = this.protocol.filter((e) => e.projectId === r.projectId && e.intentId === r.intentId);
    return html`
      <div class="inhalt">
        <button type="button" class="zurueck" @click=${this.back}>‹ Vorhaben</button>
        <div class="kopf">
          <div class="kopf-text">
            <div class="projekt">${r.projectName}</div>
            <div class="kennung">${r.intentId}</div>
            <h1>${r.titel}</h1>
          </div>
          ${this.renderChips()}
        </div>
        <div class="meta">
          <span><span class="dot ${r.zustand}"></span>${ZUSTAND_LABELS[r.zustand]}${r.zustandDetail && r.zustand !== 'wartet_auf_dich' && !ZUSTAND_LABELS[r.zustand].endsWith(r.zustandDetail) ? ` · ${r.zustandDetail}` : ''}</span>
          ${session
            ? html`<span
                >Sitzung <strong>${session.name}</strong>${session.model ? ` · ${session.model}` : ''}${session.ended ? ' · beendet' : ''}${session.resumed
                  ? ` · fortgesetzt nach Neustart${session.resumed.stand ? `, Stand ${formatClock(Date.parse(session.resumed.stand))}` : ''}`
                  : ''}</span
              >`
            : nothing}
          ${r.arbeitskopie ? html`<span>Arbeitskopie <code>${r.arbeitskopie}</code></span>` : nothing}
          ${r.phaseNote ? html`<span>${r.phaseNote}</span>` : nothing}
        </div>
        ${this.renderHinweis()}
        <aos-vorhaben-protokoll .entries=${entries} .mobile=${this.mobile} @protokoll-terminal=${(e: CustomEvent<{ sessionId: string }>) => this.toTerminal(e.detail.sessionId)}></aos-vorhaben-protokoll>
        ${vorhanden
          ? html`<aos-dokument-leser
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
              @leser-loaded=${this.onLeserLoaded}
            ></aos-dokument-leser>`
          : html`<div class="kein-dokument">Kein Dokument in dieser Phase</div>`}
        ${this.renderAktionen()}
      </div>
      ${this.sendError ? html`<div class="send-fehler" role="alert">${this.sendError}</div>` : nothing}
      ${annotierbar
        ? html`<aos-sende-leiste
            .row=${r}
            .count=${this.drafts.length}
            .mobile=${this.mobile}
            .sending=${this.sending}
            .docChanged=${this.docChanged()}
            @leiste-sammel=${() => (this.sammelOpen = true)}
            @leiste-send=${() => this.send('aenderungen')}
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
        .grund=${grund === 'dialog' ? dialogZielText(r) : grundText(grund, this.mobile)}
        .sending=${this.sending}
        @sammel-close=${() => (this.sammelOpen = false)}
        @sammel-send=${() => this.send('aenderungen')}
        @anmerkung-save=${this.onAnmerkungSave}
        @anmerkung-delete=${this.onAnmerkungDelete}
      ></aos-anmerkungen-sammel>
      ${this.freigabeOpen ? this.renderFreigabeDialog() : nothing}
      ${this.abschlussOpen ? this.renderAbschlussDialog() : nothing}
      ${this.zuruecknehmenOpen ? this.renderZuruecknehmenDialog() : nothing}
    `;
  }

  /** FA-12: intent · spec · plan · build (+ design/); `erreicht` = phase of the row, `gewaehlt` = shown document, `leer` = no file yet. */
  private renderChips() {
    const r = this.row;
    const erreicht = erreichterChip(r.phase);
    const reihe = PHASEN_CHIPS.map((c) => c.chip);
    const erreichtIdx = erreicht ? reihe.indexOf(erreicht) : -1;
    return html`<div class="chips" role="tablist" aria-label="Phasen">
      ${PHASEN_CHIPS.map((c, i) => {
        const has = r.docs.some((d) => d.key === c.doc);
        const cls = ['chip', c.chip === erreicht ? 'erreicht' : '', i < erreichtIdx ? 'hinter' : '', this.doc === c.doc ? 'gewaehlt' : '', has ? '' : 'leer'].filter(Boolean).join(' ');
        return html`<button type="button" role="tab" class=${cls} data-chip=${c.chip} aria-pressed=${this.doc === c.doc} aria-selected=${this.doc === c.doc} title=${has ? VORHABEN_DOC_FILES[c.doc] : 'Kein Dokument in dieser Phase'} @click=${() => this.selectDoc(c.doc)}>${c.label}</button>`;
      })}
      ${r.designFiles.length
        ? html`<button type="button" role="tab" class="chip design ${this.doc === 'design' ? 'gewaehlt' : ''}" data-chip="design" aria-pressed=${this.doc === 'design'} aria-selected=${this.doc === 'design'} @click=${() => this.selectDoc('design')}>design/</button>`
        : nothing}
    </div>`;
  }

  /**
   * FA-12/FA-21/FA-22: next step (always, greyed out while busy), „Freigeben" for the document awaiting approval, phone: the terminal.
   * INT-2026-024 (FA-01, FA-15, FA-18, FA-19): „Abschließen" (or „Abschluss zurücknehmen" with a mark), locked while one runs; the failure line below.
   */
  private renderAktionen() {
    const r = this.row;
    const live = this.liveSession();
    const freigabe = this.freigabeMoeglich();
    const sperre = freigabe ? this.freigabeSperre() : '';
    const abschluss = abschlussMoeglich(r);
    const marke = r.abschluss?.marke;
    const laeuft = !!r.abschluss?.laeuft;
    const fehler = this.abschlussFehlerText();
    if (!r.nextStep && !freigabe && !(this.mobile && live) && !abschluss && !marke) return nothing;
    return html`<div class="aktionen">
        ${this.renderNextStep()}
        ${freigabe
          ? html`<button type="button" class="seite-knopf primary freigeben" ?disabled=${!!sperre} title=${sperre} @click=${this.openFreigabe}>Freigeben</button>`
          : nothing}
        ${abschluss
          ? html`<button type="button" class="seite-knopf abschliessen" ?disabled=${laeuft || this.vorschauLaedt} @click=${() => void this.openAbschluss()}>
              ${laeuft ? 'Abschluss läuft …' : this.vorschauLaedt ? 'Vorschau …' : 'Abschließen'}
            </button>`
          : nothing}
        ${marke
          ? html`<button type="button" class="seite-knopf zuruecknehmen" ?disabled=${laeuft || this.zuruecknehmenLaeuft} @click=${() => (this.zuruecknehmenOpen = true)}>Abschluss zurücknehmen</button>`
          : nothing}
        ${this.mobile && live ? html`<button type="button" class="seite-knopf terminal" @click=${() => this.toTerminal(live.id)}>Im Terminal öffnen ↗</button>` : nothing}
      </div>
      ${fehler ? html`<div class="abschluss-fehler" role="alert">${fehler}</div>` : nothing}`;
  }

  /** Mock 06 "Freigeben · Bestätigung": document + stand, target (session, or the session to start), hint on unsent Anmerkungen (FA-29). */
  private renderFreigabeDialog() {
    const r = this.row;
    const live = this.liveSession();
    const n = this.drafts.length;
    const step = this.freigabeStep();
    const modell = this.freigabeModell();
    const confirm = (): void => {
      this.freigabeOpen = false;
      if (live) void this.send('freigabe');
      else void this.startFreigabe();
    };
    return html`<div class="schleier" @click=${() => (this.freigabeOpen = false)}>
      <div class="dialog" role="dialog" aria-modal="true" aria-label="Freigabe bestätigen" @click=${(e: Event) => e.stopPropagation()}>
        <h2>${this.freigabeTitle()}</h2>
        ${live
          ? html`<div class="ziel">an Sitzung <strong>${live.name}</strong> · ${r.projectName}</div>`
          : html`<div class="ziel">
              startet <code>${step ? stepCommand(step, r.intentId) : ''}</code> mit Modell <strong>${modell ? modell.modelId : '…'}</strong>${r.arbeitskopie ? html` in <code>${r.arbeitskopie}</code>` : nothing} und übergibt die Freigabe als erste Eingabe — die Sitzung setzt Status, Änderungsprotokoll und Commit.
            </div>`}
        ${n > 0
          ? html`<div class="warnung"><strong>${n} ${n === 1 ? 'Anmerkung' : 'Anmerkungen'} ungesendet</strong> — bleibt erhalten, wird nicht mitgeschickt.</div>`
          : nothing}
        <div class="aktionen-dialog">
          <button type="button" @click=${() => (this.freigabeOpen = false)}>Abbrechen</button>
          <button type="button" class="primary" @click=${confirm}>${live ? 'Freigeben' : 'Sitzung starten und freigeben'}</button>
        </div>
      </div>
    </div>`;
  }

  private renderHinweis() {
    // INT-2026-024 (FA-11): the mark's hint first — neutral, with the PR link and the one thing Michael still does.
    const marke = this.row.abschluss?.marke;
    const abschluss = marke
      ? html`<div class="hinweis abschluss"><span>Abschluss angestoßen · <a href=${marke.prUrl} target="_blank" rel="noopener">PR #${marke.prNumber} ↗</a> — nach dem Merge den Hauptcheckout aktualisieren</span></div>`
      : nothing;
    // INT-2026-019 (AK-08/AK-09): the reason comes first; the state hint below stays (e.g. „Nächster Schritt" remains the way).
    return html`${abschluss}${this.resumeHinweis ? html`<div class="hinweis resume"><span>Wiederaufnahme nicht möglich: ${this.resumeHinweis}</span></div>` : nothing}${this.renderZustandHinweis()}`;
  }

  private renderZustandHinweis() {
    const r = this.row;
    if (r.zustand === 'wartet_auf_dich' && r.reviewDoc && r.step) {
      const info = r.docs.find((d) => d.key === r.reviewDoc);
      return html`<div class="hinweis review">
        <span><span class="dot wartet_auf_dich"></span><strong>Wartet auf deine Antwort zu ${VORHABEN_DOC_FILES[r.reviewDoc]}</strong> · Schritt ${STEP_LABELS[r.step]}</span>
        ${info ? html`<span class="stand">Stand ${formatStand(info.mtimeMs)}</span>` : nothing}
      </div>`;
    }
    if (r.phase === 'absicht' && !this.liveSession()) {
      return html`<div class="hinweis"><span>Entwurf im Terminal fortsetzen.</span></div>`;
    }
    // INT-2026-007 (FA-09): the hint names the kind of dialog; the answer happens in the docked terminal (INT-2026-011).
    if (r.zustand === 'wartet_rueckfrage') {
      return html`<div class="hinweis"><span>Die Sitzung stellt eine Rückfrage — im Terminal antworten.</span></div>`;
    }
    if (r.zustand === 'wartet_plan') {
      return html`<div class="hinweis"><span>Die Sitzung legt einen Plan vor — Entscheidung im Terminal.</span></div>`;
    }
    if (r.zustand === 'wartet_berechtigung') {
      return html`<div class="hinweis"><span>Die Sitzung zeigt einen Dialog${r.zustandDetail && r.zustandDetail !== 'Dialog' ? ` (${r.zustandDetail})` : ''} — im Terminal antworten.</span></div>`;
    }
    return nothing;
  }

  private renderNextStep() {
    const r = this.row;
    if (!r.nextStep) return nothing;
    const key = lastModelKey(r.projectId, r.intentId, r.nextStep.step);
    return html`<aos-naechster-schritt
      compact
      .projectId=${r.projectId}
      .projectPath=${r.projectPath}
      .intentId=${r.intentId}
      .step=${r.nextStep.step}
      .label=${r.nextStep.label}
      .command=${r.nextStep.command}
      .lastModel=${this.lastModel[key]}
      .mobile=${this.mobile}
      .gesperrt=${r.sessionBusy}
      .sperre=${r.nextStep.sperre ?? null}
      .sitzung=${r.nextStep.sitzung}
    ></aos-naechster-schritt>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-vorhaben-seite': AosVorhabenSeite;
  }
}
