import { WebSocket } from 'ws';
import { GitService, gitService, GitError } from '../services/git.service.js';
import { GIT_ERROR_CODES } from '../../shared/types/git.protocol.js';

interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

interface WebSocketClient extends WebSocket {
  clientId: string;
  projectId?: string;
}

/**
 * GitHandler processes WebSocket messages for git operations.
 * Follows the existing handler pattern (QueueHandler).
 */
export class GitHandler {
  private readonly service: GitService;

  constructor(service: GitService) {
    this.service = service;
  }

  /**
   * Handle git:status message.
   * Returns the current git status for the project.
   */
  public async handleStatus(client: WebSocketClient, projectPath: string): Promise<void> {
    try {
      const data = await this.service.getStatus(projectPath);

      const response: WebSocketMessage = {
        type: 'git:status:response',
        data,
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      this.sendGitError(client, 'status', error);
    }
  }

  /**
   * Handle git:branches message.
   * Returns the list of local branches.
   */
  public async handleBranches(client: WebSocketClient, projectPath: string): Promise<void> {
    try {
      const branches = await this.service.getBranches(projectPath);

      const response: WebSocketMessage = {
        type: 'git:branches:response',
        branches,
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      this.sendGitError(client, 'branches', error);
    }
  }

  /**
   * Handle git:commit message.
   * Stages specified files and commits with the given message.
   */
  public async handleCommit(client: WebSocketClient, message: WebSocketMessage, projectPath: string): Promise<void> {
    const files = message.files as string[];
    const commitMessage = message.message as string;

    if (!files || !Array.isArray(files) || files.length === 0) {
      this.sendError(client, 'git:error', 'commit', 'files array is required and must not be empty');
      return;
    }

    if (!commitMessage || typeof commitMessage !== 'string') {
      this.sendError(client, 'git:error', 'commit', 'commit message is required');
      return;
    }

    try {
      const data = await this.service.commit(projectPath, files, commitMessage);

      const response: WebSocketMessage = {
        type: 'git:commit:response',
        data,
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      this.sendGitError(client, 'commit', error);
    }
  }

  /**
   * Handle git:pull message.
   * Pulls from the remote repository.
   */
  public async handlePull(client: WebSocketClient, message: WebSocketMessage, projectPath: string): Promise<void> {
    const rebase = message.rebase === true;
    try {
      const data = await this.service.pull(projectPath, rebase);

      const response: WebSocketMessage = {
        type: 'git:pull:response',
        data,
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      this.sendGitError(client, 'pull', error);
    }
  }

  /**
   * Handle git:push message.
   * Pushes to the remote repository.
   */
  public async handlePush(client: WebSocketClient, projectPath: string): Promise<void> {
    try {
      const data = await this.service.push(projectPath);

      const response: WebSocketMessage = {
        type: 'git:push:response',
        data,
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      this.sendGitError(client, 'push', error);
    }
  }

  /**
   * Handle git:checkout message.
   * Checks out the specified branch.
   */
  public async handleCheckout(client: WebSocketClient, message: WebSocketMessage, projectPath: string): Promise<void> {
    const branch = message.branch as string;

    if (!branch || typeof branch !== 'string') {
      this.sendError(client, 'git:error', 'checkout', 'branch name is required');
      return;
    }

    try {
      const data = await this.service.checkout(projectPath, branch);

      const response: WebSocketMessage = {
        type: 'git:checkout:response',
        data,
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      this.sendGitError(client, 'checkout', error);
    }
  }

  /**
   * Send a git-specific error message to the client.
   */
  private sendGitError(client: WebSocketClient, operation: string, error: unknown): void {
    const gitError = error instanceof GitError ? error : null;

    const errorResponse: WebSocketMessage = {
      type: 'git:error',
      code: gitError?.code || GIT_ERROR_CODES.OPERATION_FAILED,
      message: error instanceof Error ? error.message : 'Unknown error',
      operation,
      timestamp: new Date().toISOString(),
    };
    client.send(JSON.stringify(errorResponse));
  }

  /**
   * Handle git:revert message.
   * Reverts specified files to their last committed state.
   */
  public async handleRevert(client: WebSocketClient, message: WebSocketMessage, projectPath: string): Promise<void> {
    const files = message.files as string[];

    if (!files || !Array.isArray(files) || files.length === 0) {
      this.sendError(client, 'git:error', 'revert', 'files array is required and must not be empty');
      return;
    }

    try {
      const data = await this.service.revertFiles(projectPath, files);

      const response: WebSocketMessage = {
        type: 'git:revert:response',
        data,
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      this.sendGitError(client, 'revert', error);
    }
  }

  /**
   * Handle git:delete-untracked message.
   * Deletes an untracked file from the filesystem.
   */
  public async handleDeleteUntracked(client: WebSocketClient, message: WebSocketMessage, projectPath: string): Promise<void> {
    const file = message.file as string;

    if (!file || typeof file !== 'string') {
      this.sendError(client, 'git:error', 'delete-untracked', 'file path is required');
      return;
    }

    try {
      await this.service.deleteUntrackedFile(projectPath, file);

      const response: WebSocketMessage = {
        type: 'git:delete-untracked:response',
        data: { file, success: true },
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      this.sendGitError(client, 'delete-untracked', error);
    }
  }

  /**
   * Handle git:pr-info message.
   * Returns PR info for the current branch, or null if no PR exists.
   */
  public async handlePrInfo(client: WebSocketClient, projectPath: string): Promise<void> {
    try {
      const data = await this.service.getPrInfo(projectPath);

      const response: WebSocketMessage = {
        type: 'git:pr-info:response',
        data,
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      this.sendGitError(client, 'pr-info', error);
    }
  }

  /**
   * Send a validation error message to a client.
   */
  private sendError(client: WebSocketClient, type: string, operation: string, error: string): void {
    const errorResponse: WebSocketMessage = {
      type,
      code: GIT_ERROR_CODES.OPERATION_FAILED,
      message: error,
      operation,
      timestamp: new Date().toISOString(),
    };
    client.send(JSON.stringify(errorResponse));
  }
}

// Singleton instance
export const gitHandler = new GitHandler(gitService);
