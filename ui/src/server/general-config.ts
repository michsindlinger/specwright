import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export interface GeneralConfig {
  baseBranch: string;
  reviewPrompt: string;
  /**
   * When true (default), each interactive claude-code Cloud Terminal session
   * starts in its own throwaway git worktree. Emergency-off switch for a
   * behavior that changes the default for all users.
   */
  cloudSessionWorktree: boolean;
  /** INT-2026-037 (FA-04, FA-05): prompt for reviewing an intent document. */
  intentReviewPrompt: string;
  /** INT-2026-037 (FA-14): stand-in reviewers in order, `provider/model`. */
  reviewErsatz: string[];
  /** INT-2026-037 (FA-09): review a freshly written intent automatically once. */
  intentAutoReview: boolean;
}

interface GeneralConfigStore {
  defaults: GeneralConfig;
  projects: Record<string, GeneralConfig>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_PATH = join(__dirname, '../../config/general-config.json');

const BRANCH_NAME_REGEX = /^[a-zA-Z0-9_.\-/]+$/;

export const DEFAULT_REVIEW_PROMPT =
  'You are an external reviewer for an implementation plan. Read the plan carefully and provide concrete, actionable feedback focused on:\n' +
  '- Architectural risks\n' +
  '- Missing edge cases\n' +
  '- Inconsistencies between requirements and implementation\n' +
  '- Simpler alternatives that preserve all features\n\n' +
  'You have read-only access to the project codebase via the Read, Grep, and Glob tools. You MAY use them to spot-check critical plan claims (file paths, function names) when uncertainty is material. **Hard tool-call budget: at most 6 tool calls total. After that, stop reading and write the review.** If a tool fails or is unavailable, continue with prose-only review — do not retry indefinitely. Do not emit raw <tool_call> XML; if a tool is unavailable, state that in prose instead.\n\n' +
  'Be specific and reference parts of the plan. Be concise.';

export const DEFAULT_INTENT_REVIEW_PROMPT =
  'You are an external reviewer for an INTENT document (problem, goals, acceptance criteria) — written before any spec or plan. ' +
  'Search the codebase first (Read, Grep, Glob). **Hard tool-call budget: at most 15 tool calls total, then stop reading and write the review.** ' +
  'Answer:\n' +
  '(1) EXISTS — what in the codebase already solves this or part of it, with file:line.\n' +
  '(2) SMALLEST FIX — the smallest change that removes the root cause.\n' +
  '(3) DROP — goals, criteria or parts that can be dropped because they already exist or are not needed; mark each line "DROP:".\n' +
  '(4) OBSERVABLE — for each acceptance criterion: can it be observed from outside, or does it describe a mechanism?\n\n' +
  'Mark severity BLOCKER / LIKELY / MINOR. Be specific, reference IDs (Z-, AK-, RB-). Be concise. Do not emit raw tool-call XML.';

export const DEFAULT_REVIEW_ERSATZ: readonly string[] = ['anthropic/fable', 'minimax/MiniMax-M2.5', 'anthropic/haiku'];
const ERSATZ_MAX = 10;
const ERSATZ_REGEX = /^[a-z0-9-]+\/[A-Za-z0-9._:/[\]-]+$/;

const DEFAULT_CONFIG: GeneralConfig = {
  baseBranch: 'main',
  reviewPrompt: DEFAULT_REVIEW_PROMPT,
  cloudSessionWorktree: true,
  intentReviewPrompt: DEFAULT_INTENT_REVIEW_PROMPT,
  reviewErsatz: [...DEFAULT_REVIEW_ERSATZ],
  intentAutoReview: true,
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
        const migrated: GeneralConfigStore = {
          defaults: { ...DEFAULT_CONFIG, baseBranch: parsed.baseBranch },
          projects: {},
        };
        saveStore(migrated);
        cachedStore = migrated;
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
    return { ...DEFAULT_CONFIG, ...store.defaults, ...store.projects[projectPath] };
  }
  return { ...DEFAULT_CONFIG, ...store.defaults };
}

export function getBaseBranch(projectPath?: string): string {
  return loadGeneralConfig(projectPath).baseBranch;
}

export function getReviewPrompt(projectPath?: string): string {
  return loadGeneralConfig(projectPath).reviewPrompt;
}

export function getIntentReviewPrompt(projectPath?: string): string {
  return loadGeneralConfig(projectPath).intentReviewPrompt;
}

export function getReviewErsatz(projectPath?: string): string[] {
  return loadGeneralConfig(projectPath).reviewErsatz;
}

export function getIntentAutoReview(projectPath?: string): boolean {
  return loadGeneralConfig(projectPath).intentAutoReview !== false;
}

/**
 * Whether interactive claude-code Cloud Terminal sessions run in a per-session
 * git worktree. Defaults to true; a stored `false` disables the feature.
 */
export function getCloudSessionWorktreeEnabled(projectPath?: string): boolean {
  return loadGeneralConfig(projectPath).cloudSessionWorktree !== false;
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
  if (updates.reviewPrompt !== undefined) {
    const trimmed = updates.reviewPrompt.trim();
    if (!trimmed) {
      throw new Error('Review prompt cannot be empty');
    }
    validated.reviewPrompt = trimmed;
  }
  if (updates.cloudSessionWorktree !== undefined) {
    if (typeof updates.cloudSessionWorktree !== 'boolean') {
      throw new Error(`cloudSessionWorktree must be a boolean, got ${typeof updates.cloudSessionWorktree}`);
    }
    validated.cloudSessionWorktree = updates.cloudSessionWorktree;
  }
  if (updates.intentReviewPrompt !== undefined) {
    const trimmed = updates.intentReviewPrompt.trim();
    if (!trimmed) {
      throw new Error('Intent review prompt cannot be empty');
    }
    validated.intentReviewPrompt = trimmed;
  }
  if (updates.reviewErsatz !== undefined) {
    if (!Array.isArray(updates.reviewErsatz) || updates.reviewErsatz.length > ERSATZ_MAX) {
      throw new Error(`reviewErsatz must be a list of at most ${ERSATZ_MAX} entries`);
    }
    const ersatz = updates.reviewErsatz.map((e) => (typeof e === 'string' ? e.trim() : ''));
    const falsch = ersatz.find((e) => !ERSATZ_REGEX.test(e));
    if (falsch !== undefined) {
      throw new Error(`Invalid stand-in reviewer "${falsch}" — expected provider/model`);
    }
    validated.reviewErsatz = ersatz;
  }
  if (updates.intentAutoReview !== undefined) {
    if (typeof updates.intentAutoReview !== 'boolean') {
      throw new Error(`intentAutoReview must be a boolean, got ${typeof updates.intentAutoReview}`);
    }
    validated.intentAutoReview = updates.intentAutoReview;
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
