import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { SpecInfo } from './spec-card.js';

export interface SaveDependenciesDetail {
  specId: string;
  blockedBy: string[];
  prerequisiteFor: string[];
}

function isDone(s: SpecInfo): boolean {
  return s.storyCount > 0 && s.completedCount >= s.storyCount;
}

@customElement('aos-spec-dependency-editor')
export class AosSpecDependencyEditor extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ type: String }) specId = '';
  @property({ type: String }) specName = '';
  @property({ type: Array }) allSpecs: SpecInfo[] = [];

  @state() private localBlockedBy: string[] = [];
  @state() private localPrerequisiteFor: string[] = [];

  override updated(changed: Map<string, unknown>) {
    if (changed.has('open') && this.open) {
      this._init();
    }
  }

  private _init(): void {
    const me = this.allSpecs.find(s => s.id === this.specId);
    this.localBlockedBy = [...(me?.blockedBy ?? [])];
    this.localPrerequisiteFor = this.allSpecs
      .filter(s => s.id !== this.specId && (s.blockedBy ?? []).includes(this.specId))
      .map(s => s.id);
  }

  private _activeOtherSpecs(): SpecInfo[] {
    return this.allSpecs.filter(s => s.id !== this.specId && !isDone(s));
  }

  private _specName(id: string): string {
    return this.allSpecs.find(s => s.id === id)?.name ?? id;
  }

  private _removeBlocked(id: string): void {
    this.localBlockedBy = this.localBlockedBy.filter(b => b !== id);
  }

  private _addBlocked(e: Event): void {
    const sel = e.target as HTMLSelectElement;
    const val = sel.value;
    if (!val) return;
    sel.value = '';
    if (!this.localBlockedBy.includes(val)) {
      this.localBlockedBy = [...this.localBlockedBy, val];
    }
  }

  private _removePrereq(id: string): void {
    this.localPrerequisiteFor = this.localPrerequisiteFor.filter(p => p !== id);
  }

  private _addPrereq(e: Event): void {
    const sel = e.target as HTMLSelectElement;
    const val = sel.value;
    if (!val) return;
    sel.value = '';
    if (!this.localPrerequisiteFor.includes(val)) {
      this.localPrerequisiteFor = [...this.localPrerequisiteFor, val];
    }
  }

  private _save(): void {
    this.dispatchEvent(new CustomEvent<SaveDependenciesDetail>('save-dependencies', {
      detail: {
        specId: this.specId,
        blockedBy: [...this.localBlockedBy],
        prerequisiteFor: [...this.localPrerequisiteFor],
      },
      bubbles: true,
      composed: true,
    }));
  }

  private _close(): void {
    this.dispatchEvent(new CustomEvent('dep-editor-close', {
      bubbles: true,
      composed: true,
    }));
  }

  override render() {
    if (!this.open) return html``;
    const active = this._activeOtherSpecs();
    const blockedByPickable = active.filter(s => !this.localBlockedBy.includes(s.id));
    const prereqPickable = active.filter(s => !this.localPrerequisiteFor.includes(s.id));

    return html`
      <div class="dep-editor-overlay" @click=${this._close}>
        <div
          class="dep-editor"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dep-editor-title"
          @click=${(e: Event) => e.stopPropagation()}
        >
          <div class="dep-editor__header">
            <span id="dep-editor-title" class="dep-editor__title">Abhängigkeiten: ${this.specName}</span>
            <button class="dep-editor__close" @click=${this._close} aria-label="Schließen">✕</button>
          </div>

          <div class="dep-editor__body">
            <div class="dep-editor__section">
              <div class="dep-editor__section-label">
                <span>🔒</span> Blockiert durch
              </div>
              <p class="dep-editor__section-hint">Diese Specs müssen abgeschlossen sein, bevor dieses Spec gestartet werden kann.</p>
              <div class="dep-editor__chips">
                ${this.localBlockedBy.length === 0
                  ? html`<span class="dep-editor__empty">Keine Blocker gesetzt</span>`
                  : this.localBlockedBy.map(id => html`
                      <span class="dep-chip dep-chip--blocker">
                        ${this._specName(id)}
                        <button class="dep-chip__remove" @click=${() => this._removeBlocked(id)} aria-label="Entfernen">×</button>
                      </span>
                    `)
                }
              </div>
              ${blockedByPickable.length > 0 ? html`
                <select class="dep-editor__add-select" @change=${this._addBlocked} aria-label="Blockierendes Spec hinzufügen">
                  <option value="">+ Spec hinzufügen…</option>
                  ${blockedByPickable.map(s => html`<option value="${s.id}">${s.name}</option>`)}
                </select>
              ` : ''}
            </div>

            <div class="dep-editor__section">
              <div class="dep-editor__section-label">
                <span>🟢</span> Ist Voraussetzung für
              </div>
              <p class="dep-editor__section-hint">Dieses Spec muss abgeschlossen sein, bevor diese Specs gestartet werden können.</p>
              <div class="dep-editor__chips">
                ${this.localPrerequisiteFor.length === 0
                  ? html`<span class="dep-editor__empty">Keine abhängigen Specs</span>`
                  : this.localPrerequisiteFor.map(id => html`
                      <span class="dep-chip dep-chip--dependent">
                        ${this._specName(id)}
                        <button class="dep-chip__remove" @click=${() => this._removePrereq(id)} aria-label="Entfernen">×</button>
                      </span>
                    `)
                }
              </div>
              ${prereqPickable.length > 0 ? html`
                <select class="dep-editor__add-select" @change=${this._addPrereq} aria-label="Abhängiges Spec hinzufügen">
                  <option value="">+ Spec hinzufügen…</option>
                  ${prereqPickable.map(s => html`<option value="${s.id}">${s.name}</option>`)}
                </select>
              ` : ''}
            </div>
          </div>

          <div class="dep-editor__footer">
            <button class="dep-editor__btn dep-editor__btn--cancel" @click=${this._close}>Abbrechen</button>
            <button class="dep-editor__btn dep-editor__btn--save" @click=${this._save}>Speichern</button>
          </div>
        </div>
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-spec-dependency-editor': AosSpecDependencyEditor;
  }
}
