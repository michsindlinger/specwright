/**
 * aos-projekt-git — the git section of the project page (INT-2026-010, FA-17):
 * view only. Subscribes to `gitState` (services/git-state.service.ts) and
 * renders the unchanged `aos-git-status-bar`; every bar event becomes a
 * service action. The dialogs stay overlays in `app.ts`, fed from the same
 * service, so a commit → push survives leaving this page. Light DOM: the bar
 * is styled by theme.css.
 */

import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { gitState, type GitState, type PullStrategy } from '../../services/git-state.service.js';
import '../git/aos-git-status-bar.js';

@customElement('aos-projekt-git')
export class AosProjektGit extends LitElement {
  @state() private git: GitState = gitState.state;
  private unsubscribe: (() => void) | null = null;

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribe = gitState.subscribe((s) => {
      this.git = s;
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  override render() {
    const g = this.git;
    return html`<aos-git-status-bar
      .gitStatus=${g.gitStatus}
      .loading=${g.gitLoading}
      .hasProject=${g.hasProject}
      .branches=${g.gitBranches}
      .isOperationRunning=${g.isGitOperationRunning}
      .prInfo=${g.gitPrInfo}
      @refresh-git=${() => gitState.refresh()}
      @pull-git=${(e: CustomEvent<{ strategy?: PullStrategy }>) => gitState.pull(e.detail?.strategy)}
      @push-git=${() => gitState.push()}
      @open-commit-dialog=${(e: CustomEvent<{ autoPush?: boolean }>) => gitState.openCommitDialog(e.detail?.autoPush === true)}
      @checkout-branch=${(e: CustomEvent<{ branch: string }>) => gitState.checkout(e.detail.branch)}
    ></aos-git-status-bar>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-projekt-git': AosProjektGit;
  }
}
