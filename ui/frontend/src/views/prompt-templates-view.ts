import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { gateway, type WebSocketMessage } from '../gateway.js';
import type { PromptTemplate } from '../../../src/shared/types/prompt-templates.protocol.js';

/**
 * Prompt Templates maintenance page.
 *
 * Lets the user create, edit and delete reusable prompt templates that can then
 * be inserted into the cloud terminal via the template picker button. Templates
 * are global (shared across all projects). Uses light DOM + global theme classes
 * to match the other views (settings-view, etc.).
 */
@customElement('aos-prompt-templates-view')
export class AosPromptTemplatesView extends LitElement {
  @state() private templates: PromptTemplate[] = [];
  @state() private loading = true;
  @state() private saving = false;
  @state() private error = '';

  /** Id of the template currently being edited, or null when creating a new one. */
  @state() private editingId: string | null = null;
  @state() private formName = '';
  @state() private formContent = '';

  private boundHandlers: Map<string, (msg: WebSocketMessage) => void> = new Map();

  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.setupHandlers();
    gateway.send({ type: 'prompt-templates:list.get' });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeHandlers();
  }

  private setupHandlers(): void {
    const handlers: [string, (msg: WebSocketMessage) => void][] = [
      ['prompt-templates:list', (msg) => this.onListReceived(msg)],
      ['prompt-templates:error', (msg) => this.onError(msg)],
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

  private onListReceived(msg: WebSocketMessage): void {
    this.templates = (msg.templates as PromptTemplate[]) ?? [];
    this.loading = false;
    this.saving = false;
    this.error = '';
    // If we were editing a template that no longer exists, reset the form.
    if (this.editingId && !this.templates.some((t) => t.id === this.editingId)) {
      this.resetForm();
    } else if (!this.editingId) {
      this.resetForm();
    }
  }

  private onError(msg: WebSocketMessage): void {
    this.error = (msg.error as string) || 'An error occurred';
    this.saving = false;
  }

  private resetForm(): void {
    this.editingId = null;
    this.formName = '';
    this.formContent = '';
  }

  private startEdit(template: PromptTemplate): void {
    this.editingId = template.id;
    this.formName = template.name;
    this.formContent = template.content;
    this.error = '';
  }

  private handleSave(): void {
    const name = this.formName.trim();
    const content = this.formContent.trim();
    if (!name) {
      this.error = 'Template name cannot be empty';
      return;
    }
    if (!content) {
      this.error = 'Template content cannot be empty';
      return;
    }
    this.error = '';
    this.saving = true;
    const message: WebSocketMessage = {
      type: 'prompt-templates:save',
      name,
      content,
    };
    if (this.editingId) {
      message.id = this.editingId;
    }
    gateway.send(message);
  }

  private handleDelete(template: PromptTemplate): void {
    if (!confirm(`Delete template "${template.name}"?`)) {
      return;
    }
    this.error = '';
    gateway.send({ type: 'prompt-templates:delete', id: template.id });
  }

  override render() {
    if (this.loading) {
      return html`
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading prompt templates...</p>
        </div>
      `;
    }

    const isEditing = this.editingId !== null;
    const canSave = !this.saving && this.formName.trim() && this.formContent.trim();

    return html`
      <div style="display: flex; flex-direction: column; gap: var(--spacing-lg); max-width: 900px;">
        <div class="section-header">
          <h3>Prompt Templates</h3>
          <p class="section-description">
            Reusable prompts you can insert directly into the cloud terminal via the
            templates button (next to copy &amp; paste).
          </p>
        </div>

        <div class="provider-card">
          <h4 style="margin: 0 0 var(--spacing-md) 0">
            ${isEditing ? 'Edit Template' : 'New Template'}
          </h4>
          <div class="form-field">
            <label for="tpl-name">Name</label>
            <input
              id="tpl-name"
              type="text"
              maxlength="100"
              placeholder="e.g. Run tests"
              .value=${this.formName}
              @input=${(e: Event) => { this.formName = (e.target as HTMLInputElement).value; }}
              ?disabled=${this.saving}
            />
          </div>
          <div class="form-field" style="margin-top: var(--spacing-md)">
            <label for="tpl-content">Prompt</label>
            <textarea
              id="tpl-content"
              rows="6"
              placeholder="The prompt text that gets inserted into the terminal..."
              .value=${this.formContent}
              @input=${(e: Event) => { this.formContent = (e.target as HTMLTextAreaElement).value; }}
              ?disabled=${this.saving}
              style="width: 100%; font-family: monospace; font-size: 0.875rem; padding: var(--spacing-sm); border: 1px solid var(--color-border, #e2e8f0); border-radius: var(--radius-md, 4px); background: var(--input-bg, var(--color-bg-primary)); color: var(--color-text-primary); resize: vertical; box-sizing: border-box;"
            ></textarea>
          </div>
          ${this.error ? html`<span class="form-error" style="color: var(--color-error, #ef4444); display: block; margin-top: var(--spacing-sm);">${this.error}</span>` : ''}
          <div class="form-actions" style="margin-top: var(--spacing-md); display: flex; gap: var(--spacing-sm);">
            <button class="save-btn" @click=${() => this.handleSave()} ?disabled=${!canSave}>
              ${this.saving ? 'Saving...' : isEditing ? 'Update Template' : 'Add Template'}
            </button>
            ${isEditing
              ? html`<button
                  class="save-btn"
                  style="background: var(--color-bg-tertiary); color: var(--color-text-primary);"
                  @click=${() => this.resetForm()}
                  ?disabled=${this.saving}
                >Cancel</button>`
              : ''}
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
          ${this.templates.length === 0
            ? html`<p class="section-description">No templates yet. Create your first one above.</p>`
            : this.templates.map(
                (t) => html`
                  <div class="provider-card" style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--spacing-md);">
                    <div style="min-width: 0; flex: 1;">
                      <div style="font-weight: var(--font-weight-semibold, 600); color: var(--color-text-primary); margin-bottom: var(--spacing-xs);">${t.name}</div>
                      <div style="color: var(--color-text-secondary); font-size: 0.8125rem; font-family: monospace; white-space: pre-wrap; word-break: break-word; max-height: 4.5em; overflow: hidden;">${t.content}</div>
                    </div>
                    <div style="display: flex; gap: var(--spacing-xs); flex-shrink: 0;">
                      <button
                        class="save-btn"
                        style="background: var(--color-bg-tertiary); color: var(--color-text-primary); padding: var(--spacing-xs) var(--spacing-sm);"
                        @click=${() => this.startEdit(t)}
                      >Edit</button>
                      <button
                        class="save-btn"
                        style="background: var(--color-error, #ef4444); color: #fff; padding: var(--spacing-xs) var(--spacing-sm);"
                        @click=${() => this.handleDelete(t)}
                      >Delete</button>
                    </div>
                  </div>
                `
              )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-prompt-templates-view': AosPromptTemplatesView;
  }
}
