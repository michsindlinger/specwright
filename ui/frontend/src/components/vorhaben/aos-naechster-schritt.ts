/**
 * aos-naechster-schritt — "Nächster Schritt: Plan erstellen — startet eine
 * Sitzung mit /plan INT-…" with the model choice (pre-set to the last model
 * of this Vorhaben and step, else the step default, FA-40) and the target
 * (project or an existing worktree, new worktree — the picker's data,
 * V-14) and the start button (FA-35, mock 03b). Also used on the project page
 * for a new Vorhaben (`/intent`).
 */

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { vorhabenService, type ModelListInfo } from '../../services/vorhaben.service.js';
import type { ModelSelection, VorhabenStep } from '../../../../src/shared/types/vorhaben.protocol.js';
import type { CloudTerminalSessionTarget, CloudTerminalWorktreeEntry } from '../../../../src/shared/types/cloud-terminal.protocol.js';
import '../model-selector.js';

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

  @state() private models: ModelListInfo | null = null;
  @state() private selected: ModelSelection | null = null;
  @state() private worktrees: CloudTerminalWorktreeEntry[] = [];
  @state() private worktreeCreationEnabled = true;
  @state() private isGitRepo = false;
  @state() private target = 'main';
  @state() private starting = false;
  @state() private error = '';

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
    if ((changed.has('lastModel') || changed.has('step')) && this.models) this.preselect();
  }

  private async loadModels(): Promise<void> {
    try {
      this.models = await vorhabenService.modelList();
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

  /** FA-40: last model of (Vorhaben, step) → step default → general default. */
  private preselect(): void {
    if (!this.models) return;
    const has = (sel: ModelSelection | undefined): sel is ModelSelection =>
      !!sel && this.models!.providers.some((p) => p.id === sel.providerId && p.models.some((m) => m.id === sel.modelId));
    const stepDefault = this.models.stepDefaults?.[this.step];
    this.selected = has(this.lastModel) ? this.lastModel : has(stepDefault) ? stepDefault : this.models.defaultSelection;
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
    if (!this.selected || this.starting) return;
    this.starting = true;
    this.error = '';
    try {
      const { sessionId } = await vorhabenService.startStep(this.projectId, this.intentId || undefined, this.step, this.selected, this.sessionTarget());
      this.dispatchEvent(
        new CustomEvent<{ sessionId: string; step: VorhabenStep; intentId?: string }>('vorhaben-session-started', {
          bubbles: true,
          composed: true,
          detail: { sessionId, step: this.step, ...(this.intentId ? { intentId: this.intentId } : {}) },
        })
      );
    } catch (err) {
      this.error = (err as Error).message || 'Sitzung konnte nicht gestartet werden';
    } finally {
      this.starting = false;
    }
  }

  private modelLabel(): string {
    const sel = this.selected;
    if (!sel || !this.models) return '';
    const stepDefault = this.models.stepDefaults?.[this.step];
    const isStepDefault = !!stepDefault && stepDefault.providerId === sel.providerId && stepDefault.modelId === sel.modelId && !this.lastModel;
    return isStepDefault ? ` (Standard ${STEP_TEXT[this.step].split(' ')[0]})` : '';
  }

  override render() {
    const label = this.label || STEP_TEXT[this.step];
    const command = this.command || (this.step === 'intent' ? '/intent' : `/${this.step} ${this.intentId}`);
    return html`<div class="kasten">
      <span class="text">
        ${this.compact ? nothing : html`<strong>Nächster Schritt:</strong> ${label} — `}startet eine Sitzung mit <code>${command}</code>${this.modelLabel()}
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
          ${this.isGitRepo && this.worktreeCreationEnabled ? html`<option value="new" ?selected=${this.target === 'new'}>Neuer Worktree</option>` : nothing}
        </select>
        <button type="button" class="start" ?disabled=${!this.selected || this.starting} @click=${this.start}>${this.starting ? 'Startet …' : label}</button>
      </div>
      ${this.error ? html`<div class="fehler">${this.error}</div>` : nothing}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-naechster-schritt': AosNaechsterSchritt;
  }
}
