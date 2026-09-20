/**
 * aos-vorhaben-uebersicht — the list of Vorhaben across all open projects
 * (mock 01/02; INT-2026-010 skizze-01): title, project chips as filter
 * (active project marked, not pre-filtered — FA-03), groups "Wartet auf dich /
 * Läuft / Umgesetzt (collapsed)", empty state per project (FA-05), loading and
 * error states, and a fixed bar at the bottom with „Neue Absicht" (AN-S02).
 * The head line „n Projekte · m warten" is gone — the bell counts. Pure
 * sorting/grouping lives in vorhaben-sort.ts (FA-02).
 *
 * INT-2026-022 (FA-12, FA-13, FA-16): begun intents without a folder
 * (`state.pendingIntents`) stand in „Wartet auf dich" or „Läuft" as entries
 * of `aos-vorhaben-zeile` in its mode „ohne Ordner", before the rows; an
 * entry whose session already carries a row is never rendered (belt for a
 * stale client). A project with only entries is not „empty".
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { VorhabenProjectInfo, VorhabenRow, VorhabenState } from '../../../../src/shared/types/vorhaben.protocol.js';
import { groupRows } from './vorhaben-sort.js';
import './aos-vorhaben-zeile.js';

@customElement('aos-vorhaben-uebersicht')
export class AosVorhabenUebersicht extends LitElement {
  @property({ attribute: false }) vorhabenState: VorhabenState | null = null;
  /** Active project of this device — marked, never pre-filtered. */
  @property({ type: String }) activeProjectId: string | null = null;
  /** Filter (null = all). Device-local. */
  @property({ type: String }) filterProjectId: string | null = null;
  @property({ type: Boolean }) connected = true;

  @state() private umgesetztOpen = false;

  static override styles = css`
    :host {
      display: block;
    }
    .kopf {
      display: flex;
      align-items: baseline;
      gap: var(--spacing-md);
      flex-wrap: wrap;
      margin-bottom: var(--spacing-md);
    }
    h1 {
      margin: 0;
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-semibold);
    }
    .sub {
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
    }
    .chips {
      display: flex;
      gap: var(--spacing-xs);
      flex-wrap: wrap;
      margin-bottom: var(--spacing-lg);
    }
    .chip {
      padding: 4px 12px;
      border-radius: 999px;
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text-secondary);
      font: inherit;
      font-size: var(--font-size-sm);
      cursor: pointer;
    }
    .chip.aktiv {
      border-color: var(--color-accent-primary);
      color: var(--color-text-primary);
    }
    .chip.gewaehlt {
      background: var(--color-accent-primary);
      border-color: var(--color-accent-primary);
      color: var(--color-text-inverse, #fff);
    }
    .gruppe {
      margin-bottom: var(--spacing-lg);
    }
    .gruppe-titel {
      font-size: var(--font-size-sm);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      margin: 0 0 var(--spacing-sm);
    }
    .liste {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }
    .leer,
    .status {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-md);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      margin-bottom: var(--spacing-md);
    }
    .status.fehler {
      border-style: solid;
      border-color: var(--color-accent-error);
    }
    .btn {
      padding: 6px 12px;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      font: inherit;
      font-size: var(--font-size-sm);
      cursor: pointer;
      white-space: nowrap;
    }
    .aufklappen {
      background: none;
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-md);
      width: 100%;
      text-align: left;
      padding: var(--spacing-sm) var(--spacing-md);
      color: var(--color-text-muted);
      font: inherit;
      font-size: var(--font-size-sm);
      cursor: pointer;
    }
    /* Fixed bar with „Neue Absicht" (AN-S02): always at the bottom of the
       viewport (also when the list is short), right of the terminal sidebar,
       keeps clear of the phone's home indicator. */
    .leiste {
      position: fixed;
      bottom: 0;
      left: 0;
      right: var(--terminal-open-width, 0px);
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-xl) calc(var(--spacing-sm) + env(safe-area-inset-bottom, 0px));
      background: var(--color-bg-primary);
      border-top: 1px solid var(--color-border);
      z-index: 50;
      transition: right 0.3s ease;
    }
    .leiste .btn.primaer {
      background: var(--color-accent-primary);
      border-color: var(--color-accent-primary);
      color: var(--color-text-inverse, #fff);
      font-weight: var(--font-weight-semibold, 600);
    }
    /* Room for the fixed bar at the end of the list. */
    .platz {
      height: calc(var(--spacing-xl) * 2 + env(safe-area-inset-bottom, 0px));
    }
  `;

  private setFilter(id: string | null): void {
    this.filterProjectId = id;
    this.dispatchEvent(new CustomEvent<{ projectId: string | null }>('filter-change', { detail: { projectId: id } }));
  }

  /** „Neue Absicht" for a project — the bar uses the filtered project, else the active one, else the first (FA-02). */
  private newVorhaben(project: VorhabenProjectInfo | null): void {
    const st = this.vorhabenState;
    const target = project ?? st?.projects.find((p) => p.id === this.filterProjectId) ?? st?.projects.find((p) => p.id === this.activeProjectId) ?? st?.projects[0] ?? null;
    if (!target) return;
    this.dispatchEvent(new CustomEvent<{ projectId: string }>('vorhaben-new', { bubbles: true, composed: true, detail: { projectId: target.id } }));
  }

  override render() {
    if (!this.connected) {
      return html`<div class="status fehler"><span>Keine Verbindung zum Backend.</span></div>`;
    }
    const st = this.vorhabenState;
    if (!st || st.loading) {
      return html`<div class="kopf"><h1>Vorhaben</h1></div><div class="status">Vorhaben werden gelesen …</div>`;
    }
    const projects = st.projects;
    const rows: VorhabenRow[] = st.rows;
    const pendings = st.pendingIntents ?? [];
    const groups = groupRows(rows, this.filterProjectId, pendings);
    const visibleProjects = this.filterProjectId ? projects.filter((p) => p.id === this.filterProjectId) : projects;
    const emptyProjects = visibleProjects.filter((p) => !p.error && !rows.some((r) => r.projectId === p.id) && !pendings.some((q) => q.projectId === p.id));
    const errorProjects = visibleProjects.filter((p) => p.error);

    return html`
      <div class="kopf">
        <h1>Vorhaben</h1>
      </div>
      <div class="chips" role="group" aria-label="Projektfilter">
        <button type="button" class="chip ${this.filterProjectId === null ? 'gewaehlt' : ''}" @click=${() => this.setFilter(null)}>Alle</button>
        ${projects.map(
          (p) => html`<button
            type="button"
            class="chip ${this.filterProjectId === p.id ? 'gewaehlt' : ''} ${p.id === this.activeProjectId ? 'aktiv' : ''}"
            title=${p.id === this.activeProjectId ? 'aktives Projekt' : ''}
            @click=${() => this.setFilter(p.id)}
          >${p.name}</button>`
        )}
      </div>
      ${projects.length === 0 ? html`<div class="status">Kein Projekt geöffnet — auf der Projekt-Seite hinzufügen.</div>` : nothing}
      ${errorProjects.map((p) => html`<div class="status fehler"><span><strong>${p.name}</strong> nicht lesbar: ${p.error} — Pfad prüfen oder Projekt schließen und neu öffnen.</span></div>`)}
      ${groups.map((g) =>
        g.key === 'umgesetzt'
          ? html`<div class="gruppe">
              <button type="button" class="aufklappen" @click=${() => (this.umgesetztOpen = !this.umgesetztOpen)} aria-expanded=${this.umgesetztOpen}>
                ${this.umgesetztOpen ? '▾' : '▸'} Umgesetzt · ${g.rows.length}
              </button>
              ${this.umgesetztOpen ? html`<div class="liste" style="margin-top: var(--spacing-sm)">${g.rows.map((r) => html`<aos-vorhaben-zeile .row=${r}></aos-vorhaben-zeile>`)}</div>` : nothing}
            </div>`
          : html`<section class="gruppe" aria-label=${g.label}>
              <h2 class="gruppe-titel">${g.label} · ${g.rows.length + g.pendings.length}</h2>
              <div class="liste">
                ${g.pendings.map((p) => html`<aos-vorhaben-zeile .pending=${p}></aos-vorhaben-zeile>`)}
                ${g.rows.map((r) => html`<aos-vorhaben-zeile .row=${r}></aos-vorhaben-zeile>`)}
              </div>
            </section>`
      )}
      ${emptyProjects.map(
        (p) => html`<div class="leer">
          <span>Noch kein Vorhaben in <strong>${p.name}</strong>.</span>
          <button type="button" class="btn" @click=${() => this.newVorhaben(p)}>Neue Absicht</button>
        </div>`
      )}
      <div class="platz"></div>
      ${projects.length > 0
        ? html`<div class="leiste" role="toolbar" aria-label="Aktionen">
            <button type="button" class="btn primaer" @click=${() => this.newVorhaben(null)}>Neue Absicht</button>
          </div>`
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-vorhaben-uebersicht': AosVorhabenUebersicht;
  }
}
