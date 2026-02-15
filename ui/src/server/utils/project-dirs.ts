import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Resolves the project directory name for a given project path.
 * Supports both 'specwright/' (new standard) and 'agent-os/' (backward compatibility).
 *
 * @param projectPath - Absolute path to the project root
 * @returns 'specwright' or 'agent-os' depending on which directory exists
 */
export function resolveProjectDir(projectPath: string): string {
  if (existsSync(join(projectPath, 'specwright'))) {
    return 'specwright';
  }
  if (existsSync(join(projectPath, 'agent-os'))) {
    return 'agent-os';
  }
  // Default to specwright for new projects
  return 'specwright';
}

/**
 * Resolves the dot-directory name (.specwright/ or .agent-os/).
 *
 * @param projectPath - Absolute path to the project root
 * @returns '.specwright' or '.agent-os' depending on which directory exists
 */
export function resolveDotDir(projectPath: string): string {
  if (existsSync(join(projectPath, '.specwright'))) {
    return '.specwright';
  }
  if (existsSync(join(projectPath, '.agent-os'))) {
    return '.agent-os';
  }
  return '.specwright';
}

/**
 * Resolves the command directory name within .claude/commands/.
 * Supports both 'specwright' and 'agent-os' command directories.
 *
 * @param projectPath - Absolute path to the project root
 * @returns 'specwright' or 'agent-os' depending on which command directory exists
 */
export function resolveCommandDir(projectPath: string): string {
  if (existsSync(join(projectPath, '.claude', 'commands', 'specwright'))) {
    return 'specwright';
  }
  if (existsSync(join(projectPath, '.claude', 'commands', 'agent-os'))) {
    return 'agent-os';
  }
  return 'specwright';
}

/**
 * Resolves the global templates directory (~/.specwright/ or ~/.agent-os/).
 *
 * @returns Full path to the global templates directory
 */
export function resolveGlobalDir(): string {
  const home = homedir();
  if (existsSync(join(home, '.specwright'))) {
    return join(home, '.specwright');
  }
  if (existsSync(join(home, '.agent-os'))) {
    return join(home, '.agent-os');
  }
  return join(home, '.specwright');
}

/**
 * Builds a path to a project subdirectory (e.g., specs, backlog, product).
 *
 * @param projectPath - Absolute path to the project root
 * @param subpath - Subdirectory path segments (e.g., 'specs', specId)
 * @returns Full resolved path
 */
export function projectDir(projectPath: string, ...subpath: string[]): string {
  return join(projectPath, resolveProjectDir(projectPath), ...subpath);
}

/**
 * Builds a path to a project dot-directory subdirectory (e.g., chat-images).
 *
 * @param projectPath - Absolute path to the project root
 * @param subpath - Subdirectory path segments
 * @returns Full resolved path
 */
export function projectDotDir(projectPath: string, ...subpath: string[]): string {
  return join(projectPath, resolveDotDir(projectPath), ...subpath);
}
