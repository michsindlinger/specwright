import { WebSocket } from 'ws';
import { AttachmentStorageService, attachmentStorageService } from '../services/attachment-storage.service.js';
import { ATTACHMENT_ERROR_CODES } from '../../shared/types/attachment.protocol.js';

interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

interface WebSocketClient extends WebSocket {
  clientId: string;
  projectId?: string;
}

/**
 * AttachmentHandler processes WebSocket messages for attachment operations.
 * Follows the existing handler pattern (GitHandler, QueueHandler).
 */
export class AttachmentHandler {
  private readonly service: AttachmentStorageService;

  constructor(service: AttachmentStorageService = attachmentStorageService) {
    this.service = service;
  }

  /**
   * Handle attachment:upload message.
   * Uploads a file to a spec story or backlog item.
   */
  public async handleUpload(
    client: WebSocketClient,
    message: WebSocketMessage,
    projectPath: string
  ): Promise<void> {
    const contextType = message.contextType as 'spec' | 'backlog';
    const specId = message.specId as string | undefined;
    const storyId = message.storyId as string | undefined;
    const itemId = message.itemId as string | undefined;
    const data = message.data as string;
    const filename = message.filename as string;
    const mimeType = message.mimeType as string;

    // Validate required fields
    if (!contextType) {
      this.sendError(client, 'attachment:error', 'upload', 'contextType is required');
      return;
    }

    if (!data || !filename || !mimeType) {
      this.sendError(client, 'attachment:error', 'upload', 'data, filename, and mimeType are required');
      return;
    }

    if (contextType === 'spec' && (!specId || !storyId)) {
      this.sendError(client, 'attachment:error', 'upload', 'specId and storyId are required for spec context');
      return;
    }

    if (contextType === 'backlog' && !itemId) {
      this.sendError(client, 'attachment:error', 'upload', 'itemId is required for backlog context');
      return;
    }

    try {
      const result = await this.service.upload(
        projectPath,
        contextType,
        specId,
        storyId,
        itemId,
        data,
        filename,
        mimeType
      );

      const response: WebSocketMessage = {
        type: 'attachment:upload:response',
        data: result.success
          ? result.data
          : { success: false, filename: '', path: '', size: 0, mimeType: '', error: result.error },
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      this.sendAttachmentError(client, 'upload', error);
    }
  }

  /**
   * Handle attachment:list message.
   * Lists all attachments for a spec story or backlog item.
   */
  public async handleList(
    client: WebSocketClient,
    message: WebSocketMessage,
    projectPath: string
  ): Promise<void> {
    const contextType = message.contextType as 'spec' | 'backlog';
    const specId = message.specId as string | undefined;
    const storyId = message.storyId as string | undefined;
    const itemId = message.itemId as string | undefined;

    // Validate required fields
    if (!contextType) {
      this.sendError(client, 'attachment:error', 'list', 'contextType is required');
      return;
    }

    if (contextType === 'spec' && (!specId || !storyId)) {
      this.sendError(client, 'attachment:error', 'list', 'specId and storyId are required for spec context');
      return;
    }

    if (contextType === 'backlog' && !itemId) {
      this.sendError(client, 'attachment:error', 'list', 'itemId is required for backlog context');
      return;
    }

    try {
      const result = await this.service.list(projectPath, contextType, specId, storyId, itemId);

      const response: WebSocketMessage = {
        type: 'attachment:list:response',
        data: result.success
          ? result.data
          : { attachments: [], count: 0 },
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      this.sendAttachmentError(client, 'list', error);
    }
  }

  /**
   * Handle attachment:delete message.
   * Deletes an attachment from a spec story or backlog item.
   */
  public async handleDelete(
    client: WebSocketClient,
    message: WebSocketMessage,
    projectPath: string
  ): Promise<void> {
    const contextType = message.contextType as 'spec' | 'backlog';
    const specId = message.specId as string | undefined;
    const storyId = message.storyId as string | undefined;
    const itemId = message.itemId as string | undefined;
    const filename = message.filename as string;

    // Validate required fields
    if (!contextType) {
      this.sendError(client, 'attachment:error', 'delete', 'contextType is required');
      return;
    }

    if (!filename) {
      this.sendError(client, 'attachment:error', 'delete', 'filename is required');
      return;
    }

    if (contextType === 'spec' && (!specId || !storyId)) {
      this.sendError(client, 'attachment:error', 'delete', 'specId and storyId are required for spec context');
      return;
    }

    if (contextType === 'backlog' && !itemId) {
      this.sendError(client, 'attachment:error', 'delete', 'itemId is required for backlog context');
      return;
    }

    try {
      const result = await this.service.delete(
        projectPath,
        contextType,
        specId,
        storyId,
        itemId,
        filename
      );

      const response: WebSocketMessage = {
        type: 'attachment:delete:response',
        data: result.success
          ? result.data
          : { success: false, filename, error: result.error },
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      this.sendAttachmentError(client, 'delete', error);
    }
  }

  /**
   * Handle attachment:read message.
   * Reads attachment content for preview.
   */
  public async handleRead(
    client: WebSocketClient,
    message: WebSocketMessage,
    projectPath: string
  ): Promise<void> {
    const contextType = message.contextType as 'spec' | 'backlog';
    const specId = message.specId as string | undefined;
    const storyId = message.storyId as string | undefined;
    const itemId = message.itemId as string | undefined;
    const filename = message.filename as string;

    // Validate required fields
    if (!contextType) {
      this.sendError(client, 'attachment:error', 'read', 'contextType is required');
      return;
    }

    if (!filename) {
      this.sendError(client, 'attachment:error', 'read', 'filename is required');
      return;
    }

    if (contextType === 'spec' && (!specId || !storyId)) {
      this.sendError(client, 'attachment:error', 'read', 'specId and storyId are required for spec context');
      return;
    }

    if (contextType === 'backlog' && !itemId) {
      this.sendError(client, 'attachment:error', 'read', 'itemId is required for backlog context');
      return;
    }

    try {
      const result = await this.service.read(
        projectPath,
        contextType,
        specId,
        storyId,
        itemId,
        filename
      );

      const response: WebSocketMessage = {
        type: 'attachment:read:response',
        data: result.success
          ? result.data
          : { success: false, content: '', mimeType: '', filename, isBase64: false, error: result.error },
        timestamp: new Date().toISOString(),
      };
      client.send(JSON.stringify(response));
    } catch (error) {
      this.sendAttachmentError(client, 'read', error);
    }
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  /**
   * Send an error response.
   */
  private sendError(
    client: WebSocketClient,
    type: string,
    operation: string,
    message: string
  ): void {
    const response: WebSocketMessage = {
      type,
      code: ATTACHMENT_ERROR_CODES.OPERATION_FAILED,
      message,
      operation,
      timestamp: new Date().toISOString(),
    };
    client.send(JSON.stringify(response));
  }

  /**
   * Send an attachment-specific error.
   */
  private sendAttachmentError(
    client: WebSocketClient,
    operation: string,
    error: unknown
  ): void {
    console.error(`Attachment ${operation} error:`, error);

    let code: string = ATTACHMENT_ERROR_CODES.STORAGE_ERROR;
    let message = 'Internal server error';

    if (error instanceof Error) {
      message = error.message;

      if (message.includes('size')) {
        code = ATTACHMENT_ERROR_CODES.FILE_TOO_LARGE;
      } else if (message.includes('type') || message.includes('MIME')) {
        code = ATTACHMENT_ERROR_CODES.INVALID_FILE_TYPE;
      } else if (message.includes('not found')) {
        code = ATTACHMENT_ERROR_CODES.FILE_NOT_FOUND;
      } else if (message.includes('Path traversal')) {
        code = ATTACHMENT_ERROR_CODES.PATH_TRAVERSAL;
      }
    }

    const response: WebSocketMessage = {
      type: 'attachment:error',
      code,
      message,
      operation,
      timestamp: new Date().toISOString(),
    };
    client.send(JSON.stringify(response));
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const attachmentHandler = new AttachmentHandler();
