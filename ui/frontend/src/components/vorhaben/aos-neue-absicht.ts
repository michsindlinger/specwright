/**
 * aos-neue-absicht — the page „Neue Absicht" (INT-2026-010, AK-08/AK-09,
 * FA-10/FA-11): exactly three elements — a text field („Was stört, wen, seit
 * wann?"), the model choice (preselected like every step, `model-wahl.ts`)
 * and „Starten". Start = `vorhaben:start-step intent` with the text as
 * `firstInput`; the backend hands it to the session at its first Stop, so it
 * appears as Michael's first Beitrag in the Gespräch. While a `/intent`
 * session of the project is still pending (no folder yet), the page shows
 * that session instead of the form: on the Mac the Gespräch stands left of
 * this card (the view renders it), on the phone the card offers the terminal
 * (AK-06). The view follows the session to its Vorhaben page once a folder
 * claims it (`followStartedIntent`).
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { vorhabenService, type ModelListInfo } from '../../services/vorhaben.service.js';
import { ladeModelle, vorauswahl } from './model-wahl.js';
import type { ModelSelection, VorhabenPendingIntent } from '../../../../src/shared/types/vorhaben.protocol.js';
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
  /** The pending `/intent` session of the project (oldest first) — shown instead of the form. */
  @property({ attribute: false }) pending: VorhabenPendingIntent | null = null;

  @state() private text = '';
  @state() private models: ModelListInfo | null = null;
  @state() private selected: ModelSelection | null = null;
  @state() private starting = false;
  @state() private error = '';

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
    :host([mobile]) .zeile {
      flex-direction: column;
      align-items: stretch;
    }
    :host([mobile]) .zeile aos-model-selector {
      margin-left: 0;
    }
    /* pending session (moved from the S1 interim block) */
    .karte {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--color-accent-primary);
      border-radius: var(--radius-md);
      background: rgba(var(--color-accent-primary-rgb, 0, 212, 255), 0.06);
      max-width: 720px;
    }
    .karte .status,
    .karte .uebergabe {
      color: var(--color-text-secondary);
      font-size: var(--font-size-xs);
    }
    .karte .uebergabe {
      color: var(--color-text-muted);
    }
    .karte .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-accent-success);
      margin-right: 6px;
    }
    .karte button.terminal {
      align-self: flex-start;
      font: inherit;
      font-size: var(--font-size-sm);
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text-primary);
      cursor: pointer;
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
  }

  /** Cmd/Ctrl+Enter starts like the button. */
  private onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void this.start();
    }
  }

  private get bereit(): boolean {
    return this.text.trim().length > 0 && !!this.selected && !this.starting;
  }

  private async start(): Promise<void> {
    if (!this.bereit || !this.selected) return;
    const text = this.text.trim();
    this.starting = true;
    this.error = '';
    try {
      const { sessionId } = await vorhabenService.startStep(this.projectId, undefined, 'intent', this.selected, { kind: 'main' }, { firstInput: text });
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

  private toTerminal(): void {
    const id = this.pending?.sessionId;
    if (id) document.dispatchEvent(new CustomEvent('open-terminal-session', { bubbles: true, composed: true, detail: { sessionId: id } }));
  }

  override render() {
    if (this.pending) return this.renderPending(this.pending);
    return html`<div class="formular">
      <textarea
        aria-label="Absicht"
        placeholder=${NEUE_ABSICHT_PLACEHOLDER}
        .value=${this.text}
        ?disabled=${this.starting}
        @input=${this.onInput}
        @keydown=${this.onKeydown}
      ></textarea>
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

  private renderPending(p: VorhabenPendingIntent) {
    return html`<div class="karte gestartet">
      <span><span class="dot"></span>Absicht-Sitzung „${p.session.name}" läuft — Vorhaben entsteht …</span>
      <span class="status">${this.mobile ? 'im Terminal antworten' : 'Gespräch links'} — die Vorhaben-Seite öffnet sich, sobald der Ordner da ist</span>
      ${p.session.firstInputPending ? html`<span class="uebergabe">Dein Text wird nach der ersten Frage übergeben.</span>` : nothing}
      <button type="button" class="terminal" @click=${this.toTerminal}>Im Terminal öffnen ↗</button>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-neue-absicht': AosNeueAbsicht;
  }
}
