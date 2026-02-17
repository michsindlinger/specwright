import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { GitStatusData, GitBranchEntry, GitPrInfo } from '../../../../src/shared/types/git.protocol.js';

/**
 * Git status bar component displaying branch info, ahead/behind counts,
 * changed files count, and action buttons (Pull, Push, Commit, Refresh).
 *
 * The branch name is clickable and opens a dropdown to switch branches.
 * If there are uncommitted changes, a confirm dialog warns before switching.
 *
 * Uses Light DOM pattern for consistent theme styling.
 * Receives all data via properties from app.ts (no direct gateway access).
 *
 * @fires refresh-git - Fired when refresh button is clicked
 * @fires pull-git - Fired when pull button is clicked
 * @fires push-git - Fired when push button is clicked
 * @fires open-commit-dialog - Fired when commit button is clicked (detail: { autoPush?: boolean })
 * @fires checkout-branch - Fired when user selects a branch to switch to (detail: { branch: string })
 */
@customElement('aos-git-status-bar')
export class AosGitStatusBar extends LitElement {
  @property({ type: Object }) gitStatus: GitStatusData | null = null;
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) hasProject = false;
  @property({ type: Array }) branches: GitBranchEntry[] = [];
  @property({ type: Boolean }) isOperationRunning = false;
  @property({ type: Array }) prInfo: GitPrInfo[] = [];

  @state() private _dropdownOpen = false;
  @state() private _confirmDialogOpen = false;
  @state() private _pendingBranch = '';
  @state() private _pullDropdownOpen = false;

  private _boundCloseDropdown = (e: MouseEvent) => this._onDocumentClick(e);
  private _boundClosePullDropdown = (e: MouseEvent) => this._onDocumentClickPull(e);

  private _dispatch(eventName: string, detail?: Record<string, unknown>): void {
    this.dispatchEvent(
      new CustomEvent(eventName, { bubbles: true, composed: true, detail })
    );
  }

  private _toggleDropdown(e: Event): void {
    e.stopPropagation();
    this._dropdownOpen = !this._dropdownOpen;

    if (this._dropdownOpen) {
      document.addEventListener('click', this._boundCloseDropdown);
    } else {
      document.removeEventListener('click', this._boundCloseDropdown);
    }
  }

  private _onDocumentClick(e: MouseEvent): void {
    const path = e.composedPath();
    const dropdown = this.querySelector('.git-status-bar__branch-dropdown');
    const trigger = this.querySelector('.git-status-bar__branch');
    if (dropdown && !path.includes(dropdown) && trigger && !path.includes(trigger)) {
      this._closeDropdown();
    }
  }

  private _closeDropdown(): void {
    this._dropdownOpen = false;
    document.removeEventListener('click', this._boundCloseDropdown);
  }

  private _onBranchSelect(branch: GitBranchEntry): void {
    if (branch.current) return;

    this._closeDropdown();

    const changedFilesCount = this.gitStatus?.files.length ?? 0;

    if (changedFilesCount > 0) {
      this._pendingBranch = branch.name;
      this._confirmDialogOpen = true;
      return;
    }

    this._dispatch('checkout-branch', { branch: branch.name });
  }

  private _onConfirmCheckout(): void {
    this._confirmDialogOpen = false;
    this._dispatch('checkout-branch', { branch: this._pendingBranch });
    this._pendingBranch = '';
  }

  private _onCancelCheckout(): void {
    this._confirmDialogOpen = false;
    this._pendingBranch = '';
  }

  private _togglePullDropdown(e: Event): void {
    e.stopPropagation();
    this._pullDropdownOpen = !this._pullDropdownOpen;
    if (this._pullDropdownOpen) {
      document.addEventListener('click', this._boundClosePullDropdown);
    } else {
      document.removeEventListener('click', this._boundClosePullDropdown);
    }
  }

  private _closePullDropdown(): void {
    this._pullDropdownOpen = false;
    document.removeEventListener('click', this._boundClosePullDropdown);
  }

  private _onDocumentClickPull(e: MouseEvent): void {
    const path = e.composedPath();
    const dropdown = this.querySelector('.git-status-bar__pull-dropdown');
    const trigger = this.querySelector('.git-status-bar__btn--pull-chevron');
    if (dropdown && !path.includes(dropdown) && trigger && !path.includes(trigger)) {
      this._closePullDropdown();
    }
  }

  private _onPullRebase(): void {
    this._closePullDropdown();
    this._dispatch('pull-git', { rebase: true });
  }

  private get _buttonsDisabled(): boolean {
    return this.loading || this.isOperationRunning;
  }

  private _isSafePrUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private _getPrStateModifier(pr: GitPrInfo): string {
    switch (pr.state) {
      case 'OPEN': return 'git-status-bar__pr-badge--open';
      case 'MERGED': return 'git-status-bar__pr-badge--merged';
      case 'CLOSED': return 'git-status-bar__pr-badge--closed';
      default: return '';
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this._boundCloseDropdown);
    document.removeEventListener('click', this._boundClosePullDropdown);
  }

  private _renderNoRepo() {
    return html`
      <div class="git-status-bar git-status-bar--no-repo">
        <span class="git-status-bar__info-text">Kein Git-Repository erkannt</span>
      </div>
    `;
  }

  private _renderLoading() {
    return html`
      <div class="git-status-bar git-status-bar--loading">
        <span class="git-status-bar__branch">
          <svg class="git-status-bar__icon git-status-bar__icon--spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
          </svg>
          Laden...
        </span>
      </div>
    `;
  }

  private _renderBranchDropdown() {
    if (!this._dropdownOpen) return nothing;

    const branchList = this.branches.length > 0
      ? this.branches
      : this.gitStatus
        ? [{ name: this.gitStatus.branch, current: true, lastCommit: '', lastMessage: '' }]
        : [];

    return html`
      <div class="git-status-bar__branch-dropdown" @click=${(e: Event) => e.stopPropagation()}>
        ${branchList.map(b => html`
          <button
            class="git-status-bar__branch-item ${b.current ? 'git-status-bar__branch-item--current' : ''}"
            ?disabled=${b.current}
            @click=${() => this._onBranchSelect(b)}
            title=${b.lastMessage || b.name}
          >
            <span class="git-status-bar__branch-name">${b.name}</span>
            ${b.current ? html`<span class="git-status-bar__branch-current-badge">aktuell</span>` : nothing}
          </button>
        `)}
      </div>
    `;
  }

  override render() {
    if (!this.hasProject) {
      return nothing;
    }

    if (this.loading && !this.gitStatus) {
      return this._renderLoading();
    }

    if (this.gitStatus && !this.gitStatus.isGitRepo) {
      return this._renderNoRepo();
    }

    if (!this.gitStatus) {
      return nothing;
    }

    const { branch, ahead, behind, files } = this.gitStatus;
    const changedCount = files.length;

    return html`
      <div class="git-status-bar">
        <div class="git-status-bar__left">
          <span class="git-status-bar__branch git-status-bar__branch--clickable" title="Branch wechseln" @click=${this._toggleDropdown}>
            <svg class="git-status-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="6" y1="3" x2="6" y2="15"></line>
              <circle cx="18" cy="6" r="3"></circle>
              <circle cx="6" cy="18" r="3"></circle>
              <path d="M18 9a9 9 0 0 1-9 9"></path>
            </svg>
            ${branch}
            <svg class="git-status-bar__icon git-status-bar__chevron ${this._dropdownOpen ? 'git-status-bar__chevron--open' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            ${this._renderBranchDropdown()}
          </span>

          ${ahead > 0 ? html`
            <span class="git-status-bar__counter git-status-bar__counter--ahead" title="${ahead} Commit(s) ahead">
              <svg class="git-status-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
              ${ahead}
            </span>
          ` : nothing}

          ${behind > 0 ? html`
            <span class="git-status-bar__counter git-status-bar__counter--behind" title="${behind} Commit(s) behind">
              <svg class="git-status-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
              ${behind}
            </span>
          ` : nothing}

          ${changedCount > 0 ? html`
            <span class="git-status-bar__counter git-status-bar__counter--changed" title="${changedCount} geaenderte Datei(en)">
              <svg class="git-status-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              ${changedCount} changed
            </span>
          ` : nothing}

          ${this.prInfo.filter(pr => this._isSafePrUrl(pr.url)).map(pr => html`
            <a
              class="git-status-bar__pr-badge ${this._getPrStateModifier(pr)}"
              href=${pr.url}
              target="_blank"
              rel="noopener"
              title="${pr.title}"
            >
              <svg class="git-status-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="18" r="3"></circle>
                <circle cx="6" cy="6" r="3"></circle>
                <path d="M13 6h3a2 2 0 0 1 2 2v7"></path>
                <line x1="6" y1="9" x2="6" y2="21"></line>
              </svg>
              #${pr.number} ${pr.state}
            </a>
          `)}
        </div>

        <div class="git-status-bar__actions">
          <div class="git-status-bar__pull-group">
            <button
              class="git-status-bar__btn"
              title="Pull"
              ?disabled=${this._buttonsDisabled}
              @click=${() => this._dispatch('pull-git')}
            >
              <svg class="git-status-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
              Pull
            </button>
            <button
              class="git-status-bar__btn git-status-bar__btn--pull-chevron"
              title="Pull-Optionen"
              ?disabled=${this._buttonsDisabled}
              @click=${this._togglePullDropdown}
            >
              <svg class="git-status-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            ${this._pullDropdownOpen ? html`
              <div class="git-status-bar__pull-dropdown" @click=${(e: Event) => e.stopPropagation()}>
                <button class="git-status-bar__pull-option" @click=${this._onPullRebase}>
                  Pull --rebase
                </button>
              </div>
            ` : nothing}
          </div>
          <button
            class="git-status-bar__btn"
            title="Push"
            ?disabled=${this._buttonsDisabled}
            @click=${() => this._dispatch('push-git')}
          >
            <svg class="git-status-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="19" x2="12" y2="5"></line>
              <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
            Push
          </button>
          <button
            class="git-status-bar__btn"
            title="Commit"
            ?disabled=${this._buttonsDisabled}
            @click=${() => this._dispatch('open-commit-dialog')}
          >
            <svg class="git-status-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="4"></circle>
              <line x1="1.05" y1="12" x2="7" y2="12"></line>
              <line x1="17.01" y1="12" x2="22.96" y2="12"></line>
            </svg>
            Commit
          </button>
          <button
            class="git-status-bar__btn git-status-bar__btn--commit-push"
            title="Commit & Push"
            ?disabled=${this._buttonsDisabled || !changedCount}
            @click=${() => this._dispatch('open-commit-dialog', { autoPush: true })}
          >
            <svg class="git-status-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="4"></circle>
              <line x1="1.05" y1="12" x2="7" y2="12"></line>
              <line x1="17.01" y1="12" x2="22.96" y2="12"></line>
            </svg>
            <svg class="git-status-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="19" x2="12" y2="5"></line>
              <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
            Commit & Push
          </button>
          <button
            class="git-status-bar__btn git-status-bar__btn--refresh"
            title="Git-Status aktualisieren"
            ?disabled=${this._buttonsDisabled}
            @click=${() => this._dispatch('refresh-git')}
          >
            <svg class="git-status-bar__icon ${this.loading ? 'git-status-bar__icon--spin' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>
      </div>

      <aos-confirm-dialog
        .open=${this._confirmDialogOpen}
        title="Uncommitted Changes"
        message="Bitte lokale Aenderungen erst committen oder verwerfen"
        confirmText="Trotzdem wechseln"
        @confirm=${this._onConfirmCheckout}
        @cancel=${this._onCancelCheckout}
      ></aos-confirm-dialog>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-git-status-bar': AosGitStatusBar;
  }
}
