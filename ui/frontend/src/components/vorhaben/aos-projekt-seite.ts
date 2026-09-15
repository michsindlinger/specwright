/**
 * aos-projekt-seite — the project page (mock 07): head (name, worktree,
 * hint on worktrees), section "Projekt-Docs" (five entries with stand and
 * commit hint, FA-43), the editor, section "Neues Vorhaben". Built as a list
 * of named sections so more can be added without touching the overview or
 * the reader (FA-48). "Absicht beginnen" starts a `/specwright:intent` session with
 * model choice (stage 2, FA-35).
 */

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { stepCommand, type ProjectDocDraft, type ProjectDocEntry, type ProjectDocKey, type VorhabenProjectInfo } from '../../../../src/shared/types/vorhaben.protocol.js';
import { vorhabenService } from '../../services/vorhaben.service.js';
import './aos-projekt-doc-editor.js';
import './aos-naechster-schritt.js';

interface ProjektSection {
  id: 'docs' | 'neu';
  label: string;
}

const SECTIONS: ProjektSection[] = [
  { id: 'docs', label: 'Projekt-Docs' },
  { id: 'neu', label: 'Neues Vorhaben' },
];

@customElement('aos-projekt-seite')
export class AosProjektSeite extends LitElement {
  @property({ attribute: false }) project: VorhabenProjectInfo | null = null;
  @property({ attribute: false }) docDrafts: Record<string, ProjectDocDraft> = {};
  @property({ type: String }) selectedKey: ProjectDocKey | null = null;
  @property({ type: Boolean }) mobile = false;

  @state() private docs: ProjectDocEntry[] = [];
  @state() private loading = false;
  @state() private error = '';

  static override styles = css`
    :host {
      display: block;
    }
    h1 {
      margin: 0 0 var(--spacing-xs);
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-semibold);
    }
    .sub {
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      margin-bottom: var(--spacing-lg);
    }
    .sub code {
      font-family: var(--font-family-mono);
    }
    .layout {
      display: grid;
      grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
      gap: var(--spacing-lg);
      align-items: start;
    }
    .layout.mobil,
    .layout.ohne-editor {
      grid-template-columns: minmax(0, 1fr);
    }
    .abschnitt {
      margin-bottom: var(--spacing-lg);
    }
    .abschnitt-titel {
      font-size: var(--font-size-sm);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      margin: 0 0 var(--spacing-sm);
    }
    .liste {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }
    .eintrag {
      display: flex;
      justify-content: space-between;
      gap: var(--spacing-sm);
      align-items: center;
      width: 100%;
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .eintrag.aktiv {
      border-color: var(--color-accent-primary);
    }
    .eintrag.fehlt {
      color: var(--color-text-muted);
    }
    .eintrag .stand {
      font-family: var(--font-family-mono);
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      white-space: nowrap;
    }
    .eintrag .stand.dirty {
      color: var(--color-accent-warning);
    }
    .neu {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-secondary);
      font-size: var(--font-size-sm);
    }
    .neu code {
      font-family: var(--font-family-mono);
      color: var(--color-accent-primary);
    }
    .status {
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
    }
    .status.fehler {
      color: var(--color-accent-error);
    }
    .zurueck {
      background: none;
      border: none;
      color: var(--color-text-muted);
      font: inherit;
      font-size: var(--font-size-sm);
      cursor: pointer;
      padding: 0;
      margin-bottom: var(--spacing-sm);
    }
  `;

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('project')) {
      const prev = changed.get('project') as VorhabenProjectInfo | null | undefined;
      if (this.project && prev?.id !== this.project.id) void this.loadDocs();
      if (!this.project) this.docs = [];
    }
  }

  public async loadDocs(): Promise<void> {
    if (!this.project) return;
    const id = this.project.id;
    this.loading = true;
    this.error = '';
    try {
      const docs = await vorhabenService.listProjectDocs(id);
      if (this.project?.id === id) this.docs = docs;
    } catch (err) {
      this.error = (err as Error).message;
    } finally {
      this.loading = false;
    }
  }

  private select(key: ProjectDocKey | null): void {
    this.selectedKey = key;
    this.dispatchEvent(new CustomEvent<{ key: ProjectDocKey | null }>('doc-select', { bubbles: true, composed: true, detail: { key } }));
  }

  private standOf(d: ProjectDocEntry): string {
    if (!d.exists || d.mtimeMs === null) return 'fehlt · Vorlage im Flow';
    if (d.dirty) return 'geändert · nicht committet';
    return new Date(d.mtimeMs).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  }

  override render() {
    const p = this.project;
    if (!p) return html`<div class="status">Kein Projekt ausgewählt — Projekt über die Reiter wählen.</div>`;
    const selected = this.selectedKey ? this.docs.find((d) => d.key === this.selectedKey) : undefined;
    const editorOnly = this.mobile && !!selected;
    return html`
      ${editorOnly ? html`<button type="button" class="zurueck" @click=${() => this.select(null)}>‹ ${p.name}</button>` : nothing}
      ${!editorOnly
        ? html`<h1>${p.name}</h1>
            <div class="sub">
              ${p.arbeitskopie ? html`Arbeitskopie <code>${p.arbeitskopie}</code>` : 'kein Git-Repository'}
              ${p.worktrees.length
                ? html` · ${p.worktrees.length} ${p.worktrees.length === 1 ? 'Worktree' : 'Worktrees'} vorhanden (${p.worktrees.join(', ')}) — bearbeitet wird die Hauptkopie`
                : nothing}
            </div>`
        : nothing}
      <div class="layout ${this.mobile ? 'mobil' : ''} ${!selected ? 'ohne-editor' : ''}">
        ${!editorOnly
          ? html`<div>
              ${SECTIONS.map((s) => this.renderSection(s))}
            </div>`
          : nothing}
        ${selected
          ? html`<aos-projekt-doc-editor
              .projectId=${p.id}
              .entry=${selected}
              .draft=${this.docDrafts[`${p.id}::${selected.key}`]}
              .mobile=${this.mobile}
              @doc-saved=${() => this.loadDocs()}
            ></aos-projekt-doc-editor>`
          : nothing}
      </div>
    `;
  }

  private renderSection(section: ProjektSection) {
    if (section.id === 'docs') {
      return html`<section class="abschnitt" aria-label=${section.label}>
        <h2 class="abschnitt-titel">${section.label}</h2>
        ${this.error ? html`<div class="status fehler">${this.error}</div>` : nothing}
        ${this.loading && this.docs.length === 0 ? html`<div class="status">Lädt …</div>` : nothing}
        <div class="liste">
          ${this.docs.map(
            (d) => html`<button
              type="button"
              class="eintrag ${d.key === this.selectedKey ? 'aktiv' : ''} ${d.exists ? '' : 'fehlt'}"
              @click=${() => this.select(d.key)}
            >
              <span>${d.label}</span>
              <span class="stand ${d.dirty ? 'dirty' : ''}">${this.standOf(d)}</span>
            </button>`
          )}
        </div>
      </section>`;
    }
    const p = this.project;
    return html`<section class="abschnitt" aria-label=${section.label}>
      <h2 class="abschnitt-titel">${section.label}</h2>
      ${p
        ? html`<aos-naechster-schritt
            .projectId=${p.id}
            .projectPath=${p.path}
            step="intent"
            label="Absicht beginnen"
            command=${stepCommand('intent')}
            .mobile=${this.mobile}
          ></aos-naechster-schritt>`
        : html`<div class="neu"><span>Absicht beginnen</span><span>im Terminal: <code>${stepCommand('intent')}</code></span></div>`}
    </section>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-projekt-seite': AosProjektSeite;
  }
}
