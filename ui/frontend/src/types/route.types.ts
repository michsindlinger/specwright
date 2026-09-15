/**
 * Route type definitions for Deep Link Navigation.
 * Shared types used by RouterService and consuming components.
 */

/** All supported top-level view routes */
export type ViewType = 'vorhaben' | 'projekt' | 'team' | 'chat' | 'settings' | 'getting-started' | 'call' | 'prompt-templates' | 'not-found';

/** Valid view routes (excludes 'not-found' which is a fallback) */
export const VALID_VIEWS: readonly ViewType[] = ['vorhaben', 'projekt', 'team', 'chat', 'settings', 'getting-started', 'call', 'prompt-templates'] as const;

/**
 * Old top-level routes that map onto a current view (FA-36, INT-2026-004): a
 * bookmarked `#/dashboard/spec/x/kanban` lands on the Vorhaben overview; the
 * segments after the alias are dropped because the old sub-paths have no
 * counterpart.
 */
export const VIEW_ALIASES: Readonly<Record<string, ViewType>> = { dashboard: 'vorhaben' };

/** Default route when no hash or empty hash (INT-2026-004: the Vorhaben overview). */
export const DEFAULT_VIEW: ViewType = 'vorhaben';

/** Parsed representation of a hash-based URL */
export interface ParsedRoute {
  /** Top-level view (e.g. 'vorhaben', 'chat') */
  view: ViewType;
  /** Named parameters extracted from URL segments */
  params: Record<string, string>;
  /** Raw URL segments after the view (e.g. ['<projectId>', 'INT-2026-004', 'plan']) */
  segments: string[];
}

/** Handler type for route change events */
export type RouteChangeHandler = (route: ParsedRoute) => void;
