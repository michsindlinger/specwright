import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getProjectsRoot, resolveStoredPath, toStorablePath } from '../../src/server/utils/projects-root.js';

describe('projects-root', () => {
  const originalEnv = process.env.SPECWRIGHT_PROJECTS_ROOT;

  beforeEach(() => {
    delete process.env.SPECWRIGHT_PROJECTS_ROOT;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.SPECWRIGHT_PROJECTS_ROOT;
    } else {
      process.env.SPECWRIGHT_PROJECTS_ROOT = originalEnv;
    }
  });

  describe('getProjectsRoot', () => {
    it('returns null when env var is unset', () => {
      expect(getProjectsRoot()).toBeNull();
    });

    it('returns null when env var is empty string', () => {
      process.env.SPECWRIGHT_PROJECTS_ROOT = '';
      expect(getProjectsRoot()).toBeNull();
    });

    it('returns null when env var is whitespace', () => {
      process.env.SPECWRIGHT_PROJECTS_ROOT = '   ';
      expect(getProjectsRoot()).toBeNull();
    });

    it('returns trimmed path when env var is set', () => {
      process.env.SPECWRIGHT_PROJECTS_ROOT = '  /mnt/shared-projects  ';
      expect(getProjectsRoot()).toBe('/mnt/shared-projects');
    });
  });

  describe('resolveStoredPath', () => {
    it('returns absolute path unchanged when env unset', () => {
      expect(resolveStoredPath('/Users/foo/project-a')).toBe('/Users/foo/project-a');
    });

    it('returns relative path unchanged when env unset', () => {
      expect(resolveStoredPath('project-a')).toBe('project-a');
    });

    it('joins relative path with root when env set', () => {
      process.env.SPECWRIGHT_PROJECTS_ROOT = '/mnt/shared-projects';
      expect(resolveStoredPath('project-a')).toBe('/mnt/shared-projects/project-a');
    });

    it('returns absolute path unchanged even when env set (backward compat)', () => {
      process.env.SPECWRIGHT_PROJECTS_ROOT = '/mnt/shared-projects';
      expect(resolveStoredPath('/Users/foo/project-a')).toBe('/Users/foo/project-a');
    });
  });

  describe('toStorablePath', () => {
    it('returns absolute path unchanged when env unset', () => {
      expect(toStorablePath('/Users/foo/project-a')).toBe('/Users/foo/project-a');
    });

    it('returns relative path when absolute path is under root', () => {
      process.env.SPECWRIGHT_PROJECTS_ROOT = '/mnt/shared-projects';
      expect(toStorablePath('/mnt/shared-projects/project-a')).toBe('project-a');
    });

    it('returns relative path for nested project under root', () => {
      process.env.SPECWRIGHT_PROJECTS_ROOT = '/mnt/shared-projects';
      expect(toStorablePath('/mnt/shared-projects/team/project-a')).toBe('team/project-a');
    });

    it('returns absolute path unchanged when path is outside root', () => {
      process.env.SPECWRIGHT_PROJECTS_ROOT = '/mnt/shared-projects';
      expect(toStorablePath('/Users/foo/project-a')).toBe('/Users/foo/project-a');
    });

    it('returns absolute path unchanged when path equals root', () => {
      process.env.SPECWRIGHT_PROJECTS_ROOT = '/mnt/shared-projects';
      expect(toStorablePath('/mnt/shared-projects')).toBe('/mnt/shared-projects');
    });

    it('passes through non-absolute input unchanged', () => {
      process.env.SPECWRIGHT_PROJECTS_ROOT = '/mnt/shared-projects';
      expect(toStorablePath('project-a')).toBe('project-a');
    });
  });
});
