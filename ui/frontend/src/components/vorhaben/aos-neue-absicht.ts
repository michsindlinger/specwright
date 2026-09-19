/**
 * aos-neue-absicht — the page „Neue Absicht" (INT-2026-010, AK-08/AK-09,
 * FA-10/FA-11): exactly three elements — a text field („Was stört, wen, seit
 * wann?"), the model choice (preselected like every step, `model-wahl.ts`)
 * and „Starten". Start = `vorhaben:start-step intent` with the text as
 * `firstInput`; the backend hands it to the session at its first Stop, so it
 * appears as Michael's first input in the terminal.
 *
 * INT-2026-022 (AK-01…AK-04, AK-11; FA-01…FA-09, FA-15): the form is ALWAYS
 * there. Below it, only while the project has pending `/intent` sessions
 * (no folder yet), the list „Laufende Absicht-Sitzungen · n": per session a
 * dot in the state colour, the session name, the copy label, the state text
 * and „Im Terminal öffnen ↗" for exactly that session; the session the docked
 * terminal shows (`selectedSessionId`, the view decides) is highlighted.
 * Sessions sharing a copy get a grey sentence naming the oldest one — that is
 * the session the next folder there is assigned to (NZ-01). „Starten" always
 * asks for a NEW worktree; a refusal (no git repo, isolation off, worktree
 * creation failed) stands under the button with the next step, the text stays.
 * The card „Absicht-Sitzung läuft — Vorhaben entsteht …" is gone (AN-S13).
 *
 * INT-2026-020 (AK-01…AK-06): Cmd+V with an image on the clipboard uploads it
 * (`vorhaben:absicht-bild`, Terminal rules for type and size) and inserts the
 * returned path as ` <path> ` at the caret; the path travels with the text as
 * `firstInput`. Text pastes stay native. While an upload runs, „Starten" and
 * Cmd+Enter are locked; a status line under the field says what happens.
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { vorhabenService, type ModelListInfo } from '../../services/vorhaben.service.js';
import { ladeModelle, vorauswahl } from './model-wahl.js';
import { blobToBase64, findClipboardImage } from '../../utils/clipboard-image.js';
import type { ModelSelection, VorhabenPendingIntent } from '../../../../src/shared/types/vorhaben.protocol.js';
import { CLOUD_TERMINAL_CONFIG } from '../../../../src/shared/types/cloud-terminal.protocol.js';
import { ZUSTAND_LABELS } from './vorhaben-sort.js';
import '../model-selector.js';

export const NEUE_ABSICHT_PLACEHOLDER = 'Was stört, wen, seit wann?';

@customElement('aos-neue-absicht')
export class AosNeueAbsicht extends LitElement {
  @property({ type: String }) projectId = '';
  @property({ type: String }) projectPath = '';
  @property({ type: String }) projectName = '';
  /** Last model chosen for `intent` in this project, when the caller knows one. */
  @property({ attribute: false }) lastModel: ModelSelection | undefined = undefined;
  @property({ type: Boolean, reflect: true }) mobile = false;
  /** INT-2026-022 (FA-02): pending `/intent` sessions of the project, oldest first — the list under the form. */
  @property({ attribute: false }) pendings: VorhabenPendingIntent[] = [];
  /** INT-2026-022 (FA-06, FA-15): the session the docked terminal shows — highlighted in the list. */
  @property({ attribute: false }) selectedSessionId: string | null = null;

  @state() private text = '';
  @state() private models: ModelListInfo | null = null;
  @state() private selected: ModelSelection | null = null;
  @state() private starting = false;
  @state() private error = '';
  /** INT-2026-020: an image upload is in flight — „Starten" is locked meanwhile (AK-06). */
  @state() private uploading = false;
  /** INT-2026-020 (AK-03/AK-04): status line under the field; display only, cleared on input. */
  @state() private hinweis: { text: string; art: 'info' | 'success' | 'error' } | null = null;

  static override styles = css`
    :host {
      display: block;
      font-family: var(--font-family);
      font-size: var(--font-size-sm);
    }
    .formular {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      max-width: 720px;
    }
    textarea {
      font: inherit;
      font-size: var(--font-size-md);
      line-height: 1.5;
      min-height: 160px;
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      resize: vertical;
    }
    textarea:focus {
      outline: none;
      border-color: var(--color-accent-primary);
    }
    .zeile {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      flex-wrap: wrap;
    }
    .zeile aos-model-selector {
      margin-left: auto;
    }
    button.start {
      font: inherit;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      padding: 8px 18px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-accent-primary);
      background: var(--color-accent-primary);
      color: var(--color-bg-primary);
      cursor: pointer;
      white-space: nowrap;
    }
    button.start:disabled {
      opacity: 0.6;
      cursor: default;
    }
    .fehler {
      color: var(--color-accent-error);
      font-size: var(--font-size-xs);
    }
    .hinweis {
      color: var(--color-text-secondary);
      font-size: var(--font-size-xs);
    }
    .hinweis[data-art='success'] {
      color: var(--color-accent-success);
    }
    .hinweis[data-art='error'] {
      color: var(--color-accent-error);
    }
    :host([mobile]) .zeile {
      flex-direction: column;
      align-items: stretch;
    }
    :host([mobile]) .zeile aos-model-selector {
      margin-left: 0;
    }
    /* INT-2026-022: list of pending sessions under the form */
    .sitzungen {
      margin-top: var(--spacing-lg);
      max-width: 720px;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }
    .sitzungen h2 {
      margin: 0 0 var(--spacing-xs);
      font-size: var(--font-size-sm);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      font-weight: var(--font-weight-semibold);
    }
    .eintrag {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-xs) var(--spacing-sm);
      border: 1px solid var(--color-border);
      border-left-width: 3px;
      border-radius: var(--radius-md);
      background: var(--color-bg-secondary);
      min-width: 0;
    }
    .eintrag.gewaehlt {
      border-color: var(--color-accent-primary);
      background: rgba(var(--color-accent-primary-rgb, 0, 212, 255), 0.06);
    }
    .eintrag .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-text-muted);
      flex: none;
    }
    .eintrag .dot.wartet_auf_dich {
      background: var(--color-accent-primary);
    }
    .eintrag .dot.wartet,
    .eintrag .dot.wartet_rueckfrage,
    .eintrag .dot.wartet_plan,
    .eintrag .dot.wartet_berechtigung {
      background: var(--color-accent-warning);
    }
    .eintrag .dot.arbeitet {
      background: var(--color-accent-success);
    }
    /* Name, Label und Zustand bleiben lesbar; der Übergabe-Hinweis gibt zuerst nach (angedockt sind es ~690 px). */
    .eintrag .name {
      font-weight: var(--font-weight-semibold);
      white-space: nowrap;
      flex: none;
    }
    .eintrag .kopie {
      color: var(--color-text-secondary);
      white-space: nowrap;
      flex: 0 1 auto;
      min-width: 8ch;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .eintrag .zustand {
      color: var(--color-text-secondary);
      white-space: nowrap;
      flex: none;
    }
    .eintrag .uebergabe {
      color: var(--color-text-muted);
      font-size: var(--font-size-xs);
      white-space: nowrap;
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .eintrag button.terminal {
      flex: none;
      margin-left: auto;
      font: inherit;
      font-size: var(--font-size-sm);
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text-primary);
      cursor: pointer;
      white-space: nowrap;
    }
    .gruppe-hinweis {
      color: var(--color-text-muted);
      font-size: var(--font-size-xs);
      padding: 0 var(--spacing-sm) var(--spacing-xs);
    }
    :host([mobile]) .eintrag {
      flex-wrap: wrap;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    void this.loadModels();
  }

  private async loadModels(): Promise<void> {
    try {
      this.models = await ladeModelle();
      this.selected = vorauswahl(this.models, 'intent', this.lastModel);
    } catch (err) {
      this.error = (err as Error).message;
    }
  }

  private onModel(e: CustomEvent<{ providerId: string; modelId: string }>): void {
    e.stopPropagation();
    this.selected = { providerId: e.detail.providerId, modelId: e.detail.modelId };
  }

  private onInput(e: Event): void {
    this.text = (e.target as HTMLTextAreaElement).value;
    this.hinweis = null;
  }

  /**
   * INT-2026-020: image on the clipboard → upload and insert the path (AK-01);
   * no image → let the browser paste text (AK-02). Type and size are checked
   * here first with the Terminal's rules so the user sees the reason without a
   * round trip (AK-04); the backend checks again.
   */
  private onPaste(e: ClipboardEvent): void {
    const image = findClipboardImage(e.clipboardData, CLOUD_TERMINAL_CONFIG.ALLOWED_PASTE_IMAGE_MIME);
    if (!image) return;
    e.preventDefault();
    if (!image.allowed) {
      this.hinweis = { text: `Bildart nicht unterstützt: ${image.file.type || 'unbekannt'}`, art: 'error' };
      return;
    }
    const maxBytes = CLOUD_TERMINAL_CONFIG.MAX_PASTE_IMAGE_BYTES;
    if (image.file.size > maxBytes) {
      this.hinweis = { text: `Screenshot ist zu groß (${(image.file.size / 1024 / 1024).toFixed(1)} MB, Limit ${maxBytes / 1024 / 1024} MB)`, art: 'error' };
      return;
    }
    if (this.uploading) return; // one upload at a time — the status line already says so
    void this.bildEinfuegen(image.file, e.target as HTMLTextAreaElement);
  }

  /** Upload the image and insert ` <absolutePath> ` where the caret was (AK-01, AK-03). */
  private async bildEinfuegen(file: File, ta: HTMLTextAreaElement): Promise<void> {
    this.uploading = true;
    this.hinweis = { text: 'Screenshot wird hochgeladen…', art: 'info' };
    const selStart = ta.selectionStart ?? this.text.length;
    const selEnd = ta.selectionEnd ?? selStart;
    try {
      let base64: string;
      try {
        base64 = await blobToBase64(file);
      } catch (err) {
        this.hinweis = { text: `Screenshot konnte nicht gelesen werden: ${err instanceof Error ? err.message : String(err)}`, art: 'error' };
        return;
      }
      let absolutePath: string;
      try {
        ({ absolutePath } = await vorhabenService.pasteAbsichtBild(this.projectId, base64, file.type));
      } catch (err) {
        this.hinweis = { text: `Screenshot-Paste fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`, art: 'error' };
        return;
      }
      // Surrounding spaces so the path sits as a distinct token, like the Terminal does.
      const token = ` ${absolutePath} `;
      const start = Math.min(selStart, this.text.length);
      const end = Math.min(Math.max(selEnd, start), this.text.length);
      this.text = this.text.slice(0, start) + token + this.text.slice(end);
      this.hinweis = { text: 'Screenshot eingefügt', art: 'success' };
      await this.updateComplete;
      const caret = start + token.length;
      ta.setSelectionRange(caret, caret);
    } finally {
      this.uploading = false;
    }
  }

  /** Cmd/Ctrl+Enter starts like the button. */
  private onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void this.start();
    }
  }

  private get bereit(): boolean {
    return this.text.trim().length > 0 && !!this.selected && !this.starting && !this.uploading;
  }

  private async start(): Promise<void> {
    if (!this.bereit || !this.selected) return;
    const text = this.text.trim();
    this.starting = true;
    this.error = '';
    try {
      // INT-2026-022 (FA-07): always a NEW worktree — the backend refuses when none is possible (FA-09), the text stays.
      const { sessionId } = await vorhabenService.startStep(this.projectId, undefined, 'intent', this.selected, { kind: 'new-worktree' }, { firstInput: text });
      this.text = '';
      this.dispatchEvent(
        new CustomEvent<{ sessionId: string; step: 'intent' }>('vorhaben-session-started', { bubbles: true, composed: true, detail: { sessionId, step: 'intent' } })
      );
    } catch (err) {
      this.error = (err as Error).message || 'Sitzung konnte nicht gestartet werden';
    } finally {
      this.starting = false;
    }
  }

  /** „Im Terminal öffnen" of ONE list entry — its own session, never the oldest (FA-02). */
  private toTerminal(sessionId: string): void {
    document.dispatchEvent(new CustomEvent('open-terminal-session', { bubbles: true, composed: true, detail: { sessionId } }));
  }

  override render() {
    return html`${this.renderFormular()}${this.pendings.length > 0 ? this.renderListe() : nothing}`;
  }

  private renderFormular() {
    return html`<div class="formular">
      <textarea
        aria-label="Absicht"
        placeholder=${NEUE_ABSICHT_PLACEHOLDER}
        .value=${this.text}
        ?disabled=${this.starting}
        @input=${this.onInput}
        @keydown=${this.onKeydown}
        @paste=${this.onPaste}
      ></textarea>
      ${this.hinweis
        ? html`<div class="hinweis" data-art=${this.hinweis.art} role=${this.hinweis.art === 'error' ? 'alert' : 'status'}>${this.hinweis.text}</div>`
        : nothing}
      <div class="zeile">
        ${this.models
          ? html`<aos-model-selector
              .externalProviders=${this.models.providers}
              .externalSelectedModelId=${this.selected?.modelId ?? ''}
              .externalSelectedProviderId=${this.selected?.providerId ?? ''}
              @model-changed=${this.onModel}
            ></aos-model-selector>`
          : html`<span>Modelle …</span>`}
        <button type="button" class="start" ?disabled=${!this.bereit} @click=${this.start}>${this.starting ? 'Startet …' : 'Starten'}</button>
      </div>
      ${this.error ? html`<div class="fehler" role="alert">${this.error}</div>` : nothing}
    </div>`;
  }

  /**
   * INT-2026-022 (FA-02, FA-03, FA-04): the list of pending sessions, oldest first. Sessions in the same copy
   * (`cwd`) get one grey sentence after the last of them naming the oldest — the next folder there is hers.
   */
  private renderListe() {
    const list = this.pendings;
    const byCwd = new Map<string, VorhabenPendingIntent[]>();
    for (const p of list) byCwd.set(p.cwd, [...(byCwd.get(p.cwd) ?? []), p]);
    return html`<section class="sitzungen" aria-label="Laufende Absicht-Sitzungen">
      <h2>Laufende Absicht-Sitzungen · ${list.length}</h2>
      ${list.map((p) => {
        const group = byCwd.get(p.cwd)!;
        const last = group[group.length - 1] === p;
        return html`${this.renderEintrag(p)}${last && group.length > 1 ? this.renderGruppenHinweis(group) : nothing}`;
      })}
    </section>`;
  }

  private renderEintrag(p: VorhabenPendingIntent) {
    const detail = p.zustandDetail ? ` · ${p.zustandDetail}` : '';
    return html`<div class="eintrag ${p.sessionId === this.selectedSessionId ? 'gewaehlt' : ''}" data-session=${p.sessionId} aria-current=${p.sessionId === this.selectedSessionId ? 'true' : 'false'}>
      <span class="dot ${p.zustand}"></span>
      <span class="name">${p.session.name}</span>
      ${p.arbeitskopie ? html`<span class="kopie">· ${p.arbeitskopie}</span>` : nothing}
      <span class="zustand">· ${ZUSTAND_LABELS[p.zustand]}${detail}</span>
      ${p.session.firstInputPending ? html`<span class="uebergabe">Dein Text wird nach der ersten Frage übergeben</span>` : nothing}
      <button type="button" class="terminal" @click=${() => this.toTerminal(p.sessionId)}>Im Terminal öffnen ↗</button>
    </div>`;
  }

  /** FA-04: two → „Beide laufen in …"; more → „n Sitzungen laufen in …"; the oldest by `since` gets the next folder (NZ-01). */
  private renderGruppenHinweis(group: VorhabenPendingIntent[]) {
    const oldest = [...group].sort((a, b) => (a.since < b.since ? -1 : a.since > b.since ? 1 : 0))[0];
    const label = group[0].arbeitskopie || 'dieser Arbeitskopie';
    const wer = group.length === 2 ? 'Beide laufen' : `${group.length} Sitzungen laufen`;
    const wem = group.length === 2 ? 'älteren' : 'ältesten';
    return html`<div class="gruppe-hinweis">${wer} in ‚${label}' — der nächste Ordner wird der ${wem} Sitzung ‚${oldest.session.name}' zugeordnet.</div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-neue-absicht': AosNeueAbsicht;
  }
}
