import { LitElement, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { projectContext, type ProjectContextValue } from '../context/project-context.js';
import type { SkillSummary, McpServerSummary } from '../../../src/shared/types/team.protocol.js';
import '../components/team/aos-team-card.js';
import '../components/team/aos-team-detail-modal.js';
import '../components/team/aos-team-edit-modal.js';
import '../components/team/aos-mcp-server-card.js';
import '../components/aos-confirm-dialog.js';

type ViewState = 'loading' | 'loaded' | 'empty' | 'error';
type McpLoadState = 'idle' | 'loading' | 'loaded' | 'error';

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
  @state() private confirmDialogOpen = false;
  @state() private confirmDialogMessage = '';
  @state() private deleteTargetSkillId = '';
  @state() private mcpServers: McpServerSummary[] = [];
  @state() private mcpLoadState: McpLoadState = 'idle';
  @state() private mcpErrorMessage = '';

  private lastProjectPath = '';

  override updated() {
    const currentPath = this.projectCtx?.activeProject?.path || '';
    if (currentPath && currentPath !== this.lastProjectPath) {
      this.lastProjectPath = currentPath;
      this.loadSkills();
      this.loadMcpConfig();
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

  private async loadMcpConfig(): Promise<void> {
    const projectPath = this.projectCtx?.activeProject?.path;
    if (!projectPath) return;

    this.mcpLoadState = 'loading';

    try {
      const encodedPath = encodeURIComponent(projectPath);
      const response = await fetch(`/api/team/${encodedPath}/mcp-config`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || data.message || 'Unknown API error');
      }

      this.mcpServers = data.servers || [];
      this.mcpLoadState = 'loaded';
    } catch (err) {
      this.mcpErrorMessage = err instanceof Error ? err.message : 'Fehler beim Laden der MCP-Konfiguration';
      this.mcpLoadState = 'error';
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

  private get availableMcpToolNames(): string[] {
    return this.mcpLoadState === 'loaded' ? this.mcpServers.map(s => s.name) : [];
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

  private handleDeleteClick(e: CustomEvent<{ skillId: string; skillName: string; teamType?: string }>): void {
    const { skillId, skillName, teamType } = e.detail;
    this.deleteTargetSkillId = skillId;
    const isDevTeam = !teamType || teamType === 'devteam';
    this.confirmDialogMessage = isDevTeam
      ? `Dieser Skill gehört zum Development Team. Möchten Sie "${skillName}" wirklich löschen?`
      : `Möchten Sie "${skillName}" wirklich löschen?`;
    this.confirmDialogOpen = true;
  }

  private async handleDeleteConfirm(): Promise<void> {
    this.confirmDialogOpen = false;
    const projectPath = this.projectCtx?.activeProject?.path;
    if (!projectPath || !this.deleteTargetSkillId) return;

    try {
      const encodedPath = encodeURIComponent(projectPath);
      const encodedSkillId = encodeURIComponent(this.deleteTargetSkillId);
      const response = await fetch(`/api/team/${encodedPath}/skills/${encodedSkillId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Fehler beim Löschen');
      }

      this.deleteTargetSkillId = '';
      this.loadSkills();
    } catch (err) {
      console.error('Error deleting skill:', err);
      this.deleteTargetSkillId = '';
    }
  }

  private handleDeleteCancel(): void {
    this.confirmDialogOpen = false;
    this.deleteTargetSkillId = '';
  }

  private handleAddTeamMember(): void {
    this.dispatchEvent(
      new CustomEvent('workflow-start-interactive', {
        detail: { commandId: 'specwright:add-team-member' },
        bubbles: true,
        composed: true,
      })
    );
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
          <button class="team-view__add-btn" @click=${this.handleAddTeamMember}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Teammitglied hinzufügen
          </button>
        </div>
        ${this.renderContent()}
      </div>
      <aos-team-detail-modal
        .open=${this.modalOpen}
        .skillId=${this.selectedSkillId}
        .availableMcpTools=${this.availableMcpToolNames}
        @modal-close=${this.handleModalClose}
        @edit-click=${this.handleEditClick}
        @delete-click=${this.handleDeleteClick}
      ></aos-team-detail-modal>
      <aos-team-edit-modal
        .open=${this.editModalOpen}
        .skillId=${this.selectedSkillId}
        .availableMcpTools=${this.availableMcpToolNames}
        @modal-close=${this.handleEditModalClose}
        @skill-saved=${this.handleSkillSaved}
      ></aos-team-edit-modal>
      <aos-confirm-dialog
        .open=${this.confirmDialogOpen}
        title="Skill löschen"
        .message=${this.confirmDialogMessage}
        confirmText="Löschen"
        @confirm=${this.handleDeleteConfirm}
        @cancel=${this.handleDeleteCancel}
      ></aos-confirm-dialog>
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
                    .availableMcpTools=${this.availableMcpToolNames}
                    @card-click=${this.handleCardClick}
                    @edit-click=${this.handleEditClick}
                    @delete-click=${this.handleDeleteClick}
                  ></aos-team-card>
                `)}
              </div>
            </div>
          `)}
        </div>
      ` : nothing}
      ${individuals.length > 0 ? this.renderSection('Einzelpersonen', individuals) : nothing}
      ${this.renderMcpSection()}
    `;
  }

  private renderMcpSection() {
    if (this.mcpLoadState === 'idle' || this.mcpLoadState === 'loading') {
      return nothing;
    }

    if (this.mcpLoadState === 'error') {
      return html`
        <div class="team-section">
          <h3 class="team-section__title">MCP Tools</h3>
          <div class="mcp-section__message mcp-section__message--error">
            ${this.mcpErrorMessage}
          </div>
        </div>
      `;
    }

    if (this.mcpServers.length === 0) {
      return html`
        <div class="team-section">
          <h3 class="team-section__title">MCP Tools</h3>
          <div class="mcp-section__message">
            Keine MCP-Server konfiguriert
          </div>
        </div>
      `;
    }

    return html`
      <div class="team-section">
        <h3 class="team-section__title">MCP Tools</h3>
        <div class="team-grid">
          ${this.mcpServers.map(server => html`
            <aos-mcp-server-card .server=${server}></aos-mcp-server-card>
          `)}
        </div>
      </div>
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
              .availableMcpTools=${this.availableMcpToolNames}
              @card-click=${this.handleCardClick}
              @edit-click=${this.handleEditClick}
              @delete-click=${this.handleDeleteClick}
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
