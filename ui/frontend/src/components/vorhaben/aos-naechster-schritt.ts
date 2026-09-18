/**
 * aos-naechster-schritt — "Nächster Schritt: Plan erstellen — startet eine
 * Sitzung mit /specwright:plan INT-…" with the model choice (pre-set to the last model
 * of this Vorhaben and step, else the step default, FA-40 — helper
 * `model-wahl.ts`) and the target (project or an existing worktree, new
 * worktree — the picker's data, V-14) and the start button (FA-35, mock 03b).
 * INT-2026-010 (FA-21): always shown on the Vorhaben page; `gesperrt` greys
 * the button out. INT-2026-018: `sperre` names the reason (backend rule,
 * `NEXT_STEP_SPERRE_TEXT`); `sitzung` is the live session the click continues
 * in (`/clear`, then the command) — the box preselects its model and target
 * (O1) and announces what the click will do: continue there, or start a new
 * session and close it when model or target differ (AK-07). The box never
 * decides — it only compares its own selection with what the backend said.
 */

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { vorhabenService, type ModelListInfo } from '../../services/vorhaben.service.js';
import { istSchrittStandard, ladeModelle, modellVorhanden, vorauswahl } from './model-wahl.js';
import { NEXT_STEP_SPERRE_TEXT, stepCommand, type ModelSelection, type VorhabenNextStep, type VorhabenNextStepSperre, type VorhabenStep } from '../../../../src/shared/types/vorhaben.protocol.js';
import type { CloudTerminalSessionTarget, CloudTerminalWorktreeEntry } from '../../../../src/shared/types/cloud-terminal.protocol.js';
import '../model-selector.js';

/** Today's sentence for a locked box without a reason (older backend). */
const SPERRE_FALLBACK = 'Sitzung arbeitet oder wartet — erst danach kann der nächste Schritt starten';

const STEP_TEXT: Record<VorhabenStep, string> = {
  intent: 'Absicht beginnen',
  spec: 'Spec schreiben',
  plan: 'Plan erstellen',
  build: 'Bau starten',
};

@customElement('aos-naechster-schritt')
export class AosNaechsterSchritt extends LitElement {
  @property({ type: String }) projectId = '';
  @property({ type: String }) projectPath = '';
  /** Absent for `intent`. */
  @property({ type: String }) intentId = '';
  @property({ type: String }) step: VorhabenStep = 'plan';
  /** Button label from the row (`Bau fortsetzen`), else the step text. */
  @property({ type: String }) label = '';
  @property({ type: String }) command = '';
  /** Last model chosen for this Vorhaben and step (FA-40). */
  @property({ attribute: false }) lastModel: ModelSelection | undefined = undefined;
  @property({ type: Boolean, reflect: true }) mobile = false;
  /** Compact = no explanatory sentence (project page). */
  @property({ type: Boolean }) compact = false;
  /** INT-2026-010 (FA-21): a session of the Vorhaben works or waits — the button is disabled with a hint. */
  @property({ type: Boolean, reflect: true }) gesperrt = false;
  /** INT-2026-018 (AK-02): why the button is locked (`nextStep.sperre`); null = no reason known. */
  @property({ attribute: false }) sperre: VorhabenNextStepSperre | null = null;
  /** INT-2026-018 (AK-07): the live session the click continues in when model and target match (`nextStep.sitzung`). */
  @property({ attribute: false }) sitzung: VorhabenNextStep['sitzung'] | undefined = undefined;

  @state() private models: ModelListInfo | null = null;
  @state() private selected: ModelSelection | null = null;
  @state() private worktrees: CloudTerminalWorktreeEntry[] = [];
  @state() private worktreeCreationEnabled = true;
  @state() private isGitRepo = false;
  @state() private target = 'main';
  @state() private starting = false;
  @state() private error = '';
  /**
   * INT-2026-018 (review E3): the session's worktree when the target list does
   * not know it (created after the list was loaded, or not a git worktree of
   * this repo) — offered as its own option so the preselection never falls
   * back to „Im Projekt" silently.
   */
  @state() private extraWorktree: string | null = null;
  /** INT-2026-018 (review F11): `${step}|${sitzung.id}` of the last preselection — every broadcast brings new row objects. */
  private vorbelegtFuer: string | null = null;

  static override styles = css`
    :host {
      display: block;
      font-family: var(--font-family);
      font-size: var(--font-size-sm);
    }
    .kasten {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      flex-wrap: wrap;
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-secondary);
    }
    .text {
      flex: 1 1 260px;
      min-width: 0;
    }
    .text code {
      font-family: var(--font-family-mono);
      color: var(--color-accent-primary);
    }
    .wahl {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      flex-wrap: wrap;
      margin-left: auto;
    }
    select {
      font: inherit;
      font-size: var(--font-size-sm);
      padding: 6px 28px 6px 10px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
      max-width: 220px;
    }
    button.start {
      font: inherit;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      padding: 7px 14px;
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
      width: 100%;
      color: var(--color-accent-error);
      font-size: var(--font-size-xs);
    }
    .sperre {
      width: 100%;
      color: var(--color-text-muted);
      font-size: var(--font-size-xs);
    }
    :host([gesperrt]) .kasten {
      opacity: 0.8;
    }
    :host([mobile]) .wahl {
      margin-left: 0;
      width: 100%;
    }
    :host([mobile]) .wahl > * {
      flex: 1 1 100%;
    }
    :host([mobile]) select {
      max-width: none;
      width: 100%;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    void this.loadModels();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('projectPath') && this.projectPath) void this.loadTargets();
    // INT-2026-018: preselect once per (step, session) — not on every broadcast (F11); without a session as before (FA-40).
    const key = `${this.step}|${this.sitzung?.id ?? ''}`;
    const neu = changed.has('sitzung') || changed.has('step') ? key !== this.vorbelegtFuer : false;
    if (neu && this.sitzung && this.sitzung.target.kind === 'existing-worktree') void this.ensureTargetOption(this.sitzung.target.path);
    if ((neu || (changed.has('lastModel') && !this.sitzung)) && this.models) this.preselect();
  }

  private async loadModels(): Promise<void> {
    try {
      this.models = await ladeModelle();
      this.preselect();
    } catch (err) {
      this.error = (err as Error).message;
    }
  }

  private async loadTargets(): Promise<void> {
    try {
      const t = await vorhabenService.targets(this.projectPath);
      this.isGitRepo = t.isGitRepo;
      this.worktrees = t.worktrees.filter((w) => !w.missing);
      this.worktreeCreationEnabled = t.worktreeCreationEnabled;
    } catch {
      this.isGitRepo = false;
      this.worktrees = [];
    }
  }

  /** E3: the session's worktree must be selectable — reload the list, and add the path as an option when it is still missing. */
  private async ensureTargetOption(path: string): Promise<void> {
    if (this.worktrees.some((w) => w.path === path)) return;
    await this.loadTargets();
    this.extraWorktree = this.worktrees.some((w) => w.path === path) ? null : path;
  }

  /**
   * FA-40: last model of (Vorhaben, step) → step default → general default
   * (`model-wahl.ts`). INT-2026-018 (O1): with a live session its model and
   * target come first, so the plain click is „/clear, dann Befehl".
   */
  private preselect(): void {
    if (!this.models) return;
    this.vorbelegtFuer = `${this.step}|${this.sitzung?.id ?? ''}`;
    if (this.sitzung) {
      this.selected = modellVorhanden(this.models, this.sitzung.model) ? this.sitzung.model : vorauswahl(this.models, this.step, this.lastModel);
      this.target = this.sitzung.target.kind === 'existing-worktree' ? this.sitzung.target.path : 'main';
      return;
    }
    this.selected = vorauswahl(this.models, this.step, this.lastModel);
  }

  /** AK-07: the selection equals the live session (provider, model, target) → the click continues in it. */
  private gleich(): boolean {
    const s = this.sitzung;
    if (!s || !this.selected) return false;
    if (s.model.providerId !== this.selected.providerId || s.model.modelId !== this.selected.modelId) return false;
    const sessionTarget = s.target.kind === 'existing-worktree' ? s.target.path : s.target.kind === 'main' ? 'main' : 'new';
    return sessionTarget === this.target;
  }

  private onModel(e: CustomEvent<{ providerId: string; modelId: string }>): void {
    e.stopPropagation();
    this.selected = { providerId: e.detail.providerId, modelId: e.detail.modelId };
  }

  private sessionTarget(): CloudTerminalSessionTarget {
    if (this.target === 'main') return { kind: 'main' };
    if (this.target === 'new') return { kind: 'new-worktree' };
    return { kind: 'existing-worktree', path: this.target };
  }

  private async start(): Promise<void> {
    if (!this.selected || this.starting || this.gesperrt) return;
    this.starting = true;
    this.error = '';
    try {
      const { sessionId, modus, geschlossen } = await vorhabenService.startStep(this.projectId, this.intentId || undefined, this.step, this.selected, this.sessionTarget());
      this.dispatchEvent(
        new CustomEvent<{ sessionId: string; step: VorhabenStep; intentId?: string; modus: 'neu' | 'in_sitzung'; geschlossen?: string }>('vorhaben-session-started', {
          bubbles: true,
          composed: true,
          detail: { sessionId, step: this.step, ...(this.intentId ? { intentId: this.intentId } : {}), modus, ...(geschlossen ? { geschlossen } : {}) },
        })
      );
    } catch (err) {
      this.error = (err as Error).message || 'Sitzung konnte nicht gestartet werden';
    } finally {
      this.starting = false;
    }
  }

  private modelLabel(): string {
    if (!this.models) return '';
    return istSchrittStandard(this.models, this.step, this.selected, this.lastModel) ? ` (Standard ${STEP_TEXT[this.step].split(' ')[0]})` : '';
  }

  /** AK-07: what the click will do — continue in the live session, or start a new one and close it; without a session today's sentence. */
  private ankuendigung(command: string) {
    const s = this.sitzung;
    if (s && this.gleich()) return html`startet in der laufenden Sitzung ‚${s.name}': <code>/clear</code>, dann <code>${command}</code>`;
    if (s) return html`startet eine neue Sitzung mit <code>${command}</code>${this.modelLabel()} — die laufende ‚${s.name}' wird geschlossen`;
    return html`startet eine Sitzung mit <code>${command}</code>${this.modelLabel()}`;
  }

  override render() {
    const label = this.label || STEP_TEXT[this.step];
    const command = this.command || stepCommand(this.step, this.intentId || undefined);
    const sperreText = this.sperre ? NEXT_STEP_SPERRE_TEXT[this.sperre] : SPERRE_FALLBACK;
    const extra = this.extraWorktree && !this.worktrees.some((w) => w.path === this.extraWorktree) ? this.extraWorktree : null;
    return html`<div class="kasten">
      <span class="text">
        ${this.compact ? nothing : html`<strong>Nächster Schritt:</strong> ${label} — `}${this.ankuendigung(command)}
      </span>
      <div class="wahl">
        ${this.models
          ? html`<aos-model-selector
              .externalProviders=${this.models.providers}
              .externalSelectedModelId=${this.selected?.modelId ?? ''}
              .externalSelectedProviderId=${this.selected?.providerId ?? ''}
              @model-changed=${this.onModel}
            ></aos-model-selector>`
          : html`<span>Modelle …</span>`}
        <select aria-label="Arbeitskopie" @change=${(e: Event) => (this.target = (e.target as HTMLSelectElement).value)}>
          <option value="main" ?selected=${this.target === 'main'}>Im Projekt</option>
          ${this.worktrees.filter((w) => !w.isProjectRoot).map((w) => html`<option value=${w.path} ?selected=${this.target === w.path}>Worktree ${w.branch ?? w.name}</option>`)}
          ${extra ? html`<option value=${extra} ?selected=${this.target === extra}>Worktree ${extra.split('/').pop()}</option>` : nothing}
          ${this.isGitRepo && this.worktreeCreationEnabled ? html`<option value="new" ?selected=${this.target === 'new'}>Neuer Worktree</option>` : nothing}
        </select>
        <button type="button" class="start" ?disabled=${!this.selected || this.starting || this.gesperrt} title=${this.gesperrt ? sperreText : ''} @click=${this.start}>${this.starting ? 'Startet …' : label}</button>
      </div>
      ${this.gesperrt ? html`<div class="sperre">${sperreText}.</div>` : nothing}
      ${this.error ? html`<div class="fehler">${this.error}</div>` : nothing}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-naechster-schritt': AosNaechsterSchritt;
  }
}
