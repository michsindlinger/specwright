import { promises as fs } from 'fs';
import { join } from 'path';
import { WebSocket } from 'ws';
import { projectDir } from '../utils/project-dirs.js';
import { withKanbanLock } from '../utils/kanban-lock.js';
import { attachmentStorageService } from '../services/attachment-storage.service.js';
import {
  Comment,
  COMMENT_ERROR_CODES,
  COMMENT_CONFIG,
} from '../../shared/types/comment.protocol.js';

interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

interface WebSocketClient extends WebSocket {
  clientId: string;
  projectId?: string;
}

/**
 * CommentHandler processes WebSocket messages for comment CRUD operations.
 * Stores comments in {projectDir}/backlog/items/attachments/{itemId}/comments.json.
 * Follows the existing handler pattern (AttachmentHandler, GitHandler).
 */
export class CommentHandler {

  /**
   * Handle comment:create message.
   * Creates a new comment on a backlog item.
   */
  public async handleCreate(
    client: WebSocketClient,
    message: WebSocketMessage,
    projectPath: string
  ): Promise<void> {
    const itemId = message.itemId as string;
    const text = message.text as string;

    if (!itemId || !text?.trim()) {
      this.sendError(client, 'create', COMMENT_ERROR_CODES.OPERATION_FAILED, 'itemId and text are required');
      return;
    }

    const safeItemId = this.sanitizeItemId(itemId);
    if (!safeItemId) {
      this.sendError(client, 'create', COMMENT_ERROR_CODES.PATH_TRAVERSAL, 'Invalid itemId');
      return;
    }

    try {
      const commentsDir = projectDir(projectPath, 'backlog', 'items', 'attachments', safeItemId);
      const commentsPath = join(commentsDir, 'comments.json');

      // Ensure directory exists before acquiring lock
      await fs.mkdir(commentsDir, { recursive: true });

      const comment: Comment = {
        id: `cmt-${Date.now()}`,
        author: 'user',
        text: text.trim(),
        createdAt: new Date().toISOString(),
      };

      const comments = await withKanbanLock(commentsDir, async () => {
        const existing = await this.readComments(commentsPath);
        const updated = [...existing, comment];
        await fs.writeFile(commentsPath, JSON.stringify(updated, null, 2), 'utf-8');
        return updated;
      });

      client.send(JSON.stringify({
        type: 'comment:create:response',
        data: { comment, count: comments.length },
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      this.sendUnexpectedError(client, 'create', error);
    }
  }

  /**
   * Handle comment:list message.
   * Returns all comments for a backlog item in chronological order (oldest first).
   */
  public async handleList(
    client: WebSocketClient,
    message: WebSocketMessage,
    projectPath: string
  ): Promise<void> {
    const itemId = message.itemId as string;

    if (!itemId) {
      this.sendError(client, 'list', COMMENT_ERROR_CODES.OPERATION_FAILED, 'itemId is required');
      return;
    }

    const safeItemId = this.sanitizeItemId(itemId);
    if (!safeItemId) {
      this.sendError(client, 'list', COMMENT_ERROR_CODES.PATH_TRAVERSAL, 'Invalid itemId');
      return;
    }

    try {
      const commentsPath = projectDir(projectPath, 'backlog', 'items', 'attachments', safeItemId, 'comments.json');
      const comments = await this.readComments(commentsPath);

      client.send(JSON.stringify({
        type: 'comment:list:response',
        data: { comments, count: comments.length },
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      this.sendUnexpectedError(client, 'list', error);
    }
  }

  /**
   * Handle comment:update message.
   * Updates comment text and sets editedAt timestamp.
   */
  public async handleUpdate(
    client: WebSocketClient,
    message: WebSocketMessage,
    projectPath: string
  ): Promise<void> {
    const itemId = message.itemId as string;
    const commentId = message.commentId as string;
    const text = message.text as string;

    if (!itemId || !commentId || !text?.trim()) {
      this.sendError(client, 'update', COMMENT_ERROR_CODES.OPERATION_FAILED, 'itemId, commentId, and text are required');
      return;
    }

    const safeItemId = this.sanitizeItemId(itemId);
    if (!safeItemId) {
      this.sendError(client, 'update', COMMENT_ERROR_CODES.PATH_TRAVERSAL, 'Invalid itemId');
      return;
    }

    try {
      const commentsDir = projectDir(projectPath, 'backlog', 'items', 'attachments', safeItemId);
      const commentsPath = join(commentsDir, 'comments.json');

      // Ensure directory exists before acquiring lock
      await fs.mkdir(commentsDir, { recursive: true });

      let notFound = false;
      let updatedComment: Comment | undefined;

      await withKanbanLock(commentsDir, async () => {
        const comments = await this.readComments(commentsPath);
        const idx = comments.findIndex(c => c.id === commentId);

        if (idx === -1) {
          notFound = true;
          return;
        }

        updatedComment = {
          ...comments[idx],
          text: text.trim(),
          editedAt: new Date().toISOString(),
        };
        comments[idx] = updatedComment;
        await fs.writeFile(commentsPath, JSON.stringify(comments, null, 2), 'utf-8');
      });

      if (notFound) {
        this.sendError(client, 'update', COMMENT_ERROR_CODES.COMMENT_NOT_FOUND, 'Comment not found');
        return;
      }

      client.send(JSON.stringify({
        type: 'comment:update:response',
        data: { comment: updatedComment! },
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      this.sendUnexpectedError(client, 'update', error);
    }
  }

  /**
   * Handle comment:delete message.
   * Removes a comment and any associated images.
   */
  public async handleDelete(
    client: WebSocketClient,
    message: WebSocketMessage,
    projectPath: string
  ): Promise<void> {
    const itemId = message.itemId as string;
    const commentId = message.commentId as string;

    if (!itemId || !commentId) {
      this.sendError(client, 'delete', COMMENT_ERROR_CODES.OPERATION_FAILED, 'itemId and commentId are required');
      return;
    }

    const safeItemId = this.sanitizeItemId(itemId);
    if (!safeItemId) {
      this.sendError(client, 'delete', COMMENT_ERROR_CODES.PATH_TRAVERSAL, 'Invalid itemId');
      return;
    }

    try {
      const commentsDir = projectDir(projectPath, 'backlog', 'items', 'attachments', safeItemId);
      const commentsPath = join(commentsDir, 'comments.json');

      // Ensure directory exists before acquiring lock
      await fs.mkdir(commentsDir, { recursive: true });

      let remainingCount = 0;

      await withKanbanLock(commentsDir, async () => {
        const comments = await this.readComments(commentsPath);
        const deletedComment = comments.find(c => c.id === commentId);
        const filtered = comments.filter(c => c.id !== commentId);
        remainingCount = filtered.length;
        await fs.writeFile(commentsPath, JSON.stringify(filtered, null, 2), 'utf-8');

        // Delete associated image if the comment had one
        if (deletedComment?.imageFilename) {
          const imagePath = join(commentsDir, deletedComment.imageFilename);
          await fs.unlink(imagePath).catch(() => {
            // Ignore - image may already be deleted
          });
        }
      });

      client.send(JSON.stringify({
        type: 'comment:delete:response',
        data: { commentId, count: remainingCount },
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      this.sendUnexpectedError(client, 'delete', error);
    }
  }

  /**
   * Handle comment:upload-image message.
   * Delegates image storage to AttachmentStorageService.
   */
  public async handleUploadImage(
    client: WebSocketClient,
    message: WebSocketMessage,
    projectPath: string
  ): Promise<void> {
    const itemId = message.itemId as string;
    const data = message.data as string;
    const filename = message.filename as string;
    const mimeType = message.mimeType as string;

    if (!itemId || !data || !filename || !mimeType) {
      this.sendError(client, 'upload-image', COMMENT_ERROR_CODES.OPERATION_FAILED, 'itemId, data, filename, and mimeType are required');
      return;
    }

    const safeItemId = this.sanitizeItemId(itemId);
    if (!safeItemId) {
      this.sendError(client, 'upload-image', COMMENT_ERROR_CODES.PATH_TRAVERSAL, 'Invalid itemId');
      return;
    }

    if (!COMMENT_CONFIG.ALLOWED_IMAGE_TYPES.has(mimeType as Parameters<typeof COMMENT_CONFIG.ALLOWED_IMAGE_TYPES.has>[0])) {
      this.sendError(client, 'upload-image', COMMENT_ERROR_CODES.INVALID_FILE_TYPE, 'Image type not supported');
      return;
    }

    try {
      const result = await attachmentStorageService.upload(
        projectPath,
        'backlog',
        undefined,
        undefined,
        safeItemId,
        data,
        filename,
        mimeType
      );

      if (!result.success || !result.data) {
        this.sendError(client, 'upload-image', COMMENT_ERROR_CODES.STORAGE_ERROR, result.error ?? 'Upload failed');
        return;
      }

      client.send(JSON.stringify({
        type: 'comment:upload-image:response',
        data: {
          filename: result.data.filename,
          path: result.data.path,
          size: result.data.size,
          mimeType: result.data.mimeType,
        },
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      this.sendUnexpectedError(client, 'upload-image', error);
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Reads comments.json and returns the array of comments.
   * Returns empty array if the file does not exist.
   */
  private async readComments(commentsPath: string): Promise<Comment[]> {
    try {
      const content = await fs.readFile(commentsPath, 'utf-8');
      const parsed: unknown = JSON.parse(content);
      return Array.isArray(parsed) ? (parsed as Comment[]) : [];
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Sanitizes an itemId to prevent path traversal attacks.
   * Returns null if the itemId contains invalid characters.
   */
  private sanitizeItemId(itemId: string): string | null {
    if (!itemId || typeof itemId !== 'string') return null;
    if (
      itemId.includes('..') ||
      itemId.includes('/') ||
      itemId.includes('\\') ||
      itemId.includes('\0')
    ) {
      return null;
    }
    return itemId;
  }

  /**
   * Sends a structured error response to the client.
   */
  private sendError(
    client: WebSocketClient,
    operation: string,
    code: string,
    message: string
  ): void {
    client.send(JSON.stringify({
      type: 'comment:error',
      code,
      message,
      operation,
      timestamp: new Date().toISOString(),
    }));
  }

  /**
   * Sends an error response for unexpected exceptions.
   */
  private sendUnexpectedError(
    client: WebSocketClient,
    operation: string,
    error: unknown
  ): void {
    console.error(`Comment ${operation} error:`, error);
    this.sendError(
      client,
      operation,
      COMMENT_ERROR_CODES.STORAGE_ERROR,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const commentHandler = new CommentHandler();
