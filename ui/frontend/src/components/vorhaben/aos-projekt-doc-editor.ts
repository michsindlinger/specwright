/**
 * aos-projekt-doc-editor — one project doc (mock 07): "Bearbeiten | Vorschau",
 * raw text field, "Speichern" as the only primary action, "gespeichert HH:MM ·
 * nicht committet" (FA-45), conflict banner with both stands (FA-46), draft
 * kept on the backend across devices (FA-47).
 */

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ProjectDocDraft, ProjectDocEntry } from '../../../../src/shared/types/vorhaben.protocol.js';
import { vorhabenService } from '../../services/vorhaben.service.js';
import { formatClock, formatStand } from './vorhaben-sort.js';
import '../aos-confirm-dialog.js';
import './aos-dokument-leser.js';

type Mode = 'bearbeiten' | 'vorschau';

@customElement('aos-projekt-doc-editor')
export class AosProjektDocEditor extends LitElement {
  @property({ type: String }) projectId = '';
  @property({ attribute: false }) entry!: ProjectDocEntry;
  @property({ attribute: false }) draft: ProjectDocDraft | undefined = undefined;
  @property({ type: Boolean }) mobile = false;

  @state() private mode: Mode = 'bearbeiten';
  @state() private text = '';
  @state() private openedMtime: number | null = null;
  @state() private loading = false;
  @state() private saving = false;
  @state() private error = '';
  @state() private savedAt: number | null = null;
  @state() private conflict: { currentMtime: number } | null = null;
  @state() private dirty = false;
  @state() private confirmOverwrite = false;

  private draftTimer: ReturnType<typeof setTimeout> | null = null;
  private loadToken = 0;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-secondary);
    }
    .kopf {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      flex-wrap: wrap;
      padding: var(--spacing-sm) var(--spacing-md);
      border-bottom: 1px solid var(--color-border);
    }
    .pfad {
      font-family: var(--font-family-mono);
      font-weight: var(--font-weight-semibold);
    }
    .stand {
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
      font-family: var(--font-family-mono);
    }
    .umschalter {
      margin-left: auto;
      display: inline-flex;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .umschalter button {
      background: none;
      border: none;
      padding: 4px 12px;
      font: inherit;
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      cursor: pointer;
    }
    .umschalter button.aktiv {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }
    .konflikt {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      flex-wrap: wrap;
      margin: var(--spacing-sm) var(--spacing-md) 0;
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--color-accent-warning);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
    }
    .konflikt .aktionen {
      margin-left: auto;
      display: flex;
      gap: var(--spacing-xs);
    }
    .fehler {
      margin: var(--spacing-sm) var(--spacing-md) 0;
      color: var(--color-accent-error);
      font-size: var(--font-size-sm);
    }
    textarea {
      flex: 1;
      min-height: 360px;
      margin: var(--spacing-sm) var(--spacing-md);
      padding: var(--spacing-sm);
      font-family: var(--font-family-mono);
      font-size: var(--font-size-sm);
      line-height: 1.5;
      color: var(--color-text-primary);
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      resize: vertical;
      tab-size: 4;
    }
    .vorschau {
      padding: var(--spacing-sm) var(--spacing-md);
      overflow: auto;
    }
    .fuss {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-sm) var(--spacing-md);
      border-top: 1px solid var(--color-border);
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
    .fuss .rechts {
      margin-left: auto;
      display: flex;
      gap: var(--spacing-sm);
      align-items: center;
    }
    .btn {
      padding: 6px 14px;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      font: inherit;
      font-size: var(--font-size-sm);
      cursor: pointer;
    }
    .btn.primaer {
      background: var(--color-accent-primary);
      border-color: var(--color-accent-primary);
      color: var(--color-text-inverse, #fff);
      font-weight: var(--font-weight-semibold);
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .btn.leise {
      border: none;
      background: none;
      color: var(--color-text-secondary);
    }
    .fehlt {
      padding: var(--spacing-lg);
      color: var(--color-text-secondary);
    }
  `;

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('projectId') || changed.has('entry')) {
      const prev = changed.get('entry') as ProjectDocEntry | undefined;
      if (!prev || prev.key !== this.entry?.key || changed.has('projectId')) void this.open();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.draftTimer) {
      clearTimeout(this.draftTimer);
      this.flushDraft();
    }
  }

  private async open(): Promise<void> {
    const token = ++this.loadToken;
    this.error = '';
    this.conflict = null;
    this.savedAt = null;
    this.dirty = false;
    this.mode = 'bearbeiten';
    if (!this.entry?.exists) {
      this.text = '';
      this.openedMtime = null;
      return;
    }
    this.loading = true;
    try {
      const { content, mtimeMs } = await vorhabenService.readProjectDoc(this.projectId, this.entry.key);
      if (token !== this.loadToken) return;
      if (this.draft && this.draft.text !== content) {
        // FA-47: the unsaved draft wins; its base stand decides the conflict check.
        this.text = this.draft.text;
        this.openedMtime = this.draft.openedMtime;
        this.dirty = true;
        if (Math.abs(this.draft.openedMtime - mtimeMs) >= 1) this.conflict = { currentMtime: mtimeMs };
      } else {
        this.text = content;
        this.openedMtime = mtimeMs;
        if (this.draft) vorhabenService.clearProjectDocDraft(this.projectId, this.entry.key);
      }
    } catch (err) {
      if (token === this.loadToken) this.error = (err as Error).message;
    } finally {
      if (token === this.loadToken) this.loading = false;
    }
  }

  private onInput(e: Event): void {
    this.text = (e.target as HTMLTextAreaElement).value;
    this.dirty = true;
    if (this.draftTimer) clearTimeout(this.draftTimer);
    this.draftTimer = setTimeout(() => this.flushDraft(), 600);
  }

  private flushDraft(): void {
    this.draftTimer = null;
    if (!this.dirty || this.openedMtime === null) return;
    vorhabenService.setProjectDocDraft(this.projectId, this.entry.key, this.text, this.openedMtime);
  }

  private async save(force = false): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    this.error = '';
    try {
      const res = await vorhabenService.writeProjectDoc(this.projectId, this.entry.key, this.text, this.openedMtime, force);
      if (res.ok) {
        this.openedMtime = res.mtimeMs;
        this.savedAt = Date.parse(res.savedAt) || Date.now();
        this.conflict = null;
        this.dirty = false;
        if (this.draftTimer) clearTimeout(this.draftTimer);
        this.draftTimer = null;
        this.dispatchEvent(new CustomEvent('doc-saved', { bubbles: true, composed: true, detail: { key: this.entry.key } }));
      } else {
        this.conflict = { currentMtime: res.currentMtime };
      }
    } catch (err) {
      this.error = (err as Error).message;
    } finally {
      this.saving = false;
    }
  }

  /** Conflict: take the disk stand as the new base; the own text stays in the field (FA-46). */
  private async reloadBase(): Promise<void> {
    try {
      const { mtimeMs } = await vorhabenService.readProjectDoc(this.projectId, this.entry.key);
      this.openedMtime = mtimeMs;
      this.conflict = null;
      this.flushDraft();
    } catch (err) {
      this.error = (err as Error).message;
    }
  }

  private async discard(): Promise<void> {
    vorhabenService.clearProjectDocDraft(this.projectId, this.entry.key);
    this.draft = undefined;
    this.dirty = false;
    await this.open();
  }

  override render() {
    const e = this.entry;
    if (!e) return nothing;
    if (!e.exists) {
      return html`<div class="kopf"><span class="pfad">${e.relPath}</span><span class="stand">fehlt</span></div>
        <div class="fehlt">Diese Datei gibt es im Projekt noch nicht. Sie entsteht über die Vorlage im Flow (<code>/intent</code> bzw. Projekt-Setup) — die UI legt keine Docs an.</div>`;
    }
    return html`
      <div class="kopf">
        <span class="pfad">${e.relPath}</span>
        ${this.openedMtime ? html`<span class="stand">Stand ${formatStand(this.openedMtime)}</span>` : nothing}
        <div class="umschalter" role="tablist">
          <button type="button" role="tab" class=${this.mode === 'bearbeiten' ? 'aktiv' : ''} aria-selected=${this.mode === 'bearbeiten'} @click=${() => (this.mode = 'bearbeiten')}>Bearbeiten</button>
          <button type="button" role="tab" class=${this.mode === 'vorschau' ? 'aktiv' : ''} aria-selected=${this.mode === 'vorschau'} @click=${() => (this.mode = 'vorschau')}>Vorschau</button>
        </div>
      </div>
      ${this.conflict
        ? html`<div class="konflikt" role="alert">
            <span>Datei auf der Platte geändert um <strong>${formatStand(this.conflict.currentMtime)}</strong> — du bearbeitest den Stand ${this.openedMtime ? formatStand(this.openedMtime) : '?'}.</span>
            <span class="aktionen">
              <button type="button" class="btn" @click=${() => this.reloadBase()}>Neu laden</button>
              <button type="button" class="btn leise" @click=${() => (this.confirmOverwrite = true)}>Trotzdem überschreiben</button>
            </span>
          </div>`
        : nothing}
      ${this.error ? html`<div class="fehler">${this.error}</div>` : nothing}
      ${this.mode === 'bearbeiten'
        ? html`<textarea .value=${this.text} spellcheck="false" ?disabled=${this.loading} @input=${this.onInput} aria-label="Rohtext ${e.relPath}"></textarea>`
        : html`<div class="vorschau"><aos-dokument-leser .content=${this.text}></aos-dokument-leser></div>`}
      <div class="fuss">
        ${this.savedAt
          ? html`<span>gespeichert ${formatClock(this.savedAt)} · nicht committet</span>`
          : this.dirty
            ? html`<span>Entwurf gesichert · auf allen Geräten</span>`
            : e.dirty
              ? html`<span>geändert · nicht committet</span>`
              : nothing}
        <span class="rechts">
          ${this.dirty ? html`<button type="button" class="btn leise" @click=${() => this.discard()}>Verwerfen</button>` : nothing}
          <button type="button" class="btn primaer" ?disabled=${this.saving || this.loading || !this.dirty} @click=${() => this.save(false)}>Speichern</button>
        </span>
      </div>
      <aos-confirm-dialog
        ?open=${this.confirmOverwrite}
        title="Trotzdem überschreiben?"
        message="Die Änderung auf der Platte geht verloren. Deine Fassung wird geschrieben."
        confirmText="Überschreiben"
        @confirm=${() => {
          this.confirmOverwrite = false;
          void this.save(true);
        }}
        @cancel=${() => (this.confirmOverwrite = false)}
      ></aos-confirm-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-projekt-doc-editor': AosProjektDocEditor;
  }
}
