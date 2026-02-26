import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { projectContext, type ProjectContextValue } from '../../context/project-context.js';
import type { SkillDetail } from '../../../../src/shared/types/team.protocol.js';

type ModalTab = 'skill' | 'learnings';
type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

@customElement('aos-team-detail-modal')
export class AosTeamDetailModal extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String }) skillId = '';

  @consume({ context: projectContext, subscribe: true })
  private projectCtx!: ProjectContextValue;

  @state() private activeTab: ModalTab = 'skill';
  @state() private loadState: LoadState = 'idle';
  @state() private skillDetail: SkillDetail | null = null;
  @state() private errorMessage = '';

  private boundKeyHandler = this.handleKeyDown.bind(this);
  private lastLoadedSkillId = '';

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('keydown', this.boundKeyHandler);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.boundKeyHandler);
  }

  override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('open') && this.open && this.skillId) {
      if (this.skillId !== this.lastLoadedSkillId) {
        this.activeTab = 'skill';
        this.loadSkillDetail();
      }
    }

    if (changedProperties.has('open') && !this.open) {
      this.lastLoadedSkillId = '';
      this.loadState = 'idle';
      this.skillDetail = null;
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.open) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.closeModal();
    }
  }

  private closeModal(): void {
    this.open = false;
    this.dispatchEvent(
      new CustomEvent('modal-close', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleOverlayClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) {
      this.closeModal();
    }
  }

  private async loadSkillDetail(): Promise<void> {
    const projectPath = this.projectCtx?.activeProject?.path;
    if (!projectPath || !this.skillId) return;

    this.loadState = 'loading';
    this.lastLoadedSkillId = this.skillId;

    try {
      const encodedPath = encodeURIComponent(projectPath);
      const encodedSkillId = encodeURIComponent(this.skillId);
      const response = await fetch(`/api/team/${encodedPath}/skills/${encodedSkillId}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.skill) {
        throw new Error(data.error || 'Skill nicht gefunden');
      }

      this.skillDetail = data.skill;
      this.loadState = 'loaded';
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'Fehler beim Laden der Skill-Details';
      this.loadState = 'error';
    }
  }

  private handleRetry(): void {
    this.lastLoadedSkillId = '';
    this.loadSkillDetail();
  }

  private setTab(tab: ModalTab): void {
    this.activeTab = tab;
  }

  private getCategoryClass(): string {
    const cat = this.skillDetail?.category?.toLowerCase() || '';
    switch (cat) {
      case 'frontend': return 'category-frontend';
      case 'backend': return 'category-backend';
      case 'architect':
      case 'architecture': return 'category-architecture';
      case 'quality':
      case 'qa': return 'category-quality';
      case 'domain': return 'category-domain';
      case 'devops': return 'category-devops';
      case 'po':
      case 'product': return 'category-product';
      default: return 'category-default';
    }
  }

  override render() {
    if (!this.open) {
      return nothing;
    }

    return html`
      <div
        class="team-detail-modal__overlay"
        @click=${this.handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-detail-modal-title"
      >
        <div class="team-detail-modal">
          <header class="team-detail-modal__header">
            ${this.renderHeaderContent()}
            <button
              class="team-detail-modal__close"
              @click=${() => this.closeModal()}
              aria-label="Dialog schliessen"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </header>

          ${this.loadState === 'loaded' ? this.renderTabs() : nothing}

          <div class="team-detail-modal__content">
            ${this.renderContent()}
          </div>
        </div>
      </div>
    `;
  }

  private renderHeaderContent() {
    if (this.loadState !== 'loaded' || !this.skillDetail) {
      return html`
        <h2 id="team-detail-modal-title" class="team-detail-modal__title">Skill Details</h2>
      `;
    }

    return html`
      <div class="team-detail-modal__title-row">
        <h2 id="team-detail-modal-title" class="team-detail-modal__title">${this.skillDetail.name}</h2>
        <span class="team-card__badge ${this.getCategoryClass()}">${this.skillDetail.category}</span>
      </div>
    `;
  }

  private renderTabs() {
    return html`
      <nav class="team-detail-modal__tabs" role="tablist">
        <button
          class="team-detail-modal__tab ${this.activeTab === 'skill' ? 'team-detail-modal__tab--active' : ''}"
          role="tab"
          aria-selected=${this.activeTab === 'skill'}
          @click=${() => this.setTab('skill')}
        >
          Skill
        </button>
        <button
          class="team-detail-modal__tab ${this.activeTab === 'learnings' ? 'team-detail-modal__tab--active' : ''}"
          role="tab"
          aria-selected=${this.activeTab === 'learnings'}
          @click=${() => this.setTab('learnings')}
        >
          Learnings
          ${this.skillDetail && this.skillDetail.learningsCount > 0
            ? html`<span class="team-detail-modal__tab-count">${this.skillDetail.learningsCount}</span>`
            : nothing}
        </button>
      </nav>
    `;
  }

  private renderContent() {
    switch (this.loadState) {
      case 'idle':
      case 'loading':
        return this.renderLoading();
      case 'error':
        return this.renderError();
      case 'loaded':
        return this.activeTab === 'skill' ? this.renderSkillTab() : this.renderLearningsTab();
    }
  }

  private renderLoading() {
    return html`
      <div class="team-detail-modal__loading">
        <div class="team-detail-modal__spinner"></div>
        <p>Skill-Details werden geladen...</p>
      </div>
    `;
  }

  private renderError() {
    return html`
      <div class="team-detail-modal__error">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>${this.errorMessage}</p>
        <button class="team-detail-modal__retry-btn" @click=${this.handleRetry}>Erneut versuchen</button>
      </div>
    `;
  }

  private renderSkillTab() {
    if (!this.skillDetail) return nothing;

    return html`
      <div class="team-detail-modal__skill-content" role="tabpanel">
        <pre class="team-detail-modal__markdown">${this.skillDetail.skillContent}</pre>
      </div>
    `;
  }

  private renderLearningsTab() {
    if (!this.skillDetail) return nothing;

    if (!this.skillDetail.dosAndDontsContent) {
      return html`
        <div class="team-detail-modal__empty-learnings" role="tabpanel">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          <p>Keine Learnings vorhanden</p>
        </div>
      `;
    }

    return html`
      <div class="team-detail-modal__learnings-content" role="tabpanel">
        <pre class="team-detail-modal__markdown">${this.skillDetail.dosAndDontsContent}</pre>
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-team-detail-modal': AosTeamDetailModal;
  }
}
