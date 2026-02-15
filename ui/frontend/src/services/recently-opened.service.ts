/**
 * RecentlyOpenedService - Manages recently opened projects list
 *
 * Features:
 * - localStorage persistence with key 'agent-os-recently-opened'
 * - Maximum 20 entries, sorted by lastOpened (newest first)
 * - Graceful handling when localStorage is unavailable (Private Browsing)
 */

const STORAGE_KEY = 'agent-os-recently-opened';
const MAX_ENTRIES = 20;

/**
 * Represents a recently opened project entry
 */
export interface RecentlyOpenedEntry {
  path: string;
  name: string;
  lastOpened: number;
}

/**
 * RecentlyOpenedService manages the list of recently opened projects
 * with localStorage persistence.
 */
export class RecentlyOpenedService {
  /**
   * Check if localStorage is available
   */
  private isStorageAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the list of recently opened projects, sorted by lastOpened (newest first)
   */
  getRecentlyOpened(): RecentlyOpenedEntry[] {
    if (!this.isStorageAvailable()) {
      return [];
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return [];
      }

      const entries: RecentlyOpenedEntry[] = JSON.parse(stored);

      // Validate and sort by lastOpened descending
      return entries
        .filter(
          (entry) =>
            typeof entry.path === 'string' &&
            typeof entry.name === 'string' &&
            typeof entry.lastOpened === 'number'
        )
        .sort((a, b) => b.lastOpened - a.lastOpened);
    } catch {
      // If parsing fails, return empty array
      return [];
    }
  }

  /**
   * Add a project to the recently opened list
   * If the project already exists, it will be moved to the top with updated timestamp
   *
   * @param path - The full path to the project directory
   * @param name - The display name of the project
   */
  addRecentlyOpened(path: string, name: string): void {
    if (!this.isStorageAvailable()) {
      return;
    }

    try {
      const entries = this.getRecentlyOpened();

      // Remove existing entry with same path (case-sensitive)
      const filteredEntries = entries.filter((entry) => entry.path !== path);

      // Create new entry with current timestamp
      const newEntry: RecentlyOpenedEntry = {
        path,
        name,
        lastOpened: Date.now()
      };

      // Add to beginning of list
      const updatedEntries = [newEntry, ...filteredEntries];

      // Limit to MAX_ENTRIES
      const limitedEntries = updatedEntries.slice(0, MAX_ENTRIES);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedEntries));
    } catch {
      // Silently fail if storage is not available
    }
  }

  /**
   * Remove a project from the recently opened list
   *
   * @param path - The full path of the project to remove
   */
  removeRecentlyOpened(path: string): void {
    if (!this.isStorageAvailable()) {
      return;
    }

    try {
      const entries = this.getRecentlyOpened();
      const filteredEntries = entries.filter((entry) => entry.path !== path);

      if (filteredEntries.length === entries.length) {
        // Nothing to remove
        return;
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredEntries));
    } catch {
      // Silently fail if storage is not available
    }
  }

  /**
   * Clear all recently opened projects
   */
  clearRecentlyOpened(): void {
    if (!this.isStorageAvailable()) {
      return;
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Silently fail if storage is not available
    }
  }

  /**
   * Check if a project exists in the recently opened list
   *
   * @param path - The full path to check
   */
  hasProject(path: string): boolean {
    const entries = this.getRecentlyOpened();
    return entries.some((entry) => entry.path === path);
  }
}

/** Singleton instance */
export const recentlyOpenedService = new RecentlyOpenedService();
