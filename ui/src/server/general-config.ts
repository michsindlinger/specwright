import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export interface GeneralConfig {
  baseBranch: string;
}

interface GeneralConfigStore {
  defaults: GeneralConfig;
  projects: Record<string, GeneralConfig>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_PATH = join(__dirname, '../../config/general-config.json');

const BRANCH_NAME_REGEX = /^[a-zA-Z0-9_.\-/]+$/;

const DEFAULT_CONFIG: GeneralConfig = {
  baseBranch: 'main',
};

let cachedStore: GeneralConfigStore | null = null;

function loadStore(): GeneralConfigStore {
  if (cachedStore) {
    return cachedStore;
  }

  if (existsSync(CONFIG_PATH)) {
    try {
      const configData = readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(configData);

      // Migrate from old flat format ({ baseBranch: "main" }) to new store format
      if (parsed.baseBranch && !parsed.projects) {
        cachedStore = {
          defaults: { baseBranch: parsed.baseBranch },
          projects: {},
        };
        saveStore(cachedStore);
        console.log('[GeneralConfig] Migrated flat config to project-aware format');
        return cachedStore;
      }

      cachedStore = parsed as GeneralConfigStore;
      console.log('[GeneralConfig] Loaded config from:', CONFIG_PATH);
      return cachedStore;
    } catch (error) {
      console.warn('[GeneralConfig] Failed to load config file, using defaults:', error);
    }
  } else {
    console.log('[GeneralConfig] Config file not found, using defaults');
  }

  cachedStore = { defaults: DEFAULT_CONFIG, projects: {} };
  return cachedStore;
}

function saveStore(store: GeneralConfigStore): void {
  const configDir = dirname(CONFIG_PATH);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(store, null, 2), 'utf-8');
  cachedStore = store;
  console.log('[GeneralConfig] Saved config to:', CONFIG_PATH);
}

export function loadGeneralConfig(projectPath?: string): GeneralConfig {
  const store = loadStore();
  if (projectPath && store.projects[projectPath]) {
    return { ...store.defaults, ...store.projects[projectPath] };
  }
  return { ...store.defaults };
}

export function getBaseBranch(projectPath?: string): string {
  return loadGeneralConfig(projectPath).baseBranch;
}

function validateBranch(branch: string): string {
  const trimmed = branch.trim();
  if (!trimmed) {
    throw new Error('Base branch name cannot be empty');
  }
  if (!BRANCH_NAME_REGEX.test(trimmed)) {
    throw new Error('Invalid branch name. Only alphanumeric characters, underscores, dots, hyphens, and slashes are allowed.');
  }
  return trimmed;
}

export function updateGeneralConfig(updates: Partial<GeneralConfig>, projectPath?: string): GeneralConfig {
  const store = loadStore();

  const validated: Partial<GeneralConfig> = {};
  if (updates.baseBranch !== undefined) {
    validated.baseBranch = validateBranch(updates.baseBranch);
  }

  if (projectPath) {
    store.projects[projectPath] = {
      ...store.defaults,
      ...(store.projects[projectPath] || {}),
      ...validated,
    };
    saveStore(store);
    return { ...store.projects[projectPath] };
  }

  Object.assign(store.defaults, validated);
  saveStore(store);
  return { ...store.defaults };
}
