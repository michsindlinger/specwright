import { WebSocket } from 'ws';
import { FileService, fileService } from '../services/file.service.js';
import { FILE_ERROR_CODES } from '../../shared/types/file.protocol.js';

interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

interface WebSocketClient extends WebSocket {
  clientId: string;
  projectId?: string;
}

/**
 * FileHandler processes WebSocket messages for file editor operations.
 * Follows the existing handler pattern (AttachmentHandler, GitHandler).
 */
export class FileHandler {
  private readonly service: FileService;

  constructor(service: FileService = fileService) {
    this.service = service;
  }

  /**
   * Handle files:list message.
   */
  public async handleList(
    client: WebSocketClient,
    message: WebSocketMessage,
    projectPath: string
  ): Promise<void> {
    const path = (message.path as string) || '.';
    const showHidden = (message.showHidden as boolean) || false;

    try {
      const result = await this.service.list(projectPath, path, showHidden);
      const response: WebSocketMessage = {
        type: 'files:list:response',
        path: result.path,
        entries: result.entries,
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      this.sendFileError(client, 'files:list:error', 'list', path, error);
    }
  }

  /**
   * Handle files:read message.
   */
  public async handleRead(
    client: WebSocketClient,
    message: WebSocketMessage,
    projectPath: string
  ): Promise<void> {
    const path = message.path as string;

    if (!path) {
      this.sendError(client, 'files:read:error', 'read', 'path is required');
      return;
    }

    try {
      const result = await this.service.read(projectPath, path);
      const response: WebSocketMessage = {
        type: 'files:read:response',
        path: result.path,
        content: result.content,
        language: result.language,
        isBinary: result.isBinary,
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      this.sendFileError(client, 'files:read:error', 'read', path, error);
    }
  }

  /**
   * Handle files:write message.
   */
  public async handleWrite(
    client: WebSocketClient,
    message: WebSocketMessage,
    projectPath: string
  ): Promise<void> {
    const path = message.path as string;
    const content = message.content as string;

    if (!path) {
      this.sendError(client, 'files:write:error', 'write', 'path is required');
      return;
    }

    if (content === undefined || content === null) {
      this.sendError(client, 'files:write:error', 'write', 'content is required');
      return;
    }

    try {
      const result = await this.service.write(projectPath, path, content);
      const response: WebSocketMessage = {
        type: 'files:write:response',
        path: result.path,
        success: result.success,
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      this.sendFileError(client, 'files:write:error', 'write', path, error);
    }
  }

  /**
   * Handle files:create message.
   */
  public async handleCreate(
    client: WebSocketClient,
    message: WebSocketMessage,
    projectPath: string
  ): Promise<void> {
    const path = message.path as string;

    if (!path) {
      this.sendError(client, 'files:create:error', 'create', 'path is required');
      return;
    }

    try {
      const result = await this.service.create(projectPath, path);
      const response: WebSocketMessage = {
        type: 'files:create:response',
        path: result.path,
        success: result.success,
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      this.sendFileError(client, 'files:create:error', 'create', path, error);
    }
  }

  /**
   * Handle files:mkdir message.
   */
  public async handleMkdir(
    client: WebSocketClient,
    message: WebSocketMessage,
    projectPath: string
  ): Promise<void> {
    const path = message.path as string;

    if (!path) {
      this.sendError(client, 'files:mkdir:error', 'mkdir', 'path is required');
      return;
    }

    try {
      const result = await this.service.mkdir(projectPath, path);
      const response: WebSocketMessage = {
        type: 'files:mkdir:response',
        path: result.path,
        success: result.success,
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      this.sendFileError(client, 'files:mkdir:error', 'mkdir', path, error);
    }
  }

  /**
   * Handle files:rename message.
   */
  public async handleRename(
    client: WebSocketClient,
    message: WebSocketMessage,
    projectPath: string
  ): Promise<void> {
    const oldPath = message.oldPath as string;
    const newPath = message.newPath as string;

    if (!oldPath || !newPath) {
      this.sendError(client, 'files:rename:error', 'rename', 'oldPath and newPath are required');
      return;
    }

    try {
      const result = await this.service.rename(projectPath, oldPath, newPath);
      const response: WebSocketMessage = {
        type: 'files:rename:response',
        oldPath: result.oldPath,
        newPath: result.newPath,
        success: result.success,
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      this.sendFileError(client, 'files:rename:error', 'rename', oldPath, error);
    }
  }

  /**
   * Handle files:delete message.
   */
  public async handleDelete(
    client: WebSocketClient,
    message: WebSocketMessage,
    projectPath: string
  ): Promise<void> {
    const path = message.path as string;

    if (!path) {
      this.sendError(client, 'files:delete:error', 'delete', 'path is required');
      return;
    }

    try {
      const result = await this.service.delete(projectPath, path);
      const response: WebSocketMessage = {
        type: 'files:delete:response',
        path: result.path,
        success: result.success,
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      this.sendFileError(client, 'files:delete:error', 'delete', path, error);
    }
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  private sendError(
    client: WebSocketClient,
    type: string,
    operation: string,
    message: string
  ): void {
    const response: WebSocketMessage = {
      type,
      code: FILE_ERROR_CODES.OPERATION_FAILED,
      message,
      operation,
      timestamp: new Date().toISOString(),
    };
    client.send(JSON.stringify(response));
  }

  private sendFileError(
    client: WebSocketClient,
    type: string,
    operation: string,
    path: string,
    error: unknown
  ): void {
    console.error(`File ${operation} error for ${path}:`, error);

    let code: string = FILE_ERROR_CODES.OPERATION_FAILED;
    let message = 'Internal server error';

    if (error instanceof Error) {
      message = error.message;

      if (message.includes('traversal')) {
        code = FILE_ERROR_CODES.PATH_TRAVERSAL;
      } else if (message.includes('too large')) {
        code = FILE_ERROR_CODES.FILE_TOO_LARGE;
      } else if (message.includes('ENOENT')) {
        code = FILE_ERROR_CODES.FILE_NOT_FOUND;
      }
    }

    const response: WebSocketMessage = {
      type,
      code,
      message,
      operation,
      path,
      timestamp: new Date().toISOString(),
    };
    client.send(JSON.stringify(response));
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const fileHandler = new FileHandler();
