/**
 * aos-projekt-seite — the project page (INT-2026-004 mock 07; INT-2026-010
 * FA-17): everything that used to hang in the frame lives here as named
 * sections, so more can be added without touching the overview or the reader
 * (FA-48):
 *
 *   projekt       name, working copy, Claude load, open projects (switch, close),
 *                 recents, „Projekt hinzufügen"
 *   docs          project docs with editor (unchanged)
 *   git           status bar (`aos-projekt-git`, state in git-state.service)
 *   dateien       „Dateibaum öffnen" → file tree overlay of app.ts
 *   einstellungen `aos-settings-view embedded`
 *   vorlagen      `aos-prompt-templates-view`
 *   start         `aos-getting-started-view` (validation, update hint)
 *
 * „Neues Vorhaben" moved to the route `neu` (aos-vorhaben-view). Light DOM
 * since INT-2026-010: the hosted views are Light DOM and styled by theme.css,
 * which does not reach into a shadow root. Styles: theme.css `aos-projekt-seite`.
 */

import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import type { ProjectDocDraft, ProjectDocEntry, ProjectDocKey, VorhabenProjectInfo } from '../../../../src/shared/types/vorhaben.protocol.js';
import type { GlobalGateState } from '../../../../src/shared/types/concurrency.protocol.js';
import { vorhabenService } from '../../services/vorhaben.service.js';
import { gateway, type MessageHandler } from '../../gateway.js';
import { projectContext, type ProjectContextValue, defaultProjectContext } from '../../context/project-context.js';
import './aos-projekt-doc-editor.js';
import '../projekt/aos-projekt-git.js';
import '../../views/settings-view.js';
import '../../views/prompt-templates-view.js';
import '../../views/aos-getting-started-view.js';

export type ProjektSectionId = 'projekt' | 'docs' | 'git' | 'dateien' | 'einstellungen' | 'vorlagen' | 'start';

interface ProjektSection {
  id: ProjektSectionId;
  label: string;
  /** Needs an open project; the `projekt` section is the one place to add one. */
  needsProject: boolean;
}

export const SECTIONS: readonly ProjektSection[] = [
  { id: 'projekt', label: 'Projekt', needsProject: false },
  { id: 'docs', label: 'Projekt-Docs', needsProject: true },
  { id: 'git', label: 'Git', needsProject: true },
  { id: 'dateien', label: 'Dateien', needsProject: true },
  { id: 'start', label: 'Erste Schritte', needsProject: true },
  { id: 'einstellungen', label: 'Einstellungen', needsProject: false },
  { id: 'vorlagen', label: 'Prompt-Vorlagen', needsProject: true },
];

@customElement('aos-projekt-seite')
export class AosProjektSeite extends LitElement {
  @property({ attribute: false }) project: VorhabenProjectInfo | null = null;
  @property({ attribute: false }) docDrafts: Record<string, ProjectDocDraft> = {};
  @property({ type: String }) selectedKey: ProjectDocKey | null = null;
  @property({ type: Boolean }) mobile = false;

  @consume({ context: projectContext, subscribe: true })
  private projectCtx: ProjectContextValue = defaultProjectContext;

  @state() private docs: ProjectDocEntry[] = [];
  @state() private loading = false;
  @state() private error = '';
  /** Global Claude load „n/max" (was a header badge; CCB). */
  @state() private concurrency: GlobalGateState | null = null;

  private readonly onConcurrency: MessageHandler = (msg) => {
    this.concurrency = msg.state as GlobalGateState;
  };

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    gateway.on('claude.concurrency.state', this.onConcurrency);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    gateway.off('claude.concurrency.state', this.onConcurrency);
  }

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

  private addProject(): void {
    this.dispatchEvent(new CustomEvent('add-project', { bubbles: true, composed: true }));
  }

  private openFileTree(): void {
    this.dispatchEvent(new CustomEvent('file-tree-toggle', { bubbles: true, composed: true }));
  }

  private openRecent(path: string, name: string): void {
    this.projectCtx.addProject({ id: path, name, path });
  }

  /** INT-2026-010 (spec §4 Randfall): back on the overview, the chip of the new project counts as chosen (AR-05: via the backend). */
  private wechsle(ctx: ProjectContextValue, id: string): void {
    ctx.switchProject(id);
    vorhabenService.setAnsicht({ filterProjectId: id });
  }

  override render() {
    const p = this.project;
    const selected = this.selectedKey ? this.docs.find((d) => d.key === this.selectedKey) : undefined;
    const editorOnly = this.mobile && !!selected;
    if (editorOnly && p && selected) {
      return html`
        <button type="button" class="zurueck" @click=${() => this.select(null)}>‹ ${p.name}</button>
        <aos-projekt-doc-editor
          .projectId=${p.id}
          .entry=${selected}
          .draft=${this.docDrafts[`${p.id}::${selected.key}`]}
          .mobile=${this.mobile}
          @doc-saved=${() => this.loadDocs()}
        ></aos-projekt-doc-editor>
      `;
    }
    return html`
      ${p
        ? html`<h1>${p.name}</h1>
            <div class="sub">
              ${p.arbeitskopie ? html`Arbeitskopie <code>${p.arbeitskopie}</code>` : 'kein Git-Repository'}
              ${p.worktrees.length
                ? html` · ${p.worktrees.length} ${p.worktrees.length === 1 ? 'Worktree' : 'Worktrees'} vorhanden (${p.worktrees.join(', ')}) — bearbeitet wird die Hauptkopie`
                : nothing}
            </div>`
        : html`<h1>Projekt</h1>
            <div class="status">Kein Projekt geöffnet — unten hinzufügen.</div>`}
      ${SECTIONS.filter((s) => p || !s.needsProject).map((s) => this.renderSection(s, selected))}
    `;
  }

  private renderSection(section: ProjektSection, selected: ProjectDocEntry | undefined) {
    const p = this.project;
    const body = (() => {
      switch (section.id) {
        case 'projekt':
          return this.renderProjekt();
        case 'docs':
          return this.renderDocs(selected);
        case 'git':
          return html`<aos-projekt-git></aos-projekt-git>`;
        case 'dateien':
          return html`<div class="zeile">
            <span class="status">Dateibaum und Editor als Überlagerung — wie bisher über die Seitenleiste.</span>
            <button type="button" class="btn" @click=${this.openFileTree}>Dateibaum öffnen</button>
          </div>`;
        case 'einstellungen':
          return html`<details class="klappe"><summary>Modelle, Allgemein, Git, Darstellung, Setup</summary><aos-settings-view embedded></aos-settings-view></details>`;
        case 'vorlagen':
          return html`<details class="klappe"><summary>Vorlagen ansehen und bearbeiten</summary><aos-prompt-templates-view></aos-prompt-templates-view></details>`;
        case 'start':
          return html`<aos-getting-started-view .projectPath=${p?.path ?? ''}></aos-getting-started-view>`;
      }
    })();
    return html`<section class="abschnitt abschnitt-${section.id}" aria-label=${section.label} data-section=${section.id}>
      <h2 class="abschnitt-titel">${section.label}</h2>
      ${body}
    </section>`;
  }

  private renderProjekt() {
    const ctx = this.projectCtx;
    const c = this.concurrency;
    const active = ctx.activeProject?.id ?? null;
    const openPaths = new Set(ctx.openProjects.map((x) => x.path));
    const recents = ctx.recentProjects.filter((r) => !openPaths.has(r.path));
    return html`
      ${c && (c.running > 0 || c.waiting > 0)
        ? html`<div class="auslastung ${c.running >= c.max ? 'voll' : ''}" title="aktive Claude-Sitzungen${c.waiting > 0 ? ` · ${c.waiting} in Warteschlange` : ''}">
            ⚡ Auslastung ${c.running}/${c.max}${c.waiting > 0 ? html` <span class="queue-count">+${c.waiting}</span>` : nothing}
          </div>`
        : nothing}
      <div class="liste offene" role="list" aria-label="Offene Projekte">
        ${ctx.openProjects.length === 0 ? html`<div class="status">Kein Projekt geöffnet.</div>` : nothing}
        ${ctx.openProjects.map(
          (x) => html`<div class="eintrag projekt-eintrag ${x.id === active ? 'aktiv' : ''}" role="listitem">
            <button type="button" class="wahl" @click=${() => this.wechsle(ctx, x.id)} title=${x.path}>
              <span class="name">${x.name}</span>
              ${x.id === active ? html`<span class="marke">aktiv</span>` : nothing}
            </button>
            <button type="button" class="schliessen" aria-label="${x.name} schließen" title="Projekt schließen" @click=${() => ctx.closeProject(x.id)}>×</button>
          </div>`
        )}
      </div>
      ${recents.length
        ? html`<h3 class="unter-titel">Zuletzt geöffnet</h3>
            <div class="liste recents">
              ${recents.map((r) => html`<button type="button" class="eintrag recent" @click=${() => this.openRecent(r.path, r.name)} title=${r.path}>
                <span class="name">${r.name}</span>
                <span class="stand">${r.path}</span>
              </button>`)}
            </div>`
        : nothing}
      <button type="button" class="btn hinzufuegen" @click=${this.addProject}>Projekt hinzufügen</button>
    `;
  }

  private renderDocs(selected: ProjectDocEntry | undefined) {
    const p = this.project;
    if (!p) return nothing;
    return html`
      ${this.error ? html`<div class="status fehler">${this.error}</div>` : nothing}
      ${this.loading && this.docs.length === 0 ? html`<div class="status">Lädt …</div>` : nothing}
      <div class="layout ${this.mobile ? 'mobil' : ''} ${!selected ? 'ohne-editor' : ''}">
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
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-projekt-seite': AosProjektSeite;
  }
}
