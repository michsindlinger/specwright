import type { Project } from '../context/project-context.js';
import { gateway } from '../gateway.js';

const STORAGE_KEY = 'specwright-open-projects';
const ACTIVE_PROJECT_KEY = 'specwright-active-project';
const WIZARD_NEEDED_PREFIX = 'specwright-wizard-needed-';

interface StoredProjectState {
  openProjects: Project[];
  activeProjectId: string | null;
}

interface SwitchProjectResult {
  success: boolean;
  error?: string;
}

/**
 * Service for managing project state, persistence, and backend synchronization.
 * Uses sessionStorage for tab-persistence across browser refresh.
 */
class ProjectStateService {
  private switchInProgress = false;
  private switchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 150;

  /**
   * Load persisted project state from sessionStorage.
   * Returns null if no state is stored or state is invalid.
   */
  loadPersistedState(): StoredProjectState | null {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const state = JSON.parse(stored) as StoredProjectState;
      if (!this.isValidStoredState(state)) return null;

      return state;
    } catch {
      return null;
    }
  }

  /**
   * Persist project state to sessionStorage.
   */
  persistState(openProjects: Project[], activeProjectId: string | null): void {
    try {
      const state: StoredProjectState = {
        openProjects,
        activeProjectId,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // sessionStorage unavailable (privacy mode), silently fail
    }
  }

  /**
   * Clear persisted state from sessionStorage.
   */
  clearPersistedState(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(ACTIVE_PROJECT_KEY);
    } catch {
      // silently fail
    }
  }

  /**
   * Switch project context - updates backend and WebSocket connection.
   * Debounces rapid tab switching to prevent race conditions.
   *
   * @param project - Project to switch to
   * @returns Promise with success/error result
   */
  async switchProject(project: Project): Promise<SwitchProjectResult> {
    // Debounce rapid switching
    if (this.switchDebounceTimer !== null) {
      globalThis.clearTimeout(this.switchDebounceTimer);
      this.switchDebounceTimer = null;
    }

    return new Promise((resolve) => {
      this.switchDebounceTimer = globalThis.setTimeout(async () => {
        this.switchDebounceTimer = null;

        // Prevent concurrent switches
        if (this.switchInProgress) {
          resolve({ success: false, error: 'Switch already in progress' });
          return;
        }

        this.switchInProgress = true;

        try {
          // 1. Call backend API to switch project context
          const response = await fetch('/api/project/switch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-session-id': this.getSessionId(),
            },
            body: JSON.stringify({ path: project.path }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              (errorData as { error?: string }).error || `HTTP ${response.status}`
            );
          }

          // 2. Switch WebSocket project context and wait for acknowledgment
          await this.switchWebSocketProject(project.path);

          resolve({ success: true });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          resolve({ success: false, error: message });
        } finally {
          this.switchInProgress = false;
        }
      }, this.DEBOUNCE_MS);
    });
  }

  /**
   * Validate a project path is still accessible.
   * Used during state restoration after browser refresh.
   */
  async validateProject(path: string): Promise<boolean> {
    try {
      const response = await fetch('/api/project/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path }),
      });

      if (!response.ok) return false;

      const data = (await response.json()) as { valid: boolean };
      return data.valid === true;
    } catch {
      return false;
    }
  }

  /**
   * Restore projects after browser refresh.
   * Validates each project and removes invalid ones.
   *
   * @param projects - Projects to restore
   * @returns Object with valid projects and list of removed invalid paths
   */
  async restoreProjects(
    projects: Project[]
  ): Promise<{ validProjects: Project[]; removedPaths: string[] }> {
    const validProjects: Project[] = [];
    const removedPaths: string[] = [];

    // Validate all projects in parallel
    const validationResults = await Promise.all(
      projects.map(async (project) => ({
        project,
        isValid: await this.validateProject(project.path),
      }))
    );

    for (const { project, isValid } of validationResults) {
      if (isValid) {
        validProjects.push(project);
      } else {
        removedPaths.push(project.path);
      }
    }

    return { validProjects, removedPaths };
  }

  /**
   * Check if the wizard is needed for a given project path.
   * Returns true if the wizard-needed key exists in sessionStorage.
   */
  isWizardNeeded(projectPath: string): boolean {
    try {
      return sessionStorage.getItem(WIZARD_NEEDED_PREFIX + projectPath) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Mark that the wizard is needed for a given project path.
   * Called when the wizard is shown (so it reappears after cancel).
   */
  setWizardNeeded(projectPath: string): void {
    try {
      sessionStorage.setItem(WIZARD_NEEDED_PREFIX + projectPath, 'true');
    } catch {
      // sessionStorage unavailable, silently fail
    }
  }

  /**
   * Mark that the wizard is no longer needed for a given project path.
   * Called when the wizard completes successfully.
   */
  clearWizardNeeded(projectPath: string): void {
    try {
      sessionStorage.removeItem(WIZARD_NEEDED_PREFIX + projectPath);
    } catch {
      // sessionStorage unavailable, silently fail
    }
  }

  /**
   * Send project switch message via WebSocket and wait for acknowledgment.
   * This ensures the WebSocket connection has the correct projectId before
   * any subsequent requests (like specs.list) are made.
   */
  private async switchWebSocketProject(projectPath: string): Promise<void> {
    // Start waiting for ACK before sending the message
    const ackPromise = gateway.waitFor('project.switch.ack', 5000);

    // Send project.switch message to register the connection to this project
    gateway.send({
      type: 'project.switch',
      path: projectPath,
    });

    // Wait for acknowledgment
    await ackPromise;
  }

  /**
   * Get or create a session ID for this browser session.
   */
  private getSessionId(): string {
    try {
      let sessionId = sessionStorage.getItem('specwright-session-id');
      if (!sessionId) {
        sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem('specwright-session-id', sessionId);
      }
      return sessionId;
    } catch {
      return 'default-session';
    }
  }

  /**
   * Validate that stored state has expected structure.
   */
  private isValidStoredState(state: unknown): state is StoredProjectState {
    if (!state || typeof state !== 'object') return false;

    const s = state as Record<string, unknown>;
    if (!Array.isArray(s.openProjects)) return false;

    // Validate each project has required fields
    for (const project of s.openProjects) {
      if (!this.isValidProject(project)) return false;
    }

    return (
      s.activeProjectId === null || typeof s.activeProjectId === 'string'
    );
  }

  /**
   * Validate a single project object.
   */
  private isValidProject(project: unknown): project is Project {
    if (!project || typeof project !== 'object') return false;

    const p = project as Record<string, unknown>;
    return (
      typeof p.id === 'string' &&
      typeof p.name === 'string' &&
      typeof p.path === 'string'
    );
  }
}

export const projectStateService = new ProjectStateService();
