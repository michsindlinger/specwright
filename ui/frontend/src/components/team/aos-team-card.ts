import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { SkillSummary } from '../../../../src/shared/types/team.protocol.js';

@customElement('aos-team-card')
export class AosTeamCard extends LitElement {
  @property({ type: Object }) skill!: SkillSummary;
  @property({ type: Array }) availableMcpTools: string[] = [];

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

  private handleEditClick(e: Event): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('edit-click', {
        detail: { skillId: this.skill.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleDeleteClick(e: Event): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('delete-click', {
        detail: { skillId: this.skill.id, skillName: this.skill.name, teamType: this.skill.teamType },
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
            <button
              class="team-card__edit-btn"
              @click=${this.handleEditClick}
              aria-label="Skill bearbeiten"
              title="Bearbeiten"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button
              class="team-card__delete-btn"
              @click=${this.handleDeleteClick}
              aria-label="Skill l\u00f6schen"
              title="L\u00f6schen"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
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
          <div class="team-card__footer-right">
            ${this.skill.mcpTools && this.skill.mcpTools.length > 0 ? html`
              <div class="team-card__mcp-badges">
                ${this.skill.mcpTools.map(tool => {
                  const isOrphaned = this.availableMcpTools.length > 0 && !this.availableMcpTools.includes(tool);
                  return html`
                    <span
                      class="team-card__mcp-badge ${isOrphaned ? 'team-card__mcp-badge--orphaned' : ''}"
                      title=${isOrphaned ? 'MCP Tool nicht verfuegbar' : tool}
                    >${tool}</span>
                  `;
                })}
              </div>
            ` : nothing}
            ${this.skill.alwaysApply ? html`<span class="team-card__always-active">Always Active</span>` : ''}
          </div>
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
