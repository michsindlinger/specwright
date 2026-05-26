import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit/context';
import {
  projectContext,
  defaultProjectContext,
  type ProjectContextValue,
} from '../../context/project-context.js';
import type { GitStatusData, GitPrInfo } from '../../../../src/shared/types/git.protocol.js';
import './aos-mobile-project-chip.js';
import './aos-mobile-branch-row.js';

@customElement('aos-mobile-project-scroller')
export class AosMobileProjectScroller extends LitElement {
  @consume({ context: projectContext, subscribe: true })
  private _projectCtx: ProjectContextValue = defaultProjectContext;

  @property({ type: Object }) gitStatus: GitStatusData | null = null;
  @property({ type: Array }) prInfo: GitPrInfo[] = [];

  private _onChipTap(e: CustomEvent<{ projectId: string }>): void {
    this._projectCtx.switchProject(e.detail.projectId);
  }

  override render() {
    const { openProjects, activeProject } = this._projectCtx;

    if (openProjects.length === 0) return nothing;

    return html`
      <div class="scroller-wrap">
        <div
          class="chips"
          role="tablist"
          aria-label="Projects"
          @chip-tap=${this._onChipTap}
        >
          ${openProjects.map(
            p => html`
              <aos-mobile-project-chip
                .projectId=${p.id}
                .name=${p.name}
                ?active=${activeProject?.id === p.id}
              ></aos-mobile-project-chip>
            `
          )}
        </div>
        <aos-mobile-branch-row
          .gitStatus=${this.gitStatus}
          .prInfo=${this.prInfo}
        ></aos-mobile-branch-row>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      background: var(--color-bg-sidebar, #0b1929);
      border-bottom: 1px solid var(--color-border, #1e3a5f);
    }

    .scroller-wrap {
      display: flex;
      flex-direction: column;
    }

    .chips {
      display: flex;
      align-items: center;
      gap: var(--space-mobile-xs, 0.25rem);
      padding: var(--space-mobile-xs, 0.25rem) var(--space-mobile-sm, 0.5rem);
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }

    .chips::-webkit-scrollbar {
      display: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-project-scroller': AosMobileProjectScroller;
  }
}
