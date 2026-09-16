/**
 * Route type definitions for Deep Link Navigation.
 * Shared types used by RouterService and consuming components.
 */

/** All supported top-level view routes (INT-2026-010: Vorhaben, Neue Absicht, Projekt). */
export type ViewType = 'vorhaben' | 'neu' | 'projekt' | 'not-found';

/** Valid view routes (excludes 'not-found' which is a fallback) */
export const VALID_VIEWS: readonly ViewType[] = ['vorhaben', 'neu', 'projekt'] as const;

/**
 * Old top-level routes that map onto a current view: a bookmarked
 * `#/dashboard/spec/x/kanban` (INT-2026-004) or `#/chat`, `#/call`, `#/team`
 * (INT-2026-010, FA-18) lands on the Vorhaben overview; `#/settings`,
 * `#/prompt-templates` and `#/getting-started` land on the project page, where
 * their content lives now. The segments after the alias are dropped because the
 * old sub-paths have no counterpart (settings tabs are local now).
 */
export const VIEW_ALIASES: Readonly<Record<string, ViewType>> = {
  dashboard: 'vorhaben',
  chat: 'vorhaben',
  call: 'vorhaben',
  team: 'vorhaben',
  settings: 'projekt',
  'prompt-templates': 'projekt',
  'getting-started': 'projekt',
};

/** Default route when no hash or empty hash (INT-2026-004: the Vorhaben overview). */
export const DEFAULT_VIEW: ViewType = 'vorhaben';

/** Parsed representation of a hash-based URL */
export interface ParsedRoute {
  /** Top-level view (e.g. 'vorhaben', 'projekt') */
  view: ViewType;
  /** Named parameters extracted from URL segments */
  params: Record<string, string>;
  /** Raw URL segments after the view (e.g. ['<projectId>', 'INT-2026-004']) */
  segments: string[];
}

/** Handler type for route change events */
export type RouteChangeHandler = (route: ParsedRoute) => void;
