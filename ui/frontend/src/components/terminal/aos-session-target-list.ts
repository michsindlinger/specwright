import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { gateway, type WebSocketMessage } from '../../gateway.js';
import type { CloudTerminalSessionTarget } from '../../../../src/shared/types/cloud-terminal.protocol.js';
import {
  slugifyWorktreeName,
  MAX_WORKTREE_NAME_INPUT,
} from '../../../../src/shared/worktree-name.js';
import {
  buildTargetRows,
  defaultTargetRowId,
  filterTargetRows,
  hasFilterMatches,
  isPinnedRowId,
  type SessionTargetRow,
  type TargetsSnapshot,
} from './session-target-rows.js';

export interface SessionTargetSelectedDetail {
  target: CloudTerminalSessionTarget;
  label: string;
}

/** How long to wait for `cloud-terminal:targets:response` before offering a fallback. */
const TARGETS_TIMEOUT_MS = 4000;

/**
 * Hover text for a selectable row: branch plus the exact creation timestamp.
 * The row itself only carries the coarse age ("vor 3 Tagen"), so the tooltip is
 * where "created when exactly?" gets answered.
 */
function rowTooltip(row: SessionTargetRow): string {
  if (row.createdAt === null) return row.sublabel;
  const exact = new Date(row.createdAt).toLocaleString('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return `${row.sublabel}\nErstellt: ${exact}`;
}

/**
 * Step 2 of the new-session flow: pick where the session runs.
 *
 * Self-contained the same way `aos-model-dropdown` is — it fetches its own data
 * over the gateway and emits a single selection event, so the (already large)
 * `aos-terminal-session` only has to render it and listen.
 *
 * Emits:
 *  - `target-selected` — {@link SessionTargetSelectedDetail}
 *  - `target-back`     — user wants to change the model again
 */
@customElement('aos-session-target-list')
export class AosSessionTargetList extends LitElement {
  /** Project whose worktrees should be listed */
  @property({ type: String }) projectPath = '';
  /** Mobile/split layout: bigger touch targets, tighter spacing */
  @property({ type: Boolean, reflect: true }) compact = false;
  /** Shown as context so the user sees what they picked in step 1 */
  @property({ type: String }) modelLabel = '';

  @state() private rows: SessionTargetRow[] = [];
  @state() private phase: 'loading' | 'ready' | 'error' = 'loading';
  @state() private errorMessage = '';
  @state() private focusedId: string | null = null;
  /** Optional user-chosen name for the "Neuer Worktree" row. */
  @state() private worktreeName = '';
  /** Live search text; narrows the worktree rows, never the pinned ones. */
  @state() private query = '';

  /** Desktop-only one-shot focus into the search box. */
  private didAutofocus = false;

  /** Correlates responses: several panes request targets over one socket. */
  private readonly requestId = `tgt-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  private boundHandleResponse = this.handleTargetsResponse.bind(this);
  private boundHandleError = this.handleTargetsError.bind(this);
  private boundRefresh = this.refresh.bind(this);
  private boundHandleConnected = this.requestTargets.bind(this);

  static override styles = css`
    :host {
      display: block;
      width: 100%;
      max-width: 460px;
      font-family: var(--font-family, sans-serif);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .model-context {
      font-size: 0.75rem;
      color: var(--text-color-secondary, #a0a0a0);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .back-btn {
      background: none;
      border: none;
      color: var(--accent-color, #007acc);
      cursor: pointer;
      font-size: 0.8rem;
      padding: 0.25rem 0;
      flex-shrink: 0;
    }

    .back-btn:hover {
      text-decoration: underline;
    }

    .list {
      border: 1px solid var(--border-color, #404040);
      border-radius: 4px;
      background-color: var(--bg-color-secondary, #1e1e1e);
      max-height: 320px;
      overflow-y: auto;
    }

    .row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      border-bottom: 1px solid var(--border-color, #404040);
      transition: background-color 0.15s;
    }

    :host([compact]) .row {
      padding: 0.7rem 0.75rem;
      min-height: 44px;
    }

    .row:last-child {
      border-bottom: none;
    }

    .row:hover:not([aria-disabled='true']),
    .row.focused:not([aria-disabled='true']) {
      background-color: var(--bg-color-hover, #3d3d3d);
    }

    .row[aria-disabled='true'] {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .row-text {
      flex: 1;
      min-width: 0;
    }

    .row-label {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-color, #e5e5e5);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .row-sublabel {
      font-size: 0.72rem;
      color: var(--text-color-secondary, #a0a0a0);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .search {
      margin-bottom: 0.4rem;
    }

    .search-input {
      width: 100%;
      box-sizing: border-box;
      background-color: var(--bg-color, #1a1a1a);
      border: 1px solid var(--border-color, #404040);
      border-radius: 3px;
      color: var(--text-color, #e5e5e5);
      font-family: inherit;
      font-size: 0.78rem;
      padding: 0.35rem 0.5rem;
    }

    :host([compact]) .search-input {
      font-size: 0.85rem;
      padding: 0.5rem 0.55rem;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--accent-color, #007acc);
    }

    .badges {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.25rem;
      flex-shrink: 0;
      max-width: 45%;
    }

    .badge {
      flex-shrink: 0;
      font-size: 0.65rem;
      padding: 0.1rem 0.4rem;
      border-radius: 999px;
      background-color: var(--bg-color-tertiary, #2d2d2d);
      border: 1px solid var(--border-color, #404040);
      color: var(--text-color-secondary, #a0a0a0);
      white-space: nowrap;
    }

    .dirty-dot {
      flex-shrink: 0;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: var(--warning-color, #d29922);
    }

    .status {
      padding: 0.75rem;
      font-size: 0.8rem;
      color: var(--text-color-secondary, #a0a0a0);
      text-align: center;
    }

    .status.error {
      color: var(--error-color, #f85149);
      text-align: left;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
      flex-wrap: wrap;
    }

    .action-btn {
      background-color: var(--bg-color-tertiary, #2d2d2d);
      border: 1px solid var(--border-color, #404040);
      border-radius: 4px;
      color: var(--text-color, #e5e5e5);
      cursor: pointer;
      font-size: 0.8rem;
      padding: 0.4rem 0.7rem;
    }

    .action-btn.primary {
      border-color: var(--accent-color, #007acc);
    }

    .action-btn:hover {
      background-color: var(--bg-color-hover, #3d3d3d);
    }

    .hint {
      margin-top: 0.5rem;
      font-size: 0.72rem;
      color: var(--text-color-secondary, #a0a0a0);
    }

    .name-field {
      margin-top: 0.4rem;
    }

    .name-input {
      width: 100%;
      box-sizing: border-box;
      background-color: var(--bg-color, #1a1a1a);
      border: 1px solid var(--border-color, #404040);
      border-radius: 3px;
      color: var(--text-color, #e5e5e5);
      font-family: inherit;
      font-size: 0.78rem;
      padding: 0.3rem 0.45rem;
    }

    :host([compact]) .name-input {
      font-size: 0.85rem;
      padding: 0.45rem 0.5rem;
    }

    .name-input:focus {
      outline: none;
      border-color: var(--accent-color, #007acc);
    }

    .name-preview {
      margin-top: 0.25rem;
      font-size: 0.68rem;
      color: var(--text-color-secondary, #a0a0a0);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .name-preview.invalid {
      color: var(--warning-color, #d29922);
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    gateway.on('cloud-terminal:targets:response', this.boundHandleResponse);
    gateway.on('cloud-terminal:targets:error', this.boundHandleError);
    // A session ending elsewhere frees a worktree — un-grey it without a reload.
    gateway.on('cloud-terminal:closed', this.boundRefresh);
    gateway.on('cloud-terminal:created', this.boundRefresh);
    gateway.on('gateway.connected', this.boundHandleConnected);
    this.requestTargets();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    gateway.off('cloud-terminal:targets:response', this.boundHandleResponse);
    gateway.off('cloud-terminal:targets:error', this.boundHandleError);
    gateway.off('cloud-terminal:closed', this.boundRefresh);
    gateway.off('cloud-terminal:created', this.boundRefresh);
    gateway.off('gateway.connected', this.boundHandleConnected);
    this.clearTimeout();
  }

  private clearTimeout(): void {
    if (this.timeoutHandle !== null) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  private requestTargets(): void {
    this.clearTimeout();
    this.phase = 'loading';
    this.errorMessage = '';
    gateway.send({
      type: 'cloud-terminal:targets',
      requestId: this.requestId,
      projectPath: this.projectPath,
      timestamp: new Date().toISOString(),
    });
    this.timeoutHandle = setTimeout(() => {
      if (this.phase === 'loading') {
        this.phase = 'error';
        this.errorMessage = 'Zeitüberschreitung beim Laden der Worktrees.';
      }
    }, TARGETS_TIMEOUT_MS);
  }

  /** Silent re-fetch after another session started/stopped — keeps rows visible. */
  private refresh(): void {
    if (this.phase !== 'ready') return;
    gateway.send({
      type: 'cloud-terminal:targets',
      requestId: this.requestId,
      projectPath: this.projectPath,
      timestamp: new Date().toISOString(),
    });
  }

  private handleTargetsResponse(message: WebSocketMessage): void {
    if (message.requestId !== this.requestId) return;
    this.clearTimeout();

    const snapshot = message as unknown as TargetsSnapshot;
    this.rows = buildTargetRows(snapshot);
    this.phase = 'ready';
    // Keep the user's keyboard position across refreshes when still valid —
    // measured against the *visible* rows. `query` is deliberately untouched
    // here: a background refresh must not wipe what the user is typing.
    const visible = this.visibleRows;
    const keep = this.focusedId && visible.some((r) => r.id === this.focusedId && !r.disabled);
    if (!keep) this.focusedId = defaultTargetRowId(visible);
  }

  private handleTargetsError(message: WebSocketMessage): void {
    if (message.requestId !== this.requestId) return;
    this.clearTimeout();
    this.phase = 'error';
    this.errorMessage = (message.message as string) || 'Worktrees konnten nicht geladen werden.';
  }

  /**
   * Drops a name the user typed once the "Neuer Worktree" row is gone or
   * disabled — otherwise the text rides along invisibly and would be applied to
   * a later selection the user never associated with it.
   *
   * Guarded on `phase === 'ready'`: while loading, `rows` is empty but a
   * synthetic new-worktree row IS on screen, so resetting there would wipe the
   * field mid-typing on every background refresh.
   */
  protected override willUpdate(): void {
    if (!this.worktreeName || this.phase !== 'ready') return;
    const row = this.rows.find((r) => r.id === 'new-worktree');
    if (!row || row.disabled) this.worktreeName = '';
  }

  /** Rows currently on screen: the filter applied to the loaded rows. */
  private get visibleRows(): SessionTargetRow[] {
    return filterTargetRows(this.rows, this.query);
  }

  private handleQueryInput(e: Event): void {
    this.query = (e.target as HTMLInputElement).value;
    // The focused row may have just been filtered away.
    const visible = this.visibleRows;
    if (!visible.some((r) => r.id === this.focusedId && !r.disabled)) {
      this.focusedId = defaultTargetRowId(visible);
    }
  }

  /**
   * Keydown inside the search field.
   *
   * The field sits outside the listbox (a text input inside `role="listbox"` is
   * invalid ARIA), so its keys never reach `handleKeydown` — the list keys are
   * handled here instead. Escape clears a non-empty query and otherwise bubbles,
   * so it can still close the picker.
   */
  private handleQueryKeydown(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      this.moveFocus(e.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      this.activateFocused();
      return;
    }
    if (e.key === 'Escape' && this.query !== '') {
      e.preventDefault();
      e.stopPropagation();
      this.query = '';
      this.focusedId = defaultTargetRowId(this.visibleRows);
    }
  }

  private select(row: SessionTargetRow): void {
    if (row.disabled) return;
    const name = this.worktreeName.trim();
    // Only `new-worktree` carries a name; for the other kinds the path is fixed.
    const target: CloudTerminalSessionTarget =
      row.target.kind === 'new-worktree' && name
        ? { kind: 'new-worktree', name }
        : row.target;

    this.dispatchEvent(
      new CustomEvent<SessionTargetSelectedDetail>('target-selected', {
        detail: { target, label: row.label },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleNameInput(e: Event): void {
    this.worktreeName = (e.target as HTMLInputElement).value;
  }

  /**
   * Keydown inside the name field.
   *
   * Enter starts the session. Only the keys the listbox itself acts on are
   * stopped, so they do not move the roving focus while the caret is in the
   * field. Everything else — Tab, left/right for the caret, ordinary typing —
   * passes through untouched.
   */
  private handleNameKeydown(e: KeyboardEvent, row: SessionTargetRow): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      this.select(row);
      return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === ' ') {
      e.stopPropagation();
    }
  }

  /** Live preview of the directory the server will derive. */
  private renderNameField(row: SessionTargetRow) {
    const typed = this.worktreeName.trim();
    const slug = typed ? slugifyWorktreeName(typed) : '';

    return html`
      <div class="name-field" @click=${(e: Event) => e.stopPropagation()}>
        <input
          class="name-input"
          type="text"
          placeholder="Name (optional)"
          aria-label="Worktree-Name (optional)"
          maxlength=${MAX_WORKTREE_NAME_INPUT}
          .value=${this.worktreeName}
          @input=${this.handleNameInput}
          @keydown=${(e: KeyboardEvent) => this.handleNameKeydown(e, row)}
        />
        ${typed
          ? slug
            ? html`<div class="name-preview">wird zu: session-${slug}</div>`
            : html`<div class="name-preview invalid">
                Kein gültiger Name — erlaubt sind a–z, 0–9 und Bindestrich.
              </div>`
          : ''}
      </div>
    `;
  }

  private emitBack(): void {
    this.dispatchEvent(new CustomEvent('target-back', { bubbles: true, composed: true }));
  }

  /** Moves the roving focus over the selectable rows that are currently visible. */
  private moveFocus(delta: number): void {
    const selectable = this.visibleRows.filter((r) => !r.disabled);
    if (selectable.length === 0) return;
    const currentIdx = selectable.findIndex((r) => r.id === this.focusedId);
    const next = (currentIdx + delta + selectable.length) % selectable.length;
    this.focusedId = selectable[next].id;
  }

  /** Starts the focused row (falls back to the first selectable one). */
  private activateFocused(): void {
    const selectable = this.visibleRows.filter((r) => !r.disabled);
    if (selectable.length === 0) return;
    const currentIdx = selectable.findIndex((r) => r.id === this.focusedId);
    const row = selectable[currentIdx === -1 ? 0 : currentIdx];
    if (row) this.select(row);
  }

  /** Roving focus over selectable rows; Enter/Space activates. */
  private handleKeydown(e: KeyboardEvent): void {
    // Second line of defence behind the name field's own selective
    // stopPropagation: typing must never drive the roving focus.
    if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      this.moveFocus(e.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.activateFocused();
    }
  }

  override render() {
    return html`
      <div class="header">
        <div class="model-context" title=${this.modelLabel}>${this.modelLabel}</div>
        <button class="back-btn" @click=${this.emitBack}>← Modell ändern</button>
      </div>

      ${this.phase === 'error' ? '' : this.renderSearch()}
      ${this.phase === 'error' ? this.renderError() : this.renderList()}
    `;
  }

  /**
   * Search box — rendered outside the listbox on purpose (a text input inside
   * `role="listbox"` is invalid ARIA). Only shown once real worktrees exist:
   * in a repo with none it would be a control with nothing to narrow.
   */
  private renderSearch() {
    if (this.phase !== 'ready') return '';
    if (!this.rows.some((r) => !isPinnedRowId(r.id))) return '';
    return html`
      <div class="search">
        <input
          class="search-input"
          type="text"
          placeholder="Worktree suchen…"
          aria-label="Worktree-Suche"
          .value=${this.query}
          @input=${this.handleQueryInput}
          @keydown=${this.handleQueryKeydown}
        />
      </div>
    `;
  }

  /**
   * One-shot focus into the search box on desktop. Skipped in the compact
   * layout (mobile / narrow split), where it would pop up the on-screen
   * keyboard on every picker open.
   */
  protected override updated(): void {
    if (this.didAutofocus || this.compact || this.phase !== 'ready') return;
    const input = this.renderRoot.querySelector<HTMLInputElement>('.search-input');
    if (!input) return;
    this.didAutofocus = true;
    input.focus();
  }

  private renderError() {
    return html`
      <div class="status error">${this.errorMessage}</div>
      <div class="actions">
        <button class="action-btn primary" @click=${this.requestTargets}>Erneut versuchen</button>
        <button
          class="action-btn"
          @click=${() => this.select({
            id: 'main',
            target: { kind: 'main' },
            label: 'Hauptverzeichnis',
            sublabel: '',
            disabled: false,
            disabledReason: '',
            badges: [],
            dirty: false,
            createdAt: null,
            searchText: '',
          })}
        >
          Im Hauptverzeichnis starten
        </button>
      </div>
      <div class="hint">
        Das Hauptverzeichnis funktioniert immer — anders als „Neuer Worktree“, der von der
        Konfiguration abhängt.
      </div>
    `;
  }

  private renderList() {
    // While loading, "Neuer Worktree" is still offered: it needs no server data,
    // so the default path never waits on the targets channel.
    const rows: SessionTargetRow[] =
      this.phase === 'loading'
        ? [{
            id: 'new-worktree',
            target: { kind: 'new-worktree' },
            label: 'Neuer Worktree',
            sublabel: 'frische Arbeitskopie',
            disabled: false,
            disabledReason: '',
            badges: [],
            dirty: false,
            createdAt: null,
            searchText: '',
          }]
        : this.visibleRows;

    return html`
      <div
        class="list"
        role="listbox"
        tabindex="0"
        aria-label="Wo soll die Session laufen?"
        @keydown=${this.handleKeydown}
      >
        ${rows.map((row) => html`
          <div
            class="row ${row.id === this.focusedId ? 'focused' : ''}"
            role="option"
            aria-selected=${row.id === this.focusedId}
            aria-disabled=${row.disabled}
            title=${row.disabled ? row.disabledReason : rowTooltip(row)}
            @click=${() => this.select(row)}
          >
            <div class="row-text">
              <div class="row-label">${row.label}</div>
              <div class="row-sublabel">${row.sublabel}</div>
              ${row.id === 'new-worktree' && !row.disabled ? this.renderNameField(row) : ''}
            </div>
            ${row.dirty ? html`<span class="dirty-dot" title="Ungespeicherte Änderungen"></span>` : ''}
            ${row.badges.length > 0
              ? html`<div class="badges">
                  ${row.badges.map((b) => html`<span class="badge">${b}</span>`)}
                </div>`
              : ''}
          </div>
        `)}
        ${this.phase === 'loading'
          ? html`<div class="status">Worktrees werden geladen…</div>`
          : ''}
        ${this.phase === 'ready' && !hasFilterMatches(this.rows, this.query)
          ? html`<div class="status">Keine Worktrees gefunden</div>`
          : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-session-target-list': AosSessionTargetList;
  }
}
