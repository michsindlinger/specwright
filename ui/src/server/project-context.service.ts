import { existsSync, statSync, readdirSync } from 'fs';
import { basename, resolve, normalize, join } from 'path';
import { resolveProjectDir, resolveCommandDir } from './utils/project-dirs.js';
import { checkDefaultCliAvailability } from './model-config.js';

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
  hasSpecwright?: boolean;
  hasProductBrief?: boolean;
  needsMigration?: boolean;
  hasIncompleteInstallation?: boolean;
  hasClaudeCli?: boolean;
  fileCount?: number;
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

    // switchProject requires specwright to be installed
    if (!validation.hasSpecwright) {
      const projectDirName = resolveProjectDir(this.normalizePath(projectPath));
      return {
        success: false,
        error: `Invalid project: missing ${projectDirName}/ directory`
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

    // Check for specwright/ or agent-os/ subdirectory
    const hasSpecwright = this.detectSpecwright(normalizedPath);

    // Check if project uses agent-os/ and needs migration to specwright/
    const needsMigration = this.detectNeedsMigration(normalizedPath);

    // Check for incomplete installation (only meaningful if specwright exists)
    const hasIncompleteInstallation = hasSpecwright
      ? this.detectIncompleteInstallation(normalizedPath)
      : false;

    // Check for product brief (only meaningful if specwright exists)
    const hasProductBrief = hasSpecwright
      ? this.detectProductBrief(normalizedPath)
      : false;

    // Count top-level entries (excluding hidden dirs like .git, node_modules)
    const fileCount = this.countTopLevelEntries(normalizedPath);

    // Check if the default CLI command is available in PATH
    const { available: hasClaudeCli } = checkDefaultCliAvailability();

    return {
      valid: true,
      name: basename(normalizedPath),
      hasSpecwright,
      hasProductBrief,
      needsMigration,
      hasIncompleteInstallation,
      hasClaudeCli,
      fileCount
    };
  }

  /**
   * Detects whether a project has specwright/ or agent-os/ installed.
   */
  private detectSpecwright(projectPath: string): boolean {
    const projectDirName = resolveProjectDir(projectPath);
    const projectSubPath = resolve(projectPath, projectDirName);

    // Prevent path traversal
    if (!projectSubPath.startsWith(projectPath)) {
      return false;
    }

    if (!existsSync(projectSubPath)) {
      return false;
    }

    try {
      const projectSubStats = statSync(projectSubPath);
      return projectSubStats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Detects whether a project uses agent-os/ and needs migration to specwright/.
   * Returns true if agent-os/ exists AND specwright/ does NOT exist.
   */
  private detectNeedsMigration(projectPath: string): boolean {
    const hasAgentOs = existsSync(resolve(projectPath, 'agent-os'));
    const hasSpecwrightDir = existsSync(resolve(projectPath, 'specwright'));
    return hasAgentOs && !hasSpecwrightDir;
  }

  /**
   * Detects whether a product brief or platform brief exists in the project.
   * Checks under the resolved project dir (specwright/ or agent-os/).
   */
  private detectProductBrief(projectPath: string): boolean {
    const projectDirName = resolveProjectDir(projectPath);
    const productDir = join(projectPath, projectDirName, 'product');
    const productBrief = join(productDir, 'product-brief.md');
    const platformBrief = join(productDir, 'platform-brief.md');
    return existsSync(productBrief) || existsSync(platformBrief);
  }

  /**
   * Detects whether a specwright installation is incomplete.
   * Checks for sentinel files from setup.sh and setup-claude-code.sh.
   * Returns true if specwright/ exists but key workflow or command files are missing.
   */
  private detectIncompleteInstallation(projectPath: string): boolean {
    const projectDirName = resolveProjectDir(projectPath);
    const commandDirName = resolveCommandDir(projectPath);

    const workflowSentinel = join(projectPath, projectDirName, 'workflows', 'core', 'create-spec.md');
    const commandSentinel = join(projectPath, '.claude', 'commands', commandDirName, 'create-spec.md');

    return !existsSync(workflowSentinel) || !existsSync(commandSentinel);
  }

  /**
   * Counts visible top-level entries in a directory.
   * Excludes hidden directories (starting with .) and node_modules.
   */
  private countTopLevelEntries(projectPath: string): number {
    try {
      const entries = readdirSync(projectPath);
      return entries.filter(entry =>
        !entry.startsWith('.') && entry !== 'node_modules'
      ).length;
    } catch {
      return 0;
    }
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
