import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { CommentHandler } from '../../src/server/handlers/comment.handler.js';

// Mock attachmentStorageService to avoid real file system operations for uploads
vi.mock('../../src/server/services/attachment-storage.service.js', () => ({
  attachmentStorageService: {
    upload: vi.fn().mockResolvedValue({
      success: true,
      data: {
        filename: 'image.png',
        path: 'specwright/backlog/items/attachments/bug-001/image.png',
        size: 1024,
        mimeType: 'image/png',
      },
    }),
  },
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockClient(): { send: ReturnType<typeof vi.fn>; clientId: string; projectId?: string } {
  return {
    clientId: randomUUID(),
    send: vi.fn(),
  };
}

function parseSent(mock: ReturnType<typeof vi.fn>, callIndex = 0): Record<string, unknown> {
  return JSON.parse(mock.mock.calls[callIndex][0] as string) as Record<string, unknown>;
}

// ============================================================================
// Tests
// ============================================================================

describe('CommentHandler', () => {
  let handler: CommentHandler;
  let projectPath: string;
  let itemId: string;

  beforeEach(async () => {
    handler = new CommentHandler();
    projectPath = join(tmpdir(), `comment-test-${randomUUID()}`);
    itemId = 'bug-001-test-item';
    // Create specwright dir structure so resolveProjectDir returns 'specwright'
    await fs.mkdir(
      join(projectPath, 'specwright', 'backlog', 'items', 'attachments', itemId),
      { recursive: true }
    );
  });

  afterEach(async () => {
    await fs.rm(projectPath, { recursive: true, force: true });
  });

  // ============================================================================
  // handleCreate
  // ============================================================================

  describe('handleCreate', () => {
    it('creates a comment with correct fields', async () => {
      const client = createMockClient() as Parameters<typeof handler.handleCreate>[0];
      await handler.handleCreate(
        client,
        { type: 'comment:create', itemId, text: 'Test comment', timestamp: '' },
        projectPath
      );

      expect(client.send).toHaveBeenCalledOnce();
      const response = parseSent(client.send as ReturnType<typeof vi.fn>);
      expect(response.type).toBe('comment:create:response');

      const data = response.data as { comment: Record<string, unknown>; count: number };
      expect(data.comment.id).toMatch(/^cmt-\d+$/);
      expect(data.comment.author).toBe('user');
      expect(data.comment.text).toBe('Test comment');
      expect(data.comment.createdAt).toBeDefined();
      expect(data.count).toBe(1);
    });

    it('trims whitespace from text', async () => {
      const client = createMockClient() as Parameters<typeof handler.handleCreate>[0];
      await handler.handleCreate(
        client,
        { type: 'comment:create', itemId, text: '  trimmed  ', timestamp: '' },
        projectPath
      );

      const response = parseSent(client.send as ReturnType<typeof vi.fn>);
      const data = response.data as { comment: Record<string, unknown> };
      expect(data.comment.text).toBe('trimmed');
    });

    it('increments count with multiple comments', async () => {
      const client = createMockClient() as Parameters<typeof handler.handleCreate>[0];
      await handler.handleCreate(client, { type: 'comment:create', itemId, text: 'First', timestamp: '' }, projectPath);
      await handler.handleCreate(client, { type: 'comment:create', itemId, text: 'Second', timestamp: '' }, projectPath);

      const response = parseSent(client.send as ReturnType<typeof vi.fn>, 1);
      const data = response.data as { count: number };
      expect(data.count).toBe(2);
    });

    it('rejects empty text', async () => {
      const client = createMockClient() as Parameters<typeof handler.handleCreate>[0];
      await handler.handleCreate(
        client,
        { type: 'comment:create', itemId, text: '', timestamp: '' },
        projectPath
      );

      const response = parseSent(client.send as ReturnType<typeof vi.fn>);
      expect(response.type).toBe('comment:error');
    });

    it('rejects whitespace-only text', async () => {
      const client = createMockClient() as Parameters<typeof handler.handleCreate>[0];
      await handler.handleCreate(
        client,
        { type: 'comment:create', itemId, text: '   ', timestamp: '' },
        projectPath
      );

      const response = parseSent(client.send as ReturnType<typeof vi.fn>);
      expect(response.type).toBe('comment:error');
    });

    it('rejects path traversal in itemId', async () => {
      const client = createMockClient() as Parameters<typeof handler.handleCreate>[0];
      await handler.handleCreate(
        client,
        { type: 'comment:create', itemId: '../etc/passwd', text: 'hack', timestamp: '' },
        projectPath
      );

      const response = parseSent(client.send as ReturnType<typeof vi.fn>);
      expect(response.type).toBe('comment:error');
      expect(response.code).toBe('PATH_TRAVERSAL');
    });

    it('rejects itemId with backslash', async () => {
      const client = createMockClient() as Parameters<typeof handler.handleCreate>[0];
      await handler.handleCreate(
        client,
        { type: 'comment:create', itemId: 'etc\\passwd', text: 'hack', timestamp: '' },
        projectPath
      );

      const response = parseSent(client.send as ReturnType<typeof vi.fn>);
      expect(response.type).toBe('comment:error');
      expect(response.code).toBe('PATH_TRAVERSAL');
    });
  });

  // ============================================================================
  // handleList
  // ============================================================================

  describe('handleList', () => {
    it('returns empty list for item with no comments', async () => {
      const client = createMockClient() as Parameters<typeof handler.handleList>[0];
      await handler.handleList(
        client,
        { type: 'comment:list', itemId, timestamp: '' },
        projectPath
      );

      const response = parseSent(client.send as ReturnType<typeof vi.fn>);
      expect(response.type).toBe('comment:list:response');
      const data = response.data as { comments: unknown[]; count: number };
      expect(data.comments).toEqual([]);
      expect(data.count).toBe(0);
    });

    it('returns comments in chronological order (oldest first)', async () => {
      const createClient = createMockClient() as Parameters<typeof handler.handleCreate>[0];
      await handler.handleCreate(createClient, { type: 'comment:create', itemId, text: 'First', timestamp: '' }, projectPath);
      await handler.handleCreate(createClient, { type: 'comment:create', itemId, text: 'Second', timestamp: '' }, projectPath);

      const listClient = createMockClient() as Parameters<typeof handler.handleList>[0];
      await handler.handleList(listClient, { type: 'comment:list', itemId, timestamp: '' }, projectPath);

      const response = parseSent(listClient.send as ReturnType<typeof vi.fn>);
      const data = response.data as { comments: Array<{ text: string }>; count: number };
      expect(data.comments).toHaveLength(2);
      expect(data.comments[0].text).toBe('First');
      expect(data.comments[1].text).toBe('Second');
      expect(data.count).toBe(2);
    });

    it('rejects path traversal in itemId', async () => {
      const client = createMockClient() as Parameters<typeof handler.handleList>[0];
      await handler.handleList(
        client,
        { type: 'comment:list', itemId: '../../secrets', timestamp: '' },
        projectPath
      );

      const response = parseSent(client.send as ReturnType<typeof vi.fn>);
      expect(response.type).toBe('comment:error');
      expect(response.code).toBe('PATH_TRAVERSAL');
    });
  });

  // ============================================================================
  // handleUpdate
  // ============================================================================

  describe('handleUpdate', () => {
    it('updates comment text and adds editedAt', async () => {
      const createClient = createMockClient() as Parameters<typeof handler.handleCreate>[0];
      await handler.handleCreate(createClient, { type: 'comment:create', itemId, text: 'Original', timestamp: '' }, projectPath);
      const created = (parseSent(createClient.send as ReturnType<typeof vi.fn>).data as { comment: { id: string; createdAt: string } }).comment;

      const updateClient = createMockClient() as Parameters<typeof handler.handleUpdate>[0];
      await handler.handleUpdate(
        updateClient,
        { type: 'comment:update', itemId, commentId: created.id, text: 'Updated', timestamp: '' },
        projectPath
      );

      const response = parseSent(updateClient.send as ReturnType<typeof vi.fn>);
      expect(response.type).toBe('comment:update:response');
      const data = response.data as { comment: { text: string; editedAt: string; createdAt: string } };
      expect(data.comment.text).toBe('Updated');
      expect(data.comment.editedAt).toBeDefined();
      expect(data.comment.createdAt).toBe(created.createdAt);
    });

    it('returns COMMENT_NOT_FOUND for non-existent comment', async () => {
      const client = createMockClient() as Parameters<typeof handler.handleUpdate>[0];
      await handler.handleUpdate(
        client,
        { type: 'comment:update', itemId, commentId: 'cmt-nonexistent', text: 'X', timestamp: '' },
        projectPath
      );

      const response = parseSent(client.send as ReturnType<typeof vi.fn>);
      expect(response.type).toBe('comment:error');
      expect(response.code).toBe('COMMENT_NOT_FOUND');
    });

    it('rejects missing required fields', async () => {
      const client = createMockClient() as Parameters<typeof handler.handleUpdate>[0];
      await handler.handleUpdate(
        client,
        { type: 'comment:update', itemId, commentId: '', text: 'X', timestamp: '' },
        projectPath
      );

      const response = parseSent(client.send as ReturnType<typeof vi.fn>);
      expect(response.type).toBe('comment:error');
    });
  });

  // ============================================================================
  // handleDelete
  // ============================================================================

  describe('handleDelete', () => {
    it('removes a comment and returns updated count', async () => {
      const createClient = createMockClient() as Parameters<typeof handler.handleCreate>[0];
      await handler.handleCreate(createClient, { type: 'comment:create', itemId, text: 'To delete', timestamp: '' }, projectPath);
      const created = (parseSent(createClient.send as ReturnType<typeof vi.fn>).data as { comment: { id: string } }).comment;

      const deleteClient = createMockClient() as Parameters<typeof handler.handleDelete>[0];
      await handler.handleDelete(
        deleteClient,
        { type: 'comment:delete', itemId, commentId: created.id, timestamp: '' },
        projectPath
      );

      const response = parseSent(deleteClient.send as ReturnType<typeof vi.fn>);
      expect(response.type).toBe('comment:delete:response');
      const data = response.data as { commentId: string; count: number };
      expect(data.commentId).toBe(created.id);
      expect(data.count).toBe(0);
    });

    it('deleting non-existent comment returns count 0 gracefully', async () => {
      const client = createMockClient() as Parameters<typeof handler.handleDelete>[0];
      await handler.handleDelete(
        client,
        { type: 'comment:delete', itemId, commentId: 'cmt-nonexistent', timestamp: '' },
        projectPath
      );

      const response = parseSent(client.send as ReturnType<typeof vi.fn>);
      expect(response.type).toBe('comment:delete:response');
      const data = response.data as { count: number };
      expect(data.count).toBe(0);
    });

    it('rejects missing itemId', async () => {
      const client = createMockClient() as Parameters<typeof handler.handleDelete>[0];
      await handler.handleDelete(
        client,
        { type: 'comment:delete', itemId: '', commentId: 'cmt-123', timestamp: '' },
        projectPath
      );

      const response = parseSent(client.send as ReturnType<typeof vi.fn>);
      expect(response.type).toBe('comment:error');
    });
  });

  // ============================================================================
  // handleUploadImage
  // ============================================================================

  describe('handleUploadImage', () => {
    it('rejects unsupported image type', async () => {
      const client = createMockClient() as Parameters<typeof handler.handleUploadImage>[0];
      await handler.handleUploadImage(
        client,
        { type: 'comment:upload-image', itemId, data: 'base64data', filename: 'doc.pdf', mimeType: 'application/pdf', timestamp: '' },
        projectPath
      );

      const response = parseSent(client.send as ReturnType<typeof vi.fn>);
      expect(response.type).toBe('comment:error');
      expect(response.code).toBe('INVALID_FILE_TYPE');
    });

    it('rejects path traversal in itemId', async () => {
      const client = createMockClient() as Parameters<typeof handler.handleUploadImage>[0];
      await handler.handleUploadImage(
        client,
        { type: 'comment:upload-image', itemId: '../etc', data: 'data', filename: 'img.png', mimeType: 'image/png', timestamp: '' },
        projectPath
      );

      const response = parseSent(client.send as ReturnType<typeof vi.fn>);
      expect(response.type).toBe('comment:error');
      expect(response.code).toBe('PATH_TRAVERSAL');
    });

    it('delegates valid upload to attachmentStorageService', async () => {
      const client = createMockClient() as Parameters<typeof handler.handleUploadImage>[0];
      await handler.handleUploadImage(
        client,
        { type: 'comment:upload-image', itemId, data: 'base64imagedata', filename: 'image.png', mimeType: 'image/png', timestamp: '' },
        projectPath
      );

      const response = parseSent(client.send as ReturnType<typeof vi.fn>);
      expect(response.type).toBe('comment:upload-image:response');
      const data = response.data as { filename: string; mimeType: string };
      expect(data.filename).toBe('image.png');
      expect(data.mimeType).toBe('image/png');
    });
  });
});
