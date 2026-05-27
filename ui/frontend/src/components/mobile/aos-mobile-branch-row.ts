import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { GitStatusData, GitPrInfo } from '../../../../src/shared/types/git.protocol.js';
import { projectStateService } from '../../services/project-state.service.js';

@customElement('aos-mobile-branch-row')
export class AosMobileBranchRow extends LitElement {
  @property({ type: Object }) gitStatus: GitStatusData | null = null;
  @property({ type: Array }) prInfo: GitPrInfo[] = [];

  private _getActiveProjectName(): string {
    const state = projectStateService.loadPersistedState();
    if (!state?.openProjects || !state.activeProjectId) return '';
    const proj = state.openProjects.find(p => p.id === state.activeProjectId);
    return proj?.name ?? '';
  }

  override render() {
    if (!this.gitStatus?.isGitRepo) return nothing;

    const { branch, ahead, behind, files } = this.gitStatus;
    const openPr = this.prInfo.find(pr => pr.state === 'OPEN');
    const projectName = this._getActiveProjectName();

    return html`
      <div
        class="branch-row"
        role="status"
        aria-label="Git: ${branch}${projectName ? ` · ${projectName}` : ''}"
      >
        <span class="branch-name">
          <svg class="branch-icon" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="5" cy="4" r="2" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="11" cy="12" r="2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M5 6v2a4 4 0 0 0 4 4h.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          ${branch}
        </span>

        ${ahead > 0 ? html`
          <span class="pill pill--ahead" title="${ahead} commit(s) ahead">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
              <path d="M4 7V1M1 4l3-3 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ${ahead}
          </span>
        ` : nothing}

        ${behind > 0 ? html`
          <span class="pill pill--behind" title="${behind} commit(s) behind">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
              <path d="M4 1v6M1 4l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ${behind}
          </span>
        ` : nothing}

        ${openPr ? html`
          <span class="pill pill--pr" title="Open PR #${openPr.number}: ${openPr.title}">
            PR #${openPr.number}
          </span>
        ` : nothing}

        ${files.length > 0 ? html`
          <span class="pill pill--changed" title="${files.length} changed file(s)">
            ${files.length}∗
          </span>
        ` : nothing}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    .branch-row {
      display: flex;
      align-items: center;
      gap: var(--space-mobile-xs, 0.25rem);
      padding: var(--space-mobile-sm, 0.5rem) var(--space-mobile-sm, 0.5rem) var(--space-mobile-md, 0.75rem);
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }

    .branch-row::-webkit-scrollbar {
      display: none;
    }

    .branch-name {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-secondary, #94a3b8);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .branch-icon {
      flex-shrink: 0;
      color: var(--color-text-tertiary, #64748b);
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      height: 18px;
      padding: 0 5px;
      border-radius: 9px;
      font-size: 0.6875rem;
      font-weight: 600;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .pill--ahead {
      background: color-mix(in srgb, var(--color-accent-success, #22c55e) 15%, transparent);
      color: var(--color-accent-success, #22c55e);
    }

    .pill--behind {
      background: color-mix(in srgb, var(--color-accent-warning, #f59e0b) 15%, transparent);
      color: var(--color-accent-warning, #f59e0b);
    }

    .pill--pr {
      background: color-mix(in srgb, var(--color-accent-primary, #00d4ff) 12%, transparent);
      color: var(--color-accent-primary, #00d4ff);
    }

    .pill--changed {
      background: color-mix(in srgb, var(--color-text-secondary, #94a3b8) 12%, transparent);
      color: var(--color-text-secondary, #94a3b8);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-branch-row': AosMobileBranchRow;
  }
}
