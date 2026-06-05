import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { PromptTemplate } from './../shared/types/prompt-templates.protocol.js';

/**
 * Global store for reusable Prompt Templates.
 *
 * Persists a flat list of templates to config/prompt-templates.json. Templates
 * are intentionally global (not project-scoped) so they can be reused across
 * every project from the cloud terminal's template picker. Mirrors the JSON
 * cache/load/save pattern used by general-config.ts.
 */

interface PromptTemplatesStore {
  templates: PromptTemplate[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_PATH = join(__dirname, '../../config/prompt-templates.json');

const MAX_NAME_LENGTH = 100;
const MAX_CONTENT_LENGTH = 20000;

let cachedStore: PromptTemplatesStore | null = null;

function loadStore(): PromptTemplatesStore {
  if (cachedStore) {
    return cachedStore;
  }

  if (existsSync(CONFIG_PATH)) {
    try {
      const data = readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(data) as PromptTemplatesStore;
      if (parsed && Array.isArray(parsed.templates)) {
        cachedStore = parsed;
        console.log('[PromptTemplates] Loaded templates from:', CONFIG_PATH);
        return cachedStore;
      }
      console.warn('[PromptTemplates] Malformed config file, using empty list');
    } catch (error) {
      console.warn('[PromptTemplates] Failed to load config file, using empty list:', error);
    }
  } else {
    console.log('[PromptTemplates] Config file not found, using empty list');
  }

  cachedStore = { templates: [] };
  return cachedStore;
}

function saveStore(store: PromptTemplatesStore): void {
  const configDir = dirname(CONFIG_PATH);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(store, null, 2), 'utf-8');
  cachedStore = store;
  console.log('[PromptTemplates] Saved templates to:', CONFIG_PATH);
}

function generateId(): string {
  return `tpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function validateName(name: unknown): string {
  if (typeof name !== 'string') {
    throw new Error('Template name is required');
  }
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Template name cannot be empty');
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new Error(`Template name must be at most ${MAX_NAME_LENGTH} characters`);
  }
  return trimmed;
}

function validateContent(content: unknown): string {
  if (typeof content !== 'string') {
    throw new Error('Template content is required');
  }
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('Template content cannot be empty');
  }
  if (trimmed.length > MAX_CONTENT_LENGTH) {
    throw new Error(`Template content must be at most ${MAX_CONTENT_LENGTH} characters`);
  }
  return trimmed;
}

export function loadPromptTemplates(): PromptTemplate[] {
  return [...loadStore().templates];
}

export function savePromptTemplate(input: { id?: string; name: string; content: string }): PromptTemplate[] {
  const store = loadStore();
  const name = validateName(input.name);
  const content = validateContent(input.content);

  if (input.id) {
    const existing = store.templates.find((t) => t.id === input.id);
    if (!existing) {
      throw new Error('Template not found');
    }
    existing.name = name;
    existing.content = content;
  } else {
    store.templates.push({ id: generateId(), name, content });
  }

  saveStore(store);
  return [...store.templates];
}

export function deletePromptTemplate(id: string): PromptTemplate[] {
  if (typeof id !== 'string' || !id) {
    throw new Error('Template id is required');
  }
  const store = loadStore();
  const next = store.templates.filter((t) => t.id !== id);
  store.templates = next;
  saveStore(store);
  return [...store.templates];
}
