import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ProjectSelectedDetail } from '../../ui/src/components/aos-project-add-modal.js';

// Mock the recently opened service
const mockEntries = [
  { path: '/Users/dev/project-a', name: 'project-a', lastOpened: Date.now() - 1000 },
  { path: '/Users/dev/project-b', name: 'project-b', lastOpened: Date.now() - 86400000 },
  { path: '/Users/dev/project-c', name: 'project-c', lastOpened: Date.now() - 172800000 }
];

vi.mock('../../ui/src/services/recently-opened.service.js', () => ({
  recentlyOpenedService: {
    getRecentlyOpened: vi.fn(() => mockEntries),
    addRecentlyOpened: vi.fn(),
    hasProject: vi.fn((path: string) => mockEntries.some(e => e.path === path))
  }
}));

describe('AosProjectAddModal', () => {
  describe('Component structure', () => {
    it('should export ProjectSelectedDetail interface', async () => {
      const module = await import('../../ui/src/components/aos-project-add-modal.js');
      expect(module).toHaveProperty('AosProjectAddModal');
    });
  });

  describe('Modal functionality', () => {
    it('should have open property defaulting to false', async () => {
      const { AosProjectAddModal } = await import('../../ui/src/components/aos-project-add-modal.js');
      const instance = new AosProjectAddModal();
      expect(instance.open).toBe(false);
    });

    it('should have openProjectPaths property defaulting to empty array', async () => {
      const { AosProjectAddModal } = await import('../../ui/src/components/aos-project-add-modal.js');
      const instance = new AosProjectAddModal();
      expect(instance.openProjectPaths).toEqual([]);
    });
  });

  describe('Date formatting', () => {
    it('formatDate should return "Heute" for today', async () => {
      const { AosProjectAddModal } = await import('../../ui/src/components/aos-project-add-modal.js');
      const instance = new AosProjectAddModal();
      // Access private method through prototype
      const formatDate = (instance as unknown as { formatDate: (ts: number) => string }).formatDate.bind(instance);

      const today = Date.now();
      expect(formatDate(today)).toBe('Heute');
    });

    it('formatDate should return "Gestern" for yesterday', async () => {
      const { AosProjectAddModal } = await import('../../ui/src/components/aos-project-add-modal.js');
      const instance = new AosProjectAddModal();
      const formatDate = (instance as unknown as { formatDate: (ts: number) => string }).formatDate.bind(instance);

      const yesterday = Date.now() - 86400000; // 24 hours ago
      expect(formatDate(yesterday)).toBe('Gestern');
    });

    it('formatDate should return "vor X Tagen" for recent days', async () => {
      const { AosProjectAddModal } = await import('../../ui/src/components/aos-project-add-modal.js');
      const instance = new AosProjectAddModal();
      const formatDate = (instance as unknown as { formatDate: (ts: number) => string }).formatDate.bind(instance);

      const twoDaysAgo = Date.now() - 2 * 86400000;
      expect(formatDate(twoDaysAgo)).toBe('vor 2 Tagen');
    });
  });

  describe('Project already open check', () => {
    it('isProjectAlreadyOpen should return true for open projects', async () => {
      const { AosProjectAddModal } = await import('../../ui/src/components/aos-project-add-modal.js');
      const instance = new AosProjectAddModal();
      instance.openProjectPaths = ['/Users/dev/project-a'];

      const isOpen = (instance as unknown as { isProjectAlreadyOpen: (path: string) => boolean }).isProjectAlreadyOpen.bind(instance);

      expect(isOpen('/Users/dev/project-a')).toBe(true);
      expect(isOpen('/Users/dev/project-b')).toBe(false);
    });
  });

  describe('Event handling', () => {
    let instance: InstanceType<typeof import('../../ui/src/components/aos-project-add-modal.js').AosProjectAddModal>;

    beforeEach(async () => {
      const { AosProjectAddModal } = await import('../../ui/src/components/aos-project-add-modal.js');
      instance = new AosProjectAddModal();
    });

    it('selectProject should dispatch project-selected event', () => {
      const eventHandler = vi.fn();
      instance.addEventListener('project-selected', eventHandler);

      // Call private method
      const selectProject = (instance as unknown as { selectProject: (path: string, name: string) => void }).selectProject.bind(instance);
      selectProject('/test/path', 'test-project');

      expect(eventHandler).toHaveBeenCalledTimes(1);
      const event = eventHandler.mock.calls[0][0] as CustomEvent<ProjectSelectedDetail>;
      expect(event.detail.path).toBe('/test/path');
      expect(event.detail.name).toBe('test-project');
    });

    it('selectProject should set open to false', () => {
      instance.open = true;

      const selectProject = (instance as unknown as { selectProject: (path: string, name: string) => void }).selectProject.bind(instance);
      selectProject('/test/path', 'test-project');

      expect(instance.open).toBe(false);
    });

    it('closeModal should dispatch modal-close event', () => {
      const eventHandler = vi.fn();
      instance.addEventListener('modal-close', eventHandler);

      const closeModal = (instance as unknown as { closeModal: () => void }).closeModal.bind(instance);
      closeModal();

      expect(eventHandler).toHaveBeenCalledTimes(1);
    });

    it('closeModal should set open to false', () => {
      instance.open = true;

      const closeModal = (instance as unknown as { closeModal: () => void }).closeModal.bind(instance);
      closeModal();

      expect(instance.open).toBe(false);
    });
  });

  describe('Gherkin scenarios', () => {
    describe('Szenario 2: Projekt aus Recently Opened auswählen', () => {
      it('should fire project-selected event with correct details', async () => {
        const { AosProjectAddModal } = await import('../../ui/src/components/aos-project-add-modal.js');
        const instance = new AosProjectAddModal();
        instance.open = true;

        const projectSelectedHandler = vi.fn();
        instance.addEventListener('project-selected', projectSelectedHandler);

        // Simulate selecting a project
        const selectProject = (instance as unknown as { selectProject: (path: string, name: string) => void }).selectProject.bind(instance);
        selectProject('/Users/dev/project-a', 'project-a');

        expect(projectSelectedHandler).toHaveBeenCalled();
        const event = projectSelectedHandler.mock.calls[0][0] as CustomEvent<ProjectSelectedDetail>;
        expect(event.detail.path).toBe('/Users/dev/project-a');
        expect(event.detail.name).toBe('project-a');
      });
    });

    describe('Szenario 5: Duplikat-Prüfung', () => {
      it('should detect already opened projects', async () => {
        const { AosProjectAddModal } = await import('../../ui/src/components/aos-project-add-modal.js');
        const instance = new AosProjectAddModal();
        instance.openProjectPaths = ['/Users/dev/project-a'];

        const isOpen = (instance as unknown as { isProjectAlreadyOpen: (path: string) => boolean }).isProjectAlreadyOpen.bind(instance);

        expect(isOpen('/Users/dev/project-a')).toBe(true);
        expect(isOpen('/Users/dev/project-b')).toBe(false);
      });
    });

    describe('Edge Case: Modal schließen ohne Auswahl', () => {
      it('should dispatch modal-close event when closing', async () => {
        const { AosProjectAddModal } = await import('../../ui/src/components/aos-project-add-modal.js');
        const instance = new AosProjectAddModal();
        instance.open = true;

        const modalCloseHandler = vi.fn();
        instance.addEventListener('modal-close', modalCloseHandler);

        const closeModal = (instance as unknown as { closeModal: () => void }).closeModal.bind(instance);
        closeModal();

        expect(instance.open).toBe(false);
        expect(modalCloseHandler).toHaveBeenCalled();
      });
    });
  });

  describe('Directory validation', () => {
    it('validateAgentOsFolder should check for agent-os directory', async () => {
      const { AosProjectAddModal } = await import('../../ui/src/components/aos-project-add-modal.js');
      const instance = new AosProjectAddModal();

      const validateAgentOsFolder = (instance as unknown as {
        validateAgentOsFolder: (handle: FileSystemDirectoryHandle) => Promise<boolean>
      }).validateAgentOsFolder.bind(instance);

      // Mock directory handle with agent-os folder
      const mockHandleWithAgentOs = {
        getDirectoryHandle: vi.fn().mockResolvedValue({})
      } as unknown as FileSystemDirectoryHandle;

      expect(await validateAgentOsFolder(mockHandleWithAgentOs)).toBe(true);

      // Mock directory handle without agent-os folder
      const mockHandleWithoutAgentOs = {
        getDirectoryHandle: vi.fn().mockRejectedValue(new Error('Not found'))
      } as unknown as FileSystemDirectoryHandle;

      expect(await validateAgentOsFolder(mockHandleWithoutAgentOs)).toBe(false);
    });
  });
});
