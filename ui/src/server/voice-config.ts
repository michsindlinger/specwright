import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { VoiceConfig, VoiceConfigStatus, VoiceInputMode } from '../shared/types/voice.protocol.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_PATH = join(__dirname, '../../config/voice-config.json');

const DEFAULT_CONFIG: VoiceConfig = {
  deepgramApiKey: '',
  elevenLabsApiKey: '',
  defaultInputMode: 'push-to-talk',
  voicePersonas: [],
};

let cachedConfig: VoiceConfig | null = null;

function loadConfig(): VoiceConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (existsSync(CONFIG_PATH)) {
    try {
      const configData = readFileSync(CONFIG_PATH, 'utf-8');
      cachedConfig = JSON.parse(configData) as VoiceConfig;
      console.log('[VoiceConfig] Loaded config from:', CONFIG_PATH);
      return cachedConfig;
    } catch (error) {
      console.warn('[VoiceConfig] Failed to load config file, using defaults:', error);
    }
  } else {
    console.log('[VoiceConfig] Config file not found, using defaults');
  }

  cachedConfig = { ...DEFAULT_CONFIG };
  return cachedConfig;
}

function saveConfig(config: VoiceConfig): void {
  const configDir = dirname(CONFIG_PATH);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  cachedConfig = config;
  console.log('[VoiceConfig] Saved config to:', CONFIG_PATH);
}

/**
 * Load voice config and return safe status (no API key values).
 */
export function loadVoiceConfigStatus(): VoiceConfigStatus {
  const config = loadConfig();
  return {
    deepgramConfigured: config.deepgramApiKey.trim().length > 0,
    elevenLabsConfigured: config.elevenLabsApiKey.trim().length > 0,
    defaultInputMode: config.defaultInputMode,
    voicePersonas: config.voicePersonas,
  };
}

/**
 * Load the full voice config (including API keys). Backend-only.
 */
export function loadVoiceConfig(): VoiceConfig {
  return { ...loadConfig() };
}

function validateInputMode(mode: string): VoiceInputMode {
  const valid: VoiceInputMode[] = ['push-to-talk', 'voice-activity'];
  if (!valid.includes(mode as VoiceInputMode)) {
    throw new Error(`Invalid input mode "${mode}". Must be one of: ${valid.join(', ')}`);
  }
  return mode as VoiceInputMode;
}

/**
 * Update voice configuration. Only provided fields are updated.
 * Returns safe config status (no API key values).
 */
export function updateVoiceConfig(updates: {
  deepgramApiKey?: string;
  elevenLabsApiKey?: string;
  defaultInputMode?: string;
}): VoiceConfigStatus {
  const config = loadConfig();

  if (updates.deepgramApiKey !== undefined) {
    config.deepgramApiKey = updates.deepgramApiKey.trim();
  }

  if (updates.elevenLabsApiKey !== undefined) {
    config.elevenLabsApiKey = updates.elevenLabsApiKey.trim();
  }

  if (updates.defaultInputMode !== undefined) {
    config.defaultInputMode = validateInputMode(updates.defaultInputMode);
  }

  saveConfig(config);

  return {
    deepgramConfigured: config.deepgramApiKey.trim().length > 0,
    elevenLabsConfigured: config.elevenLabsApiKey.trim().length > 0,
    defaultInputMode: config.defaultInputMode,
    voicePersonas: config.voicePersonas,
  };
}
