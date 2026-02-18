import { promises as fs } from 'fs';
import { join, basename, resolve, relative } from 'path';
import { withKanbanLock } from './utils/kanban-lock.js';
import { projectDir } from './utils/project-dirs.js';
import { attachmentStorageService } from './services/attachment-storage.service.js';

// MSK-003-FIX: Changed from 'opus' | 'sonnet' | 'haiku' to string
// to support all models from model-config.json (Anthropic + GLM)
export type ModelSelection = string;

export class KanbanJsonCorruptedError extends Error {
  constructor(public readonly path: string, public readonly cause: unknown) {
    super(`kanban.json is corrupted at ${path}: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'KanbanJsonCorruptedError';
  }
}

export interface SpecInfo {
  id: string;
  name: string;
  createdDate: string;
  storyCount: number;
  completedCount: number;
  inProgressCount: number;
  hasKanban: boolean;
  gitStrategy: 'branch' | 'worktree' | 'current-branch' | null;
  projectPath?: string;
  projectName?: string;
}

export interface ProjectSpecs {
  projectPath: string;
  projectName: string;
  specs: SpecInfo[];
}

export interface StoryInfo {
  id: string;
  title: string;
  type: string;
  priority: string;
  effort: string;
  status: 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked';
  dependencies: string[];
  dorComplete: boolean; // true = all DoR checkboxes [x] (Ready), false = any [ ] (Blocked)
  model: ModelSelection;
  file?: string; // Relative path to the story file within the spec folder (e.g., "stories/story-001.md")
  attachmentCount?: number;
}

export interface KanbanBoard {
  specId: string;
  stories: StoryInfo[];
  hasKanbanFile: boolean;
  currentPhase?: string | null;
  executionStatus?: string;
}

export interface StoryDetail {
  id: string;
  title: string;
  type: string;
  priority: string;
  effort: string;
  status: string;
  dependencies: string[];
  content: string; // Raw markdown content
  feature: string;
  acceptanceCriteria: string[];
  dorChecklist: string[];
  dodChecklist: string[];
}

export interface KanbanInitResult {
  exists: boolean;
  created: boolean;
  path?: string;
  reason?: string;
  blockedCount: number;
}

export interface SpecFileInfo {
  relativePath: string;
  filename: string;
}

export interface SpecFileGroup {
  folder: string;
  files: SpecFileInfo[];
}

export interface SyncNewStoriesResult {
  synced: boolean;
  newStoryCount: number;
  storyIds: string[];
  error?: string;
}

interface ParsedStoryForKanban {
  id: string;
  title: string;
  type: string;
  priority: string;
  effort: string;
  dependencies: string;
  status: 'Ready' | 'Blocked';
  dorComplete: boolean;
}

// ============================================================================
// Kanban JSON v1.0 Interfaces
// ============================================================================

type KanbanJsonStatus = 'ready' | 'in_progress' | 'in_review' | 'testing' | 'done' | 'blocked';
type KanbanJsonPhase = 'pending' | 'in_progress' | 'done';

interface KanbanJsonSpec {
  id: string;
  name: string;
  prefix: string;
  specFile: string;
  specLiteFile?: string;
  createdAt: string;
}

interface KanbanJsonResumeContext {
  currentPhase: string | null;
  nextPhase: string | null;
  worktreePath: string | null;
  gitBranch: string | null;
  gitStrategy: string | null;
  currentStory: string | null;
  currentStoryPhase: string | null;
  lastAction: string | null;
  nextAction: string | null;
  progressIndex: number;
  totalStories: number;
}

interface KanbanJsonExecution {
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  model: string | null;
}

interface KanbanJsonStoryTiming {
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface KanbanJsonStoryImplementation {
  filesModified: string[];
  commits: string[];
  notes: string | null;
}

interface KanbanJsonStoryVerification {
  dodChecked: boolean;
  integrationVerified: boolean;
}

interface KanbanJsonStory {
  id: string;
  title: string;
  file: string;
  type: string;
  priority: string;
  effort: number;
  status: KanbanJsonStatus;
  phase: KanbanJsonPhase;
  dependencies: string[];
  blockedBy: string[];
  model: string | null;
  timing: KanbanJsonStoryTiming;
  implementation: KanbanJsonStoryImplementation;
  verification: KanbanJsonStoryVerification;
}

interface KanbanJsonBoardStatus {
  total: number;
  ready: number;
  inProgress: number;
  inReview?: number;
  testing?: number;
  done: number;
  blocked: number;
}

interface KanbanJsonChangeLogEntry {
  timestamp: string;
  action: string;
  storyId: string | null;
  details: string;
}

interface KanbanJsonV1 {
  $schema?: string;
  version: string;
  spec: KanbanJsonSpec;
  resumeContext: KanbanJsonResumeContext;
  execution: KanbanJsonExecution;
  stories: KanbanJsonStory[];
  boardStatus: KanbanJsonBoardStatus;
  statistics?: {
    totalEffort: number;
    completedEffort: number;
    remainingEffort: number;
    progressPercent: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  };
  executionPlan?: {
    strategy: string;
    phases: Array<{
      phase: number;
      name: string;
      stories: string[];
      description: string;
    }>;
  };
  changeLog: KanbanJsonChangeLogEntry[];
}

export class SpecsReader {
  // ============================================================================
  // JSON Kanban Methods (Priority 1)
  // ============================================================================

  /**
   * Reads kanban.json from a spec folder.
   * Returns null if the file doesn't exist or is invalid.
   */
  private async readKanbanJson(specPath: string): Promise<KanbanJsonV1 | null> {
    const jsonPath = join(specPath, 'kanban.json');
    try {
      const content = await fs.readFile(jsonPath, 'utf-8');
      return JSON.parse(content) as KanbanJsonV1;
    } catch (error) {
      // File not found -> return null (normal, triggers MD fallback)
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      // Any other error (JSON parse, permission, etc.) -> corrupted
      throw new KanbanJsonCorruptedError(jsonPath, error);
    }
  }

  /**
   * Writes kanban.json to a spec folder with file locking.
   * Preserves formatting with 2-space indentation.
   * Uses same lock protocol as Kanban MCP Server for cross-process coordination.
   */
  private async writeKanbanJson(specPath: string, kanban: KanbanJsonV1): Promise<void> {
    await withKanbanLock(specPath, async () => {
      const jsonPath = join(specPath, 'kanban.json');
      await fs.writeFile(jsonPath, JSON.stringify(kanban, null, 2), 'utf-8');
    });
  }

  /**
   * Reads kanban.json without acquiring a lock.
   * MUST only be called from within a withKanbanLock() callback.
   */
  private async readKanbanJsonUnlocked(specPath: string): Promise<KanbanJsonV1 | null> {
    const jsonPath = join(specPath, 'kanban.json');
    try {
      const content = await fs.readFile(jsonPath, 'utf-8');
      return JSON.parse(content) as KanbanJsonV1;
    } catch (error) {
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw new KanbanJsonCorruptedError(jsonPath, error);
    }
  }

  /**
   * Writes kanban.json without acquiring a lock.
   * MUST only be called from within a withKanbanLock() callback.
   */
  private async writeKanbanJsonUnlocked(specPath: string, kanban: KanbanJsonV1): Promise<void> {
    const jsonPath = join(specPath, 'kanban.json');
    await fs.writeFile(jsonPath, JSON.stringify(kanban, null, 2), 'utf-8');
  }

  /**
   * Resolves dependencies for blocked stories.
   * A blocked story is unblocked to 'ready' when ALL its dependencies have status 'done'.
   * The entire read-modify-write is performed inside a single lock to prevent TOCTOU races.
   *
   * @returns Array of story IDs that were unblocked
   */
  public async resolveDependencies(projectPath: string, specId: string): Promise<string[]> {
    const specPath = projectDir(projectPath, 'specs', specId);

    return await withKanbanLock(specPath, async () => {
      const jsonKanban = await this.readKanbanJsonUnlocked(specPath);
      if (!jsonKanban) return [];

      const unblockedIds: string[] = [];

      for (const story of jsonKanban.stories) {
        if (story.status !== 'blocked' || !story.dependencies?.length) continue;

        const allSatisfied = story.dependencies.every(depId => {
          const dep = jsonKanban.stories.find(s => s.id === depId);
          return dep && (dep.status === 'done' || dep.status === 'in_review');
        });

        if (allSatisfied) {
          story.status = 'ready';
          story.phase = 'pending';
          unblockedIds.push(story.id);
          this.addChangeLogEntry(
            jsonKanban,
            'dependency_resolved',
            story.id,
            `Unblocked: all dependencies done/in_review (${story.dependencies.join(', ')})`
          );
        }
      }

      if (unblockedIds.length > 0) {
        this.updateBoardStatus(jsonKanban);
        await this.writeKanbanJsonUnlocked(specPath, jsonKanban);
        console.log(`[SpecsReader] Resolved dependencies: ${unblockedIds.join(', ')} unblocked`);
      }

      return unblockedIds;
    });
  }

  /**
   * Maps JSON status to frontend status.
   * JSON has more granular statuses (testing) that map to in_progress.
   * in_review is now a first-class frontend status.
   */
  private mapJsonStatusToFrontend(jsonStatus: KanbanJsonStatus): 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked' {
    switch (jsonStatus) {
      case 'in_progress':
      case 'testing':
        return 'in_progress';
      case 'in_review':
        return 'in_review';
      case 'done':
        return 'done';
      case 'blocked':
        return 'blocked';
      default: // 'ready'
        return 'backlog';
    }
  }

  /**
   * Maps frontend status to JSON status.
   */
  private mapFrontendStatusToJson(frontendStatus: 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked'): KanbanJsonStatus {
    switch (frontendStatus) {
      case 'in_progress':
        return 'in_progress';
      case 'in_review':
        return 'in_review';
      case 'done':
        return 'done';
      case 'blocked':
        return 'blocked';
      default:
        return 'ready';
    }
  }

  /**
   * Converts KanbanJsonV1 to KanbanBoard (frontend interface).
   * Uses story files for dorComplete status.
   * Supports both v1 format (type/priority/effort directly) and v2 format (classification object).
   */
  private convertJsonToKanbanBoard(
    json: KanbanJsonV1,
    storiesFromFiles: Map<string, StoryInfo>
  ): KanbanBoard {
    const stories: StoryInfo[] = json.stories.map(s => {
      // Handle v2 format with classification object
      const story = s as { classification?: { type?: string; priority?: string; effort?: string } };
      const classification = story.classification;

      const type = classification?.type || s.type;
      const priority = classification?.priority || s.priority;
      const effort = classification?.effort || s.effort;

      return {
        id: s.id,
        title: s.title,
        type,
        priority,
        effort: typeof effort === 'number' ? `${effort} SP` : effort,
        status: this.mapJsonStatusToFrontend(s.status),
        dependencies: s.dependencies,
        // Use dorComplete from story files if available, otherwise derive from status
        dorComplete: storiesFromFiles.get(s.id)?.dorComplete ?? (s.status !== 'blocked'),
        model: s.model || 'opus',
        file: (s as { storyFile?: string }).storyFile || s.file || undefined
      };
    });

    return {
      specId: json.spec.id,
      stories,
      hasKanbanFile: true,
      currentPhase: json.resumeContext?.currentPhase ?? null,
      executionStatus: json.execution?.status ?? undefined
    };
  }

  /**
   * Updates boardStatus counts based on current story statuses.
   */
  private updateBoardStatus(kanban: KanbanJsonV1): void {
    kanban.boardStatus = {
      total: kanban.stories.length,
      ready: kanban.stories.filter(s => s.status === 'ready').length,
      inProgress: kanban.stories.filter(s => s.status === 'in_progress').length,
      inReview: kanban.stories.filter(s => s.status === 'in_review').length,
      testing: kanban.stories.filter(s => s.status === 'testing').length,
      done: kanban.stories.filter(s => s.status === 'done').length,
      blocked: kanban.stories.filter(s => s.status === 'blocked').length
    };
  }

  /**
   * Adds an entry to the changelog.
   */
  private addChangeLogEntry(
    kanban: KanbanJsonV1,
    action: string,
    storyId: string | null,
    details: string
  ): void {
    kanban.changeLog.push({
      timestamp: new Date().toISOString(),
      action,
      storyId,
      details
    });
  }

  /**
   * story-001: Aggregates spec.md, spec-lite.md and kanban.json for chat context.
   */
  async getSpecContext(projectPath: string, specId: string): Promise<string> {
    const specPath = projectDir(projectPath, 'specs', specId);
    let context = '';

    const filesToRead = [
      { name: 'spec.md', path: join(specPath, 'spec.md') },
      { name: 'spec-lite.md', path: join(specPath, 'spec-lite.md') },
      { name: 'kanban.json', path: join(specPath, 'kanban.json') }
    ];

    for (const file of filesToRead) {
      try {
        const content = await fs.readFile(file.path, 'utf-8');
        context += `\n--- FILE: ${file.name} ---\n${content}\n`;
      } catch (error) {
        // Only log if not a "file not found" error, as spec-lite.md might be optional
        if (error instanceof Error && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.error(`Error reading ${file.name} for spec context:`, error);
        }
      }
    }

    return context.trim() || 'No spec context available.';
  }

  // ============================================================================
  // Spec File Discovery & Generalized Read/Save (SDVE-001)
  // ============================================================================

  /**
   * Validates a relative path within a spec folder to prevent path traversal.
   * Only allows .md files that resolve within the spec folder.
   * Pattern follows docs-reader.ts getValidatedDocPath.
   */
  private getValidatedSpecFilePath(specPath: string, relativePath: string): string | null {
    if (!relativePath || typeof relativePath !== 'string') {
      return null;
    }

    // Reject absolute paths and path traversal patterns
    if (relativePath.startsWith('/') || relativePath.startsWith('\\') || relativePath.includes('..')) {
      return null;
    }

    // Only allow .md files
    if (!relativePath.endsWith('.md')) {
      return null;
    }

    const resolvedPath = resolve(specPath, relativePath);
    const rel = relative(specPath, resolvedPath);

    // Ensure the resolved path stays within the spec folder
    if (rel.startsWith('..') || rel.includes('..')) {
      return null;
    }

    return resolvedPath;
  }

  /**
   * Lists all markdown files in a spec folder, grouped by directory.
   * Root files come first, then subdirectories alphabetically.
   * Files within each group are sorted alphabetically.
   */
  async listSpecFiles(projectPath: string, specId: string): Promise<SpecFileGroup[]> {
    const specPath = projectDir(projectPath, 'specs', specId);

    try {
      await fs.access(specPath);
    } catch {
      return [];
    }

    const groups = new Map<string, SpecFileInfo[]>();

    const scanDir = async (dir: string, prefix: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'stories') {
          const subPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
          await scanDir(join(dir, entry.name), subPrefix);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const folder = prefix || 'root';
          const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

          if (!groups.has(folder)) {
            groups.set(folder, []);
          }
          groups.get(folder)!.push({
            relativePath,
            filename: entry.name
          });
        }
      }
    };

    try {
      await scanDir(specPath, '');
    } catch {
      return [];
    }

    // Sort files within each group alphabetically
    for (const files of groups.values()) {
      files.sort((a, b) => a.filename.localeCompare(b.filename));
    }

    // Build result: root first, then subdirectories alphabetically
    const result: SpecFileGroup[] = [];

    const rootFiles = groups.get('root');
    if (rootFiles && rootFiles.length > 0) {
      result.push({ folder: 'root', files: rootFiles });
    }

    const sortedFolders = Array.from(groups.keys())
      .filter(k => k !== 'root')
      .sort();

    for (const folder of sortedFolders) {
      result.push({ folder, files: groups.get(folder)! });
    }

    return result;
  }

  /**
   * Reads any markdown file from a spec folder by relative path.
   * Validates path to prevent traversal attacks.
   */
  async readSpecFile(projectPath: string, specId: string, relativePath: string): Promise<{ filename: string; content: string } | null> {
    const specPath = projectDir(projectPath, 'specs', specId);
    const validPath = this.getValidatedSpecFilePath(specPath, relativePath);

    if (!validPath) {
      return null;
    }

    try {
      const content = await fs.readFile(validPath, 'utf-8');
      return {
        filename: basename(validPath),
        content
      };
    } catch {
      return null;
    }
  }

  /**
   * Saves content to any markdown file in a spec folder by relative path.
   * Validates path to prevent traversal attacks.
   */
  async saveSpecFile(projectPath: string, specId: string, relativePath: string, content: string): Promise<{ success: boolean; error?: string }> {
    const specPath = projectDir(projectPath, 'specs', specId);
    const validPath = this.getValidatedSpecFilePath(specPath, relativePath);

    if (!validPath) {
      return { success: false, error: 'Invalid file path' };
    }

    try {
      await fs.writeFile(validPath, content, 'utf-8');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save file'
      };
    }
  }

  // ============================================================================
  // Spec Listing Methods
  // ============================================================================

  async listSpecs(projectPath: string): Promise<SpecInfo[]> {
    const specsPath = projectDir(projectPath, 'specs');

    try {
      const entries = await fs.readdir(specsPath, { withFileTypes: true });
      const specDirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.'));

      const specs: SpecInfo[] = [];

      for (const dir of specDirs) {
        const specInfo = await this.getSpecInfo(projectPath, dir.name);
        if (specInfo) {
          specs.push(specInfo);
        }
      }

      // Sort by created date, newest first
      specs.sort((a, b) => b.createdDate.localeCompare(a.createdDate));

      return specs;
    } catch {
      // No specs directory or error reading
      return [];
    }
  }

  /**
   * GSQ-002: Lists specs from all given project paths, grouped by project.
   * Each SpecInfo is enriched with projectPath and projectName.
   */
  async listAllSpecs(projects: Array<{ path: string; name: string }>): Promise<ProjectSpecs[]> {
    const results: ProjectSpecs[] = [];

    for (const project of projects) {
      const specs = await this.listSpecs(project.path);
      const enrichedSpecs = specs.map(spec => ({
        ...spec,
        projectPath: project.path,
        projectName: project.name
      }));

      results.push({
        projectPath: project.path,
        projectName: project.name,
        specs: enrichedSpecs
      });
    }

    return results;
  }

  /**
   * Deletes a spec folder and all its contents.
   */
  async deleteSpec(projectPath: string, specId: string): Promise<boolean> {
    const specPath = projectDir(projectPath, 'specs', specId);
    try {
      await fs.rm(specPath, { recursive: true, force: true });
      return true;
    } catch (error) {
      console.error(`Failed to delete spec ${specId}:`, error);
      return false;
    }
  }

  private async getSpecInfo(projectPath: string, specId: string): Promise<SpecInfo | null> {
    const specPath = projectDir(projectPath, 'specs', specId);

    try {
      // Extract name from spec ID (format: YYYY-MM-DD-spec-name)
      const parts = specId.split('-');
      let createdDate = '';
      let name = specId;

      if (parts.length >= 3 && /^\d{4}$/.test(parts[0]) && /^\d{2}$/.test(parts[1]) && /^\d{2}$/.test(parts[2])) {
        createdDate = `${parts[0]}-${parts[1]}-${parts[2]}`;
        name = parts.slice(3).join('-').replace(/-/g, ' ');
      }

      // PRIORITY 1: Try JSON kanban
      const jsonKanban = await this.readKanbanJson(specPath);
      if (jsonKanban) {
        const gitStrategy = jsonKanban.resumeContext?.gitStrategy as 'branch' | 'worktree' | 'current-branch' | null;
        return {
          id: specId,
          name: this.capitalizeWords(name),
          createdDate,
          storyCount: jsonKanban.boardStatus.total,
          completedCount: jsonKanban.boardStatus.done,
          inProgressCount: jsonKanban.boardStatus.inProgress + (jsonKanban.boardStatus.inReview || 0) + (jsonKanban.boardStatus.testing || 0),
          hasKanban: true,
          gitStrategy
        };
      }

      // PRIORITY 2: Fallback to MD kanban
      const kanbanPath = join(specPath, 'kanban-board.md');
      let hasKanban = false;
      let completedCount = 0;
      let inProgressCount = 0;

      try {
        const kanbanContent = await fs.readFile(kanbanPath, 'utf-8');
        hasKanban = true;

        // Count stories directly from kanban sections for accuracy
        // This is more reliable than parsing the Board Status counts
        const statusMap = this.parseKanbanStatuses(kanbanContent);
        for (const entry of statusMap.values()) {
          if (entry.status === 'done') completedCount++;
          else if (entry.status === 'in_progress') inProgressCount++;
        }
      } catch {
        // No kanban file
      }

      // Count stories in stories directory
      const storiesPath = join(specPath, 'stories');
      let storyCount = 0;

      try {
        const storyFiles = await fs.readdir(storiesPath);
        storyCount = storyFiles.filter(f => f.startsWith('story-') && f.endsWith('.md')).length;
      } catch {
        // No stories directory
      }

      // For MD kanban, try to parse gitStrategy from Resume Context section
      let mdGitStrategy: 'branch' | 'worktree' | 'current-branch' | null = null;
      if (hasKanban) {
        try {
          const kanbanContent = await fs.readFile(kanbanPath, 'utf-8');
          const gitStrategyMatch = kanbanContent.match(/\| \*\*Git Strategy\*\* \| ([\w-]+) \|/i) ||
                                   kanbanContent.match(/\| Git Strategy \| ([\w-]+) \|/i);
          if (gitStrategyMatch && (gitStrategyMatch[1] === 'branch' || gitStrategyMatch[1] === 'worktree' || gitStrategyMatch[1] === 'current-branch')) {
            mdGitStrategy = gitStrategyMatch[1] as 'branch' | 'worktree' | 'current-branch';
          }
        } catch {
          // Ignore errors
        }
      }

      return {
        id: specId,
        name: this.capitalizeWords(name),
        createdDate,
        storyCount,
        completedCount,
        inProgressCount,
        hasKanban,
        gitStrategy: mdGitStrategy
      };
    } catch {
      return null;
    }
  }

  async getKanbanBoard(projectPath: string, specId: string): Promise<KanbanBoard> {
    const specPath = projectDir(projectPath, 'specs', specId);
    const kanbanPath = join(specPath, 'kanban-board.md');
    const storiesPath = join(specPath, 'stories');

    // Read stories from story files (for dorComplete)
    const storyFiles = await this.listStoryFiles(storiesPath);
    const storiesFromFiles: Map<string, StoryInfo> = new Map();

    for (const file of storyFiles) {
      const story = await this.parseStoryFile(storiesPath, file);
      if (story) {
        storiesFromFiles.set(story.id, story);
      }
    }

    // PRIORITY 1: Try JSON kanban
    try {
      const jsonKanban = await this.readKanbanJson(specPath);
      if (jsonKanban) {
        console.log(`[SpecsReader] Using kanban.json for ${specId}`);
        const board = this.convertJsonToKanbanBoard(jsonKanban, storiesFromFiles);

        // Load attachment counts for all stories
        await Promise.all(board.stories.map(async (story) => {
          story.attachmentCount = await attachmentStorageService.count(
            projectPath, 'spec', specId, story.id, undefined
          );
        }));

        // Sort: in_progress first, then backlog, then blocked, then done
        board.stories.sort((a, b) => {
          const order: Record<string, number> = { in_progress: 0, backlog: 1, blocked: 2, done: 3 };
          return (order[a.status] ?? 4) - (order[b.status] ?? 4);
        });

        return board;
      }
    } catch (error) {
      if (error instanceof KanbanJsonCorruptedError) {
        console.error(`[SpecsReader] ${error.message} — refusing to fall back to MD to prevent stale data`);
        throw error;
      }
      throw error;
    }

    // PRIORITY 2: Fallback to MD kanban (only reached when kanban.json does not exist)
    console.log(`[SpecsReader] Falling back to kanban-board.md for ${specId}`);

    const result: KanbanBoard = {
      specId,
      stories: [],
      hasKanbanFile: false
    };

    // Try to read kanban board for status
    try {
      const kanbanContent = await fs.readFile(kanbanPath, 'utf-8');
      result.hasKanbanFile = true;

      // Parse statuses from kanban sections
      const statusMap = this.parseKanbanStatuses(kanbanContent);

      // Update story statuses and models from kanban
      for (const [storyId, entry] of statusMap) {
        const story = storiesFromFiles.get(storyId);
        if (story) {
          console.log(`[SpecsReader] Updating story ${storyId}: status=${entry.status}, model=${entry.model}`);
          story.status = entry.status;
          story.model = entry.model;
        } else {
          console.log(`[SpecsReader] Story ${storyId} from kanban not found in story files`);
        }
      }
    } catch {
      // No kanban file - all stories default to backlog
    }

    result.stories = Array.from(storiesFromFiles.values());

    // Load attachment counts for all stories
    await Promise.all(result.stories.map(async (story) => {
      story.attachmentCount = await attachmentStorageService.count(
        projectPath, 'spec', specId, story.id, undefined
      );
    }));

    // Sort: in_progress first, then backlog, then blocked, then done
    result.stories.sort((a, b) => {
      const order: Record<string, number> = { in_progress: 0, backlog: 1, blocked: 2, done: 3 };
      return (order[a.status] ?? 4) - (order[b.status] ?? 4);
    });

    return result;
  }

  private async listStoryFiles(storiesPath: string): Promise<string[]> {
    try {
      const files = await fs.readdir(storiesPath);
      return files.filter(f => f.startsWith('story-') && f.endsWith('.md'));
    } catch {
      return [];
    }
  }

  private async parseStoryFile(storiesPath: string, filename: string): Promise<StoryInfo | null> {
    try {
      const content = await fs.readFile(join(storiesPath, filename), 'utf-8');

      // Extract story ID from filename (story-001-title.md -> AOSUI-001 or similar)
      const idMatch = filename.match(/story-(\d+)/);
      const numericId = idMatch ? idMatch[1] : '000';

      // Try to find story ID in content
      let storyId = `STORY-${numericId}`;
      // Try multiple formats:
      // 1. "Story ID: MSK-001" format
      // 2. "# Story MSK-001:" title format
      // 3. "| **ID** | MSK-001 |" table format
      const storyIdMatch = content.match(/Story ID:\s*([A-Z0-9-]+)/i) ||
        content.match(/^#\s+Story\s+([A-Z0-9-]+):/im) ||
        content.match(/\|\s*\*\*ID\*\*\s*\|\s*([A-Z0-9-]+)\s*\|/i);
      if (storyIdMatch) {
        storyId = storyIdMatch[1];
      }

      // Extract title from first heading
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : basename(filename, '.md');

      // Extract type
      const typeMatch = content.match(/\*\*Type\*\*:\s*(.+)/i) || content.match(/Type:\s*(.+)/i);
      const type = typeMatch ? typeMatch[1].trim() : 'Feature';

      // Extract priority
      const priorityMatch = content.match(/\*\*Priority\*\*:\s*(.+)/i) || content.match(/Priority:\s*(.+)/i);
      const priority = priorityMatch ? priorityMatch[1].trim() : 'Medium';

      // Extract effort
      const effortMatch = content.match(/\*\*Estimated Effort\*\*:\s*(.+)/i) || content.match(/Effort:\s*(.+)/i);
      const effort = effortMatch ? effortMatch[1].trim() : 'M';

      // Extract dependencies
      const depsMatch = content.match(/\*\*Dependencies\*\*:\s*(.+)/i) || content.match(/Dependencies:\s*(.+)/i);
      const dependencies: string[] = [];
      if (depsMatch && depsMatch[1].trim().toLowerCase() !== 'none') {
        dependencies.push(...depsMatch[1].split(',').map(d => d.trim()));
      }

      // Parse DoR (Definition of Ready) to determine if story is Ready or Blocked
      let dorComplete = true; // Default to Ready (all checkboxes checked)
      const dorSection = content.match(/### DoR[\s\S]*?(?=###|$)/i);
      if (dorSection) {
        // Check for any unchecked boxes [ ]
        const uncheckedBoxes = dorSection[0].match(/- \[ \]/g);
        if (uncheckedBoxes && uncheckedBoxes.length > 0) {
          dorComplete = false; // Blocked - at least one DoR item not complete
        }
      }

      return {
        id: storyId,
        title,
        type,
        priority,
        effort,
        status: 'backlog', // Default, will be overwritten by kanban
        dependencies,
        dorComplete,
        model: 'opus' // Default model
      };
    } catch {
      return null;
    }
  }

  private parseKanbanStatuses(kanbanContent: string): Map<string, { status: 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked'; model: ModelSelection }> {
    const statusMap = new Map<string, { status: 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked'; model: ModelSelection }>();

    // Split by top-level sections only (## headers)
    // This handles sub-sections (### Feature Stories, ### System Stories) correctly
    const topLevelSections = kanbanContent.split(/^## /m);

    for (const section of topLevelSections) {
      const lines = section.split('\n');
      const sectionTitle = lines[0]?.toLowerCase().trim() || '';

      let status: 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked' | null = null;

      if (sectionTitle.includes('blocked')) {
        status = 'blocked';
      } else if (sectionTitle.includes('backlog')) {
        status = 'backlog';
      } else if (sectionTitle.includes('in progress')) {
        status = 'in_progress';
      } else if (sectionTitle.includes('done')) {
        status = 'done';
      }

      if (status) {
        // Match story ID in any table row format (flexible column count)
        // Include entire section content (including sub-sections like ### Feature Stories)
        const rowPattern = /\|\s*([A-Z0-9]+-\d+)\s*\|(.*)$/gm;
        let match;

        while ((match = rowPattern.exec(section)) !== null) {
          const storyId = match[1];
          const restOfRow = match[2];

          // Parse remaining columns to extract model (if present)
          const columns = restOfRow.split('|').map(c => c.trim()).filter(c => c);

          // Model is in 7th position (index 6) only for Backlog tables with 8 columns
          // MSK-003-FIX: Accept any model ID, not just Anthropic models
          let model: ModelSelection = 'opus';
          if (status === 'backlog' && columns.length >= 7) {
            const modelStr = columns[6]?.toLowerCase();
            console.log(`[SpecsReader] Parsing story ${storyId}: columns.length=${columns.length}, columns[6]='${columns[6]}', modelStr='${modelStr}'`);
            if (modelStr && modelStr.length > 0) {
              model = modelStr;
            }
          }

          console.log(`[SpecsReader] Story ${storyId} in ${status}: model='${model}'`);
          statusMap.set(storyId, { status, model });
        }
      }
    }

    return statusMap;
  }

  async getStoryDetail(projectPath: string, specId: string, storyId: string): Promise<StoryDetail | null> {
    const storiesPath = join(projectDir(projectPath, 'specs', specId), 'stories');

    try {
      const files = await fs.readdir(storiesPath);
      const storyFile = files.find(f => {
        const idMatch = f.match(/story-(\d+)/);
        if (idMatch) {
          // Match by numeric ID or full story ID in file
          return storyId.includes(idMatch[1]) || storyId.endsWith(idMatch[1]);
        }
        return false;
      });

      if (!storyFile) {
        return null;
      }

      const content = await fs.readFile(join(storiesPath, storyFile), 'utf-8');

      // Extract basic info
      const basicInfo = await this.parseStoryFile(storiesPath, storyFile);
      if (!basicInfo) {
        return null;
      }

      // Extract feature description
      const featureMatch = content.match(/```gherkin\s*\nFeature:[\s\S]*?```/);
      const feature = featureMatch ? featureMatch[0] : '';

      // Extract acceptance criteria (all Gherkin scenarios)
      const scenarioMatches = content.matchAll(/```gherkin\s*\nScenario:[\s\S]*?```/g);
      const acceptanceCriteria = Array.from(scenarioMatches).map(m => m[0]);

      // Extract DoR checklist
      const dorSection = content.match(/### DoR[\s\S]*?(?=###|$)/i);
      const dorChecklist: string[] = [];
      if (dorSection) {
        const checkItems = dorSection[0].matchAll(/- \[[ x]\]\s*(.+)/g);
        for (const item of checkItems) {
          dorChecklist.push(item[1]);
        }
      }

      // Extract DoD checklist
      const dodSection = content.match(/### DoD[\s\S]*?(?=###|$)/i);
      const dodChecklist: string[] = [];
      if (dodSection) {
        const checkItems = dodSection[0].matchAll(/- \[[ x]\]\s*(.+)/g);
        for (const item of checkItems) {
          dodChecklist.push(item[1]);
        }
      }

      // Get status from kanban
      const kanban = await this.getKanbanBoard(projectPath, specId);
      const storyInKanban = kanban.stories.find(s => s.id === basicInfo.id);

      return {
        ...basicInfo,
        status: storyInKanban?.status || 'backlog',
        content,
        feature,
        acceptanceCriteria,
        dorChecklist,
        dodChecklist
      };
    } catch {
      return null;
    }
  }

  private capitalizeWords(str: string): string {
    return str.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  // Track in-progress initialization calls to prevent concurrent execution
  private static initializationLocks = new Map<string, Promise<KanbanInitResult>>();

  async initializeKanbanBoard(projectPath: string, specId: string): Promise<KanbanInitResult> {
    // Check if there's already an initialization in progress for this spec
    const existingLock = SpecsReader.initializationLocks.get(specId);
    if (existingLock) {
      return existingLock;
    }

    // Create a new lock promise
    const initPromise = this._initializeKanbanBoard(projectPath, specId);
    SpecsReader.initializationLocks.set(specId, initPromise);

    try {
      return await initPromise;
    } finally {
      // Remove the lock after completion
      SpecsReader.initializationLocks.delete(specId);
    }
  }

  private async _initializeKanbanBoard(projectPath: string, specId: string): Promise<KanbanInitResult> {
    const specPath = projectDir(projectPath, 'specs', specId);
    const kanbanPath = join(specPath, 'kanban-board.md');
    const integrationContextPath = join(specPath, 'integration-context.md');
    const storiesPath = join(specPath, 'stories');

    // Check if kanban board already exists
    try {
      await fs.access(kanbanPath);
      return {
        exists: true,
        created: false,
        path: kanbanPath,
        blockedCount: 0
      };
    } catch {
      // File doesn't exist, continue
    }

    // List and parse story files
    const storyFiles = await this.listStoryFiles(storiesPath);

    if (storyFiles.length === 0) {
      return {
        exists: false,
        created: false,
        reason: 'No stories found',
        blockedCount: 0
      };
    }

    const stories: ParsedStoryForKanban[] = [];
    let blockedCount = 0;

    for (const file of storyFiles) {
      const story = await this.parseStoryForKanban(storiesPath, file);
      if (story) {
        stories.push(story);
        if (story.status === 'Blocked') {
          blockedCount++;
        }
      } else {
        // Log warning for unparseable story files
        console.warn(`Warning: Could not parse story file: ${file}`);
      }
    }

    // If no valid stories found, return error
    if (stories.length === 0) {
      return {
        exists: false,
        created: false,
        reason: 'No valid stories found',
        blockedCount: 0
      };
    }

    // Generate kanban board markdown
    const kanbanMarkdown = this.generateKanbanBoardMarkdown(specId, stories);

    // Write kanban board
    await fs.writeFile(kanbanPath, kanbanMarkdown, 'utf-8');

    // Generate and write integration context
    const integrationContextMarkdown = this.generateIntegrationContextMarkdown();
    await fs.writeFile(integrationContextPath, integrationContextMarkdown, 'utf-8');

    return {
      exists: true,
      created: true,
      path: kanbanPath,
      blockedCount
    };
  }

  private async parseStoryForKanban(storiesPath: string, filename: string): Promise<ParsedStoryForKanban | null> {
    try {
      const content = await fs.readFile(join(storiesPath, filename), 'utf-8');

      // Extract story ID from filename (story-001-title.md -> STORY-001 or similar)
      const idMatch = filename.match(/story-(\d+)/);
      const numericId = idMatch ? idMatch[1] : '000';

      // Try to find story ID in content
      let storyId = `STORY-${numericId}`;
      // Try multiple formats:
      // 1. "Story ID: MSK-001" format
      // 2. "# Story MSK-001:" title format
      // 3. "| **ID** | MSK-001 |" table format
      const storyIdMatch = content.match(/Story ID:\s*([A-Z0-9-]+)/i) ||
        content.match(/^#\s+Story\s+([A-Z0-9-]+):/im) ||
        content.match(/\|\s*\*\*ID\*\*\s*\|\s*([A-Z0-9-]+)\s*\|/i);
      if (storyIdMatch) {
        storyId = storyIdMatch[1];
      }

      // Extract title from first heading
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : filename.replace(/\.md$/, '');

      // Extract type
      const typeMatch = content.match(/\*\*Type\*\*:\s*(.+)/i) || content.match(/Type:\s*(.+)/i);
      const type = typeMatch ? typeMatch[1].trim() : 'Feature';

      // Extract priority
      const priorityMatch = content.match(/\*\*Priority\*\*:\s*(.+)/i) || content.match(/Priority:\s*(.+)/i);
      const priority = priorityMatch ? priorityMatch[1].trim() : 'Medium';

      // Extract effort
      const effortMatch = content.match(/\*\*Estimated Effort\*\*:\s*(.+)/i) || content.match(/Effort:\s*(.+)/i);
      const effort = effortMatch ? effortMatch[1].trim() : 'M';

      // Extract dependencies
      const depsMatch = content.match(/\*\*Dependencies\*\*:\s*(.+)/i) || content.match(/Dependencies:\s*(.+)/i);
      const dependencies = depsMatch ? depsMatch[1].trim() : 'None';

      // Validate DoR - check if all checkboxes are marked [x]
      const dorSection = content.match(/### DoR[\s\S]*?(?=###|$)/i);
      let dorComplete = true;
      if (dorSection) {
        // Check for unchecked boxes [ ] (space between brackets)
        const uncheckedBoxes = dorSection[0].match(/- \[ \]/g);
        if (uncheckedBoxes && uncheckedBoxes.length > 0) {
          dorComplete = false;
        }
      }

      return {
        id: storyId,
        title,
        type,
        priority,
        effort,
        dependencies,
        status: dorComplete ? 'Ready' : 'Blocked',
        dorComplete
      };
    } catch {
      return null;
    }
  }

  private generateKanbanBoardMarkdown(specId: string, stories: ParsedStoryForKanban[]): string {
    const totalStories = stories.length;
    const readyStories = stories.filter(s => s.status === 'Ready');
    const blockedStories = stories.filter(s => s.status === 'Blocked');
    const today = new Date().toISOString().split('T')[0];

    // Generate backlog table rows (only ready stories)
    const backlogRows = readyStories.map(story =>
      `| ${story.id} | ${story.title} | ${story.type} | ${story.priority} | ${story.effort} | ${story.dependencies} | ${story.status} | opus |`
    ).join('\n');

    // Generate blocked table rows
    const blockedRows = blockedStories.map(story =>
      `| ${story.id} | ${story.title} | Incomplete DoR | - |`
    ).join('\n');

    return `# Kanban Board: ${specId}

## Board Status

| Metric | Count |
|--------|-------|
| Total Stories | ${totalStories} |
| Completed | 0 |
| In Progress | 0 |
| In Review | 0 |
| Testing | 0 |
| Backlog | ${readyStories.length} |
| Blocked | ${blockedStories.length} |

---

## Resume Context

| Field | Value |
|-------|-------|
| **Current Phase** | 1-complete |
| **Next Phase** | 2 - Git Worktree |
| **Spec Folder** | ${specId} |
| **Worktree Path** | (pending) |
| **Git Branch** | (pending) |
| **Current Story** | None |
| **Last Action** | Kanban board created |
| **Next Action** | Setup git worktree |

---

## Backlog

| Story ID | Title | Type | Priority | Effort | Dependencies | Status | Model |
|----------|-------|------|----------|--------|--------------|--------|-------|
${backlogRows}

---

## In Progress

| Story ID | Title | Started | Assignee |
|----------|-------|---------|----------|
| - | - | - | - |

---

## In Review

| Story ID | Title | Reviewer | Notes |
|----------|-------|----------|-------|
| - | - | - | - |

---

## Testing

| Story ID | Title | Test Status | Notes |
|----------|-------|-------------|-------|
| - | - | - | - |

---

## Done

| Story ID | Title | Completed | Notes |
|----------|-------|-----------|-------|
| - | - | - | - |

---

## Blocked

| Story ID | Title | Blocker | Notes |
|----------|-------|---------|-------|
${blockedRows || '| - | - | - | - |'}

---

## Change Log

| Timestamp | Change |
|-----------|--------|
| ${today} | Kanban board created with ${totalStories} stories |
`;
  }

  private generateIntegrationContextMarkdown(): string {
    return `# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| - | No stories completed yet | - |

---

## New Exports & APIs

### Components
<!-- New UI components created -->
_None yet_

### Services
<!-- New service classes/modules -->
_None yet_

### Hooks / Utilities
<!-- New hooks, helpers, utilities -->
_None yet_

### Types / Interfaces
<!-- New type definitions -->
_None yet_

---

## Integration Notes

<!-- Important integration information for subsequent stories -->
_None yet_

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| - | No changes yet | - |
`;
  }

  /**
   * Syncs new story files to an existing kanban board.
   * Adds any new stories to the Backlog section and updates board status.
   * Supports both JSON (priority) and MD (fallback) formats.
   *
   * @param projectPath - Root path of the project
   * @param specId - ID of the spec (e.g., "2026-01-30-kanban-ui-initialization")
   * @returns Result with synced story count and IDs
   */
  async syncNewStories(projectPath: string, specId: string): Promise<SyncNewStoriesResult> {
    const specPath = projectDir(projectPath, 'specs', specId);
    const kanbanPath = join(specPath, 'kanban-board.md');
    const storiesPath = join(specPath, 'stories');

    // PRIORITY 1: Try JSON kanban
    const jsonKanban = await this.readKanbanJson(specPath);
    if (jsonKanban) {
      return this.syncNewStoriesJson(specPath, storiesPath, jsonKanban);
    }

    // PRIORITY 2: Fallback to MD kanban
    console.log(`[SpecsReader] syncNewStories: Falling back to kanban-board.md for ${specId}`);

    // Check if kanban board exists
    try {
      await fs.access(kanbanPath);
    } catch {
      return {
        synced: false,
        newStoryCount: 0,
        storyIds: [],
        error: 'Kanban board does not exist. Run initializeKanbanBoard first.'
      };
    }

    // Read existing kanban to get current story IDs
    const kanbanContent = await fs.readFile(kanbanPath, 'utf-8');
    const existingStoryIds = this.extractStoryIdsFromKanban(kanbanContent);

    // List all story files in the spec folder
    const storyFiles = await this.listStoryFiles(storiesPath);

    // Find new stories (files not in kanban)
    const newStories: ParsedStoryForKanban[] = [];
    for (const file of storyFiles) {
      const story = await this.parseStoryForKanban(storiesPath, file);
      if (story && !existingStoryIds.has(story.id)) {
        newStories.push(story);
      }
    }

    // If no new stories, return early
    if (newStories.length === 0) {
      return {
        synced: true,
        newStoryCount: 0,
        storyIds: []
      };
    }

    // Update kanban board with new stories
    const updatedKanban = this.addStoriesToKanban(kanbanContent, newStories);
    await fs.writeFile(kanbanPath, updatedKanban, 'utf-8');

    return {
      synced: true,
      newStoryCount: newStories.length,
      storyIds: newStories.map(s => s.id)
    };
  }

  /**
   * Syncs new story files to kanban.json.
   * Internal helper for JSON format support.
   */
  private async syncNewStoriesJson(
    specPath: string,
    storiesPath: string,
    jsonKanban: KanbanJsonV1
  ): Promise<SyncNewStoriesResult> {
    console.log(`[SpecsReader] syncNewStories: Using kanban.json`);

    // Get existing story IDs from JSON
    const existingStoryIds = new Set(jsonKanban.stories.map(s => s.id));

    // List all story files in the spec folder
    const storyFiles = await this.listStoryFiles(storiesPath);

    // Find new stories (files not in kanban)
    const newStoryIds: string[] = [];
    for (const file of storyFiles) {
      const parsedStory = await this.parseStoryForKanban(storiesPath, file);
      if (parsedStory && !existingStoryIds.has(parsedStory.id)) {
        // Convert to JSON story format
        const jsonStory: KanbanJsonV1['stories'][0] = {
          id: parsedStory.id,
          title: parsedStory.title,
          file: `stories/${file}`,
          type: parsedStory.type.toLowerCase() as 'frontend' | 'backend' | 'fullstack' | 'quality' | 'devops',
          priority: parsedStory.priority.toLowerCase() as 'critical' | 'high' | 'medium' | 'low',
          effort: this.parseEffortToNumber(parsedStory.effort),
          status: parsedStory.dorComplete ? 'ready' : 'blocked',
          phase: 'pending',
          dependencies: this.parseDependencies(parsedStory.dependencies),
          blockedBy: [],
          model: null,
          timing: {
            createdAt: new Date().toISOString(),
            startedAt: null,
            completedAt: null
          },
          implementation: {
            filesModified: [],
            commits: [],
            notes: null
          },
          verification: {
            dodChecked: false,
            integrationVerified: false
          }
        };

        jsonKanban.stories.push(jsonStory);
        newStoryIds.push(parsedStory.id);
      }
    }

    // If no new stories, return early
    if (newStoryIds.length === 0) {
      return {
        synced: true,
        newStoryCount: 0,
        storyIds: []
      };
    }

    // Update board status counts
    this.updateBoardStatus(jsonKanban);

    // Add changelog entry
    this.addChangeLogEntry(
      jsonKanban,
      'stories_synced',
      null,
      `Synced ${newStoryIds.length} new stories: ${newStoryIds.join(', ')}`
    );

    // Write updated JSON
    await this.writeKanbanJson(specPath, jsonKanban);

    return {
      synced: true,
      newStoryCount: newStoryIds.length,
      storyIds: newStoryIds
    };
  }

  /**
   * Helper to parse effort string to number.
   */
  private parseEffortToNumber(effort: string): number {
    const effortMap: Record<string, number> = {
      'xs': 1, 'xsmall': 1, 'x-small': 1,
      's': 2, 'small': 2,
      'm': 3, 'medium': 3,
      'l': 5, 'large': 5,
      'xl': 8, 'xlarge': 8, 'x-large': 8
    };
    const normalized = effort.toLowerCase().replace(/[^a-z]/g, '');
    return effortMap[normalized] || 3;
  }

  /**
   * Helper to parse dependencies string to array.
   */
  private parseDependencies(deps: string): string[] {
    if (!deps || deps.toLowerCase() === 'none' || deps === '-') {
      return [];
    }
    return deps.split(/[,;]/).map(d => d.trim()).filter(d => d.length > 0);
  }

  /**
   * KSE-003: Updates the status of a story in the kanban board.
   * Moves the story between sections and updates board status counts.
   * Supports both JSON (priority) and MD (fallback) formats.
   *
   * @param projectPath - Root path of the project
   * @param specId - ID of the spec (e.g., "2026-01-31-kanban-story-execution")
   * @param storyId - ID of the story (e.g., "KSE-001")
   * @param newStatus - New status: 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked'
   */
  async updateStoryStatus(
    projectPath: string,
    specId: string,
    storyId: string,
    newStatus: 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked'
  ): Promise<void> {
    const specPath = projectDir(projectPath, 'specs', specId);

    // PRIORITY 1: Try JSON kanban
    const jsonKanban = await this.readKanbanJson(specPath);
    if (jsonKanban) {
      console.log(`[SpecsReader] updateStoryStatus: Using kanban.json for ${specId}`);
      const story = jsonKanban.stories.find(s => s.id === storyId);
      if (!story) {
        throw new Error(`Story ${storyId} not found in kanban.json`);
      }

      const oldStatus = story.status;
      const newJsonStatus = this.mapFrontendStatusToJson(newStatus);

      // Skip if no change
      if (oldStatus === newJsonStatus) {
        return;
      }

      // Update status and phase
      story.status = newJsonStatus;
      story.phase = newStatus === 'done' ? 'done' : (newStatus === 'in_progress' || newStatus === 'in_review' ? 'in_progress' : 'pending') as KanbanJsonPhase;

      // Update timing
      if (!story.timing) {
        story.timing = {
          createdAt: new Date().toISOString(),
          startedAt: null,
          completedAt: null
        };
      }

      if (!story.implementation) {
        story.implementation = {
          filesModified: [],
          commits: [],
          notes: null
        };
      }

      if (!story.verification) {
        story.verification = {
          dodChecked: false,
          integrationVerified: false
        };
      }

      if (newStatus === 'in_progress' && !story.timing.startedAt) {
        story.timing.startedAt = new Date().toISOString();
      } else if (newStatus === 'done') {
        story.timing.completedAt = new Date().toISOString();
      }

      // Update board status counts
      this.updateBoardStatus(jsonKanban);

      // Add changelog entry
      this.addChangeLogEntry(jsonKanban, 'status_changed', storyId, `Moved from ${oldStatus} to ${newJsonStatus}`);

      // Write updated JSON
      await this.writeKanbanJson(specPath, jsonKanban);

      // After moving a story to 'done' or 'in_review', resolve dependencies for blocked stories
      // in_review counts as satisfied for batch-review workflows (auto mode)
      if (newStatus === 'done' || newStatus === 'in_review') {
        const unblocked = await this.resolveDependencies(projectPath, specId);
        if (unblocked.length > 0) {
          console.log(`[SpecsReader] After ${storyId} → ${newStatus}: unblocked ${unblocked.join(', ')}`);
        }
      }
      return;
    }

    // PRIORITY 2: Fallback to MD kanban
    console.log(`[SpecsReader] updateStoryStatus: Falling back to kanban-board.md for ${specId}`);
    await this.updateStoryStatusMarkdown(specPath, storyId, newStatus);
  }

  /**
   * Updates story status in kanban-board.md (legacy format).
   */
  private async updateStoryStatusMarkdown(
    specPath: string,
    storyId: string,
    newStatus: 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked'
  ): Promise<void> {
    const kanbanPath = join(specPath, 'kanban-board.md');

    // FIX: Race condition - retry logic if story not found (file might be mid-write)
    const maxRetries = 3;
    const retryDelayMs = 500;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Read current kanban content
      const kanbanContent = await fs.readFile(kanbanPath, 'utf-8');

      // Parse current statuses to find the story's current status
      const statusMap = this.parseKanbanStatuses(kanbanContent);
      const entry = statusMap.get(storyId);

      if (!entry) {
        if (attempt < maxRetries) {
          console.log(`[SpecsReader] Story ${storyId} not found, retrying in ${retryDelayMs}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          continue;
        }
        throw new Error(`Story ${storyId} not found in kanban board`);
      }

      if (entry.status === newStatus) {
        return; // No change needed
      }

      // Update the kanban board content
      const updatedContent = this.moveStoryInKanbanMarkdown(
        kanbanContent,
        storyId,
        entry.status,
        newStatus
      );

      // Write updated content
      await fs.writeFile(kanbanPath, updatedContent, 'utf-8');
      return;
    }
  }

  /**
   * Moves a story between sections in the kanban board markdown (legacy format).
   */
  private moveStoryInKanbanMarkdown(
    kanbanContent: string,
    storyId: string,
    fromStatus: 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked',
    toStatus: 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked'
  ): string {
    const lines = kanbanContent.split('\n');
    const result: string[] = [];

    // Track section info - use topLevelSection for ## headers, currentSection for any
    let topLevelSection: string | null = null;
    let storyRow: string | null = null;
    let storyTitle = '';
    const today = new Date().toISOString().split('T')[0];

    // Map status to section headers
    const sectionMap: Record<string, string> = {
      'backlog': 'Backlog',
      'in_progress': 'In Progress',
      'in_review': 'In Progress', // MD kanbans don't have In Review section
      'done': 'Done',
      'blocked': 'Blocked'
    };

    // First pass: Find and remove the story from its current section
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect top-level section headers (## only) - these define the status
      // Sub-sections (### Feature Stories, ### System Stories) don't change the status
      if (line.startsWith('## ')) {
        topLevelSection = line.substring(3).trim();
      }

      // Check if this line contains our story ID
      const storyMatch = line.match(new RegExp(`\\|\\s*${storyId}\\s*\\|`));
      if (storyMatch && topLevelSection?.toLowerCase().includes(sectionMap[fromStatus].toLowerCase())) {
        // Extract story title from the row
        const titleMatch = line.match(/\|\s*[A-Z0-9-]+\s*\|\s*([^|]+)\s*\|/);
        if (titleMatch) {
          storyTitle = titleMatch[1].trim();
        }
        storyRow = line;
        continue; // Skip this line (remove from current section)
      }

      // Skip placeholder rows with just dashes
      if (line.match(/^\|\s*-\s*\|/) && topLevelSection?.toLowerCase().includes(sectionMap[toStatus].toLowerCase())) {
        // Skip placeholder rows in target section - we'll add the story instead
        continue;
      }

      result.push(line);
    }

    if (!storyRow) {
      throw new Error(`Story ${storyId} row not found in ${fromStatus} section`);
    }

    // Second pass: Add the story to the target section
    const finalResult: string[] = [];
    let inTargetTopLevelSection = false;
    let addedStory = false;

    for (let i = 0; i < result.length; i++) {
      const line = result[i];

      // Update Board Status counts
      if (line.match(/\| In Progress \| (\d+) \|/)) {
        const currentCount = parseInt(line.match(/\| In Progress \| (\d+) \|/)![1], 10);
        const newCount = toStatus === 'in_progress' ? currentCount + 1 :
                         fromStatus === 'in_progress' ? currentCount - 1 : currentCount;
        finalResult.push(line.replace(/\| In Progress \| (\d+) \|/, `| In Progress | ${newCount} |`));
        continue;
      }

      if (line.match(/\| Backlog \| (\d+) \|/)) {
        const currentCount = parseInt(line.match(/\| Backlog \| (\d+) \|/)![1], 10);
        const newCount = toStatus === 'backlog' ? currentCount + 1 :
                         fromStatus === 'backlog' ? currentCount - 1 : currentCount;
        finalResult.push(line.replace(/\| Backlog \| (\d+) \|/, `| Backlog | ${newCount} |`));
        continue;
      }

      if (line.match(/\| Completed \| (\d+) \|/)) {
        const currentCount = parseInt(line.match(/\| Completed \| (\d+) \|/)![1], 10);
        const newCount = toStatus === 'done' ? currentCount + 1 :
                         fromStatus === 'done' ? currentCount - 1 : currentCount;
        finalResult.push(line.replace(/\| Completed \| (\d+) \|/, `| Completed | ${newCount} |`));
        continue;
      }

      if (line.match(/\| Blocked \| (\d+) \|/)) {
        const currentCount = parseInt(line.match(/\| Blocked \| (\d+) \|/)![1], 10);
        const newCount = toStatus === 'blocked' ? currentCount + 1 :
                         fromStatus === 'blocked' ? currentCount - 1 : currentCount;
        finalResult.push(line.replace(/\| Blocked \| (\d+) \|/, `| Blocked | ${newCount} |`));
        continue;
      }

      // Detect target top-level section (## only)
      // Sub-sections (###) don't change the top-level section status
      if (line.startsWith('## ') && line.toLowerCase().includes(sectionMap[toStatus].toLowerCase())) {
        inTargetTopLevelSection = true;
      } else if (line.startsWith('## ')) {
        inTargetTopLevelSection = false;
      }

      finalResult.push(line);

      // Add story after the first separator row in the target section
      if (inTargetTopLevelSection && !addedStory && line.match(/^\|-+\|/)) {
        // This is the separator row, add story after it
        const newRow = this.formatStoryRow(storyId, storyTitle, toStatus, today);
        finalResult.push(newRow);
        addedStory = true;
      }
    }

    // Add change log entry (handle both ## and ### formats)
    const changeLogIndex = finalResult.findIndex(l => l.startsWith('## Change Log') || l.startsWith('### Change Log'));
    if (changeLogIndex !== -1) {
      // Find the table separator
      let insertIndex = changeLogIndex + 1;
      while (insertIndex < finalResult.length && !finalResult[insertIndex].startsWith('|---')) {
        insertIndex++;
      }
      if (insertIndex < finalResult.length) {
        insertIndex++; // After the separator
        const changeEntry = `| ${today} | Moved ${storyId} from ${fromStatus} to ${toStatus} |`;
        finalResult.splice(insertIndex, 0, changeEntry);
      }
    }

    return finalResult.join('\n');
  }

  /**
   * Formats a story row for the target section.
   */
  private formatStoryRow(
    storyId: string,
    title: string,
    status: 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked',
    date: string
  ): string {
    switch (status) {
      case 'in_progress':
      case 'in_review':
        return `| ${storyId} | ${title} | ${date} | main-agent |`;
      case 'done':
        return `| ${storyId} | ${title} | ${date} | - |`;
      case 'blocked':
        return `| ${storyId} | ${title} | Blocked | - |`;
      case 'backlog':
      default:
        return `| ${storyId} | ${title} | Feature | Medium | M | None | Ready |`;
    }
  }

  /**
   * Updates the model of a story in the kanban board.
   * Supports both JSON (priority) and MD (fallback) formats.
   *
   * @param projectPath - Root path of the project
   * @param specId - ID of the spec
   * @param storyId - ID of the story
   * @param model - New model value
   */
  async updateStoryModel(
    projectPath: string,
    specId: string,
    storyId: string,
    model: ModelSelection
  ): Promise<void> {
    // MSK-003-FIX: Model validation removed - any model ID from model-config is valid
    // Validation happens in websocket.ts using getAllProviders()

    console.log(`[SpecsReader] updateStoryModel called: specId=${specId}, storyId=${storyId}, model=${model}`);

    const specPath = projectDir(projectPath, 'specs', specId);

    // PRIORITY 1: Try JSON kanban
    const jsonKanban = await this.readKanbanJson(specPath);
    if (jsonKanban) {
      console.log(`[SpecsReader] updateStoryModel: Using kanban.json for ${specId}`);
      const story = jsonKanban.stories.find(s => s.id === storyId);
      if (!story) {
        throw new Error(`Story ${storyId} not found in kanban.json`);
      }

      const oldModel = story.model;
      story.model = model;

      // Add changelog entry
      this.addChangeLogEntry(jsonKanban, 'model_changed', storyId, `Model changed from ${oldModel || 'null'} to ${model}`);

      // Write updated JSON
      await this.writeKanbanJson(specPath, jsonKanban);
      console.log(`[SpecsReader] kanban.json updated successfully`);
      return;
    }

    // PRIORITY 2: Fallback to MD kanban
    console.log(`[SpecsReader] updateStoryModel: Falling back to kanban-board.md for ${specId}`);
    await this.updateStoryModelMarkdown(specPath, storyId, model);
  }

  /**
   * Updates story model in kanban-board.md (legacy format).
   */
  private async updateStoryModelMarkdown(
    specPath: string,
    storyId: string,
    model: ModelSelection
  ): Promise<void> {
    const kanbanPath = join(specPath, 'kanban-board.md');

    console.log(`[SpecsReader] Kanban path: ${kanbanPath}`);

    // Read current kanban content
    const kanbanContent = await fs.readFile(kanbanPath, 'utf-8');
    console.log(`[SpecsReader] Read ${kanbanContent.length} chars from kanban`);

    // Update the model in the kanban board
    const updatedContent = this.updateModelInKanbanMarkdown(kanbanContent, storyId, model);

    // Check if content actually changed
    if (updatedContent === kanbanContent) {
      console.log(`[SpecsReader] WARNING: Content unchanged after model update!`);
    } else {
      console.log(`[SpecsReader] Content changed, writing to file...`);
    }

    // Write updated content
    await fs.writeFile(kanbanPath, updatedContent, 'utf-8');
    console.log(`[SpecsReader] File written successfully`);
  }

  /**
   * Updates the model value for a story in kanban markdown (legacy format).
   * Supports both new format (with Model column) and legacy format (without Model column).
   */
  private updateModelInKanbanMarkdown(
    kanbanContent: string,
    storyId: string,
    model: ModelSelection
  ): string {
    let lines = kanbanContent.split('\n');

    // First check if the kanban has Model column in Backlog header
    const hasModelColumn = this.kanbanHasModelColumn(lines);
    console.log(`[SpecsReader] hasModelColumn: ${hasModelColumn}`);

    if (!hasModelColumn) {
      // Migrate the kanban to new format with Model column
      console.log(`[SpecsReader] Migrating kanban to new format with Model column`);
      lines = this.migrateMarkdownKanbanToModelFormat(lines);
    }

    // Now update the model value
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Look for the story row in any section
      const storyMatch = line.match(new RegExp(`\\|\\s*${storyId}\\s*\\|`));
      if (storyMatch) {
        found = true;
        const pipes = line.split('|');
        console.log(`[SpecsReader] Found story ${storyId} at line ${i}, pipes.length=${pipes.length}`);
        console.log(`[SpecsReader] Original line: ${line}`);
        // Model is in the last data column (before trailing empty string)
        // For 9+ pipes format: | ID | Title | Type | Priority | Effort | Deps | Status | Model |
        if (pipes.length >= 9) {
          pipes[pipes.length - 2] = ` ${model} `;
          lines[i] = pipes.join('|');
          console.log(`[SpecsReader] Updated line: ${lines[i]}`);
        } else {
          console.log(`[SpecsReader] WARNING: Line has only ${pipes.length} pipes, need >= 9`);
        }
        break;
      }
    }

    if (!found) {
      console.log(`[SpecsReader] WARNING: Story ${storyId} not found in kanban!`);
    }

    return lines.join('\n');
  }

  /**
   * Check if kanban has Model column in Backlog header
   */
  private kanbanHasModelColumn(lines: string[]): boolean {
    for (const line of lines) {
      // Look for table headers with Story ID
      if (line.includes('Story ID') && line.includes('|')) {
        // Check if there's a separate Model column (with pipe before it)
        return /\|\s*Model\s*\|/i.test(line);
      }
    }
    return false;
  }

  /**
   * Migrate MD kanban from old format to new format with Model column.
   * Adds Model column to headers and default 'opus' to all story rows.
   */
  private migrateMarkdownKanbanToModelFormat(lines: string[]): string[] {
    const newLines: string[] = [];
    let inTable = false;
    let headerProcessed = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect table headers (contains Story ID and pipes)
      if (line.includes('Story ID') && line.includes('|')) {
        // Add Model column to header - ensure proper pipe separator
        const trimmedLine = line.trimEnd();
        // Remove trailing pipe if present, add new column, add trailing pipe
        const baseLine = trimmedLine.endsWith('|') ? trimmedLine.slice(0, -1).trimEnd() : trimmedLine;
        newLines.push(baseLine + ' | Model |');
        inTable = true;
        headerProcessed = false; // Will be set after separator
        continue;
      }

      // Detect table separator line (---|---|---)
      if (inTable && !headerProcessed && line.match(/^\|[-\s|]+\|$/)) {
        // Add separator for Model column
        const trimmedLine = line.trimEnd();
        const baseLine = trimmedLine.endsWith('|') ? trimmedLine.slice(0, -1) : trimmedLine;
        newLines.push(baseLine + '-------|');
        headerProcessed = true;
        continue;
      }

      // Detect story rows (starts with | and contains story ID pattern)
      if (inTable && headerProcessed && line.match(/^\|\s*[A-Z0-9]+-\d+\s*\|/)) {
        // Add default model to story row - ensure proper pipe separator
        const trimmedLine = line.trimEnd();
        const baseLine = trimmedLine.endsWith('|') ? trimmedLine.slice(0, -1).trimEnd() : trimmedLine;
        newLines.push(baseLine + ' | opus |');
        continue;
      }

      // Detect end of table (empty line or new section)
      if (inTable && (line.trim() === '' || line.startsWith('#') || line.startsWith('---'))) {
        inTable = false;
        headerProcessed = false;
      }

      newLines.push(line);
    }

    return newLines;
  }

  /**
   * Extracts all story IDs from a kanban board markdown file.
   * Looks in Backlog, In Progress, Done, and other sections.
   */
  private extractStoryIdsFromKanban(kanbanContent: string): Set<string> {
    const storyIds = new Set<string>();

    // Pattern to match story IDs in table rows: | KBI-001 | or | STORY-001 |
    const storyIdPattern = /\|\s*([A-Z0-9]+-\d+)\s*\|/g;
    let match;

    while ((match = storyIdPattern.exec(kanbanContent)) !== null) {
      storyIds.add(match[1]);
    }

    return storyIds;
  }

  /**
   * Adds new stories to the kanban board markdown.
   * Updates the Backlog table and Board Status counts.
   */
  private addStoriesToKanban(kanbanContent: string, newStories: ParsedStoryForKanban[]): string {
    const lines = kanbanContent.split('\n');
    const result: string[] = [];
    let inBacklogSection = false;
    let backlogTableStarted = false;
    let headerRowInserted = false;

    // Track board status updates
    let totalStories = 0;
    let backlogCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Update Board Status counts
      if (line.match(/\| Total Stories \| (\d+) \|/)) {
        const currentTotal = parseInt(line.match(/\| Total Stories \| (\d+) \|/)![1], 10);
        totalStories = currentTotal + newStories.length;
        result.push(line.replace(/\| Total Stories \| (\d+) \|/, `| Total Stories | ${totalStories} |`));
        continue;
      }

      if (line.match(/\| Backlog \| (\d+) \|/)) {
        // Calculate new backlog count from existing + new stories
        const currentBacklog = parseInt(line.match(/\| Backlog \| (\d+) \|/)![1], 10);
        backlogCount = currentBacklog + newStories.length;
        result.push(line.replace(/\| Backlog \| (\d+) \|/, `| Backlog | ${backlogCount} |`));
        continue;
      }

      // Detect Backlog section
      if (line.startsWith('## Backlog')) {
        inBacklogSection = true;
        result.push(line);
        continue;
      }

      // Check if we're leaving the Backlog section
      if (inBacklogSection && line.startsWith('##') && !line.startsWith('## Backlog')) {
        inBacklogSection = false;
        backlogTableStarted = false;
      }

      // Insert new stories after the header row in the Backlog table
      if (inBacklogSection && line.match(/^\| Story ID \|/)) {
        backlogTableStarted = true;
        result.push(line);
        // Update header row to include Model column if not already present
        const headerLine = line.includes('Model') ? result[result.length - 1] : '|----------|-------|------|----------|--------|--------------|--------|-------|';
        if (!line.includes('Model')) {
          result[result.length - 1] = headerLine;
        }
        result.push('|----------|-------|------|----------|--------|--------------|--------|-------|');
        headerRowInserted = true;

        // Insert new stories
        for (const story of newStories) {
          result.push(`| ${story.id} | ${story.title} | ${story.type} | ${story.priority} | ${story.effort} | ${story.dependencies} | ${story.status} | opus |`);
        }
        continue;
      }

      // Skip old data rows if we're inserting new stories (to avoid duplicates)
      if (headerRowInserted && backlogTableStarted && line.match(/^\| [A-Z0-9]+-\d+ \|/)) {
        // Check if this is a separator row or a data row
        if (line.match(/^\|-+\|/)) {
          result.push(line);
          headerRowInserted = false; // Reset after separator
        } else if (!headerRowInserted) {
          // Keep existing story rows (only skip the first batch after we insert)
          result.push(line);
        }
        // Skip rows during headerRowInserted state (we already added new stories)
        continue;
      }

      result.push(line);
    }

    // Add change log entry at the end
    const changeLogIndex = result.findIndex(l => l.startsWith('## Change Log'));
    if (changeLogIndex !== -1) {
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const storyIds = newStories.map(s => s.id).join(', ');
      const newEntry = `| ${timestamp} | Synced ${newStories.length} new stories: ${storyIds} |`;

      // Find the first divider line after "## Change Log" and insert before it
      let insertIndex = changeLogIndex + 1;
      while (insertIndex < result.length && !result[insertIndex].startsWith('|---')) {
        insertIndex++;
      }
      if (insertIndex < result.length) {
        insertIndex++; // Skip the divider
      }

      result.splice(insertIndex, 0, newEntry);
    }

    return result.join('\n');
  }
}
