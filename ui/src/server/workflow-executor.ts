import { WebSocket } from 'ws';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { TerminalManager } from './services/terminal-manager.js';
import { getCliCommandForModel } from './model-config.js';
import { resolveCommandDir } from './utils/project-dirs.js';

/** Model id as chosen in the UI (`opus`, `sonnet`, provider-specific ids); resolved by model-config. */
export type ModelSelection = string;

export interface WorkflowCommand {
  id: string;
  name: string;
  description: string;
  filePath: string;
}

export interface WorkflowExecution {
  id: string;
  commandId: string;
  commandName: string;
  projectPath: string;
  argument?: string;  // Optional argument passed to the command
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'error_retry_available';
  startTime: string;
  endTime?: string;
  output: string[];
  error?: string;
  abortController: AbortController;
  client?: WebSocketClient;
  lastCommand?: WorkflowCommand;
  model?: ModelSelection;  // Model for this execution
}

interface WebSocketClient extends WebSocket {
  clientId: string;
}

export class WorkflowExecutor {
  private executions: Map<string, WorkflowExecution> = new Map();
  private commandsCache: Map<string, WorkflowCommand[]> = new Map();
  private terminalManager: TerminalManager;

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

    this.terminalManager.on('terminal.exit', (executionId: string, exitCode: number) => {
      const execution = this.executions.get(executionId);
      if (!execution) return;

      // Update execution status
      execution.status = exitCode === 0 ? 'completed' : 'failed';
      execution.endTime = new Date().toISOString();

      if (execution.client) {
        this.sendToClient(execution.client, {
          type: 'terminal.exit',
          executionId,
          exitCode,
          timestamp: new Date().toISOString()
        });

        // MPRO-005: Also send completion event for the UI state
        this.sendToClient(execution.client, {
          type: 'workflow.interactive.complete',
          executionId: execution.id,
          status: execution.status,
          output: execution.output.join('\n'),
          timestamp: new Date().toISOString()
        }, execution.projectPath);
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
      model  // LLM-001: Store model for this execution
    };

    execution.client = client;
    this.executions.set(executionId, execution);

    // Start execution in background
    this.runExecution(client, execution, command).catch(err => {
      console.error(`[Workflow] Unhandled execution error for ${executionId}:`, err);
    });

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

      // Spawn terminal for this execution
      this.spawnTerminal(execution.id, execution.projectPath);

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
      const quotedArgs = cliConfig.args.map((a: string) => `'${a.replace(/'/g, "'\\''")}'`).join(' ');
      const claudeCommand = `${cliConfig.command} ${quotedArgs} '${escapedCommand}' && exit\n`;

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

      console.log(`[Workflow] ✗ Execution ${execution.id} FAILED (${command.id})`);
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
          timestamp: new Date().toISOString()
        }, execution.projectPath);
      }
    }
  }

  public cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution || (execution.status !== 'running' && execution.status !== 'error_retry_available')) {
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
    this.runExecution(execution.client, execution, execution.lastCommand).catch(err => {
      console.error(`[Workflow] Unhandled retry error for ${executionId}:`, err);
    });

    return true;
  }

  public getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  public getRunningExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values())
      .filter(e => e.status === 'running');
  }

  public clearCache(projectPath?: string): void {
    if (projectPath) {
      this.commandsCache.delete(projectPath);
    } else {
      this.commandsCache.clear();
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

}
