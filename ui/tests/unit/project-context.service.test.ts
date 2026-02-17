import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { PathLike } from 'fs';
import { existsSync, statSync, readdirSync } from 'fs';
import { ProjectContextService } from '../../src/server/project-context.service.js';

// Mock the fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(),
  readdirSync: vi.fn()
}));

describe('ProjectContextService', () => {
  let service: ProjectContextService;
  const mockExistsSync = vi.mocked(existsSync);
  const mockStatSync = vi.mocked(statSync);
  const mockReaddirSync = vi.mocked(readdirSync);

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProjectContextService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateProject', () => {
    it('should return error when path is empty', () => {
      const result = service.validateProject('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Project path is required');
    });

    it('should return error when path does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      const result = service.validateProject('/non/existent/path');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Project path does not exist');
    });

    it('should return error when path is not a directory', () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({
        isDirectory: () => false
      } as ReturnType<typeof statSync>);

      const result = service.validateProject('/path/to/file.txt');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Project path is not a directory');
    });

    it('should return valid with hasSpecwright false when specwright/ and agent-os/ directories are missing', () => {
      mockExistsSync.mockImplementation((path: PathLike) => {
        const pathStr = path.toString();
        if (pathStr.endsWith('specwright') || pathStr.endsWith('agent-os')) {
          return false;
        }
        return true;
      });
      mockStatSync.mockReturnValue({
        isDirectory: () => true
      } as ReturnType<typeof statSync>);
      mockReaddirSync.mockReturnValue(['src', 'README.md'] as unknown as ReturnType<typeof readdirSync>);

      const result = service.validateProject('/Users/dev/my-project');

      expect(result.valid).toBe(true);
      expect(result.hasSpecwright).toBe(false);
      expect(result.hasProductBrief).toBe(false);
      expect(result.fileCount).toBe(2);
    });

    it('should return valid with hasSpecwright true when specwright/ exists', () => {
      mockExistsSync.mockImplementation((path: PathLike) => {
        const pathStr = path.toString();
        // product-brief.md does not exist
        if (pathStr.includes('product-brief.md')) {
          return false;
        }
        return true;
      });
      mockStatSync.mockReturnValue({
        isDirectory: () => true
      } as ReturnType<typeof statSync>);
      mockReaddirSync.mockReturnValue(['src', 'specwright', 'package.json'] as unknown as ReturnType<typeof readdirSync>);

      const result = service.validateProject('/Users/dev/my-project');

      expect(result.valid).toBe(true);
      expect(result.hasSpecwright).toBe(true);
      expect(result.hasProductBrief).toBe(false);
      expect(result.name).toBe('my-project');
    });

    it('should detect product brief when it exists', () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({
        isDirectory: () => true
      } as ReturnType<typeof statSync>);
      mockReaddirSync.mockReturnValue(['src', 'specwright'] as unknown as ReturnType<typeof readdirSync>);

      const result = service.validateProject('/Users/dev/my-project');

      expect(result.valid).toBe(true);
      expect(result.hasSpecwright).toBe(true);
      expect(result.hasProductBrief).toBe(true);
    });

    it('should count top-level entries excluding hidden dirs and node_modules', () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({
        isDirectory: () => true
      } as ReturnType<typeof statSync>);
      mockReaddirSync.mockReturnValue([
        'src', 'package.json', 'README.md', '.git', '.env', 'node_modules', 'specwright'
      ] as unknown as ReturnType<typeof readdirSync>);

      const result = service.validateProject('/Users/dev/my-project');

      expect(result.valid).toBe(true);
      // Visible entries: src, package.json, README.md, specwright = 4 (excludes .git, .env, node_modules)
      expect(result.fileCount).toBe(4);
    });

    it('should extract project name from path basename', () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({
        isDirectory: () => true
      } as ReturnType<typeof statSync>);
      mockReaddirSync.mockReturnValue([] as unknown as ReturnType<typeof readdirSync>);

      const result = service.validateProject('/Users/dev/awesome-project');

      expect(result.name).toBe('awesome-project');
    });
  });

  describe('switchProject', () => {
    it('should return error for invalid project path', () => {
      mockExistsSync.mockReturnValue(false);

      const result = service.switchProject('session-1', '/invalid/path');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Project path does not exist');
    });

    it('should return error when project has no specwright directory', () => {
      mockExistsSync.mockImplementation((path: PathLike) => {
        const pathStr = path.toString();
        if (pathStr.endsWith('specwright') || pathStr.endsWith('agent-os')) {
          return false;
        }
        return true;
      });
      mockStatSync.mockReturnValue({
        isDirectory: () => true
      } as ReturnType<typeof statSync>);
      mockReaddirSync.mockReturnValue(['src'] as unknown as ReturnType<typeof readdirSync>);

      const result = service.switchProject('session-1', '/Users/dev/my-project');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid project: missing specwright/ directory');
    });

    it('should switch project context for valid path with specwright', () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({
        isDirectory: () => true
      } as ReturnType<typeof statSync>);
      mockReaddirSync.mockReturnValue(['src', 'specwright'] as unknown as ReturnType<typeof readdirSync>);

      const result = service.switchProject('session-1', '/Users/dev/my-project');

      expect(result.success).toBe(true);
      expect(result.project).toBeDefined();
      expect(result.project?.name).toBe('my-project');
      expect(result.project?.path).toContain('my-project');
    });

    it('should allow different sessions to have different projects', () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({
        isDirectory: () => true
      } as ReturnType<typeof statSync>);
      mockReaddirSync.mockReturnValue(['src', 'specwright'] as unknown as ReturnType<typeof readdirSync>);

      service.switchProject('session-a', '/Users/dev/project-a');
      service.switchProject('session-b', '/Users/dev/project-b');

      const projectA = service.getCurrentProject('session-a');
      const projectB = service.getCurrentProject('session-b');

      expect(projectA?.name).toBe('project-a');
      expect(projectB?.name).toBe('project-b');
    });
  });

  describe('getCurrentProject', () => {
    it('should return null when no context exists', () => {
      const result = service.getCurrentProject('unknown-session');

      expect(result).toBeNull();
    });

    it('should return current project for active session', () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({
        isDirectory: () => true
      } as ReturnType<typeof statSync>);
      mockReaddirSync.mockReturnValue(['src', 'specwright'] as unknown as ReturnType<typeof readdirSync>);

      service.switchProject('session-1', '/Users/dev/my-project');

      const result = service.getCurrentProject('session-1');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('my-project');
    });
  });

  describe('getContext', () => {
    it('should return full context with activatedAt timestamp', () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({
        isDirectory: () => true
      } as ReturnType<typeof statSync>);
      mockReaddirSync.mockReturnValue(['src', 'specwright'] as unknown as ReturnType<typeof readdirSync>);

      const beforeSwitch = Date.now();
      service.switchProject('session-1', '/Users/dev/my-project');

      const context = service.getContext('session-1');

      expect(context).not.toBeNull();
      expect(context?.activatedAt).toBeGreaterThanOrEqual(beforeSwitch);
      expect(context?.activatedAt).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('clearContext', () => {
    it('should remove context for session', () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({
        isDirectory: () => true
      } as ReturnType<typeof statSync>);
      mockReaddirSync.mockReturnValue(['src', 'specwright'] as unknown as ReturnType<typeof readdirSync>);

      service.switchProject('session-1', '/Users/dev/my-project');
      expect(service.getCurrentProject('session-1')).not.toBeNull();

      service.clearContext('session-1');

      expect(service.getCurrentProject('session-1')).toBeNull();
    });

    it('should not affect other sessions', () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({
        isDirectory: () => true
      } as ReturnType<typeof statSync>);
      mockReaddirSync.mockReturnValue(['src', 'specwright'] as unknown as ReturnType<typeof readdirSync>);

      service.switchProject('session-a', '/Users/dev/project-a');
      service.switchProject('session-b', '/Users/dev/project-b');

      service.clearContext('session-a');

      expect(service.getCurrentProject('session-a')).toBeNull();
      expect(service.getCurrentProject('session-b')).not.toBeNull();
    });
  });

  describe('getAllContexts', () => {
    it('should return empty map when no contexts exist', () => {
      const contexts = service.getAllContexts();

      expect(contexts.size).toBe(0);
    });

    it('should return all active contexts', () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({
        isDirectory: () => true
      } as ReturnType<typeof statSync>);
      mockReaddirSync.mockReturnValue(['src', 'specwright'] as unknown as ReturnType<typeof readdirSync>);

      service.switchProject('session-a', '/Users/dev/project-a');
      service.switchProject('session-b', '/Users/dev/project-b');

      const contexts = service.getAllContexts();

      expect(contexts.size).toBe(2);
      expect(contexts.has('session-a')).toBe(true);
      expect(contexts.has('session-b')).toBe(true);
    });
  });

  describe('Gherkin scenarios', () => {
    describe('Szenario 1: Projekt-Kontext wechseln', () => {
      it('should switch to new project context', () => {
        // Given der Server läuft (service created)
        // And kein Projekt-Kontext ist aktiv
        expect(service.getCurrentProject('session-1')).toBeNull();

        // Setup mock for valid project
        mockExistsSync.mockReturnValue(true);
        mockStatSync.mockReturnValue({
          isDirectory: () => true
        } as ReturnType<typeof statSync>);
        mockReaddirSync.mockReturnValue(['src', 'specwright'] as unknown as ReturnType<typeof readdirSync>);

        // When ich einen POST Request an "/api/project/switch" mit Pfad "/Users/dev/my-project" sende
        const result = service.switchProject('session-1', '/Users/dev/my-project');

        // Then erhalte ich success: true
        expect(result.success).toBe(true);

        // And die Response enthält den Projekt-Namen "my-project"
        expect(result.project?.name).toBe('my-project');

        // And der Kontext ist für diesen Pfad initialisiert
        const current = service.getCurrentProject('session-1');
        expect(current?.path).toContain('my-project');
      });
    });

    describe('Szenario 3: Mehrere Projekte parallel', () => {
      it('should maintain separate contexts for different sessions', () => {
        mockExistsSync.mockReturnValue(true);
        mockStatSync.mockReturnValue({
          isDirectory: () => true
        } as ReturnType<typeof statSync>);
        mockReaddirSync.mockReturnValue(['src', 'specwright'] as unknown as ReturnType<typeof readdirSync>);

        // Given Nutzer A hat Projekt-Kontext "project-a" aktiv
        service.switchProject('user-a', '/Users/dev/project-a');

        // And Nutzer B hat Projekt-Kontext "project-b" aktiv
        service.switchProject('user-b', '/Users/dev/project-b');

        // When Nutzer A die Specs lädt (represented by getCurrentProject)
        const projectA = service.getCurrentProject('user-a');

        // Then erhält Nutzer A die Specs von "project-a"
        expect(projectA?.name).toBe('project-a');

        // And Nutzer B erhält weiterhin die Specs von "project-b"
        const projectB = service.getCurrentProject('user-b');
        expect(projectB?.name).toBe('project-b');
      });
    });

    describe('Szenario 4: Projekt-Validierung', () => {
      it('should accept project without specwright/ but mark hasSpecwright as false', () => {
        // Given der Server läuft
        // Setup: path exists but neither specwright/ nor agent-os/ exist
        mockExistsSync.mockImplementation((path: PathLike) => {
          const pathStr = path.toString();
          if (pathStr.endsWith('specwright') || pathStr.endsWith('agent-os')) {
            return false;
          }
          return true;
        });
        mockStatSync.mockReturnValue({
          isDirectory: () => true
        } as ReturnType<typeof statSync>);
        mockReaddirSync.mockReturnValue(['src', 'README.md'] as unknown as ReturnType<typeof readdirSync>);

        // When ich validiere einen Pfad ohne specwright/ oder agent-os/ Unterordner
        const result = service.validateProject('/Users/dev/invalid-folder');

        // Then ist die Validierung erfolgreich
        expect(result.valid).toBe(true);

        // And hasSpecwright ist false
        expect(result.hasSpecwright).toBe(false);

        // And fileCount is available
        expect(result.fileCount).toBe(2);
      });
    });

    describe('Szenario 5: Projekt-Pfad existiert nicht', () => {
      it('should return error for non-existent path', () => {
        // Given der Server läuft
        mockExistsSync.mockReturnValue(false);

        // When ich einen POST Request mit nicht existierendem Pfad sende
        const result = service.switchProject('session-1', '/non/existent/path');

        // Then ist success false
        expect(result.success).toBe(false);

        // And die Response enthält "Project path does not exist"
        expect(result.error).toBe('Project path does not exist');
      });
    });

    describe('IW-001 Szenario 1: Projekt ohne Specwright wird erkannt', () => {
      it('should detect project without specwright as hasSpecwright false', () => {
        mockExistsSync.mockImplementation((path: PathLike) => {
          const pathStr = path.toString();
          if (pathStr.endsWith('specwright') || pathStr.endsWith('agent-os')) {
            return false;
          }
          return true;
        });
        mockStatSync.mockReturnValue({
          isDirectory: () => true
        } as ReturnType<typeof statSync>);
        mockReaddirSync.mockReturnValue(['src', 'package.json', 'README.md'] as unknown as ReturnType<typeof readdirSync>);

        const result = service.validateProject('/home/user/my-new-project');

        expect(result.valid).toBe(true);
        expect(result.hasSpecwright).toBe(false);
        expect(result.hasProductBrief).toBe(false);
        expect(result.fileCount).toBe(3);
      });
    });

    describe('IW-001 Szenario 2: Projekt mit Specwright und Product Brief', () => {
      it('should detect fully configured project', () => {
        mockExistsSync.mockReturnValue(true);
        mockStatSync.mockReturnValue({
          isDirectory: () => true
        } as ReturnType<typeof statSync>);
        mockReaddirSync.mockReturnValue(['src', 'specwright'] as unknown as ReturnType<typeof readdirSync>);

        const result = service.validateProject('/home/user/my-existing-project');

        expect(result.valid).toBe(true);
        expect(result.hasSpecwright).toBe(true);
        expect(result.hasProductBrief).toBe(true);
      });
    });

    describe('IW-001 Szenario 3: Specwright ohne Product Brief (install.sh)', () => {
      it('should detect specwright installed but no product brief', () => {
        mockExistsSync.mockImplementation((path: PathLike) => {
          const pathStr = path.toString();
          if (pathStr.includes('product-brief.md')) {
            return false;
          }
          return true;
        });
        mockStatSync.mockReturnValue({
          isDirectory: () => true
        } as ReturnType<typeof statSync>);
        mockReaddirSync.mockReturnValue(['src', 'specwright'] as unknown as ReturnType<typeof readdirSync>);

        const result = service.validateProject('/home/user/installed-project');

        expect(result.valid).toBe(true);
        expect(result.hasSpecwright).toBe(true);
        expect(result.hasProductBrief).toBe(false);
      });
    });

    describe('IW-001 Szenario 4: Bestandsprojekt-Erkennung via Dateianzahl', () => {
      it('should return high file count for existing projects', () => {
        mockExistsSync.mockImplementation((path: PathLike) => {
          const pathStr = path.toString();
          if (pathStr.endsWith('specwright') || pathStr.endsWith('agent-os')) {
            return false;
          }
          return true;
        });
        mockStatSync.mockReturnValue({
          isDirectory: () => true
        } as ReturnType<typeof statSync>);
        const manyFiles = Array.from({ length: 15 }, (_, i) => `file-${i}.ts`);
        mockReaddirSync.mockReturnValue(manyFiles as unknown as ReturnType<typeof readdirSync>);

        const result = service.validateProject('/home/user/existing-project');

        expect(result.valid).toBe(true);
        expect(result.fileCount).toBe(15);
        expect(result.hasSpecwright).toBe(false);
      });
    });

    describe('IW-001 Edge Case: .agent-os Product Brief', () => {
      it('should detect product brief under .agent-os/', () => {
        mockExistsSync.mockImplementation((path: PathLike) => {
          const pathStr = path.toString();
          // specwright/ doesn't exist, but agent-os/ does
          if (pathStr.endsWith('/specwright') && !pathStr.includes('.agent-os')) {
            return false;
          }
          // .specwright doesn't exist
          if (pathStr.endsWith('.specwright')) {
            return false;
          }
          return true;
        });
        mockStatSync.mockReturnValue({
          isDirectory: () => true
        } as ReturnType<typeof statSync>);
        mockReaddirSync.mockReturnValue(['src', 'agent-os'] as unknown as ReturnType<typeof readdirSync>);

        const result = service.validateProject('/home/user/legacy-project');

        expect(result.valid).toBe(true);
        expect(result.hasSpecwright).toBe(true);
        expect(result.hasProductBrief).toBe(true);
      });
    });

    describe('Szenario 6: Aktuelles Projekt abrufen', () => {
      it('should return current project details', () => {
        mockExistsSync.mockReturnValue(true);
        mockStatSync.mockReturnValue({
          isDirectory: () => true
        } as ReturnType<typeof statSync>);
        mockReaddirSync.mockReturnValue(['src', 'specwright'] as unknown as ReturnType<typeof readdirSync>);

        // Given der Projekt-Kontext ist auf "/Users/dev/my-project" gesetzt
        service.switchProject('session-1', '/Users/dev/my-project');

        // When ich die aktuelle Projekt-Info abfrage
        const current = service.getCurrentProject('session-1');

        // Then erhalte ich die korrekten Details
        expect(current).not.toBeNull();

        // And die Response enthält den Pfad
        expect(current?.path).toContain('my-project');

        // And die Response enthält den Namen
        expect(current?.name).toBe('my-project');
      });
    });
  });
});
