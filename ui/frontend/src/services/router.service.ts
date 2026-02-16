/**
 * Router Service - Central hash-based routing for the Specwright Web UI.
 *
 * Singleton service that manages URL parsing, programmatic navigation,
 * and route change events. Follows the same patterns as projectStateService
 * (singleton) and gateway (on/off event subscription).
 *
 * URL format: #/view/segment1/segment2/...
 * Examples:
 *   #/dashboard
 *   #/dashboard/spec/2026-02-10-my-feature/kanban
 *   #/settings
 */

import {
  type ParsedRoute,
  type ViewType,
  type RouteChangeHandler,
  VALID_VIEWS,
  DEFAULT_VIEW,
} from '../types/route.types.js';

class RouterService {
  private handlers: Map<string, Set<RouteChangeHandler>> = new Map();
  private currentRoute: ParsedRoute | null = null;

  constructor() {
    window.addEventListener('hashchange', () => this.handleHashChange());
  }

  /** Initialize the router by processing the current URL. Call once at app startup. */
  init(): void {
    this.handleHashChange();
  }

  /** Get the current parsed route (or null if not yet initialized). */
  getCurrentRoute(): ParsedRoute | null {
    return this.currentRoute;
  }

  /**
   * Navigate to a new route programmatically.
   * Updates the browser URL and triggers route change handlers.
   *
   * @param view - The target view
   * @param segments - Optional URL segments after the view
   */
  navigate(view: ViewType, segments: string[] = []): void {
    const path = [view, ...segments].join('/');
    const newHash = `#/${path}`;

    // Skip if already at this URL (prevent infinite loops)
    if (window.location.hash === newHash) {
      return;
    }

    window.location.hash = newHash;
    // hashchange event will fire and call handleHashChange()
  }

  /**
   * Subscribe to route change events.
   * @param type - Event type. Use 'route-changed' for all route changes.
   * @param handler - Callback receiving the new ParsedRoute.
   */
  on(type: string, handler: RouteChangeHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  /**
   * Unsubscribe from route change events.
   * @param type - Event type to unsubscribe from.
   * @param handler - The handler to remove.
   */
  off(type: string, handler: RouteChangeHandler): void {
    this.handlers.get(type)?.delete(handler);
  }

  /** Parse a hash string into a ParsedRoute. */
  parseHash(hash: string): ParsedRoute {
    // Remove leading '#/' or '#' or '/'
    const raw = hash.replace(/^#?\/?/, '');

    if (!raw) {
      return { view: DEFAULT_VIEW, params: {}, segments: [] };
    }

    const parts = raw.split('/').filter(Boolean);
    const viewCandidate = parts[0] as ViewType;
    const view: ViewType = VALID_VIEWS.includes(viewCandidate) ? viewCandidate : 'not-found';
    const segments = parts.slice(1);

    return { view, params: {}, segments };
  }

  private handleHashChange(): void {
    const route = this.parseHash(window.location.hash);

    // If no hash present, redirect to default view
    if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
      window.location.hash = `#/${DEFAULT_VIEW}`;
      return; // The hashchange event will fire again with the new hash
    }

    this.currentRoute = route;
    this.emit(route);
  }

  private emit(route: ParsedRoute): void {
    const handlers = this.handlers.get('route-changed');
    if (handlers) {
      for (const handler of handlers) {
        handler(route);
      }
    }
  }
}

export const routerService = new RouterService();
