import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { projectContext, type ProjectContextValue } from '../context/project-context.js';
import { gateway, type MessageHandler } from '../gateway.js';
import { routerService } from '../services/router.service.js';
import { AudioCaptureService } from '../services/audio-capture.service.js';
import { AudioPlaybackService } from '../services/audio-playback.service.js';
import type { AosAudioVisualizer } from '../components/voice/audio-visualizer.js';
import type { InputMode } from '../components/voice/call-controls.js';
import type { VoiceAction } from '../components/voice/action-log.js';
import type { TranscriptMessage } from '../components/voice/call-transcript.js';
import '../components/voice/audio-visualizer.js';
import '../components/voice/call-controls.js';
import '../components/voice/action-log.js';
import '../components/voice/call-transcript.js';

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
  @state() private voiceInputMode: InputMode = 'voice-activity';
  @state() private pttActive = false;
  @state() private isAgentSpeaking = false;
  @state() private actions: VoiceAction[] = [];
  @state() private transcriptMessages: TranscriptMessage[] = [];

  private skillId = '';
  private durationInterval: ReturnType<typeof setInterval> | null = null;
  private captureService: AudioCaptureService | null = null;
  private playbackService: AudioPlaybackService | null = null;
  private vizAudioCtx: AudioContext | null = null;
  private userAnalyser: AnalyserNode | null = null;

  // Gateway handlers
  private boundCallStartedHandler: MessageHandler = () => {
    this.viewState = 'active';
    this.startDurationTimer();
    this.initAudioServices();
  };

  private boundCallEndedHandler: MessageHandler = () => {
    this.viewState = 'ended';
    this.stopDurationTimer();
    this.cleanupAudioServices();
    setTimeout(() => this.navigateBack(), 1500);
  };

  private boundVoiceErrorHandler: MessageHandler = (msg) => {
    const error = (msg.error as string) || (msg.message as string) || 'Voice-Fehler aufgetreten';
    this.errorMessage = error;
    this.viewState = 'error';
    this.stopDurationTimer();
    this.cleanupAudioServices();
  };

  private boundTtsChunkHandler: MessageHandler = (msg) => {
    if (msg.audio && typeof msg.audio === 'string') {
      this.playbackService?.enqueue(msg.audio);
    }
  };

  private boundTtsStartHandler: MessageHandler = () => {
    this.isAgentSpeaking = true;
    this.updateVisualizerMode();
  };

  private boundTtsEndHandler: MessageHandler = () => {
    this.isAgentSpeaking = false;
    this.updateVisualizerMode();
  };

  private boundActionStartHandler: MessageHandler = (msg) => {
    const action: VoiceAction = {
      toolId: (msg.toolId as string) || '',
      toolName: (msg.toolName as string) || 'Unknown Action',
      status: 'running',
      timestamp: (msg.timestamp as string) || new Date().toISOString(),
    };
    this.actions = [...this.actions, action];
  };

  private boundActionCompleteHandler: MessageHandler = (msg) => {
    const toolId = msg.toolId as string;
    this.actions = this.actions.map(a =>
      a.toolId === toolId ? { ...a, status: 'complete' as const, output: msg.output as string } : a
    );
  };

  private boundTranscriptInterimHandler: MessageHandler = (msg) => {
    const text = msg.text as string;
    if (!text) return;

    const last = this.transcriptMessages[this.transcriptMessages.length - 1];
    if (last?.isInterim && last.role === 'user') {
      this.transcriptMessages = [
        ...this.transcriptMessages.slice(0, -1),
        { ...last, text },
      ];
    } else {
      this.transcriptMessages = [...this.transcriptMessages, {
        id: `msg-${Date.now()}`,
        role: 'user',
        text,
        timestamp: new Date().toISOString(),
        isInterim: true,
      }];
    }
  };

  private boundTranscriptFinalHandler: MessageHandler = (msg) => {
    const text = msg.text as string;
    if (!text) return;

    const last = this.transcriptMessages[this.transcriptMessages.length - 1];
    if (last?.isInterim && last.role === 'user') {
      this.transcriptMessages = [
        ...this.transcriptMessages.slice(0, -1),
        { ...last, text, isInterim: false },
      ];
    } else {
      this.transcriptMessages = [...this.transcriptMessages, {
        id: `msg-${Date.now()}`,
        role: 'user',
        text,
        timestamp: new Date().toISOString(),
        isInterim: false,
      }];
    }
  };

  private boundAgentResponseHandler: MessageHandler = (msg) => {
    const text = msg.text as string;
    if (!text) return;

    this.transcriptMessages = [...this.transcriptMessages, {
      id: `msg-${Date.now()}`,
      role: 'agent',
      text,
      timestamp: new Date().toISOString(),
      isInterim: false,
    }];
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
    gateway.on('voice:tts:chunk', this.boundTtsChunkHandler);
    gateway.on('voice:tts:start', this.boundTtsStartHandler);
    gateway.on('voice:tts:end', this.boundTtsEndHandler);
    gateway.on('voice:action:start', this.boundActionStartHandler);
    gateway.on('voice:action:complete', this.boundActionCompleteHandler);
    gateway.on('voice:transcript:interim', this.boundTranscriptInterimHandler);
    gateway.on('voice:transcript:final', this.boundTranscriptFinalHandler);
    gateway.on('voice:agent:response', this.boundAgentResponseHandler);

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
    gateway.off('voice:tts:chunk', this.boundTtsChunkHandler);
    gateway.off('voice:tts:start', this.boundTtsStartHandler);
    gateway.off('voice:tts:end', this.boundTtsEndHandler);
    gateway.off('voice:action:start', this.boundActionStartHandler);
    gateway.off('voice:action:complete', this.boundActionCompleteHandler);
    gateway.off('voice:transcript:interim', this.boundTranscriptInterimHandler);
    gateway.off('voice:transcript:final', this.boundTranscriptFinalHandler);
    gateway.off('voice:agent:response', this.boundAgentResponseHandler);

    // End call if still active
    if (this.callId && (this.viewState === 'connecting' || this.viewState === 'active')) {
      gateway.sendVoiceCallEnd(this.callId);
    }

    this.stopDurationTimer();
    this.cleanupAudioServices();
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
    this.cleanupAudioServices();
    setTimeout(() => this.navigateBack(), 500);
  }

  private navigateBack(): void {
    routerService.navigate('team');
  }

  // --- Audio Service Management ---

  private async initAudioServices(): Promise<void> {
    // Init audio capture (microphone)
    this.captureService = new AudioCaptureService();
    const started = await this.captureService.start(this.callId, {
      onError: (err) => console.error('[VoiceCallView] Capture error:', err),
      onPermissionDenied: () => {
        this.errorMessage = 'Mikrofon-Zugriff verweigert';
        this.viewState = 'error';
      },
    });

    if (started) {
      this.setupUserVisualizer();
      // In PTT mode, start muted (wait for space key)
      if (this.voiceInputMode === 'push-to-talk') {
        this.captureService.mute();
      }
    }

    // Init audio playback (agent TTS)
    this.playbackService = new AudioPlaybackService();
    this.playbackService.init(this.callId);

    this.updateVisualizerMode();
  }

  private cleanupAudioServices(): void {
    this.captureService?.stop();
    this.captureService = null;
    this.playbackService?.destroy();
    this.playbackService = null;
    this.actions = [];
    this.transcriptMessages = [];
    if (this.vizAudioCtx) {
      this.vizAudioCtx.close().catch(() => {});
      this.vizAudioCtx = null;
    }
    this.userAnalyser = null;
  }

  private setupUserVisualizer(): void {
    const stream = this.captureService?.getMediaStream();
    if (!stream) return;

    // Create a separate AudioContext + AnalyserNode for user mic visualization
    this.vizAudioCtx = new AudioContext();
    const source = this.vizAudioCtx.createMediaStreamSource(stream);
    this.userAnalyser = this.vizAudioCtx.createAnalyser();
    this.userAnalyser.fftSize = 128;
    this.userAnalyser.smoothingTimeConstant = 0.8;
    source.connect(this.userAnalyser);
  }

  private updateVisualizerMode(): void {
    const visualizer = this.renderRoot.querySelector('aos-audio-visualizer') as AosAudioVisualizer | null;
    if (!visualizer) return;

    if (this.isAgentSpeaking) {
      const agentAnalyser = this.playbackService?.getAnalyser();
      if (agentAnalyser) {
        visualizer.mode = 'agent';
        visualizer.setAnalyser(agentAnalyser);
      }
    } else {
      if (this.userAnalyser) {
        visualizer.mode = 'user';
        visualizer.setAnalyser(this.userAnalyser);
      }
    }
  }

  // --- Call Control Event Handlers ---

  private handleMuteToggle(): void {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.captureService?.mute();
    } else if (this.voiceInputMode === 'voice-activity') {
      // In VAD mode, unmute resumes continuous capture
      this.captureService?.unmute();
    }
    // In PTT mode, unmute doesn't auto-start; user must hold space
  }

  private handlePttStart(): void {
    this.pttActive = true;
    if (!this.isMuted) {
      this.captureService?.unmute();
    }
  }

  private handlePttEnd(): void {
    this.pttActive = false;
    this.captureService?.mute();
  }

  private handleModeChange(e: CustomEvent<{ mode: InputMode }>): void {
    this.voiceInputMode = e.detail.mode;
    if (this.voiceInputMode === 'voice-activity') {
      // Switching to VAD: start continuous capture (unless muted)
      if (!this.isMuted) {
        this.captureService?.unmute();
      }
      this.pttActive = false;
    } else {
      // Switching to PTT: stop continuous capture (wait for space key)
      this.captureService?.mute();
      this.pttActive = false;
    }
  }

  // --- Timer ---

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

  // --- Render ---

  private renderAvatar() {
    if (this.agentInfo.avatar) {
      return html`<img class="agent-avatar" src="${this.agentInfo.avatar}" alt="${this.agentInfo.name}" />`;
    }

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

      <div class="call-content">
        <aos-audio-visualizer
          ?active=${this.viewState === 'active'}
          mode=${this.isAgentSpeaking ? 'agent' : 'user'}
        ></aos-audio-visualizer>
        <aos-call-transcript .messages=${this.transcriptMessages}></aos-call-transcript>
        <aos-action-log .actions=${this.actions}></aos-action-log>
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

        <div class="call-controls-area">
          ${this.viewState === 'connecting' || this.viewState === 'active' ? html`
            <aos-call-controls
              ?muted=${this.isMuted}
              input-mode=${this.voiceInputMode}
              ?call-active=${this.viewState === 'connecting' || this.viewState === 'active'}
              ?ptt-active=${this.pttActive}
              @mute-toggle=${this.handleMuteToggle}
              @hang-up=${this.endCall}
              @ptt-start=${this.handlePttStart}
              @ptt-end=${this.handlePttEnd}
              @mode-change=${this.handleModeChange}
            ></aos-call-controls>
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

    /* Call Content */
    .call-content {
      width: 100%;
      margin-top: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    aos-call-transcript,
    aos-action-log {
      min-height: 0;
    }

    /* Call Controls Area */
    .call-controls-area {
      display: flex;
      gap: 1.5rem;
      padding: 2rem 0;
      align-items: center;
      justify-content: center;
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
