import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { resolveStoredPath, toStorablePath } from './utils/projects-root.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface Project {
  name: string;
  path: string;
}

export interface ProjectConfig {
  projects: Project[];
}

export interface ProjectWithStatus extends Project {
  exists: boolean;
  error?: string;
}

export class ProjectManager {
  private configPath: string;
  private currentProject: Project | null = null;

  constructor() {
    this.configPath = resolve(__dirname, '../../config.json');
    this.loadCurrentProject();
  }

  private loadCurrentProject(): void {
    const projects = this.listProjects();
    if (projects.length > 0 && projects[0].exists) {
      this.currentProject = {
        name: projects[0].name,
        path: projects[0].path
      };
    }
  }

  private loadConfig(): ProjectConfig {
    try {
      const content = readFileSync(this.configPath, 'utf-8');
      return JSON.parse(content) as ProjectConfig;
    } catch {
      return { projects: [] };
    }
  }

  private saveConfig(config: ProjectConfig): void {
    writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  public listProjects(): ProjectWithStatus[] {
    const config = this.loadConfig();
    return config.projects.map((project) => {
      const resolvedPath = resolveStoredPath(project.path);
      return {
        name: project.name,
        path: resolvedPath,
        exists: this.validatePath(resolvedPath)
      };
    });
  }

  public validatePath(projectPath: string): boolean {
    try {
      return existsSync(projectPath);
    } catch {
      return false;
    }
  }

  public selectProject(name: string): { success: boolean; project?: Project; error?: string } {
    const projects = this.listProjects();
    const project = projects.find((p) => p.name === name);

    if (!project) {
      return { success: false, error: `Project "${name}" not found in config` };
    }

    if (!project.exists) {
      return { success: false, error: `Project path not found: ${project.path}` };
    }

    this.currentProject = { name: project.name, path: project.path };
    return { success: true, project: this.currentProject };
  }

  public getCurrentProject(): Project | null {
    return this.currentProject;
  }

  public addProject(name: string, path: string): { success: boolean; error?: string } {
    const resolvedPath = resolveStoredPath(path);
    if (!this.validatePath(resolvedPath)) {
      return { success: false, error: `Path does not exist: ${resolvedPath}` };
    }

    const config = this.loadConfig();
    const exists = config.projects.some((p) => p.name === name);

    if (exists) {
      return { success: false, error: `Project "${name}" already exists` };
    }

    const storedPath = toStorablePath(resolvedPath);
    config.projects.push({ name, path: storedPath });
    this.saveConfig(config);

    if (!this.currentProject) {
      this.currentProject = { name, path: resolvedPath };
    }

    return { success: true };
  }

  public removeProject(name: string): { success: boolean; error?: string } {
    const config = this.loadConfig();
    const index = config.projects.findIndex((p) => p.name === name);

    if (index === -1) {
      return { success: false, error: `Project "${name}" not found` };
    }

    config.projects.splice(index, 1);
    this.saveConfig(config);

    if (this.currentProject?.name === name) {
      const projects = this.listProjects();
      this.currentProject = projects.length > 0 ? { name: projects[0].name, path: projects[0].path } : null;
    }

    return { success: true };
  }
}
