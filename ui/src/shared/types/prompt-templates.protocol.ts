/**
 * Prompt Templates Protocol Types
 *
 * Defines the WebSocket message contract for the reusable Prompt Templates feature.
 * Templates are global (not project-scoped) so they can be reused across every
 * project from the cloud terminal's template picker.
 *
 * Client messages flow from frontend → websocket.ts → prompt-templates store.
 * Server-push messages flow from the store → websocket.ts → frontend.
 */

// ─── Shared entity ────────────────────────────────────────────────────────────

export interface PromptTemplate {
  /** Stable unique id (generated server-side). */
  id: string;
  /** Short human-readable label shown in lists and the terminal picker. */
  name: string;
  /** The prompt body that gets inserted into the terminal. */
  content: string;
}

// ─── Server → Client ────────────────────────────────────────────────────────

/** Current full list of templates, pushed after get / save / delete. */
export interface PromptTemplatesList {
  type: 'prompt-templates:list';
  templates: PromptTemplate[];
  timestamp: string;
}

/** A recoverable error (validation, persistence failure). */
export interface PromptTemplatesError {
  type: 'prompt-templates:error';
  error: string;
  timestamp: string;
}

// ─── Client → Server ────────────────────────────────────────────────────────

/** Request the current list of templates. */
export interface PromptTemplatesListGet {
  type: 'prompt-templates:list.get';
}

/**
 * Create or update a template. When `id` is provided and matches an existing
 * template it is updated; otherwise a new template is created.
 */
export interface PromptTemplatesSave {
  type: 'prompt-templates:save';
  id?: string;
  name: string;
  content: string;
}

/** Delete a template by id. */
export interface PromptTemplatesDelete {
  type: 'prompt-templates:delete';
  id: string;
}
