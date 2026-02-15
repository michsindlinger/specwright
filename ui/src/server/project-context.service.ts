import { existsSync, statSync } from 'fs';
import { basename, resolve, normalize } from 'path';
import { resolveProjectDir } from './utils/project-dirs.js';

export interface ProjectContext {
  path: string;
  name: string;
  activatedAt: number;
}

export interface SwitchResult {
  success: boolean;
  project?: ProjectContext;
  error?: string;
}

export interface ValidateResult {
  valid: boolean;
  name?: string;
  error?: string;
}

export interface CurrentProjectResult {
  path: string;
  name: string;
}

/**
 * ProjectContextService manages project contexts per client session.
 * Each WebSocket client (identified by sessionId) can have its own active project.
 * This enables multiple clients to work on different projects simultaneously.
 */
export class ProjectContextService {
  private contexts: Map<string, ProjectContext> = new Map();

  /**
   * Switches the project context for a given session.
   * Validates that the path exists and contains a specwright/ (or agent-os/) subdirectory.
   *
   * @param sessionId - The client session identifier
   * @param projectPath - The absolute path to the project
   * @returns Result with the project context or error
   */
  switchProject(sessionId: string, projectPath: string): SwitchResult {
    const validation = this.validateProject(projectPath);

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    const normalizedPath = this.normalizePath(projectPath);
    const projectName = validation.name || basename(normalizedPath);

    const context: ProjectContext = {
      path: normalizedPath,
      name: projectName,
      activatedAt: Date.now()
    };

    this.contexts.set(sessionId, context);

    return {
      success: true,
      project: context
    };
  }

  /**
   * Validates a project path without switching context.
   * Checks that the path exists, is a directory, and contains specwright/ (or agent-os/) subdirectory.
   *
   * @param projectPath - The path to validate
   * @returns Validation result with project name if valid
   */
  validateProject(projectPath: string): ValidateResult {
    if (!projectPath || typeof projectPath !== 'string') {
      return {
        valid: false,
        error: 'Project path is required'
      };
    }

    const normalizedPath = this.normalizePath(projectPath);

    // Check if path exists
    if (!existsSync(normalizedPath)) {
      return {
        valid: false,
        error: 'Project path does not exist'
      };
    }

    // Check if it's a directory
    try {
      const stats = statSync(normalizedPath);
      if (!stats.isDirectory()) {
        return {
          valid: false,
          error: 'Project path is not a directory'
        };
      }
    } catch {
      return {
        valid: false,
        error: 'Cannot access project path'
      };
    }

    // Check for specwright/ or agent-os/ subdirectory (path traversal prevention included)
    const projectDirName = resolveProjectDir(normalizedPath);
    const projectSubPath = resolve(normalizedPath, projectDirName);

    // Prevent path traversal: ensure the resolved path is still within the project
    if (!projectSubPath.startsWith(normalizedPath)) {
      return {
        valid: false,
        error: 'Invalid project: path traversal detected'
      };
    }

    if (!existsSync(projectSubPath)) {
      return {
        valid: false,
        error: `Invalid project: missing ${projectDirName}/ directory`
      };
    }

    try {
      const projectSubStats = statSync(projectSubPath);
      if (!projectSubStats.isDirectory()) {
        return {
          valid: false,
          error: `Invalid project: ${projectDirName} is not a directory`
        };
      }
    } catch {
      return {
        valid: false,
        error: `Invalid project: cannot access ${projectDirName}/ directory`
      };
    }

    return {
      valid: true,
      name: basename(normalizedPath)
    };
  }

  /**
   * Gets the current project context for a session.
   *
   * @param sessionId - The client session identifier
   * @returns The current project context or null if none
   */
  getCurrentProject(sessionId: string): CurrentProjectResult | null {
    const context = this.contexts.get(sessionId);

    if (!context) {
      return null;
    }

    return {
      path: context.path,
      name: context.name
    };
  }

  /**
   * Gets the full project context including activation time.
   *
   * @param sessionId - The client session identifier
   * @returns The full project context or null if none
   */
  getContext(sessionId: string): ProjectContext | null {
    return this.contexts.get(sessionId) || null;
  }

  /**
   * Clears the project context for a session.
   *
   * @param sessionId - The client session identifier
   */
  clearContext(sessionId: string): void {
    this.contexts.delete(sessionId);
  }

  /**
   * Gets all active contexts (for monitoring/debugging).
   *
   * @returns Map of session IDs to project contexts
   */
  getAllContexts(): Map<string, ProjectContext> {
    return new Map(this.contexts);
  }

  /**
   * Normalizes a path for consistent comparison.
   * Resolves relative paths and removes trailing slashes.
   *
   * @param projectPath - The path to normalize
   * @returns Normalized absolute path
   */
  private normalizePath(projectPath: string): string {
    // Resolve to absolute path and normalize
    let normalized = resolve(normalize(projectPath));

    // Remove trailing slash if present (except for root)
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  }
}

// Export singleton instance for use across the application
export const projectContextService = new ProjectContextService();
