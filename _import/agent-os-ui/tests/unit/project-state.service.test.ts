import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the gateway before importing the service
const mockGatewaySend = vi.fn();
vi.mock('../../ui/src/gateway.js', () => ({
  gateway: {
    send: mockGatewaySend,
  },
}));

// Import after mocking
const { projectStateService } = await import(
  '../../ui/src/services/project-state.service.js'
);
import type { Project } from '../../ui/src/context/project-context.js';

describe('ProjectStateService', () => {
  let mockStorage: Record<string, string>;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockStorage = {};

    // Mock sessionStorage
    const sessionStorageMock = {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
    };

    Object.defineProperty(globalThis, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
      configurable: true,
    });

    // Mock fetch
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('loadPersistedState', () => {
    it('should return null when no state is stored', () => {
      const state = projectStateService.loadPersistedState();
      expect(state).toBeNull();
    });

    it('should return stored state when valid', () => {
      const storedState = {
        openProjects: [{ id: 'p1', name: 'Project 1', path: '/path/1' }],
        activeProjectId: 'p1',
      };
      mockStorage['agent-os-open-projects'] = JSON.stringify(storedState);

      const state = projectStateService.loadPersistedState();

      expect(state).toEqual(storedState);
    });

    it('should return null for invalid JSON', () => {
      mockStorage['agent-os-open-projects'] = 'invalid-json';

      const state = projectStateService.loadPersistedState();

      expect(state).toBeNull();
    });

    it('should return null for invalid state structure', () => {
      // Missing openProjects array
      mockStorage['agent-os-open-projects'] = JSON.stringify({
        activeProjectId: 'p1',
      });

      const state = projectStateService.loadPersistedState();

      expect(state).toBeNull();
    });

    it('should return null for invalid project entries', () => {
      const storedState = {
        openProjects: [{ id: 'p1', name: 'Project 1' }], // missing path
        activeProjectId: 'p1',
      };
      mockStorage['agent-os-open-projects'] = JSON.stringify(storedState);

      const state = projectStateService.loadPersistedState();

      expect(state).toBeNull();
    });
  });

  describe('persistState', () => {
    it('should store projects and active ID', () => {
      const projects: Project[] = [
        { id: 'p1', name: 'Project 1', path: '/path/1' },
        { id: 'p2', name: 'Project 2', path: '/path/2' },
      ];

      projectStateService.persistState(projects, 'p1');

      const stored = JSON.parse(mockStorage['agent-os-open-projects']);
      expect(stored.openProjects).toEqual(projects);
      expect(stored.activeProjectId).toBe('p1');
    });

    it('should handle null activeProjectId', () => {
      const projects: Project[] = [];

      projectStateService.persistState(projects, null);

      const stored = JSON.parse(mockStorage['agent-os-open-projects']);
      expect(stored.activeProjectId).toBeNull();
    });

    it('should not throw when sessionStorage is unavailable', () => {
      Object.defineProperty(globalThis, 'sessionStorage', {
        value: {
          setItem: () => {
            throw new Error('Storage unavailable');
          },
        },
        writable: true,
        configurable: true,
      });

      expect(() => {
        projectStateService.persistState([], null);
      }).not.toThrow();
    });
  });

  describe('clearPersistedState', () => {
    it('should remove stored state', () => {
      mockStorage['agent-os-open-projects'] = JSON.stringify({
        openProjects: [],
        activeProjectId: null,
      });
      mockStorage['agent-os-active-project'] = 'some-id';

      projectStateService.clearPersistedState();

      expect(mockStorage['agent-os-open-projects']).toBeUndefined();
      expect(mockStorage['agent-os-active-project']).toBeUndefined();
    });
  });

  describe('switchProject', () => {
    it('should call backend API and send WebSocket message on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const project: Project = {
        id: 'p1',
        name: 'Project 1',
        path: '/path/to/project',
      };

      const resultPromise = projectStateService.switchProject(project);

      // Fast-forward past debounce delay
      await vi.advanceTimersByTimeAsync(200);

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/project/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': expect.any(String),
        },
        body: JSON.stringify({ path: '/path/to/project' }),
      });
      expect(mockGatewaySend).toHaveBeenCalledWith({
        type: 'project.switch',
        path: '/path/to/project',
      });
    });

    it('should return error on backend failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Project not found' }),
      });

      const project: Project = {
        id: 'p1',
        name: 'Project 1',
        path: '/invalid/path',
      };

      const resultPromise = projectStateService.switchProject(project);

      // Fast-forward past debounce delay
      await vi.advanceTimersByTimeAsync(200);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Project not found');
    });

    it('should debounce rapid switches', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const project1: Project = { id: 'p1', name: 'P1', path: '/p1' };
      const project2: Project = { id: 'p2', name: 'P2', path: '/p2' };
      const project3: Project = { id: 'p3', name: 'P3', path: '/p3' };

      // Rapid switches (all in quick succession before debounce fires)
      projectStateService.switchProject(project1);
      projectStateService.switchProject(project2);
      const resultPromise = projectStateService.switchProject(project3);

      // Fast-forward past debounce delay
      await vi.advanceTimersByTimeAsync(300);

      const result = await resultPromise;

      // Only the last one should actually be called
      expect(result.success).toBe(true);
      // Due to debouncing, only one call should be made
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/project/switch',
        expect.objectContaining({
          body: JSON.stringify({ path: '/p3' }),
        })
      );
    });
  });

  describe('validateProject', () => {
    it('should return true for valid project', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true }),
      });

      const result = await projectStateService.validateProject('/valid/path');

      expect(result).toBe(true);
    });

    it('should return false for invalid project', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: false }),
      });

      const result = await projectStateService.validateProject('/invalid/path');

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await projectStateService.validateProject('/any/path');

      expect(result).toBe(false);
    });

    it('should return false on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await projectStateService.validateProject('/any/path');

      expect(result).toBe(false);
    });
  });

  describe('restoreProjects', () => {
    it('should return valid projects and removed paths', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ valid: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ valid: false }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ valid: true }),
        });

      const projects: Project[] = [
        { id: 'p1', name: 'Valid 1', path: '/valid/1' },
        { id: 'p2', name: 'Invalid', path: '/invalid' },
        { id: 'p3', name: 'Valid 2', path: '/valid/2' },
      ];

      const result = await projectStateService.restoreProjects(projects);

      expect(result.validProjects).toHaveLength(2);
      expect(result.validProjects[0].id).toBe('p1');
      expect(result.validProjects[1].id).toBe('p3');
      expect(result.removedPaths).toEqual(['/invalid']);
    });

    it('should return all valid when all projects are accessible', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ valid: true }),
      });

      const projects: Project[] = [
        { id: 'p1', name: 'Project 1', path: '/path/1' },
        { id: 'p2', name: 'Project 2', path: '/path/2' },
      ];

      const result = await projectStateService.restoreProjects(projects);

      expect(result.validProjects).toEqual(projects);
      expect(result.removedPaths).toEqual([]);
    });

    it('should return empty valid list when all projects are inaccessible', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ valid: false }),
      });

      const projects: Project[] = [
        { id: 'p1', name: 'Project 1', path: '/path/1' },
        { id: 'p2', name: 'Project 2', path: '/path/2' },
      ];

      const result = await projectStateService.restoreProjects(projects);

      expect(result.validProjects).toEqual([]);
      expect(result.removedPaths).toEqual(['/path/1', '/path/2']);
    });
  });

  describe('Gherkin Scenarios', () => {
    describe('Szenario 4: Browser-Refresh stellt Zustand wieder her', () => {
      it('should restore projects after refresh', async () => {
        // Given ich habe die Projekte "project-a" und "project-b" geöffnet
        const storedState = {
          openProjects: [
            { id: 'pa', name: 'project-a', path: '/project-a' },
            { id: 'pb', name: 'project-b', path: '/project-b' },
          ],
          activeProjectId: 'pb', // And "project-b" ist der aktive Tab
        };
        mockStorage['agent-os-open-projects'] = JSON.stringify(storedState);

        // When ich die Seite neu lade (simulated by loading persisted state)
        const state = projectStateService.loadPersistedState();

        // Then sehe ich beide Tabs
        expect(state).not.toBeNull();
        expect(state!.openProjects).toHaveLength(2);

        // And "project-b" ist weiterhin der aktive Tab
        expect(state!.activeProjectId).toBe('pb');
      });
    });

    describe('Szenario 5: Projekt-Pfad nicht mehr verfügbar nach Refresh', () => {
      it('should not restore deleted project', async () => {
        // Given ich habe das Projekt "deleted-project" geöffnet
        const projects: Project[] = [
          { id: 'dp', name: 'deleted-project', path: '/deleted-project' },
        ];

        // And der Ordner wurde gelöscht (simulated by validate returning false)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ valid: false }),
        });

        // When ich die Seite neu lade
        const result = await projectStateService.restoreProjects(projects);

        // Then wird der Tab "deleted-project" nicht wiederhergestellt
        expect(result.validProjects).toHaveLength(0);
        expect(result.removedPaths).toContain('/deleted-project');
      });
    });

    describe('Szenario 6: Schnelles Wechseln zwischen Projekten', () => {
      it('should handle rapid switching without race conditions', async () => {
        // Given ich habe 3 Projekte geöffnet
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

        const project1: Project = { id: 'p1', name: 'Project 1', path: '/p1' };
        const project2: Project = { id: 'p2', name: 'Project 2', path: '/p2' };
        const project3: Project = { id: 'p3', name: 'Project 3', path: '/p3' };

        // When ich schnell hintereinander zwischen den Tabs wechsle
        projectStateService.switchProject(project1);
        projectStateService.switchProject(project2);
        const resultPromise = projectStateService.switchProject(project3);

        // Fast-forward past debounce delay
        await vi.advanceTimersByTimeAsync(200);

        const result = await resultPromise;

        // Then werden keine Race-Conditions verursacht
        // (debouncing ensures only last switch is executed)
        expect(result.success).toBe(true);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // And der angezeigte Kontext entspricht immer dem aktiven Tab
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/project/switch',
          expect.objectContaining({
            body: JSON.stringify({ path: '/p3' }),
          })
        );
      });
    });
  });
});
