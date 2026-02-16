import { WebSocket } from 'ws';
import { readdir, readFile, writeFile, mkdir, rm, symlink } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { existsSync } from 'fs';
import { spawn, ChildProcess, execSync } from 'child_process';
import { webSocketManager, type WebSocketMessage } from './websocket-manager.service.js';
import { TerminalManager } from './services/terminal-manager.js';
import { SpecsReader, KanbanJsonCorruptedError, type ModelSelection } from './specs-reader.js';
import { withKanbanLock } from './utils/kanban-lock.js';
import { getCliCommandForModel } from './model-config.js';
import { queueHandler } from './handlers/queue.handler.js';
import { resolveCommandDir, projectDir } from './utils/project-dirs.js';
import { gitService } from './services/git.service.js';

export interface WorkflowCommand {
  id: string;
  name: string;
  description: string;
  filePath: string;
}

export interface WorkflowQuestion {
  id: string;
  questions: Array<{
    question: string;
    header: string;
    options: Array<{ label: string; description?: string }>;
    multiSelect: boolean;
  }>;
  timeout?: NodeJS.Timeout;
}

export type GitStrategy = 'branch' | 'worktree' | 'current-branch';

export interface WorkflowExecution {
  id: string;
  commandId: string;
  commandName: string;
  projectPath: string;
  argument?: string;  // Optional argument passed to the command
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'waiting_for_answer' | 'error_retry_available';
  startTime: string;
  endTime?: string;
  output: string[];
  error?: string;
  abortController: AbortController;
  claudeProcess?: ChildProcess;
  pendingQuestion?: WorkflowQuestion;  // Legacy: single question (kept for backwards compatibility)
  pendingQuestions: WorkflowQuestion[];  // Multi-Question Protocol: array to collect multiple questions
  lastQuestionId?: string;  // Store tool_use_id for sending tool_result on resume
  claudeSessionId?: string;  // Actual session ID from Claude CLI
  client?: WebSocketClient;
  lastCommand?: WorkflowCommand;
  isResuming?: boolean;  // True when resuming after answering a question
  lastAnsweredQuestionId?: string;  // Track the last answered question to prevent duplicates
  questionBatchId?: string;  // MQP-002: ID for the current batch of questions
  gitStrategy?: GitStrategy;  // KSE-005: Git strategy for this execution
  workingDirectory?: string;  // KSE-005: Working directory (worktree path or project path)
  worktreePath?: string;  // KSE-005: Worktree path if using worktree strategy
  storyId?: string;  // Story ID for auto-move to done on completion
  specId?: string;  // Spec ID for auto-move to done on completion
  model?: ModelSelection;  // Model for this execution
  autoMode?: boolean;  // Whether auto-mode was enabled when this execution started
  branchName?: string;  // BPS-002: Branch name for backlog story execution (for post-execution PR)
}

interface WebSocketClient extends WebSocket {
  clientId: string;
}

// Timeout for unanswered questions (30 minutes - workflows can take time)
const QUESTION_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * MQP-003: Helper function to detect if text looks like question content.
 * Used to suppress duplicate text messages when questions are being collected.
 * @param text - The text content to analyze
 * @returns true if the text appears to contain question-like content
 */
function looksLikeQuestionText(text: string): boolean {
  // Patterns that indicate the text is presenting questions to the user
  const questionPatterns = [
    // German question patterns
    /ich.*stelle.*fragen/i,              // "Ich stelle dir einige Fragen"
    /fragen.*zur.*klärung/i,             // "Fragen zur Klärung"
    /anforderungsklärung/i,              // "Anforderungsklärung"
    /bitte.*beantworte/i,                // "Bitte beantworte"
    /antworte.*mit.*buchstaben/i,        // "antworte mit Buchstaben"

    // Numbered/bulleted lists with question marks
    /^\s*\d+\.\s+.*\?/m,                 // "1. Wie sollen..." numbered questions
    /^\s*-\s+.*\?/m,                     // "- Was ist..." bulleted questions
    /^\*\*\d+\./m,                       // "**1." markdown numbered questions

    // Option format patterns
    /a\)\s+.*\nb\)\s+/i,                 // "A) ... B) ..." option format
    /\(a\)\s+.*\n\(b\)\s+/i,             // "(A) ... (B) ..." option format

    // Multiple questions in text
    /\?\s*\n.*\?/m,                      // Multiple question marks with newlines

    // English patterns (for completeness)
    /i.*have.*questions/i,               // "I have some questions"
    /please.*answer/i,                   // "Please answer"
  ];

  return questionPatterns.some(pattern => pattern.test(text));
}

/**
 * Spawns a process using the user's login shell to ensure OAuth credentials
 * and shell profile configurations are available (needed for Claude Max).
 */
function spawnWithLoginShell(
  command: string,
  args: string[],
  options: Parameters<typeof spawn>[2]
): ChildProcess {
  const userShell = process.env.SHELL || '/bin/zsh';

  // Build the full command string with proper escaping
  const fullCommand = [command, ...args]
    .map(arg => {
      // Escape single quotes and wrap in single quotes for shell safety
      if (arg.includes("'") || arg.includes(' ') || arg.includes('"') || arg.includes('$') || arg.includes('\\')) {
        return `'${arg.replace(/'/g, "'\\''")}'`;
      }
      return arg;
    })
    .join(' ');

  console.log(`[Workflow] Spawning via login shell: ${userShell} -l -c "${fullCommand.substring(0, 100)}..."`);

  return spawn(userShell, ['-l', '-c', fullCommand], options);
}

export class WorkflowExecutor {
  private executions: Map<string, WorkflowExecution> = new Map();
  private commandsCache: Map<string, WorkflowCommand[]> = new Map();
  private terminalManager: TerminalManager;
  private autoContinueHistory: Map<string, { lastStoryId: string; count: number }> = new Map();

  constructor() {
    this.terminalManager = new TerminalManager();

    // Set up terminal event listeners
    this.terminalManager.on('terminal.data', (executionId: string, data: string) => {
      const execution = this.executions.get(executionId);
      if (execution?.client) {
        this.sendToClient(execution.client, {
          type: 'terminal.data',
          executionId,
          data,
          timestamp: new Date().toISOString()
        });
      }
    });

    this.terminalManager.on('terminal.exit', async (executionId: string, exitCode: number) => {
      const execution = this.executions.get(executionId);
      if (!execution) return;

      // Update execution status
      execution.status = exitCode === 0 ? 'completed' : 'failed';
      execution.endTime = new Date().toISOString();

      if (execution.client) {
        console.log(`[Workflow] Terminal exit for ${execution.storyId}: exitCode=${exitCode}, sending completion events`);

        // BPS-002: Post-Execution Git Operations for Backlog executions
        // This runs BEFORE handleStoryCompletionAndContinue to ensure PR is created
        // Backlog executions are identified by: argument starts with "backlog " AND branchName is set
        if (execution.argument?.startsWith('backlog ') && execution.branchName) {
          console.log(`[Workflow] BPS-002: Backlog execution detected, running post-execution Git operations`);
          await this.handleBacklogPostExecution(execution);
        }

        this.sendToClient(execution.client, {
          type: 'terminal.exit',
          executionId,
          exitCode,
          timestamp: new Date().toISOString()
        });

        // MPRO-005: Also send completion event for the UI state
        console.log(`[Workflow] Sending workflow.interactive.complete for ${execution.storyId} (spec: ${execution.specId})`);
        this.sendToClient(execution.client, {
          type: 'workflow.interactive.complete',
          executionId: execution.id,
          status: execution.status,
          output: execution.output.join('\n'),
          storyId: execution.storyId,
          specId: execution.specId,
          timestamp: new Date().toISOString()
        }, execution.projectPath);

        // Auto-continuation: Check for next story or spec if this story completed successfully
        if (execution.status === 'completed' && execution.specId && execution.storyId) {
          console.log(`[Workflow] Terminal exit: Story ${execution.storyId} completed, triggering auto-continue`);
          await this.handleStoryCompletionAndContinue(execution.client, execution);
        }
      }
    });
  }

  public async listCommands(projectPath: string): Promise<WorkflowCommand[]> {
    // Check cache first
    const cached = this.commandsCache.get(projectPath);
    if (cached) {
      return cached;
    }

    const commands: WorkflowCommand[] = [];
    const cmdDirName = resolveCommandDir(projectPath);
    const commandsDir = join(projectPath, '.claude', 'commands', cmdDirName);

    if (!existsSync(commandsDir)) {
      return commands;
    }

    try {
      const files = await readdir(commandsDir);

      for (const file of files) {
        if (!file.endsWith('.md')) continue;

        const filePath = join(commandsDir, file);
        const content = await readFile(filePath, 'utf-8');

        // Extract name from filename (remove .md extension)
        const baseName = file.replace('.md', '');
        // Commands in specwright/agent-os folder need the prefix
        const name = `${cmdDirName}:${baseName}`;

        // Extract description from first line after frontmatter or first # heading
        const description = this.extractDescription(content);

        commands.push({
          id: name,
          name: `/${name}`,
          description,
          filePath
        });
      }

      // Sort alphabetically
      commands.sort((a, b) => a.name.localeCompare(b.name));

      // Cache the result
      this.commandsCache.set(projectPath, commands);

      return commands;
    } catch (error) {
      console.error('Failed to list commands:', error);
      return [];
    }
  }

  private extractDescription(content: string): string {
    // Remove YAML frontmatter if present
    let text = content;
    if (text.startsWith('---')) {
      const endIndex = text.indexOf('---', 3);
      if (endIndex !== -1) {
        text = text.slice(endIndex + 3).trim();
      }
    }

    // Find first paragraph or heading
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and headings
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Return first non-empty, non-heading line as description
      return trimmed.slice(0, 100) + (trimmed.length > 100 ? '...' : '');
    }

    return 'No description available';
  }

  public async startExecution(
    client: WebSocketClient,
    commandId: string,
    projectPath: string,
    params?: Record<string, unknown>
  ): Promise<string> {
    const commands = await this.listCommands(projectPath);
    const command = commands.find(c => c.id === commandId);

    if (!command) {
      throw new Error(`Command not found: ${commandId}`);
    }

    const executionId = crypto.randomUUID();
    const abortController = new AbortController();
    const argument = params?.argument as string | undefined;
    const model = (params?.model as ModelSelection) || 'opus';  // LLM-001: Extract model with default

    const execution: WorkflowExecution = {
      id: executionId,
      commandId,
      commandName: command.name,
      projectPath,
      argument,  // Store the optional argument
      status: 'running',
      startTime: new Date().toISOString(),
      output: [],
      abortController,
      pendingQuestions: [],  // Initialize empty array for Multi-Question Protocol
      model  // LLM-001: Store model for this execution
    };

    // Store client reference for question events
    execution.client = client;
    this.executions.set(executionId, execution);

    // Start execution in background
    this.runExecution(client, execution, command);

    return executionId;
  }

  /**
   * BKE-001: Start a backlog story execution with single-story mode.
   * Uses the new v4.1 single-story execution feature of the backlog workflow.
   * BPS-002: Added Pre-Execution Git Operations (create branch before story execution).
   * @param client - WebSocket client
   * @param projectPath - Path to the project
   * @param storyId - Story ID to execute
   * @param model - Model selection for execution
   * @returns Execution ID
   */
  async startBacklogStoryExecution(
    client: WebSocketClient,
    projectPath: string,
    storyId: string,
    model: ModelSelection = 'opus'
  ): Promise<string> {
    console.log(`[Workflow] startBacklogStoryExecution called: ${storyId}, model: ${model}`);

    const executionId = crypto.randomUUID();
    const abortController = new AbortController();

    // Create execute-tasks command
    const cmdDir = resolveCommandDir(projectPath);
    const command: WorkflowCommand = {
      id: `${cmdDir}:execute-tasks`,
      name: `/${cmdDir}:execute-tasks`,
      description: 'Execute backlog story',
      filePath: join(projectPath, '.claude', 'commands', cmdDir, 'execute-tasks.md')
    };

    // BKE-001: Argument format "backlog story-id" for single-story mode
    const argument = `backlog ${storyId}`;

    // BPS-002: Pre-Execution Git Operations
    // Generate branch name from story ID (format: feature/story-slug)
    const branchName = `feature/${storyId.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;

    try {
      // 1. Check if working directory is clean
      const isClean = await gitService.isWorkingDirectoryClean(projectPath);
      if (!isClean) {
        console.log(`[Workflow] Working directory not clean, stashing changes...`);
        // Stash any uncommitted changes (using execSync for stash since gitService doesn't have it)
        execSync('git stash', { cwd: projectPath, stdio: 'pipe' });
      }

      // 2. Ensure we're on main branch before creating feature branch
      await gitService.checkoutMain(projectPath);
      console.log(`[Workflow] Checked out main branch`);

      // 3. Create feature branch from main
      const branchResult = await gitService.createBranch(projectPath, branchName, 'main');
      console.log(`[Workflow] Branch created/checked out: ${branchName} (created: ${branchResult.created})`);
    } catch (error) {
      // Log error but continue - don't fail the entire execution
      console.warn(`[Workflow] Pre-execution git operations failed (continuing anyway):`, error instanceof Error ? error.message : error);
    }

    const execution: WorkflowExecution = {
      id: executionId,
      commandId: `${cmdDir}:execute-tasks`,
      commandName: command.name,
      projectPath,
      argument,
      status: 'running',
      startTime: new Date().toISOString(),
      output: [],
      abortController,
      pendingQuestions: [],
      storyId,  // Store for tracking
      model,    // Store model for this execution
      branchName // BPS-002: Store branch name for post-execution PR
    };

    // Store client reference for question events
    execution.client = client;
    this.executions.set(executionId, execution);

    // Start execution in background
    this.runExecution(client, execution, command);

    return executionId;
  }

  /**
   * KSE-005: Start a story execution with git strategy support.
   * Handles branch/worktree creation before starting the workflow.
   * Updates kanban board with git strategy info so Claude doesn't ask again.
   * MSK-003-FIX: Added model parameter to preserve model selection when moving from Backlog.
   */
  public async startStoryExecution(
    client: WebSocketClient,
    specId: string,
    storyId: string,
    projectPath: string,
    gitStrategy: GitStrategy = 'branch',
    model: ModelSelection = 'opus',  // MSK-003-FIX: Accept model from caller
    autoMode: boolean = false  // Whether auto-mode is enabled (controls auto-continue behavior)
  ): Promise<string> {
    console.log('[Workflow] startStoryExecution called:', { specId, storyId, projectPath, gitStrategy, model, autoMode });
    const executionId = crypto.randomUUID();
    const abortController = new AbortController();

    // Extract feature name from specId (remove date prefix)
    const featureName = specId.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    const projectDirName = basename(projectPath);

    // Check if a worktree already exists for this spec (overrides frontend gitStrategy)
    const worktreeBase = join(dirname(projectPath), `${projectDirName}-worktrees`);
    const existingWorktreePath = join(worktreeBase, featureName);

    if (existsSync(existingWorktreePath)) {
      console.log(`[Workflow] Existing worktree found at ${existingWorktreePath}, using worktree strategy`);
      gitStrategy = 'worktree';
    }

    // Determine working directory based on git strategy
    let workingDirectory = projectPath;
    let worktreePath: string | undefined;
    let branchName: string;

    if (gitStrategy === 'worktree') {
      // Create worktree OUTSIDE project directory (per spec-phase-2.md v3.3)
      const worktreeBase = join(dirname(projectPath), `${projectDirName}-worktrees`);
      worktreePath = join(worktreeBase, featureName);
      workingDirectory = worktreePath;
      branchName = `feature/${featureName}`;

      try {
        // Create worktree base directory if it doesn't exist
        if (!existsSync(worktreeBase)) {
          await mkdir(worktreeBase, { recursive: true });
        }

        // Check if worktree already exists
        if (!existsSync(worktreePath)) {
          // KAE-005: Auto-commit uncommitted changes ONLY before creating NEW worktree
          // This ensures the spec and all current work is included in the worktree
          try {
            const status = execSync('git status --porcelain', {
              cwd: projectPath,
              encoding: 'utf-8',
              stdio: ['pipe', 'pipe', 'pipe']
            });
            if (status.trim()) {
              console.log('[Workflow] Uncommitted changes detected, auto-committing before worktree creation...');
              execSync('git add -A', { cwd: projectPath, stdio: 'pipe' });
              const commitMessage = `chore: auto-commit before worktree for ${specId}`;
              execSync(`git commit -m "${commitMessage}"`, { cwd: projectPath, stdio: 'pipe' });
              console.log('[Workflow] Auto-commit successful');
            } else {
              console.log('[Workflow] No uncommitted changes, proceeding with worktree creation');
            }
          } catch (commitError) {
            // Log but don't fail - the worktree creation might still work
            console.log('[Workflow] Auto-commit skipped or failed:', commitError instanceof Error ? commitError.message : commitError);
          }
          // Check if branch already exists
          let branchExists = false;
          try {
            execSync(`git rev-parse --verify ${branchName}`, { cwd: projectPath, stdio: 'pipe' });
            branchExists = true;
          } catch {
            branchExists = false;
          }

          // Create worktree with or without -b flag based on branch existence
          const worktreeArgs = branchExists
            ? ['worktree', 'add', worktreePath, branchName]
            : ['worktree', 'add', worktreePath, '-b', branchName];

          console.log(`[Workflow] Creating worktree: git ${worktreeArgs.join(' ')}`);

          const worktreeResult = spawn('git', worktreeArgs, {
            cwd: projectPath,
            stdio: 'pipe'
          });

          let stderr = '';
          worktreeResult.stderr?.on('data', (data) => {
            stderr += data.toString();
          });

          await new Promise<void>((resolve, reject) => {
            worktreeResult.on('close', (code) => {
              if (code === 0) {
                resolve();
              } else {
                reject(new Error(`Failed to create worktree: exit code ${code}, stderr: ${stderr}`));
              }
            });
            worktreeResult.on('error', reject);
          });

          console.log(`[Workflow] Created worktree at ${worktreePath}`);

          // Create symlink for spec folder so Claude writes to main project
          // This ensures the UI sees all kanban updates immediately
          await this.createSpecSymlink(projectPath, worktreePath, specId);
        } else {
          console.log(`[Workflow] Worktree already exists at ${worktreePath}`);

          // Ensure symlink exists even for existing worktrees
          await this.createSpecSymlink(projectPath, worktreePath, specId);
        }

        // Update kanban board with git strategy info
        await this.updateKanbanGitStrategy(projectPath, specId, gitStrategy, branchName, worktreePath);

      } catch (error) {
        console.error('[Workflow] Failed to create worktree:', error);
        // Fall back to branch strategy
        gitStrategy = 'branch';
        workingDirectory = projectPath;
        worktreePath = undefined;
      }
    }

    // Handle current-branch strategy - work directly in current branch
    if (gitStrategy === 'current-branch') {
      try {
        branchName = execSync('git branch --show-current', { cwd: projectPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
        console.log(`[Workflow] Using current branch: ${branchName}`);
        await this.updateKanbanGitStrategy(projectPath, specId, gitStrategy, branchName, undefined);
      } catch (error) {
        console.error('[Workflow] Failed to detect current branch:', error);
        branchName = 'unknown';
      }
    }

    // Handle branch strategy (or fallback from failed worktree)
    if (gitStrategy === 'branch') {
      branchName = `feature/${featureName}`;

      try {
        // Check if branch exists
        let branchExists = false;
        try {
          execSync(`git rev-parse --verify ${branchName}`, { cwd: projectPath, stdio: 'pipe' });
          branchExists = true;
        } catch {
          branchExists = false;
        }

        if (branchExists) {
          // Checkout existing branch
          console.log(`[Workflow] Checking out existing branch: ${branchName}`);
          execSync(`git checkout ${branchName}`, { cwd: projectPath, stdio: 'pipe' });
        } else {
          // Create new branch
          console.log(`[Workflow] Creating new branch: ${branchName}`);
          execSync(`git checkout -b ${branchName}`, { cwd: projectPath, stdio: 'pipe' });
        }

        // Update kanban board with git strategy info
        await this.updateKanbanGitStrategy(projectPath, specId, gitStrategy, branchName, undefined);

      } catch (error) {
        console.error('[Workflow] Failed to create/checkout branch:', error);
        // Continue anyway - we're already on some branch
      }
    }

    // MSK-003-FIX: Model is now passed as parameter (read before status update)
    console.log(`[Workflow] Using model from parameter: ${model}`);

    // Create execute-tasks command
    const cmdDir2 = resolveCommandDir(projectPath);
    const command: WorkflowCommand = {
      id: `${cmdDir2}:execute-tasks`,
      name: `/${cmdDir2}:execute-tasks`,
      description: 'Execute story tasks',
      filePath: join(projectPath, '.claude', 'commands', cmdDir2, 'execute-tasks.md')
    };

    const execution: WorkflowExecution = {
      id: executionId,
      commandId: `${cmdDir2}:execute-tasks`,
      commandName: command.name,
      projectPath,
      argument: `${specId} ${storyId}`,
      status: 'running',
      startTime: new Date().toISOString(),
      output: [],
      abortController,
      pendingQuestions: [],
      gitStrategy,
      workingDirectory,
      worktreePath,
      storyId,  // Store for auto-move to done on completion
      specId,   // Store for auto-move to done on completion
      model,    // Store model for this execution
      autoMode  // Store auto-mode flag to control auto-continuation
    };

    // Store client reference for question events
    execution.client = client;
    this.executions.set(executionId, execution);

    // Start execution in background with the correct working directory
    this.runExecution(client, execution, command);

    return executionId;
  }

  private async runExecution(
    client: WebSocketClient,
    execution: WorkflowExecution,
    command: WorkflowCommand
  ): Promise<void> {
    const { abortController } = execution;

    // Store command for potential retry
    execution.lastCommand = command;

    try {
      // MPRO-005: Include projectId in workflow started message
      this.sendToClient(client, {
        type: 'workflow.started',
        executionId: execution.id,
        commandName: command.name,
        timestamp: new Date().toISOString()
      }, execution.projectPath);

      // BKE-001 / KSE-005: Use direct spawn (runClaudeCommand) for story execution
      // This is more reliable for automation than PTY/xterm
      if (command.id.endsWith(':execute-tasks')) {
        console.log(`[Workflow] Using direct spawn for story execution: ${execution.storyId}`);
        return this.runClaudeCommand(client, execution, command, abortController);
      }

      // For other commands (like initial spec creation), we can use the fancy terminal
      // Spawn terminal for this execution
      const workingDir = execution.workingDirectory || execution.projectPath;
      this.spawnTerminal(execution.id, workingDir);

      // Build the full command to execute in terminal
      let fullCommand = execution.argument
        ? `${command.name} ${execution.argument}`
        : command.name;

      // Append important workflow instruction at the end
      fullCommand += ' VERY IMPORTANT: BEFOLGE DIE ANWEISUNGEN IM WORKFLOW EXAKT! NUTZE TEMPLATES 1:1 UND NIMM NIEMALS IRGENDWELCHE ABKÜRZUNGEN!';

      // Escape single quotes for shell safety
      const escapedCommand = fullCommand.replace(/'/g, "'\\''");

      // LLM-001: Use model-aware CLI command
      const cliConfig = getCliCommandForModel(execution.model || 'opus');
      const claudeCommand = `${cliConfig.command} ${cliConfig.args.join(' ')} '${escapedCommand}' && exit\n`;

      console.log(`[Workflow] Writing command to terminal: ${claudeCommand.trim()}`);
      this.terminalManager.write(execution.id, claudeCommand);

      // Notify frontend that terminal is ready
      this.sendToClient(client, {
        type: 'terminal.spawned',
        executionId: execution.id,
        terminalSessionId: execution.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      const isCancelled = abortController.signal.aborted;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';

      console.log(`[Workflow] ✗ Story execution FAILED: specId=${execution.specId}, storyId=${execution.storyId}`);
      console.log(`[Workflow] Error: ${errorMessage}`);
      if (errorStack) {
        console.log(`[Workflow] Stack: ${errorStack.substring(0, 500)}`);
      }

      // Determine if error is retryable
      const isRetryable = !isCancelled && !errorMessage.includes('not available in PATH');

      execution.status = isCancelled ? 'cancelled' : (isRetryable ? 'error_retry_available' : 'failed');
      execution.endTime = new Date().toISOString();
      execution.error = errorMessage;

      // MPRO-005: Send error event with projectId for inline display
      if (isRetryable) {
        this.sendToClient(client, {
          type: 'workflow.interactive.error',
          executionId: execution.id,
          error: execution.error,
          canRetry: true,
          timestamp: new Date().toISOString()
        }, execution.projectPath);
      } else {
        this.sendToClient(client, {
          type: 'workflow.interactive.complete',
          executionId: execution.id,
          status: execution.status,
          error: execution.error,
          output: execution.output.join('\n'),
          storyId: execution.storyId,
          specId: execution.specId,
          timestamp: new Date().toISOString()
        }, execution.projectPath);
      }
    }
  }

  /**
   * BPS-002: Handle post-execution Git operations for backlog stories.
   * Called after a backlog story completes (success or failure).
   * - On success: Push branch, create PR, checkout main
   * - On failure: Checkout main (branch stays for manual recovery)
   */
  private async handleBacklogPostExecution(
    execution: WorkflowExecution
  ): Promise<void> {
    const { projectPath, branchName, storyId, status } = execution;

    if (!branchName) {
      console.log('[Workflow] No branchName set, skipping backlog post-execution');
      return;
    }

    console.log(`[Workflow] BPS-002: Backlog post-execution for story ${storyId}, branch: ${branchName}, status: ${status}`);

    try {
      if (status === 'completed') {
        // Success path: Push branch, create PR, checkout main
        console.log(`[Workflow] Story ${storyId} completed successfully, creating PR...`);

        // 1. Push branch to remote
        try {
          const pushResult = await gitService.pushBranch(projectPath, branchName);
          console.log(`[Workflow] Branch pushed: ${branchName}, commits: ${pushResult.commitsPushed}`);
        } catch (pushError) {
          console.warn(`[Workflow] Push failed (continuing anyway):`, pushError instanceof Error ? pushError.message : pushError);
        }

        // 2. Create Pull Request
        try {
          const prTitle = `feat: ${storyId}`;
          const prResult = await gitService.createPullRequest(projectPath, branchName, prTitle);
          if (prResult.success) {
            if (prResult.prUrl) {
              console.log(`[Workflow] PR created: ${prResult.prUrl}`);
            } else if (prResult.warning) {
              console.warn(`[Workflow] PR creation warning: ${prResult.warning}`);
            }
          }
        } catch (prError) {
          console.warn(`[Workflow] PR creation failed (continuing anyway):`, prError instanceof Error ? prError.message : prError);
        }
      } else {
        // Failure path: Just log that branch stays
        console.log(`[Workflow] Story ${storyId} failed, branch ${branchName} stays for manual recovery`);
      }

      // 3. Always checkout main at the end (success or failure)
      try {
        await gitService.checkoutMain(projectPath);
        console.log(`[Workflow] Checked out main branch`);
      } catch (checkoutError) {
        console.warn(`[Workflow] Checkout main failed:`, checkoutError instanceof Error ? checkoutError.message : checkoutError);
      }

    } catch (error) {
      console.error('[Workflow] Backlog post-execution error:', error instanceof Error ? error.message : error);
      // Don't throw - we still want the workflow to complete normally
    }
  }

  /**
   * Handle story completion and automatically continue to next story or spec.
   * Only auto-continues when auto-mode was enabled or queue is running.
   */
  private async handleStoryCompletionAndContinue(
    client: WebSocketClient,
    execution: WorkflowExecution
  ): Promise<void> {
    const { specId, storyId, projectPath, gitStrategy, model, autoMode } = execution;

    if (!specId || !storyId || !projectPath) {
      console.log('[Workflow] Cannot auto-continue: missing specId, storyId, or projectPath');
      return;
    }

    // Check if this spec is part of the queue (global queue)
    const queueState = queueHandler.getState();
    const isQueueRunning = queueState.isQueueRunning;
    const queueItem = queueHandler.getItemBySpecId(projectPath, specId);

    // Only auto-continue if auto-mode was enabled or queue is running
    if (!autoMode && !isQueueRunning) {
      console.log(`[Workflow] Skipping auto-continue for spec ${specId}: auto-mode is off and no queue running`);
      return;
    }

    console.log(`[Workflow] Auto-continuation check for spec ${specId}. Queue running: ${isQueueRunning}, autoMode: ${autoMode}`);

    try {
      // Read the kanban to check for remaining stories
      const specsReader = new SpecsReader();
      const kanban = await specsReader.getKanbanBoard(projectPath, specId);

      // PRIMARY DEFENSE: Check if spec metadata indicates completion
      const specComplete =
        kanban.currentPhase === 'complete' ||
        kanban.executionStatus === 'completed' ||
        (kanban.stories.length > 0 && kanban.stories.every(s => s.status === 'done'));

      if (specComplete) {
        console.log(`[Workflow] Spec ${specId} is already complete (phase: ${kanban.currentPhase}, execution: ${kanban.executionStatus}, all done: ${kanban.stories.every(s => s.status === 'done')}). Stopping auto-continue.`);
        this.autoContinueHistory.delete(specId);

        // Handle queue progression if needed
        if (isQueueRunning && queueItem) {
          const nextQueueItem = queueHandler.handleSpecComplete(projectPath, specId, true);
          if (nextQueueItem) {
            console.log(`[Workflow] Spec complete, moving to next queue item: ${nextQueueItem.specId}`);
            this.sendToClient(client, {
              type: 'workflow.spec-complete',
              specId,
              nextSpecId: nextQueueItem.specId,
              message: `Spec ${specId} abgeschlossen. Weiter mit ${nextQueueItem.specId}...`,
              timestamp: new Date().toISOString()
            }, projectPath);

            await new Promise(resolve => setTimeout(resolve, 2000));
            const nextKanban = await specsReader.getKanbanBoard(nextQueueItem.projectPath, nextQueueItem.specId);
            const firstStory = nextKanban.stories.find(s => s.status === 'backlog');
            if (firstStory) {
              await this.startStoryExecution(client, nextQueueItem.specId, firstStory.id, nextQueueItem.projectPath, nextQueueItem.gitStrategy || 'branch', firstStory.model || 'opus', true);
            } else {
              queueHandler.handleSpecComplete(nextQueueItem.projectPath, nextQueueItem.specId, true);
            }
          } else {
            console.log('[Workflow] Queue execution complete - no more specs');
            this.sendToClient(client, {
              type: 'workflow.queue-complete',
              specId,
              message: 'Alle Specs in der Queue wurden abgearbeitet.',
              timestamp: new Date().toISOString()
            }, projectPath);
          }
        }
        return;
      }

      // Resolve dependencies: unblock stories whose deps are all 'done' or 'in_review'
      const unblocked = await specsReader.resolveDependencies(projectPath, specId);
      if (unblocked.length > 0) {
        console.log(`[Workflow] Dependencies resolved: ${unblocked.join(', ')} now ready`);
      }

      // Re-read kanban after dependency resolution to get updated statuses
      const updatedKanban = await specsReader.getKanbanBoard(projectPath, specId);

      // Find next story in backlog (status = 'backlog' means ready to execute)
      const nextStory = updatedKanban.stories.find(s => s.status === 'backlog');

      if (nextStory) {
        // SECONDARY DEFENSE: Same-story loop detection
        const history = this.autoContinueHistory.get(specId);
        if (history && history.lastStoryId === nextStory.id) {
          history.count++;
          if (history.count > 2) {
            console.error(`[Workflow] LOOP DETECTED: Story ${nextStory.id} has been auto-continued ${history.count} times for spec ${specId}. Stopping.`);
            this.autoContinueHistory.delete(specId);
            this.sendToClient(client, {
              type: 'workflow.auto-continue.error',
              specId,
              error: `Infinite loop detected: Story ${nextStory.id} keeps restarting (${history.count} attempts). Stopping auto-execution.`,
              timestamp: new Date().toISOString()
            }, projectPath);
            return;
          }
        } else {
          this.autoContinueHistory.set(specId, { lastStoryId: nextStory.id, count: 1 });
        }

        console.log(`[Workflow] Auto-continuing to next story: ${nextStory.id}`);

        // Small delay to allow UI to update
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Notify client about auto-continuation
        this.sendToClient(client, {
          type: 'workflow.auto-continue',
          specId,
          nextStoryId: nextStory.id,
          message: `Automatisch weiter mit Story ${nextStory.id}...`,
          timestamp: new Date().toISOString()
        }, projectPath);

        // Start the next story execution (inherit autoMode from triggering execution)
        await this.startStoryExecution(
          client,
          specId,
          nextStory.id,
          projectPath,
          gitStrategy || 'branch',
          nextStory.model || model || 'opus',
          true  // auto-continued stories always have autoMode enabled
        );
      } else {
        // No backlog stories available — differentiate between truly done and blocked
        const blockedCount = updatedKanban.stories.filter(s => s.status === 'blocked').length;
        if (blockedCount > 0) {
          console.log(`[Workflow] No ready stories for spec ${specId}. ${blockedCount} stories still blocked.`);
        } else {
          console.log(`[Workflow] All stories complete for spec ${specId}`);
        }
        this.autoContinueHistory.delete(specId);

        // Only continue to NEXT SPEC if queue is running
        if (isQueueRunning && queueItem) {
          // Mark spec as complete in queue
          const nextQueueItem = queueHandler.handleSpecComplete(projectPath, specId, true);

          if (nextQueueItem) {
            console.log(`[Workflow] Auto-continuing to next spec in queue: ${nextQueueItem.specId}`);

            // Notify client about spec completion and next spec
            this.sendToClient(client, {
              type: 'workflow.spec-complete',
              specId,
              nextSpecId: nextQueueItem.specId,
              message: `Spec ${specId} abgeschlossen. Weiter mit ${nextQueueItem.specId}...`,
              timestamp: new Date().toISOString()
            }, projectPath);

            // Small delay before starting next spec
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Get the first story of the next spec (use the next item's projectPath)
            const nextKanban = await specsReader.getKanbanBoard(nextQueueItem.projectPath, nextQueueItem.specId);
            const firstStory = nextKanban.stories.find(s => s.status === 'backlog');

            if (firstStory) {
              await this.startStoryExecution(
                client,
                nextQueueItem.specId,
                firstStory.id,
                nextQueueItem.projectPath,
                nextQueueItem.gitStrategy || 'branch',
                firstStory.model || 'opus',
                true  // queue-continued stories always have autoMode enabled
              );
            } else {
              console.log(`[Workflow] No backlog stories found for next spec ${nextQueueItem.specId}`);
              // Mark this spec as complete too (nothing to do)
              queueHandler.handleSpecComplete(nextQueueItem.projectPath, nextQueueItem.specId, true);
            }
          } else {
            console.log('[Workflow] Queue execution complete - no more specs');

            // Notify client about queue completion
            this.sendToClient(client, {
              type: 'workflow.queue-complete',
              specId,
              message: 'Alle Specs in der Queue wurden abgearbeitet.',
              timestamp: new Date().toISOString()
            }, projectPath);
          }
        } else {
          console.log('[Workflow] Local auto-mode complete (no queue running or not in queue)');
        }
      }
    } catch (error) {
      console.error('[Workflow] Error in auto-continuation:', error);

      // KanbanJsonCorruptedError: stop auto-continue to prevent infinite loop
      if (error instanceof KanbanJsonCorruptedError) {
        console.error(`[Workflow] CORRUPTED KANBAN: ${error.message}. Stopping auto-continue to prevent loop.`);
      }

      // Don't fail silently - notify the client
      this.sendToClient(client, {
        type: 'workflow.auto-continue.error',
        specId,
        error: error instanceof Error ? error.message : 'Auto-continuation failed',
        timestamp: new Date().toISOString()
      }, projectPath);
    }
  }

  private runClaudeCommand(
    client: WebSocketClient,
    execution: WorkflowExecution,
    command: WorkflowCommand,
    abortController: AbortController
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Build the full command with optional argument
      let fullCommand = execution.argument
        ? `${command.name} ${execution.argument}`
        : command.name;

      // Append important workflow instruction at the end
      fullCommand += ' VERY IMPORTANT: BEFOLGE DIE ANWEISUNGEN IM WORKFLOW EXAKT! NUTZE TEMPLATES 1:1 UND NIMM NIEMALS IRGENDWELCHE ABKÜRZUNGEN!';

      // Escape double quotes in the command to prevent shell syntax errors
      const escapedCommand = fullCommand.replace(/"/g, '\\"');

      console.log(`[Workflow] Spawning Claude CLI for command: ${escapedCommand}`);
      console.log(`[Workflow] Working directory: ${execution.workingDirectory || execution.projectPath}`);

      // Use --print with session-id for resumable conversations
      // When AskUserQuestion is detected and workflow ends, we can resume with --resume
      const sessionId = execution.id; // Use execution ID as session ID

      // MSK-003-FIX: Determine CLI command based on model provider
      // Anthropic models use 'claude-anthropic-simple', GLM models use 'claude'
      const modelId = execution.model || 'opus';
      const cliConfig = getCliCommandForModel(modelId);

      const args = [
        '--print',
        '--verbose',
        '--output-format', 'stream-json',
        '--session-id', sessionId,
        ...cliConfig.args  // Adds flags from provider config
      ];

      args.push(fullCommand);  // e.g., "/create-spec Multi Project Support"

      console.log(`[Workflow] Using CLI command: ${cliConfig.command} with model: ${modelId}`);

      // Remove ANTHROPIC_API_KEY to use Claude Max OAuth instead of API key auth
      const { ANTHROPIC_API_KEY: _removed, ...envWithoutApiKey } = process.env;

      const claudeProcess = spawnWithLoginShell(cliConfig.command, args, {
        cwd: execution.workingDirectory || execution.projectPath,  // KSE-005: Use worktree if set
        env: {
          ...envWithoutApiKey,
          // Force unbuffered output
          PYTHONUNBUFFERED: '1',
          NODE_NO_WARNINGS: '1'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      execution.claudeProcess = claudeProcess;
      console.log(`[Workflow] Process spawned with PID: ${claudeProcess.pid}`);
      console.log(`[Workflow] stdout available: ${!!claudeProcess.stdout}`);
      console.log(`[Workflow] stderr available: ${!!claudeProcess.stderr}`);
      console.log(`[Workflow] stdin available: ${!!claudeProcess.stdin}`);

      // Close stdin since we're using --print with command as argument
      if (claudeProcess.stdin) {
        claudeProcess.stdin.end();
        console.log(`[Workflow] Closed stdin, command passed as argument`);
      }

      let buffer = '';

      // Handle abort signal
      const abortHandler = (): void => {
        console.log(`[Workflow] Abort signal received, killing process ${claudeProcess.pid}`);
        claudeProcess.kill('SIGTERM');
      };
      abortController.signal.addEventListener('abort', abortHandler);

      if (claudeProcess.stdout) {
        console.log('[Workflow] Attaching stdout listener');
        claudeProcess.stdout.on('data', (data: Buffer) => {
          const chunk = data.toString();
          console.log(`[Workflow] stdout received ${chunk.length} bytes`);
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          console.log(`[Workflow] Processing ${lines.length} lines`);

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const event = JSON.parse(line);
            this.handleClaudeEvent(client, execution, event);
          } catch {
            // Non-JSON output, treat as plain text
            if (line.trim()) {
              execution.output.push(line);
              this.sendToClient(client, {
                type: 'workflow.progress',
                executionId: execution.id,
                output: line,
                timestamp: new Date().toISOString()
              });
            }
          }
        }
        });
      } else {
        console.error('[Workflow] stdout is null!');
      }

      claudeProcess.stderr?.on('data', (data: Buffer) => {
        const errorText = data.toString();
        console.error('[Workflow stderr]:', errorText);
      });

      claudeProcess.on('close', async (code) => {
        console.log(`[Workflow] Process closed with code: ${code}`);
        execution.claudeProcess = undefined;
        abortController.signal.removeEventListener('abort', abortHandler);

        // Process remaining buffer
        if (buffer.trim()) {
          try {
            const event = JSON.parse(buffer);
            this.handleClaudeEvent(client, execution, event);
          } catch {
            if (buffer.trim()) {
              execution.output.push(buffer);
            }
          }
        }

        // MQP-002: Batch detection - send collected questions when process closes

        // Update execution status
        execution.status = code === 0 ? 'completed' : 'failed';
        execution.endTime = new Date().toISOString();

        // BPS-002: Post-Execution Git Operations for Backlog executions
        // This runs BEFORE handleStoryCompletionAndContinue to ensure PR is created
        // Backlog executions are identified by: argument starts with "backlog " AND branchName is set
        if (execution.argument?.startsWith('backlog ') && execution.branchName) {
          console.log(`[Workflow] BPS-002: Backlog execution detected (runClaudeCommand), running post-execution Git operations`);
          await this.handleBacklogPostExecution(execution);
        }

        // Send workflow completion event (same as terminal-based workflows)
        console.log(`[Workflow] Sending workflow.interactive.complete for ${execution.storyId} (spec: ${execution.specId}, code: ${code})`);
        this.sendToClient(client, {
          type: 'workflow.interactive.complete',
          executionId: execution.id,
          status: execution.status,
          output: execution.output.join('\n'),
          storyId: execution.storyId,
          specId: execution.specId,
          timestamp: new Date().toISOString()
        }, execution.projectPath);

        // Auto-continuation: Check for next story or spec if this story completed successfully
        if (execution.status === 'completed' && execution.specId && execution.storyId) {
          console.log(`[Workflow] Process exit: Story ${execution.storyId} completed, triggering auto-continue`);
          await this.handleStoryCompletionAndContinue(client, execution);
        }

        if (abortController.signal.aborted) {
          reject(new Error('Workflow cancelled by user'));
        } else if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Claude CLI exited with code ${code}`));
        }
      });

      claudeProcess.on('error', (error) => {
        console.error('[Workflow] Process error:', error);
        execution.claudeProcess = undefined;
        abortController.signal.removeEventListener('abort', abortHandler);

        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new Error('Claude CLI (claude-anthropic-simple) is not available in PATH'));
        } else {
          reject(error);
        }
      });
    });
  }

  private handleClaudeEvent(
    client: WebSocketClient,
    execution: WorkflowExecution,
    event: Record<string, unknown>
  ): void {
    const eventType = event.type as string;
    console.log(`[Workflow] Handling event type: ${eventType}`);

    switch (eventType) {
      case 'system': {
        // System init event - extract session ID if present
        console.log('[Workflow] System init event received:', JSON.stringify(event));

        // Extract session ID from system event if present
        const sessionId = event.session_id as string | undefined;
        if (sessionId) {
          console.log(`[Workflow] Session ID from Claude: ${sessionId}`);
          // Store the actual session ID for resume
          execution.claudeSessionId = sessionId;
        }

        // Only send "Workflow gestartet..." on initial start, not on resume
        // MPRO-005: Include projectId in message
        if (!execution.isResuming) {
          this.sendToClient(client, {
            type: 'workflow.interactive.message',
            executionId: execution.id,
            role: 'system',
            content: 'Workflow gestartet...',
            timestamp: new Date().toISOString()
          }, execution.projectPath);
        } else {
          console.log('[Workflow] Skipping system message on resume');
          // Clear the resume flag after processing
          execution.isResuming = false;
        }
        break;
      }

      case 'assistant': {
        // Claude response with content
        console.log('[Workflow] Processing assistant event');
        const message = event.message as Record<string, unknown> | undefined;
        if (message?.content && Array.isArray(message.content)) {
          const contentBlocks = message.content as Array<Record<string, unknown>>;

          // Check if this message contains an AskUserQuestion tool call
          // If so, we should NOT send the text block as a separate message
          // because the question will be rendered as an interactive component
          const hasAskUserQuestion = contentBlocks.some(
            block => block.type === 'tool_use' && block.name === 'AskUserQuestion'
          );

          for (const block of contentBlocks) {
            if (block.type === 'text' && typeof block.text === 'string') {
              const textContent = block.text as string;

              // Skip text blocks if this message also contains AskUserQuestion
              // The question text is already part of the AskUserQuestion tool call
              if (hasAskUserQuestion) {
                console.log(`[Workflow] Skipping text message (AskUserQuestion present): ${textContent.substring(0, 50)}...`);
                execution.output.push(textContent); // Still log it
                continue;
              }

              // MQP-003: Text Suppression when questions are being collected
              // Suppress text that looks like questions when pendingQuestions has items
              // This prevents duplicate display (once as text, once as interactive UI)
              if (execution.pendingQuestions.length > 0 || execution.pendingQuestion) {
                if (looksLikeQuestionText(textContent)) {
                  console.log(`[Workflow] Suppressing question-like text (${execution.pendingQuestions.length} questions pending): ${textContent.substring(0, 50)}...`);
                  execution.output.push(textContent); // Still log it for debugging
                  continue;
                }
              }

              // MQP-003: Also suppress messages that appear to be repeating/referencing previous questions
              // This handles cases after resume where Claude might reference unanswered questions
              const questionRepeatPatterns = [
                /fragen.*warten.*auf.*antwort/i,      // "Fragen warten auf Antwort"
                /questions.*waiting/i,                // "questions waiting"
                /bitte.*beantworte.*folgende.*fragen/i, // "bitte beantworte folgende Fragen"
                /lass.*mich.*die.*fragen.*stellen/i,  // "lass mich die Fragen stellen"
                /hier.*sind.*die.*fragen/i,           // "hier sind die Fragen"
                /ich.*sehe.*dass.*die.*fragen/i,      // "ich sehe dass die Fragen"
              ];

              const isQuestionRepeat = questionRepeatPatterns.some(pattern => pattern.test(textContent));
              if (isQuestionRepeat) {
                console.log(`[Workflow] Suppressing question repeat message: ${textContent.substring(0, 50)}...`);
                execution.output.push(textContent); // Still log it for debugging
                continue;
              }

              console.log(`[Workflow] Sending text message: ${textContent.substring(0, 500)}${textContent.length > 500 ? '...' : ''}`);
              execution.output.push(textContent);
              // MPRO-005: Send as interactive message with projectId
              this.sendToClient(client, {
                type: 'workflow.interactive.message',
                executionId: execution.id,
                role: 'assistant',
                content: textContent,
                timestamp: new Date().toISOString()
              }, execution.projectPath);
            } else if (block.type === 'tool_use') {
              const toolName = block.name as string;
              const toolInput = block.input as Record<string, unknown>;

              // Log tool call with details
              console.log(`[Workflow] Tool call: ${toolName}`, JSON.stringify(toolInput).substring(0, 500));

              // Check if this is an AskUserQuestion tool call
              if (toolName === 'AskUserQuestion') {
                this.handleAskUserQuestion(client, execution, block);
              } else {
                // MPRO-005: Regular tool call with projectId
                this.sendToClient(client, {
                  type: 'workflow.tool',
                  executionId: execution.id,
                  toolName: toolName,
                  toolInput: toolInput,
                  timestamp: new Date().toISOString()
                }, execution.projectPath);
              }
            }
          }
        }
        break;
      }

      case 'user': {
        // Tool result - could log or show
        const message = event.message as Record<string, unknown> | undefined;
        if (message?.content && Array.isArray(message.content)) {
          for (const block of message.content as Array<Record<string, unknown>>) {
            if (block.type === 'tool_result') {
              // MPRO-005: Include projectId in tool complete message
              this.sendToClient(client, {
                type: 'workflow.tool.complete',
                executionId: execution.id,
                toolId: block.tool_use_id,
                timestamp: new Date().toISOString()
              }, execution.projectPath);
            }
          }
        }
        break;
      }

      case 'result': {
        // Final result - check for session ID
        console.log('[Workflow] Result event received:', JSON.stringify(event).substring(0, 1500));

        // Extract session ID from result event if present
        const resultSessionId = event.session_id as string | undefined;
        if (resultSessionId && !execution.claudeSessionId) {
          console.log(`[Workflow] Session ID from result: ${resultSessionId}`);
          execution.claudeSessionId = resultSessionId;
        }
        break;
      }

      case 'error': {
        const errorMessage = (event.error as Record<string, unknown>)?.message || event.message || 'Unknown error';
        throw new Error(errorMessage as string);
      }
    }
  }

  public cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution || (execution.status !== 'running' && execution.status !== 'waiting_for_answer' && execution.status !== 'error_retry_available')) {
      return false;
    }

    execution.abortController.abort();
    return true;
  }

  public async retryExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      console.error(`[Workflow] Execution not found for retry: ${executionId}`);
      return false;
    }

    if (execution.status !== 'error_retry_available' && execution.status !== 'failed') {
      console.error(`[Workflow] Execution not in retryable state: ${execution.status}`);
      return false;
    }

    if (!execution.lastCommand || !execution.client) {
      console.error(`[Workflow] Missing command or client for retry`);
      return false;
    }

    // Reset execution state for retry
    execution.status = 'running';
    execution.error = undefined;
    execution.abortController = new AbortController();
    execution.output = [];

    // Re-run the execution
    this.runExecution(execution.client, execution, execution.lastCommand);

    return true;
  }

  public getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  public getRunningExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values())
      .filter(e => e.status === 'running');
  }

  public getExecutionsByClient(_clientId: string): WorkflowExecution[] {
    // In a real implementation, we'd track which client started each execution
    return this.getRunningExecutions();
  }

  public clearCache(projectPath?: string): void {
    if (projectPath) {
      this.commandsCache.delete(projectPath);
    } else {
      this.commandsCache.clear();
    }
  }

  /**
   * Handle AskUserQuestion tool call - collect questions for batch processing
   */
  private handleAskUserQuestion(
    _client: WebSocket,
    execution: WorkflowExecution,
    block: Record<string, unknown>
  ): void {
    const input = block.input as Record<string, unknown> | undefined;
    const questions = input?.questions as Array<{
      question: string;
      header?: string;
      options: Array<{ label: string; description?: string }>;
      multiSelect?: boolean;
    }> | undefined;

    if (!questions || questions.length === 0) {
      console.error('[Workflow] AskUserQuestion received without questions');
      return;
    }

    const questionId = (block.id as string) || crypto.randomUUID();

    // Skip if this question was already answered (duplicate from old process)
    if (execution.lastAnsweredQuestionId === questionId) {
      console.log(`[Workflow] Skipping already answered question: ${questionId}`);
      return;
    }

    // Skip if this question is already in pendingQuestions (prevent duplicates)
    const alreadyPending = execution.pendingQuestions.some(q => q.id === questionId);
    if (alreadyPending) {
      console.log(`[Workflow] Skipping duplicate question (already in pendingQuestions): ${questionId}`);
      return;
    }

    // Skip if we're in resume mode and there are already pending questions
    // This prevents the old process from adding duplicate questions
    if (execution.isResuming && execution.pendingQuestions.length > 0) {
      console.log(`[Workflow] Skipping question during resume (already have ${execution.pendingQuestions.length} pending): ${questionId}`);
      return;
    }

    // Create pending question (timeout will be set when batch is detected/sent)
    const pendingQuestion: WorkflowQuestion = {
      id: questionId,
      questions: questions.map(q => ({
        question: q.question,
        header: q.header || '',
        options: q.options,
        multiSelect: q.multiSelect || false
      }))
      // answer is undefined by default - will be set when user responds
    };

    // Multi-Question Protocol: Push to array instead of overwriting
    execution.pendingQuestions.push(pendingQuestion);
    console.log(`[Workflow] AskUserQuestion collected, questionId: ${questionId}, total pending: ${execution.pendingQuestions.length}`);

    // Legacy support: Also set pendingQuestion for backwards compatibility
    // This allows existing code that reads pendingQuestion to still work
    execution.pendingQuestion = pendingQuestion;
    execution.lastQuestionId = questionId;  // Save for tool_result on resume

    // MQP-002: Questions are NOT sent immediately anymore.
    // They are collected in pendingQuestions[] and sent as a batch
    // when the Claude process closes (waiting for user input).
    // The batch detection happens in the 'close' handler of runClaudeCommand.
    console.log(`[Workflow] Question collected for batch, not sent yet`);
  }

  /**
   * MQP-002: Send all collected questions as a batch to the frontend.
   * Called when Claude process closes with exit code 0 and pendingQuestions is not empty.
   */
  private sendQuestionBatch(execution: WorkflowExecution): void {
    const client = execution.client;
    if (!client) {
      console.error(`[Workflow] No client for execution: ${execution.id}`);
      return;
    }

    if (execution.pendingQuestions.length === 0) {
      console.log(`[Workflow] No questions to batch, skipping`);
      return;
    }

    // Generate a unique batch ID
    const batchId = crypto.randomUUID();
    execution.questionBatchId = batchId;
    execution.status = 'waiting_for_answer';

    // Create timeout for the batch
    const timeout = setTimeout(() => {
      this.handleQuestionTimeout(execution.id);
    }, QUESTION_TIMEOUT_MS);

    // Store timeout on first question for cleanup
    if (execution.pendingQuestions[0]) {
      execution.pendingQuestions[0].timeout = timeout;
    }

    console.log(`[Workflow] Sending question batch: ${batchId} with ${execution.pendingQuestions.length} questions`);

    // MQP-FIX: Flatten questions to match frontend WorkflowQuestion interface
    // Frontend expects: { id, question, header, options, multiSelect }
    // Each pendingQuestion contains an array of questions from AskUserQuestion tool
    const flattenedQuestions = execution.pendingQuestions.flatMap(pq =>
      pq.questions.map((q, index) => ({
        id: pq.questions.length === 1 ? pq.id : `${pq.id}:${index}`,
        question: q.question,
        header: q.header,
        options: q.options || [],
        multiSelect: q.multiSelect || false
      }))
    );

    // MQP-FIX: Deduplicate questions with same header and question text
    // Claude sometimes sends duplicate AskUserQuestion calls
    const seen = new Map<string, boolean>();
    const deduplicatedQuestions = flattenedQuestions.filter(q => {
      const key = `${q.header || ''}::${q.question}`;
      if (seen.has(key)) {
        console.log(`[Workflow] Deduplicating question: "${q.header || 'no-header'}"`);
        return false;
      }
      seen.set(key, true);
      return true;
    });

    console.log(`[Workflow] After deduplication: ${deduplicatedQuestions.length} unique questions`);

    // MPRO-005: Send the batch event to frontend with projectId
    this.sendToClient(client, {
      type: 'workflow.interactive.questionBatch',
      executionId: execution.id,
      batchId: batchId,
      questions: deduplicatedQuestions,
      timestamp: new Date().toISOString()
    }, execution.projectPath);
  }

  private handleQuestionTimeout(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (!execution || !execution.pendingQuestion) {
      return;
    }

    console.log(`[Workflow] Question timeout reminder for execution ${executionId}`);

    // DON'T clear the pending question - just send a reminder
    // The question stays available until the user answers or cancels

    // MPRO-005: Notify frontend about timeout with projectId
    if (execution.client) {
      this.sendToClient(execution.client, {
        type: 'workflow.timeout',
        executionId: executionId,
        message: 'Erinnerung: Workflow wartet auf deine Antwort',
        timestamp: new Date().toISOString()
      }, execution.projectPath);
    }

    // Set a new timeout for another reminder
    if (execution.pendingQuestion) {
      execution.pendingQuestion.timeout = setTimeout(() => {
        this.handleQuestionTimeout(executionId);
      }, QUESTION_TIMEOUT_MS);
    }
  }

  public submitAnswer(
    executionId: string,
    questionId: string,
    answers: string[] | string
  ): boolean {
    const execution = this.executions.get(executionId);
    if (!execution) {
      console.error(`[Workflow] Execution not found: ${executionId}`);
      return false;
    }

    // Handle text-based questions (no pendingQuestion, just lastQuestionId)
    const isTextQuestion = questionId.startsWith('text-question-') ||
                           execution.lastQuestionId?.startsWith('text-question-');

    if (!isTextQuestion) {
      // Tool-based question - validate pendingQuestion
      if (!execution.pendingQuestion) {
        console.error(`[Workflow] No pending question for execution: ${executionId}`);
        return false;
      }

      if (execution.pendingQuestion.id !== questionId) {
        console.error(`[Workflow] Question ID mismatch: expected ${execution.pendingQuestion.id}, got ${questionId}`);
        return false;
      }
    }

    // Clear timeout if present
    if (execution.pendingQuestion?.timeout) {
      clearTimeout(execution.pendingQuestion.timeout);
    }

    const formattedAnswer = Array.isArray(answers) ? answers.join(', ') : answers;
    console.log(`[Workflow] Submitting answer (${isTextQuestion ? 'text-based' : 'tool-based'}): ${formattedAnswer.substring(0, 300)}${formattedAnswer.length > 300 ? '...' : ''}`);

    // Track the answered question to prevent duplicates from old process
    execution.lastAnsweredQuestionId = execution.pendingQuestion?.id || questionId;

    // Clear pending question
    execution.pendingQuestion = undefined;
    execution.status = 'running';

    // Resume the conversation with the user's answer using --resume
    // This spawns a new Claude process that continues the previous session
    this.resumeWithAnswer(execution, formattedAnswer, isTextQuestion);

    return true;
  }

  /**
   * MQP-002: Submit answers for a batch of questions.
   * @param executionId - The workflow execution ID
   * @param batchId - The batch ID from the questionBatch event
   * @param answers - Map of questionId -> answer(s)
   * @returns true if successful
   */
  public submitAnswerBatch(
    executionId: string,
    batchId: string,
    answers: Record<string, string[] | string>
  ): boolean {
    const execution = this.executions.get(executionId);
    if (!execution) {
      console.error(`[Workflow] Execution not found: ${executionId}`);
      return false;
    }

    if (execution.questionBatchId !== batchId) {
      console.error(`[Workflow] Batch ID mismatch: expected ${execution.questionBatchId}, got ${batchId}`);
      return false;
    }

    if (execution.pendingQuestions.length === 0) {
      console.error(`[Workflow] No pending questions for batch: ${batchId}`);
      return false;
    }

    // Clear timeout if present
    if (execution.pendingQuestions[0]?.timeout) {
      clearTimeout(execution.pendingQuestions[0].timeout);
    }

    console.log(`[Workflow] Processing answer batch: ${batchId} with ${Object.keys(answers).length} answers`);

    // Format all answers into a single response
    // MQP-FIX: Support both simple IDs (pq.id) and composite IDs (pq.id:index)
    const formattedAnswers: string[] = [];
    for (const pq of execution.pendingQuestions) {
      // For each question in the pendingQuestion, check for answers
      pq.questions.forEach((q, index) => {
        // Try composite ID first (for multi-question AskUserQuestion), then simple ID
        const compositeId = pq.questions.length === 1 ? pq.id : `${pq.id}:${index}`;
        const answer = answers[compositeId] ?? answers[pq.id];
        if (answer) {
          const formattedAnswer = Array.isArray(answer) ? answer.join(', ') : answer;
          // Include the question header/context for Claude to understand
          const questionHeader = q.header || `Frage ${compositeId}`;
          formattedAnswers.push(`${questionHeader}: ${formattedAnswer}`);
        }
      });
    }

    const combinedAnswer = formattedAnswers.join('\n');
    console.log(`[Workflow] Combined batch answer: ${combinedAnswer.substring(0, 500)}${combinedAnswer.length > 500 ? '...' : ''}`);

    // Track the last answered question ID
    const lastQuestionId = execution.pendingQuestions[execution.pendingQuestions.length - 1]?.id;
    execution.lastAnsweredQuestionId = lastQuestionId;

    // Clear all pending questions and batch ID
    execution.pendingQuestions = [];
    execution.pendingQuestion = undefined;
    execution.questionBatchId = undefined;
    execution.status = 'running';

    // Resume with the combined answer
    this.resumeWithAnswer(execution, combinedAnswer, false);

    return true;
  }

  private resumeWithAnswer(execution: WorkflowExecution, answer: string, isTextQuestion = false): void {
    const client = execution.client;
    if (!client) {
      console.error(`[Workflow] No client for execution: ${execution.id}`);
      return;
    }

    // Get the tool_use_id from the pending question that was just answered
    const toolUseId = execution.lastQuestionId;
    if (!toolUseId && !isTextQuestion) {
      console.error(`[Workflow] No tool_use_id saved for answer`);
      return;
    }

    // CRITICAL: Kill the old process before spawning a new one
    // This prevents race conditions where both processes send events
    if (execution.claudeProcess) {
      console.log(`[Workflow] Killing old process before resume`);
      try {
        execution.claudeProcess.kill('SIGTERM');
      } catch (e) {
        console.error(`[Workflow] Error killing old process:`, e);
      }
      execution.claudeProcess = undefined;
    }

    // Mark that we're in resume mode (to filter duplicate system messages)
    execution.isResuming = true;

    // Use Claude's actual session ID if available, otherwise fall back to execution ID
    const sessionId = execution.claudeSessionId || execution.id;
    console.log(`[Workflow] Resuming session ${sessionId} with ${isTextQuestion ? 'text' : 'tool'} answer`);

    // For tool-based questions, add context so Claude understands it's an answer
    // For text-based questions, just send the answer directly
    const contextualAnswer = isTextQuestion
      ? answer
      : `Hier ist meine Antwort auf deine Frage: ${answer}\n\nBitte fahre mit der Spezifikation für dieses Feature fort.`;

    // MSK-003-FIX: Use same CLI command as initial execution
    const modelId = execution.model || 'opus';
    const cliConfig = getCliCommandForModel(modelId);

    console.log(`[Workflow] Resume using CLI command: ${cliConfig.command} with model: ${modelId}`);

    // Remove ANTHROPIC_API_KEY to use Claude Max OAuth instead of API key auth
    const { ANTHROPIC_API_KEY: _removed, ...envWithoutApiKey } = process.env;

    const claudeProcess = spawnWithLoginShell(cliConfig.command, [
      '--print',
      '--verbose',
      '--output-format', 'stream-json',
      '--resume', sessionId
      // No prompt argument - we'll send it via stdin
    ], {
      cwd: execution.workingDirectory || execution.projectPath,  // KSE-005: Use worktree if set
      env: {
        ...envWithoutApiKey,
        PYTHONUNBUFFERED: '1',
        NODE_NO_WARNINGS: '1'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    execution.claudeProcess = claudeProcess;
    console.log(`[Workflow] Resume process spawned with PID: ${claudeProcess.pid}`);

    // Send the answer via stdin to avoid shell escaping issues with special characters
    if (claudeProcess.stdin) {
      claudeProcess.stdin.write(contextualAnswer);
      claudeProcess.stdin.end();
      console.log(`[Workflow] Sent answer via stdin (${contextualAnswer.length} chars)`);
    }

    let buffer = '';

    if (claudeProcess.stdout) {
      claudeProcess.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString();
        console.log(`[Workflow Resume] stdout received ${chunk.length} bytes`);
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const event = JSON.parse(line);
            this.handleClaudeEvent(client, execution, event);
          } catch {
            if (line.trim()) {
              execution.output.push(line);
              this.sendToClient(client, {
                type: 'workflow.progress',
                executionId: execution.id,
                output: line,
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      });
    }

    claudeProcess.stderr?.on('data', (data: Buffer) => {
      console.error('[Workflow Resume stderr]:', data.toString());
    });

    claudeProcess.on('close', (code) => {
      console.log(`[Workflow Resume] Process closed with code: ${code}`);
      execution.claudeProcess = undefined;

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer);
          this.handleClaudeEvent(client, execution, event);
        } catch {
          if (buffer.trim()) {
            execution.output.push(buffer);
          }
        }
      }

      // MQP-002: Batch detection for Resume path - send collected questions when process closes
      if (code === 0 && execution.pendingQuestions.length > 0) {
        console.log(`[Workflow Resume] Batch detection: ${execution.pendingQuestions.length} questions collected, sending batch`);
        this.sendQuestionBatch(execution);
        return; // Don't complete workflow, waiting for answers
      }

      // Check if there's another pending question or if Claude asked questions in text
      if (!execution.pendingQuestion) {
        // Check if the last output contains questions (text-based questions without AskUserQuestion tool)
        const lastOutput = execution.output.slice(-3).join('\n');  // Check last few messages
        const hasTextQuestions = this.detectTextQuestions(lastOutput);

        if (hasTextQuestions) {
          // Claude asked questions as text, wait for user input
          console.log('[Workflow] Detected text-based questions, waiting for user input');
          execution.status = 'waiting_for_answer';
          // Create a pseudo-question for text-based Q&A
          execution.lastQuestionId = `text-question-${Date.now()}`;

          // MPRO-005: Include projectId in input request
          this.sendToClient(client, {
            type: 'workflow.interactive.input_request',
            executionId: execution.id,
            prompt: 'Claude hat Fragen gestellt. Bitte antworte im Eingabefeld.',
            timestamp: new Date().toISOString()
          }, execution.projectPath);
        } else {
          execution.status = 'completed';
          execution.endTime = new Date().toISOString();
          // MPRO-005: Include projectId in complete message
          this.sendToClient(client, {
            type: 'workflow.interactive.complete',
            executionId: execution.id,
            status: 'completed',
            output: execution.output.join('\n'),
            storyId: execution.storyId,
            specId: execution.specId,
            timestamp: new Date().toISOString()
          }, execution.projectPath);
        }
      }
    });

    claudeProcess.on('error', (error) => {
      console.error('[Workflow Resume] Process error:', error);
      execution.claudeProcess = undefined;
    });
  }

  /**
   * Detect if the output contains text-based questions (without AskUserQuestion tool).
   * Looks for common question patterns in Claude's output.
   */
  private detectTextQuestions(output: string): boolean {
    if (!output || output.length < 10) return false;

    // Check for common question patterns
    const questionPatterns = [
      /\?\s*$/m,                    // Ends with question mark
      /which\s+(?:one|option)/i,   // "which one" or "which option"
      /should\s+I/i,               // "should I"
      /would\s+you\s+(?:like|prefer)/i, // "would you like/prefer"
      /do\s+you\s+want/i,          // "do you want"
      /please\s+(?:choose|select)/i, // "please choose/select"
    ];

    return questionPatterns.some(pattern => pattern.test(output));
  }


  /**
   * Create a symlink for the spec folder in the worktree.
   * This ensures Claude writes to the main project's kanban board,
   * so the UI sees all updates immediately.
   */
  private async createSpecSymlink(
    projectPath: string,
    worktreePath: string,
    specId: string
  ): Promise<void> {
    const mainSpecPath = projectDir(projectPath, 'specs', specId);
    const worktreeSpecPath = projectDir(worktreePath, 'specs', specId);

    // Check if main spec folder exists
    if (!existsSync(mainSpecPath)) {
      console.log(`[Workflow] Main spec folder not found at ${mainSpecPath}, skipping symlink`);
      return;
    }

    try {
      // Check if it's already a symlink
      const { lstatSync } = await import('fs');
      if (existsSync(worktreeSpecPath)) {
        const stats = lstatSync(worktreeSpecPath);
        if (stats.isSymbolicLink()) {
          console.log(`[Workflow] Symlink already exists at ${worktreeSpecPath}`);
          return;
        }

        // Remove the directory in worktree (it's a copy, not a symlink)
        console.log(`[Workflow] Removing spec copy in worktree: ${worktreeSpecPath}`);
        await rm(worktreeSpecPath, { recursive: true, force: true });
      }

      // Create symlink from worktree to main project
      // Use relative path for portability
      const projDirName = resolveCommandDir(projectPath) === 'specwright' ? 'specwright' : 'agent-os';
      const relativePath = join('..', '..', '..', '..', basename(projectPath), projDirName, 'specs', specId);
      console.log(`[Workflow] Creating symlink: ${worktreeSpecPath} -> ${relativePath}`);
      await symlink(relativePath, worktreeSpecPath, 'dir');

      console.log(`[Workflow] Spec symlink created successfully`);

      // Also symlink .mcp.json so Claude CLI can find the Kanban MCP server
      const mcpConfigSource = join(projectPath, '..', '.mcp.json');
      const mcpConfigTarget = join(worktreePath, '.mcp.json');

      if (existsSync(mcpConfigSource) && !existsSync(mcpConfigTarget)) {
        try {
          const relativeMcpPath = join('..', '..', '..', basename(projectPath), '..', '.mcp.json');
          await symlink(relativeMcpPath, mcpConfigTarget);
          console.log(`[Workflow] .mcp.json symlink created for MCP server discovery`);
        } catch (mcpError) {
          console.warn(`[Workflow] Failed to symlink .mcp.json (non-critical):`, mcpError);
        }
      }
    } catch (error) {
      console.error(`[Workflow] Failed to create spec symlink:`, error);
      // Don't fail the workflow, just log the error
    }
  }

  /**
   * KSE-005: Update kanban board with git strategy info.
   * This ensures Claude doesn't ask for git strategy again since UI already decided.
   * Updated to also handle kanban.json (v4.0 format) alongside kanban-board.md.
   */
  private async updateKanbanGitStrategy(
    projectPath: string,
    specId: string,
    gitStrategy: GitStrategy,
    branchName: string,
    worktreePath: string | undefined
  ): Promise<void> {
    const specDir = projectDir(projectPath, 'specs', specId);
    const kanbanMdPath = join(specDir, 'kanban-board.md');
    const kanbanJsonPath = join(specDir, 'kanban.json');

    // Update kanban.json (v4.0 format) with file locking for cross-process safety
    if (existsSync(kanbanJsonPath)) {
      try {
        await withKanbanLock(specDir, async () => {
          const jsonContent = await readFile(kanbanJsonPath, 'utf-8');
          const kanban = JSON.parse(jsonContent) as Record<string, unknown>;

          const resumeContext = kanban.resumeContext as Record<string, unknown> | undefined;

          // Update resumeContext with git strategy info
          if (resumeContext) {
            resumeContext.gitStrategy = gitStrategy;
            resumeContext.gitBranch = branchName;
            resumeContext.worktreePath = worktreePath || null;

            // Update phase if still at 1-complete (move to 2-complete since git is set up)
            if (resumeContext.currentPhase === '1-complete') {
              resumeContext.currentPhase = '2-complete';
              resumeContext.nextPhase = '3-execute-story';
              resumeContext.lastAction = `Git ${gitStrategy} setup (UI)`;
              resumeContext.nextAction = 'Execute first story';
            }
          }

          // Add change log entry
          if (kanban.changeLog && Array.isArray(kanban.changeLog)) {
            (kanban.changeLog as Array<Record<string, unknown>>).push({
              timestamp: new Date().toISOString(),
              action: 'git_strategy_set',
              storyId: null,
              details: `Git ${gitStrategy} setup via UI: ${branchName}${worktreePath ? ` (worktree: ${worktreePath})` : ''}`
            });
          }

          await writeFile(kanbanJsonPath, JSON.stringify(kanban, null, 2), 'utf-8');
        });

        console.log(`[Workflow] Updated kanban.json with git strategy: ${gitStrategy}, branch: ${branchName}`);
      } catch (error) {
        console.error('[Workflow] Failed to update kanban.json:', error);
      }
    }

    // Also update kanban-board.md for backwards compatibility (if it exists)
    if (existsSync(kanbanMdPath)) {
      try {
        let content = await readFile(kanbanMdPath, 'utf-8');

        // Update Git Strategy field
        if (content.includes('| **Git Strategy** |')) {
          content = content.replace(
            /\| \*\*Git Strategy\*\* \| [^|]* \|/,
            `| **Git Strategy** | ${gitStrategy} |`
          );
        }

        // Update Git Branch field
        if (content.includes('| **Git Branch** |')) {
          content = content.replace(
            /\| \*\*Git Branch\*\* \| [^|]* \|/,
            `| **Git Branch** | ${branchName} |`
          );
        }

        // Update Worktree Path field
        if (content.includes('| **Worktree Path** |')) {
          const worktreeValue = worktreePath ? worktreePath : '(none)';
          content = content.replace(
            /\| \*\*Worktree Path\*\* \| [^|]* \|/,
            `| **Worktree Path** | ${worktreeValue} |`
          );
        }

        // Update Current Phase if it's 1-complete (move to 2-complete since git is set up)
        if (content.includes('| **Current Phase** | 1-complete |')) {
          content = content.replace(
            '| **Current Phase** | 1-complete |',
            '| **Current Phase** | 2-complete |'
          );
          content = content.replace(
            /\| \*\*Next Phase\*\* \| [^|]* \|/,
            '| **Next Phase** | 3 - Execute Story |'
          );
          content = content.replace(
            /\| \*\*Last Action\*\* \| [^|]* \|/,
            `| **Last Action** | Git ${gitStrategy} setup (UI) |`
          );
          content = content.replace(
            /\| \*\*Next Action\*\* \| [^|]* \|/,
            '| **Next Action** | Execute first story |'
          );
        }

        // Add change log entry
        const timestamp = new Date().toISOString().split('T')[0];
        const changeLogEntry = `| ${timestamp} | Git ${gitStrategy} setup via UI: ${branchName} |`;

        // Find the last change log entry and add after it
        const changeLogMatch = content.match(/(\| \d{4}-\d{2}-\d{2} \| [^|]+ \|)(?![\s\S]*\| \d{4}-\d{2}-\d{2} \|)/);
        if (changeLogMatch) {
          content = content.replace(
            changeLogMatch[0],
            `${changeLogMatch[0]}\n${changeLogEntry}`
          );
        }

        await writeFile(kanbanMdPath, content, 'utf-8');
        console.log(`[Workflow] Updated kanban-board.md with git strategy: ${gitStrategy}, branch: ${branchName}`);

      } catch (error) {
        console.error('[Workflow] Failed to update kanban-board.md:', error);
      }
    }

    // Log if neither file exists
    if (!existsSync(kanbanJsonPath) && !existsSync(kanbanMdPath)) {
      console.log(`[Workflow] No kanban file found in ${specDir}, skipping git strategy update`);
    }
  }

  /**
   * Spawn a PTY process for a workflow execution
   * Used for terminal-based workflow execution (PTY-001 integration)
   *
   * @param executionId - Workflow execution ID
   * @param cwd - Working directory
   * @param shell - Shell command (optional, defaults to system shell)
   * @param args - Shell arguments (optional)
   */
  public spawnTerminal(
    executionId: string,
    cwd: string,
    shell?: string,
    args?: string[]
  ): void {
    this.terminalManager.spawn({
      executionId,
      cwd,
      shell,
      args,
      cols: 80,
      rows: 24,
    });
  }

  /**
   * Get terminal manager instance
   * Allows external access for terminal operations
   */
  public getTerminalManager(): TerminalManager {
    return this.terminalManager;
  }

  /**
   * MPRO-005: Send message to client with optional projectId.
   * Messages include projectId when execution has a projectPath.
   */
  private sendToClient(client: WebSocketClient, message: Record<string, unknown>, projectPath?: string): void {
    if (client.readyState === WebSocket.OPEN) {
      // Add projectId to message if available
      const messageWithProject = projectPath
        ? { ...message, projectId: projectPath }
        : message;
      client.send(JSON.stringify(messageWithProject));
    }
  }

  /**
   * MPRO-005: Send message to all connections for a project.
   * Use this for project-scoped broadcasts instead of direct client send.
   */
  public sendToProject(projectId: string, message: WebSocketMessage): void {
    const enrichedMessage: WebSocketMessage = {
      ...message,
      timestamp: new Date().toISOString()
    };
    webSocketManager.sendToProject(projectId, enrichedMessage);
  }
}
