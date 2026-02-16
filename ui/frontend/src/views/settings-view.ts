import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { gateway, type WebSocketMessage } from '../gateway.js';
import { routerService } from '../services/router.service.js';
import type { ParsedRoute } from '../types/route.types.js';
import { themeService, type ThemeMode } from '../services/theme.service.js';
import '../components/setup/aos-setup-wizard.js';

interface Model {
  id: string;
  name: string;
  description?: string;
}

interface ModelProvider {
  id: string;
  name: string;
  cliCommand: string;
  cliFlags: string[];
  models: Model[];
}

interface ModelConfig {
  defaultProvider: string;
  defaultModel: string;
  providers: ModelProvider[];
}

type SettingsSection = 'models' | 'general' | 'appearance' | 'setup';

interface EditingProvider {
  providerId: string;
  cliCommand: string;
  cliFlags: string;
}

interface EditingModel {
  providerId: string;
  modelId: string | null; // null for new model
  id: string;
  name: string;
  description: string;
}

interface NewProviderForm {
  id: string;
  name: string;
  cliCommand: string;
  cliFlags: string;
  initialModelId: string;
  initialModelName: string;
}

@customElement('aos-settings-view')
export class AosSettingsView extends LitElement {
  @state() private config: ModelConfig | null = null;
  @state() private loading = true;
  @state() private error = '';
  @state() private activeSection: SettingsSection = 'models';
  @state() private editingProvider: EditingProvider | null = null;
  @state() private editingModel: EditingModel | null = null;
  @state() private saving = false;
  @state() private addingProvider = false;
  @state() private newProvider: NewProviderForm | null = null;

  private boundHandlers: Map<string, (msg: WebSocketMessage) => void> = new Map();
  private readonly BUILT_IN_PROVIDERS = ['anthropic', 'glm', 'gemini'];
  private readonly VALID_TABS: readonly SettingsSection[] = ['models', 'general', 'appearance', 'setup'] as const;
  private boundRouteChangeHandler = (route: ParsedRoute) => this.onRouteChanged(route);

  override connectedCallback() {
    super.connectedCallback();
    this.setupHandlers();
    routerService.on('route-changed', this.boundRouteChangeHandler);
    this.restoreRouteState();
    this.loadConfig();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeHandlers();
    routerService.off('route-changed', this.boundRouteChangeHandler);
  }

  private setupHandlers(): void {
    const handlers: [string, (msg: WebSocketMessage) => void][] = [
      ['settings.config', (msg) => this.onConfigReceived(msg)],
      ['settings.error', (msg) => this.onSettingsError(msg)],
      ['gateway.connected', () => this.loadConfig()]
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

  private loadConfig(): void {
    this.loading = true;
    this.error = '';
    gateway.send({ type: 'settings.config.get' });
  }

  private onConfigReceived(msg: WebSocketMessage): void {
    this.config = msg.config as ModelConfig;
    this.loading = false;
    this.saving = false;
    this.editingProvider = null;
    this.editingModel = null;
  }

  private onSettingsError(msg: WebSocketMessage): void {
    this.error = (msg.error as string) || 'An error occurred';
    this.saving = false;
  }

  private handleSectionChange(section: SettingsSection): void {
    this.activeSection = section;
    routerService.navigate('settings', [section]);
  }

  private restoreRouteState(): void {
    const route = routerService.getCurrentRoute();
    if (!route || route.view !== 'settings') return;

    if (route.segments.length >= 1) {
      const tab = route.segments[0] as SettingsSection;
      if (this.VALID_TABS.includes(tab)) {
        this.activeSection = tab;
      } else {
        routerService.navigate('settings');
      }
    }
  }

  private onRouteChanged(route: ParsedRoute): void {
    if (route.view !== 'settings') return;

    if (route.segments.length === 0) {
      this.activeSection = 'models';
      return;
    }

    const tab = route.segments[0] as SettingsSection;
    if (this.VALID_TABS.includes(tab)) {
      this.activeSection = tab;
    } else {
      routerService.navigate('settings');
    }
  }

  private startEditProvider(provider: ModelProvider): void {
    this.editingProvider = {
      providerId: provider.id,
      cliCommand: provider.cliCommand,
      cliFlags: provider.cliFlags.join(' ')
    };
    this.editingModel = null;
  }

  private cancelEditProvider(): void {
    this.editingProvider = null;
  }

  private saveProvider(): void {
    if (!this.editingProvider) return;

    this.saving = true;
    const cliFlags = this.editingProvider.cliFlags
      .split(' ')
      .filter(f => f.trim() !== '');

    gateway.send({
      type: 'settings.provider.update',
      providerId: this.editingProvider.providerId,
      cliCommand: this.editingProvider.cliCommand,
      cliFlags
    });
  }

  private startAddModel(providerId: string): void {
    this.editingModel = {
      providerId,
      modelId: null,
      id: '',
      name: '',
      description: ''
    };
    this.editingProvider = null;
  }

  private startEditModel(provider: ModelProvider, model: Model): void {
    this.editingModel = {
      providerId: provider.id,
      modelId: model.id,
      id: model.id,
      name: model.name,
      description: model.description || ''
    };
    this.editingProvider = null;
  }

  private cancelEditModel(): void {
    this.editingModel = null;
  }

  private saveModel(): void {
    if (!this.editingModel) return;

    this.saving = true;

    if (this.editingModel.modelId === null) {
      // Adding new model
      gateway.send({
        type: 'settings.model.add',
        providerId: this.editingModel.providerId,
        model: {
          id: this.editingModel.id,
          name: this.editingModel.name,
          description: this.editingModel.description || undefined
        }
      });
    } else {
      // For editing existing models, we need to remove and re-add
      // since there's no update endpoint
      gateway.send({
        type: 'settings.model.remove',
        providerId: this.editingModel.providerId,
        modelId: this.editingModel.modelId
      });
      // After removal, add the updated model
      setTimeout(() => {
        gateway.send({
          type: 'settings.model.add',
          providerId: this.editingModel!.providerId,
          model: {
            id: this.editingModel!.id,
            name: this.editingModel!.name,
            description: this.editingModel!.description || undefined
          }
        });
      }, 100);
    }
  }

  private removeModel(providerId: string, modelId: string): void {
    if (!confirm(`Are you sure you want to remove model "${modelId}"?`)) {
      return;
    }

    this.saving = true;
    gateway.send({
      type: 'settings.model.remove',
      providerId,
      modelId
    });
  }

  // Provider Management Methods
  private startAddProvider(): void {
    this.addingProvider = true;
    this.newProvider = {
      id: '',
      name: '',
      cliCommand: '',
      cliFlags: '--model {modelId}',
      initialModelId: '',
      initialModelName: ''
    };
    this.editingProvider = null;
    this.editingModel = null;
  }

  private cancelAddProvider(): void {
    this.addingProvider = false;
    this.newProvider = null;
  }

  private handleNewProviderInputChange(e: Event, field: keyof NewProviderForm): void {
    if (!this.newProvider) return;
    const target = e.target as HTMLInputElement;
    this.newProvider = {
      ...this.newProvider,
      [field]: target.value
    };
  }

  private validateNewProvider(): string | null {
    if (!this.newProvider) return 'No provider data';

    if (!this.newProvider.id || !this.newProvider.id.trim()) {
      return 'Provider ID is required';
    }

    const idPattern = /^[a-z0-9_-]+$/;
    if (!idPattern.test(this.newProvider.id)) {
      return 'Provider ID must contain only lowercase alphanumeric characters, hyphens, and underscores';
    }

    if (!this.newProvider.name || !this.newProvider.name.trim()) {
      return 'Display name is required';
    }

    if (!this.newProvider.cliCommand || !this.newProvider.cliCommand.trim()) {
      return 'CLI command is required';
    }

    // Check for duplicate ID
    const existingProvider = this.config?.providers.find(p => p.id === this.newProvider!.id);
    if (existingProvider) {
      return `Provider with ID '${this.newProvider.id}' already exists`;
    }

    return null;
  }

  private saveNewProvider(): void {
    const validationError = this.validateNewProvider();
    if (validationError) {
      this.error = validationError;
      return;
    }

    if (!this.newProvider) return;

    this.saving = true;
    this.error = '';

    const cliFlags = this.newProvider.cliFlags
      .split(' ')
      .filter(f => f.trim() !== '');

    const models: Model[] = [];
    if (this.newProvider.initialModelId && this.newProvider.initialModelId.trim()) {
      models.push({
        id: this.newProvider.initialModelId.trim(),
        name: this.newProvider.initialModelName.trim() || this.newProvider.initialModelId.trim(),
        description: ''
      });
    }

    gateway.send({
      type: 'settings.provider.add',
      provider: {
        id: this.newProvider.id.trim(),
        name: this.newProvider.name.trim(),
        cliCommand: this.newProvider.cliCommand.trim(),
        cliFlags,
        models
      }
    });
  }

  private removeProvider(providerId: string): void {
    if (this.isBuiltInProvider(providerId)) {
      this.error = 'Cannot delete built-in providers';
      return;
    }

    if (this.config?.providers.length === 1) {
      this.error = 'Cannot delete the last provider';
      return;
    }

    if (!confirm(`Are you sure you want to delete provider "${providerId}"? This cannot be undone.`)) {
      return;
    }

    this.saving = true;
    this.error = '';
    gateway.send({
      type: 'settings.provider.remove',
      providerId
    });
  }

  private isBuiltInProvider(providerId: string): boolean {
    return this.BUILT_IN_PROVIDERS.includes(providerId);
  }

  private setAsDefault(providerId: string, modelId: string): void {
    this.saving = true;
    gateway.send({
      type: 'settings.defaults.update',
      providerId,
      modelId
    });
  }

  private isDefault(providerId: string, modelId: string): boolean {
    if (!this.config) return false;
    return this.config.defaultProvider === providerId && this.config.defaultModel === modelId;
  }

  private handleProviderInputChange(e: Event, field: 'cliCommand' | 'cliFlags'): void {
    if (!this.editingProvider) return;
    const target = e.target as HTMLInputElement;
    this.editingProvider = {
      ...this.editingProvider,
      [field]: target.value
    };
  }

  private handleModelInputChange(e: Event, field: 'id' | 'name' | 'description'): void {
    if (!this.editingModel) return;
    const target = e.target as HTMLInputElement;
    this.editingModel = {
      ...this.editingModel,
      [field]: target.value
    };
  }

  override render() {
    return html`
      <div class="settings-container">
        <nav class="settings-nav">
          <ul class="settings-nav-list">
            <li>
              <button
                class="settings-nav-item ${this.activeSection === 'models' ? 'active' : ''}"
                @click=${() => this.handleSectionChange('models')}
              >
                Models
              </button>
            </li>
            <li>
              <button
                class="settings-nav-item ${this.activeSection === 'general' ? 'active' : ''}"
                @click=${() => this.handleSectionChange('general')}
                disabled
              >
                General
              </button>
            </li>
            <li>
              <button
                class="settings-nav-item ${this.activeSection === 'appearance' ? 'active' : ''}"
                @click=${() => this.handleSectionChange('appearance')}
              >
                Appearance
              </button>
            </li>
            <li>
              <button
                class="settings-nav-item ${this.activeSection === 'setup' ? 'active' : ''}"
                @click=${() => this.handleSectionChange('setup')}
              >
                Setup
              </button>
            </li>
          </ul>
        </nav>
        <div class="settings-content">
          ${this.renderContent()}
        </div>
      </div>
    `;
  }

  private renderContent() {
    if (this.loading) {
      return this.renderLoading();
    }

    if (this.error) {
      return this.renderError();
    }

    switch (this.activeSection) {
      case 'models':
        return this.renderModelsSection();
      case 'general':
        return this.renderComingSoon('General');
      case 'appearance':
        return this.renderAppearanceSection();
      case 'setup':
        return html`<aos-setup-wizard></aos-setup-wizard>`;
      default:
        return this.renderModelsSection();
    }
  }

  private renderLoading() {
    return html`
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading settings...</p>
      </div>
    `;
  }

  private renderError() {
    return html`
      <div class="error-state">
        <span class="error-icon">!</span>
        <h3>Error loading settings</h3>
        <p>${this.error}</p>
        <button class="retry-btn" @click=${() => this.loadConfig()}>Retry</button>
      </div>
    `;
  }

  private renderAppearanceSection() {
    const currentMode = themeService.getMode();

    const options: { mode: ThemeMode; label: string; description: string; icon: string }[] = [
      { mode: 'light', label: 'Light', description: 'Warm off-white theme', icon: '\u2600' },
      { mode: 'dark', label: 'Dark', description: 'Navy dark theme', icon: '\u263E' },
      { mode: 'black', label: 'Black', description: 'Near-black OLED theme', icon: '\u25CF' },
      { mode: 'system', label: 'System', description: 'Follow OS setting', icon: '\uD83D\uDCBB' },
    ];

    return html`
      <div class="appearance-section">
        <div class="section-header">
          <div>
            <h3>Appearance</h3>
            <p class="section-description">Choose your preferred color theme.</p>
          </div>
        </div>

        <div class="theme-options">
          ${options.map(opt => html`
            <button
              class="theme-option ${currentMode === opt.mode ? 'active' : ''}"
              @click=${() => this.handleThemeChange(opt.mode)}
            >
              <span class="theme-option-icon">${opt.icon}</span>
              <span class="theme-option-label">${opt.label}</span>
              <span class="theme-option-desc">${opt.description}</span>
            </button>
          `)}
        </div>
      </div>
    `;
  }

  private handleThemeChange(mode: ThemeMode): void {
    themeService.setMode(mode);
    this.requestUpdate();
  }

  private renderComingSoon(section: string) {
    return html`
      <div class="coming-soon">
        <h3>${section} Settings</h3>
        <p>Coming soon...</p>
      </div>
    `;
  }

  private renderModelsSection() {
    if (!this.config) return html``;

    const showAddButton = !this.addingProvider && !this.editingProvider && !this.editingModel;

    return html`
      <div class="models-section">
        <div class="section-header">
          <div>
            <h3>Model Providers</h3>
            <p class="section-description">Configure AI model providers and their available models.</p>
          </div>
          ${showAddButton ? html`
            <button
              class="add-provider-btn"
              @click=${this.startAddProvider}
              ?disabled=${this.saving}
            >
              + Add Provider
            </button>
          ` : ''}
        </div>

        ${this.addingProvider ? this.renderNewProviderForm() : ''}

        ${this.config.providers.map(provider => this.renderProviderCard(provider))}
      </div>
    `;
  }

  private renderProviderCard(provider: ModelProvider) {
    const isEditing = this.editingProvider?.providerId === provider.id;
    const isDefaultProvider = this.config?.defaultProvider === provider.id;
    const isBuiltIn = this.isBuiltInProvider(provider.id);
    const canDelete = !isBuiltIn && (this.config?.providers.length || 0) > 1;

    return html`
      <div class="provider-card ${isDefaultProvider ? 'default-provider' : ''}">
        <div class="provider-header">
          <div class="provider-title">
            <h4>${provider.name}</h4>
            ${isDefaultProvider ? html`<span class="default-badge">Default Provider</span>` : ''}
          </div>
          ${!isEditing ? html`
            <div class="provider-actions">
              <button class="edit-btn" @click=${() => this.startEditProvider(provider)} ?disabled=${this.saving}>
                Edit
              </button>
              ${!isBuiltIn ? html`
                <button
                  class="remove-provider-btn"
                  @click=${() => this.removeProvider(provider.id)}
                  ?disabled=${this.saving || !canDelete}
                  title=${!canDelete ? 'Cannot delete the last provider' : 'Delete provider'}
                >
                  Delete
                </button>
              ` : ''}
            </div>
          ` : ''}
        </div>

        ${isEditing ? this.renderProviderEditForm(provider) : this.renderProviderInfo(provider)}

        <div class="models-list">
          <div class="models-header">
            <h5>Models</h5>
            <button
              class="add-model-btn"
              @click=${() => this.startAddModel(provider.id)}
              ?disabled=${this.saving || this.editingModel !== null}
            >
              + Add Model
            </button>
          </div>

          ${this.editingModel?.providerId === provider.id && this.editingModel.modelId === null
            ? this.renderModelEditForm()
            : ''}

          ${provider.models.map(model => this.renderModelItem(provider, model))}
        </div>
      </div>
    `;
  }

  private renderProviderInfo(provider: ModelProvider) {
    return html`
      <div class="provider-info">
        <div class="info-row">
          <span class="info-label">CLI Command:</span>
          <code class="info-value">${provider.cliCommand}</code>
        </div>
        <div class="info-row">
          <span class="info-label">CLI Flags:</span>
          <code class="info-value">${provider.cliFlags.join(' ')}</code>
        </div>
      </div>
    `;
  }

  private renderProviderEditForm(provider: ModelProvider) {
    if (!this.editingProvider) return html``;

    return html`
      <div class="provider-edit-form">
        <div class="form-field">
          <label for="cli-command-${provider.id}">CLI Command</label>
          <input
            id="cli-command-${provider.id}"
            type="text"
            .value=${this.editingProvider.cliCommand}
            @input=${(e: Event) => this.handleProviderInputChange(e, 'cliCommand')}
            ?disabled=${this.saving}
          />
        </div>
        <div class="form-field">
          <label for="cli-flags-${provider.id}">CLI Flags</label>
          <input
            id="cli-flags-${provider.id}"
            type="text"
            .value=${this.editingProvider.cliFlags}
            @input=${(e: Event) => this.handleProviderInputChange(e, 'cliFlags')}
            placeholder="--model {modelId}"
            ?disabled=${this.saving}
          />
          <span class="form-hint">Use {modelId} as placeholder for the selected model</span>
        </div>
        <div class="form-actions">
          <button class="cancel-btn" @click=${this.cancelEditProvider} ?disabled=${this.saving}>
            Cancel
          </button>
          <button class="save-btn" @click=${this.saveProvider} ?disabled=${this.saving}>
            ${this.saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    `;
  }

  private renderModelItem(provider: ModelProvider, model: Model) {
    const isEditing = this.editingModel?.providerId === provider.id && this.editingModel?.modelId === model.id;
    const isDefault = this.isDefault(provider.id, model.id);

    if (isEditing) {
      return this.renderModelEditForm();
    }

    return html`
      <div class="model-item ${isDefault ? 'default-model' : ''}">
        <div class="model-info">
          <span class="model-id">${model.id}</span>
          <span class="model-name">${model.name}</span>
          ${model.description ? html`<span class="model-description">${model.description}</span>` : ''}
          ${isDefault ? html`<span class="default-badge">Default</span>` : ''}
        </div>
        <div class="model-actions">
          ${!isDefault ? html`
            <button
              class="set-default-btn"
              @click=${() => this.setAsDefault(provider.id, model.id)}
              ?disabled=${this.saving}
              title="Set as default"
            >
              Set Default
            </button>
          ` : ''}
          <button
            class="edit-model-btn"
            @click=${() => this.startEditModel(provider, model)}
            ?disabled=${this.saving}
          >
            Edit
          </button>
          <button
            class="remove-model-btn"
            @click=${() => this.removeModel(provider.id, model.id)}
            ?disabled=${this.saving || provider.models.length === 1}
            title="${provider.models.length === 1 ? 'Cannot remove last model' : 'Remove model'}"
          >
            Remove
          </button>
        </div>
      </div>
    `;
  }

  private renderModelEditForm() {
    if (!this.editingModel) return html``;

    const isNewModel = this.editingModel.modelId === null;

    return html`
      <div class="model-edit-form">
        <div class="form-row">
          <div class="form-field">
            <label for="model-id">Model ID</label>
            <input
              id="model-id"
              type="text"
              .value=${this.editingModel.id}
              @input=${(e: Event) => this.handleModelInputChange(e, 'id')}
              placeholder="e.g., gpt-4"
              ?disabled=${this.saving || !isNewModel}
            />
          </div>
          <div class="form-field">
            <label for="model-name">Display Name</label>
            <input
              id="model-name"
              type="text"
              .value=${this.editingModel.name}
              @input=${(e: Event) => this.handleModelInputChange(e, 'name')}
              placeholder="e.g., GPT-4"
              ?disabled=${this.saving}
            />
          </div>
        </div>
        <div class="form-field">
          <label for="model-description">Description (optional)</label>
          <input
            id="model-description"
            type="text"
            .value=${this.editingModel.description}
            @input=${(e: Event) => this.handleModelInputChange(e, 'description')}
            placeholder="e.g., Most capable model"
            ?disabled=${this.saving}
          />
        </div>
        <div class="form-actions">
          <button class="cancel-btn" @click=${this.cancelEditModel} ?disabled=${this.saving}>
            Cancel
          </button>
          <button
            class="save-btn"
            @click=${this.saveModel}
            ?disabled=${this.saving || !this.editingModel.id || !this.editingModel.name}
          >
            ${this.saving ? 'Saving...' : isNewModel ? 'Add Model' : 'Save'}
          </button>
        </div>
      </div>
    `;
  }

  private renderNewProviderForm() {
    if (!this.newProvider) return html``;

    const isIdValid = /^[a-z0-9_-]*$/.test(this.newProvider.id);

    return html`
      <div class="provider-card new-provider-form">
        <div class="provider-header">
          <div class="provider-title">
            <h4>Add New Provider</h4>
          </div>
        </div>

        <div class="form-fields">
          <div class="form-row">
            <div class="form-field">
              <label for="new-provider-id">Provider ID <span class="required">*</span></label>
              <input
                id="new-provider-id"
                type="text"
                .value=${this.newProvider.id}
                @input=${(e: Event) => this.handleNewProviderInputChange(e, 'id')}
                placeholder="e.g., my-provider"
                ?disabled=${this.saving}
              />
              ${!isIdValid && this.newProvider.id ? html`<span class="form-error">Only lowercase alphanumeric, hyphens, and underscores allowed</span>` : ''}
            </div>
            <div class="form-field">
              <label for="new-provider-name">Display Name <span class="required">*</span></label>
              <input
                id="new-provider-name"
                type="text"
                .value=${this.newProvider.name}
                @input=${(e: Event) => this.handleNewProviderInputChange(e, 'name')}
                placeholder="e.g., My Provider"
                ?disabled=${this.saving}
              />
            </div>
          </div>

          <div class="form-field">
            <label for="new-provider-cli-command">CLI Command <span class="required">*</span></label>
            <input
              id="new-provider-cli-command"
              type="text"
              .value=${this.newProvider.cliCommand}
              @input=${(e: Event) => this.handleNewProviderInputChange(e, 'cliCommand')}
              placeholder="e.g., claude-my-provider"
              ?disabled=${this.saving}
            />
          </div>

          <div class="form-field">
            <label for="new-provider-cli-flags">CLI Flags</label>
            <input
              id="new-provider-cli-flags"
              type="text"
              .value=${this.newProvider.cliFlags}
              @input=${(e: Event) => this.handleNewProviderInputChange(e, 'cliFlags')}
              placeholder="--model {modelId} --other-flag"
              ?disabled=${this.saving}
            />
            <span class="form-hint">Use {modelId} as placeholder for the selected model</span>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label for="new-provider-initial-model-id">Initial Model ID (optional)</label>
              <input
                id="new-provider-initial-model-id"
                type="text"
                .value=${this.newProvider.initialModelId}
                @input=${(e: Event) => this.handleNewProviderInputChange(e, 'initialModelId')}
                placeholder="e.g., gpt-4"
                ?disabled=${this.saving}
              />
            </div>
            <div class="form-field">
              <label for="new-provider-initial-model-name">Initial Model Name (optional)</label>
              <input
                id="new-provider-initial-model-name"
                type="text"
                .value=${this.newProvider.initialModelName}
                @input=${(e: Event) => this.handleNewProviderInputChange(e, 'initialModelName')}
                placeholder="e.g., GPT-4"
                ?disabled=${this.saving}
              />
            </div>
          </div>

          <div class="form-actions">
            <button class="cancel-btn" @click=${this.cancelAddProvider} ?disabled=${this.saving}>
              Cancel
            </button>
            <button
              class="save-btn"
              @click=${this.saveNewProvider}
              ?disabled=${this.saving || !this.newProvider.id || !this.newProvider.name || !this.newProvider.cliCommand}
            >
              ${this.saving ? 'Adding...' : 'Add Provider'}
            </button>
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
    'aos-settings-view': AosSettingsView;
  }
}
