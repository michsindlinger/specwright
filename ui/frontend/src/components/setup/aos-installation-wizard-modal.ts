import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { gateway, type WebSocketMessage } from '../../gateway.js';
import { projectStateService } from '../../services/project-state.service.js';
import '../terminal/aos-terminal-session.js';
import type { TerminalSession } from '../terminal/aos-cloud-terminal-sidebar.js';

/**
 * Wizard step type for the installation wizard.
 * - install: Framework installation step (install.sh)
 * - selection: Planning command selection step
 * - terminal: Terminal execution step (IW-003)
 * - complete: Wizard complete step
 */
export type WizardStep = 'migrate' | 'install' | 'selection' | 'terminal' | 'complete';

/**
 * Planning command option for the selection step.
 */
export interface PlanningCommand {
  id: string;
  title: string;
  description: string;
}

/**
 * Event detail for command-selected event.
 */
export interface CommandSelectedDetail {
  command: string;
  projectPath: string;
}

/**
 * Terminal mode: whether terminal is running install.sh or a planning command.
 */
type TerminalMode = 'migrate' | 'install' | 'planning';

/**
 * Available planning commands.
 */
const PLANNING_COMMANDS: PlanningCommand[] = [
  {
    id: 'plan-product',
    title: 'Plan Product',
    description: 'Fuer ein einzelnes Produkt/Projekt planen',
  },
  {
    id: 'plan-platform',
    title: 'Plan Platform',
    description: 'Fuer eine Multi-Modul-Plattform planen',
  },
  {
    id: 'analyze-product',
    title: 'Analyze Product',
    description: 'Bestehendes Produkt analysieren und Specwright integrieren',
  },
  {
    id: 'analyze-platform',
    title: 'Analyze Platform',
    description: 'Bestehende Plattform analysieren und Specwright integrieren',
  },
];

/**
 * Threshold for file count to show the "existing project" hint.
 */
const EXISTING_PROJECT_FILE_THRESHOLD = 10;
const TERMINAL_READY_DELAY = 500;
const AUTO_ADVANCE_DELAY = 1500;

/**
 * Modal wizard for Specwright installation and planning command selection.
 *
 * Shows a multi-step wizard:
 * 1. Install step (if hasSpecwright is false) - prompts to run install.sh
 * 2. Selection step - shows four planning command cards
 *
 * @fires command-selected - Fired when a planning command is selected. Detail: { command: string, projectPath: string }
 * @fires wizard-cancel - Fired when the wizard is cancelled
 * @fires modal-close - Fired when the modal is closed
 * @fires install-requested - Fired when the user clicks the install button. Detail: { projectPath: string }
 */
@customElement('aos-installation-wizard-modal')
export class AosInstallationWizardModal extends LitElement {
  /** Whether the modal is currently open */
  @property({ type: Boolean, reflect: true }) open = false;

  /** Whether the project has specwright/ installed */
  @property({ type: Boolean }) hasSpecwright = false;

  /** Whether the project has a product brief */
  @property({ type: Boolean }) hasProductBrief = false;

  /** Number of top-level files/dirs in the project */
  @property({ type: Number }) fileCount = 0;

  /** Whether the project uses agent-os/ and needs migration */
  @property({ type: Boolean }) needsMigration = false;

  /** Path to the project */
  @property({ type: String }) projectPath = '';

  /** Current wizard step */
  @state() private currentStep: WizardStep = 'install';

  /** Whether install.sh is currently running */
  @state() private isInstalling = false;

  /** Whether installation completed successfully */
  @state() private installComplete = false;

  /** Error message from installation */
  @state() private installError: string | null = null;

  /** Terminal session object for aos-terminal-session */
  @state() private terminalSession: TerminalSession | null = null;

  /** Backend terminal session ID (set after cloud-terminal:created) */
  @state() private terminalSessionId: string | null = null;

  /** What the terminal is running: install.sh or a planning command */
  @state() private terminalMode: TerminalMode = 'install';

  /** The command being executed (for display) */
  @state() private terminalCommand = '';

  /** Whether the terminal command completed successfully */
  @state() private terminalComplete = false;

  /** Terminal error message */
  @state() private terminalError: string | null = null;

  /** Whether the cancel confirmation overlay is visible */
  @state() private showCancelConfirm = false;

  private boundKeyHandler = this.handleKeyDown.bind(this);
  private boundHandleSessionCreated = this.handleTerminalSessionCreated.bind(this);
  private boundHandleSessionError = this.handleTerminalSessionError.bind(this);
  private boundHandleSessionClosed = this.handleTerminalSessionClosed.bind(this);

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('keydown', this.boundKeyHandler);
    gateway.on('cloud-terminal:created', this.boundHandleSessionCreated);
    gateway.on('cloud-terminal:error', this.boundHandleSessionError);
    gateway.on('cloud-terminal:closed', this.boundHandleSessionClosed);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.boundKeyHandler);
    gateway.off('cloud-terminal:created', this.boundHandleSessionCreated);
    gateway.off('cloud-terminal:error', this.boundHandleSessionError);
    gateway.off('cloud-terminal:closed', this.boundHandleSessionClosed);
  }

  override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('open') && this.open) {
      this.currentStep = this.needsMigration ? 'migrate' : this.hasSpecwright ? 'selection' : 'install';
      this.isInstalling = false;
      this.installComplete = false;
      this.installError = null;
      this.terminalSession = null;
      this.terminalSessionId = null;
      this.terminalComplete = false;
      this.terminalError = null;
      this.terminalCommand = '';
      this.showCancelConfirm = false;
      // Mark wizard as needed so it reappears after cancel
      if (this.projectPath) {
        projectStateService.setWizardNeeded(this.projectPath);
      }
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.open) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      if (this.showCancelConfirm) {
        // ESC on confirm overlay = dismiss overlay, stay in wizard
        this.showCancelConfirm = false;
      } else {
        this.showCancelConfirmation();
      }
      return;
    }

    // Focus trap
    if (e.key === 'Tab') {
      const focusableElements = this.querySelectorAll<HTMLElement>(
        'button, [tabindex]:not([tabindex="-1"])'
      );
      const focusable = Array.from(focusableElements);
      if (focusable.length === 0) return;

      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
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

  private handleCancel(): void {
    this.showCancelConfirmation();
  }

  /**
   * Show the cancel confirmation overlay with a context-dependent message.
   */
  private showCancelConfirmation(): void {
    this.showCancelConfirm = true;
  }

  /**
   * Get the context-dependent cancellation message.
   */
  private getCancelMessage(): string {
    if (this.needsMigration) {
      return 'Die Migration von Agent OS zu Specwright wird empfohlen. Das Projekt funktioniert auch ohne Migration.';
    }
    if (!this.hasSpecwright) {
      return 'Specwright muss erst installiert werden damit die UI voll nutzbar ist';
    }
    if (!this.hasProductBrief) {
      return 'Ein Product/Platform Brief wird empfohlen um Specwright optimal zu nutzen';
    }
    return 'Der Setup-Wizard wurde noch nicht abgeschlossen';
  }

  /**
   * User confirms the cancellation. Terminate any running terminal, emit event, close modal.
   */
  private confirmCancel(): void {
    // Terminate running terminal session if any
    if (this.terminalSessionId && this.currentStep === 'terminal') {
      gateway.send({
        type: 'cloud-terminal:kill',
        sessionId: this.terminalSessionId,
        timestamp: new Date().toISOString(),
      });
    }

    this.showCancelConfirm = false;
    // Wizard state stays in sessionStorage (wizardNeeded) so wizard reappears next time
    this.dispatchEvent(
      new CustomEvent('wizard-cancel', {
        bubbles: true,
        composed: true,
      })
    );
    this.closeModal();
  }

  /**
   * User dismisses the cancel confirmation, staying in the wizard.
   */
  private dismissCancelConfirm(): void {
    this.showCancelConfirm = false;
  }

  private handleOverlayClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) {
      this.showCancelConfirmation();
    }
  }

  private handleInstallClick(): void {
    this.startTerminal('install', 'curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/install.sh | bash -s -- --yes --all');
  }

  private handleMigrateClick(): void {
    this.startTerminal('migrate', 'curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/migrate-to-specwright.sh | bash -s -- --yes --no-symlinks');
  }

  /**
   * Called externally when install.sh completes successfully.
   * Advances the wizard to the selection step.
   */
  public installSucceeded(): void {
    this.isInstalling = false;
    this.installComplete = true;
    this.installError = null;
    // Auto-advance to selection step after brief delay
    setTimeout(() => {
      this.currentStep = 'selection';
    }, 800);
  }

  /**
   * Called externally when install.sh fails.
   */
  public installFailed(error: string): void {
    this.isInstalling = false;
    this.installComplete = false;
    this.installError = error;
  }

  private handleCommandSelect(commandId: string): void {
    this.startTerminal('planning', `/specwright:${commandId}`);
  }

  // --- Terminal Integration (IW-003) ---

  /**
   * Start a terminal session for either install.sh/migrate or a planning command.
   * - install/migrate: Creates a shell terminal and sends the command as shell input.
   * - planning: Creates a Claude Code workflow terminal that executes the slash command.
   */
  private startTerminal(mode: TerminalMode, command: string): void {
    this.terminalMode = mode;
    this.terminalCommand = command;
    this.terminalComplete = false;
    this.terminalError = null;

    const sessionId = `wizard-${mode}-${Date.now()}`;
    const sessionNames: Record<TerminalMode, string> = {
      migrate: 'Migration',
      install: 'Installation',
      planning: 'Planning',
    };
    this.terminalSession = {
      id: sessionId,
      name: sessionNames[mode],
      status: 'active',
      createdAt: new Date(),
      projectPath: this.projectPath,
      isWorkflow: mode === 'planning',
      ...(mode === 'planning' ? {
        workflowName: command.replace(/^\//, ''),
        modelId: 'claude-sonnet-4-5-20250929',
        providerId: 'anthropic',
      } : {}),
    };
    this.terminalSessionId = null;

    // Switch to terminal step
    this.currentStep = 'terminal';

    if (mode === 'planning') {
      // Planning commands use Claude Code workflow terminal
      const workflowName = command.replace(/^\//, '');
      gateway.send({
        type: 'cloud-terminal:create-workflow',
        requestId: sessionId,
        projectPath: this.projectPath,
        workflowMetadata: {
          workflowCommand: command,
          workflowName,
        },
        modelConfig: {
          model: 'claude-sonnet-4-5-20250929',
          provider: 'anthropic',
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      // Install/migrate commands use a plain shell terminal
      gateway.send({
        type: 'cloud-terminal:create',
        requestId: sessionId,
        projectPath: this.projectPath,
        terminalType: 'shell' as const,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle cloud-terminal:created event from gateway.
   * For shell terminals: sends the initial command after a brief delay.
   * For workflow terminals: Claude Code handles the command automatically.
   */
  private handleTerminalSessionCreated(message: WebSocketMessage): void {
    if (!this.terminalSession) return;
    if (message.requestId !== this.terminalSession.id) return;

    const sessionId = message.sessionId as string;
    if (sessionId) {
      this.terminalSessionId = sessionId;

      // Only send manual input for shell terminals (install/migrate).
      // Workflow terminals (planning) auto-execute via Claude Code CLI.
      if (this.terminalMode !== 'planning') {
        setTimeout(() => {
          gateway.send({
            type: 'cloud-terminal:input',
            sessionId,
            data: this.terminalCommand + '\n',
            timestamp: new Date().toISOString(),
          });
        }, TERMINAL_READY_DELAY);
      }
    }
  }

  /**
   * Handle cloud-terminal:error event from gateway.
   */
  private handleTerminalSessionError(message: WebSocketMessage): void {
    if (!this.terminalSession) return;
    // Only handle errors for our session
    const errorSessionId = message.sessionId as string | undefined;
    if (errorSessionId && errorSessionId !== this.terminalSessionId) return;
    // Also skip if no session ID and we haven't connected yet
    if (!errorSessionId && message.requestId !== this.terminalSession.id) return;

    this.terminalError = (message.message as string) || 'Verbindung zum Terminal fehlgeschlagen';
  }

  /**
   * Handle cloud-terminal:closed event from gateway.
   * When the terminal process exits, check exit code for success/failure.
   */
  private handleTerminalSessionClosed(message: WebSocketMessage): void {
    if (!this.terminalSessionId) return;
    if (message.sessionId !== this.terminalSessionId) return;

    const exitCode = message.exitCode as number | undefined;
    if (exitCode === 0) {
      this.terminalComplete = true;
      this.terminalError = null;

      if (this.terminalMode === 'install' || this.terminalMode === 'migrate') {
        // Install/migrate completed - auto-advance to selection after brief delay
        setTimeout(() => {
          this.currentStep = 'selection';
          this.terminalSession = null;
          this.terminalSessionId = null;
        }, AUTO_ADVANCE_DELAY);
      } else {
        // Planning command completed - user will click "Fertig" to dispatch event
      }
    } else {
      this.terminalError = exitCode !== undefined
        ? `Prozess beendet mit Exit Code ${exitCode}`
        : 'Prozess wurde unerwartet beendet';
    }
  }

  /**
   * Retry the terminal command after an error.
   */
  private handleTerminalRetry(): void {
    this.startTerminal(this.terminalMode, this.terminalCommand);
  }

  /**
   * Continue to next step after successful terminal execution.
   */
  private handleTerminalContinue(): void {
    if (this.terminalMode === 'install' || this.terminalMode === 'migrate') {
      this.currentStep = 'selection';
      this.terminalSession = null;
      this.terminalSessionId = null;
    } else {
      // Planning command completed successfully - dispatch event and close wizard
      this.dispatchEvent(
        new CustomEvent<CommandSelectedDetail>('command-selected', {
          detail: { command: this.terminalCommand, projectPath: this.projectPath },
          bubbles: true,
          composed: true,
        })
      );
      if (this.projectPath) {
        projectStateService.clearWizardNeeded(this.projectPath);
      }
      this.closeModal();
    }
  }

  private get isExistingProject(): boolean {
    return this.fileCount >= EXISTING_PROJECT_FILE_THRESHOLD;
  }

  // --- Icon Renderers (Lucide-style inline SVGs) ---

  private renderCommandIcon(commandId: string) {
    switch (commandId) {
      case 'plan-product':
        // Book icon
        return html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`;
      case 'plan-platform':
        // Grid/Layout icon
        return html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>`;
      case 'analyze-product':
        // Search/Analyze icon
        return html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
      case 'analyze-platform':
        // Activity/Chart icon
        return html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`;
      default:
        return nothing;
    }
  }

  // --- Render ---

  private renderCheckIcon() {
    return html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  }

  private renderStepIndicator() {
    // Migration flow: Migration -> Planning -> Terminal
    if (this.needsMigration) {
      const migrateDone = this.currentStep === 'selection' || this.currentStep === 'terminal';
      const selectionDone = this.currentStep === 'terminal' && this.terminalMode === 'planning';
      const isTerminalStep = this.currentStep === 'terminal';
      // During migrate terminal step, migration is still in progress
      const isMigrateTerminal = isTerminalStep && this.terminalMode === 'migrate';

      return html`
        <div class="installation-wizard__steps">
          <div class="installation-wizard__step-indicator ${migrateDone ? 'installation-wizard__step-indicator--completed' : 'installation-wizard__step-indicator--active'}">
            <span class="installation-wizard__step-number">
              ${migrateDone ? this.renderCheckIcon() : '1'}
            </span>
            <span class="installation-wizard__step-label">Migration</span>
          </div>
          <div class="installation-wizard__step-divider ${migrateDone ? 'installation-wizard__step-divider--active' : ''}"></div>
          <div class="installation-wizard__step-indicator ${selectionDone ? 'installation-wizard__step-indicator--completed' : this.currentStep === 'selection' ? 'installation-wizard__step-indicator--active' : ''}">
            <span class="installation-wizard__step-number">
              ${selectionDone ? this.renderCheckIcon() : '2'}
            </span>
            <span class="installation-wizard__step-label">Planning</span>
          </div>
          ${isTerminalStep && !isMigrateTerminal ? html`
            <div class="installation-wizard__step-divider installation-wizard__step-divider--active"></div>
            <div class="installation-wizard__step-indicator installation-wizard__step-indicator--active">
              <span class="installation-wizard__step-number">3</span>
              <span class="installation-wizard__step-label">Terminal</span>
            </div>
          ` : nothing}
        </div>
      `;
    }

    if (this.hasSpecwright) {
      // Only show planning + terminal steps when specwright already installed
      if (this.currentStep === 'terminal') {
        return html`
          <div class="installation-wizard__steps">
            <div class="installation-wizard__step-indicator installation-wizard__step-indicator--completed">
              <span class="installation-wizard__step-number">
                ${this.renderCheckIcon()}
              </span>
              <span class="installation-wizard__step-label">Planning</span>
            </div>
            <div class="installation-wizard__step-divider installation-wizard__step-divider--active"></div>
            <div class="installation-wizard__step-indicator installation-wizard__step-indicator--active">
              <span class="installation-wizard__step-number">2</span>
              <span class="installation-wizard__step-label">Terminal</span>
            </div>
          </div>
        `;
      }
      return nothing;
    }

    const installDone = this.currentStep === 'selection' || this.currentStep === 'terminal';
    const selectionDone = this.currentStep === 'terminal' && this.terminalMode === 'planning';
    const isTerminalStep = this.currentStep === 'terminal';

    return html`
      <div class="installation-wizard__steps">
        <div class="installation-wizard__step-indicator ${installDone ? 'installation-wizard__step-indicator--completed' : 'installation-wizard__step-indicator--active'}">
          <span class="installation-wizard__step-number">
            ${installDone ? this.renderCheckIcon() : '1'}
          </span>
          <span class="installation-wizard__step-label">Installation</span>
        </div>
        <div class="installation-wizard__step-divider ${installDone ? 'installation-wizard__step-divider--active' : ''}"></div>
        <div class="installation-wizard__step-indicator ${selectionDone ? 'installation-wizard__step-indicator--completed' : this.currentStep === 'selection' ? 'installation-wizard__step-indicator--active' : ''}">
          <span class="installation-wizard__step-number">
            ${selectionDone ? this.renderCheckIcon() : '2'}
          </span>
          <span class="installation-wizard__step-label">Planning</span>
        </div>
        ${isTerminalStep ? html`
          <div class="installation-wizard__step-divider ${isTerminalStep ? 'installation-wizard__step-divider--active' : ''}"></div>
          <div class="installation-wizard__step-indicator ${isTerminalStep ? 'installation-wizard__step-indicator--active' : ''}">
            <span class="installation-wizard__step-number">3</span>
            <span class="installation-wizard__step-label">Terminal</span>
          </div>
        ` : nothing}
      </div>
    `;
  }

  private renderMigrateStep() {
    return html`
      <div class="installation-wizard__install-step">
        <div class="installation-wizard__install-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="17 1 21 5 17 9"></polyline>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
            <polyline points="7 23 3 19 7 15"></polyline>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
          </svg>
        </div>
        <h3 class="installation-wizard__install-title">Migration zu Specwright</h3>
        <p class="installation-wizard__install-desc">
          Dieses Projekt verwendet noch die alte <code>agent-os/</code> Verzeichnisstruktur.
          Migriere zu <code>specwright/</code> fuer die aktuelle Version.
        </p>

        <button
          class="installation-wizard__install-button"
          @click=${this.handleMigrateClick}
        >
          Migration starten
        </button>

        <p class="installation-wizard__install-hint">
          Benennt <code>agent-os/</code> in <code>specwright/</code> um und aktualisiert alle Referenzen.
        </p>
      </div>
    `;
  }

  private renderInstallStep() {
    return html`
      <div class="installation-wizard__install-step">
        <div class="installation-wizard__install-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
        </div>
        <h3 class="installation-wizard__install-title">Specwright Framework installieren</h3>
        <p class="installation-wizard__install-desc">
          Dieses Projekt hat noch kein Specwright Framework. Installiere es, um mit der Projektplanung zu beginnen.
        </p>

        ${this.installError
          ? html`
              <div class="installation-wizard__error" role="alert">
                ${this.installError}
              </div>
            `
          : nothing}

        ${this.installComplete
          ? html`
              <div class="installation-wizard__success" role="status">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Installation erfolgreich! Weiter zum Planning...
              </div>
            `
          : nothing}

        <button
          class="installation-wizard__install-button"
          @click=${this.handleInstallClick}
          ?disabled=${this.isInstalling || this.installComplete}
        >
          ${this.isInstalling
            ? html`<span class="installation-wizard__spinner"></span> Installiere...`
            : this.installComplete
              ? 'Installiert'
              : 'Framework installieren'}
        </button>

        <p class="installation-wizard__install-hint">
          Fuehrt <code>install.sh --yes --all</code> im Projektverzeichnis aus.
        </p>
      </div>
    `;
  }

  private renderSelectionStep() {
    return html`
      <div class="installation-wizard__selection-step">
        <h3 class="installation-wizard__selection-title">Wie moechtest du starten?</h3>
        <p class="installation-wizard__selection-desc">
          Waehle einen Planungsansatz fuer dein Projekt:
        </p>

        ${this.isExistingProject
          ? html`
              <div class="installation-wizard__existing-hint" role="note">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                <span>
                  Dieses Projekt hat bereits ${this.fileCount} Dateien/Ordner.
                  Fuer Bestandsprojekte wird <strong>Analyze Product</strong> oder
                  <strong>Analyze Platform</strong> empfohlen.
                </span>
              </div>
            `
          : nothing}

        <div class="installation-wizard__commands">
          ${PLANNING_COMMANDS.map(
            (cmd) => html`
              <div
                class="installation-wizard__command-card ${this.isExistingProject && (cmd.id === 'analyze-product' || cmd.id === 'analyze-platform') ? 'installation-wizard__command-card--recommended' : ''}"
                role="button"
                tabindex="0"
                aria-label="${cmd.title}: ${cmd.description}"
                @click=${() => this.handleCommandSelect(cmd.id)}
                @keydown=${(e: KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleCommandSelect(cmd.id);
                  }
                }}
              >
                <span class="installation-wizard__command-icon">${this.renderCommandIcon(cmd.id)}</span>
                <div class="installation-wizard__command-info">
                  <span class="installation-wizard__command-title">${cmd.title}</span>
                  <span class="installation-wizard__command-desc">${cmd.description}</span>
                </div>
                ${this.isExistingProject && (cmd.id === 'analyze-product' || cmd.id === 'analyze-platform')
                  ? html`<span class="installation-wizard__command-badge">Empfohlen</span>`
                  : nothing}
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  private renderTerminalStep() {
    return html`
      <div class="installation-wizard__terminal-step">
        <div class="installation-wizard__terminal-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 17 10 11 4 5"></polyline>
            <line x1="12" y1="19" x2="20" y2="19"></line>
          </svg>
          <span class="installation-wizard__terminal-title">
            ${this.terminalMode === 'migrate' ? 'Migration ausfuehren' : this.terminalMode === 'install' ? 'Framework installieren' : 'Planning starten'}
          </span>
          <code class="installation-wizard__terminal-cmd">${this.terminalCommand}</code>
        </div>

        <div class="installation-wizard__terminal-container">
          ${this.terminalSession
            ? html`
                <aos-terminal-session
                  .session=${this.terminalSession}
                  .isActive=${true}
                  .terminalSessionId=${this.terminalSessionId}
                ></aos-terminal-session>
              `
            : nothing}
        </div>

        ${this.terminalComplete
          ? html`
              <div class="installation-wizard__success" role="status">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ${this.terminalMode === 'migrate'
                  ? 'Migration erfolgreich! Weiter zum Planning...'
                  : this.terminalMode === 'install'
                    ? 'Installation erfolgreich! Weiter zum Planning...'
                    : 'Command erfolgreich abgeschlossen!'}
              </div>
            `
          : nothing}

        ${this.terminalError
          ? html`
              <div class="installation-wizard__error" role="alert">
                ${this.terminalError}
              </div>
              <div class="installation-wizard__terminal-actions">
                <button
                  class="installation-wizard__install-button"
                  @click=${this.handleTerminalRetry}
                >
                  Erneut versuchen
                </button>
              </div>
            `
          : nothing}

        ${this.terminalComplete
          ? html`
              <div class="installation-wizard__terminal-actions">
                <button
                  class="installation-wizard__install-button"
                  @click=${this.handleTerminalContinue}
                >
                  ${this.terminalMode === 'install' || this.terminalMode === 'migrate' ? 'Weiter zum Planning' : 'Fertig'}
                </button>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private renderCancelConfirm() {
    return html`
      <div class="installation-wizard__cancel-overlay" @click=${(e: MouseEvent) => { if (e.target === e.currentTarget) this.dismissCancelConfirm(); }}>
        <div class="installation-wizard__cancel-confirm">
          <div class="installation-wizard__cancel-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3 class="installation-wizard__cancel-title">Wizard abbrechen?</h3>
          <p class="installation-wizard__cancel-message">${this.getCancelMessage()}</p>
          <p class="installation-wizard__cancel-hint">Der Wizard erscheint beim naechsten Oeffnen erneut.</p>
          <div class="installation-wizard__cancel-actions">
            <button
              class="installation-wizard__cancel-stay"
              @click=${this.dismissCancelConfirm}
            >
              Zurueck zum Wizard
            </button>
            <button
              class="installation-wizard__cancel-leave"
              @click=${this.confirmCancel}
            >
              Trotzdem abbrechen
            </button>
          </div>
        </div>
      </div>
    `;
  }

  override render() {
    if (!this.open) {
      return nothing;
    }

    return html`
      <div
        class="installation-wizard__overlay"
        @click=${this.handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="installation-wizard-title"
      >
        <div class="installation-wizard">
          <header class="installation-wizard__header">
            <h2 id="installation-wizard-title" class="installation-wizard__title">
              Specwright Setup
            </h2>
            <button
              class="installation-wizard__close"
              @click=${this.handleCancel}
              aria-label="Dialog schliessen"
            >
              &times;
            </button>
          </header>

          ${this.renderStepIndicator()}

          <div class="installation-wizard__content ${this.currentStep === 'terminal' ? 'installation-wizard__content--terminal' : ''}">
            ${this.currentStep === 'migrate' ? this.renderMigrateStep() : nothing}
            ${this.currentStep === 'install' ? this.renderInstallStep() : nothing}
            ${this.currentStep === 'selection' ? this.renderSelectionStep() : nothing}
            ${this.currentStep === 'terminal' ? this.renderTerminalStep() : nothing}
          </div>

          <footer class="installation-wizard__footer">
            <button
              class="installation-wizard__cancel-button"
              @click=${this.handleCancel}
            >
              ${this.currentStep === 'terminal' ? 'Abbrechen & Schliessen' : 'Abbrechen'}
            </button>
            ${(this.currentStep === 'install' || this.currentStep === 'migrate') && !this.isInstalling && !this.installComplete
              ? html`
                  <button
                    class="installation-wizard__skip-button"
                    @click=${() => { this.currentStep = 'selection'; }}
                  >
                    Ueberspringen
                  </button>
                `
              : nothing}
          </footer>

          ${this.showCancelConfirm ? this.renderCancelConfirm() : nothing}
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
    'aos-installation-wizard-modal': AosInstallationWizardModal;
  }
}
