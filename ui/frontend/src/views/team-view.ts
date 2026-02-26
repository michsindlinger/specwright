import { LitElement, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { projectContext, type ProjectContextValue } from '../context/project-context.js';
import type { SkillSummary } from '../../../src/shared/types/team.protocol.js';
import '../components/team/aos-team-card.js';
import '../components/team/aos-team-detail-modal.js';
import '../components/team/aos-team-edit-modal.js';

type ViewState = 'loading' | 'loaded' | 'empty' | 'error';

interface TeamGroup {
  name: string;
  skills: SkillSummary[];
}

@customElement('aos-team-view')
export class AosTeamView extends LitElement {
  @consume({ context: projectContext, subscribe: true })
  private projectCtx!: ProjectContextValue;

  @state() private skills: SkillSummary[] = [];
  @state() private viewState: ViewState = 'loading';
  @state() private errorMessage = '';
  @state() private modalOpen = false;
  @state() private editModalOpen = false;
  @state() private selectedSkillId = '';

  private lastProjectPath = '';

  override updated() {
    const currentPath = this.projectCtx?.activeProject?.path || '';
    if (currentPath && currentPath !== this.lastProjectPath) {
      this.lastProjectPath = currentPath;
      this.loadSkills();
    }
  }

  private async loadSkills(): Promise<void> {
    const projectPath = this.projectCtx?.activeProject?.path;
    if (!projectPath) {
      this.viewState = 'empty';
      return;
    }

    this.viewState = 'loading';

    try {
      const encodedPath = encodeURIComponent(projectPath);
      const response = await fetch(`/api/team/${encodedPath}/skills`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Unknown API error');
      }

      this.skills = data.skills || [];
      this.viewState = this.skills.length > 0 ? 'loaded' : 'empty';
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'Fehler beim Laden der Skills';
      this.viewState = 'error';
    }
  }

  private getDevTeamSkills(): SkillSummary[] {
    return this.skills.filter(s => !s.teamType || s.teamType === 'devteam');
  }

  private getCustomTeamGroups(): TeamGroup[] {
    const teamSkills = this.skills.filter(s => s.teamType === 'team');
    const groups = new Map<string, SkillSummary[]>();
    for (const skill of teamSkills) {
      const name = skill.teamName || 'Unbenanntes Team';
      const list = groups.get(name) || [];
      list.push(skill);
      groups.set(name, list);
    }
    return Array.from(groups.entries())
      .map(([name, skills]) => ({ name, skills }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private getIndividualSkills(): SkillSummary[] {
    return this.skills.filter(s => s.teamType === 'individual');
  }

  private handleCardClick(e: CustomEvent<{ skillId: string }>): void {
    this.selectedSkillId = e.detail.skillId;
    this.modalOpen = true;
    this.dispatchEvent(
      new CustomEvent('team-skill-select', {
        detail: { skillId: e.detail.skillId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleModalClose(): void {
    this.modalOpen = false;
  }

  private handleEditClick(e: CustomEvent<{ skillId: string }>): void {
    this.selectedSkillId = e.detail.skillId;
    this.editModalOpen = true;
  }

  private handleEditModalClose(): void {
    this.editModalOpen = false;
  }

  private handleSkillSaved(): void {
    this.editModalOpen = false;
    this.loadSkills();
  }

  private handleRetry(): void {
    this.loadSkills();
  }

  override render() {
    return html`
      <div class="team-view">
        <div class="team-view__header">
          <h2 class="team-view__title">Team</h2>
          <p class="team-view__subtitle">Skills und Agents in deinem Projekt</p>
        </div>
        ${this.renderContent()}
      </div>
      <aos-team-detail-modal
        .open=${this.modalOpen}
        .skillId=${this.selectedSkillId}
        @modal-close=${this.handleModalClose}
        @edit-click=${this.handleEditClick}
      ></aos-team-detail-modal>
      <aos-team-edit-modal
        .open=${this.editModalOpen}
        .skillId=${this.selectedSkillId}
        @modal-close=${this.handleEditModalClose}
        @skill-saved=${this.handleSkillSaved}
      ></aos-team-edit-modal>
    `;
  }

  private renderContent() {
    switch (this.viewState) {
      case 'loading':
        return this.renderLoading();
      case 'error':
        return this.renderError();
      case 'empty':
        return this.renderEmpty();
      case 'loaded':
        return this.renderGrouped();
    }
  }

  private renderLoading() {
    return html`
      <div class="team-grid">
        ${[1, 2, 3, 4].map(() => html`
          <div class="team-card team-card--skeleton">
            <div class="skeleton-line skeleton-line--title"></div>
            <div class="skeleton-line skeleton-line--text"></div>
            <div class="skeleton-line skeleton-line--text skeleton-line--short"></div>
          </div>
        `)}
      </div>
    `;
  }

  private renderError() {
    return html`
      <div class="team-view__empty">
        <div class="team-view__empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h3 class="team-view__empty-title">Fehler beim Laden</h3>
        <p class="team-view__empty-description">${this.errorMessage}</p>
        <button class="team-view__action-btn" @click=${this.handleRetry}>Erneut versuchen</button>
      </div>
    `;
  }

  private renderEmpty() {
    return html`
      <div class="team-view__empty">
        <div class="team-view__empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h3 class="team-view__empty-title">Noch kein Team vorhanden</h3>
        <p class="team-view__empty-description">
          Erstelle dein Development Team mit spezialisierten Skills und Agents.
          Verwende <code>/build-development-team</code> um loszulegen.
        </p>
      </div>
    `;
  }

  private renderGrouped() {
    const devTeam = this.getDevTeamSkills();
    const customTeams = this.getCustomTeamGroups();
    const individuals = this.getIndividualSkills();

    return html`
      ${devTeam.length > 0 ? this.renderSection('Development Team', devTeam) : nothing}
      ${customTeams.length > 0 ? html`
        <div class="team-section">
          <h3 class="team-section__title">Custom Teams</h3>
          ${customTeams.map(group => html`
            <div class="team-section__group">
              <h4 class="team-section__group-name">${group.name}</h4>
              <div class="team-grid">
                ${group.skills.map(skill => html`
                  <aos-team-card
                    .skill=${skill}
                    @card-click=${this.handleCardClick}
                    @edit-click=${this.handleEditClick}
                  ></aos-team-card>
                `)}
              </div>
            </div>
          `)}
        </div>
      ` : nothing}
      ${individuals.length > 0 ? this.renderSection('Einzelpersonen', individuals) : nothing}
    `;
  }

  private renderSection(title: string, skills: SkillSummary[]) {
    return html`
      <div class="team-section">
        <h3 class="team-section__title">${title}</h3>
        <div class="team-grid">
          ${skills.map(skill => html`
            <aos-team-card
              .skill=${skill}
              @card-click=${this.handleCardClick}
              @edit-click=${this.handleEditClick}
            ></aos-team-card>
          `)}
        </div>
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-team-view': AosTeamView;
  }
}
