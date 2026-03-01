import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { projectContext, type ProjectContextValue } from '../context/project-context.js';
import { gateway, type MessageHandler } from '../gateway.js';
import { routerService } from '../services/router.service.js';

type CallViewState = 'connecting' | 'active' | 'ended' | 'error';

interface AgentInfo {
  name: string;
  role: string;
  avatar: string | null;
}

@customElement('aos-voice-call-view')
export class AosVoiceCallView extends LitElement {
  @consume({ context: projectContext, subscribe: true })
  private projectCtx!: ProjectContextValue;

  @state() private viewState: CallViewState = 'connecting';
  @state() private agentInfo: AgentInfo = { name: '', role: '', avatar: null };
  @state() private callId = '';
  @state() private errorMessage = '';
  @state() private isMuted = false;
  @state() private callDuration = 0;

  private skillId = '';
  private durationInterval: ReturnType<typeof setInterval> | null = null;

  // Gateway handlers
  private boundCallStartedHandler: MessageHandler = () => {
    this.viewState = 'active';
    this.startDurationTimer();
  };

  private boundCallEndedHandler: MessageHandler = () => {
    this.viewState = 'ended';
    this.stopDurationTimer();
    setTimeout(() => this.navigateBack(), 1500);
  };

  private boundVoiceErrorHandler: MessageHandler = (msg) => {
    const error = (msg.error as string) || (msg.message as string) || 'Voice-Fehler aufgetreten';
    this.errorMessage = error;
    this.viewState = 'error';
    this.stopDurationTimer();
  };

  override connectedCallback(): void {
    super.connectedCallback();

    // Extract skillId from route segments: #/call/:skillId
    const route = routerService.getCurrentRoute();
    this.skillId = route?.segments?.[0] || '';

    if (!this.skillId) {
      this.errorMessage = 'Kein Agent ausgewaehlt';
      this.viewState = 'error';
      return;
    }

    // Register gateway listeners
    gateway.on('voice:call:started', this.boundCallStartedHandler);
    gateway.on('voice:call:ended', this.boundCallEndedHandler);
    gateway.on('voice:error', this.boundVoiceErrorHandler);

    // Load agent info and start call
    this.loadAgentInfo();
    this.startCall();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();

    // Clean up gateway listeners
    gateway.off('voice:call:started', this.boundCallStartedHandler);
    gateway.off('voice:call:ended', this.boundCallEndedHandler);
    gateway.off('voice:error', this.boundVoiceErrorHandler);

    // End call if still active
    if (this.callId && (this.viewState === 'connecting' || this.viewState === 'active')) {
      gateway.sendVoiceCallEnd(this.callId);
    }

    this.stopDurationTimer();
  }

  private async loadAgentInfo(): Promise<void> {
    const projectPath = this.projectCtx?.activeProject?.path;
    if (!projectPath || !this.skillId) return;

    try {
      const encodedPath = encodeURIComponent(projectPath);
      const response = await fetch(`/api/team/${encodedPath}/skills/${this.skillId}`);

      if (response.ok) {
        const data = await response.json() as { success: boolean; skill?: { name: string; role: string; avatar?: string } };
        if (data.success && data.skill) {
          this.agentInfo = {
            name: data.skill.name || this.skillId,
            role: data.skill.role || 'Agent',
            avatar: data.skill.avatar || null,
          };
          return;
        }
      }
    } catch {
      // Fallback to skillId as name
    }

    // Fallback
    this.agentInfo = {
      name: this.skillId,
      role: 'Agent',
      avatar: null,
    };
  }

  private startCall(): void {
    this.callId = `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.viewState = 'connecting';

    gateway.send({
      type: 'voice:call:start',
      callId: this.callId,
      agentId: this.skillId,
      agentName: this.agentInfo.name || this.skillId,
      timestamp: new Date().toISOString(),
    });
  }

  private endCall(): void {
    if (this.callId) {
      gateway.sendVoiceCallEnd(this.callId);
    }
    this.viewState = 'ended';
    this.stopDurationTimer();
    setTimeout(() => this.navigateBack(), 500);
  }

  private toggleMute(): void {
    this.isMuted = !this.isMuted;
  }

  private navigateBack(): void {
    routerService.navigate('team');
  }

  private startDurationTimer(): void {
    this.callDuration = 0;
    this.durationInterval = setInterval(() => {
      this.callDuration++;
    }, 1000);
  }

  private stopDurationTimer(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private renderAvatar() {
    if (this.agentInfo.avatar) {
      return html`<img class="agent-avatar" src="${this.agentInfo.avatar}" alt="${this.agentInfo.name}" />`;
    }

    // Default avatar with initials
    const initials = this.agentInfo.name
      ? this.agentInfo.name.charAt(0).toUpperCase()
      : '?';
    return html`<div class="agent-avatar agent-avatar--default">${initials}</div>`;
  }

  private renderConnecting() {
    return html`
      <div class="call-status">
        <div class="pulse-ring"></div>
        ${this.renderAvatar()}
      </div>
      <h2 class="agent-name">${this.agentInfo.name || 'Verbinde...'}</h2>
      <p class="agent-role">${this.agentInfo.role}</p>
      <p class="status-text">Verbindung wird hergestellt...</p>
    `;
  }

  private renderActive() {
    return html`
      <div class="call-status call-status--active">
        ${this.renderAvatar()}
      </div>
      <h2 class="agent-name">${this.agentInfo.name}</h2>
      <p class="agent-role">${this.agentInfo.role}</p>
      <p class="status-text status-text--active">${this.formatDuration(this.callDuration)}</p>

      <!-- Slots for future stories (VCF-007, VCF-008) -->
      <div class="call-content">
        <div class="visualizer-slot" id="visualizer-area"></div>
        <div class="transcript-slot" id="transcript-area"></div>
        <div class="action-log-slot" id="action-log-area"></div>
      </div>
    `;
  }

  private renderEnded() {
    return html`
      <div class="call-status call-status--ended">
        ${this.renderAvatar()}
      </div>
      <h2 class="agent-name">${this.agentInfo.name}</h2>
      <p class="status-text">Anruf beendet</p>
    `;
  }

  private renderError() {
    return html`
      <div class="call-status call-status--error">
        <div class="error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
      </div>
      <h2 class="agent-name">Verbindungsfehler</h2>
      <p class="status-text status-text--error">${this.errorMessage}</p>
      <a class="settings-link" href="#/settings">Voice-Einstellungen oeffnen</a>
    `;
  }

  override render() {
    return html`
      <div class="call-view">
        <div class="call-center">
          ${this.viewState === 'connecting' ? this.renderConnecting() : nothing}
          ${this.viewState === 'active' ? this.renderActive() : nothing}
          ${this.viewState === 'ended' ? this.renderEnded() : nothing}
          ${this.viewState === 'error' ? this.renderError() : nothing}
        </div>

        <div class="call-controls">
          ${this.viewState === 'connecting' || this.viewState === 'active' ? html`
            <button
              class="control-btn ${this.isMuted ? 'control-btn--active' : ''}"
              @click=${this.toggleMute}
              title="${this.isMuted ? 'Unmute' : 'Mute'}"
            >
              ${this.isMuted ? html`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23"/>
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              ` : html`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              `}
            </button>
            <button
              class="control-btn control-btn--hangup"
              @click=${this.endCall}
              title="Auflegen"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/>
                <line x1="23" y1="1" x2="1" y2="23"/>
              </svg>
            </button>
          ` : nothing}

          ${this.viewState === 'error' ? html`
            <button
              class="control-btn control-btn--back"
              @click=${this.navigateBack}
              title="Zurueck"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
            </button>
          ` : nothing}
        </div>
      </div>
    `;
  }

  static override styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .call-view {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: calc(100vh - 140px);
      padding: 2rem;
      background: var(--color-bg-primary, #0a0a0f);
      position: relative;
    }

    .call-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      flex: 1;
      justify-content: center;
      max-width: 600px;
      width: 100%;
    }

    /* Avatar */
    .agent-avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
    }

    .agent-avatar--default {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-bg-tertiary, #1e1e2e);
      border: 2px solid var(--color-border-secondary, #2a2a3e);
      color: var(--color-text-primary, #e0e0e0);
      font-size: 2.5rem;
      font-weight: 600;
    }

    /* Call Status */
    .call-status {
      position: relative;
      margin-bottom: 1.5rem;
    }

    .call-status--active .agent-avatar {
      border: 3px solid var(--color-accent-green, #4ade80);
    }

    .call-status--ended .agent-avatar {
      opacity: 0.5;
    }

    .call-status--error {
      color: var(--color-accent-red, #f87171);
    }

    .error-icon {
      width: 120px;
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: rgba(248, 113, 113, 0.1);
      border: 2px solid var(--color-accent-red, #f87171);
      color: var(--color-accent-red, #f87171);
    }

    /* Pulse ring animation for connecting */
    .pulse-ring {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 120px;
      height: 120px;
      border-radius: 50%;
      border: 2px solid var(--color-accent-primary, #818cf8);
      animation: pulse 1.5s ease-out infinite;
    }

    @keyframes pulse {
      0% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
      100% {
        transform: translate(-50%, -50%) scale(1.8);
        opacity: 0;
      }
    }

    /* Agent Info */
    .agent-name {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text-primary, #e0e0e0);
    }

    .agent-role {
      margin: 0.25rem 0 0;
      font-size: 0.875rem;
      color: var(--color-text-secondary, #a0a0b0);
    }

    .status-text {
      margin: 1rem 0 0;
      font-size: 0.875rem;
      color: var(--color-text-tertiary, #707080);
    }

    .status-text--active {
      font-variant-numeric: tabular-nums;
      color: var(--color-accent-green, #4ade80);
    }

    .status-text--error {
      color: var(--color-accent-red, #f87171);
      max-width: 300px;
    }

    .settings-link {
      display: inline-block;
      margin-top: 1rem;
      color: var(--color-accent-primary, #818cf8);
      text-decoration: none;
      font-size: 0.875rem;
    }

    .settings-link:hover {
      text-decoration: underline;
    }

    /* Call Content (slots for future stories) */
    .call-content {
      width: 100%;
      margin-top: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .visualizer-slot,
    .transcript-slot,
    .action-log-slot {
      min-height: 0;
    }

    /* Call Controls */
    .call-controls {
      display: flex;
      gap: 1.5rem;
      padding: 2rem 0;
      align-items: center;
    }

    .control-btn {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-bg-tertiary, #1e1e2e);
      color: var(--color-text-primary, #e0e0e0);
      transition: background 0.15s, transform 0.1s;
    }

    .control-btn:hover {
      background: var(--color-bg-secondary, #16162a);
      transform: scale(1.05);
    }

    .control-btn:active {
      transform: scale(0.95);
    }

    .control-btn--active {
      background: var(--color-accent-primary, #818cf8);
      color: white;
    }

    .control-btn--hangup {
      width: 64px;
      height: 64px;
      background: var(--color-accent-red, #f87171);
      color: white;
    }

    .control-btn--hangup:hover {
      background: #ef4444;
    }

    .control-btn--back {
      background: var(--color-bg-tertiary, #1e1e2e);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-voice-call-view': AosVoiceCallView;
  }
}
