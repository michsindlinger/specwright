import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { SkillSummary } from '../../../../src/shared/types/team.protocol.js';

@customElement('aos-team-card')
export class AosTeamCard extends LitElement {
  @property({ type: Object }) skill!: SkillSummary;

  private getCategoryClass(): string {
    const cat = this.skill.category?.toLowerCase() || '';
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

  private getTeamTypeBadgeClass(): string {
    const teamType = this.skill.teamType || 'devteam';
    switch (teamType) {
      case 'team': return 'team-type--team';
      case 'individual': return 'team-type--individual';
      default: return 'team-type--devteam';
    }
  }

  private getTeamTypeLabel(): string {
    const teamType = this.skill.teamType || 'devteam';
    switch (teamType) {
      case 'team': return 'Team';
      case 'individual': return 'Individual';
      default: return 'DevTeam';
    }
  }

  private handleClick(): void {
    this.dispatchEvent(
      new CustomEvent('card-click', {
        detail: { skillId: this.skill.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    const categoryClass = this.getCategoryClass();
    const teamTypeClass = this.getTeamTypeBadgeClass();
    const teamTypeLabel = this.getTeamTypeLabel();

    return html`
      <div class="team-card" @click=${this.handleClick}>
        <div class="team-card__header">
          <h3 class="team-card__name">${this.skill.name}</h3>
          <div class="team-card__badges">
            <span class="team-card__badge team-card__team-type ${teamTypeClass}">${teamTypeLabel}</span>
            <span class="team-card__badge ${categoryClass}">${this.skill.category}</span>
          </div>
        </div>
        <p class="team-card__description">${this.skill.description || 'Keine Beschreibung vorhanden.'}</p>
        <div class="team-card__footer">
          <span class="team-card__learnings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            ${this.skill.learningsCount} ${this.skill.learningsCount === 1 ? 'Learning' : 'Learnings'}
          </span>
          ${this.skill.alwaysApply ? html`<span class="team-card__always-active">Always Active</span>` : ''}
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
    'aos-team-card': AosTeamCard;
  }
}
