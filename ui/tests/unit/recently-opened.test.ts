import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RecentlyOpenedService,
  RecentlyOpenedEntry
} from '../../ui/src/services/recently-opened.service.js';

describe('RecentlyOpenedService', () => {
  let service: RecentlyOpenedService;
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    // Reset mock storage
    mockStorage = {};

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      })
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true
    });

    // Create fresh service instance for each test
    service = new RecentlyOpenedService();
  });

  describe('getRecentlyOpened', () => {
    it('should return empty array when no entries exist', () => {
      const entries = service.getRecentlyOpened();

      expect(entries).toEqual([]);
    });

    it('should return entries sorted by lastOpened descending', () => {
      const storedEntries: RecentlyOpenedEntry[] = [
        { path: '/project-a', name: 'Project A', lastOpened: 1000 },
        { path: '/project-c', name: 'Project C', lastOpened: 3000 },
        { path: '/project-b', name: 'Project B', lastOpened: 2000 }
      ];
      mockStorage['agent-os-recently-opened'] = JSON.stringify(storedEntries);

      const entries = service.getRecentlyOpened();

      expect(entries[0].path).toBe('/project-c');
      expect(entries[1].path).toBe('/project-b');
      expect(entries[2].path).toBe('/project-a');
    });

    it('should handle invalid JSON gracefully', () => {
      mockStorage['agent-os-recently-opened'] = 'invalid-json';

      const entries = service.getRecentlyOpened();

      expect(entries).toEqual([]);
    });

    it('should filter out invalid entries', () => {
      const storedData = [
        { path: '/valid', name: 'Valid', lastOpened: 1000 },
        { path: null, name: 'Invalid', lastOpened: 2000 },
        { path: '/valid2', name: 'Valid2', lastOpened: 3000 }
      ];
      mockStorage['agent-os-recently-opened'] = JSON.stringify(storedData);

      const entries = service.getRecentlyOpened();

      expect(entries.length).toBe(2);
    });
  });

  describe('addRecentlyOpened', () => {
    it('should add new project at first position', () => {
      service.addRecentlyOpened('/project-a', 'Project A');

      const entries = service.getRecentlyOpened();

      expect(entries.length).toBe(1);
      expect(entries[0].path).toBe('/project-a');
      expect(entries[0].name).toBe('Project A');
    });

    it('should move existing project to first position when re-added', () => {
      // Add initial projects
      service.addRecentlyOpened('/project-a', 'Project A');
      service.addRecentlyOpened('/project-b', 'Project B');
      service.addRecentlyOpened('/project-c', 'Project C');

      // Re-add project-a
      service.addRecentlyOpened('/project-a', 'Project A');

      const entries = service.getRecentlyOpened();

      expect(entries[0].path).toBe('/project-a');
      expect(entries.length).toBe(3);
    });

    it('should limit entries to 20', () => {
      // Add 25 projects
      for (let i = 0; i < 25; i++) {
        service.addRecentlyOpened(`/project-${i}`, `Project ${i}`);
      }

      const entries = service.getRecentlyOpened();

      expect(entries.length).toBe(20);
      // Most recent should be project-24
      expect(entries[0].path).toBe('/project-24');
    });

    it('should update timestamp when re-adding existing project', () => {
      const beforeAdd = Date.now();
      service.addRecentlyOpened('/project-a', 'Project A');
      const firstEntry = service.getRecentlyOpened()[0];

      // Verify timestamp is reasonable (within last second)
      expect(firstEntry.lastOpened).toBeGreaterThanOrEqual(beforeAdd);
      expect(firstEntry.lastOpened).toBeLessThanOrEqual(Date.now());

      // Re-add the same project
      service.addRecentlyOpened('/project-a', 'Project A Updated');
      const secondEntry = service.getRecentlyOpened()[0];

      // Timestamp should be >= first (may be equal if very fast)
      expect(secondEntry.lastOpened).toBeGreaterThanOrEqual(
        firstEntry.lastOpened
      );
    });
  });

  describe('removeRecentlyOpened', () => {
    it('should remove existing project', () => {
      service.addRecentlyOpened('/project-a', 'Project A');
      service.addRecentlyOpened('/project-b', 'Project B');

      service.removeRecentlyOpened('/project-a');

      const entries = service.getRecentlyOpened();

      expect(entries.length).toBe(1);
      expect(entries[0].path).toBe('/project-b');
    });

    it('should do nothing when removing non-existent project', () => {
      service.addRecentlyOpened('/project-a', 'Project A');

      service.removeRecentlyOpened('/non-existent');

      const entries = service.getRecentlyOpened();

      expect(entries.length).toBe(1);
    });
  });

  describe('clearRecentlyOpened', () => {
    it('should remove all entries', () => {
      service.addRecentlyOpened('/project-a', 'Project A');
      service.addRecentlyOpened('/project-b', 'Project B');

      service.clearRecentlyOpened();

      const entries = service.getRecentlyOpened();

      expect(entries).toEqual([]);
    });
  });

  describe('hasProject', () => {
    it('should return true for existing project', () => {
      service.addRecentlyOpened('/project-a', 'Project A');

      expect(service.hasProject('/project-a')).toBe(true);
    });

    it('should return false for non-existent project', () => {
      expect(service.hasProject('/project-a')).toBe(false);
    });
  });

  describe('localStorage unavailable (Private Browsing)', () => {
    beforeEach(() => {
      // Mock localStorage to throw error
      Object.defineProperty(globalThis, 'localStorage', {
        value: {
          getItem: () => {
            throw new Error('localStorage not available');
          },
          setItem: () => {
            throw new Error('localStorage not available');
          },
          removeItem: () => {
            throw new Error('localStorage not available');
          }
        },
        writable: true,
        configurable: true
      });

      service = new RecentlyOpenedService();
    });

    it('should return empty array when localStorage is unavailable', () => {
      const entries = service.getRecentlyOpened();

      expect(entries).toEqual([]);
    });

    it('should not throw when adding project without localStorage', () => {
      expect(() => {
        service.addRecentlyOpened('/project-a', 'Project A');
      }).not.toThrow();
    });

    it('should not throw when removing project without localStorage', () => {
      expect(() => {
        service.removeRecentlyOpened('/project-a');
      }).not.toThrow();
    });

    it('should not throw when clearing without localStorage', () => {
      expect(() => {
        service.clearRecentlyOpened();
      }).not.toThrow();
    });
  });

  describe('Gherkin scenarios', () => {
    describe('Szenario 1: Projekt wird zur Liste hinzugefügt', () => {
      it('should add new project to recently opened at first position', () => {
        // Given ich habe noch nie ein Projekt geöffnet
        expect(service.getRecentlyOpened()).toEqual([]);

        // When ich das Projekt "/Users/dev/my-project" öffne
        service.addRecentlyOpened('/Users/dev/my-project', 'my-project');

        // Then wird es zur Recently Opened Liste hinzugefügt
        const entries = service.getRecentlyOpened();
        expect(entries.some((e) => e.path === '/Users/dev/my-project')).toBe(
          true
        );

        // And es steht an erster Stelle der Liste
        expect(entries[0].path).toBe('/Users/dev/my-project');
      });
    });

    describe('Szenario 2: Sortierung nach zuletzt geöffnet', () => {
      it('should sort by most recently opened', () => {
        // Given ich habe die Projekte in dieser Reihenfolge geöffnet
        service.addRecentlyOpened('/project-a', 'project-a');
        service.addRecentlyOpened('/project-b', 'project-b');
        service.addRecentlyOpened('/project-c', 'project-c');

        // When ich die Recently Opened Liste anzeige
        const entries = service.getRecentlyOpened();

        // Then sehe ich "project-c" an erster Stelle
        expect(entries[0].path).toBe('/project-c');
        // And "project-b" an zweiter Stelle
        expect(entries[1].path).toBe('/project-b');
        // And "project-a" an dritter Stelle
        expect(entries[2].path).toBe('/project-a');
      });
    });

    describe('Szenario 4: Maximale Anzahl Einträge', () => {
      it('should limit list to 20 entries', () => {
        // Given die Recently Opened Liste enthält bereits 20 Projekte
        for (let i = 1; i <= 20; i++) {
          service.addRecentlyOpened(`/project-${i}`, `Project ${i}`);
        }
        expect(service.getRecentlyOpened().length).toBe(20);

        // When ich ein neues Projekt "project-21" öffne
        service.addRecentlyOpened('/project-21', 'Project 21');

        // Then enthält die Liste 20 Einträge
        const entries = service.getRecentlyOpened();
        expect(entries.length).toBe(20);

        // And "project-21" steht an erster Stelle
        expect(entries[0].path).toBe('/project-21');

        // And das älteste Projekt wurde entfernt
        expect(entries.some((e) => e.path === '/project-1')).toBe(false);
      });
    });
  });
});
