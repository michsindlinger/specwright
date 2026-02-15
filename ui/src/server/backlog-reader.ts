import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { projectDir } from './utils/project-dirs.js';

export type ModelSelection = 'opus' | 'sonnet' | 'haiku' | 'glm-5' | 'google/gemini-3-flash-preview' | 'google/gemini-3-pro-preview';

export interface BacklogItem {
  id: string;
  title: string;
  type: 'user-story' | 'bug';
  priority: string;
  effort: string;
  createdDate: string;
  filename: string;
}

export interface BacklogStoryInfo {
  id: string;
  title: string;
  type: 'user-story' | 'bug';
  priority: string;
  effort: string;
  status: 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked';
  model: ModelSelection;
  // UKB-003: Added for StoryInfo compatibility
  dorComplete: boolean;
  dependencies: string[];
}

export interface BacklogKanbanBoard {
  specId: string; // UKB-003: Sentinel value 'backlog' for adapter recognition
  stories: BacklogStoryInfo[];
  hasKanbanFile: boolean;
}

// JSON backlog structure (backlog-index.json from kanban MCP server)
interface BacklogJsonItem {
  id: string;
  type: string;  // 'bug' | 'todo' | 'improvement' | 'tech-debt'
  title: string;
  priority: string;
  severity?: string;
  effort?: number;
  status: string;  // 'open' | 'done' | 'in_progress' | 'ready' | 'pending' | 'completed'
  file?: string;
  // Legacy fields (kept for backward compatibility)
  slug?: string;
  category?: string;
  storyFile?: string;
  rootCause?: string;
  createdAt?: string;
  updatedAt?: string;
  executedIn?: string | null;
  completedAt?: string | null;
  model?: string;
}

interface BacklogJson {
  nextId?: number;
  items: BacklogJsonItem[];
  // Legacy fields
  version?: string;
  metadata?: {
    created: string;
    lastUpdated: string;
  };
}

export class BacklogReader {
  async listBacklogItems(projectPath: string): Promise<BacklogItem[]> {
    const backlogPath = projectDir(projectPath, 'backlog');
    const donePath = join(backlogPath, 'done');

    const items: BacklogItem[] = [];

    // Process files in the main backlog directory
    try {
      const entries = await fs.readdir(backlogPath, { withFileTypes: true });
      const files = entries.filter(e => {
        // Skip subdirectories like done/
        if (e.isDirectory()) return false;
        // Skip hidden files
        if (e.name.startsWith('.')) return false;
        return true;
      });

      for (const file of files) {
        // Skip kanban files
        if (file.name.startsWith('kanban-')) {
          continue;
        }

        // Only process user-story-*.md and bug-*.md files
        if (!file.name.match(/^(user-story|bug)-.*\.md$/)) {
          continue;
        }

        const item = await this.parseBacklogFile(backlogPath, file.name);
        if (item) {
          items.push(item);
        }
      }
    } catch {
      // No backlog directory or error reading
      return [];
    }

    // Also process files in the done/ directory
    try {
      const entries = await fs.readdir(donePath, { withFileTypes: true });
      const files = entries.filter(e => {
        // Skip subdirectories
        if (e.isDirectory()) return false;
        // Skip hidden files
        if (e.name.startsWith('.')) return false;
        return true;
      });

      for (const file of files) {
        // Only process user-story-*.md and bug-*.md files
        if (!file.name.match(/^(user-story|bug)-.*\.md$/)) {
          continue;
        }

        const item = await this.parseBacklogFile(donePath, file.name);
        if (item) {
          items.push(item);
        }
      }
    } catch {
      // No done directory or error reading - that's fine
    }

    // Sort by created date (descending) and then by ID
    items.sort((a, b) => {
      const dateCompare = b.createdDate.localeCompare(a.createdDate);
      if (dateCompare !== 0) return dateCompare;
      return a.id.localeCompare(b.id);
    });

    return items;
  }

  /**
   * Get kanban board data for the backlog.
   * Reads backlog items from backlog-index.json (new) or markdown files (legacy).
   */
  async getKanbanBoard(projectPath: string): Promise<BacklogKanbanBoard> {
    const backlogPath = projectDir(projectPath, 'backlog');
    const backlogJsonPath = join(backlogPath, 'backlog-index.json');
    const donePath = join(backlogPath, 'done');

    const result: BacklogKanbanBoard = {
      specId: 'backlog', // UKB-003: Sentinel value for adapter recognition
      stories: [],
      hasKanbanFile: false
    };

    // Try to read from backlog-index.json first (new format)
    try {
      const backlogJsonContent = await fs.readFile(backlogJsonPath, 'utf-8');
      const backlogJson: BacklogJson = JSON.parse(backlogJsonContent);

      // Map JSON items to BacklogStoryInfo
      const storiesMap = new Map<string, BacklogStoryInfo>();

      for (const item of backlogJson.items) {
        // Map JSON status to our status (UKB-003: added 'blocked' and 'in_review')
        let status: 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked';
        switch (item.status) {
          case 'ready':
          case 'pending':
          case 'open':
            status = 'backlog';
            break;
          case 'in_progress':
          case 'testing':
            status = 'in_progress';
            break;
          case 'in_review':
          case 'inReview':
            status = 'in_review';
            break;
          case 'blocked':
            status = 'blocked';
            break;
          case 'done':
          case 'completed':
            status = 'done';
            break;
          default:
            status = 'backlog';
        }

        // Map effort number to string
        const effortMap: Record<number, string> = {
          1: 'XS',
          2: 'S',
          3: 'M',
          5: 'L',
          8: 'XL'
        };

        // Map item type to display type
        const displayType: 'user-story' | 'bug' = item.type === 'bug' ? 'bug' : 'user-story';

        // Validate and assign model (BKE-001)
        let model: ModelSelection = 'opus';
        const validModels: ModelSelection[] = ['opus', 'sonnet', 'haiku', 'glm-5', 'google/gemini-3-flash-preview', 'google/gemini-3-pro-preview'];
        if (item.model && validModels.includes(item.model as ModelSelection)) {
          model = item.model as ModelSelection;
        }

        storiesMap.set(item.id, {
          id: item.id,
          title: item.title,
          type: displayType,
          priority: item.priority,
          effort: effortMap[item.effort ?? 3] || 'M',
          status,
          model,
          // UKB-003: Added for StoryInfo compatibility
          dorComplete: true, // Backlog items don't have DoR concept, always true
          dependencies: [] // Backlog items don't have dependencies
        });
      }

      result.stories = Array.from(storiesMap.values());
      result.hasKanbanFile = true; // backlog-index.json exists

      // Sort: in_progress first, then in_review, then blocked, then backlog, then done (UKB-003: extended)
      result.stories.sort((a, b) => {
        const order: Record<string, number> = { in_progress: 0, in_review: 1, blocked: 2, backlog: 3, done: 4 };
        return (order[a.status] ?? 5) - (order[b.status] ?? 5);
      });

      return result;
    } catch {
      // backlog-index.json not found or invalid - fall back to legacy markdown
    }

    // Legacy: Read from markdown files
    const kanbanPath = await this.getLatestKanbanPath(projectPath);

    // Read all backlog items from both directories
    const items = await this.listBacklogItems(projectPath);

    // Track which IDs are in the done directory
    const doneIds = new Set<string>();

    // Read IDs from done/ directory
    try {
      const entries = await fs.readdir(donePath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && !entry.name.startsWith('.')) {
          const idMatch = entry.name.match(/(user-story|bug)-(\d{4}-\d{2}-\d{2}-\d{3})/);
          if (idMatch) {
            doneIds.add(idMatch[2]);
          }
        }
      }
    } catch {
      // No done directory - that's fine
    }

    const storiesMap = new Map<string, BacklogStoryInfo>();

    for (const item of items) {
      storiesMap.set(item.id, {
        id: item.id,
        title: item.title,
        type: item.type,
        priority: item.priority,
        effort: item.effort,
        status: doneIds.has(item.id) ? 'done' : 'backlog', // Default to done if in done/ directory
        model: 'opus', // Default model
        // UKB-003: Added for StoryInfo compatibility
        dorComplete: true, // Backlog items don't have DoR concept, always true
        dependencies: [] // Backlog items don't have dependencies
      });
    }

    // Try to read kanban file for status
    if (kanbanPath) {
      try {
        const kanbanContent = await fs.readFile(kanbanPath, 'utf-8');
        result.hasKanbanFile = true;

        // Parse statuses from kanban sections
        const statusMap = this.parseKanbanStatuses(kanbanContent);

        // Update story statuses and models from kanban
        for (const [storyId, entry] of statusMap) {
          const story = storiesMap.get(storyId);
          if (story) {
            story.status = entry.status;
            story.model = entry.model;
          }
        }
      } catch {
        // No kanban file - use directory-based status
      }
    }

    result.stories = Array.from(storiesMap.values());

    // Sort: in_progress first, then in_review, then blocked, then backlog, then done (UKB-003: extended)
    result.stories.sort((a, b) => {
      const order: Record<string, number> = { in_progress: 0, in_review: 1, blocked: 2, backlog: 3, done: 4 };
      return (order[a.status] ?? 5) - (order[b.status] ?? 5);
    });

    return result;
  }

  /**
   * Get the path to the latest kanban file (kanban-YYYY-MM-DD.md)
   */
  private async getLatestKanbanPath(projectPath: string): Promise<string | null> {
    const backlogPath = projectDir(projectPath, 'backlog');
    try {
      const files = await fs.readdir(backlogPath);
      const kanbanFiles = files
        .filter(f => f.startsWith('kanban-') && f.endsWith('.md'))
        .sort()
        .reverse(); // Get the latest one

      if (kanbanFiles.length > 0) {
        return join(backlogPath, kanbanFiles[0]);
      }
    } catch {
      // Error reading directory
    }
    return null;
  }

  /**
   * Parse story statuses from kanban board markdown
   */
  private parseKanbanStatuses(kanbanContent: string): Map<string, { status: 'backlog' | 'in_progress' | 'done'; model: ModelSelection }> {
    const statusMap = new Map<string, { status: 'backlog' | 'in_progress' | 'done'; model: ModelSelection }>();

    // Split by sections
    const sections = kanbanContent.split(/^## /m);

    for (const section of sections) {
      const lines = section.split('\n');
      const sectionTitle = lines[0]?.toLowerCase().trim() || '';

      let status: 'backlog' | 'in_progress' | 'done' | null = null;

      if (sectionTitle.includes('backlog')) {
        status = 'backlog';
      } else if (sectionTitle.includes('in progress')) {
        status = 'in_progress';
      } else if (sectionTitle.includes('done')) {
        status = 'done';
      }

      if (status) {
        // Match backlog story ID in any table row format (flexible column count)
        const rowPattern = /\|\s*(\d{4}-\d{2}-\d{2}-\d{3})\s*\|(.*)$/gm;
        let match;

        while ((match = rowPattern.exec(section)) !== null) {
          const storyId = match[1];
          const restOfRow = match[2];

          // Parse remaining columns to extract model (if present)
          const columns = restOfRow.split('|').map(c => c.trim()).filter(c => c);

          // Model is in 7th position (index 6) only for Backlog tables with 8 columns
          let model: ModelSelection = 'opus';
          if (status === 'backlog' && columns.length >= 7) {
            const modelStr = columns[6]?.toLowerCase();
            if (['opus', 'sonnet', 'haiku'].includes(modelStr)) {
              model = modelStr as ModelSelection;
            }
          }

          statusMap.set(storyId, { status, model });
        }
      }
    }

    return statusMap;
  }

  private async parseBacklogFile(backlogPath: string, filename: string): Promise<BacklogItem | null> {
    try {
      const content = await fs.readFile(join(backlogPath, filename), 'utf-8');

      // Extract ID from filename (e.g., user-story-2026-01-31-001-title.md -> 2026-01-31-001)
      const idMatch = filename.match(/(user-story|bug)-(\d{4}-\d{2}-\d{2}-\d{3})/);
      if (!idMatch) {
        return null;
      }

      const type = idMatch[1] === 'bug' ? 'bug' : 'user-story';
      const id = idMatch[2];

      // Extract title from first heading
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : basename(filename, '.md');

      // Extract priority
      const priorityMatch = content.match(/\*\*Priority\*\*:\s*(.+)/i) || content.match(/Priority:\s*(.+)/i);
      const priority = priorityMatch ? priorityMatch[1].trim() : 'Medium';

      // Extract effort
      const effortMatch = content.match(/\*\*Estimated Effort\*\*:\s*(.+)/i) || content.match(/Effort:\s*(.+)/i);
      const effort = effortMatch ? effortMatch[1].trim() : 'M';

      // Extract created date from filename or content
      const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
      const createdDate = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

      return {
        id,
        title,
        type,
        priority,
        effort,
        createdDate,
        filename
      };
    } catch {
      return null;
    }
  }
}
