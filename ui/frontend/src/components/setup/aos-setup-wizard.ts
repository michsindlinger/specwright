import { LitElement, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { gateway, type WebSocketMessage } from '../../gateway.js';

interface SetupStepInfo {
  step: 1 | 2 | 3 | 4;
  name: string;
  status: 'not_installed' | 'installed' | 'running' | 'error';
  details?: string;
  errorMessage?: string;
}

@customElement('aos-setup-wizard')
export class AosSetupWizard extends LitElement {
  @state() private steps: SetupStepInfo[] = [];
  @state() private activeStep: number | null = null;
  @state() private output = '';
  @state() private loading = true;
  @state() private error: string | null = null;
  @state() private devteamHint = false;

  private boundHandlers: Map<string, (msg: WebSocketMessage) => void> = new Map();
  private outputRef: HTMLPreElement | null = null;

  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.setupHandlers();
    this.checkStatus();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeHandlers();
  }

  private setupHandlers(): void {
    const handlers: [string, (msg: WebSocketMessage) => void][] = [
      ['setup:status', (msg) => this.onStatus(msg)],
      ['setup:step-output', (msg) => this.onStepOutput(msg)],
      ['setup:step-complete', (msg) => this.onStepComplete(msg)],
      ['setup:error', (msg) => this.onError(msg)],
      ['setup:devteam-started', () => this.onDevteamStarted()],
      ['cloud-terminal:created', (msg) => this.onCloudTerminalCreated(msg)],
    ];

    for (const [type, handler] of handlers) {
      this.boundHandlers.set(type, handler);
      gateway.on(type, handler);
    }
  }

  private removeHandlers(): void {
    for (const [type, handler] of this.boundHandlers) {
      gateway.off(type, handler);
    }
    this.boundHandlers.clear();
  }

  // --- Actions ---

  private checkStatus(): void {
    gateway.send({
      type: 'setup:check-status',
      timestamp: new Date().toISOString(),
    });
  }

  private runStep(step: 1 | 2 | 3): void {
    this.activeStep = step;
    this.output = '';
    this.updateStepStatus(step, 'running');
    gateway.send({
      type: 'setup:run-step',
      step,
      timestamp: new Date().toISOString(),
    });
  }

  private startDevteam(): void {
    this.devteamHint = true;
    const projectPath = gateway.getProjectPath();
    gateway.send({
      type: 'setup:start-devteam',
      modelConfig: { model: 'claude-sonnet-4-5-20250929', provider: 'anthropic' },
      projectPath: projectPath ?? undefined,
      timestamp: new Date().toISOString(),
    });
  }

  private retryStep(step: 1 | 2 | 3): void {
    this.updateStepStatus(step, 'not_installed');
    this.runStep(step);
  }

  // --- Gateway Handlers ---

  private onStatus(msg: WebSocketMessage): void {
    const steps = msg.steps as Array<{ step: 1 | 2 | 3 | 4; name: string; status: 'not_installed' | 'installed'; details?: string }>;
    this.steps = steps.map((s) => ({
      step: s.step,
      name: s.name,
      status: s.status,
      details: s.details,
    }));
    this.loading = false;
    this.error = null;
  }

  private onStepOutput(msg: WebSocketMessage): void {
    const data = msg.data as string;
    this.output += data;
    this.scrollOutput();
  }

  private onStepComplete(msg: WebSocketMessage): void {
    const step = msg.step as number;
    const success = msg.success as boolean;
    const errorMsg = msg.error as string | undefined;

    this.activeStep = null;

    if (success) {
      this.updateStepStatus(step, 'installed');
      this.output += '\nStep completed successfully\n';
    } else {
      this.updateStepStatus(step, 'error', errorMsg);
      this.output += `\nStep failed${errorMsg ? ': ' + errorMsg : ''}\n`;
    }

    // Refresh status after completion
    this.checkStatus();
  }

  private onError(msg: WebSocketMessage): void {
    const message = msg.message as string;
    this.error = message;
    this.activeStep = null;
    this.loading = false;
  }

  private onDevteamStarted(): void {
    this.devteamHint = true;
  }

  private onCloudTerminalCreated(_msg: WebSocketMessage): void {
    // Show hint when a cloud terminal was opened (could be from setup)
    if (this.devteamHint) {
      // Already showing hint, nothing to do
    }
  }

  // --- Helpers ---

  private updateStepStatus(step: number, status: SetupStepInfo['status'], errorMessage?: string): void {
    this.steps = this.steps.map((s) =>
      s.step === step ? { ...s, status, errorMessage } : s
    );
  }

  private scrollOutput(): void {
    requestAnimationFrame(() => {
      if (!this.outputRef) {
        this.outputRef = this.querySelector('.setup-output') as HTMLPreElement | null;
      }
      if (this.outputRef) {
        this.outputRef.scrollTop = this.outputRef.scrollHeight;
      }
    });
  }

  private get allInstalled(): boolean {
    return this.steps.length > 0 && this.steps.every((s) => s.status === 'installed');
  }

  // --- Render ---

  override render() {
    if (this.loading) {
      return html`
        <div class="setup-wizard">
          <div class="setup-wizard-header">
            <h2>AgentOS Extended Setup</h2>
            <p class="setup-wizard-desc">Checking installation status...</p>
          </div>
          <div class="setup-loading">
            <span class="setup-spinner"></span>
          </div>
        </div>
      `;
    }

    return html`
      <div class="setup-wizard">
        <div class="setup-wizard-header">
          <h2>AgentOS Extended Setup</h2>
          <p class="setup-wizard-desc">Install and configure AgentOS Extended for your project. Complete each step in order.</p>
        </div>

        ${this.error ? html`
          <div class="setup-error-banner">
            <span class="setup-error-icon">!</span>
            <span>${this.error}</span>
            <button class="setup-btn setup-btn-sm" @click=${() => { this.error = null; this.checkStatus(); }}>Retry</button>
          </div>
        ` : nothing}

        ${this.allInstalled ? html`
          <div class="setup-complete-banner">
            <span class="setup-complete-icon">&#10003;</span>
            <span>Setup Complete - All steps have been installed successfully.</span>
          </div>
        ` : nothing}

        <div class="setup-steps">
          ${this.steps.map((step) => this.renderStep(step))}
        </div>

        ${this.output ? html`
          <div class="setup-output-container">
            <div class="setup-output-header">
              <span>Output</span>
              <button class="setup-btn setup-btn-sm" @click=${() => { this.output = ''; this.outputRef = null; }}>Clear</button>
            </div>
            <pre class="setup-output">${this.output}</pre>
          </div>
        ` : nothing}

        ${this.devteamHint ? html`
          <div class="setup-devteam-hint">
            Cloud Terminal has been opened for DevTeam setup. Check the sidebar to follow the progress.
          </div>
        ` : nothing}
      </div>
    `;
  }

  private renderStep(step: SetupStepInfo) {
    const isRunning = step.status === 'running';
    const isInstalled = step.status === 'installed';
    const isError = step.status === 'error';
    const isNotInstalled = step.status === 'not_installed';
    const otherRunning = this.activeStep !== null && this.activeStep !== step.step;

    return html`
      <div class="setup-step ${isInstalled ? 'setup-step--installed' : ''} ${isRunning ? 'setup-step--running' : ''} ${isError ? 'setup-step--error' : ''}">
        <div class="setup-step-status">
          ${isInstalled ? html`<span class="setup-status-icon setup-status-icon--installed">&#10003;</span>` : nothing}
          ${isNotInstalled ? html`<span class="setup-status-icon setup-status-icon--not-installed">&#9675;</span>` : nothing}
          ${isRunning ? html`<span class="setup-spinner setup-spinner--sm"></span>` : nothing}
          ${isError ? html`<span class="setup-status-icon setup-status-icon--error">&#10005;</span>` : nothing}
        </div>
        <div class="setup-step-content">
          <div class="setup-step-name">Step ${step.step}: ${step.name}</div>
          ${step.details ? html`<div class="setup-step-details">${step.details}</div>` : nothing}
          ${isError && step.errorMessage ? html`<div class="setup-step-error">${step.errorMessage}</div>` : nothing}
        </div>
        <div class="setup-step-action">
          ${this.renderStepAction(step, otherRunning)}
        </div>
      </div>
    `;
  }

  private renderStepAction(step: SetupStepInfo, otherRunning: boolean) {
    if (step.status === 'running') {
      return html`<button class="setup-btn" disabled>Running...</button>`;
    }

    if (step.status === 'error') {
      return html`<button class="setup-btn setup-btn-retry" ?disabled=${otherRunning} @click=${() => this.retryStep(step.step as 1 | 2 | 3)}>Retry</button>`;
    }

    if (step.status === 'installed') {
      return html`<span class="setup-step-done">Installed</span>`;
    }

    // not_installed
    if (step.step === 4) {
      return html`<button class="setup-btn setup-btn-primary" ?disabled=${otherRunning} @click=${() => this.startDevteam()}>Open Cloud Terminal</button>`;
    }

    return html`<button class="setup-btn setup-btn-primary" ?disabled=${otherRunning} @click=${() => this.runStep(step.step as 1 | 2 | 3)}>Install</button>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-setup-wizard': AosSetupWizard;
  }
}
