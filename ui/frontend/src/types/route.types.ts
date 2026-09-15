/**
 * Route type definitions for Deep Link Navigation.
 * Shared types used by RouterService and consuming components.
 */

/** All supported top-level view routes */
export type ViewType = 'vorhaben' | 'projekt' | 'dashboard' | 'team' | 'chat' | 'settings' | 'getting-started' | 'call' | 'prompt-templates' | 'not-found';

/** Valid view routes (excludes 'not-found' which is a fallback) */
export const VALID_VIEWS: readonly ViewType[] = ['vorhaben', 'projekt', 'dashboard', 'team', 'chat', 'settings', 'getting-started', 'call', 'prompt-templates'] as const;

/** Default route when no hash or empty hash (INT-2026-004: the Vorhaben overview). */
export const DEFAULT_VIEW: ViewType = 'vorhaben';

/** Parsed representation of a hash-based URL */
export interface ParsedRoute {
  /** Top-level view (e.g. 'dashboard', 'chat') */
  view: ViewType;
  /** Named parameters extracted from URL segments */
  params: Record<string, string>;
  /** Raw URL segments after the view (e.g. ['spec', '2026-02-10-my-feature', 'kanban']) */
  segments: string[];
}

/** Handler type for route change events */
export type RouteChangeHandler = (route: ParsedRoute) => void;
