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
 * - kanban_get_next_task: Get next ready story with context
 * - kanban_add_item: Add story/bug/fix to kanban
 * - backlog_add_item: Add item to global backlog
 * - backlog_start_item: Mark backlog item as in_progress
 * - backlog_complete_item: Mark backlog item as done
 * - backlog_add_comment: Add a bot comment to a backlog item
 * - memory_store: Store a memory entry with upsert logic
 * - memory_search: Full-text search across memory entries
 * - memory_recall: Recall memory entries by ID, topic, or tag
 * - memory_list_tags: List all available memory tags
 * - memory_update: Update an existing memory entry
 * - memory_delete: Archive or permanently delete a memory entry
 * - memory_stats: Memory system statistics for housekeeping
 * - document_preview_open: Open a document in the preview panel
 * - document_preview_close: Close the document preview panel
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
import { createHash } from 'crypto';
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
import {
  memoryStore, memorySearch, memoryRecall, memoryListTags,
  memoryUpdate, memoryDelete, memoryStats, memoryContextSummary,
  type MemoryUpdateArgs, type MemoryDeleteArgs,
} from './memory-store.js';

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
  specTier?: 'S' | 'M' | 'L';
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
  file?: string;
  storyFile?: string;
  slug?: string;
  classification?: {
    type: string;
    priority: string;
    effort: string;
    complexity?: string;
  };
  type?: string;
  priority?: string;
  effort?: number | string;
  status: KanbanJsonStatus;
  phase?: KanbanJsonPhase;
  dependencies: string[];
  blockedBy?: string[];
  dorStatus?: string;
  model?: string | null;
  timing?: KanbanJsonStoryTiming;
  implementation?: KanbanJsonStoryImplementation;
  verification?: KanbanJsonStoryVerification;
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

interface KanbanJsonAssignedToBot {
  assigned: boolean;
  assignedAt: string;
  assignedBy: string;
}

interface KanbanJsonV1 {
  $schema?: string;
  version: string;
  spec: KanbanJsonSpec;
  resumeContext: KanbanJsonResumeContext;
  execution: KanbanJsonExecution;
  stories: KanbanJsonStory[];
  boardStatus: KanbanJsonBoardStatus;
  assignedToBot?: KanbanJsonAssignedToBot;
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
 * Get the story file path from a kanban story entry.
 * Supports both old format (file) and new format (storyFile).
 */
function getStoryFilePath(story: KanbanJsonStory): string | undefined {
  return story.storyFile || story.file;
}

/**
 * Get normalized story type from either flat or classified format.
 */
function getStoryType(story: KanbanJsonStory): string {
  return story.type || story.classification?.type || 'unknown';
}

/**
 * Get normalized story priority from either flat or classified format.
 */
function getStoryPriority(story: KanbanJsonStory): string {
  return story.priority || story.classification?.priority || 'medium';
}

/**
 * Get normalized story effort from either flat or classified format.
 */
function getStoryEffort(story: KanbanJsonStory): number | string {
  return story.effort ?? story.classification?.effort ?? 0;
}

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
    version: '1.1.0',
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
    description: 'Initialize kanban.json from story files. Creates the full KanbanJsonV1 structure with boardStatus, statistics, and initial changeLog. Supports both flat (type/priority/effort) and classified (classification object) story formats.',
    inputSchema: {
      type: 'object',
      properties: {
        specId: { type: 'string', description: 'Spec ID' },
        specName: { type: 'string', description: 'Human-readable spec name' },
        specPrefix: { type: 'string', description: 'Story ID prefix (e.g., "AUTH")' },
        specTier: { type: 'string', enum: ['S', 'M', 'L'], description: 'Spec tier for adaptive doc depth (default: M)' },
        stories: {
          type: 'array',
          description: 'Array of story objects. Supports flat fields (type/priority/effort) or nested classification object.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              file: { type: 'string', description: 'Story file path (alias: storyFile)' },
              storyFile: { type: 'string', description: 'Story file path (alternative to file)' },
              slug: { type: 'string', description: 'URL-safe title slug' },
              type: { type: 'string', description: 'Story type (flat format)' },
              priority: { type: 'string', description: 'Story priority (flat format)' },
              effort: { type: 'number', description: 'Story effort (flat format)' },
              classification: {
                type: 'object',
                description: 'Nested classification (alternative to flat type/priority/effort)',
                properties: {
                  type: { type: 'string' },
                  priority: { type: 'string' },
                  effort: { type: 'string' },
                  complexity: { type: 'string' }
                }
              },
              status: { type: 'string', enum: ['ready', 'blocked'] },
              dorStatus: { type: 'string', description: 'DoR status (ready/incomplete)' },
              dependencies: { type: 'array', items: { type: 'string' } },
              integration: { type: 'array', items: { type: 'string' }, description: 'Integration notes' }
            },
            required: ['id', 'title', 'status', 'dependencies']
          }
        },
        executionPlan: {
          type: 'object',
          description: 'Execution plan with phases',
          properties: {
            strategy: { type: 'string' },
            phases: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  phase: { type: 'number' },
                  name: { type: 'string' },
                  stories: { type: 'array', items: { type: 'string' } },
                  parallel: { type: 'boolean' },
                  note: { type: 'string' }
                },
                required: ['phase', 'name', 'stories']
              }
            }
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
        specId: { type: 'string', description: 'Spec ID' },
        storyId: { type: 'string', description: 'Optional: specific story ID to fetch instead of next ready story' }
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
            content: { type: 'string', description: 'Full markdown content (optional, otherwise generated from template)' },
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
  },
  {
    name: 'backlog_add_comment',
    description: 'Add a bot comment to a backlog item. Creates or appends to comments.json in the item attachments directory. Author is hardcoded to "bot" for security.',
    inputSchema: {
      type: 'object',
      properties: {
        itemId: { type: 'string', description: 'Backlog item ID (e.g., "TODO-001")' },
        text: { type: 'string', description: 'Comment text (Markdown supported)' }
      },
      required: ['itemId', 'text']
    }
  },
  // ============================================================================
  // Memory Tools
  // ============================================================================
  {
    name: 'memory_store',
    description: 'Store a memory entry with upsert logic. Same topic + tag + date = summary replaced, details appended. Requires at least one tag.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Topic title for the memory entry' },
        summary: { type: 'string', description: 'Summary of the knowledge (1-2 sentences)' },
        details: { type: 'string', description: 'Optional detailed information, examples, or code snippets' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorization (at least one required). Auto-creates new tags if needed.'
        },
        project_id: { type: 'string', description: 'Optional project ID for project-specific knowledge. Null = global knowledge.' },
        source: { type: 'string', description: 'Optional source identifier (e.g., "save-memory-skill", "code-review")' },
        importance: { type: 'string', enum: ['tactical', 'operational', 'strategic'], description: 'Importance level (default: operational). tactical=short-lived, operational=medium-term, strategic=long-lived.' }
      },
      required: ['topic', 'summary', 'tags']
    }
  },
  {
    name: 'memory_search',
    description: 'Full-text search across memory entries using FTS5. Returns ranked results matching the query.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'FTS5 search query (supports AND, OR, NOT, phrase matching with quotes)' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tag filter - only return entries with these tags'
        },
        project_id: { type: 'string', description: 'Optional project filter. Also includes global (null project_id) entries.' },
        limit: { type: 'number', description: 'Max results to return (default: 20)' },
        include_archived: { type: 'boolean', description: 'Include archived entries (default: false)' },
        importance: { type: 'string', enum: ['tactical', 'operational', 'strategic'], description: 'Filter by importance level' }
      },
      required: ['query']
    }
  },
  {
    name: 'memory_recall',
    description: 'Recall memory entries by ID, topic, or tag. Returns entries sorted by last update.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Recall a specific entry by ID' },
        topic: { type: 'string', description: 'Filter by topic (partial match with LIKE)' },
        tag: { type: 'string', description: 'Filter by tag name (exact match)' },
        project_id: { type: 'string', description: 'Optional project filter' },
        limit: { type: 'number', description: 'Max results to return (default: 20)' },
        include_archived: { type: 'boolean', description: 'Include archived entries (default: false)' },
        importance: { type: 'string', enum: ['tactical', 'operational', 'strategic'], description: 'Filter by importance level' },
        format: { type: 'string', enum: ['json', 'context'], description: 'Output format. json=structured data (default), context=compact markdown for LLM injection' }
      }
    }
  },
  {
    name: 'memory_list_tags',
    description: 'List all available memory tags with entry counts. Use to discover existing tags before storing or searching.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'memory_update',
    description: 'Update an existing memory entry. Only provided fields are modified. Tags are fully replaced if provided.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID of the memory entry to update' },
        topic: { type: 'string' },
        summary: { type: 'string' },
        details: { type: 'string', description: 'Replaces existing details (not append)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Replaces ALL existing tags' },
        importance: { type: 'string', enum: ['tactical', 'operational', 'strategic'] },
        project_id: { type: 'string' },
        related_to: { type: 'array', items: { type: 'number' }, description: 'Entry IDs to link as related' }
      },
      required: ['id']
    }
  },
  {
    name: 'memory_delete',
    description: 'Archive or permanently delete a memory entry. Default: archive (recoverable). permanent=true for hard delete.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID of the entry to delete/archive' },
        permanent: { type: 'boolean', description: 'true = permanent delete, false/omit = archive (default)' }
      },
      required: ['id']
    }
  },
  {
    name: 'memory_stats',
    description: 'Memory system statistics: counts by importance/tag, most accessed, stale entries. For housekeeping.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'document_preview_open',
    description: 'Open a document in the preview panel. Creates a preview request JSON file in /tmp/ for the UI to pick up.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the document file to preview (relative to project root or absolute)'
        }
      },
      required: ['filePath']
    }
  },
  {
    name: 'document_preview_close',
    description: 'Close the document preview panel. Creates a close request JSON file in /tmp/ for the UI to pick up.',
    inputSchema: {
      type: 'object',
      properties: {}
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
          specTier?: 'S' | 'M' | 'L';
          stories: Array<{
            id: string;
            title: string;
            file?: string;
            storyFile?: string;
            slug?: string;
            type?: string;
            priority?: string;
            effort?: number;
            classification?: { type: string; priority: string; effort: string; complexity?: string };
            status: 'ready' | 'blocked';
            dorStatus?: string;
            dependencies: string[];
            integration?: string[];
          }>;
          executionPlan?: {
            strategy: string;
            phases: Array<{ phase: number; name: string; stories: string[]; parallel?: boolean; note?: string }>;
          };
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
        return await handleKanbanGetNextTask(specPath, (args as { storyId?: string }).storyId);

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

      case 'backlog_add_comment':
        return await handleBacklogAddComment(cwd, args as {
          itemId: string;
          text: string;
        });

      // ====================================================================
      // Memory Tools (no kanban-lock needed, SQLite WAL handles concurrency)
      // ====================================================================

      case 'memory_store': {
        const result = memoryStore(args as {
          topic: string;
          summary: string;
          details?: string | null;
          tags: string[];
          project_id?: string | null;
          source?: string | null;
          importance?: 'tactical' | 'operational' | 'strategic';
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }]
        };
      }

      case 'memory_search': {
        const results = memorySearch(args as {
          query: string;
          tags?: string[];
          project_id?: string | null;
          limit?: number;
          include_archived?: boolean;
          importance?: string;
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(results) }]
        };
      }

      case 'memory_recall': {
        const recallArgs = args as {
          id?: number;
          topic?: string;
          tag?: string;
          project_id?: string | null;
          limit?: number;
          include_archived?: boolean;
          importance?: string;
          format?: 'json' | 'context';
        };
        if (recallArgs.format === 'context') {
          const contextText = memoryContextSummary({
            project_id: recallArgs.project_id ?? undefined,
            tags: recallArgs.tag ? [recallArgs.tag] : undefined,
            limit: recallArgs.limit,
          });
          return {
            content: [{ type: 'text', text: contextText }]
          };
        }
        const results = memoryRecall(recallArgs);
        return {
          content: [{ type: 'text', text: JSON.stringify(results) }]
        };
      }

      case 'memory_list_tags': {
        const tags = memoryListTags();
        return {
          content: [{ type: 'text', text: JSON.stringify(tags) }]
        };
      }

      case 'memory_update': {
        const result = memoryUpdate(args as MemoryUpdateArgs);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }]
        };
      }

      case 'memory_delete': {
        const result = memoryDelete(args as MemoryDeleteArgs);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }]
        };
      }

      case 'memory_stats': {
        const result = memoryStats();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }

      case 'document_preview_open': {
        const { filePath } = args as { filePath: string };
        const projectHash = createHash('md5').update(cwd).digest('hex').slice(0, 8);
        const resolvedPath = filePath.startsWith('/') ? filePath : join(cwd, filePath);

        if (!existsSync(resolvedPath)) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'File not found', filePath: resolvedPath }) }],
            isError: true
          };
        }

        const previewRequest = {
          action: 'open' as const,
          filePath: resolvedPath,
          projectPath: cwd,
          timestamp: new Date().toISOString()
        };

        const previewFile = `/tmp/specwright-preview-${projectHash}.json`;
        await writeFile(previewFile, JSON.stringify(previewRequest, null, 2));

        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, previewFile, filePath: resolvedPath }) }]
        };
      }

      case 'document_preview_close': {
        const projectHash = createHash('md5').update(cwd).digest('hex').slice(0, 8);

        const closeRequest = {
          action: 'close' as const,
          filePath: null,
          projectPath: cwd,
          timestamp: new Date().toISOString()
        };

        const previewFile = `/tmp/specwright-preview-${projectHash}.json`;
        await writeFile(previewFile, JSON.stringify(closeRequest, null, 2));

        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, previewFile }) }]
        };
      }

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
    specTier?: 'S' | 'M' | 'L';
    stories: Array<{
      id: string;
      title: string;
      file?: string;
      storyFile?: string;
      slug?: string;
      type?: string;
      priority?: string;
      effort?: number;
      classification?: { type: string; priority: string; effort: string; complexity?: string };
      status: 'ready' | 'blocked';
      dorStatus?: string;
      dependencies: string[];
      integration?: string[];
    }>;
    executionPlan?: {
      strategy: string;
      phases: Array<{ phase: number; name: string; stories: string[]; parallel?: boolean; note?: string }>;
    };
  }
) {
  return await withKanbanLock(specPath, async () => {
    const now = new Date().toISOString();

    // Convert input stories to KanbanJsonStory format
    // Supports both flat (type/priority/effort) and classified (classification object) formats
    const stories: KanbanJsonStory[] = args.stories.map(s => {
      const storyType = s.type || s.classification?.type || 'unknown';
      const storyPriority = s.priority || s.classification?.priority || 'medium';
      const storyEffort = s.effort ?? s.classification?.effort ?? 0;

      const story: KanbanJsonStory = {
        id: s.id,
        title: s.title,
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
      };

      // Pass through classification or flat fields as provided
      if (s.classification) {
        story.classification = s.classification;
      } else {
        story.type = storyType;
        story.priority = storyPriority;
        story.effort = typeof storyEffort === 'string' ? storyEffort : storyEffort as number;
      }

      // Pass through optional fields
      if (s.storyFile) story.storyFile = s.storyFile;
      else if (s.file) story.file = s.file;
      if (s.slug) story.slug = s.slug;
      if (s.dorStatus) story.dorStatus = s.dorStatus;

      return story;
    });

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

    // Calculate statistics using normalized values
    const effortValues = args.stories.map(s => {
      const e = s.effort ?? s.classification?.effort ?? 0;
      return typeof e === 'number' ? e : 0;
    });
    const totalEffort = effortValues.reduce((sum, e) => sum + e, 0);
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const s of args.stories) {
      const t = s.type || s.classification?.type || 'unknown';
      const p = s.priority || s.classification?.priority || 'medium';
      byType[t] = (byType[t] || 0) + 1;
      byPriority[p] = (byPriority[p] || 0) + 1;
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
        createdAt: now,
        specTier: args.specTier || 'M'
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
        model: 'claude-opus-4-6'
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
      executionPlan: args.executionPlan ? {
        strategy: args.executionPlan.strategy,
        phases: args.executionPlan.phases.map(p => ({
          phase: p.phase,
          name: p.name,
          stories: p.stories,
          description: p.note || '',
          ...(p.parallel !== undefined ? { parallel: p.parallel } : {}),
          ...(p.note ? { note: p.note } : {})
        }))
      } : {
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

async function handleKanbanGetNextTask(specPath: string, storyId?: string) {
  // Read kanban to find next story
  const kanban = await readKanbanJson(specPath);

  // Find story: specific by ID or next ready
  let nextStory;
  if (storyId) {
    nextStory = kanban.stories.find(s => s.id === storyId);
    if (nextStory && nextStory.status !== 'ready' && nextStory.status !== 'in_progress') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            message: `Story ${storyId} has status '${nextStory.status}' - cannot execute (must be 'ready' or 'in_progress')`
          }, null, 2)
        }]
      };
    }
    if (!nextStory) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            message: `Story ${storyId} not found in kanban.json`
          }, null, 2)
        }]
      };
    }
  } else {
    nextStory = kanban.stories.find(s => s.status === 'ready');
  }

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
  const storyFile = getStoryFilePath(nextStory);
  if (!storyFile) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          message: `Story ${nextStory.id} has no file/storyFile field in kanban.json`
        }, null, 2)
      }]
    };
  }
  const storyFilePath = join(specPath, storyFile);
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

  // Look up phase number for the current story
  let storyPhaseNumber: number | null = null;
  if (kanban.executionPlan?.phases) {
    const matchingPhase = kanban.executionPlan.phases.find(
      p => p.stories.includes(nextStory.id)
    );
    if (matchingPhase) {
      storyPhaseNumber = matchingPhase.phase;
    }
  }

  // Parse implementation-plan.md for spec context
  const specContext = await parseImplementationPlan(specPath, storyPhaseNumber);

  // Build response with all context
  const response = {
    success: true,
    story: {
      id: nextStory.id,
      title: nextStory.title,
      type: getStoryType(nextStory),
      priority: getStoryPriority(nextStory),
      effort: getStoryEffort(nextStory),
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
    specContext,
    resumeInfo: {
      currentPhase: kanban.resumeContext.currentPhase,
      gitStrategy: kanban.resumeContext.gitStrategy,
      gitBranch: kanban.resumeContext.gitBranch,
      worktreePath: kanban.resumeContext.worktreePath,
      progressIndex: kanban.resumeContext.progressIndex,
      totalStories: kanban.resumeContext.totalStories,
      specTier: kanban.spec.specTier || 'M'
    },
    boardSummary: {
      total: kanban.boardStatus.total,
      ready: kanban.boardStatus.ready,
      inProgress: kanban.boardStatus.inProgress,
      done: kanban.boardStatus.done,
      blocked: kanban.boardStatus.blocked
    }
  };

  // Save debug info for auto-mode debugging (fire-and-forget)
  try {
    const debugFilePath = join(specPath, 'auto-mode-debug.json');
    let debugData: { specId: string; sessions: Array<Record<string, unknown>> } = {
      specId: kanban.spec?.id || specPath.split('/').pop() || 'unknown',
      sessions: []
    };
    try {
      if (existsSync(debugFilePath)) {
        debugData = JSON.parse(await readFile(debugFilePath, 'utf-8'));
      }
    } catch { /* ignore parse errors */ }

    debugData.sessions.push({
      storyId: nextStory.id,
      timestamp: new Date().toISOString(),
      model: nextStory.model || 'default',
      mcpResponse: response
    });

    await writeFile(debugFilePath, JSON.stringify(debugData, null, 2), 'utf-8');
    console.log(`[GetNextTask] Debug info saved to ${debugFilePath}`);
  } catch (debugErr) {
    console.warn('[GetNextTask] Failed to save debug info:', debugErr);
  }

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(response, null, 2)
    }]
  };
}

async function parseImplementationPlan(
  specPath: string,
  phaseNumber: number | null
): Promise<{ executiveSummary: string; componentConnections: string; currentPhase: string | null } | null> {
  try {
    const planPath = join(specPath, 'implementation-plan.md');
    const planContent = await readFile(planPath, 'utf-8');

    // Extract Executive Summary
    const summaryMatch = planContent.match(/## Executive Summary\n+([\s\S]*?)(?=\n## )/);
    const executiveSummary = summaryMatch ? summaryMatch[1].trim() : '';

    // Extract Component Connections (DE/EN, optional suffix like "(KRITISCH)")
    const connectionsMatch = planContent.match(
      /## (?:Komponenten-Verbindungen|Component Connections)(?:\s*\([^)]*\))?\n+([\s\S]*?)(?=\n## )/
    );
    const componentConnections = connectionsMatch ? connectionsMatch[1].trim() : '';

    // Extract current phase (only if phaseNumber is known)
    let currentPhase: string | null = null;
    if (phaseNumber !== null) {
      const phaseRegex = new RegExp(
        `### Phase ${phaseNumber}:[^\\n]*\\n+([\\s\\S]*?)(?=\\n### Phase \\d|\\n## |$)`
      );
      const phaseMatch = planContent.match(phaseRegex);
      currentPhase = phaseMatch ? phaseMatch[0].trim() : null;
    }

    return { executiveSummary, componentConnections, currentPhase };
  } catch {
    console.log('[GetNextTask] No implementation-plan.md found (this is OK)');
    return null;
  }
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
        const filePath = getStoryFilePath(s) || '';
        const match = filePath.match(/story-(\d+)/);
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

  const content = data.content || generateTodoTemplate(data, itemId);
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
// Backlog Add Comment
// ============================================================================

async function handleBacklogAddComment(
  projectPath: string,
  args: {
    itemId: string;
    text: string;
  }
) {
  // Validate inputs
  if (!projectPath || typeof projectPath !== 'string') {
    throw new Error(`Invalid project path: ${projectPath}`);
  }
  if (!args.itemId || typeof args.itemId !== 'string') {
    throw new Error('itemId is required');
  }
  if (!args.text || typeof args.text !== 'string') {
    throw new Error('text is required');
  }

  // Sanitize itemId (prevent path traversal) - same as comment.handler.ts
  const itemId = args.itemId;
  if (
    itemId.includes('..') ||
    itemId.includes('/') ||
    itemId.includes('\\') ||
    itemId.includes('\0')
  ) {
    throw new Error(`Invalid itemId: contains forbidden characters`);
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

  const commentsDir = join(backlogDir, 'items', 'attachments', itemId);

  return await withKanbanLock(commentsDir, async () => {
    // Ensure attachments directory exists
    await mkdir(commentsDir, { recursive: true });

    const commentsPath = join(commentsDir, 'comments.json');

    // Read existing comments or start fresh
    let comments: Array<{
      id: string;
      author: string;
      text: string;
      createdAt: string;
    }> = [];

    try {
      const content = await readFile(commentsPath, 'utf-8');
      comments = JSON.parse(content);
    } catch {
      // File doesn't exist yet - start with empty array
    }

    // Create new comment with hardcoded bot author
    const comment = {
      id: `cmt-${Date.now()}`,
      author: 'bot',
      text: args.text,
      createdAt: new Date().toISOString()
    };

    comments.push(comment);
    await writeFile(commentsPath, JSON.stringify(comments, null, 2), 'utf-8');

    console.error(`[BacklogAddComment] Added bot comment to ${itemId}: ${comments.length} total`);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          comment,
          count: comments.length
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
