import { createContext } from '@lit/context';

/**
 * Project interface for multi-project support.
 * Represents an open project in the application.
 */
export interface Project {
  id: string;
  name: string;
  path: string;
}

/**
 * Project context value interface.
 * Contains the active project, open projects list, and context switching function.
 */
export interface ProjectContextValue {
  /** Currently active project or null if none */
  activeProject: Project | null;
  /** List of all open projects */
  openProjects: Project[];
  /** Switch to a different project by ID */
  switchProject: (projectId: string) => void;
  /** Add a new project */
  addProject: (project: Project) => void;
  /** Close/remove a project by ID */
  closeProject: (projectId: string) => void;
}

/**
 * Default context value for initial state.
 */
export const defaultProjectContext: ProjectContextValue = {
  activeProject: null,
  openProjects: [],
  switchProject: () => {
    // No-op by default, will be implemented by provider
  },
  addProject: () => {
    // No-op by default, will be implemented by provider
  },
  closeProject: () => {
    // No-op by default, will be implemented by provider
  },
};

/**
 * Lit Context for project state.
 * Use with ContextProvider in app.ts and @consume decorator in views.
 *
 * @example
 * // In provider (app.ts):
 * import { ContextProvider } from '@lit/context';
 * import { projectContext } from './context/project-context.js';
 *
 * private provider = new ContextProvider(this, {
 *   context: projectContext,
 *   initialValue: { activeProject: null, openProjects: [], ... }
 * });
 *
 * @example
 * // In consumer (dashboard-view.ts):
 * import { consume } from '@lit/context';
 * import { projectContext, ProjectContextValue } from '../context/project-context.js';
 *
 * @consume({ context: projectContext, subscribe: true })
 * private projectCtx!: ProjectContextValue;
 */
export const projectContext = createContext<ProjectContextValue>(
  Symbol('project-context')
);
