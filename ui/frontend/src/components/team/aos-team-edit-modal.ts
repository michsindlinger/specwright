import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { projectContext, type ProjectContextValue } from '../../context/project-context.js';
import type { SkillDetail } from '../../../../src/shared/types/team.protocol.js';
import '../file-editor/aos-file-editor.js';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

@customElement('aos-team-edit-modal')
export class AosTeamEditModal extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String }) skillId = '';
  @property({ type: Array }) availableMcpTools: string[] = [];

  @consume({ context: projectContext, subscribe: true })
  private projectCtx!: ProjectContextValue;

  @state() private loadState: LoadState = 'idle';
  @state() private skillDetail: SkillDetail | null = null;
  @state() private errorMessage = '';
  @state() private isSaving = false;
  @state() private currentContent = '';
  @state() private selectedMcpTools: string[] = [];

  private lastLoadedSkillId = '';
  private boundKeyHandler = this.handleKeyDown.bind(this);

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
        this.loadSkillDetail();
      }
    }

    if (changedProperties.has('open') && !this.open) {
      this.lastLoadedSkillId = '';
      this.loadState = 'idle';
      this.skillDetail = null;
      this.errorMessage = '';
      this.isSaving = false;
      this.currentContent = '';
      this.selectedMcpTools = [];
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
      this.currentContent = data.skill.skillContent;
      this.selectedMcpTools = [...(data.skill.mcpTools || [])];
      this.loadState = 'loaded';
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'Fehler beim Laden';
      this.loadState = 'error';
    }
  }

  private handleContentChanged(e: CustomEvent<{ content: string }>): void {
    this.currentContent = e.detail.content;
  }

  private handleMcpToolToggle(toolName: string): void {
    if (this.selectedMcpTools.includes(toolName)) {
      this.selectedMcpTools = this.selectedMcpTools.filter(t => t !== toolName);
    } else {
      this.selectedMcpTools = [...this.selectedMcpTools, toolName];
    }
  }

  private async handleSave(): Promise<void> {
    const projectPath = this.projectCtx?.activeProject?.path;
    if (!projectPath || !this.skillId || this.isSaving) return;

    this.isSaving = true;
    this.errorMessage = '';

    try {
      const encodedPath = encodeURIComponent(projectPath);
      const encodedSkillId = encodeURIComponent(this.skillId);
      const response = await fetch(`/api/team/${encodedPath}/skills/${encodedSkillId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: this.currentContent, mcpTools: this.selectedMcpTools }),
      });

      const result = await response.json() as { success: boolean; error?: string };

      if (!result.success) {
        this.errorMessage = result.error || 'Speichern fehlgeschlagen';
        return;
      }

      // Mark editor save success
      const editor = this.querySelector('aos-file-editor') as HTMLElement & { markSaveSuccess(): void } | null;
      editor?.markSaveSuccess();

      this.open = false;
      this.dispatchEvent(
        new CustomEvent('skill-saved', {
          detail: { skillId: this.skillId },
          bubbles: true,
          composed: true,
        })
      );
    } catch {
      this.errorMessage = 'Server nicht erreichbar';
    } finally {
      this.isSaving = false;
    }
  }

  override render() {
    if (!this.open) {
      return nothing;
    }

    return html`
      <div
        class="team-edit-modal__overlay"
        @click=${this.handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-edit-modal-title"
      >
        <div class="team-edit-modal">
          <header class="team-edit-modal__header">
            <h2 id="team-edit-modal-title" class="team-edit-modal__title">
              ${this.skillDetail ? `${this.skillDetail.name} bearbeiten` : 'Skill bearbeiten'}
            </h2>
            <button
              class="team-edit-modal__close"
              @click=${() => this.closeModal()}
              aria-label="Dialog schliessen"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </header>

          <div class="team-edit-modal__content">
            ${this.renderContent()}
          </div>

          ${this.loadState === 'loaded' ? html`
            <footer class="team-edit-modal__footer">
              ${this.errorMessage ? html`
                <span class="team-edit-modal__error">${this.errorMessage}</span>
              ` : nothing}
              <button
                class="team-edit-modal__btn team-edit-modal__btn--secondary"
                @click=${() => this.closeModal()}
                ?disabled=${this.isSaving}
              >Abbrechen</button>
              <button
                class="team-edit-modal__btn team-edit-modal__btn--primary"
                @click=${this.handleSave}
                ?disabled=${this.isSaving}
              >${this.isSaving ? 'Speichern...' : 'Speichern'}</button>
            </footer>
          ` : nothing}
        </div>
      </div>
    `;
  }

  private renderContent() {
    switch (this.loadState) {
      case 'idle':
      case 'loading':
        return html`
          <div class="team-edit-modal__loading">
            <div class="team-detail-modal__spinner"></div>
            <p>Skill wird geladen...</p>
          </div>
        `;
      case 'error':
        return html`
          <div class="team-edit-modal__error-state">
            <p>${this.errorMessage}</p>
          </div>
        `;
      case 'loaded':
        return html`
          ${this.renderMcpToolsSection()}
          <aos-file-editor
            .content=${this.skillDetail?.skillContent ?? ''}
            .filename=${'SKILL.md'}
            @content-changed=${this.handleContentChanged}
          ></aos-file-editor>
        `;
    }
  }

  private renderMcpToolsSection() {
    if (this.availableMcpTools.length === 0) {
      return nothing;
    }

    return html`
      <div class="team-edit-modal__mcp-section">
        <h4 class="team-edit-modal__mcp-title">MCP Tools</h4>
        <div class="team-edit-modal__mcp-checkboxes">
          ${this.availableMcpTools.map(tool => html`
            <label class="team-edit-modal__mcp-checkbox">
              <input
                type="checkbox"
                .checked=${this.selectedMcpTools.includes(tool)}
                @change=${() => this.handleMcpToolToggle(tool)}
              />
              <span class="team-edit-modal__mcp-label">${tool}</span>
            </label>
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
    'aos-team-edit-modal': AosTeamEditModal;
  }
}
