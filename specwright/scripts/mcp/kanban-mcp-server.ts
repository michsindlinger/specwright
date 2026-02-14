#!/usr/bin/env node

/**
 * Kanban MCP Server for Specwright
 *
 * Provides safe, atomic operations for kanban.json management.
 * Prevents race conditions and JSON corruption when multiple Claude CLI
 * sessions or the web UI server access kanban.json simultaneously.
 *
 * Tools:
 * - kanban_read: Read kanban state
 * - kanban_create: Initialize kanban from story files
 * - kanban_start_story: Mark story as in_progress
 * - kanban_complete_story: Mark story as done with implementation data
 * - kanban_update_phase: Update resume context and execution phase
 * - kanban_set_git_strategy: Set git strategy info
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { withKanbanLock } from './kanban-lock.js';
import { parseStoryFile } from './story-parser.js';
import {
  generateStoryTemplate,
  generateBugTemplate,
  generateFixTemplate,
  generateTodoTemplate,
  type StoryItemData,
  type BugItemData,
  type FixItemData,
  type TodoItemData
} from './item-templates.js';

// ============================================================================
// Kanban JSON v1.0 TypeScript Interfaces
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

interface KanbanJsonCommit {
  hash: string;
  message: string;
  timestamp: string;
}

interface KanbanJsonStoryImplementation {
  filesModified: string[];
  commits: KanbanJsonCommit[];
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Read kanban.json from spec directory
 */
async function readKanbanJson(specPath: string): Promise<KanbanJsonV1> {
  const jsonPath = join(specPath, 'kanban.json');
  const content = await readFile(jsonPath, 'utf-8');
  return JSON.parse(content) as KanbanJsonV1;
}

/**
 * Write kanban.json to spec directory (inside lock)
 */
async function writeKanbanJson(specPath: string, kanban: KanbanJsonV1): Promise<void> {
  const jsonPath = join(specPath, 'kanban.json');
  await writeFile(jsonPath, JSON.stringify(kanban, null, 2), 'utf-8');
}

/**
 * Update board status counts based on current story statuses
 */
function updateBoardStatus(kanban: KanbanJsonV1): void {
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
 * Add changelog entry
 */
function addChangeLogEntry(
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
 * Update statistics based on story completion
 */
function updateStatistics(kanban: KanbanJsonV1): void {
  const totalEffort = kanban.stories.reduce((sum, s) => sum + s.effort, 0);
  const completedEffort = kanban.stories
    .filter(s => s.status === 'done')
    .reduce((sum, s) => sum + s.effort, 0);
  const remainingEffort = totalEffort - completedEffort;
  const progressPercent = totalEffort > 0 ? (completedEffort / totalEffort) * 100 : 0;

  const byType: Record<string, number> = {};
  const byPriority: Record<string, number> = {};

  for (const story of kanban.stories) {
    byType[story.type] = (byType[story.type] || 0) + 1;
    byPriority[story.priority] = (byPriority[story.priority] || 0) + 1;
  }

  kanban.statistics = {
    totalEffort,
    completedEffort,
    remainingEffort,
    progressPercent,
    byType,
    byPriority
  };
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new Server(
  {
    name: 'kanban-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================================================
// Tool Definitions
// ============================================================================

const TOOLS: Tool[] = [
  {
    name: 'kanban_read',
    description: 'Read the full kanban state for a spec. Returns the complete KanbanJsonV1 object.',
    inputSchema: {
      type: 'object',
      properties: {
        specId: {
          type: 'string',
          description: 'Spec ID (e.g., "2026-02-08-user-auth")'
        }
      },
      required: ['specId']
    }
  },
  {
    name: 'kanban_create',
    description: 'Initialize kanban.json from story files. Creates the full KanbanJsonV1 structure with boardStatus, statistics, and initial changeLog.',
    inputSchema: {
      type: 'object',
      properties: {
        specId: { type: 'string', description: 'Spec ID' },
        specName: { type: 'string', description: 'Human-readable spec name' },
        specPrefix: { type: 'string', description: 'Story ID prefix (e.g., "AUTH")' },
        stories: {
          type: 'array',
          description: 'Array of story objects',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              file: { type: 'string' },
              type: { type: 'string' },
              priority: { type: 'string' },
              effort: { type: 'number' },
              status: { type: 'string', enum: ['ready', 'blocked'] },
              dependencies: { type: 'array', items: { type: 'string' } }
            },
            required: ['id', 'title', 'file', 'type', 'priority', 'effort', 'status', 'dependencies']
          }
        }
      },
      required: ['specId', 'specName', 'specPrefix', 'stories']
    }
  },
  {
    name: 'kanban_start_story',
    description: 'Atomically mark a story as in_progress. Updates status, phase, timing, resumeContext, boardStatus, execution, and changeLog.',
    inputSchema: {
      type: 'object',
      properties: {
        specId: { type: 'string', description: 'Spec ID' },
        storyId: { type: 'string', description: 'Story ID to start' },
        model: { type: 'string', description: 'Model used for execution (optional)' }
      },
      required: ['specId', 'storyId']
    }
  },
  {
    name: 'kanban_complete_story',
    description: 'Atomically mark a story as done. Updates status, phase, timing, implementation data, verification, resumeContext, boardStatus, statistics, and changeLog. Returns remaining story count for auto-continue logic.',
    inputSchema: {
      type: 'object',
      properties: {
        specId: { type: 'string', description: 'Spec ID' },
        storyId: { type: 'string', description: 'Story ID to complete' },
        filesModified: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of modified file paths'
        },
        commits: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              hash: { type: 'string' },
              message: { type: 'string' },
              timestamp: { type: 'string' }
            },
            required: ['hash', 'message', 'timestamp']
          },
          description: 'List of commit objects'
        }
      },
      required: ['specId', 'storyId', 'filesModified', 'commits']
    }
  },
  {
    name: 'kanban_update_phase',
    description: 'Update resume context and execution metadata. Flexible update for phase transitions (1-complete → 2-complete → 3-execute-story → complete).',
    inputSchema: {
      type: 'object',
      properties: {
        specId: { type: 'string', description: 'Spec ID' },
        currentPhase: { type: 'string', description: 'New current phase value' },
        nextPhase: { type: 'string', description: 'New next phase value (optional)' },
        lastAction: { type: 'string', description: 'Last action description (optional)' },
        nextAction: { type: 'string', description: 'Next action description (optional)' },
        executionStatus: { type: 'string', description: 'Execution status (optional)' }
      },
      required: ['specId', 'currentPhase']
    }
  },
  {
    name: 'kanban_set_git_strategy',
    description: 'Set git strategy info in resumeContext. Updates git fields, advances phase from 1-complete to 2-complete if needed, and adds changeLog entry.',
    inputSchema: {
      type: 'object',
      properties: {
        specId: { type: 'string', description: 'Spec ID' },
        gitStrategy: {
          type: 'string',
          enum: ['worktree', 'branch', 'current-branch'],
          description: 'Git strategy being used'
        },
        gitBranch: { type: 'string', description: 'Git branch name' },
        worktreePath: { type: 'string', description: 'Worktree path (optional, only for worktree strategy)' }
      },
      required: ['specId', 'gitStrategy', 'gitBranch']
    }
  },
  {
    name: 'kanban_get_next_task',
    description: 'Smart tool that returns everything needed to start the next story: story data (parsed from .md file), relevant integration context, and resume info. Saves ~3000 tokens per story by bundling multiple reads and pre-parsing markdown into structured JSON.',
    inputSchema: {
      type: 'object',
      properties: {
        specId: { type: 'string', description: 'Spec ID' }
      },
      required: ['specId']
    }
  },
  {
    name: 'kanban_add_item',
    description: 'Add a new item (story/bug/fix/system) to an existing kanban. Creates the .md file from template and atomically updates kanban.json. Used by /add-story, /add-bug, and story-997 (fix stories).',
    inputSchema: {
      type: 'object',
      properties: {
        specId: { type: 'string', description: 'Spec ID' },
        itemType: {
          type: 'string',
          enum: ['story', 'bug', 'fix', 'system'],
          description: 'Type of item to add'
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Item ID (e.g., MCPT-011 or MCPT-BUG-001)' },
            title: { type: 'string', description: 'Item title' },
            type: { type: 'string', description: 'Technical type (frontend/backend/etc.)' },
            priority: { type: 'string', description: 'Priority level' },
            effort: { type: 'number', description: 'Effort in story points' },
            status: { type: 'string', enum: ['ready', 'blocked'], description: 'Initial status' },
            dependencies: { type: 'array', items: { type: 'string' }, description: 'Story IDs this depends on' },
            content: { type: 'string', description: 'Full markdown content (optional, otherwise generated from template)' },
            severity: { type: 'string', description: 'For bugs: critical/high/medium/low' },
            rootCause: { type: 'string', description: 'For bugs: Root cause analysis' },
            fixFor: { type: 'string', description: 'For fixes: Original item ID' },
            errorOutput: { type: 'string', description: 'For fixes: Error output from checks' }
          },
          required: ['id', 'title', 'type', 'priority', 'effort', 'status', 'dependencies']
        }
      },
      required: ['specId', 'itemType', 'data']
    }
  },
  {
    name: 'backlog_add_item',
    description: 'Add an item to the global backlog. Creates item file in specwright/backlog/items/ and updates backlog index. Used by /add-todo and story-998 (code review findings).',
    inputSchema: {
      type: 'object',
      properties: {
        itemType: {
          type: 'string',
          enum: ['todo', 'tech-debt', 'improvement', 'bug'],
          description: 'Type of backlog item'
        },
        data: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Item title' },
            description: { type: 'string', description: 'Detailed description' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Priority level' },
            source: { type: 'string', description: 'Where this item came from (optional)' },
            relatedSpec: { type: 'string', description: 'Related spec ID (optional)' },
            estimatedEffort: { type: 'number', description: 'Effort estimate (optional)' },
            severity: { type: 'string', description: 'For bugs: severity level' },
            reproduction: { type: 'string', description: 'For bugs: reproduction steps' }
          },
          required: ['title', 'description', 'priority']
        }
      },
      required: ['itemType', 'data']
    }
  },
  {
    name: 'backlog_start_item',
    description: 'Mark a backlog item as in_progress in the execution kanban. Updates item status, timing, execution kanban resumeContext, boardStatus, and adds changeLog entry. Used by backlog-phase-2.md workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        executionId: { type: 'string', description: 'Execution kanban ID (e.g., "kanban-2026-02-08")' },
        itemId: { type: 'string', description: 'Item ID to start (e.g., "ITEM-003")' }
      },
      required: ['executionId', 'itemId']
    }
  },
  {
    name: 'backlog_complete_item',
    description: 'Mark a backlog item as done in the execution kanban. Updates item status, timing, execution kanban resumeContext, boardStatus, backlog-index.json, and adds changeLog entries. Returns remaining item count for auto-continue logic.',
    inputSchema: {
      type: 'object',
      properties: {
        executionId: { type: 'string', description: 'Execution kanban ID (e.g., "kanban-2026-02-08")' },
        itemId: { type: 'string', description: 'Item ID to complete' },
        filesModified: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of modified file paths (optional)'
        }
      },
      required: ['executionId', 'itemId']
    }
  }
];

// ============================================================================
// Request Handlers
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Resolve paths from working directory with legacy fallback
    const cwd = process.cwd();
    const specId = (args as { specId?: string }).specId;
    let specPath = specId ? join(cwd, 'specwright', 'specs', specId) : cwd;

    // Dual-path support: fall back to agent-os/ for non-migrated projects
    if (specId && !existsSync(specPath)) {
      const legacyPath = join(cwd, 'agent-os', 'specs', specId);
      if (existsSync(legacyPath)) {
        specPath = legacyPath;
        console.error(`[DualPath] Using legacy path: ${legacyPath}`);
      }
    }

    switch (name) {
      case 'kanban_read':
        return await handleKanbanRead(specPath);

      case 'kanban_create':
        return await handleKanbanCreate(specPath, args as {
          specId: string;
          specName: string;
          specPrefix: string;
          stories: Array<{
            id: string;
            title: string;
            file: string;
            type: string;
            priority: string;
            effort: number;
            status: 'ready' | 'blocked';
            dependencies: string[];
          }>;
        });

      case 'kanban_start_story':
        return await handleKanbanStartStory(specPath, args as {
          storyId: string;
          model?: string;
        });

      case 'kanban_complete_story':
        return await handleKanbanCompleteStory(specPath, args as {
          storyId: string;
          filesModified: string[];
          commits: KanbanJsonCommit[];
        });

      case 'kanban_update_phase':
        return await handleKanbanUpdatePhase(specPath, args as {
          currentPhase: string;
          nextPhase?: string;
          lastAction?: string;
          nextAction?: string;
          executionStatus?: string;
        });

      case 'kanban_set_git_strategy':
        return await handleKanbanSetGitStrategy(specPath, args as {
          gitStrategy: string;
          gitBranch: string;
          worktreePath?: string;
        });

      case 'kanban_get_next_task':
        return await handleKanbanGetNextTask(specPath);

      case 'kanban_add_item':
        return await handleKanbanAddItem(specPath, args as {
          itemType: 'story' | 'bug' | 'fix' | 'system';
          data: Record<string, unknown>;
        });

      case 'backlog_add_item':
        return await handleBacklogAddItem(cwd, args as {
          itemType: 'todo' | 'tech-debt' | 'improvement' | 'bug';
          data: Record<string, unknown>;
        });

      case 'backlog_start_item':
        return await handleBacklogStartItem(cwd, args as {
          executionId: string;
          itemId: string;
        });

      case 'backlog_complete_item':
        return await handleBacklogCompleteItem(cwd, args as {
          executionId: string;
          itemId: string;
          filesModified?: string[];
        });

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});

// ============================================================================
// Tool Implementations
// ============================================================================

async function handleKanbanRead(specPath: string) {
  const kanban = await readKanbanJson(specPath);
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ success: true, kanban }, null, 2)
    }]
  };
}

async function handleKanbanCreate(
  specPath: string,
  args: {
    specId: string;
    specName: string;
    specPrefix: string;
    stories: Array<{
      id: string;
      title: string;
      file: string;
      type: string;
      priority: string;
      effort: number;
      status: 'ready' | 'blocked';
      dependencies: string[];
    }>;
  }
) {
  return await withKanbanLock(specPath, async () => {
    const now = new Date().toISOString();

    // Convert input stories to KanbanJsonStory format
    const stories: KanbanJsonStory[] = args.stories.map(s => ({
      id: s.id,
      title: s.title,
      file: s.file,
      type: s.type,
      priority: s.priority,
      effort: s.effort,
      status: s.status as KanbanJsonStatus,
      phase: 'pending' as KanbanJsonPhase,
      dependencies: s.dependencies,
      blockedBy: [],
      model: null,
      timing: {
        createdAt: now,
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
    }));

    // Calculate board status
    const boardStatus: KanbanJsonBoardStatus = {
      total: stories.length,
      ready: stories.filter(s => s.status === 'ready').length,
      inProgress: 0,
      inReview: 0,
      testing: 0,
      done: 0,
      blocked: stories.filter(s => s.status === 'blocked').length
    };

    // Calculate statistics
    const totalEffort = stories.reduce((sum, s) => sum + s.effort, 0);
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const story of stories) {
      byType[story.type] = (byType[story.type] || 0) + 1;
      byPriority[story.priority] = (byPriority[story.priority] || 0) + 1;
    }

    const kanban: KanbanJsonV1 = {
      $schema: '../../templates/schemas/spec-kanban-schema.json',
      version: '1.0',
      spec: {
        id: args.specId,
        name: args.specName,
        prefix: args.specPrefix,
        specFile: 'spec.md',
        specLiteFile: 'spec-lite.md',
        createdAt: now
      },
      resumeContext: {
        currentPhase: '1-complete',
        nextPhase: '2-worktree-setup',
        worktreePath: null,
        gitBranch: null,
        gitStrategy: null,
        currentStory: null,
        currentStoryPhase: null,
        lastAction: 'Kanban board created via MCP',
        nextAction: 'Setup git worktree or branch',
        progressIndex: 0,
        totalStories: stories.length
      },
      execution: {
        status: 'not_started',
        startedAt: null,
        completedAt: null,
        model: null
      },
      stories,
      boardStatus,
      statistics: {
        totalEffort,
        completedEffort: 0,
        remainingEffort: totalEffort,
        progressPercent: 0,
        byType,
        byPriority
      },
      executionPlan: {
        strategy: 'dependency-aware',
        phases: []
      },
      changeLog: [{
        timestamp: now,
        action: 'kanban_created',
        storyId: null,
        details: `Kanban initialized with ${stories.length} stories via MCP tool`
      }]
    };

    await writeKanbanJson(specPath, kanban);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          path: join(specPath, 'kanban.json'),
          storyCount: stories.length
        }, null, 2)
      }]
    };
  });
}

async function handleKanbanStartStory(
  specPath: string,
  args: { storyId: string; model?: string }
) {
  return await withKanbanLock(specPath, async () => {
    const kanban = await readKanbanJson(specPath);
    const story = kanban.stories.find(s => s.id === args.storyId);

    if (!story) {
      throw new Error(`Story ${args.storyId} not found in kanban.json`);
    }

    const now = new Date().toISOString();
    const oldStatus = story.status;

    // Update story
    story.status = 'in_progress';
    story.phase = 'in_progress';
    story.timing.startedAt = now;
    if (args.model) {
      story.model = args.model;
    }

    // Update resume context
    kanban.resumeContext.currentStory = story.id;
    kanban.resumeContext.currentStoryPhase = 'implementing';
    kanban.resumeContext.lastAction = `Started ${story.id}`;
    kanban.resumeContext.nextAction = `Implement ${story.title}`;

    // Update execution
    if (!kanban.execution.startedAt) {
      kanban.execution.startedAt = now;
    }
    kanban.execution.status = 'executing';

    // Update board status
    updateBoardStatus(kanban);

    // Add changelog
    addChangeLogEntry(kanban, 'status_changed', story.id, `Story started: ${oldStatus} → in_progress`);

    await writeKanbanJson(specPath, kanban);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          story: {
            id: story.id,
            title: story.title,
            status: story.status
          }
        }, null, 2)
      }]
    };
  });
}

async function handleKanbanCompleteStory(
  specPath: string,
  args: {
    storyId: string;
    filesModified: string[];
    commits: KanbanJsonCommit[];
  }
) {
  return await withKanbanLock(specPath, async () => {
    const kanban = await readKanbanJson(specPath);
    const story = kanban.stories.find(s => s.id === args.storyId);

    if (!story) {
      throw new Error(`Story ${args.storyId} not found in kanban.json`);
    }

    const now = new Date().toISOString();
    const oldStatus = story.status;

    // Update story
    story.status = 'done';
    story.phase = 'done';
    story.timing.completedAt = now;
    story.implementation.filesModified = args.filesModified;
    story.implementation.commits = args.commits;
    story.verification.dodChecked = true;

    // Update resume context
    kanban.resumeContext.currentStory = null;
    kanban.resumeContext.currentStoryPhase = null;
    kanban.resumeContext.progressIndex += 1;
    kanban.resumeContext.lastAction = `Completed ${story.id}`;

    const remainingStories = kanban.stories.filter(s => s.status !== 'done');
    if (remainingStories.length > 0) {
      const nextStory = remainingStories.find(s => s.status === 'ready' || s.status === 'in_progress');
      kanban.resumeContext.nextAction = nextStory
        ? `Execute next story: ${nextStory.id}`
        : 'Wait for blocked stories to become ready';
    } else {
      kanban.resumeContext.nextAction = 'All stories complete';
      kanban.resumeContext.currentPhase = 'complete';
      kanban.execution.status = 'completed';
      kanban.execution.completedAt = now;
    }

    // Update board status and statistics
    updateBoardStatus(kanban);
    updateStatistics(kanban);

    // Add changelog
    addChangeLogEntry(kanban, 'status_changed', story.id, `Story completed: ${oldStatus} → done`);

    await writeKanbanJson(specPath, kanban);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          story: {
            id: story.id,
            title: story.title,
            status: story.status
          },
          remaining: remainingStories.length
        }, null, 2)
      }]
    };
  });
}

async function handleKanbanUpdatePhase(
  specPath: string,
  args: {
    currentPhase: string;
    nextPhase?: string;
    lastAction?: string;
    nextAction?: string;
    executionStatus?: string;
  }
) {
  return await withKanbanLock(specPath, async () => {
    const kanban = await readKanbanJson(specPath);

    // Update resume context
    kanban.resumeContext.currentPhase = args.currentPhase;
    if (args.nextPhase !== undefined) {
      kanban.resumeContext.nextPhase = args.nextPhase;
    }
    if (args.lastAction !== undefined) {
      kanban.resumeContext.lastAction = args.lastAction;
    }
    if (args.nextAction !== undefined) {
      kanban.resumeContext.nextAction = args.nextAction;
    }

    // Update execution status if provided
    if (args.executionStatus !== undefined) {
      kanban.execution.status = args.executionStatus;
    }

    // Add changelog
    addChangeLogEntry(kanban, 'phase_updated', null, `Phase: ${args.currentPhase}`);

    await writeKanbanJson(specPath, kanban);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ success: true }, null, 2)
      }]
    };
  });
}

async function handleKanbanSetGitStrategy(
  specPath: string,
  args: {
    gitStrategy: string;
    gitBranch: string;
    worktreePath?: string;
  }
) {
  return await withKanbanLock(specPath, async () => {
    const kanban = await readKanbanJson(specPath);

    // Update resume context with git info
    kanban.resumeContext.gitStrategy = args.gitStrategy;
    kanban.resumeContext.gitBranch = args.gitBranch;
    kanban.resumeContext.worktreePath = args.worktreePath || null;

    // Advance phase if still at 1-complete
    if (kanban.resumeContext.currentPhase === '1-complete') {
      kanban.resumeContext.currentPhase = '2-complete';
      kanban.resumeContext.nextPhase = '3-execute-story';
      kanban.resumeContext.lastAction = `Git ${args.gitStrategy} setup`;
      kanban.resumeContext.nextAction = 'Execute first story';
    }

    // Add changelog
    const details = `Git ${args.gitStrategy} setup: ${args.gitBranch}${args.worktreePath ? ` (worktree: ${args.worktreePath})` : ''}`;
    addChangeLogEntry(kanban, 'git_strategy_set', null, details);

    await writeKanbanJson(specPath, kanban);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ success: true }, null, 2)
      }]
    };
  });
}

async function handleKanbanGetNextTask(specPath: string) {
  // Read kanban to find next story
  const kanban = await readKanbanJson(specPath);

  // Find next ready story (status = ready, not blocked)
  const nextStory = kanban.stories.find(s => s.status === 'ready');

  if (!nextStory) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          message: 'No ready stories found. All stories are either in_progress, done, or blocked.'
        }, null, 2)
      }]
    };
  }

  // Parse story file to extract content
  const storyFilePath = join(specPath, nextStory.file);
  const parsedStory = await parseStoryFile(storyFilePath);

  // Read integration context if it exists
  let integrationContext: {
    completedStories: Array<{ id: string; summary: string; files: string[] }>;
    newExports: Record<string, string[]>;
  } = {
    completedStories: [],
    newExports: {}
  };

  try {
    const integrationPath = join(specPath, 'integration-context.md');
    const integrationContent = await readFile(integrationPath, 'utf-8');

    // Parse completed stories table
    const completedStories: Array<{ id: string; summary: string; files: string[] }> = [];
    const tableMatches = integrationContent.matchAll(/\|\s*([A-Z0-9]+-\d+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g);

    for (const match of tableMatches) {
      const [, id, summary, filesStr] = match;
      if (id !== '-' && id !== 'Story') {
        completedStories.push({
          id: id.trim(),
          summary: summary.trim(),
          files: filesStr.split(',').map(f => f.trim()).filter(f => f && f !== '-')
        });
      }
    }

    // Filter: Only include completed stories that are dependencies
    integrationContext.completedStories = completedStories.filter(cs =>
      parsedStory.dependencies.includes(cs.id) || completedStories.length <= 3
    );

    // Parse exports sections (simplified - just extract the section text)
    const componentsMatch = integrationContent.match(/###\s+Components\s*([\s\S]*?)(?=###|$)/i);
    const servicesMatch = integrationContent.match(/###\s+Services\s*([\s\S]*?)(?=###|$)/i);
    const hooksMatch = integrationContent.match(/###\s+Hooks.*?Utilities\s*([\s\S]*?)(?=###|$)/i);

    if (componentsMatch && !componentsMatch[1].includes('_None yet_')) {
      integrationContext.newExports.components = componentsMatch[1].trim().split('\n').filter(l => l.trim() && l.startsWith('-'));
    }
    if (servicesMatch && !servicesMatch[1].includes('_None yet_')) {
      integrationContext.newExports.services = servicesMatch[1].trim().split('\n').filter(l => l.trim() && l.startsWith('-'));
    }
    if (hooksMatch && !hooksMatch[1].includes('_None yet_')) {
      integrationContext.newExports.hooks = hooksMatch[1].trim().split('\n').filter(l => l.trim() && l.startsWith('-'));
    }

  } catch {
    // integration-context.md doesn't exist or couldn't be read - not critical
    console.log('[GetNextTask] No integration context found (this is OK for first story)');
  }

  // Build response with all context
  const response = {
    success: true,
    story: {
      id: nextStory.id,
      title: nextStory.title,
      type: nextStory.type,
      priority: nextStory.priority,
      effort: nextStory.effort,
      dependencies: nextStory.dependencies,
      model: nextStory.model,
      // Parsed content from .md file
      feature: parsedStory.feature,
      scenarios: parsedStory.scenarios,
      technicalDetails: {
        was: parsedStory.was,
        wie: parsedStory.wie,
        wo: parsedStory.wo,
        wer: parsedStory.wer
      },
      dod: parsedStory.dod
    },
    integrationContext,
    resumeInfo: {
      currentPhase: kanban.resumeContext.currentPhase,
      gitStrategy: kanban.resumeContext.gitStrategy,
      gitBranch: kanban.resumeContext.gitBranch,
      worktreePath: kanban.resumeContext.worktreePath,
      progressIndex: kanban.resumeContext.progressIndex,
      totalStories: kanban.resumeContext.totalStories
    },
    boardSummary: {
      total: kanban.boardStatus.total,
      ready: kanban.boardStatus.ready,
      inProgress: kanban.boardStatus.inProgress,
      done: kanban.boardStatus.done,
      blocked: kanban.boardStatus.blocked
    }
  };

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(response, null, 2)
    }]
  };
}

async function handleKanbanAddItem(
  specPath: string,
  args: {
    itemType: 'story' | 'bug' | 'fix' | 'system';
    data: Record<string, unknown>;
  }
) {
  return await withKanbanLock(specPath, async () => {
    const kanban = await readKanbanJson(specPath);
    const data = args.data as StoryItemData & BugItemData & FixItemData;

    // Validate: Story ID unique
    if (kanban.stories.find(s => s.id === data.id)) {
      throw new Error(`Item ${data.id} already exists in kanban`);
    }

    // Validate: Dependencies exist
    for (const depId of data.dependencies) {
      if (!kanban.stories.find(s => s.id === depId)) {
        throw new Error(`Dependency ${depId} not found in kanban`);
      }
    }

    // Determine next story number and create file
    const existingNumbers = kanban.stories
      .map(s => {
        const match = s.file.match(/story-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);

    const nextNumber = Math.max(...existingNumbers, 0) + 1;
    const paddedNumber = String(nextNumber).padStart(3, '0');
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const storyFile = `stories/story-${paddedNumber}-${slug}.md`;

    // Determine story file path
    const storyFilePath = join(specPath, storyFile);

    // Check if story file already exists (from /add-story workflow)
    let fileAlreadyExists = false;
    try {
      await readFile(storyFilePath, 'utf-8');
      fileAlreadyExists = true;
      console.error(`[KanbanAdd] Story file already exists, using existing: ${storyFile}`);
    } catch {
      // File doesn't exist, will create it
      fileAlreadyExists = false;
    }

    // Generate content from template or use provided content (only if file doesn't exist)
    if (!fileAlreadyExists) {
      let content: string;
      if (data.content) {
        content = data.content;
      } else {
        switch (args.itemType) {
          case 'bug':
            content = generateBugTemplate(data as BugItemData);
            break;
          case 'fix':
            content = generateFixTemplate(data as FixItemData);
            break;
          case 'story':
          case 'system':
          default:
            content = generateStoryTemplate(data);
        }
      }

      // Write story file
      await mkdir(dirname(storyFilePath), { recursive: true });
      await writeFile(storyFilePath, content, 'utf-8');
      console.error(`[KanbanAdd] Created story file: ${storyFile}`);
    }

    // Add to kanban
    const now = new Date().toISOString();
    const newStory: KanbanJsonStory = {
      id: data.id,
      title: data.title,
      file: storyFile,
      type: data.type,
      priority: data.priority,
      effort: data.effort,
      status: data.status as KanbanJsonStatus,
      phase: 'pending',
      dependencies: data.dependencies,
      blockedBy: [],
      model: null,
      timing: {
        createdAt: now,
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

    kanban.stories.push(newStory);

    // Update board status and statistics
    updateBoardStatus(kanban);
    updateStatistics(kanban);
    kanban.resumeContext.totalStories = kanban.stories.length;

    // Add changelog
    const itemTypeLabel = args.itemType.charAt(0).toUpperCase() + args.itemType.slice(1);
    addChangeLogEntry(kanban, 'item_added', newStory.id,
      `${itemTypeLabel} added: ${newStory.title}`);

    await writeKanbanJson(specPath, kanban);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          item: {
            id: newStory.id,
            title: newStory.title,
            file: storyFile,
            status: newStory.status
          },
          kanbanUpdated: true,
          newTotal: kanban.stories.length
        }, null, 2)
      }]
    };
  });
}

async function handleBacklogAddItem(
  projectPath: string,
  args: {
    itemType: 'todo' | 'tech-debt' | 'improvement' | 'bug';
    data: Record<string, unknown>;
  }
) {
  const data = args.data as TodoItemData;

  // Validate projectPath
  if (!projectPath || typeof projectPath !== 'string') {
    throw new Error(`Invalid project path: ${projectPath}`);
  }

  // Dual-path support: fall back to agent-os/ for non-migrated projects
  let backlogDir = join(projectPath, 'specwright', 'backlog');
  if (!existsSync(backlogDir)) {
    const legacyDir = join(projectPath, 'agent-os', 'backlog');
    if (existsSync(legacyDir)) {
      backlogDir = legacyDir;
      console.error(`[DualPath] Using legacy backlog path: ${legacyDir}`);
    }
  }

  // CRITICAL: Use file lock for backlog operations to prevent race conditions
  // when multiple items are added in parallel (e.g., from code review findings)
  return await withKanbanLock(backlogDir, async () => {
    const itemsDir = join(backlogDir, 'items');
    const indexPath = join(backlogDir, 'backlog-index.json');

    console.error(`[BacklogAdd] Project path: ${projectPath}`);
    console.error(`[BacklogAdd] Backlog dir: ${backlogDir}`);
    console.error(`[BacklogAdd] Index path: ${indexPath}`);

    // Ensure backlog structure exists
    await mkdir(itemsDir, { recursive: true });

    // Read or create index
    let index: {
      nextId: number;
      items: Array<{
        id: string;
        type: string;
        title: string;
        priority: string;
        status: string;
        file: string;
        createdAt: string;
      }>;
    };

    try {
      const indexContent = await readFile(indexPath, 'utf-8');
      index = JSON.parse(indexContent);
    } catch {
      // File doesn't exist, create new index
      index = {
        nextId: 1,
        items: []
      };
    }

  // Generate item ID
  const itemNumber = index.nextId;
  const paddedNumber = String(itemNumber).padStart(3, '0');
  const typePrefix = args.itemType === 'todo' ? 'TODO' :
                     args.itemType === 'tech-debt' ? 'DEBT' :
                     args.itemType === 'bug' ? 'BUG' : 'ITEM';
  const itemId = `${typePrefix}-${paddedNumber}`;

  // Create item file
  const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
  const itemFile = `items/${args.itemType}-${paddedNumber}-${slug}.md`;
  const itemFilePath = join(backlogDir, itemFile);

  const content = generateTodoTemplate(data, itemId);
  await writeFile(itemFilePath, content, 'utf-8');

  // Update index
  index.items.push({
    id: itemId,
    type: args.itemType,
    title: data.title,
    priority: data.priority,
    status: 'open',
    file: itemFile,
    createdAt: new Date().toISOString()
  });
  index.nextId += 1;

  await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          itemId,
          path: itemFile,
          backlogPath: 'specwright/backlog'
        }, null, 2)
      }]
    };
  }); // End of withKanbanLock
}

async function handleBacklogStartItem(
  projectPath: string,
  args: {
    executionId: string;
    itemId: string;
  }
) {
  // Dual-path support: fall back to agent-os/ for non-migrated projects
  let backlogDir = join(projectPath, 'specwright', 'backlog');
  if (!existsSync(backlogDir)) {
    const legacyDir = join(projectPath, 'agent-os', 'backlog');
    if (existsSync(legacyDir)) {
      backlogDir = legacyDir;
      console.error(`[DualPath] Using legacy backlog path: ${legacyDir}`);
    }
  }
  const executionPath = join(backlogDir, 'executions', `${args.executionId}.json`);

  return await withKanbanLock(backlogDir, async () => {
    // Read execution kanban
    const content = await readFile(executionPath, 'utf-8');
    const kanban = JSON.parse(content);

    // Find item
    const item = kanban.items?.find((i: any) => i.id === args.itemId);
    if (!item) {
      throw new Error(`Item ${args.itemId} not found in execution kanban ${args.executionId}`);
    }

    const now = new Date().toISOString();
    const oldStatus = item.executionStatus;

    // Update item
    item.executionStatus = 'in_progress';
    item.timing.startedAt = now;

    // Update resume context
    if (kanban.resumeContext) {
      kanban.resumeContext.currentPhase = 'in_progress';
      kanban.resumeContext.currentItem = item.id;
      kanban.resumeContext.lastAction = `Started ${item.id}`;
      kanban.resumeContext.nextAction = `Implement ${item.title}`;
    }

    // Update board status
    if (kanban.boardStatus) {
      kanban.boardStatus.queued = (kanban.boardStatus.queued || 0) - 1;
      kanban.boardStatus.inProgress = (kanban.boardStatus.inProgress || 0) + 1;
    }

    // Add changelog
    if (kanban.changeLog) {
      kanban.changeLog.push({
        timestamp: now,
        action: 'status_changed',
        itemId: item.id,
        from: oldStatus,
        to: 'in_progress',
        details: 'Started execution'
      });
    }

    // Write execution kanban
    await writeFile(executionPath, JSON.stringify(kanban, null, 2), 'utf-8');

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          item: {
            id: item.id,
            title: item.title,
            status: item.executionStatus
          }
        }, null, 2)
      }]
    };
  });
}

async function handleBacklogCompleteItem(
  projectPath: string,
  args: {
    executionId: string;
    itemId: string;
    filesModified?: string[];
  }
) {
  // Dual-path support: fall back to agent-os/ for non-migrated projects
  let backlogDir = join(projectPath, 'specwright', 'backlog');
  if (!existsSync(backlogDir)) {
    const legacyDir = join(projectPath, 'agent-os', 'backlog');
    if (existsSync(legacyDir)) {
      backlogDir = legacyDir;
      console.error(`[DualPath] Using legacy backlog path: ${legacyDir}`);
    }
  }
  const executionPath = join(backlogDir, 'executions', `${args.executionId}.json`);
  const indexPath = join(backlogDir, 'backlog-index.json');

  return await withKanbanLock(backlogDir, async () => {
    // Read execution kanban
    const execContent = await readFile(executionPath, 'utf-8');
    const kanban = JSON.parse(execContent);

    // Find item
    const item = kanban.items?.find((i: any) => i.id === args.itemId);
    if (!item) {
      throw new Error(`Item ${args.itemId} not found in execution kanban ${args.executionId}`);
    }

    const now = new Date().toISOString();
    const oldStatus = item.executionStatus;

    // Update item in execution kanban
    item.executionStatus = 'done';
    item.timing.completedAt = now;
    if (args.filesModified) {
      item.filesModified = args.filesModified;
    }

    // Update resume context
    if (kanban.resumeContext) {
      kanban.resumeContext.currentPhase = 'item-complete';
      kanban.resumeContext.currentItem = null;
      kanban.resumeContext.progressIndex = (kanban.resumeContext.progressIndex || 0) + 1;
      kanban.resumeContext.lastAction = `Completed ${item.id}`;
      kanban.resumeContext.nextAction = 'Execute next item';
    }

    // Update board status
    if (kanban.boardStatus) {
      kanban.boardStatus.inProgress = (kanban.boardStatus.inProgress || 1) - 1;
      kanban.boardStatus.done = (kanban.boardStatus.done || 0) + 1;
    }

    // Add changelog to execution kanban
    if (kanban.changeLog) {
      kanban.changeLog.push({
        timestamp: now,
        action: 'status_changed',
        itemId: item.id,
        from: oldStatus,
        to: 'done',
        details: 'Item completed'
      });
    }

    // Write execution kanban
    await writeFile(executionPath, JSON.stringify(kanban, null, 2), 'utf-8');

    // Also update backlog-index.json
    const indexContent = await readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexContent);

    // Find item by ID - handle ID mismatch between execution kanban and backlog index
    // Execution kanban might use date-based IDs (2026-02-10-001)
    // Backlog index uses TODO/ITEM/DEBT/BUG IDs (TODO-001)
    // Multiple fallback strategies for robustness
    const indexItem = index.items?.find((i: any) => {
      // Strategy 1: Exact ID match
      if (i.id === args.itemId) return true;

      // Strategy 2: Match by file path (strip directory)
      if (item.sourceFile && i.file) {
        const execFile = item.sourceFile.replace(/^(items|stories)\//, '');
        const indexFile = i.file.replace(/^(items|stories)\//, '');
        if (execFile === indexFile) return true;
      }

      // Strategy 3: Extract number from both IDs and match (e.g., 2026-02-10-003 → 003, TODO-003 → 003)
      const execNumMatch = args.itemId.match(/(\d+)$/);
      const indexNumMatch = i.id.match(/(\d+)$/);
      if (execNumMatch && indexNumMatch) {
        const execNum = execNumMatch[1];
        const indexNum = indexNumMatch[1];
        // Also check that types are compatible (todo matches TODO, etc.)
        const execType = item.type || args.itemId.toLowerCase();
        const indexType = i.type || i.id.toLowerCase();
        const typeMatch = execType.includes('todo') === indexType.includes('todo') ||
                         execType.includes('debt') === indexType.includes('debt') ||
                         execType.includes('bug') === indexType.includes('bug') ||
                         execType.includes('item') === indexType.includes('item');

        if (execNum === indexNum && typeMatch) return true;
      }

      return false;
    });

    if (indexItem) {
      indexItem.status = 'done';
      indexItem.completedAt = now;
    } else {
      console.error(`[BacklogComplete] Warning: Item ${args.itemId} not found in backlog-index. File: ${item.sourceFile}`);
    }

    // Add changelog to backlog index
    if (index.changeLog) {
      index.changeLog.push({
        timestamp: now,
        action: 'status_changed',
        itemId: item.id,
        from: 'open',
        to: 'done',
        details: `Completed in ${args.executionId}`
      });
    }

    await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');

    // Count remaining items
    const remainingItems = kanban.items?.filter((i: any) => i.executionStatus !== 'done').length || 0;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          item: {
            id: item.id,
            title: item.title,
            status: item.executionStatus
          },
          remaining: remainingItems
        }, null, 2)
      }]
    };
  });
}

// ============================================================================
// Server Start
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Kanban MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
