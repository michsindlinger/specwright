import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

export interface Model {
  id: string;
  name: string;
  description?: string;
}

export interface ModelProvider {
  id: string;
  name: string;
  cliCommand: string;
  cliFlags: string[];
  models: Model[];
}

export interface ModelConfig {
  defaultProvider: string;
  defaultModel: string;
  providers: ModelProvider[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_PATH = join(__dirname, '../../config/model-config.json');

const BUILT_IN_PROVIDERS = ['anthropic', 'glm', 'gemini'];

const DEFAULT_CONFIG: ModelConfig = {
  defaultProvider: 'anthropic',
  defaultModel: 'opus',
  providers: [
    {
      id: 'anthropic',
      name: 'Anthropic',
      cliCommand: 'claude',
      cliFlags: ['--model', '{modelId}'],
      models: [
        { id: 'opus', name: 'Opus 4.5', description: 'Most capable model for complex tasks' },
        { id: 'sonnet', name: 'Sonnet 4', description: 'Balanced performance and speed' },
        { id: 'haiku', name: 'Haiku 3.5', description: 'Fast and efficient for simple tasks' }
      ]
    },
    {
      id: 'glm',
      name: 'GLM',
      cliCommand: 'claude-glm',
      cliFlags: ['--model', '{modelId}'],
      models: [
        { id: 'glm-5', name: 'GLM 5', description: 'Latest GLM model' }
      ]
    },
    {
      id: 'gemini',
      name: 'Gemini',
      cliCommand: 'claude-gem',
      cliFlags: ['--model', '{modelId}'],
      models: [
        { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Fast and efficient' },
        { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Most capable Model' }
      ]
    },
    {
      id: 'kimi-kw',
      name: 'KIMI K2',
      cliCommand: 'claude-kimi-api',
      cliFlags: ['--model', '{modelId}'],
      models: [
        { id: 'kimi-k2.5', name: 'Kimi K2.5', description: '' }
      ]
    }
  ]
};

let cachedConfig: ModelConfig | null = null;

export function isBuiltInProvider(providerId: string): boolean {
  return BUILT_IN_PROVIDERS.includes(providerId);
}

export function loadModelConfig(): ModelConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (existsSync(CONFIG_PATH)) {
    try {
      const configData = readFileSync(CONFIG_PATH, 'utf-8');
      cachedConfig = JSON.parse(configData) as ModelConfig;
      console.log('[ModelConfig] Loaded config from:', CONFIG_PATH);
      return cachedConfig;
    } catch (error) {
      console.warn('[ModelConfig] Failed to load config file, using defaults:', error);
    }
  } else {
    console.log('[ModelConfig] Config file not found, using defaults');
  }

  cachedConfig = DEFAULT_CONFIG;
  return cachedConfig;
}

export function getProvider(providerId: string): ModelProvider | undefined {
  const config = loadModelConfig();
  return config.providers.find(p => p.id === providerId);
}

export function getModel(providerId: string, modelId: string): Model | undefined {
  const provider = getProvider(providerId);
  return provider?.models.find(m => m.id === modelId);
}

export function getProviderCommand(providerId: string, modelId: string): { command: string; args: string[] } | undefined {
  const provider = getProvider(providerId);
  if (!provider) {
    return undefined;
  }

  const args = provider.cliFlags.map(flag =>
    flag === '{modelId}' ? modelId : flag
  );

  return {
    command: provider.cliCommand,
    args
  };
}

export function getAllProviders(): ModelProvider[] {
  const config = loadModelConfig();
  return config.providers;
}

export function getDefaultSelection(): { providerId: string; modelId: string } {
  const config = loadModelConfig();
  return {
    providerId: config.defaultProvider,
    modelId: config.defaultModel
  };
}

export function saveModelConfig(config: ModelConfig): void {
  const configDir = dirname(CONFIG_PATH);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  cachedConfig = config;
  console.log('[ModelConfig] Saved config to:', CONFIG_PATH);
}

export function updateProvider(providerId: string, updates: Partial<Omit<ModelProvider, 'id' | 'models'>>): ModelConfig {
  const config = loadModelConfig();
  const providerIndex = config.providers.findIndex(p => p.id === providerId);

  if (providerIndex === -1) {
    throw new Error(`Provider not found: ${providerId}`);
  }

  const updatedProvider = {
    ...config.providers[providerIndex],
    ...updates,
    id: config.providers[providerIndex].id,
    models: config.providers[providerIndex].models
  };

  const updatedConfig: ModelConfig = {
    ...config,
    providers: [
      ...config.providers.slice(0, providerIndex),
      updatedProvider,
      ...config.providers.slice(providerIndex + 1)
    ]
  };

  saveModelConfig(updatedConfig);
  return updatedConfig;
}

export function addModel(providerId: string, model: Model): ModelConfig {
  const config = loadModelConfig();
  const providerIndex = config.providers.findIndex(p => p.id === providerId);

  if (providerIndex === -1) {
    throw new Error(`Provider not found: ${providerId}`);
  }

  const provider = config.providers[providerIndex];
  const existingModel = provider.models.find(m => m.id === model.id);

  if (existingModel) {
    throw new Error(`Model already exists: ${model.id}`);
  }

  const updatedProvider = {
    ...provider,
    models: [...provider.models, model]
  };

  const updatedConfig: ModelConfig = {
    ...config,
    providers: [
      ...config.providers.slice(0, providerIndex),
      updatedProvider,
      ...config.providers.slice(providerIndex + 1)
    ]
  };

  saveModelConfig(updatedConfig);
  return updatedConfig;
}

export function removeModel(providerId: string, modelId: string): ModelConfig {
  const config = loadModelConfig();
  const providerIndex = config.providers.findIndex(p => p.id === providerId);

  if (providerIndex === -1) {
    throw new Error(`Provider not found: ${providerId}`);
  }

  const provider = config.providers[providerIndex];
  const modelIndex = provider.models.findIndex(m => m.id === modelId);

  if (modelIndex === -1) {
    throw new Error(`Model not found: ${modelId}`);
  }

  if (provider.models.length === 1) {
    throw new Error('Cannot remove last model from provider');
  }

  const updatedProvider = {
    ...provider,
    models: provider.models.filter(m => m.id !== modelId)
  };

  let updatedConfig: ModelConfig = {
    ...config,
    providers: [
      ...config.providers.slice(0, providerIndex),
      updatedProvider,
      ...config.providers.slice(providerIndex + 1)
    ]
  };

  // If the removed model was the default, update default to first remaining model
  if (config.defaultProvider === providerId && config.defaultModel === modelId) {
    updatedConfig = {
      ...updatedConfig,
      defaultModel: updatedProvider.models[0].id
    };
  }

  saveModelConfig(updatedConfig);
  return updatedConfig;
}

export function updateModel(providerId: string, oldModelId: string, model: Model): ModelConfig {
  const config = loadModelConfig();
  const providerIndex = config.providers.findIndex(p => p.id === providerId);

  if (providerIndex === -1) {
    throw new Error(`Provider not found: ${providerId}`);
  }

  const provider = config.providers[providerIndex];
  const modelIndex = provider.models.findIndex(m => m.id === oldModelId);

  if (modelIndex === -1) {
    throw new Error(`Model not found: ${oldModelId}`);
  }

  // If ID changed, check new ID doesn't conflict with another model
  if (model.id !== oldModelId) {
    const conflict = provider.models.find(m => m.id === model.id);
    if (conflict) {
      throw new Error(`Model already exists: ${model.id}`);
    }
  }

  const updatedModels = [...provider.models];
  updatedModels[modelIndex] = model;

  const updatedProvider = {
    ...provider,
    models: updatedModels
  };

  let updatedConfig: ModelConfig = {
    ...config,
    providers: [
      ...config.providers.slice(0, providerIndex),
      updatedProvider,
      ...config.providers.slice(providerIndex + 1)
    ]
  };

  // If the old model was the default, update to new model ID
  if (config.defaultProvider === providerId && config.defaultModel === oldModelId) {
    updatedConfig = {
      ...updatedConfig,
      defaultModel: model.id
    };
  }

  saveModelConfig(updatedConfig);
  return updatedConfig;
}

export function addProvider(provider: ModelProvider): ModelConfig {
  const config = loadModelConfig();

  // Validate provider ID is unique
  const existingProvider = config.providers.find(p => p.id === provider.id);
  if (existingProvider) {
    throw new Error(`Provider with ID '${provider.id}' already exists`);
  }

  // Validate required fields
  if (!provider.id || !provider.id.trim()) {
    throw new Error('Provider ID is required');
  }

  if (!/^[a-z0-9_-]+$/.test(provider.id)) {
    throw new Error('Provider ID must contain only lowercase alphanumeric characters, hyphens, and underscores');
  }

  if (!provider.name || !provider.name.trim()) {
    throw new Error('Provider name is required');
  }

  if (!provider.cliCommand || !provider.cliCommand.trim()) {
    throw new Error('CLI command is required');
  }

  // Ensure models array exists
  const newProvider: ModelProvider = {
    ...provider,
    models: provider.models || []
  };

  const updatedConfig: ModelConfig = {
    ...config,
    providers: [...config.providers, newProvider]
  };

  saveModelConfig(updatedConfig);
  return updatedConfig;
}

export function removeProvider(providerId: string): ModelConfig {
  const config = loadModelConfig();

  // Check if provider is built-in
  if (isBuiltInProvider(providerId)) {
    throw new Error(`Cannot remove built-in provider '${providerId}'`);
  }

  // Check if at least one provider remains
  if (config.providers.length <= 1) {
    throw new Error('Cannot remove the last provider');
  }

  // Find provider to remove
  const providerIndex = config.providers.findIndex(p => p.id === providerId);
  if (providerIndex === -1) {
    throw new Error(`Provider not found: ${providerId}`);
  }

  // Check if this is the default provider
  const isDefault = config.defaultProvider === providerId;

  let updatedConfig: ModelConfig = {
    ...config,
    providers: config.providers.filter(p => p.id !== providerId)
  };

  // If removing default provider, reassign to first available
  if (isDefault) {
    const firstProvider = updatedConfig.providers[0];
    const firstModel = firstProvider.models[0];
    if (firstModel) {
      updatedConfig = {
        ...updatedConfig,
        defaultProvider: firstProvider.id,
        defaultModel: firstModel.id
      };
    }
  }

  saveModelConfig(updatedConfig);
  return updatedConfig;
}

export function setDefaults(providerId: string, modelId: string): ModelConfig {
  const config = loadModelConfig();

  const provider = config.providers.find(p => p.id === providerId);
  if (!provider) {
    throw new Error(`Provider not found: ${providerId}`);
  }

  const model = provider.models.find(m => m.id === modelId);
  if (!model) {
    throw new Error(`Model not found: ${modelId}`);
  }

  const updatedConfig: ModelConfig = {
    ...config,
    defaultProvider: providerId,
    defaultModel: modelId
  };

  saveModelConfig(updatedConfig);
  return updatedConfig;
}

/**
 * MSK-003-FIX: Get CLI command and args for a model ID.
 * Searches all providers to find which one contains the model.
 * Returns the appropriate CLI command based on the provider.
 *
 * @param modelId - The model ID (e.g., 'opus', 'glm-5')
 * @returns CLI command and args, or fallback to anthropic defaults
 */
export function getCliCommandForModel(modelId: string): { command: string; args: string[] } {
  const config = loadModelConfig();

  // Search all providers for the model
  for (const provider of config.providers) {
    const model = provider.models.find(m => m.id === modelId);
    if (model) {
      // Found the provider, use its CLI configuration
      const args = provider.cliFlags.map(flag =>
        flag === '{modelId}' ? modelId : flag
      );
      console.log(`[ModelConfig] Model '${modelId}' found in provider '${provider.id}', using command: ${provider.cliCommand}`);
      return {
        command: provider.cliCommand,
        args
      };
    }
  }

  // Fallback to anthropic defaults if model not found
  console.log(`[ModelConfig] Model '${modelId}' not found in any provider, using anthropic defaults`);
  return {
    command: 'claude',
    args: ['--model', modelId]
  };
}

export function checkCliAvailability(command: string): boolean {
  try {
    const result = spawnSync('which', [command], {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

export function checkDefaultCliAvailability(): { available: boolean; command: string } {
  const config = loadModelConfig();
  const defaultProvider = config.providers.find(p => p.id === config.defaultProvider);
  const command = defaultProvider?.cliCommand ?? 'claude';
  return { available: checkCliAvailability(command), command };
}
