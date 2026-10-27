import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { gateway, type WebSocketMessage } from '../../gateway.js';

@customElement('aos-review-prompt-editor')
export class AosReviewPromptEditor extends LitElement {
  @state() private prompt = '';
  @state() private savedPrompt = '';
  /** INT-2026-037 (FA-09, FA-14): intent prompt, stand-in row (one `provider/model` per line), auto switch. */
  @state() private intentPrompt = '';
  @state() private ersatz = '';
  @state() private intentAuto = true;
  private saved = { intentPrompt: '', ersatz: '', intentAuto: true };
  @state() private saving = false;
  @state() private loading = true;
  @state() private error = '';

  private boundHandlers: Map<string, (msg: WebSocketMessage) => void> = new Map();

  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.setupHandlers();
    gateway.send({ type: 'plan-review:prompt.get' });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeHandlers();
  }

  private setupHandlers(): void {
    const handlers: [string, (msg: WebSocketMessage) => void][] = [
      ['plan-review:prompt', (msg) => this.onPromptReceived(msg)],
      ['plan-review:error', (msg) => this.onError(msg)],
    ];
    for (const [type, handler] of handlers) {
      this.boundHandlers.set(type, handler);
      gateway.on(type, handler);
    }
  }

  private removeHandlers(): void {
    for (const [type, handler] of this.boundHandlers) {
      gateway.off(type, handler);
    }
    this.boundHandlers.clear();
  }

  private onPromptReceived(msg: WebSocketMessage): void {
    const received = (msg.prompt as string) ?? '';
    this.prompt = received;
    this.savedPrompt = received;
    this.intentPrompt = (msg.intentPrompt as string | undefined) ?? '';
    this.ersatz = ((msg.ersatz as string[] | undefined) ?? []).join('\n');
    this.intentAuto = msg.intentAuto !== false;
    this.saved = { intentPrompt: this.intentPrompt, ersatz: this.ersatz, intentAuto: this.intentAuto };
    this.loading = false;
    this.saving = false;
    this.error = '';
  }

  private onError(msg: WebSocketMessage): void {
    this.error = (msg.error as string) || 'An error occurred';
    this.saving = false;
  }

  private handleSave(): void {
    const trimmed = this.prompt.trim();
    const intentTrimmed = this.intentPrompt.trim();
    if (!trimmed || !intentTrimmed) {
      this.error = 'Review prompt cannot be empty';
      return;
    }
    this.error = '';
    this.saving = true;
    gateway.send({
      type: 'plan-review:prompt.update',
      prompt: trimmed,
      intentPrompt: intentTrimmed,
      ersatz: this.ersatz.split('\n').map((l) => l.trim()).filter((l) => l !== ''),
      intentAuto: this.intentAuto,
    });
  }

  override render() {
    if (this.loading) {
      return html`
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading review prompt...</p>
        </div>
      `;
    }

    const isDirty =
      this.prompt !== this.savedPrompt ||
      this.intentPrompt !== this.saved.intentPrompt ||
      this.ersatz !== this.saved.ersatz ||
      this.intentAuto !== this.saved.intentAuto;
    const feld = 'width: 100%; font-family: monospace; font-size: 0.875rem; padding: var(--spacing-sm); border: 1px solid var(--border-color, #e2e8f0); border-radius: var(--border-radius, 4px); background: var(--input-bg, var(--bg-secondary)); color: var(--text-primary); resize: vertical; box-sizing: border-box;';

    return html`
      <div class="provider-card">
        <h4 style="margin: 0 0 var(--spacing-md) 0">Plan Review Prompt</h4>
        <div class="form-field">
          <label for="review-prompt-textarea">Default prompt sent to all external reviewers when a plan is detected.</label>
          <textarea
            id="review-prompt-textarea"
            rows="8"
            .value=${this.prompt}
            @input=${(e: Event) => { this.prompt = (e.target as HTMLTextAreaElement).value; }}
            ?disabled=${this.saving}
            style=${feld}
          ></textarea>
        </div>
        <h4 style="margin: var(--spacing-md) 0">Absicht-Review</h4>
        <div class="form-field">
          <label for="intent-review-prompt-textarea">Auftrag an die Prüfer, wenn eine Absicht (intent.md) geprüft wird.</label>
          <textarea
            id="intent-review-prompt-textarea"
            rows="8"
            .value=${this.intentPrompt}
            @input=${(e: Event) => { this.intentPrompt = (e.target as HTMLTextAreaElement).value; }}
            ?disabled=${this.saving}
            style=${feld}
          ></textarea>
        </div>
        <div class="form-field">
          <label>
            <input
              type="checkbox"
              .checked=${this.intentAuto}
              @change=${(e: Event) => { this.intentAuto = (e.target as HTMLInputElement).checked; }}
              ?disabled=${this.saving}
            />
            Absicht automatisch prüfen (einmal je Absicht, sobald die Sitzung nach dem Entwurf hält)
          </label>
        </div>
        <div class="form-field">
          <label for="review-ersatz-textarea">Ersatzreihe (eine Zeile je <code>provider/model</code>, Reihenfolge zählt)</label>
          <textarea
            id="review-ersatz-textarea"
            rows="3"
            .value=${this.ersatz}
            @input=${(e: Event) => { this.ersatz = (e.target as HTMLTextAreaElement).value; }}
            ?disabled=${this.saving}
            style=${feld}
          ></textarea>
          ${this.error ? html`<span class="form-error">${this.error}</span>` : ''}
        </div>
        <div class="form-actions" style="margin-top: var(--spacing-md)">
          <button
            class="save-btn"
            @click=${() => this.handleSave()}
            ?disabled=${this.saving || !isDirty || !this.prompt.trim() || !this.intentPrompt.trim()}
          >
            ${this.saving ? 'Saving...' : 'Save Prompt'}
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-review-prompt-editor': AosReviewPromptEditor;
  }
}
