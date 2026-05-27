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

  private _onAddProject(): void {
    this.dispatchEvent(
      new CustomEvent('add-project', { bubbles: true, composed: true })
    );
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
          <button
            class="add-btn touch-target"
            @click=${this._onAddProject}
            aria-label="Add project"
            title="Add project"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
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
      padding: var(--space-mobile-md, 0.75rem) var(--space-mobile-sm, 0.5rem) var(--space-mobile-sm, 0.5rem);
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }

    .chips::-webkit-scrollbar {
      display: none;
    }

    .add-btn {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1px dashed var(--color-border, #1e3a5f);
      border-radius: var(--radius-full, 999px);
      color: var(--color-accent-primary, #00d4ff);
      cursor: pointer;
      font-family: inherit;
      margin-left: var(--space-mobile-xs, 0.25rem);
    }

    .add-btn:active {
      background: rgba(0, 212, 255, 0.12);
      border-style: solid;
    }

    .touch-target {
      min-height: var(--touch-target-min, 44px);
      min-width: var(--touch-target-min, 44px);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-project-scroller': AosMobileProjectScroller;
  }
}
